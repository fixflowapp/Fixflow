// FixFlow replica — Supabase persistence + auth layer.
//
// Loads @supabase/supabase-js from a CDN so the app stays build-free.
// Data model: one row per entity in `ff_records` (collection, id, data jsonb),
// plus a singleton row in `ff_settings`. See replica/supabase/schema.sql.
//
// Security: the anon key is shipped in the browser and therefore public. The
// schema denies the anon role all access; every read/write requires a signed-in
// session. Never move privileged work (seeding, admin) into this module.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { COLLECTIONS } from "./persistence.js";

const cfg = (typeof window !== "undefined" && window.FIXFLOW_SUPABASE) || {};
export const SUPABASE_URL = cfg.url || "";
export const SUPABASE_ANON_KEY = cfg.anonKey || "";
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

const RECORDS = "ff_records";
const SETTINGS = "ff_settings";

export { COLLECTIONS };

// ---------------------------------------------------------------------------
// Auth — the only source of truth for "who is signed in".
// ---------------------------------------------------------------------------
export async function getSession() {
  if (!supabaseConfigured) return null;
  try { const { data } = await supabase.auth.getSession(); return data?.session || null; }
  catch { return null; }
}

export function sessionToDisplay(session) {
  const u = session?.user;
  if (!u) return null;
  const meta = u.user_metadata || {};
  const name = meta.name || (u.email ? u.email.split("@")[0] : "User");
  const initials = name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join("") || "U";
  return { user: name, email: u.email, role: meta.role || "member", initials };
}

export async function signIn(email, password) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase is not configured." };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, session: data.session, display: sessionToDisplay(data.session) };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// With email confirmation enabled, Supabase returns a user but no session: the
// account exists and is awaiting confirmation. That is a success with a notice,
// not an error, so it is reported as { ok: true, pending: true }.
export async function signUp(email, password, name) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase is not configured." };
  try {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) return { ok: false, error: error.message };
    if (!data.session) return { ok: true, pending: true, email };
    return { ok: true, session: data.session, display: sessionToDisplay(data.session) };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// Deliberately reports success even for an unknown address: Supabase does not
// disclose whether an account exists, and neither should this UI.
export async function resetPasswordForEmail(email, redirectTo) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase is not configured." };
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// Only valid while a recovery session is active — i.e. after following the link
// from the reset email, which signs the user in with a short-lived session.
export async function updatePassword(password) {
  if (!supabaseConfigured) return { ok: false, error: "Supabase is not configured." };
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

export async function signOut() {
  if (!supabaseConfigured) return;
  try { await supabase.auth.signOut(); } catch { /* best effort */ }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export async function pullAll() {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  try {
    const { data: rows, error } = await supabase.from(RECORDS).select("collection,id,data").order("id", { ascending: true });
    if (error) throw error;
    const collections = Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
    for (const r of rows || []) {
      if (!collections[r.collection]) collections[r.collection] = [];
      collections[r.collection].push(r.data);
    }
    const { data: srow, error: serr } = await supabase.from(SETTINGS).select("data").eq("id", "default").maybeSingle();
    if (serr) throw serr;
    return { ok: true, collections, settings: srow?.data || null, count: (rows || []).length };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// ---------------------------------------------------------------------------
// Writes — non-destructive: upsert every row, then prune only the ids that
// were removed locally. No whole-collection DELETE, so an interrupted write
// can never leave the collection empty.
// ---------------------------------------------------------------------------
const ATTEMPTS = 3;
const quoteId = (id) => `"${String(id).replace(/"/g, "")}"`;

async function withRetry(fn) {
  let last = { ok: false, error: "unknown" };
  for (let i = 0; i < ATTEMPTS; i++) {
    last = await fn();
    if (last.ok) return last;
    if (i < ATTEMPTS - 1) await new Promise((r) => setTimeout(r, 300 * (i + 1)));
  }
  return last;
}

export function pushCollection(name, rows) {
  return withRetry(async () => {
    if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
    try {
      const list = rows || [];
      const payload = list.map((r) => ({ collection: name, id: String(r.id ?? crypto.randomUUID()), data: r }));
      if (payload.length) {
        const { error } = await supabase.from(RECORDS).upsert(payload, { onConflict: "collection,id" });
        if (error) throw error;
      }
      const ids = payload.map((p) => p.id);
      let q = supabase.from(RECORDS).delete().eq("collection", name);
      if (ids.length) q = q.not("id", "in", `(${ids.map(quoteId).join(",")})`);
      const { error: derr } = await q;
      if (derr) throw derr;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });
}

export function pushSettings(settings) {
  return withRetry(async () => {
    if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
    try {
      const { error } = await supabase.from(SETTINGS).upsert({ id: "default", data: settings });
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });
}

// A `meta` row in ff_settings records that this database has been initialized.
// It is invisible to the app: pullAll and pushSettings only ever touch id='default'.
const META_ID = "meta";

export async function isInitialized() {
  if (!supabaseConfigured) return false;
  try {
    const { data } = await supabase.from(SETTINGS).select("data").eq("id", META_ID).maybeSingle();
    return Boolean(data?.data?.initialized);
  } catch { return false; }
}

// Best effort: remember that a database holding data has been initialized, so an
// intentionally emptied database is never silently re-seeded on the next boot.
export async function markInitialized() {
  if (!supabaseConfigured) return;
  try {
    await supabase.from(SETTINGS).upsert({ id: META_ID, data: { initialized: true, at: new Date().toISOString() } });
  } catch { /* non-fatal */ }
}

// Seed an empty/partial database from a local object. Runs at most once per
// database: if it was initialized before, an empty state means the user deleted
// the data, so it is left alone. For a fresh database it only fills collections
// that are currently empty remotely, so it never clobbers existing data.
export async function seedIfEmpty(local) {
  if (!supabaseConfigured) return;
  if (await isInitialized()) return;
  for (const name of COLLECTIONS) {
    const { count, error } = await supabase.from(RECORDS).select("id", { count: "exact", head: true }).eq("collection", name);
    if (error) { console.warn(`[fixflow] seed check failed for ${name}:`, error.message); continue; }
    if (!count && local[name]?.length) await pushCollection(name, local[name]);
  }
  const { data: srow } = await supabase.from(SETTINGS).select("data").eq("id", "default").maybeSingle();
  if (srow && (!srow.data || Object.keys(srow.data).length === 0) && local.settings) await pushSettings(local.settings);
  await markInitialized();
}
