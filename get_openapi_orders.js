import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getOpenAPI() {
  const url = `${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_SERVICE_ROLE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const orders = data.definitions.orders;
  if (orders) {
    console.log("Orders Columns:", Object.keys(orders.properties));
  } else {
    console.log("Orders not found in OpenAPI");
  }
}
getOpenAPI();
