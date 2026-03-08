-- Fix examples_with_visibility data
-- This script migrates data from examples to examples_with_visibility format

-- Update tournament_tasks table
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
            'visible', CASE WHEN (elem->>'id')::integer IN (1, 2) THEN true ELSE false END  -- First two examples visible
          )
        )
        FROM jsonb_array_elements(examples) AS elem
        LIMIT 5
      )
    ELSE
      -- If examples_with_visibility is already set but null, use default data
      CASE 
        WHEN id = 'ec4603ce-13be-4f30-ba31-ee4cc10d4881' THEN
          '[{"id": 1, "input": "12", "output": "1 2", "visible": true}, {"id": 2, "input": "123", "output": "1 2 3", "visible": true}, {"id": 3, "input": "1234", "output": "1 2 3 4", "visible": false}]'
        ELSE NULL
      END
  END
WHERE examples_with_visibility IS NULL OR examples_with_visibility = 'null'::jsonb;

-- Update tasks table (general tasks)
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
            'visible', CASE WHEN (elem->>'id')::integer IN (1, 2) THEN true ELSE false END  -- First two examples visible
          )
        )
        FROM jsonb_array_elements(examples) AS elem
        LIMIT 5
      )
    ELSE NULL
  END
WHERE examples_with_visibility IS NULL OR examples_with_visibility = 'null'::jsonb;

-- Verify the update for the specific task
SELECT 
  id,
  title,
  examples_with_visibility,
  CASE 
    WHEN examples_with_visibility IS NULL THEN 'NULL'
    WHEN examples_with_visibility = 'null'::jsonb THEN 'NULL JSON'
    ELSE 'HAS DATA'
  END as status
FROM tournament_tasks 
WHERE id = 'ec4603ce-13be-4f30-ba31-ee4cc10d4881';
