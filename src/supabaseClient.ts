import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabaseClient = url && anonKey ? createClient(url, anonKey, {
  auth: { persistSession: true }
}) : null;

// Diagnostic Metrics Store
export interface DiagnosticReport {
  connection: 'connected' | 'disconnected' | 'error' | 'checking';
  auth: 'ok' | 'fail' | 'untested';
  read: 'ok' | 'fail' | 'untested';
  insert: 'ok' | 'fail' | 'untested';
  update: 'ok' | 'fail' | 'untested';
  delete: 'ok' | 'fail' | 'untested';
  realtime: 'ok' | 'fail' | 'untested';
  rls: 'ok' | 'fail' | 'untested';
  lastChecked: string;
  errorMessage?: string;
}

export let currentDiagnosticReport: DiagnosticReport = {
  connection: 'checking',
  auth: 'untested',
  read: 'untested',
  insert: 'untested',
  update: 'untested',
  delete: 'untested',
  realtime: 'untested',
  rls: 'untested',
  lastChecked: new Date().toISOString()
};

export const updateDiagnosticMetric = (key: keyof Omit<DiagnosticReport, 'lastChecked' | 'errorMessage'>, status: any, error?: string) => {
  (currentDiagnosticReport as any)[key] = status;
  currentDiagnosticReport.lastChecked = new Date().toISOString();
  if (error) {
    currentDiagnosticReport.errorMessage = error;
  }
};
