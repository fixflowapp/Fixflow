import { store, mutate, logAudit, id as uid } from "../store.js";
import { html } from "../markup.js";
import { money, fmtDate, fmtMonth, timeAgo, invoiceBadge, statusBadge, avatar, toast, modal, closeModal, confirmDialog, iconSvg, INVOICE_STATUS } from "../util.js";
import { pageHead, statCard, card, buildTable, emptyState, toolbar, buildForm, readForm, validateForm, barChart, progressBar } from "../components.js";
import { customerName, customerById, jobById, invoiceById, monthlySeries } from "../lookups.js";
import { pendingInvoices, overdueInvoices, daysOverdue } from "../domain.js";
import { exportCsv } from "./jobs.js";

// ---------- Invoices list ----------
export const invoices = {
  title: "Invoices",
  crumb: () => ["Invoices"],
  render() {
    return html`
    ${pageHead("Invoices", "Browse, filter and manage customer invoices", html`
      <button class="btn btn-secondary" id="export-inv">${iconSvg("download", 15)} Export</button>
      <button class="btn btn-primary" data-nav="new-invoice">${iconSvg("plus", 15)} New Invoice</button>`)}
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Total Invoiced", value: money(store.invoices.filter((i) => i.status !== "cancelled").reduce((s, i) => s + i.total, 0)), iconName: "file" })}
      ${statCard({ label: "Paid", value: money(store.invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0)), iconName: "check", tone: "var(--success)" })}
      ${statCard({ label: "Outstanding", value: money(pendingInvoices().reduce((s, i) => s + i.total, 0)), iconName: "clock", tone: "var(--warning)" })}
      ${statCard({ label: "Overdue Count", value: overdueInvoices().length, iconName: "bell", tone: "var(--danger)" })}
    </div>
    <div class="card">
      ${toolbar({ searchId: "inv-search", placeholder: "Search by invoice #, customer...", filters: [
        { key: "status", label: "Status", options: Object.entries(INVOICE_STATUS).map(([v, m]) => ({ value: v, label: m.label })) },
      ] })}
      <div id="inv-table"></div>
    </div>`;
  },
  mount(root) {
    let search = "", filters = {};
    const holder = root.querySelector("#inv-table");
    const draw = () => {
      let rows = [...store.invoices];
      for (const [k, v] of Object.entries(filters)) if (v && v !== "all") rows = rows.filter((r) => String(r[k]) === v);
      if (search.trim()) { const q = search.toLowerCase(); rows = rows.filter((r) => [r.number, customerName(r.customerId), r.jobId].join(" ").toLowerCase().includes(q)); }
      holder.innerHTML = String(buildTable({
        columns: [
          { key: "number", label: "Invoice", render: (r) => html`<div class="cell-main mono-val">${r.number}</div><div class="cell-sub">Job ${r.jobId}</div>` },
          { key: "customerId", label: "Customer", render: (r) => html`<div class="cell-flex">${avatar(customerName(r.customerId))}${customerName(r.customerId)}</div>` },
          { key: "total", label: "Amount", cls: "num", render: (r) => html`<b>${money(r.total)}</b>` },
          { key: "status", label: "Status", render: (r) => invoiceBadge(r.status) },
          { key: "issuedAt", label: "Issued", render: (r) => fmtDate(r.issuedAt) },
          { key: "dueAt", label: "Due", render: (r) => fmtDate(r.dueAt) },
        ],
        rows, rowId: (r) => r.id,
        empty: emptyState("No invoices", "Create one from a completed job.", html`<button class="btn btn-primary btn-sm" data-nav="new-invoice">New invoice</button>`, "file"),
      }));
      holder.querySelectorAll("tr[data-row]").forEach((tr) => tr.addEventListener("click", () => { if (tr.dataset.row) window.location.hash = "#/invoice-details/" + tr.dataset.row; }));
    };
    root.querySelector("#inv-search").addEventListener("input", (e) => { search = e.target.value; draw(); });
    root.querySelectorAll("[data-filter]").forEach((sel) => sel.addEventListener("change", (e) => { filters[sel.dataset.filter] = e.target.value; draw(); }));
    root.querySelector("#export-inv")?.addEventListener("click", () => exportCsv("invoices", ["number", "total", "status", "issuedAt", "dueAt"], store.invoices));
    draw();
  },
};

// ---------- Invoice details ----------
export const invoiceDetails = {
  title: "Invoice Details",
  crumb: (p) => ["Invoices", p.id],
  render(params) {
    const inv = invoiceById(params.id) || store.invoices[0];
    if (!inv) return emptyState("Invoice not found", "");
    const cust = customerById(inv.customerId);
    const job = jobById(inv.jobId);
    const payments = store.payments.filter((p) => p.invoiceId === inv.id);
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    return html`
    ${pageHead("Invoice " + inv.number, `${customerName(inv.customerId)} · issued ${fmtDate(inv.issuedAt)}`, html`
      <div class="row">${invoiceBadge(inv.status)}
        <button class="btn btn-secondary" id="download-pdf">${iconSvg("download", 14)} PDF</button>
        <button class="btn btn-secondary" id="send-inv">${iconSvg("mail", 14)} Send</button>
        ${inv.status !== "paid" ? html`<button class="btn btn-primary" id="record-pay">${iconSvg("dollar", 14)} Record payment</button>` : ""}
      </div>`)}
    <div class="grid" style="grid-template-columns:2fr 1fr">
      ${card("", html`
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:20px;margin-bottom:24px">
          <div>
            <div class="row" style="gap:10px;margin-bottom:14px"><span class="brand-mark">F</span><b style="font-size:16px">${store.settings.companyName}</b></div>
            <div class="small muted">${store.settings.address}</div>
            <div class="small muted">${store.settings.email}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:20px;font-weight:700">INVOICE</div>
            <div class="mono-val">${inv.number}</div>
            <div class="small muted" style="margin-top:6px">Due ${fmtDate(inv.dueAt)}</div>
          </div>
        </div>
        <div style="background:var(--surface);border-radius:10px;padding:14px;margin-bottom:20px">
          <div class="small muted" style="margin-bottom:4px">BILL TO</div>
          <div style="font-weight:600">${cust?.company || "—"}</div>
          <div class="small muted">${cust?.name || ""} · ${cust?.email || ""}</div>
          <div class="small muted">${cust?.address || ""}, ${cust?.city || ""}</div>
        </div>
        ${buildTable({
          columns: [
            { key: "description", label: "Description" },
            { key: "qty", label: "Qty", cls: "num" },
            { key: "unitPrice", label: "Unit Price", cls: "num", render: (r) => money(r.unitPrice) },
            { key: "total", label: "Total", cls: "num", render: (r) => money(r.total) },
          ], rows: inv.lineItems,
        })}
        <div style="display:flex;justify-content:flex-end;margin-top:18px">
          <div style="min-width:260px">
            <div class="row" style="justify-content:space-between;padding:6px 0"><span class="muted">Subtotal</span><span>${money(inv.subtotal)}</span></div>
            <div class="row" style="justify-content:space-between;padding:6px 0"><span class="muted">Tax (${store.settings.taxRate}%)</span><span>${money(inv.taxAmount)}</span></div>
            <div class="divider" style="margin:6px 0"></div>
            <div class="row" style="justify-content:space-between;font-size:17px;font-weight:700"><span>Total</span><span>${money(inv.total)}</span></div>
            ${paid ? html`<div class="row" style="justify-content:space-between;padding:6px 0;color:var(--success)"><span>Paid</span><span>${money(paid)}</span></div>
              <div class="row" style="justify-content:space-between;font-weight:600"><span>Balance</span><span>${money(inv.total - paid)}</span></div>` : ""}
          </div>
        </div>
        <div class="divider"></div>
        <div class="small muted">${inv.notes || ""}</div>`, { tight: true })}
      <div class="grid" style="gap:16px">
        ${card("Payment status", html`
          <div style="text-align:center;padding:10px 0">
            <div class="badge ${INVOICE_STATUS[inv.status].cls}" style="font-size:13px;padding:6px 14px">${INVOICE_STATUS[inv.status].label}</div>
            <div style="font-size:28px;font-weight:700;margin-top:12px">${money(inv.total)}</div>
            <div class="small muted">${inv.status === "paid" ? "Paid in full" : "Due " + fmtDate(inv.dueAt)}</div>
          </div>
          ${inv.status !== "paid" && inv.status !== "cancelled" ? html`<button class="btn btn-primary btn-block" id="record-pay-2">${iconSvg("dollar", 14)} Record payment</button>` : ""}`, { tight: true })}
        ${card("Linked records", html`
          <dl class="kv">
            <dt>Job</dt><dd><span class="link" data-nav="job-details" data-id="${job?.id || ""}">${job?.id || "—"}</span></dd>
            <dt>Customer</dt><dd><span class="link" data-nav="customer-details" data-id="${cust?.id || ""}">${cust?.company || "—"}</span></dd>
            <dt>Issued</dt><dd>${fmtDate(inv.issuedAt)}</dd>
            <dt>Due</dt><dd>${fmtDate(inv.dueAt)}</dd>
          </dl>`, { tight: true })}
        ${payments.length ? card("Payments received", payments.map((p) => html`
          <div class="list-item" style="padding:10px 0"><div style="flex:1"><div style="font-weight:600">${money(p.amount)}</div>
            <div class="cell-sub">${p.method.replace("_", " ")} · ${p.reference}</div></div><span class="small muted">${fmtDate(p.recordedAt)}</span></div>`), { tight: true }) : ""}
      </div>
    </div>`;
  },
  mount(root, params) {
    const inv = invoiceById(params.id) || store.invoices[0];
    root.querySelector("#send-inv")?.addEventListener("click", () => {
      mutate((s) => { const i = s.invoices.find((x) => x.id === inv.id); if (i.status === "draft") i.status = "sent"; i.sentAt = new Date().toISOString(); });
      logAudit("updated", "Invoice", inv.id, "Invoice sent to customer");
      toast("Invoice sent", "Emailed to " + customerById(inv.customerId)?.email, "success");
      window.location.hash = "#/invoice-details/" + inv.id;
    });
    root.querySelector("#download-pdf")?.addEventListener("click", () => { window.print(); toast("Preparing PDF", "Use Print → Save as PDF.", "info"); });
    [root.querySelector("#record-pay"), root.querySelector("#record-pay-2")].forEach((b) => b?.addEventListener("click", () => openRecordPayment(inv)));
    root.querySelectorAll("[data-id]").forEach((n) => n.addEventListener("click", () => {
      const route = n.dataset.nav;
      if (route && n.dataset.id) window.location.hash = `#/${route}/${n.dataset.id}`;
    }));
  },
};

export function openRecordPayment(inv) {
  const m = modal({
    title: "Record payment — " + inv.number,
    body: buildForm([
      { key: "amount", label: "Amount", type: "number", required: true, value: String(inv.total) },
      { key: "method", label: "Method", type: "select", options: [{ value: "card", label: "Card" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "cash", label: "Cash" }, { value: "check", label: "Check" }] },
      { key: "reference", label: "Reference", value: "REF-" + Math.floor(10000 + Math.random() * 89999) },
      { key: "recordedAt", label: "Date", type: "date", value: new Date().toISOString().slice(0, 10) },
    ]),
    footer: html`<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="save-pay">Record payment</button>`,
  });
  m.querySelector("#save-pay").addEventListener("click", () => {
    const d = readForm(m);
    if (!d.amount) return toast("Amount required", "", "error");
    mutate((s) => {
      s.payments.unshift({ id: uid("PAY"), invoiceId: inv.id, customerId: inv.customerId, amount: d.amount, method: d.method, reference: d.reference, recordedAt: d.recordedAt, recordedBy: s.session?.user || "Admin User" });
      const i = s.invoices.find((x) => x.id === inv.id);
      const totalPaid = s.payments.filter((p) => p.invoiceId === inv.id).reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid >= i.total - 0.01) i.status = "paid";
    });
    logAudit("created", "Payment", inv.id, "Payment of " + money(d.amount));
    toast("Payment recorded", money(d.amount) + " applied to " + inv.number, "success");
    closeModal();
    window.location.hash = "#/invoice-details/" + inv.id;
    window.location.reload();
  });
}

// ---------- New invoice ----------
export const newInvoice = {
  title: "New Invoice",
  crumb: () => ["Invoices", "New"],
  render(params) {
    const jobs = store.jobs.filter((j) => ["completed", "invoiced"].includes(j.status) && !store.invoices.some((i) => i.jobId === j.id));
    const preselect = params.job || jobs[0]?.id || "";
    return html`${pageHead("New Invoice", "Generate an invoice from a completed job", html`<button class="btn btn-secondary" data-nav="invoices">Cancel</button>`)}
      ${card("Select job", buildForm([
        { key: "jobId", label: "Completed job", type: "select", required: true, full: true, options: jobs.length ? jobs.map((j) => ({ value: j.id, label: `${j.id} — ${customerName(j.customerId)} — ${j.title}` })) : [{ value: "", label: "No completed jobs without invoices" }] },
      ], { jobId: preselect }), { tight: true })}
      ${card("Line items", html`
        <div id="line-items"></div>
        <button class="btn btn-secondary btn-sm" style="margin-top:12px" id="add-line">${iconSvg("plus", 14)} Add line item</button>
        <div style="display:flex;justify-content:flex-end;margin-top:18px">
          <div style="min-width:280px">
            <div class="row" style="justify-content:space-between;padding:5px 0"><span class="muted">Subtotal</span><span id="calc-sub">$0.00</span></div>
            <div class="row" style="justify-content:space-between;padding:5px 0"><span class="muted">Tax (${store.settings.taxRate}%)</span><span id="calc-tax">$0.00</span></div>
            <div class="divider" style="margin:6px 0"></div>
            <div class="row" style="justify-content:space-between;font-size:16px;font-weight:700"><span>Total</span><span id="calc-total">$0.00</span></div>
          </div>
        </div>`, {
        foot: html`<button class="btn btn-secondary" data-nav="invoices">Cancel</button><button class="btn btn-primary" id="generate">${iconSvg("file", 14)} Generate invoice</button>`,
      })}`;
  },
  mount(root, params) {
    const jobs = store.jobs.filter((j) => ["completed", "invoiced"].includes(j.status));
    const preselect = params.job || jobs.find((j) => !store.invoices.some((i) => i.jobId === j.id))?.id || jobs[0]?.id;
    const jobSelect = root.querySelector('[name="jobId"]');
    let lines = [];

    const renderLines = () => {
      root.querySelector("#line-items").innerHTML = String(buildTable({
        columns: [
          { key: "description", label: "Description", render: (r) => html`<input class="input" data-li="${r._i}" data-f="description" value="${r.description}" />` },
          { key: "qty", label: "Qty", render: (r) => html`<input class="input" style="width:80px" type="number" data-li="${r._i}" data-f="qty" value="${r.qty}" />` },
          { key: "unitPrice", label: "Unit Price", render: (r) => html`<input class="input" style="width:110px" type="number" data-li="${r._i}" data-f="unitPrice" value="${r.unitPrice}" />` },
          { key: "total", label: "Total", cls: "num", render: (r) => money(r.qty * r.unitPrice) },
          { key: "_del", label: "", render: (r) => html`<button class="btn btn-ghost btn-sm" data-del-line="${r._i}">${iconSvg("trash", 14)}</button>` },
        ], rows: lines.map((l, i) => ({ ...l, _i: i })),
      }));
      root.querySelectorAll("[data-f]").forEach((inp) => inp.addEventListener("change", () => {
        const i = +inp.dataset.li, f = inp.dataset.f;
        lines[i][f] = f === "description" ? inp.value : Number(inp.value);
        renderLines(); recalc();
      }));
      root.querySelectorAll("[data-del-line]").forEach((b) => b.addEventListener("click", () => { lines.splice(+b.dataset.delLine, 1); renderLines(); recalc(); }));
      recalc();
    };
    const recalc = () => {
      const sub = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
      const tax = sub * (store.settings.taxRate / 100);
      root.querySelector("#calc-sub").textContent = money(sub);
      root.querySelector("#calc-tax").textContent = money(tax);
      root.querySelector("#calc-total").textContent = money(sub + tax);
    };
    const loadFromJob = () => {
      const job = jobById(jobSelect.value);
      if (!job) { lines = []; renderLines(); return; }
      lines = [
        { description: `${job.title} — labor (${job.laborHours}h)`, qty: job.laborHours, unitPrice: 85 },
        ...job.partsUsed.map((p) => ({ description: p.name, qty: p.qty, unitPrice: p.unitCost })),
      ];
      renderLines();
    };
    jobSelect.addEventListener("change", loadFromJob);
    root.querySelector("#add-line").addEventListener("click", () => { lines.push({ description: "", qty: 1, unitPrice: 0 }); renderLines(); });
    loadFromJob();

    root.querySelector("#generate").addEventListener("click", () => {
      if (!jobSelect.value) return toast("Select a job", "", "error");
      const job = jobById(jobSelect.value);
      const sub = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
      const tax = sub * (store.settings.taxRate / 100);
      const number = store.settings.invoicePrefix + (3000 + store.invoices.length + Math.floor(Math.random() * 500));
      mutate((s) => s.invoices.unshift({
        id: number, number, jobId: job.id, customerId: job.customerId,
        lineItems: lines.map((l) => ({ ...l, total: l.qty * l.unitPrice })),
        subtotal: sub, taxAmount: tax, total: sub + tax, status: "draft",
        issuedAt: new Date().toISOString(), dueAt: new Date(Date.now() + 15 * 864e5).toISOString(),
        notes: store.settings.invoiceTerms, sentAt: null,
      }));
      logAudit("created", "Invoice", number, "Invoice generated from " + job.id);
      toast("Invoice created", number, "success");
      window.location.hash = "#/invoice-details/" + number;
    });
  },
};

// ---------- Payments ----------
export const payments = {
  title: "Payments",
  crumb: () => ["Payments"],
  render() {
    const total = store.payments.reduce((s, p) => s + p.amount, 0);
    const byMethod = {};
    store.payments.forEach((p) => (byMethod[p.method] = (byMethod[p.method] || 0) + p.amount));
    const series = monthlySeries(6).map((s) => ({ label: s.label, value: store.payments.filter((p) => fmtMonth(p.recordedAt) === s.label).reduce((a, p) => a + p.amount, 0) }));
    return html`
    ${pageHead("Payments", "Record and track payments received", html`<button class="btn btn-secondary" id="export-pay">${iconSvg("download", 15)} Export</button>`) }
    <div class="grid grid-4" style="margin-bottom:16px">
      ${statCard({ label: "Total Collected", value: money(total), iconName: "dollar", tone: "var(--success)" })}
      ${statCard({ label: "Payments", value: store.payments.length, iconName: "check" })}
      ${statCard({ label: "Card", value: money(byMethod.card || 0), iconName: "file" })}
      ${statCard({ label: "Bank Transfer", value: money(byMethod.bank_transfer || 0), iconName: "truck" })}
    </div>
    ${card("Payment volume", barChart(series), { sub: "Last 6 months" })}
    <div style="height:16px"></div>
    ${card("", buildTable({
      columns: [
        { key: "id", label: "Payment", render: (r) => html`<span class="mono-val">${r.id}</span>` },
        { key: "invoiceId", label: "Invoice", render: (r) => html`<span class="link" data-nav="invoice-details" data-id="${r.invoiceId}">${invoiceById(r.invoiceId)?.number || r.invoiceId}</span>` },
        { key: "customerId", label: "Customer", render: (r) => customerName(r.customerId) },
        { key: "amount", label: "Amount", cls: "num", render: (r) => html`<b>${money(r.amount)}</b>` },
        { key: "method", label: "Method", render: (r) => html`<span class="badge badge-neutral">${r.method.replace("_", " ")}</span>` },
        { key: "reference", label: "Reference", render: (r) => html`<span class="mono-val small">${r.reference}</span>` },
        { key: "recordedAt", label: "Date", render: (r) => fmtDate(r.recordedAt) },
      ],
      rows: store.payments,
      empty: emptyState("No payments yet", "Record a payment from an invoice.", "", "dollar"),
    }), { tight: true })}`;
  },
  mount(root) {
    root.querySelector("#export-pay")?.addEventListener("click", () => exportCsv("payments", ["id", "invoiceId", "amount", "method", "recordedAt"], store.payments));
    root.querySelectorAll("[data-id]").forEach((n) => n.addEventListener("click", (e) => { e.stopPropagation(); window.location.hash = "#/invoice-details/" + n.dataset.id; }));
  },
};

// ---------- Invoice automation ----------
export const invoiceAutomation = {
  title: "Invoice Automation",
  crumb: () => ["Invoices", "Automation"],
  render() {
    const rules = [
      { id: "R1", trigger: "Job status → Completed", action: "Auto-create draft invoice", active: true, runs: 42 },
      { id: "R2", trigger: "Invoice unpaid after 15 days", action: "Send overdue reminder email", active: true, runs: 18 },
      { id: "R3", trigger: "Invoice overdue 30+ days", action: "Escalate to manager", active: false, runs: 4 },
      { id: "R4", trigger: "Job completed + parts used", action: "Attach parts cost to invoice", active: true, runs: 37 },
    ];
    const invoiceable = store.jobs.filter((j) => j.status === "completed" && !store.invoices.some((i) => i.jobId === j.id));
    return html`
    ${pageHead("Invoice Automation", "Automatically generate invoices and send reminders", html`<button class="btn btn-primary" id="new-rule">${iconSvg("plus", 15)} New rule</button>`)}
    <div class="grid" style="grid-template-columns:2fr 1fr">
      <div class="grid" style="gap:16px">
        ${card("Automation rules", rules.map((r) => html`
          <div class="list-item" style="padding:14px 0">
            <div class="e-ico" style="width:36px;height:36px;border-radius:9px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;margin:0">${iconSvg("sparkles", 16)}</div>
            <div style="flex:1"><div style="font-weight:600;font-size:13.5px">${r.trigger}</div><div class="cell-sub">→ ${r.action} · run ${r.runs} times</div></div>
            <label class="checkline"><input type="checkbox" ${r.active ? "checked" : ""} data-rule="${r.id}" /> Active</label>
          </div>`), { tight: true })}
      </div>
      ${card("Ready to invoice", html`
        <p class="muted small" style="margin-bottom:12px">${invoiceable.length} completed job${invoiceable.length === 1 ? "" : "s"} without an invoice.</p>
        ${invoiceable.length ? invoiceable.slice(0, 6).map((j) => html`
          <div class="list-item" style="padding:10px 0">
            <div style="flex:1"><div style="font-weight:600;font-size:13px">${j.id}</div><div class="cell-sub">${customerName(j.customerId)} · ${money(j.estimatedCost)}</div></div>
            <button class="btn btn-secondary btn-sm" data-gen="${j.id}">Generate</button>
          </div>`) : emptyState("All invoiced", "No completed jobs are waiting.", "", "check")}`, { tight: true })}
    </div>`;
  },
  mount(root) {
    root.querySelectorAll("[data-rule]").forEach((c) => c.addEventListener("change", () => toast("Rule updated", "", "success")));
    root.querySelectorAll("[data-gen]").forEach((b) => b.addEventListener("click", () => { window.location.hash = "#/new-invoice?job=" + b.dataset.gen; }));
    root.querySelector("#new-rule")?.addEventListener("click", () => toast("New rule", "Configure triggers and actions.", "info"));
  },
};

// ---------- Invoice follow-ups ----------
export const invoiceFollowUps = {
  title: "Invoice Follow-Ups",
  crumb: () => ["Invoices", "Follow-Ups"],
  render() {
    const rows = overdueInvoices().map((i) => ({ ...i, daysOverdue: daysOverdue(i) })).sort((a, b) => b.daysOverdue - a.daysOverdue);
    return html`
    ${pageHead("Invoice Follow-Ups", "Track overdue invoices and send reminders")}
    <div class="grid grid-3" style="margin-bottom:16px">
      ${statCard({ label: "Overdue Invoices", value: rows.length, iconName: "bell", tone: "var(--danger)" })}
      ${statCard({ label: "Amount Overdue", value: money(rows.reduce((s, i) => s + i.total, 0)), iconName: "dollar", tone: "var(--danger)" })}
      ${statCard({ label: "Avg Days Overdue", value: rows.length ? Math.round(rows.reduce((s, i) => s + i.daysOverdue, 0) / rows.length) : 0, iconName: "clock" })}
    </div>
    ${card("Overdue invoices", buildTable({
      columns: [
        { key: "number", label: "Invoice", render: (r) => html`<span class="mono-val">${r.number}</span>` },
        { key: "customerId", label: "Customer", render: (r) => customerName(r.customerId) },
        { key: "total", label: "Amount", cls: "num", render: (r) => html`<b>${money(r.total)}</b>` },
        { key: "dueAt", label: "Due", render: (r) => fmtDate(r.dueAt) },
        { key: "daysOverdue", label: "Days overdue", render: (r) => html`<span class="badge ${r.daysOverdue > 30 ? "badge-danger" : "badge-waiting"}">${r.daysOverdue} days</span>` },
        { key: "act", label: "", render: (r) => html`<div class="row"><button class="btn btn-secondary btn-sm" data-remind="${r.id}">${iconSvg("mail", 14)} Remind</button><button class="btn btn-ghost btn-sm" data-view="${r.id}">View</button></div>` },
      ],
      rows,
      empty: emptyState("Nothing overdue", "All invoices are current.", "", "check"),
    }), { tight: true })}`;
  },
  mount(root) {
    root.querySelectorAll("[data-remind]").forEach((b) => b.addEventListener("click", () => {
      const inv = invoiceById(b.dataset.remind);
      logAudit("updated", "Invoice", inv.id, "Reminder sent");
      toast("Reminder sent", "Follow-up emailed to " + customerById(inv.customerId)?.email, "success");
    }));
    root.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { window.location.hash = "#/invoice-details/" + b.dataset.view; }));
  },
};
