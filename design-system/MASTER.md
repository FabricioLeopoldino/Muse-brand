# MUSE Ops — Design System (MASTER)

> Source of truth for the Scented Merchandise + MUSE warehouse/production platform.
> Surfaces: Stock Dashboard · Production Orders · Manufacturing Queue · Packing Records.
> Audience: **non-technical warehouse staff** (tablets, scanner stations, occasional gloves, fast glances).
>
> This file overrides ad-hoc styling. Page-specific deviations live in `design-system/pages/<page>.md`
> and only ever **override** — never contradict — the tokens below.

---

## 0. Design Principles (audience-first)

1. **Legible at a glance, from a distance.** Warehouse staff read screens across a bench, not nose-to-glass. Big numbers, high contrast, generous targets.
2. **Status is the primary language.** Every state (stock level, order phase) is communicated by **color + icon + text label** — never color alone. Staff learn the label first, the color second.
3. **One job per screen.** Dense ≠ cluttered. Show all the data, but each page answers one question ("what do I make next?", "what's low?").
4. **Two themes, zero breakage.** Every component reads semantic tokens. A token always has a value in *both* themes, so toggling can never produce invisible text or borders.
5. **English-only UI.** All labels, placeholders, toasts, empty states, tooltips, and errors are in English. (Chat/docs may be PT-BR; the product is not.)

---

## 1. Theme Strategy

| | **Dark (default)** | **Light (MUSE)** |
|---|---|---|
| Role | Operational / technical workhorse | Editorial / branded |
| Background | Near-black navy `#0a0f1e` | Parchment `#f2f0e6` |
| Accent | Indigo `#6366f1` — **frozen** | Wine Stain `#612428` |
| Mood | Calm, focused, low-glare for long shifts | Warm, premium, on-brand |

**Accent decision (committed):** **dark mode is frozen** — it stays operational indigo `#6366f1` exactly as shipped; do **not** touch its tokens. **Light mode (MUSE wine) is the surface under active refinement** — it's where the inline-repaint fragility lives, so all theme work targets light mode only. The two modes differ in both color and temperature by design.

---

## 2. Brand Palette (fixed kit)

| Name | Hex | Use |
|---|---|---|
| Wine Stain | `#612428` | Primary brand fill (light), buttons, active nav |
| Parchment | `#f2f0e6` | Light page background |
| Warmed Clay | `#8a5e52` | Secondary / muted brand brown, info status |
| Olive Leaf | `#6b784d` | Success / "safe" / fulfilled |
| Deep Shadow | `#1b0905` | Light-mode body text |
| Metallic Gold | `#c8a85e` | Caution / attention accents (digital approx.) |

Derived dark-mode siblings (lighter, so they read on near-black): wine `#b1545a`, clay `#b88a7d`, olive `#9bb077`, gold `#d4b574`.

---

## 3. Semantic Tokens — the contract

Every component references **these names**, never raw hex. Both columns are always filled — that is what guarantees "doesn't look broken."

### Surfaces & borders
| Token | Dark | Light |
|---|---|---|
| `--bg` | `#0a0f1e` | `#f2f0e6` |
| `--surface-1` (card) | `#0f1629` | `#fbf9f1` |
| `--surface-2` (input/wash) | `rgba(255,255,255,.04)` | `rgba(97,36,40,.04)` |
| `--surface-3` (hover/active) | `rgba(255,255,255,.08)` | `rgba(97,36,40,.08)` |
| `--overlay` (modal backdrop) | `rgba(0,0,0,.8)` | `rgba(27,9,5,.40)` |
| `--border` | `rgba(255,255,255,.08)` | `rgba(97,36,40,.14)` |
| `--border-strong` | `rgba(255,255,255,.14)` | `rgba(97,36,40,.28)` |

### Text
| Token | Dark | Light | Min contrast |
|---|---|---|---|
| `--text-primary` | `#e8eaf2` | `#1b0905` | ≥ 14:1 |
| `--text-secondary` | `#94a3b8` | `#5a3a36` | ≥ 6:1 |
| `--text-muted` | `rgba(232,234,242,.45)` | `rgba(27,9,5,.45)` | decorative only |
| `--text-on-accent` | `#ffffff` | `#f2f0e6` | ≥ 7:1 |

### Accent (indigo dark — frozen / wine light)
| Token | Dark (frozen) | Light |
|---|---|---|
| `--accent` (fill) | `#6366f1` | `#612428` |
| `--accent-text` (on bg) | `#818cf8` | `#4d1c20` |
| `--accent-soft` (tint bg) | `rgba(99,102,241,.16)` | `rgba(97,36,40,.12)` |
| `--accent-glow` | `rgba(99,102,241,.6)` | `rgba(97,36,40,.55)` |

> The **dark column is frozen** — these are the shipped indigo values, do not change them. All accent refinement happens in the **light** column (wine). When fixing light mode, only the light-side token values and the light-mode rules in [index.css](../src/index.css) (`html:not(.dark) …`) are in scope.

---

## 4. Status System (the most important section)

Warehouse decisions are status decisions. Each status ships as a **trio**: `solid` (text/icon), `soft` (background tint), and a **fixed icon + label**. Never ship a status as a bare colored dot.

### 4a. Semantic statuses
| Status | Light text | Dark text (frozen) | Soft (both, tint) | Lucide icon | Label |
|---|---|---|---|---|---|
| Success | `#4f5e34` | `#4ade80` | green @10–14% | `check-circle` | done / ok |
| Warning | `#8a6d1f` | `#fbbf24` | amber @12–16% | `alert-triangle` | warning |
| Caution | `#b4530a` | `#fb923c` | orange @12% | `alert-circle` | low / caution |
| Danger (soft) | `#c0392b` | `#f87171` | red @10–12% | `x-circle` | error / critical |
| Danger (strong) | `#a01b1b` | `#ef4444` | red @12% | `x-octagon` | out / destructive |
| Info / accent | `#6b3f6e` | `#a78bfa` | violet @10–12% | `info` | info / major client |
| Special | `#9d3b5e` | `#f472b6` | rose @12% | `sparkles` | special |
| Neutral | `--text-secondary` | `--text-secondary` | `--surface-3` | `minus` | — |

> Light values are the **implemented remap** (see [index.css](../src/index.css) "STATUS COLORS → MUSE-coherent light palette"). Dark values are the real, frozen pastel set. Backgrounds use low-alpha tints of the dark hue in both themes — only the *text* differs per theme.

> Danger red is intentionally **brighter/cleaner than wine** so "critical" never blends into the brand fill. Wine = brand; red = problem. Keep them separate.

### 4b. Stock 5-tier (drives StockTable, reserved, action modal)
Mapped to a learnable warm→alarm ramp. Threshold = % of `min_stock_level`.

Thresholds match [StockTable.jsx](../src/components/StockTable.jsx) `STATUS_TONE` (`avail = stock − reserved`, vs `min`).

| Tier | Rule | Light (remapped) | Dark (frozen) | Icon | Label |
|---|---|---|---|---|---|
| **OUT** | avail ≤ 0 | `#a01b1b` | `#ef4444` | `x-octagon` | Out of stock |
| **CRITICAL** | < 25% of min | `#c0392b` | `#f87171` | `alert-octagon` | Critical |
| **LOW** | 25–50% of min | `#b4530a` | `#fb923c` | `alert-triangle` | Low stock |
| **ATTENTION** | 50–100% of min | `#8a6d1f` | `#fbbf24` | `eye` | Attention |
| **SAFE** | ≥ min (or min = 0) | `#4f5e34` | `#4ade80` | `check-circle` | Safe |

Five distinguishable steps in light mode (deep-red → red → burnt-orange → amber → olive), all within the brand's earthy register and all ≥4.5:1 on parchment. OUT and CRITICAL stay separate reds so the ramp never collapses. Pair every cell with its icon + label so it reads for color-blind staff and survives a quick glance.

### 4c. Order / Production workflow statuses
| Phase | Maps to | Pill |
|---|---|---|
| Draft | Neutral | clay outline |
| Queued / Pending | Info | clay soft |
| In Production | Warning | gold soft + spinner dot |
| Ready / Awaiting fulfillment | Accent | accent soft |
| Fulfilled / Done | Success | olive soft + check |
| Cancelled / Returned | Danger | red soft |

---

## 5. Typography

| Role | Family | Notes |
|---|---|---|
| Display / brand | **Archivo Black** | Page titles, modal `h2`, KPI labels. The MUSE voice. Use sparingly. |
| UI / body | **Inter** | Everything else. The workhorse. |
| Numeric / code | **JetBrains Mono** (or Fira Code) | SKUs, barcodes, order IDs, quantities. Aligns columns, prevents `0/O` confusion. |

For numeric **columns in Inter tables**, add `font-variant-numeric: tabular-nums` so digits align without switching font.

### Scale
| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| display | 28 / 32 | 900 | Page hero titles, big KPI numbers |
| h1 | 22 / 28 | 800 | Page titles |
| h2 | 18 / 24 | 700–900 | Section / modal titles |
| h3 | 15 / 20 | 700 | Card titles |
| body | 14 / 21 | 400–500 | Default. **Never below 14** for primary content. |
| body-sm | 13 / 18 | 500 | Dense table cells, buttons |
| caption | 12 / 16 | 600 | Labels (uppercase, `letter-spacing .04em`) |
| micro | 11 / 14 | 600 | Badges, meta — decorative, never load-bearing |

Line-height 1.5 for body. Line length 65–75ch for any paragraph copy.

---

## 6. Spacing, Radius, Elevation, Z-index

- **Spacing** (4px base): `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48`. Card padding 20–24; tight toolbars 8–12.
- **Radius:** `sm 8` (buttons, inputs), `md 12` (cards), `lg 20` (modals), `pill 999`.
- **Elevation:**
  - `--shadow-sm` dark `0 2px 8px rgba(0,0,0,.4)` / light `0 2px 12px rgba(27,9,5,.06)`
  - `--shadow-md` dark `0 6px 24px rgba(0,0,0,.5)` / light `0 8px 28px rgba(27,9,5,.12)`
  - `--shadow-lg` (modal) dark `0 24px 80px rgba(0,0,0,.8)` / light `0 24px 80px rgba(27,9,5,.16)`
- **Z-index scale:** content `0–1` · sticky table header `10` · dropdown `20` · sticky page nav `30` · toast `50` · modal overlay `9999` · modal `10000`. (Modal stays at the existing 9999/10000 so `position:fixed` dropdowns inside modals keep working — do **not** add `backdrop-filter` to overlay or modal; it creates a containing block that breaks them.)

---

## 7. Components

### Buttons
Three intents × two sizes.
- Sizes: `default` 36px tall (8/16 padding, 13px) for toolbars; **`lg` 48px tall (12/20 padding, 15px) for primary warehouse actions** (Start Production, Confirm Pack, Receive). Warehouse-facing primary actions use `lg` — fingers, not mice.
- Intents: `primary` (accent), `secondary` (outline), `danger` (red outline → red fill on hover).
- Every button: `cursor-pointer`, 150–200ms transition, visible focus ring (`0 0 0 3px accent-soft`), `:disabled` → 50% opacity + `not-allowed`. Async actions **disable + show spinner** while pending.

### Cards / KPI tiles
`--surface-1`, `--border`, radius 12, `--shadow-sm`; hover lifts `translateY(-1px)` + `--border-strong`. KPI tile = display-size number (tabular) + caption label + optional status pill + trend. One metric per tile.

### Inputs
`--surface-2` bg, `--border`, radius 8, 14px text, **44px min height** (warehouse touch). Focus = accent border + `0 0 0 3px accent-soft`. Label above, uppercase caption style. Error: danger border + helper text below (icon + message), never color-only.

### Status pill (canonical)
```
[icon 14px] LABEL          ← soft bg, solid text/icon, radius pill, 11–12px, 600
```
Padding 2/8, gap 4. Always icon + text. This single component renders 4a/4b/4c.

### Tables (data-dense, warehouse)
- Sticky header (`z 10`), `--surface-1`. Row height: **44px "comfortable"** for action tables (Queue, Orders), 36px "compact" for reference lists.
- Zebra via `--surface-2` on odd rows; hover `--surface-3`. Numeric columns right-aligned, tabular figures, mono for IDs/SKUs.
- Status column uses the pill, pinned left or right consistently. Row actions ≥ 40px hit area.
- Always provide search/filter for >10 rows. Empty state = icon + one-line message + primary action.

### Modals
Per existing spec: overlay `--overlay` (no blur), modal `--surface-1`, radius 20, `--shadow-lg`, header/body/footer with `--border` dividers, `h2` in Archivo Black. Footer actions right-aligned, primary last. Light mode adds the wine top-shimmer + corner glow (already in CSS).

### Navigation / Sidebar
Active item: `--accent-soft` background + `--accent-text` + glow. Icons from Lucide, 20px. Labels always visible (don't make non-technical staff decode icon-only nav).

---

## 8. Per-surface guidance

**Stock Dashboard** — KPI row (Total SKUs · Out · Critical+Low · Reserved) using status colors; below it the 5-tier StockTable sorted worst-first. The dashboard's job: "what needs attention now." Lead with OUT/CRITICAL.

**Production Orders** — list/table keyed by workflow status (§4c). Primary `lg` action per row context (Start, Mark Ready). Draft orders visually de-emphasized (neutral). Quantities + components in mono/tabular.

**Manufacturing Queue** — the "what do I make next" screen. Ordered, scannable, large touch rows (44px). Each card/row: product, qty, BOM readiness pill (can/can't build), one big primary action. Minimize chrome.

**Packing Records** — form-forward, scanner-friendly. Big inputs (44px+), confirm action is `lg` primary. Show what was packed as a running, mono-aligned list with success pills as items confirm.

---

## 9. Accessibility & touch (warehouse)

- Text contrast ≥ **4.5:1** (body) / 3:1 (large). Tokens in §3 are chosen to pass; don't hand-pick off-palette colors.
- Touch targets ≥ **44×44px** for anything staff tap. Primary actions 48px.
- Status never color-only → always icon + label (§4).
- Visible focus rings on every interactive element; tab order matches visual order.
- Icon-only buttons get `aria-label`. Inputs get real `<label for>`.
- Respect `prefers-reduced-motion` (kill non-essential animation, keep state changes instant).

---

## 10. Motion

150–300ms, `transform`/`opacity` only (never animate `width`/`height`/`top`). Hover ≤ 200ms color/shadow. Modal/toast fade-in ~180ms. Loading = skeleton (tables) or spinner (buttons). Reserve space for async content so rows don't jump.

---

## 11. "Doesn't look broken" — parity contract & migration

The current light mode works by **repainting hardcoded inline colors** via `[style*="rgb(…)"]` attribute selectors with `!important`. Your own CSS comments call this out — it's the fragility source: any new inline color a developer writes is invisible/wrong in light mode until someone adds another remap rule.

**Target state:** components read semantic tokens; the two-theme correctness is automatic.

Migration (incremental, page by page — no big-bang rewrite):
1. New code: **never** write hex/rgba in JSX. Use `var(--token)` or a utility class. PR rule.
2. When you touch a page, swap its inline colors for tokens and delete the matching `[style*=]` remap.
3. Each token already has both-theme values (§3), so a migrated component is correct in both themes with zero extra CSS.
4. The `[style*=]` block shrinks as pages migrate; goal is to delete it entirely.

**Scope note:** dark mode is frozen, so migration only ever rewrites **light-mode** rules (`html:not(.dark) …`) and the shared inline colors that light mode repaints. Dark-mode `:root` tokens and `rgba(99,102,241,…)` indigo rules are left exactly as-is.

**Per-release test matrix:** toggle theme on each of the four surfaces and verify: (a) no invisible text, (b) borders visible, (c) status pills legible & distinct, (d) focus rings show, (e) modals/dropdowns render above content.

---

## 12. Pre-delivery checklist

- [ ] No hardcoded colors in new JSX — tokens only
- [ ] No emoji as icons — Lucide SVG, consistent 20/24 viewBox
- [ ] Every status = color **+ icon + label**
- [ ] Primary warehouse actions ≥ 48px; all tap targets ≥ 44px
- [ ] Light + dark both checked on all four surfaces
- [ ] Contrast ≥ 4.5:1 body; focus rings visible
- [ ] `prefers-reduced-motion` honored
- [ ] All UI copy in English
- [ ] Responsive at 768 / 1024 / 1440 (tablet → bench monitor)
