#!/usr/bin/env python3
"""Build a sender/platform index from the current Gmail inbox.

The script uses the Gmail REST API with an access token from one of:
1. GMAIL_ACCESS_TOKEN
2. `gcloud auth application-default print-access-token`
3. `gcloud auth print-access-token`

It writes JSON, Markdown, and HTML reports under data/gmail-inbox-index by
default. It does not mutate Gmail.
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import html
import json
import os
import re
import shutil
import subprocess
import sys
import time
import traceback
import webbrowser
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from dataclasses import asdict, dataclass, field
from email.utils import parseaddr
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any


GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
DEFAULT_QUERY = "in:inbox -in:spam -in:trash"
GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
ACCOUNT_TERMS = (
    "welcome",
    "verify",
    "verification",
    "confirm your email",
    "account",
    "login",
    "sign in",
    "security",
    "password",
    "oauth",
    "google account",
)
PAID_TERMS = (
    "receipt",
    "invoice",
    "payment",
    "paid",
    "billing",
    "subscription",
    "renewal",
    "trial",
    "plan",
    "charged",
    "purchase",
)
NEWSLETTER_TERMS = (
    "newsletter",
    "digest",
    "weekly",
    "daily",
    "roundup",
    "unsubscribe",
    "substack",
)
HUMANISH_TERMS = (
    "recruiter",
    "opportunity",
    "interview",
    "application",
    "job",
    "meeting",
)


@dataclass
class MessageRecord:
    id: str
    thread_id: str
    sender_name: str
    sender_email: str
    sender_domain: str
    subject: str
    snippet: str
    labels: list[str]
    internal_date: str
    gmail_url: str


@dataclass
class EntityRecord:
    key: str
    display_name: str
    email: str
    domain: str
    url: str
    count: int = 0
    unread_count: int = 0
    important_count: int = 0
    starred_count: int = 0
    latest_date: str = ""
    labels: Counter[str] = field(default_factory=Counter)
    subjects: list[str] = field(default_factory=list)
    categories: Counter[str] = field(default_factory=Counter)
    evidence_terms: Counter[str] = field(default_factory=Counter)
    examples: list[dict[str, str]] = field(default_factory=list)


def get_access_token(token_file: Path | None = None) -> str:
    if token_file:
        token = token_from_saved_file(token_file)
        if token:
            return token

    token = os.environ.get("GMAIL_ACCESS_TOKEN")
    if token:
        return token.strip()

    bundled_gcloud = Path.home() / "AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin/gcloud.cmd"
    gcloud = (
        str(bundled_gcloud)
        if bundled_gcloud.exists()
        else shutil.which("gcloud.cmd") or shutil.which("gcloud")
    )
    commands = []
    if gcloud:
        commands.extend(
            (
                [gcloud, "auth", "application-default", "print-access-token"],
                [gcloud, "auth", "print-access-token"],
            )
        )
    for command in commands:
        try:
            result = subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
                timeout=20,
            )
        except (subprocess.SubprocessError, FileNotFoundError):
            continue
        token = result.stdout.strip()
        if token:
            return token

    adc_token = token_from_adc()
    if adc_token:
        return adc_token

    raise RuntimeError(
        "No Gmail access token found. Set GMAIL_ACCESS_TOKEN or sign in with gcloud."
    )


def adc_source_credentials() -> dict[str, str] | None:
    adc_path = Path(os.environ.get("APPDATA", "")) / "gcloud/application_default_credentials.json"
    if not adc_path.exists():
        return None
    try:
        adc = json.loads(adc_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    source = adc.get("source_credentials") if adc.get("source_credentials") else adc
    if not (source.get("client_id") and source.get("client_secret")):
        return None
    return source


def token_from_saved_file(token_file: Path) -> str | None:
    if not token_file.exists():
        return None
    try:
        payload = json.loads(token_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    client_id = payload.get("client_id")
    client_secret = payload.get("client_secret")
    refresh_token = payload.get("refresh_token")
    if not (client_id and client_secret and refresh_token):
        return None
    return refresh_access_token(client_id, client_secret, refresh_token)


def refresh_access_token(client_id: str, client_secret: str, refresh_token: str) -> str | None:
    body = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None
    return payload.get("access_token")


def token_from_adc() -> str | None:
    source = adc_source_credentials()
    if not source:
        return None
    client_id = source.get("client_id")
    client_secret = source.get("client_secret")
    refresh_token = source.get("refresh_token")
    if not (client_id and client_secret and refresh_token):
        return None
    return refresh_access_token(client_id, client_secret, refresh_token)


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    code: str | None = None
    error: str | None = None

    def do_GET(self) -> None:  # noqa: N802 - stdlib handler API
        parsed = urllib.parse.urlparse(self.path)
        values = urllib.parse.parse_qs(parsed.query)
        OAuthCallbackHandler.code = values.get("code", [None])[0]
        OAuthCallbackHandler.error = values.get("error", [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(
            b"<html><body><h1>Gmail authorization received</h1>"
            b"<p>You can return to Codex.</p></body></html>"
        )

    def log_message(self, format: str, *args: Any) -> None:
        return


def authorize(token_file: Path, port: int = 8765, auth_url_file: Path | None = None) -> None:
    source = adc_source_credentials()
    if not source:
        raise RuntimeError("No OAuth client credentials found in application_default_credentials.json.")

    client_id = source["client_id"]
    client_secret = source["client_secret"]
    redirect_uri = f"http://127.0.0.1:{port}/oauth2callback"
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": GMAIL_READONLY_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    if auth_url_file:
        auth_url_file.parent.mkdir(parents=True, exist_ok=True)
        auth_url_file.write_text(auth_url, encoding="utf-8")
    print("Open this URL to grant Gmail read-only access:")
    print(auth_url)
    try:
        webbrowser.open(auth_url)
    except Exception:
        pass

    server = HTTPServer(("127.0.0.1", port), OAuthCallbackHandler)
    server.timeout = 300
    while OAuthCallbackHandler.code is None and OAuthCallbackHandler.error is None:
        server.handle_request()
    server.server_close()

    if OAuthCallbackHandler.error:
        raise RuntimeError(f"OAuth failed: {OAuthCallbackHandler.error}")
    if not OAuthCallbackHandler.code:
        raise RuntimeError("OAuth timed out before receiving an authorization code.")

    body = urllib.parse.urlencode(
        {
            "code": OAuthCallbackHandler.code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Device OAuth start failed: HTTP {exc.code}: {body_text}") from exc
    refresh_token = payload.get("refresh_token")
    if not refresh_token:
        raise RuntimeError("OAuth completed but no refresh token was returned.")

    token_file.parent.mkdir(parents=True, exist_ok=True)
    token_file.write_text(
        json.dumps(
            {
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "scope": GMAIL_READONLY_SCOPE,
                "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"saved_token_file={token_file.resolve()}")


def device_authorize_start(state_file: Path) -> None:
    source = adc_source_credentials()
    if not source:
        raise RuntimeError("No OAuth client credentials found in application_default_credentials.json.")
    body = urllib.parse.urlencode(
        {
            "client_id": source["client_id"],
            "scope": GMAIL_READONLY_SCOPE,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://oauth2.googleapis.com/device/code",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Device OAuth start failed: HTTP {exc.code}: {body_text}") from exc
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state_file.write_text(
        json.dumps(
            {
                "client_id": source["client_id"],
                "client_secret": source["client_secret"],
                "device_code": payload["device_code"],
                "interval": payload.get("interval", 5),
                "expires_at": (
                    dt.datetime.now(dt.timezone.utc)
                    + dt.timedelta(seconds=int(payload.get("expires_in", 1800)))
                ).isoformat(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"verification_url={payload.get('verification_url') or payload.get('verification_uri')}")
    print(f"user_code={payload['user_code']}")
    print(f"expires_in_seconds={payload.get('expires_in')}")
    print(f"state_file={state_file.resolve()}")


def device_authorize_finish(state_file: Path, token_file: Path) -> None:
    if not state_file.exists():
        raise RuntimeError(f"Device authorization state file not found: {state_file}")
    state = json.loads(state_file.read_text(encoding="utf-8"))
    deadline = time.time() + 300
    interval = int(state.get("interval", 5))
    payload: dict[str, Any] | None = None
    while time.time() < deadline:
        body = urllib.parse.urlencode(
            {
                "client_id": state["client_id"],
                "client_secret": state["client_secret"],
                "device_code": state["device_code"],
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            "https://oauth2.googleapis.com/token",
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
                break
        except urllib.error.HTTPError as exc:
            error_payload = json.loads(exc.read().decode("utf-8"))
            error = error_payload.get("error")
            if error == "authorization_pending":
                time.sleep(interval)
                continue
            if error == "slow_down":
                interval += 5
                time.sleep(interval)
                continue
            raise RuntimeError(f"Device OAuth failed: {error_payload}") from exc
    if not payload:
        raise RuntimeError("Timed out waiting for device authorization.")
    refresh_token = payload.get("refresh_token")
    if not refresh_token:
        raise RuntimeError(f"Device OAuth completed without refresh token: {payload}")
    token_file.parent.mkdir(parents=True, exist_ok=True)
    token_file.write_text(
        json.dumps(
            {
                "client_id": state["client_id"],
                "client_secret": state["client_secret"],
                "refresh_token": refresh_token,
                "scope": payload.get("scope", GMAIL_READONLY_SCOPE),
                "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    try:
        state_file.unlink()
    except OSError:
        pass
    print(f"saved_token_file={token_file.resolve()}")


def gmail_request(token: str, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    params = params or {}
    url = f"{GMAIL_API}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            if exc.code in {429, 500, 502, 503, 504} and attempt < 3:
                time.sleep(2**attempt)
                continue
            raise RuntimeError(f"Gmail API error {exc.code}: {body}") from exc

    raise RuntimeError(f"Gmail API request failed after retries: {path}")


def header_value(headers: list[dict[str, str]], name: str) -> str:
    wanted = name.lower()
    for item in headers:
        if item.get("name", "").lower() == wanted:
            return item.get("value", "")
    return ""


def normalize_domain(email_address: str) -> str:
    if "@" not in email_address:
        return ""
    domain = email_address.rsplit("@", 1)[1].lower()
    return domain.removeprefix("mail.").removeprefix("email.")


def entity_key(sender_email: str, sender_domain: str) -> str:
    if sender_domain:
        return sender_domain
    return sender_email.lower()


def platform_name(sender_name: str, sender_email: str, domain: str) -> str:
    if sender_name and not re.search(r"no-?reply|notification|support", sender_name, re.I):
        return sender_name.strip()
    if domain:
        stem = domain.split(".")[-2] if domain.count(".") else domain.split(".")[0]
        return stem.replace("-", " ").title()
    return sender_email or "Unknown"


def clean_subject(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def message_from_api(item: dict[str, Any]) -> MessageRecord:
    payload = item.get("payload", {})
    headers = payload.get("headers", [])
    sender_raw = header_value(headers, "From")
    sender_name, sender_email = parseaddr(sender_raw)
    sender_domain = normalize_domain(sender_email)
    millis = int(item.get("internalDate", "0") or "0")
    timestamp = dt.datetime.fromtimestamp(millis / 1000, tz=dt.timezone.utc)
    message_id = item["id"]
    return MessageRecord(
        id=message_id,
        thread_id=item.get("threadId", ""),
        sender_name=sender_name,
        sender_email=sender_email.lower(),
        sender_domain=sender_domain,
        subject=clean_subject(header_value(headers, "Subject")),
        snippet=clean_subject(item.get("snippet", "")),
        labels=sorted(item.get("labelIds", [])),
        internal_date=timestamp.isoformat(),
        gmail_url=f"https://mail.google.com/mail/#all/{message_id}",
    )


def message_from_connector(item: dict[str, Any]) -> MessageRecord:
    sender_name, sender_email = parseaddr(item.get("from_", ""))
    sender_domain = normalize_domain(sender_email)
    timestamp = item.get("email_ts") or ""
    if timestamp and timestamp.endswith("Z"):
        timestamp = timestamp[:-1] + "+00:00"
    message_id = item["id"]
    return MessageRecord(
        id=message_id,
        thread_id=item.get("thread_id", ""),
        sender_name=sender_name,
        sender_email=sender_email.lower(),
        sender_domain=sender_domain,
        subject=clean_subject(item.get("subject", "")),
        snippet=clean_subject(item.get("snippet", "")),
        labels=sorted(item.get("labels", [])),
        internal_date=timestamp,
        gmail_url=item.get("display_url") or f"https://mail.google.com/mail/#all/{message_id}",
    )


def records_from_connector_json(path: Path) -> list[MessageRecord]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    emails = payload.get("emails") if isinstance(payload, dict) else payload
    if not isinstance(emails, list):
        raise RuntimeError("Connector JSON must be a list of emails or an object with an emails list.")
    return [message_from_connector(item) for item in emails]


def iter_messages(token: str, query: str, page_size: int, limit: int | None) -> list[MessageRecord]:
    records: list[MessageRecord] = []
    page_token = None
    while True:
        params: dict[str, Any] = {
            "q": query,
            "maxResults": min(page_size, 500),
            "format": "metadata",
            "metadataHeaders": ["From", "Subject"],
        }
        if page_token:
            params["pageToken"] = page_token
        page = gmail_request(token, "/messages", params)
        messages = page.get("messages", [])
        if not messages:
            break
        for message_ref in messages:
            message = gmail_request(
                token,
                f"/messages/{message_ref['id']}",
                {
                    "format": "metadata",
                    "metadataHeaders": ["From", "Subject"],
                },
            )
            records.append(message_from_api(message))
            if limit and len(records) >= limit:
                return records
        page_token = page.get("nextPageToken")
        if not page_token:
            break
    return records


def classify_text(subject: str, snippet: str, labels: list[str]) -> tuple[str, Counter[str]]:
    text = f"{subject} {snippet} {' '.join(labels)}".lower()
    terms: Counter[str] = Counter()
    for term in ACCOUNT_TERMS + PAID_TERMS + NEWSLETTER_TERMS + HUMANISH_TERMS:
        if term in text:
            terms[term] += 1

    if any(term in text for term in PAID_TERMS + ACCOUNT_TERMS):
        return "Money and account access", terms
    if any(term in text for term in HUMANISH_TERMS):
        return "People and work", terms
    if "CATEGORY_PROMOTIONS" in labels or any(term in text for term in NEWSLETTER_TERMS):
        return "Newsletters and marketing", terms
    return "Operational updates", terms


def importance_score(entity: EntityRecord) -> float:
    recency = 0.0
    if entity.latest_date:
        try:
            latest = dt.datetime.fromisoformat(entity.latest_date)
            age_days = max((dt.datetime.now(dt.timezone.utc) - latest).days, 0)
            recency = max(0, 30 - min(age_days, 30)) / 30
        except ValueError:
            recency = 0
    return (
        entity.count
        + entity.important_count * 1.5
        + entity.starred_count * 2
        + entity.unread_count * 0.25
        + recency * 5
        + entity.evidence_terms.total() * 1.25
    )


def aggregate(records: list[MessageRecord]) -> list[EntityRecord]:
    entities: dict[str, EntityRecord] = {}
    for record in records:
        key = entity_key(record.sender_email, record.sender_domain)
        if key not in entities:
            name = platform_name(record.sender_name, record.sender_email, record.sender_domain)
            entities[key] = EntityRecord(
                key=key,
                display_name=name,
                email=record.sender_email,
                domain=record.sender_domain,
                url=f"https://{record.sender_domain}" if record.sender_domain else "",
            )
        entity = entities[key]
        entity.count += 1
        entity.unread_count += int("UNREAD" in record.labels)
        entity.important_count += int("IMPORTANT" in record.labels)
        entity.starred_count += int("STARRED" in record.labels)
        entity.latest_date = max(entity.latest_date, record.internal_date)
        entity.labels.update(record.labels)
        category, terms = classify_text(record.subject, record.snippet, record.labels)
        entity.categories.update([category])
        entity.evidence_terms.update(terms)
        if record.subject and record.subject not in entity.subjects[:8]:
            entity.subjects.append(record.subject)
        if len(entity.examples) < 3:
            entity.examples.append(
                {
                    "date": record.internal_date[:10],
                    "subject": record.subject,
                    "url": record.gmail_url,
                }
            )
    return sorted(entities.values(), key=lambda item: (-importance_score(item), -item.count, item.key))


def entity_status(entity: EntityRecord) -> dict[str, Any]:
    top_category = entity.categories.most_common(1)[0][0] if entity.categories else "Operational updates"
    terms = set(entity.evidence_terms)
    paid = bool(terms.intersection(PAID_TERMS))
    account = bool(terms.intersection(ACCOUNT_TERMS))
    newsletter = top_category == "Newsletters and marketing" or bool(terms.intersection(NEWSLETTER_TERMS))
    return {
        "recommended_category": top_category,
        "newsletter_likely": newsletter,
        "account_likely": account,
        "paid_or_billing_likely": paid,
        "unsubscribe_candidate": newsletter and entity.count >= 2 and entity.unread_count >= max(1, entity.count // 2),
        "importance_score": round(importance_score(entity), 2),
    }


def serializable_entity(entity: EntityRecord) -> dict[str, Any]:
    data = asdict(entity)
    data["labels"] = dict(entity.labels.most_common())
    data["categories"] = dict(entity.categories.most_common())
    data["evidence_terms"] = dict(entity.evidence_terms.most_common())
    data.update(entity_status(entity))
    return data


def render_markdown(entities: list[EntityRecord], records: list[MessageRecord], query: str) -> str:
    now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    label_counts = Counter(label for record in records for label in record.labels)
    category_counts = Counter(entity_status(entity)["recommended_category"] for entity in entities)
    lines = [
        "# Gmail Inbox Index",
        "",
        f"Generated: {now}",
        f"Scope: `{query}`",
        f"Messages scanned: {len(records):,}",
        f"Sender/domain entities: {len(entities):,}",
        "",
        "## Recommended 4-Category Inbox Model",
        "",
    ]
    for category, count in category_counts.most_common():
        lines.append(f"- **{category}:** {count:,} sender/domain entities")
    lines.extend(
        [
            "",
            "## Current Label Pressure",
            "",
        ]
    )
    for label, count in label_counts.most_common(20):
        lines.append(f"- `{label}`: {count:,} messages")
    lines.extend(["", "## Top Senders And Platforms", ""])
    for idx, entity in enumerate(entities, start=1):
        status = entity_status(entity)
        labels = ", ".join(f"{name} ({count})" for name, count in entity.labels.most_common(5))
        terms = ", ".join(entity.evidence_terms.keys()) or "none"
        title = html.escape(entity.display_name)
        link = f"[{entity.domain or entity.email}]({entity.url})" if entity.url else entity.email
        flags = []
        if status["newsletter_likely"]:
            flags.append("newsletter likely")
        if status["account_likely"]:
            flags.append("account/login evidence")
        if status["paid_or_billing_likely"]:
            flags.append("paid/billing evidence")
        if status["unsubscribe_candidate"]:
            flags.append("unsubscribe candidate")
        lines.extend(
            [
                f"### {idx}. {title}",
                "",
                f"- URL/domain: {link}",
                f"- Sender email: `{entity.email}`",
                f"- Messages: {entity.count:,}; unread: {entity.unread_count:,}; important: {entity.important_count:,}; starred: {entity.starred_count:,}",
                f"- Latest email: {entity.latest_date[:10]}",
                f"- Recommended category: **{status['recommended_category']}**",
                f"- Flags: {', '.join(flags) if flags else 'none'}",
                f"- Labels observed: {labels or 'none'}",
                f"- Evidence terms: {terms}",
                "- Example subjects:",
            ]
        )
        for subject in entity.subjects[:5]:
            lines.append(f"  - {subject}")
        lines.append("")
    return "\n".join(lines)


def render_html(entities: list[EntityRecord], records: list[MessageRecord], query: str) -> str:
    now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    rows = []
    for entity in entities:
        status = entity_status(entity)
        flags = []
        if status["newsletter_likely"]:
            flags.append("Newsletter")
        if status["account_likely"]:
            flags.append("Account")
        if status["paid_or_billing_likely"]:
            flags.append("Paid/Billing")
        if status["unsubscribe_candidate"]:
            flags.append("Unsubscribe candidate")
        url = (
            f'<a href="{html.escape(entity.url)}">{html.escape(entity.domain)}</a>'
            if entity.url
            else html.escape(entity.email)
        )
        rows.append(
            "<tr>"
            f"<td>{html.escape(entity.display_name)}</td>"
            f"<td>{url}</td>"
            f"<td>{entity.count}</td>"
            f"<td>{entity.unread_count}</td>"
            f"<td>{entity.important_count}</td>"
            f"<td>{html.escape(status['recommended_category'])}</td>"
            f"<td>{html.escape(', '.join(flags) or 'None')}</td>"
            f"<td>{html.escape('; '.join(entity.subjects[:3]))}</td>"
            "</tr>"
        )
    category_counts = Counter(entity_status(entity)["recommended_category"] for entity in entities)
    category_items = "\n".join(
        f"<li><strong>{html.escape(category)}</strong>: {count:,} entities</li>"
        for category, count in category_counts.most_common()
    )
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gmail Inbox Index</title>
  <style>
    body {{ font-family: Inter, Segoe UI, Arial, sans-serif; margin: 32px; color: #172026; background: #f7f8fa; }}
    main {{ max-width: 1180px; margin: 0 auto; background: white; padding: 28px; border: 1px solid #d8dee4; }}
    h1 {{ margin: 0 0 8px; font-size: 30px; }}
    .meta {{ color: #5f6b76; margin-bottom: 24px; }}
    table {{ border-collapse: collapse; width: 100%; font-size: 13px; }}
    th, td {{ border-bottom: 1px solid #e6e9ed; padding: 9px 8px; text-align: left; vertical-align: top; }}
    th {{ position: sticky; top: 0; background: #edf2f7; }}
    tr:nth-child(even) {{ background: #fafbfc; }}
    code {{ background: #eef2f5; padding: 2px 5px; border-radius: 4px; }}
  </style>
</head>
<body>
<main>
  <h1>Gmail Inbox Index</h1>
  <p class="meta">Generated {html.escape(now)} from <code>{html.escape(query)}</code>. Messages scanned: {len(records):,}. Sender/domain entities: {len(entities):,}.</p>
  <h2>Recommended 4-Category Inbox Model</h2>
  <ul>{category_items}</ul>
  <h2>Sender And Platform Index</h2>
  <table>
    <thead>
      <tr><th>Name</th><th>Domain</th><th>Messages</th><th>Unread</th><th>Important</th><th>Category</th><th>Flags</th><th>Example Subjects</th></tr>
    </thead>
    <tbody>
      {''.join(rows)}
    </tbody>
  </table>
</main>
</body>
</html>
"""


def write_outputs(output_dir: Path, records: list[MessageRecord], entities: list[EntityRecord], query: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    summary = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "query": query,
        "message_count": len(records),
        "entity_count": len(entities),
        "entities": [serializable_entity(entity) for entity in entities],
        "messages": [asdict(record) for record in records],
    }
    (output_dir / "gmail-inbox-index.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    (output_dir / "gmail-inbox-index.md").write_text(
        render_markdown(entities, records, query),
        encoding="utf-8",
    )
    (output_dir / "gmail-inbox-index.html").write_text(
        render_html(entities, records, query),
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a Gmail inbox sender/platform index.")
    parser.add_argument("--query", default=DEFAULT_QUERY, help="Gmail search query to scan.")
    parser.add_argument("--connector-json", default=None, help="Read Gmail connector search output JSON instead of calling Gmail API.")
    parser.add_argument("--output-dir", default="data/gmail-inbox-index", help="Report output directory.")
    parser.add_argument("--page-size", type=int, default=100, help="Gmail list page size.")
    parser.add_argument("--limit", type=int, default=None, help="Optional max messages for smoke tests.")
    parser.add_argument("--token-file", default="data/gmail-inbox-index/gmail-token.json", help="Local Gmail OAuth token file.")
    parser.add_argument("--authorize", action="store_true", help="Run browser OAuth flow for Gmail read-only access.")
    parser.add_argument("--auth-url-file", default=None, help="Write the browser OAuth URL to this file before waiting.")
    parser.add_argument("--device-authorize-start", action="store_true", help="Start device-code OAuth for Gmail read-only access.")
    parser.add_argument("--device-authorize-finish", action="store_true", help="Finish device-code OAuth after approving the code.")
    parser.add_argument("--device-state-file", default="data/gmail-inbox-index/gmail-device-auth.json", help="Temporary device OAuth state file.")
    args = parser.parse_args()

    token_file = Path(args.token_file)
    if args.authorize:
        authorize(token_file, auth_url_file=Path(args.auth_url_file) if args.auth_url_file else None)
        return 0
    if args.device_authorize_start:
        device_authorize_start(Path(args.device_state_file))
        return 0
    if args.device_authorize_finish:
        device_authorize_finish(Path(args.device_state_file), token_file)
        return 0

    if args.connector_json:
        records = records_from_connector_json(Path(args.connector_json))
        if args.limit:
            records = records[: args.limit]
    else:
        token = get_access_token(token_file)
        records = iter_messages(token, args.query, args.page_size, args.limit)
    entities = aggregate(records)
    write_outputs(Path(args.output_dir), records, entities, args.query)
    print(f"scanned_messages={len(records)}")
    print(f"entities={len(entities)}")
    print(f"output_dir={Path(args.output_dir).resolve()}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        traceback.print_exc()
        raise SystemExit(1)
