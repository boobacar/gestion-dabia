require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

async function check() {
  const { data } = await supabase.from("patients").select("patient_number");
  const numbers = data
    .map((d) => parseInt(d.patient_number, 10))
    .filter((n) => !isNaN(n));
  console.log("Total valid numbers:", numbers.length);
  console.log("Max numeric patient_number:", Math.max(...numbers));

  const { data: stringMax } = await supabase
    .from("patients")
    .select("patient_number")
    .order("patient_number", { ascending: false })
    .limit(1);
  console.log("Lexicographical max:", stringMax[0].patient_number);
}
check();
