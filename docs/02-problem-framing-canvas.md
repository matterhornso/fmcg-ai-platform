# Problem Framing Canvas: FMCG Export Operations

**Framework:** MITRE Problem Framing Canvas v3
**Date:** 2026-03-17

---

## Phase 1: Look Inward

### What is the problem? (Symptoms)

**Type: Observed behavior + Business metric problem**

1. Export shipments delayed 15-30 days due to documentation errors (missing certificates, wrong Incoterms, LC discrepancies)
2. Customer complaint resolution averages 5-7 days vs. retailer expectation of 24-48 hours
3. Quality audit preparation takes 2-3 weeks of manual checklist creation per audit
4. Regulatory notifications (EU food safety alerts, FDA FSMA reports) missed or filed late in 12-15% of critical incidents
5. Export compliance teams spend 60%+ time on repetitive documentation tasks
6. Companies scaling from 10 to 50+ export countries see operational costs grow 3-4x non-linearly
7. Root cause analysis for complaints takes 1-2 weeks (manual fishbone/5-why processes)

### Why haven't we solved it?

- **It's hard** — Requires deep domain expertise spanning food safety (HACCP, FSSC 22000, BRC), international trade (Incoterms, LC/TT/DA), and 35+ country-specific regulatory regimes
- **It's fragmented** — Quality, complaints, and finance are owned by different teams with different tools and incentives
- **Lack of resources** — Mid-size exporters (INR 500-5000cr) can't afford custom ERP implementations ($500K-2M)
- **It's a systemic issue** — Indian FMCG industry grew domestically first; export operations were bolted on organically, creating technical debt in processes
- **Incumbent tools don't fit** — SAP/Oracle are horizontal; no vertical SaaS exists for Indian FMCG export operations specifically

### How are we part of the problem? (Assumptions & Biases)

- **Assuming we know what users want** — We haven't validated with actual quality managers at Britannia/Haldiram's/Amul; our understanding comes from research, not interviews
- **Solution-first thinking** — The existing codebase already chose "3 AI agents" before deeply validating whether users trust AI for regulatory decisions
- **Survivorship bias** — Focused on large exporters (ITC, HUL, Britannia) who can afford sophisticated tools; ignored the 10,000+ SME exporters who face the same problems with fewer resources
- **Technology bias** — Assuming AI/Claude is the right tool before validating that manual process improvement, better templates, or simple workflow automation might solve 80% of the problem

**Which of these might be redesigned?**
The solution-first thinking is the most dangerous — we should validate that AI-driven analysis actually improves outcomes over well-structured templates + checklists. The tool should work WITHOUT AI (fallback mode) and be BETTER with AI, not useless without it.

---

## Phase 2: Look Outward

### Who experiences the problem?

**Who:**
| Persona | Role | Company Size | Pain Level |
|---------|------|-------------|------------|
| **Priya** | Quality Manager | Mid-size (INR 1000-5000cr) | Critical — manages 5-15 audits/year across 2-3 plants |
| **Rajesh** | Export Documentation Officer | Any size | High — handles 50-200 shipments/month to 10-35 countries |
| **Anita** | Customer Complaints Lead | Mid-to-large | High — handles 20-50 international complaints/month |
| **Vikram** | Finance/Export Manager | Any size | Medium-High — manages LC, payment terms, FX risk across customers |
| **Suresh** | Plant Manager | Multi-plant operations | Medium — needs audit results to maintain certifications |
| **Meera** | Regulatory Affairs | Large exporters | Critical — responsible for FSSAI, EU, FDA notifications |

**When/Where:**
- **Quality audits**: Before buyer visits (Tesco, Carrefour), before certification renewals (BRC, FSSC 22000), after incidents
- **Complaints**: When international retailers report issues — often with 24-48h response deadlines
- **Export documentation**: At shipment time — every single export requires 8-15 documents depending on destination
- **Finance**: At invoice creation, LC negotiation, and payment reconciliation — monthly/weekly cycles

**Consequences:**
- Shipment holds at ports (cost: $500-5000/day in demurrage)
- Retailer delistings (Tesco delisted 3 Indian suppliers in 2024 for compliance failures)
- Regulatory fines (EU: up to EUR 50,000 for late food safety notifications)
- Lost orders from slow complaint resolution
- Audit failures requiring re-audits ($15,000-30,000 per re-audit)

### Who else has this problem? Who doesn't?

**Who else has it:**
- **Chinese FMCG exporters** — Face same multi-country compliance challenge; solved partially with government-backed export platforms
- **Turkish food exporters** — EU-adjacent, similar regulatory complexity
- **Thai/Vietnamese food exporters** — Scaling into EU/US markets, hitting same documentation walls
- **Indian pharma exporters** — Similar regulatory complexity but better tooling (pharma has mature compliance software)

**How they deal with it:**
- Large companies (ITC, HUL): Custom SAP implementations + armies of compliance staff
- Mid-size: Excel + email + WhatsApp + external consultants
- Chinese exporters: Government-subsidized trade platforms + Alibaba ecosystem

**Who doesn't have it:**
- **EU-to-EU exporters** — Single regulatory framework, standardized documentation
- **Companies exporting to <5 countries** — Manual processes still manageable
- **Companies with dedicated ERP + compliance teams** — Solved with expensive headcount ($200K+/year)

### Who's been left out?

- **SME exporters (INR 50-500cr)** — 10,000+ companies; can't afford SAP or compliance teams; most underserved
- **First-generation exporters** — Companies transitioning from domestic-only to export; need the most guidance but have the least infrastructure
- **Non-English speaking quality teams** — Many plant-level quality staff are more comfortable in Hindi/regional languages
- **Contract manufacturers** — Export on behalf of brands but bear compliance burden; often forgotten in product decisions
- **Destination-country importers** — The retailers (Tesco, Carrefour) who need confidence that Indian suppliers are compliant

### Who benefits?

**When problem exists (status quo beneficiaries):**
- Compliance consulting firms charging $5K-20K per audit
- Large companies with established compliance teams (competitive moat)
- Paper-based certification bodies (revenue from re-audits and re-certifications)

**When problem is solved:**
- Mid-size FMCG exporters gain competitive parity with large players
- Indian FMCG exports grow (currently USD 6.2B; potential to reach USD 15B by 2030)
- International retailers get more reliable Indian suppliers
- End consumers benefit from better food safety

---

## Phase 3: Reframe

### Stated another way, the problem is:

**Mid-to-large Indian FMCG manufacturers exporting to 15-80+ countries struggle to maintain quality standards, resolve international customer complaints, and ensure export compliance because their operations span fragmented manual workflows (Excel, email, WhatsApp) that lack domain-specific intelligence about country-by-country regulatory requirements. This leads to shipment delays (15-30 days), regulatory penalties, retailer delistings, and an operational cost structure that scales non-linearly with each new export market. The problem disproportionately affects mid-size exporters (INR 500-5000cr) who can't afford enterprise ERPs or large compliance teams, and has been overlooked because the Indian FMCG industry historically prioritized domestic growth over export operations tooling.**

### How Might We...

**How might we** unify quality audit management, international complaint resolution, and export compliance workflows into a single AI-augmented platform **as we aim to** reduce export documentation errors by 80%, cut complaint resolution time from 5-7 days to 24 hours, and enable mid-size Indian FMCG exporters to scale from 15 to 50+ countries without proportionally increasing compliance headcount?

---

## Next Steps

1. Validate reframed problem with 3-5 quality managers at target companies
2. Use Solution Architect skill to design technical architecture
3. Use Product Manager Toolkit to create PRD with RICE-prioritized features
4. Build MVP focusing on the highest-pain persona (Priya — Quality Manager)
