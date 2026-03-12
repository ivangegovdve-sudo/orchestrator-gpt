import sqlite3
import os
import logging
from typing import List, Dict, Any, Optional
from backend.movies_db import get_connection

def add_source(name: str, base_url: str) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO llm_sources (name, base_url) VALUES (?, ?) "
            "ON CONFLICT(base_url) DO UPDATE SET updated_at = CURRENT_TIMESTAMP "
            "RETURNING id",
            (name, base_url)
        )
        row = cursor.fetchone()
        conn.commit()
        return row["id"] if row else None

def add_document(source_id: int, title: str, url: str, content: str) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO llm_documents (source_id, title, url, content) "
            "VALUES (?, ?, ?, ?) "
            "ON CONFLICT(url) DO UPDATE SET "
            "title = excluded.title, content = excluded.content, updated_at = CURRENT_TIMESTAMP "
            "RETURNING id",
            (source_id, title, url, content)
        )
        row = cursor.fetchone()
        conn.commit()
        return row["id"] if row else None

def get_sources() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM llm_sources ORDER BY name")
        return [dict(row) for row in cursor.fetchall()]

def search_documents(query: str, source_id: Optional[int] = None) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        sql = "SELECT d.id, d.title, d.url, d.source_id, s.name as source_name " \
              "FROM llm_documents d " \
              "JOIN llm_sources s ON d.source_id = s.id " \
              "WHERE (d.title LIKE ? OR d.content LIKE ?) "
        params = [f"%{query}%", f"%{query}%"]

        if source_id:
            sql += "AND d.source_id = ? "
            params.append(source_id)

        sql += "ORDER BY d.title LIMIT 50"
        cursor.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]

def get_document(doc_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT d.*, s.name as source_name "
            "FROM llm_documents d "
            "JOIN llm_sources s ON d.source_id = s.id "
            "WHERE d.id = ?",
            (doc_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None
