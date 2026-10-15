import { store } from "./store.js";
import { fmtMonth } from "./clock.js";

export const customerById = (id) => store.customers.find((c) => c.id === id);
export const techById = (id) => store.technicians.find((t) => t.id === id);
export const jobById = (id) => store.jobs.find((j) => j.id === id);
export const invoiceById = (id) => store.invoices.find((i) => i.id === id);
export const partById = (id) => store.parts.find((p) => p.id === id);
export const supplierById = (id) => store.suppliers.find((s) => s.id === id);
export const contractById = (id) => store.contracts.find((c) => c.id === id);

export const customerName = (id) => customerById(id)?.company || customerById(id)?.name || "Unknown";
export const techName = (id) => techById(id)?.name || "Unassigned";

export function revenueInRange(days = 30) {
  const cutoff = Date.now() - days * 864e5;
  return store.payments.filter((p) => new Date(p.recordedAt).getTime() >= cutoff).reduce((s, p) => s + p.amount, 0);
}

export function jobRevenue() {
  return store.invoices.filter((i) => i.status !== "cancelled").reduce((s, i) => s + i.total, 0);
}

export function monthlySeries(months = 6) {
  const now = new Date();
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = fmtMonth(d);
    const inMonth = (ts) => { const x = new Date(ts); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(); };
    const revenue = store.invoices.filter((inv) => inv.status !== "cancelled" && inMonth(inv.issuedAt)).reduce((s, inv) => s + inv.total, 0);
    const jobs = store.jobs.filter((j) => inMonth(j.createdAt)).length;
    out.push({ label, revenue, jobs });
  }
  return out;
}
