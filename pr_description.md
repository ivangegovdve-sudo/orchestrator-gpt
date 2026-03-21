🔒 Fix SQL Injection vulnerability in schema migration

🎯 **What:** The `_table_columns` and `_ensure_movie_columns` functions in `backend/movies_db.py` used dynamically generated SQL queries (f-strings) for `PRAGMA table_info` and `ALTER TABLE` statements without validating the identifiers (table names, column names, or definitions).

⚠️ **Risk:** While currently hardcoded to safe internal values (e.g. "movies", "imdb_id"), using string formatting for dynamic Data Definition Language (DDL) execution creates a critical SQL Injection risk. If these functions were ever refactored to accept user input or dynamic values, an attacker could inject arbitrary SQL commands, potentially dropping tables or exfiltrating data.

🛡️ **Solution:** Added a strict regex validation allowlist (`^[a-zA-Z0-9_]+$`) to ensure that all dynamically inserted table names, column names, and column definitions only contain valid alphanumeric characters and underscores before executing the query. If an invalid identifier is provided, a `ValueError` is raised, neutralizing the attack vector.
