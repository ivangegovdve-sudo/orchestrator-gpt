import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Intercept the API call to mock the response
        async def handle_route(route):
            print(f"Intercepted {route.request.url}")
            await route.fulfill(
                status=200,
                content_type="application/json",
                json={
                    "answer": "PCOS is a hormonal disorder.",
                    "rules": [{"applies_to": "Women", "rule": "Rule 1"}]
                }
            )

        await page.route("**/api/os/query", handle_route)

        # Open the local page
        print("Navigating...")
        await page.goto("http://localhost:8080/web/womens-health-os/")

        # Click the chat button to open it
        print("Clicking chat FAB...")
        await page.click("#whChatFab")

        # Enter text in the chat input
        print("Typing into chat...")
        await page.fill("#whChatInput", "What is PCOS?")

        # Click send
        print("Clicking send...")
        await page.click("#whChatSend")

        # Wait for the bot's response to be rendered
        print("Waiting for bot answer...")
        await page.wait_for_selector(".wh-msg.bot .answer", timeout=5000)

        # Get the text content of the answer
        answer_text = await page.inner_text(".wh-msg.bot .answer")
        print(f"Bot answer text: {answer_text}")

        # Get the synthesized rules text content
        refs_text = await page.inner_text(".wh-msg.bot .wh-refs")
        print(f"Refs text: {refs_text}")

        await browser.close()

asyncio.run(run())
