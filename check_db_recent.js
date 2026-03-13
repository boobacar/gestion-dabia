
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient("https://hatltsmkxzhcopxrvkre.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdGx0c21reHpoY29weHJ2a3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDAyNDMsImV4cCI6MjA4ODY3NjI0M30.iw0czGAN1g-K5xQ9bGOWAU2YUAgvS-5V-dHVJBMYk5g");

async function check() {
  const { data: invoices, error } = await supabase.from('invoices').select('*, patients(first_name, last_name)').order('created_at', { ascending: false }).limit(5);
  if (error) { console.error(error); return; }
  console.log('Recent Invoices:');
  console.log(JSON.stringify(invoices, null, 2));
}
check();
