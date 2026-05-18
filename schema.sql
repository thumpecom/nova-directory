-- Nova Directory schema. Run once in Neon's SQL Editor.

-- Sessions for shared-password auth.
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Pages: prelanders and PDPs.
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL CHECK (store IN ('NovaPaw', 'NovaLift', 'NovaPod')),
  page_type TEXT NOT NULL CHECK (page_type IN ('prelander', 'pdp')),
  label TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pages_store_type ON pages(store, page_type, position);

-- Redirects: each page can have at most one outgoing redirect (UNIQUE on source).
-- Both source and destination must already exist in the pages table.
CREATE TABLE IF NOT EXISTS redirects (
  id TEXT PRIMARY KEY,
  source_page_id TEXT NOT NULL UNIQUE REFERENCES pages(id) ON DELETE CASCADE,
  destination_page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_page_id <> destination_page_id)
);
CREATE INDEX IF NOT EXISTS idx_redirects_destination ON redirects(destination_page_id);

-- Ad accounts.
CREATE TABLE IF NOT EXISTS ad_accounts (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL CHECK (store IN ('NovaPaw', 'NovaLift', 'NovaPod')),
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  notes TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_store ON ad_accounts(store, position);

-- Naming conventions: one editable format string per store.
CREATE TABLE IF NOT EXISTS naming_convention_format (
  store TEXT PRIMARY KEY CHECK (store IN ('NovaPaw', 'NovaLift', 'NovaPod')),
  format TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Naming convention rows: three sections (structure breakdown, format type abbreviations, full examples).
-- All sections share three columns; meaning differs per section:
--   structure:      col1=section,   col2=meaning,         col3=example
--   abbreviations:  col1=full name, col2=convention code, col3=(unused)
--   examples:       col1=page type, col2=naming string,   col3=(unused)
CREATE TABLE IF NOT EXISTS naming_convention_rows (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL CHECK (store IN ('NovaPaw', 'NovaLift', 'NovaPod')),
  section TEXT NOT NULL CHECK (section IN ('structure', 'abbreviations', 'examples')),
  col1 TEXT NOT NULL DEFAULT '',
  col2 TEXT NOT NULL DEFAULT '',
  col3 TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_naming_rows_store_section ON naming_convention_rows(store, section, position);

-- Seed default naming convention format string for each store.
INSERT INTO naming_convention_format (store, format) VALUES
  ('NovaPaw',  '[Copywriter Initial]-[Prelander Format]-[Format Version #]-[3-5 Word Descriptor]'),
  ('NovaLift', '[Copywriter Initial]-[Prelander Format]-[Format Version #]-[3-5 Word Descriptor]'),
  ('NovaPod',  '[Copywriter Initial]-[Prelander Format]-[Format Version #]-[3-5 Word Descriptor]')
ON CONFLICT (store) DO NOTHING;

-- Seed naming convention rows for all three stores.
-- Deterministic ids let the seed be re-run safely (ON CONFLICT DO NOTHING).
DO $$
DECLARE
  s TEXT;
  store_slug TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['NovaPaw', 'NovaLift', 'NovaPod'] LOOP
    store_slug := LOWER(s);

    -- Structure Breakdown: col1=section, col2=meaning, col3=example
    INSERT INTO naming_convention_rows (id, store, section, col1, col2, col3, position) VALUES
      ('seed_' || store_slug || '_struct_1', s, 'structure', 'T',                                  'Copywriter first initial',                       'T',          0),
      ('seed_' || store_slug || '_struct_2', s, 'structure', 'list / news / ugc / auth / quiz',    'Prelander format type',                          'ugc',        1),
      ('seed_' || store_slug || '_struct_3', s, 'structure', '1',                                  'Iteration/version number for that format',       '1',          2),
      ('seed_' || store_slug || '_struct_4', s, 'structure', 'pad14days',                          '3-5 word shorthand describing the angle/topic',  'pad14days',  3)
    ON CONFLICT (id) DO NOTHING;

    -- Format Type Abbreviations: col1=full name, col2=code
    INSERT INTO naming_convention_rows (id, store, section, col1, col2, position) VALUES
      ('seed_' || store_slug || '_abbr_1', s, 'abbreviations', 'Listicle',                  'list', 0),
      ('seed_' || store_slug || '_abbr_2', s, 'abbreviations', 'Fake News / Editorial',     'news', 1),
      ('seed_' || store_slug || '_abbr_3', s, 'abbreviations', 'UGC Case Study',            'ugc',  2),
      ('seed_' || store_slug || '_abbr_4', s, 'abbreviations', 'Authority / Expert Piece',  'auth', 3),
      ('seed_' || store_slug || '_abbr_5', s, 'abbreviations', 'Quiz',                      'quiz', 4)
    ON CONFLICT (id) DO NOTHING;

    -- Full Examples: col1=page type, col2=naming convention
    INSERT INTO naming_convention_rows (id, store, section, col1, col2, position) VALUES
      ('seed_' || store_slug || '_ex_1', s, 'examples', 'Listicle',                  'T-list-1-tiktoktrainingmethods', 0),
      ('seed_' || store_slug || '_ex_2', s, 'examples', 'Fake News / Editorial',     'T-news-1-gordonrestaurantpad',   1),
      ('seed_' || store_slug || '_ex_3', s, 'examples', 'UGC Case Study',            'T-ugc-1-pad14days',              2),
      ('seed_' || store_slug || '_ex_4', s, 'examples', 'Authority / Expert Piece',  'T-auth-1-shelterdirector',       3),
      ('seed_' || store_slug || '_ex_5', s, 'examples', 'Quiz',                      'T-quiz-1-howmuchdoyouspend',     4)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;
