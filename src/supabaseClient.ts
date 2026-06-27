import { createClient } from '@supabase/supabase-js';

const getUrl = () => {
  if (typeof window !== 'undefined') {
    // Standardize origin to not have a trailing slash
    const origin = window.location.origin.replace(/\/$/, '');
    return `${origin}/supabase`;
  }
  return 'http://localhost:3000/supabase';
};

const getAnonKey = () => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_ANON_KEY) {
    return (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
  }
  return 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB';
};

export const supabaseClient = createClient(getUrl(), getAnonKey(), {
  auth: { persistSession: true }
});

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
