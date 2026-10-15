// Form — one submit path for every dialog.
//
// Every modal form previously re-implemented the same flow (read fields, ad-hoc
// required checks, mutate, toast, close, refresh). openForm centralises it:
// validate against the field specs -> collect -> onSubmit -> close -> refresh.
import { html } from "./markup.js";
import { modal, closeModal, toast } from "./util.js";
import { buildForm, readForm, validateForm } from "./components.js";
import { refresh } from "./router.js";

// spec: { title, fields?, body?, values?, submitLabel?, onSubmit }
//   fields  – field specs, passed to buildForm; `required: true` drives validation
//   body    – custom body markup (alternative to fields)
//   onSubmit(data) – perform the change. Return false to keep the dialog open.
export function openForm({ title, fields, body, values = {}, submitLabel = "Save", onSubmit }) {
  const m = modal({
    title,
    body: body || buildForm(fields || [], values),
    footer: html`<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" id="save">${submitLabel}</button>`,
  });

  const required = (fields || []).filter((f) => f.required).map((f) => f.key);

  const submit = async () => {
    if (required.length && !validateForm(m, required)) return toast("Please complete the required fields.", "", "error");
    const data = readForm(m);
    const res = await onSubmit(data);
    if (res === false) return;          // caller vetoed (e.g. invalid combination)
    closeModal();
    refresh();
  };

  m.querySelector("#save").addEventListener("click", submit);
  m.querySelectorAll("input,select,textarea").forEach((i) => i.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && i.tagName !== "TEXTAREA") { e.preventDefault(); submit(); }
  }));
  return m;
}

// The in-page equivalent: a form rendered into the content area with its own
// submit button (e.g. the New/Edit customer pages). Same validate -> collect ->
// onSubmit contract as openForm.
export function bindForm(root, { fields, form = ".card-body", submit = "#save", onSubmit }) {
  const el = typeof form === "string" ? root.querySelector(form) : form;
  const btn = typeof submit === "string" ? root.querySelector(submit) : submit;
  if (!el || !btn) return;
  const required = (fields || []).filter((f) => f.required).map((f) => f.key);
  const run = () => {
    if (required.length && !validateForm(el, required)) return toast("Please complete the required fields.", "", "error");
    const res = onSubmit(readForm(el));
    if (res === false) return;
  };
  btn.addEventListener("click", run);
  el.querySelectorAll("input,select,textarea").forEach((i) => i.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && i.tagName !== "TEXTAREA") { e.preventDefault(); run(); }
  }));
}
