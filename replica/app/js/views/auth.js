import { store } from "../store.js";
import { supabaseAdapter } from "../session.js";
import { html } from "../markup.js";

function configured() {
  const c = (typeof window !== "undefined" && window.FIXFLOW_SUPABASE) || {};
  return Boolean(c.url && c.anonKey);
}

export function loginView() {
  const online = configured();
  const html_ = html`
  <div style="min-height:100vh;display:grid;grid-template-columns:1.1fr 1fr">
    <div style="background:linear-gradient(160deg,#1b2a4a,#2f5bea);color:#fff;padding:48px;display:flex;flex-direction:column;justify-content:space-between">
      <div class="row" style="gap:10px">
        <span class="brand-mark" style="background:rgba(255,255,255,.15)">F</span>
        <span style="font-weight:700;font-size:18px">FixFlow</span>
      </div>
      <div>
        <h1 style="font-size:34px;line-height:1.15;font-weight:700;letter-spacing:-.02em;max-width:480px">
          The streamlined way to run your repair shop.
        </h1>
        <p style="margin-top:16px;opacity:.85;max-width:440px;font-size:15px;line-height:1.6">
          Track repair jobs from intake to invoice, dispatch technicians, manage parts inventory,
          and keep customers informed — all from one dashboard.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:32px;max-width:460px">
          ${[["Jobs & status tracking", "Intake → diagnosis → repair → invoice"],
             ["Dispatch & scheduling", "Assign techs and manage the calendar"],
             ["Invoicing & payments", "Auto-generate invoices, record payments"],
             ["Reports & analytics", "Revenue, turnaround and margins"]].map(([t, d]) => html`
            <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px">
              <div style="font-weight:600;font-size:13.5px">${t}</div>
              <div style="font-size:12px;opacity:.75;margin-top:4px">${d}</div>
            </div>`)}
        </div>
      </div>
      <div style="opacity:.6;font-size:12px">© ${new Date().getFullYear()} FixFlow Repairs · Demo build</div>
    </div>
    <div style="display:grid;place-items:center;padding:40px;background:var(--bg)">
      <div style="width:100%;max-width:360px">
        <h2 style="font-size:22px;font-weight:700">Sign in</h2>
        <p class="muted" style="margin-top:4px;margin-bottom:18px;font-size:13.5px">
          ${online ? "Sign in with your FixFlow account." : "Offline demo — data stays in this browser only."}
        </p>
        <div id="login-error" class="field" style="display:none;margin-bottom:12px">
          <div class="hint" style="color:var(--danger)"></div>
        </div>
        <div class="field" style="margin-bottom:14px">
          <label>Email</label>
          <input class="input" id="login-email" type="email" autocomplete="username" value="${online ? "admin@fixflow.io" : ""}" />
        </div>
        <div class="field" style="margin-bottom:18px">
          <label>Password</label>
          <input class="input" type="password" id="login-pass" autocomplete="current-password" />
        </div>
        <button class="btn btn-primary btn-block" id="login-btn">Sign in</button>
        <p class="muted small" style="text-align:center;margin-top:20px">
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
