import logging
import re
import socket
import urllib.request
from ipaddress import ip_address
from typing import List, Optional
from urllib.parse import urljoin, urlparse

import backend.llm_db.db as db
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Path
from pydantic import BaseModel, Field, HttpUrl

router = APIRouter(prefix="/api/llm-db", tags=["llm-db"])
ALLOWED_FETCH_SCHEMES = {"http", "https"}
DEFAULT_FETCH_PORTS = {"http": 80, "https": 443}

class IngestRequest(BaseModel):
    url: HttpUrl
    name: str = Field(..., min_length=1, max_length=200)

class DocumentResponse(BaseModel):
    id: int
    title: str
    url: str
    content: Optional[str] = None
    source_id: int
    source_name: str

class SourceResponse(BaseModel):
    id: int
    name: str
    base_url: str

def _resolve_hostname_addresses(hostname: str, port: int) -> List[str]:
    addresses: List[str] = []
    for _, _, _, _, sockaddr in socket.getaddrinfo(
        hostname,
        port,
        proto=socket.IPPROTO_TCP,
        type=socket.SOCK_STREAM,
    ):
        candidate = sockaddr[0]
        if candidate not in addresses:
            addresses.append(candidate)
    return addresses

def _is_safe_fetch_url(url: str) -> bool:
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    if scheme not in ALLOWED_FETCH_SCHEMES:
        logging.error("Security blocked non-HTTP URL: %s", url)
        return False

    if not parsed.hostname:
        logging.error("Security blocked malformed URL with no hostname: %s", url)
        return False

    try:
        port = parsed.port or DEFAULT_FETCH_PORTS[scheme]
    except ValueError as exc:
        logging.error("Security blocked URL with invalid port '%s': %s", url, exc)
        return False

    try:
        addresses = _resolve_hostname_addresses(parsed.hostname, port)
    except socket.gaierror as exc:
        logging.error("Security blocked URL '%s': DNS lookup failed: %s", url, exc)
        return False

    if not addresses:
        logging.error("Security blocked URL '%s': no IP addresses resolved", url)
        return False

    blocked_addresses = []
    for candidate in addresses:
        resolved_ip = ip_address(candidate)
        if not resolved_ip.is_global:
            blocked_addresses.append(candidate)

    if blocked_addresses:
        logging.error(
            "Security blocked URL '%s': non-global address(es) resolved: %s",
            url,
            ", ".join(blocked_addresses),
        )
        return False

    return True

class SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        redirect_url = urljoin(req.full_url, newurl)
        if not _is_safe_fetch_url(redirect_url):
            raise ValueError(f"Security blocked redirect URL: {redirect_url}")
        return super().redirect_request(req, fp, code, msg, headers, redirect_url)

def _build_safe_opener() -> urllib.request.OpenerDirector:
    return urllib.request.build_opener(SafeRedirectHandler)

def fetch_url(url: str) -> str:
    if not _is_safe_fetch_url(url):
        return ""

    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        opener = _build_safe_opener()
        with opener.open(req, timeout=10) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        logging.error(f"Error fetching {url}: {e}")
        return ""

def process_ingestion(url: str, name: str):
    source_id = db.add_source(name, url)
    content = fetch_url(url)
    if not content:
        return

    if url.endswith(".txt"):
        # llms.txt format parsing (markdown links)
        # Matches: [Title](url)
        links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
        for title, link in links:
            full_url = urljoin(url, link)
            doc_content = fetch_url(full_url)
            if doc_content:
                 db.add_document(source_id, title, full_url, doc_content)
    elif url.endswith(".md"):
        # Single markdown file
        title = name
        db.add_document(source_id, title, url, content)
    else:
        # Fallback to treat standard URLs as a single document
        title = name
        db.add_document(source_id, title, url, content)

@router.post("/ingest")
def ingest_source(req: IngestRequest, background_tasks: BackgroundTasks):
    url_str = str(req.url)
    if not _is_safe_fetch_url(url_str):
        raise HTTPException(status_code=400, detail="Invalid or unsafe URL")
    background_tasks.add_task(process_ingestion, url_str, req.name)
    return {"status": "Ingestion started", "url": url_str}

@router.get("/sources", response_model=List[SourceResponse])
def get_sources():
    return db.get_sources()

@router.get("/docs", response_model=List[DocumentResponse])
def search_docs(
    q: str = Query(default="", max_length=200),
    source_id: Optional[int] = Query(default=None, ge=1)
):
    return db.search_documents(q, source_id)

@router.get("/docs/{doc_id}", response_model=DocumentResponse)
def get_doc(doc_id: int = Path(..., ge=1)):
    doc = db.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
