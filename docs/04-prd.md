# Product Requirements Document: FMCG Export AI Platform

**Framework:** Product Manager Toolkit (RICE + PRD)
**Version:** 2.0
**Date:** 2026-03-17
**Author:** Product Team

---

## 1. Problem Statement

Indian FMCG manufacturers exporting to 35+ countries lose 2-5% of export revenue due to fragmented quality audit, complaint management, and export compliance workflows that rely on Excel, email, and manual processes — causing shipment delays, regulatory penalties, and damaged retailer relationships.

## 2. Target Users

| Persona | Role | JTBD | Primary Module |
|---------|------|------|----------------|
| **Priya** | Quality Manager | "Help me prepare for audits faster and generate CAPA reports that satisfy BRC/FSSC auditors" | Quality |
| **Anita** | Customer Complaints Lead | "Help me classify, investigate, and respond to international complaints within 24 hours" | Complaints |
| **Rajesh** | Export Documentation Officer | "Help me ensure every shipment has the right documents for the destination country" | Finance |
| **Vikram** | Finance/Export Manager | "Help me validate invoices and manage payment risk across currencies" | Finance |

## 3. Success Metrics

| Metric | Current | Target (6 months) | How Measured |
|--------|---------|-------------------|--------------|
| Complaint resolution time | 5-7 days | <48 hours | Avg time from complaint creation to resolution |
| Audit checklist creation time | 2-3 days | <5 minutes | Time from audit creation to checklist ready |
| Export doc errors per 100 shipments | 8-12 | <2 | Shipments held/returned due to doc issues |
| AI analysis accuracy | N/A | >85% | User acceptance rate of AI recommendations |
| Time to regulatory notification | 48-72 hours | <4 hours | Time from critical complaint to notification draft |

## 4. Feature Prioritization (RICE Framework)

| # | Feature | Reach | Impact | Confidence | Effort | RICE Score | Priority |
|---|---------|-------|--------|------------|--------|------------|----------|
| 1 | **AI Audit Checklist Generation** | 5000 | High (3) | High (1.0) | M (3) | 5000 | P0 |
| 2 | **AI Complaint Classification & Triage** | 8000 | Massive (4) | High (1.0) | M (3) | 10667 | P0 |
| 3 | **Export Compliance Validation** | 6000 | High (3) | Medium (0.8) | L (5) | 2880 | P0 |
| 4 | **Dashboard with Stats & Charts** | 10000 | Medium (2) | High (1.0) | S (2) | 10000 | P0 |
| 5 | **AI Root Cause Analysis (Fishbone + 5-Why)** | 3000 | High (3) | Medium (0.8) | M (3) | 2400 | P1 |
| 6 | **AI Response Letter Generation** | 4000 | High (3) | High (1.0) | S (2) | 6000 | P0 |
| 7 | **Export Document Checklist by Country** | 5000 | High (3) | Medium (0.8) | M (3) | 4000 | P0 |
| 8 | **Financial Risk Analysis** | 2000 | Medium (2) | Low (0.5) | M (3) | 667 | P2 |
| 9 | **AI Chat per Module** | 6000 | Medium (2) | High (1.0) | M (3) | 4000 | P1 |
| 10 | **Regulatory Notification Flagging** | 3000 | Massive (4) | Medium (0.8) | L (5) | 1920 | P1 |
| 11 | **Complaint Analytics (by country/category)** | 4000 | Medium (2) | High (1.0) | S (2) | 4000 | P1 |
| 12 | **Invoice CRUD with Auto-numbering** | 5000 | Medium (2) | High (1.0) | S (2) | 5000 | P0 |
| 13 | **Audit Status Workflow** | 3000 | Low (1) | High (1.0) | XS (1) | 3000 | P1 |
| 14 | **PDF Report Export** | 2000 | Medium (2) | Medium (0.8) | L (5) | 640 | P2 |
| 15 | **Role-based Access Control** | 3000 | Medium (2) | High (1.0) | L (5) | 1200 | P2 |

### MVP Scope (P0 Features):
1. AI Complaint Classification & Triage
2. Dashboard with Stats & Charts
3. AI Response Letter Generation
4. AI Audit Checklist Generation
5. Invoice CRUD with Auto-numbering
6. Export Document Checklist by Country
7. Export Compliance Validation

### V1.1 Scope (P1 Features):
8. AI Root Cause Analysis
9. AI Chat per Module
10. Regulatory Notification Flagging
11. Complaint Analytics
12. Audit Status Workflow

---

## 5. Technical Framework

### Stack Decision

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Runtime** | Node.js 25 | Built-in SQLite, TypeScript support, async/await |
| **Server** | Express.js 4 | Mature, lightweight, flexible routing |
| **Language** | TypeScript | Type safety for complex domain objects |
| **Database** | SQLite (node:sqlite DatabaseSync) | Zero-config, embedded, sufficient for MVP scale |
| **AI** | @anthropic-ai/sdk + Claude Opus 4.6 | Best reasoning for complex regulatory analysis |
| **Frontend** | React 18 + Vite 5 | Fast HMR, rich component ecosystem |
| **Styling** | Tailwind CSS 3 | Rapid prototyping, consistent design system |
| **State** | @tanstack/react-query | Server state caching, background refetch |
| **Charts** | Recharts | Composable React charts, good for dashboards |
| **Icons** | Lucide React | Consistent, lightweight icon set |
| **Process** | tsx (watch mode) | TypeScript execution without build step |

### API Design

```
REST API — JSON over HTTP

Authentication: None (MVP — internal tool)
Base URL: http://localhost:3001/api

Standard patterns:
  GET    /api/{module}              → List all
  POST   /api/{module}              → Create (+ AI enrichment)
  GET    /api/{module}/:id          → Get one
  PATCH  /api/{module}/:id/status   → Update status
  DELETE /api/{module}/:id          → Delete
  POST   /api/{module}/chat         → AI chat
  POST   /api/{module}/:id/{action} → AI action (analyze, validate, rca)
  GET    /api/{module}/analytics/*  → Analytics endpoints
```

### Database Schema

```sql
-- 3 core tables with JSON fields for flexible AI-generated data
audits (id, title, type, product, supplier, location, status,
        checklist[JSON], findings[JSON], corrective_actions[JSON],
        score, ai_analysis[JSON], created_at, updated_at)

complaints (id, complaint_ref, customer_name, customer_country,
            product, batch_number, complaint_date, description,
            category, priority, status, root_cause[JSON],
            resolution, response_draft, ai_analysis[JSON],
            created_at, updated_at)

invoices (id, invoice_number, customer_name, destination_country,
          invoice_date, items[JSON], total_amount, currency,
          payment_terms, incoterms, status, compliance_check[JSON],
          ai_analysis[JSON], documents_required[JSON],
          created_at, updated_at)
```

### AI Agent Architecture

```
Each agent has:
├── System prompt with deep FMCG domain knowledge
├── Structured JSON output parsing (extractJSON helper)
├── Adaptive thinking (type: 'adaptive') for complex analysis
├── Graceful fallback to heuristics/defaults when API unavailable
└── Chat mode for interactive consultation

Agent capabilities:
  QualityAI:   generateChecklist, analyzeFindings, chat
  ComplaintAI:  classifyComplaint, rootCauseAnalysis, generateLetter, chat
  FinanceAI:    validateCompliance, documentChecklist, riskAnalysis, chat
```

---

## 6. User Flows

### Flow 1: New Quality Audit
```
User clicks "New Audit" → Modal with form (title, type, product, supplier, location)
  → POST /api/quality (server calls QualityAI.generateChecklist)
  → AI returns 20-30 checkpoint items + guidelines
  → Audit created with status "pending" + AI checklist
  → User reviews checklist, conducts audit, records findings
  → User clicks "Analyze" → enters findings
  → POST /api/quality/:id/analyze (server calls QualityAI.analyzeFindings)
  → AI returns score, risk level, corrective actions, preventive measures
  → Audit marked "completed" with CAPA report
```

### Flow 2: New Customer Complaint
```
User clicks "Log Complaint" → Modal with form (customer, country, product, batch, description)
  → POST /api/complaints (server calls ComplaintAI.classifyAndAnalyze)
  → AI returns category, priority, risk level, immediate actions, regulatory flags
  → Complaint created with AI classification
  → If critical → banner alert + regulatory notification suggestion
  → User can trigger RCA (POST /:id/rca → Fishbone + 5-Why)
  → User can generate response letter (POST /:id/response-letter)
  → Status workflow: open → investigating → resolved → closed
```

### Flow 3: Export Invoice Validation
```
User creates invoice → POST /api/finance (manual entry)
  → User clicks "Validate Compliance"
  → POST /api/finance/:id/validate (server calls FinanceAI.validateCompliance)
  → AI checks: documents required, Incoterms suitability, payment terms risk,
    country-specific regulations, customs considerations
  → Returns compliance status: compliant / issues_found / review_required
  → User can also generate document checklist by country
  → User can run financial risk analysis
```

---

## 7. Out of Scope (MVP)

- User authentication / RBAC
- Multi-tenant support
- PDF/document generation
- Email notifications
- Mobile app
- Integration with SAP/Tally/customs portals
- Offline mode
- Multi-language support
- Real-time collaboration
- Audit trail / changelog

---

## 8. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| AI hallucinating regulatory advice | Critical | Medium | Fallback to defaults; AI analysis marked as "AI-suggested, verify" |
| No API key = broken app | High | High | Graceful fallback with heuristic classification and default checklists |
| SQLite write contention | Medium | Low (MVP) | WAL mode; upgrade to PostgreSQL if scaling |
| Prompt injection via user input | Medium | Low | Input sanitization; Claude's built-in safety |
| Stale regulatory data in prompts | Medium | Medium | Version prompts; date-stamp AI analysis |
