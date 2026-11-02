// Repair photos — before/after evidence captured at intake, in the workshop, or
// by the customer, with the option to use the camera or upload existing images.
//
// Photos are embedded on the job record as downscaled JPEG data URLs. The store
// is schemaless jsonb (see supabase/schema.sql) so this needs no migration, works
// offline and rides the existing upsert/prune sync. The cost is size, so every
// image is re-encoded client-side under `MAX_PHOTO_BYTES` and the whole dataset is
// kept inside `BUDGET_BYTES` — localStorage is ~5 MB per origin and, unlike a
// network failure, a quota error is not retryable.
//
// The pure helpers below (bytesOf/photosOf/photoStats/canAdd/formatBytes) hold no
// DOM references so they can be unit tested under Node.

import { html } from "./markup.js";
import { store, mutate, logAudit, id as uid } from "./store.js";
import { toast, modal, closeModal, iconSvg, timeAgo } from "./util.js";

export const STAGES = ["before", "after"];
export const STAGE_LABEL = { before: "Before", after: "After" };
export const MAX_EDGE = 1200;              // longest edge after downscale, px
export const QUALITY = 0.7;                // starting JPEG quality
export const MIN_QUALITY = 0.4;            // floor when re-encoding oversized frames
export const MAX_PHOTO_BYTES = 300 * 1024; // per stored photo
export const MAX_PER_STAGE = 8;
export const BUDGET_BYTES = 4 * 1024 * 1024; // all photos, all jobs
export const MAX_INPUT_BYTES = 25 * 1024 * 1024; // source file ceiling, before decode
export const MAX_INPUT_PIXELS = 50e6;            // ~50 MP: bounds decode memory

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

// Decoded byte length of a base64 data URL, without decoding it.
export function bytesOf(dataUrl) {
  if (typeof dataUrl !== "string") return 0;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  const b64 = dataUrl.slice(comma + 1).replace(/\s+/g, "");
  if (!b64) return 0;
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
}

export function photosOf(job, stage) {
  const list = Array.isArray(job?.photos) ? job.photos.filter((p) => p && p.dataUrl) : [];
  return stage ? list.filter((p) => p.stage === stage) : list;
}

export function photoStats(job) {
  const list = photosOf(job);
  let bytes = 0;
  let before = 0;
  let after = 0;
  for (const p of list) {
    bytes += typeof p.bytes === "number" ? p.bytes : bytesOf(p.dataUrl);
    if (p.stage === "before") before++;
    else if (p.stage === "after") after++;
  }
  return { count: list.length, before, after, bytes };
}

export function totalPhotoBytes(jobs) {
  return (jobs || []).reduce((n, j) => n + photoStats(j).bytes, 0);
}

export function canAdd(job, stage) {
  const stats = photoStats(job);
  const n = stage === "after" ? stats.after : stats.before;
  if (n >= MAX_PER_STAGE) return { ok: false, reason: `${MAX_PER_STAGE} ${STAGE_LABEL[stage].toLowerCase()} photos is the limit` };
  return { ok: true, reason: "" };
}

export function hasPair(job) {
  const s = photoStats(job);
  return s.before > 0 && s.after > 0;
}

export function formatBytes(n) {
  if (!n) return "0 KB";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Guardrails for a source file, applied before any decode work happens. SVG is
// refused: it can carry script and external references, and it never round-trips
// through the JPEG pipeline. The size ceiling bounds what a decode can ask for.
export function acceptsFile(file) {
  const type = String(file?.type || "");
  if (!type.startsWith("image/") || type === "image/svg+xml") return { ok: false, reason: "unsupported" };
  if (Number(file?.size || 0) > MAX_INPUT_BYTES) return { ok: false, reason: "too-big" };
  return { ok: true, reason: "" };
}

// ---------------------------------------------------------------------------
// Capture — decode, downscale, re-encode
// ---------------------------------------------------------------------------

async function decode(file) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file); } catch { /* fall through to <img> */ }
  }
  // Read as a data URL rather than an object URL: the CSP allows `img-src data:`
  // but not `blob:`.
  const src = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("unreadable"));
    reader.readAsDataURL(file);
  });
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable"));
    img.src = src;
  });
}

// Re-encodes to JPEG, shrinking and lowering quality until it fits the budget.
async function downscale(file, { maxEdge = MAX_EDGE, quality = QUALITY } = {}) {
  const src = await decode(file);
  const sw = src.width || 0;
  const sh = src.height || 0;
  if (!sw || !sh) { if (src.close) src.close(); throw new Error("unreadable"); }
  if (sw * sh > MAX_INPUT_PIXELS) { if (src.close) src.close(); throw new Error("too-many-pixels"); }

  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  let w = Math.max(1, Math.round(sw * scale));
  let h = Math.max(1, Math.round(sh * scale));
  let q = quality;
  let dataUrl = "";
  let oversized = false;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  for (let attempt = 0; attempt < 6; attempt++) {
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = "#ffffff";              // JPEG has no alpha; avoid black backgrounds
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(src, 0, 0, w, h);
    dataUrl = canvas.toDataURL("image/jpeg", q);
    if (bytesOf(dataUrl) <= MAX_PHOTO_BYTES) break;
    oversized = attempt === 5;
    q = Math.max(MIN_QUALITY, q - 0.1);
    w = Math.max(1, Math.round(w * 0.85));
    h = Math.max(1, Math.round(h * 0.85));
  }
  if (src.close) src.close();
  return { dataUrl, w: canvas.width, h: canvas.height, oversized };
}

function makePhoto({ dataUrl, w, h, bytes, oversized }, { stage, name, source, by }) {
  return {
    id: uid("PHO"),
    stage,
    name: name || "capture.jpg",
    mime: "image/jpeg",
    w, h,
    bytes: bytes ?? bytesOf(dataUrl),
    dataUrl,
    source,
    oversized: Boolean(oversized),
    at: new Date().toISOString(),
    by: by || store.session?.user || "Admin User",
  };
}

export async function fileToPhoto(file, { stage = "before", source = "upload", by } = {}) {
  const shot = await downscale(file);
  return makePhoto({ ...shot, bytes: bytesOf(shot.dataUrl) }, { stage, name: file?.name, source, by });
}

function picker({ stage, capture = false, multiple = true, onFiles }) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  if (multiple) input.multiple = true;
  if (capture) input.setAttribute("capture", "environment"); // opens the rear camera on mobile
  input.style.display = "none";
  document.body.appendChild(input);
  input.addEventListener("change", () => {
    const files = Array.from(input.files || []);
    input.remove();
    if (files.length) onFiles(files);
  });
  input.click();
}

// Live camera: desktop webcams and in-page capture. Falls back to the native
// picker when getUserMedia is unavailable or the permission is refused.
export function openCamera({ stage = "before", by, onCapture }) {
  if (!navigator.mediaDevices?.getUserMedia) {
    picker({ stage, capture: true, multiple: false, onFiles: (f) => onCapture(f[0]) });
    return;
  }
  let stream = null;
  let facing = "environment";
  const overlay = modal({
    title: `Take ${STAGE_LABEL[stage].toLowerCase()} photo`,
    size: "narrow",
    body: html`<div class="cam-wrap">
      <video class="cam-video" autoplay playsinline muted></video>
      <div class="cam-frame" aria-hidden="true"></div>
      <div class="cam-status small muted">Starting camera…</div>
    </div>`,
    footer: html`<button class="btn btn-secondary btn-sm" id="cam-flip">${iconSvg("swap", 14)} Flip</button>
      <span class="spacer"></span>
      <button class="btn btn-secondary" data-close>Cancel</button>
      <button class="btn btn-primary" id="cam-shot">${iconSvg("camera", 14)} Capture</button>`,
  });
  const video = overlay.querySelector(".cam-video");
  const status = overlay.querySelector(".cam-status");
  const shotBtn = overlay.querySelector("#cam-shot");

  const stop = () => { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } };
  const fail = (msg) => {
    stop();
    if (status) status.innerHTML = String(html`${msg}`);
    if (shotBtn) shotBtn.disabled = true;
  };
  const start = async () => {
    stop();
    if (status) status.innerHTML = String(html`Starting camera…`);
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      video.srcObject = stream;
      if (shotBtn) shotBtn.disabled = false;
      if (status) status.innerHTML = String(html`Frame the device, then capture.`);
    } catch (e) {
      fail(e?.name === "NotAllowedError"
        ? "Camera permission was blocked — upload a photo instead."
        : "No camera available — upload a photo instead.");
    }
  };

  const capture = async () => {
    if (!video.videoWidth) return;
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
    stop();
    closeModal();
    await onCapture(makePhoto(
      { dataUrl, w: canvas.width, h: canvas.height, bytes: bytesOf(dataUrl) },
      { stage, source: "camera", by, name: `camera-${Date.now()}.jpg` },
    ));
  };

  overlay.querySelector("#cam-flip")?.addEventListener("click", () => { facing = facing === "environment" ? "user" : "environment"; start(); });
  shotBtn?.addEventListener("click", capture);
  overlay.addEventListener("click", (e) => { if (e.target === overlay || e.target.closest("[data-close]")) stop(); });
  document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { stop(); document.removeEventListener("keydown", esc); } });
  const root = document.getElementById("modal-root");
  if (root) {
    const obs = new MutationObserver(() => { if (!overlay.isConnected) { obs.disconnect(); stop(); } });
    obs.observe(root, { childList: true });
  }
  start();
}

// ---------------------------------------------------------------------------
// Targets — a job record, or an unsaved intake draft
// ---------------------------------------------------------------------------

export const jobTarget = (id) => ({ kind: "job", id });
export const draftTarget = (photos = []) => ({ kind: "draft", photos });

const keyOf = (t) => (t.kind === "job" ? `job:${t.id}` : "draft");

function listOf(target, stage) {
  if (target.kind === "draft") return target.photos.filter((p) => p.dataUrl && (!stage || p.stage === stage));
  return photosOf(store.jobs.find((j) => j.id === target.id), stage);
}

function snapshot(target) {
  const list = listOf(target);
  let bytes = 0;
  let before = 0;
  let after = 0;
  for (const p of list) {
    bytes += typeof p.bytes === "number" ? p.bytes : bytesOf(p.dataUrl);
    if (p.stage === "before") before++;
    else if (p.stage === "after") after++;
  }
  return { count: list.length, before, after, bytes };
}

function full(target) {
  return { photos: listOf(target) };
}

function addPhotos(target, photos) {
  if (target.kind === "draft") {
    for (const p of photos) {
      if (target.photos.filter((x) => x.stage === p.stage).length >= MAX_PER_STAGE) break;
      target.photos.push(p);
    }
    return;
  }
  mutate((s) => {
    const job = s.jobs.find((j) => j.id === target.id);
    if (!job) return;
    if (!Array.isArray(job.photos)) job.photos = [];
    for (const p of photos) {
      if (job.photos.filter((x) => x.stage === p.stage).length >= MAX_PER_STAGE) break;
      job.photos.push(p);
    }
  });
  logAudit("updated", "Job", target.id, `${photos.length} ${STAGE_LABEL[photos[0].stage].toLowerCase()} photo(s) attached`);
}

function removePhoto(target, photoId) {
  if (target.kind === "draft") {
    const i = target.photos.findIndex((p) => p.id === photoId);
    if (i >= 0) target.photos.splice(i, 1);
    return;
  }
  mutate((s) => {
    const job = s.jobs.find((j) => j.id === target.id);
    if (job && Array.isArray(job.photos)) job.photos = job.photos.filter((p) => p.id !== photoId);
  });
  logAudit("updated", "Job", target.id, "Photo removed");
}

// Shared ingest for every entry point (camera, picker, drop, portal).
export async function ingest(target, stage, files, { source = "upload", by, onDone } = {}) {
  const offered = Array.from(files || []);
  const accepted = offered.filter((f) => acceptsFile(f).ok);
  if (!accepted.length) {
    const verdicts = offered.map((f) => acceptsFile(f).reason);
    const tooBig = verdicts.includes("too-big");
    const unsupported = verdicts.includes("unsupported");
    toast(
      tooBig ? "Image too large" : unsupported ? "Unsupported format" : "Not an image",
      tooBig ? `Choose a photo under ${formatBytes(MAX_INPUT_BYTES)}.`
        : unsupported ? "JPEG, PNG and WebP photos are supported."
          : "Choose a photo file to attach.",
      "error",
    );
    return [];
  }

  // Room is counted before any compression happens, so a multi-file selection can
  // never report more photos added than the stage actually accepted.
  const stats = snapshot(target);
  const room = MAX_PER_STAGE - (stage === "after" ? stats.after : stats.before);
  if (room <= 0) { toast("Limit reached", canAdd(full(target), stage).reason, "error"); return []; }
  const list = accepted.slice(0, room);
  if (accepted.length > room) {
    toast("Some photos skipped", `Only ${room} more ${STAGE_LABEL[stage].toLowerCase()} photo${room === 1 ? "" : "s"} fit in this stage.`, "info");
  }

  const saved = [];
  let failed = 0;
  for (const file of list) {
    try { saved.push(await fileToPhoto(file, { stage, source, by })); } catch { failed++; }
  }
  if (!saved.length) { toast("Could not read that image", "The file could not be decoded — try a JPEG or PNG.", "error"); return []; }

  const committed = totalPhotoBytes(store.jobs) + (target.kind === "draft" ? snapshot(target).bytes : 0);
  if (committed + saved.reduce((n, p) => n + p.bytes, 0) > BUDGET_BYTES) {
    toast("Photo storage is full", "Remove some photos before adding more.", "error");
    return [];
  }

  addPhotos(target, saved);
  const bytes = saved.reduce((n, p) => n + p.bytes, 0);
  toast(`${saved.length} ${STAGE_LABEL[stage].toLowerCase()} photo${saved.length === 1 ? "" : "s"} added`,
    `${formatBytes(bytes)} — compressed and stored with the job`, "success");
  if (failed) toast("Some files were skipped", `${failed} image(s) could not be read`, "error");
  if (saved.some((p) => p.oversized)) toast("Large image stored", "Compressed as far as quality allows", "error");
  onDone?.(saved);
  return saved;
}

// ---------------------------------------------------------------------------
// Markup
// ---------------------------------------------------------------------------

function metaRow(target, { stages = STAGES } = {}) {
  const s = snapshot(target);
  return html`<div class="photo-meta">
    ${stages.map((st) => html`<span class="badge ${st === "before" ? "badge-progress" : "badge-success"}">${s[st]} ${STAGE_LABEL[st].toLowerCase()}</span>`)}
    <div class="spacer"></div>
    <span class="small muted">${s.count ? `${formatBytes(s.bytes)} stored` : "Nothing stored yet"}</span>
  </div>`;
}

function actions(stage, { editable, full: isFull }) {
  if (!editable) return "";
  const off = isFull ? "disabled" : "";
  return html`<button class="icon-btn photo-act" data-shot="${stage}" title="Take ${STAGE_LABEL[stage].toLowerCase()} photo" aria-label="Take ${STAGE_LABEL[stage].toLowerCase()} photo" ${off}>${iconSvg("camera", 16)}</button>
    <button class="icon-btn photo-act" data-pick="${stage}" title="Upload ${STAGE_LABEL[stage].toLowerCase()} photo" aria-label="Upload ${STAGE_LABEL[stage].toLowerCase()} photo" ${off}>${iconSvg("upload", 16)}</button>`;
}

const SOURCE_LABEL = { camera: "Camera", customer: "Customer", intake: "Intake", upload: "Upload" };
const sourceLabel = (s) => SOURCE_LABEL[s] || "Upload";

function tile(photo, stage, { editable }) {
  return html`<figure class="photo-tile" data-view="${photo.id}">
    <img src="${photo.dataUrl}" alt="${STAGE_LABEL[stage].toLowerCase()} photo" loading="lazy" />
    <figcaption class="photo-cap small muted">${sourceLabel(photo.source)} · ${timeAgo(photo.at)}</figcaption>
    ${editable ? html`<button class="photo-del" data-del="${photo.id}" aria-label="Remove photo" title="Remove">${iconSvg("x", 12)}</button>` : ""}
  </figure>`;
}

function stageColumn(target, stage, { editable, compact, stages }) {
  const list = listOf(target, stage);
  const isFull = list.length >= MAX_PER_STAGE;
  return html`<section class="photo-col">
    <header class="photo-col-head">
      <b>${STAGE_LABEL[stage]}</b>
      <span class="small muted">${list.length}/${MAX_PER_STAGE}</span>
      <div class="spacer"></div>
      ${actions(stage, { editable, full: isFull })}
    </header>
    ${list.length
      ? html`<div class="photo-grid ${compact ? "compact" : ""}">${list.map((p) => tile(p, stage, { editable }))}</div>`
      : editable
        ? html`<div class="photo-drop" data-pick="${stage}">
            ${iconSvg("camera", 20)}
            <div class="small">No ${STAGE_LABEL[stage].toLowerCase()} photos yet</div>
            <div class="photo-drop-btns">
              <button class="btn btn-primary btn-sm" data-shot="${stage}">Take photo</button>
              <button class="btn btn-secondary btn-sm" data-pick="${stage}">Upload</button>
            </div>
          </div>`
        : html`<div class="photo-drop static"><div class="small">No ${STAGE_LABEL[stage].toLowerCase()} photos</div></div>`}
  </section>`;
}

export function comparePanel(job) {
  const before = photosOf(job, "before")[0];
  const after = photosOf(job, "after")[0];
  if (!before || !after) return "";
  return html`<div class="compare" data-compare>
    <img class="cmp-img" src="${after.dataUrl}" alt="After repair" />
    <div class="cmp-top"><img class="cmp-img" src="${before.dataUrl}" alt="Before repair" /></div>
    <span class="cmp-line" aria-hidden="true"><span class="cmp-grip">${iconSvg("swap", 14)}</span></span>
    <span class="cmp-tag cmp-tag-l">Before</span>
    <span class="cmp-tag cmp-tag-r">After</span>
    <input class="cmp-range" type="range" min="0" max="100" value="50" step="1" aria-label="Slide to compare before and after" />
  </div>`;
}

export function photoBody(target, { editable = true, compact = false, stages = STAGES } = {}) {
  return html`<div class="photo-body" data-photo-body="${keyOf(target)}" data-photo-key="${keyOf(target)}">
    ${photoInner(target, { editable, compact, stages })}
  </div>`;
}

function photoInner(target, { editable, compact, stages }) {
  const job = target.kind === "job" ? store.jobs.find((j) => j.id === target.id) : null;
  const cmp = job && !compact ? comparePanel(job) : "";
  return html`
    ${metaRow(target, { stages })}
    ${cmp}
    <div class="photo-cols ${stages.length === 1 ? "single" : ""} ${compact ? "compact" : ""}">
      ${stages.map((st) => stageColumn(target, st, { editable, compact, stages }))}
    </div>`;
}

// ---------------------------------------------------------------------------
// Binding — repaints the body in place so surrounding form input survives
// ---------------------------------------------------------------------------

export function bindPhotos(root, { target, editable = true, compact = false, stages = STAGES, actor } = {}) {
  const key = keyOf(target);
  const body = root.querySelector(`[data-photo-body="${key}"]`);
  if (!body) return;

  const repaint = () => {
    body.innerHTML = String(photoInner(target, { editable, compact, stages }));
    bindCompare(body);
  };

  const openPicker = (stage) => picker({
    stage,
    multiple: true,
    onFiles: async (files) => {
      await ingest(target, stage, files, { source: target.kind === "draft" ? "intake" : "upload", by: actor });
      repaint();
    },
  });

  // One delegated listener on the container: innerHTML swaps don't lose it, and
  // `closest` resolves to the innermost control so a nested button never
  // triggers the drop zone it sits in.
  body.addEventListener("click", (e) => {
    const del = e.target.closest("[data-del]");
    if (del) { removePhoto(target, del.getAttribute("data-del")); repaint(); return; }
    const shot = e.target.closest("[data-shot]");
    if (shot) {
      openCamera({ stage: shot.getAttribute("data-shot"), by: actor, onCapture: (photo) => { addPhotos(target, [photo]); repaint(); } });
      return;
    }
    const pick = e.target.closest("[data-pick]");
    if (pick) { openPicker(pick.getAttribute("data-pick")); return; }
    const view = e.target.closest("[data-view]");
    if (view) openLightbox(target, view.getAttribute("data-view"));
  });

  body.addEventListener("dragenter", (e) => {
    const col = e.target.closest(".photo-col");
    if (col) { e.preventDefault(); col.classList.add("drag"); }
  });
  body.addEventListener("dragover", (e) => {
    if (e.target.closest(".photo-col")) e.preventDefault();
  });
  body.addEventListener("dragleave", (e) => {
    const col = e.target.closest(".photo-col");
    if (col && !col.contains(e.relatedTarget)) col.classList.remove("drag");
  });
  body.addEventListener("drop", async (e) => {
    const col = e.target.closest(".photo-col");
    if (!col) return;
    e.preventDefault();
    col.classList.remove("drag");
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => String(f.type).startsWith("image/"));
    if (!files.length) return;
    const stage = col.querySelector("[data-pick]")?.getAttribute("data-pick") || stages[0];
    await ingest(target, stage, files, { source: target.kind === "draft" ? "intake" : "upload", by: actor });
    repaint();
  });

  bindCompare(body);
}

export function bindCompare(root) {
  root.querySelectorAll("[data-compare]").forEach((node) => {
    const range = node.querySelector(".cmp-range");
    const set = (v) => node.style.setProperty("--pos", `${v}%`);
    set(range ? range.value : 50);
    range?.addEventListener("input", () => set(range.value));
  });
}

function openLightbox(target, photoId) {
  const photo = listOf(target).find((p) => p.id === photoId);
  if (!photo) return;
  const s = snapshot(target);
  modal({
    title: `${STAGE_LABEL[photo.stage] || "Repair"} photo`,
    size: "wide",
    body: html`<div class="lightbox">
      <img src="${photo.dataUrl}" alt="${STAGE_LABEL[photo.stage].toLowerCase()} photo" />
      <div class="lightbox-meta small muted">
        ${photo.w}×${photo.h} · ${formatBytes(photo.bytes)} · ${sourceLabel(photo.source)} · ${timeAgo(photo.at)} · by ${photo.by || "—"}
      </div>
    </div>`,
    footer: html`<span class="small muted">${s.before} before · ${s.after} after</span><span class="spacer"></span>
      <button class="btn btn-secondary" data-close>Close</button>`,
  });
}
