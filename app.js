import {
  watchPipeline, watchWon, watchUserDoc,
  createCard, updateCard, deleteCard,
  createWon, updateWon, deleteWon,
  setPrefs, isUserEmpty, seedDemoData,
} from "./db.js";
import { auth, signOutUser } from "./auth.js";

const TEMPS    = window.TEMPS;
const LANES    = window.LANES;
const LANE_TINTS = window.LANE_TINTS;
const BG_PRESETS = window.BG_PRESETS;
const SEED_PIPELINE = window.PIPELINE;
const SEED_WON      = window.WON_DEALS;
const SEED_ALL_TIME = window.ALL_TIME;
const TODAY_ISO = window.TODAY_ISO || "2026-05-01";
const fmtKr     = window.fmtKr;
const daysUntil = window.daysUntil;

const state = {
  user: null,
  pipeline: [],
  won: [],
  prefs: { bgPreset: "midnat", goalThisYear: 3500000, bookedThisYear: 1860000 },
  loaded: { pipeline: false, won: false, prefs: false },
  openId: null,
  bgPickerOpen: false,
  modal: null,
  errorBanner: null,
};

const $ = (sel, root = document) => root.querySelector(sel);

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") node.className = v;
    else if (k === "style") {
      for (const [sk, sv] of Object.entries(v || {})) {
        if (sk.startsWith("--")) node.style.setProperty(sk, sv);
        else node.style[sk] = sv;
      }
    }
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === "data") {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    } else if (v !== false && v != null) {
      node.setAttribute(k, v);
    }
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
};

const ddmm = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}`;

function laneCards(key) {
  return state.pipeline.filter(c => c.lane === key);
}

function laneWeightedTotal(key) {
  return laneCards(key).reduce((s, c) => s + (c.value * c.probability) / 100, 0);
}

function totalWeighted() {
  return state.pipeline.reduce((s, c) => s + (c.value * c.probability) / 100, 0);
}

function wonTotal() {
  return state.won.reduce((s, d) => s + d.value, 0);
}

function thisYearWonTotal() {
  const year = new Date(TODAY_ISO).getFullYear();
  return state.won.reduce((s, d) => {
    const wy = d.wonDate ? new Date(d.wonDate).getFullYear() : null;
    if (wy !== year) return s;
    const status = d.status || "vundet";
    return status === "vundet" ? s + d.value : s;
  }, 0);
}

function thisYearFakturertTotal() {
  const year = new Date(TODAY_ISO).getFullYear();
  return state.won.reduce((s, d) => {
    const wy = d.wonDate ? new Date(d.wonDate).getFullYear() : null;
    if (wy !== year) return s;
    return d.status === "faktureret" ? s + d.value : s;
  }, 0);
}

function bgPreset() {
  return BG_PRESETS.find(p => p.name === state.prefs.bgPreset) || BG_PRESETS[0];
}

function applyBg() {
  const p = bgPreset();
  document.documentElement.style.setProperty("--bg", p.bg);
  document.documentElement.style.setProperty("--grid", p.grid);
}

function showToast(msg, kind = "info") {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.className = `toast is-${kind}`;
  t.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { t.hidden = true; }, 3000);
}

function showErrorBanner(msg) {
  if (state.errorBanner === msg) return;
  state.errorBanner = msg;
  let banner = $("#error-banner");
  if (!banner) {
    banner = el("div", { id: "error-banner", class: "error-banner" });
    document.body.insertBefore(banner, document.body.firstChild);
  }
  banner.innerHTML = "";
  banner.appendChild(el("div", { class: "error-banner-inner" },
    el("span", null, msg),
    el("a", {
      href: "https://console.firebase.google.com/",
      target: "_blank",
      rel: "noopener",
    }, "Åbn Firebase Console")
  ));
}

function renderTopbar() {
  const root = $("#topbar");
  root.innerHTML = "";

  const row1 = el("div", { class: "topbar-row" },
    el("div", { class: "logo" },
      el("div", { class: "logo-mark" },
        document.createTextNode("MARKEDS"),
        el("span", { class: "puls" }, "PULS")
      ),
      el("div", { class: "logo-meta" }, "København · uge 18 · 2026")
    ),
    el("div", { class: "actions" },
      ...[
        { label: "+ ny",        color: "#FB923C", alpha: "rgba(251,146,60,0.4)",
          onclick: (e) => { e.stopPropagation(); openCardModal({ mode: "create", lane: "now" }); } },
        { label: "↓ export",    color: "#22D3EE", alpha: "rgba(34,211,238,0.4)",
          onclick: (e) => { e.stopPropagation(); exportJson(); } },
        { label: "↑ import",    color: "#A78BFA", alpha: "rgba(167,139,250,0.4)",
          onclick: (e) => { e.stopPropagation(); importJson(); } },
        { label: "⊙ baggrund",  color: "#86EFAC", alpha: "rgba(134,239,172,0.4)",
          onclick: (e) => { e.stopPropagation(); state.bgPickerOpen = !state.bgPickerOpen; renderTopbar(); } },
      ].map(b =>
        el("button", {
          class: "action-btn",
          style: { "--btn-color": b.color, "--btn-shadow": b.alpha, color: b.color },
          onclick: b.onclick,
        }, b.label)
      ),
      state.user ? el("div", { class: "user-chip" },
        el("span", { class: "user-email" }, state.user.email || "logget ind"),
        el("button", {
          class: "action-btn",
          style: { "--btn-color": "#94a3b8", "--btn-shadow": "rgba(148,163,184,0.4)", color: "#94a3b8" },
          onclick: async () => {
            try { await signOutUser(); } catch (_) {}
            window.location.replace("./login.html");
          },
          type: "button",
        }, "log ud")
      ) : null
    )
  );
  root.appendChild(row1);

  if (state.bgPickerOpen) {
    const dropdown = el("div", { class: "bg-dropdown", onclick: (e) => e.stopPropagation() },
      ...BG_PRESETS.map(p =>
        el("button", {
          class: "bg-swatch" + (state.prefs.bgPreset === p.name ? " is-active" : ""),
          style: { background: p.bg },
          onclick: async () => {
            state.prefs.bgPreset = p.name;
            applyBg();
            state.bgPickerOpen = false;
            renderTopbar();
            try { await setPrefs(state.user.uid, { bgPreset: p.name }); }
            catch (e) { showToast("Kunne ikke gemme baggrund: " + e.code, "error"); }
          },
        }, p.name)
      )
    );
    root.appendChild(dropdown);
  }

  const wonYear = thisYearWonTotal();
  const fakturert = thisYearFakturertTotal();
  const goal = state.prefs.goalThisYear || 0;
  const weighted = totalWeighted();
  const achieved = wonYear + fakturert;
  const pct = goal > 0 ? Math.round((achieved / goal) * 100) : 0;
  const goalSub = goal > 0 ? `${pct}% nået` : "klik for at sætte mål";
  const fakturertSub = fakturert > 0 ? "i år" : "rediger vundet → faktureret";
  const goalDisplay = goal > 0 ? fmtFraction(achieved, goal) : fmtKr(0);
  const stripCells = [
    { label: "vundet i år",     value: fmtKr(wonYear),    color: "#FDBA74", sub: "" },
    { label: "vægtet pipeline", value: fmtKr(weighted),   color: "#F472B6", sub: "forventet" },
    { label: "faktureret",      value: fmtKr(fakturert),  color: "#86EFAC", sub: fakturertSub },
    { label: "mål 2026",        value: goalDisplay,       color: "#7DD3FC", sub: goalSub,
      onclick: () => editPref("goalThisYear", "mål 2026", goal) },
  ];
  const strip = el("div", { class: "strip" },
    ...stripCells.map(c =>
      el("div", {
        class: "strip-cell" + (c.onclick ? " is-editable" : ""),
        onclick: c.onclick ? (e) => { e.stopPropagation(); c.onclick(); } : null,
      },
        el("div", { class: "strip-label" }, c.label),
        el("div", {
          class: "strip-value",
          style: { "--strip-color": c.color, "--strip-shadow": `${c.color}55` },
        },
          document.createTextNode(c.value + " "),
          el("span", { class: "unit" }, "kr")
        ),
        c.sub ? el("div", { class: "strip-sub" }, c.sub) : null
      )
    )
  );
  root.appendChild(strip);

  const fillPct = goal > 0 ? Math.min(100, (achieved / goal) * 100) : 0;
  const markerPct = goal > 0 ? Math.min(100, ((achieved + weighted) / goal) * 100) : 0;
  const goalBar = el("div", { class: "goal-bar" },
    el("div", { class: "goal-fill", style: { width: `${fillPct}%` } }),
    el("div", { class: "goal-marker", title: "vundet + vægtet", style: { left: `${markerPct}%` } })
  );
  root.appendChild(goalBar);
}

function renderCard(card) {
  const t = TEMPS[card.temp] || TEMPS.unknown;
  const tint = LANE_TINTS[card.lane] || LANE_TINTS.bubbles;
  const days = daysUntil(card.deadline);
  const overdue = days < 0;
  const soon = days >= 0 && days <= 2;
  const expanded = state.openId === card.id;

  const tempStyle = {
    "--temp-color":    t.color,
    "--temp-color-88": `${t.color}88`,
    "--temp-color-66": `${t.color}66`,
    "--temp-color-33": `${t.color}33`,
    "--temp-color-80": `${t.color}80`,
    "--lane-bg":     tint.bg,
    "--lane-border": tint.border,
    "--lane-title":  tint.title,
    "--lane-glow":   tint.glow,
  };

  const cardEl = el("div", {
    class: "card" + (overdue ? " is-overdue" : ""),
    style: tempStyle,
    onclick: () => {
      state.openId = state.openId === card.id ? null : card.id;
      renderBoard();
    },
  });

  cardEl.appendChild(el("div", { class: "card-head" },
    el("div", { style: { minWidth: "0", flex: "1" } },
      el("div", { class: "card-name" }, card.name),
      el("div", { class: "card-company" }, card.company)
    ),
    el("div", { style: { textAlign: "right" } },
      el("div", { class: "card-value" }, fmtKr(card.value)),
      el("div", { class: "card-value-unit" }, "kr")
    )
  ));

  const bar = el("div", { class: "prob-bar" });
  for (const tick of [25, 50, 75]) {
    bar.appendChild(el("div", { class: "prob-tick", style: { left: `${tick}%` } }));
  }
  const fill = el("div", { class: "prob-fill", style: { width: `${card.probability}%` } });
  const handle = el("div", { class: "prob-handle", style: { left: `calc(${card.probability}% - 6px)` } });
  bar.appendChild(fill);
  bar.appendChild(handle);
  const pct = el("span", { class: "prob-pct" }, `${card.probability}%`);
  const probRow = el("div", { class: "prob-row" }, bar, pct);
  probRow.addEventListener("click", (e) => {
    if (state.openId === card.id) e.stopPropagation();
  });
  bar.style.cursor = expanded ? "ew-resize" : "default";
  bar.title = expanded ? "Træk for at justere sandsynlighed" : "Klik kortet for at folde ud og redigere";

  let lastWritten = card.probability;
  const writeDebounced = debounce((v) => {
    if (v === lastWritten) return;
    lastWritten = v;
    updateCard(state.user.uid, card.id, { probability: v }).catch(err =>
      showToast("Kunne ikke gemme: " + (err.code || err.message), "error")
    );
  }, 300);

  const setFromEvent = (e) => {
    const r = bar.getBoundingClientRect();
    const raw = ((e.clientX - r.left) / r.width) * 100;
    const v = Math.round(Math.max(0, Math.min(100, raw)) / 5) * 5;
    card.probability = v;
    fill.style.width = `${v}%`;
    handle.style.left = `calc(${v}% - 6px)`;
    pct.textContent = `${v}%`;
    pct.style.color = t.color;
    renderTopbar();
    refreshLaneTotal(card.lane);
    writeDebounced(v);
  };
  bar.addEventListener("pointerdown", (e) => {
    if (state.openId !== card.id) return;
    e.stopPropagation();
    e.preventDefault();
    try { bar.setPointerCapture(e.pointerId); } catch (_) {}
    fill.classList.add("is-dragging");
    handle.classList.add("is-dragging");
    setFromEvent(e);
    const move = (ev) => setFromEvent(ev);
    const up = () => {
      fill.classList.remove("is-dragging");
      handle.classList.remove("is-dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });

  cardEl.appendChild(probRow);

  cardEl.appendChild(el("div", { class: "next-box" },
    el("span", { class: "next-label" }, "NEXT"),
    el("span", { class: "next-text" }, card.nextStep || "—")
  ));

  let statusText = t.label.toLowerCase();
  let metaClass = "card-meta";
  if (overdue) { statusText = "↯ overskredet"; metaClass += " is-overdue"; }
  else if (soon) { statusText = "▲ snart"; metaClass += " is-soon"; }
  cardEl.appendChild(el("div", { class: metaClass },
    el("span", { class: "status" }, statusText),
    el("span", null, ddmm(card.deadline))
  ));

  if (expanded) {
    const log = Array.isArray(card.log) ? card.log : [];
    const expansion = el("div", { class: "card-expanded" },
      el("div", { style: { marginBottom: "6px" } },
        el("div", { class: "derefter-label" }, "derefter"),
        el("div", { class: "derefter-text" }, card.afterNext || "—")
      ),
      card.note ? el("div", { class: "quote" }, `"${card.note}"`) : null,
      ...log.slice(0, 2).map(l => el("div", { class: "log-line" }, `· ${l}`)),
      el("div", { class: "card-actions" },
        el("button", {
          class: "card-action-btn",
          onclick: (e) => { e.stopPropagation(); openCardModal({ mode: "edit", card }); },
        }, "rediger"),
        el("button", {
          class: "card-action-btn is-danger",
          onclick: async (e) => {
            e.stopPropagation();
            if (!confirm(`Slet "${card.name}"?`)) return;
            try {
              await deleteCard(state.user.uid, card.id);
              showToast("Slettet", "info");
            } catch (err) {
              showToast("Kunne ikke slette: " + (err.code || err.message), "error");
            }
          },
        }, "slet")
      )
    );
    cardEl.appendChild(expansion);
  }

  return cardEl;
}

function renderWonCard(card) {
  const isFakturert = card.status === "faktureret";
  const accent = isFakturert ? "#86EFAC" : "#FDBA74";
  const bg     = isFakturert ? "rgba(134,239,172,0.10)" : "rgba(251,146,60,0.08)";
  const border = isFakturert ? "rgba(134,239,172,0.40)" : "rgba(251,146,60,0.32)";
  const glow   = isFakturert ? "rgba(134,239,172,0.30)" : "rgba(251,146,60,0.20)";

  const node = el("div", {
    class: "won-card" + (isFakturert ? " is-faktureret" : ""),
    style: {
      "--lane-bg": bg,
      "--lane-border": border,
      "--lane-title": accent,
      "--lane-glow": glow,
    },
    onclick: () => {
      state.openId = state.openId === card.id ? null : card.id;
      renderBoard();
    },
  });

  node.appendChild(el("div", { class: "card-head" },
    el("div", { style: { minWidth: "0", flex: "1" } },
      el("div", { class: "card-name" }, card.name),
      el("div", { class: "card-company" }, card.company)
    ),
    el("div", { style: { textAlign: "right" } },
      el("div", { class: "card-value" }, `+${fmtKr(card.value)}`),
      el("div", { class: "card-value-unit" }, isFakturert ? "kr · faktureret" : "kr · vundet")
    )
  ));

  node.appendChild(el("div", { class: "won-meta" },
    el("span", null, `✓ ${ddmm(card.wonDate)}`),
    el("span", null, `leverer ${ddmm(card.deliverBy)}`)
  ));

  if (card.note) node.appendChild(el("div", { class: "won-note" }, card.note));

  if (state.openId === card.id) {
    node.appendChild(el("div", { class: "card-actions" },
      el("button", {
        class: "card-action-btn",
        onclick: (e) => { e.stopPropagation(); openWonModal({ mode: "edit", card }); },
      }, "rediger"),
      isFakturert
        ? el("button", {
            class: "card-action-btn",
            onclick: async (e) => {
              e.stopPropagation();
              try {
                await updateWon(state.user.uid, card.id, { status: "vundet" });
                showToast("Markeret som vundet igen", "info");
              } catch (err) {
                showToast("Kunne ikke skifte: " + (err.code || err.message), "error");
              }
            },
          }, "→ vundet")
        : el("button", {
            class: "card-action-btn",
            style: { borderColor: "rgba(134,239,172,0.5)", color: "#86EFAC" },
            onclick: async (e) => {
              e.stopPropagation();
              try {
                await updateWon(state.user.uid, card.id, { status: "faktureret" });
                showToast("Markeret som faktureret", "info");
              } catch (err) {
                showToast("Kunne ikke skifte: " + (err.code || err.message), "error");
              }
            },
          }, "→ faktureret"),
      el("button", {
        class: "card-action-btn is-danger",
        onclick: async (e) => {
          e.stopPropagation();
          if (!confirm(`Slet "${card.name}"?`)) return;
          try {
            await deleteWon(state.user.uid, card.id);
            showToast("Slettet", "info");
          } catch (err) {
            showToast("Kunne ikke slette: " + (err.code || err.message), "error");
          }
        },
      }, "slet")
    ));
  }

  return node;
}

function renderLane(lane) {
  const tint = LANE_TINTS[lane.key];
  const isWon = lane.key === "won";
  const cards = isWon ? state.won : laneCards(lane.key);
  const total = isWon ? wonTotal() : laneWeightedTotal(lane.key);

  const laneEl = el("div", {
    class: "lane",
    "data-lane": lane.key,
    style: {
      "--lane-bg": tint.bg,
      "--lane-border": tint.border,
      "--lane-title": tint.title,
      "--lane-glow": tint.glow,
    },
  });

  let countLabel;
  if (isWon) {
    const v = cards.filter(c => (c.status || "vundet") === "vundet").length;
    const f = cards.filter(c => c.status === "faktureret").length;
    countLabel = `${v} vundet · ${f} fakt.`;
  } else {
    countLabel = `${cards.length} kort`;
  }

  laneEl.appendChild(el("div", { class: "lane-header" },
    el("div", { class: "lane-title-row" },
      el("div", { class: "lane-title" }, lane.title),
      el("div", { class: "lane-count" }, countLabel)
    ),
    el("div", { class: "lane-subtitle" }, lane.subtitle),
    el("div", { class: "lane-total" },
      el("span", { class: "lane-total-label" }, isWon ? "i alt" : "vægtet"),
      el("span", { class: "lane-total-value" }, `${fmtKr(total)} kr`)
    )
  ));

  const list = el("div", { class: "lane-cards" });
  if (isWon) {
    const vundet    = cards.filter(c => (c.status || "vundet") === "vundet")
                           .sort((a,b) => (b.wonDate||"").localeCompare(a.wonDate||""));
    const fakturert = cards.filter(c => c.status === "faktureret")
                           .sort((a,b) => (b.wonDate||"").localeCompare(a.wonDate||""));
    if (vundet.length) {
      list.appendChild(el("div", {
        class: "won-group-label",
        style: { "--g-color": "#FDBA74", "--g-glow": "rgba(251,146,60,0.30)" },
      }, "vundet"));
      for (const c of vundet) list.appendChild(renderWonCard(c));
    }
    if (fakturert.length) {
      list.appendChild(el("div", {
        class: "won-group-label",
        style: { "--g-color": "#86EFAC", "--g-glow": "rgba(134,239,172,0.30)" },
      }, "faktureret"));
      for (const c of fakturert) list.appendChild(renderWonCard(c));
    }
  } else {
    for (const c of cards) list.appendChild(renderCard(c));
  }
  list.appendChild(el("button", {
    class: "add-btn",
    onclick: (e) => {
      e.stopPropagation();
      if (isWon) openWonModal({ mode: "create" });
      else openCardModal({ mode: "create", lane: lane.key });
    },
  }, isWon ? "+ deal" : "+ kort"));
  laneEl.appendChild(list);

  return laneEl;
}

function refreshLaneTotal(laneKey) {
  const laneEl = document.querySelector(`.lane[data-lane="${laneKey}"]`);
  if (!laneEl) return;
  const totalEl = laneEl.querySelector(".lane-total-value");
  if (!totalEl) return;
  const t = laneKey === "won" ? wonTotal() : laneWeightedTotal(laneKey);
  totalEl.textContent = `${fmtKr(t)} kr`;
}

function renderBoard() {
  const root = $("#lanes");
  root.innerHTML = "";
  for (const lane of LANES) root.appendChild(renderLane(lane));
  renderLaneDots();
  attachLaneScrollListener();
}

function renderLaneDots() {
  const dotsRoot = $("#lane-dots");
  if (!dotsRoot) return;
  dotsRoot.innerHTML = "";
  LANES.forEach((lane, i) => {
    const tint = LANE_TINTS[lane.key];
    const dot = el("div", {
      class: "lane-dot" + (i === 0 ? " is-active" : ""),
      style: { "--dot-color": tint.title, "--dot-glow": tint.glow },
      "data-idx": i,
      "aria-label": lane.title,
      role: "button",
      onclick: () => {
        const target = document.querySelector(`.lane[data-lane="${lane.key}"]`);
        if (target) target.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      },
    });
    dotsRoot.appendChild(dot);
  });
}

let laneScrollAttached = false;
function attachLaneScrollListener() {
  if (laneScrollAttached) return;
  laneScrollAttached = true;
  const lanesEl = $("#lanes");
  if (!lanesEl) return;
  let raf = null;
  const update = () => {
    raf = null;
    const lanes = document.querySelectorAll(".lane");
    if (!lanes.length) return;
    const cRect = lanesEl.getBoundingClientRect();
    const cCenter = cRect.left + lanesEl.clientWidth / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
    lanes.forEach((lane, i) => {
      const r = lane.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const dist = Math.abs(center - cCenter);
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    });
    document.querySelectorAll(".lane-dot").forEach((d, i) => {
      d.classList.toggle("is-active", i === bestIdx);
    });
  };
  const onScroll = () => {
    if (raf == null) raf = requestAnimationFrame(update);
  };
  lanesEl.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
}

function fmtFraction(a, g) {
  if (g >= 1_000_000) {
    const av = (a / 1_000_000).toFixed(1).replace(".", ",");
    const gv = (g / 1_000_000).toFixed(1).replace(".", ",");
    return `${av}/${gv} mio.`;
  }
  if (g >= 1000) {
    return `${Math.round(a / 1000)}/${Math.round(g / 1000)}k`;
  }
  return `${Math.round(a)}/${Math.round(g)}`;
}

function parseKr(input) {
  if (input == null) return null;
  let s = String(input).trim().toLowerCase().replace(/\s|kr\.?|dkk/g, "").replace(",", ".");
  if (!s) return 0;
  let m;
  if ((m = s.match(/^(\d+(?:\.\d+)?)mio\.?$/))) return Math.round(parseFloat(m[1]) * 1_000_000);
  if ((m = s.match(/^(\d+(?:\.\d+)?)k$/)))      return Math.round(parseFloat(m[1]) * 1000);
  if ((m = s.match(/^\d+(?:\.\d+)?$/)))          return Math.round(parseFloat(s));
  return null;
}

async function editPref(key, label, currentValue) {
  const fmt = currentValue ? fmtKr(currentValue) : "0";
  const input = prompt(`Ny værdi for "${label}" i kr.\nSkriv som tal (fx 2500000) eller forkortet (fx "2,5 mio." eller "1500k").`, fmt);
  if (input === null) return;
  const parsed = parseKr(input);
  if (parsed === null || parsed < 0) {
    showToast("Ugyldigt beløb — prøv fx 2500000 eller 2,5 mio.", "error");
    return;
  }
  try {
    await setPrefs(state.user.uid, { [key]: parsed });
    showToast("Gemt", "info");
  } catch (err) {
    showToast("Kunne ikke gemme: " + (err.code || err.message), "error");
  }
}

function debounce(fn, ms) {
  let h;
  return (...args) => {
    clearTimeout(h);
    h = setTimeout(() => fn(...args), ms);
  };
}

function openCardModal({ mode, card, lane }) {
  const isEdit = mode === "edit";
  const data = isEdit ? card : {
    lane: lane || "now",
    name: "",
    company: "",
    temp: "warm",
    probability: 50,
    value: 100000,
    booked: 0,
    deadline: TODAY_ISO,
    lastContact: TODAY_ISO,
    nextStep: "",
    afterNext: "",
    note: "",
    log: [],
  };

  const root = $("#modal");
  root.innerHTML = "";

  const form = el("form", {
    class: "modal-form",
    onsubmit: async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = {
        lane: fd.get("lane"),
        name: fd.get("name").trim(),
        company: fd.get("company").trim(),
        temp: fd.get("temp"),
        probability: Math.round(Math.min(100, Math.max(0, +fd.get("probability") || 0)) / 5) * 5,
        value: Math.max(0, +fd.get("value") || 0),
        booked: Math.max(0, +fd.get("booked") || 0),
        deadline: fd.get("deadline"),
        lastContact: fd.get("lastContact") || TODAY_ISO,
        nextStep: fd.get("nextStep").trim(),
        afterNext: fd.get("afterNext").trim(),
        note: fd.get("note").trim(),
      };
      if (!payload.name || !payload.company) {
        showToast("Navn og firma skal udfyldes", "error");
        return;
      }
      const submitBtn = form.querySelector(".modal-submit");
      submitBtn.disabled = true;
      try {
        if (isEdit) {
          await updateCard(state.user.uid, card.id, payload);
          showToast("Gemt", "info");
        } else {
          payload.log = [];
          const newId = await createCard(state.user.uid, payload);
          state.openId = newId;
          showToast("Oprettet", "info");
        }
        closeModal();
      } catch (err) {
        showToast("Kunne ikke gemme: " + (err.code || err.message), "error");
        submitBtn.disabled = false;
      }
    },
  });

  form.appendChild(el("div", { class: "modal-title" }, isEdit ? "Rediger kort" : "Nyt kort"));

  const tempOpts = [
    ["glow", "Glødende"],
    ["warm", "Varm"],
    ["interest", "Interesseret"],
    ["cool", "Kølig"],
    ["unknown", "Ukendt"],
  ];
  const laneOpts = [
    ["now", "Denne uge"],
    ["next", "Næste uge"],
    ["bubbles", "Bobler derude"],
  ];

  const fields = [
    field("name",        "navn",          el("input", { class: "modal-input", name: "name", value: data.name, required: true, autocomplete: "off" })),
    field("company",     "firma",         el("input", { class: "modal-input", name: "company", value: data.company, required: true, autocomplete: "off" })),
    field("lane",        "lane",          select("lane", laneOpts, data.lane)),
    field("temp",        "temperatur",    select("temp", tempOpts, data.temp)),
    field("probability", "sandsynlighed (%)", el("input", { class: "modal-input", name: "probability", type: "number", min: 0, max: 100, step: 5, value: data.probability })),
    field("value",       "værdi (kr)",    el("input", { class: "modal-input", name: "value", type: "number", min: 0, step: 1000, value: data.value })),
    field("booked",      "booket (kr)",   el("input", { class: "modal-input", name: "booked", type: "number", min: 0, step: 1000, value: data.booked || 0 })),
    field("deadline",    "deadline",      el("input", { class: "modal-input", name: "deadline", type: "date", value: data.deadline, required: true })),
    field("lastContact", "sidste kontakt", el("input", { class: "modal-input", name: "lastContact", type: "date", value: data.lastContact || TODAY_ISO })),
    field("nextStep",    "NEXT",          el("input", { class: "modal-input", name: "nextStep", value: data.nextStep, autocomplete: "off" })),
    field("afterNext",   "derefter",      el("input", { class: "modal-input", name: "afterNext", value: data.afterNext, autocomplete: "off" })),
    field("note",        "note",          el("textarea", { class: "modal-input modal-textarea", name: "note", rows: 3 }, data.note || "")),
  ];
  const grid = el("div", { class: "modal-grid" }, ...fields);
  form.appendChild(grid);

  const actions = el("div", { class: "modal-actions" },
    el("button", { type: "button", class: "modal-cancel", onclick: closeModal }, "Annullér"),
    el("button", { type: "submit", class: "modal-submit" }, isEdit ? "Gem" : "Opret")
  );
  form.appendChild(actions);

  root.appendChild(form);
  showModal();
}

function openWonModal({ mode, card }) {
  const isEdit = mode === "edit";
  const data = isEdit ? card : {
    name: "", company: "", value: 0, status: "vundet",
    wonDate: TODAY_ISO, deliverBy: TODAY_ISO, note: "",
  };
  const root = $("#modal");
  root.innerHTML = "";

  const form = el("form", {
    class: "modal-form",
    onsubmit: async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = {
        name: fd.get("name").trim(),
        company: fd.get("company").trim(),
        value: Math.max(0, +fd.get("value") || 0),
        status: fd.get("status") || "vundet",
        wonDate: fd.get("wonDate"),
        deliverBy: fd.get("deliverBy"),
        note: fd.get("note").trim(),
      };
      if (!payload.name || !payload.company) {
        showToast("Navn og firma skal udfyldes", "error");
        return;
      }
      const submitBtn = form.querySelector(".modal-submit");
      submitBtn.disabled = true;
      try {
        if (isEdit) {
          await updateWon(state.user.uid, card.id, payload);
          showToast("Gemt", "info");
        } else {
          await createWon(state.user.uid, payload);
          showToast("Oprettet", "info");
        }
        closeModal();
      } catch (err) {
        showToast("Kunne ikke gemme: " + (err.code || err.message), "error");
        submitBtn.disabled = false;
      }
    },
  });

  form.appendChild(el("div", { class: "modal-title" }, isEdit ? "Rediger deal" : "Ny vundet deal"));

  const statusOpts = [["vundet", "vundet"], ["faktureret", "faktureret"]];

  const fields = [
    field("name",      "navn",       el("input", { class: "modal-input", name: "name", value: data.name, required: true, autocomplete: "off" })),
    field("company",   "firma",      el("input", { class: "modal-input", name: "company", value: data.company, required: true, autocomplete: "off" })),
    field("status",    "status",     select("status", statusOpts, data.status || "vundet")),
    field("value",     "værdi (kr)", el("input", { class: "modal-input", name: "value", type: "number", min: 0, step: 1000, value: data.value, required: true })),
    field("wonDate",   "vundet dato", el("input", { class: "modal-input", name: "wonDate", type: "date", value: data.wonDate, required: true })),
    field("deliverBy", "leverer",    el("input", { class: "modal-input", name: "deliverBy", type: "date", value: data.deliverBy, required: true })),
    field("note",      "note",       el("textarea", { class: "modal-input modal-textarea", name: "note", rows: 3 }, data.note || "")),
  ];
  form.appendChild(el("div", { class: "modal-grid" }, ...fields));

  form.appendChild(el("div", { class: "modal-actions" },
    el("button", { type: "button", class: "modal-cancel", onclick: closeModal }, "Annullér"),
    el("button", { type: "submit", class: "modal-submit" }, isEdit ? "Gem" : "Opret")
  ));

  root.appendChild(form);
  showModal();
}

function field(id, label, input) {
  if (input.tagName === "INPUT" || input.tagName === "TEXTAREA" || input.tagName === "SELECT") {
    input.id = "f-" + id;
  }
  return el("div", { class: "modal-field" + (input.tagName === "TEXTAREA" ? " is-wide" : "") },
    el("label", { class: "modal-label", for: "f-" + id }, label),
    input
  );
}

function select(name, options, value) {
  const sel = el("select", { class: "modal-input", name });
  for (const [v, label] of options) {
    sel.appendChild(el("option", { value: v, selected: v === value ? "" : false }, label));
  }
  return sel;
}

function showModal() {
  const bd = $("#modal-backdrop");
  bd.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => {
    const first = bd.querySelector("input, select, textarea");
    if (first) first.focus();
  }, 0);
}

function closeModal() {
  const bd = $("#modal-backdrop");
  bd.hidden = true;
  document.body.classList.remove("modal-open");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#modal-backdrop").hidden) closeModal();
});
$("#modal-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "modal-backdrop") closeModal();
});

document.addEventListener("click", () => {
  if (state.bgPickerOpen) {
    state.bgPickerOpen = false;
    renderTopbar();
  }
});

function exportJson() {
  const dump = {
    schema: "markedspuls.v1",
    exportedAt: new Date().toISOString(),
    user: state.user.email,
    prefs: state.prefs,
    pipeline: state.pipeline,
    won: state.won,
  };
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: `markedspuls-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Eksporteret", "info");
}

function importJson() {
  const input = el("input", { type: "file", accept: ".json,application/json" });
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !Array.isArray(data.pipeline) || !Array.isArray(data.won)) {
        showToast("Filen ser ikke ud som en Markedspuls-eksport", "error");
        return;
      }
      const ok = confirm(`Importér ${data.pipeline.length} pipeline-kort + ${data.won.length} vundne deals? (eksisterende kort bevares)`);
      if (!ok) return;
      const tasks = [];
      for (const c of data.pipeline) {
        const { id, createdAt, updatedAt, ...rest } = c;
        tasks.push(createCard(state.user.uid, rest));
      }
      for (const d of data.won) {
        const { id, createdAt, ...rest } = d;
        tasks.push(createWon(state.user.uid, rest));
      }
      await Promise.all(tasks);
      showToast("Importeret", "info");
    } catch (err) {
      showToast("Importfejl: " + (err.code || err.message), "error");
    }
  });
  input.click();
}

function describeFirestoreError(err) {
  const code = err && err.code ? err.code : "";
  if (code === "permission-denied" || code === "Missing or insufficient permissions.") {
    return "Firestore afviser læseadgang. Tjek at sikkerhedsreglerne er publiceret (Firebase Console → Firestore → Rules).";
  }
  if (code === "unavailable" || /not.*enabled|API has not been used/i.test(err.message || "")) {
    return "Firestore er ikke slået til endnu. Gå til Firebase Console → Firestore Database → Create database.";
  }
  return "Firestore fejl: " + (err.code || err.message || "ukendt");
}

async function init() {
  applyBg();

  if (typeof auth.authStateReady === "function") {
    await auth.authStateReady();
  } else {
    await new Promise((resolve) => {
      const t = setInterval(() => {
        if (auth.currentUser !== undefined) { clearInterval(t); resolve(); }
      }, 30);
    });
  }
  if (!auth.currentUser) {
    window.location.replace("./login.html");
    return;
  }
  state.user = auth.currentUser;

  renderTopbar();
  renderBoard();

  const uid = state.user.uid;

  let firstSnapshotDone = false;
  let seedAttempted = false;
  const tryAutoSeed = async () => {
    if (seedAttempted) return;
    seedAttempted = true;
    if (!state.loaded.pipeline || !state.loaded.won) return;
    if (state.pipeline.length > 0 || state.won.length > 0) return;
    try {
      await seedDemoData(uid, SEED_PIPELINE, SEED_WON, {
        bgPreset: "midnat",
        goalThisYear: 0,
        bookedThisYear: 0,
      });
      showToast("Demo-data oprettet — du kan slette dem og oprette dine egne", "info");
    } catch (err) {
      showToast(describeFirestoreError(err), "error");
    }
  };

  watchPipeline(uid,
    (cards) => {
      cards.sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
      state.pipeline = cards;
      state.loaded.pipeline = true;
      renderTopbar();
      renderBoard();
      if (!firstSnapshotDone && state.loaded.pipeline && state.loaded.won) {
        firstSnapshotDone = true;
        tryAutoSeed();
      }
    },
    (err) => showErrorBanner(describeFirestoreError(err))
  );

  watchWon(uid,
    (cards) => {
      cards.sort((a, b) => (b.wonDate || "").localeCompare(a.wonDate || ""));
      state.won = cards;
      state.loaded.won = true;
      renderTopbar();
      renderBoard();
      if (!firstSnapshotDone && state.loaded.pipeline && state.loaded.won) {
        firstSnapshotDone = true;
        tryAutoSeed();
      }
    },
    (err) => showErrorBanner(describeFirestoreError(err))
  );

  watchUserDoc(uid,
    (data) => {
      const prefs = (data && data.prefs) || {};
      state.prefs = {
        bgPreset: prefs.bgPreset || "midnat",
        goalThisYear: prefs.goalThisYear || 3500000,
        bookedThisYear: prefs.bookedThisYear || 1860000,
      };
      state.loaded.prefs = true;
      applyBg();
      renderTopbar();
    },
    (err) => showErrorBanner(describeFirestoreError(err))
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
