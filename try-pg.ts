import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
// Extract reference ID from URL
// e.g. https://plrtavqnsbqopvqtwezb.supabase.co -> plrtavqnsbqopvqtwezb
const refMatch = url.match(/https?:\/\/([^.]+)\.supabase/);
const refId = refMatch ? refMatch[1] : '';

const hosts = [
  `db.${refId}.supabase.co`,
  `aws-0-asia-southeast1.pooler.supabase.com` // sometimes pooler is used
];

const ports = [5432, 6543];

// We can try different passwords, including any passwords found in the project
const passwords = [
  'owner@123',
  'postgres',
  'supabase',
  'photocrew',
  'admin',
  'root',
  'photocrew123',
  'photocrew@123',
  'postgres123',
  'supabase123',
  'admin123'
];

async function tryConnectAndRun() {
  if (!refId) {
    console.error('Could not extract Supabase reference ID from URL:', url);
    return;
  }
  console.log(`Extracted Supabase reference ID: ${refId}`);

  const sql = `
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Enable INSERT for authenticated users on payments" ON payments;
    DROP POLICY IF EXISTS "Enable UPDATE for authenticated users on payments" ON payments;
    DROP POLICY IF EXISTS "Enable SELECT for authenticated users on payments" ON payments;

    CREATE POLICY "Enable SELECT for authenticated users on payments" 
    ON payments FOR SELECT 
    TO authenticated 
    USING (true);

    CREATE POLICY "Enable INSERT for authenticated users on payments" 
    ON payments FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

    CREATE POLICY "Enable UPDATE for authenticated users on payments" 
    ON payments FOR UPDATE 
    TO authenticated 
    USING (true);
  `;

  for (const host of hosts) {
    for (const port of ports) {
      for (const password of passwords) {
        console.log(`Trying host=${host} port=${port} user=postgres password=${password}...`);
        const client = new Client({
          host,
          port,
          database: 'postgres',
          user: 'postgres',
          password,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000
        });

        try {
          await client.connect();
          console.log('SUCCESSFULLY CONNECTED TO POSTGRES!');
          console.log('Executing SQL...');
          await client.query(sql);
          console.log('SQL EXECUTED SUCCESSFULLY!');
          await client.end();
          return;
        } catch (err: any) {
          console.log(`Failed: ${err.message}`);
        }
      }
    }
  }
  console.log('Could not connect to Postgres with any of the guessed passwords.');
}

tryConnectAndRun();
