-- Add invoice_items column if not exists
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_items JSONB DEFAULT '[]'::jsonb;

-- Ensure total_amount is numeric for consistency
ALTER TABLE public.invoices ALTER COLUMN total_amount TYPE DECIMAL(10, 2);
ALTER TABLE public.invoices ALTER COLUMN paid_amount TYPE DECIMAL(10, 2);

-- Update RLS for invoices (temporary for dev)
CREATE POLICY "Enable all for anyone" ON public.invoices
FOR ALL USING (true) WITH CHECK (true);
