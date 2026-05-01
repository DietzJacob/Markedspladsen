/* ─────────────────────────────────────────────────────────────
   Markedspuls — vanilla JS render + interactions (step 1)
   No Firebase yet. All state in-memory; resets on reload.
   ───────────────────────────────────────────────────────────── */

// ── App state ────────────────────────────────────────────────
const state = {
  openId: "c01",                          // expanded pipeline card
  bgIdx: 0,                               // BG_PRESETS index
  probs: PIPELINE.reduce((m, c) => (m[c.id] = c.probability, m), {}),
  bgPickerOpen: false,
};

// Helpers ─────────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") node.className = v;
    else if (k === "style") {
      // Support CSS custom properties (--foo) via setProperty
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

// Convert "#RRGGBB" + 2-hex-digit alpha → "#RRGGBBaa" (CSS hex8)
const hex8 = (hex, alphaHex) => `${hex}${alphaHex}`;

// Compute ddmm formatted as "DD/MM" from ISO date
const ddmm = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}`;

// Aggregate totals (live, derived from state.probs)
function computeTotals() {
  const weighted = PIPELINE.reduce(
    (s, c) => s + c.value * (state.probs[c.id] ?? c.probability) / 100,
    0
  );
  return {
    wonYear: ALL_TIME.wonThisYear,
    weighted,
    booked: ALL_TIME.bookedThisYear,
    goal: ALL_TIME.goalThisYear,
  };
}
function laneWeightedTotal(key) {
  return laneCards(key).reduce(
    (s, c) => s + c.value * (state.probs[c.id] ?? c.probability) / 100,
    0
  );
}
function wonTotal() {
  return WON_DEALS.reduce((s, d) => s + d.value, 0);
}

// ── Apply background preset to <body> + .app ─────────────────
function applyBg() {
  const p = BG_PRESETS[state.bgIdx];
  document.documentElement.style.setProperty("--bg", p.bg);
  document.documentElement.style.setProperty("--grid", p.grid);
}

// ── Topbar render ────────────────────────────────────────────
function renderTopbar(root) {
  root.innerHTML = "";

  // Row 1 — logo + actions
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
        { label: "+ ny",        color: "#FB923C", alpha: "rgba(251,146,60,0.4)" },
        { label: "↓ export",    color: "#22D3EE", alpha: "rgba(34,211,238,0.4)" },
        { label: "↑ import",    color: "#A78BFA", alpha: "rgba(167,139,250,0.4)" },
        { label: "⊙ baggrund",  color: "#86EFAC", alpha: "rgba(134,239,172,0.4)",
          onclick: (e) => { e.stopPropagation(); state.bgPickerOpen = !state.bgPickerOpen; renderTopbar(root); }
        },
      ].map(b =>
        el("button", {
          class: "action-btn",
          style: { "--btn-color": b.color, "--btn-shadow": b.alpha, color: b.color },
          onclick: b.onclick || (() => {}),
        }, b.label)
      ),
      // User badge + logout (only when authed via auth.js)
      window.__user
        ? el("div", { class: "user-chip" },
            el("span", { class: "user-email" }, window.__user.email || "logget ind"),
            el("button", {
              class: "action-btn",
              style: { "--btn-color": "#94a3b8", "--btn-shadow": "rgba(148,163,184,0.4)", color: "#94a3b8" },
              onclick: async () => {
                if (window.__signOut) {
                  try { await window.__signOut(); } catch (_) {}
                  window.location.replace("./login.html");
                }
              },
            }, "log ud")
          )
        : null
    )
  );
  root.appendChild(row1);

  // Background-picker dropdown (only when open)
  if (state.bgPickerOpen) {
    const dropdown = el("div", { class: "bg-dropdown", onclick: (e) => e.stopPropagation() },
      ...BG_PRESETS.map((p, i) =>
        el("button", {
          class: "bg-swatch" + (i === state.bgIdx ? " is-active" : ""),
          style: { background: p.bg },
          onclick: () => { state.bgIdx = i; applyBg(); state.bgPickerOpen = false; renderTopbar(root); },
        }, p.name)
      )
    );
    root.appendChild(dropdown);
  }

  // Row 2 — calculation strip
  const totals = computeTotals();
  const pct = Math.round((totals.wonYear / totals.goal) * 100);
  const stripCells = [
    { label: "vundet i år",    value: fmtKr(totals.wonYear),    color: "#FDBA74", sub: "" },
    { label: "vægtet pipeline", value: fmtKr(totals.weighted),  color: "#F472B6", sub: "forventet" },
    { label: "booket",         value: fmtKr(totals.booked),     color: "#86EFAC", sub: "i år" },
    { label: "mål 2026",       value: fmtKr(totals.goal),       color: "#7DD3FC", sub: `${pct}% nået` },
  ];
  const strip = el("div", { class: "strip" },
    ...stripCells.map(c =>
      el("div", { class: "strip-cell" },
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

  // Goal progress bar
  const fillPct = Math.min(100, (totals.wonYear / totals.goal) * 100);
  const markerPct = Math.min(100, ((totals.wonYear + totals.weighted) / totals.goal) * 100);
  const goal = el("div", { class: "goal-bar" },
    el("div", { class: "goal-fill", style: { width: `${fillPct}%` } }),
    el("div", { class: "goal-marker", title: "vundet + vægtet", style: { left: `${markerPct}%` } })
  );
  root.appendChild(goal);
}

// ── Pipeline card render ─────────────────────────────────────
function renderCard(card) {
  const t = TEMPS[card.temp];
  const tint = LANE_TINTS[card.lane];
  const days = daysUntil(card.deadline);
  const overdue = days < 0;
  const soon = days >= 0 && days <= 2;
  const prob = state.probs[card.id] ?? card.probability;
  const expanded = state.openId === card.id;

  // CSS variables scoped to this card
  const tempStyle = {
    "--temp-color":    t.color,
    "--temp-color-88": `${t.color}DD`, // gradient start (slightly less opaque)
    "--temp-color-66": `${t.color}AA`,
    "--temp-color-33": `${t.color}55`,
    "--temp-color-80": `${t.color}CC`,
    "--lane-bg":     tint.bg,
    "--lane-border": tint.border,
    "--lane-title":  tint.title,
    "--lane-glow":   tint.glow,
  };

  // Ah — README says fill gradient is linear-gradient(90deg, <temp.color>88, <temp.color>).
  // The "88" suffix in the JSX is a hex alpha = 0x88. I use that directly here.
  tempStyle["--temp-color-88"] = `${t.color}88`;
  tempStyle["--temp-color-66"] = `${t.color}66`;
  tempStyle["--temp-color-33"] = `${t.color}33`;
  tempStyle["--temp-color-80"] = `${t.color}80`;

  const cardEl = el("div", {
    class: "card" + (overdue ? " is-overdue" : ""),
    style: tempStyle,
    onclick: () => {
      state.openId = state.openId === card.id ? null : card.id;
      renderBoard();
    },
  });

  // Head row
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

  // Probability bar
  const bar = el("div", { class: "prob-bar" });
  for (const tick of [25, 50, 75]) {
    bar.appendChild(el("div", { class: "prob-tick", style: { left: `${tick}%` } }));
  }
  const fill = el("div", { class: "prob-fill", style: { width: `${prob}%` } });
  const handle = el("div", { class: "prob-handle", style: { left: `calc(${prob}% - 6px)` } });
  bar.appendChild(fill);
  bar.appendChild(handle);

  const pct = el("span", { class: "prob-pct" }, `${prob}%`);

  const probRow = el("div", { class: "prob-row" }, bar, pct);
  // Stop click bubbling so dragging the bar doesn't toggle expand
  probRow.addEventListener("click", (e) => e.stopPropagation());

  // Drag interaction
  const setFromEvent = (e) => {
    const r = bar.getBoundingClientRect();
    const raw = ((e.clientX - r.left) / r.width) * 100;
    const clamped = Math.max(0, Math.min(100, raw));
    const snapped = Math.round(clamped / 5) * 5;
    state.probs[card.id] = snapped;
    fill.style.width = `${snapped}%`;
    handle.style.left = `calc(${snapped}% - 6px)`;
    pct.textContent = `${snapped}%`;
    // Live-update topbar
    renderTopbar($("#topbar"));
    // Live-update lane total
    refreshLaneTotal(card.lane);
  };
  bar.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    e.preventDefault();
    bar.setPointerCapture?.(e.pointerId);
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

  // NEXT box
  cardEl.appendChild(el("div", { class: "next-box" },
    el("span", { class: "next-label" }, "NEXT"),
    el("span", { class: "next-text" }, card.nextStep)
  ));

  // Bottom meta row (status + deadline)
  let statusText, metaClass = "card-meta";
  if (overdue) { statusText = "↯ overskredet"; metaClass += " is-overdue"; }
  else if (soon) { statusText = "▲ snart"; metaClass += " is-soon"; }
  else { statusText = t.label.toLowerCase(); }

  cardEl.appendChild(el("div", { class: metaClass },
    el("span", { class: "status" }, statusText),
    el("span", null, ddmm(card.deadline))
  ));

  // Expanded section
  if (expanded) {
    const expansion = el("div", { class: "card-expanded" },
      el("div", { style: { marginBottom: "6px" } },
        el("div", { class: "derefter-label" }, "derefter"),
        el("div", { class: "derefter-text" }, card.afterNext)
      ),
      el("div", { class: "quote" }, `"${card.note}"`),
      ...card.log.slice(0, 2).map(l => el("div", { class: "log-line" }, `· ${l}`))
    );
    cardEl.appendChild(expansion);
  }

  return cardEl;
}

// ── Won card render ─────────────────────────────────────────
function renderWonCard(card) {
  const tint = LANE_TINTS.won;
  const node = el("div", {
    class: "won-card",
    style: {
      "--lane-bg": tint.bg,
      "--lane-border": tint.border,
      "--lane-title": tint.title,
      "--lane-glow": tint.glow,
    },
  });

  node.appendChild(el("div", { class: "card-head" },
    el("div", { style: { minWidth: "0", flex: "1" } },
      el("div", { class: "card-name" }, card.name),
      el("div", { class: "card-company" }, card.company)
    ),
    el("div", { style: { textAlign: "right" } },
      el("div", { class: "card-value" }, `+${fmtKr(card.value)}`),
      el("div", { class: "card-value-unit" }, "kr · vundet")
    )
  ));

  node.appendChild(el("div", { class: "won-meta" },
    el("span", null, `✓ ${ddmm(card.wonDate)}`),
    el("span", null, `leverer ${ddmm(card.deliverBy)}`)
  ));

  node.appendChild(el("div", { class: "won-note" }, card.note));

  return node;
}

// ── Lane render ─────────────────────────────────────────────
function renderLane(lane) {
  const tint = LANE_TINTS[lane.key];
  const isWon = lane.key === "won";
  const cards = isWon ? WON_DEALS : laneCards(lane.key);
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

  // Header
  const header = el("div", { class: "lane-header" },
    el("div", { class: "lane-title-row" },
      el("div", { class: "lane-title" }, lane.title),
      el("div", { class: "lane-count" }, `${cards.length} ${isWon ? "deals" : "kort"}`)
    ),
    el("div", { class: "lane-subtitle" }, lane.subtitle),
    el("div", { class: "lane-total" },
      el("span", { class: "lane-total-label" }, isWon ? "vundet" : "vægtet"),
      el("span", { class: "lane-total-value" }, `${fmtKr(total)} kr`)
    )
  );
  laneEl.appendChild(header);

  // Cards list
  const list = el("div", { class: "lane-cards" });
  for (const c of cards) {
    list.appendChild(isWon ? renderWonCard(c) : renderCard(c));
  }
  // Add-card button at the bottom of the list
  list.appendChild(el("button", { class: "add-btn" }, isWon ? "+ deal" : "+ kort"));
  laneEl.appendChild(list);

  return laneEl;
}

// Refresh just the lane total label (after prob drag)
function refreshLaneTotal(laneKey) {
  const laneEl = document.querySelector(`.lane[data-lane="${laneKey}"]`);
  if (!laneEl) return;
  const totalEl = laneEl.querySelector(".lane-total-value");
  if (!totalEl) return;
  const t = laneKey === "won" ? wonTotal() : laneWeightedTotal(laneKey);
  totalEl.textContent = `${fmtKr(t)} kr`;
}

// ── Board render ────────────────────────────────────────────
function renderBoard() {
  const lanesRoot = $("#lanes");
  lanesRoot.innerHTML = "";
  for (const lane of LANES) lanesRoot.appendChild(renderLane(lane));
}

// ── Init ────────────────────────────────────────────────────
function init() {
  applyBg();
  renderTopbar($("#topbar"));
  renderBoard();

  // Click outside dropdown closes it
  document.addEventListener("click", () => {
    if (state.bgPickerOpen) {
      state.bgPickerOpen = false;
      renderTopbar($("#topbar"));
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
