// Markup — interpolations are escaped by default; trusted fragments cross via raw().
//
//   html`<h1>${user.name}</h1>`            → name is escaped for you
//   html`<div>${iconSvg("box")}</div>`     → iconSvg returns a safe fragment
//   raw(`<b>${trusted}</b>`)               → opt out, deliberately
//
// Everything that renders markup returns a SafeHtml, so nesting is safe and a
// SafeHtml can still be used anywhere a string is expected (innerHTML, .trim()…).
export class SafeHtml extends String {}

export function raw(value) {
  return new SafeHtml(value instanceof SafeHtml ? String(value) : String(value ?? ""));
}

export function isSafe(value) {
  return value instanceof SafeHtml;
}

export function escape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function render(value) {
  if (value instanceof SafeHtml) return String(value);
  if (Array.isArray(value)) return value.map(render).join("");
  if (value == null) return "";
  return escape(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

// Join an array of already-safe fragments.
export function join(fragments, separator = "") {
  return raw(fragments.map((f) => render(f)).join(separator));
}
