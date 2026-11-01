/**
 * settings.mjs — every choice, visible and changeable.
 *
 *   import { renderSettings } from "./settings.mjs";
 *   renderSettings(document.querySelector("#a11y-settings"), {
 *     onAnswerAgain: () => openQuestionnaire({ reconfigure: true }),
 *   });
 *
 * A tailored default is a starting point, never a cage. So this panel is
 * built from the same FLAGS and LOOK tables as everything else (it cannot
 * offer something the app does not do), and each setting says where its
 * current value came from: you, your answers, or your device. Presenting a
 * device-derived setting as if the person had picked it is a small lie; this
 * avoids it. "Back to automatic" hands a setting back to answers and device.
 */

import { FLAGS, LOOK, LEVELS, current, setExplicit, canVibrate } from "./profile.mjs";

const SOURCE = {
  you: "Set by you",
  answers: "From your answers",
  device: "From your device settings",
  default: "Standard",
};
const LEVEL_LABEL = { basics: "The basics (more appear as you go)", growing: "The common controls", everything: "Everything (Show all)" };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function renderSettings(container, { doc, win, onAnswerAgain, onChange } = {}) {
  const d = doc || document;
  const w = win || window;

  function draw(focusId) {
    const r = current(w);
    let html = `<fieldset class="s-group"><legend>How it behaves</legend>`;
    for (const f of FLAGS) {
      const id = "s-flag-" + f.key;
      const src = r.source.flags[f.key];
      html += `<div class="s-row"><input type="checkbox" id="${id}" data-flag="${f.key}" ${r.flags[f.key] ? "checked" : ""} aria-describedby="${id}-h ${id}-s">
        <label for="${id}"><strong>${esc(f.label)}</strong><span id="${id}-h">${esc(f.hint)}</span><span class="s-src" id="${id}-s">${SOURCE[src]}</span></label>
        ${src === "you" ? `<button type="button" class="s-auto" data-auto-flag="${f.key}" aria-label="${esc(f.label)}: back to automatic">Back to automatic</button>` : ""}</div>`;
    }
    html += `</fieldset><fieldset class="s-group"><legend>How it looks</legend>`;
    for (const l of LOOK) {
      const id = "s-look-" + l.key;
      const src = r.source.look[l.key];
      html += `<div class="s-row s-select"><label for="${id}"><strong>${esc(l.label)}</strong>${l.hint ? `<span id="${id}-h">${esc(l.hint)}</span>` : ""}<span class="s-src" id="${id}-s">${SOURCE[src]}</span></label>
        <select id="${id}" data-look="${l.key}" aria-describedby="${l.hint ? id + "-h " : ""}${id}-s">${l.options.map(([v, t]) =>
          `<option value="${v == null ? "" : v}" ${(r.look[l.key] || "") === (v || "") ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
        ${src === "you" ? `<button type="button" class="s-auto" data-auto-look="${l.key}" aria-label="${esc(l.label)}: back to automatic">Back to automatic</button>` : ""}</div>`;
    }
    html += `</fieldset><fieldset class="s-group"><legend>Feedback</legend>
      <div class="s-row"><input type="checkbox" id="s-captions" ${r.captions ? "checked" : ""} aria-describedby="s-captions-h">
        <label for="s-captions"><strong>Text for every sound</strong><span id="s-captions-h">Every sound the app makes also appears on screen.</span></label></div>
      <div class="s-row"><input type="checkbox" id="s-haptics" ${r.haptics ? "checked" : ""} aria-describedby="s-haptics-h">
        <label for="s-haptics"><strong>Vibration</strong><span id="s-haptics-h">${canVibrate(w)
          ? "A short buzz confirms actions and warns of problems."
          : "This device cannot vibrate from a web page (iPhones and iPads cannot, in any browser). Text and sound still carry everything."}</span></label></div>
    </fieldset><fieldset class="s-group"><legend>How many controls</legend>
      <div class="s-row s-select"><label for="s-level"><strong>Start with</strong><span id="s-level-h">Nothing is ever locked. Every control stays reachable by search.</span></label>
        <select id="s-level" aria-describedby="s-level-h">${LEVELS.map((v) => `<option value="${v}" ${r.level === v ? "selected" : ""}>${LEVEL_LABEL[v]}</option>`).join("")}</select></div>
    </fieldset>
    ${onAnswerAgain ? `<button type="button" class="s-again" id="s-again">Answer the questions again</button>` : ""}`;
    container.innerHTML = html;

    const commit = (change, id) => { const res = setExplicit(change, w, d); draw(id); if (onChange) onChange(res); };
    container.querySelectorAll("[data-flag]").forEach((el) => el.addEventListener("change", () =>
      commit({ flags: { [el.dataset.flag]: el.checked } }, el.id)));
    container.querySelectorAll("[data-look]").forEach((el) => el.addEventListener("change", () =>
      commit({ look: { [el.dataset.look]: el.value || null } }, el.id)));
    container.querySelectorAll("[data-auto-flag]").forEach((el) => el.addEventListener("click", () =>
      commit({ flags: { [el.dataset.autoFlag]: undefined } }, "s-flag-" + el.dataset.autoFlag)));
    container.querySelectorAll("[data-auto-look]").forEach((el) => el.addEventListener("click", () =>
      commit({ look: { [el.dataset.autoLook]: undefined } }, "s-look-" + el.dataset.autoLook)));
    container.querySelector("#s-captions").addEventListener("change", (e) => commit({ captions: e.target.checked }, "s-captions"));
    container.querySelector("#s-haptics").addEventListener("change", (e) => commit({ haptics: e.target.checked }, "s-haptics"));
    container.querySelector("#s-level").addEventListener("change", (e) => commit({ level: e.target.value }, "s-level"));
    const again = container.querySelector("#s-again");
    if (again) again.addEventListener("click", () => onAnswerAgain());

    // The panel is rebuilt on every change: focus goes back to the control
    // that was used (or, if its "Back to automatic" button vanished, to the
    // setting it belonged to). Focus is never dropped.
    if (focusId) container.querySelector("#" + focusId)?.focus();
  }

  draw();
  return { refresh: () => draw() };
}

export default { renderSettings };
