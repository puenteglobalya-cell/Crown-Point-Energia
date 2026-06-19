-- Add structured experience data column to job_applications
alter table job_applications add column if not exists datos jsonb default '{}'::jsonb;
