from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto('http://127.0.0.1:8080/web/prompt-builder/index.html')
    page.screenshot(path='prompt_builder_screenshot.png', full_page=True)
    browser.close()
