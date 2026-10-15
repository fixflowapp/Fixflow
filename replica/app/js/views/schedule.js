import { store, mutate, logAudit, id as uid } from "../store.js";
import { esc, money, fmtDate, timeAgo, statusBadge, priorityBadge, avatar, toast, modal, closeModal, confirmDialog, iconSvg, titleCase, initials } from "../util.js";
import { pageHead, statCard, card, buildTable, emptyState, toolbar, buildForm, readForm, validateForm, barChart, lineChart, progressBar, donutChart } from "../components.js";
import { customerName, techName, techById, jobById, customerById, monthlySeries } from "../lookups.js";

// ---------- Schedule (calendar) ----------
export const schedule = {
  title: "Schedule",
  crumb: () => ["Schedule"],
  render() {
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth();
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLabel = first.toLocaleString("en-US", { month: "long", year: "numeric" });
    const cells = [];
    for (let i = 0; i < startDow; i++) {
      const d = new Date(year, month, i - startDow + 1);
      cells.push({ muted: true, date: d });
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push({ muted: false, date: new Date(year, month, d) });
    while (cells.length % 7 !== 0) cells.push({ muted: true, date: new Date(year, month + 1, cells.length - daysInMonth - startDow + 1) });

    const eventColors = { open: "", in_progress: "", waiting_parts: "ev-yellow", completed: "ev-green", invoiced: "ev-purple", cancelled: "ev-red" };
    const calCells = cells.map((c) => {
      const dayJobs = store.jobs.filter((j) => j.scheduledDate && new Date(j.scheduledDate).toDateString() === c.date.toDateString());
      const isToday = c.date.toDateString() === now.toDateString();
      return `<div class="cal-day ${c.muted ? "muted" : ""} ${isToday ? "today" : ""}">
        <div class="cal-daynum">${c.date.getDate()}</div>
        ${dayJobs.slice(0, 3).map((j) => `<div class="cal-event ${eventColors[j.status] || ""}" title="${esc(j.title)} — ${esc(techName(j.technicianId))}" data-job="${esc(j.id)}">${esc(techById(j.technicianId)?.firstName || "")} · ${esc(j.deviceType)}</div>`).join("")}
        ${dayJobs.length > 3 ? `<div class="small muted" style="margin-top:4px">+${dayJobs.length - 3} more</div>` : ""}
      </div>`;
    }).join("");

    const todayJobs = store.jobs.filter((j) => j.scheduledDate && new Date(j.scheduledDate).toDateString() === now.toDateString());

    return `
    ${pageHead("Schedule", "Calendar view of technician availability and job assignments", `
      <button class="btn btn-secondary" id="export-cal">${iconSvg("download", 15)} Export .ICS</button>
      <button class="btn btn-primary" id="new-schedule">${iconSvg("plus", 15)} Schedule job</button>`)}
    <div class="grid" style="grid-template-columns:3fr 1fr">
      ${card("", `<div class="cal-head">
        <button class="icon-btn" disabled>${iconSvg("chevronLeft", 16)}</button>
        <span class="cal-title">${esc(monthLabel)}</span>
        <button class="icon-btn" disabled>${iconSvg("chevronRight", 16)}</button>
        <div class="spacer" style="flex:1"></div>
        <div class="row">${["open", "in_progress", "waiting_parts", "completed"].map((s) => `<span class="legend-item"><span class="legend-swatch ${s === "waiting_parts" ? "ev-yellow" : s === "completed" ? "ev-green" : ""}" style="${!["waiting_parts", "completed"].includes(s) ? "background:var(--accent-soft)" : ""}"></span>${esc(titleCase(s))}</span>`).join("")}</div>
      </div>
      <div class="cal-grid">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<div class="cal-dow">${d}</div>`).join("")}
      </div>
      <div class="cal-grid">${calCells}</div>`, { tight: true })}
      ${card("Today's assignments", todayJobs.length ? todayJobs.map((j) => `
        <div class="list-item" style="padding:10px 0" data-job="${esc(j.id)}">
          ${avatar(techName(j.technicianId))}
          <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(j.title)}</div><div class="cell-sub">${esc(techName(j.technicianId))} · ${esc(customerName(j.customerId))}</div></div>
          ${statusBadge(j.status)}
        </div>`).join("") : emptyState("No jobs today", "Nothing scheduled.", "", "calendar"), { tight: true })}
    </div>`;
  },
  mount(root) {
    root.querySelectorAll("[data-job]").forEach((n) => n.addEventListener("click", () => { window.location.hash = "#/job-details/" + n.dataset.job; }));
    root.querySelector("#export-cal")?.addEventListener("click", () => {
      const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FixFlow//Schedule//EN"];
      store.jobs.filter((j) => j.scheduledDate).forEach((j) => {
        const d = new Date(j.scheduledDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        lines.push("BEGIN:VEVENT", `UID:${j.id}`, `SUMMARY:${j.title}`, `DTSTART:${d}`, `DESCRIPTION:${j.issue}`, "END:VEVENT");
      });
      lines.push("END:VCALENDAR");
      const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "fixflow-schedule.ics"; a.click();
      toast("Calendar downloaded", "fixflow-schedule.ics", "success");
    });
    root.querySelector("#new-schedule")?.addEventListener("click", () => toast("Schedule job", "Pick an unscheduled job from the Jobs list.", "info"));
  },
};

// ---------- Technicians ----------
export const technicians = {
  title: "Technicians",
  crumb: () => ["Technicians"],
  render() {
    const cards = store.technicians.map((t) => {
      const jobs = store.jobs.filter((j) => j.technicianId === t.id);
      const active = jobs.filter((j) => ["open", "in_progress", "waiting_parts"].includes(j.status)).length;
      return `<div class="card"><div class="card-body">
        <div class="row" style="gap:12px">
          ${avatar(t.name, 46)}
          <div style="flex:1"><div style="font-weight:600">${esc(t.name)}</div><div class="cell-sub">${esc(t.specialty)}</div></div>
          <span class="badge ${t.status === "available" ? "badge-available" : t.status === "busy" ? "badge-busy" : "badge-off"}">${esc(titleCase(t.status))}</span>
        </div>
        <div class="row" style="margin-top:14px;gap:16px">
          <div><div class="small muted">Active</div><div style="font-weight:700">${active}</div></div>
          <div><div class="small muted">Completed</div><div style="font-weight:700">${t.jobsCompleted}</div></div>
          <div><div class="small muted">Rating</div><div style="font-weight:700">${t.rating}★</div></div>
          <div class="right"><div class="small muted">Rate</div><div style="font-weight:700">${money(t.hourlyRate)}/h</div></div>
        </div>
        <div style="margin-top:12px">${progressBar(Math.min(100, (active / t.maxJobsPerDay) * 100))}<div class="small muted" style="margin-top:4px">${active}/${t.maxJobsPerDay} capacity today</div></div>
        <div class="row" style="margin-top:14px"><button class="btn btn-secondary btn-sm" data-view-tech="${esc(t.id)}">Workload</button><button class="btn btn-ghost btn-sm" data-edit-tech="${esc(t.id)}">${iconSvg("edit", 14)}</button></div>
      </div></div>`;
    }).join("");
    return pageHead("Technicians", "Manage your technician roster and workload", `<button class="btn btn-primary" id="add-tech">${iconSvg("plus", 15)} Add technician</button>`) +
      `<div class="grid grid-3">${cards}</div>`;
  },
  mount(root) {
    root.querySelector("#add-tech")?.addEventListener("click", () => {
      const m = modal({
        title: "Add technician",
        body: buildForm([
          { key: "name", label: "Full name", required: true, full: true },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone" },
          { key: "specialty", label: "Specialty", full: true, placeholder: "e.g. Laptops & Tablets" },
          { key: "status", label: "Status", type: "select", options: ["available", "busy", "off"] },
          { key: "hourlyRate", label: "Hourly rate", type: "number", value: "65" },
          { key: "maxJobsPerDay", label: "Max jobs/day", type: "number", value: "6" },
        ], { status: "available" }),
        footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="save">Add technician</button>`,
      });
      m.querySelector("#save").addEventListener("click", () => {
        const d = readForm(m);
        if (!d.name) return toast("Name required", "", "error");
        const parts = d.name.split(" ");
        mutate((s) => s.technicians.unshift({ id: uid("TECH"), ...d, firstName: parts[0], lastName: parts.slice(1).join(" "), rating: 5, jobsCompleted: 0, revenue: 0, startDate: new Date().toISOString() }));
        logAudit("created", "Technician", d.name, "Technician added");
        toast("Technician added", d.name, "success");
        closeModal();
        window.location.reload();
      });
    });
    root.querySelectorAll("[data-view-tech]").forEach((b) => b.addEventListener("click", () => {
      const t = techById(b.dataset.viewTech);
      const jobs = store.jobs.filter((j) => j.technicianId === t.id);
      const m = modal({
        title: t.name + " — workload",
        body: `<div class="grid grid-3" style="margin-bottom:16px">
          ${statCard({ label: "Active", value: jobs.filter((j) => ["open", "in_progress", "waiting_parts"].includes(j.status)).length })}
          ${statCard({ label: "Completed", value: t.jobsCompleted })}
          ${statCard({ label: "Revenue", value: money(t.revenue) })}
        </div>` + buildTable({
          columns: [{ key: "id", label: "Job" }, { key: "title", label: "Title" }, { key: "status", label: "Status", render: (r) => statusBadge(r.status) }],
          rows: jobs.slice(0, 12), rowId: (r) => r.id,
        }),
      });
      m.querySelectorAll("tr[data-row]").forEach((tr) => tr.addEventListener("click", () => { closeModal(); window.location.hash = "#/job-details/" + tr.dataset.row; }));
    }));
    root.querySelectorAll("[data-edit-tech]").forEach((b) => b.addEventListener("click", () => {
      const t = techById(b.dataset.editTech);
      const m = modal({
        title: "Edit technician",
        body: buildForm([
          { key: "name", label: "Full name", value: t.name, full: true },
          { key: "email", label: "Email", value: t.email },
          { key: "phone", label: "Phone", value: t.phone },
          { key: "specialty", label: "Specialty", value: t.specialty, full: true },
          { key: "status", label: "Status", type: "select", options: ["available", "busy", "off"], value: t.status },
          { key: "hourlyRate", label: "Hourly rate", type: "number", value: t.hourlyRate },
        ]),
        footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="save">Save</button>`,
      });
      m.querySelector("#save").addEventListener("click", () => {
        const d = readForm(m);
        mutate((s) => { const x = s.technicians.find((y) => y.id === t.id); Object.assign(x, d); });
        toast("Technician updated", "", "success");
        closeModal();
        window.location.reload();
      });
    }));
  },
};

// ---------- Technician dashboard ----------
export const technicianDashboard = {
  title: "Technician Dashboard",
  crumb: () => ["Technicians", "My Queue"],
  render() {
    const me = store.technicians[0];
    const mine = store.jobs.filter((j) => j.technicianId === me.id);
    const today = mine.filter((j) => ["open", "in_progress", "waiting_parts"].includes(j.status));
    const done = mine.filter((j) => j.status === "completed");
    return `
    ${pageHead("Welcome, " + me.firstName, "Your work queue for today", `<span class="badge ${me.status === "available" ? "badge-available" : "badge-busy"}">${esc(titleCase(me.status))}</span>`)}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Assigned Today", value: today.length, iconName: "briefcase" })}
      ${statCard({ label: "In Progress", value: mine.filter((j) => j.status === "in_progress").length, iconName: "activity" })}
      ${statCard({ label: "Completed", value: done.length, iconName: "check", tone: "var(--success)" })}
      ${statCard({ label: "Hours Logged", value: mine.reduce((s, j) => s + j.laborHours, 0).toFixed(1) + "h", iconName: "clock" })}
    </div>
    <div class="grid" style="grid-template-columns:2fr 1fr">
      ${card("Today's jobs", today.length ? today.map((j) => `
        <div class="card" style="margin-bottom:12px;box-shadow:none;border-color:var(--border)"><div class="card-body">
          <div class="row" style="justify-content:space-between">
            <div><div style="font-weight:600">${esc(j.title)}</div>
              <div class="cell-sub" style="margin-top:3px">${esc(j.id)} · ${esc(customerName(j.customerId))}</div></div>
            <div style="text-align:right">${statusBadge(j.status)}${priorityBadge(j.priority)}</div>
          </div>
          <p class="muted small" style="margin:10px 0">${esc(j.issue)}</p>
          <div class="row">
            <button class="btn btn-secondary btn-sm" data-start="${esc(j.id)}">${iconSvg("activity", 14)} Start</button>
            <button class="btn btn-secondary btn-sm" data-done="${esc(j.id)}">${iconSvg("check", 14)} Complete</button>
            <button class="btn btn-ghost btn-sm" data-detail="${esc(j.id)}">Open</button>
          </div>
        </div></div>`).join("") : emptyState("All jobs are scheduled!", "No pending jobs in your queue.", "", "check"), { tight: true })}
      ${card("Time log", `
        <div class="timeline">
          ${mine.slice(0, 6).map((j) => `<div class="tl-item ${j.status === "completed" ? "done" : "current"}">
            <span class="tl-dot">${j.status === "completed" ? iconSvg("check", 11) : ""}</span>
            <div class="tl-title">${esc(j.id)} — ${esc(j.deviceType)}</div>
            <div class="tl-time">${j.laborHours}h · ${esc(fmtDate(j.createdAt))}</div></div>`).join("")}
        </div>`, { tight: true })}
    </div>`;
  },
  mount(root) {
    root.querySelectorAll("[data-start]").forEach((b) => b.addEventListener("click", () => {
      mutate((s) => { const j = s.jobs.find((x) => x.id === b.dataset.start); j.status = "in_progress"; });
      toast("Job started", b.dataset.start, "success");
      window.location.reload();
    }));
    root.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", () => {
      mutate((s) => { const j = s.jobs.find((x) => x.id === b.dataset.done); j.status = "completed"; j.completedAt = new Date().toISOString(); });
      logAudit("updated", "Job", b.dataset.done, "Marked completed");
      toast("Job completed", b.dataset.done, "success");
      window.location.reload();
    }));
    root.querySelectorAll("[data-detail]").forEach((b) => b.addEventListener("click", () => { window.location.hash = "#/job-details/" + b.dataset.detail; }));
  },
};

// ---------- Technician mobile ----------
export const technicianMobile = {
  title: "Technician Mobile",
  crumb: () => ["Technicians", "Mobile"],
  render() {
    const me = store.technicians[0];
    const jobs = store.jobs.filter((j) => j.technicianId === me.id && ["open", "in_progress", "waiting_parts"].includes(j.status)).slice(0, 6);
    return `
    ${pageHead("Technician Mobile", "Compact interface for field technicians")}
    <div style="display:flex;justify-content:center">
      <div style="width:380px;background:#000;border-radius:36px;padding:12px;box-shadow:var(--shadow-pop)">
        <div style="background:var(--bg);border-radius:26px;overflow:hidden;height:720px;display:flex;flex-direction:column">
          <div style="background:linear-gradient(160deg,#1b2a4a,#2f5bea);color:#fff;padding:18px 18px 22px">
            <div class="row" style="justify-content:space-between"><span style="font-weight:700">FixFlow Field</span>${avatar(me.name)}</div>
            <div style="margin-top:10px;font-size:13px;opacity:.85">${esc(me.name)} · ${esc(titleCase(me.status))}</div>
          </div>
          <div style="padding:14px;overflow-y:auto;flex:1">
            <div class="small muted" style="margin-bottom:8px">${jobs.length} active job${jobs.length === 1 ? "" : "s"}</div>
            ${jobs.map((j) => `
              <div class="card" style="margin-bottom:10px;box-shadow:none"><div class="card-body" style="padding:12px">
                <div class="row" style="justify-content:space-between">${statusBadge(j.status)}${priorityBadge(j.priority)}</div>
                <div style="font-weight:600;margin-top:8px">${esc(j.title)}</div>
                <div class="cell-sub">${esc(customerName(j.customerId))}</div>
                <div class="row" style="margin-top:10px">
                  <button class="btn btn-primary btn-sm" data-mstart="${esc(j.id)}">${j.status === "in_progress" ? "Working" : "Start"}</button>
                  <button class="btn btn-secondary btn-sm" data-mdone="${esc(j.id)}">Complete</button>
                  <button class="btn btn-ghost btn-sm" data-mgps="${esc(j.id)}">${iconSvg("mapPin", 14)}</button>
                </div>
              </div></div>`).join("") || emptyState("No jobs", "You're all caught up.", "", "check")}
            <button class="btn btn-secondary btn-block" id="m-photo">${iconSvg("upload", 14)} Upload photo</button>
          </div>
          <div style="border-top:1px solid var(--border);display:flex;justify-content:space-around;padding:10px">
            ${["briefcase", "calendar", "message", "settings"].map((ic, i) => `<div class="icon-btn ${i === 0 ? "active" : ""}" style="${i === 0 ? "color:var(--accent)" : ""}">${iconSvg(ic, 20)}</div>`).join("")}
          </div>
        </div>
      </div>
    </div>`;
  },
  mount(root) {
    root.querySelectorAll("[data-mstart]").forEach((b) => b.addEventListener("click", () => { mutate((s) => { s.jobs.find((x) => x.id === b.dataset.mstart).status = "in_progress"; }); toast("Job started", b.dataset.mstart, "success"); window.location.reload(); }));
    root.querySelectorAll("[data-mdone]").forEach((b) => b.addEventListener("click", () => { mutate((s) => { const j = s.jobs.find((x) => x.id === b.dataset.mdone); j.status = "completed"; j.completedAt = new Date().toISOString(); }); toast("Job completed", b.dataset.mdone, "success"); window.location.reload(); }));
    root.querySelectorAll("[data-mgps]").forEach((b) => b.addEventListener("click", () => toast("GPS captured", "Location recorded for " + b.dataset.mgps, "success")));
    root.querySelector("#m-photo")?.addEventListener("click", () => toast("Photo uploaded", "Attached to current job.", "success"));
  },
};

// ---------- Technician detailed view ----------
export const technicianView = {
  title: "Technician View",
  crumb: (p) => ["Technicians", "Job " + (p.id || "")],
  render(params) {
    const job = jobById(params.id) || store.jobs.find((j) => j.status === "in_progress") || store.jobs[0];
    const checklist = [
      ["Verify device intake & accessories", true],
      ["Run full diagnostic scan", true],
      ["Confirm fault with customer", job.status !== "open"],
      ["Order / pull required parts", job.status === "waiting_parts" || ["completed", "invoiced"].includes(job.status)],
      ["Perform repair", ["completed", "invoiced"].includes(job.status)],
      ["Quality check & test", ["completed", "invoiced"].includes(job.status)],
      ["Clean up & document", ["completed", "invoiced"].includes(job.status)],
    ];
    return `
    ${pageHead(job.id + " — " + job.title, customerName(job.customerId) + " · " + job.deviceType, `
      <button class="btn btn-secondary" data-nav="job-details" data-id="${esc(job.id)}">Full details</button>
      <button class="btn btn-primary" id="mark-complete">${iconSvg("check", 14)} Mark complete</button>`)}
    <div class="grid" style="grid-template-columns:2fr 1fr">
      ${card("Repair checklist", checklist.map(([label, done], i) => `
        <label class="checkline" style="padding:10px 0;border-bottom:1px solid var(--border)">
          <input type="checkbox" ${done ? "checked" : ""} data-check="${i}" />
          <span style="${done ? "text-decoration:line-through;color:var(--text-muted)" : ""}">${esc(label)}</span>
        </label>`).join(""), { tight: true })}
      <div class="grid" style="gap:16px">
        ${card("Job info", `<dl class="kv">
          <dt>Status</dt><dd>${statusBadge(job.status)}</dd>
          <dt>Priority</dt><dd>${priorityBadge(job.priority)}</dd>
          <dt>Service</dt><dd>${esc(job.serviceType)}</dd>
          <dt>Est. labor</dt><dd>${job.laborHours}h</dd>
          <dt>Est. cost</dt><dd>${money(job.estimatedCost)}</dd>
        </dl>`, { tight: true })}
        ${card("Parts needed", job.partsUsed.length ? job.partsUsed.map((p) => `<div class="list-item" style="padding:8px 0">${iconSvg("box", 15)}<span style="flex:1">${esc(p.name)}</span><b>×${p.qty}</b></div>`).join("") : `<p class="muted small">No parts required.</p>`, { tight: true })}
        ${card("Time entry", `
          <div class="field"><label>Hours worked</label><input class="input" type="number" value="${job.laborHours}" id="hours" /></div>
          <div class="field" style="margin-top:10px"><label>Note</label><textarea class="textarea" placeholder="Describe work performed"></textarea></div>
          <button class="btn btn-primary btn-sm btn-block" style="margin-top:10px" id="save-time">Log time</button>`)}
      </div>
    </div>`;
  },
  mount(root, params) {
    const job = jobById(params.id) || store.jobs[0];
    root.querySelector("#mark-complete")?.addEventListener("click", () => {
      mutate((s) => { const j = s.jobs.find((x) => x.id === job.id); j.status = "completed"; j.completedAt = new Date().toISOString(); });
      logAudit("updated", "Job", job.id, "Completed via technician view");
      toast("Job completed", job.id, "success");
      window.location.hash = "#/job-details/" + job.id;
    });
    root.querySelector("#save-time")?.addEventListener("click", () => toast("Time logged", root.querySelector("#hours").value + "h recorded", "success"));
    root.querySelectorAll("[data-check]").forEach((c) => c.addEventListener("change", () => toast("Checklist updated", "", "success")));
  },
};

// ---------- Technician performance ----------
export const technicianPerformance = {
  title: "Technician Performance",
  crumb: () => ["Technicians", "Performance"],
  render() {
    const perf = store.technicians.map((t) => {
      const jobs = store.jobs.filter((j) => j.technicianId === t.id);
      const completed = jobs.filter((j) => ["completed", "invoiced"].includes(j.status)).length;
      const revenue = jobs.filter((j) => ["completed", "invoiced"].includes(j.status)).reduce((s, j) => s + (j.actualCost || j.estimatedCost), 0);
      return { ...t, completed, revenue, completionRate: jobs.length ? Math.round((completed / jobs.length) * 100) : 0 };
    }).sort((a, b) => b.revenue - a.revenue);
    const donut = perf.map((p, i) => ({ label: p.name, value: p.completed, color: ["#2f5bea", "#0ea5e9", "#8b5cf6", "#f97316", "#10b981", "#ef4444"][i % 6] }));
    return `
    ${pageHead("Technician Performance", "Metrics and KPIs for your team", `<button class="btn btn-secondary" id="export-perf">${iconSvg("download", 15)} Export</button>`)}
    <div class="grid" style="grid-template-columns:2fr 1fr;margin-bottom:16px">
      ${card("Revenue per technician", barChart(perf.map((p) => ({ label: p.firstName, value: p.revenue, display: money(p.revenue) })), { color: "var(--success)", height: 220 }))}
      ${card("Jobs completed", `<div style="display:flex;justify-content:center">${donutChart(donut)}</div>
        <div class="legend">${donut.map((d) => `<span class="legend-item"><span class="legend-swatch" style="background:${d.color}"></span>${esc(d.label)}</span>`).join("")}</div>`)}
    </div>
    ${card("Leaderboard", buildTable({
      columns: [
        { key: "name", label: "Technician", render: (r) => `<div class="cell-flex">${avatar(r.name, 30)}<div><div class="cell-main">${esc(r.name)}</div><div class="cell-sub">${esc(r.specialty)}</div></div></div>` },
        { key: "completed", label: "Completed", cls: "num" },
        { key: "completionRate", label: "Completion", render: (r) => `<div style="min-width:120px">${progressBar(r.completionRate, "var(--success)")}<span class="small muted">${r.completionRate}%</span></div>` },
        { key: "revenue", label: "Revenue", cls: "num", render: (r) => money(r.revenue) },
        { key: "rating", label: "Rating", render: (r) => `<span>${r.rating}★</span>` },
        { key: "status", label: "Status", render: (r) => `<span class="badge ${r.status === "available" ? "badge-available" : r.status === "busy" ? "badge-busy" : "badge-off"}">${esc(titleCase(r.status))}</span>` },
      ], rows: perf,
    }), { tight: true })}`;
  },
  mount(root) {
    root.querySelector("#export-perf")?.addEventListener("click", () => {
      const cols = ["name", "completed", "rating", "revenue"];
      const rows = store.technicians.map((t) => ({ name: t.name, completed: t.jobsCompleted, rating: t.rating, revenue: t.revenue }));
      const head = cols.join(",");
      const body = rows.map((r) => cols.map((c) => `"${r[c]}"`).join(",")).join("\n");
      const blob = new Blob([head + "\n" + body], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "technician-performance.csv"; a.click();
      toast("Export complete", "technician-performance.csv", "success");
    });
  },
};
