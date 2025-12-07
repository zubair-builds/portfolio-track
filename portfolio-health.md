# Portfolio Health & Rebalancing Screen

This directory contains UI mockup assets for the Portfolio Health & Rebalancing feature - a dark-mode, Robinhood-style dashboard focused on long-term portfolio analysis and rebalancing recommendations.

## Preview

![Portfolio Health & Rebalancing Mockup](./portfolio-health-rebalance-1920x1280.png)

## Design Overview

The screen provides a comprehensive view of portfolio health, highlighting top performers, identifying underperformers, and offering actionable rebalancing suggestions based on concentration risk and performance metrics.

### Key Sections

1. **Portfolio Health Header** - Overall health score with visual grade indicator
2. **Sector Allocation** - Donut chart visualization showing portfolio diversification
3. **Top Winners** - High-performing holdings with annualized returns and concentration warnings
4. **Underperformers** - Low-performing holdings flagged for review
5. **Holdings Table** - Complete portfolio view with actionable status indicators

## Design Specifications

### Color Tokens

| Token | Hex Code | Usage |
|-------|----------|-------|
| Background | `#121212` | Main app background |
| Card Surface | `#0B0F12` | Primary card background |
| Card Alt | `#101418` | Alternate card background |
| Border | `rgba(255,255,255,0.06)` | Subtle card borders |
| Text Primary | `#FFFFFF` | Main headings and labels |
| Text Secondary | `#B0B0B0` | Supporting text |
| Text Muted | `#808080` | Hints and tertiary text |
| Emerald (Positive) | `#00E676` | Gains, "Keep" status, health indicators |
| Amber (Warning) | `#FFC857` | Concentration warnings, "Trim" status |
| Red (Negative) | `#FF4D4F` | Losses, "Review" badges |
| Blue (Info) | `#29B6F6` | "Hold" status, informational elements |
| Teal (Accent) | `#4FC3F7` | Secondary accent |

### Typography

- **Font Family**: Inter (or DejaVu Sans fallback)
- **Headers**: 28-42px, Semibold/Bold
- **Body Text**: 20px, Regular
- **Small Text**: 16px, Regular
- **Badges**: 14px, Bold
- **Large Numbers**: 36px, Bold

### Layout & Spacing

- **Canvas**: 1920 × 1280 pixels
- **Page Padding**: 32px
- **Card Border Radius**: 12px
- **Badge Border Radius**: 6-14px (depending on size)
- **Card Shadows**: `0 8px 24px rgba(0,0,0,0.45)`
- **Card Spacing**: 30px vertical gap between sections

## Component Details

### Sector Allocation Donut Chart
- **Segments**: Oil (45%, Amber), Tech (35%, Blue), Banking (20%, Emerald)
- **Inner Radius**: 60% of outer radius for donut effect
- **Legend**: Color-coded boxes with percentage labels

### Top Winners Card
- **Visual Treatment**: Emerald border with subtle outer glow
- **Entries**:
  - LUCK: +45%/yr with "High Concentration (25%)" amber badge
  - AVN: +38%/yr
  - MEDL: +27%/yr
- **Tip**: Suggests trimming LUCK to reduce concentration

### Underperformers Card
- **Visual Treatment**: Red border accent, muted background
- **Entries**:
  - DCR: −12%/yr with "Review Holding" red badge
  - HUBC: −9%/yr with "Review Holding" red badge
  - LTP: −6%/yr with "Review Holding" red badge

### Holdings Table
- **Columns**: Symbol | Shares | Avg Buy | Current Value | Sector | 1Y Return | Status
- **Status Pills**:
  - **Keep** (Emerald): Solid performers to maintain
  - **Trim** (Amber): High concentration, consider reducing
  - **Hold** (Blue): Monitor without immediate action
- **Sample Holdings**: AVN, DCR, HUBC, LTP, LUCK (marked for trimming), MEDL

## Rebalancing Methodology & Health Scoring

### 1. Overview
This section defines the explicit formulas and thresholds powering: Health Score, Status/Badge assignment, and Rebalancing recommendations. Logic is deterministic so developers can implement without ambiguity.

### 2. Data Inputs
Required per holding:
- `symbol` (uppercase)
- `shares`
- `averagePrice`
- `currentPrice`
- `sector`
- `dailyCloses[365]` (most recent last; minimum 180 days for partial scoring)

External benchmark:
- `kse100DailyCloses[365]`

Derived:
- `weight = (shares * currentPrice) / Σ(all holdings value)`
- `sectorWeight = Σ(weight)` for same sector
- `price365Ago = dailyCloses[0]` (oldest in window)
- `annualReturnRaw = (currentPrice / price365Ago) - 1` (if days < 365 → annualize: `(1 + raw)^(365/days) - 1`)
- `benchmarkReturn = (kse100Latest / kse100Oldest) - 1`
- `alpha = annualReturn - benchmarkReturn`

### 3. Health Score (0–100)
Weighted composite: `Score = 0.4*Diversification + 0.4*Performance + 0.2*Risk` (rounded).

#### 3.1 Diversification (40%)
Use Herfindahl-Hirschman Index (HHI): `HHI = Σ (weight_i^2)`.
Normalize to 0–100 via inverse scaling:
```
HHI_min = 1 / N   (perfectly even across N holdings)
HHI_max = 1       (single holding = 100%)
diversificationScore = (1 - (HHI - HHI_min) / (HHI_max - HHI_min)) * 100
Clamp to [0,100].
```

#### 3.2 Performance (40%)
Compute capped weighted alpha:
```
cappedAlpha_i = clamp(alpha_i, -0.30, +0.30)
performanceScore = ( Σ (weight_i * cappedAlpha_i) / 0.30 ) * 100
Clamp to [0,100].
```

#### 3.3 Risk (20%)
Daily log returns of portfolio value: `r_t = ln(V_t / V_{t-1})`.
`σ_port = stdev(r_t)` over available days (≥180). Benchmark similarly → `σ_bench`.
```
riskScore = (1 - σ_port / σ_bench) * 100
If σ_port > σ_bench → floor at 0. Cap at 100.
If days < 180 → scale: riskScore *= days / 180.
```

#### 3.4 Grade Mapping
`A: 80–100`, `B: 60–79`, `C: 40–59`, `D/F: <40`.
Color tokens: A Emerald, B Teal, C Amber, D/F Red.

### 4. Status & Badge Logic (Evaluate in order)
1. **Star (Gold)**: `annualReturn > benchmarkReturn + 0.10`.
2. **Trim (Amber)**: `weight > 0.15 OR sectorWeight > 0.35`.
   - Hard warning sub-badge if `weight ≥ 0.20 OR sectorWeight ≥ 0.40`.
3. **Review (Red)**: `annualReturn < benchmarkReturn - 0.10 AND weight > 0.02`.
4. **Keep (Emerald)**: `annualReturn ≥ benchmarkReturn AND weight ≤ 0.15`.
5. **Hold (Teal/Grey)**: fallback when none above match.

ETF exemptions: ETF symbols (e.g., `MIIETF`, `MZNPETF`) ignore single-holding caps (weight checks) but still contribute to sector totals.

### 5. Concentration Rules
Single Holding: soft cap 15%, hard warning ≥20%.
Sector: soft cap 30%, hard warning ≥40%.
Tooltip examples:
- Trim: "Weight 22% exceeds target 15%."
- Sector: "Energy sector at 42% (soft 30%, hard 40%)."

### 6. Interaction & Accessibility
- Hover on Trim/Review/Star badges shows cause + threshold comparison.
- Hover on Health Score exposes breakdown: "Diversification 78, Performance 62, Risk 55".
- ARIA: badges announce role & rationale (e.g., `aria-label="Trim badge: Weight 22% exceeds 15% target"`).
- Ensure Amber/Gold contrast ≥3:1 against `#0B0F12`; if insufficient, darken to `#D89A35`.

### 7. Refresh Cadence & Memoization
- Recompute: on dashboard load or holding edits.
- Live price updates adjust displayed values but do not force score recompute until next trigger.
- Memoization key: hash of sorted `(symbol, shares, averagePrice, currentPrice)` snapshot + benchmark latest date.
- Store last computed result client-side to avoid redundant recalculations.

### 8. Missing / Partial Data Handling
- If holding < 60 days history: exclude from performance weighting; mark "Low History" in tooltip.
- If 60–179 days: annualize return and include with weight * (days/365) scaling.
- If volatility window < 180 days: risk contribution scaled (see Risk section).
- If benchmark data missing: degrade performanceScore to 0 and flag "Benchmark Unavailable".

### 9. Implementation Notes
- Place pure math in `lib/portfolioHealth.ts` (planned).
- Provide selector hook `usePortfolioHealth()` → `{ score, grade, diversificationScore, performanceScore, riskScore, statuses[], sectorWeights }`.
- Keep status mapping in a dedicated function for testability.
- Avoid passing raw historical arrays deep into components; compute once and feed derived aggregates.

### 10. Performance Guidelines
- Aggregate weights & sector sums in a single pass (O(n)).
- Precompute log returns array once per recompute.
- Do not recalc HHI unless holdings hash changes.
- Clamp & scale operations kept branch-light for client performance.

### 11. Color & Token Alignment
Use existing palette strictly:
- Emerald `#00E676` (Keep / positive health)
- Amber `#FFC857` (Trim / concentration)
- Red `#FF4D4F` (Review / negative)
- Teal `#4FC3F7` (Neutral / Hold accent)
- Gold reuse Amber with glow for Star (or darkened variant for contrast)

### 12. Exclusions & Future Scope
Not included in MVP: user-defined target weights, tax-loss harvesting, scenario simulation. Document focuses on deterministic advisory logic only.

## Usage Notes

- This is a **static design mockup** for communication and planning purposes
- No interactive functionality or live data integration
- Use as reference for implementing actual portfolio health features
- All ticker symbols and values are sample data for demonstration

## File Information

- **Filename**: `portfolio-health-rebalance-1920x1280.png`
- **Format**: PNG
- **Dimensions**: 1920 × 1280 pixels
- **Size**: ~119 KB
- **Created**: November 2025

---

*Design adheres to Robinhood-style aesthetic with focus on clarity, actionable insights, and clean dark-mode presentation.*