# Solution Architecture: FMCG Export AI Platform

**Framework:** Solution Architect (TOGAF-adapted)
**Date:** 2026-03-17

---

## 1. Business Requirements → Technical Architecture

### Business Outcomes Required:
1. Reduce export documentation errors by 80%
2. Cut complaint resolution time from 5-7 days to 24 hours
3. Automate quality audit checklist generation (20-30 checkpoints per audit type)
4. Provide country-specific compliance intelligence for 35+ countries
5. Enable AI-powered root cause analysis and CAPA generation
6. Unify quality, complaints, and finance in a single platform

### Non-Functional Requirements:
| NFR | Target | Rationale |
|-----|--------|-----------|
| **Availability** | 99.5% uptime | Export teams work across time zones |
| **Response time** | <2s for CRUD, <15s for AI operations | Users currently wait days; even 15s is a massive improvement |
| **Data residency** | India-first (can extend) | FSSAI and Indian data regulations |
| **Concurrent users** | 50-200 | Mid-size company: 10-50 users; start with single-tenant |
| **AI fallback** | App works without AI | Critical: AI is enhancement, not dependency |
| **Security** | Role-based access, audit logs | Regulatory requirement for quality records |

---

## 2. Architecture Decision Records

### ADR-001: Monolithic vs. Microservices

**Context:** Platform has 3 domains (Quality, Complaints, Finance) with shared data.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| **A: Monolith (Express)** | Simple deployment, shared DB, fast iteration | Coupling, harder to scale domains independently |
| **B: Microservices** | Independent scaling, team autonomy | Operational complexity, distributed data, overkill for MVP |
| **C: Modular Monolith** | Clean boundaries + simple deployment | Requires discipline to maintain boundaries |

**Decision:** **Option C — Modular Monolith** with Express.js
- Clear module boundaries (`/modules/quality`, `/modules/complaints`, `/modules/finance`)
- Shared SQLite database with domain-specific tables
- Can extract to microservices later if needed
- Right complexity for a team of 1-5 developers

**Consequences:** Must enforce module boundaries in code reviews. Shared DB means schema changes affect all modules.

---

### ADR-002: Database Selection

**Context:** Need structured data storage for audits, complaints, invoices with JSON fields.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| **A: SQLite (node:sqlite)** | Zero config, embedded, Node 25 built-in | Single-writer, no network access |
| **B: PostgreSQL** | Robust, JSONB, concurrent writes | Requires separate server, more ops |
| **C: MongoDB** | Flexible schema, good for documents | Weak consistency, harder joins |

**Decision:** **Option A — SQLite via node:sqlite** for MVP
- Zero infrastructure cost and complexity
- Built into Node 25 — no native binding issues
- WAL mode handles concurrent reads well
- JSON stored as TEXT with `JSON.parse()` in application layer
- Migration path to PostgreSQL is straightforward (SQL compatible)

**Consequences:** Single-writer bottleneck acceptable for <200 users. Must use positional `?` params (not named). Must use `db.exec()` for PRAGMAs.

---

### ADR-003: AI Integration Pattern

**Context:** Need AI for classification, analysis, document generation, and chat.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| **A: Direct API calls** | Simple, full control, streaming | No caching, no retry logic built-in |
| **B: LangChain/LlamaIndex** | Abstraction, tools, memory | Heavy dependency, abstraction leaks |
| **C: Custom agent layer** | Domain-specific, lightweight | More code to maintain |

**Decision:** **Option C — Custom agent layer** with `@anthropic-ai/sdk`
- 3 domain agents: QualityAI, ComplaintAI, FinanceAI
- Each agent has a system prompt with deep domain knowledge
- `extractJSON()` helper for structured output parsing
- `thinking: { type: 'adaptive' }` for reasoning on complex analyses
- Graceful fallback to heuristics when API key is missing
- Streaming for chat, non-streaming for structured analysis

**Consequences:** Must maintain domain prompts as regulations change. No automatic retry/caching — add if needed.

---

### ADR-004: Frontend Architecture

**Context:** Need a responsive, data-rich dashboard with real-time updates and AI chat.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| **A: React + Vite + Tailwind** | Fast dev, rich ecosystem, component reuse | SPA complexity |
| **B: Next.js** | SSR, API routes, full-stack | Heavier, more opinionated |
| **C: HTMX + server templates** | Simpler, less JS | Poor for complex interactivity (AI chat, real-time) |

**Decision:** **Option A — React 18 + Vite + Tailwind CSS + React Query**
- Vite for fast HMR during development
- Tailwind for rapid UI iteration without CSS file proliferation
- React Query for server state management (caching, refetching, optimistic updates)
- Recharts for data visualization
- Lucide for consistent iconography

**Consequences:** SPA means client-side routing. Must handle loading/error states explicitly. No SSR (acceptable for internal tool).

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │Dashboard │  │ Quality  │  │Complaints│  │   Finance    │   │
│  │  Page    │  │  Module  │  │  Module  │  │   Module     │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │              │               │           │
│  ┌────┴──────────────┴──────────────┴───────────────┴────┐     │
│  │              React Query + Axios                       │     │
│  └───────────────────────┬───────────────────────────────┘     │
│                          │ HTTP/JSON                            │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                     SERVER (Express + TypeScript)                 │
│                          │                                       │
│  ┌───────────────────────┼───────────────────────────────┐     │
│  │              Express Router Layer                      │     │
│  │  /api/dashboard  /api/quality  /api/complaints         │     │
│  │                  /api/finance  /api/health              │     │
│  └──────┬────────────┬────────────┬───────────────────────┘     │
│         │            │            │                              │
│  ┌──────┴──┐  ┌──────┴──┐  ┌─────┴───┐                        │
│  │Quality  │  │Complaint│  │Finance  │  ← AI Agent Layer       │
│  │Agent    │  │Agent    │  │Agent    │                          │
│  └────┬────┘  └────┬────┘  └────┬────┘                         │
│       │            │            │                               │
│       └────────────┼────────────┘                               │
│                    │                                            │
│  ┌─────────────────┴──────────────────┐                        │
│  │     Anthropic Claude API            │                        │
│  │     (claude-opus-4-6 + adaptive thinking) │                  │
│  └────────────────────────────────────┘                        │
│                                                                 │
│  ┌────────────────────────────────────┐                        │
│  │     SQLite (node:sqlite)           │                        │
│  │  ┌─────────┐ ┌──────────┐ ┌──────┐│                        │
│  │  │ audits  │ │complaints│ │invoices│                        │
│  │  └─────────┘ └──────────┘ └──────┘│                        │
│  └────────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Module Design

### Quality Module
```
Capabilities:
├── Audit CRUD (create, read, update, delete)
├── AI Checklist Generation (by audit type + product + country)
├── Findings Analysis → CAPA report (score, corrective actions, preventive)
├── Status Workflow (pending → in_progress → completed)
├── AI Chat (QualityAI agent)
└── Export audit reports
```

### Complaints Module
```
Capabilities:
├── Complaint CRUD with auto-generated reference numbers
├── AI Classification (category, priority, risk level)
├── Root Cause Analysis (Fishbone/Ishikawa + 5-Why)
├── Response Letter Generation (per country/culture)
├── Regulatory Notification Flagging (auto-detect if regulator notification required)
├── Status Workflow (open → investigating → resolved → closed)
├── AI Chat (ComplaintAI agent)
└── Analytics (by country, category, priority, trend)
```

### Finance Module
```
Capabilities:
├── Invoice CRUD with auto-numbering
├── AI Compliance Validation (country-specific document requirements)
├── Export Document Checklist Generation (by country + product + Incoterms)
├── Financial Risk Analysis (country risk, currency risk, payment terms)
├── Status Workflow (pending → approved/review_required → paid)
├── AI Chat (FinanceAI agent)
└── Analytics (by currency, country, status)
```

### Dashboard Module
```
Capabilities:
├── Aggregated stats (audits, complaints, invoices)
├── Charts (complaints by country, audit status pie)
├── Recent activity feed
├── AI status indicator
└── Quick action shortcuts
```

---

## 5. Technology Evaluation Matrix

| Criterion (Weight) | SQLite (node:sqlite) | PostgreSQL | MongoDB |
|--------------------|---------------------|------------|---------|
| Setup complexity (15%) | 10 | 4 | 5 |
| Query capability (20%) | 7 | 10 | 6 |
| Concurrent writes (15%) | 4 | 10 | 8 |
| Node.js integration (15%) | 10 | 7 | 8 |
| Operational cost (20%) | 10 | 5 | 5 |
| Migration path (15%) | 7 | 10 | 6 |
| **Weighted Score** | **8.15** | **7.60** | **6.35** |

**Winner for MVP: SQLite** — migrate to PostgreSQL when concurrent users exceed 200 or multi-server deployment is needed.

---

## 6. Implementation Roadmap

### Phase 1: MVP (Current — Weeks 1-2)
- Core CRUD for all 3 modules
- AI agent integration (checklist, classification, compliance)
- Dashboard with stats and charts
- AI chat per module
- Graceful AI fallback mode

### Phase 2: Enhanced (Weeks 3-4)
- Role-based access control
- Batch operations (bulk invoice validation)
- Document template generation (PDF export)
- Email notification integration
- Audit trail logging

### Phase 3: Scale (Weeks 5-8)
- Multi-tenant support
- PostgreSQL migration
- Real-time notifications (WebSocket)
- Mobile-responsive optimization
- API rate limiting and caching
- Integration with external systems (SAP, Tally, customs portals)
