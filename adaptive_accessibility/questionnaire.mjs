/**
 * questionnaire.mjs — the questions, as data.
 *
 * Plain language, every answer optional, "none apply" always fine, and the
 * hint under each answer says what it will DO, so nobody has to guess what a
 * tick costs them. The answer ids are what profile.mjs RULES read; change a
 * label freely, but change an id only together with its rule.
 *
 * `{app}` in any string is replaced with your app's name.
 *
 * Asked about needs, never diagnoses: "Animations make me dizzy", not
 * "I have a vestibular disorder". Needs combine and change with fatigue,
 * device and surroundings, so every screen is multi-select.
 */

/* Each group has a colour, a picture and a word, shown together, so the
 * colour learnt on the first screen says where you are later, and the
 * picture and word say it to anyone the colour does not reach. */
export const STEP_LOOK = {
  intro:     { tint: "var(--q-access)",  icon: "access", word: "Accessibility" },
  vision:    { tint: "var(--q-vision)",  icon: "eye",    word: "Seeing" },
  hearing:   { tint: "var(--q-hearing)", icon: "ear",    word: "Hearing" },
  motor:     { tint: "var(--q-motor)",   icon: "hand",   word: "Controlling" },
  cognitive: { tint: "var(--q-comfort)", icon: "heart",  word: "Comfort" },
  summary:   { tint: "var(--q-done)",    icon: "check",  word: "Summary" },
  experience:{ tint: "var(--q-exp)",     icon: "ladder", word: "Experience" },
  custom:    { tint: "var(--q-custom)",  icon: "star",   word: "Your setup" },
};

export const INTRO = {
  heading: "Welcome to {app}. Do you need any accessibility options?",
  lead: "{app} can change how it looks, sounds and responds. For example, for:",
  groups: [
    ["vision", "a screen reader, low vision or colour blindness"],
    ["hearing", "Deaf and hard-of-hearing people"],
    ["motor", "a keyboard, switch, voice or eye tracker instead of a mouse"],
    ["cognitive", "movement, clutter or sudden sounds that bother you"],
  ],
  yes: { title: "Yes, or not sure: show me the options", sub: "Four short questions. Leave any of them blank." },
  no: { title: "No, I don’t need accessibility options", sub: "Standard settings. One more question, then {app}." },
  later: "Either way, the Accessibility button changes this later.",
  reconfigureHeading: "Let's update your accessibility settings.",
  reconfigureBody: "Change one thing, or press Begin to go through them all. Your answers so far are kept.",
};

export const QUESTIONS = [
  {
    key: "vision",
    title: "Seeing",
    heading: "How do you experience the screen?",
    body: "Pick all that apply. If none apply, leave them blank and continue.",
    options: [
      { id: "blind", label: "I'm blind or use a screen reader",
        hint: "Every change is announced, and everything works from the keyboard. Decoration that gets in the way is hidden from your screen reader." },
      { id: "low-vision", label: "I have low vision (text is hard to read)",
        hint: "Larger text, higher contrast, thicker borders and a clearer focus ring." },
      { id: "cb-rg", label: "I'm red-green colour blind",
        hint: "About 1 in 12 men and 1 in 200 women. Red and green look alike; brown, orange and red blur together. The standard colours already suit you." },
      { id: "cb-by", label: "I'm blue-yellow colour blind",
        hint: "Rarer. Blues and greens, or yellows and pinks, look alike." },
      { id: "cb-unsure", label: "I'm colour blind but not sure which type",
        hint: "The standard colours are safe for the most common types. You can try the others in settings." },
    ],
  },
  {
    key: "hearing",
    title: "Hearing",
    heading: "How do you experience sound?",
    body: "Every sound {app} makes can also appear as text, and as vibration where the device can.",
    options: [
      { id: "deaf", label: "I'm Deaf", hint: "Text for every sound, plus vibration on phones that support it." },
      { id: "hoh", label: "I'm hard of hearing", hint: "Text for every sound, and visible meters for loudness." },
      { id: "captions", label: "I just prefer text for everything", hint: "The same: every sound also appears as text." },
    ],
  },
  {
    key: "motor",
    title: "Controlling",
    heading: "How do you control the device?",
    body: "Pick all that apply.",
    options: [
      { id: "keyboard-only", label: "A keyboard only (no mouse or touch)",
        hint: "Every action is reachable with Tab, Enter and the arrow keys. Press ? at any time for help." },
      { id: "limited-motor", label: "I have limited fine motor control, or a tremor",
        hint: "Targets grow to at least 44 by 44 pixels, with space between them. Every drag has a button alternative." },
      { id: "switch", label: "A switch device or eye tracker",
        hint: "Accidental double presses are ignored, deleting asks first, and messages wait for you." },
      { id: "voice", label: "Voice control (speaking commands)",
        hint: "Every control shows a name you can say, and no action needs a precise drag." },
    ],
  },
  {
    key: "cognitive",
    title: "Comfort",
    heading: "Anything else?",
    body: "Pick all that apply.",
    options: [
      { id: "vestibular", label: "Animations and movement make me dizzy",
        hint: "All motion is removed. Highlights change border colour only; text never moves." },
      { id: "dyslexia", label: "I have dyslexia, or reading is tiring",
        hint: "An easier-to-read font, looser spacing, and longer to read messages." },
      { id: "simpler", label: "I want a simpler, less cluttered screen",
        hint: "Advanced controls are hidden until you ask for them. Nothing is removed for good." },
      { id: "anxiety", label: "Surprise sounds or sudden changes are stressful",
        hint: "Nothing plays or starts on its own. The microphone and camera stay off until you turn them on." },
    ],
  },
];

/* The last question on a first run: how many controls to START with.
 * Levels read by thickness and pip count as well as colour, because green
 * and red alone would fail red-green colour blindness. */
export const EXPERIENCE = {
  key: "experience",
  heading: "How familiar are you with apps like this?",
  body: "It decides how many controls you start with. Every control is still one search away, and Show all brings them all back. Leave it, and you get every control.",
  options: [
    { id: "new", pips: 1, label: "I'm new to this", sub: "Fewer buttons to start. More appear as you go.",
      note: "Nothing is locked. Show all brings back everything whenever you like. Starting with fewer just makes learning easier." },
    { id: "some", pips: 2, label: "Some experience", sub: "The common controls. The rest appear as you go." },
    { id: "lots", pips: 3, label: "A lot, I use tools like this often", sub: "Every control, from the start." },
    { id: "unsure", pips: 0, label: "Not sure", sub: "Every control, from the start. You can change it any time." },
  ],
};

export const SUMMARY = {
  heading: "Here's what we're applying.",
  body: "You can change any of this later from the Accessibility button.",
  none: "Standard settings, with no special changes.",
  always: [
    "Follows your device's reduced-motion and high-contrast settings.",
    "Vibration on phones that support it. You can turn it off.",
  ],
};

export function fill(str, app) { return String(str || "").split("{app}").join(app || "this app"); }

export default { STEP_LOOK, INTRO, QUESTIONS, EXPERIENCE, SUMMARY, fill };
