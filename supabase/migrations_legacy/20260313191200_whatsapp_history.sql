-- Create whatsapp_logs table
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('confirmation', 'reminder', 'debt_relance')),
    recipient_phone TEXT NOT NULL,
    message_content TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster filtering
CREATE INDEX idx_whatsapp_logs_category ON public.whatsapp_logs(category);
CREATE INDEX idx_whatsapp_logs_patient_id ON public.whatsapp_logs(patient_id);
CREATE INDEX idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and delete logs
CREATE POLICY "Allow authenticated to read whatsapp_logs" ON public.whatsapp_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to insert whatsapp_logs" ON public.whatsapp_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to delete whatsapp_logs" ON public.whatsapp_logs
    FOR DELETE USING (auth.role() = 'authenticated');
