
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://hatltsmkxzhcopxrvkre.supabase.co", process.argv[2]);

async function checkAll() {
  const { data: invoices, error } = await supabase.from('invoices').select('id, status, total_amount, paid_amount, insurance_coverage_amount');
  if (error) { console.error(error); return; }
  
  console.log(`Total Invoices in DB: ${invoices?.length || 0}`);
  invoices.forEach(inv => {
    console.log(`ID: ${inv.id} | Status: [${inv.status}] | Bal: ${inv.total_amount - (inv.paid_amount||0) - (inv.insurance_coverage_amount||0)}`);
  });
}
checkAll();
