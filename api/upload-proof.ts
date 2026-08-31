import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { base64, fileName, contentType } = req.body;
    if (!base64 || !fileName) {
      return res.status(400).json({ success: false, error: 'Missing base64 or fileName' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ success: false, error: 'Server configuration error: Missing Supabase credentials' });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const { data, error } = await supabaseAdmin.storage
      .from('proofs')
      .upload(fileName, buffer, {
        contentType: contentType || 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('[Vercel API] Upload error:', error);
      return res.status(400).json({ success: false, error: error.message });
    }

    const { data: publicData } = supabaseAdmin.storage
      .from('proofs')
      .getPublicUrl(fileName);

    res.status(200).json({ success: true, publicUrl: publicData.publicUrl });
  } catch (err: any) {
    console.error('[Vercel API] Upload exception:', err);
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
}
