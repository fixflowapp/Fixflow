// Clock — one policy for "now", day math and display formatting.
//
// Everything that asks "is this today?", "how many days away?" or "how do we
// print a date?" goes through here, so the app has a single notion of time
// (and a single place to change the date format policy).
import { store } from "./store.js";

export const DAY_MS = 864e5;

export function now() {
  return new Date();
}

export function toDate(d) {
  if (d instanceof Date) return isNaN(d) ? null : d;
  if (d == null || d === "") return null;
  const x = new Date(d);
  return isNaN(x) ? null : x;
}

export function startOfDay(d = now()) {
  const x = toDate(d);
  return x ? new Date(x.getFullYear(), x.getMonth(), x.getDate()) : null;
}

export function addDays(d, n) {
  const x = toDate(d);
  return x ? new Date(x.getTime() + n * DAY_MS) : null;
}

export function isSameDay(a, b) {
  const x = toDate(a), y = toDate(b);
  if (!x || !y) return false;
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

export function isToday(d) {
  return isSameDay(d, now());
}

// Whole days from today to d (negative = past, 0 = today).
export function daysFromToday(d) {
  const x = startOfDay(d);
  return x ? Math.round((x.getTime() - startOfDay().getTime()) / DAY_MS) : null;
}

// Date format policy: settings-driven, MM/DD/YYYY by default.
function dateFormat() {
  return (store && store.settings && store.settings.dateFormat) || "MM/DD/YYYY";
}

export function fmtDate(d, fmt = dateFormat()) {
  const date = toDate(d);
  if (!date) return "—";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  if (fmt === "YYYY-MM-DD") return `${yyyy}-${mm}-${dd}`;
  if (fmt === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;
  return `${mm}/${dd}/${yyyy}`;
}

export function fmtDateTime(d) {
  const date = toDate(d);
  if (!date) return "—";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function fmtMonth(d, { long = false, year = false } = {}) {
  const date = toDate(d);
  if (!date) return "—";
  const opts = { month: long ? "long" : "short" };
  if (year) opts.year = "numeric";
  return date.toLocaleString("en-US", opts);
}

export function timeAgo(d) {
  const date = toDate(d);
  if (!date) return "—";
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(date);
}
