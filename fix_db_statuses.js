
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://hatltsmkxzhcopxrvkre.supabase.co", process.argv[2]);

async function fix() {
  const { data: invoices, error } = await supabase.from('invoices').select('*').eq('status', 'pending');
  if (error) { console.error(error); return; }
  
  console.log(`Found ${invoices.length} pending invoices. Checking balances...`);
  
  let fixedCount = 0;
  for (const inv of invoices) {
    const total = Number(inv.total_amount);
    const paid = Number(inv.paid_amount || 0);
    const coverage = Number(inv.insurance_coverage_amount || 0);
    const remaining = total - paid - coverage;
    
    if (remaining <= 1) { // 1 FCFA threshold
      console.log(`Fixing invoice ${inv.id}: Remaining ${remaining}`);
      const { error: uerr } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', inv.id);
      if (uerr) console.error(`Error fixing ${inv.id}:`, uerr);
      else fixedCount++;
    }
  }
  
  console.log(`Successfully fixed ${fixedCount} invoices.`);
}
fix();
