-- Create prescriptions table
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_name TEXT,
    medications JSONB DEFAULT '[]'::jsonb, -- Array of {name, dosage, duration}
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (though full setup is Phase 7, we follow the project style)
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Basic policy for now (allow all access for dev)
CREATE POLICY "Enable all for anyone" ON public.prescriptions
FOR ALL 
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.prescriptions IS 'Store medical prescriptions for patients';
