import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { auth_id, email, password, name, role, active } = req.body;
    if (!auth_id) {
      return res.status(400).json({ success: false, error: 'auth_id is required' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ success: false, error: 'Server configuration error: Missing Supabase credentials' });
    }
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log(`[Vercel Auth] Updating user ${auth_id} (email: ${email})`);
    
    const updates: any = {};
    if (email) updates.email = email;
    if (password) updates.password = password;
    if (name || role) {
      updates.user_metadata = {};
      if (name) updates.user_metadata.name = name;
      if (role) updates.user_metadata.role = role;
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(auth_id, updates);

    if (error) {
      console.error(`[Vercel Auth Update Error]`, error);
      return res.status(400).json({ success: false, error: error.message });
    }

    const authUser = data.user;
    
    const userRecord: any = { id: auth_id };
    if (name) userRecord.name = name;
    if (email) userRecord.email = email;
    if (role) userRecord.role = role;
    if (active !== undefined) userRecord.active = active;
    
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update(userRecord)
      .eq('id', auth_id);
      
    if (dbError) {
      console.error(`[Vercel Auth DB Update Error]`, dbError);
    }
    
    return res.status(200).json({ success: true, data: { user: authUser } });
    
  } catch (err: any) {
    console.error('[Vercel Auth] Update user exception:', err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
}
