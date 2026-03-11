import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { error } = await supabase.from('documents').insert({
    patient_id: "0ac857f7-d337-43b5-907d-fb44ab1b492b",
    file_name: "test.pdf",
    file_type: "application/pdf",
    file_url: "https://test.com",
    category: "radiography"
  });
  console.log('Insert error:', error);
}
check();
