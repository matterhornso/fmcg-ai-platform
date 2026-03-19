# FMCG AI Platform

**Agentic AI Platform for Indian FMCG Export Operations**

A unified platform for managing quality audits, customer complaints, and export compliance across 35+ international markets. Purpose-built for Indian FMCG manufacturers, the platform combines domain-specific AI agents with structured workflows to reduce export documentation errors, accelerate complaint resolution, and automate regulatory compliance.

---

## Features

### Three Specialized AI Agents
- **QualityAI** -- Generates audit checklists (20-30 inspection points per audit type), analyzes findings, and produces CAPA reports with corrective and preventive actions
- **ComplaintAI** -- Classifies complaints by category and priority, performs root cause analysis (Fishbone/Ishikawa + 5-Why), drafts culturally appropriate response letters, and flags regulatory notification requirements
- **FinanceAI** -- Validates export compliance per destination country, generates document checklists, runs financial risk analysis, and classifies HS codes

### Core Capabilities
- **40+ API endpoints** covering quality audits, complaints, invoices, analytics, and AI operations
- **Real-time dashboard** with aggregated stats, charts (complaints by country, audit status), and quick actions
- **Country-specific intelligence** for 35+ export markets (EU, GCC, ASEAN, Americas)
- **Graceful AI fallback** -- full CRUD functionality works without an API key; AI features enhance but are not required
- **Batch traceability** -- trace products across raw materials, quality checks, and shipments
- **Regulatory notification detection** -- automatically identifies when complaints require FSSAI, BfR, FDA, or other authority notifications

---

## Screenshots

Run the app locally and visit `http://localhost:5173` to explore:

| Page | Description |
|------|-------------|
| Dashboard | Operations overview with stats, charts, recent activity, and quick actions |
| Quality Audits | Audit management with AI-generated checklists and CAPA analysis |
| Complaints | Complaint lifecycle with AI classification, RCA, and response letter drafting |
| Finance & Export | Invoice management with compliance validation and document checklists |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 25 |
| Server | Express.js 4 + TypeScript |
| Database | SQLite (node:sqlite) |
| AI | Anthropic SDK (@anthropic-ai/sdk) + Claude Opus 4.6 |
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 |
| State Management | @tanstack/react-query |
| Charts | Recharts |
| Icons | Lucide React |

---

## Quick Start

### One-command startup

```bash
./start.sh [your-anthropic-api-key]
```

This installs dependencies (if needed), starts the server on port 3001, and the client on port 5173. If `tmux` is available, both processes run in a split-pane session.

### Manual startup

```bash
# Install dependencies
cd server && npm install && cd ../client && npm install && cd ..

# Set your API key (optional -- app works without it, AI features disabled)
export ANTHROPIC_API_KEY=sk-ant-...

# Start server
cd server && npx tsx watch src/index.ts &

# Start client
cd client && npx vite
```

Open `http://localhost:5173` in your browser.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | No | Enables AI features (classification, analysis, chat). App runs without it in fallback mode. |
| `PORT` | No | Server port (default: 3001) |

---

## Project Structure

```
Export_App/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── components/      # Layout, AIChat, ErrorBoundary, UI primitives
│       ├── pages/           # Dashboard, QualityAudit, Complaints, Finance
│       └── lib/             # API client (Axios)
├── server/                  # Express backend (TypeScript)
│   └── src/
│       ├── agents/          # AI agent modules (quality, complaint, finance)
│       ├── routes/          # REST API routes
│       ├── db/              # SQLite schema, migrations, seed data
│       └── middleware/      # Express middleware
├── tests/                   # E2E test suites (Playwright)
├── docs/                    # Architecture, PRD, audit reports
├── start.sh                 # One-command launcher
└── package.json             # Root scripts (dev, build, install)
```

---

## API Overview

```
GET    /api/health                    # Health check + AI status
GET    /api/dashboard/stats           # Aggregated dashboard data

# Quality Audits
GET    /api/quality                   # List audits
POST   /api/quality                   # Create audit (+ AI checklist)
POST   /api/quality/:id/analyze       # AI findings analysis
POST   /api/quality/chat              # QualityAI chat
POST   /api/quality/country-requirements  # Country import requirements
POST   /api/quality/shelf-life        # Shelf-life prediction

# Complaints
GET    /api/complaints                # List complaints
POST   /api/complaints                # Create complaint (+ AI classification)
POST   /api/complaints/:id/rca        # Root cause analysis
POST   /api/complaints/:id/response-letter  # Generate response letter
POST   /api/complaints/chat           # ComplaintAI chat

# Finance & Export
GET    /api/finance                   # List invoices
POST   /api/finance                   # Create invoice
POST   /api/finance/:id/validate      # Compliance validation
POST   /api/finance/:id/hs-classify   # HS code classification
POST   /api/finance/chat              # FinanceAI chat
POST   /api/finance/document-checklist  # Export document checklist
```

---

## License

Proprietary. All rights reserved.
