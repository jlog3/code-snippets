# Adaptive accessibility kit

A short accessibility questionnaire, and the code that turns its answers into a different interface for each person. Plain JavaScript and CSS, no dependencies, no framework, no accounts, nothing leaves the browser.

It was extracted from **uDrum**, a browser music studio built so that disabled and non-disabled musicians make finished songs in the same software. Nothing here is specific to music: it works for any web app.

```
profile.mjs        the rules: answers + device + explicit choices -> attributes on <html>
questionnaire.mjs  the questions, as data (edit the wording freely)
dialog.mjs         the questionnaire on screen (accessible modal, no framework)
settings.mjs       a settings panel built from the same tables
adaptive.css       what each attribute does, plus colour-blind-safe tokens
demo.html          one page that visibly changes with the answers
kit.test.mjs       70 checks in a simulated browser (npm i -D jsdom; node kit.test.mjs)
```

To try it: serve the folder (`python3 -m http.server`) and open `demo.html`. Clear site data to see the first run again.

---

## Part 1. The notions

These are the ideas the code is built on. They matter more than the code: you can rewrite every file and still get them right, or copy every file and get them wrong.

**1. Equal outcomes, not identical interfaces.** The goal is that everyone reaches the same end (a finished document, a booked appointment, a song) and feels it is their own. The route should differ from person to person. Treating different people identically is not fairness.

**2. Same inside, different outside.** Keep one data model. Every way of putting things in writes to it, and every way of perceiving it reads from it. Tailor the surface, the pacing, the feedback and the amount of guidance, never the data. That is what makes tailoring safe: people can collaborate and switch methods without losing work. Never build a separate "accessible version".

**3. Different, never less.** A simplified path must reach the same ceiling. If a capability exists for one person, every person must be able to reach it by some route. Simplify the path, never the destination.

**4. Needs, not labels.** Ask what a person needs ("Animations make me dizzy"), not what condition they have. Needs combine (blind and a switch user; Deaf and dyslexic) and change with fatigue, device and surroundings, so answers combine rather than putting anyone in one box. Every screen of the questionnaire is multi-select, and every answer is optional.

**5. What the person says beats what the software guesses.** Precedence is fixed: an explicit choice beats the questionnaire, which beats the device, which beats the default. An explicit "off" is stored as `false`, never deleted, so the device can never quietly switch it back on.

**6. The device already knows things.** A finger on a touchscreen is not a disability, it is a fact about the hardware. The OS reduced-motion and high-contrast settings are already a statement of need. Use them, so that "no needs" does not quietly mean "the least usable defaults".

**7. Always changeable.** A tailored default is a starting point, never a cage. Every choice is visible and changeable, the settings say where each value came from (you, your answers, your device), nobody is locked into an accessible mode or out of the standard one. The app suggests; it does not impose.

**8. Grow with the person.** Start beginners with fewer controls, reveal more as they go, let experienced people skip guidance. Hidden is never gone: everything stays reachable by search and "Show all".

**9. At least two channels, and text is always one.** Every event reaches the person through at least two senses they actually have. Sight, hearing and touch should each be enough on their own.

**10. Never colour alone.** Shape, word or position always carries the meaning too. The standard palette is colour-blind safe (Wong / Okabe-Ito), so nobody has to find a setting to be able to use the app.

**11. Parity of input.** Pointer, touch, keyboard, switch scanning, voice control, screen reader and braille display can each complete every task. Measure it: keyboard in tab stops, switch access in scan steps and seconds.

**12. Focus is never dropped.** When a control disappears or a panel redraws, move focus somewhere meaningful. Escape closes or goes back, but never inside a text field.

**13. Announce changes, not re-reads.** Screen-reader announcements must not flood. Repeats are dropped, and fast-ticking values (timers, progress, playheads) go to a throttled "stream" that only speaks the latest.

**14. Plain language.** No jargon a beginner would not know. Say what a setting will do, not what it is called.

**15. Honesty.** Never fake a capability. "Not sure" is a valid answer. State limits plainly: for example, iPhones cannot vibrate from a web page, so the settings say so rather than showing a switch that does nothing.

**16. One source of truth.** One table of flags, one set of rules, one function that decides, read by every page and by the script that runs before first paint. In uDrum, three hand-written copies of this logic once gave eight test profiles eight different interfaces, and phone users got 32-pixel targets until the framework loaded. The kit's pre-paint script embeds the decision functions' own source, so it cannot drift.

**17. Private by default, free by default.** No accounts; everything stays on the device. Accessibility is never behind a paywall.

---

## Part 2. The questionnaire

A first screen asks one question, with two answers of equal size and weight, so the choice is read rather than made by whichever button looks like the way on:

> Welcome to {app}. Do you need any accessibility options?
> **Yes, or not sure: show me the options** · **No, I don't need accessibility options**

"Not sure" goes with yes, because looking costs a minute and nothing is applied without a tick. No skips straight to the last question. Escape on the first screen means "none apply".

Then four multi-select screens, a summary of exactly what will change, and one question about experience. Every answer says what it will do, underneath it.

| Group | Answer | What changes |
|---|---|---|
| **Seeing** | I'm blind or use a screen reader | Nothing extra to switch on: announcements and full keyboard control are on for everyone. The summary says so honestly. |
| | I have low vision | Extra-large text, high contrast, thicker focus ring, longer to read |
| | I'm red-green colour blind | Nothing: the standard palette already suits it |
| | I'm blue-yellow colour blind | Blue-yellow (tritan) safe palette |
| | Colour blind, not sure which type | Standard safe palette; others offered in settings |
| **Hearing** | I'm Deaf | Text for every sound, vibration where possible, longer to read |
| | I'm hard of hearing | Text for every sound, longer to read |
| | I just prefer text for everything | Text for every sound, longer to read |
| **Controlling** | A keyboard only | Nothing extra: everything works from the keyboard for everyone |
| | Limited fine motor control, or a tremor | Targets at least 44 x 44 px with spacing, longer to read |
| | A switch device or eye tracker | Deleting asks first, accidental double presses ignored, longer to read |
| | Voice control *(added for the kit)* | Nothing extra: every control has a visible name to say |
| **Comfort** | Animations and movement make me dizzy | All motion removed |
| | Dyslexia, or reading is tiring | Easier-to-read font and spacing, longer to read |
| | A simpler, less cluttered screen | Advanced controls hidden until asked for, longer to read |
| | Surprise sounds or sudden changes are stressful | Nothing starts on its own; microphone and camera stay off |
| **Experience** | New / Some / A lot / Not sure | Starts with the basics / the common controls / everything / everything |

"Longer to read" comes from several answers for different reasons: reading is slower (dyslexia, simpler), finding the text costs time first (low vision), captions are not a convenience but the sound itself (Deaf, hard of hearing), and an undo bar is useless if it vanishes before you can reach it (switch, limited motor).

The device adds: a touchscreen gives larger targets; the OS reduced-motion setting removes motion; the OS high-contrast setting gives high contrast. Each only when the person has not said otherwise.

A second run (from the Accessibility button) opens on the four areas, each showing what is chosen now, so somebody changing one thing goes straight to it. Escape there cancels and changes nothing.

---

## Part 3. How the answers change the interface and the interactions

The profile writes attributes on `<html>`. `adaptive.css` handles what CSS can. The rest is a small amount of code in your components, using the helpers in `profile.mjs`. This table is the contract.

| Attribute | CSS does this for you | Your code should also do this |
|---|---|---|
| `data-touch="comfortable"` | Every control at least 44 x 44 px, 8 px between toolbar items, wider scrollbars | Give every drag a button or key alternative. Do not rely on hover. |
| `data-motion="reduce"` | Kills animations, transitions and smooth scrolling | Replace movement with a static cue (a border colour change). Check `motionReduced()`, never `prefers-reduced-motion` directly, which misses the app's own switch. |
| `data-density="simple"` | Hides anything with class `a11y-advanced` | Mark advanced controls with that class. Keep them reachable by search. |
| `data-confirm="always"` | (nothing) | Call `await confirmDestructive(msg)` before deleting, and `swallowRepeatClick()` after a press that changes the screen. Everyone else should get undo instead of a question. |
| `data-calm="on"` | (nothing) | Check `mayStartOnItsOwn()` before autoplaying sound or video, or opening the microphone or camera. A sound answering a press is fine. |
| `data-dwell="long"` | (nothing) | Use `dwellMs(base, text)` for every timeout on a message. Let undo bars wait until dismissed. |
| `data-captions="on"` | Shows elements with class `a11y-caption-only` | Give every sound a text equivalent. `createFeedback().notify()` does it for events. |
| `data-level="basics\|growing\|everything"` | Hides `[data-min-level="growing"]` and `[data-min-level="everything"]` below their level | Offer "Show all" and search. Use `levelAllows(min)` in code. |
| `data-text`, `data-contrast`, `data-palette`, `data-reading`, `data-theme` | Text size, contrast, palette, reading face, theme | Size everything in `rem`. Use the colour tokens, never hard-coded colours. Pair every colour with a glyph or a word. |

### Feedback: one bus, at least two channels

```js
import { createAnnouncer, createFeedback } from "./profile.mjs";
const announcer = createAnnouncer(document);
const feedback = createFeedback({ announcer });

feedback.notify({ text: "Saved", kind: "success" });   // returns ["text","speech","vibration"]
announcer.stream("Uploaded 40%");                       // throttled: never floods a screen reader
```

Every message appears as on-screen text with a glyph and a word (`✓ Done: Saved`), goes to the screen reader (and so to a braille display), vibrates where the device can and the person allows, and plays your sound if you pass one. The return value lists the channels used, so you can test the two-channel rule.

### Designing each feature for each person

The attributes cover the defaults. For each new feature, also work through this table: how will each group put things in, how will they perceive the result, what is the best version for them, and does it reach the same end as everyone else's?

| Group | Putting things in | Perceiving the result | Watch for |
|---|---|---|---|
| Blind, screen reader | Keyboard; every control named | Announcements of changes; logical reading order | Unlabelled icons, focus lost on redraw, announcement floods |
| Braille display | Same as screen reader | Short, front-loaded text | Long messages where the point comes last |
| Low vision | Pointer at large zoom | Large text, contrast, a visible focus ring | Layouts that break at 200% zoom, faint borders |
| Colour blind | Any | Glyph, word or position as well as colour | Red/green status with nothing else |
| Deaf, hard of hearing | Any | Text and visuals for every sound; vibration | Audio-only alerts, captions that vanish too fast |
| Deafblind | Keyboard, braille | Braille text, vibration | Anything that is only visual or only audio |
| Limited motor, tremor | Large targets, no precise drags | Any | Small targets, drag-only actions, timeouts |
| Switch, eye gaze | One or two inputs, scanning | Any | Double activation, deep menus, actions under the pointer after a screen change |
| Voice control | Spoken names of visible controls | Any | Controls whose visible text differs from their name |
| Dyslexia, ADHD, beginners | Any | Plain words, fewer choices at once | Jargon, walls of text, everything shown at once |
| Vestibular | Any | Static cues | Parallax, sliding panels, auto-scrolling |
| Anxiety, sensory sensitivity | Any | Predictable, quiet, nothing sudden | Autoplay, surprise sounds, flashing |
| Experts | Shortcuts, everything visible | Dense views | Guidance they cannot skip |

---

## Part 4. Using it in your app

**1. Paint the right interface first.** Put the pre-paint script inline in `<head>`, before your stylesheet:

```js
// at build time, or in a server component
import { configure, prepaintScript } from "./profile.mjs";
configure({ storageKey: "yourapp-a11y" });
const inline = prepaintScript();   // ~6.5 KB of ES5; put it in <script>{inline}</script>
```

Without it, the page paints with the wrong sizes and jumps when your framework loads. In React or Next.js, use `<script dangerouslySetInnerHTML={{ __html: inline }} />` in the root layout, and `suppressHydrationWarning` on `<html>`.

**2. Load the CSS** (`adaptive.css`) and use its tokens (`--fg`, `--surface-1`, `--accent-info` and so on) in your own styles, or map them onto your design system's.

**3. Ask once, on whichever page somebody lands on first.**

```js
import { hasAnswered, configure } from "./profile.mjs";
import { openQuestionnaire } from "./dialog.mjs";
configure({ storageKey: "yourapp-a11y" });
if (!hasAnswered()) openQuestionnaire({ appName: "Your App" });
```

**4. Always offer the way back.** A visible Accessibility button that reopens the questionnaire (`reconfigure: true`) and a settings panel (`renderSettings(element)`).

**5. Read the profile in your components** with `wants("calm")`, `motionReduced()`, `dwellMs()`, `levelAllows()`, `confirmDestructive()`. Listen for `window` event `a11y:change` to react live.

### Adapting it to your domain

- **Ask your own setup questions** with `openQuestionnaire({ extraQuestions: [...] })`, in the same shape as `QUESTIONS`. uDrum asked "How will you get music in?" (voice, guitar on a lead, MIDI, typed notes, a single switch); a drawing app might ask about pen tablets. The answers are saved under their key; read them with `loadProfile().answers`.
- **Add a behaviour:** one row in `FLAGS`, one or more rows in `RULES`, CSS for its attribute. Nothing else; the settings panel, summary, pre-paint and tests pick it up.
- **Add a device rule:** one row in `DEVICE` (any media query).
- **Change a question's wording** freely. Change an answer's id only together with its rule. If you change the questions enough that people should be asked again, bump `PROFILE_VERSION`.

---

## Part 5. What was verified, and what was not

`node kit.test.mjs` runs 70 checks against the real modules in jsdom. Among them:

- The kit's rules give exactly the same result as uDrum's original code for all 32,768 combinations of the original answers.
- The pre-paint script and the app set identical attributes in 2,400 runs (300 random profiles, every combination of touchscreen, reduced motion and high contrast).
- A full first run with keyboard alone: focus on each new question, focus kept on a ticked answer, Tab and Shift+Tab wrap inside the dialog, Escape goes back, the page behind is inert, focus returns to where it was, and the end is announced after the dialog closes.
- A second run: Escape cancels without changing a single stored answer.
- The settings panel says where each value came from, an explicit "off" survives a reload, and focus is kept when the panel redraws.
- Colour contrast resolved through the real CSS cascade for all 36 combinations of theme, device mode, contrast and palette. Lowest results: body text 13.37:1, accents used as text 4.88:1, button text 5.92:1, control borders 3.79:1.

The checks are built to fail: six deliberate breakages (a wrong rule, no focus return, a broken focus trap, Escape wiping answers, a pre-paint difference, a low-contrast colour) were each caught. Rendering the demo in a real browser also caught a bug the first version of the tests missed: high contrast on a device in light mode set white text on light panels. It is fixed, and the cascade test now covers it.

**Not verified:** real screen readers (NVDA, JAWS, VoiceOver, TalkBack), real switch and eye-gaze hardware, voice control software, or Safari. jsdom does not lay out pages, so target sizes were not measured in pixels. Contrast was measured for the tokens, not for every component you build with them. The questionnaire's wording came out of uDrum's own testing, not a large study. None of this is a WCAG conformance claim, and none of it replaces testing with disabled people.

---

## Credits

Extracted from uDrum's accessibility profile, questionnaire and global styles. Colour-blind-safe palette after Wong (2011, *Nature Methods*) and Okabe and Ito. Choose a licence before you publish this (MIT is common for a kit like this).
