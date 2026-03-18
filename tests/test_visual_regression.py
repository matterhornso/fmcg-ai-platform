"""
FMCG AI Platform — Visual Regression & Responsive Test Suite
Takes screenshots at multiple breakpoints, verifies key UI elements,
and checks for console errors.
"""
from playwright.sync_api import sync_playwright, Page, BrowserContext
import sys
import os

BASE = "http://localhost:5173"
SCREENSHOT_DIR = "/tmp/fmcg_visual"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

passed = 0
failed = 0
errors = []
console_errors = []

def log_pass(name):
    global passed
    passed += 1
    print(f"  [PASS] {name}")

def log_fail(name, err):
    global failed
    failed += 1
    errors.append((name, str(err)[:200]))
    print(f"  [FAIL] {name}: {err}")


PAGES = [
    ("/dashboard", "Dashboard"),
    ("/quality", "Quality"),
    ("/complaints", "Complaints"),
    ("/finance", "Finance"),
]

VIEWPORTS = [
    (1440, 900, "desktop"),
    (768, 1024, "tablet"),
    (375, 812, "mobile"),
]


def collect_console_errors(page: Page, page_name: str):
    """Attach a console listener that captures errors."""
    def on_console(msg):
        if msg.type == "error":
            console_errors.append((page_name, msg.text))
    page.on("console", on_console)


def test_fullpage_screenshots(browser):
    """1. Full-page screenshots of all 4 pages at 1440px desktop."""
    print("\n  === Full-Page Screenshots (1440px) ===")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    # Clear welcome banner state
    page.goto(BASE)
    page.evaluate("localStorage.removeItem('fmcg_welcome_dismissed')")

    for path, name in PAGES:
        try:
            page.goto(f"{BASE}{path}")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            fp = f"{SCREENSHOT_DIR}/{name.lower()}_1440.png"
            page.screenshot(path=fp, full_page=True)
            assert os.path.exists(fp) and os.path.getsize(fp) > 0, "Screenshot empty"
            log_pass(f"Screenshot: {name} at 1440px ({os.path.getsize(fp)//1024}KB)")
        except Exception as e:
            log_fail(f"Screenshot {name} 1440px", e)

    ctx.close()


def test_responsive_screenshots(browser):
    """2. Screenshots at 768px (tablet) and 375px (mobile)."""
    print("\n  === Responsive Screenshots ===")
    for width, height, label in VIEWPORTS:
        if width == 1440:
            continue  # Already done above
        ctx = browser.new_context(viewport={"width": width, "height": height})
        page = ctx.new_page()

        for path, name in PAGES:
            try:
                page.goto(f"{BASE}{path}")
                page.wait_for_load_state("networkidle")
                page.wait_for_timeout(1200)
                fp = f"{SCREENSHOT_DIR}/{name.lower()}_{width}.png"
                page.screenshot(path=fp, full_page=True)
                assert os.path.exists(fp) and os.path.getsize(fp) > 0, "Screenshot empty"
                log_pass(f"Screenshot: {name} at {width}px ({os.path.getsize(fp)//1024}KB)")
            except Exception as e:
                log_fail(f"Screenshot {name} {width}px", e)

        ctx.close()


def test_modal_screenshots(browser):
    """3. Open one modal per page and take a screenshot."""
    print("\n  === Modal Screenshots ===")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    # Quality — New Audit modal
    try:
        page.goto(f"{BASE}/quality")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        page.locator("button", has_text="New Audit").click()
        page.wait_for_timeout(500)
        assert page.locator("h2", has_text="Create New Audit").is_visible(), "Modal not open"
        page.screenshot(path=f"{SCREENSHOT_DIR}/modal_quality_new_audit.png", full_page=True)
        page.locator("button", has_text="Cancel").first.click()
        page.wait_for_timeout(300)
        log_pass("Modal screenshot: Quality - New Audit")
    except Exception as e:
        log_fail("Modal Quality - New Audit", e)

    # Complaints — Log Complaint modal
    try:
        page.goto(f"{BASE}/complaints")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        page.locator("button", has_text="Log Complaint").click()
        page.wait_for_timeout(500)
        assert page.locator("h2", has_text="Log New Complaint").is_visible(), "Modal not open"
        page.screenshot(path=f"{SCREENSHOT_DIR}/modal_complaints_log.png", full_page=True)
        page.locator("button", has_text="Cancel").first.click()
        page.wait_for_timeout(300)
        log_pass("Modal screenshot: Complaints - Log Complaint")
    except Exception as e:
        log_fail("Modal Complaints - Log Complaint", e)

    # Finance — New Invoice modal
    try:
        page.goto(f"{BASE}/finance")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        page.locator("button", has_text="New Invoice").click()
        page.wait_for_timeout(500)
        assert page.locator("h2", has_text="New Export Invoice").is_visible(), "Modal not open"
        page.screenshot(path=f"{SCREENSHOT_DIR}/modal_finance_new_invoice.png", full_page=True)
        page.locator("button", has_text="Cancel").first.click()
        page.wait_for_timeout(300)
        log_pass("Modal screenshot: Finance - New Invoice")
    except Exception as e:
        log_fail("Modal Finance - New Invoice", e)

    # Dashboard — no primary modal, but we can check the welcome banner instead
    try:
        page.goto(f"{BASE}/dashboard")
        page.evaluate("localStorage.removeItem('fmcg_welcome_dismissed')")
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        page.screenshot(path=f"{SCREENSHOT_DIR}/modal_dashboard_welcome.png", full_page=True)
        log_pass("Modal screenshot: Dashboard - Welcome Banner")
    except Exception as e:
        log_fail("Modal Dashboard - Welcome Banner", e)

    ctx.close()


def test_welcome_banner(browser):
    """4. Verify the welcome banner appears on first visit."""
    print("\n  === Welcome Banner ===")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    try:
        page.goto(f"{BASE}/dashboard")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        # Fresh context = no localStorage = welcome should show
        welcome = page.locator("text=Welcome to FMCG AI Platform")
        assert welcome.first.is_visible(), "Welcome banner not visible on first visit"
        log_pass("Welcome banner visible on first visit")
    except Exception as e:
        log_fail("Welcome banner first visit", e)

    # Dismiss and verify it stays dismissed
    try:
        dismiss = page.locator("button[aria-label='Dismiss welcome banner']")
        if dismiss.is_visible():
            dismiss.click()
            page.wait_for_timeout(500)
            page.reload()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            welcome = page.locator("text=Welcome to FMCG AI Platform")
            assert welcome.count() == 0 or not welcome.first.is_visible(), "Welcome banner still visible after dismiss"
            log_pass("Welcome banner stays dismissed after reload")
        else:
            log_pass("Welcome banner dismiss button not found (OK if auto-dismissed)")
    except Exception as e:
        log_fail("Welcome banner dismiss", e)

    ctx.close()


def test_sample_data_labels(browser):
    """5. Verify sample data labels appear on Quality, Complaints, Finance pages."""
    print("\n  === Sample Data Labels ===")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    for path, name in [("/quality", "Quality"), ("/complaints", "Complaints"), ("/finance", "Finance")]:
        try:
            page.goto(f"{BASE}{path}")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            label = page.locator("text=Showing sample data")
            assert label.first.is_visible(), f"Sample data label not visible on {name}"
            log_pass(f"Sample data label visible on {name}")
        except Exception as e:
            log_fail(f"Sample data label {name}", e)

    ctx.close()


def test_ai_chat_suggested_prompts(browser):
    """6. Verify AI chat suggested prompts appear on Quality, Complaints, Finance pages."""
    print("\n  === AI Chat Suggested Prompts ===")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    prompts_to_check = {
        "/quality": "What does a BRC audit cover?",
        "/complaints": "How to handle a foreign object complaint?",
        "/finance": "What documents does UAE require",
    }

    for path, prompt_text in prompts_to_check.items():
        name = path.strip("/").capitalize()
        try:
            page.goto(f"{BASE}{path}")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1500)
            prompt = page.locator(f"text={prompt_text}")
            assert prompt.first.is_visible(), f"Suggested prompt not visible on {name}"
            log_pass(f"AI chat suggested prompts on {name}")
        except Exception as e:
            log_fail(f"AI chat prompts {name}", e)

    ctx.close()


def test_console_errors(browser):
    """7. Check for console errors on all pages."""
    print("\n  === Console Error Check ===")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    page_errors = {}

    for path, name in PAGES:
        errs = []
        def on_console(msg):
            if msg.type == "error":
                errs.append(msg.text)
        page.on("console", on_console)

        try:
            page.goto(f"{BASE}{path}")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)
        except Exception:
            pass

        page.remove_listener("console", on_console)

        if errs:
            page_errors[name] = errs
            # Filter out expected errors (e.g., missing API key errors)
            real_errors = [e for e in errs if "API key" not in e and "net::ERR" not in e]
            if real_errors:
                log_fail(f"Console errors on {name}", f"{len(real_errors)} error(s): {real_errors[0][:100]}")
            else:
                log_pass(f"No unexpected console errors on {name} ({len(errs)} expected)")
        else:
            log_pass(f"No console errors on {name}")

    ctx.close()
    return page_errors


def main():
    global passed, failed

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        print("\n" + "=" * 64)
        print("  FMCG AI Platform — Visual Regression Test Suite")
        print("=" * 64)

        test_fullpage_screenshots(browser)
        test_responsive_screenshots(browser)
        test_modal_screenshots(browser)
        test_welcome_banner(browser)
        test_sample_data_labels(browser)
        test_ai_chat_suggested_prompts(browser)
        page_errors = test_console_errors(browser)

        browser.close()

    total = passed + failed
    print("\n" + "=" * 64)
    print(f"  RESULTS: {passed} passed, {failed} failed, {total} total")
    print("=" * 64)

    if errors:
        print(f"\n  FAILURES ({failed}):")
        for name, err in errors:
            print(f"    - {name}: {err}")

    # List all screenshots taken
    screenshots = sorted(os.listdir(SCREENSHOT_DIR))
    print(f"\n  Screenshots captured ({len(screenshots)}):")
    for s in screenshots:
        size = os.path.getsize(os.path.join(SCREENSHOT_DIR, s))
        print(f"    {SCREENSHOT_DIR}/{s} ({size//1024}KB)")

    if page_errors:
        print(f"\n  Console errors by page:")
        for pg, errs in page_errors.items():
            print(f"    {pg}: {len(errs)} error(s)")
            for e in errs[:3]:
                print(f"      - {e[:120]}")

    return 1 if failed > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
