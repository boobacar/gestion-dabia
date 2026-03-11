const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erreur: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const firstName = process.argv[4] || 'Admin';
  const lastName = process.argv[5] || 'DABIA';

  if (!email || !password) {
    console.log('Usage: node scripts/setup-admin.js <email> <password> <prenom> <nom>');
    process.exit(1);
  }

  console.log(`Création du compte Admin pour: ${email}...`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: 'admin'
    }
  });

  if (error) {
    console.error('Erreur lors de la création:', error.message);
  } else {
    console.log('✅ Compte Admin créé avec succès !');
    console.log('Email:', data.user.email);
    console.log('Role:', data.user.user_metadata.role);
  }
}

createAdmin();
