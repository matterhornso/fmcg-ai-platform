# FMCG AI Platform -- Technical Audit Report

**Date:** 2026-03-18
**Auditor:** Claude Opus 4.6 (automated)
**Scope:** Server-side code, database, API design, test suite
**Methodology:** Six skill frameworks applied against codebase (Security, API Design, Database Schema, Performance, Backend Testing, Playwright Best Practices)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Security Audit](#2-security-audit)
3. [API Design Review](#3-api-design-review)
4. [Database Schema Review](#4-database-schema-review)
5. [Performance Audit](#5-performance-audit)
6. [Testing Strategy Review](#6-testing-strategy-review)
7. [Playwright Test Review](#7-playwright-test-review)
8. [Summary of Findings by Severity](#8-summary-of-findings-by-severity)
9. [Recommended Remediation Roadmap](#9-recommended-remediation-roadmap)

---

## 1. Executive Summary

The FMCG AI Platform is an Express.js + SQLite application with three AI agent modules (Quality, Complaints, Finance) powered by the Anthropic Claude API. The codebase is functional and well-structured for an internal/prototype tool, but has significant gaps that must be addressed before any production or internet-facing deployment.

**Key statistics:**
- 4 route files, 3 AI agent files, 1 database module
- 3 test files (140 total tests) -- all Playwright E2E, zero unit/integration tests
- No authentication or authorization
- No rate limiting
- No security headers (Helmet not installed)
- All SQL queries use parameterized statements (good)
- No API versioning
- No pagination on list endpoints

| Severity | Count |
|----------|-------|
| Critical | 5 |
| High | 10 |
| Medium | 12 |
| Low | 8 |

---

## 2. Security Audit

*Skill applied: `.agents/skills/security-best-practices/SKILL.md`*
*Framework: OWASP Top 10 checklist, Helmet/HTTPS/Rate-limiting requirements*

### OWASP Top 10 Compliance Matrix

| OWASP Category | Status | Severity |
|---|---|---|
| A01: Broken Access Control | NOT ADDRESSED | Critical |
| A02: Cryptographic Failures | PARTIAL | Medium |
| A03: Injection | PASS | -- |
| A04: Insecure Design | PARTIAL | High |
| A05: Security Misconfiguration | FAIL | High |
| A06: Vulnerable Components | NOT CHECKED | Medium |
| A07: Authentication Failures | NOT ADDRESSED | Critical |
| A08: Data Integrity Failures | NOT ADDRESSED | High |
| A09: Logging Failures | PARTIAL | Medium |
| A10: SSRF | LOW RISK | Low |

### Findings

#### SEC-01: No Authentication or Authorization (Critical)

**Location:** `server/src/index.ts` (all routes), all route files
**Description:** Every API endpoint is completely unauthenticated. Any client that can reach the server can create, read, update, and delete all audits, complaints, and invoices. There is no concept of users, roles, or sessions.
**OWASP:** A01 (Broken Access Control), A07 (Authentication Failures)
**Recommendation:** Implement JWT-based authentication with role-based access control. At minimum, add API key authentication for non-browser clients.

#### SEC-02: No Rate Limiting (Critical)

**Location:** `server/src/index.ts`
**Description:** No rate limiting middleware is configured. The `express-rate-limit` package is not installed. AI agent endpoints (`/chat`, `/analyze`, `/validate`, etc.) call the Anthropic API with no throttling, exposing the platform to:
- DDoS attacks
- API cost amplification (each AI call costs money)
- Resource exhaustion
**Recommendation:** Install `express-rate-limit`. Apply a general limiter (100 req/15min) and a stricter limiter on AI endpoints (10 req/min).

#### SEC-03: No Security Headers / Helmet Not Installed (High)

**Location:** `server/package.json`, `server/src/index.ts`
**Description:** The `helmet` package is not a dependency. No security headers are set (CSP, X-Frame-Options, X-Content-Type-Options, HSTS, etc.).
**Recommendation:** Install and configure `helmet` as the first middleware.

#### SEC-04: No CSRF Protection (High)

**Location:** `server/src/index.ts`
**Description:** No CSRF tokens are generated or validated. Since `credentials: true` is set in CORS, cookie-based attacks could be possible if session cookies are added in the future.
**Recommendation:** Implement CSRF protection using `csurf` or double-submit cookie pattern.

#### SEC-05: CORS Configuration -- Overly Permissive for Development (Medium)

**Location:** `server/src/index.ts`, lines 17-26
**Description:** CORS allows any `localhost` origin via regex `/^http:\/\/localhost(:\d+)?$/`. While acceptable for development, this must be locked down for production. Requests with no `origin` header (e.g., server-to-server, curl) are also allowed (`!origin` check on line 19).
**Recommendation:** Use an environment-variable-controlled allowlist for production origins. Remove the `!origin` bypass or restrict it to specific use cases.

#### SEC-06: SQL Injection -- PASS (No Issue)

**Location:** All route files and `database.ts`
**Description:** All SQL queries use parameterized statements via `db.prepare(...).run(...)` or `db.prepare(...).get(...)`. No string interpolation in SQL. This is correct.
**Status:** Pass

#### SEC-07: Potential XSS via AI-Generated Content (Medium)

**Location:** All agent files (`qualityAgent.ts`, `complaintAgent.ts`, `financeAgent.ts`)
**Description:** AI-generated text content is stored in the database and returned to clients without sanitization. If the AI produces content containing HTML/script tags (or if user input is reflected through AI responses), it could lead to stored XSS. The risk is mitigated if the frontend uses React (which auto-escapes), but any `dangerouslySetInnerHTML` usage or non-React consumers would be vulnerable.
**Recommendation:** Sanitize AI output before storage using a library like `DOMPurify` (server-side: `isomorphic-dompurify`).

#### SEC-08: No Input Validation Library (High)

**Location:** All route files
**Description:** Input validation is manual and inconsistent. Routes check for the presence of required fields (`if (!title || !type)`) but do not validate:
- Data types (e.g., `score` must be a number)
- String lengths (no max length on `title`, `description`, etc.)
- Format constraints (e.g., `complaintDate` must be a valid date)
- Enum values for fields like `type` on audit creation (any string accepted)
**Recommendation:** Adopt `zod` or `joi` for schema-based input validation on all POST/PATCH endpoints.

#### SEC-09: No .gitignore File (Medium)

**Location:** Project root
**Description:** No `.gitignore` file exists. If this project is committed to git, the `.env` file (which would contain the `ANTHROPIC_API_KEY`), `node_modules/`, the SQLite database file, and other sensitive artifacts could be committed.
**Recommendation:** Create a `.gitignore` excluding `.env`, `node_modules/`, `data/*.db`, `dist/`, `/tmp/`.

#### SEC-10: Health Endpoint Leaks API Key Validation Logic (Low)

**Location:** `server/src/index.ts`, lines 50-51
**Description:** The `/api/health` endpoint reveals whether an API key is configured and validates its prefix format (`sk-ant-`). This is minor information leakage.
**Recommendation:** Return only `aiEnabled: true/false` without exposing validation logic.

#### SEC-11: No Dependency Vulnerability Scanning (Medium)

**Location:** `server/package.json`
**Description:** No `npm audit` or Snyk integration observed. Express 4.18.x and other dependencies may have known vulnerabilities.
**Recommendation:** Run `npm audit` regularly. Add `npm audit` to CI pipeline.

---

## 3. API Design Review

*Skill applied: `.agents/skills/api-design/SKILL.md`*
*Framework: RESTful conventions, HTTP status codes, pagination, versioning, error format*

### Findings

#### API-01: No API Versioning (Medium)

**Location:** `server/src/index.ts`, lines 43-46
**Description:** Routes are mounted at `/api/quality`, `/api/complaints`, `/api/finance` with no version prefix. Breaking changes cannot be made safely.
**Recommendation:** Prefix all routes with `/api/v1/`.

#### API-02: No Pagination on List Endpoints (High)

**Location:** `server/src/routes/quality.ts` (GET `/`), `server/src/routes/complaints.ts` (GET `/`), `server/src/routes/finance.ts` (GET `/`)
**Description:** All list endpoints return every record in the database with no pagination, limit, or offset. As data grows, these responses will become increasingly large and slow.
**Recommendation:** Add `?page=1&limit=20` query parameters with pagination metadata in the response.

#### API-03: Inconsistent Error Response Format (Medium)

**Location:** All route files
**Description:** Error responses use `{ error: 'message string' }` format, which is adequate but:
- No error codes (only human-readable strings)
- No `details` array for validation errors
- No consistent structure across different error types
**Recommendation:** Adopt a standard error envelope: `{ error: { code: "VALIDATION_ERROR", message: "...", details: [...] } }`.

#### API-04: Inconsistent Response Format for Create Endpoints (Medium)

**Location:**
- `quality.ts` POST `/` returns `{ ...audit, aiAvailable }` (flat)
- `complaints.ts` POST `/` returns `{ complaint, analysis, aiAvailable }` (nested)
- `finance.ts` POST `/` returns the invoice directly (flat)
**Description:** Each create endpoint returns data in a different shape. This forces clients to handle each resource differently.
**Recommendation:** Standardize on `{ data: <resource>, meta: { aiAvailable } }` or similar envelope.

#### API-05: Missing HTTP 204 for Deletes (Low)

**Location:** All `DELETE /:id` handlers
**Description:** Delete endpoints return `200` with `{ success: true }`. RESTful convention prefers `204 No Content` for successful deletes.
**Recommendation:** Return `204` with no body on successful deletes.

#### API-06: DELETE Succeeds Silently for Non-Existent Resources (Low)

**Location:** `quality.ts`, `complaints.ts`, `finance.ts` -- DELETE handlers
**Description:** Deleting a non-existent ID returns `{ success: true }` with status 200. While idempotent deletes are acceptable, it makes it impossible for clients to know if a resource actually existed.
**Recommendation:** Check if the resource exists before deleting; return 404 if not found.

#### API-07: POST Used Where GET Would Be Appropriate (Low)

**Location:** `quality.ts` -- `/country-requirements`, `/shelf-life`
**Description:** These endpoints use POST but are essentially read-only queries. They don't create resources. GET with query parameters would be more RESTful.
**Recommendation:** Consider using GET with query parameters for read-only operations, or document these as RPC-style endpoints.

#### API-08: Chat Endpoints Have No Input Validation (High)

**Location:** `quality.ts` POST `/chat`, `complaints.ts` POST `/chat`, `finance.ts` POST `/chat`
**Description:** The `messages` and `context` fields from the request body are passed directly to the Anthropic API without any validation of:
- Whether `messages` is an array
- Whether each message has `role` and `content` fields
- Maximum message count or content length
- Whether `role` values are valid (`user` or `assistant`)
This could cause unexpected Anthropic API errors or be exploited for prompt injection.
**Recommendation:** Validate `messages` array structure and enforce max length limits.

#### API-09: No Request Body Size Limit Per Endpoint (Low)

**Location:** `server/src/index.ts`, line 27
**Description:** A global 10MB JSON body limit is set, which is generous. Individual endpoints that should accept smaller payloads (e.g., status updates) do not have tighter limits.
**Recommendation:** Consider per-route body size limits for sensitive endpoints.

---

## 4. Database Schema Review

*Skill applied: `.agents/skills/database-schema-design/SKILL.md`*
*Framework: Normalization, indexing, constraints, migrations, naming conventions*

### Findings

#### DB-01: No Migration System (High)

**Location:** `server/src/db/database.ts`
**Description:** Schema is defined using `CREATE TABLE IF NOT EXISTS` in the `initDatabase()` function. There is no versioned migration system. Schema changes require:
- Manually modifying the `initDatabase` function
- Deleting the database file to apply changes
- No rollback capability
**Recommendation:** Adopt a migration tool (e.g., `better-sqlite3-migrations`, `knex`, or manual versioned SQL files).

#### DB-02: Storing Structured Data as JSON Text Columns (Medium)

**Location:** `database.ts` -- `checklist`, `findings`, `corrective_actions`, `ai_analysis`, `items`, `raw_materials`, `quality_checks`, `process_log`, `shipments`, `compliance_check`, `documents_required`
**Description:** At least 11 columns store JSON as TEXT. This is common in SQLite but has drawbacks:
- Cannot be indexed or queried efficiently
- No schema validation at the database level
- JSON.parse is required on every read
- Data integrity cannot be enforced
**Assessment:** For the current scale (SQLite, small dataset), this is acceptable. If migrating to PostgreSQL, use `JSONB` columns. For truly structured data (e.g., `items` in invoices), consider normalized junction tables.

#### DB-03: No Foreign Key Relationships Between Tables (Medium)

**Location:** `database.ts`
**Description:** The `complaints` table references `batch_number` which maps to `batch_trace.batch_number`, but there is no foreign key constraint. This allows:
- Complaints to reference non-existent batches
- Batch trace records to be deleted while complaints still reference them
**Recommendation:** Add `FOREIGN KEY (batch_number) REFERENCES batch_trace(batch_number)` if referential integrity is desired.

#### DB-04: No CHECK Constraints on Numeric/Enum Fields (Medium)

**Location:** `database.ts`
**Description:** No CHECK constraints exist for:
- `score` in `audits` (should be 0-100)
- `total_amount` in `invoices` (should be >= 0)
- `status` fields (any string accepted at DB level)
- `priority` in `complaints` (any string accepted)
**Recommendation:** Add CHECK constraints: `CHECK (score >= 0 AND score <= 100)`, `CHECK (total_amount >= 0)`, `CHECK (status IN ('pending','in_progress','completed','cancelled'))`.

#### DB-05: No `updated_at` Trigger (Low)

**Location:** `database.ts`
**Description:** Tables have `updated_at` columns with defaults, but there is no trigger to auto-update them. The routes manually set `updated_at = CURRENT_TIMESTAMP` in UPDATE statements, but this is error-prone (could be forgotten in new queries).
**Recommendation:** Create a trigger or use application-level middleware to auto-update `updated_at`.

#### DB-06: Index Coverage is Good (Pass)

**Location:** `database.ts`, lines 92-102
**Description:** Indexes are created for commonly queried columns:
- `batch_trace(batch_number)`
- `complaints(status)`, `complaints(priority)`, `complaints(customer_country)`
- `invoices(status)`, `invoices(destination_country)`
- `audits(status)`
**Status:** Pass. Good coverage for current query patterns.

#### DB-07: Invoice Number Generation Uses COUNT(*) -- Race Condition (High)

**Location:** `server/src/routes/finance.ts`, line 51
**Description:** Invoice numbers are generated using `COUNT(*) + 1`. Under concurrent requests, two invoices could receive the same number. The `invoice_number` column has a UNIQUE constraint, so one insert would fail with a cryptic SQLite error.
**Code:** `const countNum = (db.prepare('SELECT COUNT(*) as c FROM invoices').get() as any).c + 1;`
**Recommendation:** Use `MAX(invoice_number)` (as done for complaint refs) or a sequence table. Better yet, use a UUID or timestamp-based invoice number.

#### DB-08: Complaint Ref Generation -- Potential Race Condition (Medium)

**Location:** `server/src/routes/complaints.ts`, lines 63-69
**Description:** Complaint references use `MAX(complaint_ref)` ordering, which is better than COUNT(*) but still susceptible to race conditions under concurrent inserts (two requests could read the same MAX value before either inserts). The comment acknowledges this concern.
**Recommendation:** Wrap the read-and-insert in a transaction, or use `INSERT ... RETURNING` with auto-increment.

#### DB-09: Naming Convention is Consistent (Pass)

**Description:** All tables and columns use `snake_case`. Table names are plural. Column names are singular. Timestamps use `created_at` / `updated_at`. This is consistent and follows best practices.
**Status:** Pass.

#### DB-10: Seed Data Hardcoded in Application Code (Low)

**Location:** `database.ts`, `seedSampleData()` function (lines 110-209)
**Description:** Seed data is in the application code rather than in a separate seed file. This mixes concerns and makes it harder to maintain or update sample data independently.
**Recommendation:** Extract seed data to a separate `seeds/` directory with SQL or JSON files.

---

## 5. Performance Audit

*Skill applied: `.agents/skills/performance-optimization/SKILL.md`*
*Framework: N+1 queries, caching, bundle optimization, database query optimization*

### Findings

#### PERF-01: No Caching of AI Responses (High)

**Location:** All agent files (`qualityAgent.ts`, `complaintAgent.ts`, `financeAgent.ts`)
**Description:** Every AI endpoint call results in a fresh Anthropic API request. Identical queries (e.g., country requirements for "Germany" + "Biscuits") are never cached. This results in:
- Unnecessary API costs
- Slow response times (AI calls take 2-15 seconds)
- Redundant processing
**Recommendation:** Implement response caching using in-memory cache (e.g., `node-cache`) or Redis with TTL-based expiration. Country requirements and shelf-life predictions are excellent caching candidates.

#### PERF-02: No Pagination -- Full Table Scans on Every List Request (High)

**Location:** `quality.ts` GET `/`, `finance.ts` GET `/`, `complaints.ts` GET `/`
**Description:** List endpoints execute `SELECT * FROM <table> ORDER BY created_at DESC` with no LIMIT. As data grows, this will:
- Increase memory usage linearly
- Slow response times
- Transfer unnecessary data to clients
**Recommendation:** Add `LIMIT ? OFFSET ?` with query parameter support.

#### PERF-03: Dashboard Executes 6 Separate Queries (Medium)

**Location:** `server/src/routes/dashboard.ts`, lines 8-49
**Description:** The dashboard stats endpoint runs 6 separate SQL queries sequentially:
1. Audit aggregation
2. Complaint aggregation
3. Finance aggregation
4. Complaints by country
5. Recent complaints
6. Recent audits

While SQLite is fast for small datasets, these could be consolidated or parallelized.
**Recommendation:** For SQLite (synchronous), this is acceptable. If migrating to an async database, run queries in parallel with `Promise.all()`.

#### PERF-04: JSON.parse on Every Batch Trace Read (Low)

**Location:** `server/src/routes/complaints.ts`, lines 237-243
**Description:** The batch trace endpoint parses 4 JSON columns on every request. This is inherent to the JSON-in-TEXT-column design and cannot be avoided without schema changes.
**Assessment:** Acceptable for current scale. Monitor if batch trace reads become frequent.

#### PERF-05: No Response Compression (Medium)

**Location:** `server/src/index.ts`
**Description:** The `compression` middleware is not installed or configured. Large JSON responses (especially list endpoints returning all records) are sent uncompressed.
**Recommendation:** Install and use the `compression` middleware.

#### PERF-06: AI Streaming Not Used for Non-Chat Endpoints (Low)

**Location:** `qualityAgent.ts`, `complaintAgent.ts`, `financeAgent.ts`
**Description:** Non-chat AI endpoints use `client.messages.create()` (blocking) rather than streaming. The chat endpoints use `client.messages.stream()`. For long-running AI operations, streaming could improve perceived latency.
**Assessment:** Acceptable. Streaming structured JSON responses is complex and not always beneficial.

#### PERF-07: Static Route Ordering is Correct (Pass)

**Location:** All route files
**Description:** Static routes (e.g., `/analytics/summary`, `/chat`, `/country-requirements`) are correctly defined before parameterized routes (`/:id`). Comments in the code explicitly call this out. This prevents route shadowing.
**Status:** Pass.

#### PERF-08: No N+1 Query Patterns Detected (Pass)

**Description:** No loops execute individual queries per item. All data retrieval is done via single queries. The batch trace lookup in `complaints.ts` does 2 sequential queries (complaint + batch_trace), which is a JOIN candidate but not an N+1.
**Status:** Pass.

---

## 6. Testing Strategy Review

*Skill applied: `.agents/skills/backend-testing/SKILL.md`*
*Framework: Test isolation, AAA pattern, coverage gaps, unit vs. integration vs. E2E pyramid*

### Findings

#### TEST-01: Zero Unit Tests (Critical)

**Location:** Project-wide
**Description:** There are no unit tests for any server-side code. The test pyramid is inverted: 140 E2E tests, 0 integration tests, 0 unit tests. Business logic that should be unit tested:
- `extractJSON()` in all agent files (JSON parsing from AI responses)
- Input validation logic
- Invoice number generation
- Complaint reference generation
- AI fallback logic (when API key is missing)
- Status validation
**Recommendation:** Add Jest/Vitest unit tests for utility functions and business logic. Target 80% line coverage on server code.

#### TEST-02: Zero Integration Tests (Critical)

**Location:** Project-wide
**Description:** No integration tests exist that test API endpoints with a test database (e.g., using Supertest). All API testing is done through Playwright, which requires both the server and client to be running.
**Recommendation:** Add Supertest-based integration tests for all API endpoints. These run faster and are more reliable than E2E tests for API contract validation.

#### TEST-03: No Test Configuration (Jest/Vitest) (High)

**Location:** `server/package.json`
**Description:** No test runner is configured in the server package. There is no `jest.config.js`, `vitest.config.ts`, or test script in `package.json`. The `"scripts"` section has no `"test"` entry.
**Recommendation:** Add `vitest` (or `jest` with `ts-jest`) as a dev dependency and configure it.

#### TEST-04: Tests Use Shared Mutable State (Medium)

**Location:** `tests/test_user_flows.py` (global `passed`/`failed`/`errors`), `tests/test_qa_comprehensive.py` (`state` dict)
**Description:** Tests share mutable state across test functions via global variables and a `state` dict. This creates order dependencies -- tests that create resources store IDs in `state` that later tests depend on. If one test fails, subsequent tests may also fail.
**Recommendation:** Use proper test fixtures for setup/teardown. Each test should create its own resources.

#### TEST-05: No Database Reset Between Tests (High)

**Location:** All test files
**Description:** Tests run against the live development database. They create records but never clean them up. This means:
- Test data accumulates in the database
- Tests are not idempotent (running twice may produce different results)
- Seeded data assumptions may break as tests add records
**Recommendation:** Reset the database before each test suite run, or use a separate test database.

#### TEST-06: No AI Response Mocking (Medium)

**Location:** All test files
**Description:** Tests accept both `200` and `500` status codes for AI-powered endpoints (e.g., `assert resp.status in (200, 500)`). This means:
- Test behavior depends on whether `ANTHROPIC_API_KEY` is configured
- Tests cannot verify AI response handling logic
- No test coverage for AI fallback paths vs. success paths
**Recommendation:** Mock the Anthropic API at the HTTP level (using `nock` or similar) to test both success and fallback paths deterministically.

#### TEST-07: No Coverage Reporting (Medium)

**Location:** Project-wide
**Description:** No code coverage tool is configured. There is no way to measure which server-side code paths are exercised by tests.
**Recommendation:** Configure Istanbul/c8 for code coverage reporting.

#### TEST-08: Missing Edge Case Tests (Medium)

**Description:** While `test_qa_comprehensive.py` tests some edge cases, the following are not covered:
- Concurrent request handling (race conditions on invoice/complaint number generation)
- Very large request payloads (beyond the 10MB limit)
- Unicode/emoji in text fields
- SQL injection attempts via POST body fields (not just query params)
- CORS rejection for non-allowed origins
- Malformed JSON request bodies

---

## 7. Playwright Test Review

*Skill applied: `.agents/skills/playwright-best-practices/SKILL.md`*
*Framework: Locator strategy, assertions, flaky test patterns, POM, test isolation*

### Findings

#### PW-01: No Page Object Model (Medium)

**Location:** All test files
**Description:** Tests directly use locators inline (e.g., `page.locator("button", has_text="New Audit")`). There is no Page Object Model abstraction. This means:
- Selector changes require updating every test file
- Locator patterns are duplicated across files
- Tests are harder to maintain
**Recommendation:** Extract page-level abstractions into POM classes (e.g., `QualityPage`, `ComplaintsPage`, `FinancePage`).

#### PW-02: Brittle Locator Strategies (High)

**Location:** All test files
**Description:** Tests use a mix of locator strategies with varying robustness:
- **Fragile:** `page.locator(".card")` (CSS class-based, breaks on styling changes)
- **Fragile:** `page.locator("h1")`, `page.locator("h3")` (tag-based, breaks on semantic changes)
- **Better:** `page.locator("text=Metro Supermarkets")` (text-based, more resilient)
- **Missing:** No `data-testid` attributes used anywhere
**Recommendation:** Add `data-testid` attributes to key UI elements and use `page.getByTestId()`.

#### PW-03: Excessive Use of `wait_for_timeout` (Hard-Coded Waits) (High)

**Location:** All test files -- 30+ instances of `page.wait_for_timeout()`
**Description:** Tests rely heavily on hard-coded timeouts:
- `page.wait_for_timeout(1500)` -- wait for page load
- `page.wait_for_timeout(3000)` -- wait for AI response
- `page.wait_for_timeout(500)` -- wait for modal
- `page.wait_for_timeout(300)` -- wait for modal close

Hard-coded waits are the #1 cause of flaky tests. They either:
- Wait too long (slow tests)
- Don't wait long enough (flaky failures)
**Recommendation:** Replace with Playwright's auto-waiting assertions:
```python
# Instead of wait_for_timeout + assert
page.locator("text=New audit").wait_for(state="visible")
expect(page.locator("h2")).to_be_visible()
```

#### PW-04: Custom Test Runner Instead of Playwright Test Runner (Medium)

**Location:** All test files
**Description:** Tests use a custom `log_pass`/`log_fail` pattern with manual global counters instead of Playwright's built-in test runner (`@playwright/test` for JS or `pytest-playwright` for Python). This means:
- No automatic retries for flaky tests
- No parallel execution
- No built-in reporting (HTML, JSON, JUnit)
- No trace collection on failure
- No test isolation (single browser context shared across all tests)
**Recommendation:** Migrate to `pytest-playwright` with proper `conftest.py` fixtures.

#### PW-05: No Test Isolation -- Single Browser Context (High)

**Location:** `test_user_flows.py`, lines 657-660; `test_qa_comprehensive.py`, lines 36-37
**Description:** All tests in each file share a single browser context and page. This means:
- State from one test (cookies, local storage, DOM state) leaks into the next
- A navigation failure in one test affects all subsequent tests
- Tests cannot run in parallel
**Recommendation:** Use fresh pages per test or per test group.

#### PW-06: No Trace/Screenshot on Failure (Medium)

**Location:** All test files
**Description:** Screenshots are taken at the end of test groups (e.g., `flow_dashboard`, `flow_quality`), but not specifically on test failure. When a test fails, there is no trace or screenshot of the failure state.
**Recommendation:** Add `page.screenshot()` in the `except` block, or use Playwright's built-in trace recording.

#### PW-07: Tests Write to /tmp Without Cleanup (Low)

**Location:** All test files -- screenshots to `/tmp/flow_*.png`, `/tmp/fmcg_*.png`
**Description:** Test screenshots accumulate in `/tmp` without cleanup.
**Assessment:** Minor concern. Screenshots are useful for debugging.

#### PW-08: No Accessibility Testing (Low)

**Location:** All test files
**Description:** No accessibility assertions (axe-core integration, ARIA roles, keyboard navigation).
**Recommendation:** Add basic accessibility scans using `@axe-core/playwright`.

---

## 8. Summary of Findings by Severity

### Critical (5 findings)

| ID | Area | Finding |
|---|---|---|
| SEC-01 | Security | No authentication or authorization |
| SEC-02 | Security | No rate limiting |
| TEST-01 | Testing | Zero unit tests |
| TEST-02 | Testing | Zero integration tests |
| DB-07 | Database | Invoice number race condition via COUNT(*) |

### High (10 findings)

| ID | Area | Finding |
|---|---|---|
| SEC-03 | Security | No security headers (Helmet) |
| SEC-04 | Security | No CSRF protection |
| SEC-08 | Security | No input validation library |
| API-02 | API Design | No pagination on list endpoints |
| API-08 | API Design | Chat endpoints have no input validation |
| DB-01 | Database | No migration system |
| PERF-01 | Performance | No caching of AI responses |
| PERF-02 | Performance | Full table scans on list endpoints |
| TEST-03 | Testing | No test configuration (Jest/Vitest) |
| TEST-05 | Testing | No database reset between tests |
| PW-02 | Playwright | Brittle locator strategies |
| PW-03 | Playwright | Excessive hard-coded waits (30+ instances) |
| PW-05 | Playwright | No test isolation -- shared browser context |

### Medium (12 findings)

| ID | Area | Finding |
|---|---|---|
| SEC-05 | Security | CORS overly permissive for production |
| SEC-07 | Security | Potential XSS via AI-generated content |
| SEC-09 | Security | No .gitignore file |
| SEC-11 | Security | No dependency vulnerability scanning |
| API-01 | API Design | No API versioning |
| API-03 | API Design | Inconsistent error response format |
| API-04 | API Design | Inconsistent create response format |
| DB-02 | Database | Structured data stored as JSON text |
| DB-03 | Database | No foreign key between complaints and batch_trace |
| DB-04 | Database | No CHECK constraints |
| DB-08 | Database | Complaint ref race condition |
| PERF-03 | Performance | Dashboard runs 6 sequential queries |
| PERF-05 | Performance | No response compression |
| TEST-04 | Testing | Shared mutable state between tests |
| TEST-06 | Testing | No AI response mocking |
| TEST-07 | Testing | No coverage reporting |
| TEST-08 | Testing | Missing edge case tests |
| PW-01 | Playwright | No Page Object Model |
| PW-04 | Playwright | Custom test runner instead of Playwright Test |
| PW-06 | Playwright | No trace/screenshot on failure |

### Low (8 findings)

| ID | Area | Finding |
|---|---|---|
| SEC-10 | Security | Health endpoint leaks API key validation logic |
| API-05 | API Design | Missing HTTP 204 for deletes |
| API-06 | API Design | Delete succeeds silently for non-existent resources |
| API-07 | API Design | POST used where GET would be appropriate |
| API-09 | API Design | No per-endpoint body size limits |
| DB-05 | Database | No updated_at trigger |
| DB-10 | Database | Seed data hardcoded in application code |
| PERF-04 | Performance | JSON.parse on every batch trace read |
| PERF-06 | Performance | AI streaming not used for non-chat endpoints |
| PW-07 | Playwright | Tests write to /tmp without cleanup |
| PW-08 | Playwright | No accessibility testing |

### Pass (5 findings)

| ID | Area | Finding |
|---|---|---|
| SEC-06 | Security | SQL injection -- all queries parameterized |
| DB-06 | Database | Index coverage is good |
| DB-09 | Database | Naming convention is consistent |
| PERF-07 | Performance | Static route ordering is correct |
| PERF-08 | Performance | No N+1 query patterns detected |

---

## 9. Recommended Remediation Roadmap

### Phase 1: Security Hardening (Week 1-2)

Priority: **Critical + High security findings**

1. **Install and configure `helmet`** -- SEC-03 (1 hour)
2. **Install and configure `express-rate-limit`** -- SEC-02 (2 hours)
   - General: 100 req/15min
   - AI endpoints: 10 req/min
   - Chat endpoints: 20 req/min
3. **Add `zod` or `joi` input validation** -- SEC-08, API-08 (1 day)
4. **Create `.gitignore`** -- SEC-09 (15 minutes)
5. **Add authentication middleware** -- SEC-01 (3-5 days)
   - Start with API key auth for simplicity
   - Plan JWT + RBAC for full implementation
6. **Run `npm audit` and fix vulnerabilities** -- SEC-11 (2 hours)

### Phase 2: API & Database Improvements (Week 2-3)

Priority: **High API + Database findings**

1. **Add pagination to all list endpoints** -- API-02, PERF-02 (4 hours)
2. **Fix invoice number generation race condition** -- DB-07 (1 hour)
3. **Standardize error response format** -- API-03 (2 hours)
4. **Standardize create response format** -- API-04 (1 hour)
5. **Set up migration system** -- DB-01 (4 hours)
6. **Add CHECK constraints** -- DB-04 (1 hour)
7. **Add response compression** -- PERF-05 (30 minutes)

### Phase 3: Testing Infrastructure (Week 3-4)

Priority: **Critical + High testing findings**

1. **Set up Vitest/Jest for server** -- TEST-03 (2 hours)
2. **Write unit tests for agent utilities** -- TEST-01 (1 day)
   - `extractJSON()`, validation logic, number generation
3. **Write Supertest integration tests** -- TEST-02 (2 days)
   - All CRUD operations
   - Error cases (400, 404)
   - Input validation
4. **Add coverage reporting** -- TEST-07 (1 hour)
5. **Add test database reset** -- TEST-05 (2 hours)

### Phase 4: E2E Test Improvements (Week 4-5)

Priority: **High Playwright findings**

1. **Add `data-testid` attributes to UI** -- PW-02 (4 hours)
2. **Replace `wait_for_timeout` with auto-waiting** -- PW-03 (4 hours)
3. **Migrate to `pytest-playwright`** -- PW-04 (1 day)
4. **Add per-test browser context isolation** -- PW-05 (2 hours)

### Phase 5: AI Response Caching (Week 5-6)

Priority: **Performance optimization**

1. **Implement in-memory cache for AI responses** -- PERF-01 (4 hours)
   - Cache country requirements (24h TTL)
   - Cache shelf-life predictions (24h TTL)
   - Cache HS code classifications (7d TTL)
2. **Add API versioning prefix** -- API-01 (1 hour)

---

*End of Technical Audit Report*
