import { store, mutate, logAudit, id as uid } from "../store.js";
import { esc, money, fmtDate, fmtDateTime, timeAgo, statusBadge, priorityBadge, invoiceBadge, avatar, toast, modal, closeModal, confirmDialog, iconSvg, JOB_STATUS, PRIORITY } from "../util.js";
import { pageHead, statCard, card, buildTable, emptyState, toolbar, buildForm, readForm, validateForm, barChart, progressBar } from "../components.js";
import { customerById, customerName, techById, techName, jobById, invoiceById } from "../lookups.js";

const NAV_ACTIONS = `
  <button class="btn btn-secondary" data-nav="job-templates">Templates</button>
  <button class="btn btn-primary" data-nav="new-job">${iconSvg("plus", 15)} New Job</button>`;

// ---------- Jobs list ----------
export const jobs = {
  title: "Jobs",
  crumb: () => ["Jobs"],
  render(params) {
    return `
    ${pageHead("Jobs", "Browse, filter and manage every repair job", NAV_ACTIONS)}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Total Jobs", value: store.jobs.length, iconName: "briefcase" })}
      ${statCard({ label: "In Progress", value: store.jobs.filter((j) => j.status === "in_progress").length, iconName: "activity" })}
      ${statCard({ label: "Waiting Parts", value: store.jobs.filter((j) => j.status === "waiting_parts").length, iconName: "clock", tone: "var(--warning)" })}
      ${statCard({ label: "Completed", value: store.jobs.filter((j) => j.status === "completed").length, iconName: "check", tone: "var(--success)" })}
    </div>
    <div class="card">
      ${toolbar({ searchId: "job-search", placeholder: "Search jobs by id, device, issue...", filters: [
        { key: "status", label: "Status", options: Object.entries(JOB_STATUS).map(([v, m]) => ({ value: v, label: m.label })) },
        { key: "priority", label: "Priority", options: Object.entries(PRIORITY).map(([v, m]) => ({ value: v, label: m.label })) },
        { key: "technicianId", label: "Technician", options: store.technicians.map((t) => ({ value: t.id, label: t.name })) },
      ], actions: `<button class="btn btn-secondary btn-sm" id="export-jobs">${iconSvg("download", 14)} Export</button>` })}
      <div id="jobs-table"></div>
    </div>`;
  },
  mount(root, params) {
    let search = params.q || "";
    let filters = {};
    const holder = root.querySelector("#jobs-table");
    const searchInput = root.querySelector("#job-search");
    searchInput.value = search;

    const draw = () => {
      holder.innerHTML = buildTable({
        columns: [
          { key: "id", label: "Job", render: (r) => `<div class="cell-main">${esc(r.id)}</div><div class="cell-sub">${esc(r.serviceType)}</div>` },
          { key: "title", label: "Device / Issue", render: (r) => `<div class="cell-main">${esc(r.deviceType)}</div><div class="cell-sub">${esc(r.issue.slice(0, 40))}${r.issue.length > 40 ? "…" : ""}</div>` },
          { key: "customerId", label: "Customer", render: (r) => `<div class="cell-flex">${avatar(customerName(r.customerId))}${esc(customerName(r.customerId))}</div>` },
          { key: "technicianId", label: "Technician", render: (r) => esc(techName(r.technicianId)) },
          { key: "status", label: "Status", render: (r) => statusBadge(r.status) },
          { key: "priority", label: "Priority", render: (r) => priorityBadge(r.priority) },
          { key: "estimatedCost", label: "Est. Cost", cls: "num", render: (r) => money(r.estimatedCost) },
          { key: "createdAt", label: "Created", render: (r) => esc(fmtDate(r.createdAt)) },
        ],
        rows: filteredJobs(search, filters),
        rowId: (r) => r.id,
        empty: emptyState("No jobs found", "Try adjusting search or filters.", `<button class="btn btn-primary btn-sm" data-nav="new-job">Create job</button>`, "briefcase"),
      });
      holder.querySelectorAll("tr[data-row]").forEach((tr) => tr.addEventListener("click", () => {
        if (tr.dataset.row) window.location.hash = "#/job-details/" + tr.dataset.row;
      }));
    };
    const update = () => draw();
    searchInput.addEventListener("input", (e) => { search = e.target.value; update(); });
    root.querySelectorAll("[data-filter]").forEach((sel) => sel.addEventListener("change", (e) => { filters[sel.dataset.filter] = e.target.value; update(); }));
    root.querySelector("#export-jobs")?.addEventListener("click", () => exportCsv("jobs", ["id", "title", "status", "priority", "estimatedCost", "createdAt"], store.jobs));
    draw();
  },
};

function filteredJobs(search, filters) {
  let rows = [...store.jobs];
  for (const [k, v] of Object.entries(filters)) if (v && v !== "all") rows = rows.filter((r) => String(r[k]) === v);
  if (search.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter((r) => [r.id, r.title, r.deviceType, r.issue, customerName(r.customerId), techName(r.technicianId)].join(" ").toLowerCase().includes(q));
  }
  return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ---------- Job details ----------
const STAGES = ["open", "in_progress", "waiting_parts", "completed", "invoiced"];
export const jobDetails = {
  title: "Job Details",
  crumb: (p) => ["Jobs", p.id || "Details"],
  render(params) {
    const job = jobById(params.id) || store.jobs[0];
    if (!job) return emptyState("Job not found", "This job no longer exists.");
    const cust = customerById(job.customerId);
    const tech = techById(job.technicianId);
    const inv = store.invoices.find((i) => i.jobId === job.id);
    const stageIdx = STAGES.indexOf(job.status);
    const stepper = STAGES.map((s, i) => `
      <div class="step ${i < stageIdx ? "done" : ""} ${i === stageIdx ? "current" : ""}">
        <span class="step-node">${i < stageIdx ? iconSvg("check", 13) : i + 1}</span>
        <span class="step-label">${esc(JOB_STATUS[s].label)}</span>
        ${i < STAGES.length - 1 ? `<span class="step-line ${i < stageIdx ? "done" : ""}"></span>` : ""}
      </div>`).join("");

    const timeline = [
      { t: "Job created", d: job.createdAt, done: true },
      { t: "Technician assigned — " + (tech?.name || "—"), d: job.createdAt, done: !!tech },
      { t: "Diagnosis complete", d: stageIdx >= 1 ? job.createdAt : null, done: stageIdx >= 1 },
      ...(job.status === "waiting_parts" ? [{ t: "Waiting on parts", d: job.createdAt, done: true }] : []),
      { t: "Repair completed", d: job.completedAt, done: !!job.completedAt },
      { t: "Invoiced " + (inv ? `(${inv.number})` : ""), d: inv?.issuedAt, done: !!inv },
    ];

    return `
    ${pageHead(job.title, `${job.id} · ${job.deviceType} · created ${fmtDate(job.createdAt)}`, `
      <div class="row">
        ${statusBadge(job.status)}
        ${priorityBadge(job.priority)}
        <button class="btn btn-secondary" id="edit-job" data-nav="job-edit" data-id="${esc(job.id)}">${iconSvg("edit", 14)} Edit</button>
        <button class="btn btn-danger btn-sm" id="delete-job">${iconSvg("trash", 14)}</button>
      </div>`)}
    <div class="card" style="margin-bottom:16px">
      <div class="card-body"><div class="stepper">${stepper}</div></div>
    </div>
    <div class="grid" style="grid-template-columns:2fr 1fr">
      <div class="grid" style="gap:16px">
        ${card("Issue & Diagnosis", `
          <dl class="kv">
            <dt>Reported issue</dt><dd>${esc(job.issue)}</dd>
            <dt>Service type</dt><dd>${esc(job.serviceType)}</dd>
            <dt>Device</dt><dd>${esc(job.deviceType)}</dd>
            <dt>Notes</dt><dd>${esc(job.notes || "—")}</dd>
          </dl>`)}
        ${card("Parts Used", job.partsUsed.length ? buildTable({
          columns: [
            { key: "name", label: "Part" },
            { key: "qty", label: "Qty", cls: "num" },
            { key: "unitCost", label: "Unit Cost", cls: "num", render: (r) => money(r.unitCost) },
            { key: "total", label: "Total", cls: "num", render: (r) => money(r.unitCost * r.qty) },
          ],
          rows: job.partsUsed,
        }) : emptyState("No parts recorded", "No parts have been added to this job yet.", `<button class="btn btn-secondary btn-sm" id="add-part">Add part</button>`, "box"), { tight: job.partsUsed.length > 0, actions: `<button class="btn btn-secondary btn-sm" id="add-part">Add part</button>` })}
        ${card("History & Activity", `<div class="timeline">
          ${timeline.map((x) => `<div class="tl-item ${x.done ? "done" : ""}">
            <span class="tl-dot">${x.done ? iconSvg("check", 11) : ""}</span>
            <div class="tl-title">${esc(x.t)}</div>
            <div class="tl-time">${x.d ? fmtDateTime(x.d) : "Pending"}</div>
          </div>`).join("")}
        </div>`)}
      </div>
      <div class="grid" style="gap:16px">
        ${card("Customer", cust ? `
          <div class="row" style="gap:12px;margin-bottom:12px">${avatar(cust.company, 40)}
            <div><div style="font-weight:600">${esc(cust.company)}</div><div class="cell-sub">${esc(cust.name)}</div></div></div>
          <dl class="kv">
            <dt>Email</dt><dd>${esc(cust.email)}</dd>
            <dt>Phone</dt><dd>${esc(cust.phone)}</dd>
            <dt>City</dt><dd>${esc(cust.city)}</dd>
          </dl>
          <button class="btn btn-secondary btn-sm btn-block" style="margin-top:12px" data-nav="customer-details" data-id="${esc(cust.id)}">View customer</button>` : emptyState("No customer", ""), { tight: true })}
        ${card("Assignment", `
          <div class="row" style="gap:12px;margin-bottom:12px">${avatar(tech?.name || "?", 40)}
            <div><div style="font-weight:600">${esc(tech?.name || "Unassigned")}</div><div class="cell-sub">${esc(tech?.specialty || "")}</div></div></div>
          <div class="field"><label>Change status</label>
            <select class="select" id="status-select">
              ${Object.entries(JOB_STATUS).map(([v, m]) => `<option value="${v}" ${v === job.status ? "selected" : ""}>${m.label}</option>`).join("")}
            </select></div>
          <div class="field" style="margin-top:12px"><label>Assign technician</label>
            <select class="select" id="tech-select">
              <option value="">Unassigned</option>
              ${store.technicians.map((t) => `<option value="${esc(t.id)}" ${t.id === job.technicianId ? "selected" : ""}>${esc(t.name)}</option>`).join("")}
            </select></div>`, { tight: true })}
        ${card("Costs", `
          <dl class="kv">
            <dt>Estimated</dt><dd>${money(job.estimatedCost)}</dd>
            <dt>Parts</dt><dd>${money(job.partsCost)}</dd>
            <dt>Actual</dt><dd>${job.actualCost ? money(job.actualCost) : "—"}</dd>
            <dt>Labor hours</dt><dd>${job.laborHours}h</dd>
          </dl>
          <div class="divider"></div>
          ${inv ? `<div class="row" style="justify-content:space-between"><span class="muted small">Invoice</span>${invoiceBadge(inv.status)}</div>
            <button class="btn btn-secondary btn-sm btn-block" style="margin-top:10px" data-nav="invoice-details" data-id="${esc(inv.id)}">View ${esc(inv.number)}</button>`
            : `<button class="btn btn-primary btn-sm btn-block" id="gen-invoice">${iconSvg("file", 14)} Generate invoice</button>`}
        `, { tight: true })}
      </div>
    </div>`;
  },
  mount(root, params) {
    const job = jobById(params.id) || store.jobs[0];
    root.querySelector("#edit-job")?.addEventListener("click", () => { window.location.hash = "#/job-edit/" + job.id; });
    root.querySelector("#delete-job")?.addEventListener("click", () => confirmDialog("Delete job?", `Delete ${job.id}? This cannot be undone.`, () => {
      mutate((s) => { s.jobs = s.jobs.filter((j) => j.id !== job.id); });
      logAudit("deleted", "Job", job.id, "Job removed");
      toast("Job deleted", job.id, "success");
      window.location.hash = "#/jobs";
    }));
    root.querySelector("#status-select")?.addEventListener("change", (e) => {
      mutate((s) => { const j = s.jobs.find((x) => x.id === job.id); j.status = e.target.value; if (e.target.value === "completed") j.completedAt = new Date().toISOString(); });
      logAudit("updated", "Job", job.id, "Status → " + e.target.value);
      toast("Status updated", job.id + " → " + (JOB_STATUS[e.target.value]?.label || e.target.value), "success");
      window.location.hash = "#/job-details/" + job.id;
    });
    root.querySelector("#tech-select")?.addEventListener("change", (e) => {
      mutate((s) => { const j = s.jobs.find((x) => x.id === job.id); j.technicianId = e.target.value; });
      logAudit("updated", "Job", job.id, "Technician reassigned");
      toast("Technician assigned", techName(e.target.value) || "Unassigned", "success");
    });
    root.querySelector("#gen-invoice")?.addEventListener("click", () => { window.location.hash = "#/new-invoice?job=" + job.id; });
    root.querySelector("#add-part")?.addEventListener("click", () => openAddPart(job));
  },
};

function openAddPart(job) {
  const m = modal({
    title: "Add part to job",
    body: buildForm([
      { key: "partId", label: "Part from inventory", type: "select", options: [{ value: "", label: "— Manual entry —" }, ...store.parts.map((p) => ({ value: p.id, label: `${p.name} (${p.quantity} in stock)` }))], full: true },
      { key: "name", label: "Part name", required: true },
      { key: "qty", label: "Quantity", type: "number", value: "1" },
      { key: "unitCost", label: "Unit cost", type: "number" },
    ]),
    footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="save-part">Add part</button>`,
  });
  m.querySelector('[name="partId"]').addEventListener("change", (e) => {
    const p = store.parts.find((x) => x.id === e.target.value);
    if (p) { m.querySelector('[name="name"]').value = p.name; m.querySelector('[name="unitCost"]').value = p.unitCost; }
  });
  m.querySelector("#save-part").addEventListener("click", () => {
    const data = readForm(m);
    if (!data.name) return toast("Name required", "", "error");
    mutate((s) => { const j = s.jobs.find((x) => x.id === job.id); j.partsUsed.push({ name: data.name, qty: data.qty || 1, unitCost: data.unitCost || 0 }); j.partsCost += (data.qty || 1) * (data.unitCost || 0); });
    logAudit("updated", "Job", job.id, "Part added: " + data.name);
    toast("Part added", data.name, "success");
    closeModal();
    window.location.hash = "#/job-details/" + job.id;
  });
}

// ---------- New / Edit job ----------
function jobForm(job) {
  const custOptions = [{ value: "", label: "Select customer..." }, ...store.customers.map((c) => ({ value: c.id, label: c.company }))];
  const techOptions = [{ value: "", label: "Unassigned" }, ...store.technicians.map((t) => ({ value: t.id, label: t.name }))];
  const fields = [
    { key: "customerId", label: "Customer", type: "select", required: true, options: custOptions, full: true },
    { key: "title", label: "Job title", required: true, placeholder: "e.g. Laptop screen replacement", full: true },
    { key: "deviceType", label: "Device type", type: "select", options: ["Laptop", "Desktop", "Printer", "Server", "Phone", "Tablet", "Appliance", "Network Device"] },
    { key: "serviceType", label: "Service type", type: "select", options: ["Repair", "Diagnostic", "Maintenance", "Installation", "Data Recovery"] },
    { key: "priority", label: "Priority", type: "select", options: Object.entries(PRIORITY).map(([v, m]) => ({ value: v, label: m.label })) },
    { key: "technicianId", label: "Assign technician", type: "select", options: techOptions },
    { key: "estimatedCost", label: "Estimated cost", type: "number", placeholder: "0.00" },
    { key: "laborHours", label: "Estimated labor hours", type: "number", placeholder: "0" },
    { key: "scheduledDate", label: "Scheduled date", type: "date" },
    { key: "issue", label: "Describe the issue", type: "textarea", required: true, full: true, placeholder: "What is the customer reporting?" },
    { key: "notes", label: "Internal notes", type: "textarea", full: true, placeholder: "Any additional context..." },
  ];
  const values = job ? { ...job, scheduledDate: job.scheduledDate ? job.scheduledDate.slice(0, 10) : "" } : { priority: "medium", technicianId: "", deviceType: "Laptop", serviceType: "Repair" };
  return { fields, values };
}

export const newJob = {
  title: "New Job",
  crumb: () => ["Jobs", "New Job"],
  render() {
    const { fields, values } = jobForm(null);
    const customerId = new URLSearchParams(location.hash.split("?")[1] || "").get("customer") || "";
    return pageHead("New Job", "Create a new repair job record", `<button class="btn btn-secondary" data-nav="jobs">Cancel</button>`) +
      card("Job details", buildForm(fields, { ...values, customerId }), {
        foot: `<button class="btn btn-secondary" data-nav="jobs">Cancel</button><button class="btn btn-primary" id="save-job">Create job</button>`,
      });
  },
  mount(root) {
    const holder = root.querySelector("#save-job");
    holder?.addEventListener("click", () => {
      const form = root.querySelector(".card-body");
      if (!validateForm(form, ["customerId", "title", "issue"])) return toast("Please complete required fields", "", "error");
      const data = readForm(form);
      const newId = store.settings.jobPrefix + (2000 + store.jobs.length + Math.floor(Math.random() * 500));
      mutate((s) => s.jobs.unshift({
        id: newId, ...data, status: "open", partsUsed: [], partsCost: 0,
        actualCost: null, completedAt: null, createdAt: new Date().toISOString(),
      }));
      logAudit("created", "Job", newId, "Job created");
      toast("Job created", newId, "success");
      window.location.hash = "#/job-details/" + newId;
    });
  },
};

export const jobEdit = {
  title: "Edit Job",
  crumb: (p) => ["Jobs", p.id, "Edit"],
  render(params) {
    const job = jobById(params.id) || store.jobs[0];
    const { fields, values } = jobForm(job);
    return pageHead("Edit Job", job.id, `<button class="btn btn-secondary" data-nav="job-details" data-id="${esc(job.id)}">Cancel</button>`) +
      card("Job details", buildForm(fields, values), {
        foot: `<button class="btn btn-secondary" id="cancel-edit">Cancel</button><button class="btn btn-primary" id="save-job">Save changes</button>`,
      });
  },
  mount(root, params) {
    const job = jobById(params.id) || store.jobs[0];
    root.querySelector("#cancel-edit")?.addEventListener("click", () => { window.location.hash = "#/job-details/" + job.id; });
    root.querySelector("#save-job")?.addEventListener("click", () => {
      const form = root.querySelector(".card-body");
      if (!validateForm(form, ["customerId", "title", "issue"])) return toast("Please complete required fields", "", "error");
      const data = readForm(form);
      mutate((s) => { const j = s.jobs.find((x) => x.id === job.id); Object.assign(j, data); });
      logAudit("updated", "Job", job.id, "Job edited");
      toast("Job updated", job.id, "success");
      window.location.hash = "#/job-details/" + job.id;
    });
  },
};

// ---------- Job templates ----------
export const jobTemplates = {
  title: "Job Templates",
  crumb: () => ["Jobs", "Templates"],
  render() {
    const cards = store.templates.map((t) => `
      <div class="card"><div class="card-body">
        <div class="row"><div class="e-ico" style="width:40px;height:40px;border-radius:10px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;margin:0">${iconSvg("clipboard", 18)}</div>
          <div><div style="font-weight:600">${esc(t.title)}</div><div class="cell-sub">${esc(t.category)}</div></div></div>
        <p class="muted small" style="margin:12px 0">${esc(t.description)}</p>
        <div class="row" style="justify-content:space-between">
          <span class="pill">${money(t.laborRate)}/hr · ${t.estimatedHours}h</span>
          <span class="tag">${t.defaultParts.length} part${t.defaultParts.length === 1 ? "" : "s"}</span>
        </div>
        <div class="row" style="margin-top:14px">
          <button class="btn btn-primary btn-sm" data-use-template="${esc(t.id)}">Use template</button>
          <button class="btn btn-ghost btn-sm" data-del-template="${esc(t.id)}">${iconSvg("trash", 14)}</button>
        </div>
      </div></div>`).join("");
    return pageHead("Job Templates", "Reusable job configurations for common repairs", `<button class="btn btn-primary" id="new-template">${iconSvg("plus", 15)} Create template</button>`) +
      (store.templates.length ? `<div class="grid grid-3">${cards}</div>` : emptyState("No templates yet", "Create templates to speed up job intake.", `<button class="btn btn-primary btn-sm" id="new-template">Create template</button>`, "clipboard"));
  },
  mount(root) {
    root.querySelectorAll("[data-use-template]").forEach((b) => b.addEventListener("click", () => {
      const t = store.templates.find((x) => x.id === b.dataset.useTemplate);
      toast("Template applied", "Opening new job with " + t.title, "info");
      window.location.hash = "#/new-job";
    }));
    root.querySelectorAll("[data-del-template]").forEach((b) => b.addEventListener("click", () => confirmDialog("Delete template?", "This template will be removed.", () => {
      mutate((s) => { s.templates = s.templates.filter((t) => t.id !== b.dataset.delTemplate); });
      toast("Template deleted", "", "success");
      window.location.reload();
    })));
    root.querySelectorAll("#new-template").forEach((b) => b.addEventListener("click", openNewTemplate));
  },
};

function openNewTemplate() {
  const m = modal({
    title: "Create job template",
    body: buildForm([
      { key: "title", label: "Template name", required: true, full: true },
      { key: "category", label: "Category" },
      { key: "laborRate", label: "Labor rate", type: "number", value: "85" },
      { key: "estimatedHours", label: "Estimated hours", type: "number", value: "1" },
      { key: "defaultParts", label: "Default part", full: true, placeholder: "e.g. SSD 1TB NVMe" },
      { key: "description", label: "Description", type: "textarea", full: true },
    ]),
    footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="save">Create</button>`,
  });
  m.querySelector("#save").addEventListener("click", () => {
    const d = readForm(m);
    if (!d.title) return toast("Name required", "", "error");
    mutate((s) => s.templates.unshift({ id: uid("TPL"), ...d, defaultParts: d.defaultParts ? [{ name: d.defaultParts, qty: 1 }] : [] }));
    toast("Template created", d.title, "success");
    closeModal();
    window.location.reload();
  });
}

// ---------- Recurring jobs ----------
export const recurringJobs = {
  title: "Recurring Jobs",
  crumb: () => ["Jobs", "Recurring"],
  render() {
    return pageHead("Recurring Jobs", "Schedule recurring repair and maintenance work", `<button class="btn btn-primary" id="new-recurring">${iconSvg("plus", 15)} New schedule</button>`) +
      card("", buildTable({
        columns: [
          { key: "title", label: "Schedule", render: (r) => `<div class="cell-main">${esc(r.title)}</div><div class="cell-sub">${esc(customerName(r.customerId))}</div>` },
          { key: "frequency", label: "Frequency", render: (r) => `<span class="badge badge-progress">${esc(r.frequency)}</span>` },
          { key: "lastRun", label: "Last run", render: (r) => esc(fmtDate(r.lastRun)) },
          { key: "nextRun", label: "Next run", render: (r) => esc(fmtDate(r.nextRun)) },
          { key: "active", label: "Status", render: (r) => r.active ? `<span class="badge badge-active">Active</span>` : `<span class="badge badge-neutral">Paused</span>` },
          { key: "actions", label: "", render: (r) => `<button class="btn btn-secondary btn-sm" data-toggle="${esc(r.id)}">${r.active ? "Pause" : "Resume"}</button>` },
        ],
        rows: store.recurringJobs,
      }), { tight: true });
  },
  mount(root) {
    root.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", () => {
      mutate((s) => { const r = s.recurringJobs.find((x) => x.id === b.dataset.toggle); r.active = !r.active; });
      toast("Schedule updated", "", "success");
      window.location.reload();
    }));
    root.querySelector("#new-recurring")?.addEventListener("click", () => {
      const m = modal({
        title: "New recurring schedule",
        body: buildForm([
          { key: "customerId", label: "Customer", type: "select", options: store.customers.map((c) => ({ value: c.id, label: c.company })), full: true },
          { key: "title", label: "Title", required: true, full: true },
          { key: "frequency", label: "Frequency", type: "select", options: ["daily", "weekly", "monthly", "quarterly", "annual"] },
          { key: "nextRun", label: "Next run", type: "date" },
        ]),
        footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="save">Create</button>`,
      });
      m.querySelector("#save").addEventListener("click", () => {
        const d = readForm(m);
        if (!d.title) return toast("Title required", "", "error");
        mutate((s) => s.recurringJobs.unshift({ id: uid("REC"), ...d, active: true, lastRun: null }));
        toast("Schedule created", d.title, "success");
        closeModal();
        window.location.reload();
      });
    });
  },
};

// ---------- Work orders ----------
export const workOrders = {
  title: "Work Orders",
  crumb: () => ["Jobs", "Work Orders"],
  render() {
    return pageHead("Work Orders", "Internal work requests and technician transfers", `<button class="btn btn-primary" id="new-wo">${iconSvg("plus", 15)} Create work order</button>`) +
      card("", buildTable({
        columns: [
          { key: "id", label: "WO#", render: (r) => `<span class="mono-val">${esc(r.id)}</span>` },
          { key: "title", label: "Title", render: (r) => `<div class="cell-main">${esc(r.title)}</div><div class="cell-sub">Related ${esc(r.relatedJobId)}</div>` },
          { key: "fromTechnicianId", label: "From", render: (r) => esc(techName(r.fromTechnicianId)) },
          { key: "toTechnicianId", label: "To", render: (r) => esc(techName(r.toTechnicianId)) },
          { key: "priority", label: "Priority", render: (r) => priorityBadge(r.priority) },
          { key: "status", label: "Status", render: (r) => `<span class="badge ${r.status === "done" ? "badge-completed" : r.status === "in_progress" ? "badge-progress" : "badge-open"}">${esc(r.status.replace("_", " "))}</span>` },
          { key: "createdAt", label: "Created", render: (r) => esc(fmtDate(r.createdAt)) },
        ],
        rows: store.workOrders,
      }), { tight: true });
  },
  mount(root) {
    root.querySelector("#new-wo")?.addEventListener("click", () => {
      const m = modal({
        title: "Create work order",
        body: buildForm([
          { key: "title", label: "Title", required: true, full: true },
          { key: "fromTechnicianId", label: "From technician", type: "select", options: store.technicians.map((t) => ({ value: t.id, label: t.name })) },
          { key: "toTechnicianId", label: "To technician", type: "select", options: store.technicians.map((t) => ({ value: t.id, label: t.name })) },
          { key: "priority", label: "Priority", type: "select", options: Object.entries(PRIORITY).map(([v, x]) => ({ value: v, label: x.label })) },
          { key: "relatedJobId", label: "Related job", type: "select", options: store.jobs.slice(0, 30).map((j) => ({ value: j.id, label: `${j.id} — ${j.title}` })) },
          { key: "description", label: "Description", type: "textarea", full: true },
        ]),
        footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="save">Create</button>`,
      });
      m.querySelector("#save").addEventListener("click", () => {
        const d = readForm(m);
        if (!d.title) return toast("Title required", "", "error");
        mutate((s) => s.workOrders.unshift({ id: uid("WO"), ...d, status: "open", createdAt: new Date().toISOString() }));
        logAudit("created", "WorkOrder", d.title, "Work order created");
        toast("Work order created", "", "success");
        closeModal();
        window.location.reload();
      });
    });
  },
};

// ---------- Job costing ----------
export const jobCosting = {
  title: "Job Costing",
  crumb: () => ["Jobs", "Job Costing"],
  render() {
    const rows = store.jobs.filter((j) => j.actualCost != null).map((j) => {
      const revenue = j.estimatedCost;
      const cost = j.partsCost + (techById(j.technicianId)?.hourlyRate || 65) * j.laborHours;
      return { ...j, revenue, cost, margin: revenue - cost, marginPct: revenue ? Math.round(((revenue - cost) / revenue) * 100) : 0 };
    }).sort((a, b) => b.margin - a.margin);
    const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
    const totalCost = rows.reduce((s, r) => s + r.cost, 0);
    const avgMargin = rows.length ? Math.round(rows.reduce((s, r) => s + r.marginPct, 0) / rows.length) : 0;
    return `
    ${pageHead("Job Costing", "Profitability analysis per completed job")}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Billable Revenue", value: money(totalRev), iconName: "dollar" })}
      ${statCard({ label: "Total Cost", value: money(totalCost), iconName: "box" })}
      ${statCard({ label: "Gross Margin", value: money(totalRev - totalCost), iconName: "chart", tone: "var(--success)" })}
      ${statCard({ label: "Avg Margin %", value: avgMargin + "%", iconName: "activity" })}
    </div>
    ${card("Cost breakdown by job", buildTable({
      columns: [
        { key: "id", label: "Job", render: (r) => `<div class="cell-main">${esc(r.id)}</div><div class="cell-sub">${esc(r.deviceType)}</div>` },
        { key: "customerId", label: "Customer", render: (r) => esc(customerName(r.customerId)) },
        { key: "laborHours", label: "Labor", cls: "num", render: (r) => r.laborHours + "h" },
        { key: "partsCost", label: "Parts Cost", cls: "num", render: (r) => money(r.partsCost) },
        { key: "cost", label: "Total Cost", cls: "num", render: (r) => money(r.cost) },
        { key: "revenue", label: "Revenue", cls: "num", render: (r) => money(r.revenue) },
        { key: "margin", label: "Margin", cls: "num", render: (r) => `<span style="color:${r.margin >= 0 ? "var(--success)" : "var(--danger)"}">${money(r.margin)}</span>` },
        { key: "marginPct", label: "Margin %", cls: "num", render: (r) => `<div style="min-width:90px">${progressBar(r.marginPct, r.marginPct >= 30 ? "var(--success)" : r.marginPct >= 0 ? "var(--warning)" : "var(--danger)")}<span class="small muted">${r.marginPct}%</span></div>` },
      ],
      rows,
      rowId: (r) => r.id,
    }), { tight: true })}
    `;
  },
  mount(root) {
    root.querySelectorAll("tr[data-row]").forEach((tr) => tr.addEventListener("click", () => { if (tr.dataset.row) window.location.hash = "#/job-details/" + tr.dataset.row; }));
  },
};

// ---------- CSV export util ----------
export function exportCsv(name, cols, rows) {
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([head + "\n" + body], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name + "-" + fmtDate(new Date(), "YYYY-MM-DD") + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Export complete", name + ".csv downloaded", "success");
}
