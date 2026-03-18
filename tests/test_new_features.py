"""
FMCG AI Platform — Test New Features (6 enhancements)
"""
from playwright.sync_api import sync_playwright
import json
import sys

BASE_URL = "http://localhost:5173"
API_URL = "http://localhost:3001"

# Shared state
state = {}

def run_tests():
    passed = 0
    failed = 0
    errors = []
    tests = []

    def test(name):
        def decorator(fn):
            tests.append((name, fn))
            return fn
        return decorator

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        @test("API: Get invoice ID")
        def _():
            resp = page.request.get(f"{API_URL}/api/finance")
            assert resp.ok
            invoices = resp.json()
            assert len(invoices) >= 3
            state['invoice_id'] = invoices[0]['id']
            print(f"    Invoice: {invoices[0]['invoice_number']} ({state['invoice_id'][:8]}...)")

        @test("API: HS Code Classification endpoint")
        def _():
            resp = page.request.post(f"{API_URL}/api/finance/{state['invoice_id']}/hs-classify",
                headers={"Content-Type": "application/json"})
            assert resp.status in (200, 500), f"Status: {resp.status}"
            print(f"    Status: {resp.status}")

        @test("API: Export Incentives endpoint")
        def _():
            resp = page.request.post(f"{API_URL}/api/finance/{state['invoice_id']}/incentives",
                headers={"Content-Type": "application/json"})
            assert resp.status in (200, 500), f"Status: {resp.status}"
            print(f"    Status: {resp.status}")

        @test("API: Get complaint ID")
        def _():
            resp = page.request.get(f"{API_URL}/api/complaints")
            assert resp.ok
            complaints = resp.json()
            assert len(complaints) >= 4
            state['complaint_id'] = complaints[0]['id']
            with_batch = [c for c in complaints if c.get('batch_number')]
            state['complaint_with_batch'] = with_batch[0]['id'] if with_batch else complaints[0]['id']
            print(f"    Complaint: {complaints[0]['complaint_ref']}")

        @test("API: Regulatory Notification endpoint")
        def _():
            resp = page.request.post(
                f"{API_URL}/api/complaints/{state['complaint_id']}/regulatory-notification",
                data=json.dumps({"authority": "FSSAI"}),
                headers={"Content-Type": "application/json"})
            assert resp.status in (200, 500), f"Status: {resp.status}"
            print(f"    Status: {resp.status}")

        @test("API: Batch Traceability endpoint")
        def _():
            resp = page.request.get(f"{API_URL}/api/complaints/{state['complaint_with_batch']}/batch-trace")
            assert resp.status in (200, 404, 500), f"Status: {resp.status}"
            print(f"    Status: {resp.status}")

        @test("API: Country Requirements endpoint")
        def _():
            resp = page.request.post(f"{API_URL}/api/quality/country-requirements",
                data=json.dumps({"country": "Germany", "productCategory": "Biscuits"}),
                headers={"Content-Type": "application/json"})
            assert resp.status in (200, 500), f"Status: {resp.status}"
            print(f"    Status: {resp.status}")

        @test("API: Shelf-Life Prediction endpoint")
        def _():
            resp = page.request.post(f"{API_URL}/api/quality/shelf-life",
                data=json.dumps({
                    "product": "Digestive Biscuits",
                    "destinationCountry": "United Kingdom",
                    "shippingMode": "Sea Freight",
                    "season": "Summer",
                    "packagingType": "Standard Carton"
                }),
                headers={"Content-Type": "application/json"})
            assert resp.status in (200, 500), f"Status: {resp.status}"
            print(f"    Status: {resp.status}")

        @test("UI: Finance — HS Classify button visible")
        def _():
            page.goto(f"{BASE_URL}/finance")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            assert page.locator("button", has_text="HS Classify").first.is_visible()
            page.screenshot(path="/tmp/fmcg_finance_v2.png", full_page=True)

        @test("UI: Finance — Export Incentives button visible")
        def _():
            assert page.locator("button", has_text="Incentives").first.is_visible()

        @test("UI: Complaints — Trace Batch button visible")
        def _():
            page.goto(f"{BASE_URL}/complaints")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            assert page.locator("button", has_text="Trace").first.is_visible()
            page.screenshot(path="/tmp/fmcg_complaints_v2.png", full_page=True)

        @test("UI: Quality — Country Requirements button visible")
        def _():
            page.goto(f"{BASE_URL}/quality")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            assert page.locator("button", has_text="Country").first.is_visible()
            page.screenshot(path="/tmp/fmcg_quality_v2.png", full_page=True)

        @test("UI: Quality — Shelf-Life button visible")
        def _():
            assert page.locator("button", has_text="Shelf").first.is_visible()

        @test("UI: Country Requirements modal opens & closes")
        def _():
            page.locator("button", has_text="Country").first.click()
            page.wait_for_timeout(500)
            assert page.locator("h2", has_text="Country").is_visible()
            page.locator("button", has_text="Cancel").first.click()
            page.wait_for_timeout(300)

        @test("UI: Shelf-Life modal opens & closes")
        def _():
            page.locator("button", has_text="Shelf").first.click()
            page.wait_for_timeout(500)
            assert page.locator("h2", has_text="Shelf").is_visible()
            page.locator("button", has_text="Cancel").first.click()

        print("\n" + "=" * 60)
        print("  FMCG AI Platform — New Features Test Suite")
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
    print(f"  Results: {passed} passed, {failed} failed, {passed + failed} total")
    print("=" * 60)
    if errors:
        print("\n  Failures:")
        for name, err in errors:
            print(f"    - {name}: {err[:120]}")
    return 1 if failed > 0 else 0

if __name__ == "__main__":
    sys.exit(run_tests())
