/**
 * dialog.mjs — the questionnaire on screen, with no framework.
 *
 *   import { openQuestionnaire } from "./dialog.mjs";
 *   if (!hasAnswered()) openQuestionnaire({ appName: "Acme Notes" });
 *
 * What it promises, for everyone:
 *  - A real modal: focus stays inside, the page behind is inert, and focus
 *    goes back where it was when it closes. Focus is never dropped.
 *  - The heading takes focus on every step, so a screen reader reads the new
 *    question and a keyboard user starts at the top of it.
 *  - Keyboard alone is enough. Escape goes back a step; on the first screen
 *    it skips (first run) or cancels without changing anything (a later run).
 *    Escape never acts inside a text field.
 *  - The two first answers, Yes and No, are the same size and weight, so the
 *    choice is read, not made by whichever looks most like the way on.
 *  - Every ticked box has a tick shape, not only a colour. Every group has a
 *    picture and a word as well as a colour. No motion under reduced motion.
 *  - Targets are at least 44 by 44 pixels.
 *  - A second run opens on a list of areas, so somebody changing one thing
 *    goes straight to it rather than answering everything again.
 *
 * Extra questions for your own domain ("How will you get music in?", "Which
 * input do you use for drawing?") go in `extraQuestions`, in the same shape
 * as QUESTIONS. Their answers are saved alongside the rest, under their key.
 */

import { QUESTIONS, EXPERIENCE, INTRO, SUMMARY, STEP_LOOK, fill } from "./questionnaire.mjs";
import { saveAnswers, loadProfile, summarise } from "./profile.mjs";

const ICONS = {
  access: '<circle cx="12" cy="4.5" r="2" fill="currentColor" stroke="none"/><path d="M5 8.5 L12 9.5 L19 8.5 M12 9.5 V14 L8 21 M12 14 L16 21"/>',
  eye: '<path d="M2 12 C5 6.5 19 6.5 22 12 C19 17.5 5 17.5 2 12 Z"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
  ear: '<path d="M4 9 H7 L11 5.5 V18.5 L7 15 H4 Z"/><path d="M15 9 Q17 12 15 15 M18 6.5 Q22 12 18 17.5"/>',
  hand: '<path d="M6 3 L6 17 L9.5 13.5 L12.5 20 L15 19 L12 12.5 L17 12.5 Z"/>',
  heart: '<path d="M12 20 C5 15 3 11.5 3 8.5 A4.5 4.5 0 0 1 12 6.5 A4.5 4.5 0 0 1 21 8.5 C21 11.5 19 15 12 20 Z"/>',
  check: '<path d="M4 12.5 L9.5 18 L20 6"/>',
  ladder: '<path d="M4 20 V15 H9 V10 H14 V5 H20"/><path d="M4 20 H20"/>',
  star: '<path d="M12 3 L14.6 9 L21 9.5 L16 13.6 L17.6 20 L12 16.5 L6.4 20 L8 13.6 L3 9.5 L9.4 9 Z"/>',
  no: '<path d="M4 12 H19 M13 6 L19 12 L13 18"/>',
};
const icon = (name, size = 20) =>
  `<svg aria-hidden="true" focusable="false" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function openQuestionnaire({
  doc, win, appName = "this app", reconfigure = false, extraQuestions = [],
  announce, onDone,
} = {}) {
  const d = doc || document;
  const w = win || window;
  const app = appName;
  const prior = loadProfile(w).answers || {};
  const state = { idx: 0, path: "yes", answers: JSON.parse(JSON.stringify(prior)) };
  const returnFocus = d.activeElement;

  const custom = extraQuestions.map((q) => ({ ...q, kind: "multi", look: STEP_LOOK.custom }));
  const a11ySteps = QUESTIONS.map((q) => ({ ...q, kind: "multi", look: STEP_LOOK[q.key] }));
  const steps = () => {
    const list = [{ key: "intro", kind: "intro", look: STEP_LOOK.intro, title: "Accessibility" }];
    if (state.path === "yes") list.push(...a11ySteps);
    list.push(...custom);
    if (state.path === "yes") list.push({ key: "summary", kind: "summary", title: "Summary", look: STEP_LOOK.summary });
    if (!reconfigure) list.push({ ...EXPERIENCE, kind: "experience", title: "Experience", look: STEP_LOOK.experience });
    return list;
  };

  // The page behind becomes inert, and is given back exactly as it was.
  const inerted = [];
  for (const el of Array.from(d.body.children)) {
    if (!el.hasAttribute("inert")) { el.setAttribute("inert", ""); inerted.push(el); }
  }

  const overlay = d.createElement("div");
  overlay.className = "q-overlay";
  const box = d.createElement("div");
  box.className = "q-dialog";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-labelledby", "q-heading");
  box.setAttribute("aria-describedby", "q-body");
  // The closing sentence is said after the dialog is gone, so its live region
  // lives outside the dialog and stays.
  let live = d.getElementById("q-live");
  if (!live) {
    live = d.createElement("div");
    live.id = "q-live";
    live.className = "a11y-sr-only";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    d.body.appendChild(live);
  }
  overlay.append(box);
  d.body.appendChild(overlay);

  const say = (msg) => {
    if (announce) { try { announce(msg); return; } catch (_) {} }
    live.textContent = "";
    setTimeout(() => { live.textContent = msg; }, 30);
  };

  function close(result) {
    d.removeEventListener("keydown", onKey, true);
    overlay.remove();
    inerted.forEach((el) => el.removeAttribute("inert"));
    try { returnFocus && returnFocus.focus && returnFocus.focus(); } catch (_) {}
    if (onDone) onDone(result);
  }

  function finish() {
    let final = state.answers;
    if (state.path === "no") {
      final = {};
      for (const q of custom) if (state.answers[q.key]) final[q.key] = state.answers[q.key];
      if (state.answers.experience) final.experience = state.answers.experience;
    }
    saveAnswers(final, w, d);
    say(reconfigure ? "Accessibility settings updated." : "Setup complete. Settings applied.");
    close(final);
  }

  function skip() {
    saveAnswers({}, w, d);
    say("Standard settings applied.");
    close({});
  }

  function go(i) { state.idx = i; render({ focus: "heading" }); }
  const next = () => { const n = steps().length; if (state.idx < n - 1) go(state.idx + 1); else finish(); };
  const back = () => { if (state.idx > 0) go(state.idx - 1); };

  function onKey(e) {
    if (!overlay.isConnected) return;
    if (e.key === "Escape") {
      const t = e.target;
      if (t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && /^(text|search|email|url|tel|number|password)$/.test(t.type)))) return;
      e.preventDefault();
      if (state.idx === 0) { if (reconfigure) close(null); else skip(); }
      else back();
      return;
    }
    if (e.key === "Tab") {
      const f = Array.from(box.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((el) => !el.closest("[hidden]"));
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      const inside = box.contains(d.activeElement);
      if (e.shiftKey && (d.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (d.activeElement === last || !inside)) { e.preventDefault(); first.focus(); }
    }
  }
  d.addEventListener("keydown", onKey, true);

  function render({ focus } = {}) {
    const list = steps();
    const step = list[state.idx] || list[0];
    const L = step.look;
    const firstRun = step.kind === "intro" && !reconfigure;
    box.style.setProperty("--t", L.tint);
    box.dataset.step = step.key;

    let html = `<p class="q-step">${icon(L.icon, 22)}<span>${firstRun ? "Welcome" : `Step ${state.idx + 1} of ${list.length} · ${esc(step.title)}`}</span></p>`;
    if (!firstRun) {
      html += `<ol class="q-map" aria-hidden="true">${list.map((s, i) =>
        `<li data-state="${i < state.idx ? "done" : i === state.idx ? "now" : "todo"}" style="--t:${s.look.tint}">${i < state.idx ? "✓" : icon(s.look.icon, 12)}</li>`).join("")}</ol>`;
    }
    const heading = step.kind === "intro"
      ? (reconfigure ? INTRO.reconfigureHeading : fill(INTRO.heading, app))
      : fill(step.heading, app);
    html += `<h1 id="q-heading" tabindex="-1">${esc(heading)}</h1>`;

    if (step.kind === "intro" && !reconfigure) {
      html += `<div class="q-yesno" role="group" aria-label="Do you need any accessibility options">
        <button type="button" class="q-card q-answer" data-go="yes">${icon("access", 22)}<span><strong>${esc(INTRO.yes.title)}</strong><span>${esc(fill(INTRO.yes.sub, app))}</span></span></button>
        <button type="button" class="q-card q-answer" data-go="no">${icon("no", 22)}<span><strong>${esc(INTRO.no.title)}</strong><span>${esc(fill(INTRO.no.sub, app))}</span></span></button>
      </div>
      <div id="q-body"><p>${esc(fill(INTRO.lead, app))}</p><ul class="q-groups">${INTRO.groups.map(([k, v]) =>
        `<li style="--t:${STEP_LOOK[k].tint}">${icon(STEP_LOOK[k].icon, 18)}<strong>${STEP_LOOK[k].word}</strong><span>${esc(v)}</span></li>`).join("")}</ul>
      <p class="q-small">${esc(INTRO.later)}</p></div>`;
    } else if (step.kind === "intro") {
      html += `<p id="q-body">${esc(INTRO.reconfigureBody)}</p><div class="q-areas" role="group" aria-label="Go straight to one area">${list.map((s, i) => {
        if (s.kind !== "multi") return "";
        const chosen = (state.answers[s.key] || []).map((id) => (s.options.find((o) => o.id === id) || {}).label).filter(Boolean);
        return `<button type="button" class="q-card" data-area="${i}" style="--t:${s.look.tint}" aria-label="${esc(`Change ${s.look.word}: ${fill(s.heading, app)} ${chosen.length ? "Chosen now: " + chosen.join("; ") + "." : "Nothing chosen yet."}`)}">${icon(s.look.icon, 22)}<span><strong>${esc(s.look.word)}</strong><span>${chosen.length ? "✓ " + chosen.length + " chosen" : "○ Nothing chosen"}</span></span></button>`;
      }).join("")}</div>`;
    } else if (step.kind === "multi") {
      const sel = new Set(state.answers[step.key] || []);
      html += `<p id="q-body">${esc(fill(step.body, app))}</p><div class="q-options" role="group" aria-labelledby="q-heading">${step.options.map((o, i) =>
        `<button type="button" class="q-card q-option" data-opt="${esc(o.id)}" data-i="${i}" aria-pressed="${sel.has(o.id)}" aria-describedby="q-h-${i}"><span class="q-box" aria-hidden="true">${sel.has(o.id) ? "✓" : ""}</span><span><strong>${esc(fill(o.label, app))}</strong><span id="q-h-${i}">${esc(fill(o.hint, app))}</span></span></button>`).join("")}</div>
        <p class="q-small">${sel.size ? `✓ ${sel.size} picked. Continue when you are ready.` : "None apply? Press Continue with nothing picked."}</p>`;
    } else if (step.kind === "summary") {
      const lines = summarise(state.answers);
      html += `<p id="q-body">${esc(SUMMARY.body)}</p><ul class="q-summary" aria-label="Settings that will be applied">${(lines.length ? lines : [SUMMARY.none]).concat(SUMMARY.always).map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`;
    } else if (step.kind === "experience") {
      html += `<p id="q-body">${esc(fill(step.body, app))}</p><div class="q-options" role="radiogroup" aria-labelledby="q-heading">${step.options.map((o) => {
        const on = state.answers.experience === o.id;
        const pips = o.pips ? [1, 2, 3].map((k) => `<i data-on="${k <= o.pips}"></i>`).join("") : "?";
        return `<label class="q-card q-level" data-pips="${o.pips}"><input type="radio" name="q-exp" value="${o.id}" ${on ? "checked" : ""} aria-describedby="q-e-${o.id}"><span><span class="q-pips" aria-hidden="true">${pips}</span><strong>${esc(o.label)}</strong><span id="q-e-${o.id}">${esc(o.sub)}${o.note ? " " + esc(o.note) : ""}</span></span></label>`;
      }).join("")}</div>`;
    }

    if (!firstRun) {
      const isLast = state.idx === list.length - 1;
      html += `<div class="q-bar">
        <span>${state.idx > 0 ? `<button type="button" class="q-btn" data-act="back">← Back</button>` : `<button type="button" class="q-btn" data-act="cancel">Cancel</button>`}</span>
        <button type="button" class="q-btn q-primary" data-act="next">${isLast ? (reconfigure ? "Apply →" : "Finish →") : state.idx === 0 ? "Begin →" : "Continue →"}</button>
      </div>`;
    }
    box.innerHTML = html;

    // Wire.
    box.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => { state.path = b.dataset.go; go(1); }));
    box.querySelectorAll("[data-area]").forEach((b) => b.addEventListener("click", () => go(+b.dataset.area)));
    box.querySelectorAll("[data-opt]").forEach((b) => b.addEventListener("click", () => {
      const cur = new Set(state.answers[step.key] || []);
      cur.has(b.dataset.opt) ? cur.delete(b.dataset.opt) : cur.add(b.dataset.opt);
      state.answers[step.key] = Array.from(cur);
      render({ focus: "opt:" + b.dataset.i }); // the pressed control is rebuilt: put focus back on it
    }));
    box.querySelectorAll('input[name="q-exp"]').forEach((r) => r.addEventListener("change", () => {
      state.answers.experience = r.value;
      render({ focus: "exp:" + r.value });
    }));
    const act = (name, fn) => { const b = box.querySelector(`[data-act="${name}"]`); if (b) b.addEventListener("click", fn); };
    act("back", back);
    act("next", next);
    act("cancel", () => close(null));

    if (focus === "heading") box.querySelector("#q-heading").focus();
    else if (focus && focus.startsWith("opt:")) box.querySelector(`[data-i="${focus.slice(4)}"]`)?.focus();
    else if (focus && focus.startsWith("exp:")) box.querySelector(`input[value="${focus.slice(4)}"]`)?.focus();
  }

  render({ focus: "heading" });
  return { close: () => close(null), element: box };
}

export default { openQuestionnaire };
