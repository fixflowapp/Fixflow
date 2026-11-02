import { store } from "../store.js";
import { supabaseAdapter, demoAdapter } from "../session.js";
import { html } from "../markup.js";
import { toast } from "../util.js";

const CAPS = [
  ["Job pipeline", "Intake, diagnosis, repair and hand-off in one queue"],
  ["Dispatch", "Assign technicians and run the service calendar"],
  ["Billing", "Generate invoices and reconcile payments"],
  ["Reporting", "Revenue, turnaround time and margin"],
];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;
export const SCORE_LABELS = ["Weak", "Weak", "Fair", "Good", "Strong"];

function configured() {
  const c = (typeof window !== "undefined" && window.FIXFLOW_SUPABASE) || {};
  return Boolean(c.url && c.anonKey);
}

function adapter() {
  return configured() ? import("../supabase.js").then((m) => supabaseAdapter(m)) : Promise.resolve(demoAdapter);
}

function redirectTarget() {
  if (typeof window === "undefined") return undefined;
  return window.location.origin + window.location.pathname;
}

// ---------------------------------------------------------------------------
// Validation — pure so the rules are testable without a DOM.
// ---------------------------------------------------------------------------
export function passwordProblem(password) {
  const p = String(password || "");
  if (p.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (!/[A-Za-z]/.test(p)) return "Include at least one letter.";
  if (!/\d/.test(p)) return "Include at least one number.";
  return null;
}

export function passwordScore(password) {
  const p = String(password || "");
  let score = 0;
  if (p.length >= MIN_PASSWORD) score += 1;
  if (p.length >= 12) score += 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1;
  if (/\d/.test(p)) score += 1;
  if (/[^A-Za-z0-9]/.test(p)) score += 1;
  return Math.min(score, 4);
}

export function validateSignup({ name, email, password, confirm } = {}) {
  const n = String(name || "").trim();
  if (n.length < 2) return { ok: false, error: "Enter your full name." };
  const e = String(email || "").trim();
  if (!EMAIL_RE.test(e)) return { ok: false, error: "Enter a valid email address." };
  const bad = passwordProblem(password);
  if (bad) return { ok: false, error: bad };
  if (String(confirm ?? "") !== String(password ?? "")) return { ok: false, error: "Passwords do not match." };
  return { ok: true, name: n, email: e.toLowerCase() };
}

export function validateForgot({ email } = {}) {
  const e = String(email || "").trim();
  if (!EMAIL_RE.test(e)) return { ok: false, error: "Enter a valid email address." };
  return { ok: true, email: e.toLowerCase() };
}

export function validateReset({ password, confirm } = {}) {
  const bad = passwordProblem(password);
  if (bad) return { ok: false, error: bad };
  if (String(confirm ?? "") !== String(password ?? "")) return { ok: false, error: "Passwords do not match." };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Error copy — backend messages are developer-facing and can name tables or
// policies, so known cases are translated to plain sentences and anything
// unknown falls back to a stable one. The original always reaches the console.
// ---------------------------------------------------------------------------
const AUTH_ERROR_COPY = [
  [/signups? not allowed|signup is disabled/i, "Sign-ups are disabled on this deployment. Ask an administrator for an account."],
  [/already registered|already been registered/i, "An account with this email already exists. Sign in instead."],
  [/invalid login credentials/i, "That email and password do not match an account."],
  [/email not confirmed/i, "Confirm your email address first. Check your inbox for the link."],
  [/rate limit|too many requests/i, "Too many attempts. Wait a few minutes and try again."],
  [/should be different from the old/i, "Choose a password you have not used before."],
  [/failed to fetch|network ?error|load failed/i, "Cannot reach the server. Check your connection and try again."],
];

export function friendlyAuthError(message, fallback = "Something went wrong. Try again.") {
  const text = String(message || "").trim();
  if (!text) return fallback;
  for (const [pattern, copy] of AUTH_ERROR_COPY) if (pattern.test(text)) return copy;
  if (typeof console !== "undefined") console.warn("[fixflow] auth error:", text);
  return fallback;
}

// ---------------------------------------------------------------------------
// Shared layout + controls
// ---------------------------------------------------------------------------
function authFrame(form) {
  return html`
  <div class="auth">
    <div class="auth-panel">
      <div class="auth-brand" data-nav="landing" style="cursor:pointer" title="View FixFlow Overview">
        <span class="brand-mark">F</span>
        <span class="brand-name">FixFlow</span>
        <span class="badge badge-neutral" style="margin-left:auto;font-size:11px">Overview &rarr;</span>
      </div>
      <div>
        <h1 class="auth-headline">Every repair job, from intake to invoice.</h1>
        <p class="auth-sub">
          Track work orders, dispatch technicians, manage parts inventory and keep customers
          informed, from a single operations desk.
        </p>
        <div class="auth-caps">
          ${CAPS.map(([t, d]) => html`<div class="auth-cap">
            <b>${t}</b>
            <span>${d}</span>
          </div>`)}
        </div>
      </div>
      <div class="auth-foot">© ${new Date().getFullYear()} FixFlow Repairs</div>
    </div>
    <div class="auth-form-side">
      <div class="auth-form">${form}</div>
    </div>
  </div>`;
}

function errorBox() {
  return html`<div class="field" data-error style="display:none;margin-bottom:14px">
    <div class="hint" style="color:var(--danger)"></div>
  </div>`;
}

function meterField() {
  return html`
    <div class="auth-meter" data-meter data-score="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="hint" data-meter-label>At least ${MIN_PASSWORD} characters, with a letter and a number.</div>`;
}

function wireError(root) {
  const box = root.querySelector("[data-error]");
  const text = box && box.querySelector(".hint");
  return {
    show(message) { if (text) text.textContent = message; if (box) box.style.display = "block"; },
    clear() { if (box) box.style.display = "none"; },
  };
}

function wireMeter(root, input) {
  const meter = root.querySelector("[data-meter]");
  const label = root.querySelector("[data-meter-label]");
  const base = `At least ${MIN_PASSWORD} characters, with a letter and a number.`;
  input.addEventListener("input", () => {
    const score = passwordScore(input.value);
    if (meter) {
      meter.dataset.score = String(score);
      meter.toggleAttribute("data-active", input.value.length > 0);
    }
    if (label) label.textContent = input.value ? `Password strength: ${SCORE_LABELS[score]}` : base;
  });
}

function submitOnEnter(root, selector, submit) {
  root.querySelectorAll(selector).forEach((i) =>
    i.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); }));
}

function showNotice(root, title, body, action) {
  const form = root.querySelector(".auth-form");
  if (!form) return;
  form.innerHTML = String(html`
    <div class="auth-note">
      <h2>${title}</h2>
      <p class="auth-lede">${body}</p>
      ${action}
    </div>`);
}

const backToSignIn = html`<p class="auth-alt"><span class="link" data-nav="login">Back to sign in</span></p>`;

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------
export function loginView() {
  const online = configured();
  const html_ = authFrame(html`
    <h2>Sign in</h2>
    <p class="auth-lede">${online ? "Use your FixFlow account to continue." : "Offline demo: data stays in this browser."}</p>
    ${errorBox()}
    <div class="field" style="margin-bottom:14px">
      <label for="login-email">Email</label>
      <input class="input" id="login-email" type="email" autocomplete="username" value="${online ? "admin@fixflow.io" : ""}" />
    </div>
    <div class="field" style="margin-bottom:10px">
      <label for="login-pass">Password</label>
      <input class="input" type="password" id="login-pass" autocomplete="current-password" />
    </div>
    <p class="auth-aux"><span class="link" data-nav="forgot">Forgot password?</span></p>
    <button class="btn btn-primary btn-block" id="login-btn">Sign in</button>
    <p class="auth-alt">
      New here? <span class="link" data-nav="signup">Create an account</span> · <span class="link" data-nav="landing">Product tour</span>
    </p>`);
  return {
    html: html_,
    mount(root) {
      const btn = root.querySelector("#login-btn");
      const err = wireError(root);

      const submit = async () => {
        const email = root.querySelector("#login-email").value.trim();
        const password = root.querySelector("#login-pass").value;
        err.clear();
        if (!email || !password) return err.show("Enter your email and password.");

        const label = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Signing in…";
        try {
          const ad = await adapter();
          const res = await ad.signIn(email, password);
          if (!res.ok) { btn.disabled = false; btn.textContent = label; return err.show(friendlyAuthError(res.error, "Sign in failed.")); }
          store.session = res.session;
          window.location.hash = "#/dashboard";
          window.location.reload();
        } catch (e) {
          btn.disabled = false;
          btn.textContent = label;
          err.show(friendlyAuthError(e && e.message, "Sign in failed."));
        }
      };

      btn.addEventListener("click", submit);
      submitOnEnter(root, "#login-email,#login-pass", submit);
    },
  };
}

// ---------------------------------------------------------------------------
// Create account
// ---------------------------------------------------------------------------
export function signupView() {
  const online = configured();
  const html_ = authFrame(html`
    <h2>Create account</h2>
    <p class="auth-lede">${online ? "Set up a FixFlow account to continue." : "Offline demo: sign-up runs against a live backend."}</p>
    ${errorBox()}
    <div class="field" style="margin-bottom:14px">
      <label for="su-name">Full name</label>
      <input class="input" id="su-name" autocomplete="name" />
    </div>
    <div class="field" style="margin-bottom:14px">
      <label for="su-email">Work email</label>
      <input class="input" id="su-email" type="email" autocomplete="email" />
    </div>
    <div class="field" style="margin-bottom:14px">
      <label for="su-pass">Password</label>
      <input class="input" id="su-pass" type="password" autocomplete="new-password" />
      ${meterField()}
    </div>
    <div class="field" style="margin-bottom:18px">
      <label for="su-confirm">Confirm password</label>
      <input class="input" id="su-confirm" type="password" autocomplete="new-password" />
    </div>
    <button class="btn btn-primary btn-block" id="su-btn">Create account</button>
    <p class="auth-alt">Already have an account? <span class="link" data-nav="login">Sign in</span></p>`);
  return {
    html: html_,
    mount(root) {
      const btn = root.querySelector("#su-btn");
      const pass = root.querySelector("#su-pass");
      const err = wireError(root);
      wireMeter(root, pass);

      const submit = async () => {
        err.clear();
        const valid = validateSignup({
          name: root.querySelector("#su-name").value,
          email: root.querySelector("#su-email").value,
          password: pass.value,
          confirm: root.querySelector("#su-confirm").value,
        });
        if (!valid.ok) return err.show(valid.error);

        const label = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Creating account…";
        try {
          const ad = await adapter();
          const res = await ad.signUp(valid);
          if (!res.ok) { btn.disabled = false; btn.textContent = label; return err.show(friendlyAuthError(res.error, "Could not create the account.")); }
          if (res.pending) {
            showNotice(root, "Confirm your email",
              `We sent a confirmation link to ${res.email}. Open it to activate the account, then sign in.`, backToSignIn);
            return;
          }
          store.session = res.session;
          window.location.hash = "#/dashboard";
          window.location.reload();
        } catch (e) {
          btn.disabled = false;
          btn.textContent = label;
          err.show(friendlyAuthError(e && e.message, "Could not create the account."));
        }
      };

      btn.addEventListener("click", submit);
      submitOnEnter(root, "#su-name,#su-email,#su-pass,#su-confirm", submit);
    },
  };
}

// ---------------------------------------------------------------------------
// Forgot password — request a reset link
// ---------------------------------------------------------------------------
export function forgotView() {
  const online = configured();
  const html_ = authFrame(html`
    <h2>Reset password</h2>
    <p class="auth-lede">${online ? "Enter your email and we'll send a reset link." : "Offline demo: reset emails are sent by a live backend."}</p>
    ${errorBox()}
    <div class="field" style="margin-bottom:18px">
      <label for="fp-email">Email</label>
      <input class="input" id="fp-email" type="email" autocomplete="email" />
    </div>
    <button class="btn btn-primary btn-block" id="fp-btn">Send reset link</button>
    ${backToSignIn}`);
  return {
    html: html_,
    mount(root) {
      const btn = root.querySelector("#fp-btn");
      const err = wireError(root);

      const submit = async () => {
        err.clear();
        const valid = validateForgot({ email: root.querySelector("#fp-email").value });
        if (!valid.ok) return err.show(valid.error);

        const label = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Sending…";
        try {
          const ad = await adapter();
          const res = await ad.resetPassword(valid.email, redirectTarget());
          if (!res.ok) { btn.disabled = false; btn.textContent = label; return err.show(friendlyAuthError(res.error, "Could not send the reset link.")); }
          // Neutral wording on purpose: neither Supabase nor this UI reveals
          // whether an account exists for the address.
          showNotice(root, "Check your email",
            `If an account exists for ${valid.email}, a reset link is on its way. It expires in one hour.`, backToSignIn);
        } catch (e) {
          btn.disabled = false;
          btn.textContent = label;
          err.show(friendlyAuthError(e && e.message, "Could not send the reset link."));
        }
      };

      btn.addEventListener("click", submit);
      submitOnEnter(root, "#fp-email", submit);
    },
  };
}

// ---------------------------------------------------------------------------
// Reset password — choose a new one, reached from the emailed link
// ---------------------------------------------------------------------------
export function resetView() {
  const html_ = authFrame(html`
    <h2>Choose a new password</h2>
    <p class="auth-lede">You're signed in from the reset link. Pick a new password to finish.</p>
    ${errorBox()}
    <div class="field" style="margin-bottom:14px">
      <label for="rp-pass">New password</label>
      <input class="input" id="rp-pass" type="password" autocomplete="new-password" />
      ${meterField()}
    </div>
    <div class="field" style="margin-bottom:18px">
      <label for="rp-confirm">Confirm new password</label>
      <input class="input" id="rp-confirm" type="password" autocomplete="new-password" />
    </div>
    <button class="btn btn-primary btn-block" id="rp-btn">Update password</button>
    <p class="auth-alt"><span class="link" data-nav="forgot">Request a new link</span></p>`);
  return {
    html: html_,
    mount(root) {
      // The recovery token in the URL has already been read into the session by
      // supabase-js. Rewriting the URL only once that is true keeps a slow boot
      // from destroying the token before it is consumed.
      if (store.authed && typeof history !== "undefined" && typeof history.replaceState === "function") {
        try { history.replaceState(null, "", "#/reset-password"); } catch { /* non-fatal */ }
      }
      const btn = root.querySelector("#rp-btn");
      const pass = root.querySelector("#rp-pass");
      const err = wireError(root);
      wireMeter(root, pass);

      const submit = async () => {
        err.clear();
        const valid = validateReset({ password: pass.value, confirm: root.querySelector("#rp-confirm").value });
        if (!valid.ok) return err.show(valid.error);

        const label = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Updating…";
        try {
          const ad = await adapter();
          const res = await ad.updatePassword(pass.value);
          if (!res.ok) { btn.disabled = false; btn.textContent = label; return err.show(friendlyAuthError(res.error, "Could not update the password.")); }
          toast("Password updated", "You're signed in with your new password.", "success");
          window.location.hash = "#/dashboard";
          window.location.reload();
        } catch (e) {
          btn.disabled = false;
          btn.textContent = label;
          err.show(friendlyAuthError(e && e.message, "Could not update the password."));
        }
      };

      btn.addEventListener("click", submit);
      submitOnEnter(root, "#rp-pass,#rp-confirm", submit);
    },
  };
}
