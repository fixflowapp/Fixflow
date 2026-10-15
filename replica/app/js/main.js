import { store } from "./store.js";
import { renderShell, setActiveNav, setBreadcrumb } from "./components.js";
import { iconSvg } from "./util.js";
import { getView } from "./views/index.js";

const shell = renderShell();

// sidebar / menus
document.getElementById("collapse-btn").addEventListener("click", () => {
  const sb = document.getElementById("sidebar");
  if (window.innerWidth <= 900) sb.classList.toggle("mobile-open");
  else sb.classList.toggle("collapsed");
});

function closeMenus() { document.querySelectorAll(".menu.open").forEach((m) => m.classList.remove("open")); }
["bell-btn", "avatar-btn", "theme-btn"].forEach((id) => {
  const toggle = id === "theme-btn" ? () => toggleTheme() : null;
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    if (toggle) return toggle();
    e.stopPropagation();
    const menu = btn.parentElement.querySelector(".menu");
    const wasOpen = menu.classList.contains("open");
    closeMenus();
    if (!wasOpen) menu.classList.add("open");
  });
});
document.addEventListener("click", closeMenus);

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", cur);
  try { localStorage.setItem("fixflow.theme", cur); } catch {}
}
try { const t = localStorage.getItem("fixflow.theme"); if (t) document.documentElement.setAttribute("data-theme", t); } catch {}

// global navigation via data-nav
document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-nav]");
  if (!nav) return;
  const id = nav.dataset.nav;
  if (id === "__reset") {
    store.reset();
    // eslint-disable-next-line no-alert
    window.location.hash = "#/dashboard";
    return;
  }
  if (id === "__logout") {
    store.session = null;
    route();
    return;
  }
  const detailId = nav.dataset.id ? "/" + nav.dataset.id : "";
  window.location.hash = "#/" + id + detailId;
});

// global search → navigate to jobs with query
document.getElementById("global-search").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const q = e.target.value.trim();
    if (q) window.location.hash = "#/jobs?q=" + encodeURIComponent(q);
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    document.getElementById("global-search")?.focus();
  }
});

export function navigate(id, params = {}) {
  const qs = new URLSearchParams(params).toString();
  window.location.hash = "#/" + id + (qs ? "?" + qs : "");
}

export function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [pathPart, queryPart] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const id = segments[0] || (store.session ? "dashboard" : "login");
  const params = Object.fromEntries(new URLSearchParams(queryPart || ""));
  if (segments[1]) params.id = decodeURIComponent(segments[1]);
  return { id, params };
}

const contentEl = () => document.getElementById("content");

function route() {
  const { id, params } = parseHash();
  const view = getView(id);

  if (!store.session && id !== "login" && id !== "request-service" && id !== "customer-portal") {
    renderLogin();
    return;
  }
  document.body.classList.remove("logged-out");

  setActiveNav(id);
  const crumb = view.crumb ? view.crumb(params) : [view.title || "Dashboard"];
  setBreadcrumb(crumb);

  contentEl().innerHTML = view.render(params);
  if (view.mount) view.mount(contentEl(), params);
  window.scrollTo(0, 0);
}

function renderLogin() {
  document.body.classList.add("logged-out");
  import("./views/auth.js").then(({ loginView }) => {
    const { html, mount } = loginView();
    contentEl().innerHTML = html;
    mount?.(contentEl());
  });
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
route();
