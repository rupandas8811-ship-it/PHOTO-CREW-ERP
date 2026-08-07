import express from 'express';
import path from 'path';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://aqifyxsimhqayfjwzzwj.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB';
const hardcodedServiceKey = Buffer.from('c2Jfc2VjcmV0X095RGl5S2JaQmE3MGNocndYR2puTFFfM0pQWXhFanQ=', 'base64').toString('utf-8');
const envServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = (envServiceKey && envServiceKey !== 'YOUR_SUPABASE_SERVICE_ROLE_KEY' && envServiceKey.trim() !== '')
  ? envServiceKey
  : hardcodedServiceKey;

console.log('[Server Init] SUPABASE_URL:', SUPABASE_URL);
console.log('[Server Init] SUPABASE_ANON_KEY configured:', !!SUPABASE_ANON_KEY);
console.log('[Server Init] SUPABASE_SERVICE_ROLE_KEY configured:', !!SUPABASE_SERVICE_ROLE_KEY);

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Some database operations may fail.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // Proxy /supabase to the actual Supabase project
  // MUST be before express.json() to prevent body from being consumed
  if (SUPABASE_URL) {
    console.log('[Server] Mounting /supabase proxy to:', SUPABASE_URL);
    app.use(
      '/supabase',
      createProxyMiddleware({
        target: SUPABASE_URL,
        changeOrigin: true,
        ws: true,
        logger: console,
        on: {
          proxyReq: (proxyReq, req, res) => {
            // When mounted at /supabase, proxyReq.path is already the part after /supabase
            const targetPath = proxyReq.path;
            console.log(`[Proxy Req] ${req.method} ${req.url} -> ${targetPath}`);
            
            proxyReq.setHeader('apikey', SUPABASE_ANON_KEY);
            
            // For auth requests or if the client sent a dummy key, ensure the real anon key is used
            if (targetPath.startsWith('/auth/v1/') || !req.headers.authorization || req.headers.authorization.includes('dummy-anon-key')) {
              // For login, we need the anon key in the Authorization header
              // If it's already there and not "dummy", we keep it (it might be a real session token for other requests)
              if (!req.headers.authorization || req.headers.authorization.includes('dummy-anon-key')) {
                proxyReq.setHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
              }
            }
          },
          proxyRes: (proxyRes, req, res) => {
            console.log(`[Proxy Res] ${req.method} ${req.url} <- Status ${proxyRes.statusCode}`);
          },
          error: (err, req, res: any) => {
            console.error('[Proxy Error]', err);
            if (res && !res.headersSent) {
              res.status(502).json({ success: false, error: 'Proxy error: ' + err.message });
            }
          }
        }
      })
    );
  }

  app.use(express.json({ limit: '50mb' }));

  app.post('/api/upload-proof', async (req, res) => {
    try {
      const { base64, fileName, contentType } = req.body;
      if (!base64 || !fileName) {
        return res.status(400).json({ success: false, error: 'Missing base64 or fileName' });
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Ensure bucket 'img' exists and is public
      try {
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        if (buckets && !buckets.some(b => b.name === 'img')) {
          console.log('[Server Storage] Creating public bucket img...');
          await supabaseAdmin.storage.createBucket('img', { public: true });
        }
      } catch (bErr) {
        console.warn('[Server Storage] Bucket list/create check warning:', bErr);
      }

      const { data, error } = await supabaseAdmin.storage.from('img').upload(fileName, buffer, {
        contentType: contentType || 'image/jpeg',
        upsert: true
      });
      
      if (error) {
        console.error('Storage upload error (Admin):', error);
        return res.status(500).json({ success: false, error: error.message, details: error });
      }
      
      const { data: { publicUrl } } = supabaseAdmin.storage.from('img').getPublicUrl(data.path);
      
      console.log('[Server Storage] File uploaded successfully:', data.path, publicUrl);
      res.json({ success: true, publicUrl });
    } catch (err: any) {
      console.error('Upload proof exception:', err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });


  // Initialize server-side Supabase client lazily
  let serverSupabase: any = null;
  const getServerSupabase = () => {
    if (!serverSupabase) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing database credentials in server environment');
      }
      serverSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    }
    return serverSupabase;
  };

  // Helper to dynamically strip stale/missing columns that cause schema cache mismatch errors
  const healPayload = (table: string, payload: any, errorMsg: string): any | null => {
    if (!payload || typeof payload !== 'object') return null;
    
    const lowerMsg = errorMsg.toLowerCase();
    let healed = false;
    const nextPayload = { ...payload };

    // Common columns that might be missing or cause schema cache errors
    const potentialStaleCols = [
      'deliverables_description',
      'notes_special_customizations',
      'package_price',
      'package_cost',
      'total_pax',
      'reference_source',
      'lead_value',
      'lead_score',
      'booking_status',
      'reporting_time',
      'quotation_discount',
      'additional_services_cost',
      'whatsapp_number',
      'client_residence_address',
      'address',
      'city',
      'state',
      'pincode',
      'desired_event_shoot_type',
      'Select_Package_Option'
    ];

    // If the error explicitly mentions a column, remove it
    const colMatch = errorMsg.match(/column '([^']+)'|column "([^"]+)"/i) || 
                     errorMsg.match(/Could not find the '([^']+)' column/i) ||
                     errorMsg.match(/Could not find the "([^"]+)" column/i);
    
    if (colMatch) {
      const colName = colMatch[1] || colMatch[2];
      if (colName && colName in nextPayload) {
        console.warn(`[Server Self-Healing] Found specific stale column "${colName}". Stripping...`);
        const val = nextPayload[colName];
        delete nextPayload[colName];
        
        // Save the stripped value to remarks/notes
        const currentRemarks = nextPayload.remarks || nextPayload.notes || '';
        const annotation = `[System Fallback - ${colName}]: ${val}`;
        if (nextPayload.remarks !== undefined) {
          nextPayload.remarks = currentRemarks ? `${currentRemarks}\n${annotation}` : annotation;
        } else if (nextPayload.notes !== undefined) {
          nextPayload.notes = currentRemarks ? `${currentRemarks}\n${annotation}` : annotation;
        } else {
          nextPayload.remarks = annotation;
        }
        healed = true;
      }
    }

    // Also strip any known potential columns if mentioned in the general error message
    for (const col of potentialStaleCols) {
      if (lowerMsg.includes(col.toLowerCase()) && col in nextPayload) {
        console.warn(`[Server Self-Healing] Stripping matching stale column "${col}" from error message...`);
        const val = nextPayload[col];
        delete nextPayload[col];
        
        const currentRemarks = nextPayload.remarks || nextPayload.notes || '';
        const annotation = `[System Fallback - ${col}]: ${val}`;
        if (nextPayload.remarks !== undefined) {
          nextPayload.remarks = currentRemarks ? `${currentRemarks}\n${annotation}` : annotation;
        } else if (nextPayload.notes !== undefined) {
          nextPayload.notes = currentRemarks ? `${currentRemarks}\n${annotation}` : annotation;
        } else {
          nextPayload.remarks = annotation;
        }
        healed = true;
      }
    }

    return healed ? nextPayload : null;
  };

  const NUMERIC_DB_KEYS = new Set([
    'budget', 'package_price', 'package_cost', 'quotation_amount',
    'quotation_discount', 'Quotation_Discount', 'quotationdiscount',
    'additional_services_cost', 'Additional_Services_Cost', 'additionalservicescost',
    'final_quotation_amount', 'Final_Quotation_Amount', 'finalquotationamount',
    'final_amount', 'final_package_amount', 'total_amount',
    'advance_received', 'advance_collected', 'advance_payment', 'advance_paid',
    'balance_amount', 'balance', 'total_pax', 'guest_pax', 'staff_pax',
    'lead_value', 'lead_score', 'pincode', 'tax_amount', 'subtotal',
    'grand_total', 'total_payment', 'contract_final_amount', 'advance_payment_received',
    'pending_amount', 'number_of_team_members', 'event_duration', 'quantity', 'discount',
    'price', 'cost', 'amount', 'rate', 'fee'
  ]);

  function isNumericDbKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (NUMERIC_DB_KEYS.has(key) || NUMERIC_DB_KEYS.has(k)) return true;
    return (
      k.includes('amount') ||
      k.includes('cost') ||
      k.includes('price') ||
      k.includes('discount') ||
      k.includes('pax') ||
      k.includes('budget') ||
      k.includes('pincode') ||
      k.includes('zipcode') ||
      k.includes('balance') ||
      k.includes('advance') ||
      k.includes('score') ||
      k.includes('tax') ||
      k.includes('fee') ||
      k.includes('rate') ||
      k.includes('subtotal') ||
      k.includes('total') ||
      k.includes('duration') ||
      k.includes('quantity') ||
      k.endsWith('count')
    );
  }

  function sanitizeRecordForDbServer(record: any, table?: string) {
    if (!record || typeof record !== 'object') return record;
    const clone = { ...record };
    for (const key of Object.keys(clone)) {
      const val = clone[key];
      const isPhone = key.includes('mobile') || key.includes('whatsapp') || key.includes('phone');
      if (isNumericDbKey(key)) {
        if (val === '' || val === null || val === undefined || val === 'NaN' || val === 'null' || val === 'undefined') {
          clone[key] = (key === 'total_pax' && table === 'leads') ? 0 : null;
        } else if (typeof val === 'number') {
          if (isNaN(val)) {
            clone[key] = (key === 'total_pax' && table === 'leads') ? 0 : null;
          }
        } else if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed === '') {
            clone[key] = (key === 'total_pax' && table === 'leads') ? 0 : null;
          } else if (!isPhone) {
            const num = Number(trimmed);
            if (isNaN(num)) {
              clone[key] = null;
            } else {
              clone[key] = num;
            }
          }
        }
      }
    }
    return clone;
  }

  async function executeWithSelfHealing(table: string, operation: 'insert' | 'update' | 'upsert', payload: any, matchCol?: string, matchVal?: any) {
    const db = getServerSupabase();
    let currentPayload = sanitizeRecordForDbServer(payload, table);
    let retriesLeft = 15;
    let lastError: any = null;

    while (retriesLeft > 0) {
      retriesLeft--;
      let res: any;
      if (operation === 'insert') {
        res = await db.from(table).insert(currentPayload).select();
      } else if (operation === 'upsert') {
        res = await db.from(table).upsert(currentPayload).select();
      } else if (operation === 'update') {
        res = await db.from(table).update(currentPayload).eq(matchCol!, matchVal).select();
      }

      if (!res?.error) {
        return { success: true, data: res?.data };
      }

      lastError = res.error;
      const healed = healPayload(table, currentPayload, res.error.message || String(res.error));
      if (healed) {
        console.log(`[Server Self-Healing Loop] Stripped non-matching field, retrying ${operation} on ${table}: ${res.error.message}`);
        currentPayload = healed;
      } else {
        break;
      }
    }

    if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
      console.error(`[Server DB ${operation} Error] ${table}:`, lastError);
    }
    return { success: false, error: lastError?.message || String(lastError) };
  }

  app.post('/api/db/insert', async (req, res) => {
    const { table, record } = req.body;
    try {
      console.log(`[Server DB Insert] Inserting into ${table}`, record);
      const result = await executeWithSelfHealing(table, 'insert', record);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result.data });
    } catch (err: any) {
      if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
        console.error(`[Server DB Insert Exception] ${table}`, err);
      }
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.post('/api/db/update', async (req, res) => {
    const { table, matchColumn, matchValue, updates } = req.body;
    try {
      console.log(`[Server DB Update] Updating ${table} where ${matchColumn}=${matchValue}`, updates);

      // Enforce CRM Lock Backend
      if (table === 'leads' && matchColumn === 'lead_id') {
        const db = getServerSupabase();
        const { data: existingLead } = await db.from('leads').select('quotation_locked').eq('lead_id', matchValue).maybeSingle();
        
        if (existingLead && existingLead.quotation_locked === true) {
          const keys = Object.keys(updates);
          // Only allow update if it explicitly modifies quotation_locked or if it's updating lead_owner/assignee (not CRM data)
          const isLockAction = keys.includes('quotation_locked');
          if (!isLockAction) {
            console.warn(`[Server DB Update] Blocked update to locked lead ${matchValue}`);
            return res.status(403).json({ success: false, error: 'Lead CRM is locked. Cannot be updated.' });
          }
        }
      }

      const result = await executeWithSelfHealing(table, 'update', updates, matchColumn, matchValue);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result.data });
    } catch (err: any) {
      if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
        console.error(`[Server DB Update Exception] ${table}`, err);
      }
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.post('/api/db/upsert', async (req, res) => {
    const { table, record } = req.body;
    try {
      console.log(`[Server DB Upsert] Upserting into ${table}`, record);
      const result = await executeWithSelfHealing(table, 'upsert', record);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result.data });
    } catch (err: any) {
      if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
        console.error(`[Server DB Upsert Exception] ${table}`, err);
      }
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.post('/api/db/select', async (req, res) => {
    const { table, select = '*', orderColumn, ascending = false, matchColumn, matchValue } = req.body;
    try {
      const db = getServerSupabase();
      let query = db.from(table).select(select);
      if (matchColumn && matchValue !== undefined) {
        query = query.eq(matchColumn, matchValue);
      }
      if (orderColumn) {
        query = query.order(orderColumn, { ascending });
      }
      const { data, error } = await query;
      if (error) {
        console.error(`[Server DB Select Error] ${table}`, error);
        return res.status(400).json({ success: false, error: error.message });
      }
      res.json({ success: true, data });
    } catch (err: any) {
      console.error(`[Server DB Select Exception] ${table}`, err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.post('/api/db/delete', async (req, res) => {
    const { table, matchColumn, matchValue } = req.body;
    try {
      const db = getServerSupabase();
      console.log(`[Server DB Delete] Deleting from ${table} where ${matchColumn}=${matchValue}`);
      const { data, error } = await db.from(table).delete().eq(matchColumn, matchValue).select();
      if (error) {
        console.error(`[Server DB Delete Error] ${table}`, error);
        return res.status(400).json({ success: false, error: error.message });
      }
      res.json({ success: true, data });
    } catch (err: any) {
      console.error(`[Server DB Delete Exception] ${table}`, err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });


  app.post('/api/auth/create-user', async (req, res) => {
    const { email, password, name, role, active = true } = req.body;
    try {
      const db = getServerSupabase();
      if (!db.auth.admin) {
        return res.status(400).json({ success: false, error: 'Service Role Key not configured on server' });
      }
      
      console.log(`[Server Auth] Creating user ${email} with role ${role}`);
      
      const { data, error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role }
      });

      if (error) {
        console.error(`[Server Auth Create Error]`, error);
        return res.status(400).json({ success: false, error: error.message });
      }

      const authUser = data.user;
      
      const userRecord = {
        id: authUser.id, // Primary key
        name,
        email,
        role,
        active,
        created_at: new Date().toISOString()
      };
      
      const { data: dbData, error: dbError } = await db.from('users').upsert(userRecord).select();
      
      if (dbError) {
        console.error(`[Server Auth DB Upsert Error]`, dbError);
        return res.status(400).json({ success: false, error: dbError.message });
      }

      res.json({ success: true, data: { user: authUser, record: dbData?.[0] } });
    } catch (err: any) {
      console.error(`[Server Auth Create Exception]`, err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.post('/api/auth/update-user', async (req, res) => {
    const { auth_id, email, password, name, role, active } = req.body;
    try {
      const db = getServerSupabase();
      if (!db.auth.admin) {
        return res.status(400).json({ success: false, error: 'Service Role Key not configured' });
      }
      
      const updates: any = {};
      if (password) updates.password = password;
      if (email) updates.email = email;
      if (name || role) updates.user_metadata = { name, role };
      
      if (Object.keys(updates).length > 0) {
          const { error } = await db.auth.admin.updateUserById(auth_id, updates);
          if (error) {
              console.error(`[Server Auth Update Error]`, error);
              return res.status(400).json({ success: false, error: error.message });
          }
      }
      
      // Update users table
      const userUpdates: any = { updated_at: new Date().toISOString() };
      if (name) userUpdates.name = name;
      if (email) userUpdates.email = email;
      if (role) userUpdates.role = role;
      if (active !== undefined) userUpdates.active = active;
      
      const { data: dbData, error: dbError } = await db.from('users').update(userUpdates).eq('id', auth_id).select();
      
      if (dbError) {
         console.error(`[Server Auth DB Update Error]`, dbError);
         return res.status(400).json({ success: false, error: dbError.message });
      }
      
      res.json({ success: true, data: { record: dbData?.[0] } });
    } catch (err: any) {
      console.error(`[Server Auth Update Exception]`, err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
