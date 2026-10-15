// Layout shell + reusable UI builders.
import { store, mutate } from "./store.js";
import { can, ACTIONS } from "./session.js";
import { html, raw } from "./markup.js";
import { el, icon, iconSvg, initials, avatar, toast, timeAgo, statusBadge, fmtDate } from "./util.js";

export const NAV = [
  { group: "Overview", items: [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "home", label: "Home", icon: "globe" },
  ]},
  { group: "Jobs", items: [
    { id: "jobs", label: "Jobs", icon: "briefcase" },
    { id: "new-job", label: "New Job", icon: "plus" },
    { id: "job-templates", label: "Job Templates", icon: "clipboard" },
    { id: "recurring-jobs", label: "Recurring Jobs", icon: "refresh" },
    { id: "work-orders", label: "Work Orders", icon: "fileText" },
    { id: "job-costing", label: "Job Costing", icon: "dollar" },
  ]},
  { group: "Customers", items: [
    { id: "customers", label: "Customers", icon: "users" },
    { id: "asset-monitoring", label: "Asset Monitoring", icon: "cpu" },
    { id: "customer-portal", label: "Customer Portal", icon: "globe" },
  ]},
  { group: "Invoicing", items: [
    { id: "invoices", label: "Invoices", icon: "file" },
    { id: "new-invoice", label: "New Invoice", icon: "plus" },
    { id: "payments", label: "Payments", icon: "dollar" },
    { id: "invoice-automation", label: "Invoice Automation", icon: "sparkles" },
    { id: "invoice-follow-ups", label: "Invoice Follow-Ups", icon: "bell" },
  ]},
  { group: "Dispatch", items: [
    { id: "schedule", label: "Schedule", icon: "calendar" },
    { id: "technicians", label: "Technicians", icon: "wrench" },
    { id: "technician-dashboard", label: "Technician Dashboard", icon: "activity" },
    { id: "technician-performance", label: "Tech Performance", icon: "chart" },
  ]},
  { group: "Inventory", items: [
    { id: "parts-inventory", label: "Parts Inventory", icon: "box" },
    { id: "suppliers", label: "Suppliers", icon: "truck" },
  ]},
  { group: "Finance", items: [
    { id: "maintenance-contracts", label: "Maintenance Contracts", icon: "shield" },
    { id: "reports", label: "Reports", icon: "chart" },
  ]},
  { group: "Communication", items: [
    { id: "messages", label: "Messages", icon: "message" },
    { id: "request-service", label: "Request Service", icon: "clipboard" },
  ]},
  { group: "Admin", items: [
    { id: "settings", label: "Settings", icon: "settings" },
    { id: "data-import", label: "Data Import", icon: "upload" },
    { id: "audit-logs", label: "Audit Logs", icon: "archive" },
    { id: "gdpr-admin", label: "GDPR Admin", icon: "lock" },
  ]},
];

export const ROUTES_FLAT = NAV.flatMap((g) => g.items);

function navItem(it) {
  return html`<div class="nav-item" data-nav="${it.id}">${icon(it.icon)}<span class="nav-item-label">${it.label}</span></div>`;
}

export function renderShell() {
  const unread = (store.notifications || []).filter((n) => !n.read).length;
  const navHtml = NAV.map((g) => html`
    <div class="nav-group-label">${g.group}</div>
    ${g.items.map(navItem)}
  `);

  const shell = el(html`<div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <span class="brand-mark">F</span>
        <div class="brand-text">
          <div class="brand-name">FixFlow</div>
          <div class="brand-sub">Repair Management</div>
        </div>
      </div>
      <nav class="sidebar-nav">${navHtml}
        <div class="nav-group-label">Session</div>
        <div class="nav-item" data-nav="__logout">${icon("logout")}<span class="nav-item-label">Sign out</span></div>
      </nav>
    </aside>
    <div class="main">
      <header class="header">
        <button class="icon-btn" id="collapse-btn" aria-label="Toggle navigation">${icon("menu")}</button>
        <nav class="header-breadcrumb" id="breadcrumb"></nav>
        <div class="header-spacer"></div>
        <div class="header-search">
          <span style="display:grid;place-items:center">${iconSvg("search", 15)}</span>
          <input id="global-search" placeholder="Search jobs, customers, invoices..." />
          <kbd>⌘K</kbd>
        </div>
        <button class="icon-btn dropdown" id="theme-btn" aria-label="Toggle theme">${iconSvg("sparkles", 17)}</button>
        <div class="dropdown">
          <button class="icon-btn" id="bell-btn" aria-label="Notifications" style="position:relative">
            ${icon("bell")}
            ${unread ? html`<span class="badge-dot" style="position:absolute;top:5px;right:6px"></span>` : ""}
          </button>
          <div class="menu" id="bell-menu">
            <div style="padding:8px 10px;font-weight:600;font-size:13px">Notifications</div>
            ${(store.notifications || []).slice(0, 6).map((n) => html`
              <div class="menu-item" style="align-items:flex-start">
                <span style="width:6px;height:6px;border-radius:50%;margin-top:6px;background:${n.read ? "var(--border)" : "var(--accent)"}"></span>
                <div><div style="font-weight:600">${n.title}</div>
                <div class="small muted">${n.body} · ${timeAgo(n.at)}</div></div>
              </div>`)}
          </div>
        </div>
        <div class="dropdown">
          <div class="avatar" id="avatar-btn">${store.session?.initials || "AU"}</div>
          <div class="menu" id="avatar-menu">
            <div style="padding:8px 10px">
              <div style="font-weight:600">${store.session?.user || "Admin User"}</div>
              <div class="small muted">${store.session?.email || ""}</div>
            </div>
            <div class="menu-sep"></div>
            <div class="menu-item" data-nav="settings">${iconSvg("settings", 15)} Settings</div>
            ${can(ACTIONS.DATA_RESET) ? html`<div class="menu-item" data-nav="__reset">${iconSvg("refresh", 15)} Reset demo data</div>` : ""}
            <div class="menu-sep"></div>
            <div class="menu-item" data-nav="__logout">${iconSvg("logout", 15)} Sign out</div>
          </div>
        </div>
      </header>
      <main class="content" id="content"></main>
    </div>
  </div>`);

  document.getElementById("app").appendChild(shell);
  return shell;
}

export function setBreadcrumb(parts) {
  const bc = document.getElementById("breadcrumb");
  if (!bc) return;
  bc.innerHTML = String(html`${parts.map((p, i) => i === parts.length - 1 ? html`<b>${p}</b>` : html`<span>${p}</span>${iconSvg("chevronRight", 13)}`).join(" ")}`);
}

export function setActiveNav(id) {
  document.querySelectorAll("[data-nav]").forEach((n) => n.classList.toggle("active", n.dataset.nav === id));
}

// ---------- page builders ----------
export function pageHead(title, subtitle, actions = "") {
  return html`<div class="page-head">
    <div><h1>${title}</h1>${subtitle ? html`<p>${subtitle}</p>` : ""}</div>
    <div class="page-actions">${actions}</div>
  </div>`;
}

export function statCard({ label, value, iconName, delta, foot, tone }) {
  const dcls = delta > 0 ? "up" : "down";
  return html`<div class="card stat">
    <div class="stat-label">${iconName ? iconSvg(iconName, 15) : ""}${label}</div>
    <div class="stat-value" ${tone ? raw(`style="color:${tone}"`) : ""}>${value}</div>
    ${(delta != null || foot) ? html`<div class="stat-foot">
      ${delta != null ? html`<span class="delta ${dcls}">${iconSvg(delta > 0 ? "arrowUp" : "arrowDown", 13)}${Math.abs(delta)}%</span>` : ""}
      ${foot ? html`<span>${foot}</span>` : ""}
    </div>` : ""}
  </div>`;
}

export function emptyState(title, msg, actionHtml = "", iconName = "box") {
  return html`<div class="empty">
    <div class="e-ico">${iconSvg(iconName, 22)}</div>
    <h3>${title}</h3><p>${msg}</p>${actionHtml}
  </div>`;
}

// Shown when a view fails to render, so a crash degrades to a retry card
// instead of a blank page.
export function errorState(title, detail) {
  return emptyState(title, detail, html`<button class="btn btn-primary btn-sm" id="retry-btn">Try again</button>`, "refresh");
}

export function card(title, bodyHtml, { sub = "", actions = "", tight = false, foot = "" } = {}) {
  return html`<div class="card">
    ${title ? html`<div class="card-head"><div><h3>${title}</h3>${sub ? html`<div class="sub">${sub}</div>` : ""}</div><div class="spacer"></div>${actions}</div>` : ""}
    <div class="card-body ${tight ? "tight" : ""}">${bodyHtml}</div>
    ${foot ? html`<div class="card-foot">${foot}</div>` : ""}
  </div>`;
}

// Generic table. config: { columns:[{key,label,render,cls,sortable}], rows, empty, onRow }
export function buildTable({ columns, rows, empty, rowId, emptyAction } = {}) {
  if (!rows || !rows.length) {
    return empty || emptyState("Nothing here yet", "No records match the current view.", emptyAction || "");
  }
  const head = columns.map((c) => html`<th class="${c.cls || ""} ${c.sortable ? "sortable" : ""}" data-sort="${c.key}">${c.label}</th>`);
  const body = rows.map((r) => html`<tr data-row="${rowId ? rowId(r) : ""}" class="${rowId ? "clickable" : ""}">${columns.map((c) => html`<td class="${c.cls || ""}">${c.render ? c.render(r) : r[c.key]}</td>`)}</tr>`);
  return html`<div class="table-wrap"><table class="data"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// Filtering + search helper for list pages.
export function filterRows(rows, { search, fields, filters = {} }) {
  let out = rows;
  for (const [key, val] of Object.entries(filters)) {
    if (!val || val === "all") continue;
    out = out.filter((r) => String(r[key]) === String(val));
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    out = out.filter((r) => fields.some((f) => String(typeof f === "function" ? f(r) : r[f] ?? "").toLowerCase().includes(q)));
  }
  return out;
}

export function toolbar({ searchId, placeholder = "Search...", filters = [], actions = "" }) {
  const chips = filters.map((f) => html`
    <select class="select-sm" data-filter="${f.key}">
      <option value="all">${f.label}: All</option>
      ${f.options.map((o) => html`<option value="${o.value}">${o.label}</option>`)}
    </select>`);
  return html`<div class="toolbar">
    <div class="search-box">${iconSvg("search", 15)}<input id="${searchId}" placeholder="${placeholder}" /></div>
    ${chips}
    <div class="right row">${actions}</div>
  </div>`;
}

// ---------- forms ----------
// field: {key,label,type,required,options,hint,placeholder,full,value}
export function buildForm(fields, values = {}) {
  const rows = fields.map((f) => {
    const v = values[f.key] ?? f.value ?? "";
    let control;
    if (f.type === "select") {
      control = html`<select class="select" name="${f.key}">
        ${(f.options || []).map((o) => {
          const val = typeof o === "object" ? o.value : o;
          const lbl = typeof o === "object" ? o.label : o;
          return html`<option value="${val}" ${String(val) === String(v) ? "selected" : ""}>${lbl}</option>`;
        })}
      </select>`;
    } else if (f.type === "textarea") {
      control = html`<textarea class="textarea" name="${f.key}" placeholder="${f.placeholder || ""}">${v}</textarea>`;
    } else {
      control = html`<input class="input" type="${f.type || "text"}" name="${f.key}" value="${v}" placeholder="${f.placeholder || ""}" />`;
    }
    return html`<div class="field ${f.full ? "full" : ""}">
      <label>${f.label}${f.required ? raw('<span class="req">*</span>') : ""}</label>
      ${control}
      ${f.hint ? html`<span class="hint">${f.hint}</span>` : ""}
    </div>`;
  });
  return html`<div class="form-grid">${rows}</div>`;
}

export function readForm(container) {
  const data = {};
  container.querySelectorAll("input,select,textarea").forEach((f) => {
    if (!f.name) return;
    data[f.name] = f.type === "number" ? (f.value === "" ? null : Number(f.value)) : f.value;
  });
  return data;
}

export function validateForm(container, requiredKeys) {
  let ok = true;
  requiredKeys.forEach((k) => {
    const f = container.querySelector(`[name="${k}"]`);
    if (!f) return;
    const bad = !String(f.value || "").trim();
    f.classList.toggle("err", bad);
    if (bad) ok = false;
  });
  return ok;
}

// ---------- charts (inline svg) ----------
export function barChart(data, { height = 200, color = "var(--accent)", altColor } = {}) {
  const w = 600, h = height, pad = 28, bw = (w - pad * 2) / data.length;
  const max = Math.max(...data.map((d) => d.value), 1);
  const bars = data.map((d, i) => {
    const bh = (d.value / max) * (h - pad * 2);
    const x = pad + i * bw + bw * 0.16;
    const y = h - pad - bh;
    return html`<rect class="bar ${d.alt ? "alt" : ""}" x="${x}" y="${y}" width="${bw * 0.68}" height="${bh}" rx="4" style="${d.alt && altColor ? `fill:${altColor}` : ""}">
      <title>${d.label}: ${d.display ?? d.value}</title></rect>
      <text class="axis" x="${x + bw * 0.34}" y="${h - 8}" text-anchor="middle">${d.label}</text>`;
  });
  return html`<svg class="chart" viewBox="0 0 ${w} ${h}" role="img">
    ${[0, 0.25, 0.5, 0.75, 1].map((t) => html`<line class="gridline" x1="${pad}" x2="${w - pad}" y1="${pad + t * (h - pad * 2)}" y2="${pad + t * (h - pad * 2)}"/>`)}
    ${bars}
  </svg>`;
}

export function lineChart(series, { height = 200 } = {}) {
  const w = 600, h = height, pad = 28;
  const all = series.flatMap((s) => s.data.map((d) => d.value));
  const max = Math.max(...all, 1);
  const n = series[0].data.length;
  const xAt = (i) => pad + (i / (n - 1)) * (w - pad * 2);
  const yAt = (v) => h - pad - (v / max) * (h - pad * 2);
  const paths = series.map((s) => {
    const line = s.data.map((d, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(d.value).toFixed(1)}`).join(" ");
    const area = `${line} L${xAt(n - 1)},${h - pad} L${xAt(0)},${h - pad} Z`;
    return html`${s.fill ? html`<path class="area" d="${area}" style="fill:${s.color}"/>` : ""}
      <path class="line" d="${line}" style="stroke:${s.color}"/>`;
  });
  const labels = series[0].data.map((d, i) => html`<text class="axis" x="${xAt(i)}" y="${h - 8}" text-anchor="middle">${d.label}</text>`);
  return html`<svg class="chart" viewBox="0 0 ${w} ${h}" role="img">
    ${[0, 0.25, 0.5, 0.75, 1].map((t) => html`<line class="gridline" x1="${pad}" x2="${w - pad}" y1="${pad + t * (h - pad * 2)}" y2="${pad + t * (h - pad * 2)}"/>`)}
    ${paths}${labels}
  </svg>`;
}

export function donutChart(segments, { size = 180 } = {}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 14, cx = size / 2, cy = size / 2;
  let acc = -Math.PI / 2;
  const arcs = segments.map((s) => {
    const frac = s.value / total;
    const a0 = acc, a1 = acc + frac * Math.PI * 2;
    acc = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return html`<path class="donut-seg" d="M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z" fill="${s.color}"><title>${s.label}: ${s.value}</title></path>`;
  });
  return html`<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img">
    ${arcs}<circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="var(--bg)"/>
    <text x="${cx}" y="${cy}" text-anchor="middle" dy="2" style="font-size:20px;font-weight:700;fill:var(--text)">${total}</text>
    <text x="${cx}" y="${cy}" text-anchor="middle" dy="18" style="font-size:10px;fill:var(--text-muted)">total</text>
  </svg>`;
}

export function sparkline(values, color = "var(--accent)", w = 120, h = 32) {
  const max = Math.max(...values, 1), min = Math.min(...values, 0);
  const xAt = (i) => (i / (values.length - 1)) * w;
  const yAt = (v) => h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
  const d = values.map((v, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  return html`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`;
}

export function progressBar(pct, color = "var(--accent)") {
  return html`<div class="progress"><span style="width:${Math.max(0, Math.min(100, pct))}%;background:${color}"></span></div>`;
}
