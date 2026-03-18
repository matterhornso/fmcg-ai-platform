# FMCG Agentic AI Platform — Developer Context

## What this is
A full-stack Agentic AI platform for a large FMCG manufacturer in India exporting to 35+ countries.
Three Claude Opus 4.6 AI agents handle Quality Audits, Customer Complaints, and Finance/Export operations.

## Stack
- **Server**: Node.js v25 + Express + TypeScript (CommonJS), port 3001
- **Client**: React 18 + Vite + Tailwind CSS + TypeScript (ESM), port 5174
- **Database**: SQLite via Node.js built-in `node:sqlite` (`DatabaseSync`) — NOT better-sqlite3
- **AI**: `@anthropic-ai/sdk` v0.79.0, model `claude-opus-4-6`
- **State**: `@tanstack/react-query` on the client

## Project layout
```
Export_App/
├── .env                          # ANTHROPIC_API_KEY + PORT=3001
├── .claude/launch.json           # Dev server configs (preview_start)
├── start.sh                      # One-command tmux launcher
├── server/
│   └── src/
│       ├── index.ts              # Express app, CORS for any localhost port
│       ├── db/database.ts        # SQLite init + seed (node:sqlite DatabaseSync)
│       ├── agents/
│       │   ├── qualityAgent.ts   # QualityAI — checklist, analysis, chat
│       │   ├── complaintAgent.ts # ComplaintAI — classify, RCA, response letter, chat
│       │   └── financeAgent.ts   # FinanceAI — validate, checklist, risk, chat
│       └── routes/
│           ├── quality.ts        # /api/quality
│           ├── complaints.ts     # /api/complaints
│           ├── finance.ts        # /api/finance
│           └── dashboard.ts      # /api/dashboard/stats
└── client/
    └── src/
        ├── pages/
        │   ├── Dashboard.tsx     # Stats, charts, recent activity
        │   ├── QualityAudit.tsx  # Audit management + AI checklist
        │   ├── Complaints.tsx    # Complaint log + RCA + response letters
        │   └── Finance.tsx       # Invoice management + compliance
        └── components/
            ├── Layout.tsx        # Dark sidebar nav
            ├── AIChat.tsx        # Reusable AI chat panel (all 3 agents)
            └── ui/               # Modal, Badge

## Key decisions & constraints
- Use `node:sqlite` (built-in), NOT `better-sqlite3` — Node 25 breaks native bindings
- Positional `?` params for SQLite, NOT named `@param` syntax
- `db.exec('PRAGMA ...')` NOT `db.pragma()`
- `thinking: { type: 'adaptive' }` on Claude API calls for reasoning
- Static routes MUST come before `/:id` routes in Express (avoids shadowing)
- CORS allows any `localhost:*` port (Vite may pick 5173–5176 depending on conflicts)
- `extractJSON()` helper in each agent strips markdown code fences before JSON.parse

## API endpoints
```
GET  /api/health                          → { status, aiEnabled, message }
GET  /api/dashboard/stats                 → aggregated stats + byCountry
GET  /api/quality                         → list audits
POST /api/quality                         → create audit (AI checklist, falls back to defaults)
POST /api/quality/chat                    → QualityAI chat
POST /api/quality/:id/analyze             → AI CAPA analysis
PATCH /api/quality/:id/status             → update status (enum validated)
DELETE /api/quality/:id

GET  /api/complaints                      → list (filterable by status/priority/category)
GET  /api/complaints/analytics/summary    → byStatus/Priority/Category/Country
POST /api/complaints                      → create + AI classify (falls back to keyword logic)
POST /api/complaints/chat                 → ComplaintAI chat
POST /api/complaints/:id/rca              → Fishbone + 5-Why analysis
POST /api/complaints/:id/response-letter → AI draft letter
PATCH /api/complaints/:id/status

GET  /api/finance                         → list invoices
GET  /api/finance/analytics/summary       → totals by status/currency/country
POST /api/finance                         → create invoice (auto-generates number)
POST /api/finance/checklist               → AI export doc checklist by country
POST /api/finance/chat                    → FinanceAI chat
POST /api/finance/:id/validate            → AI compliance check
POST /api/finance/:id/risk-analysis       → AI payment risk
PATCH /api/finance/:id/status
```

## Starting dev servers
```bash
# Option 1 — via start.sh (tmux, opens browser)
cd /Users/abhinavramesh/Export_App
./start.sh sk-ant-YOUR_KEY_HERE

# Option 2 — manual split terminals
cd server && npm run dev          # port 3001
cd client && npm run dev          # port 5174 (or next available)
```

## Enabling AI features
Add real key to `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```
Without a key the app still works — AI endpoints fall back to keyword heuristics / defaults.

## Known remaining issues (non-critical)
- No authentication on API routes (fine for internal tool)
- No rate limiting on AI endpoints
- `alert()` used for error notifications in Finance/Complaints pages (should use Modal)
- Unused `useLocation` import in Layout.tsx
- Race condition on complaint ref number under concurrent load
- Chat history sent in full on every turn (no truncation)

## gstack

Use the `/browse` skill from gstack for all web browsing. **Never use `mcp__claude-in-chrome__*` tools.**

Available gstack skills:
- `/plan-ceo-review` — CEO-level plan review
- `/plan-eng-review` — Engineering plan review
- `/plan-design-review` — Design plan review
- `/design-consultation` — Design consultation
- `/review` — Code review
- `/ship` — Ship/deploy workflow
- `/browse` — Web browsing (use this instead of mcp chrome tools)
- `/qa` — Quality assurance
- `/qa-only` — QA-only pass
- `/qa-design-review` — QA design review
- `/setup-browser-cookies` — Browser cookie setup
- `/retro` — Retrospective
- `/document-release` — Document a release

## Database seeded with
- 3 audits (Mumbai/Pune/Head Office, supplier/internal/regulatory)
- 4 complaints (Germany/Qatar/Singapore/UAE customers)
- 3 invoices (Tesco UK, Carrefour UAE, Sainsbury's UK)
