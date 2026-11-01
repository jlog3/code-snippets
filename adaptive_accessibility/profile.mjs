/**
 * profile.mjs — who this person is, decided once, read everywhere.
 *
 * Extracted from uDrum (a browser music studio built so disabled and
 * non-disabled musicians make songs in the same software) and made
 * domain-neutral. No dependencies, no framework, no accounts, no network:
 * everything stays in the person's browser.
 *
 * THE IDEA IN ONE PARAGRAPH
 * A short questionnaire asks how the person sees, hears, controls the device
 * and what makes an interface comfortable. Each answer switches on a small
 * number of named behaviours ("flags") and looks. The device adds what it
 * already knows (a finger, an OS reduced-motion setting). The person can
 * override anything, and an override always wins. The result is written as
 * data-* attributes on <html>, which CSS and code read. Every page, every
 * component, and the pre-paint script use the SAME functions below, so they
 * can never disagree. In uDrum they once did: three hand-written copies of
 * this logic gave eight test profiles eight different interfaces.
 *
 * PRECEDENCE (the single most important rule)
 *   what the person set explicitly  >  what their answers imply  >  what the
 *   device implies  >  default.
 * An explicit "off" is stored as `false` (or `null` for a look), never
 * deleted, so the device cannot quietly switch it back on.
 *
 * WHY THE CORE FUNCTIONS ARE WRITTEN IN ES5
 * deriveFromAnswers, readDevice, resolve and applyToDocument are embedded,
 * as their own source text, into the inline <head> script that runs before
 * first paint (see prepaintScript). That means the pre-paint and the app run
 * literally the same function, not a copy that can drift. Keep them
 * self-contained: no imports, no closures over module scope, ES5 syntax.
 */

/* ── 1. The behaviours ─────────────────────────────────────────────────────
 * key: how storage and code name it. attr/on: how CSS reads it.
 * label/hint: what the settings panel says, in plain language. */
export const FLAGS = [
  { key: "touch", attr: "data-touch", on: "comfortable",
    label: "Larger touch targets",
    hint: "Every button and control is at least 44 by 44 pixels, with more space between them." },
  { key: "motion", attr: "data-motion", on: "reduce",
    label: "Reduce motion",
    hint: "No animation or movement. Highlights change border colour instead." },
  { key: "density", attr: "data-density", on: "simple",
    label: "Simpler interface",
    hint: "Hides advanced and diagnostic controls until you ask for them." },
  { key: "confirm", attr: "data-confirm", on: "always",
    label: "Confirm before deleting",
    hint: "Clearing and deleting ask first. Useful with a switch device or eye tracker." },
  { key: "calm", attr: "data-calm", on: "on",
    label: "Never start anything on its own",
    hint: "No sound, video or microphone starts until you press something." },
  { key: "dwell", attr: "data-dwell", on: "long",
    label: "Give me longer to read",
    hint: "Messages stay on screen about three times as long, and undo waits until you dismiss it." },
];

/* ── 2. The looks ──────────────────────────────────────────────────────────
 * `null` is the standard look. The palette's standard IS colour-blind safe
 * (Wong / Okabe-Ito), so red-green colour blindness needs no setting at all. */
export const LOOK = [
  { key: "theme", attr: "data-theme", label: "Theme",
    options: [[null, "Automatic (follows your device)"], ["dark", "Dark"], ["light", "Light"]] },
  { key: "text", attr: "data-text", label: "Text size",
    options: [[null, "Standard"], ["large", "Large"], ["xlarge", "Extra large"]] },
  { key: "contrast", attr: "data-contrast", label: "Contrast",
    hint: "High contrast strengthens borders and removes faint backgrounds.",
    options: [[null, "Standard"], ["high", "High contrast"]] },
  { key: "palette", attr: "data-palette", label: "Colours",
    hint: "The standard colours are already safe for red-green colour blindness. Choose blue-yellow safe if blues and greens, or yellows and pinks, look alike to you.",
    options: [[null, "Colour-blind safe (standard)"], ["tritan", "Blue-yellow safe"], ["vivid", "Vivid (not colour-blind safe)"]] },
  { key: "reading", attr: "data-reading", label: "Reading font",
    hint: "A typeface and spacing that many people with dyslexia find easier to read.",
    options: [[null, "Standard"], ["easy", "Easier to read"]] },
];

/* ── 3. What each answer does ──────────────────────────────────────────────
 * One row per answer. `when` is "group:option". A row can set flags, looks,
 * captions, and a `say` line for the summary screen. Rows combine: somebody
 * who is Deaf and dyslexic gets both rows, never one box.
 *
 * "Longer to read" (dwell) is switched on by several different answers, for
 * several different reasons: reading is slower (dyslexia, simpler), finding
 * the text costs time first (low vision), captions are not a convenience but
 * the sound itself (Deaf, hard of hearing), or an undo bar is useless if it
 * vanishes before you can reach it (switch, limited motor). */
export const RULES = [
  { when: "vision:blind", say: "Every change is announced to your screen reader, and everything works from the keyboard (always on, for everyone)." },
  { when: "vision:low-vision", look: { text: "xlarge", contrast: "high" }, flags: { dwell: true },
    say: "Extra-large text, high contrast and a thicker focus ring." },
  { when: "vision:cb-rg", say: "Colour-blind safe colours (the standard, already on)." },
  { when: "vision:cb-by", look: { palette: "tritan" }, say: "Blue-yellow safe colours." },
  { when: "vision:cb-unsure", say: "Colour-blind safe colours (the standard, already on). Change them in settings if anything still looks alike." },
  { when: "hearing:deaf", captions: true, flags: { dwell: true }, say: "Visible text for every sound, plus vibration where the device can." },
  { when: "hearing:hoh", captions: true, flags: { dwell: true }, say: "Visible text for every sound." },
  { when: "hearing:captions", captions: true, flags: { dwell: true }, say: "Visible text for every sound." },
  { when: "motor:keyboard-only", say: "Every action works with Tab, Enter and the arrow keys (always on, for everyone)." },
  { when: "motor:limited-motor", flags: { touch: true, dwell: true }, say: "Larger targets, at least 44 by 44 pixels, and longer to read." },
  { when: "motor:switch", flags: { confirm: true, dwell: true }, say: "Deleting asks first, and accidental double presses are ignored." },
  { when: "motor:voice", say: "Every control has a visible name you can say (always on, for everyone)." },
  { when: "cognitive:vestibular", flags: { motion: true }, say: "All motion removed. Highlights change border colour only." },
  { when: "cognitive:dyslexia", look: { reading: "easy" }, flags: { dwell: true }, say: "An easier-to-read font with looser spacing." },
  { when: "cognitive:simpler", flags: { density: true, dwell: true }, say: "A simpler screen. Advanced controls are hidden until you ask." },
  { when: "cognitive:anxiety", flags: { calm: true }, say: "Nothing starts on its own. The microphone and camera stay off until you turn them on." },
];

/* How familiar the person is decides how many controls they START with.
 * Nothing is ever locked: an app using this must keep every control
 * reachable (search, "Show all"). Unsure or unanswered is everything. */
export const LEVELS = ["basics", "growing", "everything"];
export const EXPERIENCE_TO_LEVEL = { new: "basics", some: "growing", lots: "everything", unsure: "everything" };

/* ── 4. What the device already knows ──────────────────────────────────────
 * A finger is not a disability; it is a fact about the hardware. Without
 * this, "no needs" quietly meant "the least usable defaults". */
export const DEVICE = [
  { query: "(pointer: coarse)", flags: { touch: true } },
  { query: "(prefers-reduced-motion: reduce)", flags: { motion: true } },
  { query: "(prefers-contrast: more)", look: { contrast: "high" } },
];

/* ── 5. The core (ES5, embedded in the pre-paint script) ─────────────────── */

export function deriveFromAnswers(answers, RULES, EXPERIENCE_TO_LEVEL) {
  var out = { flags: {}, look: {}, captions: false, level: null, says: [] };
  if (!answers) return out;
  for (var i = 0; i < RULES.length; i++) {
    var r = RULES[i];
    var parts = r.when.split(":");
    var list = answers[parts[0]];
    if (!list || typeof list.indexOf !== "function" || list.indexOf(parts[1]) === -1) continue;
    var k;
    if (r.flags) for (k in r.flags) if (r.flags[k]) out.flags[k] = true;
    if (r.look) for (k in r.look) out.look[k] = r.look[k];
    if (r.captions) out.captions = true;
    if (r.say) out.says.push(r.say);
  }
  if (answers.experience && EXPERIENCE_TO_LEVEL[answers.experience]) out.level = EXPERIENCE_TO_LEVEL[answers.experience];
  return out;
}

export function readDevice(win, DEVICE) {
  var out = { flags: {}, look: {} };
  if (!win || !win.matchMedia) return out;
  for (var i = 0; i < DEVICE.length; i++) {
    var m = false;
    try { m = !!win.matchMedia(DEVICE[i].query).matches; } catch (e) { m = false; }
    if (!m) continue;
    var k;
    if (DEVICE[i].flags) for (k in DEVICE[i].flags) out.flags[k] = DEVICE[i].flags[k];
    if (DEVICE[i].look) for (k in DEVICE[i].look) out.look[k] = DEVICE[i].look[k];
  }
  return out;
}

export function resolve(profile, device, RULES, FLAGS, LOOK, EXPERIENCE_TO_LEVEL) {
  var p = profile || {};
  var ex = p.explicit || {};
  var exF = ex.flags || {};
  var exL = ex.look || {};
  var dev = device || { flags: {}, look: {} };
  var fa = deriveFromAnswers(p.answers || null, RULES, EXPERIENCE_TO_LEVEL);
  var out = { flags: {}, look: {}, source: { flags: {}, look: {} } };
  var i, k;
  for (i = 0; i < FLAGS.length; i++) {
    k = FLAGS[i].key;
    if (typeof exF[k] === "boolean") { out.flags[k] = exF[k]; out.source.flags[k] = "you"; }
    else if (fa.flags[k]) { out.flags[k] = true; out.source.flags[k] = "answers"; }
    else if (dev.flags && dev.flags[k]) { out.flags[k] = true; out.source.flags[k] = "device"; }
    else { out.flags[k] = false; out.source.flags[k] = "default"; }
  }
  for (i = 0; i < LOOK.length; i++) {
    k = LOOK[i].key;
    if (Object.prototype.hasOwnProperty.call(exL, k)) { out.look[k] = exL[k]; out.source.look[k] = "you"; }
    else if (fa.look[k] != null) { out.look[k] = fa.look[k]; out.source.look[k] = "answers"; }
    else if (dev.look && dev.look[k] != null) { out.look[k] = dev.look[k]; out.source.look[k] = "device"; }
    else { out.look[k] = null; out.source.look[k] = "default"; }
  }
  out.captions = typeof ex.captions === "boolean" ? ex.captions : fa.captions;
  out.haptics = p.haptics !== false;
  out.level = ex.level || fa.level || "everything";
  return out;
}

export function applyToDocument(doc, r, FLAGS, LOOK) {
  if (!doc || !doc.documentElement) return;
  var el = doc.documentElement;
  var i, f, v;
  for (i = 0; i < FLAGS.length; i++) {
    f = FLAGS[i];
    if (r.flags[f.key]) el.setAttribute(f.attr, f.on); else el.removeAttribute(f.attr);
  }
  for (i = 0; i < LOOK.length; i++) {
    v = r.look[LOOK[i].key];
    if (v) el.setAttribute(LOOK[i].attr, v); else el.removeAttribute(LOOK[i].attr);
  }
  if (r.captions) el.setAttribute("data-captions", "on"); else el.removeAttribute("data-captions");
  el.setAttribute("data-level", r.level || "everything");
  try {
    el.style.colorScheme = r.look.theme === "light" ? "light" : r.look.theme === "dark" ? "dark" : "light dark";
  } catch (e) {}
}

/* ── 6. Storage and the one function every page calls ──────────────────── */

let STORAGE_KEY = "a11y-profile";
export const PROFILE_VERSION = 1;

/** Call once, before anything else, to give the profile your app's own key. */
export function configure({ storageKey } = {}) { if (storageKey) STORAGE_KEY = storageKey; }
export function storageKey() { return STORAGE_KEY; }

const W = (win) => win || (typeof window === "undefined" ? null : window);
const D = (doc) => doc || (typeof document === "undefined" ? null : document);

export function loadProfile(win) {
  const w = W(win);
  if (!w) return {};
  try { return JSON.parse(w.localStorage.getItem(STORAGE_KEY) || "null") || {}; } catch (_) { return {}; }
}

function store(w, p) {
  try { w.localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (_) {}
}

/** Read everything, decide, apply. Returns the resolved profile. */
export function applyNow(win, doc) {
  const w = W(win), d = D(doc);
  const r = resolve(loadProfile(w), readDevice(w, DEVICE), RULES, FLAGS, LOOK, EXPERIENCE_TO_LEVEL);
  applyToDocument(d, r, FLAGS, LOOK);
  try { w && w.dispatchEvent(new w.CustomEvent("a11y:change", { detail: r })); } catch (_) {}
  return r;
}

/** The current decision, without touching the page. */
export function current(win) {
  const w = W(win);
  return resolve(loadProfile(w), readDevice(w, DEVICE), RULES, FLAGS, LOOK, EXPERIENCE_TO_LEVEL);
}

/** Has this person answered or skipped the questionnaire on this version? */
export function hasAnswered(win) {
  const p = loadProfile(win);
  return !!p.answers && p.v === PROFILE_VERSION;
}

/**
 * Save questionnaire answers. `{}` is the "none apply" path and still counts
 * as answered. Re-answering clears earlier explicit overrides of the same
 * things, because the person has just told you again; the theme is kept,
 * since the questionnaire never asks about it.
 */
export function saveAnswers(answers, win, doc) {
  const w = W(win);
  const prev = loadProfile(w);
  const keepTheme = prev.explicit && prev.explicit.look && "theme" in prev.explicit.look
    ? { look: { theme: prev.explicit.look.theme } } : {};
  store(w, { v: PROFILE_VERSION, answers: answers || {}, explicit: keepTheme, haptics: prev.haptics, ts: Date.now() });
  return applyNow(w, doc);
}

/**
 * Record a choice the person made in settings. Pass `false` to switch a flag
 * off on purpose, `null` to choose the standard look on purpose, and
 * `undefined` to hand the decision back to the answers and device.
 *   setExplicit({ flags: { touch: false } })
 *   setExplicit({ look: { text: "large" } })
 *   setExplicit({ level: "everything" })
 */
export function setExplicit(change, win, doc) {
  const w = W(win);
  const p = loadProfile(w);
  const ex = p.explicit || {};
  ex.flags = ex.flags || {};
  ex.look = ex.look || {};
  for (const [k, v] of Object.entries((change && change.flags) || {})) {
    if (v === undefined) delete ex.flags[k]; else ex.flags[k] = !!v;
  }
  for (const [k, v] of Object.entries((change && change.look) || {})) {
    if (v === undefined) delete ex.look[k]; else ex.look[k] = v;
  }
  for (const k of ["captions", "level"]) {
    if (change && k in change) { if (change[k] === undefined) delete ex[k]; else ex[k] = change[k]; }
  }
  p.explicit = ex;
  if (change && "haptics" in change) p.haptics = !!change.haptics;
  if (!p.v) p.v = PROFILE_VERSION;
  store(w, p);
  return applyNow(w, doc);
}

/** Summary lines for what the given answers will do, from the same RULES. */
export function summarise(answers) {
  return deriveFromAnswers(answers, RULES, EXPERIENCE_TO_LEVEL).says;
}

/* ── 7. The pre-paint script ───────────────────────────────────────────────
 * Put the returned string in an inline <script> in <head>, before your CSS
 * loads, or the first paint is the wrong size and the page jumps once your
 * framework arrives. It contains the four core functions above as text. */
export function prepaintScript(key = STORAGE_KEY) {
  const data = {
    KEY: key, RULES, FLAGS: FLAGS.map(({ key, attr, on }) => ({ key, attr, on })),
    LOOK: LOOK.map(({ key, attr }) => ({ key, attr })), DEVICE, E2L: EXPERIENCE_TO_LEVEL,
  };
  return "(function(){try{" +
    "var C=" + JSON.stringify(data) + ";" +
    deriveFromAnswers.toString() + ";" +
    readDevice.toString() + ";" +
    resolve.toString() + ";" +
    applyToDocument.toString() + ";" +
    "var p=null;try{p=JSON.parse(window.localStorage.getItem(C.KEY)||'null');}catch(e){}" +
    "applyToDocument(document,resolve(p||{},readDevice(window,C.DEVICE),C.RULES,C.FLAGS,C.LOOK,C.E2L),C.FLAGS,C.LOOK);" +
    "}catch(e){}})();";
}

/* ── 8. Reading the profile at runtime ─────────────────────────────────────
 * Components read the attributes, not storage: it is instant, free, and it
 * sees the OS setting and the app's own switch together. (Checking
 * prefers-reduced-motion directly sees only half: somebody who switched
 * Reduce motion on in your settings but not their OS still gets animation.) */

export function wants(flag, doc) {
  const d = D(doc);
  const f = FLAGS.find((x) => x.key === flag);
  return !!(d && f) && d.documentElement.getAttribute(f.attr) === f.on;
}
export const motionReduced = (doc) => wants("motion", doc);
/** May this start sound, video, the microphone or camera without a press? */
export const mayStartOnItsOwn = (doc) => !wants("calm", doc);
export const captionsOn = (doc) => D(doc)?.documentElement.getAttribute("data-captions") === "on";
export const level = (doc) => D(doc)?.documentElement.getAttribute("data-level") || "everything";
/** Is a control that needs `min` level shown at the current level? */
export const levelAllows = (min, doc) => LEVELS.indexOf(level(doc)) >= LEVELS.indexOf(min);

/**
 * How long a message should stay on screen. Flat timeouts assume one reader.
 * Time scales with length (about 13 characters a second beyond the first 40)
 * and triples for "longer to read". Captions are the sound itself for a Deaf
 * person; they must be readable. WCAG 2.2.1 asks for adjustable timing.
 */
export function dwellMs(baseMs, text, doc) {
  const extra = Math.max(0, (text || "").length - 40) * 75;
  const long = wants("dwell", doc);
  return Math.min((baseMs + extra) * (long ? 3 : 1), long ? 60000 : 15000);
}

/** Can this device vibrate from a web page? Say so honestly when it cannot
 *  (iPhones and iPads cannot, in any browser, as of 2026). */
export function canVibrate(win) {
  const w = W(win);
  return !!(w && w.navigator && typeof w.navigator.vibrate === "function");
}

/**
 * Ask before a destructive action, but only for people who need the guard
 * (switch and eye-gaze users, or anyone who switched it on). Everyone else
 * should get undo instead of a question. Pass `ask` to use your own dialog.
 */
export async function confirmDestructive(message, { doc, win, ask } = {}) {
  if (!wants("confirm", doc)) return true;
  if (ask) return !!(await ask(message));
  const w = W(win);
  return !!(w && w.confirm && w.confirm(message));
}

/**
 * For switch and eye-gaze users: a press that changes the screen must not let
 * the second half of an accidental double press land on whatever appears
 * underneath. Call right after such a press. Separate presses, keys and
 * screen-reader activation are untouched.
 */
export function swallowRepeatClick(doc, ms = 500) {
  const d = D(doc);
  if (!d) return;
  const h = (e) => { if (e.detail >= 2) { e.preventDefault(); e.stopPropagation(); } };
  d.addEventListener("click", h, true);
  setTimeout(() => d.removeEventListener("click", h, true), ms);
}

/* ── 9. Announcements that do not flood ────────────────────────────────────
 * Announce changes, not re-reads. A repeat of the same words within a
 * second is dropped. Fast-ticking updates (a progress counter, a timer, a
 * playhead) go to `stream`, which keeps only the latest and speaks at most
 * every 1.5 seconds, so a screen reader is never buried. */
export function createAnnouncer(doc, { streamMs = 1500, repeatMs = 1000 } = {}) {
  const d = D(doc);
  const mk = (role, live) => {
    const el = d.createElement("div");
    el.setAttribute("role", role);
    el.setAttribute("aria-live", live);
    el.setAttribute("aria-atomic", "true");
    el.className = "a11y-sr-only";
    d.body.appendChild(el);
    return el;
  };
  const polite = mk("status", "polite");
  const assertive = mk("alert", "assertive");
  const ticker = mk("status", "polite");
  let last = { text: "", at: 0 };
  let pending = null, timer = null, lastStream = 0;
  const put = (el, text) => {
    el.textContent = "";
    setTimeout(() => { el.textContent = text; }, 30); // re-announce identical text when it is deliberate
  };
  function say(text, { priority = "polite" } = {}) {
    if (!text) return false;
    if (priority === "stream") return stream(text);
    const now = Date.now();
    if (text === last.text && now - last.at < repeatMs) return false;
    last = { text, at: now };
    put(priority === "assertive" ? assertive : polite, text);
    return true;
  }
  function stream(text) {
    pending = text;
    const wait = Math.max(0, streamMs - (Date.now() - lastStream));
    if (!timer) timer = setTimeout(() => { timer = null; lastStream = Date.now(); put(ticker, pending); }, wait);
    return true;
  }
  return { say, stream, regions: { polite, assertive, ticker } };
}

/* ── 10. One feedback bus, at least two channels ───────────────────────────
 * Every event reaches the person through at least two channels they actually
 * have, and text is always one of them. Sight, hearing and touch are each
 * enough on their own. Returns the channels used, so you can test the rule.
 *
 *   const fb = createFeedback({ announcer });
 *   fb.notify({ text: "Saved", kind: "success" });
 *
 * kind carries a glyph AND a word, never colour alone. */
export const KINDS = {
  info: { glyph: "◆", word: "Note" },
  success: { glyph: "✓", word: "Done" },
  warning: { glyph: "▲", word: "Careful" },
  error: { glyph: "✕", word: "Problem" },
};
export function createFeedback({ doc, win, announcer, host, sound } = {}) {
  const d = D(doc), w = W(win);
  const a = announcer || createAnnouncer(d);
  let box = host;
  if (!box) {
    box = d.createElement("div");
    box.className = "a11y-caption";
    box.setAttribute("aria-hidden", "true"); // the live region speaks; this is for eyes
    box.hidden = true;
    d.body.appendChild(box);
  }
  let hideTimer = null;
  function notify({ text, kind = "info", vibrate, earcon } = {}) {
    const k = KINDS[kind] || KINDS.info;
    const used = [];
    // 1. Text on screen, always. Glyph + word + message.
    box.dataset.kind = kind;
    box.textContent = k.glyph + " " + k.word + ": " + text;
    box.hidden = false;
    used.push("text");
    clearTimeout(hideTimer);
    const keep = kind === "error" && wants("dwell", d) ? null : dwellMs(2500, text, d);
    if (keep != null) hideTimer = setTimeout(() => { box.hidden = true; }, keep);
    // 2. Screen reader (and braille display, which reads the same text).
    if (a.say(k.word + ": " + text, { priority: kind === "error" ? "assertive" : "polite" })) used.push("speech");
    // 3. Touch, where the device can and the person has not switched it off.
    const p = resolve(loadProfile(w), readDevice(w, DEVICE), RULES, FLAGS, LOOK, EXPERIENCE_TO_LEVEL);
    if (p.haptics && canVibrate(w)) {
      const pattern = vibrate || { info: 20, success: [20, 60, 20], warning: [60, 60, 60], error: [120, 80, 120] }[kind];
      try { if (w.navigator.vibrate(pattern)) used.push("vibration"); } catch (_) {}
    }
    // 4. Sound, if you supply one. A sound answering a press is fine under
    //    "never start on its own"; that setting is about things that start
    //    by themselves.
    if (sound && earcon !== false) { try { sound(kind); used.push("sound"); } catch (_) {} }
    return used;
  }
  return { notify, element: box };
}

export default {
  FLAGS, LOOK, RULES, LEVELS, EXPERIENCE_TO_LEVEL, DEVICE, PROFILE_VERSION,
  deriveFromAnswers, readDevice, resolve, applyToDocument,
  configure, storageKey, loadProfile, applyNow, current, hasAnswered, saveAnswers, setExplicit, summarise,
  prepaintScript, wants, motionReduced, mayStartOnItsOwn, captionsOn, level, levelAllows, dwellMs,
  canVibrate, confirmDestructive, swallowRepeatClick, createAnnouncer, createFeedback, KINDS,
};
