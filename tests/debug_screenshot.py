from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    # Capture console errors
    errors = []
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
    page.on("pageerror", lambda err: errors.append(f"[PAGE ERROR] {err}"))

    page.goto("http://localhost:5173/dashboard", timeout=15000)
    page.wait_for_timeout(3000)

    page.screenshot(path="/tmp/debug_dashboard.png", full_page=True)
    print(f"Screenshot saved to /tmp/debug_dashboard.png")

    # Print page HTML snippet
    html = page.content()
    print(f"\nPage title: {page.title()}")
    print(f"URL: {page.url}")
    print(f"HTML length: {len(html)}")
    print(f"\nFirst 2000 chars of body:")
    # Find body content
    import re
    body = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL)
    if body:
        print(body.group(1)[:2000])

    if errors:
        print(f"\nConsole errors ({len(errors)}):")
        for e in errors:
            print(f"  {e}")
    else:
        print("\nNo console errors")

    browser.close()
