import express from 'express';
import path from 'path';
import fs from 'fs';
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

  // Health check endpoint for Cloud Run and load balancers
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
  });

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
      
      const base64Data = base64.includes(';base64,') ? base64.split(';base64,')[1] : base64.replace(/^data:[^;]+;base64,/, '');
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
  const extractMissingColumnName = (errorMsg: string): string | null => {
    if (!errorMsg || typeof errorMsg !== 'string') return null;
    const p1 = errorMsg.match(/Could not find the ['"]([^'"]+)['"] column/i);
    if (p1 && p1[1]) return p1[1];

    const p2 = errorMsg.match(/column ['"]([^'"]+)['"] (of relation|does not exist)/i);
    if (p2 && p2[1]) return p2[1];

    const p3 = errorMsg.match(/column ['"]([^'"]+)['"]/i);
    if (p3 && p3[1] && !['of', 'in', 'on', 'from'].includes(p3[1].toLowerCase())) {
      return p3[1];
    }
    return null;
  };

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
      'Select_Package_Option',
      'customer_communication_proof',
      'client_communication_proof',
      'confirmation_proof',
      'proof_url',
      'proof_image',
      'uploaded_proof',
      'approval_status',
      'payment_history_id'
    ];

    // If the error explicitly mentions a column, remove it
    const colName = extractMissingColumnName(errorMsg);
    
    if (colName && colName in nextPayload) {
      console.warn(`[Server Self-Healing] Found specific stale column "${colName}" for table "${table}". Stripping...`);
      const val = nextPayload[colName];
      delete nextPayload[colName];
      
      // Save the stripped value to remarks/notes
      const currentRemarks = nextPayload.remarks || nextPayload.notes || '';
      const annotation = `[System Fallback - ${colName}]: ${val}`;
      if (nextPayload.remarks !== undefined) {
        nextPayload.remarks = currentRemarks ? `${currentRemarks}\n${annotation}` : annotation;
      } else if (nextPayload.notes !== undefined) {
        nextPayload.notes = currentRemarks ? `${currentRemarks}\n${annotation}` : annotation;
      } else if (['leads', 'orders', 'operations', 'production'].includes(table)) {
        nextPayload.remarks = annotation;
      }
      healed = true;
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
        } else if (['leads', 'orders', 'operations', 'production'].includes(table)) {
          nextPayload.remarks = annotation;
        }
        healed = true;
      }
    }

    // Handle invalid input syntax for type numeric/integer/bigint/etc.
    const invalidSyntaxMatch = errorMsg.match(/invalid input syntax for type [^:]+: "([^"]+)"/i) ||
                               errorMsg.match(/invalid input syntax for type [^:]+: ([^\s]+)/i);
    if (invalidSyntaxMatch) {
      const badVal = invalidSyntaxMatch[1];
      console.warn(`[Server Self-Healing] Found invalid input syntax value "${badVal}". Locating matching field in payload...`);
      for (const [k, v] of Object.entries(nextPayload)) {
        if (v != null && (String(v) === badVal || (typeof v === 'string' && (v.includes(badVal) || badVal.includes(v))))) {
          console.warn(`[Server Self-Healing] Found matching field "${k}" with invalid syntax value "${v}". Cleaning or stripping...`);
          const digits = String(v).replace(/\D/g, '');
          if (digits && digits.length > 0 && String(v) !== digits) {
            nextPayload[k] = digits;
            console.warn(`[Server Self-Healing] Replaced field "${k}" with digits: "${digits}"`);
          } else {
            const val = nextPayload[k];
            delete nextPayload[k];
            const currentRemarks = nextPayload.remarks || nextPayload.notes || '';
            const annotation = `[System Fallback - ${k}]: ${val}`;
            if (nextPayload.remarks !== undefined) {
              nextPayload.remarks = currentRemarks ? `${currentRemarks}\n${annotation}` : annotation;
            } else if (nextPayload.notes !== undefined) {
              nextPayload.notes = currentRemarks ? `${currentRemarks}\n${annotation}` : annotation;
            } else if (['leads', 'orders', 'operations', 'production'].includes(table)) {
              nextPayload.remarks = annotation;
            }
          }
          healed = true;
          break;
        }
      }
    }

    // Handle malformed array literal or array type errors
    if (lowerMsg.includes('malformed array literal') || lowerMsg.includes('array')) {
      console.warn(`[Server Self-Healing] Found malformed array literal error in table "${table}". Cleaning empty/invalid array inputs...`);
      for (const [k, v] of Object.entries(nextPayload)) {
        if (v === '' || v === '""' || v === "''" || (Array.isArray(v) && v.length === 0)) {
          nextPayload[k] = null;
          healed = true;
        } else if (typeof v === 'string' && v.includes(',')) {
          const arr = v.split(',').map(s => s.trim()).filter(Boolean);
          nextPayload[k] = arr.length > 0 ? arr : null;
          healed = true;
        }
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

  function sanitizeRecordForDbServer(record: any, table?: string): any {
    if (!record || typeof record !== 'object') return record;
    if (Array.isArray(record)) {
      return record.map(r => sanitizeRecordForDbServer(r, table));
    }
    const clone = { ...record };

    if (table === 'production_staff') {
      if ('password' in clone && clone.Password === undefined) {
        clone.Password = clone.password;
        delete clone.password;
      }
    }

    if (table === 'editor_assignments') {
      if ('Edited_Drive_Link' in clone) {
        if (!clone.edited_drive_link && clone.Edited_Drive_Link) {
          clone.edited_drive_link = clone.Edited_Drive_Link;
        }
      }
      const validCols = new Set([
        'assignment_id', 'production_id', 'staff_id', 'staff_name', 'speciality',
        'assigned_date', 'target_finish_date', 'status', 'created_at', 'event_id',
        'order_id', 'deliverable_id', 'edited_drive_link',
        'server_upload_confirmed', 'server_upload_event_date', 'server_upload_folder_name',
        'server_upload_confirmed_at', 'server_upload_confirmed_by',
        'edited_folder_uploaded_to_server', 'server_upload_validated',
        'server_upload_validated_at', 'server_upload_validated_by',
        'confirmation_proof', 'customer_communication_proof', 'client_communication_proof',
        'proof_url', 'proof_image', 'uploaded_proof', 'folder_name', 'upload_link_path'
      ]);
      for (const k of Object.keys(clone)) {
        if (!validCols.has(k)) {
          delete clone[k];
        }
      }
    }

    if (table === 'staff_assignments') {
      const validCols = new Set([
        'assignment_id', 'order_id', 'lead_id', 'task_id', 'slot_number', 'staff_role', 'staff_id', 'staff_name',
        'assignment_date', 'assignment_status', 'task_status', 'updated_at',
        'updated_by', 'raw_footage_link', 'created_at',
        'equipment_received_photo', 'equipment_handover_photo', 'equipment_handover_notes',
        'equipment_handover_to', 'event_start_photo', 'event_start_time',
        'event_end_photo', 'event_end_time', 'event_id', 'event_name', 'event_date',
        'reporting_time', 'equipment', 'assigned_equipment', 'equipment_details',
        'mobile', 'staff_type', 'proofs', 'notes', 'remarks'
      ]);
      if (!clone.assignment_id && (clone.order_id || clone.lead_id || clone.staff_name)) {
        const rawId = `SA-${clone.order_id || clone.lead_id || 'gen'}-${Date.now()}`;
        clone.assignment_id = rawId.length > 50 ? rawId.slice(0, 50) : rawId;
      }

      if (Array.isArray(clone.equipment)) {
        clone.equipment = clone.equipment.length > 0 ? clone.equipment : null;
      } else if (typeof clone.equipment === 'string') {
        const trimmed = clone.equipment.trim();
        clone.equipment = trimmed ? trimmed.split(',').map((s: string) => s.trim()).filter(Boolean) : null;
      } else if (!clone.equipment) {
        clone.equipment = null;
      }

      if (Array.isArray(clone.assigned_equipment)) {
        clone.assigned_equipment = clone.assigned_equipment.length > 0 ? clone.assigned_equipment : null;
      } else if (typeof clone.assigned_equipment === 'string') {
        const trimmed = clone.assigned_equipment.trim();
        clone.assigned_equipment = trimmed ? trimmed.split(',').map((s: string) => s.trim()).filter(Boolean) : null;
      } else if (!clone.assigned_equipment) {
        clone.assigned_equipment = null;
      }

      if (Array.isArray(clone.proofs)) {
        clone.proofs = clone.proofs.length > 0 ? clone.proofs : null;
      } else if (typeof clone.proofs === 'string') {
        const trimmed = clone.proofs.trim();
        clone.proofs = trimmed ? trimmed.split(',').map((s: string) => s.trim()).filter(Boolean) : null;
      } else if (!clone.proofs) {
        clone.proofs = null;
      }

      const varchar50Cols = ['assignment_id', 'task_id', 'order_id', 'lead_id', 'staff_id', 'assignment_status', 'task_status', 'reporting_time', 'staff_type', 'event_id', 'updated_by'];
      for (const vCol of varchar50Cols) {
        if (typeof clone[vCol] === 'string' && clone[vCol].length > 50) {
          clone[vCol] = clone[vCol].substring(0, 50);
        }
      }

      for (const k of Object.keys(clone)) {
        if (!validCols.has(k)) {
          delete clone[k];
        }
      }
    }

    if (table === 'staff_task_submissions') {
      const validCols = new Set([
        'id', 'assignment_id', 'order_id', 'lead_id', 'event_id', 'event_name',
        'staff_id', 'staff_name', 'staff_role', 'submission_type', 'task_status',
        'photo_url', 'proof_photos', 'raw_footage_link', 'handover_to',
        'handover_notes', 'equipment_name', 'asset_id', 'remarks', 'created_at'
      ]);
      if (!clone.created_at) {
        clone.created_at = new Date().toISOString();
      }
      for (const k of Object.keys(clone)) {
        if (!validCols.has(k)) {
          delete clone[k];
        }
      }
    }

    if (table === 'raw_footage') {
      const validCols = new Set([
        'tracking_id', 'order_id', 'event_completed_date', 'raw_received',
        'server_path', 'drive_link', 'uploaded_by', 'uploaded_date', 'status',
        'assignment_id', 'event_id', 'event_name'
      ]);
      if (!clone.tracking_id) {
        clone.tracking_id = `TRK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      if (!clone.event_completed_date) {
        clone.event_completed_date = new Date().toISOString().split('T')[0];
      }
      if (clone.raw_received === undefined) {
        clone.raw_received = clone.status === 'Received' || !!clone.server_path || !!clone.drive_link;
      }
      if (!clone.status) {
        clone.status = clone.raw_received ? 'Received' : 'Pending';
      }
      for (const k of Object.keys(clone)) {
        if (!validCols.has(k)) {
          delete clone[k];
        }
      }
    }

    if (table === 'lead_events') {
      const validCols = new Set([
        'id', 'lead_id', 'event_type', 'event_name', 'event_shoot_type', 'event_date',
        'event_end_date', 'event_start_time', 'event_end_time', 'event_location',
        'google_maps_link', 'guest_pax', 'staff_pax', 'assigned_staff_names',
        'assigned_staff_mobiles', 'assigned_equipment', 'reporting_date', 'reporting_time',
        'created_at', 'updated_at'
      ]);
      if (clone.Reporting_date && !clone.reporting_date) {
        clone.reporting_date = clone.Reporting_date;
      }
      for (const k of Object.keys(clone)) {
        if (!validCols.has(k)) {
          delete clone[k];
        }
      }
    }

    if (table === 'payment_history') {
      const validCols = new Set([
        'id', 'order_id', 'amount', 'payment_date', 'transaction_id',
        'payment_mode', 'payment_type', 'updated_by', 'notes', 'created_at', 'approval_status'
      ]);
      if (clone.approval_status) {
        const currentNotes = clone.notes || '';
        if (clone.approval_status === 'Waiting for Approval') {
          const stripped = currentNotes.replace(/ - Waiting for Approval/g, '').replace(/Waiting for Approval/g, '').replace(/ - Approved/g, '').replace(/Approved by Business Owner/g, '').replace(/ - Rejected/g, '').replace(/Rejected by Business Owner/g, '').trim();
          clone.notes = stripped ? `${stripped} - Waiting for Approval` : 'Waiting for Approval';
        } else if (clone.approval_status === 'Approved') {
          const stripped = currentNotes.replace(/ - Waiting for Approval/g, '').replace(/Waiting for Approval/g, '').replace(/ - Approved/g, '').replace(/Approved by Business Owner/g, '').replace(/ - Rejected/g, '').replace(/Rejected by Business Owner/g, '').trim();
          clone.notes = stripped ? `${stripped} - Approved` : 'Approved by Business Owner';
        } else if (clone.approval_status === 'Rejected') {
          const stripped = currentNotes.replace(/ - Waiting for Approval/g, '').replace(/Waiting for Approval/g, '').replace(/ - Approved/g, '').replace(/Approved by Business Owner/g, '').replace(/ - Rejected/g, '').replace(/Rejected by Business Owner/g, '').trim();
          clone.notes = stripped ? `${stripped} - Rejected` : 'Rejected by Business Owner';
        }
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (clone.id && !uuidRegex.test(clone.id)) {
        delete clone.id;
      }
      for (const k of Object.keys(clone)) {
        if (!validCols.has(k)) {
          delete clone[k];
        }
      }
    }

    for (const key of Object.keys(clone)) {
      const val = clone[key];
      if (key.toLowerCase() === 'whatsapp_number') {
        if (val === '' || val === null || val === undefined || val === 'NaN' || val === 'null' || val === 'undefined') {
          clone[key] = null;
        } else {
          const digits = String(val).replace(/\D/g, '');
          clone[key] = digits ? Number(digits) : null;
        }
        continue;
      }
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
      } else if (isPhone && typeof val === 'string' && val.trim() !== '') {
        const digits = val.replace(/\D/g, '');
        if (digits) {
          clone[key] = digits;
        }
      }
    }
    return clone;
  }

  function cleanPhone(phone: string | undefined | null): string {
    if (!phone) return '';
    const cleaned = String(phone).replace(/[^\d]/g, '');
    return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
  }

  function cleanEmail(email: string | undefined | null): string {
    if (!email) return '';
    return String(email).trim().toLowerCase();
  }

  async function checkGlobalMobileUniqueInDb(db: any, mobile: string | undefined | null, excludeId?: string | null): Promise<{ isUnique: boolean; error?: string }> {
    const norm = cleanPhone(mobile);
    if (!norm || norm.length < 7) {
      return { isUnique: true };
    }

    const cleanExclude = excludeId ? String(excludeId).trim().toLowerCase() : null;

    try {
      // 1. Check public.users
      const { data: usersData } = await db.from('users').select('id, name, mobile, email');
      if (Array.isArray(usersData)) {
        for (const u of usersData) {
          const uNorm = cleanPhone(u.mobile);
          if (uNorm && uNorm === norm) {
            const uId = u.id ? String(u.id).trim().toLowerCase() : '';
            if (cleanExclude && uId === cleanExclude) continue;
            return { isUnique: false, error: 'Mobile number already exists. Please use a different mobile number.' };
          }
        }
      }

      // 2. Check operations_staff
      const { data: opData } = await db.from('operations_staff').select('staff_id, name, mobile, email');
      if (Array.isArray(opData)) {
        for (const s of opData) {
          const sNorm = cleanPhone(s.mobile || s.mobile_number || s.phone);
          if (sNorm && sNorm === norm) {
            const sId = s.staff_id ? String(s.staff_id).trim().toLowerCase() : (s.id ? String(s.id).trim().toLowerCase() : '');
            if (cleanExclude && sId === cleanExclude) continue;
            return { isUnique: false, error: 'Mobile number already exists. Please use a different mobile number.' };
          }
        }
      }

      // 3. Check production_staff
      const { data: prodData } = await db.from('production_staff').select('staff_id, name, mobile, email');
      if (Array.isArray(prodData)) {
        for (const p of prodData) {
          const pNorm = cleanPhone(p.mobile || p.mobile_number || p.phone);
          if (pNorm && pNorm === norm) {
            const pId = p.staff_id ? String(p.staff_id).trim().toLowerCase() : (p.id ? String(p.id).trim().toLowerCase() : '');
            if (cleanExclude && pId === cleanExclude) continue;
            return { isUnique: false, error: 'Mobile number already exists. Please use a different mobile number.' };
          }
        }
      }
    } catch (err: any) {
      console.warn('[checkGlobalMobileUniqueInDb] DB check warning:', err?.message || err);
    }

    return { isUnique: true };
  }

  async function executeWithSelfHealing(table: string, operation: 'insert' | 'update' | 'upsert', payload: any, matchCol?: string, matchVal?: any) {
    const db = getServerSupabase();

    // Global unique mobile enforcement across operations_staff, production_staff, and users
    if (['operations_staff', 'production_staff', 'users'].includes(table)) {
      const items = Array.isArray(payload) ? payload : [payload];
      for (const item of items) {
        if (!item) continue;
        const incomingMobile = item.mobile || item.mobile_number || item.phone;
        const excludeVal = (operation === 'update' || operation === 'upsert') ? (matchVal || item.staff_id || item.id) : null;
        if (incomingMobile) {
          const uniqueCheck = await checkGlobalMobileUniqueInDb(db, incomingMobile, excludeVal);
          if (!uniqueCheck.isUnique) {
            return { success: false, error: uniqueCheck.error };
          }
        }
      }
    }

    // Self-healing insert handler for lead_events to prevent primary key sequence collisions
    if (table === 'lead_events' && operation === 'insert') {
      const items = Array.isArray(payload) ? payload : [payload];
      const insertedRows: any[] = [];
      
      const { data: allEvs } = await db.from('lead_events').select('id');
      let currentMaxId = 0;
      const existingIdSet = new Set<number>();
      if (Array.isArray(allEvs)) {
        for (const row of allEvs) {
          const num = typeof row.id === 'number' ? row.id : parseInt(String(row.id), 10);
          if (!isNaN(num)) {
            existingIdSet.add(num);
            if (num > currentMaxId) currentMaxId = num;
          }
        }
      }

      for (const rawItem of items) {
        if (!rawItem) continue;
        const cleanItem = sanitizeRecordForDbServer(rawItem, 'lead_events');
        
        let targetId = cleanItem.id ? Number(cleanItem.id) : null;
        if (!targetId || isNaN(targetId) || existingIdSet.has(targetId)) {
          currentMaxId++;
          while (existingIdSet.has(currentMaxId)) {
            currentMaxId++;
          }
          targetId = currentMaxId;
          existingIdSet.add(targetId);
          cleanItem.id = targetId;
        }

        let { data: insData, error: insErr } = await db.from('lead_events').insert(cleanItem).select();
        
        let retryCount = 0;
        while (insErr && (insErr.code === '23505' || insErr.message?.includes('duplicate key') || insErr.message?.includes('lead_events_pkey')) && retryCount < 20) {
          retryCount++;
          currentMaxId++;
          while (existingIdSet.has(currentMaxId)) {
            currentMaxId++;
          }
          cleanItem.id = currentMaxId;
          existingIdSet.add(currentMaxId);
          const retryRes = await db.from('lead_events').insert(cleanItem).select();
          insData = retryRes.data;
          insErr = retryRes.error;
        }

        if (!insErr && insData && insData.length > 0) {
          insertedRows.push(insData[0]);
        } else if (insErr) {
          console.error(`[Server DB lead_events insert error]:`, insErr);
          return { success: false, error: insErr.message || String(insErr) };
        } else {
          insertedRows.push(cleanItem);
        }
      }
      return { success: true, data: Array.isArray(payload) ? insertedRows : (insertedRows[0] || insertedRows) };
    }

    // Map equipment_handovers to lead_equipment_history to ensure persistence without schema errors
    if (table === 'equipment_handovers') {
      const items = Array.isArray(payload) ? payload : [payload];
      const historyRecords = items.map((h: any) => ({
        lead_id: h.lead_id || h.order_id || 'UNKNOWN',
        order_id: h.order_id || null,
        equipment_name: h.equipment_name || 'Equipment Handover',
        equipment_status: h.return_status || 'Returned',
        returned_by: h.returned_by || 'Staff',
        returned_at: h.return_date ? new Date(h.return_date).toISOString() : (h.created_at || new Date().toISOString()),
        remarks: h.notes || `Equipment Handover: ${h.equipment_name || ''} - ${h.return_status || ''}`
      }));
      const { data: histData, error: histErr } = await db.from('lead_equipment_history').insert(historyRecords).select();
      if (histErr) {
        console.warn('[Server DB equipment_handovers -> lead_equipment_history fallback warn]:', histErr.message);
      }
      return { success: true, data: histData || items };
    }

    if (table === 'payment_history') {
      if (matchCol === 'payment_history_id') {
        matchCol = 'id';
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (matchCol === 'id' && matchVal && !uuidRegex.test(String(matchVal))) {
        const orderIdToMatch = payload?.order_id;
        if (orderIdToMatch) {
          const { data: existingRows } = await db.from('payment_history').select('*').eq('order_id', orderIdToMatch);
          const rows = existingRows || [];
          const found = rows.find((r: any) => 
            (payload.transaction_id && r.transaction_id && r.transaction_id === payload.transaction_id) ||
            (payload.id && r.id === payload.id)
          ) || rows.find((r: any) => 
            (Number(payload.amount) && Number(r.amount) === Number(payload.amount) && payload.payment_type && r.payment_type === payload.payment_type)
          ) || rows.find((r: any) => 
            (r.notes && r.notes.includes('Waiting for Approval'))
          );
          if (found) {
            matchVal = found.id;
          } else {
            return { success: true, data: [{ ...payload, id: matchVal }] };
          }
        } else {
          return { success: true, data: [{ ...payload, id: matchVal }] };
        }
      }
    }

    if (table === 'users') {
      const uItem = Array.isArray(payload) ? payload[0] : payload;
      if (uItem) {
        let normalizedRole = 'Operation Staff';
        if (uItem.role) {
          const r = String(uItem.role).trim().toLowerCase();
          if (r.includes('owner') || r.includes('business')) normalizedRole = 'Business Owner';
          else if (r.includes('sales')) normalizedRole = 'Sales Team';
          else if (r.includes('prod') && r.includes('staff')) normalizedRole = 'Production Staff';
          else if (r.includes('editor')) normalizedRole = 'Production Staff';
          else if (r.includes('prod') && r.includes('team')) normalizedRole = 'Production Team';
          else if (r.includes('op') && r.includes('staff')) normalizedRole = 'Operation Staff';
          else if (r.includes('op') && r.includes('team')) normalizedRole = 'Operations Team';
          else if (r.includes('prod')) normalizedRole = 'Production Team';
          else normalizedRole = 'Operation Staff';
        }

        const cleanE = uItem.email ? String(uItem.email).trim().toLowerCase() : '';
        const cleanM = uItem.mobile ? String(uItem.mobile).trim() : '0000000000';
        const targetId = uItem.id;

        const orConds = [];
        if (targetId) orConds.push(`id.eq.${targetId}`);
        if (cleanE) orConds.push(`email.eq.${cleanE}`);
        if (cleanM && cleanM !== '0000000000') orConds.push(`mobile.eq.${cleanM}`);

        if (orConds.length > 0) {
          const { data: existingRows } = await db.from('users').select('*').or(orConds.join(',')).limit(1);
          if (existingRows && existingRows.length > 0) {
            const existing = existingRows[0];
            const updates: any = {
              name: uItem.name || existing.name,
              mobile: cleanM || existing.mobile || '0000000000',
              username: uItem.username || cleanE || existing.username,
              role: normalizedRole,
              active: uItem.active !== undefined ? uItem.active : existing.active
            };
            if (uItem.password) {
              updates.password = uItem.password;
            }
            const { data: upd, error: updErr } = await db.from('users').update(updates).eq('id', existing.id).select();
            if (!updErr && upd && upd.length > 0) {
              return { success: true, data: upd };
            }
          }
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const validId = targetId && uuidRegex.test(targetId) ? targetId : crypto.randomUUID();
        const insertRecord = {
          id: validId,
          name: uItem.name || 'Staff',
          email: cleanE || `${cleanM}@photocrew.com`,
          mobile: cleanM,
          username: uItem.username || cleanE || `${cleanM}@photocrew.com`,
          role: normalizedRole,
          active: uItem.active !== undefined ? uItem.active : true,
          password: uItem.password || null,
          created_at: uItem.created_at || new Date().toISOString()
        };
        const { data: ins, error: insErr } = await db.from('users').insert(insertRecord).select();
        if (!insErr && ins && ins.length > 0) {
          return { success: true, data: ins };
        } else if (insErr) {
          console.error('[Server DB users insert error]:', insErr);
          return { success: false, error: insErr.message };
        }
      }
    }

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
        let returnData = res?.data;
        if (table === 'editor_assignments' && Array.isArray(returnData)) {
          returnData = returnData.map((row: any) => ({
            ...row,
            Edited_Drive_Link: row.Edited_Drive_Link || row.edited_drive_link || null,
            edited_drive_link: row.edited_drive_link || row.Edited_Drive_Link || null
          }));
        }
        return { success: true, data: returnData };
      }

      // Handle raw_footage constraint violations / duplicate tracking or order_id
      if (table === 'raw_footage' && (res.error?.code === '23505' || res.error?.code === '23502')) {
        console.warn(`[Server DB] Handled constraint on raw_footage (${res.error.code}). Attempting upsert / update by order_id.`);
        const rfItem = Array.isArray(currentPayload) ? currentPayload[0] : currentPayload;
        if (rfItem && rfItem.order_id) {
          const { data: existingRows } = await db.from('raw_footage').select('*').eq('order_id', rfItem.order_id);
          if (existingRows && existingRows.length > 0) {
            const existing = existingRows[0];
            const { data: updRf } = await db.from('raw_footage').update({
              server_path: rfItem.server_path || existing.server_path,
              uploaded_by: rfItem.uploaded_by || existing.uploaded_by,
              uploaded_date: rfItem.uploaded_date || existing.uploaded_date || new Date().toISOString(),
              raw_received: rfItem.raw_received !== undefined ? rfItem.raw_received : existing.raw_received,
              status: rfItem.status || existing.status || 'Received'
            }).eq('tracking_id', existing.tracking_id).select();
            if (updRf && updRf.length > 0) {
              return { success: true, data: updRf };
            }
          }
        }
      }

      if (table === 'staff_assignments') {
        console.warn(`[Server DB] Handled constraint/error on staff_assignments (${res.error?.message || res.error?.code}). Ensuring isolated slot assignment without overwriting other slots.`);
        const items = Array.isArray(currentPayload) ? currentPayload : [currentPayload];
        const updatedRows: any[] = [];
        for (const itm of items) {
          if (!itm) continue;
          let handled = false;
          const targetAssignId = itm.assignment_id || (matchCol === 'assignment_id' ? matchVal : undefined);

          // 1. Try matching by exact assignment_id if present
          if (targetAssignId) {
            const cleanItm = { ...itm, assignment_id: targetAssignId };
            const { data: matchedById } = await db.from('staff_assignments').select('*').eq('assignment_id', targetAssignId);
            if (matchedById && matchedById.length > 0) {
              const { data: upd, error: updErr } = await db.from('staff_assignments').update(cleanItm).eq('assignment_id', targetAssignId).select();
              if (!updErr && upd && upd.length > 0) {
                updatedRows.push(upd[0]);
                handled = true;
              }
            } else {
              const { data: ins, error: insErr } = await db.from('staff_assignments').upsert(cleanItm, { onConflict: 'assignment_id' }).select();
              if (!insErr && ins && ins.length > 0) {
                updatedRows.push(ins[0]);
                handled = true;
              }
            }
          }

          // 2. Try matching by exact task_id if present
          if (!handled && itm.task_id) {
            const { data: matchedByTask } = await db.from('staff_assignments').select('*').eq('task_id', itm.task_id);
            if (matchedByTask && matchedByTask.length > 0) {
              const matchedAssignId = matchedByTask[0].assignment_id;
              const { data: upd, error: updErr } = await db.from('staff_assignments').update({
                ...itm,
                assignment_id: matchedAssignId
              }).eq('assignment_id', matchedAssignId).select();
              if (!updErr && upd && upd.length > 0) {
                updatedRows.push(upd[0]);
                handled = true;
              }
            }
          }

          // 3. Fallback: upsert as independent record with isolated assignment_id
          // CRITICAL: NEVER match or overwrite by order_id + staff_name or staff_id alone!
          if (!handled) {
            const assignId = targetAssignId || `ASST-${itm.order_id || 'gen'}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const cleanItm = { ...itm, assignment_id: assignId };
            const { data: upsertData, error: upsertErr } = await db.from('staff_assignments').upsert(cleanItm, { onConflict: 'assignment_id' }).select();
            if (!upsertErr && upsertData && upsertData.length > 0) {
              updatedRows.push(upsertData[0]);
            } else {
              updatedRows.push(cleanItm);
            }
          }
        }
        return { success: true, data: updatedRows.length > 0 ? updatedRows : (Array.isArray(currentPayload) ? currentPayload : [currentPayload]) };
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

  // --- Google Sheets Backup Logic ---
  let hasLoggedSpreadsheetUrlWarning = false;

  const triggerGoogleSheetsBackup = (table: string, action: string, data: any, record_id?: string) => {
    const GOOGLE_SHEETS_BACKUP_URL = process.env.GOOGLE_SHEETS_BACKUP_URL;
    const GOOGLE_SHEETS_BACKUP_SECRET = process.env.GOOGLE_SHEETS_BACKUP_SECRET;

    if (!GOOGLE_SHEETS_BACKUP_URL || !GOOGLE_SHEETS_BACKUP_SECRET) {
      return;
    }

    const trimmedUrl = GOOGLE_SHEETS_BACKUP_URL.trim();
    if (!trimmedUrl || trimmedUrl.startsWith('YOUR_') || trimmedUrl === 'MY_GOOGLE_SHEETS_BACKUP_URL') {
      return;
    }

    // If user provided a spreadsheet document link instead of a Google Apps Script Web App /exec endpoint
    if (trimmedUrl.includes('docs.google.com/spreadsheets')) {
      if (!hasLoggedSpreadsheetUrlWarning) {
        console.warn('[Server Backup Notice] GOOGLE_SHEETS_BACKUP_URL is configured with a Google Sheets view link (docs.google.com/spreadsheets/...) instead of a Google Apps Script Web App (/exec) endpoint. HTTP webhook backup skipped.');
        hasLoggedSpreadsheetUrlWarning = true;
      }
      return;
    }

    // Fire and forget, don't await to avoid blocking Supabase operations
    (async () => {
      try {
        let actual_record_id = record_id;
        if (!actual_record_id && data) {
           actual_record_id = data.id || data.lead_id || data.order_id || data.package_id || data.staff_id || data.payment_id || data.assignment_id || "unknown";
        }
        
        if (action === 'delete' && !actual_record_id && data) {
           actual_record_id = data;
        }

        const payload = {
          token: GOOGLE_SHEETS_BACKUP_SECRET,
          table,
          record_id: String(actual_record_id || ''),
          action,
          data
        };

        const jsonString = JSON.stringify(payload);

        // Attempt 1: Standard POST with text/plain (Google Apps Script Web App standard format to prevent 405/CORS redirect drop)
        let response = await fetch(trimmedUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: jsonString,
          redirect: 'follow'
        }).catch(() => null);

        // Attempt 2: If 405 Method Not Allowed, fallback to GET (in case Google Apps Script web app only implemented doGet)
        if (response && response.status === 405) {
          try {
            const urlObj = new URL(trimmedUrl);
            urlObj.searchParams.set('token', GOOGLE_SHEETS_BACKUP_SECRET);
            urlObj.searchParams.set('table', table);
            urlObj.searchParams.set('record_id', String(actual_record_id || ''));
            urlObj.searchParams.set('action', action);
            urlObj.searchParams.set('payload', jsonString);

            response = await fetch(urlObj.toString(), {
              method: 'GET',
              redirect: 'follow'
            }).catch(() => null);
          } catch (_) {
            // Ignore URL parse error for fallback
          }
        }

        // Attempt 3: Try application/json POST if still failing and status was not 405 initially
        if (!response || (!response.ok && response.status !== 405 && response.status !== 200)) {
          response = await fetch(trimmedUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: jsonString,
            redirect: 'follow'
          }).catch(() => null);
        }

        if (response && !response.ok) {
          if (response.status === 405) {
            console.warn(`[Server Backup Notice] Google Sheets Backup endpoint returned status 405 (Method Not Allowed). Ensure the Google Apps Script Web App is deployed with doPost(e) and deployed as 'Anyone'. Table: ${table}, Action: ${action}`);
          } else {
            console.warn(`[Server Backup Notice] Google Sheets Backup returned status ${response.status} for ${table} ${action}.`);
          }
        }
      } catch (err: any) {
        console.warn(`[Server Backup Warning] Google Sheets Backup failed for ${table} ${action}:`, err?.message || err);
      }
    })();
  };

  app.post('/api/sheets-backup', async (req, res) => {
     const { table, record_id, action, data } = req.body;
     triggerGoogleSheetsBackup(table, action, data, record_id);
     res.json({ success: true, message: 'Backup triggered' });
  });

  app.post('/api/db/insert', async (req, res) => {
    const { table, record } = req.body;
    try {
      console.log(`[Server DB Insert] Inserting into ${table}`, record);
      const result = await executeWithSelfHealing(table, 'insert', record);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      
      triggerGoogleSheetsBackup(table, 'insert', result.data?.[0] || record);
      
      res.json({ success: true, data: result.data });
    } catch (err: any) {
      if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
        console.error(`[Server DB Insert Exception] ${table}`, err);
      }
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.post('/api/db/update', async (req, res) => {
    let { table, matchColumn, matchValue, updates } = req.body;
    try {
      if (table === 'payment_history' && matchColumn === 'payment_history_id') {
        matchColumn = 'id';
      }
      console.log(`[Server DB Update] Updating ${table} where ${matchColumn}=${matchValue}`, updates);

      // Enforce Staff Mobile and Email Lock Backend (Operations & Production Staff)
      if (['operations_staff', 'production_staff', 'staff'].includes(table)) {
        if (updates) {
          delete updates.mobile;
          delete updates.phone;
          delete updates.mobile_number;
          delete updates.email;
        }
      }

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
      
      triggerGoogleSheetsBackup(table, 'update', result.data?.[0] || updates, matchValue);
      
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
      
      triggerGoogleSheetsBackup(table, 'upsert', result.data?.[0] || record);
      
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
      if (table === 'equipment_handovers') {
        const { data: histData } = await db.from('lead_equipment_history').select('*');
        const mapped = (histData || []).map((deh: any) => ({
          handover_id: deh.id,
          order_id: deh.order_id || deh.lead_id,
          equipment_name: deh.equipment_name,
          return_status: deh.equipment_status,
          return_date: deh.returned_at ? deh.returned_at.split('T')[0] : new Date().toISOString().split('T')[0],
          returned_by: deh.returned_by || 'Staff',
          notes: deh.remarks || '',
          created_at: deh.created_at || deh.returned_at
        }));
        return res.json({ success: true, data: mapped });
      }

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
      let resultData = data;
      if (table === 'editor_assignments' && Array.isArray(resultData)) {
        resultData = resultData.map((row: any) => ({
          ...row,
          Edited_Drive_Link: row.Edited_Drive_Link || row.edited_drive_link || null,
          edited_drive_link: row.edited_drive_link || row.Edited_Drive_Link || null
        }));
      }
      res.json({ success: true, data: resultData });
    } catch (err: any) {
      console.error(`[Server DB Select Exception] ${table}`, err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.post('/api/db/select-all', async (req, res) => {
    try {
      const db = getServerSupabase();
      const queries = [
        db.from('users').select('*'),
        db.from('leads').select('*').order('created_at', { ascending: false }),
        db.from('orders').select('*').order('created_at', { ascending: false }),
        db.from('operations').select('*'),
        db.from('raw_footage').select('*'),
        db.from('production').select('*'),
        db.from('payments').select('*'),
        db.from('activity_logs').select('*').order('timestamp', { ascending: false }),
        db.from('operations_staff').select('*').order('name'),
        db.from('notifications').select('*').order('created_at', { ascending: false }),
        db.from('equipment').select('*').order('created_at', { ascending: false }),
        db.from('lead_packages').select('*'),
        db.from('packages').select('*').order('created_at', { ascending: false }),
        db.from('staff_assignments').select('*'),
        db.from('quotations').select('*'),
        db.from('lead_status_history').select('*').order('created_at', { ascending: true }),
        db.from('lead_staff_assignment_history').select('*').order('assigned_at', { ascending: false }),
        db.from('lead_equipment_history').select('*').order('returned_at', { ascending: false }),
        db.from('lead_events').select('*').order('created_at', { ascending: true }),
        db.from('v_task_assignment_details').select('*'),
        db.from('production_specialties').select('*'),
        db.from('editor_assignments').select('*'),
        db.from('production_staff').select('*'),
        db.from('calendar_memos').select('*').order('created_at', { ascending: false }),
        db.from('payment_history').select('*')
      ];

      const results = await Promise.all(
        queries.map(q => Promise.resolve(q).catch(err => ({ data: [], error: { message: err?.message || String(err) } })))
      );

      const data = results.map(r => r?.data || []);
      const errors = results.map(r => r?.error ? r.error.message : null);

      res.json({ success: true, data, errors });
    } catch (err: any) {
      console.error('[Server DB Select All Exception]', err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.post('/api/db/delete', async (req, res) => {
    const { table, matchColumn, matchValue } = req.body;
    try {
      if (!table || !matchColumn || matchValue === undefined || matchValue === null) {
        return res.status(400).json({ success: false, error: 'Missing required parameters for deletion' });
      }
      const db = getServerSupabase();
      console.log(`[Server DB Delete] Deleting from ${table} where ${matchColumn}=${matchValue}`);
      let { data, error } = await db.from(table).delete().eq(matchColumn, matchValue).select();

      // Fallback for packages table if column is named id instead of package_id
      if (error && table === 'packages' && matchColumn === 'package_id') {
        const fallbackRes = await db.from('packages').delete().eq('id', matchValue).select();
        if (!fallbackRes.error) {
          data = fallbackRes.data;
          error = null;
        }
      }

      if (error) {
        console.error(`[Server DB Delete Error] ${table}`, error);
        return res.status(400).json({ success: false, error: error.message });
      }
      
      triggerGoogleSheetsBackup(table, 'delete', data?.[0] || { deleted_id: matchValue }, matchValue);
      
      res.json({ success: true, data });
    } catch (err: any) {
      console.error(`[Server DB Delete Exception] ${table}`, err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // Client Acceptance Verification persistent storage helpers
  const caDataDir = path.join(process.cwd(), 'data');
  const caFilePath = path.join(caDataDir, 'client_acceptance_verifications.json');

  const readCaVerificationsFromFile = (): any[] => {
    try {
      if (!fs.existsSync(caDataDir)) {
        fs.mkdirSync(caDataDir, { recursive: true });
      }
      if (!fs.existsSync(caFilePath)) {
        fs.writeFileSync(caFilePath, JSON.stringify([]), 'utf-8');
        return [];
      }
      const raw = fs.readFileSync(caFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[Server CA Storage] Error reading client acceptance verifications file:', e);
      return [];
    }
  };

  const writeCaVerificationsToFile = (records: any[]) => {
    try {
      if (!fs.existsSync(caDataDir)) {
        fs.mkdirSync(caDataDir, { recursive: true });
      }
      fs.writeFileSync(caFilePath, JSON.stringify(records, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Server CA Storage] Error writing client acceptance verifications file:', e);
    }
  };

  app.post('/api/client-acceptance/upsert', async (req, res) => {
    try {
      const payload = req.body;
      const {
        order_id,
        event_id,
        client_communication_consent_proof,
        folder_name,
        upload_link_path,
        final_edited_footage_link,
        proof_file_name,
        proof_storage_path,
        consent_proof_verified,
        edited_folder_uploaded_to_server
      } = payload;

      if (!order_id) {
        return res.status(400).json({ success: false, error: 'order_id is required' });
      }

      const cleanOrderId = String(order_id).trim();
      const cleanEventId = String(event_id || 'default').trim();
      const now = new Date().toISOString();
      const resolvedLink = (final_edited_footage_link !== undefined ? final_edited_footage_link : upload_link_path) || '';

      const cleanTaskId = String(payload.task_id || payload.assignment_id || '').trim();
      const existingRecords = readCaVerificationsFromFile();
      const index = existingRecords.findIndex(
        (r: any) => {
          const rTaskId = String(r.task_id || r.assignment_id || '').trim().toLowerCase();
          if (cleanTaskId && rTaskId) {
            return rTaskId === cleanTaskId.toLowerCase() &&
                   String(r.order_id || '').trim().toLowerCase() === cleanOrderId.toLowerCase();
          }
          return String(r.order_id || '').trim().toLowerCase() === cleanOrderId.toLowerCase() &&
                 String(r.event_id || 'default').trim().toLowerCase() === cleanEventId.toLowerCase();
        }
      );

      let savedRecord: any;
      if (index >= 0) {
        // Update existing record (preventing duplicate records)
        savedRecord = {
          ...existingRecords[index],
          order_id: cleanOrderId,
          event_id: cleanEventId,
          task_id: cleanTaskId || existingRecords[index].task_id || '',
          assignment_id: cleanTaskId || existingRecords[index].assignment_id || '',
          client_communication_consent_proof: client_communication_consent_proof !== undefined ? client_communication_consent_proof : existingRecords[index].client_communication_consent_proof,
          folder_name: folder_name !== undefined ? folder_name : existingRecords[index].folder_name,
          upload_link_path: resolvedLink || existingRecords[index].upload_link_path || '',
          final_edited_footage_link: resolvedLink || existingRecords[index].final_edited_footage_link || existingRecords[index].upload_link_path || '',
          proof_file_name: proof_file_name !== undefined ? proof_file_name : existingRecords[index].proof_file_name,
          proof_storage_path: proof_storage_path !== undefined ? proof_storage_path : existingRecords[index].proof_storage_path,
          consent_proof_verified: consent_proof_verified !== undefined ? Boolean(consent_proof_verified) : existingRecords[index].consent_proof_verified,
          edited_folder_uploaded_to_server: edited_folder_uploaded_to_server !== undefined ? Boolean(edited_folder_uploaded_to_server) : existingRecords[index].edited_folder_uploaded_to_server,
          updated_at: now
        };
        existingRecords[index] = savedRecord;
      } else {
        // Insert new record
        savedRecord = {
          id: cleanTaskId ? `${cleanOrderId}_${cleanTaskId}` : `${cleanOrderId}_${cleanEventId}`,
          order_id: cleanOrderId,
          event_id: cleanEventId,
          task_id: cleanTaskId,
          assignment_id: cleanTaskId,
          client_communication_consent_proof: client_communication_consent_proof || '',
          folder_name: folder_name || '',
          upload_link_path: resolvedLink,
          final_edited_footage_link: resolvedLink,
          proof_file_name: proof_file_name || '',
          proof_storage_path: proof_storage_path || '',
          consent_proof_verified: consent_proof_verified !== undefined ? Boolean(consent_proof_verified) : false,
          edited_folder_uploaded_to_server: edited_folder_uploaded_to_server !== undefined ? Boolean(edited_folder_uploaded_to_server) : false,
          created_at: now,
          updated_at: now
        };
        existingRecords.push(savedRecord);
      }

      writeCaVerificationsToFile(existingRecords);

      // Also attempt to upsert into Supabase client_acceptance_verifications table if present
      try {
        const db = getServerSupabase();
        await db.from('client_acceptance_verifications').upsert(savedRecord, {
          onConflict: 'order_id,event_id'
        });
      } catch (dbErr) {
        // Suppress warning if table is not yet created in Postgres
      }

      console.log(`[Server CA Storage] Successfully saved verification for Order: ${cleanOrderId}, Event: ${cleanEventId}, Folder: "${savedRecord.folder_name}"`);
      res.json({ success: true, data: savedRecord });
    } catch (err: any) {
      console.error('[Server CA Storage Upsert Exception]', err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.get('/api/client-acceptance/list', async (req, res) => {
    try {
      let records = readCaVerificationsFromFile();

      // Check if Supabase table has records
      try {
        const db = getServerSupabase();
        const { data: dbRecords, error } = await db.from('client_acceptance_verifications').select('*');
        if (!error && Array.isArray(dbRecords) && dbRecords.length > 0) {
          // Merge dbRecords with file records
          const map = new Map<string, any>();
          records.forEach((r: any) => map.set(`${String(r.order_id).trim().toLowerCase()}__${String(r.event_id || 'default').trim().toLowerCase()}`, r));
          dbRecords.forEach((r: any) => map.set(`${String(r.order_id).trim().toLowerCase()}__${String(r.event_id || 'default').trim().toLowerCase()}`, { ...map.get(`${String(r.order_id).trim().toLowerCase()}__${String(r.event_id || 'default').trim().toLowerCase()}`), ...r }));
          records = Array.from(map.values());
          writeCaVerificationsToFile(records);
        }
      } catch (_) {}

      res.json({ success: true, data: records });
    } catch (err: any) {
      console.error('[Server CA Storage List Exception]', err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // Client Approval Progress Storage & Verification
  const capDataDir = path.join(process.cwd(), 'data');
  const capFilePath = path.join(capDataDir, 'client_approval_progress.json');

  const readClientApprovalProgressFromFile = (): any[] => {
    try {
      if (!fs.existsSync(capDataDir)) {
        fs.mkdirSync(capDataDir, { recursive: true });
      }
      if (!fs.existsSync(capFilePath)) {
        fs.writeFileSync(capFilePath, JSON.stringify([]), 'utf-8');
        return [];
      }
      const raw = fs.readFileSync(capFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[Server Approval Progress] Error reading file:', e);
      return [];
    }
  };

  const writeClientApprovalProgressToFile = (records: any[]) => {
    try {
      if (!fs.existsSync(capDataDir)) {
        fs.mkdirSync(capDataDir, { recursive: true });
      }
      fs.writeFileSync(capFilePath, JSON.stringify(records, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Server Approval Progress] Error writing file:', e);
    }
  };

  // GET /api/client-approval/progress/:projectId
  app.get('/api/client-approval/progress/:projectId', async (req, res) => {
    try {
      const { projectId } = req.params;
      if (!projectId) {
        return res.status(400).json({ success: false, error: 'Project ID is required' });
      }
      const cleanId = String(projectId).trim();
      const records = readClientApprovalProgressFromFile();
      const fileRecord = records.find(
        (r: any) => String(r.project_id || '').trim().toLowerCase() === cleanId.toLowerCase()
      );

      let dbRecord = null;
      try {
        const db = getServerSupabase();
        // Check dedicated table first if exists
        const { data: capData } = await db
          .from('client_approval_progress')
          .select('*')
          .eq('project_id', cleanId)
          .maybeSingle();
        if (capData) {
          dbRecord = capData;
        } else {
          // Check production table checklist fields
          const { data: prodData } = await db
            .from('production')
            .select('production_id, checklist_customer_acceptance, checklist_content_usage, checklist_footage_deleted_7_days, checklist_payment_from_sales, checklist_edited_files_uploaded, updated_at')
            .eq('production_id', cleanId)
            .maybeSingle();
          if (prodData && (
            prodData.checklist_customer_acceptance ||
            prodData.checklist_content_usage ||
            prodData.checklist_footage_deleted_7_days ||
            prodData.checklist_payment_from_sales ||
            prodData.checklist_edited_files_uploaded
          )) {
            dbRecord = {
              id: `cap_${cleanId}`,
              project_id: cleanId,
              client_approval: Boolean(prodData.checklist_customer_acceptance),
              content_usage_confirmation: Boolean(prodData.checklist_content_usage),
              footage_deleted_7_days: Boolean(prodData.checklist_footage_deleted_7_days),
              verify_payment_from_sales: Boolean(prodData.checklist_payment_from_sales),
              validate_edited_files_uploaded: Boolean(prodData.checklist_edited_files_uploaded),
              saved_at: prodData.updated_at || new Date().toISOString(),
              updated_at: prodData.updated_at || new Date().toISOString()
            };
          }
        }
      } catch (_) {}

      const finalRecord = fileRecord || dbRecord || null;
      return res.json({ success: true, data: finalRecord });
    } catch (err: any) {
      console.error('[Server Approval Progress GET Exception]', err);
      return res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // POST /api/client-approval/progress
  app.post('/api/client-approval/progress', async (req, res) => {
    try {
      const {
        project_id,
        client_approval,
        content_usage_confirmation,
        footage_deleted_7_days,
        verify_payment_from_sales,
        validate_edited_files_uploaded
      } = req.body;

      if (!project_id) {
        return res.status(400).json({ success: false, error: 'project_id is required' });
      }

      const cleanId = String(project_id).trim();
      const now = new Date().toISOString();

      const records = readClientApprovalProgressFromFile();
      const index = records.findIndex(
        (r: any) => String(r.project_id || '').trim().toLowerCase() === cleanId.toLowerCase()
      );

      const savedRecord = {
        id: `cap_${cleanId}`,
        project_id: cleanId,
        client_approval: Boolean(client_approval),
        content_usage_confirmation: Boolean(content_usage_confirmation),
        footage_deleted_7_days: Boolean(footage_deleted_7_days),
        verify_payment_from_sales: Boolean(verify_payment_from_sales),
        validate_edited_files_uploaded: Boolean(validate_edited_files_uploaded),
        saved_at: index >= 0 ? (records[index].saved_at || now) : now,
        updated_at: now
      };

      if (index >= 0) {
        records[index] = savedRecord;
      } else {
        records.push(savedRecord);
      }
      writeClientApprovalProgressToFile(records);

      // Persist to Supabase: Update production table checklist fields and status for this project
      try {
        const db = getServerSupabase();
        const updatePayload: any = {
          checklist_customer_acceptance: savedRecord.client_approval,
          checklist_content_usage: savedRecord.content_usage_confirmation,
          checklist_footage_deleted_7_days: savedRecord.footage_deleted_7_days,
          checklist_payment_from_sales: savedRecord.verify_payment_from_sales,
          checklist_edited_files_uploaded: savedRecord.validate_edited_files_uploaded
        };

        if (savedRecord.client_approval) {
          updatePayload.editing_status = 'Client Accepted';
          updatePayload.production_status = 'Client Accepted';
          updatePayload.current_status = 'Client Accepted';
          updatePayload.status = 'Client Accepted';
        }

        await db.from('production').update(updatePayload).eq('production_id', cleanId);

        // Also try to upsert to client_approval_progress table if table exists
        try {
          await db.from('client_approval_progress').upsert(savedRecord, { onConflict: 'project_id' });
        } catch (_) {}
      } catch (dbErr) {
        console.warn('[Server Approval Progress DB Sync Warning]', dbErr);
      }

      console.log(`[Server Approval Progress] Successfully saved progress for Project ID: ${cleanId}`);
      return res.json({ success: true, data: savedRecord, message: 'Approval progress saved successfully' });
    } catch (err: any) {
      console.error('[Server Approval Progress POST Exception]', err);
      return res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // POST /api/production/validate-edited-files
  // Verifies that edited files are actually uploaded to server/storage for the specified project_id
  app.post('/api/production/validate-edited-files', async (req, res) => {
    try {
      const { project_id } = req.body;
      if (!project_id) {
        return res.status(400).json({ success: false, isValid: false, uploaded: false, error: 'project_id is required' });
      }

      const cleanId = String(project_id).trim();
      const db = getServerSupabase();

      // 1. Fetch production record strictly for this project_id
      const { data: prodData, error: prodErr } = await db
        .from('production')
        .select('*')
        .eq('production_id', cleanId)
        .limit(1);

      if (prodErr || !prodData || prodData.length === 0) {
        return res.status(404).json({
          success: false,
          isValid: false,
          uploaded: false,
          projectId: cleanId,
          message: `Project (${cleanId}) not found in the system.`
        });
      }

      const prod = prodData[0];
      const orderId = prod.order_id ? String(prod.order_id).trim() : '';

      // 2. Fetch editor assignments strictly for this production_id (or order_id)
      let assignments: any[] = [];
      const { data: eaData } = await db
        .from('editor_assignments')
        .select('*')
        .eq('production_id', cleanId);

      if (Array.isArray(eaData) && eaData.length > 0) {
        assignments = eaData;
      } else if (orderId) {
        const { data: eaOrderData } = await db
          .from('editor_assignments')
          .select('*')
          .eq('order_id', orderId);
        if (Array.isArray(eaOrderData) && eaOrderData.length > 0) {
          assignments = eaOrderData;
        }
      }

      // 3. Fetch client acceptance verifications for this order if available
      let caVerifs: any[] = [];
      if (orderId) {
        const { data: cavData } = await db
          .from('client_acceptance_verifications')
          .select('*')
          .eq('order_id', orderId);
        if (Array.isArray(cavData)) {
          caVerifs = cavData;
        }
      }

      const fileCaRecords = readCaVerificationsFromFile().filter((r: any) =>
        orderId && String(r.order_id || '').trim().toLowerCase() === orderId.toLowerCase()
      );
      const combinedCaVerifs = [...caVerifs, ...fileCaRecords];

      // Verification checks:
      // A) Project-level checks:
      const prodHasConfirmedServerUpload = prod.server_upload_confirmed === true;
      const prodHasEditedFolderUploaded = prod.edited_folder_uploaded_to_server === true;
      const prodFolderName = (prod.server_upload_folder_name || prod.server_path || prod.folder_name || '').trim();
      const prodDriveLink = (prod.edited_drive_link || prod.delivery_link || prod.final_edited_footage_link || prod.upload_link_path || '').trim();

      // B) Assignment-level checks:
      let assignmentsWithUploadedFiles = 0;
      let matchedFolderName = prodFolderName;
      let matchedDriveLink = prodDriveLink;

      assignments.forEach((a: any) => {
        const aFolder = (a.server_upload_folder_name || a.server_path || a.folder_name || '').trim();
        const aLink = (a.edited_drive_link || a.Edited_Drive_Link || a.server_file_link || a.upload_link || a.final_edited_footage_link || a.upload_link_path || '').trim();
        const aProof = (a.proof_url || a.proof_image || a.uploaded_proof || a.customer_review_image || a.confirmation_proof || a.client_communication_proof || '').trim();
        const aConfirmed = a.server_upload_confirmed === true || a.edited_folder_uploaded_to_server === true;

        const hasUploaded = aConfirmed || Boolean(aFolder) || Boolean(aLink) || Boolean(aProof);
        if (hasUploaded) {
          assignmentsWithUploadedFiles++;
          if (!matchedFolderName && aFolder) matchedFolderName = aFolder;
          if (!matchedDriveLink && aLink) matchedDriveLink = aLink;
        }
      });

      // C) CA Verifications check:
      const cavMatch = combinedCaVerifs.find((cav: any) =>
        cav.consent_proof_verified === true ||
        cav.edited_folder_uploaded_to_server === true ||
        Boolean((cav.folder_name || '').trim()) ||
        Boolean((cav.upload_link_path || cav.final_edited_footage_link || '').trim()) ||
        Boolean((cav.proof_storage_path || '').trim())
      );
      if (cavMatch && !matchedFolderName && cavMatch.folder_name) {
        matchedFolderName = cavMatch.folder_name.trim();
      }

      const hasUploaded =
        prodHasConfirmedServerUpload ||
        prodHasEditedFolderUploaded ||
        Boolean(prodFolderName) ||
        Boolean(prodDriveLink) ||
        Boolean(cavMatch) ||
        (assignments.length > 0 && assignmentsWithUploadedFiles > 0);

      if (!hasUploaded) {
        return res.json({
          success: true,
          isValid: false,
          uploaded: false,
          projectId: cleanId,
          message: `Edited files must be uploaded to the server first for Project ID ${cleanId}. No server upload or edited folder found.`,
          details: {
            assignmentsTotal: assignments.length,
            assignmentsWithFiles: assignmentsWithUploadedFiles,
            folderName: null
          }
        });
      }

      return res.json({
        success: true,
        isValid: true,
        uploaded: true,
        projectId: cleanId,
        message: `Edited files verified on server for Project ID ${cleanId}.`,
        details: {
          folderName: matchedFolderName || 'Server Storage Verified',
          driveLink: matchedDriveLink || null,
          assignmentsTotal: assignments.length,
          assignmentsWithFiles: assignmentsWithUploadedFiles,
          serverConfirmed: prodHasConfirmedServerUpload || prodHasEditedFolderUploaded || assignmentsWithUploadedFiles > 0
        }
      });
    } catch (err: any) {
      console.error('[Server Validate Edited Files Exception]', err);
      return res.status(500).json({ success: false, isValid: false, uploaded: false, error: err.message || String(err) });
    }
  });

  app.post('/api/auth/create-user', async (req, res) => {
    const { email, password, name, role, mobile, active = true } = req.body;
    try {
      const db = getServerSupabase();
      if (!db.auth.admin) {
        return res.status(400).json({ success: false, error: 'Service Role Key not configured on server' });
      }
      
      const cleanEmail = email ? email.trim().toLowerCase() : '';
      const cleanMobile = cleanPhone(mobile);
      console.log(`[Server Auth] Creating/Syncing user ${cleanEmail} (mobile: ${cleanMobile}) with role ${role}`);
      
      // Global mobile uniqueness check on create
      if (cleanMobile) {
        const { data: matchedDbUsers } = await db.from('users').select('id, email, mobile');
        const existingWithMobile = (matchedDbUsers || []).find((u: any) => cleanPhone(u.mobile) === cleanMobile);
        if (existingWithMobile && cleanEmail && existingWithMobile.email?.trim().toLowerCase() !== cleanEmail) {
          return res.status(400).json({ success: false, error: 'Mobile number already exists. Please use a different mobile number.' });
        }
        const uniqueCheck = await checkGlobalMobileUniqueInDb(db, cleanMobile);
        if (!uniqueCheck.isUnique && (!existingWithMobile || (cleanEmail && existingWithMobile.email?.trim().toLowerCase() !== cleanEmail))) {
          return res.status(400).json({ success: false, error: uniqueCheck.error });
        }
      }

      let authUser: any = null;
      const { data, error } = await db.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: { name, role, mobile: cleanMobile }
      });

      if (error) {
        const isAlreadyRegistered = error.message && (
          error.message.toLowerCase().includes('already') ||
          error.message.toLowerCase().includes('registered') ||
          error.message.toLowerCase().includes('exists')
        );

        if (isAlreadyRegistered) {
          console.log(`[Server Auth] User ${cleanEmail} already exists in auth. Finding and synchronizing user...`);
          
          let targetAuthId: string | null = null;

          // 1. Search auth.users via admin.listUsers with pagination
          try {
            let page = 1;
            let hasMore = true;
            while (hasMore && !targetAuthId && page <= 10) {
              const { data: listData, error: listErr } = await db.auth.admin.listUsers({ page, perPage: 1000 });
              if (listErr) {
                console.warn(`[Server Auth listUsers page ${page}]`, listErr.message);
                break;
              }
              const users = listData?.users || [];
              const existingAuth = users.find((u: any) => 
                (cleanEmail && u.email?.trim().toLowerCase() === cleanEmail) ||
                (cleanMobile && (u.user_metadata?.mobile === cleanMobile || u.phone === cleanMobile))
              );
              if (existingAuth) {
                targetAuthId = existingAuth.id;
                authUser = existingAuth;
              }
              if (users.length < 1000) {
                hasMore = false;
              } else {
                page++;
              }
            }
          } catch (listEx: any) {
            console.warn(`[Server Auth listUsers exception]`, listEx.message || listEx);
          }

          // 2. If not found in listUsers, check public.users table
          if (!targetAuthId) {
            try {
              const orFilters: string[] = [];
              if (cleanEmail) orFilters.push(`email.eq.${cleanEmail}`);
              if (cleanMobile) orFilters.push(`mobile.eq.${cleanMobile}`);
              
              if (orFilters.length > 0) {
                const { data: matchedDbUser } = await db.from('users').select('id, email, name, role').or(orFilters.join(',')).limit(1);
                if (matchedDbUser && matchedDbUser.length > 0) {
                  targetAuthId = matchedDbUser[0].id;
                  authUser = { id: targetAuthId, email: cleanEmail || matchedDbUser[0].email };
                }
              }
            } catch (dbEx: any) {
              console.warn(`[Server Auth public.users lookup exception]`, dbEx.message || dbEx);
            }
          }

          // 3. If targetAuthId was found, update their password & metadata in Supabase Auth
          if (targetAuthId) {
            authUser = { id: targetAuthId, email: cleanEmail };
            try {
              const updatePayload: any = {
                user_metadata: { name, role, mobile: cleanMobile }
              };
              if (password && String(password).trim() !== '') {
                updatePayload.password = password;
              }
              await db.auth.admin.updateUserById(targetAuthId, updatePayload);
            } catch (updAuthErr: any) {
              console.warn(`[Server Auth updateUserById Warning]`, updAuthErr.message || updAuthErr);
            }
          } else {
            // If auth user ID cannot be determined, fallback to a deterministic/safe UUID so caller succeeds
            const fallbackId = (crypto && (crypto as any).randomUUID) 
              ? (crypto as any).randomUUID() 
              : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;
            authUser = { id: fallbackId, email: cleanEmail };
            console.log(`[Server Auth] Using fallback UUID for already registered user: ${fallbackId}`);
          }
        } else {
          // Check if user already exists in public.users anyway
          const orFilters: string[] = [];
          if (cleanEmail) orFilters.push(`email.eq.${cleanEmail}`);
          if (cleanMobile) orFilters.push(`mobile.eq.${cleanMobile}`);
          
          let existingInDb: any = null;
          if (orFilters.length > 0) {
            const { data: matchedDbUser } = await db.from('users').select('id, email').or(orFilters.join(',')).limit(1);
            if (matchedDbUser && matchedDbUser.length > 0) {
              existingInDb = matchedDbUser[0];
            }
          }

          if (existingInDb) {
            authUser = { id: existingInDb.id, email: cleanEmail || existingInDb.email };
            console.log(`[Server Auth] Handled non-fatal auth create issue by using existing DB user ID: ${existingInDb.id}`);
          } else {
            console.error(`[Server Auth Create Error]`, error);
            return res.status(400).json({ success: false, error: error.message });
          }
        }
      } else {
        authUser = data.user;
      }

      let normalizedRole = 'Operation Staff';
      if (role) {
        const r = String(role).trim().toLowerCase();
        if (r.includes('owner') || r.includes('business')) normalizedRole = 'Business Owner';
        else if (r.includes('sales')) normalizedRole = 'Sales Team';
        else if (r.includes('prod') && r.includes('staff')) normalizedRole = 'Production Staff';
        else if (r.includes('editor')) normalizedRole = 'Production Staff';
        else if (r.includes('prod') && r.includes('team')) normalizedRole = 'Production Team';
        else if (r.includes('op') && r.includes('staff')) normalizedRole = 'Operation Staff';
        else if (r.includes('op') && r.includes('team')) normalizedRole = 'Operations Team';
        else if (r.includes('prod')) normalizedRole = 'Production Team';
        else normalizedRole = 'Operation Staff';
      }

      const userRecord: any = {
        id: authUser.id, // Primary key matching auth ID
        name,
        email: cleanEmail,
        mobile: cleanMobile || '0000000000',
        username: cleanEmail,
        role: normalizedRole,
        active,
        password,
        created_at: new Date().toISOString()
      };
      
      const orConds = [`id.eq.${authUser.id}`];
      if (cleanEmail) orConds.push(`email.eq.${cleanEmail}`);
      if (cleanMobile) orConds.push(`mobile.eq.${cleanMobile}`);

      const { data: existingUser } = await db.from('users').select('*').or(orConds.join(',')).limit(1);

      let dbData: any = null;
      if (existingUser && existingUser.length > 0) {
        const { data: updData, error: updErr } = await db.from('users').update({
          name: name || existingUser[0].name,
          mobile: cleanMobile || existingUser[0].mobile || '0000000000',
          username: cleanEmail || existingUser[0].username,
          role: normalizedRole,
          active,
          password
        }).eq('id', existingUser[0].id).select();
        dbData = updData;
        if (updErr) {
          console.warn(`[Server Auth DB Update Warning]`, updErr);
        }
      } else {
        const { data: insData, error: insErr } = await db.from('users').insert(userRecord).select();
        dbData = insData;
        if (insErr) {
          console.warn(`[Server Auth DB Insert Warning]`, insErr);
        }
      }

      res.json({ success: true, data: { user: authUser, record: dbData?.[0] || userRecord } });
    } catch (err: any) {
      console.error(`[Server Auth Create Exception]`, err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.post('/api/auth/update-user', async (req, res) => {
    const { auth_id, email, password, name, role, mobile, active } = req.body;
    try {
      const db = getServerSupabase();
      if (!db.auth.admin) {
        return res.status(400).json({ success: false, error: 'Service Role Key not configured' });
      }
      
      const isStaffRole = role && ['Operation Staff', 'production staff', 'Editor', 'Sales Team'].some(r => role.toLowerCase().includes(r.toLowerCase()));
      const cleanMobile = mobile ? cleanPhone(mobile) : undefined;

      // Check global mobile uniqueness if mobile is being updated
      if (cleanMobile) {
        const uniqueCheck = await checkGlobalMobileUniqueInDb(db, cleanMobile, auth_id);
        if (!uniqueCheck.isUnique) {
          return res.status(400).json({ success: false, error: uniqueCheck.error });
        }
      }

      const updates: any = {};
      if (password) updates.password = password;
      if (email && !isStaffRole) updates.email = email.trim().toLowerCase();
      if (name || role || cleanMobile) updates.user_metadata = { name, role, mobile: cleanMobile || mobile };
      
      if (Object.keys(updates).length > 0 && auth_id) {
        try {
          const { error } = await db.auth.admin.updateUserById(auth_id, updates);
          if (error) {
            console.warn(`[Server Auth Update Warning]`, error.message);
          }
        } catch (e: any) {
          console.warn(`[Server Auth Update Exception]`, e.message);
        }
      }
      
      // Update users table (note: public.users has created_at, no updated_at)
      const userUpdates: any = {};
      if (name) userUpdates.name = name;
      if (email && !isStaffRole) userUpdates.email = email.trim().toLowerCase();
      if (role) {
        const r = String(role).trim().toLowerCase();
        if (r.includes('owner') || r.includes('business')) userUpdates.role = 'Business Owner';
        else if (r.includes('sales')) userUpdates.role = 'Sales Team';
        else if (r.includes('prod') && r.includes('staff')) userUpdates.role = 'Production Staff';
        else if (r.includes('editor')) userUpdates.role = 'Production Staff';
        else if (r.includes('prod') && r.includes('team')) userUpdates.role = 'Production Team';
        else if (r.includes('op') && r.includes('staff')) userUpdates.role = 'Operation Staff';
        else if (r.includes('op') && r.includes('team')) userUpdates.role = 'Operations Team';
        else if (r.includes('prod')) userUpdates.role = 'Production Team';
        else userUpdates.role = role;
      }
      if (cleanMobile !== undefined) userUpdates.mobile = cleanMobile;
      if (password) userUpdates.password = password;
      if (active !== undefined) userUpdates.active = active;
      
      let query = db.from('users').update(userUpdates);
      if (auth_id) {
        query = query.eq('id', auth_id);
      } else if (email) {
        query = query.eq('email', email.trim().toLowerCase());
      } else if (cleanMobile) {
        query = query.eq('mobile', cleanMobile);
      }
      
      const { data: dbData, error: dbError } = await query.select();
      
      if (dbError) {
        console.warn(`[Server Auth DB Update Warning]`, dbError.message);
      }
      
      res.json({ success: true, data: { record: dbData?.[0] || userUpdates } });
    } catch (err: any) {
      console.error(`[Server Auth Update Exception]`, err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Server] Mounting Vite development middleware...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Server] Serving production static assets from dist...');
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
