import urllib.request

import pytest

from backend.llm_db import api


class DummyResponse:
    def __init__(self, payload: bytes):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return self.payload


class DummyOpener:
    def __init__(self, payload: bytes):
        self.payload = payload
        self.urls = []

    def open(self, req, timeout=10):
        self.urls.append((req.full_url, timeout))
        return DummyResponse(self.payload)


def test_fetch_url_blocks_non_http_schemes():
    assert api.fetch_url("file:///etc/passwd") == ""


def test_fetch_url_blocks_missing_hostname():
    assert api.fetch_url("https:///missing-host") == ""


def test_fetch_url_blocks_invalid_ports():
    assert api.fetch_url("https://example.com:99999/data") == ""


def test_fetch_url_blocks_non_global_ips(monkeypatch):
    opener = DummyOpener(b"should-not-load")
    monkeypatch.setattr(api, "_resolve_hostname_addresses", lambda hostname, port: ["127.0.0.1"])
    monkeypatch.setattr(api, "_build_safe_opener", lambda: opener)

    assert api.fetch_url("http://localhost/internal") == ""
    assert opener.urls == []


def test_fetch_url_blocks_mixed_public_and_private_resolution(monkeypatch):
    monkeypatch.setattr(
        api,
        "_resolve_hostname_addresses",
        lambda hostname, port: ["93.184.216.34", "10.0.0.5"],
    )

    assert api._is_safe_fetch_url("https://example.com/data") is False


def test_fetch_url_allows_public_addresses(monkeypatch):
    opener = DummyOpener(b"safe content")
    monkeypatch.setattr(api, "_resolve_hostname_addresses", lambda hostname, port: ["93.184.216.34"])
    monkeypatch.setattr(api, "_build_safe_opener", lambda: opener)

    assert api.fetch_url("https://example.com/data") == "safe content"
    assert opener.urls == [("https://example.com/data", 10)]


def test_redirect_handler_blocks_unsafe_redirect(monkeypatch):
    monkeypatch.setattr(api, "_resolve_hostname_addresses", lambda hostname, port: ["127.0.0.1"])
    handler = api.SafeRedirectHandler()
    req = urllib.request.Request("https://example.com/start")

    with pytest.raises(ValueError, match="Security blocked redirect URL"):
        handler.redirect_request(req, None, 302, "Found", {}, "http://127.0.0.1/internal")
