-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT DEFAULT 'cash', -- 'cash', 'card', 'transfer', 'check', 'insurance'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON public.payments(patient_id);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable all for anyone" ON public.payments
FOR ALL USING (true) WITH CHECK (true);

-- Link to existing invoices for initial data migration (optional, but good for consistency)
-- If we wanted to migrate existing paid_amounts to payments, we would do it here.
-- For now, we'll start with a clean Slate for new transactions.
