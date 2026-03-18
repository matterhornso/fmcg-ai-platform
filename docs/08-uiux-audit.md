# UI/UX Audit Report -- FMCG AI Platform

**Date:** 2026-03-18
**Auditor:** Automated audit via WCAG accessibility, design critique, design polish, and responsive design skill frameworks
**Scope:** Dashboard, Quality Audits, Complaints, Finance & Export pages
**Screenshots:** `/tmp/uiux_audit/` (20 screenshots across 4 viewports: 1440px, 1024px, 768px, 375px)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Accessibility Audit (WCAG 2.1 AA)](#2-accessibility-audit-wcag-21-aa)
3. [Design Critique](#3-design-critique)
4. [Design Polish Review](#4-design-polish-review)
5. [Responsive Design Audit](#5-responsive-design-audit)
6. [Prioritized Fix Recommendations](#6-prioritized-fix-recommendations)

---

## 1. Executive Summary

The FMCG AI Platform presents a professional, enterprise-grade interface with a coherent color system, consistent component patterns, and functional data density. However, the audit reveals **critical responsive layout failures** at mobile viewports, **several WCAG accessibility gaps**, and polish-level inconsistencies that should be addressed before production deployment.

**Severity breakdown:**
- **Critical (must fix):** 5 issues (responsive breakage, missing ARIA, no focus trap in modals)
- **Major (should fix):** 8 issues (touch targets, color contrast, heading hierarchy)
- **Minor (nice to fix):** 10 issues (spacing inconsistencies, animation polish, edge cases)

---

## 2. Accessibility Audit (WCAG 2.1 AA)

### 2.1 Semantic HTML

| Check | Status | Notes |
|-------|--------|-------|
| Semantic tags used | Partial | `<aside>`, `<nav>`, `<main>` are present in Layout.tsx. Pages use `<div>` heavily instead of `<section>` or `<article>`. |
| Heading hierarchy | FAIL | Every page starts with `<h1>`. However, cards use `<h3>` and `<h4>` but skip `<h2>` in some contexts (Dashboard.tsx line 156, 184). The modal uses `<h2>` correctly. |
| Form labels connected | PASS | All form inputs use `<label className="label">` with adjacent `<input>`. However, labels use className-based association, not `htmlFor`/`id` pairing. |
| Lists semantic | FAIL | Navigation in Layout.tsx uses `<NavLink>` inside `<nav>` but not wrapped in `<ul>`/`<li>`. |

**File:** `client/src/components/Layout.tsx`
**Issue:** Nav items are `<NavLink>` elements directly inside `<nav>` without a `<ul>` wrapper.
**Fix:** Wrap nav items in `<ul><li>` structure.

**File:** All page files
**Issue:** Labels use positional association, not explicit `htmlFor`/`id` binding.
**Fix:** Add `htmlFor` to every `<label>` and matching `id` to every `<input>`.

### 2.2 Keyboard Navigation

| Check | Status | Notes |
|-------|--------|-------|
| Tab navigation | Partial | Standard links and buttons are tabbable. Custom card click handlers use `onClick` on `<div>` elements, which are not keyboard-accessible. |
| Enter/Space activation | FAIL | Expandable cards in Quality, Complaints, and Finance pages use `onClick` on a `<div>`, not a `<button>`. These cannot be activated via keyboard. |
| ESC closes modals | FAIL | Modal.tsx has no `onKeyDown` handler for Escape key. |
| Focus trap in modals | FAIL | Modal.tsx does not implement focus trapping. Focus can tab behind the modal overlay. |
| Focus indicators | Partial | The `.input:focus` class provides ring styles. Buttons rely on browser defaults, which may be suppressed by some resets. No custom focus styles on `.btn-primary`, `.btn-secondary`, or card click targets. |

**File:** `client/src/components/ui/Modal.tsx`
**Issue:** No ESC key handler, no focus trap, no `role="dialog"`, no `aria-modal`, no `aria-labelledby`.
**Fix:** Add `onKeyDown` for Escape, implement focus trap with `tabIndex={-1}` on container, add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` referencing the title `<h2>`.

**File:** `client/src/pages/QualityAudit.tsx` (line 193-195), `Complaints.tsx` (line 193-196), `Finance.tsx` (line 183-184)
**Issue:** Card expand/collapse is handled by `onClick` on a `<div>`. No `role="button"`, `tabIndex="0"`, or `onKeyDown` handler.
**Fix:** Add `role="button"`, `tabIndex={0}`, `onKeyDown` handler for Enter/Space, and `aria-expanded` attribute.

### 2.3 ARIA Attributes

| Check | Status | Notes |
|-------|--------|-------|
| aria-label on icon buttons | FAIL | Close button in Modal.tsx has no `aria-label`. Toast dismiss button has no `aria-label`. Delete buttons (trash icon only) have no `aria-label`. Send button in AIChat.tsx has no `aria-label`. |
| aria-live for dynamic content | FAIL | Toast.tsx does not use `role="alert"` or `aria-live`. AI chat messages appear without announcement. Loading spinners have no `aria-live="polite"` region. |
| aria-hidden on decorative elements | FAIL | Decorative geometric pattern divs in Layout.tsx sidebar lack `aria-hidden="true"`. Lucide icons used purely as decoration beside text labels lack `aria-hidden`. |
| Landmark roles | Partial | `<aside>`, `<nav>`, `<main>` provide landmarks. Missing `aria-label` on `<nav>` to distinguish it ("Main navigation"). |

**File:** `client/src/components/ui/Toast.tsx`
**Issue:** Toast notifications are not announced to screen readers.
**Fix:** Add `role="alert"` and `aria-live="assertive"` to the toast container.

**File:** `client/src/components/AIChat.tsx`
**Issue:** Send button (line 163-166) uses only an icon with no accessible label.
**Fix:** Add `aria-label="Send message"` to the send button.

### 2.4 Color Contrast

Contrast ratios computed from the Tailwind config hex values:

| Text/Background Pair | Ratio | WCAG AA | Notes |
|---|---|---|---|
| `surface-500` (#7c786e) on `white` (#fff) | 3.9:1 | FAIL (needs 4.5:1) | Used for subtitle text throughout (e.g., "AI-powered quality..." descriptions) |
| `surface-400` (#a8a49a) on `white` (#fff) | 2.7:1 | FAIL | Used for metadata text, timestamps, sub-values on dashboard cards |
| `surface-400` (#a8a49a) on `surface-50` (#fafaf9) | 2.6:1 | FAIL | Used in card metadata on hover/expanded states |
| `accent-400` (#f0a500) on `surface-900` (#0f0f23) | 8.2:1 | PASS | Primary button text |
| `white` on `success-600` (#059669) | 4.6:1 | PASS | QualityAI chat header |
| `white` on `danger-500` (#ef4444) | 3.9:1 | FAIL (large text only) | ComplaintAI chat header -- small text at 14px |
| `accent-500` (#e09400) on `white` (#fff) | 2.9:1 | FAIL | "View all" links on Dashboard |
| `warning-600` (#d97706) on `warning-50` (#fffbeb) | 3.7:1 | FAIL | Warning badge text |

**File:** `client/tailwind.config.js`, `client/src/index.css`
**Fix:** Darken `surface-400` to at least `#706c62` for body text usage. Darken `surface-500` to `#5c5850`. Use `accent-700` (#a66200) instead of `accent-500` for links on white. Use `danger-700` for small text on danger backgrounds. Use `warning-700` (#92400e) for warning badge text.

### 2.5 Images and Icons

| Check | Status | Notes |
|-------|--------|-------|
| Alt text on images | N/A | No `<img>` elements used; all visuals are SVG icons from Lucide. |
| Decorative icons | FAIL | Icons used alongside text labels (e.g., sidebar nav icons, stat card icons) lack `aria-hidden="true"`. Screen readers will attempt to read the SVG content. |
| Icon-only buttons | FAIL | Delete buttons (Trash2 icon), expand/collapse chevrons, and the chat send button use icon-only presentation with no accessible label. |

### 2.6 Accessibility Summary Checklist

- [ ] Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, ESC handler, and focus trap to Modal.tsx
- [ ] Add `role="alert"` and `aria-live` to Toast.tsx
- [ ] Add `aria-label` to all icon-only buttons (send, close, delete, expand/collapse)
- [ ] Add `aria-hidden="true"` to decorative icons next to text labels
- [ ] Add `htmlFor`/`id` pairing to all form labels and inputs
- [ ] Add `role="button"`, `tabIndex={0}`, keyboard handlers to clickable card divs
- [ ] Fix color contrast on `surface-400`, `surface-500`, `accent-500` text
- [ ] Wrap nav items in `<ul><li>` structure
- [ ] Add `aria-label="Main navigation"` to `<nav>`
- [ ] Add skip-to-content link

---

## 3. Design Critique

### 3.1 AI Slop Detection

**Verdict: Minor tells present, but overall acceptable.**

The design avoids the worst AI-generated tropes: no gradient text, no glassmorphism, no glowing neon accents. The warm amber/gold palette is distinctive and avoids the typical blue/purple AI palette. However, a few tells remain:

- **Geometric background pattern** (index.css lines 98-116): The body::before pseudo-element adds a subtle diamond pattern. This is a common AI-generated decorative element that adds visual noise without purpose.
- **Noise texture overlay** (index.css lines 152-164): The body::after grain overlay at z-index 9999 is a trendy touch that adds minimal value and sits above everything at z-9999 (could interfere with dropdowns/tooltips).
- **Gradient card borders** (Modal.tsx line 26): The gradient border effect on modals is a decorative flourish.
- **"Agentic Intelligence" tagline** in sidebar: Buzzword-heavy micro-copy.

### 3.2 Visual Hierarchy

**What works:**
- Dashboard stat cards draw the eye with large monospace numbers (3xl font-bold font-mono). The gradient top-line accents provide subtle category coding.
- The 2-column + AI chat layout on Quality/Complaints/Finance pages creates a clear primary/secondary split.
- Active sidebar nav items have distinct highlight styling with accent color and border.

**Issues:**
- **Dashboard stat cards are equal weight.** All 4 cards have the same visual treatment. If "Customer Complaints" has critical items, it should visually dominate. The conditional red styling helps, but the cards are still uniform in size.
- **Action buttons on complaint/invoice cards compete.** At collapsed state, 3-5 small action buttons (RCA, Response Letter, Regulatory Notification, Trace Batch) create visual noise. The buttons use different color schemes (danger-50, accent-50, blue-50) which adds to the clutter.
- **Charts section on Dashboard lacks visual weight.** The "Complaints by Country" bar chart and "Audit Status Overview" pie chart are buried below the fold at 1440px. They use the same `.card p-5` treatment as everything else.

### 3.3 Information Architecture

- **Navigation is clear and predictable.** Four sections map directly to business functions. The sidebar stays consistent.
- **3-column grid on inner pages** (2/3 list + 1/3 AI chat) is a good pattern but becomes problematic at narrower viewports (see Responsive section).
- **Filter and search placement** is consistent across Quality, Complaints, and Finance pages.

### 3.4 Typography

- **DM Sans** is a solid choice for a professional SaaS app. Readable, modern, not generic.
- **Space Mono** for numeric values and codes adds a nice technical feel.
- Body text at `text-sm` (14px) is at the lower bound of comfortable reading. Descriptions and metadata at `text-xs` (12px) are too small for extended reading on desktop.
- **Line heights** rely on Tailwind defaults, which are generally adequate.

### 3.5 Color System

- The amber/gold accent (#f0a500 to #c77d00) is distinctive and creates good brand identity.
- Semantic colors (success green, danger red, warning amber, info blue) are properly applied.
- The dark sidebar (#0f0f23) provides strong contrast with the light content area.
- **Issue:** The accent color is very close to the warning color, which can cause confusion (e.g., "No API Key" warning banner uses accent-50 styling, same as finance action buttons).

### 3.6 Emotional Resonance

The interface conveys **competence and seriousness** appropriate for an enterprise FMCG platform. The dark sidebar + light content area is a mature pattern. The AI chat panels with colored headers create a sense of specialization. The amber accent adds warmth without being playful.

---

## 4. Design Polish Review

### 4.1 Border Radius Consistency

| Element | Radius | Notes |
|---------|--------|-------|
| Cards | `rounded-xl` (12px) | Consistent |
| Buttons (primary/secondary) | `rounded-lg` (8px) | Consistent |
| Inputs | `rounded-lg` (8px) | Consistent |
| Badges | `rounded-full` | Consistent |
| Modals | `rounded-2xl` (16px) | Larger than cards -- intentional hierarchy |
| Chat message bubbles | `rounded-2xl` (16px) | Matches modal radius |
| Sidebar nav items | `rounded-lg` (8px) | Matches buttons |
| AI chat action buttons in Complaints | `rounded-lg` (8px) vs `rounded-xl` (12px) | **Inconsistent** -- expanded view buttons use `rounded-xl` while collapsed view uses `rounded-lg` |

**File:** `client/src/pages/Complaints.tsx`
**Fix:** Standardize action buttons to `rounded-lg` throughout.

### 4.2 Shadow Consistency

| Element | Shadow | Notes |
|---------|--------|-------|
| Cards | `shadow-sm` default, `shadow-md` on hover | Good progression |
| Modals | `shadow-2xl` | Appropriate for overlay |
| Toast | `shadow-lg` | Appropriate for floating element |
| Stat card hover | `shadow-lg` | Jumps from sm to lg -- `shadow-md` would be smoother |

**File:** `client/src/pages/Dashboard.tsx` (line 131)
**Fix:** Change `hover:shadow-lg` to `hover:shadow-md` on stat cards for consistency with other card hover effects.

### 4.3 Animation and Transitions

- **Page enter animation** (0.25s ease-out translateY 4px): Subtle and appropriate.
- **Modal enter animation** (0.2s ease-out scale+translateY): Good.
- **Card hover transitions** (`transition-all duration-200`): Smooth.
- **`animate-pulse` on status dots**: Used on AI status indicator and agent status. Creates constant visual motion that can be distracting and fails `prefers-reduced-motion`.
- **No `prefers-reduced-motion` media query anywhere.** This is a WCAG AAA requirement and a polish expectation.
- **`glow-pulse` keyframe** defined in tailwind.config.js but appears unused. Dead code.

**File:** `client/src/index.css`
**Fix:** Add `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }`

### 4.4 Icon Sizing Consistency

| Context | Size | Notes |
|---------|------|-------|
| Sidebar nav icons | `w-4 h-4` | Consistent |
| Stat card icons | `w-5 h-5` | Consistent |
| Action button icons (collapsed) | `w-3 h-3` | Consistent |
| Action button icons (expanded) | `w-4 h-4` | **Mismatch** with collapsed view |
| Modal close button icon | `w-5 h-5` | Appropriate |
| Chat header icon | `w-5 h-5` | Consistent |

**File:** `client/src/pages/Complaints.tsx`, `Finance.tsx`
**Fix:** Use `w-3.5 h-3.5` consistently for action button icons across both collapsed and expanded states, or keep `w-3 h-3` for compact and `w-4 h-4` for expanded (current approach is acceptable if intentional).

### 4.5 Whitespace and Spacing

- **Page padding:** Consistent `p-6` on the main content wrapper.
- **Card internal padding:** Consistent `p-4` for list items, `p-5` for standalone cards.
- **Spacing between sections:** Consistent `space-y-6` at page level, `space-y-3` and `space-y-4` within sections.
- **Gap in grids:** Consistent `gap-4` for major grids.
- **Issue:** The AI chat panel is fixed at `h-[600px]` which creates inconsistent bottom alignment when the left content area is shorter or longer. On pages with few items, there is a large empty space below the chat; on pages with many items, the chat does not grow.

### 4.6 Edge Cases

| Case | Handled? | Notes |
|------|----------|-------|
| Empty state (no audits) | PASS | Shows icon + message + CTA button (QualityAudit.tsx line 175-180) |
| Empty state (no complaints) | Partial | Shows icon + message but no CTA to create |
| Empty state (no invoices) | Partial | Shows icon + message but no CTA to create |
| Empty state (no chart data) | PASS | Dashboard shows "No complaint data yet" placeholder |
| Loading states | PASS | All pages show spinner during data fetch |
| Long text truncation | PASS | Uses `truncate` and `line-clamp-2` appropriately |
| Error state from AI | PASS | AIChat.tsx shows fallback error message (line 73-76) |
| Console.error in ErrorBoundary | Present | `console.error` on line 25 of ErrorBoundary.tsx should be removed for production |

**File:** `client/src/pages/Complaints.tsx` (line 181-184), `Finance.tsx` (line 170-173)
**Fix:** Add CTA buttons to empty states: "Log your first complaint" and "Create your first invoice."

### 4.7 Code Quality Notes

- `ErrorBoundary.tsx` line 25: `console.error` should be replaced with a proper error reporting service call.
- Several `any` types used throughout pages (`(a: any)`, `(c: any)`, `(inv: any)`) -- these should be properly typed.
- `Filter` import in Complaints.tsx is imported but unused.

---

## 5. Responsive Design Audit

### 5.1 Critical: Sidebar Does Not Collapse on Mobile

**Severity: CRITICAL**

**Screenshots:** `dashboard_375.png`, `complaints_375.png`, `finance_375.png`, `quality_375.png`

At 375px viewport width, the sidebar remains fixed at `w-64` (256px), consuming 68% of the screen. The main content area is pushed to a sliver of approximately 119px, making the entire application **unusable on mobile devices**.

**File:** `client/src/components/Layout.tsx`
**Issue:** The sidebar has a fixed `w-64` class with no responsive modifiers. There is no hamburger menu, no mobile drawer pattern, no responsive behavior at all.
**Fix:** Implement a mobile sidebar pattern:
1. Hide sidebar by default on small screens: `className="w-64 ... hidden md:flex md:flex-col"` (or use a fixed overlay drawer)
2. Add a hamburger button visible on mobile: `className="md:hidden"` in the main content area header
3. Implement a slide-over drawer pattern with backdrop for mobile nav
4. Consider `lg:w-64` breakpoint since 768px with a 256px sidebar leaves only 512px for content.

### 5.2 Critical: Grid Layouts Do Not Adapt

**Severity: CRITICAL**

**Dashboard (dashboard_768.png, dashboard_375.png):**
- `grid-cols-4` on stat cards (Dashboard.tsx line 128) has no responsive modifiers. At 768px with sidebar, this creates 4 compressed columns. At 375px, the cards are unreadable.
- `grid-cols-2` for charts section and `grid-cols-2` for recent activity have no responsive modifiers.
- `grid-cols-3` for Quick AI Actions has no responsive modifier.

**Inner pages (quality_375.png, complaints_375.png, finance_375.png):**
- `grid-cols-3` layout (2-col list + 1-col AI chat) on Quality, Complaints, and Finance pages has no responsive modifiers. The AI chat panel is completely inaccessible on mobile.

**File:** `client/src/pages/Dashboard.tsx`
**Fix:**
```
line 128: grid-cols-4 -> grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
line 153: grid-cols-2 -> grid-cols-1 md:grid-cols-2
line 226: grid-cols-2 -> grid-cols-1 md:grid-cols-2
line 290: grid-cols-3 -> grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
```

**File:** `client/src/pages/QualityAudit.tsx`
**Fix:**
```
line 157: grid-cols-3 -> grid-cols-1 lg:grid-cols-3
line 284: h-[600px] -> h-[400px] lg:h-[600px]
```

Same pattern for Complaints.tsx (line 154) and Finance.tsx (line 159).

### 5.3 Major: Modal Sizing on Mobile

**Severity: MAJOR**

Modals use `max-w-md` / `max-w-lg` / `max-w-2xl` / `max-w-4xl` sizing which works well on desktop. The outer wrapper uses `p-4` padding. However:

- At 375px, an `xl` modal (max-w-4xl = 896px) will just fill the viewport minus 32px padding -- this works due to CSS max-width behavior, but the internal `grid-cols-2` layouts inside modals (e.g., Complaints form, Finance form) do not have responsive modifiers.
- Modal content at `p-5` with a 2-column grid leaves each column at approximately 135px wide on mobile.

**File:** `client/src/pages/Complaints.tsx` (line 367), `Finance.tsx` (line 371), `QualityAudit.tsx` (line 332, 459)
**Fix:** Change all `grid-cols-2` inside modals to `grid-cols-1 sm:grid-cols-2`.

### 5.4 Major: Touch Targets Below 44px Minimum

**Severity: MAJOR**

Several interactive elements fall below the 44x44px minimum touch target size:

| Element | Actual Size | File |
|---------|------------|------|
| Collapsed action buttons (RCA, Response Letter, etc.) | ~24px height (`px-2 py-1 text-xs`) | Complaints.tsx line 226-256 |
| Filter dropdowns header | ~36px height (`input w-36`) | Complaints.tsx line 163 |
| "Add Finding" / "Add Line Item" text links | ~20px height (text only, no padding) | QualityAudit.tsx line 618, Finance.tsx line 446 |
| Remove item "x" buttons | ~16px tap target | QualityAudit.tsx line 614, Finance.tsx line 442 |
| Sidebar nav items at mobile | ~36px height (`py-2.5`) | Layout.tsx line 85 |
| Chat send button | 36px (`p-2` with 20px icon) | AIChat.tsx line 163 |

**Fix:** Ensure all interactive elements have at least `min-h-[44px] min-w-[44px]` on touch devices. Use `@media (pointer: coarse)` or responsive classes to increase padding on mobile.

### 5.5 Major: Text Readability on Mobile

At 375px viewport with the sidebar visible, main content text is severely compressed. Even if the sidebar were hidden:
- `text-xs` (12px) metadata text would be at the minimum legible size
- `text-sm` (14px) body text is acceptable but tight
- `text-[10px]` version text in sidebar (Layout.tsx line 103) is too small at any viewport

**Fix:** Ensure no text below 12px. Increase metadata text to `text-sm` on mobile viewports.

### 5.6 Minor: Horizontal Scroll

The `grid-cols-4` stat cards on Dashboard at 768px viewport with sidebar create columns of approximately 100px each, which can cause horizontal overflow if stat values are large. The `font-mono text-3xl` number display could overflow narrow columns.

The HS Classification table in Finance (Finance.tsx line 307) uses `overflow-x-auto` which handles horizontal scroll correctly.

### 5.7 Responsive Summary

| Viewport | Usability Rating | Key Issues |
|----------|-----------------|------------|
| 1440px | Good | All layouts work well. Minor spacing improvements possible. |
| 1024px | Acceptable | Content is compressed but functional. Sidebar takes proportionally more space. |
| 768px | Poor | Sidebar + content creates cramped layout. Grids do not reflow. |
| 375px | Broken | Sidebar consumes 68% of screen. Application is unusable. |

---

## 6. Prioritized Fix Recommendations

### P0 -- Critical (Ship blockers)

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 1 | **Sidebar does not collapse on mobile** | `client/src/components/Layout.tsx` | Implement responsive sidebar with hamburger menu. Hide with `hidden lg:flex` and add mobile drawer. |
| 2 | **Grid layouts have no responsive breakpoints** | `Dashboard.tsx`, `QualityAudit.tsx`, `Complaints.tsx`, `Finance.tsx` | Add `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` etc. to all grid declarations. |
| 3 | **Modal has no focus trap or ESC handler** | `client/src/components/ui/Modal.tsx` | Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, ESC key handler, and focus trap logic. |
| 4 | **Clickable card divs are not keyboard-accessible** | `QualityAudit.tsx`, `Complaints.tsx`, `Finance.tsx` | Add `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter/Space, `aria-expanded`. |
| 5 | **Toast has no screen reader announcement** | `client/src/components/ui/Toast.tsx` | Add `role="alert"` and `aria-live="assertive"`. |

### P1 -- Major (Should fix before launch)

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 6 | **Color contrast fails WCAG AA** for `surface-400` and `surface-500` text on white | `client/tailwind.config.js` | Darken `surface-400` to `#706c62`, `surface-500` to `#5c5850`. |
| 7 | **Touch targets below 44px** | Multiple page files | Add `min-h-[44px]` to all buttons on mobile via `@media (pointer: coarse)` or responsive classes. |
| 8 | **Icon-only buttons lack aria-labels** | `Modal.tsx`, `Toast.tsx`, `AIChat.tsx`, `Complaints.tsx`, `Finance.tsx` | Add `aria-label` to close, send, delete, and expand/collapse buttons. |
| 9 | **Modal form grids don't reflow on mobile** | `Complaints.tsx`, `Finance.tsx`, `QualityAudit.tsx` | Change `grid-cols-2` inside modals to `grid-cols-1 sm:grid-cols-2`. |
| 10 | **No `prefers-reduced-motion` support** | `client/src/index.css` | Add media query to disable/reduce animations. |
| 11 | **White text on `danger-500` (#ef4444) fails AA** for small text | `AIChat.tsx` | Use `danger-700` (#b91c1c) for chat headers, or increase text size to 18px+. |
| 12 | **Accent color link text fails contrast on white** | `Dashboard.tsx` | Use `accent-700` (#a66200) instead of `accent-500` for "View all" links. |
| 13 | **Form labels not explicitly associated** | All form inputs across pages | Add `htmlFor` + `id` attribute pairing. |

### P2 -- Minor (Polish improvements)

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 14 | **Empty states on Complaints and Finance lack CTA** | `Complaints.tsx`, `Finance.tsx` | Add "Log your first complaint" / "Create your first invoice" buttons. |
| 15 | **Nav lacks `<ul><li>` structure** | `Layout.tsx` | Wrap NavLink items in `<ul><li>`. |
| 16 | **Decorative icons lack `aria-hidden`** | All pages | Add `aria-hidden="true"` to icons that accompany text labels. |
| 17 | **Stat card hover jumps from shadow-sm to shadow-lg** | `Dashboard.tsx` line 131 | Change to `hover:shadow-md` for smoother transition. |
| 18 | **AI chat fixed height creates uneven layouts** | `QualityAudit.tsx`, `Complaints.tsx`, `Finance.tsx` | Use `min-h-[400px] max-h-[600px] h-full` or `sticky top-6` positioning. |
| 19 | **Action button border-radius inconsistency** | `Complaints.tsx` | Standardize to `rounded-lg` for all action buttons. |
| 20 | **`console.error` in ErrorBoundary** | `ErrorBoundary.tsx` line 25 | Replace with error reporting service. |
| 21 | **Unused import: `Filter` in Complaints.tsx** | `Complaints.tsx` line 12 | Remove unused import. |
| 22 | **Noise texture overlay at z-index 9999** | `index.css` line 162 | Reduce to `z-index: -1` or remove entirely. Can interfere with dropdowns. |
| 23 | **`text-[10px]` version text too small** | `Layout.tsx` line 103 | Increase to `text-xs` (12px) minimum. |

---

## Appendix: Screenshots Reference

| Screenshot | Description |
|-----------|-------------|
| `dashboard_1440.png` | Dashboard at full desktop width -- good layout |
| `dashboard_1024.png` | Dashboard at laptop width -- compressed but functional |
| `dashboard_768.png` | Dashboard at tablet -- sidebar + 4-col grid cramped |
| `dashboard_375.png` | Dashboard at mobile -- **BROKEN**, sidebar consumes screen |
| `quality_1440.png` | Quality page at desktop -- clean 2+1 layout |
| `quality_expanded_1440.png` | Quality with expanded card showing AI checklist |
| `quality_modal_1440.png` | Create Audit modal -- good form layout |
| `quality_375.png` | Quality at mobile -- **BROKEN** |
| `complaints_1440.png` | Complaints at desktop -- action buttons visible |
| `complaints_modal_1440.png` | Log Complaint modal -- 2-column form |
| `complaints_375.png` | Complaints at mobile -- **BROKEN** |
| `complaints_768.png` | Complaints at tablet -- cramped but readable |
| `finance_1440.png` | Finance at desktop -- clean layout with amounts |
| `finance_modal_1440.png` | New Invoice modal -- line items table |
| `finance_375.png` | Finance at mobile -- **BROKEN** |
| `finance_1024.png` | Finance at laptop -- acceptable density |
