import { store, mutate, logAudit, id as uid } from "../store.js";
import { html } from "../markup.js";
import { money, fmtDate, titleCase, avatar, toast, modal, confirmDialog, iconSvg } from "../util.js";
import { pageHead, statCard, card, buildTable, emptyState, toolbar, buildForm, progressBar, donutChart } from "../components.js";
import { supplierById, customerName } from "../lookups.js";
import { openForm } from "../form.js";
import { exportCsv } from "./jobs.js";

// ---------- Parts inventory ----------
export const partsInventory = {
  title: "Parts Inventory",
  crumb: () => ["Inventory", "Parts"],
  render() {
    const low = store.parts.filter((p) => p.quantity <= p.reorderLevel);
    const value = store.parts.reduce((s, p) => s + p.quantity * p.unitCost, 0);
    return html`
    ${pageHead("Parts Inventory", "Track spare parts and supplies", html`
      <button class="btn btn-secondary" id="export-parts">${iconSvg("download", 15)} Export</button>
      <button class="btn btn-primary" id="add-part">${iconSvg("plus", 15)} Add part</button>`)}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Total Parts", value: store.parts.length, iconName: "box" })}
      ${statCard({ label: "Stock Value", value: money(value), iconName: "dollar" })}
      ${statCard({ label: "Low Stock", value: low.length, iconName: "bell", tone: "var(--danger)" })}
      ${statCard({ label: "Suppliers", value: store.suppliers.length, iconName: "truck" })}
    </div>
    ${low.length ? html`${card("⚠ Low stock alerts", low.map((p) => html`
      <div class="list-item" style="padding:10px 0">
        <span style="color:var(--danger)">${iconSvg("bell", 16)}</span>
        <div style="flex:1"><div style="font-weight:600;font-size:13px">${p.name}</div><div class="cell-sub">${p.sku} · ${supplierById(p.supplierId)?.name || ""}</div></div>
        <span class="badge badge-danger">${p.quantity} / ${p.reorderLevel}</span>
        <button class="btn btn-secondary btn-sm" data-restock="${p.id}">Restock</button>
      </div>`), { tight: true })}<div style="height:16px"></div>` : ""}
    <div class="card">
      ${toolbar({ searchId: "part-search", placeholder: "Search parts by name or SKU...", filters: [
        { key: "supplierId", label: "Supplier", options: store.suppliers.map((s) => ({ value: s.id, label: s.name })) },
      ], actions: html`<button class="btn btn-secondary btn-sm" id="auto-po">${iconSvg("refresh", 14)} Auto-generate POs</button>` })}
      <div id="parts-table"></div>
    </div>`;
  },
  mount(root) {
    let search = "", filters = {};
    const holder = root.querySelector("#parts-table");
    const draw = () => {
      let rows = [...store.parts];
      for (const [k, v] of Object.entries(filters)) if (v && v !== "all") rows = rows.filter((r) => String(r[k]) === v);
      if (search.trim()) { const q = search.toLowerCase(); rows = rows.filter((r) => [r.name, r.sku].join(" ").toLowerCase().includes(q)); }
      holder.innerHTML = String(buildTable({
        columns: [
          { key: "name", label: "Part", render: (r) => html`<div class="cell-main">${r.name}</div><div class="cell-sub mono-val">${r.sku} · ${r.location}</div>` },
          { key: "supplierId", label: "Supplier", render: (r) => supplierById(r.supplierId)?.name || "—" },
          { key: "quantity", label: "On Hand", cls: "num", render: (r) => html`<span style="color:${r.quantity <= r.reorderLevel ? "var(--danger)" : "inherit"};font-weight:600">${r.quantity}</span>` },
          { key: "reorderLevel", label: "Reorder At", cls: "num" },
          { key: "unitCost", label: "Unit Cost", cls: "num", render: (r) => money(r.unitCost) },
          { key: "value", label: "Value", cls: "num", render: (r) => money(r.quantity * r.unitCost) },
          { key: "status", label: "Stock", render: (r) => r.quantity <= r.reorderLevel ? html`<span class="badge badge-danger">Low</span>` : r.quantity > r.reorderLevel * 2 ? html`<span class="badge badge-active">Healthy</span>` : html`<span class="badge badge-neutral">OK</span>` },
          { key: "_act", label: "", render: (r) => html`<button class="btn btn-ghost btn-sm" data-adjust="${r.id}">${iconSvg("edit", 14)}</button>` },
        ], rows,
        empty: emptyState("No parts", "Add your first part to get started.", html`<button class="btn btn-primary btn-sm" id="add-part2">Add part</button>`, "box"),
      }));
      holder.querySelectorAll("[data-adjust]").forEach((b) => b.addEventListener("click", () => openAdjust(b.dataset.adjust)));
      holder.querySelector("#add-part2")?.addEventListener("click", openAddPart);
    };
    root.querySelector("#part-search").addEventListener("input", (e) => { search = e.target.value; draw(); });
    root.querySelectorAll("[data-filter]").forEach((sel) => sel.addEventListener("change", (e) => { filters[sel.dataset.filter] = e.target.value; draw(); }));
    root.querySelectorAll("[data-restock]").forEach((b) => b.addEventListener("click", () => openAdjust(b.dataset.restock)));
    root.querySelector("#add-part").addEventListener("click", openAddPart);
    root.querySelector("#auto-po")?.addEventListener("click", () => {
      const low = store.parts.filter((p) => p.quantity <= p.reorderLevel);
      if (!low.length) return toast("All stocked", "No purchase orders needed.", "info");
      toast("Purchase orders created", low.length + " POs drafted for low-stock parts", "success");
      logAudit("created", "PurchaseOrder", "batch", low.length + " POs auto-generated");
    });
    root.querySelector("#export-parts")?.addEventListener("click", () => exportCsv("parts", ["sku", "name", "quantity", "reorderLevel", "unitCost"], store.parts));
    draw();
  },
};

function openAddPart() {
  openForm({
    title: "Add new part",
    submitLabel: "Add part",
    fields: [
      { key: "name", label: "Part name", required: true, full: true },
      { key: "sku", label: "SKU / Barcode", placeholder: "Enter or scan" },
      { key: "quantity", label: "Quantity on hand", type: "number", value: "0" },
      { key: "reorderLevel", label: "Reorder level", type: "number", value: "5" },
      { key: "unitCost", label: "Unit cost", type: "number" },
      { key: "supplierId", label: "Supplier", type: "select", options: store.suppliers.map((s) => ({ value: s.id, label: s.name })) },
      { key: "location", label: "Bin location" },
    ],
    onSubmit: (d) => {
      mutate((s) => s.parts.unshift({ id: uid("PART"), ...d, lastRestocked: new Date().toISOString() }));
      logAudit("created", "Part", d.name, "Part added to inventory");
      toast("Part added", d.name, "success");
    },
  });
}

function openAdjust(partId) {
  const p = store.parts.find((x) => x.id === partId);
  openForm({
    title: "Adjust stock — " + p.name,
    submitLabel: "Apply adjustment",
    body: html`<div class="row" style="justify-content:space-between;margin-bottom:16px;padding:12px;background:var(--surface);border-radius:8px">
        <span>Current stock</span><b style="font-size:18px">${p.quantity}</b></div>${buildForm([
        { key: "change", label: "Adjustment (+/-)", type: "number", value: String(p.reorderLevel * 2 - p.quantity), full: true, hint: "Positive to add stock, negative to remove" },
        { key: "reason", label: "Reason", type: "select", options: ["Restock", "Used in repair", "Damaged", "Inventory count", "Return to supplier"] },
      ])}`,
    onSubmit: (d) => {
      mutate((s) => { const x = s.parts.find((y) => y.id === partId); x.quantity = Math.max(0, x.quantity + (d.change || 0)); x.lastRestocked = new Date().toISOString(); });
      logAudit("updated", "Part", p.name, `Stock ${d.change >= 0 ? "+" : ""}${d.change} (${d.reason})`);
      toast("Stock adjusted", `${d.change >= 0 ? "+" : ""}${d.change} → ${store.parts.find((y) => y.id === partId).quantity} on hand`, "success");
    },
  });
}

// ---------- Suppliers ----------
export const suppliers = {
  title: "Suppliers",
  crumb: () => ["Inventory", "Suppliers"],
  render() {
    const cards = store.suppliers.map((s) => {
      const parts = store.parts.filter((p) => p.supplierId === s.id);
      return html`<div class="card"><div class="card-body">
        <div class="row" style="gap:12px">${avatar(s.name, 44)}
          <div style="flex:1"><div style="font-weight:600">${s.name}</div><div class="cell-sub">${s.category}</div></div>
          <span class="badge badge-active">${s.rating}★</span></div>
        <dl class="kv" style="margin-top:14px;grid-template-columns:100px 1fr">
          <dt>Contact</dt><dd>${s.contactName}</dd>
          <dt>Email</dt><dd class="small">${s.email}</dd>
          <dt>Phone</dt><dd>${s.phone}</dd>
          <dt>Terms</dt><dd>${s.paymentTerms}</dd>
          <dt>Parts</dt><dd>${parts.length} supplied</dd>
        </dl>
        <div class="row" style="margin-top:14px"><button class="btn btn-secondary btn-sm" data-parts="${s.id}">View parts</button><button class="btn btn-ghost btn-sm" data-edit="${s.id}">${iconSvg("edit", 14)}</button></div>
      </div></div>`;
    });
    return html`${pageHead("Suppliers", "Manage your supplier relationships", html`<button class="btn btn-primary" id="add-sup">${iconSvg("plus", 15)} Add supplier</button>`)}${store.suppliers.length ? html`<div class="grid grid-2">${cards}</div>` : emptyState("No suppliers", "Add your first supplier to get started.", html`<button class="btn btn-primary btn-sm" id="add-sup2">Add supplier</button>`, "truck")}`;
  },
  mount(root) {
    const add = () => {
      openForm({
        title: "Add supplier",
        submitLabel: "Add supplier",
        fields: [
          { key: "name", label: "Supplier name", required: true, full: true },
          { key: "contactName", label: "Contact person" },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone" },
          { key: "address", label: "Address", full: true },
          { key: "paymentTerms", label: "Payment terms", type: "select", options: ["Net 15", "Net 30", "Net 45", "Due on receipt"] },
          { key: "category", label: "Category", placeholder: "e.g. Components" },
        ],
        onSubmit: (d) => {
          mutate((s) => s.suppliers.unshift({ id: uid("SUP"), ...d, rating: 5 }));
          toast("Supplier added", d.name, "success");
        },
      });
    };
    root.querySelectorAll("#add-sup, #add-sup2").forEach((b) => b.addEventListener("click", add));
    root.querySelectorAll("[data-parts]").forEach((b) => b.addEventListener("click", () => {
      const s = supplierById(b.dataset.parts);
      modal({ title: s.name + " — supplied parts", body: buildTable({
        columns: [{ key: "name", label: "Part" }, { key: "sku", label: "SKU" }, { key: "quantity", label: "Stock", cls: "num" }, { key: "unitCost", label: "Cost", cls: "num", render: (r) => money(r.unitCost) }],
        rows: store.parts.filter((p) => p.supplierId === s.id),
      }) });
    }));
    root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const s = supplierById(b.dataset.edit);
      openForm({
        title: "Edit supplier",
        fields: [
          { key: "name", label: "Name", full: true },
          { key: "contactName", label: "Contact" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "paymentTerms", label: "Terms", type: "select", options: ["Net 15", "Net 30", "Net 45", "Due on receipt"] },
        ],
        values: s,
        onSubmit: (d) => {
          mutate((st) => { const x = st.suppliers.find((y) => y.id === s.id); Object.assign(x, d); });
          toast("Supplier updated", "", "success");
        },
      });
    }));
  },
};

// ---------- Maintenance contracts ----------
export const maintenanceContracts = {
  title: "Maintenance Contracts",
  crumb: () => ["Finance", "Contracts"],
  render() {
    const active = store.contracts.filter((c) => c.status === "active");
    const mrr = active.reduce((s, c) => s + (c.billingCycle === "monthly" ? c.amount : c.billingCycle === "quarterly" ? c.amount / 3 : c.amount / 12), 0);
    return html`
    ${pageHead("Maintenance Contracts", "Recurring service agreements with customers", html`<button class="btn btn-primary" id="new-contract">${iconSvg("plus", 15)} Create contract</button>`)}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Active Contracts", value: active.length, iconName: "shield", tone: "var(--success)" })}
      ${statCard({ label: "Monthly Recurring", value: money(Math.round(mrr)), iconName: "dollar" })}
      ${statCard({ label: "Annual Value", value: money(Math.round(mrr * 12)), iconName: "chart" })}
      ${statCard({ label: "Expiring (90d)", value: store.contracts.filter((c) => c.status === "active" && new Date(c.endDate) < new Date(Date.now() + 90 * 864e5)).length, iconName: "clock", tone: "var(--warning)" })}
    </div>
    ${card("", buildTable({
      columns: [
        { key: "number", label: "Contract", render: (r) => html`<div class="cell-main mono-val">${r.number}</div><div class="cell-sub">${r.plan}</div>` },
        { key: "customerId", label: "Customer", render: (r) => customerName(r.customerId) },
        { key: "billingCycle", label: "Billing", render: (r) => html`<span class="badge badge-neutral">${titleCase(r.billingCycle)}</span>` },
        { key: "amount", label: "Amount", cls: "num", render: (r) => money(r.amount) },
        { key: "startDate", label: "Start", render: (r) => fmtDate(r.startDate) },
        { key: "endDate", label: "End", render: (r) => fmtDate(r.endDate) },
        { key: "status", label: "Status", render: (r) => html`<span class="badge ${r.status === "active" ? "badge-active" : "badge-expired"}">${titleCase(r.status)}</span>` },
        { key: "autoRenew", label: "Renew", render: (r) => r.autoRenew ? html`<span class="badge badge-progress">Auto</span>` : html`<span class="badge badge-neutral">Manual</span>` },
      ], rows: store.contracts, rowId: (r) => r.id,
      empty: emptyState("No contracts", "Create a recurring service agreement.", "", "shield"),
    }), { tight: true })}`;
  },
  mount(root) {
    root.querySelector("#new-contract")?.addEventListener("click", () => {
      openForm({
        title: "Create maintenance contract",
        fields: [
          { key: "customerId", label: "Customer", type: "select", required: true, options: store.customers.map((c) => ({ value: c.id, label: c.company })), full: true },
          { key: "plan", label: "Plan name", required: true, placeholder: "e.g. Annual Maintenance" },
          { key: "amount", label: "Amount", type: "number", value: "240" },
          { key: "billingCycle", label: "Billing cycle", type: "select", options: ["monthly", "quarterly", "annual"] },
          { key: "startDate", label: "Start date", type: "date", value: new Date().toISOString().slice(0, 10) },
          { key: "endDate", label: "End date", type: "date", value: new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10) },
          { key: "coverage", label: "Coverage description", type: "textarea", full: true },
        ],
        values: { billingCycle: "monthly" },
        onSubmit: (d) => {
          const num = "MC-" + (600 + store.contracts.length + Math.floor(Math.random() * 300));
          mutate((s) => s.contracts.unshift({ id: uid("CON"), number: num, ...d, status: "active", autoRenew: true }));
          logAudit("created", "Contract", num, "Contract created");
          toast("Contract created", num, "success");
        },
      });
    });
    root.querySelectorAll("tr[data-row]").forEach((tr) => tr.addEventListener("click", () => toast("Contract " + tr.dataset.row, "View contract details", "info")));
  },
};
