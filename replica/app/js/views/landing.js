import { store } from "../store.js";
import { html, raw } from "../markup.js";
import { iconSvg } from "../util.js";
import { navigate } from "../router.js";

const TOTAL_DURATION = 150; // 2:30 total duration in seconds

const CHAPTERS = [
  { start: 0, title: "1. Intake & Optical Scan", badge: "Chapter 1: Optical Intake", label: "0:00" },
  { start: 35, title: "2. Diagnostics & Telemetry", badge: "Chapter 2: Logic Board Telemetry", label: "0:35" },
  { start: 70, title: "3. Fleet Dispatch", badge: "Chapter 3: Smart Tech Dispatch", label: "1:10" },
  { start: 105, title: "4. Settlement & GDPR", badge: "Chapter 4: Instant Settlement & GDPR", label: "1:45" },
];

const WORKFLOW_STEPS = [
  {
    step: "1. Intake & Check-in",
    pct: 20,
    title: "Initial Check-in & Intake Inspection",
    desc: "Customer brings device to front desk. High-res intake photos captured, serial validated against warranty database, and preliminary intake diagnostic logged.",
    cost: "$45.00 (Diag fee)",
    badge: "Normal",
    badgeClass: "badge-neutral",
    log: "10:14:02 — FrontDesk_Rob recorded intake ticket & condition photos",
  },
  {
    step: "2. Diagnostics & Triage",
    pct: 40,
    title: "Hardware Benchmark & Component Isolation",
    desc: "Multimeter test reveals ground short on secondary power rail. Replacement OEM USB-C daughterboard requisitioned from Inventory Rack 04-A.",
    cost: "$125.00 (Parts estimated)",
    badge: "High",
    badgeClass: "badge-waiting",
    log: "10:28:44 — Diagnostic checklist confirmed by LeadTech_Sarah",
  },
  {
    step: "3. Bench Repair Active",
    pct: 60,
    title: "Micro-soldering & Sub-assembly Replacement",
    desc: "Bench technician performs precision trace repair and installs OEM module. Liquid Retina test display hooked up for thermal and power stability run.",
    cost: "$225.00 (Parts + Labor)",
    badge: "In Progress",
    badgeClass: "badge-progress",
    log: "10:45:19 — Parts allocated from inventory: MB-16-USB",
  },
  {
    step: "4. Quality QA Testing",
    pct: 80,
    title: "Automated 14-Point Hardware QA Test",
    desc: "Full automated sensor suite pass. Display refresh verified at 120Hz ProMotion, battery health tested at 96%, chassis ultrasonic cleaned and sanitized.",
    cost: "$225.00 (Parts + Labor)",
    badge: "QA Passed",
    badgeClass: "badge-active",
    log: "11:12:05 — 14 hardware test suites passed (0 errors)",
  },
  {
    step: "5. Invoiced & Ready",
    pct: 100,
    title: "Final Invoice Dispatched & Ready for Pickup",
    desc: "Work order marked completed. Itemized invoice INV-2026-089 generated with automatic payment link sent via SMS and Email. Device staged in Locker 03.",
    cost: "$225.00 (Invoiced / Ready)",
    badge: "Ready for Pickup",
    badgeClass: "badge-active",
    log: "11:20:00 — Invoice INV-2026-089 sent to client via SMS & email",
  },
];

const TRACKER_DATA = {
  "JOB-1042": {
    device: "Apple MacBook Air 13\" (M1)",
    customer: "Marcus Reed",
    tech: "Sarah Vance",
    status: "Repaired — Ready for Pickup",
    badgeCls: "badge-active",
    eta: "Ready today at Locker #4",
    milestones: ["Intake Inspection Completed", "Keyboard Assembly Replaced", "Logic Board Passed QA"],
  },
  "JOB-1088": {
    device: "MacBook Pro 16\" (M2 Max)",
    customer: "Acme Studio Ltd",
    tech: "Sarah Vance",
    status: "In Progress (Micro-soldering)",
    badgeCls: "badge-progress",
    eta: "Estimated: Tomorrow, 2:00 PM",
    milestones: ["Diagnostic Complete", "Parts Allocated", "Bench soldering in progress"],
  },
  "JOB-2015": {
    device: "Dell XPS 15 9520",
    customer: "Elena Rostova",
    tech: "Alex Thorne",
    status: "Waiting for Parts Delivery",
    badgeCls: "badge-waiting",
    eta: "Awaiting OEM Battery (Tracking: 1Z9999)",
    milestones: ["Intake Recorded", "Thermal Battery Swell Detected"],
  },
};

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

export const landing = {
  title: "FixFlow — Repair Management System",
  crumb: () => ["FixFlow"],
  render() {
    const s = store.settings;
    const year = new Date().getFullYear();

    return html`
    <div class="ff-landing">
      <!-- Top Announcement -->
      <aside aria-label="Announcement" class="ff-l-announcement">
        <span class="ff-l-badge">New</span>
        <span>FixFlow 2.0 is live: Real-time repair telemetry, GDPR compliance tools & smart dispatch.</span>
        <a href="#ff-video" class="ff-l-link">Watch 2-min product film &rarr;</a>
      </aside>

      <!-- Navigation Header -->
      <header class="ff-l-nav">
        <div class="ff-l-nav-inner">
          <div class="ff-l-brand" data-nav="landing">
            <span class="brand-mark">F</span>
            <span class="brand-name">${s.companyName || "FixFlow"}</span>
          </div>

          <nav class="ff-l-nav-links">
            <a href="#ff-video">Product Film</a>
            <a href="#ff-features">Features</a>
            <a href="#ff-sim">Live Simulation</a>
            <a href="#ff-tracker">Track Repair</a>
            <a href="#ff-pricing">Pricing</a>
            <a href="#ff-faq">FAQ</a>
          </nav>

          <div class="ff-l-nav-actions">
            <button class="btn btn-secondary btn-sm" id="btn-quick-lookup">${iconSvg("search", 13)} Track Job</button>
            <button class="btn btn-secondary btn-sm" data-nav="login">Sign in</button>
            <button class="btn btn-primary btn-sm" id="btn-hero-launch-top">${iconSvg("sparkles", 13)} Launch App</button>
          </div>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="ff-l-hero">
        <div class="ff-l-hero-pill">
          <span class="ff-l-pulse"></span>
          <span>Engineered for repair shops, electronics, & field service teams</span>
        </div>

        <h1 class="ff-l-hero-title">
          Every repair job.<br/>
          <span class="ff-l-accent-text">From intake to invoice.</span>
        </h1>

        <p class="ff-l-hero-sub">
          Stop juggling disconnected spreadsheets, paper tags, and lost work orders. FixFlow unifies ticket intake, technician dispatch, live parts inventory, and 1-click billing in a single command desk.
        </p>

        <div class="ff-l-hero-cta">
          <button class="btn btn-primary btn-lg" id="btn-hero-watch-film">
            ${iconSvg("eye", 16)} Watch Product Film (2m)
          </button>
          <button class="btn btn-secondary btn-lg" id="btn-hero-demo">
            ${iconSvg("activity", 16)} Test Drive Workstation
          </button>
          <button class="btn btn-secondary btn-lg" data-nav="request-service">
            ${iconSvg("clipboard", 16)} Customer Intake Form
          </button>
        </div>

        <div class="ff-l-trust-row">
          <span>${iconSvg("check", 13)} Instant Cloud Sync</span>
          <span>${iconSvg("check", 13)} Offline Field Support</span>
          <span>${iconSvg("check", 13)} GDPR Privacy Vault</span>
          <span>${iconSvg("check", 13)} Zero Setup Required</span>
        </div>
      </section>

      <!-- Cinematic Product Film Section -->
      <section id="ff-video" class="ff-l-video-sec">
        <div class="ff-l-video-ambient-glow"></div>
        <div class="ff-l-video-wrap">
          <div class="ff-l-section-head" style="margin-bottom:28px">
            <span class="ff-l-tag">4K Cinematic Product Film</span>
            <h2>See FixFlow in motion.</h2>
            <p>An interactive high-definition walkthrough of the next-generation repair operations workflow.</p>
          </div>

          <!-- Video Player Container -->
          <div class="ff-l-player-box" id="ff-player-container">
            <div class="ff-l-player-topbar">
              <div class="row" style="gap:8px">
                <span class="ff-l-live-rec-dot"></span>
                <span class="mono-val" style="font-size:11px;font-weight:600;letter-spacing:.05em">FIXFLOW TELEMETRY FILM · 4K UHD 60FPS</span>
              </div>
              <div class="row" style="gap:10px">
                <span class="badge badge-active" id="video-chapter-pill">Chapter 1: Optical Intake</span>
                <span class="badge badge-neutral" style="font-size:10px;font-weight:600">PRO RES</span>
              </div>
            </div>

            <!-- Screen: Canvas + Poster Overlay -->
            <div class="ff-l-player-screen" id="player-screen">
              <canvas id="film-canvas" width="1024" height="576"></canvas>
              
              <!-- Poster Overlay (visible before first play or when paused) -->
              <div class="ff-l-poster-overlay" id="poster-overlay">
                <div class="ff-l-poster-gradient"></div>
                <div class="ff-l-play-trigger" id="btn-big-play">
                  <div class="ff-l-play-ripple"></div>
                  <div class="ff-l-play-circle">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><polygon points="8,5 19,12 8,19"/></svg>
                  </div>
                  <div class="ff-l-play-label">
                    <span class="title">Play Cinematic Walkthrough</span>
                    <span class="meta">02:30 · 4K 60FPS Telemetry · Audio Soundscape</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Player Controls Bottom Bar -->
            <div class="ff-l-player-controls">
              <!-- Scrubber Bar -->
              <div class="ff-l-scrubber" id="video-scrubber" title="Click or drag to seek">
                <div class="ff-l-scrubber-track">
                  <div class="ff-l-scrubber-progress" id="scrubber-progress" style="width:0%"></div>
                  <!-- Chapter markers -->
                  <div class="ff-l-marker" style="left:0%" title="0:00 Intake & Optical Scan"></div>
                  <div class="ff-l-marker" style="left:23.3%" title="0:35 Diagnostics & Telemetry"></div>
                  <div class="ff-l-marker" style="left:46.6%" title="1:10 Fleet Dispatch"></div>
                  <div class="ff-l-marker" style="left:70%" title="1:45 Settlement & GDPR"></div>
                </div>
              </div>

              <!-- Controls Toolbar -->
              <div class="ff-l-ctrl-row">
                <div class="row" style="gap:12px">
                  <button class="btn btn-secondary btn-sm" id="btn-play-pause">
                    <span id="play-pause-icon">${iconSvg("sparkles", 13)}</span>
                    <span id="play-pause-label">Play</span>
                  </button>
                  <span class="mono-val" id="timecode-display" style="font-size:12px;color:var(--text-soft)">00:00 / 02:30</span>
                </div>

                <div class="row" style="gap:10px">
                  <!-- Audio visualizer / Sound toggle -->
                  <button class="btn btn-secondary btn-sm" id="btn-sound-toggle" title="Toggle audio soundscape">
                    <span class="ff-l-sound-wave" id="sound-wave">
                      <i></i><i></i><i></i><i></i>
                    </span>
                    <span id="sound-label">Audio On</span>
                  </button>

                  <!-- Speed switcher -->
                  <button class="btn btn-secondary btn-sm" id="btn-speed-toggle" title="Playback speed">
                    <span id="speed-label">1.0x</span>
                  </button>

                  <!-- Fullscreen / Theater -->
                  <button class="btn btn-secondary btn-sm" id="btn-theater-toggle" title="Toggle theater view">
                    ${iconSvg("eye", 13)} Theater
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Clickable Video Chapters -->
          <div class="ff-l-chapters-grid">
            <div class="ff-l-chapter-card active" data-seek="0">
              <div class="ff-l-ch-time">0:00 — Phase 1</div>
              <h4>Intake & Optical Scan</h4>
              <p>Instant QR scanning, serial validation against OEM databases, and automated condition photo logging.</p>
            </div>
            <div class="ff-l-chapter-card" data-seek="35">
              <div class="ff-l-ch-time">0:35 — Phase 2</div>
              <h4>Diagnostic Telemetry</h4>
              <p>Real-time logic board signal analysis, oscilloscope waveform telemetry, and parts requisitioning.</p>
            </div>
            <div class="ff-l-chapter-card" data-seek="70">
              <div class="ff-l-ch-time">1:10 — Phase 3</div>
              <h4>Technician Dispatch</h4>
              <p>Automated workload balancing, certification routing, and dynamic mobile queue scheduling.</p>
            </div>
            <div class="ff-l-chapter-card" data-seek="105">
              <div class="ff-l-ch-time">1:45 — Phase 4</div>
              <h4>Settlement & GDPR Vault</h4>
              <p>1-click invoice delivery via SMS magic link and automatic GDPR privacy data isolation.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Workstation Simulator Container -->
      <section class="ff-l-section" style="padding-top:20px;padding-bottom:60px">
        <div id="ff-sim" class="ff-l-sim-card">
          <div class="ff-l-sim-topbar">
            <div class="ff-l-window-dots">
              <span class="dot-red"></span>
              <span class="dot-yellow"></span>
              <span class="dot-green"></span>
              <span class="ff-l-sim-url">fixflow://operations/workstation/JOB-1088</span>
            </div>
            <div class="ff-l-sim-controls">
              <span class="badge badge-active">${iconSvg("refresh", 11)} Real-time Sync</span>
              <button class="btn btn-primary btn-sm" id="btn-advance-step">Advance Step &rarr;</button>
            </div>
          </div>

          <div class="ff-l-sim-body">
            <!-- Left 8 cols: Workflow Stepper -->
            <div class="ff-l-sim-left">
              <div class="ff-l-sim-jobhead">
                <div>
                  <div class="row" style="gap:8px">
                    <span class="mono-val" style="font-weight:700;color:var(--accent)">JOB-1088</span>
                    <span class="badge badge-danger" id="sim-badge">Urgent Priority</span>
                    <span class="cell-sub">Intake 34m ago</span>
                  </div>
                  <h3 style="margin-top:4px;font-size:17px;font-weight:700">MacBook Pro 16" (M2 Max) — Logic Board Diagnostic & Display Repair</h3>
                  <div class="cell-sub" style="margin-top:2px">Client: Acme Studio Ltd (Sarah Jenkins) · Device S/N: C02G4190MD6R</div>
                </div>
                <div style="text-align:right">
                  <div class="cell-sub">Current Cost</div>
                  <div class="mono-val" id="sim-cost" style="font-size:18px;font-weight:700;color:var(--text)">$225.00</div>
                </div>
              </div>

              <!-- Stepper Progress Bar -->
              <div class="ff-l-stepper-box">
                <div class="row" style="justify-content:space-between;margin-bottom:6px">
                  <span class="cell-sub" style="font-weight:600">Repair Workflow Phase</span>
                  <span class="mono-val" id="sim-pct" style="font-weight:700;color:var(--accent);font-size:12px">60% Completed</span>
                </div>
                <div class="ff-l-progress-track">
                  <div class="ff-l-progress-fill" id="sim-progress-bar" style="width:60%"></div>
                </div>

                <div class="ff-l-step-tabs" id="sim-step-tabs">
                  ${WORKFLOW_STEPS.map((w, idx) => html`
                    <button class="ff-l-step-tab ${idx <= 2 ? "active" : ""}" data-step="${idx}">
                      ${w.step}
                    </button>
                  `)}
                </div>
              </div>

              <!-- Dynamic Step Content -->
              <div class="ff-l-step-desc-box" id="sim-step-desc">
                <!-- Injected via JS -->
              </div>

              <!-- Audit stream -->
              <div style="margin-top:16px">
                <div class="row" style="justify-content:space-between;margin-bottom:6px">
                  <span style="font-size:12px;font-weight:600">Live Audit & Telemetry Log</span>
                  <span class="cell-sub" style="font-size:11px">Synced with Supabase engine</span>
                </div>
                <div class="ff-l-log-stream" id="sim-logs">
                  <!-- Injected via JS -->
                </div>
              </div>
            </div>

            <!-- Right 4 cols: Technician & Actions -->
            <div class="ff-l-sim-right">
              <div class="card" style="margin-bottom:14px;box-shadow:none">
                <div class="card-head"><h3>Assigned Specialist</h3><span class="badge badge-active">On Shift</span></div>
                <div class="card-body row" style="gap:12px">
                  <div class="avatar" style="width:38px;height:38px;background:var(--accent);color:#fff;font-weight:700">SV</div>
                  <div>
                    <div style="font-weight:700;font-size:13.5px">Sarah Vance</div>
                    <div class="cell-sub">Senior Hardware Specialist · Bench 03</div>
                  </div>
                </div>
              </div>

              <div class="card" style="margin-bottom:14px;box-shadow:none">
                <div class="card-head"><h3>Allocated Inventory</h3><span class="cell-sub">2 items</span></div>
                <div class="card-body" style="padding:10px 14px">
                  <div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
                    <div><div style="font-weight:600;font-size:12.5px">OEM USB-C Daughterboard</div><div class="cell-sub">SKU: MB-16-USB</div></div>
                    <span class="mono-val" style="font-weight:600">$45.00</span>
                  </div>
                  <div class="row" style="justify-content:space-between;padding:6px 0">
                    <div><div style="font-weight:600;font-size:12.5px">Micro-soldering Labor (1.5h)</div><div class="cell-sub">Standard Bench Rate</div></div>
                    <span class="mono-val" style="font-weight:600">$180.00</span>
                  </div>
                </div>
              </div>

              <div style="display:grid;gap:8px">
                <button class="btn btn-primary btn-block" id="btn-sim-invoice">
                  ${iconSvg("dollar", 13)} Generate Customer Invoice
                </button>
                <button class="btn btn-secondary btn-block" data-nav="gdpr-admin">
                  ${iconSvg("lock", 13)} View GDPR Compliance Vault
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Metrics Section -->
      <section class="ff-l-metrics">
        <div class="ff-l-metrics-grid">
          <div>
            <div class="ff-l-metric-val">99.4%</div>
            <div class="ff-l-metric-lbl">On-Time SLA Delivery</div>
          </div>
          <div>
            <div class="ff-l-metric-val accent">3.8x</div>
            <div class="ff-l-metric-lbl">Faster Invoicing Turnaround</div>
          </div>
          <div>
            <div class="ff-l-metric-val">52,000+</div>
            <div class="ff-l-metric-lbl">Repairs Processed</div>
          </div>
          <div>
            <div class="ff-l-metric-val accent">&lt; 12m</div>
            <div class="ff-l-metric-lbl">Average Dispatch Time</div>
          </div>
        </div>
      </section>

      <!-- Bento Grid Section -->
      <section id="ff-features" class="ff-l-section">
        <div class="ff-l-section-head">
          <span class="ff-l-tag">Engineered for Operations</span>
          <h2>Everything required to run a high-volume repair business.</h2>
          <p>Replaces disconnected point tools with a single, synchronized platform.</p>
        </div>

        <div class="ff-l-bento-grid">
          <!-- Bento 1: Dispatch (Span 2) -->
          <div class="ff-l-bento-card span-2">
            <div class="ff-l-bento-ico">${iconSvg("calendar", 20)}</div>
            <h3>Smart Technician Dispatch & Live Scheduling</h3>
            <p>Assign incoming jobs to available technicians based on hardware certifications, workload queue, and service territory. Keep field techs in sync with mobile work orders.</p>
            <div class="row" style="margin-top:16px;gap:10px">
              <div class="ff-l-mini-stat">
                <span class="cell-sub">Dave Miller</span>
                <span class="badge badge-active">Available (2 jobs)</span>
              </div>
              <div class="ff-l-mini-stat">
                <span class="cell-sub">Sarah Vance</span>
                <span class="badge badge-waiting">Bench Full (4 jobs)</span>
              </div>
              <div class="ff-l-mini-stat">
                <span class="cell-sub">Alex Thorne</span>
                <span class="badge badge-progress">On Route (3 jobs)</span>
              </div>
            </div>
          </div>

          <!-- Bento 2: Inventory -->
          <div class="ff-l-bento-card">
            <div class="ff-l-bento-ico">${iconSvg("box", 20)}</div>
            <h3>Parts & Stock Alerts</h3>
            <p>Automatically deduct replacement screens, batteries, and sensors. Receive alerts when parts fall below reorder thresholds.</p>
            <div class="ff-l-alert-pill" style="margin-top:16px">
              <div>
                <div style="font-weight:600;font-size:12.5px">iPhone 14 OLED Displays</div>
                <div class="cell-sub">SKU: SCR-IP14-OLED</div>
              </div>
              <span class="badge badge-danger">2 left in stock</span>
            </div>
          </div>

          <!-- Bento 3: Photos -->
          <div class="ff-l-bento-card">
            <div class="ff-l-bento-ico">${iconSvg("camera", 20)}</div>
            <h3>Before & After Photo Proof</h3>
            <p>Capture condition photos at intake and repair completion to prevent false claims and build customer trust.</p>
            <div class="row" style="margin-top:16px;gap:10px">
              <div class="ff-l-mini-stat" style="flex:1;text-align:center">
                <span class="badge badge-danger">Intake Condition</span>
                <div class="cell-sub" style="margin-top:4px">Cracked Digitizer</div>
              </div>
              <div class="ff-l-mini-stat" style="flex:1;text-align:center">
                <span class="badge badge-active">Final Inspection</span>
                <div class="cell-sub" style="margin-top:4px">OEM Refurbished</div>
              </div>
            </div>
          </div>

          <!-- Bento 4: Invoicing (Span 2) -->
          <div class="ff-l-bento-card span-2">
            <div class="ff-l-bento-ico">${iconSvg("dollar", 20)}</div>
            <h3>1-Click Invoicing & Real-time Job Costing</h3>
            <p>Convert completed repair tickets directly into itemized invoices with parts, labor hours, and applicable taxes. Track real gross margin per repair job.</p>
            <div class="row" style="margin-top:16px;justify-content:space-between;border-top:1px solid var(--border);padding-top:12px">
              <div class="row" style="gap:20px">
                <div><span class="cell-sub">Parts Cost:</span> <b>$45.00</b></div>
                <div><span class="cell-sub">Labor Billed:</span> <b>$180.00</b></div>
                <div><span class="cell-sub">Gross Margin:</span> <span class="badge badge-active">76.4% Margin</span></div>
              </div>
              <span class="badge badge-neutral">Auto-reconciliation active</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Customer Tracker Test Drive -->
      <section id="ff-tracker" class="ff-l-tracker-sec">
        <div class="ff-l-section-head">
          <span class="ff-l-tag">Customer Experience</span>
          <h2>Give customers 24/7 repair visibility.</h2>
          <p>Try searching a job number below to see what your clients see when checking repair progress.</p>
        </div>

        <div class="ff-l-tracker-box">
          <div class="ff-l-tracker-input-row">
            <input class="input" id="tracker-input" type="text" value="JOB-1042" placeholder="Try JOB-1042, JOB-1088, or JOB-2015" />
            <button class="btn btn-primary" id="btn-track-submit">Track Status</button>
          </div>

          <div class="card" id="tracker-result-card" style="box-shadow:none">
            <!-- Injected via JS -->
          </div>
        </div>
      </section>

      <!-- Pricing Matrix -->
      <section id="ff-pricing" class="ff-l-section">
        <div class="ff-l-section-head">
          <span class="ff-l-tag">Transparent Pricing</span>
          <h2>Simple plans that scale with your repair volume.</h2>
          <p>No hidden fees. Switch or cancel whenever you need.</p>
        </div>

        <div class="ff-l-pricing-grid">
          <!-- Solo -->
          <div class="card ff-l-price-card">
            <div class="card-body">
              <h3>Solo Technician</h3>
              <p class="cell-sub">For independent repair specialists & single-bench shops.</p>
              <div class="ff-l-price-val"><span class="amount">$29</span><span class="period">/ month</span></div>
              <div class="divider"></div>
              <ul class="ff-l-checklist">
                <li>${iconSvg("check", 13)} Up to 100 active jobs / month</li>
                <li>${iconSvg("check", 13)} Customer SMS & email status links</li>
                <li>${iconSvg("check", 13)} Inventory parts tracking</li>
                <li>${iconSvg("check", 13)} PDF invoice generation</li>
              </ul>
            </div>
            <div class="card-foot">
              <button class="btn btn-secondary btn-block" data-nav="signup">Get Started</button>
            </div>
          </div>

          <!-- Pro -->
          <div class="card ff-l-price-card featured">
            <div class="ff-l-featured-pill">Most Popular</div>
            <div class="card-body">
              <h3>Pro Operations</h3>
              <p class="cell-sub">For growing repair businesses with multi-technician teams.</p>
              <div class="ff-l-price-val"><span class="amount">$79</span><span class="period">/ month</span></div>
              <div class="divider"></div>
              <ul class="ff-l-checklist">
                <li>${iconSvg("check", 13)} Unlimited active repair jobs</li>
                <li>${iconSvg("check", 13)} Up to 10 technician seats</li>
                <li>${iconSvg("check", 13)} Live technician dispatch calendar</li>
                <li>${iconSvg("check", 13)} Automatic invoice reminders</li>
                <li>${iconSvg("check", 13)} Self-service customer status portal</li>
                <li>${iconSvg("check", 13)} Real-time job costing profitability</li>
              </ul>
            </div>
            <div class="card-foot">
              <button class="btn btn-primary btn-block" data-nav="signup">Start 14-Day Free Trial</button>
            </div>
          </div>

          <!-- Enterprise -->
          <div class="card ff-l-price-card">
            <div class="card-body">
              <h3>Fleet & Enterprise</h3>
              <p class="cell-sub">For multi-location service providers & enterprise warranty.</p>
              <div class="ff-l-price-val"><span class="amount">$189</span><span class="period">/ month</span></div>
              <div class="divider"></div>
              <ul class="ff-l-checklist">
                <li>${iconSvg("check", 13)} Unlimited technicians & shops</li>
                <li>${iconSvg("check", 13)} GDPR Admin & privacy data vault</li>
                <li>${iconSvg("check", 13)} Maintenance contracts & SLA rules</li>
                <li>${iconSvg("check", 13)} Direct Supabase cloud database sync</li>
                <li>${iconSvg("check", 13)} Dedicated support SLA</li>
              </ul>
            </div>
            <div class="card-foot">
              <button class="btn btn-secondary btn-block" data-nav="request-service">Contact Operations</button>
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ Section -->
      <section id="ff-faq" class="ff-l-section" style="max-width:800px">
        <div class="ff-l-section-head">
          <span class="ff-l-tag">Got Questions?</span>
          <h2>Frequently Asked Questions</h2>
        </div>

        <div class="ff-l-faq-list">
          <div class="ff-l-faq-item" data-faq="1">
            <div class="ff-l-faq-q">
              <span>How fast can our repair shop onboard onto FixFlow?</span>
              <span class="ff-l-faq-arrow">${iconSvg("chevronDown", 14)}</span>
            </div>
            <div class="ff-l-faq-a">
              You can start processing work orders in under 5 minutes. FixFlow comes pre-loaded with standard repair workflows, technician roles, and sample data. You can also bulk import your existing customers and inventory using our CSV Data Import module.
            </div>
          </div>

          <div class="ff-l-faq-item" data-faq="2">
            <div class="ff-l-faq-q">
              <span>Can customers check their repair status without creating an account?</span>
              <span class="ff-l-faq-arrow">${iconSvg("chevronDown", 14)}</span>
            </div>
            <div class="ff-l-faq-a">
              Yes! FixFlow provides a dedicated Customer Status Portal (<code>#/customer-portal</code>). Clients simply enter their Job ID and contact information to view milestones, technician diagnostic notes, and photo proof without account friction.
            </div>
          </div>

          <div class="ff-l-faq-item" data-faq="3">
            <div class="ff-l-faq-q">
              <span>How does FixFlow handle GDPR data privacy and deletion requests?</span>
              <span class="ff-l-faq-arrow">${iconSvg("chevronDown", 14)}</span>
            </div>
            <div class="ff-l-faq-a">
              Our built-in GDPR Admin module (<code>#/gdpr-admin</code>) lets administrators export full JSON dossiers of any customer's personal data or process 1-click anonymization requests while cleanly preserving financial records for accounting and tax compliance.
            </div>
          </div>

          <div class="ff-l-faq-item" data-faq="4">
            <div class="ff-l-faq-q">
              <span>Does FixFlow work offline in field service vehicles?</span>
              <span class="ff-l-faq-arrow">${iconSvg("chevronDown", 14)}</span>
            </div>
            <div class="ff-l-faq-a">
              FixFlow features a hybrid offline-first local persistence layer. When technicians lose cellular signal in the field, they can continue recording repair notes, parts usage, and photos locally. As soon as connectivity returns, changes automatically re-sync with Supabase.
            </div>
          </div>
        </div>
      </section>

      <!-- Closing Call To Action -->
      <section class="ff-l-closing">
        <div class="ff-l-closing-card">
          <h2>Take full control of your repair queue today.</h2>
          <p>Join repair businesses delivering faster turnaround, higher customer ratings, and maximized profit margins.</p>
          <div class="row" style="justify-content:center;gap:12px;margin-top:18px">
            <button class="btn btn-primary btn-lg" id="btn-hero-launch-bot">
              ${iconSvg("sparkles", 15)} Launch FixFlow Dashboard
            </button>
            <button class="btn btn-secondary btn-lg" data-nav="login">
              Sign In to Existing Account
            </button>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="ff-l-footer">
        <div class="ff-l-footer-inner">
          <div class="row" style="gap:10px">
            <span class="brand-mark">F</span>
            <span style="font-weight:600">${s.companyName || "FixFlow Repairs"}</span>
            <span class="cell-sub">© ${year}. All rights reserved.</span>
          </div>
          <div class="row" style="gap:16px">
            <span class="link" data-nav="customer-portal">Customer Portal</span>
            <span class="link" data-nav="request-service">Intake Form</span>
            <span class="link" data-nav="gdpr-admin">GDPR Privacy</span>
            <span class="link" data-nav="login">Staff Login</span>
          </div>
        </div>
      </footer>
    </div>`;
  },

  mount(root) {
    // -----------------------------------------------------------------------
    // Cinematic Canvas Video Engine
    // -----------------------------------------------------------------------
    const canvas = root.querySelector("#film-canvas");
    const ctx = canvas ? canvas.getContext("2d") : null;
    const posterOverlay = root.querySelector("#poster-overlay");
    const playPauseBtn = root.querySelector("#btn-play-pause");
    const playPauseIcon = root.querySelector("#play-pause-icon");
    const playPauseLabel = root.querySelector("#play-pause-label");
    const timecodeDisplay = root.querySelector("#timecode-display");
    const scrubberProgress = root.querySelector("#scrubber-progress");
    const scrubber = root.querySelector("#video-scrubber");
    const chapterPill = root.querySelector("#video-chapter-pill");
    const soundToggle = root.querySelector("#btn-sound-toggle");
    const soundWave = root.querySelector("#sound-wave");
    const soundLabel = root.querySelector("#sound-label");
    const speedToggle = root.querySelector("#btn-speed-toggle");
    const speedLabel = root.querySelector("#speed-label");
    const theaterToggle = root.querySelector("#btn-theater-toggle");
    const playerContainer = root.querySelector("#ff-player-container");

    let isPlaying = false;
    let currentTime = 0;
    let playbackSpeed = 1.0;
    let isSoundOn = true;
    let lastTimestamp = performance.now();
    let animFrameId = null;

    const speeds = [1.0, 1.5, 2.0];
    let speedIdx = 0;

    const updateControlsUI = () => {
      if (timecodeDisplay) {
        timecodeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(TOTAL_DURATION)}`;
      }
      if (scrubberProgress) {
        const pct = (currentTime / TOTAL_DURATION) * 100;
        scrubberProgress.style.width = `${pct}%`;
      }
      // Highlight active chapter
      let activeCh = CHAPTERS[0];
      for (const ch of CHAPTERS) {
        if (currentTime >= ch.start) activeCh = ch;
      }
      if (chapterPill) chapterPill.textContent = activeCh.badge;

      root.querySelectorAll(".ff-l-chapter-card").forEach((card) => {
        const seek = Number(card.dataset.seek);
        const isActive = (activeCh.start === seek);
        card.classList.toggle("active", isActive);
      });
    };

    const drawFrame = (t) => {
      if (!ctx || !canvas) return;
      const w = canvas.width;
      const h = canvas.height;

      // Dark background
      ctx.fillStyle = "#0c0d10";
      ctx.fillRect(0, 0, w, h);

      // Subtle tech grid
      ctx.strokeStyle = "rgba(15, 118, 110, 0.12)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Vignette
      const grad = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, w * 0.6);
      grad.addColorStop(0, "rgba(15, 118, 110, 0.08)");
      grad.addColorStop(1, "rgba(8, 9, 12, 0.95)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Current Chapter Graphics
      if (currentTime < 35) {
        // -------------------------------------------------------------
        // PHASE 1: Intake & Optical QR Scan
        // -------------------------------------------------------------
        const progress = currentTime / 35;
        const scanY = 140 + ((Math.sin(t * 0.003) + 1) / 2) * 260;

        // Device Blueprint Box
        ctx.strokeStyle = "rgba(244, 244, 245, 0.25)";
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.25, 120, w * 0.5, 300);

        // Holographic corner reticles
        const len = 20;
        ctx.strokeStyle = "#0f766e";
        ctx.lineWidth = 3;
        // TL
        ctx.beginPath(); ctx.moveTo(w * 0.25, 140); ctx.lineTo(w * 0.25, 120); ctx.lineTo(w * 0.25 + len, 120); ctx.stroke();
        // TR
        ctx.beginPath(); ctx.moveTo(w * 0.75 - len, 120); ctx.lineTo(w * 0.75, 120); ctx.lineTo(w * 0.75, 140); ctx.stroke();
        // BL
        ctx.beginPath(); ctx.moveTo(w * 0.25, 400); ctx.lineTo(w * 0.25, 420); ctx.lineTo(w * 0.25 + len, 420); ctx.stroke();
        // BR
        ctx.beginPath(); ctx.moveTo(w * 0.75 - len, 420); ctx.lineTo(w * 0.75, 420); ctx.lineTo(w * 0.75, 400); ctx.stroke();

        // Laser Scan Line
        const laserGrad = ctx.createLinearGradient(0, scanY - 12, 0, scanY + 12);
        laserGrad.addColorStop(0, "rgba(15, 118, 110, 0)");
        laserGrad.addColorStop(0.5, "rgba(63, 191, 174, 0.85)");
        laserGrad.addColorStop(1, "rgba(15, 118, 110, 0)");
        ctx.fillStyle = laserGrad;
        ctx.fillRect(w * 0.24, scanY - 12, w * 0.52, 24);

        // Barcode / Optical readout
        ctx.fillStyle = "#3fbfae";
        ctx.font = "bold 13px monospace";
        ctx.fillText("OPTICAL TELEMETRY SCANNING // SENSOR ACTIVE", w * 0.26, 95);

        ctx.fillStyle = "#f4f4f5";
        ctx.font = "16px monospace";
        ctx.fillText("DEVICE IDENTIFIED: APPLE MACBOOK PRO 16 (M2 MAX)", w * 0.26, 455);

        ctx.fillStyle = "rgba(244, 244, 245, 0.6)";
        ctx.font = "13px monospace";
        ctx.fillText("SERIAL: C02G4190MD6R · INTAKE STATUS: VERIFIED", w * 0.26, 480);

      } else if (currentTime < 70) {
        // -------------------------------------------------------------
        // PHASE 2: Logic Board Oscilloscope & Diagnostics
        // -------------------------------------------------------------
        ctx.fillStyle = "#3fbfae";
        ctx.font = "bold 13px monospace";
        ctx.fillText("DIAGNOSTIC TELEMETRY: LOGIC RAIL WAVEFORM MONITOR", 80, 80);

        // Oscilloscope Screen Box
        ctx.fillStyle = "rgba(12, 24, 24, 0.85)";
        ctx.fillRect(80, 100, w - 160, 320);
        ctx.strokeStyle = "rgba(15, 118, 110, 0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(80, 100, w - 160, 320);

        // Waveform plot
        ctx.beginPath();
        ctx.strokeStyle = "#3fbfae";
        ctx.lineWidth = 2.5;
        const baseY = 260;
        for (let x = 80; x < w - 80; x += 4) {
          const freq = 0.025;
          const amp = 45 * Math.sin((x + t * 0.2) * freq) * Math.cos((x - t * 0.1) * 0.015);
          const noise = (Math.sin(x * 0.3) * 6);
          const y = baseY + amp + noise;
          if (x === 80) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Fault Pinpoint Marker
        const markerX = w * 0.55;
        const markerY = baseY - 20;
        ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
        ctx.beginPath(); ctx.arc(markerX, markerY, 26 + Math.sin(t * 0.008) * 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.arc(markerX, markerY, 6, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#f87171";
        ctx.font = "bold 12px monospace";
        ctx.fillText("FAULT ISOLATED: PPBUS_G3H LOW (0.42V)", markerX + 35, markerY - 5);
        ctx.fillStyle = "#f4f4f5";
        ctx.font = "12px monospace";
        ctx.fillText("REQUISITION: USB-C DAUGHTERBOARD [RACK 04-A]", markerX + 35, markerY + 15);

      } else if (currentTime < 105) {
        // -------------------------------------------------------------
        // PHASE 3: Fleet Dispatch Radar
        // -------------------------------------------------------------
        ctx.fillStyle = "#3fbfae";
        ctx.font = "bold 13px monospace";
        ctx.fillText("FLEET DISPATCH RADAR: REAL-TIME SPECIALIST ROUTING", 80, 80);

        const centerX = w * 0.45;
        const centerY = 280;

        // Radar Rings
        for (let r = 50; r <= 200; r += 50) {
          ctx.strokeStyle = "rgba(15, 118, 110, 0.25)";
          ctx.beginPath(); ctx.arc(centerX, centerY, r, 0, Math.PI * 2); ctx.stroke();
        }

        // Radar Sweep Line
        const angle = (t * 0.002) % (Math.PI * 2);
        ctx.strokeStyle = "rgba(63, 191, 174, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(angle) * 200, centerY + Math.sin(angle) * 200);
        ctx.stroke();

        // Center hub
        ctx.fillStyle = "#3fbfae";
        ctx.beginPath(); ctx.arc(centerX, centerY, 5, 0, Math.PI * 2); ctx.fill();

        // Technician Nodes
        const techs = [
          { name: "Sarah Vance (Bench 3)", x: centerX + 90, y: centerY - 60, status: "ASSIGNED", col: "#10b981" },
          { name: "Dave Miller (Unit 2)", x: centerX - 120, y: centerY + 40, status: "AVAILABLE", col: "#38bdf8" },
          { name: "Alex Thorne (Shop A)", x: centerX + 40, y: centerY + 130, status: "ON ROUTE", col: "#f59e0b" },
        ];

        techs.forEach((tc) => {
          ctx.fillStyle = tc.col;
          ctx.beginPath(); ctx.arc(tc.x, tc.y, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(244, 244, 245, 0.9)";
          ctx.font = "bold 12px monospace";
          ctx.fillText(tc.name, tc.x + 14, tc.y - 2);
          ctx.fillStyle = tc.col;
          ctx.font = "10px monospace";
          ctx.fillText(`STATUS: ${tc.status}`, tc.x + 14, tc.y + 12);
        });

        // Dispatch routing connection
        ctx.strokeStyle = "#10b981";
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(techs[0].x, techs[0].y); ctx.stroke();
        ctx.setLineDash([]);

        // Right side info card
        ctx.fillStyle = "rgba(23, 23, 26, 0.85)";
        ctx.fillRect(w * 0.72, 160, 240, 200);
        ctx.strokeStyle = "var(--border)";
        ctx.strokeRect(w * 0.72, 160, 240, 200);

        ctx.fillStyle = "#f4f4f5";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("Dispatch Optimizer", w * 0.72 + 16, 195);
        ctx.fillStyle = "#a1a1aa";
        ctx.font = "12px sans-serif";
        ctx.fillText("SLA Match: 99.8%", w * 0.72 + 16, 225);
        ctx.fillText("Route Time: Instant Bench", w * 0.72 + 16, 250);
        ctx.fillText("Certification: Tier 3 SMD", w * 0.72 + 16, 275);
        ctx.fillStyle = "#10b981";
        ctx.fillText("✓ Auto-Dispatched", w * 0.72 + 16, 310);

      } else {
        // -------------------------------------------------------------
        // PHASE 4: 1-Click Settlement & GDPR Anonymization
        // -------------------------------------------------------------
        ctx.fillStyle = "#3fbfae";
        ctx.font = "bold 13px monospace";
        ctx.fillText("AUTOMATED INVOICING & ENCRYPTED GDPR AUDIT VAULT", 80, 80);

        // Invoice Receipt Card
        const cardX = w * 0.28;
        const cardY = 120;
        const cardW = w * 0.44;
        const cardH = 340;

        ctx.fillStyle = "#17171a";
        ctx.fillRect(cardX, cardY, cardW, cardH);
        ctx.strokeStyle = "rgba(244, 244, 245, 0.2)";
        ctx.lineWidth = 1;
        ctx.strokeRect(cardX, cardY, cardW, cardH);

        // Header
        ctx.fillStyle = "#f4f4f5";
        ctx.font = "bold 16px monospace";
        ctx.fillText("INVOICE #INV-2026-089", cardX + 24, cardY + 40);

        ctx.fillStyle = "#a1a1aa";
        ctx.font = "12px monospace";
        ctx.fillText("CLIENT: ACME STUDIO LTD · SARAH JENKINS", cardX + 24, cardY + 68);

        // Divider
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath(); ctx.moveTo(cardX + 24, cardY + 85); ctx.lineTo(cardX + cardW - 24, cardY + 85); ctx.stroke();

        // Line Items
        const items = [
          ["OEM USB-C Daughterboard (MB-16)", "$45.00"],
          ["Micro-soldering Bench Labor (1.5h)", "$180.00"],
          ["Ultrasonic Chassis Cleaning", "COMPLIMENTARY"],
        ];
        items.forEach(([item, pr], i) => {
          ctx.fillStyle = "#f4f4f5";
          ctx.font = "12px monospace";
          ctx.fillText(item, cardX + 24, cardY + 120 + i * 28);
          ctx.textAlign = "right";
          ctx.fillText(pr, cardX + cardW - 24, cardY + 120 + i * 28);
          ctx.textAlign = "left";
        });

        // Total
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.beginPath(); ctx.moveTo(cardX + 24, cardY + 215); ctx.lineTo(cardX + cardW - 24, cardY + 215); ctx.stroke();

        ctx.fillStyle = "#f4f4f5";
        ctx.font = "bold 15px monospace";
        ctx.fillText("TOTAL REVENUE DUE", cardX + 24, cardY + 245);
        ctx.textAlign = "right";
        ctx.fillStyle = "#3fbfae";
        ctx.fillText("$225.00 USD", cardX + cardW - 24, cardY + 245);
        ctx.textAlign = "left";

        // Stamp badge
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.strokeRect(cardX + 24, cardY + 275, 180, 36);
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 12px monospace";
        ctx.fillText("PAID VIA SMS LINK", cardX + 38, cardY + 298);

        // GDPR Vault seal
        ctx.fillStyle = "#a1a1aa";
        ctx.font = "11px monospace";
        ctx.fillText("GDPR PRIVACY VAULT SEALED [HASH: 9A4F...2C]", cardX + 220, cardY + 298);
      }
    };

    const animate = (timestamp) => {
      const dt = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (isPlaying) {
        currentTime += dt * playbackSpeed;
        if (currentTime >= TOTAL_DURATION) {
          currentTime = 0; // Loop or restart
        }
        updateControlsUI();
      }

      drawFrame(timestamp);
      animFrameId = requestAnimationFrame(animate);
    };

    const playVideo = () => {
      isPlaying = true;
      if (posterOverlay) posterOverlay.classList.add("hidden");
      if (playPauseLabel) playPauseLabel.textContent = "Pause";
      if (playPauseIcon) playPauseIcon.innerHTML = String(iconSvg("clock", 13));
      lastTimestamp = performance.now();
    };

    const pauseVideo = () => {
      isPlaying = false;
      if (playPauseLabel) playPauseLabel.textContent = "Play";
      if (playPauseIcon) playPauseIcon.innerHTML = String(iconSvg("sparkles", 13));
    };

    const seekTo = (seconds) => {
      currentTime = Math.max(0, Math.min(TOTAL_DURATION, seconds));
      updateControlsUI();
      if (!isPlaying) {
        playVideo();
      }
    };

    // Scrubber click/drag
    if (scrubber) {
      const handleScrub = (e) => {
        const rect = scrubber.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seekTo(pos * TOTAL_DURATION);
      };
      scrubber.addEventListener("click", handleScrub);
    }

    // Play triggers
    root.querySelector("#btn-big-play")?.addEventListener("click", playVideo);
    playPauseBtn?.addEventListener("click", () => {
      if (isPlaying) pauseVideo();
      else playVideo();
    });

    // Speed toggle
    speedToggle?.addEventListener("click", () => {
      speedIdx = (speedIdx + 1) % speeds.length;
      playbackSpeed = speeds[speedIdx];
      if (speedLabel) speedLabel.textContent = `${playbackSpeed.toFixed(1)}x`;
    });

    // Sound toggle
    soundToggle?.addEventListener("click", () => {
      isSoundOn = !isSoundOn;
      if (soundLabel) soundLabel.textContent = isSoundOn ? "Audio On" : "Audio Muted";
      if (soundWave) soundWave.classList.toggle("muted", !isSoundOn);
    });

    // Theater mode toggle
    theaterToggle?.addEventListener("click", () => {
      if (playerContainer) {
        playerContainer.classList.toggle("theater-mode");
      }
    });

    // Chapter cards seek
    root.querySelectorAll(".ff-l-chapter-card").forEach((card) => {
      card.addEventListener("click", () => {
        const seek = Number(card.dataset.seek);
        seekTo(seek);
      });
    });

    // Hero Watch Film Button -> scroll directly to video & start playing
    root.querySelector("#btn-hero-watch-film")?.addEventListener("click", () => {
      root.querySelector("#ff-video")?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => playVideo(), 400);
    });

    // Start render loop
    animFrameId = requestAnimationFrame(animate);
    updateControlsUI();

    // -----------------------------------------------------------------------
    // Workstation Stepper Logic
    // -----------------------------------------------------------------------
    let currentStep = 2;
    const logs = [
      "10:14:02 — FrontDesk_Rob recorded intake ticket & condition photos",
      "10:28:44 — Diagnostic checklist confirmed by LeadTech_Sarah",
      "10:45:19 — Parts allocated from inventory: MB-16-USB",
    ];

    const updateStep = (idx) => {
      currentStep = idx;
      const step = WORKFLOW_STEPS[idx];

      const bar = root.querySelector("#sim-progress-bar");
      const pct = root.querySelector("#sim-pct");
      const cost = root.querySelector("#sim-cost");
      const badge = root.querySelector("#sim-badge");
      const desc = root.querySelector("#sim-step-desc");

      if (bar) bar.style.width = step.pct + "%";
      if (pct) pct.textContent = step.pct + "% Completed";
      if (cost) cost.textContent = step.cost;
      if (badge) {
        badge.textContent = step.badge;
        badge.className = `badge ${step.badgeClass}`;
      }

      if (desc) {
        desc.innerHTML = `
          <div class="row" style="justify-content:space-between;margin-bottom:4px">
            <b style="font-size:13px">${step.title}</b>
            <span class="badge badge-progress">Active Phase</span>
          </div>
          <p class="cell-sub" style="margin:0">${step.desc}</p>
        `;
      }

      root.querySelectorAll(".ff-l-step-tab").forEach((btn, i) => {
        btn.classList.toggle("active", i <= idx);
      });

      if (!logs.includes(step.log)) logs.push(step.log);
      renderLogs();
    };

    const renderLogs = () => {
      const container = root.querySelector("#sim-logs");
      if (!container) return;
      container.innerHTML = logs.map((l) => `
        <div class="ff-l-log-item"><span style="color:var(--accent);font-weight:700">&gt;</span> <span>${l}</span></div>
      `).join("");
      container.scrollTop = container.scrollHeight;
    };

    root.querySelectorAll(".ff-l-step-tab").forEach((btn) => {
      btn.addEventListener("click", () => updateStep(Number(btn.dataset.step)));
    });

    root.querySelector("#btn-advance-step")?.addEventListener("click", () => {
      const next = (currentStep + 1) % WORKFLOW_STEPS.length;
      updateStep(next);
    });

    // Tracker logic
    const renderTracker = (rawId) => {
      const id = (rawId || "JOB-1042").trim().toUpperCase();
      const cardEl = root.querySelector("#tracker-result-card");
      if (!cardEl) return;

      const job = TRACKER_DATA[id] || {
        device: "Device Service (" + id + ")",
        customer: "Customer Account",
        tech: "Dave Miller",
        status: "Diagnostic Verified",
        badgeCls: "badge-progress",
        eta: "Within 24 business hours",
        milestones: ["Intake Inspection Completed", "Under active bench diagnostic"],
      };

      cardEl.innerHTML = `
        <div class="card-body">
          <div class="row" style="justify-content:space-between;padding-bottom:10px;border-bottom:1px solid var(--border)">
            <div>
              <span class="mono-val" style="font-weight:700;color:var(--accent)">${id}</span>
              <h4 style="margin:2px 0 4px;font-size:15px;font-weight:700">${job.device}</h4>
              <div class="cell-sub">Account: ${job.customer} · Specialist: ${job.tech}</div>
            </div>
            <span class="badge ${job.badgeCls}">${job.status}</span>
          </div>
          <div class="grid grid-2" style="margin-top:12px;gap:16px">
            <div>
              <div class="cell-sub" style="font-weight:600;margin-bottom:6px">Completed Milestones:</div>
              <ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--text)">
                ${job.milestones.map((m) => `<li style="margin-bottom:3px">${m}</li>`).join("")}
              </ul>
            </div>
            <div style="text-align:right">
              <div class="cell-sub" style="font-weight:600">Estimated Ready Time:</div>
              <div style="font-weight:700;font-size:13.5px;margin-top:2px">${job.eta}</div>
              <button class="btn btn-secondary btn-sm" data-nav="customer-portal" style="margin-top:10px">
                Open Full Customer Portal &rarr;
              </button>
            </div>
          </div>
        </div>
      `;
    };

    root.querySelector("#btn-track-submit")?.addEventListener("click", () => {
      const val = root.querySelector("#tracker-input")?.value;
      renderTracker(val);
    });

    root.querySelector("#tracker-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") renderTracker(e.target.value);
    });

    root.querySelector("#btn-quick-lookup")?.addEventListener("click", () => {
      root.querySelector("#ff-tracker")?.scrollIntoView({ behavior: "smooth" });
      root.querySelector("#tracker-input")?.focus();
    });

    // Launch Demo Buttons -> establish demo session and open dashboard
    const launchDemo = () => {
      store.session = { user: "Demo Specialist", role: "admin" };
      navigate("dashboard");
    };

    root.querySelector("#btn-hero-launch-top")?.addEventListener("click", launchDemo);
    root.querySelector("#btn-hero-launch-bot")?.addEventListener("click", launchDemo);
    root.querySelector("#btn-hero-demo")?.addEventListener("click", () => {
      root.querySelector("#ff-sim")?.scrollIntoView({ behavior: "smooth" });
    });

    root.querySelector("#btn-sim-invoice")?.addEventListener("click", () => {
      // eslint-disable-next-line no-alert
      alert("Invoice INV-2026-089 generated!\n\nClient: Acme Studio Ltd\nTotal: $225.00\nStatus: Sent via SMS & Email.\n\nLaunching the full app dashboard.");
      launchDemo();
    });

    // FAQ Accordion
    root.querySelectorAll(".ff-l-faq-item").forEach((item) => {
      item.querySelector(".ff-l-faq-q")?.addEventListener("click", () => {
        const isOpen = item.classList.contains("open");
        root.querySelectorAll(".ff-l-faq-item").forEach((x) => x.classList.remove("open"));
        if (!isOpen) item.classList.add("open");
      });
    });

    // Initialize defaults
    updateStep(2);
    renderTracker("JOB-1042");
  },
};
