import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { email, password, name, role, active = true } = req.body;
    
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ success: false, error: 'Server configuration error: Missing Supabase credentials' });
    }
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log(`[Vercel Auth] Creating user ${email} with role ${role}`);
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });

    if (error) {
      console.error(`[Vercel Auth Create Error]`, error);
      return res.status(400).json({ success: false, error: error.message });
    }

    const authUser = data.user;
    
    const userRecord = {
      id: authUser.id,
      name,
      email,
      role,
      active,
      created_at: new Date().toISOString()
    };
    
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .upsert(userRecord);
      
    if (dbError) {
      console.error(`[Vercel Auth DB Error]`, dbError);
    }
    
    return res.status(200).json({ success: true, data: { user: authUser } });
    
  } catch (err: any) {
    console.error('[Vercel Auth] Create user exception:', err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
}
