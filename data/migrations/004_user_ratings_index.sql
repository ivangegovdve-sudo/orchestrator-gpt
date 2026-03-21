-- ⚡ Bolt optimization: Added composite covering index to optimize correlated subqueries for average ratings.
-- This allows SQLite to evaluate SELECT AVG(rating) FROM user_ratings WHERE movie_id = ?
-- using only the index without fetching actual table rows.
CREATE INDEX IF NOT EXISTS idx_user_ratings_movie_id_rating ON user_ratings(movie_id, rating);
