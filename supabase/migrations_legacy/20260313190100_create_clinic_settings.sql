-- Create clinic_settings table
CREATE TABLE IF NOT EXISTS public.clinic_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT DEFAULT 'DABIA',
    specialty TEXT DEFAULT 'CLINIQUE DENTAIRE',
    address TEXT DEFAULT '123 Rue de la Santé, Dakar, Sénégal',
    phone TEXT DEFAULT '+221 33 000 00 00',
    email TEXT DEFAULT 'contact@clinique-dabia.sn',
    ninea TEXT DEFAULT '000000000000',
    rc_number TEXT DEFAULT 'SN-DKR-2023-B-00000',
    legal_status TEXT DEFAULT 'SARL au capital de 1 000 000 FCFA',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default row if not exists
INSERT INTO public.clinic_settings (id)
VALUES ('00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;
