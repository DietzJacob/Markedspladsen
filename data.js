// Markedspuls — seed data (step 1: inlined, no Firebase yet)
// Sources: design_handoff_markedspuls/data.jsx + data-extras.jsx

const TEMPS = {
  glow:     { label: "Glødende",     dot: "🔴", color: "#D85A3F", soft: "rgba(216,90,63,0.14)" },
  warm:     { label: "Varm",         dot: "🟠", color: "#E0A04A", soft: "rgba(224,160,74,0.14)" },
  interest: { label: "Interesseret", dot: "🟡", color: "#C8C16A", soft: "rgba(200,193,106,0.13)" },
  cool:     { label: "Kølig",        dot: "🔵", color: "#6E8AA6", soft: "rgba(110,138,166,0.13)" },
  unknown:  { label: "Ukendt",       dot: "⚫", color: "#7A7672", soft: "rgba(122,118,114,0.13)" },
};

// Pipeline cards. Lane keys: now / next / bubbles
const PIPELINE = [
  // ── DENNE UGE ──────────────────────────────────────────────
  {
    id: "c01", lane: "now",
    name: "Mette Lindholm", company: "Nordea Liv & Pension",
    temp: "glow", probability: 90, value: 420000, booked: 0,
    deadline: "2026-05-04", lastContact: "2026-04-29",
    nextStep: "Send kontrakt + scope-doc",
    afterNext: "Kickoff-møde fre.",
    note: "Mette har fået budget godkendt. Bare lige formalia.",
    log: ["29/4 — Telefon, 22 min. Grønt lys.", "24/4 — Workshop hos dem.", "11/4 — Første intro via Lars."],
  },
  {
    id: "c02", lane: "now",
    name: "Jonas Bramsen", company: "Ørsted Onshore",
    temp: "warm", probability: 50, value: 280000, booked: 0,
    deadline: "2026-05-06", lastContact: "2026-04-27",
    nextStep: "Pitch v2 — pris-justeret",
    afterNext: "Beslutning ult. uge",
    note: "De vakler på pris. Tror de finder pengene.",
    log: ["27/4 — Mail-tråd om pris.", "21/4 — Pitch hos dem.", "08/4 — Brief modtaget."],
  },
  {
    id: "c03", lane: "now",
    name: "Sara Holm-Pedersen", company: "Coop Crowdfunding",
    temp: "warm", probability: 50, value: 165000, booked: 40000,
    deadline: "2026-05-05", lastContact: "2026-04-30",
    nextStep: "Bekræft fase 2-budget",
    afterNext: "Sprint-planlægning",
    note: "Fase 1 leveret. Venter på fase 2-godkendelse.",
    log: ["30/4 — Status-call.", "22/4 — Fase 1 leveret.", "01/3 — Aftale signed."],
  },
  {
    id: "c04", lane: "now",
    name: "Kim Vestergaard", company: "DSB Erhverv",
    temp: "interest", probability: 25, value: 95000, booked: 0,
    deadline: "2026-05-07", lastContact: "2026-04-25",
    nextStep: "Kort follow-up call",
    afterNext: "Afklare scope",
    note: "Lidt usikker på hvad de egentlig vil.",
    log: ["25/4 — Kaffemøde.", "12/4 — LinkedIn-besked."],
  },

  // ── NÆSTE UGE ──────────────────────────────────────────────
  {
    id: "c05", lane: "next",
    name: "Anne-Sofie Krogh", company: "Velux Studio",
    temp: "glow", probability: 90, value: 310000, booked: 0,
    deadline: "2026-05-12", lastContact: "2026-04-28",
    nextStep: "Endelig SOW-gennemgang",
    afterNext: "Underskrift",
    note: "Stort potentiale — tre projekter i pipeline efter dette.",
    log: ["28/4 — Tech-team-møde.", "20/4 — Scope godkendt.", "02/4 — Intro fra Marie."],
  },
  {
    id: "c06", lane: "next",
    name: "Thomas Riis", company: "Maersk Tech Hub",
    temp: "warm", probability: 50, value: 540000, booked: 0,
    deadline: "2026-05-13", lastContact: "2026-04-26",
    nextStep: "Møde med deres CTO",
    afterNext: "Tilbud sendes",
    note: "CTO skal med på vognen. Han er skeptisk.",
    log: ["26/4 — Forberedelses-call.", "15/4 — Workshop.", "30/3 — Initial brief."],
  },
  {
    id: "c07", lane: "next",
    name: "Louise Bach", company: "Tryg Forsikring",
    temp: "interest", probability: 25, value: 220000, booked: 0,
    deadline: "2026-05-11", lastContact: "2026-04-22",
    nextStep: "Sende case-eksempler",
    afterNext: "Beslutning om workshop",
    note: "Nysgerrig men ikke i hast.",
    log: ["22/4 — Kort intro.", "10/4 — Mail-introduktion."],
  },
  {
    id: "c08", lane: "next",
    name: "Rasmus Dahl", company: "Bestseller Digital",
    temp: "cool", probability: 25, value: 180000, booked: 0,
    deadline: "2026-05-14", lastContact: "2026-04-15",
    nextStep: "Genoplive samtalen",
    afterNext: "?",
    note: "Stille i to uger. Skal have et puf.",
    log: ["15/4 — Mail (intet svar).", "01/4 — Møde."],
  },

  // ── BOBLER DERUDE ──────────────────────────────────────────
  {
    id: "c09", lane: "bubbles",
    name: "Henrik Sønderby", company: "Novo Nordisk Foundation",
    temp: "warm", probability: 50, value: 800000, booked: 0,
    deadline: "2026-06-02", lastContact: "2026-04-18",
    nextStep: "Vente på deres internal review",
    afterNext: "Møde i juni",
    note: "Stort projekt, lang køreplan.",
    log: ["18/4 — Pitch leveret.", "05/4 — Brief.", "20/3 — Intro."],
  },
  {
    id: "c10", lane: "bubbles",
    name: "Camilla Westergaard", company: "Jysk Studio",
    temp: "interest", probability: 25, value: 140000, booked: 0,
    deadline: "2026-05-25", lastContact: "2026-04-10",
    nextStep: "Sende oplæg",
    afterNext: "Måske workshop",
    note: "Varm intro fra netværk.",
    log: ["10/4 — Kaffe.", "02/4 — Intro via Sebastian."],
  },
  {
    id: "c11", lane: "bubbles",
    name: "Mads Frederiksen", company: "TDC Net",
    temp: "cool", probability: 10, value: 95000, booked: 0,
    deadline: "2026-06-15", lastContact: "2026-03-28",
    nextStep: "Re-engage Q3?",
    afterNext: "—",
    note: "Lå død. Måske nyt liv efter sommer.",
    log: ["28/3 — Sidste mail.", "15/3 — Kort call."],
  },
  {
    id: "c12", lane: "bubbles",
    name: "Ingrid Lassen", company: "Politiken Studio",
    temp: "unknown", probability: 10, value: 60000, booked: 0,
    deadline: "2026-06-20", lastContact: "2026-04-02",
    nextStep: "Afklare om de overhovedet vil",
    afterNext: "—",
    note: "Tabt tråden. Skal genstartes eller lukkes.",
    log: ["02/4 — Møde aflyst.", "20/3 — Intro."],
  },
  {
    id: "c13", lane: "bubbles",
    name: "Peter Holm", company: "Danske Bank Innovation",
    temp: "interest", probability: 25, value: 360000, booked: 0,
    deadline: "2026-07-01", lastContact: "2026-04-20",
    nextStep: "Workshop-forslag i juni",
    afterNext: "Pilot-projekt",
    note: "Langsom proces, godt potentiale.",
    log: ["20/4 — Strategi-snak.", "05/4 — Intro."],
  },
];

// Won deals — landed in the last few weeks. Lane key: "won"
const WON_DEALS = [
  { id: "w01", lane: "won", name: "Marie Holm",        company: "DR Lyd",               value: 240000, wonDate: "2026-04-22", deliverBy: "2026-06-15", note: "Lyd-design til ny podcast-serie." },
  { id: "w02", lane: "won", name: "Lars Engstrøm",     company: "Bang & Olufsen",       value: 380000, wonDate: "2026-04-15", deliverBy: "2026-07-01", note: "Brand-workshop + 3 sprints." },
  { id: "w03", lane: "won", name: "Sofie Thorup",      company: "Carlsberg Innovation", value: 160000, wonDate: "2026-04-08", deliverBy: "2026-05-20", note: "Lille pilot — kan blive stort." },
  { id: "w04", lane: "won", name: "Henrik Lund",       company: "Lego Education",       value: 290000, wonDate: "2026-03-25", deliverBy: "2026-06-30", note: "Fase 1 af 3." },
];

// Lanes (config)
const LANES = [
  { key: "now",     title: "Denne uge",       subtitle: "uge 18 — 4. til 8. maj" },
  { key: "next",    title: "Næste uge",       subtitle: "uge 19 — 11. til 15. maj" },
  { key: "bubbles", title: "Bobler derude",   subtitle: "alt andet i pipen" },
  { key: "won",     title: "Vundet — landet", subtitle: "seneste deals · går til levering" },
];

// Per-lane palette
const LANE_TINTS = {
  now:     { bg: "rgba(168, 85, 247, 0.08)",  border: "rgba(217,70,239,0.35)",  title: "#F472B6", glow: "rgba(217,70,239,0.25)" },
  next:    { bg: "rgba(34, 197, 94, 0.07)",   border: "rgba(74,222,128,0.30)",  title: "#86EFAC", glow: "rgba(74,222,128,0.20)" },
  bubbles: { bg: "rgba(56, 189, 248, 0.06)",  border: "rgba(56,189,248,0.28)",  title: "#7DD3FC", glow: "rgba(56,189,248,0.18)" },
  won:     { bg: "rgba(251, 146, 60, 0.07)",  border: "rgba(251,146,60,0.32)",  title: "#FDBA74", glow: "rgba(251,146,60,0.20)" },
};

// Background presets
const BG_PRESETS = [
  { name: "midnat",   bg: "#0E1428", grid: "rgba(255,255,255,0.025)" },
  { name: "indigo",   bg: "#1A1438", grid: "rgba(255,255,255,0.03)" },
  { name: "kelp",     bg: "#0F1814", grid: "rgba(255,255,255,0.025)" },
  { name: "espresso", bg: "#1C1410", grid: "rgba(255,255,255,0.022)" },
  { name: "graphite", bg: "#13141A", grid: "rgba(255,255,255,0.025)" },
];

// All-time totals (for "lander et sted" strip)
const ALL_TIME = {
  bookedThisYear: 1860000,
  wonThisYear: WON_DEALS.reduce((s, d) => s + d.value, 0),
  goalThisYear: 3500000,
};

// "Today" — fixed for static seed reproducibility (matches design spec)
const TODAY_ISO = "2026-05-01";

// ── Helpers ──────────────────────────────────────────────────
function fmtKr(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + " mio.";
  if (n >= 1000) return Math.round(n / 1000) + "k";
  return String(n);
}
function daysUntil(iso, todayIso = TODAY_ISO) {
  const a = new Date(iso), b = new Date(todayIso);
  return Math.round((a - b) / 86400000);
}
function laneCards(key) {
  return PIPELINE.filter(c => c.lane === key);
}

// Expose on window for app.js (no module bundler in step 1)
Object.assign(window, {
  TEMPS, PIPELINE, WON_DEALS, LANES, LANE_TINTS, BG_PRESETS, ALL_TIME, TODAY_ISO,
  fmtKr, daysUntil, laneCards,
});
