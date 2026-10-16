// Session — who is signed in, and what they are allowed to do.
//
// The signed-in identity has one of two sources ("adapters"):
//   • demo  — offline/local: the seeded local session is trusted as-is.
//   • supabase — real auth: the only source of truth for a signed-in user.
//
// Capabilities are checked through can(action) so UI affordances and handlers
// agree on one policy instead of each re-deciding who may do what.
import { store } from "./store.js";

export const ACTIONS = Object.freeze({
  DATA_RESET: "data.reset",
  SETTINGS_WRITE: "settings.write",
  USERS_MANAGE: "users.manage",
  DATA_WRITE: "data.write",
});

// role -> actions. "admin" holds every action implicitly.
const GRANTS = {
  "data.reset": ["admin"],
  "settings.write": ["admin", "manager"],
  "users.manage": ["admin"],
  "data.write": ["admin", "manager", "technician"],
};

const roleOf = (session) => (session && session.role) || "viewer";

export function can(action, session = store.session) {
  const role = roleOf(session);
  if (role === "admin") return true;
  const granted = GRANTS[action];
  return Boolean(granted && granted.includes(role));
}

export function currentRole(session = store.session) { return roleOf(session); }
export function isRealSession() { return Boolean(store.authed); }
export function sessionName(session = store.session) { return (session && session.user) || "Guest"; }

// ---------------------------------------------------------------------------
// Adapters — a small port so the account lifecycle is identical regardless of
// where the identity comes from. Both expose signIn()/signUp()/resetPassword()/
// updatePassword()/signOut(), each returning { ok, ... } and never throwing.
// ---------------------------------------------------------------------------
export function supabaseAdapter(sb) {
  return {
    name: "supabase",
    async signIn(email, password) {
      const res = await sb.signIn(email, password);
      return res.ok ? { ok: true, session: res.display } : { ok: false, error: res.error };
    },
    async signUp({ name, email, password }) {
      const res = await sb.signUp(email, password, name);
      if (!res.ok) return { ok: false, error: res.error };
      if (res.pending) return { ok: true, pending: true, email: res.email || email };
      return { ok: true, session: res.display };
    },
    async resetPassword(email, redirectTo) { return sb.resetPasswordForEmail(email, redirectTo); },
    async updatePassword(password) { return sb.updatePassword(password); },
    async signOut() { await sb.signOut(); },
  };
}

// Offline demo: the seeded local session is the identity, so there is no
// credential store to create an account in or to reset a password against.
export const demoAdapter = {
  name: "demo",
  async signIn() { return { ok: false, error: "Offline demo: sign-in is unavailable." }; },
  async signUp() { return { ok: false, error: "Offline demo: creating an account needs a connected backend." }; },
  async resetPassword() { return { ok: false, error: "Offline demo: password reset needs a connected backend." }; },
  async updatePassword() { return { ok: false, error: "Offline demo: password reset needs a connected backend." }; },
  async signOut() { /* nothing to clear */ },
};
