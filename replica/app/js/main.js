import { store, initStore } from "./store.js";
import { can, ACTIONS } from "./session.js";
import { parseHash, onRoute } from "./router.js";
import { renderShell, setActiveNav, setBreadcrumb, errorState } from "./components.js";
import { iconSvg, toast } from "./util.js";
import { html } from "./markup.js";
import { getView } from "./views/index.js";

export { navigate, parseHash } from "./router.js";

const shell = renderShell();

// Screens that render outside the app shell, before a session exists.
const PUBLIC_IDS = new Set(["request-service", "customer-portal", "landing"]);
const AUTH_IDS = new Set(["login", "signup", "forgot", "reset-password"]);
const AUTH_FACTORY = { login: "loginView", signup: "signupView", forgot: "forgotView", "reset-password": "resetView" };

// The reset email link comes back with `type=recovery` — in the hash for the
// implicit flow, in the query string for PKCE. Matching on the type (rather than
// on the presence of any access_token) keeps sign-up confirmation links, which
// also carry an access_token, from landing on the new-password screen.
function recoveryParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  const hash = (window.location.hash || "").replace(/^#\/?/, "");
  return new URLSearchParams(`${window.location.search || ""}&${hash}`);
}

function isRecoveryUrl() {
  return recoveryParams().get("type") === "recovery";
}

// Confirmation, magic-link and invite links carry auth parameters in the URL that
// are not a route. Once supabase-js has exchanged them for a session the URL is
// replaced, so the stale token does not linger and the user lands somewhere real.
const CALLBACK_TYPES = new Set(["signup", "magiclink", "invite", "email_change"]);

function isAuthCallback() {
  if (typeof window === "undefined") return false;
  const p = recoveryParams();
  return p.has("access_token") || p.has("token_hash") || CALLBACK_TYPES.has(p.get("type") || "");
}

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
  syncThemeIcon();
}
function syncThemeIcon() {
  const btn = document.getElementById("theme-btn");
  if (!btn) return;
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  btn.innerHTML = String(iconSvg(dark ? "sun" : "moon", 17));
}
try { const t = localStorage.getItem("fixflow.theme"); if (t) document.documentElement.setAttribute("data-theme", t); } catch {}
syncThemeIcon();

// The store only tells us that a write to the device failed; the wording lives here.
window.addEventListener("fixflow:storage-error", () => {
  toast("Device storage is full", "Photos could not be saved locally — remove a few to free space.", "error");
});

// global navigation via data-nav
document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-nav]");
  if (!nav) return;
  const id = nav.dataset.nav;
  if (id === "__reset") {
    if (!can(ACTIONS.DATA_RESET)) return;
    store.reset();
    // eslint-disable-next-line no-alert
    window.location.hash = "#/dashboard";
    return;
  }
  if (id === "__logout") {
    store.session = null;
    import("./supabase.js").then((m) => m.signOut?.()).catch(() => {}).finally(() => {
      window.location.hash = "#/login";
      window.location.reload();
    });
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

const contentEl = () => document.getElementById("content");

function route() {
  if (isRecoveryUrl()) { renderAuth("reset-password"); return; }

  if (isAuthCallback()) {
    if (store.authed) {
      try { history.replaceState(null, "", "#/dashboard"); } catch { /* keep the hash */ }
    } else {
      // The token could not be exchanged (expired, or already used).
      renderAuth("login");
      return;
    }
  }

  const { id, params } = parseHash();
  if (AUTH_IDS.has(id)) { renderAuth(id); return; }
  if (!store.session && !PUBLIC_IDS.has(id)) { renderAuth("login"); return; }

  const view = getView(id);
  if (!view) { renderError("Page not found", `No view is registered for “${id}”.`); return; }

  try {
    if (id === "landing") {
      document.body.classList.add("logged-out");
    } else {
      document.body.classList.remove("logged-out");
    }
    setActiveNav(id);
    const crumb = view.crumb ? view.crumb(params) : [view.title || "Dashboard"];
    setBreadcrumb(crumb);

    contentEl().innerHTML = view.render(params);
    if (view.mount) view.mount(contentEl(), params);
    window.scrollTo(0, 0);
  } catch (e) {
    console.error(`[fixflow] failed to render "${id}":`, e);
    renderError("Something went wrong", (e && e.message) || String(e));
  }
}

function renderError(title, detail) {
  document.body.classList.remove("logged-out");
  const c = contentEl();
  if (!c) return;
  c.innerHTML = String(errorState(title, detail));
  c.querySelector("#retry-btn")?.addEventListener("click", () => route());
}

function showLoading() {
  const c = contentEl();
  if (!c) return;
  c.innerHTML = String(html`<div class="empty">
    <div class="e-ico">${iconSvg("refresh", 22)}</div>
    <h3>Loading…</h3><p>Syncing your data.</p>
  </div>`);
}

function renderAuth(kind) {
  document.body.classList.add("logged-out");
  import("./views/auth.js").then((m) => {
    const factory = m[AUTH_FACTORY[kind]] || m.loginView;
    const { html, mount } = factory();
    contentEl().innerHTML = html;
    mount?.(contentEl());
  });
}

window.addEventListener("hashchange", route);
onRoute(route);

// Boot: pull data from Supabase (if configured) before the first render. The
// first paint never blocks on a slow network — it renders from the local cache
// (or a loading state) and re-renders once the pull settles or times out.
const BOOT_TIMEOUT_MS = 5000;
const supabaseCfg = (typeof window !== "undefined" && window.FIXFLOW_SUPABASE) || {};
const configured = Boolean(supabaseCfg.url && supabaseCfg.anonKey);

(async () => {
  if (configured) showLoading(); else route();

  const boot$ = initStore().catch((e) => {
    console.warn("[fixflow] initStore failed:", e);
    return { source: "local", error: (e && e.message) || String(e) };
  });
  const res = await Promise.race([
    boot$,
    new Promise((resolve) => setTimeout(() => resolve({ source: "local", timeout: true }), BOOT_TIMEOUT_MS)),
  ]);

  if (res.timeout) {
    console.warn("[fixflow] boot timed out; rendering cached data");
    toast("Still syncing", "Showing your locally cached data.", "info");
    boot$.then((real) => { window.FIXFLOW_SOURCE = real.source; route(); }).catch(() => {});
    window.FIXFLOW_SOURCE = "local";
    route();
    return;
  }

  window.FIXFLOW_SOURCE = res.source;
  if (res.error) toast("Offline mode", "Could not reach the server — showing local data.", "info");
  if (res.source === "supabase" && res.seeded) console.info("[fixflow] Seeded Supabase from local seed data.");
  route();
})();
