# FMCG AI Platform — Design System

**Aesthetic:** Industrial Intelligence
**Philosophy:** Bloomberg Terminal meets warm Indian design. Professional, data-rich, distinctive.

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `surface-50` | #fafaf9 | Hover backgrounds, light cards |
| `surface-100` | #f5f4f0 | Page background |
| `surface-200` | #e8e6df | Borders, dividers, skeleton base |
| `surface-300` | #d4d1c7 | Hover borders |
| `surface-400` | #8a857b | Placeholder text, muted labels (WCAG AA on white) |
| `surface-500` | #656059 | Secondary text (WCAG AA on white) |
| `surface-600` | #565349 | Form labels |
| `surface-700` | #2d2d3f | — |
| `surface-800` | #1a1a2e | Primary text on light backgrounds, code blocks |
| `surface-900` | #0f0f23 | Sidebar background, darkest surface |
| `accent-400` | #f0a500 | Primary accent (buttons, active nav, links, focus rings) |
| `accent-500` | #e09400 | Accent hover |
| `accent-600` | #c77d00 | Accent pressed, gradient endpoint |
| `success-500` | #10b981 | Positive states (completed, approved, compliant) |
| `danger-500` | #ef4444 | Negative states (critical, rejected, failed) |
| `warning-500` | #f59e0b | Caution states (pending, review required) |
| `info-500` | #3b82f6 | Neutral informational (investigating, in progress) |

### Usage Rules
- **accent** for interactive elements: buttons, links, focus rings, active nav states
- **success** for positive outcomes: completed audits, resolved complaints, approved invoices
- **danger** for critical states: critical priority, rejected, compliance failures
- **warning** for attention-needed: pending, review required, expiring
- **info** for neutral progress: investigating, in progress, informational badges
- Never use raw Tailwind colors (blue-500, red-500) — always use semantic tokens

---

## Typography

| Role | Font | Weight | Size | Tracking |
|------|------|--------|------|----------|
| Body | DM Sans | 400 | 14px (text-sm) | normal |
| Labels | DM Sans | 500 | 14px (text-sm) | normal |
| Headings (h1) | DM Sans | 700 | 24px (text-2xl) | normal |
| Headings (h3) | DM Sans | 600 | 16px (text-base) | normal |
| Data/Numbers | Space Mono | 400 | varies | normal |
| Sidebar brand | DM Sans | 700 | 14px | wide |
| Badges | DM Sans | 500 | 12px (text-xs) | wide |

### Usage Rules
- **Space Mono** for ALL data: invoice numbers, complaint refs, batch numbers, HS codes, dates, amounts, percentages, version numbers
- **DM Sans** for everything else
- Never use Inter, Roboto, Arial, or system fonts

---

## Spacing

Uses Tailwind 4px scale. Consistent patterns:
- Page padding: `p-6` (24px)
- Card padding: `p-4` to `p-5` (16-20px)
- Section gaps: `space-y-6` (24px)
- Element gaps: `gap-2` to `gap-4` (8-16px)
- Button padding: `px-4 py-2` (16px 8px)
- Input padding: `px-3 py-2` (12px 8px)
- Badge padding: `px-2.5 py-0.5` (10px 2px)

---

## Components

### .card
White background with subtle gradient, rounded-xl, soft shadow, surface-200 border. Hover lifts slightly.

### .card-accent
Card with a 3px amber gradient top border. Use for featured/primary cards.

### .btn-primary
Amber gradient background (accent-400 → accent-600), dark text. Hover brightens + shadow glow. Disabled at 50% opacity.

### .btn-secondary
White with surface-200 border. Hover shows surface-50 background and darker border.

### .btn-danger
Solid danger-600 with white text. Use sparingly — destructive actions only.

### .input
White background, surface-200 border, rounded-lg. Focus shows accent-400 border + ring.

### .badge
Rounded-full pill. Variants: success, danger, warning, info, default, purple.

### Modal
Centered overlay with backdrop blur. `role="dialog"`, ESC to close, focus trapped. Entrance animation (scale + fade). Sizes: sm, md, lg, xl.

### Toast
Fixed bottom-right. Auto-dismiss 4s. Variants: success (green), error (red), warning (amber). `role="alert"` for screen readers.

---

## Motion

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| page-enter | 250ms | ease-out | Page transitions (opacity + translateY) |
| modal-enter | 200ms | ease-out | Modal appearance (scale + fade) |
| skeleton-shimmer | 1.5s | ease-in-out infinite | Loading skeletons |
| card-hover-lift | 200ms | ease-out | Card hover (translateY -2px + shadow) |
| glow-pulse | 2s | ease-in-out infinite | AI status indicator |
| pulse-dot | 1.4s | ease-in-out infinite | AI typing dots (staggered) |

### Rules
- All transitions use 200ms ease-out unless specified
- Hover states always have transitions (no instant changes)
- Loading states use skeleton shimmer, not spinners (except inline buttons)

---

## Identity Elements

- **Geometric diamond pattern**: Subtle (3% opacity) in sidebar and body background. Uses surface-800 on light backgrounds, accent-400 in sidebar.
- **Grain noise overlay**: 2% opacity SVG noise at z-9999 for depth/texture.
- **Amber gradient**: The signature element — appears on primary buttons, card accents, sidebar logo, active nav borders.

---

## Accessibility

- WCAG 2.1 AA contrast minimum on all text
- 44px minimum touch targets on mobile
- `role="dialog"` + `aria-modal` + focus trap on all modals
- `role="button"` + keyboard Enter/Space on all clickable non-button elements
- `aria-label` on all icon-only buttons
- `role="alert"` + `aria-live="assertive"` on toast notifications
- `aria-label="Main navigation"` on sidebar nav
- `aria-expanded` on all expandable card sections

---

## Voice & Tone

- **Professional but warm**: "AI will automatically generate a tailored checklist" not "Our cutting-edge AI agent leverages..."
- **Action-oriented**: Button labels describe the action ("Create with AI Checklist", "Generate CAPA Report", "Run Analysis")
- **Domain-native**: Use FMCG/export terminology naturally (CAPA, Incoterms, HACCP, RCA) — the audience knows these terms
- **Helpful empty states**: "No audits yet. Create your first AI-powered audit." not just "No data."
- **Sample data labeled**: Always mark seed/demo data clearly
