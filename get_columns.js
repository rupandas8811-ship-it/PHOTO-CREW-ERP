import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getCols() {
  const url = `${SUPABASE_URL}/rest/v1/quotations?limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    }
  });
  if(res.ok) {
    const data = await res.json();
    if (data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log("No data, try POST to see schema");
      // or we can use the OpenAPI spec endpoint
    }
  } else {
    console.error(await res.text());
  }
}
getCols();
