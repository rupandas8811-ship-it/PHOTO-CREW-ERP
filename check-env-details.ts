import dotenv from 'dotenv';
dotenv.config();

console.log('--- DB & Supabase Env Keys ---');
for (const key of Object.keys(process.env)) {
  if (key.includes('SUPABASE') || key.includes('DB') || key.includes('DATABASE') || key.includes('POSTGRES') || key.includes('PASS') || key.includes('KEY')) {
    console.log(`${key}: ${process.env[key] ? 'SET (length: ' + process.env[key]?.length + ')' : 'EMPTY'}`);
    if (key.includes('PASS') || key.includes('DATABASE') || key.includes('CONN')) {
      console.log(`  Value: ${process.env[key]}`);
    }
  }
}
