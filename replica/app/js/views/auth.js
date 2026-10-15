import { store } from "../store.js";
import { esc, toast } from "../util.js";

export function loginView() {
  const html = `
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
             ["Reports & analytics", "Revenue, turnaround and margins"]].map(([t, d]) => `
            <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px">
              <div style="font-weight:600;font-size:13.5px">${esc(t)}</div>
              <div style="font-size:12px;opacity:.75;margin-top:4px">${esc(d)}</div>
            </div>`).join("")}
        </div>
      </div>
      <div style="opacity:.6;font-size:12px">© ${new Date().getFullYear()} FixFlow Repairs · Demo build</div>
    </div>
    <div style="display:grid;place-items:center;padding:40px;background:var(--bg)">
      <div style="width:100%;max-width:360px">
        <h2 style="font-size:22px;font-weight:700">Sign in</h2>
        <p class="muted" style="margin-top:4px;margin-bottom:24px;font-size:13.5px">Use the demo account to explore FixFlow.</p>
        <div class="field" style="margin-bottom:14px">
          <label>Email</label>
          <input class="input" id="login-email" value="admin@fixflow.io" />
        </div>
        <div class="field" style="margin-bottom:8px">
          <label>Password</label>
          <input class="input" type="password" id="login-pass" value="fixflow" />
        </div>
        <div class="row" style="justify-content:space-between;margin-bottom:20px">
          <label class="checkline"><input type="checkbox" checked /> Remember me</label>
          <span class="link small">Forgot password?</span>
        </div>
        <button class="btn btn-primary btn-block" id="login-btn">Sign in</button>
        <button class="btn btn-secondary btn-block" id="login-demo" style="margin-top:10px">Continue as demo admin</button>
        <p class="muted small" style="text-align:center;margin-top:20px">
          New here? <span class="link" data-nav="request-service">Request a service</span>
        </p>
      </div>
    </div>
  </div>`;
  return {
    html,
    mount(root) {
      const doLogin = () => {
        store.session = { user: "Admin User", email: "admin@fixflow.io", role: "admin", initials: "AU" };
        toast("Welcome back", "Signed in as Admin User", "success");
        window.location.hash = "#/dashboard";
        window.location.reload();
      };
      root.querySelector("#login-btn").addEventListener("click", doLogin);
      root.querySelector("#login-demo").addEventListener("click", doLogin);
    },
  };
}
