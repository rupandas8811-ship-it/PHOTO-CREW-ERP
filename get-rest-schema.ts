import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';

async function run() {
  const fetchUrl = `${url}/rest/v1/?apikey=${anonKey}`;
  console.log('Fetching REST API Schema from:', fetchUrl);
  try {
    const res = await fetch(fetchUrl);
    const schema = await res.json();
    const usersDef = schema.definitions?.users;
    if (usersDef) {
      console.log('Columns in REST schema for table "users":');
      console.log('Properties:', Object.keys(usersDef.properties));
      console.log('Full Definition:', JSON.stringify(usersDef, null, 2));
    } else {
      console.log('Table "users" definition not found in REST schema.');
    }
  } catch (err: any) {
    console.error('Error fetching REST schema:', err);
  }
}

run();
