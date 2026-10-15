import { store, mutate, logAudit, id as uid } from "../store.js";
import { esc, money, fmtDate, fmtDateTime, timeAgo, statusBadge, invoiceBadge, avatar, toast, modal, closeModal, confirmDialog, iconSvg, initials } from "../util.js";
import { pageHead, statCard, card, buildTable, emptyState, toolbar, buildForm, readForm, validateForm, progressBar } from "../components.js";
import { customerById, customerName, jobById, techById } from "../lookups.js";
import { exportCsv } from "./jobs.js";

// ---------- Customers list ----------
export const customers = {
  title: "Customers",
  crumb: () => ["Customers"],
  render() {
    return `
    ${pageHead("Customers", "Browse and manage your customer accounts", `
      <button class="btn btn-secondary" id="export-cust">${iconSvg("download", 15)} Export</button>
      <button class="btn btn-primary" data-nav="new-customer">${iconSvg("plus", 15)} New Customer</button>`)}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Total Customers", value: store.customers.length, iconName: "users" })}
      ${statCard({ label: "VIP Accounts", value: store.customers.filter((c) => c.tags?.includes("vip")).length, iconName: "star" })}
      ${statCard({ label: "Active Repairs", value: store.jobs.filter((j) => ["open", "in_progress", "waiting_parts"].includes(j.status)).length, iconName: "briefcase" })}
      ${statCard({ label: "Avg Lifetime Value", value: money(Math.round(store.invoices.reduce((s, i) => s + i.total, 0) / store.customers.length)), iconName: "dollar" })}
    </div>
    <div class="card">
      ${toolbar({ searchId: "cust-search", placeholder: "Search by name, email, phone...", filters: [
        { key: "city", label: "City", options: [...new Set(store.customers.map((c) => c.city))].map((c) => ({ value: c, label: c })) },
        { key: "preferredContact", label: "Contact", options: [{ value: "email", label: "Email" }, { value: "phone", label: "Phone" }, { value: "sms", label: "SMS" }] },
      ] })}
      <div id="cust-table"></div>
    </div>`;
  },
  mount(root) {
    let search = "", filters = {};
    const holder = root.querySelector("#cust-table");
    const draw = () => {
      let rows = [...store.customers];
      for (const [k, v] of Object.entries(filters)) if (v && v !== "all") rows = rows.filter((r) => String(r[k]) === v);
      if (search.trim()) { const q = search.toLowerCase(); rows = rows.filter((r) => [r.company, r.name, r.email, r.phone, r.city].join(" ").toLowerCase().includes(q)); }
      holder.innerHTML = buildTable({
        columns: [
          { key: "company", label: "Customer", render: (r) => `<div class="cell-flex">${avatar(r.company, 34)}<div><div class="cell-main">${esc(r.company)}</div><div class="cell-sub">${esc(r.name)}</div></div></div>` },
          { key: "email", label: "Contact", render: (r) => `<div>${esc(r.email)}</div><div class="cell-sub">${esc(r.phone)}</div>` },
          { key: "city", label: "Location" },
          { key: "jobs", label: "Jobs", cls: "num", render: (r) => store.jobs.filter((j) => j.customerId === r.id).length },
          { key: "spend", label: "Total Spend", cls: "num", render: (r) => money(store.invoices.filter((i) => i.customerId === r.id).reduce((s, i) => s + i.total, 0)) },
          { key: "createdAt", label: "Since", render: (r) => esc(fmtDate(r.createdAt)) },
        ],
        rows,
        rowId: (r) => r.id,
        empty: emptyState("No customers", "Try a different search.", "", "users"),
      });
      holder.querySelectorAll("tr[data-row]").forEach((tr) => tr.addEventListener("click", () => { if (tr.dataset.row) window.location.hash = "#/customer-details/" + tr.dataset.row; }));
    };
    root.querySelector("#cust-search").addEventListener("input", (e) => { search = e.target.value; draw(); });
    root.querySelectorAll("[data-filter]").forEach((sel) => sel.addEventListener("change", (e) => { filters[sel.dataset.filter] = e.target.value; draw(); }));
    root.querySelector("#export-cust")?.addEventListener("click", () => exportCsv("customers", ["id", "company", "name", "email", "phone", "city"], store.customers));
    draw();
  },
};

// ---------- Customer details ----------
export const customerDetails = {
  title: "Customer Details",
  crumb: (p) => ["Customers", p.id],
  render(params) {
    const c = customerById(params.id) || store.customers[0];
    if (!c) return emptyState("Customer not found", "");
    const jobs = store.jobs.filter((j) => j.customerId === c.id);
    const invoices = store.invoices.filter((i) => i.customerId === c.id);
    const spend = invoices.reduce((s, i) => s + i.total, 0);
    const openJobs = jobs.filter((j) => ["open", "in_progress", "waiting_parts"].includes(j.status)).length;
    const contracts = store.contracts.filter((x) => x.customerId === c.id);
    return `
    ${pageHead(c.company, `${c.name} · customer since ${fmtDate(c.createdAt)}`, `
      <div class="row">
        <button class="btn btn-secondary" id="email-cust">${iconSvg("mail", 14)} Email</button>
        <button class="btn btn-secondary" data-nav="customer-edit" data-id="${esc(c.id)}">${iconSvg("edit", 14)} Edit</button>
        <button class="btn btn-primary" data-nav="new-job">${iconSvg("plus", 14)} New Job</button>
      </div>`)}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Total Jobs", value: jobs.length, iconName: "briefcase" })}
      ${statCard({ label: "Open Jobs", value: openJobs, iconName: "activity" })}
      ${statCard({ label: "Lifetime Spend", value: money(spend), iconName: "dollar", tone: "var(--success)" })}
      ${statCard({ label: "Contracts", value: contracts.length, iconName: "shield" })}
    </div>
    <div class="grid" style="grid-template-columns:1fr 2fr">
      <div class="grid" style="gap:16px">
        ${card("Profile", `
          <div class="row" style="gap:14px;margin-bottom:16px">${avatar(c.company, 52)}
            <div><div style="font-weight:700;font-size:16px">${esc(c.company)}</div><div class="cell-sub">${esc(c.name)}</div>
            ${c.tags?.length ? `<div style="margin-top:6px">${c.tags.map((t) => `<span class="badge badge-progress">${esc(t)}</span>`).join(" ")}</div>` : ""}</div></div>
          <dl class="kv">
            <dt>Email</dt><dd>${esc(c.email)}</dd>
            <dt>Phone</dt><dd>${esc(c.phone)}</dd>
            <dt>Address</dt><dd>${esc(c.address)}</dd>
            <dt>City</dt><dd>${esc(c.city)}</dd>
            <dt>Preferred</dt><dd>${esc(c.preferredContact)}</dd>
          </dl>
          ${c.notes ? `<div class="divider"></div><div class="small muted">${esc(c.notes)}</div>` : ""}`, { tight: true })}
        ${card("Notes", `<div class="field"><textarea class="textarea" id="cust-note" placeholder="Add a note about this customer...">${esc(c.notes || "")}</textarea></div>
          <button class="btn btn-primary btn-sm" style="margin-top:10px" id="save-note">Save note</button>`)}
      </div>
      <div class="grid" style="gap:16px">
        ${card("Repair History", jobs.length ? buildTable({
          columns: [
            { key: "id", label: "Job", render: (r) => `<div class="cell-main">${esc(r.id)}</div><div class="cell-sub">${esc(r.deviceType)}</div>` },
            { key: "title", label: "Service" },
            { key: "status", label: "Status", render: (r) => statusBadge(r.status) },
            { key: "estimatedCost", label: "Cost", cls: "num", render: (r) => money(r.estimatedCost) },
            { key: "createdAt", label: "Date", render: (r) => esc(fmtDate(r.createdAt)) },
          ],
          rows: jobs, rowId: (r) => r.id,
        }) : emptyState("No repair history", "This customer has no jobs yet.", `<button class="btn btn-primary btn-sm" data-nav="new-job">Create job</button>`, "briefcase"), { tight: jobs.length > 0 })}
        ${card("Invoices", invoices.length ? buildTable({
          columns: [
            { key: "number", label: "Invoice" },
            { key: "total", label: "Amount", cls: "num", render: (r) => money(r.total) },
            { key: "status", label: "Status", render: (r) => invoiceBadge(r.status) },
            { key: "dueAt", label: "Due", render: (r) => esc(fmtDate(r.dueAt)) },
          ],
          rows: invoices, rowId: (r) => r.id,
        }) : emptyState("No invoices", "No invoices have been issued.", "", "file"), { tight: invoices.length > 0 })}
      </div>
    </div>`;
  },
  mount(root, params) {
    const c = customerById(params.id) || store.customers[0];
    root.querySelectorAll("tr[data-row]").forEach((tr) => tr.addEventListener("click", () => { if (tr.dataset.row) window.location.hash = "#/job-details/" + tr.dataset.row; }));
    root.querySelector("#email-cust")?.addEventListener("click", () => toast("Email drafted", "Opening composer for " + c.email, "info"));
    root.querySelector("#save-note")?.addEventListener("click", () => {
      const val = root.querySelector("#cust-note").value;
      mutate((s) => { const x = s.customers.find((y) => y.id === c.id); x.notes = val; });
      logAudit("updated", "Customer", c.id, "Notes updated");
      toast("Note saved", "", "success");
    });
  },
};

// ---------- New / Edit customer ----------
function custFields() {
  return [
    { key: "company", label: "Company name", required: true, full: true },
    { key: "name", label: "Primary contact", required: true },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "phone", label: "Phone" },
    { key: "preferredContact", label: "Preferred contact", type: "select", options: ["email", "phone", "sms"] },
    { key: "address", label: "Address", full: true },
    { key: "city", label: "City / State" },
    { key: "notes", label: "Notes", type: "textarea", full: true },
  ];
}

export const newCustomer = {
  title: "New Customer",
  crumb: () => ["Customers", "New"],
  render() {
    return pageHead("New Customer", "Add a new customer to the system", `<button class="btn btn-secondary" data-nav="customers">Cancel</button>`) +
      card("Customer information", buildForm(custFields(), { preferredContact: "email" }), {
        foot: `<button class="btn btn-secondary" data-nav="customers">Cancel</button><button class="btn btn-primary" id="save">Create customer</button>`,
      });
  },
  mount(root) {
    root.querySelector("#save").addEventListener("click", () => {
      const form = root.querySelector(".card-body");
      if (!validateForm(form, ["company", "name", "email"])) return toast("Complete required fields", "", "error");
      const d = readForm(form);
      const newId = "CUST-" + (100 + store.customers.length + Math.floor(Math.random() * 400));
      mutate((s) => s.customers.unshift({ id: newId, ...d, createdAt: new Date().toISOString(), tags: [] }));
      logAudit("created", "Customer", newId, "Customer created");
      toast("Customer created", d.company, "success");
      window.location.hash = "#/customer-details/" + newId;
    });
  },
};

export const customerEdit = {
  title: "Edit Customer",
  crumb: (p) => ["Customers", p.id, "Edit"],
  render(params) {
    const c = customerById(params.id) || store.customers[0];
    return pageHead("Edit Customer", c.company) +
      card("Customer information", buildForm(custFields(), c), {
        foot: `<button class="btn btn-secondary" id="cancel">Cancel</button><button class="btn btn-primary" id="save">Save changes</button>`,
      });
  },
  mount(root, params) {
    const c = customerById(params.id) || store.customers[0];
    root.querySelector("#cancel").addEventListener("click", () => { window.location.hash = "#/customer-details/" + c.id; });
    root.querySelector("#save").addEventListener("click", () => {
      const form = root.querySelector(".card-body");
      if (!validateForm(form, ["company", "name", "email"])) return toast("Complete required fields", "", "error");
      const d = readForm(form);
      mutate((s) => { const x = s.customers.find((y) => y.id === c.id); Object.assign(x, d); });
      logAudit("updated", "Customer", c.id, "Customer edited");
      toast("Customer updated", c.company, "success");
      window.location.hash = "#/customer-details/" + c.id;
    });
  },
};

// ---------- Asset monitoring ----------
export const assetMonitoring = {
  title: "Asset Monitoring",
  crumb: () => ["Customers", "Assets"],
  render() {
    const expiring = store.assets.filter((a) => a.status === "covered" && new Date(a.warrantyUntil) < new Date(Date.now() + 60 * 864e5));
    return `
    ${pageHead("Asset Monitoring", "Track equipment, warranty status and health", `<button class="btn btn-primary" id="add-asset">${iconSvg("plus", 15)} Add asset</button>`)}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Tracked Assets", value: store.assets.length, iconName: "cpu" })}
      ${statCard({ label: "Under Warranty", value: store.assets.filter((a) => a.status === "covered").length, iconName: "shield", tone: "var(--success)" })}
      ${statCard({ label: "Expiring Soon", value: expiring.length, iconName: "clock", tone: "var(--warning)" })}
      ${statCard({ label: "Avg Health", value: Math.round(store.assets.reduce((s, a) => s + a.healthScore, 0) / store.assets.length) + "%", iconName: "activity" })}
    </div>
    ${card("", buildTable({
      columns: [
        { key: "name", label: "Asset", render: (r) => `<div class="cell-main">${esc(r.name)}</div><div class="cell-sub mono-val">${esc(r.serial)}</div>` },
        { key: "customerId", label: "Customer", render: (r) => esc(customerName(r.customerId)) },
        { key: "warrantyUntil", label: "Warranty", render: (r) => { const exp = new Date(r.warrantyUntil) < new Date(); return `<span class="badge ${exp ? "badge-expired" : "badge-active"}">${exp ? "Expired" : "Until " + fmtDate(r.warrantyUntil)}</span>`; } },
        { key: "healthScore", label: "Health", render: (r) => `<div style="min-width:110px">${progressBar(r.healthScore, r.healthScore >= 70 ? "var(--success)" : r.healthScore >= 50 ? "var(--warning)" : "var(--danger)")}<span class="small muted">${r.healthScore}%</span></div>` },
        { key: "lastService", label: "Last service", render: (r) => esc(fmtDate(r.lastService)) },
      ],
      rows: store.assets,
    }), { tight: true })}`;
  },
  mount(root) {
    root.querySelector("#add-asset")?.addEventListener("click", () => {
      const m = modal({
        title: "Add asset",
        body: buildForm([
          { key: "name", label: "Asset name", required: true, full: true },
          { key: "serial", label: "Serial number" },
          { key: "customerId", label: "Customer", type: "select", options: store.customers.map((c) => ({ value: c.id, label: c.company })) },
          { key: "warrantyUntil", label: "Warranty until", type: "date" },
          { key: "purchaseDate", label: "Purchase date", type: "date" },
        ]),
        footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="save">Add asset</button>`,
      });
      m.querySelector("#save").addEventListener("click", () => {
        const d = readForm(m);
        if (!d.name) return toast("Name required", "", "error");
        mutate((s) => s.assets.unshift({ id: uid("AST"), ...d, status: "covered", healthScore: 100, lastService: new Date().toISOString() }));
        toast("Asset added", d.name, "success");
        closeModal();
        window.location.reload();
      });
    });
  },
};

// ---------- Customer portal ----------
export const customerPortal = {
  title: "Customer Portal",
  crumb: () => ["Customer Portal"],
  render() {
    const cust = store.customers[0];
    const jobs = store.jobs.filter((j) => j.customerId === cust.id);
    const active = jobs.filter((j) => ["open", "in_progress", "waiting_parts"].includes(j.status));
    return `
    ${pageHead("Customer Portal", "Self-service status page customers see", `<span class="badge badge-progress">Preview as ${esc(cust.company)}</span>`)}
    ${card("", `
      <div style="background:linear-gradient(160deg,#1b2a4a,#2f5bea);color:#fff;border-radius:12px;padding:24px;margin-bottom:18px">
        <div style="font-size:12px;opacity:.8">Welcome back</div>
        <div style="font-size:22px;font-weight:700;margin-top:2px">${esc(cust.company)}</div>
        <div style="opacity:.85;font-size:13px;margin-top:6px">You have ${active.length} active repair${active.length === 1 ? "" : "s"} in progress.</div>
      </div>
      <h3 style="font-size:15px;margin-bottom:12px">Active repairs</h3>
      ${active.length ? active.map((j) => `
        <div class="card" style="margin-bottom:10px;box-shadow:none"><div class="card-body row" style="justify-content:space-between">
          <div><div style="font-weight:600">${esc(j.id)} · ${esc(j.title)}</div>
            <div class="cell-sub" style="margin-top:3px">${esc(j.deviceType)} — ${esc(j.issue)}</div>
            <div class="small muted" style="margin-top:6px">Technician: ${esc(techById(j.technicianId)?.name || "Pending assignment")}</div></div>
          <div style="text-align:right">${statusBadge(j.status)}<div class="small muted" style="margin-top:6px">Est. ${money(j.estimatedCost)}</div></div>
        </div></div>`).join("") : emptyState("No active repairs", "You have no jobs in progress.", "", "check")}
      <div class="divider"></div>
      <h3 style="font-size:15px;margin:12px 0">Repair history</h3>
      ${buildTable({
        columns: [
          { key: "id", label: "Job ref", render: (r) => `<span class="mono-val">${esc(r.id)}</span>` },
          { key: "title", label: "Service" },
          { key: "status", label: "Status", render: (r) => statusBadge(r.status) },
          { key: "estimatedCost", label: "Cost", cls: "num", render: (r) => money(r.estimatedCost) },
          { key: "createdAt", label: "Date", render: (r) => esc(fmtDate(r.createdAt)) },
        ], rows: jobs,
      })}
      <div class="card" style="margin-top:16px;box-shadow:none"><div class="card-body">
        <h3 style="font-size:14px;margin-bottom:10px">Upload photos of your device</h3>
        <div style="border:2px dashed var(--border-input);border-radius:12px;padding:28px;text-align:center;color:var(--text-muted)">
          ${iconSvg("upload", 22)}<div style="margin-top:8px" class="small">Drag and drop or click to upload</div>
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" id="upload-btn">${iconSvg("upload", 14)} Choose files</button>
      </div></div>
    `, { tight: true })}`;
  },
  mount(root) {
    root.querySelector("#upload-btn")?.addEventListener("click", () => toast("Photo uploaded", "Your photo was attached to the repair.", "success"));
  },
};

// ---------- Request service ----------
export const requestService = {
  title: "Request Service",
  crumb: () => ["Request Service"],
  render() {
    return `
    ${pageHead("Request Service", "Customer-facing intake form")}
    <div class="grid" style="grid-template-columns:2fr 1fr">
      ${card("Tell us about your device", buildForm([
        { key: "name", label: "Your name", required: true },
        { key: "phone", label: "Phone", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "deviceType", label: "Device type", type: "select", options: ["Laptop", "Desktop", "Printer", "Server", "Phone", "Tablet", "Appliance", "Network Device"] },
        { key: "serviceType", label: "Service needed", type: "select", options: ["Repair", "Diagnostic", "Maintenance", "Installation", "Data Recovery"], full: true },
        { key: "issue", label: "Describe the problem", type: "textarea", required: true, full: true, placeholder: "What is happening with your device?" },
        { key: "preferredDate", label: "Preferred date", type: "date" },
        { key: "urgent", label: "Urgent request", type: "select", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes — same day" }] },
      ]), { foot: `<button class="btn btn-primary" id="submit-req">Submit request</button>` })}
      ${card("How it works", `
        <div class="timeline">
          ${[["Submit your request", "Tell us what is wrong"], ["We confirm & quote", "We reach out within 24 hours"], ["Drop off or pickup", "Choose what suits you"], ["Track your repair", "Follow status in the portal"]].map(([t, d], i) => `
            <div class="tl-item ${i === 0 ? "current" : ""}"><span class="tl-dot">${i + 1}</span>
            <div class="tl-title">${esc(t)}</div><div class="tl-time">${esc(d)}</div></div>`).join("")}
        </div>
        <div class="divider"></div>
        <div class="row"><span style="color:var(--accent)">${iconSvg("phone", 16)}</span><span>+1 (555) 010-2030</span></div>
        <div class="row" style="margin-top:8px"><span style="color:var(--accent)">${iconSvg("mail", 16)}</span><span>support@fixflow.io</span></div>`)}
    </div>`;
  },
  mount(root) {
    root.querySelector("#submit-req")?.addEventListener("click", () => {
      const form = root.querySelector(".card-body");
      if (!validateForm(form, ["name", "phone", "email", "issue"])) return toast("Complete required fields", "", "error");
      const d = readForm(form);
      mutate((s) => s.serviceRequests.unshift({ id: uid("REQ"), ...d, createdAt: new Date().toISOString(), status: "new" }));
      toast("Request submitted", "We'll be in touch within 24 hours.", "success");
      form.querySelectorAll("input,textarea").forEach((f) => (f.value = ""));
    });
  },
};

// ---------- Messages ----------
export const messages = {
  title: "Messages",
  crumb: () => ["Messages"],
  render() {
    const convos = store.conversations;
    const active = convos[0];
    return `
    ${pageHead("Messages", "Communicate with customers directly", `<button class="btn btn-primary" id="new-msg">${iconSvg("plus", 15)} New message</button>`)}
    <div class="grid" style="grid-template-columns:340px 1fr">
      ${card("", convos.map((c) => `
        <div class="list-item" data-conv="${esc(c.id)}" style="cursor:pointer;${c.id === active.id ? "background:var(--accent-soft)" : ""}">
          ${avatar(customerName(c.customerId), 36)}
          <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13.5px">${esc(customerName(c.customerId))}</div>
            <div class="cell-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.messages[c.messages.length - 1].body)}</div></div>
          <span class="small muted">${timeAgo(c.messages[c.messages.length - 1].at)}</span>
        </div>`).join(""), { tight: true })}
      ${card("", `
        <div class="card-head" style="border-bottom:1px solid var(--border)">
          ${avatar(customerName(active.customerId), 34)}
          <div><h3>${esc(customerName(active.customerId))}</h3><div class="sub">${esc(active.subject)}</div></div>
        </div>
        <div class="card-body" id="msg-thread" style="max-height:420px;overflow-y:auto">
          ${active.messages.map((m) => `
            <div style="display:flex;${m.from === "tech" ? "justify-content:flex-end" : ""};margin-bottom:12px">
              <div style="max-width:70%;background:${m.from === "tech" ? "var(--accent)" : "var(--surface)"};color:${m.from === "tech" ? "#fff" : "var(--text)"};padding:10px 14px;border-radius:12px">
                <div style="font-size:13.5px">${esc(m.body)}</div>
                <div style="font-size:11px;opacity:.7;margin-top:4px">${esc(m.name)} · ${timeAgo(m.at)}</div>
              </div></div>`).join("")}
        </div>
        <div class="card-foot row">
          <input class="input" id="msg-input" placeholder="Type a message..." style="flex:1" />
          <button class="btn btn-primary" id="send-msg">Send</button>
        </div>`)}
    </div>`;
  },
  mount(root) {
    const send = () => {
      const inp = root.querySelector("#msg-input");
      if (!inp.value.trim()) return;
      const thread = root.querySelector("#msg-thread");
      thread.insertAdjacentHTML("beforeend", `<div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <div style="max-width:70%;background:var(--accent);color:#fff;padding:10px 14px;border-radius:12px">
          <div style="font-size:13.5px">${esc(inp.value)}</div>
          <div style="font-size:11px;opacity:.7;margin-top:4px">${esc(store.session?.user || "You")} · just now</div></div></div>`);
      const convo = store.conversations[0];
      mutate((s) => { s.conversations[0].messages.push({ from: "tech", name: s.session?.user || "You", body: inp.value, at: new Date().toISOString() }); });
      inp.value = "";
      thread.scrollTop = thread.scrollHeight;
    };
    root.querySelector("#send-msg")?.addEventListener("click", send);
    root.querySelector("#msg-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    root.querySelector("#new-msg")?.addEventListener("click", () => toast("New conversation", "Select a customer to start messaging.", "info"));
    root.querySelectorAll("[data-conv]").forEach((n) => n.addEventListener("click", () => toast("Conversation", "Opened " + customerName(store.conversations.find((c) => c.id === n.dataset.conv).customerId), "info")));
  },
};
