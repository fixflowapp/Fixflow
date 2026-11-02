// Router — hash parsing, navigation, and a refresh hook.
//
// Kept dependency-light (only store.js) so views can import `refresh()` after a
// mutation without importing the composition root (main.js) and creating a cycle.
import { store } from "./store.js";

export function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [pathPart, queryPart] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const id = segments[0] || (store.session ? "dashboard" : "login");
  const params = Object.fromEntries(new URLSearchParams(queryPart || ""));
  if (segments[1]) {
    // A truncated or hand-edited link can carry an invalid escape (`%E0`). That
    // must not throw out of the router, so fall back to the raw segment.
    try { params.id = decodeURIComponent(segments[1]); }
    catch { params.id = segments[1]; }
  }
  return { id, params };
}

export function navigate(id, params = {}) {
  const qs = new URLSearchParams(params).toString();
  window.location.hash = "#/" + id + (qs ? "?" + qs : "");
}

const handlers = new Set();

// main.js registers the actual render function here at boot.
export function onRoute(fn) {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

// Re-render the current route in place (replaces full-page reloads after a
// mutation). The shell and its listeners stay put; only the content re-renders.
export function refresh() {
  handlers.forEach((fn) => fn());
}
