-- Add examples with visibility to tasks tables
-- This migration adds support for up to 5 examples with individual visibility controls

-- Update existing examples column structure to support visibility
-- First, let's add a new column for examples with visibility
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS examples_with_visibility JSONB;
ALTER TABLE tournament_tasks ADD COLUMN IF NOT EXISTS examples_with_visibility JSONB;

-- Create a function to migrate existing examples to the new format
CREATE OR REPLACE FUNCTION migrate_examples_with_visibility()
RETURNS void AS $$
BEGIN
  -- Migrate tasks table
  UPDATE tasks 
  SET examples_with_visibility = 
    CASE 
      WHEN examples IS NOT NULL AND jsonb_typeof(examples) = 'array' THEN
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', elem->>'id',
              'input', elem->>'input',
              'output', elem->>'output',
              'visible', CASE WHEN (elem->>'id')::integer = 1 THEN true ELSE false END  -- Only first example visible
            )
          )
          FROM jsonb_array_elements(examples) AS elem
          LIMIT 5  -- Limit to 5 examples
        )
      ELSE NULL
    END
  WHERE examples IS NOT NULL AND examples_with_visibility IS NULL;

  -- Migrate tournament_tasks table
  UPDATE tournament_tasks 
  SET examples_with_visibility = 
    CASE 
      WHEN examples IS NOT NULL AND jsonb_typeof(examples) = 'array' THEN
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', elem->>'id',
              'input', elem->>'input',
              'output', elem->>'output',
              'visible', CASE WHEN (elem->>'id')::integer = 1 THEN true ELSE false END  -- Only first example visible
            )
          )
          FROM jsonb_array_elements(examples) AS elem
          LIMIT 5  -- Limit to 5 examples
        )
      ELSE NULL
    END
  WHERE examples IS NOT NULL AND examples_with_visibility IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_examples_with_visibility();

-- Drop the migration function
DROP FUNCTION migrate_examples_with_visibility();

-- Add constraint to ensure maximum 5 examples (simplified version)
-- Drop constraint if it exists first, then recreate
DO $$ 
BEGIN
    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_examples_max_5;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE tasks ADD CONSTRAINT check_examples_max_5 
  CHECK (
    examples_with_visibility IS NULL OR 
    jsonb_typeof(examples_with_visibility) != 'array' OR
    jsonb_array_length(examples_with_visibility) <= 5
  );

DO $$ 
BEGIN
    ALTER TABLE tournament_tasks DROP CONSTRAINT IF EXISTS check_examples_max_5;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE tournament_tasks ADD CONSTRAINT check_examples_max_5 
  CHECK (
    examples_with_visibility IS NULL OR 
    jsonb_typeof(examples_with_visibility) != 'array' OR
    jsonb_array_length(examples_with_visibility) <= 5
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_examples_with_visibility ON tasks USING GIN (examples_with_visibility);
CREATE INDEX IF NOT EXISTS idx_tournament_tasks_examples_with_visibility ON tournament_tasks USING GIN (examples_with_visibility);

-- Add comments for documentation
COMMENT ON COLUMN tasks.examples_with_visibility IS 'JSON array of up to 5 examples with visibility control. Each example has: id, input, output, visible (boolean)';
COMMENT ON COLUMN tournament_tasks.examples_with_visibility IS 'JSON array of up to 5 examples with visibility control. Each example has: id, input, output, visible (boolean)';
