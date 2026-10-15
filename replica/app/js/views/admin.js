import { store, mutate, logAudit } from "../store.js";
import { esc, money, fmtDate, fmtDateTime, timeAgo, toast, modal, closeModal, confirmDialog, iconSvg, titleCase } from "../util.js";
import { pageHead, statCard, card, buildTable, emptyState, toolbar, buildForm, readForm, progressBar } from "../components.js";
import { customerName, customerById } from "../lookups.js";
import { exportCsv } from "./jobs.js";

// ---------- Settings ----------
export const settings = {
  title: "Settings",
  crumb: () => ["Settings"],
  render() {
    const s = store.settings;
    const tabs = ["General", "Invoicing", "Notifications", "Users & Roles", "Appearance", "Advanced"];
    return `
    ${pageHead("Settings", "Business configuration and preferences")}
    <div class="tabs">${tabs.map((t, i) => `<div class="tab ${i === 0 ? "active" : ""}" data-tab="${esc(t)}">${esc(t)}</div>`).join("")}</div>
    <div id="settings-panel"></div>`;
  },
  mount(root) {
    const panel = root.querySelector("#settings-panel");
    const s = store.settings;
    const draw = (tab) => {
      if (tab === "General") {
        panel.innerHTML = card("Company information", buildForm([
          { key: "companyName", label: "Company name", required: true },
          { key: "email", label: "Support email", type: "email" },
          { key: "phone", label: "Phone" },
          { key: "taxRate", label: "Default tax rate (%)", type: "number" },
          { key: "currency", label: "Currency", type: "select", options: ["USD", "EUR", "GBP", "CAD", "AUD"] },
          { key: "dateFormat", label: "Date format", type: "select", options: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] },
          { key: "address", label: "Business address", full: true },
          { key: "jobPrefix", label: "Job number prefix" },
          { key: "invoicePrefix", label: "Invoice number prefix" },
        ], s), { foot: `<button class="btn btn-primary" id="save-settings">Save changes</button>` });
      } else if (tab === "Invoicing") {
        panel.innerHTML = card("Invoice defaults", buildForm([
          { key: "invoiceTerms", label: "Default invoice terms", type: "textarea", full: true },
          { key: "invoicePrefix", label: "Invoice prefix" },
          { key: "taxRate", label: "Tax rate (%)", type: "number" },
        ], s), { foot: `<button class="btn btn-primary" id="save-settings">Save changes</button>` }) +
          card("Automation", `<label class="checkline" style="padding:8px 0"><input type="checkbox" checked id="automation" /> Auto-create draft invoices when jobs are completed</label>`, { tight: true });
      } else if (tab === "Notifications") {
        panel.innerHTML = card("Notification preferences", `
          ${[["email", "Email notifications"], ["inApp", "In-app notifications"], ["sms", "SMS notifications"], ["lowStock", "Low stock alerts"], ["overdue", "Overdue invoice reminders"]].map(([k, l]) => `
            <label class="checkline" style="padding:10px 0;border-bottom:1px solid var(--border)"><input type="checkbox" ${s.notifications[k] ? "checked" : ""} data-notif="${k}" /> ${esc(l)}</label>`).join("")}`, { tight: true });
        panel.querySelectorAll("[data-notif]").forEach((c) => c.addEventListener("change", () => {
          mutate((st) => { st.settings.notifications[c.dataset.notif] = c.checked; });
          toast("Preference saved", "", "success");
        }));
      } else if (tab === "Users & Roles") {
        panel.innerHTML = card("Users", buildTable({
          columns: [
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role", render: (r) => `<span class="badge badge-progress">${esc(titleCase(r.role))}</span>` },
          ], rows: s.roles,
        }), { tight: true, actions: `<button class="btn btn-primary btn-sm" id="add-user">${iconSvg("plus", 14)} Add user</button>` });
        panel.querySelector("#add-user")?.addEventListener("click", () => toast("Invite sent", "User invitation emailed.", "success"));
      } else if (tab === "Appearance") {
        panel.innerHTML = card("Appearance", `
          <div class="field"><label>Theme</label>
            <div class="row"><button class="chip ${document.documentElement.getAttribute("data-theme") !== "dark" ? "active" : ""}" id="theme-light">Light</button>
            <button class="chip ${document.documentElement.getAttribute("data-theme") === "dark" ? "active" : ""}" id="theme-dark">Dark</button></div></div>
          <div class="field" style="margin-top:16px"><label>Interface density</label>
            <div class="row"><button class="chip active">Comfortable</button><button class="chip" disabled>Compact</button></div></div>`, { tight: true });
        panel.querySelector("#theme-light")?.addEventListener("click", () => { document.documentElement.setAttribute("data-theme", "light"); toast("Theme", "Light mode", "success"); });
        panel.querySelector("#theme-dark")?.addEventListener("click", () => { document.documentElement.setAttribute("data-theme", "dark"); toast("Theme", "Dark mode", "success"); });
      } else {
        panel.innerHTML = card("Advanced", `
          <label class="checkline" style="padding:8px 0"><input type="checkbox" /> Enable API access</label>
          <label class="checkline" style="padding:8px 0"><input type="checkbox" /> Automatic backup</label>
          <label class="checkline" style="padding:8px 0"><input type="checkbox" /> Debug mode</label>
          <div class="divider"></div>
          <div class="field"><label>Data retention period</label><select class="select"><option>1 year</option><option>3 years</option><option>7 years</option></select></div>
          <div class="divider"></div>
          <button class="btn btn-danger btn-sm" id="reset-data">${iconSvg("trash", 14)} Reset all demo data</button>`, { tight: true });
        panel.querySelector("#reset-data")?.addEventListener("click", () => confirmDialog("Reset all data?", "This restores the demo dataset and removes your changes.", () => { store.reset(); window.location.reload(); }));
      }
      panel.querySelector("#save-settings")?.addEventListener("click", () => {
        const form = panel.querySelector(".card-body");
        const data = readForm(form);
        mutate((st) => {
          Object.entries(data).forEach(([k, v]) => { if (k in st.settings || ["companyName", "email", "phone", "address", "taxRate", "currency", "dateFormat", "invoiceTerms", "jobPrefix", "invoicePrefix"].includes(k)) st.settings[k] = v; });
        });
        logAudit("updated", "Settings", "settings", "Company settings updated");
        toast("Settings saved", "Your changes have been applied.", "success");
      });
    };
    root.querySelectorAll("[data-tab]").forEach((t) => t.addEventListener("click", () => {
      root.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      draw(t.dataset.tab);
    }));
    draw("General");
  },
};

// ---------- Data import ----------
export const dataImport = {
  title: "Data Import",
  crumb: () => ["Admin", "Data Import"],
  render() {
    return `
    ${pageHead("Data Import", "Bulk import customers, jobs or invoices from CSV/Excel")}
    <div class="grid" style="grid-template-columns:2fr 1fr">
      <div class="grid" style="gap:16px">
        ${card("Upload file", `
          <div class="field"><label>Import type</label>
            <select class="select" id="import-type"><option>Customers</option><option>Jobs</option><option>Invoices</option><option>Parts & Inventory</option></select></div>
          <div id="dropzone" style="border:2px dashed var(--border-input);border-radius:12px;padding:40px;text-align:center;color:var(--text-muted);margin-top:16px;cursor:pointer">
            ${iconSvg("upload", 26)}
            <div style="margin-top:10px;font-weight:600;color:var(--text)">Click to upload CSV, Excel, or JSON</div>
            <div class="small">or drag and drop your file here</div>
          </div>
          <input type="file" id="file-input" style="display:none" />
          <div class="row" style="margin-top:14px"><button class="btn btn-secondary btn-sm" id="download-template">${iconSvg("download", 14)} Download template</button></div>`, { tight: true })}
        <div id="preview"></div>
      </div>
      <div class="grid" style="gap:16px">
        ${card("Import guidelines", `
          <ol style="padding-left:18px;font-size:13px;color:var(--text-muted);line-height:1.9;margin:0">
            <li>Download the sample template for your import type</li>
            <li>Keep the header row exactly as provided</li>
            <li>Dates must be in MM/DD/YYYY format</li>
            <li>Remove blank rows before uploading</li>
            <li>Duplicates are skipped automatically</li>
          </ol>`)}
        ${card("Recent imports", `
          ${[["customers-batch-01.csv", "Customers", 12], ["inventory-q3.csv", "Parts", 40]].map(([f, t, n]) => `
            <div class="list-item" style="padding:10px 0">${iconSvg("file", 15)}<div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(f)}</div><div class="cell-sub">${esc(t)} · ${n} rows</div></div><span class="badge badge-active">Done</span></div>`).join("")}`, { tight: true })}
      </div>
    </div>`;
  },
  mount(root) {
    const dz = root.querySelector("#dropzone");
    const fi = root.querySelector("#file-input");
    dz.addEventListener("click", () => fi.click());
    dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.style.borderColor = "var(--accent)"; });
    dz.addEventListener("dragleave", () => (dz.style.borderColor = ""));
    dz.addEventListener("drop", (e) => { e.preventDefault(); dz.style.borderColor = ""; if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
    fi.addEventListener("change", () => { if (fi.files[0]) handleFile(fi.files[0]); });

    function handleFile(file) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result);
        const lines = text.trim().split(/\r?\n/);
        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
        const rows = lines.slice(1, 6).map((l) => l.split(",").map((c) => c.trim().replace(/"/g, "")));
        root.querySelector("#preview").innerHTML = card("Preview (" + (lines.length - 1) + " rows)", `
          ${buildTable({ columns: headers.map((h, i) => ({ key: "c" + i, label: h, render: (r) => esc(r["c" + i]) })), rows: rows.map((r) => Object.fromEntries(r.map((c, i) => ["c" + i, c]))) })}`,
          { tight: true, foot: `<button class="btn btn-primary" id="confirm-import">${iconSvg("check", 14)} Import ${lines.length - 1} rows</button>` });
        root.querySelector("#confirm-import").addEventListener("click", () => {
          toast("Import successful!", (lines.length - 1) + " rows imported.", "success");
          logAudit("exported", "DataImport", root.querySelector("#import-type").value, (lines.length - 1) + " rows imported");
        });
      };
      reader.readAsText(file);
    }
    root.querySelector("#download-template").addEventListener("click", () => {
      const blob = new Blob(["Name,Email,Phone,Address,City\nAcme Inc,contact@acme.com,555-0100,1 Main St,Portland"], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "fixflow-import-template.csv"; a.click();
      toast("Template downloaded", "", "success");
    });
  },
};

// ---------- Audit logs ----------
export const auditLogs = {
  title: "Audit Logs",
  crumb: () => ["Admin", "Audit Logs"],
  render() {
    return `
    ${pageHead("Audit Logs", "Track all system changes over time", `<button class="btn btn-secondary" id="export-logs">${iconSvg("download", 15)} Export</button>`)}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Total Events", value: store.auditLogs.length, iconName: "archive" })}
      ${statCard({ label: "Today", value: store.auditLogs.filter((l) => new Date(l.at).toDateString() === new Date().toDateString()).length, iconName: "clock" })}
      ${statCard({ label: "Unique Users", value: new Set(store.auditLogs.map((l) => l.user)).size, iconName: "users" })}
      ${statCard({ label: "Entities", value: new Set(store.auditLogs.map((l) => l.entityType)).size, iconName: "database" })}
    </div>
    <div class="card">
      ${toolbar({ searchId: "log-search", placeholder: "Search logs by user, entity, action...", filters: [
        { key: "action", label: "Action", options: ["created", "updated", "deleted", "viewed", "exported"].map((a) => ({ value: a, label: titleCase(a) })) },
        { key: "entityType", label: "Entity", options: [...new Set(store.auditLogs.map((l) => l.entityType))].map((e) => ({ value: e, label: e })) },
      ] })}
      <div id="logs-table"></div>
    </div>`;
  },
  mount(root) {
    let search = "", filters = {};
    const holder = root.querySelector("#logs-table");
    const draw = () => {
      let rows = [...store.auditLogs];
      for (const [k, v] of Object.entries(filters)) if (v && v !== "all") rows = rows.filter((r) => String(r[k]) === v);
      if (search.trim()) { const q = search.toLowerCase(); rows = rows.filter((r) => [r.user, r.action, r.entityType, r.entityId].join(" ").toLowerCase().includes(q)); }
      const actionCls = { created: "badge-active", updated: "badge-progress", deleted: "badge-danger", viewed: "badge-neutral", exported: "badge-waiting" };
      holder.innerHTML = buildTable({
        columns: [
          { key: "at", label: "Timestamp", render: (r) => `<div>${esc(fmtDateTime(r.at))}</div><div class="cell-sub">${timeAgo(r.at)}</div>` },
          { key: "user", label: "User" },
          { key: "action", label: "Action", render: (r) => `<span class="badge ${actionCls[r.action] || "badge-neutral"}">${esc(titleCase(r.action))}</span>` },
          { key: "entityType", label: "Entity", render: (r) => `<div class="cell-main">${esc(r.entityType)}</div><div class="cell-sub mono-val">${esc(r.entityId)}</div>` },
          { key: "detail", label: "Detail", render: (r) => esc(r.detail || "—") },
          { key: "ip", label: "IP", render: (r) => `<span class="mono-val small">${esc(r.ip)}</span>` },
        ], rows, empty: emptyState("No log entries", "Try a different filter.", "", "archive"),
      });
    };
    root.querySelector("#log-search").addEventListener("input", (e) => { search = e.target.value; draw(); });
    root.querySelectorAll("[data-filter]").forEach((sel) => sel.addEventListener("change", (e) => { filters[sel.dataset.filter] = e.target.value; draw(); }));
    root.querySelector("#export-logs").addEventListener("click", () => exportCsv("audit-logs", ["at", "user", "action", "entityType", "entityId"], store.auditLogs));
    draw();
  },
};

// ---------- GDPR admin ----------
export const gdprAdmin = {
  title: "GDPR Admin",
  crumb: () => ["Admin", "GDPR"],
  render() {
    const reqs = store.gdprRequests;
    return `
    ${pageHead("GDPR Admin", "Data privacy compliance tools")}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Total Requests", value: reqs.length, iconName: "lock" })}
      ${statCard({ label: "Pending", value: reqs.filter((r) => r.status === "pending").length, iconName: "clock", tone: "var(--warning)" })}
      ${statCard({ label: "Processing", value: reqs.filter((r) => r.status === "processing").length, iconName: "activity" })}
      ${statCard({ label: "Completed", value: reqs.filter((r) => r.status === "done").length, iconName: "check", tone: "var(--success)" })}
    </div>
    ${card("Data subject requests", buildTable({
      columns: [
        { key: "id", label: "Request", render: (r) => `<span class="mono-val">${esc(r.id)}</span>` },
        { key: "customerId", label: "Customer", render: (r) => esc(customerName(r.customerId)) },
        { key: "type", label: "Type", render: (r) => `<span class="badge ${r.type === "delete" ? "badge-danger" : "badge-progress"}">${esc(titleCase(r.type))}</span>` },
        { key: "requestedAt", label: "Requested", render: (r) => esc(fmtDate(r.requestedAt)) },
        { key: "status", label: "Status", render: (r) => `<span class="badge ${r.status === "done" ? "badge-active" : r.status === "processing" ? "badge-progress" : "badge-waiting"}">${esc(titleCase(r.status))}</span>` },
        { key: "act", label: "", render: (r) => `<div class="row">
            <button class="btn btn-secondary btn-sm" data-export="${esc(r.customerId)}">${iconSvg("download", 13)} Export</button>
            <button class="btn btn-danger btn-sm" data-delete="${esc(r.customerId)}">Process</button></div>` },
      ], rows: reqs,
      empty: emptyState("No requests", "No data subject requests on file.", "", "lock"),
    }), { tight: true })}
    <div style="height:16px"></div>
    ${card("Compliance tools", `<div class="grid grid-2">
      <div class="list-item" style="border:1px solid var(--border);border-radius:10px"><div style="flex:1"><div style="font-weight:600">Export customer data</div><div class="cell-sub">Download a JSON copy of all personal data</div></div><button class="btn btn-secondary btn-sm" id="export-all">Export all</button></div>
      <div class="list-item" style="border:1px solid var(--border);border-radius:10px"><div style="flex:1"><div style="font-weight:600">Data retention</div><div class="cell-sub">Currently retaining records for 7 years</div></div><button class="btn btn-secondary btn-sm" id="retention">Configure</button></div>
    </div>`)}`;
  },
  mount(root) {
    root.querySelectorAll("[data-export]").forEach((b) => b.addEventListener("click", () => {
      const c = customerById(b.dataset.export);
      const data = { customer: c, jobs: store.jobs.filter((j) => j.customerId === c.id), invoices: store.invoices.filter((i) => i.customerId === c.id) };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `gdpr-export-${c.id}.json`; a.click();
      logAudit("exported", "Customer", c.id, "GDPR data export");
      toast("Export complete", "Customer data downloaded as JSON.", "success");
    }));
    root.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => confirmDialog("Process deletion request?", "This anonymizes the customer's personal data. Job history is retained for accounting.", () => {
      logAudit("deleted", "Customer", b.dataset.delete, "GDPR deletion processed");
      toast("Request processed", "Personal data anonymized.", "success");
    })));
    root.querySelector("#export-all")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(store.customers, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gdpr-all-customers.json"; a.click();
      toast("Export complete", "All customer data downloaded.", "success");
    });
    root.querySelector("#retention")?.addEventListener("click", () => toast("Retention policy", "Configure data retention in Settings.", "info"));
  },
};
