-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category TEXT NOT NULL, -- loàyer, salaires, consommables, électricité, etc.
    payment_method TEXT DEFAULT 'cash', -- cash, transfer, check
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Policy (admin only if we want to be strict, but for now let's allow authenticated)
CREATE POLICY "Enable all for authenticated users" ON public.expenses
    FOR ALL USING (auth.role() = 'authenticated');

-- Trigger updated_at
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
