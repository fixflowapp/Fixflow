// Domain — the app's business rules in one place.
//
// "Active job", "overdue invoice" and money formatting were each re-defined at
// several call sites; they live here so the whole app agrees on the rules.
import { store } from "./store.js";
import { now, toDate, DAY_MS } from "./clock.js";

// A job is "active" while work is still open — not yet completed/invoiced/cancelled.
export const ACTIVE_JOB_STATUSES = ["open", "in_progress", "waiting_parts"];

export function isActiveJob(job) {
  return !!job && ACTIVE_JOB_STATUSES.includes(job.status);
}

export function activeJobs(jobs = store.jobs) {
  return jobs.filter(isActiveJob);
}

// Invoices that are owed but not yet settled.
export const PENDING_INVOICE_STATUSES = ["sent", "overdue"];

export function pendingInvoices(invoices = store.invoices) {
  return invoices.filter((i) => PENDING_INVOICE_STATUSES.includes(i.status));
}

// An invoice is overdue if flagged as such, or still "sent" past its due date.
export function isOverdue(invoice, at = now()) {
  if (!invoice) return false;
  if (invoice.status === "overdue") return true;
  if (invoice.status !== "sent") return false;
  const due = toDate(invoice.dueAt);
  const ref = toDate(at);
  return !!due && !!ref && due.getTime() < ref.getTime();
}

export function overdueInvoices(invoices = store.invoices, at = now()) {
  return invoices.filter((i) => isOverdue(i, at));
}

export function daysOverdue(invoice, at = now()) {
  const due = toDate(invoice && invoice.dueAt);
  const ref = toDate(at);
  if (!due || !ref) return 0;
  return Math.max(0, Math.floor((ref.getTime() - due.getTime()) / DAY_MS));
}

// Money is formatted with the configured currency.
export function money(n, currency) {
  const cur = currency || store.settings?.currency || "USD";
  if (n == null || isNaN(n)) return "—";
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(n); }
  catch { return `$${Number(n).toFixed(2)}`; }
}
