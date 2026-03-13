
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://hatltsmkxzhcopxrvkre.supabase.co", process.argv[2]);

async function repair() {
  const { data: invoices, error } = await supabase.from('invoices').select('*');
  if (error) { console.error(error); return; }
  
  console.log(`Checking ${invoices.length} invoices...`);
  
  for (const inv of invoices) {
    const total = Number(inv.total_amount);
    const paid = Number(inv.paid_amount || 0);
    const coverage = Number(inv.insurance_coverage_amount || 0);
    const balance = total - paid - coverage;
    
    let correctStatus = balance <= 1 ? "paid" : "pending";
    
    if (inv.status !== correctStatus) {
      console.log(`Repairing invoice ${inv.id}: [${inv.status}] -> [${correctStatus}] (Bal: ${balance})`);
      await supabase.from('invoices').update({ status: correctStatus }).eq('id', inv.id);
    }
  }
  console.log('Repair finished.');
}
repair();
