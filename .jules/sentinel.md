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

## 2024-06-03 - SQL Injection in Dynamic ALTER TABLE Statements

**Vulnerability:**
The `backend/movies_db.py` script was executing dynamic DDL statements (like `PRAGMA table_info` and `ALTER TABLE ADD COLUMN`) by directly using python format strings to inject identifiers (`table_name`, `column_name`, `definition`) into the SQL statement, causing a potential SQL Injection vulnerability if those identifiers ever became user-controlled.

**Learning:**
SQLite does not natively support bound parameters for identifiers (like table names or column names) in DDL statements like `ALTER TABLE` or `PRAGMA`. While `PRAGMA table_info` has an alternative functional format `pragma_table_info(?)` that does support parameterization, `ALTER TABLE` does not.

**Prevention:**
1. Whenever possible, use parameterized queries. E.g. replace `PRAGMA table_info({table_name})` with `SELECT name FROM pragma_table_info(?)`.
2. When bound parameters are unsupported (e.g. `ALTER TABLE`), ensure dynamic identifiers are strictly validated against an allowlist, or verified via methods like `str.isidentifier()` and strict type/value checking before being injected into a format string.
