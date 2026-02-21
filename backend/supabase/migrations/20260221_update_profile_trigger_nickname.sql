-- Update the profile creation trigger to generate nickname from email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_nickname TEXT;
BEGIN
  -- Generate nickname from email if not provided
  IF NEW.email IS NOT NULL THEN
    generated_nickname := split_part(NEW.email, '@', 1);
    
    -- Ensure nickname is unique
    WHILE EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE nickname = generated_nickname
    ) LOOP
      -- If nickname exists, append a random number
      generated_nickname := generated_nickname || '_' || floor(random() * 1000);
    END LOOP;
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, nickname, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.user_metadata ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    generated_nickname,
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
