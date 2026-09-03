require('dotenv').config({ path: '.env' });
async function run() {
  const res = await fetch(process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.VITE_SUPABASE_ANON_KEY);
  const data = await res.json();
  const sa = data.definitions.staff_assignments;
  console.log(JSON.stringify(sa, null, 2));
}
run();
