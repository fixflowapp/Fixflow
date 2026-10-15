// Persistence — the storage port. One interface, two adapters:
//
//   load()  -> state            read the whole dataset
//   save(state)                 write the whole dataset
//   reset(state) -> state       replace with a fresh seeded dataset
//
// `LocalStoragePersistence` is always available and synchronous.
// `SupabasePersistence` is signed-in-only; `save()` is debounced and pushes
// per-collection diffs (upsert + prune) with retry/backoff.
//
// store.js owns application state and delegates all storage here. The Supabase
// module is passed in already-imported so this file never statically pulls the
// CDN client (the app must boot offline too).

// Canonical collection list — the shape of a dataset. Single source of truth.
export const COLLECTIONS = [
  "jobs", "customers", "technicians", "invoices", "payments", "parts", "suppliers",
  "contracts", "workOrders", "templates", "recurringJobs", "assets", "conversations",
  "auditLogs", "gdprRequests", "notifications", "serviceRequests",
];

const json = (v) => { try { return JSON.stringify(v); } catch { return null; } };

// ---------------------------------------------------------------------------
// Local adapter — synchronous, backed by localStorage.
// ---------------------------------------------------------------------------
export class LocalStoragePersistence {
  constructor({ key, seed }) {
    this.key = key;
    this.seed = seed;
    this.name = "local";
    this.enabled = true;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through to a fresh seed */ }
    const fresh = this.seed();
    this.save(fresh);
    return fresh;
  }

  save(state) {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
      this.lastError = null;
      return { ok: true };
    } catch (e) {
      // Quota is the one failure the user can act on (photos are the only large
      // payload), so distinguish it from storage being unavailable entirely.
      const quota = e && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22 || e.code === 1014);
      this.lastError = quota ? "quota" : "unavailable";
      return { ok: false, error: this.lastError };
    }
  }

  async reset() {
    const fresh = this.seed();
    this.save(fresh);
    return fresh;
  }
}

// ---------------------------------------------------------------------------
// Supabase adapter — merges cloud data on load, pushes diffs on save.
// ---------------------------------------------------------------------------
const DEBOUNCE_MS = 400;
const MAX_BACKOFF_MS = 30000;

export class SupabasePersistence {
  constructor({ sb, seed }) {
    this.sb = sb;
    this.seed = seed;
    this.name = "supabase";
    this.enabled = false;     // flips true once a signed-in pull succeeds
    this.last = {};           // collection -> last JSON confirmed written
    this.inFlight = new Set();
    this.timer = null;
    this.retry = DEBOUNCE_MS;
  }

  // `fallback` is the local dataset: used as the base, seed source for an empty
  // cloud, and to preserve the signed-in session identity.
  async load(fallback) {
    const res = await this.sb.pullAll();
    if (!res.ok) return { ok: false, error: res.error, state: fallback };

    const remoteHasData = (res.count || 0) > 0;
    const merged = { ...fallback };
    for (const c of COLLECTIONS) merged[c] = Array.isArray(res.collections[c]) ? res.collections[c] : [];
    if (res.settings && Object.keys(res.settings).length) merged.settings = res.settings;
    merged.session = fallback.session;

    if (remoteHasData) this.sb.markInitialized();  // cloud holds data → never re-seed
    else await this.sb.seedIfEmpty(fallback);      // first run → fill an empty cloud

    this.enabled = true;
    this.snapshot(merged);
    return { ok: true, state: merged, seeded: !remoteHasData };
  }

  snapshot(state) {
    for (const c of COLLECTIONS) this.last[c] = json(state[c] || []);
    this.last.settings = json(state.settings || {});
  }

  save(state) {
    if (!this.enabled) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(state), DEBOUNCE_MS);
  }

  // Force a full push (used by reset, which invalidates every snapshot).
  async reset(state) {
    if (this.enabled) { this.last = {}; await this.flush(state); }
    return state;
  }

  flush(state) {
    if (!this.enabled) return;
    const settle = (key, snap, res) => {
      if (res && res.ok) { this.last[key] = snap; this.retry = DEBOUNCE_MS; return; }
      this.retry = Math.min(this.retry * 2, MAX_BACKOFF_MS);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(state), this.retry);
    };
    for (const c of COLLECTIONS) {
      const snap = json(state[c] || []);
      if (this.last[c] === snap || this.inFlight.has(c)) continue;
      this.inFlight.add(c);
      this.sb.pushCollection(c, state[c] || []).then((res) => { this.inFlight.delete(c); settle(c, snap, res); });
    }
    const sSnap = json(state.settings || {});
    if (this.last.settings !== sSnap && !this.inFlight.has("settings")) {
      this.inFlight.add("settings");
      this.sb.pushSettings(state.settings || {}).then((res) => { this.inFlight.delete("settings"); settle("settings", sSnap, res); });
    }
  }
}
