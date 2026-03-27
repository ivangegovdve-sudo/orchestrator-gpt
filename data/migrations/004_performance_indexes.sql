-- ⚡ Bolt optimization: Add covering indexes to speed up list_movies queries
--
-- 1. idx_user_ratings_movie_id_rating:
--    Optimizes the correlated subquery `(SELECT AVG(rating) FROM user_ratings WHERE movie_id = m.id)`
--    by providing a covering index for the aggregation, improving sorting by rating performance.
--
-- 2. idx_movie_tags_tag_id_movie_id:
--    Optimizes queries filtering movies by multiple tags (`tags_mode="all"`) where we group by movie_id
--    and count distinct tags. The index on (tag_id, movie_id) makes the join and distinct grouping faster.

CREATE INDEX IF NOT EXISTS idx_user_ratings_movie_id_rating ON user_ratings(movie_id, rating);
CREATE INDEX IF NOT EXISTS idx_movie_tags_tag_id_movie_id ON movie_tags(tag_id, movie_id);
