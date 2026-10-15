import { store } from "../store.js";
import { esc, money, fmtDate, toast, iconSvg } from "../util.js";
import { pageHead, statCard, card, buildTable, barChart, lineChart, donutChart, emptyState, progressBar } from "../components.js";
import { customerName, customerById, techName, monthlySeries, jobRevenue } from "../lookups.js";
import { exportCsv } from "./jobs.js";

export const reports = {
  title: "Reports",
  crumb: () => ["Reports"],
  render() {
    const series = monthlySeries(6);
    const completed = store.jobs.filter((j) => ["completed", "invoiced"].includes(j.status));
    const byDevice = {};
    store.jobs.forEach((j) => (byDevice[j.deviceType] = (byDevice[j.deviceType] || 0) + 1));
    const deviceSegments = Object.entries(byDevice).map(([label, value], i) => ({ label, value, color: ["#2f5bea", "#0ea5e9", "#8b5cf6", "#f97316", "#10b981", "#ef4444", "#14b8a6", "#eab308"][i % 8] }));
    const byType = {};
    store.jobs.forEach((j) => (byType[j.serviceType] = (byType[j.serviceType] || 0) + 1));
    const topCustomers = [...store.customers].map((c) => ({ ...c, spend: store.invoices.filter((i) => i.customerId === c.id).reduce((s, i) => s + i.total, 0) })).sort((a, b) => b.spend - a.spend).slice(0, 6);
    const avgTurnaround = completed.length ? (completed.reduce((s, j) => s + j.laborHours, 0) / completed.length).toFixed(1) : "0";
    const totalRevenue = store.invoices.filter((i) => i.status !== "cancelled").reduce((s, i) => s + i.total, 0);

    return `
    ${pageHead("Reports", "Business analytics and financial reports", `
      <select class="select-sm" id="range"><option>Last 30 days</option><option selected>Last 6 months</option><option>Year to date</option><option>All time</option></select>
      <button class="btn btn-secondary" id="export-report">${iconSvg("download", 15)} Export CSV</button>
      <button class="btn btn-primary" id="build-report">${iconSvg("plus", 15)} Build custom report</button>`)}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Total Revenue", value: money(totalRevenue), iconName: "dollar", delta: 14.2, foot: "vs prior period" })}
      ${statCard({ label: "Jobs Completed", value: completed.length, iconName: "check" })}
      ${statCard({ label: "Avg Turnaround", value: avgTurnaround + "h", iconName: "clock" })}
      ${statCard({ label: "Avg Repair Cost", value: money(Math.round(store.jobs.reduce((s, j) => s + j.estimatedCost, 0) / store.jobs.length)), iconName: "dollar" })}
    </div>
    <div class="grid grid-2" style="margin-bottom:16px">
      ${card("Revenue trend", lineChart([{ data: series.map((s) => ({ label: s.label, value: s.revenue })), color: "var(--accent)", fill: true }]), { sub: "Monthly revenue" })}
      ${card("Job volume trend", barChart(series.map((s) => ({ label: s.label, value: s.jobs })), { color: "var(--accent)", height: 200 }), { sub: "Jobs created per month" })}
    </div>
    <div class="grid grid-3" style="margin-bottom:16px">
      ${card("Repairs by device type", `<div style="display:flex;justify-content:center">${donutChart(deviceSegments)}</div>
        <div class="legend">${deviceSegments.slice(0, 6).map((s) => `<span class="legend-item"><span class="legend-swatch" style="background:${s.color}"></span>${esc(s.label)} (${s.value})</span>`).join("")}</div>`)}
      ${card("Breakdown by job type", Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
        <div style="margin-bottom:12px"><div class="row" style="justify-content:space-between;margin-bottom:4px"><span class="small">${esc(k)}</span><b class="small">${v}</b></div>${progressBar((v / store.jobs.length) * 100)}</div>`).join(""), { tight: false })}
      ${card("KPI scorecard", `
        <div class="kv" style="grid-template-columns:1fr auto">
          <dt>Completion rate</dt><dd>${store.jobs.length ? Math.round((completed.length / store.jobs.length) * 100) : 0}%</dd>
          <dt>Invoice collection</dt><dd>${store.invoices.length ? Math.round((store.invoices.filter((i) => i.status === "paid").length / store.invoices.length) * 100) : 0}%</dd>
          <dt>Repeat customers</dt><dd>${store.customers.filter((c) => store.jobs.filter((j) => j.customerId === c.id).length > 1).length}</dd>
          <dt>Avg job value</dt><dd>${money(Math.round(totalRevenue / store.jobs.length))}</dd>
          <dt>Parts cost ratio</dt><dd>${Math.round((store.jobs.reduce((s, j) => s + j.partsCost, 0) / store.jobs.reduce((s, j) => s + j.estimatedCost, 0)) * 100)}%</dd>
        </div>`)}
    </div>
    ${card("Top customers by spend", buildTable({
      columns: [
        { key: "company", label: "Customer" },
        { key: "jobs", label: "Jobs", cls: "num", render: (r) => store.jobs.filter((j) => j.customerId === r.id).length },
        { key: "spend", label: "Total Spend", cls: "num", render: (r) => money(r.spend) },
        { key: "share", label: "Share", render: (r) => { const pct = totalRevenue ? Math.round((r.spend / totalRevenue) * 100) : 0; return `<div style="min-width:120px">${progressBar(pct)}<span class="small muted">${pct}%</span></div>`; } },
      ], rows: topCustomers,
    }), { tight: true })}`;
  },
  mount(root) {
    root.querySelector("#export-report")?.addEventListener("click", () => exportCsv("report", ["id", "status", "estimatedCost", "createdAt"], store.jobs));
    root.querySelector("#build-report")?.addEventListener("click", () => toast("Custom report", "Report builder opened.", "info"));
    root.querySelector("#range")?.addEventListener("change", (e) => toast("Range updated", e.target.value, "info"));
  },
};
