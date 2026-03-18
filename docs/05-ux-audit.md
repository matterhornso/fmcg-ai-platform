# UX Audit Report: FMCG AI Platform

**Date:** 2026-03-18
**Evaluator:** UX Research (Heuristic Evaluation + Cognitive Walkthrough)
**Method:** Nielsen's 10 Usability Heuristics + Cognitive Walkthrough for 3 personas
**Scope:** All 4 pages, all modals, all AI chat panels, responsive behavior

---

## Executive Summary

The FMCG AI Platform presents a visually polished, domain-appropriate interface with a clean design language (warm neutrals, amber accents, dark sidebar). The AI integration is surfaced well with clear loading states and contextual chat panels. However, the audit uncovered **5 Critical (P0)**, **9 Major (P1)**, **11 Minor (P2)**, and **8 Enhancement (P3)** issues across responsiveness, error handling, accessibility, and workflow completeness.

The most severe issues are: (1) the app is completely unusable on mobile/tablet viewports due to no responsive layout, (2) destructive error feedback uses `alert()` instead of in-app notifications, (3) the Finance risk analysis results are shown via `alert()` losing all formatting, and (4) there is no way to delete complaints or invoices from the UI.

---

## Nielsen's 10 Heuristics Evaluation

### 1. Visibility of System Status

**Rating: 7/10 -- Good with gaps**

**What works well:**
- AI agent status indicator in sidebar (green dot with "AI Agents Active" / "AI Agents Offline") provides clear system state
- Dashboard shows "3 AI Agents Active" / "AI Agents Offline" badge in header
- AI chat shows animated typing dots (three pulsing circles) when processing
- Loading spinners appear for all data fetches (Loader2 component with `animate-spin`)
- Button text changes during AI operations ("Generating Checklist...", "AI Analyzing...", "Predicting...")
- Warning banner appears when API key is missing, with clear instructions

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| V1 | P1 | No progress indication for long AI operations. Creating an audit with AI checklist or running RCA can take 10-30 seconds. The spinner gives no sense of progress or estimated time. Users may think it's frozen. | `QualityAudit.tsx:297`, `Complaints.tsx:396` |
| V2 | P2 | The sidebar always shows "AI Agents Active" regardless of actual API key status. It only checks the health endpoint for the dashboard badge, not the sidebar. | `Layout.tsx:57-59` -- hardcoded green dot |
| V3 | P2 | No timestamp on AI chat messages. Users cannot tell when a response was generated. | `AIChat.tsx:109-131` |
| V4 | P3 | Dashboard auto-refreshes every 30 seconds but provides no visual indicator that data was refreshed. | `Dashboard.tsx:25` |

**Recommendations:**
- **V1 Fix:** Add elapsed-time counter or step indicators for AI operations. Example: "Generating checklist... (15s)" or a multi-step progress bar.
  ```
  // In QualityAudit.tsx, add timer state alongside createMutation
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (createMutation.isPending) {
      const t = setInterval(() => setElapsed(e => e + 1), 1000);
      return () => clearInterval(t);
    }
    setElapsed(0);
  }, [createMutation.isPending]);
  ```
- **V2 Fix:** Pass `health` data to Layout via context or React Query cache, and conditionally render the green dot.
- **V3 Fix:** Add `timestamp: Date.now()` to each message object and render it below each bubble.

---

### 2. Match Between System and Real World

**Rating: 9/10 -- Excellent**

**What works well:**
- Domain vocabulary is accurate and consistent: "CAPA", "GMP", "HACCP", "Incoterms", "FOB", "CIF", "LC at Sight", "DP at Sight", "Fishbone (Ishikawa)", "5-Why"
- Audit types match industry standards: Internal GMP, Supplier Audit, Regulatory/Export, Customer Audit, HACCP Review
- Country list is curated for actual FMCG export markets (UK, UAE, Qatar, Singapore, Germany)
- Payment terms use exact trade finance terminology
- Complaint reference numbers use industry-standard format (CMP-YYYYMMDD-XXX)
- Invoice numbering follows export documentation conventions
- Currency options match real trade corridors (USD, GBP, EUR, AED, SGD, INR)

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| M1 | P2 | "Export Markets: 35+" is hardcoded and not derived from actual data. If a new user has 0 invoices, showing "35+" is misleading. | `Dashboard.tsx:83-91` |
| M2 | P3 | Audit score percentage labels in the pie chart legend use generic colors (amber=Completed, green=In Progress, red=Pending). The color semantics are inverted -- red typically means danger/urgent, but here "Pending" (not yet started) is red while "In Progress" (actively working) is green. | `Dashboard.tsx:209-210` |

**Recommendations:**
- **M1 Fix:** Derive the count from unique `destination_country` values across invoices, or label it "Target Markets" to clarify it's an aspiration.
- **M2 Fix:** Use amber for Pending, blue for In Progress, green for Completed -- matching the Badge component's own color semantics.

---

### 3. User Control and Freedom

**Rating: 5/10 -- Needs significant improvement**

**What works well:**
- All modals have Cancel buttons and X close buttons
- Modals close when clicking the backdrop overlay
- Expand/collapse on list items works as toggle
- Search inputs can be cleared by the user
- Filter dropdowns can be reset to "All"

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| C1 | P0 | **No undo for any action.** Creating an audit, complaint, or invoice is permanent. There is no confirmation dialog before creation. | All creation mutations |
| C2 | P0 | **No way to delete complaints or invoices from the UI.** The Quality page has a DELETE endpoint (`DELETE /api/quality/:id`) but no delete button in the UI. Complaints and Finance have no delete endpoint at all. | `Complaints.tsx`, `Finance.tsx` |
| C3 | P1 | **No way to edit existing records.** Once an audit, complaint, or invoice is created, users cannot edit any fields. They can only change status or run AI analyses. | All pages |
| C4 | P1 | After running RCA, the modal auto-closes and the user has to find and expand the complaint to see results. There is no "View Results" flow. | `Complaints.tsx:63-68` |
| C5 | P1 | Response Letter generation uses `alert()` for success notification ("Response letter generated and saved! Check complaint details."), then closes the modal. User must manually find the complaint and expand it to see the letter. | `Complaints.tsx:80` |
| C6 | P2 | The New Complaint form does not reset after submission. If the user opens the modal again, old data may still be present (depends on component re-mount). | `Complaints.tsx:58-61` |
| C7 | P2 | No keyboard shortcut to close modals (Escape key). | `Modal.tsx` |

**Recommendations:**
- **C1 Fix:** Add a confirmation step for destructive operations or at minimum a toast notification with "Undo" action for 5 seconds post-creation.
- **C2 Fix:** Add delete buttons with confirmation dialogs. Add `DELETE` endpoints for complaints and finance routes on the server.
- **C3 Fix:** Add inline editing or an "Edit" modal for each record type.
- **C4/C5 Fix:** After RCA/letter generation, keep the modal open and display the result inline, with a "Done" button to close.
  ```tsx
  // In Complaints.tsx handleRCA, instead of closing:
  // setRcaTarget(null);  // Remove this
  // Add: setRcaResult(data); // Show result in modal
  ```
- **C7 Fix:** Add `onKeyDown` handler to Modal:
  ```tsx
  // In Modal.tsx, add useEffect:
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  ```

---

### 4. Consistency and Standards

**Rating: 8/10 -- Strong with minor inconsistencies**

**What works well:**
- Consistent card design across all pages (white cards with subtle gradient, rounded corners, hover shadow)
- Uniform button hierarchy: `btn-primary` (amber gradient), `btn-secondary` (white with border), action buttons (colored backgrounds)
- Status badges use consistent color mapping across pages (Badge.tsx)
- AI chat panels maintain consistent structure across all 3 agents
- Typography hierarchy is consistent (DM Sans for body, Space Mono for data)
- Color system is well-defined in tailwind.config.js with semantic names

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| S1 | P1 | **Inconsistent error feedback.** Quality page uses `alert()` for country requirements and shelf-life errors. Complaints uses `alert()` for RCA, letter, batch trace, and notification failures. Finance uses `alert()` for validation, risk analysis, HS classification, and incentives failures. The CLAUDE.md itself notes this as a known issue. | Multiple files |
| S2 | P1 | **Finance risk analysis shows results via `alert()`.** This loses all formatting and is jarring compared to other AI results that render beautifully in cards/modals. | `Finance.tsx:72` |
| S3 | P2 | Action button sizing is inconsistent. Collapsed complaint rows use `text-xs px-2 py-1` buttons, while expanded rows use `text-sm px-3 py-1.5` buttons with `btn-secondary` class. These have different border-radius values (`rounded-lg` vs `rounded-xl`). | `Complaints.tsx:206-236` vs `293-322` |
| S4 | P2 | The "Regulatory Notification" button uses `!bg-danger-500 hover:!bg-danger-600` with `!important` overrides on `btn-primary`, creating a style hack. | `Complaints.tsx:437` |
| S5 | P3 | The "Create with AI Checklist" button text is significantly longer than other primary action buttons, causing visual imbalance in the modal. | `QualityAudit.tsx:298` |

**Recommendations:**
- **S1/S2 Fix:** Replace all `alert()` calls with a toast notification system. Create a `Toast.tsx` component or use a library like `react-hot-toast`. Display AI results inline in modals or expandable sections, not in `alert()`.
  ```tsx
  // Create client/src/components/ui/Toast.tsx
  // Replace alert('Failed to...') with toast.error('Failed to...')
  // Replace alert(`Risk Level: ${data.riskLevel}...`) with a proper modal
  ```
- **S3 Fix:** Standardize action button classes. Use a shared `action-btn` class.
- **S4 Fix:** Create a `btn-danger` variant properly instead of using `!important` overrides.

---

### 5. Error Prevention

**Rating: 5/10 -- Significant gaps**

**What works well:**
- HTML `required` attribute on mandatory form fields
- Disabled submit buttons during pending mutations
- "Generate Requirements" button disables when required fields are empty
- Invoice line item totals auto-calculate (preventing math errors)
- Audit analysis requires at least one non-empty finding (validated in `handleAnalyze`)

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| E1 | P0 | **No form validation beyond `required`.** Invoice number accepts any format (no pattern validation). Batch numbers have no format validation. Quantities and prices accept 0 and negative values. | `Finance.tsx:355,417-418` |
| E2 | P0 | **Invoice creation button uses `onClick` instead of form `onSubmit`**, bypassing HTML5 form validation entirely. Users can submit invoices with empty required fields. | `Finance.tsx:435-439` -- The form element wraps the content but the submit is handled via `onClick` on the button, not `onSubmit` on the form. |
| E3 | P1 | **No duplicate invoice number prevention.** Users can create multiple invoices with the same number. | `Finance.tsx:355` |
| E4 | P1 | **Complaint description textarea has no character limit.** A user could paste a very long text that the AI agent might struggle with. | `Complaints.tsx:368` |
| E5 | P2 | **Date inputs accept future dates for complaint dates and past dates with no bounds.** A complaint date of "1900-01-01" would be accepted. | `Complaints.tsx:363` |
| E6 | P2 | **No confirmation before running AI operations that modify data** (RCA overwrites previous RCA, re-validation overwrites compliance check). | Multiple files |

**Recommendations:**
- **E1 Fix:** Add pattern validation for invoice numbers, min/max for quantities and prices:
  ```tsx
  <input pattern="INV-\d{4}-\d{4}" title="Format: INV-YYYY-XXXX" .../>
  <input type="number" min="1" .../>  // quantity
  <input type="number" min="0.01" step="0.01" .../> // price
  ```
- **E2 Fix:** Change the invoice creation to use `<form onSubmit>` like the complaints form does, rather than `onClick` on the button.
- **E5 Fix:** Add `max={new Date().toISOString().split('T')[0]}` to date inputs.
- **E6 Fix:** Add confirmation dialogs: "This will overwrite the existing RCA. Continue?"

---

### 6. Recognition Rather Than Recall

**Rating: 8/10 -- Good**

**What works well:**
- Search bars on every list page with clear placeholder text
- Filter dropdowns with pre-defined options (status, priority)
- Country selection via dropdown (not free text) prevents typos
- Audit types presented as labeled options
- Incoterms available as dropdown selections
- AI chat placeholder text describes what topics each agent can help with
- Status and priority badges are color-coded for quick recognition
- Quick Actions section on dashboard provides shortcuts to common tasks

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| R1 | P2 | **The "Batch Number" field on complaints is free text** with only a placeholder example. Export managers must remember the batch format. A pattern hint or auto-complete from existing batches would help. | `Complaints.tsx:359` |
| R2 | P2 | **AI chat has no suggested prompts or quick actions.** Users must think of what to ask. Pre-filled suggestion chips would reduce cognitive load. | `AIChat.tsx:103-108` |
| R3 | P3 | **The invoice form does not auto-generate invoice numbers.** The API auto-generates on the backend, but the form shows a manual input field labeled "Invoice Number *" with placeholder "INV-2024-XXXX". This creates confusion about whether the user must provide one. | `Finance.tsx:355` |

**Recommendations:**
- **R2 Fix:** Add suggestion chips below the placeholder:
  ```tsx
  {messages.length === 0 && (
    <div className="flex flex-wrap gap-2 mt-2">
      {['What documents do I need for UK export?', 'Explain CIF vs FOB',
        'HACCP checklist for biscuits'].map(q => (
        <button key={q} onClick={() => { setInput(q); sendMessage(); }}
          className="text-xs bg-white border rounded-full px-3 py-1">
          {q}
        </button>
      ))}
    </div>
  )}
  ```
- **R3 Fix:** Either auto-generate the invoice number client-side or make the field optional with helper text "Leave blank to auto-generate".

---

### 7. Flexibility and Efficiency of Use

**Rating: 6/10 -- Adequate for beginners, limited for power users**

**What works well:**
- Dashboard quick actions provide shortcuts
- Search works across multiple fields (title, type, name, ref, product, country)
- Complaints page has combined search + status + priority filtering
- Expand/collapse lets users scan lists quickly
- AI chat supports Enter to send, Shift+Enter for newline

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| F1 | P1 | **No keyboard shortcuts.** No shortcut to create new items (Ctrl+N), search (Ctrl+K), or navigate pages. | App-wide |
| F2 | P2 | **No bulk operations.** Cannot select multiple complaints to run RCA or change status on multiple items at once. | `Complaints.tsx` |
| F3 | P2 | **No sorting options.** Lists cannot be sorted by date, status, priority, or score. | All list pages |
| F4 | P2 | **No pagination.** As data grows, all items load at once. With hundreds of complaints, performance will degrade. | All list pages |
| F5 | P3 | **No export/download capability.** Cannot export audit reports, complaint lists, or compliance checklists as PDF/CSV. | All pages |
| F6 | P3 | **AI chat has no copy-to-clipboard for responses.** Users must manually select and copy AI-generated text. | `AIChat.tsx` |

**Recommendations:**
- **F1 Fix:** Add a keyboard shortcut handler at the Layout level using `useEffect` with `keydown` listener. Implement Ctrl+K for global search and Ctrl+N for new item creation.
- **F3 Fix:** Add sort dropdown or clickable column headers.
- **F6 Fix:** Add a copy button on each AI response message bubble.

---

### 8. Aesthetic and Minimalist Design

**Rating: 9/10 -- Excellent**

**What works well:**
- Clean, professional design with purposeful use of whitespace
- Warm neutral color palette (surface-50 through surface-900) feels premium without being cold
- Amber accent color is distinctive and appropriate for an Indian FMCG brand
- Dark sidebar provides clear visual separation between navigation and content
- Subtle geometric pattern background adds texture without distraction (opacity: 0.015)
- Typography hierarchy is clear: DM Sans for readability, Space Mono for data
- Card design with subtle gradient and hover shadows creates depth
- Modal backdrop blur effect is refined
- Consistent border radius (rounded-lg, rounded-xl, rounded-2xl) creates cohesion
- AI chat panels are visually differentiated per agent with color-coded headers

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| A1 | P2 | The noise texture overlay (`body::after`) with `z-index: 9999` sits above all content including modals. While opacity is only 0.02, it theoretically could interfere with interactions on some browsers. | `index.css:152-164` |
| A2 | P3 | Dashboard stat cards use `grid-cols-4` with no responsive breakpoint. On medium screens, cards become very narrow. | `Dashboard.tsx:128` |
| A3 | P3 | The "Export Markets: 35+" card links to `/finance` which is not semantically related. A user clicking it expecting to see a markets overview lands on the invoice page. | `Dashboard.tsx:90` |

**Recommendations:**
- **A1 Fix:** Lower the z-index to below modal z-index (z-50), or add `pointer-events: none` (already present, but z-index is still unnecessarily high):
  ```css
  body::after { z-index: 0; }  /* was 9999 */
  ```
- **A2 Fix:** Use `grid-cols-2 lg:grid-cols-4` for responsive stat cards.

---

### 9. Help Users Recognize, Diagnose, and Recover from Errors

**Rating: 4/10 -- Weak**

**What works well:**
- AI chat shows a friendly error message when API fails ("Sorry, I encountered an error. Please try again.")
- Empty states show appropriate icons and messages ("No audits yet", "No complaints found")
- Empty search results show the same empty state (though it doesn't distinguish "no results for your search" from "no data")

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| H1 | P0 | **All API error handling uses `alert()` with generic messages.** "Failed to fetch country requirements", "Validation failed", "RCA failed" give no diagnostic information. Users cannot distinguish between a network error, a server error, or an AI quota issue. | All pages -- 11 instances of `alert('Failed to...')` |
| H2 | P1 | **No error boundary.** If a React component crashes (e.g., due to unexpected AI response JSON), the entire app goes white with no recovery option. | `App.tsx` |
| H3 | P1 | **Empty search state is indistinguishable from empty data state.** When searching "zzzzz" on Quality page, it shows "No audits yet. Create your first AI-powered audit." with a Create button -- implying there are no audits at all, when really the search just has no matches. | `QualityAudit.tsx:152-158` |
| H4 | P2 | **No retry mechanism.** When an AI operation fails, the user must manually re-trigger it. There is no "Retry" button in the error state. | All AI operations |
| H5 | P2 | **Network offline state is not detected.** If the user loses connectivity, API calls fail silently or show generic alerts. | App-wide |

**Recommendations:**
- **H1 Fix:** Replace all `alert()` error handlers with a toast system that shows the error message from the API response:
  ```tsx
  catch (e: any) {
    toast.error(e.response?.data?.error || 'An unexpected error occurred. Please try again.');
  }
  ```
- **H2 Fix:** Add an ErrorBoundary component wrapping routes:
  ```tsx
  // client/src/components/ErrorBoundary.tsx
  class ErrorBoundary extends React.Component {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
      if (this.state.hasError) return <ErrorFallback onReset={() => this.setState({hasError: false})} />;
      return this.props.children;
    }
  }
  ```
- **H3 Fix:** Differentiate empty search from empty data:
  ```tsx
  filtered.length === 0 && search ? (
    <div className="card p-12 text-center">
      <Search className="w-12 h-12 text-surface-300 mx-auto mb-3" />
      <p className="text-surface-500">No audits match "{search}"</p>
      <button onClick={() => setSearch('')} className="btn-secondary mt-4">Clear Search</button>
    </div>
  ) : filtered.length === 0 ? ( /* existing empty state */ )
  ```

---

### 10. Help and Documentation

**Rating: 6/10 -- Adequate**

**What works well:**
- AI chat panels serve as contextual help on every page
- AI info banners in creation modals explain what will happen ("AI will automatically generate a tailored checklist with 20-30 inspection points")
- Placeholder text in AI chat describes capabilities per agent
- API key setup instructions appear when AI is disabled

**Issues found:**

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| D1 | P1 | **No tooltips on any UI element.** Abbreviations like "CAPA", "GMP", "HACCP", "RCA", "HS Code" are used without explanation. A new user unfamiliar with export terminology would be lost. | All pages |
| D2 | P2 | **No onboarding flow.** First-time users see the dashboard with data but no guidance on what to do first or how the AI agents work. | `Dashboard.tsx` |
| D3 | P2 | **AI chat placeholder "Ask your AI agent..." is generic.** It does not hint at the type of questions the agent can answer. The more descriptive placeholder is only shown in the empty state card above, not in the input itself. | `AIChat.tsx:158` |
| D4 | P3 | **No "What is this?" or info icons** next to features like "Shelf-Life Predictor" or "Country Requirements" to explain their purpose before clicking. | `QualityAudit.tsx:122-127` |

**Recommendations:**
- **D1 Fix:** Add tooltip component (or use `title` attributes) on domain-specific terms. Add an info icon next to "RCA", "CAPA", "HS Classify" buttons with hover tooltips explaining the abbreviation.
- **D2 Fix:** Add a first-visit onboarding overlay or a "Getting Started" card on the dashboard that dismisses after interaction.
- **D3 Fix:** Change the input placeholder to match the agent context:
  ```tsx
  placeholder={placeholder || config.description}  // Already exists in empty state
  // Change input placeholder to be agent-specific too
  ```

---

## Cognitive Walkthroughs

### Persona 1: Priya (Quality Manager)

**Task: Create an audit, generate checklist, and analyze findings**

| Step | Action | Observation | Issues |
|------|--------|-------------|--------|
| 1 | Navigate to Quality Audits | Sidebar nav clearly labeled. Active state (amber highlight) confirms location. | None |
| 2 | Click "New Audit" | Button is prominent (amber, top-right). Modal opens smoothly with animation. | None |
| 3 | Fill in audit details | Form fields are clear with good placeholders. Audit type dropdown has relevant options. | No asterisk visual cue on which fields are truly required vs optional beyond label text |
| 4 | Submit | Button says "Create with AI Checklist" -- clear expectation setting. Loading state shows "Generating Checklist..." | **P1**: No progress indication. Could take 15+ seconds. Priya may think it's frozen and click again. |
| 5 | View generated checklist | Audit appears in list. Must click to expand and see checklist. | **P2**: No automatic expansion or highlight of newly created item. Must scroll/find it. |
| 6 | Click "Analyze" on an audit | Opens modal with findings input. Can add multiple findings. | None -- good UX |
| 7 | Submit analysis | Loading state shows "AI Analyzing..." | **P1**: After completion, modal closes. Priya must find and expand the audit to see CAPA report. No direct path to results. |
| 8 | Use Country Requirements | Modal opens with country/product inputs. | **P2**: No pre-fill from existing audit data. Priya must re-enter country and product. |

**Walkthrough Verdict:** Functional but has friction points around result visibility after AI operations. The "fire and forget" pattern (submit, modal closes, find result elsewhere) adds unnecessary steps.

### Persona 2: Anita (Complaints Lead)

**Task: Log a complaint, run RCA, generate response letter**

| Step | Action | Observation | Issues |
|------|--------|-------------|--------|
| 1 | Click "Log Complaint" | Button is clear. Modal opens. | None |
| 2 | Fill complaint form | Good field layout (2-column grid). Country dropdown prevents typos. Date defaults to today. | **P2**: Complaint Date field has no max validation. Anita could accidentally enter a future date. |
| 3 | Submit | "Submit & Analyze" -- clear. AI info banner explains what will happen. | **P1**: Loading state shows "AI Analyzing..." but no indication of what AI is doing (classifying? prioritizing? both?) |
| 4 | View AI classification | Complaint appears in list with priority badge and category auto-assigned. | **P2**: Anita must expand the complaint to see the full AI analysis (summary, immediate actions). The collapsed view only shows badges. |
| 5 | Click "RCA" | Confirmation modal shows complaint details. "Run Analysis" button is clear. | None -- good confirmation pattern |
| 6 | Wait for RCA | Loading spinner with "Analyzing..." | **P0**: If this fails, only an `alert('Failed to perform RCA')` appears. No diagnostic info. No retry button. |
| 7 | View RCA results | Modal closes. Must find and expand complaint. | **P1**: Results not shown inline after completion. |
| 8 | Click "Response Letter" | Modal asks for resolution details. Good -- forces Anita to think about resolution before generating. | None -- good UX pattern |
| 9 | Submit letter | "Drafting..." loading state. | **P0**: Success shows `alert('Response letter generated and saved!')`. This is jarring and provides no preview. Anita must close alert, find complaint, expand it to read the letter. |
| 10 | Review letter | Expand complaint, scroll to response letter section. | **P2**: Letter preview is truncated with `line-clamp-6`. No "Read Full" expansion. |

**Walkthrough Verdict:** The core flow works but the post-AI-operation experience is poor. Every AI result requires a "find and expand" scavenger hunt instead of showing results immediately.

### Persona 3: Rajesh (Export Officer)

**Task: Create invoice, validate compliance, generate document checklist**

| Step | Action | Observation | Issues |
|------|--------|-------------|--------|
| 1 | Click "New Invoice" | Button clear. Modal opens. | None |
| 2 | Fill invoice form | Good form with Incoterms dropdown, currency selector, payment terms. Line items with auto-calculated totals. | **P0**: The submit button uses `onClick` not `onSubmit`, bypassing HTML form validation. Rajesh can submit with empty required fields. |
| 3 | Add line items | "+ Add Line Item" link is clear. Remove button (X) appears for multiple items. | **P2**: Line item total column doesn't include currency symbol, while the grand total does. Inconsistent. |
| 4 | Submit | "Creating..." loading state. | None |
| 5 | Click "Validate" on invoice | Small button on collapsed card. | **P2**: Button is very small (`text-xs px-2 py-1`). Touch target is approximately 24x20px -- below the 44x44px recommended minimum. |
| 6 | View compliance results | Must expand card to see compliance analysis. | **P1**: No immediate feedback. Rajesh doesn't know validation is complete without expanding. |
| 7 | Click "Risk Analysis" | | **P0**: Results shown via `alert()`. Rajesh sees a plain text popup: "Risk Level: Medium\n\nFactors:\nFactor 1\nFactor 2\n\nRecommended Terms: LC at Sight". This is unformatted, unprofessional, and cannot be shared or copied easily. |
| 8 | Click "Document Checklist" | Separate modal with country/product inputs. | **P2**: Country field not pre-filled from the invoice Rajesh was just looking at. |
| 9 | Generate checklist | Good result display with categorized documents, certifications, labeling requirements. | **P3**: No way to save, print, or export the checklist. |
| 10 | Click "HS Classify" | | **P1**: Results show inline but only when expanded. No notification that classification is complete. |

**Walkthrough Verdict:** The invoice creation flow has a critical form validation bypass. Risk analysis results via `alert()` is the most jarring UX issue in the entire app. The document checklist generator is well-designed but lacks export capabilities.

---

## Responsive Design Issues

### Critical (P0): App is unusable below 1024px viewport width

The entire application uses fixed layouts with no responsive breakpoints:

| Issue | Details | File & Line |
|-------|---------|-------------|
| **Sidebar never collapses** | The 256px (`w-64`) sidebar is fixed-width. On a 768px tablet, it consumes 33% of the screen. On 375px mobile, it takes 68% of the viewport, pushing content off-screen. | `Layout.tsx:26` |
| **Grid layouts break** | Dashboard uses `grid-cols-4` (stat cards), `grid-cols-2` (charts), `grid-cols-3` (quick actions). Quality/Complaints/Finance use `grid-cols-3`. None have responsive variants. | `Dashboard.tsx:128,153,290`, `QualityAudit.tsx:134`, `Complaints.tsx:134`, `Finance.tsx:146` |
| **AI chat panel disappears** | On narrow viewports, the AI chat panel in the third column is pushed off screen or compressed to unusable width. | All feature pages |
| **Header buttons overflow** | Quality page header has 3 buttons ("Country Requirements", "Shelf-Life Predictor", "New Audit") that wrap/overflow on medium screens. | `QualityAudit.tsx:121-131` |

**Evidence:** Screenshots `07a_dashboard_tablet.png`, `07b_quality_tablet.png`, `09a_dashboard_mobile.png`, `09b_complaints_mobile.png`, `09c_finance_mobile.png` clearly show content being cut off and overlapping.

**Recommendation:** Add responsive breakpoints:
```tsx
// Layout.tsx - Collapsible sidebar
<aside className="w-64 lg:w-64 md:w-16 sm:hidden ...">
// Or add hamburger menu toggle

// Dashboard.tsx - Responsive grids
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// Feature pages - Stack AI chat below list on mobile
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
```

---

## Accessibility Issues

| ID | Severity | Issue | Location |
|----|----------|-------|----------|
| ACC1 | P1 | **No ARIA labels on icon-only buttons.** The modal close button (X icon), expand/collapse chevrons, and send button in AI chat have no accessible label. Screen readers would announce them as "button" with no context. | `Modal.tsx:30-34`, `AIChat.tsx:163-168` |
| ACC2 | P1 | **Color-only status indication.** Priority and status badges rely solely on color (red=critical, yellow=warning, green=success). Users with color vision deficiency cannot distinguish them. | `Badge.tsx` |
| ACC3 | P2 | **No focus management in modals.** When a modal opens, focus is not trapped inside. Users can tab to elements behind the modal overlay. | `Modal.tsx` |
| ACC4 | P2 | **Contrast ratio concern on amber buttons.** The `btn-primary` uses dark text (`surface-900`) on amber gradient background. The amber (#f0a500) on dark navy (#0f0f23) ratio is approximately 6.8:1 (passes AA), but the mid-gradient color (#c77d00) drops to approximately 4.8:1 for large text only. | `index.css:47-50` |
| ACC5 | P2 | **No skip-to-content link.** Screen reader users must tab through the entire sidebar navigation on every page load. | `Layout.tsx` |
| ACC6 | P3 | **AI chat textarea has no associated label element.** The placeholder serves as the only label. | `AIChat.tsx:153-161` |

**Recommendations:**
- **ACC1 Fix:** Add `aria-label` attributes:
  ```tsx
  <button onClick={onClose} aria-label="Close modal" ...>
  <button onClick={sendMessage} aria-label="Send message" ...>
  ```
- **ACC2 Fix:** Add text or icon indicators alongside color (already partially done with text labels, but the small badge size makes the text hard to read).
- **ACC3 Fix:** Use `focus-trap-react` library or implement manual focus trapping in Modal.tsx.

---

## Issue Summary by Severity

### Critical (P0) -- 5 issues
1. **E2**: Invoice form bypasses HTML validation (onClick vs onSubmit)
2. **C2**: No delete capability for complaints/invoices
3. **H1**: All errors shown via `alert()` with no diagnostic information (11 instances)
4. **Responsive**: App completely unusable below 1024px viewport width
5. **C1**: No undo or confirmation for creation actions

### Major (P1) -- 9 issues
1. **S1/S2**: Finance risk analysis results shown via `alert()`
2. **V1**: No progress indication for long AI operations
3. **C3**: No ability to edit existing records
4. **C4/C5**: AI operation results not shown inline (fire-and-forget pattern)
5. **H2**: No React ErrorBoundary
6. **H3**: Empty search state indistinguishable from empty data state
7. **F1**: No keyboard shortcuts
8. **D1**: No tooltips on domain-specific abbreviations
9. **ACC1/ACC2**: Missing ARIA labels and color-only status indication

### Minor (P2) -- 11 issues
1. **V2**: Sidebar AI status always shows "Active"
2. **V3**: No timestamps on AI chat messages
3. **M1**: Hardcoded "35+" export markets count
4. **S3**: Inconsistent action button sizing
5. **C6**: Form state not reset after submission
6. **C7**: No Escape key to close modals
7. **E5**: Date inputs accept invalid date ranges
8. **R1/R2**: No suggested prompts in AI chat
9. **F3**: No sorting options on lists
10. **ACC3**: No focus trapping in modals
11. **A1**: Noise overlay z-index higher than modal z-index

### Enhancement (P3) -- 8 issues
1. **V4**: No visual indicator for auto-refresh
2. **M2**: Pie chart color semantics inverted
3. **A2/A3**: Dashboard stat card grid not responsive; Export Markets card links to Finance
4. **R3**: Invoice number field confusion (manual vs auto-generated)
5. **S5**: Long button text on Create Audit
6. **F5**: No export/download capability
7. **F6**: No copy button on AI chat responses
8. **D2/D4**: No onboarding flow or feature info icons

---

## Priority Action Plan

### Sprint 1 (Critical fixes -- 1-2 days)
1. Replace all `alert()` calls with toast notification system across `QualityAudit.tsx`, `Complaints.tsx`, `Finance.tsx`
2. Fix Finance invoice form to use `<form onSubmit>` instead of button `onClick`
3. Show Finance risk analysis results in a proper modal instead of `alert()`
4. Add basic responsive breakpoints to Layout.tsx (collapsible sidebar) and all grid layouts

### Sprint 2 (Major UX improvements -- 3-5 days)
1. Show AI operation results inline in modals instead of closing and requiring find-and-expand
2. Add Escape key handler to Modal.tsx
3. Differentiate empty search results from empty data state
4. Add `aria-label` to all icon-only buttons
5. Add ErrorBoundary component
6. Add progress elapsed timer for AI operations

### Sprint 3 (Polish -- 3-5 days)
1. Add tooltips for domain abbreviations
2. Add keyboard shortcuts (Ctrl+K search, Ctrl+N new)
3. Add sorting to list views
4. Add suggested prompt chips to AI chat empty state
5. Add copy-to-clipboard on AI chat responses
6. Add delete functionality with confirmation dialogs

---

## Files Requiring Changes

| File | Changes Needed | Priority |
|------|---------------|----------|
| `client/src/pages/Finance.tsx` | Fix form validation (onSubmit), replace 3 alert() calls, add risk analysis modal | P0 |
| `client/src/pages/Complaints.tsx` | Replace 4 alert() calls, show RCA/letter results inline | P0, P1 |
| `client/src/pages/QualityAudit.tsx` | Replace 2 alert() calls, differentiate empty states | P0, P1 |
| `client/src/components/ui/Modal.tsx` | Add Escape key handler, focus trapping, aria-label on close button | P1, P2 |
| `client/src/components/Layout.tsx` | Add responsive sidebar (collapsible), fix AI status indicator | P0, P2 |
| `client/src/components/AIChat.tsx` | Add aria-label to send button, timestamps, suggested prompts, copy button | P1, P2, P3 |
| `client/src/pages/Dashboard.tsx` | Add responsive grid breakpoints, fix pie chart colors | P0, P3 |
| `client/src/index.css` | Fix body::after z-index | P2 |
| `client/src/components/ui/Toast.tsx` | **New file** -- Toast notification component | P0 |
| `client/src/components/ErrorBoundary.tsx` | **New file** -- Error boundary component | P1 |

---

*Report generated from analysis of live application screenshots and source code review. Screenshots archived at `/tmp/ux_audit/`.*
