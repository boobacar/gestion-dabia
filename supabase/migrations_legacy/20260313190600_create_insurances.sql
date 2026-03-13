-- Create insurance_companies table
CREATE TABLE IF NOT EXISTS public.insurance_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'assurance', -- 'assurance' or 'ipm'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read for authenticated users" ON public.insurance_companies
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for admin" ON public.insurance_companies
FOR ALL USING (true); -- Simplified for dev

-- Insert initial data
INSERT INTO public.insurance_companies (name, type) VALUES
('AXA', 'assurance'),
('Sonam', 'assurance'),
('Amsa', 'assurance'),
('MSH International', 'assurance'),
('OLEA', 'assurance'),
('Ipm Sonatel', 'ipm'),
('Ascoma', 'assurance'),
('Sunu Assurances', 'assurance'),
('Prévoyance Assurance', 'assurance'),
('Wafa Assurances', 'assurance'),
('Sanlam | Allianz', 'assurance'),
('Ma-Dgid (IPM impots et domaines)', 'ipm'),
('Finafrica', 'assurance'),
('WILLIS TOWERS WATSON', 'assurance'),
('GGA', 'assurance'),
('Ipm Fadiou', 'ipm'),
('Ipm Sura', 'ipm'),
('Ipm des Professions Libérales', 'ipm'),
('Afiyah', 'assurance'),
('Ipm Eiffage', 'ipm'),
('Ipm Bis (banque islamique)', 'ipm'),
('Ipm Sagfa', 'ipm'),
('Ipm Poste', 'ipm'),
('Ipm Centif', 'ipm'),
('Ipm King Fahd Palace', 'ipm'),
('SYPAOA', 'ipm'),
('TRANSVIE', 'assurance'),
('Ipm Senelec', 'ipm'),
('SUSU', 'assurance'),
('AGETIP', 'ipm'),
('Mutuelle Hôtelière du Cap-Vert', 'ipm'),
('Phosphate de THIES', 'ipm'),
('Express Santé', 'assurance')
ON CONFLICT (name) DO NOTHING;

-- Add insurance columns to invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS insurance_company_id UUID REFERENCES public.insurance_companies(id),
ADD COLUMN IF NOT EXISTS insurance_coverage_amount DECIMAL(10, 2) DEFAULT 0;

-- Update RLS for invoices to be sure (if needed)
-- (Assuming general policies already exist)
