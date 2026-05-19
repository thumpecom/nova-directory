-- Nova Directory schema. Run once in Neon's SQL Editor.

-- Sessions for shared-password auth.
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Pages: prelanders and PDPs. `notes` is optional and only editable after a page is added.
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  store TEXT NOT NULL CHECK (store IN ('NovaPaw', 'NovaLift', 'NovaPod')),
  page_type TEXT NOT NULL CHECK (page_type IN ('prelander', 'pdp')),
  label TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
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
