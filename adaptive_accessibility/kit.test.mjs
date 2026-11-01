/**
 * kit.test.mjs — run with:  npm i -D jsdom && node kit.test.mjs
 *
 * Every check here is built so it can fail, and several prove it: the
 * pre-paint comparison is shown a deliberately wrong page and must notice.
 * Tests run the real modules in a simulated browser (jsdom), not a model.
 */
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import P from "./profile.mjs";
import { openQuestionnaire } from "./dialog.mjs";
import { renderSettings } from "./settings.mjs";
import { QUESTIONS } from "./questionnaire.mjs";

let pass = 0, fail = 0;
const ok = (cond, name, extra = "") => {
  if (cond) { pass++; } else { fail++; console.log("  FAIL", name, extra); }
};
const section = (s) => console.log("\n" + s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function browser({ coarse = false, reduce = false, contrast = false, vibrate = false } = {}) {
  const dom = new JSDOM("<!doctype html><html><head></head><body><button id='opener'>Open</button><main>page</main></body></html>",
    { url: "https://example.test/", runScripts: "outside-only" });
  const w = dom.window;
  setDevice(w, { coarse, reduce, contrast });
  if (vibrate) w.navigator.vibrate = () => true;
  return { w, d: w.document };
}
function setDevice(w, { coarse, reduce, contrast }) {
  w.matchMedia = (q) => ({ matches:
    (q === "(pointer: coarse)" && !!coarse) ||
    (q === "(prefers-reduced-motion: reduce)" && !!reduce) ||
    (q === "(prefers-contrast: more)" && !!contrast) });
}
const attrs = (d) => Array.from(d.documentElement.attributes)
  .filter((a) => a.name.startsWith("data-")).map((a) => a.name + "=" + a.value).sort().join(" ");

/* ── 1. The rules match uDrum's original code, for every combination ──────
 * The oracle below is uDrum's a11yFlagsFromAnswers / a11yPrefsFromAnswers /
 * a11yCaptionsFromAnswers, copied verbatim apart from the two renamed values
 * (cb "tritanopia" -> palette "tritan", dyslexia "on" -> reading "easy").
 * The kit expresses the same rules as data; this checks the data says the
 * same thing as the code it came from, across all 2^15 answer sets. */
section("1. Rules agree with the original uDrum code (all 32,768 answer sets)");
function oracle(answers) {
  const has = (g, id) => Array.isArray(answers[g]) && answers[g].indexOf(id) !== -1;
  const f = {};
  if (has("motor", "limited-motor")) f.touch = true;
  if (has("motor", "switch")) f.confirm = true;
  if (has("cognitive", "vestibular")) f.motion = true;
  if (has("cognitive", "anxiety")) f.calm = true;
  if (has("cognitive", "simpler")) f.density = true;
  if (has("cognitive", "dyslexia") || has("cognitive", "simpler") || has("vision", "low-vision") ||
      has("hearing", "deaf") || has("hearing", "hoh") || has("hearing", "captions") ||
      has("motor", "switch") || has("motor", "limited-motor")) f.dwell = true;
  const l = {};
  if (has("vision", "low-vision")) { l.text = "xlarge"; l.contrast = "high"; }
  if (has("vision", "cb-by")) l.palette = "tritan";
  if (has("cognitive", "dyslexia")) l.reading = "easy";
  const c = has("hearing", "deaf") || has("hearing", "hoh") || has("hearing", "captions");
  return { f, l, c };
}
const ORIGINAL = { vision: ["blind", "low-vision", "cb-rg", "cb-by", "cb-unsure"], hearing: ["deaf", "hoh", "captions"],
  motor: ["keyboard-only", "limited-motor", "switch"], cognitive: ["vestibular", "dyslexia", "simpler", "anxiety"] };
const all = Object.entries(ORIGINAL).flatMap(([g, ids]) => ids.map((id) => [g, id]));
let mismatches = 0;
for (let mask = 0; mask < 1 << all.length; mask++) {
  const answers = {};
  all.forEach(([g, id], i) => { if (mask & (1 << i)) (answers[g] = answers[g] || []).push(id); });
  const got = P.deriveFromAnswers(answers, P.RULES, P.EXPERIENCE_TO_LEVEL);
  const want = oracle(answers);
  if (JSON.stringify(Object.keys(got.flags).sort()) !== JSON.stringify(Object.keys(want.f).sort()) ||
      JSON.stringify(got.look, Object.keys(got.look).sort()) !== JSON.stringify(want.l, Object.keys(want.l).sort()) ||
      got.captions !== want.c) { mismatches++; if (mismatches < 3) console.log("   differs on", JSON.stringify(answers)); }
}
ok(mismatches === 0, "kit rules == original rules", mismatches + " mismatches");
ok(Object.keys(P.deriveFromAnswers({}, P.RULES, P.EXPERIENCE_TO_LEVEL).flags).length === 0, "no answers switch nothing on");
// Every question option has a rule (so nothing on screen is a tick that does nothing silently).
const ruleIds = new Set(P.RULES.map((r) => r.when));
const orphan = QUESTIONS.flatMap((q) => q.options.map((o) => q.key + ":" + o.id)).filter((k) => !ruleIds.has(k));
ok(orphan.length === 0, "every answer has a rule and a summary line", orphan.join(", "));
const noSay = P.RULES.filter((r) => !r.say).map((r) => r.when);
ok(noSay.length === 0, "every rule tells the person what it did", noSay.join(", "));

/* ── 2. Precedence: explicit > answers > device > default ──────────────── */
section("2. Precedence");
{
  const dev = { flags: { touch: true, motion: true }, look: { contrast: "high" } };
  const r1 = P.resolve({}, dev, P.RULES, P.FLAGS, P.LOOK, P.EXPERIENCE_TO_LEVEL);
  ok(r1.flags.touch && r1.source.flags.touch === "device", "device gives a phone 44px targets with no answers");
  const r2 = P.resolve({ explicit: { flags: { touch: false } } }, dev, P.RULES, P.FLAGS, P.LOOK, P.EXPERIENCE_TO_LEVEL);
  ok(r2.flags.touch === false && r2.source.flags.touch === "you", "an explicit off beats the device");
  const r3 = P.resolve({ answers: { motor: ["limited-motor"] }, explicit: { flags: { touch: false } } }, {}, P.RULES, P.FLAGS, P.LOOK, P.EXPERIENCE_TO_LEVEL);
  ok(r3.flags.touch === false, "an explicit off beats the answers");
  const r4 = P.resolve({ answers: { vision: ["low-vision"] }, explicit: { look: { contrast: null } } }, dev, P.RULES, P.FLAGS, P.LOOK, P.EXPERIENCE_TO_LEVEL);
  ok(r4.look.contrast === null && r4.look.text === "xlarge", "choosing the standard look on purpose (null) sticks; other answer looks stay");
  const r5 = P.resolve({ answers: { experience: "new" } }, {}, P.RULES, P.FLAGS, P.LOOK, P.EXPERIENCE_TO_LEVEL);
  ok(r5.level === "basics", "new starts at basics");
  ok(P.resolve({ answers: { experience: "unsure" } }, {}, P.RULES, P.FLAGS, P.LOOK, P.EXPERIENCE_TO_LEVEL).level === "everything", "not sure starts with everything");
  ok(P.resolve({}, {}, P.RULES, P.FLAGS, P.LOOK, P.EXPERIENCE_TO_LEVEL).haptics === true, "vibration on unless turned off");
}

/* ── 3. The pre-paint script gives exactly what the app gives ─────────────
 * Random profiles x every device combination, run as an inline script in a
 * simulated page, against applyNow on the same page. */
section("3. Pre-paint == app, on random profiles and every device");
{
  P.configure({ storageKey: "t-a11y" });
  const src = P.prepaintScript();
  let rng = 12345; const rnd = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pick = (arr) => arr.filter(() => rnd() < 0.3);
  let runs = 0, diffs = 0;
  const { w, d } = browser();
  for (let i = 0; i < 300; i++) {
    const prof = { v: 1, answers: {}, explicit: { flags: {}, look: {} } };
    for (const [g, ids] of Object.entries(ORIGINAL)) prof.answers[g] = pick(ids);
    if (rnd() < 0.4) prof.answers.experience = ["new", "some", "lots", "unsure"][Math.floor(rnd() * 4)];
    for (const f of P.FLAGS) if (rnd() < 0.15) prof.explicit.flags[f.key] = rnd() < 0.5;
    for (const l of P.LOOK) if (rnd() < 0.15) prof.explicit.look[l.key] = l.options[Math.floor(rnd() * l.options.length)][0];
    if (rnd() < 0.1) prof.haptics = false;
    for (let env = 0; env < 8; env++) {
      setDevice(w, { coarse: env & 1, reduce: env & 2, contrast: env & 4 });
      w.localStorage.setItem("t-a11y", JSON.stringify(prof));
      for (const a of Array.from(d.documentElement.attributes)) d.documentElement.removeAttribute(a.name);
      w.eval(src);
      const pre = attrs(d);
      for (const a of Array.from(d.documentElement.attributes)) d.documentElement.removeAttribute(a.name);
      P.applyNow(w, d);
      const app = attrs(d);
      runs++;
      if (pre !== app) { diffs++; if (diffs < 3) console.log("   pre:", pre, "\n   app:", app); }
    }
  }
  ok(diffs === 0, `pre-paint matched the app in ${runs - diffs}/${runs} runs`);
  // Can this check fail? Show it a page that is wrong by one attribute.
  w.localStorage.setItem("t-a11y", JSON.stringify({ v: 1, answers: { motor: ["limited-motor"] } }));
  w.eval(src);
  d.documentElement.removeAttribute("data-touch");
  const wrong = attrs(d);
  P.applyNow(w, d);
  ok(wrong !== attrs(d), "the comparison notices a single wrong attribute");
  ok(/^\(function\(\)\{/.test(src) && !/=>|\bconst\b|\blet\b|`/.test(src), "pre-paint is plain ES5 (no arrows, const, let or template strings)");
  console.log("   pre-paint size:", src.length, "characters");
}

/* ── 4. Reading time ─────────────────────────────────────────────────────── */
section("4. Reading time");
{
  const { d } = browser();
  const short = P.dwellMs(2500, "Saved", d);
  const long = "Placed C4 at bar 1 beat 1, in the C chord, on the melody track.";
  ok(short === 2500, "short message: base time", short);
  ok(P.dwellMs(2500, long, d) === 2500 + (long.length - 40) * 75, "longer message: more time", P.dwellMs(2500, long, d));
  d.documentElement.setAttribute("data-dwell", "long");
  ok(P.dwellMs(2500, "Saved", d) === 7500, "longer to read: three times", P.dwellMs(2500, "Saved", d));
  ok(P.dwellMs(2500, "x".repeat(5000), d) === 60000, "capped at a minute");
  d.documentElement.removeAttribute("data-dwell");
  ok(P.dwellMs(2500, "x".repeat(5000), d) === 15000, "capped at 15 s otherwise");
}

/* ── 5. Announcements do not flood ─────────────────────────────────────── */
section("5. Announcements");
{
  const { d } = browser();
  const a = P.createAnnouncer(d, { streamMs: 120, repeatMs: 1000 });
  ok(a.say("Saved") === true, "first message is said");
  ok(a.say("Saved") === false, "the same words within a second are dropped");
  ok(a.say("Deleted") === true, "a different message is said");
  for (let i = 1; i <= 50; i++) a.stream("Count " + i);
  await wait(200);
  ok(a.regions.ticker.textContent === "Count 50", "50 fast ticks become one announcement of the latest", a.regions.ticker.textContent);
}

/* ── 6. Every event reaches at least two channels ─────────────────────── */
section("6. Multi-channel feedback");
{
  P.configure({ storageKey: "t-fb" });
  let b = browser();
  let used = P.createFeedback({ doc: b.d, win: b.w }).notify({ text: "Saved", kind: "success" });
  ok(used.length >= 2 && used.includes("text"), "no vibration hardware: text + speech", used.join("+"));
  ok(/^✓ Done: Saved$/.test(b.d.querySelector(".a11y-caption").textContent), "the caption carries a glyph and a word, not only colour");
  b = browser({ vibrate: true });
  used = P.createFeedback({ doc: b.d, win: b.w }).notify({ text: "Saved", kind: "success" });
  ok(used.includes("vibration"), "a phone that can vibrate also vibrates", used.join("+"));
  P.setExplicit({ haptics: false }, b.w, b.d);
  used = P.createFeedback({ doc: b.d, win: b.w }).notify({ text: "Saved again", kind: "success" });
  ok(!used.includes("vibration") && used.length >= 2, "vibration off is respected and two channels remain", used.join("+"));
}

/* ── 7. The questionnaire, keyboard and screen reader only ───────────────── */
section("7. Questionnaire, first run, without a mouse");
{
  P.configure({ storageKey: "t-q" });
  const { w, d } = browser({ coarse: true });
  const opener = d.getElementById("opener");
  opener.focus();
  let done = null;
  const key = (k, shift = false) => d.activeElement.dispatchEvent(new w.KeyboardEvent("keydown", { key: k, shiftKey: shift, bubbles: true }));
  openQuestionnaire({ doc: d, win: w, appName: "Acme", onDone: (r) => { done = r; } });
  const dlg = d.querySelector('[role="dialog"]');
  ok(dlg && dlg.getAttribute("aria-modal") === "true", "is a modal dialog");
  ok(d.activeElement.id === "q-heading", "the question heading has focus");
  ok(d.querySelector("main").hasAttribute("inert"), "the page behind is inert");
  ok(/Welcome to Acme/.test(d.activeElement.textContent), "the app name is filled in");
  const yes = d.querySelector('[data-go="yes"]'), no = d.querySelector('[data-go="no"]');
  ok(yes && no && yes.className === no.className, "Yes and No look the same: neither is the default");

  yes.click();
  ok(d.activeElement.id === "q-heading" && /screen/.test(d.activeElement.textContent), "Seeing: focus on the new question");
  const lv = d.querySelector('[data-opt="low-vision"]');
  lv.focus(); lv.click();
  ok(d.activeElement.dataset.opt === "low-vision" && d.activeElement.getAttribute("aria-pressed") === "true",
    "ticking keeps focus on the same answer and says pressed");
  ok(d.activeElement.querySelector(".q-box").textContent === "✓", "ticked shows a tick shape, not only colour");
  // Focus trap: from the last control, Tab wraps to the first.
  const focusables = Array.from(dlg.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])'));
  focusables[focusables.length - 1].focus();
  key("Tab");
  ok(d.activeElement === focusables[0], "Tab from the last control wraps to the first");
  focusables[0].focus();
  key("Tab", true);
  ok(d.activeElement === focusables[focusables.length - 1], "Shift+Tab from the first wraps to the last");
  key("Escape");
  ok(/Welcome/.test(d.querySelector("#q-heading").textContent), "Escape goes back a step");
  d.querySelector('[data-go="yes"]').click();
  ok(d.querySelector('[data-opt="low-vision"]').getAttribute("aria-pressed") === "true", "going back keeps the answers");
  const next = () => d.querySelector('[data-act="next"]').click();
  next(); // hearing
  d.querySelector('[data-opt="deaf"]').click();
  next(); // motor
  d.querySelector('[data-opt="switch"]').click();
  next(); // comfort
  next(); // summary
  const sum = d.querySelector(".q-summary").textContent;
  ok(/Extra-large text/.test(sum) && /Visible text for every sound/.test(sum) && /Deleting asks first/.test(sum), "the summary names each change");
  next(); // experience
  const r = d.querySelector('input[value="new"]');
  r.focus(); r.click();
  ok(d.activeElement.value === "new", "choosing a level keeps focus on it");
  next(); // finish
  ok(!d.querySelector('[role="dialog"]'), "the dialog closes");
  ok(!d.querySelector("main").hasAttribute("inert"), "the page is given back");
  ok(d.activeElement === opener, "focus returns to where it was");
  const A = attrs(d);
  for (const want of ["data-text=xlarge", "data-contrast=high", "data-captions=on", "data-dwell=long", "data-confirm=always", "data-level=basics", "data-touch=comfortable"])
    ok(A.includes(want), "applied " + want, A);
  ok(done && done.vision.includes("low-vision"), "onDone receives the answers");
  await wait(60);
  ok(d.getElementById("q-live").textContent === "Setup complete. Settings applied.", "the end is announced, after the dialog has gone");

  section("8. A second run: Escape cancels and changes nothing");
  const before = w.localStorage.getItem("t-q");
  openQuestionnaire({ doc: d, win: w, reconfigure: true });
  ok(d.querySelectorAll("[data-area]").length === 4, "opens on the four areas, to change one thing");
  ok(/Chosen now: I have low vision/.test(d.querySelector('[data-area="1"]').getAttribute("aria-label")), "each area says what is chosen now");
  key("Escape");
  ok(!d.querySelector('[role="dialog"]') && w.localStorage.getItem("t-q") === before, "Escape on a second run keeps every answer");
}

section("9. First run: Escape skips; No skips the accessibility questions");
{
  P.configure({ storageKey: "t-q2" });
  let b = browser();
  openQuestionnaire({ doc: b.d, win: b.w });
  b.d.activeElement.dispatchEvent(new b.w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  ok(P.hasAnswered(b.w) && JSON.stringify(P.loadProfile(b.w).answers) === "{}", "Escape on the first screen = none apply, and it is remembered");
  b = browser();
  openQuestionnaire({ doc: b.d, win: b.w });
  b.d.querySelector('[data-go="yes"]').click();
  b.d.querySelector('[data-opt="blind"]').click();
  b.d.activeElement.dispatchEvent(new b.w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  b.d.querySelector('[data-go="no"]').click();
  ok(/familiar/.test(b.d.querySelector("#q-heading").textContent), "No goes straight to the last question");
  b.d.querySelector('input[value="lots"]').click();
  b.d.querySelector('[data-act="next"]').click();
  ok(JSON.stringify(P.loadProfile(b.w).answers) === '{"experience":"lots"}', "after No, an earlier tick is not applied");
}

section("10. Extra questions for your own domain");
{
  P.configure({ storageKey: "t-q3" });
  const b = browser();
  openQuestionnaire({ doc: b.d, win: b.w, extraQuestions: [{ key: "input", title: "Your setup", heading: "How will you draw?",
    body: "Pick all that apply.", options: [{ id: "pen", label: "A pen tablet", hint: "Pressure works." }, { id: "mouse", label: "A mouse", hint: "" }] }] });
  b.d.querySelector('[data-go="no"]').click();
  ok(/How will you draw/.test(b.d.querySelector("#q-heading").textContent), "your question is asked, on either path");
  b.d.querySelector('[data-opt="pen"]').click();
  b.d.querySelector('[data-act="next"]').click();
  b.d.querySelector('[data-act="next"]').click();
  ok(JSON.stringify(P.loadProfile(b.w).answers.input) === '["pen"]', "and its answer is saved under its key");
}

/* ── 11. Settings panel: honest about where a value came from ──────────── */
section("11. Settings panel");
{
  P.configure({ storageKey: "t-s" });
  const b = browser({ coarse: true });
  const host = b.d.createElement("div"); b.d.body.appendChild(host);
  renderSettings(host, { doc: b.d, win: b.w });
  let cb = host.querySelector("#s-flag-touch");
  ok(cb.checked && /From your device/.test(host.querySelector("#s-flag-touch-s").textContent), "a phone's larger targets say they came from the device");
  cb.focus(); cb.checked = false; cb.dispatchEvent(new b.w.Event("change"));
  cb = host.querySelector("#s-flag-touch");
  ok(!cb.checked && /Set by you/.test(host.querySelector("#s-flag-touch-s").textContent), "switching it off is recorded as your choice");
  ok(!b.d.documentElement.hasAttribute("data-touch"), "and the page follows at once");
  ok(b.d.activeElement === cb, "focus stays on the checkbox after the panel redraws");
  P.applyNow(b.w, b.d);
  ok(!b.d.documentElement.hasAttribute("data-touch"), "a reload does not let the device switch it back on");
  host.querySelector('[data-auto-flag="touch"]').click();
  ok(b.d.documentElement.getAttribute("data-touch") === "comfortable", "Back to automatic hands it back to the device");
  ok(b.d.activeElement && b.d.activeElement.id === "s-flag-touch", "focus moves to the setting when its button disappears");
  ok(/cannot vibrate/.test(host.textContent), "a device that cannot vibrate is told so plainly");
}

/* ── 12. Colour contrast, through the real cascade ──────────────────────────
 * Each block alone can pass while their combination fails (that is how high
 * contrast once made white text on light panels). So this parses
 * adaptive.css, works out which custom properties actually win for every
 * combination of theme, device mode, contrast and palette, using specificity
 * and source order like a browser, and measures the result. */
section("12. Contrast through the cascade, every combination (WCAG ratios)");
{
  const css = readFileSync(new URL("./adaptive.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  // Collect top-level and @media (prefers-color-scheme: light) rule blocks that set custom properties.
  const blocks = [];
  let order = 0;
  const scan = (text, media) => {
    const re = /([^{}@]+)\{([^{}]*)\}/g; let m;
    while ((m = re.exec(text))) {
      const props = {}; for (const [, k, v] of m[2].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\b/g)) props[k] = v;
      if (Object.keys(props).length) for (const sel of m[1].split(",")) blocks.push({ sel: sel.trim(), media, props, order: order++ });
    }
  };
  let rest = css;
  for (const mm of css.matchAll(/@media\s*\(prefers-color-scheme:\s*light\)\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g)) {
    scan(mm[1], "light"); rest = rest.replace(mm[0], "");
  }
  rest = rest.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, ""); // other media are not colour tokens
  scan(rest, null);
  const matches = (sel, at) => {
    if (sel === ":root") return true;
    if (!/^html/.test(sel)) return false;
    const need = [...sel.matchAll(/(?<!:not\()\[([\w-]+)="([^"]+)"\]/g)];
    const not = [...sel.matchAll(/:not\(\[([\w-]+)\]\)/g)];
    return need.every(([, k, v]) => at[k] === v) && not.every(([, k]) => !(k in at));
  };
  const spec = (sel) => (sel.match(/\[/g) || []).length * 10 + (sel.startsWith(":root") ? 10 : 1);
  const tokens = (at, systemLight) => {
    const win = blocks.filter((b) => (!b.media || systemLight) && matches(b.sel, at))
      .sort((a, b) => spec(a.sel) - spec(b.sel) || a.order - b.order);
    return Object.assign({}, ...win.map((b) => b.props));
  };
  const hex = (h) => h.length === 4 ? "#" + [...h.slice(1)].map((c) => c + c).join("") : h.slice(0, 7);
  const alphaOver = (h, under) => { // a border like #ffffff66 blended onto its surface
    if (h.length !== 9) return hex(h);
    const a = parseInt(h.slice(7), 16) / 255, u = hex(under);
    return "#" + [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * a + parseInt(u.slice(i, i + 2), 16) * (1 - a)).toString(16).padStart(2, "0")).join("");
  };
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(hex(h).slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

  const worst = {};
  let combos = 0, bad = 0;
  for (const theme of [null, "dark", "light"]) for (const systemLight of [false, true])
  for (const contrast of [null, "high"]) for (const palette of [null, "tritan", "vivid"]) {
    const at = {}; if (theme) at["data-theme"] = theme; if (contrast) at["data-contrast"] = contrast; if (palette) at["data-palette"] = palette;
    const t = tokens(at, systemLight);
    const name = `theme=${theme || "auto"} device=${systemLight ? "light" : "dark"} contrast=${contrast || "std"} palette=${palette || "std"}`;
    const textMin = contrast ? 7 : 4.5;
    const checks = [
      ["body text on panels", ratio(t.fg, t["surface-1"]), textMin],
      ["body text on cards", ratio(t.fg, t["surface-2"]), textMin],
      ["body text on page", ratio(t.fg, t.bg), textMin],
      ...["accent-info", "accent-success", "accent-warning", "accent-danger"].map((a) => [a + " as text", ratio(t[a], t["surface-1"]), 4.5]),
      ["button text on accent", ratio(t["on-accent"], t["accent-info"]), 4.5],
      ["control borders", ratio(alphaOver(t["border-strong"], t["surface-2"]), t["surface-2"]), 3],
    ];
    combos++;
    for (const [what, r, min] of checks) {
      if (!worst[what] || r < worst[what].r) worst[what] = { r, name };
      if (r < min) { bad++; ok(false, `${name}: ${what} ${r.toFixed(2)}:1 (needs ${min})`); }
    }
  }
  ok(bad === 0, `all ${combos} combinations readable`);
  for (const [what, { r, name }] of Object.entries(worst)) console.log(`   lowest ${what.padEnd(22)} ${r.toFixed(2)}:1  (${name})`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
