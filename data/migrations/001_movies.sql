PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  year INTEGER,
  imdb_score REAL,
  age_band TEXT DEFAULT 'Family',
  watched INTEGER NOT NULL DEFAULT 0 CHECK (watched IN (0, 1)),
  notes TEXT,
  localized_title TEXT,
  poster_url TEXT,
  runtime_minutes INTEGER,
  language TEXT,
  external_links_json TEXT,
  cast_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS movie_tags (
  movie_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (movie_id, tag_id),
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (movie_id, device_id),
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_movies_title_year_unique
ON movies (LOWER(title), IFNULL(year, -1));

CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year);
CREATE INDEX IF NOT EXISTS idx_movies_watched ON movies(watched);
CREATE INDEX IF NOT EXISTS idx_movies_age_band ON movies(age_band);

CREATE INDEX IF NOT EXISTS idx_movie_tags_movie_id ON movie_tags(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_tags_tag_id ON movie_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_user_ratings_movie_id ON user_ratings(movie_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_device_id ON user_ratings(device_id);
