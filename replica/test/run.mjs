// FixFlow replica — dependency-free test runner.
//
//   node replica/test/run.mjs
//
// Covers the extracted modules: markup (C3), clock (C4), domain (C6),
// persistence (C1), session (C2) and router (C5/C7). Browser globals are
// shimmed so the ES modules can be imported directly under Node.
const mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
};
globalThis.window = { location: { hash: "" }, FIXFLOW_SUPABASE: undefined };

let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; return true; }
  fail++; failures.push(msg);
  return false;
}
function eq(actual, expected, msg) {
  return ok(JSON.stringify(actual) === JSON.stringify(expected), `${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function group(name) { console.log(`\n${name}`); }

const markup = await import("../app/js/markup.js");
const clock = await import("../app/js/clock.js");
const persistence = await import("../app/js/persistence.js");
const domain = await import("../app/js/domain.js");
const session = await import("../app/js/session.js");
const router = await import("../app/js/router.js");
const storeMod = await import("../app/js/store.js");
const photos = await import("../app/js/photos.js");
const { store } = storeMod;

// ---------------------------------------------------------------------------
group("markup (C3)");
{
  eq(String(markup.html`<b>${"a<b>&\"c"}</b>`), "<b>a&lt;b&gt;&amp;&quot;c</b>", "html escapes interpolated text");
  eq(String(markup.html`<a href="${'x" onmouseover=alert(1)'}">y</a>`), '<a href="x&quot; onmouseover=alert(1)">y</a>', "html escapes attribute interpolation");
  const safe = markup.html`<i>ok</i>`;
  ok(markup.isSafe(safe), "html returns SafeHtml");
  eq(String(markup.html`<p>${safe}</p>`), "<p><i>ok</i></p>", "SafeHtml children are not re-escaped");
  eq(String(markup.raw("<u>raw</u>")), "<u>raw</u>", "raw passes through verbatim");
  ok(markup.isSafe(markup.raw("<u>")) && !markup.isSafe("<u>"), "isSafe distinguishes raw vs plain string");
  eq(String(markup.join([markup.html`<a>1</a>`, markup.html`<b>2</b>`], " ")), "<a>1</a> <b>2</b>", "join concatenates SafeHtml fragments");
  eq(markup.escape("<&>"), "&lt;&amp;&gt;", "escape() escapes core entities");
}

// ---------------------------------------------------------------------------
group("clock (C4)");
{
  const base = new Date(2020, 0, 5, 15, 30);
  eq(clock.isSameDay(base, new Date(2020, 0, 5, 2, 0)), true, "isSameDay true within same local day");
  eq(clock.isSameDay(base, new Date(2020, 0, 6, 2, 0)), false, "isSameDay false across days");
  eq(clock.isToday(new Date()), true, "isToday true for now");
  eq(clock.daysFromToday(new Date()), 0, "daysFromToday(now) === 0");
  eq(clock.daysFromToday(clock.addDays(new Date(), 3)), 3, "daysFromToday(addDays(now,3)) === 3");
  eq(clock.startOfDay(base).getHours(), 0, "startOfDay zeroes the time");
  eq(clock.addDays(base, 2).getDate(), 7, "addDays advances the date");
  eq(clock.fmtDate(base), "01/05/2020", "fmtDate honours default MM/DD/YYYY");
  eq(clock.fmtMonth(base), "Jan", "fmtMonth short label");
  eq(clock.fmtMonth(base, { long: true, year: true }), "January 2020", "fmtMonth long + year");
}

// ---------------------------------------------------------------------------
group("domain (C6)");
{
  eq(domain.isActiveJob({ status: "open" }), true, "open is active");
  eq(domain.isActiveJob({ status: "waiting_parts" }), true, "waiting_parts is active");
  eq(domain.isActiveJob({ status: "completed" }), false, "completed is not active");
  eq(domain.isActiveJob(null), false, "null job is not active");
  eq(domain.activeJobs([{ status: "open" }, { status: "invoiced" }]).length, 1, "activeJobs filters");

  const past = new Date(Date.now() - 3 * 864e5).toISOString();
  const future = new Date(Date.now() + 3 * 864e5).toISOString();
  eq(domain.isOverdue({ status: "overdue" }), true, "explicit overdue flagged");
  eq(domain.isOverdue({ status: "paid", dueAt: past }), false, "paid is never overdue");
  eq(domain.isOverdue({ status: "sent", dueAt: past }), true, "sent past due is overdue");
  eq(domain.isOverdue({ status: "sent", dueAt: future }), false, "sent before due is not overdue");
  eq(domain.overdueInvoices([{ status: "sent", dueAt: past }, { status: "paid", dueAt: past }]).length, 1, "overdueInvoices filters");
  eq(domain.daysOverdue({ dueAt: past }), 3, "daysOverdue counts whole days past due");
  eq(domain.pendingInvoices([{ status: "sent" }, { status: "overdue" }, { status: "paid" }]).length, 2, "pendingInvoices = sent + overdue");
  eq(domain.money(1234.5), "$1,234.50", "money formats with settings currency (USD)");
  eq(domain.money(null), "—", "money renders a placeholder for missing values");
}

// ---------------------------------------------------------------------------
group("persistence (C1)");
{
  const seedFn = () => ({ jobs: [{ id: "J1" }], settings: { a: 1 }, session: { user: "U" } });
  const local = new persistence.LocalStoragePersistence({ key: "k", seed: seedFn });
  eq(local.load().jobs[0].id, "J1", "local.load returns seeded state");
  eq(JSON.parse(mem.k).jobs[0].id, "J1", "local.load caches to localStorage");
  local.save({ jobs: [{ id: "J2" }], settings: {} });
  eq(JSON.parse(mem.k).jobs[0].id, "J2", "local.save writes state");
  eq((await local.reset()).jobs[0].id, "J1", "local.reset reseeds");
  eq(persistence.COLLECTIONS.length, 17, "COLLECTIONS is the canonical 17-collection list");

  // Supabase adapter — cloud holds data, so remote wins and local seeds nothing.
  const calls = [];
  const sbFull = {
    async pullAll() { return { ok: true, collections: { jobs: [{ id: "R1" }] }, settings: { companyName: "Cloud" }, count: 1 }; },
    markInitialized() { calls.push("markInit"); },
    async seedIfEmpty() { calls.push("seed"); },
    pushCollection(name, rows) { calls.push(["push", name, rows.length]); return Promise.resolve({ ok: true }); },
    pushSettings() { calls.push("pushSettings"); return Promise.resolve({ ok: true }); },
  };
  const fallback = { jobs: [{ id: "L1" }], customers: [{ id: "C1" }], settings: { companyName: "Local" }, session: { user: "U", role: "admin" } };
  const sup = new persistence.SupabasePersistence({ sb: sbFull, seed: seedFn });
  const res = await sup.load(fallback);
  ok(res.ok && res.seeded === false, "supabase.load ok + seeded=false when cloud has rows");
  eq(res.state.jobs[0].id, "R1", "supabase.load: remote wins for a present collection");
  eq(res.state.customers.length, 0, "supabase.load: absent collection becomes []");
  eq(res.state.settings.companyName, "Cloud", "supabase.load: remote settings win");
  eq(res.state.session.role, "admin", "supabase.load: local session identity preserved");
  ok(calls.includes("markInit") && !calls.includes("seed"), "cloud-with-data => markInitialized, not seed");
  calls.length = 0;
  sup.save({ ...res.state, jobs: [{ id: "R1" }, { id: "R2" }] });
  await new Promise((r) => setTimeout(r, 500));
  const pushes = calls.filter(Array.isArray);
  ok(pushes.some((c) => c[0] === "push" && c[1] === "jobs" && c[2] === 2), "supabase.save pushes the changed collection");
  ok(!pushes.some((c) => c[1] === "customers"), "supabase.save skips unchanged collections");

  // Supabase adapter — empty cloud seeds.
  const calls2 = [];
  const sbEmpty = {
    async pullAll() { return { ok: true, collections: {}, settings: null, count: 0 }; },
    markInitialized() { calls2.push("markInit"); },
    async seedIfEmpty(s) { calls2.push(["seed", s.jobs.length]); },
    pushCollection() { return Promise.resolve({ ok: true }); },
    pushSettings() { return Promise.resolve({ ok: true }); },
  };
  const sup2 = new persistence.SupabasePersistence({ sb: sbEmpty, seed: seedFn });
  const res2 = await sup2.load(fallback);
  ok(res2.seeded === true, "empty cloud => seeded=true");
  ok(calls2.some((c) => Array.isArray(c) && c[0] === "seed") && !calls2.includes("markInit"), "empty cloud => seedIfEmpty, not markInitialized");
}

// ---------------------------------------------------------------------------
group("session (C2)");
{
  eq(session.can(session.ACTIONS.DATA_RESET, { role: "admin" }), true, "admin can data.reset");
  eq(session.can(session.ACTIONS.DATA_RESET, { role: "member" }), false, "member cannot data.reset");
  eq(session.can(session.ACTIONS.SETTINGS_WRITE, { role: "manager" }), true, "manager can settings.write");
  eq(session.can(session.ACTIONS.DATA_WRITE, { role: "technician" }), true, "technician can data.write");
  eq(session.can(session.ACTIONS.DATA_WRITE, { role: "viewer" }), false, "viewer cannot data.write");
  eq(session.can("unknown.action", { role: "manager" }), false, "unknown action denied by default");
  eq(session.can(session.ACTIONS.DATA_RESET, null), false, "no session => denied");
  eq(session.currentRole(null), "viewer", "currentRole defaults to viewer");
  eq(typeof session.demoAdapter.signIn, "function", "demo adapter exposes signIn");

  let signedIn = null, signedOut = 0;
  const adapter = session.supabaseAdapter({
    async signIn(email, password) { signedIn = email; return { ok: true, display: { user: "A", role: "admin" } }; },
    async signOut() { signedOut++; },
  });
  const r = await adapter.signIn("a@b.c", "pw");
  ok(r.ok && r.session.role === "admin" && signedIn === "a@b.c", "supabase adapter returns a session on success");
  await adapter.signOut();
  eq(signedOut, 1, "supabase adapter delegates signOut");
  const bad = await session.supabaseAdapter({ async signIn() { return { ok: false, error: "nope" }; }, async signOut() {} }).signIn("x", "y");
  ok(!bad.ok && bad.error === "nope", "supabase adapter propagates sign-in errors");
}

// ---------------------------------------------------------------------------
group("router (C5/C7)");
{
  window.location.hash = "#/jobs?q=acme";
  eq(router.parseHash(), { id: "jobs", params: { q: "acme" } }, "parseHash reads id + query");
  window.location.hash = "#/job-details/JOB-2000";
  eq(router.parseHash(), { id: "job-details", params: { id: "JOB-2000" } }, "parseHash reads detail id segment");
  window.location.hash = "";
  const empty = router.parseHash();
  ok(empty.id === "dashboard" || empty.id === "login", "empty hash falls back to dashboard/login by session");
  router.navigate("settings", { tab: "billing" });
  eq(window.location.hash, "#/settings?tab=billing", "navigate builds hash with params");
  let calls = 0;
  const off = router.onRoute(() => calls++);
  router.refresh();
  eq(calls, 1, "refresh invokes the registered handler");
  off();
  router.refresh();
  eq(calls, 1, "onRoute returns an unsubscribe");
}

// ---------------------------------------------------------------------------
group("store wiring (C1)");
{
  ok(Array.isArray(store.jobs) && store.jobs.length > 0, "store exposes seeded collections");
  eq(store.source, "local", "store.source is local without Supabase");
  store.session = { user: "Tester", role: "admin", initials: "T" };
  eq(store.session.user, "Tester", "store.session is writable through the proxy");
  const before = store.customers.length;
  storeMod.mutate((s) => s.customers.push({ id: "CUST-TEST", company: "Probe" }));
  eq(store.customers.length, before + 1, "mutate updates in-memory state");
  ok(JSON.parse(mem["fixflow.replica.v1"]).customers.some((c) => c.id === "CUST-TEST"), "mutate persists to the local adapter");
  eq(session.isRealSession(), false, "offline store reports no real session");
}

// ---------------------------------------------------------------------------
group("repair photos (C8)");
{
  const jpeg = (b64) => `data:image/jpeg;base64,${b64}`;
  eq(photos.bytesOf(""), 0, "bytesOf tolerates an empty string");
  eq(photos.bytesOf(undefined), 0, "bytesOf tolerates a non-string");
  eq(photos.bytesOf("not-a-data-url"), 0, "bytesOf needs a comma");
  eq(photos.bytesOf("data:image/jpeg;base64,AAAA"), 3, "bytesOf decodes base64 length");
  eq(photos.bytesOf("data:image/jpeg;base64,AAA="), 2, "bytesOf accounts for one pad char");
  eq(photos.bytesOf("data:image/jpeg;base64,AA=="), 1, "bytesOf accounts for two pad chars");

  const before = { id: "P1", stage: "before", dataUrl: jpeg("AAAA"), bytes: 3 };
  const after = { id: "P2", stage: "after", dataUrl: jpeg("AAAAAAAA"), bytes: 6 };
  const job = { id: "JOB-1", photos: [before, after] };

  eq(photos.photosOf(job).length, 2, "photosOf returns every photo");
  eq(photos.photosOf(job, "before").map((p) => p.id), ["P1"], "photosOf filters by stage");
  eq(photos.photosOf({}, "before").length, 0, "photosOf tolerates a job without photos");
  eq(photos.photosOf({ photos: [null, { stage: "before" }] }, "before").length, 0, "photosOf skips malformed entries");
  eq(photos.photosOf(job, "before"), photos.photosOf({ ...job, photos: [before] }, "before"), "photosOf is stable for one stage");

  eq(photos.photoStats(job), { count: 2, before: 1, after: 1, bytes: 9 }, "photoStats counts stages and bytes");
  eq(photos.photoStats({}).count, 0, "photoStats tolerates a job without photos");

  const heavy = { photos: [{ stage: "before", dataUrl: jpeg("AAAA") }, { stage: "before", dataUrl: jpeg("AAAA") }] };
  eq(photos.totalPhotoBytes([job, heavy]), 15, "totalPhotoBytes sums across jobs");
  eq(photos.totalPhotoBytes(), 0, "totalPhotoBytes tolerates no argument");

  ok(photos.hasPair(job), "hasPair is true with one photo per stage");
  ok(!photos.hasPair({ photos: [before] }), "hasPair is false without an after photo");
  ok(!photos.hasPair({}), "hasPair is false for a job without photos");

  const roomy = { photos: [{ stage: "before", dataUrl: jpeg("AAAA") }] };
  ok(photos.canAdd(roomy, "before").ok, "canAdd allows before a stage is full");
  ok(photos.canAdd(roomy, "after").ok, "canAdd counts stages independently");
  const fullStage = { photos: Array.from({ length: photos.MAX_PER_STAGE }, () => ({ stage: "after", dataUrl: jpeg("AAAA") })) };
  eq(photos.canAdd(fullStage, "after").ok, false, "canAdd blocks a full stage");
  ok(photos.canAdd(fullStage, "before").ok, "canAdd leaves the other stage open");
  ok(photos.canAdd(fullStage, "after").reason.includes("limit"), "canAdd explains the limit");

  eq(photos.formatBytes(0), "0 KB", "formatBytes reads 0 KB for nothing stored");
  eq(photos.formatBytes(512), "512 B", "formatBytes keeps small sizes in bytes");
  eq(photos.formatBytes(2048), "2 KB", "formatBytes rounds kilobytes");
  eq(photos.formatBytes(3 * 1024 * 1024), "3.0 MB", "formatBytes switches to megabytes");

  eq(photos.STAGES, ["before", "after"], "STAGES is the before/after pair");
  ok(photos.MAX_PHOTO_BYTES > 0 && photos.MAX_PHOTO_BYTES * photos.MAX_PER_STAGE * photos.STAGES.length <= photos.BUDGET_BYTES * 2,
    "per-photo and per-stage caps stay proportionate to the budget");
}

// ---------------------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f}`);
}
process.exit(fail ? 1 : 0);
