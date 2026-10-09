import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { auth_id, staff_id, email, password, name, role, mobile, active } = req.body;

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ success: false, error: 'Server configuration error: Missing Supabase credentials' });
    }
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Resolve target auth user ID
    let targetAuthId: string | null = auth_id || null;
    let targetAuthUser: any = null;

    if (targetAuthId) {
      try {
        const { data: uData, error: uErr } = await supabaseAdmin.auth.admin.getUserById(targetAuthId);
        if (!uErr && uData?.user) {
          targetAuthUser = uData.user;
        }
      } catch (e) {}
    }

    if (!targetAuthUser && staff_id) {
      try {
        const { data: psRec } = await supabaseAdmin.from('production_staff').select('notes, email, mobile').eq('staff_id', staff_id).maybeSingle();
        if (psRec?.notes) {
          try {
            const parsed = JSON.parse(psRec.notes);
            if (parsed.auth_user_id) {
              const { data: psAuth, error: psAuthErr } = await supabaseAdmin.auth.admin.getUserById(parsed.auth_user_id);
              if (!psAuthErr && psAuth?.user) {
                targetAuthUser = psAuth.user;
                targetAuthId = psAuth.user.id;
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    const cleanMobile = mobile ? mobile.replace(/\D/g, '') : undefined;

    if (!targetAuthUser && (cleanEmail || cleanMobile)) {
      try {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = (listData?.users || []).find((u: any) =>
          (cleanEmail && u.email?.trim().toLowerCase() === cleanEmail) ||
          (cleanMobile && (u.phone?.replace(/\D/g, '') === cleanMobile || u.user_metadata?.mobile?.replace(/\D/g, '') === cleanMobile))
        );
        if (found) {
          targetAuthUser = found;
          targetAuthId = found.id;
        }
      } catch (e) {}
    }

    if (!targetAuthId && !password) {
      return res.status(400).json({ success: false, error: 'auth_id is required' });
    }

    if (!targetAuthUser && password) {
      if (!cleanEmail && !cleanMobile) {
        return res.status(404).json({ success: false, error: 'Staff authentication account not found' });
      }
      const createEmail = cleanEmail || `${cleanMobile}@photocrew.com`;
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: createEmail,
        password: password,
        user_metadata: { name: name || 'Staff Member', role: role || 'Production Staff', mobile: cleanMobile },
        email_confirm: true
      });
      if (createErr) {
        return res.status(400).json({ success: false, error: createErr.message || 'Failed to create auth user' });
      }
      targetAuthUser = created.user;
      targetAuthId = created.user.id;
    }

    const updates: any = {};
    if (email) updates.email = cleanEmail;
    if (password) updates.password = password;
    if (name || role || cleanMobile) {
      updates.user_metadata = {};
      if (name) updates.user_metadata.name = name;
      if (role) updates.user_metadata.role = role;
      if (cleanMobile) updates.user_metadata.mobile = cleanMobile;
    }

    if (targetAuthId) {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetAuthId, updates);
      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      targetAuthUser = data.user;
    }

    const userRecord: any = {};
    if (name) userRecord.name = name;
    if (cleanEmail) userRecord.email = cleanEmail;
    if (role) userRecord.role = role;
    if (cleanMobile) userRecord.mobile = cleanMobile;
    if (active !== undefined) userRecord.active = active;
    if (password) {
      userRecord.password = null;
    }
    
    if (targetAuthId) {
      await supabaseAdmin.from('users').update(userRecord).eq('id', targetAuthId);
    }
    if (cleanEmail) {
      await supabaseAdmin.from('users').update(userRecord).ilike('email', cleanEmail);
    }
    if (cleanMobile) {
      await supabaseAdmin.from('users').update(userRecord).eq('mobile', cleanMobile);
    }

    if (staff_id || cleanEmail || cleanMobile) {
      try {
        let psQuery = supabaseAdmin.from('production_staff').select('staff_id, notes');
        if (staff_id) psQuery = psQuery.eq('staff_id', staff_id);
        else if (cleanEmail) psQuery = psQuery.ilike('email', cleanEmail);
        else if (cleanMobile) psQuery = psQuery.eq('mobile', cleanMobile);

        const { data: psRows } = await psQuery;
        if (psRows && psRows.length > 0) {
          for (const row of psRows) {
            let notesObj: any = {};
            try { if (row.notes) notesObj = JSON.parse(row.notes); } catch (e) {}
            if (targetAuthId) notesObj.auth_user_id = targetAuthId;
            const psUpdates: any = { notes: JSON.stringify(notesObj) };
            if (password) psUpdates.Password = null;
            await supabaseAdmin.from('production_staff').update(psUpdates).eq('staff_id', row.staff_id);
          }
        }
      } catch (e) {}
    }
    
    return res.status(200).json({ success: true, auth_user_id: targetAuthId, data: { user: targetAuthUser } });
    
  } catch (err: any) {
    console.error('[Vercel Auth] Update user exception:', err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
}
