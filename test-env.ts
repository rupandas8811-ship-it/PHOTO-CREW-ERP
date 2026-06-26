console.log('Environment variable keys:');
console.log(Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('DATABASE') || k.includes('POSTGRES') || k.includes('URL')));
