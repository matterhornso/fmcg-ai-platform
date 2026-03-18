"""
FMCG AI Platform — E2E Tests (v2)
Handles timing issues by using page.goto for all API tests too.
"""
from playwright.sync_api import sync_playwright
import json
import sys
import time

BASE_URL = "http://localhost:5173"
API_URL = "http://localhost:3001"

def run_tests():
    passed = 0
    failed = 0
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Capture console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        tests = []

        def test(name):
            def decorator(fn):
                tests.append((name, fn))
                return fn
            return decorator

        @test("Health API")
        def _():
            resp = page.request.get(f"{API_URL}/api/health")
            assert resp.ok, f"Status: {resp.status}"
            d = resp.json()
            assert d["status"] == "ok"
            print(f"    aiEnabled={d.get('aiEnabled')}")

        @test("Dashboard Stats API")
        def _():
            resp = page.request.get(f"{API_URL}/api/dashboard/stats")
            assert resp.ok, f"Status: {resp.status}"
            d = resp.json()
            assert d["audits"]["total"] >= 3
            assert d["complaints"]["total"] >= 4
            assert d["finance"]["total"] >= 3
            print(f"    audits={d['audits']['total']}, complaints={d['complaints']['total']}, invoices={d['finance']['total']}")

        @test("Quality API - List")
        def _():
            resp = page.request.get(f"{API_URL}/api/quality")
            assert resp.ok
            assert len(resp.json()) >= 3

        @test("Quality API - Create & Delete")
        def _():
            resp = page.request.post(f"{API_URL}/api/quality", data=json.dumps({
                "title": "Test Audit", "type": "internal", "product": "Test"
            }), headers={"Content-Type": "application/json"})
            assert resp.status in (200, 201)
            d = resp.json()
            aid = d.get("id") or d.get("audit", {}).get("id")
            assert aid
            resp2 = page.request.delete(f"{API_URL}/api/quality/{aid}")
            assert resp2.ok

        @test("Complaints API - List")
        def _():
            resp = page.request.get(f"{API_URL}/api/complaints")
            assert resp.ok
            assert len(resp.json()) >= 4

        @test("Complaints API - Analytics")
        def _():
            resp = page.request.get(f"{API_URL}/api/complaints/analytics/summary")
            assert resp.ok
            assert resp.json()["total"] >= 4

        @test("Finance API - List")
        def _():
            resp = page.request.get(f"{API_URL}/api/finance")
            assert resp.ok
            assert len(resp.json()) >= 3

        @test("Finance API - Analytics")
        def _():
            resp = page.request.get(f"{API_URL}/api/finance/analytics/summary")
            assert resp.ok
            assert resp.json()["totalInvoices"] >= 3

        @test("Dashboard Page Renders")
        def _():
            page.goto(f"{BASE_URL}/dashboard")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            h1 = page.locator("h1")
            assert h1.is_visible(), "h1 not visible"
            assert "Dashboard" in h1.text_content()
            page.screenshot(path="/tmp/fmcg_dashboard.png", full_page=True)

        @test("Dashboard Has Stat Cards")
        def _():
            cards = page.locator(".card")
            assert cards.count() >= 4, f"Only {cards.count()} cards"

        @test("Quality Page Renders")
        def _():
            page.goto(f"{BASE_URL}/quality")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            h1 = page.locator("h1")
            assert h1.is_visible()
            assert "Quality" in h1.text_content()
            page.screenshot(path="/tmp/fmcg_quality.png", full_page=True)

        @test("Complaints Page Renders")
        def _():
            page.goto(f"{BASE_URL}/complaints")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            h1 = page.locator("h1")
            assert h1.is_visible()
            assert "Complaint" in h1.text_content()
            page.screenshot(path="/tmp/fmcg_complaints.png", full_page=True)

        @test("Finance Page Renders")
        def _():
            page.goto(f"{BASE_URL}/finance")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            h1 = page.locator("h1")
            assert h1.is_visible()
            assert "Finance" in h1.text_content()
            page.screenshot(path="/tmp/fmcg_finance.png", full_page=True)

        @test("Sidebar Navigation Works")
        def _():
            page.goto(f"{BASE_URL}/dashboard")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(500)
            # Use aside (sidebar) scoped selectors to avoid ambiguity with dashboard links
            sidebar = page.locator("aside")
            sidebar.locator("a[href='/quality']").click()
            page.wait_for_load_state("networkidle")
            assert "/quality" in page.url
            sidebar.locator("a[href='/complaints']").click()
            page.wait_for_load_state("networkidle")
            assert "/complaints" in page.url
            sidebar.locator("a[href='/finance']").click()
            page.wait_for_load_state("networkidle")
            assert "/finance" in page.url

        @test("New Audit Modal Opens")
        def _():
            page.goto(f"{BASE_URL}/quality")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            page.locator("button", has_text="New Audit").click()
            page.wait_for_timeout(500)
            assert page.locator("h2", has_text="Create New Audit").is_visible()
            page.locator("button", has_text="Cancel").first.click()

        @test("Log Complaint Modal Opens")
        def _():
            page.goto(f"{BASE_URL}/complaints")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            page.locator("button", has_text="Log Complaint").click()
            page.wait_for_timeout(500)
            assert page.locator("h2", has_text="Log New Complaint").is_visible()
            page.locator("button", has_text="Cancel").first.click()

        @test("New Invoice Modal Opens")
        def _():
            page.goto(f"{BASE_URL}/finance")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            page.locator("button", has_text="New Invoice").click()
            page.wait_for_timeout(500)
            assert page.locator("h2", has_text="New Export Invoice").is_visible()
            page.locator("button", has_text="Cancel").first.click()

        # Run all tests
        print("\n" + "=" * 60)
        print("  FMCG AI Platform — E2E Test Suite")
        print("=" * 60 + "\n")

        for name, fn in tests:
            try:
                print(f"  [TEST] {name}")
                fn()
                print(f"  [PASS] {name}")
                passed += 1
            except Exception as e:
                print(f"  [FAIL] {name}: {e}")
                failed += 1
                errors.append((name, str(e)))

        browser.close()

    print("\n" + "=" * 60)
    if console_errors:
        print(f"  Console errors: {len(console_errors)}")
        for e in console_errors[:5]:
            print(f"    - {e}")
    print(f"\n  Results: {passed} passed, {failed} failed, {passed + failed} total")
    print("=" * 60)

    if errors:
        print("\n  Failures:")
        for name, err in errors:
            print(f"    - {name}: {err[:100]}")

    print(f"\n  Screenshots: /tmp/fmcg_*.png")
    return 1 if failed > 0 else 0

if __name__ == "__main__":
    sys.exit(run_tests())
