-- Add structured fields to tasks tables
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS problem_statement TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS input_format TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS output_format TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS constraints TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS examples JSONB;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_limit_ms INTEGER DEFAULT 1000;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS memory_limit_mb INTEGER DEFAULT 64;

ALTER TABLE tournament_tasks ADD COLUMN IF NOT EXISTS problem_statement TEXT;
ALTER TABLE tournament_tasks ADD COLUMN IF NOT EXISTS input_format TEXT;
ALTER TABLE tournament_tasks ADD COLUMN IF NOT EXISTS output_format TEXT;
ALTER TABLE tournament_tasks ADD COLUMN IF NOT EXISTS constraints TEXT;
ALTER TABLE tournament_tasks ADD COLUMN IF NOT EXISTS examples JSONB;
ALTER TABLE tournament_tasks ADD COLUMN IF NOT EXISTS time_limit_ms INTEGER DEFAULT 1000;
ALTER TABLE tournament_tasks ADD COLUMN IF NOT EXISTS memory_limit_mb INTEGER DEFAULT 64;

-- Update existing tasks to migrate from description to structured format
UPDATE tasks SET 
  problem_statement = CASE 
    WHEN description LIKE '%Умова задачи%' THEN
      SUBSTRING(description FROM POSITION('Умова задачи' IN description) + 14)
    ELSE description
  END,
  input_format = CASE 
    WHEN description LIKE '%Формат вхідних даних%' THEN
      SUBSTRING(description FROM POSITION('Формат вхідних даних' IN description) + 23)
    ELSE NULL
  END,
  output_format = CASE 
    WHEN description LIKE '%Формат вихідних даних%' THEN
      SUBSTRING(description FROM POSITION('Формат вихідних даних' IN description) + 24)
    ELSE NULL
  END,
  constraints = CASE 
    WHEN description LIKE '%Обмеження%' THEN
      SUBSTRING(description FROM POSITION('Обмеження' IN description) + 11)
    ELSE NULL
  END
WHERE description IS NOT NULL;

-- Same for tournament_tasks
UPDATE tournament_tasks SET 
  problem_statement = CASE 
    WHEN description LIKE '%Умова задачі%' THEN
      SUBSTRING(description FROM POSITION('Умова задачі' IN description) + 14)
    ELSE description
  END,
  input_format = CASE 
    WHEN description LIKE '%Формат вхідних даних%' THEN
      SUBSTRING(description FROM POSITION('Формат вхідних даних' IN description) + 23)
    ELSE NULL
  END,
  output_format = CASE 
    WHEN description LIKE '%Формат вихідних даних%' THEN
      SUBSTRING(description FROM POSITION('Формат вихідних даних' IN description) + 24)
    ELSE NULL
  END,
  constraints = CASE 
    WHEN description LIKE '%Обмеження%' THEN
      SUBSTRING(description FROM POSITION('Обмеження' IN description) + 11)
    ELSE NULL
  END
WHERE description IS NOT NULL;
