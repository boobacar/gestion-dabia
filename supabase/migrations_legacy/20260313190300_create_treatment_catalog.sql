-- Create treatment_catalog table
CREATE TABLE IF NOT EXISTS public.treatment_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE, -- Technical code for icons/logic (optional)
    category TEXT DEFAULT 'Général',
    price DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.treatment_catalog ENABLE ROW LEVEL SECURITY;

-- Allow anyone for dev (consistency with user's current state)
CREATE POLICY "Enable all for anyone" ON public.treatment_catalog
FOR ALL USING (true) WITH CHECK (true);

-- Insert some default data
INSERT INTO public.treatment_catalog (name, code, category, price) VALUES
('Consultation simple', 'consultation', 'Général', 10000),
('Carie (1 face)', 'carie_1', 'Soins', 15000),
('Extraction simple', 'extraction', 'Chirurgie', 20000),
('Détartrage & Polissage', 'scaling', 'Soins', 25000),
('Couronne Céramo-métallique', 'crown', 'Prothèse', 150000)
ON CONFLICT (code) DO NOTHING;
