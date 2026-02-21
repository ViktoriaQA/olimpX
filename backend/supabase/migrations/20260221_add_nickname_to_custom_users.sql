-- Add nickname field to custom_users table
ALTER TABLE custom_users 
ADD COLUMN nickname TEXT UNIQUE;

-- Create index for nickname lookups
CREATE INDEX IF NOT EXISTS idx_custom_users_nickname ON custom_users(nickname);

-- Update existing users to generate unique nicknames from their emails
-- Handle duplicates by appending numbers
DO $$
DECLARE
    user_record RECORD;
    base_nickname TEXT;
    unique_nickname TEXT;
    counter INTEGER;
BEGIN
    FOR user_record IN 
        SELECT id, email 
        FROM custom_users 
        WHERE nickname IS NULL AND email IS NOT NULL
        ORDER BY created_at
    LOOP
        base_nickname := split_part(user_record.email, '@', 1);
        unique_nickname := base_nickname;
        counter := 1;
        
        -- Find a unique nickname
        WHILE EXISTS (
            SELECT 1 FROM custom_users 
            WHERE nickname = unique_nickname
        ) LOOP
            unique_nickname := base_nickname || '_' || counter;
            counter := counter + 1;
        END LOOP;
        
        -- Update the user with the unique nickname
        UPDATE custom_users 
        SET nickname = unique_nickname
        WHERE id = user_record.id;
    END LOOP;
END $$;
