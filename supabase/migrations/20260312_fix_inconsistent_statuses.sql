
-- Migration to fix inconsistent invoice statuses
UPDATE public.invoices
SET status = 'paid'
WHERE status = 'pending'
  AND (total_amount - COALESCE(paid_amount, 0) - COALESCE(insurance_coverage_amount, 0)) <= 1;
