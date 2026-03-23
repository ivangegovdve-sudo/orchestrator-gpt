## 2026-03-11 - XSS Vulnerability in embed.js
**Vulnerability:** A Cross-Site Scripting (XSS) vulnerability was present in `web/ai-init/embed/embed.js` because user-supplied search abbreviation text (`entry.abbr` and `entry.expansion`) was rendered into the DOM using `innerHTML` without prior HTML entity escaping.
**Learning:** Even though the main application (`app.js`) included an `escapeHtml` function, the isolated `embed.js` widget was missing it and rendered text directly into HTML elements via string concatenation. This is a common pattern when building isolated embeddable scripts or widgets.
**Prevention:** When building isolated components or scripts (like `embed.js`), ensure that sanitization functions (like `escapeHtml`) are duplicated or imported appropriately before injecting any external or user-provided strings into `innerHTML`. Alternatively, use safer DOM APIs like `textContent` whenever HTML rendering is not strictly required.

## 2024-03-12 - Server-Side Request Forgery (SSRF) in LLM DB Ingestion
**Vulnerability:** The `/api/llm-db/ingest` endpoint passed unsanitized user-provided URLs to `urllib.request.urlopen`, allowing access to internal files like `file:///etc/passwd` or localhost services.
**Learning:** Using standard standard library fetching tools like `urllib.request` without validating the URL scheme inherently allows arbitrary protocol handlers (like `file://` or `ftp://`) which leads to severe SSRF vulnerabilities.
**Prevention:** Always strictly validate and restrict the permitted URL schemes (e.g., to only `http://` and `https://`) before passing any user-supplied URL to a fetching function.

## 2024-05-24 - Fix Cross-Site Scripting (XSS) in LLM DB
**Vulnerability:** The LLM Platforms DB (`web/llm-db/index.html`) directly injected user-provided data (`doc.title`, `doc.source_name`, `doc.url`) into the DOM using `innerHTML` without proper HTML escaping and URL protocol validation.
**Learning:** Vanilla JS applications in the `web/` directory that heavily use `innerHTML` for DOM updates are highly susceptible to XSS if explicit HTML sanitization functions (like `escapeHtml`) are not implemented and applied to untrusted data before injection.
**Prevention:** Always implement and apply HTML sanitization functions (like `escapeHtml`) to untrusted data before inserting it via `innerHTML`. Additionally, validate URL protocols (e.g., allowing only `http://` or `https://`) before inserting them into `href` attributes to prevent `javascript:` URI execution.

## 2024-05-24 - Overly Permissive CORS Configuration
**Vulnerability:** The FastAPI backend had `"null"` included in its `allow_origins` array alongside `allow_credentials=True`.
**Learning:** Allowing the `"null"` origin can be abused from sandboxed iframes or local-file contexts, which weakens the protection CORS is meant to provide.
**Prevention:** Avoid using `"null"` as an allowed origin when credentials are enabled. Restrict CORS origins to explicit, intended frontend endpoints only.

## 2024-05-24 - SQL Injection in PRAGMA table_info
**Vulnerability:** A SQL injection vulnerability existed in `backend/movies_db.py` because `PRAGMA table_info({table_name})` used an f-string for string concatenation. If the table name were ever derived from user input, this could allow injection of arbitrary SQL commands.
**Learning:** Standard `PRAGMA` statements in SQLite do not natively support parameterization (e.g. `PRAGMA table_info(?)`), making string formatting tempting but dangerous.
**Prevention:** To safely parameterize dynamic table name lookups in SQLite, use the table-valued function syntax: `SELECT name FROM pragma_table_info(?)`. Note that the returned tuple format changes, and the column name is accessed via `row[0]` instead of `row[1]`.
