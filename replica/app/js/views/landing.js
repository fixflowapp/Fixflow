import { store } from "../store.js";
import { html, raw } from "../markup.js";
import { iconSvg, toast } from "../util.js";

const WORKFLOW_STEPS = [
  {
    step: "1. Intake & Triage",
    pct: 20,
    title: "Optical Scan & Spatial Damage Mapping",
    desc: "Device serial scanned at reception. 6-angle optical check recorded and mapped onto a 3D chassis diagram. Intake ticket JOB-1088 assigned to Senior Bench Tech Sarah Vance.",
    cost: "$0.00 (Est. TBD)",
    badge: "Intake Recorded",
    badgeClass: "badge-progress",
    log: "09:14:22 — Serial C02XK142JGH5 verified & intake SMS queued",
  },
  {
    step: "2. Board Diagnostics",
    pct: 42,
    title: "Thermal Imaging & Rail Fault Isolation",
    desc: "Bench diagnostic confirms shorted PPBUS_G3H rail near U7800 PMIC at 74.2 C hotspot. Digital repair quote for $225.00 dispatched for one-tap client approval.",
    cost: "$225.00 (Approved)",
    badge: "Quote Approved",
    badgeClass: "badge-active",
    log: "09:42:08 — Thermal rail delta flagged; quote signed by Acme Studio Ltd",
  },
  {
    step: "3. Micro-Soldering",
    pct: 66,
    title: "OEM Component Swap & Ultrasonic Clean",
    desc: "1x OEM PMIC IC allocated from Bin B4-09. BGA rework completed under stereo microscope with zero bridging; board cleaned and thermal paste renewed.",
    cost: "$225.00 (Parts + Labor)",
    badge: "In Repair",
    badgeClass: "badge-progress",
    log: "10:18:45 — Stock FIFO deducted from Bin B4-09 (1x U7800 IC)",
  },
  {
    step: "4. Stress & QA",
    pct: 84,
    title: "14-Point Load Benchmark & Burn-In",
    desc: "Automated 45-minute CPU/GPU load and USB-C PD negotiation passed without throttling. Voltage rails stabilized at 12.61V nominal.",
    cost: "$225.00 (Parts + Labor)",
    badge: "QA Passed",
    badgeClass: "badge-active",
    log: "11:12:05 — 14 hardware suites passed (0 rail faults)",
  },
  {
    step: "5. Locker & Invoice",
    pct: 100,
    title: "Itemized Invoice & Smart Locker Release",
    desc: "Work order closed. Invoice INV-2026-089 sent via SMS and email with Apple Pay / card checkout. Unit staged inside climate-controlled Locker 03.",
    cost: "$225.00 (Settled / Ready)",
    badge: "Ready for Pickup",
    badgeClass: "badge-active",
    log: "11:20:00 — Invoice INV-2026-089 & Locker PIN #8419 dispatched",
  },
];

const TRACKER_DATA = {
  "JOB-1042": {
    device: 'Apple MacBook Air 13" (M1)',
    customer: "Marcus Reed",
    tech: "Sarah Vance",
    status: "Repaired — Ready for Pickup",
    badgeCls: "badge-active",
    eta: "Ready today in Locker #04 (PIN sent via SMS)",
    milestones: [
      "08:40 — Optical Intake Inspection Completed",
      "10:15 — Top Case & Keyboard Assembly Replaced",
      "11:50 — Logic Board Passed 14-Point QA",
    ],
  },
  "JOB-1088": {
    device: 'MacBook Pro 16" (M2 Max)',
    customer: "Acme Studio Ltd",
    tech: "Sarah Vance",
    status: "In Progress — Micro-Soldering",
    badgeCls: "badge-progress",
    eta: "Estimated Completion: Today, 4:30 PM",
    milestones: [
      "09:14 — Intake & Serial Logged",
      "09:42 — U7800 Rail Fault Approved ($225.00)",
      "10:18 — Bench Rework & Bin B4-09 Parts Allocated",
    ],
  },
  "JOB-2015": {
    device: "Dell XPS 15 9520",
    customer: "Elena Rostova",
    tech: "Alex Thorne",
    status: "Awaiting Courier Part Delivery",
    badgeCls: "badge-waiting",
    eta: "OEM Battery In Transit (Courier Ref: 1Z9999)",
    milestones: [
      "Yesterday — Intake Condition Logged",
      "Yesterday — Battery Cell Swell Detected (48% SOH)",
      "Today 08:10 — OEM 86Wh Cell Dispatched from Depot",
    ],
  },
};

const LAYER_INFO = {
  all: {
    code: "STACK · FULL 3D RIG",
    title: "Synchronized Multi-Layer Telemetry",
    metric: "4 Strata · 14.2ms Poll",
    note: "Drag anywhere inside the 3D stage to orbit the workstation stack, or isolate an individual hardware stratum below.",
  },
  display: {
    code: "LAYER 01 · DISPLAY & LIDAR",
    title: "Optical Frame & Digitizer Plane",
    metric: "eDP 1.4b · 120Hz Calibrated",
    note: "Captures 6-angle cosmetic blemishes at intake and binds pixel/hinge checks directly to warranty serialization.",
  },
  board: {
    code: "LAYER 02 · MAIN LOGIC BOARD",
    title: "PMIC Rail & BGA Hotspots",
    metric: "PPBUS 12.61V · U7800 Nominal",
    note: "Pinpoints thermal deltas and auto-reserves replacement ICs from bench inventory bins before soldering starts.",
  },
  power: {
    code: "LAYER 03 · POWER & COOLING",
    title: "Cell Pack & Dual Vapor Blowers",
    metric: "94% SOH · 2,140 RPM Balanced",
    note: "Logs cycle counts, USB-C PD draw curves, and fan acoustics across every load test prior to locker handoff.",
  },
};

const CHAPTERS = [
  {
    id: 0,
    start: 0,
    end: 35,
    timeLabel: "00:00",
    pill: "Chapter 1 · 3D Optical Intake",
    title: "Volumetric Optical Scan",
    desc: "Sub-second serial lookup maps chassis dents and display scuffs directly onto an interactive 3D wireframe.",
  },
  {
    id: 1,
    start: 35,
    end: 70,
    timeLabel: "00:35",
    pill: "Chapter 2 · Board Telemetry",
    title: "3D Rail & Bin Diagnostics",
    desc: "Live thermal hotspots bind to FIFO parts inventory and trigger one-tap digital approvals from the customer.",
  },
  {
    id: 2,
    start: 70,
    end: 105,
    timeLabel: "01:10",
    pill: "Chapter 3 · Fleet Dispatch",
    title: "Orbital Courier Routing",
    desc: "Geospatial bench capacity and mobile van dispatch sync locker drop-offs with real-time technician ETAs.",
  },
  {
    id: 3,
    start: 105,
    end: 150,
    timeLabel: "01:45",
    pill: "Chapter 4 · GDPR Vault",
    title: "Encrypted Ledger & Erasure",
    desc: "Itemized checkout settles invoices automatically while Article 17 erasure audits keep every customer record compliant.",
  },
];

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

/** Simple perspective 3D projection utility (Z-forward camera). */
function projectPoint(x, y, z, yaw, pitch, cx, cy, scale, fov = 560) {
  const cyaw = Math.cos(yaw);
  const syaw = Math.sin(yaw);
  const cpitch = Math.cos(pitch);
  const spitch = Math.sin(pitch);

  const x1 = x * cyaw - z * syaw;
  const z1 = x * syaw + z * cyaw;
  const y2 = y * cpitch - z1 * spitch;
  const z2 = y * spitch + z1 * cpitch;

  const dist = fov + z2;
  const f = fov / Math.max(120, dist);
  return {
    x: cx + x1 * scale * f,
    y: cy + y2 * scale * f,
    z: z2,
    f,
  };
}

function getThemePalette() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  return dark
    ? {
        bg: "#090b0d",
        grid: "rgba(255, 255, 255, 0.05)",
        wire: "rgba(228, 228, 231, 0.34)",
        wireMuted: "rgba(161, 161, 170, 0.16)",
        accent: "#3fbfae",
        accentBright: "#5eead4",
        accentFill: "rgba(63, 191, 174, 0.12)",
        amber: "#f59e0b",
        amberFill: "rgba(245, 158, 11, 0.22)",
        surfaceFill: "rgba(24, 24, 27, 0.72)",
        text: "#fafafa",
        muted: "#a1a1aa",
      }
    : {
        bg: "#f4f5f6",
        grid: "rgba(24, 24, 27, 0.06)",
        wire: "rgba(24, 24, 27, 0.42)",
        wireMuted: "rgba(24, 24, 27, 0.15)",
        accent: "#0f766e",
        accentBright: "#0d9488",
        accentFill: "rgba(15, 118, 110, 0.10)",
        amber: "#d97706",
        amberFill: "rgba(217, 119, 6, 0.18)",
        surfaceFill: "rgba(255, 255, 255, 0.78)",
        text: "#18181b",
        muted: "#52525b",
      };
}

export const landing = {
  title: "FixFlow — 3D Spatial Repair Operations Platform",
  crumb: () => ["FixFlow"],

  render() {
    const initialTheme = document.documentElement.getAttribute("data-theme") || "light";
    return html`
      <div class="ff-landing" id="ff-landing-root">
        <div class="ff-l-grain" aria-hidden="true"></div>

        <!-- Floating Fluid Island Pill Navbar -->
        <div class="ff-l-nav-shell">
          <nav class="ff-l-nav-island" aria-label="Primary navigation">
            <div class="ff-l-brand" data-nav="landing" role="button" tabindex="0">
              <div class="brand-mark">F</div>
              <span class="brand-name">FixFlow</span>
              <span class="ff-l-version-tag mono-val">3D v4.2</span>
            </div>

            <div class="ff-l-nav-links">
              <a href="#ff-stage">3D Rig</a>
              <a href="#ff-video">Telemetry Film</a>
              <a href="#ff-architecture">Modules</a>
              <a href="#ff-simulator">Workbench</a>
              <a href="#ff-pricing">Pricing</a>
            </div>

            <div class="ff-l-nav-actions">
              <button
                class="ff-l-icon-btn"
                id="btn-landing-theme"
                type="button"
                aria-label="Toggle light or dark surface"
                title="Toggle color theme"
              >
                <span id="landing-theme-icon">${raw(iconSvg(initialTheme === "dark" ? "sun" : "moon", 15))}</span>
              </button>
              <button class="ff-l-ghost-btn" type="button" data-nav="login">Sign In</button>
              <button class="ff-l-pill-cta" type="button" data-nav="signup">
                <span>Launch App</span>
                <span class="ff-l-cta-disc">${raw(iconSvg("chevronRight", 14))}</span>
              </button>
            </div>
          </nav>
        </div>

        <!-- Editorial Split 3D Hero -->
        <section class="ff-l-hero" id="ff-stage">
          <div class="ff-l-hero-grid">
            <!-- Left Column: Editorial Typography & CTAs -->
            <div class="ff-l-hero-copy">
              <div class="ff-l-eyebrow-pill">
                <span class="ff-l-pulse" aria-hidden="true"></span>
                <span>Spatial Bench Telemetry · Release 4.2</span>
              </div>

              <h1 class="ff-l-hero-title">
                Every repair bay, <span class="ff-l-accent-text">synced in three dimensions.</span>
              </h1>

              <p class="ff-l-hero-sub">
                Replace scattered intake spreadsheets, blind soldering benches, and manual compliance logs with an interactive spatial operating system built for high-volume labs and dispatch fleets.
              </p>

              <div class="ff-l-hero-cta">
                <button class="ff-l-pill-cta ff-l-pill-cta-lg" type="button" data-nav="signup">
                  <span>Start 14-day lab trial</span>
                  <span class="ff-l-cta-disc">${raw(iconSvg("chevronRight", 15))}</span>
                </button>
                <button class="ff-l-secondary-pill" type="button" id="btn-hero-demo">
                  ${raw(iconSvg("activity", 15))}
                  <span>Open live simulator</span>
                </button>
                <button class="ff-l-secondary-pill" type="button" data-nav="request-service">
                  ${raw(iconSvg("clipboard", 15))}
                  <span>Customer intake</span>
                </button>
              </div>

              <div class="ff-l-hero-stats">
                <div class="ff-l-stat-item">
                  <strong class="mono-val">1,428</strong>
                  <span>Active repair bays</span>
                </div>
                <div class="ff-l-stat-divider" aria-hidden="true"></div>
                <div class="ff-l-stat-item">
                  <strong class="mono-val">418 ms</strong>
                  <span>Intake-to-bench sync</span>
                </div>
                <div class="ff-l-stat-divider" aria-hidden="true"></div>
                <div class="ff-l-stat-item">
                  <strong class="mono-val">Art. 17</strong>
                  <span>GDPR vault verified</span>
                </div>
              </div>
            </div>

            <!-- Right Column: Double-Bezel 3D Interactive Hardware Stage -->
            <div class="ff-l-stage-bezel-outer" id="hero-3d-tilt-wrap">
              <div class="ff-l-stage-bezel-inner">
                <div class="ff-l-stage-header">
                  <div class="ff-l-stage-title-group">
                    <span class="ff-l-stage-dot"></span>
                    <span class="mono-val ff-l-stage-code" id="hud-layer-code">${LAYER_INFO.all.code}</span>
                  </div>
                  <div class="ff-l-stage-actions">
                    <button class="ff-l-mini-toggle active" type="button" id="btn-3d-explode">
                      Exploded 3D
                    </button>
                    <button class="ff-l-mini-toggle" type="button" id="btn-3d-reset">
                      Reset Orbit
                    </button>
                  </div>
                </div>

                <!-- 3D Viewport -->
                <div class="ff-l-stage-viewport" id="hero-3d-viewport">
                  <canvas id="hero-3d-canvas" width="760" height="540" aria-label="Interactive 3D exploded workstation model"></canvas>

                  <!-- Floating Z-Depth Telemetry Callouts -->
                  <div class="ff-l-hud-card ff-l-hud-top" id="hud-callout-top">
                    <span class="mono-val ff-l-hud-kicker">DRAG TO ORBIT 360°</span>
                    <strong id="hud-layer-title">${LAYER_INFO.all.title}</strong>
                  </div>

                  <div class="ff-l-hud-card ff-l-hud-bottom" id="hud-callout-bottom">
                    <span class="mono-val ff-l-hud-metric" id="hud-layer-metric">${LAYER_INFO.all.metric}</span>
                    <p id="hud-layer-note">${LAYER_INFO.all.note}</p>
                  </div>
                </div>

                <!-- Layer Selector & Explosion Slider Bar -->
                <div class="ff-l-stage-dock">
                  <div class="ff-l-layer-pills" role="tablist" aria-label="Select 3D hardware stratum">
                    <button class="ff-l-layer-btn active" type="button" data-layer="all">All Layers</button>
                    <button class="ff-l-layer-btn" type="button" data-layer="display">Display</button>
                    <button class="ff-l-layer-btn" type="button" data-layer="board">Logic Board</button>
                    <button class="ff-l-layer-btn" type="button" data-layer="power">Power Rail</button>
                  </div>
                  <label class="ff-l-depth-slider-wrap">
                    <span class="mono-val">Z-Depth</span>
                    <input id="slider-3d-explode" type="range" min="0" max="100" value="78" aria-label="3D Z-axis explosion separation" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Double-Bezel 4K 3D Telemetry Product Film -->
        <section id="ff-video" class="ff-l-video-sec ff-l-reveal">
          <div class="ff-l-video-wrap">
            <div class="ff-l-section-head">
              <span class="ff-l-tag">4K Spatial Walkthrough</span>
              <h2>Watch telemetry flow across all four operational layers.</h2>
              <p>Interactive 60 FPS projected simulation showing optical intake, board-level thermal lock, fleet dispatch, and automated GDPR erasure.</p>
            </div>

            <div class="ff-l-bezel-outer ff-l-player-outer">
              <div class="ff-l-player-box" id="ff-player-container">
                <div class="ff-l-player-topbar">
                  <div class="ff-l-player-brand">
                    <span class="ff-l-live-rec-dot"></span>
                    <span class="mono-val ff-l-player-meta">FIXFLOW 3D TELEMETRY ENGINE · 60 FPS</span>
                  </div>
                  <div class="ff-l-player-badges">
                    <span class="badge badge-active" id="video-chapter-pill">Chapter 1 · 3D Optical Intake</span>
                    <span class="badge badge-neutral">4K MASTER</span>
                  </div>
                </div>

                <div class="ff-l-player-screen" id="player-screen">
                  <canvas id="film-canvas" width="1024" height="576"></canvas>

                  <div class="ff-l-poster-overlay" id="poster-overlay">
                    <img src="./video-poster.jpg" alt="FixFlow 3D repair workstation showcase poster" class="ff-l-poster-img" />
                    <div class="ff-l-poster-gradient"></div>
                    <button type="button" class="ff-l-play-trigger" id="btn-big-play" aria-label="Play 3D product walkthrough video">
                      <span class="ff-l-play-circle">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><polygon points="8,5 19,12 8,19"/></svg>
                      </span>
                      <span class="ff-l-play-label">
                        <span class="title">Play Spatial Walkthrough</span>
                        <span class="meta">02:30 · Interactive 3D Telemetry · Synthesized Soundscape</span>
                      </span>
                    </button>
                  </div>
                </div>

                <div class="ff-l-player-controls">
                  <div class="ff-l-scrubber" id="video-scrubber" title="Click or drag to seek" role="slider" aria-label="Playback position" aria-valuemin="0" aria-valuemax="150" aria-valuenow="0">
                    <div class="ff-l-scrubber-track">
                      <div class="ff-l-scrubber-progress" id="scrubber-progress" style="width:0%"></div>
                      <div class="ff-l-marker" style="left:0%"></div>
                      <div class="ff-l-marker" style="left:23.3%"></div>
                      <div class="ff-l-marker" style="left:46.6%"></div>
                      <div class="ff-l-marker" style="left:70%"></div>
                    </div>
                  </div>

                  <div class="ff-l-ctrl-row">
                    <div class="ff-l-ctrl-group">
                      <button class="btn btn-secondary btn-sm" type="button" id="btn-play-pause">
                        <span id="play-pause-icon">${raw(iconSvg("sparkles", 13))}</span>
                        <span id="play-pause-label">Play</span>
                      </button>
                      <span class="mono-val ff-l-timecode" id="timecode-display">00:00 / 02:30</span>
                    </div>

                    <div class="ff-l-ctrl-group">
                      <button class="btn btn-secondary btn-sm" type="button" id="btn-sound-toggle" title="Toggle audio soundscape">
                        <span class="ff-l-sound-wave" id="sound-wave"><i></i><i></i><i></i><i></i></span>
                        <span id="sound-label">Audio On</span>
                      </button>
                      <button class="btn btn-secondary btn-sm" type="button" id="btn-speed-toggle" title="Playback speed">
                        <span id="speed-label" class="mono-val">1.0x</span>
                      </button>
                      <button class="btn btn-secondary btn-sm" type="button" id="btn-theater-toggle" title="Toggle theater view">
                        ${raw(iconSvg("eye", 13))} Theater
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="ff-l-chapters-grid" id="video-chapters-grid">
              ${CHAPTERS.map(
                (ch, idx) => html`
                  <button type="button" class="ff-l-chapter-bezel ${idx === 0 ? "active" : ""}" data-chapter="${ch.id}">
                    <div class="ff-l-chapter-card">
                      <div class="ff-l-ch-time mono-val">${ch.timeLabel} · CH 0${idx + 1}</div>
                      <h4>${ch.title}</h4>
                      <p>${ch.desc}</p>
                    </div>
                  </button>
                `
              )}
            </div>
          </div>
        </section>

        <!-- Asymmetrical Double-Bezel 3D Tilt Architecture Bento -->
        <section id="ff-architecture" class="ff-l-section ff-l-reveal">
          <div class="ff-l-section-head">
            <span class="ff-l-tag">Spatial Architecture</span>
            <h2>Built around physical repair benches, not generic CRM tables.</h2>
            <p>Each workspace module sits inside calibrated 3D depth cards tuned for fast tactile inspection at the counter or under the microscope.</p>
          </div>

          <div class="ff-l-bento-asym">
            <!-- Wide Featured Card (7 cols) -->
            <article class="ff-l-bezel-outer ff-l-tilt-card ff-l-span-7">
              <div class="ff-l-bezel-inner ff-l-bento-inner">
                <div class="ff-l-bento-top">
                  <div class="ff-l-bento-icon">${raw(iconSvg("cpu", 18))}</div>
                  <span class="mono-val ff-l-bento-code">RAIL · TELEMETRY · 01</span>
                </div>
                <h3>Component-level fault mapping with instant parts reservation.</h3>
                <p>Click directly on a power rail, hinge mount, or ribbon connector during diagnosis. FixFlow deducts matching OEM stock via FIFO and queues digital approval quotes in one sweep.</p>
                <div class="ff-l-rail-matrix">
                  <button type="button" class="ff-l-rail-chip active" data-rail="PPBUS_G3H">
                    <span class="mono-val">PPBUS_G3H</span>
                    <strong>12.61 V</strong>
                  </button>
                  <button type="button" class="ff-l-rail-chip" data-rail="PP3V3_G3H">
                    <span class="mono-val">PP3V3_G3H</span>
                    <strong>3.31 V</strong>
                  </button>
                  <button type="button" class="ff-l-rail-chip" data-rail="U7800_PMIC">
                    <span class="mono-val">U7800 PMIC</span>
                    <strong>74.2 C Hot</strong>
                  </button>
                </div>
              </div>
            </article>

            <!-- Compact Card (5 cols) -->
            <article class="ff-l-bezel-outer ff-l-tilt-card ff-l-span-5">
              <div class="ff-l-bezel-inner ff-l-bento-inner">
                <div class="ff-l-bento-top">
                  <div class="ff-l-bento-icon">${raw(iconSvg("truck", 18))}</div>
                  <span class="mono-val ff-l-bento-code">FLEET · ROUTE · 02</span>
                </div>
                <h3>Courier handoffs & smart lockers.</h3>
                <p>Pair mobile repair vans with shop intake counters. Every pickup generates tamper-evident locker PINs and live SMS arrival links.</p>
                <div class="ff-l-bento-stat-row">
                  <div>
                    <strong class="mono-val">14</strong>
                    <span>Courier zones</span>
                  </div>
                  <div>
                    <strong class="mono-val">18 min</strong>
                    <span>Median dispatch</span>
                  </div>
                </div>
              </div>
            </article>

            <!-- Compact Card (5 cols) -->
            <article class="ff-l-bezel-outer ff-l-tilt-card ff-l-span-5">
              <div class="ff-l-bezel-inner ff-l-bento-inner">
                <div class="ff-l-bento-top">
                  <div class="ff-l-bento-icon">${raw(iconSvg("shield", 18))}</div>
                  <span class="mono-val ff-l-bento-code">GDPR · VAULT · 03</span>
                </div>
                <h3>One-click Article 17 erasure & audit proof.</h3>
                <p>Export portable customer JSON archives or permanently scrub personal identifiers while preserving serial warranty history and accounting totals.</p>
                <div class="ff-l-bento-action-row">
                  <button class="ff-l-inline-link" type="button" data-nav="gdpr-admin">
                    <span>Open GDPR Governance Console</span>
                    ${raw(iconSvg("chevronRight", 14))}
                  </button>
                </div>
              </div>
            </article>

            <!-- Wide Card (7 cols) -->
            <article class="ff-l-bezel-outer ff-l-tilt-card ff-l-span-7">
              <div class="ff-l-bezel-inner ff-l-bento-inner">
                <div class="ff-l-bento-top">
                  <div class="ff-l-bento-icon">${raw(iconSvg("clock", 18))}</div>
                  <span class="mono-val ff-l-bento-code">LEDGER · SLA · 04</span>
                </div>
                <h3>Offline bench continuity with deterministic merge.</h3>
                <p>Basement workshops and mobile vans keep logging repairs without reception. Buffered bench events reconcile cleanly the moment a connection returns.</p>
                <div class="ff-l-pipeline-strip mono-val">
                  <span>01 INTAKE</span>
                  <span>-></span>
                  <span>02 DIAGNOSE</span>
                  <span>-></span>
                  <span>03 REWORK</span>
                  <span>-></span>
                  <span>04 STRESS QA</span>
                  <span>-></span>
                  <span>05 LOCKER</span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- Live Interactive 5-Stage Workstation Simulator -->
        <section id="ff-simulator" class="ff-l-section ff-l-reveal">
          <div class="ff-l-section-head">
            <span class="ff-l-tag">Interactive Bench Preview</span>
            <h2>Step through a live repair ticket in real time.</h2>
            <p>Test how technicians move Job #JOB-1088 from reception optical intake to automated SMS invoicing without changing screens.</p>
          </div>

          <div class="ff-l-bezel-outer">
            <div class="ff-l-sim-card">
              <div class="ff-l-sim-topbar">
                <div class="ff-l-sim-topbar-left">
                  <div class="ff-l-window-dots" aria-hidden="true">
                    <span class="dot-red"></span><span class="dot-yellow"></span><span class="dot-green"></span>
                  </div>
                  <span class="ff-l-sim-url mono-val">workstation://bench-04/JOB-1088</span>
                </div>
                <div class="ff-l-sim-controls">
                  <span class="badge badge-progress" id="sim-badge">20% · Intake Recorded</span>
                  <button class="btn btn-secondary btn-sm" type="button" id="btn-sim-next">Advance Stage -></button>
                </div>
              </div>

              <div class="ff-l-sim-body">
                <div class="ff-l-sim-left">
                  <div class="ff-l-sim-jobhead">
                    <div>
                      <div class="ff-l-sim-id mono-val">JOB-1088 · SERIAL C02XK142JGH5</div>
                      <h3 id="sim-title">MacBook Pro 16" (M2 Max) — No Power on USB-C</h3>
                      <p class="ff-l-sim-client">Client: <strong>Acme Studio Ltd</strong> · Lead Tech: <strong>Sarah Vance</strong></p>
                    </div>
                    <div class="ff-l-sim-cost-box">
                      <span class="ff-l-sim-cost-label">Quote Total</span>
                      <div class="ff-l-sim-cost mono-val" id="sim-cost">$0.00 (Est. TBD)</div>
                    </div>
                  </div>

                  <div class="ff-l-stepper-box">
                    <div class="ff-l-progress-track">
                      <div class="ff-l-progress-fill" id="sim-progress-fill" style="width: 20%"></div>
                    </div>
                    <div class="ff-l-step-tabs" id="sim-tabs">
                      ${WORKFLOW_STEPS.map(
                        (s, idx) => html`
                          <button type="button" class="ff-l-step-tab ${idx === 0 ? "active" : ""}" data-step="${idx}">
                            ${s.step}
                          </button>
                        `
                      )}
                    </div>
                  </div>

                  <div class="ff-l-step-desc-box">
                    <h4 id="sim-step-title">${WORKFLOW_STEPS[0].title}</h4>
                    <p id="sim-step-desc">${WORKFLOW_STEPS[0].desc}</p>
                    <div class="ff-l-log-stream" id="sim-log-stream">
                      <div class="ff-l-log-line mono-val">${WORKFLOW_STEPS[0].log}</div>
                    </div>
                  </div>
                </div>

                <aside class="ff-l-sim-right">
                  <h4>Live Bench Allocation</h4>
                  <div class="ff-l-bench-card">
                    <div class="ff-l-bench-row">
                      <span>Assigned Station</span>
                      <strong class="mono-val">Bay 04 · BGA Rig</strong>
                    </div>
                    <div class="ff-l-bench-row">
                      <span>Allocated Part</span>
                      <strong class="mono-val">Bin B4-09 (1x U7800)</strong>
                    </div>
                    <div class="ff-l-bench-row">
                      <span>Locker Staging</span>
                      <strong class="mono-val">Locker #03 · 18.5 C</strong>
                    </div>
                  </div>

                  <button class="ff-l-pill-cta ff-l-full-btn" type="button" id="btn-sim-invoice">
                    <span>Dispatch Digital Invoice</span>
                    <span class="ff-l-cta-disc">${raw(iconSvg("chevronRight", 14))}</span>
                  </button>
                  <button class="ff-l-secondary-pill ff-l-full-btn" type="button" data-nav="customer-portal">
                    ${raw(iconSvg("eye", 14))}
                    <span>Open Customer Status View</span>
                  </button>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <!-- Live Client Repair Tracker -->
        <section id="ff-tracker" class="ff-l-section ff-l-reveal">
          <div class="ff-l-tracker-grid">
            <div class="ff-l-tracker-copy">
              <span class="ff-l-tag">Zero-Call Status Portal</span>
              <h2>Give customers instant spatial visibility without phone tag.</h2>
              <p>Every ticket generates an encrypted lookup URL and SMS updates as soon as a technician scans an item into QA or assigns a smart pickup locker.</p>

              <div class="ff-l-tracker-input-row">
                <input
                  type="text"
                  id="tracker-input"
                  class="ff-l-tracker-input mono-val"
                  value="JOB-1088"
                  placeholder="Enter Job ID (e.g. JOB-1042)"
                  aria-label="Lookup repair ticket ID"
                />
                <button class="ff-l-pill-cta" type="button" id="btn-track-lookup">
                  <span>Lookup</span>
                  <span class="ff-l-cta-disc">${raw(iconSvg("search", 13))}</span>
                </button>
              </div>

              <div class="ff-l-tracker-samples">
                <span>Try ticket:</span>
                <button type="button" class="ff-l-sample-chip mono-val" data-job="JOB-1042">JOB-1042</button>
                <button type="button" class="ff-l-sample-chip mono-val active" data-job="JOB-1088">JOB-1088</button>
                <button type="button" class="ff-l-sample-chip mono-val" data-job="JOB-2015">JOB-2015</button>
              </div>
            </div>

            <div class="ff-l-bezel-outer">
              <div class="ff-l-bezel-inner ff-l-tracker-card" id="tracker-result-card">
                <div class="ff-l-tracker-card-head">
                  <div>
                    <div class="mono-val ff-l-tracker-jobid" id="tr-job-id">JOB-1088</div>
                    <h3 id="tr-device">${TRACKER_DATA["JOB-1088"].device}</h3>
                    <p class="ff-l-tracker-meta" id="tr-meta">Customer: ${TRACKER_DATA["JOB-1088"].customer} · Tech: ${TRACKER_DATA["JOB-1088"].tech}</p>
                  </div>
                  <span class="badge ${TRACKER_DATA["JOB-1088"].badgeCls}" id="tr-status">${TRACKER_DATA["JOB-1088"].status}</span>
                </div>

                <div class="ff-l-tracker-eta" id="tr-eta">
                  ${raw(iconSvg("clock", 14))}
                  <span>${TRACKER_DATA["JOB-1088"].eta}</span>
                </div>

                <ul class="ff-l-milestone-list" id="tr-milestones">
                  ${TRACKER_DATA["JOB-1088"].milestones.map((m) => html`<li class="mono-val">${m}</li>`)}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- Transparent Pricing -->
        <section id="ff-pricing" class="ff-l-section ff-l-reveal">
          <div class="ff-l-section-head">
            <span class="ff-l-tag">Predictable Licensing</span>
            <h2>Scale from a single bench to regional lab networks.</h2>
            <p>All tiers include optical intake checklists, smart locker notifications, and full GDPR governance with zero per-ticket fees.</p>
          </div>

          <div class="ff-l-pricing-grid">
            <article class="ff-l-bezel-outer ff-l-price-outer">
              <div class="ff-l-bezel-inner ff-l-price-card">
                <div class="ff-l-price-tier">Solo Lab</div>
                <div class="ff-l-price-amount"><strong class="mono-val">$29</strong><span>/month</span></div>
                <p>Built for independent micro-soldering benches and mobile repair specialists.</p>
                <ul class="ff-l-price-list">
                  <li>${raw(iconSvg("check", 14))} Up to 2 technician seats</li>
                  <li>${raw(iconSvg("check", 14))} Interactive 3D intake mapping</li>
                  <li>${raw(iconSvg("check", 14))} Customer status lookup portal</li>
                  <li>${raw(iconSvg("check", 14))} Automated invoice links</li>
                </ul>
                <button class="ff-l-secondary-pill ff-l-full-btn ff-l-price-btn" type="button" data-nav="signup">
                  <span>Start Solo Trial</span>
                </button>
              </div>
            </article>

            <article class="ff-l-bezel-outer ff-l-price-outer ff-l-price-featured-outer">
              <div class="ff-l-bezel-inner ff-l-price-card ff-l-price-featured">
                <div class="ff-l-price-head-row">
                  <span class="ff-l-price-tier">Multi-Bay Studio</span>
                  <span class="badge badge-active">Most Adopted</span>
                </div>
                <div class="ff-l-price-amount"><strong class="mono-val">$79</strong><span>/month</span></div>
                <p>Complete bench telemetry, FIFO bin inventory, and smart locker integration.</p>
                <ul class="ff-l-price-list">
                  <li>${raw(iconSvg("check", 14))} Up to 12 technician & counter seats</li>
                  <li>${raw(iconSvg("check", 14))} Courier & mobile van dispatch map</li>
                  <li>${raw(iconSvg("check", 14))} Bin-level FIFO stock allocation</li>
                  <li>${raw(iconSvg("check", 14))} GDPR Article 17 archive & erasure</li>
                </ul>
                <button class="ff-l-pill-cta ff-l-full-btn ff-l-price-btn" type="button" data-nav="signup">
                  <span>Deploy Studio Plan</span>
                  <span class="ff-l-cta-disc">${raw(iconSvg("chevronRight", 14))}</span>
                </button>
              </div>
            </article>

            <article class="ff-l-bezel-outer ff-l-price-outer">
              <div class="ff-l-bezel-inner ff-l-price-card">
                <div class="ff-l-price-tier">Regional Fleet</div>
                <div class="ff-l-price-amount"><strong class="mono-val">$189</strong><span>/month</span></div>
                <p>Multi-warehouse routing, custom webhook pipelines, and dedicated SLA support.</p>
                <ul class="ff-l-price-list">
                  <li>${raw(iconSvg("check", 14))} Unlimited seats & bench stations</li>
                  <li>${raw(iconSvg("check", 14))} Cross-city depot parts transfers</li>
                  <li>${raw(iconSvg("check", 14))} Custom ERP & ERP-sync webhooks</li>
                  <li>${raw(iconSvg("check", 14))} Priority migration engineering</li>
                </ul>
                <button class="ff-l-secondary-pill ff-l-full-btn ff-l-price-btn" type="button" data-nav="signup">
                  <span>Configure Fleet</span>
                </button>
              </div>
            </article>
          </div>
        </section>

        <!-- Side-by-Side Split FAQ -->
        <section class="ff-l-section ff-l-reveal">
          <div class="ff-l-faq-split">
            <div class="ff-l-faq-sticky">
              <span class="ff-l-tag">Technical Q&A</span>
              <h2>Answers for shop owners and compliance leads.</h2>
              <p>Everything about importing legacy CSV tickets, offline reliability, and GDPR customer deletion without breaking accounting ledgers.</p>
            </div>

            <div class="ff-l-faq-list">
              <details class="ff-l-faq-item" open>
                <summary>
                  <span>How does FixFlow handle GDPR deletion without corrupting invoices?</span>
                  <span class="ff-l-faq-plus">+</span>
                </summary>
                <p>Under Article 17 erasure, personal names, emails, and phone numbers are cryptographically scrubbed while anonymized invoice totals, tax timestamps, and hardware serial repair logs stay intact for statutory bookkeeping.</p>
              </details>
              <details class="ff-l-faq-item">
                <summary>
                  <span>Does the 3D intake stage require external hardware or WebGL plugins?</span>
                  <span class="ff-l-faq-plus">+</span>
                </summary>
                <p>No extra plugins or downloads are needed. The 3D inspection model runs natively in the browser across desktop benches and rugged tablets, syncing directly with standard barcode scanners.</p>
              </details>
              <details class="ff-l-faq-item">
                <summary>
                  <span>Can field vans update repairs when cellular coverage drops?</span>
                  <span class="ff-l-faq-plus">+</span>
                </summary>
                <p>Yes. Every status step, thermal photo note, and signature queues locally and merges deterministically once connectivity returns—zero duplicate work orders.</p>
              </details>
              <details class="ff-l-faq-item">
                <summary>
                  <span>How fast can we migrate from spreadsheets or RepairShopr?</span>
                  <span class="ff-l-faq-plus">+</span>
                </summary>
                <p>Upload your open tickets and SKU inventory CSV during workspace onboarding. Most single-location shops go live with QR locker labels in under 25 minutes.</p>
              </details>
            </div>
          </div>
        </section>

        <!-- Bottom CTA & Grounded Footer -->
        <section class="ff-l-section ff-l-reveal">
          <div class="ff-l-bezel-outer">
            <div class="ff-l-cta-banner">
              <div>
                <span class="ff-l-tag">Ready to launch</span>
                <h2>Move your workshop into three dimensions today.</h2>
                <p>Start a live sandbox environment in seconds, test customer intake, or inspect the GDPR compliance console right away.</p>
              </div>
              <div class="ff-l-cta-banner-actions">
                <button class="ff-l-pill-cta ff-l-pill-cta-lg" type="button" data-nav="signup">
                  <span>Create Workspace</span>
                  <span class="ff-l-cta-disc">${raw(iconSvg("chevronRight", 15))}</span>
                </button>
                <button class="ff-l-secondary-pill" type="button" data-nav="gdpr-admin">
                  ${raw(iconSvg("shield", 15))}
                  <span>GDPR Console</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <footer class="ff-l-footer">
          <div class="ff-l-footer-inner">
            <div class="ff-l-footer-brand">
              <div class="ff-l-brand">
                <div class="brand-mark">F</div>
                <span class="brand-name">FixFlow</span>
              </div>
              <p>Spatial Repair Operations & GDPR Compliance Suite.</p>
            </div>
            <div class="ff-l-footer-links">
              <button type="button" data-nav="request-service">Customer Intake</button>
              <button type="button" data-nav="customer-portal">Status Portal</button>
              <button type="button" data-nav="gdpr-admin">GDPR Console</button>
              <button type="button" data-nav="login">Sign In</button>
              <button type="button" data-nav="signup">Create Account</button>
            </div>
            <div class="ff-l-footer-copy mono-val">FixFlow Systems · 2026</div>
          </div>
        </footer>
      </div>
    `;
  },

  mount(root) {
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let raf3dId = null;
    let rafFilmId = null;

    // 1. Theme Switcher inside Fluid Island Navbar
    const themeBtn = root.querySelector("#btn-landing-theme");
    const themeIconSlot = root.querySelector("#landing-theme-icon");
    themeBtn?.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("fixflow.theme", next);
      if (themeIconSlot) {
        themeIconSlot.innerHTML = iconSvg(next === "dark" ? "sun" : "moon", 15);
      }
      store.notify?.();
    });

    // 2. Smooth anchor scroll & CTA jump
    root.querySelectorAll('.ff-l-nav-links a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = root.querySelector(link.getAttribute("href"));
        target?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      });
    });

    root.querySelector("#btn-hero-demo")?.addEventListener("click", () => {
      root.querySelector("#ff-simulator")?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });

    // 3. Scroll Reveal Observer
    const revealEls = root.querySelectorAll(".ff-l-reveal");
    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    } else {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      revealEls.forEach((el) => obs.observe(el));
    }

    // 4. Interactive 3D Hardware & Telemetry Engine (#hero-3d-canvas)
    const canvas3d = root.querySelector("#hero-3d-canvas");
    const viewport3d = root.querySelector("#hero-3d-viewport");
    const hudCode = root.querySelector("#hud-layer-code");
    const hudTitle = root.querySelector("#hud-layer-title");
    const hudMetric = root.querySelector("#hud-layer-metric");
    const hudNote = root.querySelector("#hud-layer-note");
    const explodeBtn = root.querySelector("#btn-3d-explode");
    const resetBtn = root.querySelector("#btn-3d-reset");
    const explodeSlider = root.querySelector("#slider-3d-explode");
    const layerButtons = root.querySelectorAll(".ff-l-layer-btn");

    if (canvas3d && viewport3d) {
      const ctx = canvas3d.getContext("2d");
      let yaw = -0.58;
      let pitch = 0.42;
      let targetYaw = -0.58;
      let targetPitch = 0.42;
      let explodeAmt = 0.78;
      let targetExplode = 0.78;
      let activeLayer = "all";
      let dragging = false;
      let lastPtrX = 0;
      let lastPtrY = 0;
      let time3d = 0;

      const drawPoly = (pts, fillStyle, strokeStyle, lineWidth = 1.4) => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        if (fillStyle) {
          ctx.fillStyle = fillStyle;
          ctx.fill();
        }
        if (strokeStyle) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      };

      const render3D = () => {
        if (!document.body.contains(root)) return;
        const w = canvas3d.width;
        const h = canvas3d.height;
        const cx = w * 0.5;
        const cy = h * 0.5;
        const pal = getThemePalette();

        if (!prefersReducedMotion) time3d += 0.016;
        if (!dragging && !prefersReducedMotion) {
          targetYaw += 0.0022;
        }
        yaw += (targetYaw - yaw) * 0.09;
        pitch += (targetPitch - pitch) * 0.09;
        explodeAmt += (targetExplode - explodeAmt) * 0.1;

        ctx.clearRect(0, 0, w, h);

        // Orbital Calibration Grid Floor
        const floorY = 145;
        ctx.strokeStyle = pal.grid;
        ctx.lineWidth = 1;
        for (let gx = -220; gx <= 220; gx += 44) {
          const p1 = projectPoint(gx, floorY, -220, yaw, pitch, cx, cy, 1);
          const p2 = projectPoint(gx, floorY, 220, yaw, pitch, cx, cy, 1);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        for (let gz = -220; gz <= 220; gz += 44) {
          const p1 = projectPoint(-220, floorY, gz, yaw, pitch, cx, cy, 1);
          const p2 = projectPoint(220, floorY, gz, yaw, pitch, cx, cy, 1);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        // Orbital Telemetry Ring
        ctx.beginPath();
        for (let deg = 0; deg <= 360; deg += 8) {
          const rad = (deg * Math.PI) / 180;
          const p = projectPoint(Math.cos(rad) * 205, 8, Math.sin(rad) * 205, yaw, pitch, cx, cy, 1);
          if (deg === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = pal.wireMuted;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        const sep = 14 + explodeAmt * 64;
        const proj = (x, y, z) => projectPoint(x, y, z, yaw, pitch, cx, cy, 1.05);

        // Define hardware planes sorted by rotated center depth
        const layers = [
          {
            id: "chassis",
            y: sep * 1.45,
            draw: (alpha) => {
              ctx.save();
              ctx.globalAlpha = alpha;
              const y = sep * 1.45;
              const top = [proj(-155, y, -108), proj(155, y, -108), proj(155, y, 108), proj(-155, y, 108)];
              const bot = [proj(-155, y + 16, -108), proj(155, y + 16, -108), proj(155, y + 16, 108), proj(-155, y + 16, 108)];
              drawPoly(bot, pal.surfaceFill, pal.wireMuted, 1);
              drawPoly(top, pal.surfaceFill, pal.wire, 1.6);
              // Trackpad cutout
              const tp = [proj(-54, y - 1, 36), proj(54, y - 1, 36), proj(54, y - 1, 96), proj(-54, y - 1, 96)];
              drawPoly(tp, null, pal.wireMuted, 1.1);
              ctx.restore();
            },
          },
          {
            id: "power",
            y: sep * 0.48,
            draw: (alpha) => {
              ctx.save();
              ctx.globalAlpha = alpha;
              const y = sep * 0.48;
              const plate = [proj(-140, y, -92), proj(140, y, -92), proj(140, y, 92), proj(-140, y, 92)];
              drawPoly(plate, pal.surfaceFill, activeLayer === "power" ? pal.accentBright : pal.wire, 1.3);

              // 3 Li-Ion Battery Cells
              for (let c = -1; c <= 1; c++) {
                const bx0 = c * 84 - 36;
                const bx1 = c * 84 + 36;
                const cell = [proj(bx0, y - 4, 24), proj(bx1, y - 4, 24), proj(bx1, y - 4, 82), proj(bx0, y - 4, 82)];
                drawPoly(cell, pal.accentFill, pal.accent, 1.3);
              }

              // Dual Radial Cooling Blowers
              [-76, 76].forEach((fx) => {
                ctx.beginPath();
                for (let a = 0; a <= 360; a += 18) {
                  const rad = (a * Math.PI) / 180;
                  const p = proj(fx + Math.cos(rad) * 32, y - 3, -46 + Math.sin(rad) * 32);
                  if (a === 0) ctx.moveTo(p.x, p.y);
                  else ctx.lineTo(p.x, p.y);
                }
                ctx.strokeStyle = pal.wire;
                ctx.lineWidth = 1.2;
                ctx.stroke();

                for (let b = 0; b < 6; b++) {
                  const ang = time3d * 2.8 + (b * Math.PI) / 3;
                  const p0 = proj(fx, y - 3, -46);
                  const p1 = proj(fx + Math.cos(ang) * 28, y - 3, -46 + Math.sin(ang) * 28);
                  ctx.beginPath();
                  ctx.moveTo(p0.x, p0.y);
                  ctx.lineTo(p1.x, p1.y);
                  ctx.strokeStyle = pal.accent;
                  ctx.stroke();
                }
              });
              ctx.restore();
            },
          },
          {
            id: "board",
            y: -sep * 0.42,
            draw: (alpha) => {
              ctx.save();
              ctx.globalAlpha = alpha;
              const y = -sep * 0.42;
              const pcb = [proj(-134, y, -80), proj(134, y, -80), proj(134, y, 24), proj(-134, y, 24)];
              drawPoly(pcb, pal.surfaceFill, activeLayer === "board" ? pal.accentBright : pal.accent, 1.6);

              // Main SoC Die Cube (raised)
              const socTop = [proj(-26, y - 12, -52), proj(26, y - 12, -52), proj(26, y - 12, -4), proj(-26, y - 12, -4)];
              const socBase = [proj(-26, y, -52), proj(26, y, -52), proj(26, y, -4), proj(-26, y, -4)];
              drawPoly(socBase, pal.accentFill, pal.accent, 1);
              drawPoly(socTop, pal.accentFill, pal.accentBright, 1.5);
              for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(socBase[i].x, socBase[i].y);
                ctx.lineTo(socTop[i].x, socTop[i].y);
                ctx.strokeStyle = pal.accent;
                ctx.stroke();
              }

              // Signal Trace Busbars
              [
                [-120, -64, -30, -64],
                [-120, -40, -30, -40],
                [30, -48, 120, -48],
                [30, -24, 120, -24],
              ].forEach(([x0, z0, x1, z1]) => {
                const a = proj(x0, y - 1, z0);
                const b = proj(x1, y - 1, z1);
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = pal.wire;
                ctx.lineWidth = 1.2;
                ctx.stroke();
              });

              // U7800 PMIC Thermal Hotspot Marker
              const hot = proj(78, y - 6, -12);
              const pulseR = 10 + Math.sin(time3d * 4) * 4;
              ctx.beginPath();
              ctx.arc(hot.x, hot.y, pulseR, 0, Math.PI * 2);
              ctx.fillStyle = pal.amberFill;
              ctx.fill();
              ctx.strokeStyle = pal.amber;
              ctx.lineWidth = 1.5;
              ctx.stroke();

              ctx.fillStyle = pal.text;
              ctx.font = '600 12px "Geist Mono", monospace';
              ctx.fillText("U7800 · 74.2C", hot.x + 14, hot.y + 4);
              ctx.restore();
            },
          },
          {
            id: "display",
            y: -sep * 1.48,
            draw: (alpha) => {
              ctx.save();
              ctx.globalAlpha = alpha;
              const y = -sep * 1.48;
              const glass = [proj(-148, y, -100), proj(148, y, -100), proj(148, y, 100), proj(-148, y, 100)];
              drawPoly(glass, pal.accentFill, activeLayer === "display" ? pal.accentBright : pal.wire, 1.6);

              // Inner Active Viewport Frame
              const inner = [proj(-134, y, -86), proj(134, y, -86), proj(134, y, 86), proj(-134, y, 86)];
              drawPoly(inner, null, pal.accent, 1);

              // Moving Optical Laser Scan Line across display
              const scanZ = -80 + ((Math.sin(time3d * 1.5) + 1) * 0.5) * 160;
              const sL = proj(-134, y - 1, scanZ);
              const sR = proj(134, y - 1, scanZ);
              ctx.beginPath();
              ctx.moveTo(sL.x, sL.y);
              ctx.lineTo(sR.x, sR.y);
              ctx.strokeStyle = pal.accentBright;
              ctx.lineWidth = 2;
              ctx.stroke();

              // 4 Corner Registration Marks
              [
                [-142, -94],
                [142, -94],
                [142, 94],
                [-142, 94],
              ].forEach(([rx, rz]) => {
                const cp = proj(rx, y - 2, rz);
                ctx.beginPath();
                ctx.arc(cp.x, cp.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = pal.accentBright;
                ctx.fill();
              });
              ctx.restore();
            },
          },
        ];

        // Vertical Z-alignment guide pillars connecting the 4 corners when exploded
        if (explodeAmt > 0.08) {
          ctx.strokeStyle = pal.wireMuted;
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1;
          [
            [-148, -100],
            [148, -100],
            [148, 100],
            [-148, 100],
          ].forEach(([px, pz]) => {
            const topP = proj(px, -sep * 1.48, pz);
            const botP = proj(px, sep * 1.45, pz);
            ctx.beginPath();
            ctx.moveTo(topP.x, topP.y);
            ctx.lineTo(botP.x, botP.y);
            ctx.stroke();
          });
          ctx.setLineDash([]);
        }

        // Depth sort back-to-front by center Z after rotation
        layers.sort((a, b) => proj(0, b.y, 0).z - proj(0, a.y, 0).z);
        layers.forEach((layer) => {
          const dim =
            activeLayer === "all" || activeLayer === layer.id || (activeLayer === "power" && layer.id === "chassis")
              ? 1
              : 0.24;
          layer.draw(dim);
        });

        raf3dId = requestAnimationFrame(render3D);
      };

      // Pointer drag & mouse orbit interaction
      viewport3d.addEventListener("pointerdown", (e) => {
        dragging = true;
        lastPtrX = e.clientX;
        lastPtrY = e.clientY;
        viewport3d.setPointerCapture?.(e.pointerId);
      });
      viewport3d.addEventListener("pointermove", (e) => {
        if (dragging) {
          const dx = e.clientX - lastPtrX;
          const dy = e.clientY - lastPtrY;
          lastPtrX = e.clientX;
          lastPtrY = e.clientY;
          targetYaw += dx * 0.009;
          targetPitch = Math.max(-0.9, Math.min(1.15, targetPitch + dy * 0.007));
        }
      });
      const stopDrag = () => {
        dragging = false;
      };
      viewport3d.addEventListener("pointerup", stopDrag);
      viewport3d.addEventListener("pointercancel", stopDrag);

      explodeSlider?.addEventListener("input", (e) => {
        targetExplode = Number(e.target.value) / 100;
        explodeBtn?.classList.toggle("active", targetExplode > 0.35);
      });

      explodeBtn?.addEventListener("click", () => {
        const isExploded = targetExplode > 0.35;
        targetExplode = isExploded ? 0 : 0.85;
        if (explodeSlider) explodeSlider.value = String(Math.round(targetExplode * 100));
        explodeBtn.classList.toggle("active", !isExploded);
      });

      resetBtn?.addEventListener("click", () => {
        targetYaw = -0.58;
        targetPitch = 0.42;
        targetExplode = 0.78;
        if (explodeSlider) explodeSlider.value = "78";
        explodeBtn?.classList.add("active");
      });

      layerButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          activeLayer = btn.dataset.layer || "all";
          layerButtons.forEach((b) => b.classList.toggle("active", b === btn));
          const info = LAYER_INFO[activeLayer] || LAYER_INFO.all;
          if (hudCode) hudCode.textContent = info.code;
          if (hudTitle) hudTitle.textContent = info.title;
          if (hudMetric) hudMetric.textContent = info.metric;
          if (hudNote) hudNote.textContent = info.note;

          if (activeLayer === "board") {
            targetPitch = 0.56;
            targetExplode = 0.9;
          } else if (activeLayer === "display") {
            targetPitch = 0.36;
          } else if (activeLayer === "power") {
            targetPitch = 0.48;
            targetExplode = 0.92;
          }
          if (explodeSlider) explodeSlider.value = String(Math.round(targetExplode * 100));
        });
      });

      raf3dId = requestAnimationFrame(render3D);
    }

    // 5. Specular Pointer Sheen on 3D Bento Cards
    root.querySelectorAll(".ff-l-tilt-card").forEach((card) => {
      if (prefersReducedMotion) return;
      card.addEventListener("pointermove", (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * 5;
        const ry = (px - 0.5) * 6;
        card.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
        card.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
        card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });

    // Interactive rail chips inside Bento Card 1
    root.querySelectorAll(".ff-l-rail-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        root.querySelectorAll(".ff-l-rail-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
      });
    });

    // 6. 4K 3D Telemetry Product Film Engine (#film-canvas)
    const filmCanvas = root.querySelector("#film-canvas");
    if (filmCanvas) {
      const fctx = filmCanvas.getContext("2d");
      const posterOverlay = root.querySelector("#poster-overlay");
      const btnBigPlay = root.querySelector("#btn-big-play");
      const btnPlayPause = root.querySelector("#btn-play-pause");
      const playLabel = root.querySelector("#play-pause-label");
      const playIcon = root.querySelector("#play-pause-icon");
      const scrubber = root.querySelector("#video-scrubber");
      const scrubProg = root.querySelector("#scrubber-progress");
      const timeDisplay = root.querySelector("#timecode-display");
      const chapterPill = root.querySelector("#video-chapter-pill");
      const speedBtn = root.querySelector("#btn-speed-toggle");
      const speedLabel = root.querySelector("#speed-label");
      const soundBtn = root.querySelector("#btn-sound-toggle");
      const soundWave = root.querySelector("#sound-wave");
      const soundLabel = root.querySelector("#sound-label");
      const theaterBtn = root.querySelector("#btn-theater-toggle");
      const playerBox = root.querySelector("#ff-player-container");
      const chapterBtns = root.querySelectorAll(".ff-l-chapter-bezel");

      let playing = false;
      let elapsed = 0;
      const DURATION = 150;
      let speed = 1.0;
      let muted = false;
      let lastTs = 0;
      let audioCtx = null;

      const playTone = (freq = 440, dur = 0.08) => {
        if (muted || typeof AudioContext === "undefined") return;
        try {
          audioCtx = audioCtx || new AudioContext();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + dur);
        } catch {
          // Ignore audio context autoplay blocks
        }
      };

      const renderFilmFrame = (t) => {
        const w = filmCanvas.width;
        const h = filmCanvas.height;
        fctx.fillStyle = "#090d10";
        fctx.fillRect(0, 0, w, h);

        // Determine current chapter
        const ch = CHAPTERS.find((c) => t >= c.start && t < c.end) || CHAPTERS[CHAPTERS.length - 1];
        if (chapterPill) chapterPill.textContent = ch.pill;
        chapterBtns.forEach((b) => b.classList.toggle("active", Number(b.dataset.chapter) === ch.id));

        // Ambient radial teal spotlight
        const grad = fctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.45, 420);
        grad.addColorStop(0, "rgba(63, 191, 174, 0.18)");
        grad.addColorStop(1, "rgba(9, 13, 16, 0)");
        fctx.fillStyle = grad;
        fctx.fillRect(0, 0, w, h);

        // Projected 3D spinning wireframe cube / chassis prism
        const yawF = t * 0.65;
        const pitchF = 0.42 + Math.sin(t * 0.4) * 0.14;
        const pr = (x, y, z) => projectPoint(x, y, z, yawF, pitchF, w * 0.62, h * 0.5, 1.15);

        const cube = [
          pr(-120, -65, -80),
          pr(120, -65, -80),
          pr(120, -65, 80),
          pr(-120, -65, 80),
          pr(-120, 65, -80),
          pr(120, 65, -80),
          pr(120, 65, 80),
          pr(-120, 65, 80),
        ];
        const edges = [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ];
        fctx.strokeStyle = ch.id === 3 ? "#5eead4" : "rgba(63, 191, 174, 0.72)";
        fctx.lineWidth = 1.8;
        edges.forEach(([a, b]) => {
          fctx.beginPath();
          fctx.moveTo(cube[a].x, cube[a].y);
          fctx.lineTo(cube[b].x, cube[b].y);
          fctx.stroke();
        });

        // Left Telemetry HUD Text inside Film
        fctx.fillStyle = "#5eead4";
        fctx.font = '600 13px "Geist Mono", monospace';
        fctx.fillText(ch.pill.toUpperCase(), 56, 128);
        fctx.fillStyle = "#fafafa";
        fctx.font = '700 32px "Geist", sans-serif';
        fctx.fillText(ch.title, 56, 176);
        fctx.fillStyle = "#a1a1aa";
        fctx.font = '400 16px "Geist", sans-serif';
        fctx.fillText(ch.desc.slice(0, 56), 56, 214);
        if (ch.desc.length > 56) fctx.fillText(ch.desc.slice(56), 56, 238);

        // Progress Telemetry Strip at bottom of Canvas
        fctx.fillStyle = "rgba(255,255,255,0.08)";
        fctx.fillRect(56, h - 68, 280, 32);
        fctx.fillStyle = "#fafafa";
        fctx.font = '500 13px "Geist Mono", monospace';
        fctx.fillText(`FRAME ${(Math.floor(t * 60)).toString().padStart(4, "0")} · RAIL NOMINAL`, 70, h - 47);
      };

      const syncFilmUi = () => {
        const pct = Math.min(100, (elapsed / DURATION) * 100);
        if (scrubProg) scrubProg.style.width = `${pct.toFixed(2)}%`;
        if (timeDisplay) timeDisplay.textContent = `${formatTime(elapsed)} / ${formatTime(DURATION)}`;
        if (playLabel) playLabel.textContent = playing ? "Pause" : "Play";
        if (playIcon) playIcon.innerHTML = iconSvg(playing ? "clock" : "sparkles", 13);
        posterOverlay?.classList.toggle("hidden", playing || elapsed > 0.2);
      };

      const stepFilm = (ts) => {
        if (!document.body.contains(root)) return;
        if (!lastTs) lastTs = ts;
        const dt = Math.min(0.1, (ts - lastTs) / 1000);
        lastTs = ts;
        if (playing) {
          elapsed += dt * speed;
          if (elapsed >= DURATION) {
            elapsed = 0;
            playing = false;
          }
          renderFilmFrame(elapsed);
          syncFilmUi();
        }
        rafFilmId = requestAnimationFrame(stepFilm);
      };

      const togglePlay = () => {
        playing = !playing;
        lastTs = 0;
        if (playing) playTone(528, 0.09);
        renderFilmFrame(elapsed);
        syncFilmUi();
      };

      btnBigPlay?.addEventListener("click", togglePlay);
      btnPlayPause?.addEventListener("click", togglePlay);

      scrubber?.addEventListener("click", (e) => {
        const rect = scrubber.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        elapsed = ratio * DURATION;
        renderFilmFrame(elapsed);
        syncFilmUi();
      });

      chapterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const ch = CHAPTERS[Number(btn.dataset.chapter) || 0];
          elapsed = ch.start + 0.3;
          playing = true;
          lastTs = 0;
          playTone(620, 0.08);
          renderFilmFrame(elapsed);
          syncFilmUi();
        });
      });

      speedBtn?.addEventListener("click", () => {
        speed = speed === 1.0 ? 1.5 : speed === 1.5 ? 2.0 : 1.0;
        if (speedLabel) speedLabel.textContent = `${speed.toFixed(1)}x`;
      });

      soundBtn?.addEventListener("click", () => {
        muted = !muted;
        soundWave?.classList.toggle("muted", muted);
        if (soundLabel) soundLabel.textContent = muted ? "Muted" : "Audio On";
      });

      theaterBtn?.addEventListener("click", () => {
        playerBox?.classList.toggle("theater-mode");
      });

      renderFilmFrame(0);
      syncFilmUi();
      rafFilmId = requestAnimationFrame(stepFilm);
    }

    // 7. Interactive 5-Stage Workstation Simulator
    let curStep = 0;
    const simBadge = root.querySelector("#sim-badge");
    const simCost = root.querySelector("#sim-cost");
    const simFill = root.querySelector("#sim-progress-fill");
    const simStepTitle = root.querySelector("#sim-step-title");
    const simStepDesc = root.querySelector("#sim-step-desc");
    const simLog = root.querySelector("#sim-log-stream");
    const simTabs = root.querySelectorAll(".ff-l-step-tab");

    const setSimStep = (idx) => {
      curStep = idx % WORKFLOW_STEPS.length;
      const d = WORKFLOW_STEPS[curStep];
      if (simBadge) {
        simBadge.textContent = `${d.pct}% · ${d.badge}`;
        simBadge.className = `badge ${d.badgeClass}`;
      }
      if (simCost) simCost.textContent = d.cost;
      if (simFill) simFill.style.width = `${d.pct}%`;
      if (simStepTitle) simStepTitle.textContent = d.title;
      if (simStepDesc) simStepDesc.textContent = d.desc;
      if (simLog) {
        simLog.innerHTML = `<div class="ff-l-log-line mono-val">${d.log}</div>`;
      }
      simTabs.forEach((tab, i) => tab.classList.toggle("active", i === curStep));
    };

    simTabs.forEach((tab, i) => tab.addEventListener("click", () => setSimStep(i)));
    root.querySelector("#btn-sim-next")?.addEventListener("click", () => setSimStep(curStep + 1));
    root.querySelector("#btn-sim-invoice")?.addEventListener("click", () => {
      setSimStep(4);
      toast("Invoice INV-2026-089 dispatched", "Payment link & Locker #03 PIN queued via SMS and email.", "success");
    });

    // 8. Live Job Tracker Lookup
    const trInput = root.querySelector("#tracker-input");
    const trIdEl = root.querySelector("#tr-job-id");
    const trDevEl = root.querySelector("#tr-device");
    const trMetaEl = root.querySelector("#tr-meta");
    const trStatusEl = root.querySelector("#tr-status");
    const trEtaEl = root.querySelector("#tr-eta");
    const trMilesEl = root.querySelector("#tr-milestones");
    const sampleChips = root.querySelectorAll(".ff-l-sample-chip");

    const showJob = (rawId) => {
      const id = String(rawId || "").trim().toUpperCase();
      const job = TRACKER_DATA[id];
      if (!job) {
        toast("Ticket not in demo sample", "Try JOB-1042, JOB-1088, or JOB-2015.", "warning");
        return;
      }
      if (trInput) trInput.value = id;
      if (trIdEl) trIdEl.textContent = id;
      if (trDevEl) trDevEl.textContent = job.device;
      if (trMetaEl) trMetaEl.textContent = `Customer: ${job.customer} · Tech: ${job.tech}`;
      if (trStatusEl) {
        trStatusEl.textContent = job.status;
        trStatusEl.className = `badge ${job.badgeCls}`;
      }
      if (trEtaEl) trEtaEl.innerHTML = `${iconSvg("clock", 14)} <span>${job.eta}</span>`;
      if (trMilesEl) trMilesEl.innerHTML = job.milestones.map((m) => `<li class="mono-val">${m}</li>`).join("");
      sampleChips.forEach((c) => c.classList.toggle("active", c.dataset.job === id));
    };

    root.querySelector("#btn-track-lookup")?.addEventListener("click", () => showJob(trInput?.value));
    trInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") showJob(trInput.value);
    });
    sampleChips.forEach((c) => c.addEventListener("click", () => showJob(c.dataset.job)));

    // Keep cleanup reference for route transitions
    this._cleanup = () => {
      if (raf3dId) cancelAnimationFrame(raf3dId);
      if (rafFilmId) cancelAnimationFrame(rafFilmId);
    };
  },
};
