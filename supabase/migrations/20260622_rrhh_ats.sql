-- ATS scoring columns on job_applications
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS score       SMALLINT   CHECK (score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS ai_summary  TEXT,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- Index for sorting by score in the admin view
CREATE INDEX IF NOT EXISTS idx_job_applications_score ON job_applications (score DESC NULLS LAST);
