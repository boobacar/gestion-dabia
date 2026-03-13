
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://hatltsmkxzhcopxrvkre.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdGx0c21reHpoY29weHJ2a3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDAyNDMsImV4cCI6MjA4ODY3NjI0M30.iw0czGAN1g-K5xQ9bGOWAU2YUAgvS-5V-dHVJBMYk5g");

async function check() {
  const { data: patients } = await supabase.from('patients').select('id, first_name, last_name').ilike('first_name', '%MOUSTAPHA%');
  if (!patients || patients.length === 0) { console.log('Patient not found'); return; }
  const pid = patients[0].id;
  const { data: invoices } = await supabase.from('invoices').select('*').eq('patient_id', pid);
  console.log('Result:');
  console.log(JSON.stringify(invoices, null, 2));
}
check();
