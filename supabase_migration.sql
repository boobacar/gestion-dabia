ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_items JSONB DEFAULT '[]'::jsonb;
