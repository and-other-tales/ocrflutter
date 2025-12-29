-- Novel OCR Admin Panel Database Schema

-- Create novels table
CREATE TABLE IF NOT EXISTS novels (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  isbn VARCHAR(20),
  line1 VARCHAR(255) NOT NULL,
  line2 VARCHAR(255) NOT NULL,
  line3 VARCHAR(255) NOT NULL,
  line1_raw TEXT,
  line2_raw TEXT,
  line3_raw TEXT,
  url TEXT NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  chapter VARCHAR(100),
  page_number INTEGER,
  unlock_content VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  UNIQUE(line1, line2, line3)
);

-- Create index on fingerprint for fast lookups
CREATE INDEX IF NOT EXISTS idx_novels_fingerprint ON novels(line1, line2, line3);
CREATE INDEX IF NOT EXISTS idx_novels_language ON novels(language);
CREATE INDEX IF NOT EXISTS idx_novels_created_at ON novels(created_at DESC);

-- Create lookup_logs table
CREATE TABLE IF NOT EXISTS lookup_logs (
  id SERIAL PRIMARY KEY,
  line1 VARCHAR(255) NOT NULL,
  line2 VARCHAR(255) NOT NULL,
  line3 VARCHAR(255) NOT NULL,
  matched_novel_id INTEGER REFERENCES novels(id) ON DELETE SET NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  response_time_ms INTEGER NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for logs
CREATE INDEX IF NOT EXISTS idx_lookup_logs_timestamp ON lookup_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_lookup_logs_novel_id ON lookup_logs(matched_novel_id);
CREATE INDEX IF NOT EXISTS idx_lookup_logs_success ON lookup_logs(success);

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  key VARCHAR(255) NOT NULL UNIQUE,
  app_name VARCHAR(100),
  rate_limit INTEGER NOT NULL DEFAULT 100,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  user_id VARCHAR(255)
);

-- Create index on api key
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- Create admins table (for authentication)
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for novels table
DROP TRIGGER IF EXISTS update_novels_updated_at ON novels;
CREATE TRIGGER update_novels_updated_at
  BEFORE UPDATE ON novels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO novels (title, isbn, line1, line2, line3, line1_raw, line2_raw, line3_raw, url, language, chapter, page_number, unlock_content, metadata, created_by)
VALUES
  ('Fortunes Told', '979-8218374495', 'the storm was', 'unlike any other', 'felix had seen',
   'The storm was unlike', 'any other Felix had', 'seen in Blackridge.',
   'https://app.example.com/fortunes-told', 'en', 'Chapter 1', 1, 'tarot_reading_1',
   '{"edition": "hardcover", "isbn13": "979-8218374495"}'::jsonb, 'admin@example.com')
ON CONFLICT (line1, line2, line3) DO NOTHING;

INSERT INTO novels (title, isbn, line1, line2, line3, line1_raw, line2_raw, line3_raw, url, language, chapter, page_number, unlock_content, metadata, created_by)
VALUES
  ('Fortunes Told (Swedish Edition)', '979-8218374501', 'stormen var', 'olik alla andra', 'felix hade sett',
   'Stormen var olik', 'alla andra Felix hade', 'sett i Blackridge.',
   'https://app.example.com/fortunes-told-sv', 'sv', 'Kapitel 1', 1, 'tarot_reading_1_sv',
   '{"edition": "paperback", "isbn13": "979-8218374501"}'::jsonb, 'admin@example.com')
ON CONFLICT (line1, line2, line3) DO NOTHING;

INSERT INTO novels (title, isbn, line1, line2, line3, line1_raw, line2_raw, line3_raw, url, language, chapter, page_number, unlock_content, metadata, created_by)
VALUES
  ('Mystery of the Lost Key', '978-1234567890', 'sarah stood before', 'the old mansion', 'her heart racing',
   'Sarah stood before the', 'old mansion, its windows', 'dark, her heart racing.',
   'https://app.example.com/lost-key', 'en', 'Prologue', 3, 'mystery_clue_1',
   '{"edition": "digital", "genre": "mystery"}'::jsonb, 'admin@example.com')
ON CONFLICT (line1, line2, line3) DO NOTHING;
