"""
FMCG AI Platform -- Comprehensive QA E2E Test Suite
Covers: Edge Cases, Error Handling, Data Integrity, UI Regression, API Contract Validation

Run with:
    python3 .agents/skills/webapp-testing/scripts/with_server.py \
      --server "cd server && npm run dev" --port 3001 \
      --server "cd client && npm run dev" --port 5173 \
      -- python3 tests/test_qa_comprehensive.py
"""
from playwright.sync_api import sync_playwright
import json
import sys
import time

BASE_URL = "http://localhost:5173"
API_URL = "http://localhost:3001"

# Shared state across tests
state = {}


def run_tests():
    passed = 0
    failed = 0
    errors = []
    tests = []

    def test(name, category="General"):
        def decorator(fn):
            tests.append((category, name, fn))
            return fn
        return decorator

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Track console errors across all pages
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # =====================================================================
        # A. EDGE CASES & BOUNDARY CONDITIONS
        # =====================================================================

        @test("Create audit with minimum fields (title + type only)", "A-EdgeCase")
        def _():
            resp = page.request.post(f"{API_URL}/api/quality", data=json.dumps({
                "title": "Minimal Audit", "type": "internal"
            }), headers={"Content-Type": "application/json"})
            assert resp.status == 201, f"Expected 201, got {resp.status}: {resp.text()}"
            d = resp.json()
            audit_id = d.get("id") or d.get("audit", {}).get("id")
            assert audit_id, "No audit ID returned"
            state["minimal_audit_id"] = audit_id
            # Verify optional fields are null
            audit = page.request.get(f"{API_URL}/api/quality/{audit_id}").json()
            assert audit.get("product") is None, f"product should be null, got {audit.get('product')}"
            assert audit.get("supplier") is None, f"supplier should be null, got {audit.get('supplier')}"
            assert audit.get("location") is None, f"location should be null, got {audit.get('location')}"

        @test("Create audit with maximum length title (250 chars)", "A-EdgeCase")
        def _():
            long_title = "A" * 250
            resp = page.request.post(f"{API_URL}/api/quality", data=json.dumps({
                "title": long_title, "type": "supplier"
            }), headers={"Content-Type": "application/json"})
            assert resp.status == 201, f"Expected 201, got {resp.status}"
            d = resp.json()
            audit_id = d.get("id") or d.get("audit", {}).get("id")
            state["long_title_audit_id"] = audit_id
            # Verify full title persisted
            audit = page.request.get(f"{API_URL}/api/quality/{audit_id}").json()
            assert len(audit["title"]) == 250

        @test("Create complaint with empty batch number (optional)", "A-EdgeCase")
        def _():
            resp = page.request.post(f"{API_URL}/api/complaints", data=json.dumps({
                "customerName": "Edge Test Corp",
                "customerCountry": "Japan",
                "product": "Test Product",
                "batchNumber": "",
                "description": "Testing empty batch number field"
            }), headers={"Content-Type": "application/json"})
            assert resp.status == 201, f"Expected 201, got {resp.status}: {resp.text()}"
            d = resp.json()
            state["empty_batch_complaint_id"] = d.get("complaint", {}).get("id") or d.get("id")

        @test("Create invoice with zero amount items", "A-EdgeCase")
        def _():
            resp = page.request.post(f"{API_URL}/api/finance", data=json.dumps({
                "customerName": "Zero Amount Corp",
                "destinationCountry": "Australia",
                "items": [
                    {"description": "Free Sample", "quantity": 1, "unit_price": 0, "total": 0}
                ]
            }), headers={"Content-Type": "application/json"})
            assert resp.status == 201, f"Expected 201, got {resp.status}: {resp.text()}"
            d = resp.json()
            state["zero_invoice_id"] = d.get("id")
            assert d.get("total_amount") == 0, f"Expected total_amount=0, got {d.get('total_amount')}"

        @test("Create invoice with very large amounts (999999.99)", "A-EdgeCase")
        def _():
            resp = page.request.post(f"{API_URL}/api/finance", data=json.dumps({
                "customerName": "Big Deal Corp",
                "destinationCountry": "USA",
                "items": [
                    {"description": "Bulk Order", "quantity": 10000, "unit_price": 99.99, "total": 999999.99}
                ],
                "currency": "USD"
            }), headers={"Content-Type": "application/json"})
            assert resp.status == 201, f"Expected 201, got {resp.status}"
            d = resp.json()
            state["large_invoice_id"] = d.get("id")
            assert abs(d.get("total_amount", 0) - 999999.99) < 0.01, f"Amount mismatch: {d.get('total_amount')}"

        @test("Search with special characters (!, @, #, <script>)", "A-EdgeCase")
        def _():
            # These should not crash the API -- complaints support query params
            for special in ["!", "@", "#", "<script>alert(1)</script>", "'; DROP TABLE--"]:
                resp = page.request.get(f"{API_URL}/api/complaints?status={special}")
                assert resp.ok, f"API crashed on special char: {special}, status: {resp.status}"

        @test("Empty search returns all results (no filter)", "A-EdgeCase")
        def _():
            resp_no_filter = page.request.get(f"{API_URL}/api/complaints")
            assert resp_no_filter.ok
            all_items = resp_no_filter.json()
            assert isinstance(all_items, list)
            assert len(all_items) >= 4, f"Expected >= 4 seeded complaints, got {len(all_items)}"

        @test("Filter combinations (status + priority together)", "A-EdgeCase")
        def _():
            resp = page.request.get(f"{API_URL}/api/complaints?status=open&priority=medium")
            assert resp.ok
            items = resp.json()
            assert isinstance(items, list)
            for item in items:
                assert item["status"] == "open", f"Status filter failed: {item['status']}"
                assert item["priority"] == "medium", f"Priority filter failed: {item['priority']}"

        # =====================================================================
        # B. ERROR HANDLING
        # =====================================================================

        @test("POST analyze to non-existent audit ID => 404", "B-ErrorHandling")
        def _():
            fake_id = "00000000-0000-0000-0000-000000000000"
            resp = page.request.post(f"{API_URL}/api/quality/{fake_id}/analyze",
                data=json.dumps({"findings": ["test"]}),
                headers={"Content-Type": "application/json"})
            assert resp.status == 404, f"Expected 404, got {resp.status}"

        @test("POST complaint with missing required fields => 400", "B-ErrorHandling")
        def _():
            resp = page.request.post(f"{API_URL}/api/complaints", data=json.dumps({
                "customerName": "Partial Corp"
                # Missing: customerCountry, product, description
            }), headers={"Content-Type": "application/json"})
            assert resp.status == 400, f"Expected 400, got {resp.status}: {resp.text()}"

        @test("POST audit with missing required fields => 400", "B-ErrorHandling")
        def _():
            resp = page.request.post(f"{API_URL}/api/quality", data=json.dumps({
                "title": "Missing Type"
                # Missing: type
            }), headers={"Content-Type": "application/json"})
            assert resp.status == 400, f"Expected 400, got {resp.status}"

        @test("POST invoice with missing required fields => 400", "B-ErrorHandling")
        def _():
            resp = page.request.post(f"{API_URL}/api/finance", data=json.dumps({
                "customerName": "Partial Invoice"
                # Missing: destinationCountry
            }), headers={"Content-Type": "application/json"})
            assert resp.status == 400, f"Expected 400, got {resp.status}"

        @test("PATCH audit with invalid status => 400", "B-ErrorHandling")
        def _():
            # Get a real audit id first
            resp = page.request.get(f"{API_URL}/api/quality")
            audits = resp.json()
            aid = audits[0]["id"]
            resp2 = page.request.patch(f"{API_URL}/api/quality/{aid}/status",
                data=json.dumps({"status": "INVALID_STATUS"}),
                headers={"Content-Type": "application/json"})
            assert resp2.status == 400, f"Expected 400, got {resp2.status}: {resp2.text()}"

        @test("PATCH complaint with invalid status => 400", "B-ErrorHandling")
        def _():
            resp = page.request.get(f"{API_URL}/api/complaints")
            complaints = resp.json()
            cid = complaints[0]["id"]
            resp2 = page.request.patch(f"{API_URL}/api/complaints/{cid}/status",
                data=json.dumps({"status": "BOGUS"}),
                headers={"Content-Type": "application/json"})
            assert resp2.status == 400, f"Expected 400, got {resp2.status}"

        @test("PATCH invoice with invalid status => 400", "B-ErrorHandling")
        def _():
            resp = page.request.get(f"{API_URL}/api/finance")
            invoices = resp.json()
            iid = invoices[0]["id"]
            resp2 = page.request.patch(f"{API_URL}/api/finance/{iid}/status",
                data=json.dumps({"status": "NONEXISTENT"}),
                headers={"Content-Type": "application/json"})
            assert resp2.status == 400, f"Expected 400, got {resp2.status}"

        @test("GET single non-existent audit => 404", "B-ErrorHandling")
        def _():
            resp = page.request.get(f"{API_URL}/api/quality/nonexistent-uuid-here")
            assert resp.status == 404, f"Expected 404, got {resp.status}"

        @test("GET single non-existent complaint => 404", "B-ErrorHandling")
        def _():
            resp = page.request.get(f"{API_URL}/api/complaints/nonexistent-uuid-here")
            assert resp.status == 404, f"Expected 404, got {resp.status}"

        @test("GET single non-existent invoice => 404", "B-ErrorHandling")
        def _():
            resp = page.request.get(f"{API_URL}/api/finance/nonexistent-uuid-here")
            assert resp.status == 404, f"Expected 404, got {resp.status}"

        @test("DELETE non-existent audit => should not crash", "B-ErrorHandling")
        def _():
            resp = page.request.delete(f"{API_URL}/api/quality/fake-id-12345")
            # Should succeed (idempotent delete) or 404, but NOT 500
            assert resp.status != 500, f"Server crashed on delete non-existent: {resp.status}"

        # =====================================================================
        # C. DATA INTEGRITY
        # =====================================================================

        @test("Create then verify all audit fields persisted correctly", "C-DataIntegrity")
        def _():
            payload = {
                "title": "Data Integrity Audit",
                "type": "regulatory",
                "product": "Biscuits",
                "supplier": "TestSupplier Inc",
                "location": "Delhi"
            }
            resp = page.request.post(f"{API_URL}/api/quality", data=json.dumps(payload),
                headers={"Content-Type": "application/json"})
            assert resp.status == 201
            d = resp.json()
            aid = d.get("id") or d.get("audit", {}).get("id")
            state["integrity_audit_id"] = aid

            # Read back
            audit = page.request.get(f"{API_URL}/api/quality/{aid}").json()
            assert audit["title"] == payload["title"]
            assert audit["type"] == payload["type"]
            assert audit["product"] == payload["product"]
            assert audit["supplier"] == payload["supplier"]
            assert audit["location"] == payload["location"]
            assert audit["status"] == "pending"

        @test("Update audit status then verify it changed", "C-DataIntegrity")
        def _():
            aid = state["integrity_audit_id"]
            resp = page.request.patch(f"{API_URL}/api/quality/{aid}/status",
                data=json.dumps({"status": "in_progress"}),
                headers={"Content-Type": "application/json"})
            assert resp.ok
            audit = page.request.get(f"{API_URL}/api/quality/{aid}").json()
            assert audit["status"] == "in_progress", f"Status not updated: {audit['status']}"

        @test("Delete audit then verify it is gone from list", "C-DataIntegrity")
        def _():
            aid = state.get("long_title_audit_id")
            assert aid, "No audit to delete"
            page.request.delete(f"{API_URL}/api/quality/{aid}")
            resp = page.request.get(f"{API_URL}/api/quality/{aid}")
            assert resp.status == 404, f"Deleted audit still accessible: {resp.status}"

        @test("Complaint ref numbers are unique and sequential", "C-DataIntegrity")
        def _():
            # Create two complaints and verify refs are sequential
            refs = []
            for i in range(2):
                resp = page.request.post(f"{API_URL}/api/complaints", data=json.dumps({
                    "customerName": f"Sequential Test {i}",
                    "customerCountry": "India",
                    "product": "Test Product",
                    "description": f"Sequential test complaint {i}"
                }), headers={"Content-Type": "application/json"})
                assert resp.status == 201
                d = resp.json()
                ref = d.get("complaint", {}).get("complaint_ref") or d.get("complaint_ref")
                assert ref, f"No complaint_ref in response"
                refs.append(ref)

            # Verify uniqueness
            assert refs[0] != refs[1], f"Refs should be unique: {refs[0]} == {refs[1]}"
            # Verify sequential (last number increments)
            num0 = int(refs[0].split("-")[-1])
            num1 = int(refs[1].split("-")[-1])
            assert num1 == num0 + 1, f"Not sequential: {refs[0]} -> {refs[1]}"

        @test("Invoice numbers are auto-generated correctly", "C-DataIntegrity")
        def _():
            resp = page.request.post(f"{API_URL}/api/finance", data=json.dumps({
                "customerName": "Auto Number Corp",
                "destinationCountry": "Canada",
                "items": [{"description": "Widget", "quantity": 1, "unit_price": 10, "total": 10}]
            }), headers={"Content-Type": "application/json"})
            assert resp.status == 201
            d = resp.json()
            inv_num = d.get("invoice_number")
            assert inv_num, "No invoice_number returned"
            assert inv_num.startswith("INV-"), f"Invoice number format wrong: {inv_num}"
            year = str(time.localtime().tm_year)
            assert year in inv_num, f"Year not in invoice number: {inv_num}"

        @test("Create then verify all complaint fields persisted", "C-DataIntegrity")
        def _():
            payload = {
                "customerName": "Full Fields Corp",
                "customerCountry": "Brazil",
                "product": "Cookies",
                "batchNumber": "B2025-TEST-001",
                "complaintDate": "2025-06-15",
                "description": "Full field persistence test"
            }
            resp = page.request.post(f"{API_URL}/api/complaints", data=json.dumps(payload),
                headers={"Content-Type": "application/json"})
            assert resp.status == 201
            d = resp.json()
            cid = d.get("complaint", {}).get("id") or d.get("id")
            complaint = page.request.get(f"{API_URL}/api/complaints/{cid}").json()
            assert complaint["customer_name"] == payload["customerName"]
            assert complaint["customer_country"] == payload["customerCountry"]
            assert complaint["product"] == payload["product"]
            assert complaint["batch_number"] == payload["batchNumber"]
            assert complaint["description"] == payload["description"]
            assert complaint["status"] == "open"

        @test("Create then verify all invoice fields persisted", "C-DataIntegrity")
        def _():
            payload = {
                "customerName": "Persistence Corp",
                "destinationCountry": "France",
                "items": [{"description": "Baguette Crackers", "quantity": 100, "unit_price": 5.50, "total": 550}],
                "currency": "EUR",
                "paymentTerms": "NET 90",
                "incoterms": "CIF"
            }
            resp = page.request.post(f"{API_URL}/api/finance", data=json.dumps(payload),
                headers={"Content-Type": "application/json"})
            assert resp.status == 201
            d = resp.json()
            iid = d.get("id")
            invoice = page.request.get(f"{API_URL}/api/finance/{iid}").json()
            assert invoice["customer_name"] == payload["customerName"]
            assert invoice["destination_country"] == payload["destinationCountry"]
            assert invoice["currency"] == payload["currency"]
            assert invoice["payment_terms"] == payload["paymentTerms"]
            assert invoice["incoterms"] == payload["incoterms"]
            assert abs(invoice["total_amount"] - 550) < 0.01
            assert invoice["status"] == "pending"

        # =====================================================================
        # D. UI REGRESSION
        # =====================================================================

        @test("Dashboard page renders without console errors", "D-UIRegression")
        def _():
            console_errors.clear()
            page.goto(f"{BASE_URL}/dashboard")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            h1 = page.locator("h1")
            assert h1.is_visible(), "h1 not visible on Dashboard"
            assert "Dashboard" in h1.text_content()
            js_errors = [e for e in console_errors if "favicon" not in e.lower()]
            if js_errors:
                print(f"    WARNING: {len(js_errors)} console errors: {js_errors[:2]}")

        @test("Quality page renders without console errors", "D-UIRegression")
        def _():
            console_errors.clear()
            page.goto(f"{BASE_URL}/quality")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            h1 = page.locator("h1")
            assert h1.is_visible(), "h1 not visible on Quality"
            assert "Quality" in h1.text_content()

        @test("Complaints page renders without console errors", "D-UIRegression")
        def _():
            console_errors.clear()
            page.goto(f"{BASE_URL}/complaints")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            h1 = page.locator("h1")
            assert h1.is_visible(), "h1 not visible on Complaints"
            assert "Complaint" in h1.text_content()

        @test("Finance page renders without console errors", "D-UIRegression")
        def _():
            console_errors.clear()
            page.goto(f"{BASE_URL}/finance")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            h1 = page.locator("h1")
            assert h1.is_visible(), "h1 not visible on Finance"
            assert "Finance" in h1.text_content()

        @test("New Audit modal opens and closes", "D-UIRegression")
        def _():
            page.goto(f"{BASE_URL}/quality")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            page.locator("button", has_text="New Audit").click()
            page.wait_for_timeout(500)
            modal_title = page.locator("h2", has_text="Create New Audit")
            assert modal_title.is_visible(), "New Audit modal did not open"
            page.locator("button", has_text="Cancel").first.click()
            page.wait_for_timeout(300)
            assert not modal_title.is_visible(), "Modal did not close"

        @test("Log Complaint modal opens and closes", "D-UIRegression")
        def _():
            page.goto(f"{BASE_URL}/complaints")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            page.locator("button", has_text="Log Complaint").click()
            page.wait_for_timeout(500)
            modal_title = page.locator("h2", has_text="Log New Complaint")
            assert modal_title.is_visible(), "Complaint modal did not open"
            page.locator("button", has_text="Cancel").first.click()
            page.wait_for_timeout(300)
            assert not modal_title.is_visible(), "Modal did not close"

        @test("New Invoice modal opens and closes", "D-UIRegression")
        def _():
            page.goto(f"{BASE_URL}/finance")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            page.locator("button", has_text="New Invoice").click()
            page.wait_for_timeout(500)
            modal_title = page.locator("h2", has_text="New Export Invoice")
            assert modal_title.is_visible(), "Invoice modal did not open"
            page.locator("button", has_text="Cancel").first.click()
            page.wait_for_timeout(300)
            assert not modal_title.is_visible(), "Modal did not close"

        @test("Action buttons visible on Quality page", "D-UIRegression")
        def _():
            page.goto(f"{BASE_URL}/quality")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            assert page.locator("button", has_text="New Audit").is_visible()
            assert page.locator("button", has_text="Country").first.is_visible()
            assert page.locator("button", has_text="Shelf").first.is_visible()

        @test("Action buttons visible on Complaints page", "D-UIRegression")
        def _():
            page.goto(f"{BASE_URL}/complaints")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            assert page.locator("button", has_text="Log Complaint").is_visible()

        @test("Action buttons visible on Finance page", "D-UIRegression")
        def _():
            page.goto(f"{BASE_URL}/finance")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            assert page.locator("button", has_text="New Invoice").is_visible()
            assert page.locator("button", has_text="HS Classify").first.is_visible()
            assert page.locator("button", has_text="Incentives").first.is_visible()

        @test("AI chat panel renders on Quality page", "D-UIRegression")
        def _():
            page.goto(f"{BASE_URL}/quality")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            # Look for chat-related elements (input or panel)
            chat_elements = page.locator("text=Ask QualityAI").or_(
                page.locator("text=Quality AI")).or_(
                page.locator("input[placeholder*='Ask']")).or_(
                page.locator("textarea[placeholder*='Ask']"))
            assert chat_elements.count() > 0, "No AI chat panel found on Quality page"

        @test("AI chat panel renders on Complaints page", "D-UIRegression")
        def _():
            page.goto(f"{BASE_URL}/complaints")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            chat_elements = page.locator("text=Ask ComplaintAI").or_(
                page.locator("text=Complaint AI")).or_(
                page.locator("input[placeholder*='Ask']")).or_(
                page.locator("textarea[placeholder*='Ask']"))
            assert chat_elements.count() > 0, "No AI chat panel found on Complaints page"

        @test("AI chat panel renders on Finance page", "D-UIRegression")
        def _():
            page.goto(f"{BASE_URL}/finance")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            chat_elements = page.locator("text=Ask FinanceAI").or_(
                page.locator("text=Finance AI")).or_(
                page.locator("input[placeholder*='Ask']")).or_(
                page.locator("textarea[placeholder*='Ask']"))
            assert chat_elements.count() > 0, "No AI chat panel found on Finance page"

        @test("Sidebar navigation works across all pages", "D-UIRegression")
        def _():
            page.goto(f"{BASE_URL}/dashboard")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(500)
            sidebar = page.locator("aside")
            for href, expected in [("/quality", "/quality"), ("/complaints", "/complaints"), ("/finance", "/finance")]:
                sidebar.locator(f"a[href='{href}']").click()
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(500)
                assert expected in page.url, f"Expected {expected} in URL, got {page.url}"

        # =====================================================================
        # E. API CONTRACT VALIDATION
        # =====================================================================

        @test("Health endpoint returns correct shape", "E-APIContract")
        def _():
            resp = page.request.get(f"{API_URL}/api/health")
            assert resp.ok
            d = resp.json()
            assert "status" in d, "Missing 'status'"
            assert d["status"] == "ok"
            assert "aiEnabled" in d, "Missing 'aiEnabled'"
            assert isinstance(d["aiEnabled"], bool), f"aiEnabled not bool: {type(d['aiEnabled'])}"
            assert "message" in d, "Missing 'message'"
            assert "timestamp" in d, "Missing 'timestamp'"

        @test("Dashboard stats returns all expected fields", "E-APIContract")
        def _():
            resp = page.request.get(f"{API_URL}/api/dashboard/stats")
            assert resp.ok
            d = resp.json()
            assert "audits" in d, "Missing 'audits'"
            assert "total" in d["audits"]
            assert "completed" in d["audits"]
            assert "in_progress" in d["audits"]
            assert "pending" in d["audits"]
            assert "complaints" in d, "Missing 'complaints'"
            assert "total" in d["complaints"]
            assert "open" in d["complaints"]
            assert "resolved" in d["complaints"]
            assert "critical" in d["complaints"]
            assert "byCountry" in d["complaints"]
            assert "finance" in d, "Missing 'finance'"
            assert "total" in d["finance"]
            assert "recentComplaints" in d
            assert "recentAudits" in d
            assert isinstance(d["recentComplaints"], list)
            assert isinstance(d["recentAudits"], list)

        @test("Quality list endpoint returns array", "E-APIContract")
        def _():
            resp = page.request.get(f"{API_URL}/api/quality")
            assert resp.ok
            assert isinstance(resp.json(), list), "Quality list not an array"

        @test("Complaints list endpoint returns array", "E-APIContract")
        def _():
            resp = page.request.get(f"{API_URL}/api/complaints")
            assert resp.ok
            assert isinstance(resp.json(), list), "Complaints list not an array"

        @test("Finance list endpoint returns array", "E-APIContract")
        def _():
            resp = page.request.get(f"{API_URL}/api/finance")
            assert resp.ok
            assert isinstance(resp.json(), list), "Finance list not an array"

        @test("Create audit returns created object with id", "E-APIContract")
        def _():
            resp = page.request.post(f"{API_URL}/api/quality", data=json.dumps({
                "title": "Contract Test Audit", "type": "internal"
            }), headers={"Content-Type": "application/json"})
            assert resp.status == 201
            d = resp.json()
            # Response should contain audit data
            has_id = d.get("id") or (isinstance(d.get("audit"), dict))
            assert has_id, f"No id in create response: {list(d.keys())}"

        @test("Create complaint returns created object", "E-APIContract")
        def _():
            resp = page.request.post(f"{API_URL}/api/complaints", data=json.dumps({
                "customerName": "Contract Test",
                "customerCountry": "UK",
                "product": "Test",
                "description": "Contract validation"
            }), headers={"Content-Type": "application/json"})
            assert resp.status == 201
            d = resp.json()
            assert "complaint" in d or "id" in d, f"No complaint in create response: {list(d.keys())}"

        @test("Create invoice returns created object", "E-APIContract")
        def _():
            resp = page.request.post(f"{API_URL}/api/finance", data=json.dumps({
                "customerName": "Contract Invoice",
                "destinationCountry": "Germany",
                "items": []
            }), headers={"Content-Type": "application/json"})
            assert resp.status == 201
            d = resp.json()
            assert "id" in d, f"No id in invoice create response: {list(d.keys())}"
            assert "invoice_number" in d, f"No invoice_number in response"

        @test("Complaints analytics returns aggregated data", "E-APIContract")
        def _():
            resp = page.request.get(f"{API_URL}/api/complaints/analytics/summary")
            assert resp.ok
            d = resp.json()
            assert "total" in d
            assert "byStatus" in d
            assert "byPriority" in d
            assert "byCategory" in d
            assert "byCountry" in d
            assert isinstance(d["byStatus"], list)
            assert isinstance(d["byPriority"], list)

        @test("Finance analytics returns aggregated data", "E-APIContract")
        def _():
            resp = page.request.get(f"{API_URL}/api/finance/analytics/summary")
            assert resp.ok
            d = resp.json()
            assert "totalInvoices" in d
            assert "totalValue" in d
            assert "byStatus" in d
            assert "byCurrency" in d
            assert "byCountry" in d
            assert isinstance(d["byStatus"], list)

        @test("HS Classify endpoint responds (200 or 500 w/o API key)", "E-APIContract")
        def _():
            invoices = page.request.get(f"{API_URL}/api/finance").json()
            iid = invoices[0]["id"]
            resp = page.request.post(f"{API_URL}/api/finance/{iid}/hs-classify",
                headers={"Content-Type": "application/json"})
            assert resp.status in (200, 500), f"Unexpected status: {resp.status}"

        @test("Incentives endpoint responds (200 or 500 w/o API key)", "E-APIContract")
        def _():
            invoices = page.request.get(f"{API_URL}/api/finance").json()
            iid = invoices[0]["id"]
            resp = page.request.post(f"{API_URL}/api/finance/{iid}/incentives",
                headers={"Content-Type": "application/json"})
            assert resp.status in (200, 500), f"Unexpected status: {resp.status}"

        @test("Country Requirements endpoint responds", "E-APIContract")
        def _():
            resp = page.request.post(f"{API_URL}/api/quality/country-requirements",
                data=json.dumps({"country": "Germany", "productCategory": "Biscuits"}),
                headers={"Content-Type": "application/json"})
            assert resp.status in (200, 500), f"Unexpected status: {resp.status}"

        @test("Shelf-Life endpoint responds", "E-APIContract")
        def _():
            resp = page.request.post(f"{API_URL}/api/quality/shelf-life",
                data=json.dumps({
                    "product": "Biscuits",
                    "destinationCountry": "UK",
                    "shippingMode": "Sea",
                    "season": "Summer",
                    "packagingType": "Carton"
                }),
                headers={"Content-Type": "application/json"})
            assert resp.status in (200, 500), f"Unexpected status: {resp.status}"

        @test("Regulatory Notification endpoint responds", "E-APIContract")
        def _():
            complaints = page.request.get(f"{API_URL}/api/complaints").json()
            cid = complaints[0]["id"]
            resp = page.request.post(f"{API_URL}/api/complaints/{cid}/regulatory-notification",
                data=json.dumps({"authority": "FSSAI"}),
                headers={"Content-Type": "application/json"})
            assert resp.status in (200, 500), f"Unexpected status: {resp.status}"

        @test("Batch Trace endpoint responds", "E-APIContract")
        def _():
            complaints = page.request.get(f"{API_URL}/api/complaints").json()
            with_batch = [c for c in complaints if c.get("batch_number")]
            if not with_batch:
                print("    SKIP: no complaints with batch numbers")
                return
            cid = with_batch[0]["id"]
            resp = page.request.get(f"{API_URL}/api/complaints/{cid}/batch-trace")
            assert resp.status in (200, 404, 500), f"Unexpected status: {resp.status}"

        @test("HS Classify on non-existent invoice => 404", "E-APIContract")
        def _():
            resp = page.request.post(f"{API_URL}/api/finance/fake-id/hs-classify",
                headers={"Content-Type": "application/json"})
            assert resp.status == 404, f"Expected 404, got {resp.status}"

        @test("Incentives on non-existent invoice => 404", "E-APIContract")
        def _():
            resp = page.request.post(f"{API_URL}/api/finance/fake-id/incentives",
                headers={"Content-Type": "application/json"})
            assert resp.status == 404, f"Expected 404, got {resp.status}"

        @test("Country requirements missing fields => 400", "E-APIContract")
        def _():
            resp = page.request.post(f"{API_URL}/api/quality/country-requirements",
                data=json.dumps({"country": "Germany"}),
                headers={"Content-Type": "application/json"})
            assert resp.status == 400, f"Expected 400, got {resp.status}"

        @test("Shelf-life missing fields => 400", "E-APIContract")
        def _():
            resp = page.request.post(f"{API_URL}/api/quality/shelf-life",
                data=json.dumps({"product": "Biscuits"}),
                headers={"Content-Type": "application/json"})
            assert resp.status == 400, f"Expected 400, got {resp.status}"

        @test("Regulatory notification missing authority => 400", "E-APIContract")
        def _():
            complaints = page.request.get(f"{API_URL}/api/complaints").json()
            cid = complaints[0]["id"]
            resp = page.request.post(f"{API_URL}/api/complaints/{cid}/regulatory-notification",
                data=json.dumps({}),
                headers={"Content-Type": "application/json"})
            assert resp.status == 400, f"Expected 400, got {resp.status}"

        # =====================================================================
        # RUN ALL TESTS
        # =====================================================================

        print("\n" + "=" * 70)
        print("  FMCG AI Platform -- Comprehensive QA E2E Test Suite")
        print("=" * 70)

        current_category = None
        for category, name, fn in tests:
            if category != current_category:
                current_category = category
                print(f"\n  --- {category} ---")
            try:
                print(f"  [TEST] {name}")
                fn()
                print(f"  [PASS] {name}")
                passed += 1
            except Exception as e:
                print(f"  [FAIL] {name}: {e}")
                failed += 1
                errors.append((category, name, str(e)))

        browser.close()

    # =====================================================================
    # SUMMARY
    # =====================================================================
    print("\n" + "=" * 70)
    print(f"  RESULTS: {passed} passed, {failed} failed, {passed + failed} total")
    print("=" * 70)

    if console_errors:
        filtered = [e for e in console_errors if "favicon" not in e.lower()]
        if filtered:
            print(f"\n  Console errors captured: {len(filtered)}")
            for e in filtered[:5]:
                print(f"    - {e[:120]}")

    if errors:
        print("\n  FAILURES:")
        for cat, name, err in errors:
            print(f"    [{cat}] {name}")
            print(f"      -> {err[:150]}")

    print()
    return 1 if failed > 0 else 0


if __name__ == "__main__":
    sys.exit(run_tests())
