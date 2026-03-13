import { createAdminClient } from '../lib/supabase/admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function test() {
    console.log("Starting profile fetch...");
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.error("Supabase Error:", error);
    } else if (!data || data.length === 0) {
        console.log("No profiles found in the 'profiles' table.");
    } else {
        console.log(`Found ${data.length} profiles:`);
        data.forEach(p => {
            console.log(`- [${p.id}] ${p.email} | ${p.first_name} ${p.last_name} | Role: ${p.role}`);
        });
    }
}

test().catch(err => console.error("Script Error:", err));
