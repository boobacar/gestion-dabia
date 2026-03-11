-- Add unit_price column to inventory table
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.inventory.unit_price IS 'Unit price in XOF (FCFA) for inventory valuation';
