import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function fetchColumns() {
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': serviceRoleKey
      }
    });
    if (!res.ok) {
      console.log('HTTP Error:', res.status, await res.text());
      return;
    }
    const spec = await res.json();
    if (spec.definitions) {
      for (const [tableName, definition] of Object.entries<any>(spec.definitions)) {
        if (definition.properties) {
          for (const [colName, colDef] of Object.entries<any>(definition.properties)) {
            if (colDef.format && colDef.format.includes('time') && !colDef.format.includes('timestamp')) {
              console.log(`Table: ${tableName}, Column: ${colName}, Format: ${colDef.format}`);
            }
          }
        }
      }
    } else {
      console.log('No definitions found in OpenAPI spec');
    }
  } catch (err) {
    console.error('Error fetching leads columns:', err);
  }
}
fetchColumns();
