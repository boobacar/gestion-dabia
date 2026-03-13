-- 1. Ensure the enum has all necessary values
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'secretary') THEN
        ALTER TYPE user_role ADD VALUE 'secretary';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'assistant') THEN
        ALTER TYPE user_role ADD VALUE 'assistant';
    END IF;
END $$;

-- 2. Fix the profiles table default value to be valid
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'secretary'::user_role;

-- 3. Update the trigger function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    final_role user_role;
    raw_role text;
BEGIN
    raw_role := coalesce(new.raw_user_meta_data->>'role', 'secretary');
    
    -- Map assistant to secretary if needed, but ensure it's a valid enum value
    IF raw_role = 'assistant' THEN
        final_role := 'secretary'::user_role;
    ELSIF raw_role = 'admin' THEN
        final_role := 'admin'::user_role;
    ELSIF raw_role = 'dentist' THEN
        final_role := 'dentist'::user_role;
    ELSE
        final_role := 'secretary'::user_role;
    END IF;

    INSERT INTO public.profiles (id, email, first_name, last_name, role, created_at)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        final_role,
        new.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role;
        
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
