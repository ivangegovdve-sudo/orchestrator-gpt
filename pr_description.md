🎯 **What:** The testing gap addressed was the lack of unit tests for the `normalize_tags` function in `backend/movies_db.py`. This is a pure function that normalizes strings in an iterable (lowercases, strips, deduplicates).

📊 **Coverage:** The new tests cover:
- `None` input
- Empty iterable input
- Whitespace-only string input
- Single tag input
- Multiple tags input
- Mixed case tags input
- Tags with leading/trailing whitespace
- Handling of `None` values within the iterable
- Tag deduplication
- Order preservation

✨ **Result:** The `normalize_tags` function now has comprehensive test coverage ensuring it correctly formats, deduplicates, and handles edge cases for tags before they are saved to the database.
