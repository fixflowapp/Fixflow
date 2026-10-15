import { store } from "../store.js";
import { supabaseAdapter } from "../session.js";
import { html } from "../markup.js";

function configured() {
  const c = (typeof window !== "undefined" && window.FIXFLOW_SUPABASE) || {};
  return Boolean(c.url && c.anonKey);
}

export function loginView() {
  const online = configured();
  const caps = [
    ["Job pipeline", "Intake, diagnosis, repair and hand-off in one queue"],
    ["Dispatch", "Assign technicians and run the service calendar"],
    ["Billing", "Generate invoices and reconcile payments"],
    ["Reporting", "Revenue, turnaround time and margin"],
  ];
  const html_ = html`
  <div class="auth">
    <div class="auth-panel">
      <div class="auth-brand">
        <span class="brand-mark">F</span>
        <span class="brand-name">FixFlow</span>
      </div>
      <div>
        <h1 class="auth-headline">Every repair job, from intake to invoice.</h1>
        <p class="auth-sub">
          Track work orders, dispatch technicians, manage parts inventory and keep customers
          informed — from a single operations desk.
        </p>
        <div class="auth-caps">
          ${caps.map(([t, d], i) => html`<div class="auth-cap">
            <em>${String(i + 1).padStart(2, "0")}</em>
            <b>${t}</b>
            <span>${d}</span>
          </div>`)}
        </div>
      </div>
      <div class="auth-foot">© ${new Date().getFullYear()} FixFlow Repairs — demonstration build</div>
    </div>
    <div class="auth-form-side">
      <div class="auth-form">
        <h2>Sign in</h2>
        <p class="auth-lede">${online ? "Use your FixFlow account to continue." : "Offline demo — data stays in this browser."}</p>
        <div id="login-error" class="field" style="display:none;margin-bottom:14px">
          <div class="hint" style="color:var(--danger)"></div>
        </div>
        <div class="field" style="margin-bottom:14px">
          <label for="login-email">Email</label>
          <input class="input" id="login-email" type="email" autocomplete="username" value="${online ? "admin@fixflow.io" : ""}" />
        </div>
        <div class="field" style="margin-bottom:18px">
          <label for="login-pass">Password</label>
          <input class="input" type="password" id="login-pass" autocomplete="current-password" />
        </div>
        <button class="btn btn-primary btn-block" id="login-btn">Sign in</button>
        <p class="auth-alt">
          New here? <span class="link" data-nav="request-service">Request a service</span>
        </p>
      </div>
    </div>
  </div>`;
  return {
    html: html_,
    mount(root) {
      const btn = root.querySelector("#login-btn");
      const errBox = root.querySelector("#login-error");
      const errText = errBox.querySelector(".hint");
      const showError = (m) => { errText.textContent = m; errBox.style.display = "block"; };

      const submit = async () => {
        const email = root.querySelector("#login-email").value.trim();
        const password = root.querySelector("#login-pass").value;
        errBox.style.display = "none";
        if (!email || !password) return showError("Enter your email and password.");

        const label = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Signing in…";
        try {
          const mod = await import("../supabase.js");
          const res = await supabaseAdapter(mod).signIn(email, password);
          if (!res.ok) { btn.disabled = false; btn.textContent = label; return showError(res.error || "Sign in failed."); }
          store.session = res.session;
          window.location.hash = "#/dashboard";
          window.location.reload();
        } catch (e) {
          btn.disabled = false;
          btn.textContent = label;
          showError(e.message || "Sign in failed.");
        }
      };

      btn.addEventListener("click", submit);
      root.querySelectorAll("#login-email,#login-pass").forEach((i) => i.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); }));
    },
  };
}
