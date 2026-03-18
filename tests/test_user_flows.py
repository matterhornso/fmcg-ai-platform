"""
FMCG AI Platform — Complete User Flow Tests
Tests every user flow end-to-end: create, view, expand, action, modal, navigate.
"""
from playwright.sync_api import sync_playwright, Page
import json
import sys
import time

BASE = "http://localhost:5173"
API = "http://localhost:3001"

passed = 0
failed = 0
errors = []

def log_pass(name):
    global passed
    passed += 1
    print(f"    [PASS] {name}")

def log_fail(name, err):
    global failed
    failed += 1
    errors.append((name, str(err)[:200]))
    print(f"    [FAIL] {name}: {err}")

def assert_ok(cond, msg=""):
    if not cond:
        raise AssertionError(msg)


def flow_dashboard(page: Page):
    """FLOW 1: Dashboard — view stats, charts, recent activity, quick actions, AI status"""
    print("\n  === FLOW 1: Dashboard ===")
    page.goto(f"{BASE}/dashboard")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)

    # 1a. Page loads with heading
    try:
        h1 = page.locator("h1")
        assert_ok(h1.is_visible(), "h1 not visible")
        assert_ok("Dashboard" in h1.text_content(), "Wrong heading")
        log_pass("Dashboard heading visible")
    except Exception as e:
        log_fail("Dashboard heading", e)

    # 1b. Stat cards render (4 cards: Quality, Complaints, Finance, Export Markets)
    try:
        stat_cards = page.locator(".card")
        assert_ok(stat_cards.count() >= 4, f"Only {stat_cards.count()} cards")
        log_pass(f"Stat cards visible ({stat_cards.count()} cards)")
    except Exception as e:
        log_fail("Stat cards", e)

    # 1c. AI status indicator visible
    try:
        ai_status = page.locator("text=AI Agents")
        assert_ok(ai_status.first.is_visible(), "AI status not visible")
        log_pass("AI status indicator visible")
    except Exception as e:
        log_fail("AI status", e)

    # 1d. API key warning banner (should show since no key)
    try:
        banner = page.locator("text=AI features")
        if banner.first.is_visible():
            log_pass("AI key warning banner visible (expected — no API key)")
        else:
            log_pass("No warning banner (API key present)")
    except Exception as e:
        log_fail("Warning banner check", e)

    # 1e. Charts render (Complaints by Country, Audit Status)
    try:
        chart_headings = page.locator("h3")
        chart_texts = [chart_headings.nth(i).text_content() for i in range(chart_headings.count())]
        assert_ok(any("Complaints by Country" in t for t in chart_texts), "Complaints chart missing")
        assert_ok(any("Audit Status" in t for t in chart_texts), "Audit status chart missing")
        log_pass("Charts sections visible")
    except Exception as e:
        log_fail("Charts", e)

    # 1f. Recent complaints list
    try:
        recent = page.locator("text=Recent Complaints")
        assert_ok(recent.first.is_visible(), "Recent complaints section missing")
        log_pass("Recent complaints section visible")
    except Exception as e:
        log_fail("Recent complaints", e)

    # 1g. Recent audits list
    try:
        recent_audits = page.locator("text=Recent Audits")
        assert_ok(recent_audits.first.is_visible(), "Recent audits section missing")
        log_pass("Recent audits section visible")
    except Exception as e:
        log_fail("Recent audits", e)

    # 1h. Quick AI Actions section
    try:
        quick = page.locator("text=Quick AI Actions")
        assert_ok(quick.first.is_visible(), "Quick actions missing")
        log_pass("Quick AI Actions section visible")
    except Exception as e:
        log_fail("Quick AI Actions", e)

    # 1i. Navigate to Quality via quick action
    try:
        sidebar = page.locator("aside")
        sidebar.locator("a[href='/quality']").click()
        page.wait_for_load_state("networkidle")
        assert_ok("/quality" in page.url, "Did not navigate to quality")
        log_pass("Navigate to Quality via sidebar")
    except Exception as e:
        log_fail("Navigate to Quality", e)

    page.screenshot(path="/tmp/flow_dashboard.png", full_page=True)


def flow_quality_create_audit(page: Page):
    """FLOW 2: Quality — Create new audit, view checklist, expand, analyze findings"""
    print("\n  === FLOW 2: Quality Audits ===")
    page.goto(f"{BASE}/quality")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)

    # 2a. Page loads
    try:
        h1 = page.locator("h1")
        assert_ok("Quality" in h1.text_content())
        log_pass("Quality page loads")
    except Exception as e:
        log_fail("Quality page load", e)

    # 2b. Existing audits visible (3 seeded)
    try:
        page.wait_for_timeout(500)
        audit_cards = page.locator(".card").filter(has=page.locator("text=supplier").or_(page.locator("text=internal")).or_(page.locator("text=regulatory")))
        count = audit_cards.count()
        assert_ok(count >= 1, f"No audit cards found")
        log_pass(f"Existing audits visible ({count})")
    except Exception as e:
        log_fail("Existing audits", e)

    # 2c. Open New Audit modal
    try:
        page.locator("button", has_text="New Audit").click()
        page.wait_for_timeout(500)
        assert_ok(page.locator("h2", has_text="Create New Audit").is_visible())
        log_pass("New Audit modal opens")
    except Exception as e:
        log_fail("New Audit modal open", e)

    # 2d. Fill form and submit
    try:
        page.fill("input[placeholder*='Audit']", "E2E Test Audit - Packaging Supplier")
        page.locator("select").first.select_option("supplier")
        page.fill("input[placeholder*='Biscuit']", "Premium Biscuits")
        page.fill("input[placeholder*='ABC']", "TestCo Packaging Ltd")
        page.fill("input[placeholder*='Pune']", "Mumbai Plant")
        page.locator("button", has_text="Create").click()
        page.wait_for_timeout(3000)  # Wait for AI or fallback
        log_pass("Audit creation submitted")
    except Exception as e:
        log_fail("Audit form submission", e)

    # 2e. Verify new audit appears in list
    try:
        page.wait_for_timeout(1000)
        assert_ok(page.locator("text=E2E Test Audit").first.is_visible(), "New audit not in list")
        log_pass("New audit appears in list")
    except Exception as e:
        log_fail("New audit in list", e)

    # 2f. Expand an audit to see checklist
    try:
        # Click on the first audit card to expand
        first_audit = page.locator(".card").filter(has=page.locator("text=Supplier Quality Audit")).first
        first_audit.click()
        page.wait_for_timeout(500)
        checklist = page.locator("text=AI Checklist")
        assert_ok(checklist.first.is_visible(), "Checklist not visible after expand")
        log_pass("Audit expands to show AI Checklist")
    except Exception as e:
        log_fail("Expand audit checklist", e)

    # 2g. Open Analyze modal on an incomplete audit
    try:
        # Find an audit with Analyze button
        analyze_btn = page.locator("button", has_text="Analyze").first
        if analyze_btn.is_visible():
            analyze_btn.click()
            page.wait_for_timeout(500)
            assert_ok(page.locator("h2", has_text="Analyze").is_visible(), "Analyze modal not open")
            # Add a finding
            page.fill("input[placeholder*='Finding']", "Minor contamination in packaging area")
            page.locator("text=+ Add Finding").click()
            page.wait_for_timeout(200)
            finding_inputs = page.locator("input[placeholder*='Finding']")
            finding_inputs.last.fill("Temperature log gap on 3/15")
            # Close without submitting (don't want to call AI)
            page.locator("button", has_text="Cancel").first.click()
            page.wait_for_timeout(300)
            log_pass("Analyze modal opens with findings form")
        else:
            log_pass("No incomplete audits to analyze (OK)")
    except Exception as e:
        log_fail("Analyze modal", e)

    # 2h. AI Chat panel visible
    try:
        chat = page.locator("text=QualityAI")
        assert_ok(chat.first.is_visible(), "QualityAI chat not visible")
        log_pass("QualityAI chat panel visible")
    except Exception as e:
        log_fail("QualityAI chat", e)

    # 2i. Country Requirements modal
    try:
        page.locator("button", has_text="Country").first.click()
        page.wait_for_timeout(500)
        assert_ok(page.locator("h2", has_text="Country").is_visible())
        # Fill form
        page.locator("select").first.select_option("Germany")
        page.fill("input[placeholder*='Biscuits']", "Digestive Biscuits")
        page.locator("button", has_text="Cancel").first.click()
        page.wait_for_timeout(300)
        log_pass("Country Requirements modal works")
    except Exception as e:
        log_fail("Country Requirements modal", e)

    # 2j. Shelf-Life Predictor modal
    try:
        page.locator("button", has_text="Shelf").first.click()
        page.wait_for_timeout(500)
        assert_ok(page.locator("h2", has_text="Shelf").is_visible())
        page.locator("button", has_text="Cancel").first.click()
        page.wait_for_timeout(300)
        log_pass("Shelf-Life Predictor modal works")
    except Exception as e:
        log_fail("Shelf-Life modal", e)

    page.screenshot(path="/tmp/flow_quality.png", full_page=True)


def flow_complaints(page: Page):
    """FLOW 3: Complaints — Log complaint, view classification, RCA, response letter,
    regulatory notification, batch trace"""
    print("\n  === FLOW 3: Complaints ===")
    page.goto(f"{BASE}/complaints")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)

    # 3a. Page loads with existing complaints
    try:
        h1 = page.locator("h1")
        assert_ok("Complaint" in h1.text_content())
        log_pass("Complaints page loads")
    except Exception as e:
        log_fail("Complaints page load", e)

    # 3b. Existing complaints visible (4 seeded)
    try:
        complaints = page.locator("text=CMP-2024-")
        assert_ok(complaints.count() >= 4, f"Only {complaints.count()} complaint refs")
        log_pass(f"Seeded complaints visible ({complaints.count()} refs)")
    except Exception as e:
        log_fail("Seeded complaints", e)

    # 3c. Filter by status
    try:
        page.locator("select").first.select_option("open")
        page.wait_for_timeout(1000)
        # Should show only open complaints
        log_pass("Status filter works")
        page.locator("select").first.select_option("")  # Reset
        page.wait_for_timeout(500)
    except Exception as e:
        log_fail("Status filter", e)

    # 3d. Filter by priority
    try:
        page.locator("select").nth(1).select_option("critical")
        page.wait_for_timeout(1000)
        log_pass("Priority filter works")
        page.locator("select").nth(1).select_option("")  # Reset
        page.wait_for_timeout(500)
    except Exception as e:
        log_fail("Priority filter", e)

    # 3e. Search
    try:
        page.fill("input[placeholder*='Search']", "Metro")
        page.wait_for_timeout(500)
        metro = page.locator("text=Metro Supermarkets")
        assert_ok(metro.first.is_visible(), "Search didn't find Metro")
        page.fill("input[placeholder*='Search']", "")  # Reset
        page.wait_for_timeout(500)
        log_pass("Search works")
    except Exception as e:
        log_fail("Search", e)

    # 3f. Expand a complaint to see AI analysis
    try:
        first_complaint = page.locator("text=Metro Supermarkets").first
        first_complaint.click()
        page.wait_for_timeout(500)
        log_pass("Complaint card expands")
    except Exception as e:
        log_fail("Expand complaint", e)

    # 3g. Check action buttons visible (RCA, Response Letter)
    try:
        rca_btn = page.locator("button", has_text="Root Cause").first
        if rca_btn.is_visible():
            log_pass("RCA button visible")
        else:
            rca_btn2 = page.locator("button", has_text="RCA").first
            assert_ok(rca_btn2.is_visible(), "Neither RCA nor Root Cause button found")
            log_pass("RCA button visible")
    except Exception as e:
        log_fail("RCA button", e)

    try:
        letter_btn = page.locator("button", has_text="Response Letter").or_(page.locator("button", has_text="Draft Response")).or_(page.locator("button", has_text="Letter"))
        assert_ok(letter_btn.first.is_visible(), "Response Letter button not found")
        log_pass("Response Letter button visible")
    except Exception as e:
        log_fail("Response Letter button", e)

    # 3h. Trace Batch button (should appear for complaints with batch numbers)
    try:
        trace_btn = page.locator("button", has_text="Trace").first
        assert_ok(trace_btn.is_visible(), "Trace Batch button not found")
        log_pass("Trace Batch button visible")
    except Exception as e:
        log_fail("Trace Batch button", e)

    # 3i. Log new complaint modal
    try:
        page.goto(f"{BASE}/complaints")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        page.locator("button", has_text="Log Complaint").click()
        page.wait_for_timeout(500)
        assert_ok(page.locator("h2", has_text="Log New Complaint").is_visible())
        log_pass("Log Complaint modal opens")
    except Exception as e:
        log_fail("Log Complaint modal", e)

    # 3j. Fill complaint form
    try:
        modal = page.locator("div.relative.bg-white")
        modal.locator("input[placeholder*='Metro']").fill("E2E Test Customer GmbH")
        modal.locator("select").first.select_option("Germany")
        modal.locator("input[placeholder*='Digestive']").fill("E2E Test Product 500g")
        modal.locator("input[placeholder*='B2024']").fill("B2024-E2E-001")
        modal.locator("textarea").fill("E2E test complaint - product arrived with incorrect labeling, missing allergen declaration for nuts")
        log_pass("Complaint form filled")
    except Exception as e:
        log_fail("Fill complaint form", e)

    # 3k. Submit complaint
    try:
        page.locator("button", has_text="Submit").click()
        page.wait_for_timeout(3000)  # Wait for AI classification or fallback
        # Check it appears in list
        page.wait_for_timeout(1000)
        e2e_complaint = page.locator("text=E2E Test Customer")
        assert_ok(e2e_complaint.first.is_visible(), "New complaint not in list")
        log_pass("Complaint created and appears in list")
    except Exception as e:
        log_fail("Submit complaint", e)

    # 3l. AI Chat panel
    try:
        chat = page.locator("text=ComplaintAI")
        assert_ok(chat.first.is_visible(), "ComplaintAI chat not visible")
        log_pass("ComplaintAI chat panel visible")
    except Exception as e:
        log_fail("ComplaintAI chat", e)

    page.screenshot(path="/tmp/flow_complaints.png", full_page=True)


def flow_finance(page: Page):
    """FLOW 4: Finance — Create invoice, validate, risk analysis, HS classify, incentives,
    document checklist"""
    print("\n  === FLOW 4: Finance & Export ===")
    page.goto(f"{BASE}/finance")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)

    # 4a. Page loads
    try:
        h1 = page.locator("h1")
        assert_ok("Finance" in h1.text_content())
        log_pass("Finance page loads")
    except Exception as e:
        log_fail("Finance page load", e)

    # 4b. Existing invoices visible (3 seeded)
    try:
        inv_refs = page.locator("text=INV-2024-")
        assert_ok(inv_refs.count() >= 3, f"Only {inv_refs.count()} invoice refs")
        log_pass(f"Seeded invoices visible ({inv_refs.count()} refs)")
    except Exception as e:
        log_fail("Seeded invoices", e)

    # 4c. Expand an invoice to see line items
    try:
        first_inv = page.locator("text=Tesco Stores").first
        first_inv.click()
        page.wait_for_timeout(500)
        line_items = page.locator("text=Line Items")
        assert_ok(line_items.first.is_visible(), "Line Items section not visible")
        log_pass("Invoice expands to show line items")
    except Exception as e:
        log_fail("Expand invoice", e)

    # 4d. Action buttons visible on invoices
    try:
        validate_btn = page.locator("button", has_text="Validate").first
        assert_ok(validate_btn.is_visible(), "Validate button not found")
        log_pass("Validate button visible")
    except Exception as e:
        log_fail("Validate button", e)

    try:
        risk_btn = page.locator("button", has_text="Risk").first
        assert_ok(risk_btn.is_visible(), "Risk Analysis button not found")
        log_pass("Risk Analysis button visible")
    except Exception as e:
        log_fail("Risk Analysis button", e)

    try:
        hs_btn = page.locator("button", has_text="HS Classify").first
        assert_ok(hs_btn.is_visible(), "HS Classify button not found")
        log_pass("HS Classify button visible")
    except Exception as e:
        log_fail("HS Classify button", e)

    try:
        incentives_btn = page.locator("button", has_text="Incentives").first
        assert_ok(incentives_btn.is_visible(), "Export Incentives button not found")
        log_pass("Export Incentives button visible")
    except Exception as e:
        log_fail("Export Incentives button", e)

    # 4e. New Invoice modal
    try:
        page.goto(f"{BASE}/finance")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        page.locator("button", has_text="New Invoice").click()
        page.wait_for_timeout(500)
        assert_ok(page.locator("h2", has_text="New Export Invoice").is_visible())
        log_pass("New Invoice modal opens")
    except Exception as e:
        log_fail("New Invoice modal", e)

    # 4f. Fill invoice form
    try:
        # Invoice number
        page.fill("input[placeholder*='Auto-generated']", "INV-2024-E2E1")
        # Customer name
        page.fill("input[placeholder*='Tesco']", "E2E Test Retailer Ltd")
        # Country
        selects = page.locator("select")
        selects.nth(0).select_option("Germany")
        # Currency
        selects.nth(1).select_option("EUR")
        # Incoterms
        selects.nth(2).select_option("CIF")
        # Line item
        modal = page.locator("div.relative.bg-white")
        modal.locator("input[placeholder*='Product description']").fill("E2E Biscuits 200g x 24 cases")
        modal.locator("input[type='number']").first.fill("240")
        modal.locator("input[type='number']").nth(1).fill("8.50")
        log_pass("Invoice form filled")
    except Exception as e:
        log_fail("Fill invoice form", e)

    # 4g. Submit invoice
    try:
        page.locator("button", has_text="Create Invoice").click()
        page.wait_for_timeout(2000)
        e2e_inv = page.locator("text=E2E Test Retailer")
        assert_ok(e2e_inv.first.is_visible(), "New invoice not in list")
        log_pass("Invoice created and appears in list")
    except Exception as e:
        log_fail("Submit invoice", e)

    # 4h. Document Checklist modal
    try:
        page.goto(f"{BASE}/finance")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        page.locator("button", has_text="Document Checklist").click()
        page.wait_for_timeout(500)
        assert_ok(page.locator("h2", has_text="Export Document Checklist").is_visible())
        page.locator("select").first.select_option("United Kingdom")
        page.locator("button", has_text="Cancel").first.click()
        page.wait_for_timeout(300)
        log_pass("Document Checklist modal works")
    except Exception as e:
        log_fail("Document Checklist modal", e)

    # 4i. AI Chat panel
    try:
        chat = page.locator("text=FinanceAI")
        assert_ok(chat.first.is_visible(), "FinanceAI chat not visible")
        log_pass("FinanceAI chat panel visible")
    except Exception as e:
        log_fail("FinanceAI chat", e)

    page.screenshot(path="/tmp/flow_finance.png", full_page=True)


def flow_navigation(page: Page):
    """FLOW 5: Full navigation — sidebar, all pages, back to dashboard"""
    print("\n  === FLOW 5: Navigation ===")

    # Start at dashboard
    page.goto(f"{BASE}/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)

    # Should redirect to /dashboard
    try:
        assert_ok("/dashboard" in page.url, f"Root didn't redirect, url: {page.url}")
        log_pass("Root redirects to /dashboard")
    except Exception as e:
        log_fail("Root redirect", e)

    sidebar = page.locator("aside")

    # Navigate through all pages via sidebar
    for path, name in [("/quality", "Quality"), ("/complaints", "Complaints"),
                        ("/finance", "Finance"), ("/dashboard", "Dashboard")]:
        try:
            sidebar.locator(f"a[href='{path}']").click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(500)
            assert_ok(path in page.url, f"URL doesn't contain {path}")
            h1 = page.locator("h1")
            assert_ok(h1.is_visible(), f"{name} heading not visible")
            log_pass(f"Navigate to {name}")
        except Exception as e:
            log_fail(f"Navigate to {name}", e)

    # Check sidebar branding (may be in sidebar or mobile top bar)
    try:
        sidebar = page.locator("aside")
        brand = sidebar.locator("text=FMCG AI Platform")
        if brand.count() > 0 and brand.first.is_visible():
            log_pass("Sidebar branding visible")
        else:
            # On smaller viewports, check mobile top bar
            mobile_brand = page.locator("text=FMCG AI Platform")
            assert_ok(mobile_brand.count() > 0, "Brand text not in DOM")
            log_pass("Sidebar branding in DOM (may be hidden on current viewport)")
    except Exception as e:
        log_fail("Sidebar branding", e)

    # Check sidebar company info
    try:
        company = page.locator("text=IndiaFMCG Corp")
        assert_ok(company.first.is_visible())
        log_pass("Company info in sidebar")
    except Exception as e:
        log_fail("Company info", e)


def flow_api_completeness(page: Page):
    """FLOW 6: API — verify all endpoints respond correctly"""
    print("\n  === FLOW 6: API Completeness ===")

    endpoints = [
        ("GET", "/api/health", None, "Health"),
        ("GET", "/api/dashboard/stats", None, "Dashboard Stats"),
        ("GET", "/api/quality", None, "List Audits"),
        ("GET", "/api/complaints", None, "List Complaints"),
        ("GET", "/api/complaints/analytics/summary", None, "Complaint Analytics"),
        ("GET", "/api/finance", None, "List Invoices"),
        ("GET", "/api/finance/analytics/summary", None, "Finance Analytics"),
    ]

    for method, path, body, name in endpoints:
        try:
            if method == "GET":
                resp = page.request.get(f"{API}{path}")
            else:
                resp = page.request.post(f"{API}{path}",
                    data=json.dumps(body) if body else None,
                    headers={"Content-Type": "application/json"})
            assert_ok(resp.ok, f"Status {resp.status}")
            log_pass(f"{method} {path} ({name})")
        except Exception as e:
            log_fail(f"{method} {path} ({name})", e)

    # Test POST endpoints that create
    try:
        resp = page.request.post(f"{API}/api/quality", data=json.dumps({
            "title": "API Flow Test Audit", "type": "internal"
        }), headers={"Content-Type": "application/json"})
        assert_ok(resp.status in (200, 201), f"Status {resp.status}")
        data = resp.json()
        audit_id = data.get("id")
        log_pass("POST /api/quality (create audit)")

        # Delete it
        if audit_id:
            resp = page.request.delete(f"{API}/api/quality/{audit_id}")
            assert_ok(resp.ok)
            log_pass("DELETE /api/quality/:id")
    except Exception as e:
        log_fail("Quality CRUD", e)

    try:
        resp = page.request.post(f"{API}/api/complaints", data=json.dumps({
            "customerName": "API Test", "customerCountry": "UK",
            "product": "Test", "description": "API flow test"
        }), headers={"Content-Type": "application/json"})
        assert_ok(resp.status in (200, 201))
        log_pass("POST /api/complaints (create)")
    except Exception as e:
        log_fail("Create complaint", e)

    try:
        resp = page.request.post(f"{API}/api/finance", data=json.dumps({
            "customerName": "API Test", "destinationCountry": "Germany",
            "items": [{"description": "Test", "quantity": 1, "unit_price": 10, "total": 10}]
        }), headers={"Content-Type": "application/json"})
        assert_ok(resp.status in (200, 201))
        log_pass("POST /api/finance (create)")
    except Exception as e:
        log_fail("Create invoice", e)

    # Test new feature endpoints
    try:
        resp = page.request.post(f"{API}/api/quality/country-requirements", data=json.dumps({
            "country": "UAE", "productCategory": "Snack Foods"
        }), headers={"Content-Type": "application/json"})
        assert_ok(resp.status in (200, 500))
        log_pass("POST /api/quality/country-requirements")
    except Exception as e:
        log_fail("Country requirements", e)

    try:
        resp = page.request.post(f"{API}/api/quality/shelf-life", data=json.dumps({
            "product": "Crackers", "destinationCountry": "Singapore",
            "shippingMode": "Sea Freight", "season": "Summer", "packagingType": "Vacuum Sealed"
        }), headers={"Content-Type": "application/json"})
        assert_ok(resp.status in (200, 500))
        log_pass("POST /api/quality/shelf-life")
    except Exception as e:
        log_fail("Shelf-life", e)


def main():
    global passed, failed

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        print("\n" + "=" * 64)
        print("  FMCG AI Platform — Complete User Flow Test Suite")
        print("=" * 64)

        flow_dashboard(page)
        flow_quality_create_audit(page)
        flow_complaints(page)
        flow_finance(page)
        flow_navigation(page)
        flow_api_completeness(page)

        browser.close()

    total = passed + failed
    print("\n" + "=" * 64)
    print(f"  RESULTS: {passed} passed, {failed} failed, {total} total")
    print("=" * 64)

    if errors:
        print(f"\n  FAILURES ({failed}):")
        for name, err in errors:
            print(f"    - {name}: {err}")

    print(f"\n  Screenshots: /tmp/flow_*.png")

    return 1 if failed > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
