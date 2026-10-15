// FixFlow replica — Supabase persistence layer.
//
// Loads @supabase/supabase-js from a CDN so the app stays build-free.
// Data model: one row per entity in `ff_records` (collection, id, data jsonb),
// plus a singleton row in `ff_settings`. See replica/supabase/schema.sql.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = (typeof window !== "undefined" && window.FIXFLOW_SUPABASE) || {};
export const SUPABASE_URL = cfg.url || "";
export const SUPABASE_ANON_KEY = cfg.anonKey || "";
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  : null;

const RECORDS = "ff_records";
const SETTINGS = "ff_settings";

export const COLLECTIONS = [
  "technicians", "customers", "jobs", "invoices", "payments", "suppliers", "parts",
  "contracts", "workOrders", "templates", "recurringJobs", "assets", "conversations",
  "auditLogs", "gdprRequests", "notifications", "serviceRequests",
];

// Pull every collection + settings. Returns { ok, collections, settings, error }.
export async function pullAll() {
  if (!supabaseConfigured) return { ok: false, error: "Supabase not configured" };
  try {
    const { data: rows, error } = await supabase.from(RECORDS).select("collection,id,data");
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

// Replace a whole collection atomically-ish (delete then insert). Simple + correct
// for demo-sized data; handles removals as well as additions/edits.
export async function pushCollection(name, rows) {
  if (!supabaseConfigured) return;
  try {
    const { error: derr } = await supabase.from(RECORDS).delete().eq("collection", name);
    if (derr) throw derr;
    if (rows && rows.length) {
      const payload = rows.map((r) => ({ collection: name, id: String(r.id ?? crypto.randomUUID()), data: r }));
      const { error: ierr } = await supabase.from(RECORDS).insert(payload);
      if (ierr) throw ierr;
    }
  } catch (e) {
    console.warn(`[fixflow] Supabase push failed for ${name}:`, e.message || e);
  }
}

export async function pushSettings(settings) {
  if (!supabaseConfigured) return;
  try {
    const { error } = await supabase.from(SETTINGS).upsert({ id: "default", data: settings });
    if (error) throw error;
  } catch (e) {
    console.warn("[fixflow] Supabase settings push failed:", e.message || e);
  }
}

// Seed an empty/partial database from a local object. Only inserts collections
// that are currently empty remotely, so it never clobbers existing data.
export async function seedIfEmpty(local) {
  if (!supabaseConfigured) return;
  for (const name of COLLECTIONS) {
    const { count, error } = await supabase.from(RECORDS).select("id", { count: "exact", head: true }).eq("collection", name);
    if (error) { console.warn(`[fixflow] seed check failed for ${name}:`, error.message); continue; }
    if (!count && local[name]?.length) await pushCollection(name, local[name]);
  }
  const { data: srow } = await supabase.from(SETTINGS).select("data").eq("id", "default").maybeSingle();
  if (srow && (!srow.data || Object.keys(srow.data).length === 0) && local.settings) await pushSettings(local.settings);
}
