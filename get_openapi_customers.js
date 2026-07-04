import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getOpenAPI() {
  const url = `${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_SERVICE_ROLE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const customers = data.definitions.customers;
  if (customers) {
    console.log("Customers Columns:", Object.keys(customers.properties));
  } else {
    console.log("Customers not found in OpenAPI");
  }
}
getOpenAPI();
