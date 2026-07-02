import express from 'express';
import path from 'path';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://plrtavqnsbqopvqtwezb.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  app.use(express.json());

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
    if (table !== 'leads' && table !== 'orders' && table !== 'quotations' && table !== 'lead_packages') return null;
    
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

  app.post('/api/db/insert', async (req, res) => {
    const { table, record } = req.body;
    try {
      const db = getServerSupabase();
      console.log(`[Server DB Insert] Inserting into ${table}`, record);
      let { data, error } = await db.from(table).insert(record).select();
      if (error) {
        // Try healing the payload if it's a schema cache mismatch error
        const healed = healPayload(table, record, error.message);
        if (healed) {
          console.log(`[Server Self-Healing retry] Retrying insert with healed record:`, healed);
          const retryRes = await db.from(table).insert(healed).select();
          if (!retryRes.error) {
            return res.json({ success: true, data: retryRes.data });
          }
          error = retryRes.error; // Keep latest error
        }

        if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
          console.error(`[Server DB Insert Error] ${table}`, error);
        }
        return res.status(400).json({ success: false, error: error.message });
      }
      res.json({ success: true, data });
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
      const db = getServerSupabase();
      console.log(`[Server DB Update] Updating ${table} where ${matchColumn}=${matchValue}`, updates);
      let { data, error } = await db.from(table).update(updates).eq(matchColumn, matchValue).select();
      if (error) {
        // Try healing the payload if it's a schema cache mismatch error
        const healed = healPayload(table, updates, error.message);
        if (healed) {
          console.log(`[Server Self-Healing retry] Retrying update with healed updates:`, healed);
          const retryRes = await db.from(table).update(healed).eq(matchColumn, matchValue).select();
          if (!retryRes.error) {
            return res.json({ success: true, data: retryRes.data });
          }
          error = retryRes.error; // Keep latest error
        }

        if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
          console.error(`[Server DB Update Error] ${table}`, error);
        }
        return res.status(400).json({ success: false, error: error.message });
      }
      res.json({ success: true, data });
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
      const db = getServerSupabase();
      console.log(`[Server DB Upsert] Upserting into ${table}`, record);
      let { data, error } = await db.from(table).upsert(record).select();
      if (error) {
        // Try healing the payload if it's a schema cache mismatch error
        const healed = healPayload(table, record, error.message);
        if (healed) {
          console.log(`[Server Self-Healing retry] Retrying upsert with healed record:`, healed);
          const retryRes = await db.from(table).upsert(healed).select();
          if (!retryRes.error) {
            return res.json({ success: true, data: retryRes.data });
          }
          error = retryRes.error; // Keep latest error
        }

        if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
          console.error(`[Server DB Upsert Error] ${table}`, error);
        }
        return res.status(400).json({ success: false, error: error.message });
      }
      res.json({ success: true, data });
    } catch (err: any) {
      if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
        console.error(`[Server DB Upsert Exception] ${table}`, err);
      }
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.post('/api/db/delete', async (req, res) => {
    const { table, matchColumn, matchValue } = req.body;
    try {
      const db = getServerSupabase();
      console.log(`[Server DB Delete] Deleting from ${table} where ${matchColumn}=${matchValue}`);
      const { error } = await db.from(table).delete().eq(matchColumn, matchValue);
      if (error) {
        console.error(`[Server DB Delete Error] ${table}`, error);
        return res.status(400).json({ success: false, error: error.message });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error(`[Server DB Delete Exception] ${table}`, err);
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
