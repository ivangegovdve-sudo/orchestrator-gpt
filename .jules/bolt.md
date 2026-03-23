## 2024-05-18 - [SQLite Derived Tables vs Correlated Subqueries]
**Learning:** In SQLite, a query using `LEFT JOIN` on a derived table (e.g. `(SELECT movie_id, AVG(...) GROUP BY movie_id)`) executes the aggregation for the *entire* table before joining and applying limits, causing significant performance overhead on paginated results. For small limits, correlated subqueries in the SELECT clause (e.g. `(SELECT AVG(...) FROM user_ratings WHERE movie_id = m.id)`) are much faster (e.g. ~0.001s vs ~0.19s for 50 records) provided an index exists on the foreign key (e.g. `user_ratings(movie_id)`).
**Action:** When writing paginated queries with aggregations in SQLite, prefer correlated subqueries over derived tables. Ensure the necessary indexes exist.

## 2024-05-18 - [Python Substring Check Optimization]
**Learning:** When performing multiple substring checks in Python, `any([marker in text for marker in markers])` (list comprehension) can be faster than `any(marker in text for marker in markers)` (generator expression) due to lower iteration overhead for small sets.
**Action:** Use list comprehensions when the target string and marker sets are small, to take advantage of the performance benefits.
