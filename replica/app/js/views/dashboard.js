import { store } from "../store.js";
import { esc, money, fmtDate, statusBadge, invoiceBadge, priorityBadge, timeAgo, iconSvg, avatar } from "../util.js";
import { pageHead, statCard, card, buildTable, donutChart, lineChart, barChart, emptyState } from "../components.js";
import { customerName, techName, monthlySeries } from "../lookups.js";

function kpis() {
  const jobs = store.jobs;
  const open = jobs.filter((j) => ["open", "in_progress", "waiting_parts"].includes(j.status)).length;
  const activeTechs = store.technicians.filter((t) => t.status !== "off").length;
  const pendingInv = store.invoices.filter((i) => ["sent", "overdue"].includes(i.status));
  const pendingTotal = pendingInv.reduce((s, i) => s + i.total, 0);
  const revenue30 = store.payments.filter((p) => Date.now() - new Date(p.recordedAt).getTime() < 30 * 864e5).reduce((s, p) => s + p.amount, 0);
  const completed = jobs.filter((j) => ["completed", "invoiced"].includes(j.status));
  return { jobs, open, activeTechs, pendingInv, pendingTotal, revenue30, completed };
}

export const dashboard = {
  title: "Dashboard",
  crumb: () => ["Dashboard"],
  render() {
    const k = kpis();
    const series = monthlySeries(6);
    const statusSegments = [
      { label: "Open", value: store.jobs.filter((j) => j.status === "open").length, color: "#2563eb" },
      { label: "In Progress", value: store.jobs.filter((j) => j.status === "in_progress").length, color: "#2f5bea" },
      { label: "Waiting Parts", value: store.jobs.filter((j) => j.status === "waiting_parts").length, color: "#eab308" },
      { label: "Completed", value: store.jobs.filter((j) => j.status === "completed").length, color: "#16a34a" },
      { label: "Invoiced", value: store.jobs.filter((j) => j.status === "invoiced").length, color: "#6d28d9" },
    ];
    const recent = [...store.jobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 7);
    const lowStock = store.parts.filter((p) => p.quantity <= p.reorderLevel);
    const upcoming = store.jobs
      .filter((j) => j.scheduledDate && new Date(j.scheduledDate) >= new Date(Date.now() - 864e5) && j.status !== "completed" && j.status !== "invoiced")
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).slice(0, 5);
    const overdue = store.invoices.filter((i) => i.status === "overdue");

    return `
    ${pageHead("Dashboard", "Overview of jobs, revenue and operations", `
      <button class="btn btn-secondary" data-nav="reports">${iconSvg("chart", 15)} Reports</button>
      <button class="btn btn-primary" data-nav="new-job">${iconSvg("plus", 15)} New Job</button>`)}

    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Active Jobs", value: k.open, iconName: "briefcase", delta: 8.2, foot: "vs last week" })}
      ${statCard({ label: "Revenue (30d)", value: money(k.revenue30), iconName: "dollar", delta: 12.4, foot: "vs prior 30d" })}
      ${statCard({ label: "Pending Invoices", value: k.pendingInv.length, iconName: "file", delta: -3.1, foot: money(k.pendingTotal) + " outstanding", tone: "var(--warning)" })}
      ${statCard({ label: "Active Technicians", value: k.activeTechs + " / " + store.technicians.length, iconName: "wrench", foot: "on shift today" })}
    </div>

    <div class="grid" style="grid-template-columns:2fr 1fr;margin-bottom:16px">
      ${card("Revenue & Job Volume", lineChart([
        { data: series.map((s) => ({ label: s.label, value: s.revenue })), color: "var(--accent)", fill: true },
      ]), {
        sub: "Last 6 months",
        actions: `<div class="legend" style="margin:0"><span class="legend-item"><span class="legend-swatch" style="background:var(--accent)"></span>Revenue</span></div>`,
      })}
      ${card("Jobs by Status", `<div style="display:flex;justify-content:center">${donutChart(statusSegments)}</div>
        <div class="legend">${statusSegments.map((s) => `<span class="legend-item"><span class="legend-swatch" style="background:${s.color}"></span>${esc(s.label)} (${s.value})</span>`).join("")}</div>`)}
    </div>

    <div class="grid" style="grid-template-columns:2fr 1fr">
      ${card("Recent Jobs", buildTable({
        columns: [
          { key: "id", label: "Job", render: (r) => `<div class="cell-main">${esc(r.id)}</div><div class="cell-sub">${esc(r.deviceType)}</div>` },
          { key: "customer", label: "Customer", render: (r) => `<div class="cell-flex">${avatar(customerName(r.customerId))}<span>${esc(customerName(r.customerId))}</span></div>` },
          { key: "technicianId", label: "Technician", render: (r) => esc(techName(r.technicianId)) },
          { key: "status", label: "Status", render: (r) => statusBadge(r.status) },
          { key: "priority", label: "Priority", render: (r) => priorityBadge(r.priority) },
        ],
        rows: recent,
        rowId: (r) => r.id,
      }), { tight: true, actions: `<span class="link small" data-nav="jobs">View all</span>` })}
      <div class="grid" style="gap:16px">
        ${card("Low Stock Alerts", lowStock.length ? lowStock.slice(0, 4).map((p) => `
          <div class="list-item" style="padding:10px 0">
            <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(p.name)}</div><div class="cell-sub">${esc(p.sku)}</div></div>
            <span class="badge badge-danger">${p.quantity} left</span>
          </div>`).join("") : emptyState("All stocked", "No parts below reorder level.", "", "check"), { tight: true, body: "" })}
        ${card("Upcoming Schedule", upcoming.length ? upcoming.map((j) => `
          <div class="list-item" style="padding:10px 0">
            <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(j.title)}</div>
            <div class="cell-sub">${esc(customerName(j.customerId))}</div></div>
            <span class="small muted">${esc(fmtDate(j.scheduledDate))}</span>
          </div>`).join("") : emptyState("Nothing scheduled", "No jobs on the calendar.", "", "calendar"), { tight: true })}
        ${overdue.length ? card("Overdue Invoices", overdue.slice(0, 3).map((i) => `
          <div class="list-item" style="padding:10px 0" data-detail-invoice="${esc(i.id)}">
            <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(i.number)}</div>
            <div class="cell-sub">${esc(customerName(i.customerId))}</div></div>
            <div style="text-align:right"><div style="font-weight:600">${money(i.total)}</div>${invoiceBadge(i.status)}</div>
          </div>`).join("") , { tight: true }) : ""}
      </div>
    </div>`;
  },
  mount(root) {
    root.querySelectorAll("tr[data-row]").forEach((tr) => tr.addEventListener("click", () => {
      if (tr.dataset.row) window.location.hash = "#/job-details/" + tr.dataset.row;
    }));
    root.querySelectorAll("[data-detail-invoice]").forEach((n) => n.addEventListener("click", () => {
      window.location.hash = "#/invoice-details/" + n.dataset.detailInvoice;
    }));
  },
};

export const home = {
  title: "Home",
  crumb: () => ["Home"],
  render() {
    const k = kpis();
    const s = store.settings;
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const quick = [
      ["new-job", "plus", "Create Job", "Log a new repair intake"],
      ["customers", "users", "Add Customer", "Register a new account"],
      ["schedule", "calendar", "Open Schedule", "Plan technician workloads"],
      ["new-invoice", "file", "New Invoice", "Bill a completed job"],
      ["request-service", "clipboard", "Request Service", "Customer intake form"],
      ["reports", "chart", "Run Report", "Revenue & turnaround"],
    ];
    return `
    ${pageHead(greet + ", " + (store.session?.user?.split(" ")[0] || "there"), "Here is what is happening at " + s.companyName + " today")}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Open Jobs", value: k.open, iconName: "briefcase", foot: "needs attention" })}
      ${statCard({ label: "Completed", value: k.jobs.filter((j) => j.status === "completed").length, iconName: "check", foot: "awaiting invoice" })}
      ${statCard({ label: "Customers", value: store.customers.length, iconName: "users", foot: "active accounts" })}
      ${statCard({ label: "Outstanding", value: money(k.pendingTotal), iconName: "dollar", foot: k.pendingInv.length + " invoices" })}
    </div>
    ${card("Quick Actions", `<div class="grid grid-3">
      ${quick.map(([id, ic, t, d]) => `
        <div class="list-item" style="border:1px solid var(--border);border-radius:12px;cursor:pointer" data-nav="${id}">
          <div class="e-ico" style="width:38px;height:38px;border-radius:10px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;margin:0">${iconSvg(ic, 18)}</div>
          <div><div style="font-weight:600;font-size:13.5px">${esc(t)}</div><div class="cell-sub">${esc(d)}</div></div>
        </div>`).join("")}
    </div>`)}
    <div class="grid grid-2" style="margin-top:16px">
      ${card("Today's Agenda", (() => {
        const today = store.jobs.filter((j) => j.scheduledDate && new Date(j.scheduledDate).toDateString() === new Date().toDateString());
        return today.length ? today.map((j) => `
          <div class="list-item" style="padding:10px 0">
            <span class="badge badge-progress">${esc(fmtDate(j.scheduledDate))}</span>
            <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(j.title)}</div><div class="cell-sub">${esc(customerName(j.customerId))} · ${esc(techName(j.technicianId))}</div></div>
            ${statusBadge(j.status)}
          </div>`).join("") : emptyState("No jobs today", "Your agenda is clear.", "", "calendar");
      }), { tight: true })}
      ${card("Recent Activity", store.auditLogs.slice(0, 6).map((l) => `
        <div class="list-item" style="padding:10px 0">
          <span class="pill">${esc(l.action)}</span>
          <div style="flex:1"><div style="font-size:13px"><b>${esc(l.entityType)}</b> ${esc(l.entityId)}</div>
          <div class="cell-sub">${esc(l.user)} · ${timeAgo(l.at)}</div></div>
        </div>`).join(""), { tight: true })}
    </div>`;
  },
};
