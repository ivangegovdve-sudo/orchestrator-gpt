## 2026-03-11 - XSS Vulnerability in embed.js
**Vulnerability:** A Cross-Site Scripting (XSS) vulnerability was present in `web/ai-init/embed/embed.js` because user-supplied search abbreviation text (`entry.abbr` and `entry.expansion`) was rendered into the DOM using `innerHTML` without prior HTML entity escaping.
**Learning:** Even though the main application (`app.js`) included an `escapeHtml` function, the isolated `embed.js` widget was missing it and rendered text directly into HTML elements via string concatenation. This is a common pattern when building isolated embeddable scripts or widgets.
**Prevention:** When building isolated components or scripts (like `embed.js`), ensure that sanitization functions (like `escapeHtml`) are duplicated or imported appropriately before injecting any external or user-provided strings into `innerHTML`. Alternatively, use safer DOM APIs like `textContent` whenever HTML rendering is not strictly required.

## 2024-03-12 - Server-Side Request Forgery (SSRF) in LLM DB Ingestion
**Vulnerability:** The `/api/llm-db/ingest` endpoint passed unsanitized user-provided URLs to `urllib.request.urlopen`, allowing access to internal files like `file:///etc/passwd` or localhost services.
**Learning:** Using standard standard library fetching tools like `urllib.request` without validating the URL scheme inherently allows arbitrary protocol handlers (like `file://` or `ftp://`) which leads to severe SSRF vulnerabilities.
**Prevention:** Always strictly validate and restrict the permitted URL schemes (e.g., to only `http://` and `https://`) before passing any user-supplied URL to a fetching function.
