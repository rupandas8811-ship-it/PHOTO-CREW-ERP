import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getOpenAPI() {
  const url = `${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_SERVICE_ROLE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const quotations = data.definitions.quotations;
  if (quotations) {
    console.log("Quotations Columns:", Object.keys(quotations.properties));
    console.log(quotations.properties);
  } else {
    console.log("Quotations not found in OpenAPI");
  }
}
getOpenAPI();
