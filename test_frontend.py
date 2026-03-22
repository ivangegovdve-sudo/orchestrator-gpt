from playwright.sync_api import sync_playwright

def test_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Start a local server for the frontend
        import subprocess
        import time
        server = subprocess.Popen(["python3", "-m", "http.server", "8080", "--directory", "."])
        time.sleep(3) # wait for server to start

        try:
            # Navigate to the frontend
            page.goto("http://127.0.0.1:8080/frontend/index.html")

            # Fill out the form
            page.fill("#seedImageUrl", "https://example.com/seed.png")
            page.fill("#assetDescription", "A beautiful sword")

            # Mock the API response
            def handle_route(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='{"taskUUID": "test-uuid-123<script>alert(1)</script>", "imageURL": "https://example.com/sword.png?foo=\\"onmouseover=alert(1)", "rawResponse": {}}'
                )
            page.route("**/api/item-icon", handle_route)

            # Submit the form
            page.click("#generateButton")

            # Wait for the result to appear
            page.wait_for_selector(".result-item")

            # Verify the output is sanitized
            content = page.content()

            if "<script>alert(1)</script>" in content:
                print("FAILED: taskUUID was not sanitized")
                return

            if "test-uuid-123&lt;script&gt;alert(1)&lt;/script&gt;" not in content:
                print("FAILED: taskUUID was not properly sanitized")
                return

            if 'href="https://example.com/sword.png?foo=&quot;onmouseover=alert(1)"' not in content:
                print("FAILED: imageURL was not properly sanitized")
                return

            # Test invalid URL protocol
            def handle_route_invalid_protocol(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='{"taskUUID": "test-uuid-456", "imageURL": "javascript:alert(1)", "rawResponse": {}}'
                )
            page.route("**/api/item-icon", handle_route_invalid_protocol)
            page.click("#generateButton")
            page.wait_for_selector(".result-item", state="visible")

            content2 = page.content()
            if 'href="javascript:alert(1)"' in content2:
                print("FAILED: imageURL protocol was not sanitized")
                return
            if 'href="#"' not in content2:
                print("FAILED: imageURL invalid protocol was not properly neutralized")
                return

            print("SUCCESS: Frontend is working and XSS is prevented.")

        finally:
            server.terminate()
            browser.close()

if __name__ == "__main__":
    test_frontend()
