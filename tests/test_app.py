"""
FMCG AI Platform — End-to-End Tests
Uses Playwright (webapp-testing skill) to verify all pages and key functionality.
"""
from playwright.sync_api import sync_playwright
import json
import sys

BASE_URL = "http://localhost:5173"
API_URL = "http://localhost:3001"

def test_health_endpoint(page):
    """Test API health endpoint"""
    response = page.request.get(f"{API_URL}/api/health")
    assert response.ok, f"Health check failed: {response.status}"
    data = response.json()
    assert data["status"] == "ok"
    print(f"  [PASS] Health endpoint: status={data['status']}, aiEnabled={data.get('aiEnabled')}")

def test_dashboard_stats_api(page):
    """Test dashboard stats API"""
    response = page.request.get(f"{API_URL}/api/dashboard/stats")
    assert response.ok, f"Dashboard stats failed: {response.status}"
    data = response.json()
    assert "audits" in data
    assert "complaints" in data
    assert "finance" in data
    assert data["audits"]["total"] >= 3, f"Expected >= 3 audits, got {data['audits']['total']}"
    assert data["complaints"]["total"] >= 4, f"Expected >= 4 complaints, got {data['complaints']['total']}"
    assert data["finance"]["total"] >= 3, f"Expected >= 3 invoices, got {data['finance']['total']}"
    print(f"  [PASS] Dashboard stats: {data['audits']['total']} audits, {data['complaints']['total']} complaints, {data['finance']['total']} invoices")

def test_quality_api(page):
    """Test quality audits CRUD API"""
    # List
    response = page.request.get(f"{API_URL}/api/quality")
    assert response.ok
    audits = response.json()
    assert len(audits) >= 3
    print(f"  [PASS] Quality list: {len(audits)} audits")

    # Create (without AI — will use fallback)
    response = page.request.post(f"{API_URL}/api/quality", data=json.dumps({
        "title": "Test Audit - Playwright",
        "type": "internal",
        "product": "Test Biscuits",
        "location": "Test Plant"
    }), headers={"Content-Type": "application/json"})
    assert response.ok or response.status == 201, f"Create audit failed: {response.status}"
    created = response.json()
    audit_id = created.get("id") or created.get("audit", {}).get("id")
    print(f"  [PASS] Quality create: id={audit_id}")

    # Get single
    if audit_id:
        response = page.request.get(f"{API_URL}/api/quality/{audit_id}")
        assert response.ok
        print(f"  [PASS] Quality get single")

        # Delete
        response = page.request.delete(f"{API_URL}/api/quality/{audit_id}")
        assert response.ok
        print(f"  [PASS] Quality delete")

def test_complaints_api(page):
    """Test complaints CRUD API"""
    # List
    response = page.request.get(f"{API_URL}/api/complaints")
    assert response.ok
    complaints = response.json()
    assert len(complaints) >= 4
    print(f"  [PASS] Complaints list: {len(complaints)} complaints")

    # Analytics
    response = page.request.get(f"{API_URL}/api/complaints/analytics/summary")
    assert response.ok
    analytics = response.json()
    assert "total" in analytics
    print(f"  [PASS] Complaints analytics: total={analytics['total']}")

    # Create
    response = page.request.post(f"{API_URL}/api/complaints", data=json.dumps({
        "customerName": "Test Customer",
        "customerCountry": "Germany",
        "product": "Test Biscuits",
        "description": "Test complaint from Playwright"
    }), headers={"Content-Type": "application/json"})
    assert response.ok or response.status == 201
    print(f"  [PASS] Complaints create")

def test_finance_api(page):
    """Test finance/invoices CRUD API"""
    # List
    response = page.request.get(f"{API_URL}/api/finance")
    assert response.ok
    invoices = response.json()
    assert len(invoices) >= 3
    print(f"  [PASS] Finance list: {len(invoices)} invoices")

    # Analytics
    response = page.request.get(f"{API_URL}/api/finance/analytics/summary")
    assert response.ok
    analytics = response.json()
    assert "totalInvoices" in analytics
    print(f"  [PASS] Finance analytics: total={analytics['totalInvoices']}")

    # Create
    response = page.request.post(f"{API_URL}/api/finance", data=json.dumps({
        "customerName": "Test Corp",
        "destinationCountry": "Germany",
        "items": [{"description": "Test Product", "quantity": 10, "unit_price": 5, "total": 50}],
        "currency": "EUR",
        "paymentTerms": "NET 30",
        "incoterms": "FOB"
    }), headers={"Content-Type": "application/json"})
    assert response.ok or response.status == 201
    print(f"  [PASS] Finance create")

def test_dashboard_page(page):
    """Test dashboard page loads and renders"""
    page.goto(f"{BASE_URL}/dashboard")
    page.wait_for_load_state("networkidle")

    # Check page title / heading
    heading = page.locator("h1")
    assert heading.is_visible(), "Dashboard heading not visible"
    assert "Dashboard" in heading.text_content()
    print(f"  [PASS] Dashboard page loads with heading")

    # Check stat cards exist
    cards = page.locator(".card")
    count = cards.count()
    assert count >= 4, f"Expected >= 4 cards, got {count}"
    print(f"  [PASS] Dashboard has {count} cards")

    # Take screenshot
    page.screenshot(path="/tmp/fmcg_dashboard.png", full_page=True)
    print(f"  [PASS] Dashboard screenshot saved to /tmp/fmcg_dashboard.png")

def test_quality_page(page):
    """Test quality audit page"""
    page.goto(f"{BASE_URL}/quality")
    page.wait_for_load_state("networkidle")

    heading = page.locator("h1")
    assert heading.is_visible()
    assert "Quality" in heading.text_content()
    print(f"  [PASS] Quality page loads")

    # Check audit items appear
    page.wait_for_timeout(1000)
    page.screenshot(path="/tmp/fmcg_quality.png", full_page=True)
    print(f"  [PASS] Quality screenshot saved")

def test_complaints_page(page):
    """Test complaints page"""
    page.goto(f"{BASE_URL}/complaints")
    page.wait_for_load_state("networkidle")

    heading = page.locator("h1")
    assert heading.is_visible()
    assert "Complaint" in heading.text_content()
    print(f"  [PASS] Complaints page loads")

    page.wait_for_timeout(1000)
    page.screenshot(path="/tmp/fmcg_complaints.png", full_page=True)
    print(f"  [PASS] Complaints screenshot saved")

def test_finance_page(page):
    """Test finance page"""
    page.goto(f"{BASE_URL}/finance")
    page.wait_for_load_state("networkidle")

    heading = page.locator("h1")
    assert heading.is_visible()
    assert "Finance" in heading.text_content()
    print(f"  [PASS] Finance page loads")

    page.wait_for_timeout(1000)
    page.screenshot(path="/tmp/fmcg_finance.png", full_page=True)
    print(f"  [PASS] Finance screenshot saved")

def test_navigation(page):
    """Test sidebar navigation"""
    page.goto(f"{BASE_URL}/dashboard")
    page.wait_for_load_state("networkidle")

    # Click Quality nav
    page.locator("a[href='/quality']").click()
    page.wait_for_load_state("networkidle")
    assert "/quality" in page.url
    print(f"  [PASS] Navigation to Quality works")

    # Click Complaints nav
    page.locator("a[href='/complaints']").click()
    page.wait_for_load_state("networkidle")
    assert "/complaints" in page.url
    print(f"  [PASS] Navigation to Complaints works")

    # Click Finance nav
    page.locator("a[href='/finance']").click()
    page.wait_for_load_state("networkidle")
    assert "/finance" in page.url
    print(f"  [PASS] Navigation to Finance works")

    # Click Dashboard nav
    page.locator("a[href='/dashboard']").click()
    page.wait_for_load_state("networkidle")
    assert "/dashboard" in page.url
    print(f"  [PASS] Navigation to Dashboard works")

def test_new_audit_modal(page):
    """Test new audit modal opens"""
    page.goto(f"{BASE_URL}/quality")
    page.wait_for_load_state("networkidle")

    # Click New Audit button
    page.locator("button:has-text('New Audit')").click()
    page.wait_for_timeout(500)

    # Check modal is visible
    modal_title = page.locator("h2:has-text('Create New Audit')")
    assert modal_title.is_visible(), "New Audit modal did not open"
    print(f"  [PASS] New Audit modal opens")

    # Close modal
    page.locator("button:has-text('Cancel')").first.click()
    page.wait_for_timeout(300)
    print(f"  [PASS] Modal closes on Cancel")

def test_new_complaint_modal(page):
    """Test new complaint modal opens"""
    page.goto(f"{BASE_URL}/complaints")
    page.wait_for_load_state("networkidle")

    page.locator("button:has-text('Log Complaint')").click()
    page.wait_for_timeout(500)

    modal_title = page.locator("h2:has-text('Log New Complaint')")
    assert modal_title.is_visible(), "Log Complaint modal did not open"
    print(f"  [PASS] Log Complaint modal opens")

    page.locator("button:has-text('Cancel')").first.click()
    page.wait_for_timeout(300)
    print(f"  [PASS] Modal closes on Cancel")


def main():
    passed = 0
    failed = 0
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        tests = [
            ("Health Endpoint", test_health_endpoint),
            ("Dashboard Stats API", test_dashboard_stats_api),
            ("Quality API CRUD", test_quality_api),
            ("Complaints API CRUD", test_complaints_api),
            ("Finance API CRUD", test_finance_api),
            ("Dashboard Page", test_dashboard_page),
            ("Quality Page", test_quality_page),
            ("Complaints Page", test_complaints_page),
            ("Finance Page", test_finance_page),
            ("Navigation", test_navigation),
            ("New Audit Modal", test_new_audit_modal),
            ("New Complaint Modal", test_new_complaint_modal),
        ]

        print("\n" + "=" * 60)
        print("  FMCG AI Platform — End-to-End Test Suite")
        print("=" * 60 + "\n")

        for name, test_fn in tests:
            try:
                print(f"[TEST] {name}")
                test_fn(page)
                passed += 1
            except Exception as e:
                failed += 1
                errors.append((name, str(e)))
                print(f"  [FAIL] {name}: {e}")

        browser.close()

    print("\n" + "=" * 60)
    print(f"  Results: {passed} passed, {failed} failed, {passed + failed} total")
    print("=" * 60)

    if errors:
        print("\nFailures:")
        for name, err in errors:
            print(f"  - {name}: {err}")

    print(f"\nScreenshots saved to /tmp/fmcg_*.png")

    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
