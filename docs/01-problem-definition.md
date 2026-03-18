# Problem Definition: FMCG Export Operations Platform

**Framework:** Lenny's Problem Definition (91 Product Leaders)
**Date:** 2026-03-17

---

## The Struggling Moment

**Who is struggling?** Quality managers, export compliance officers, customer service leads, and finance teams at mid-to-large Indian FMCG manufacturers exporting to 35+ countries.

**What are they doing right before they encounter this problem?**
They receive a customer complaint from Germany about a metal fragment in biscuits, need to trace batch B2024-0312-A across 3 plants, simultaneously prepare an EU regulatory notification, draft a customer response in 24 hours, and ensure the export invoice for Tesco UK is compliant with post-Brexit documentation requirements — all while an internal GMP audit is due for their Pune plant.

**The specific struggling moment:**
> "I have 4 different Excel sheets, 3 email threads, a WhatsApp group, and a regulatory portal open. I'm copy-pasting batch numbers between systems, manually checking which documents Germany requires vs. what UAE requires, and I still don't know if this metal fragment complaint needs an FSSAI notification or just a BfR notification. By the time I've figured it out, the 48-hour regulatory window is half gone."

---

## Problem vs. Solution Separation

### The Problem (NOT a feature request):
Indian FMCG exporters managing quality, complaints, and export compliance across 35+ countries operate in **fragmented, manual workflows** that create:

1. **Regulatory risk** — Missing country-specific compliance deadlines (EU: 48h notification, FDA: 24h for serious events)
2. **Revenue risk** — Export documentation errors cause shipment holds, LC discrepancies, and payment delays averaging 15-30 days
3. **Reputation risk** — Slow complaint response (avg 5-7 days vs. expected 24-48h) damages relationships with retailers like Tesco, Carrefour, Metro
4. **Operational waste** — Quality teams spend 60%+ of time on documentation, not actual quality improvement

### What this is NOT:
- Not "we need an AI chatbot" (technology-first thinking)
- Not "we need a dashboard" (solution-first thinking)
- Not "digitize our Excel sheets" (digitizing analog — Bret Taylor's warning)

---

## Why Hasn't This Been Solved?

| Barrier | Details |
|---------|---------|
| **Fragmented domain** | Quality, complaints, and export finance are managed by different teams with different tools |
| **Country-specific complexity** | 35+ countries = 35+ regulatory regimes, labeling requirements, documentation sets |
| **It's hard** | Requires deep domain knowledge (FSSAI + EU + FDA + GCC + HACCP + Incoterms + LC terms) |
| **Low priority** | Companies grew domestically first; export ops was bolted on as they scaled internationally |
| **Incumbent tools miss the mark** | SAP/Oracle are horizontal ERPs; they don't understand FMCG export-specific workflows like "which documents does Qatar require for biscuit imports?" |

---

## Validating the Problem Matters

### Evidence from Top 20 Indian FMCG Exporters:

| Company | Export Scale | Pain Validated |
|---------|-------------|----------------|
| **Britannia** | 79+ countries, ~INR 1000cr exports | Quality consistency across 23 factories; labeling compliance per market |
| **Haldiram's** | 80+ countries, USD 10B valuation | Shelf-life management; food safety across 80 countries |
| **Amul (GCMMF)** | 50+ countries, INR 65,911cr revenue | Cold chain compliance; dairy standards vary by country |
| **Dabur** | 120+ countries, 27% revenue international | Ayurvedic product claims compliance varies by jurisdiction |
| **Bikaji Foods** | 25+ countries, 60% export growth | Scaling from 25 to global; quality consistency at speed |
| **ITC** | India's 2nd largest agri-exporter | Multi-category quality across 100+ destinations |
| **Parle** | 100+ countries, 7 overseas factories | Quality consistency across international manufacturing |

### The "If Solved Perfectly" Test:
If this problem were solved perfectly, a Quality Manager at Britannia could:
- Receive a complaint from Metro Germany → AI instantly classifies it as critical (metal fragment), identifies the regulatory notification requirement (BfR within 48h), drafts the notification, traces the batch across all plants, generates a root cause analysis template, and drafts a customer response — **in 15 minutes instead of 3 days**
- Create an export invoice for UAE → AI validates Halal certification requirements, checks Incoterms suitability, lists all 12 required documents for UAE food imports, and flags any compliance gaps — **before the shipment leaves the port**

---

## Problem Qualification (Christopher Miller)

### Customer Problem:
"I can't efficiently manage quality audits, customer complaints, and export compliance across 35+ countries because my workflows are fragmented across Excel, email, WhatsApp, and manual processes."

### Business Problem:
"We lose 2-5% of export revenue to documentation errors, delayed complaint resolution, and compliance gaps — and as we scale from 35 to 80+ countries, this will get exponentially worse."

**Are they the same?** Yes — the customer problem (operational inefficiency) directly causes the business problem (revenue/reputation loss). Solving one solves the other.

---

## Current Workarounds

| Workaround | Who Uses It | Why It Fails |
|-----------|-------------|-------------|
| Excel spreadsheets | Everyone | No real-time collaboration, no AI, no audit trail |
| WhatsApp groups | Quality teams | Unstructured, unsearchable, no compliance documentation |
| Generic ERPs (SAP) | Large companies | Too horizontal; doesn't know FMCG export regulations |
| Manual email chains | Customer service | Slow, no templates, no automatic classification |
| Consultant/auditor firms | Medium companies | Expensive ($5K-20K per audit), not real-time |
| Country-specific compliance checklists (paper) | Export teams | Outdated quickly, not connected to actual shipments |

---

## The One-Sentence Problem Statement

**Indian FMCG manufacturers exporting to 35+ countries lose revenue, risk regulatory penalties, and damage retailer relationships because their quality audit, complaint management, and export compliance workflows are fragmented across manual tools that lack domain-specific intelligence for country-by-country regulatory requirements.**
