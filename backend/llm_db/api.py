import urllib.request
import re
from typing import List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import backend.llm_db.db as db
from urllib.parse import urljoin
import logging

router = APIRouter(prefix="/api/llm-db", tags=["llm-db"])

class IngestRequest(BaseModel):
    url: str
    name: str

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

def fetch_url(url: str) -> str:
    if not url.lower().startswith(('http://', 'https://')):
        logging.error(f"Security blocked non-HTTP URL: {url}")
        return ""

    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
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
    background_tasks.add_task(process_ingestion, req.url, req.name)
    return {"status": "Ingestion started", "url": req.url}

@router.get("/sources", response_model=List[SourceResponse])
def get_sources():
    return db.get_sources()

@router.get("/docs", response_model=List[DocumentResponse])
def search_docs(q: str = "", source_id: Optional[int] = None):
    return db.search_documents(q, source_id)

@router.get("/docs/{doc_id}", response_model=DocumentResponse)
def get_doc(doc_id: int):
    doc = db.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
