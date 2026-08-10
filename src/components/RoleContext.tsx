import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { User, Lead, LeadPackage, Order, Operation, RawFootage, Production, Payment, ActivityLog, UserRole, CurrentStage, EditingStatus, Staff, Notification, Equipment, Package, StaffAssignment, LeadStaffAssignmentHistory, LeadEquipmentHistory, ProductionSpeciality, EditorAssignment, PaymentStatus, EquipmentHandover, UnlockOverride, DEPARTMENT_STAGES, ROLE_DEPARTMENT_MAP, Department, LeadEvent, CalendarMemo } from '../types';
import { INITIAL_USERS, INITIAL_LEADS, INITIAL_ORDERS, INITIAL_OPERATIONS, INITIAL_RAW_FOOTAGE, INITIAL_PRODUCTION, INITIAL_PAYMENTS, INITIAL_LOGS, INITIAL_EQUIPMENT } from '../data';
import { INITIAL_PACKAGES } from '../data/initialPackages';
export { INITIAL_PACKAGES };

import { supabaseClient, updateDiagnosticMetric } from '../supabaseClient';
import { serializeLeadEvents, deserializeLeadEvents } from '../utils';
import { performBusinessOwnerReview } from '../utils/businessOwnerReview';

export const getStatusRank = (status: string | undefined | null): number => {
  if (!status) return 0;
  const s = status.trim();
  if (['Lost Lead', 'Lead Lost'].includes(s)) return 99;
  if ([
    'Confirm Order', 'Order Confirmed', 'New Order Received', 'Operations Assigned', 
    'Assigned Crew', 'Staff Assigned', 'Event Scheduled', 'Event Started', 'Event Start', 
    'Event Ended', 'Event End', 'Event Completed', 'Event Complete', 'Footage Handover', 
    'Equipment Handover', 'Verified Footage', 'Footage Handover Verified', 'Raw Footage Received', 
    'Event Cancelled', 'Assigned Editor', 'Editor Assigned', 'Editing Started', 
    'Editing In Progress', 'Internal QC Review', 'Customer Review', 'Client Review Sent', 
    'Internal Review', 'Client Review', 'Revision Required', 'Revision In Progress', 
    'Revision', 'Client Acceptance', 'Final Approval', 'Approved', 'Ready for Delivery', 
    'Delivered', 'Completed', 'Closed', 'Project Closed', 'Project Delivered'
  ].includes(s)) {
    return 4;
  }
  if (['Quote Follow-up', 'Follow Up', 'Follow-up', 'Negotiation'].includes(s)) {
    return 3;
  }
  if (['Quote Sent', 'Quotation Sent'].includes(s)) {
    return 2;
  }
  if (['Create Quote', 'Created Quotation', 'New Lead', 'Contacted'].includes(s)) {
    return 1;
  }
  return 0;
};

export const isFollowUpDateTimeReached = (lead: Lead): boolean => {
  const rawStatus = lead.current_status || lead.status || '';
  if (['Confirm Order', 'Order Confirmed', 'Lost Lead', 'Lead Lost'].includes(rawStatus)) {
    return false;
  }

  const followUpDate = lead.next_follow_up_date || (lead as any).follow_up_date || '';
  if (!followUpDate) return false;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (followUpDate < todayStr) return true;
  if (followUpDate > todayStr) return false;

  let followUpTime = (lead as any).next_follow_up_time || '';
  if (!followUpTime && (lead.follow_up_notes || lead.remarks)) {
    const match = (lead.follow_up_notes || lead.remarks || '').match(/\[Time:\s*([0-9]{1,2}:[0-9]{2}(?:\s*[AP]M)?)\]/i);
    if (match) followUpTime = match[1];
  }

  if (!followUpTime) return true;

  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMins = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMins}`;

  let targetTime24 = followUpTime.trim();
  if (/AM|PM/i.test(targetTime24)) {
    const timeMatch = targetTime24.match(/([0-9]{1,2}):([0-9]{2})\s*([AP]M)/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2];
      const ampm = timeMatch[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      targetTime24 = `${String(h).padStart(2, '0')}:${m}`;
    }
  }

  return currentTimeStr >= targetTime24;
};

interface RoleContextType {
  currentUser: User | null;
  currentRole: UserRole;
  currentUserName: string;
  setCurrentRole: (role: UserRole) => void;
  setCurrentUserName: (name: string) => void;
  isDataLoading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  users: User[];
  leads: Lead[];
  orders: Order[];
  operations: Operation[];
  rawFootage: RawFootage[];
  production: Production[];
  payments: Payment[];
  logs: ActivityLog[];
  staff: Staff[];
  addStaff: (member: Omit<Staff, 'staff_id'>) => Promise<void>;
  updateStaff: (staffId: string, updates: Partial<Staff>) => Promise<void>;
  deleteStaff: (staffId: string) => Promise<void>;
  productionStaff: Staff[];
  addProductionStaff: (member: Omit<Staff, 'staff_id'>) => Promise<any>;
  updateProductionStaff: (staffId: string, updates: Partial<Staff>) => Promise<any>;
  deleteProductionStaff: (staffId: string) => Promise<any>;
  equipment: Equipment[];
  addEquipment: (equip: Omit<Equipment, 'equipment_id'>) => Promise<void>;
  updateEquipment: (equipmentId: string, updates: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (equipmentId: string) => Promise<void>;
  notifications: Notification[];
  addNotification: (payload: Omit<Notification, 'notification_id' | 'created_at' | 'read_status'> & { notification_id?: string; read_status?: boolean }) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllReadNotifications: () => Promise<void>;
  archiveNotification: (notificationId: string, archiveStatus?: boolean) => Promise<void>;
  
  leadPackages: LeadPackage[];
  packages: Package[];
  addPackage: (pkg: Omit<Package, 'package_id'>) => Promise<string>;
  updatePackage: (packageId: string, updates: Partial<Package>) => Promise<void>;
  deletePackage: (packageId: string) => Promise<void>;

  quotations: any[];
  addQuotation: (quotation: any) => Promise<string>;
  updateQuotation: (quotationId: string, updates: Partial<any>) => Promise<void>;
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<any>;
  saveLeadPackages: (leadId: string, packagesSelected: Omit<LeadPackage, 'lead_package_id' | 'lead_id'>[]) => Promise<void>;

  // Master flow operations
  addLead: (
    lead: Omit<Lead, 'lead_id' | 'status' | 'created_by' | 'sales_person' | 'created_date'>,
    packages?: Omit<LeadPackage, 'lead_package_id' | 'lead_id'>[]
  ) => string;
  updateLeadFollowUp: (
    leadId: string, 
    status: CurrentStage, 
    callNotes: string, 
    nextFollowUpDate: string, 
    quotationAmount?: number, 
    negotiationNotes?: string
  ) => Promise<void>;
  confirmOrder: (
    leadId: string, 
    packageName: string, 
    quotationAmount: number, 
    advanceReceived: number,
    eventDate?: string,
    eventTime?: string,
    paymentMode?: string,
    notes?: string,
    reportingTime?: string,
    transactionId?: string
  ) => string;
  assignOperations: (
    orderId: string, 
    opData: {
      photographer_assigned: string;
      videographer_assigned: string;
      drone_operator_assigned: string;
      assistant_assigned: string;
      equipment_kit: string;
      reporting_time: string;
      remarks?: string;
      current_stage?: CurrentStage;
      event_date?: string;
      event_time?: string;
      event_status?: string;
    }
  ) => Promise<void>;
  markEventCompleted: (orderId: string, serverPath: string) => Promise<void>;
  confirmRawFootageReceived: (
    orderId: string,
    footageLink?: string,
    storageType?: string,
    uploadNotes?: string,
    paymentCollectionStatus?: string,
    additionalReceived?: number,
    transactionId?: string
  ) => Promise<void>;
  updateOrderStage: (orderId: string, stage: CurrentStage) => Promise<void>;
  acceptRawFootage: (trackingId: string) => Promise<void>;
  updateProduction: (
    productionId: string, 
    updates: Partial<Omit<Production, 'production_id' | 'tracking_id'>>
  ) => Promise<void>;
  markDelivered: (trackingId: string, remarks?: string) => Promise<void>;
  recordPayment: (
    orderId: string, 
    amountReceived: number, 
    paymentDate: string, 
    proofUrl?: string,
    transactionId?: string,
    paymentMode?: string,
    paymentNotes?: string
  ) => Promise<void>;
  resetAllData: () => Promise<void>;
  refreshData: () => void;
  pushInsert: (table: string, record: any) => Promise<{ success: boolean; error?: string; localFallback?: boolean }>;
  pushUpdate: (table: string, matchColumn: string, matchValue: any, updates: any) => Promise<{ success: boolean; error?: string; localFallback?: boolean }>;
  statusHistory: any[];
  getLeadCurrentStatus: (lead: Lead) => string;
  getLeadCurrentStage: (lead: Lead) => 'Sales' | 'Operations' | 'Production' | 'Completed';
  
  // User Management Admin features
  addUser: (name: string, email: string, mobile: string, role: UserRole, active: boolean, password?: string, employee_id?: string) => Promise<void>;
  signUpUser: (name: string, username: string, email: string, mobile: string, role: UserRole, password: string) => Promise<any>;
  editUser: (id: string, updates: { name: string, email: string, mobile: string, role?: UserRole, active: boolean, employee_id?: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  resetUserPassword: (id: string, newPassword: string) => Promise<void>;
  staffAssignments: StaffAssignment[];
  leadStaffAssignmentHistory: LeadStaffAssignmentHistory[];
  leadEquipmentHistory: LeadEquipmentHistory[];
  addLeadEquipmentHistory: (history: Omit<LeadEquipmentHistory, 'id'>) => Promise<void>;
  saveStaffAssignments: (
    orderId: string, 
    assignments: {
      staff_role: string;
      staff_id: string;
      staff_name: string;
    }[]
  ) => Promise<void>;

  specialities: ProductionSpeciality[];
  addSpeciality: (name: string) => Promise<void>;
  updateSpeciality: (id: string, name: string) => Promise<void>;
  deactivateSpeciality: (id: string, active: boolean) => Promise<void>;
  deleteSpeciality: (id: string) => Promise<void>;
  
  editorAssignments: EditorAssignment[];
  assignEditorToProject: (assignment: Omit<EditorAssignment, 'assignment_id' | 'status' | 'assigned_date'>) => Promise<void>;
  updateEditorAssignmentStatus: (assignmentId: string, status: EditorAssignment['status']) => Promise<void>;
  deleteEditorAssignment: (assignmentId: string) => Promise<void>;
  globalDateRange: { start: string; end: string };
  setGlobalDateRange: (range: { start: string; end: string }) => void;
  resetGlobalDateRange: () => void;
  equipmentHandovers: EquipmentHandover[];
  addEquipmentHandover: (handover: Omit<EquipmentHandover, 'handover_id'>) => Promise<void>;
  addEquipmentHandovers: (handovers: Omit<EquipmentHandover, 'handover_id'>[]) => Promise<void>;
  
  unlockedRecords: UnlockOverride[];
  getDepartmentForStage: (stage: CurrentStage) => Department | undefined;
  isDepartmentAllowedToEdit: (role: UserRole, stage: CurrentStage) => boolean;
  unlockRecord: (recordId: string, module: 'Sales' | 'Operations' | 'Production', reason: string) => void;
  lockRecord: (recordId: string, module: 'Sales' | 'Operations' | 'Production') => void;
  isRecordLocked: (recordId: string, module: 'Sales' | 'Operations' | 'Production') => boolean;
  deleteLead: (leadId: string) => Promise<boolean>;
  deleteOrder: (orderId: string) => Promise<boolean>;
  deleteFollowUp: (followUpId: string) => Promise<boolean>;
  deleteQuotation: (quotationId: string) => Promise<boolean>;
  deletePayment: (paymentId: string) => Promise<boolean>;
  deleteOperation: (operationId: string) => Promise<boolean>;
  deleteProduction: (productionId: string) => Promise<boolean>;
  deleteStaffAssignment: (assignmentId: string) => Promise<boolean>;
  deleteRawFootage: (trackingId: string) => Promise<boolean>;
  
  calendarMemos: CalendarMemo[];
  addCalendarMemo: (memo: Omit<CalendarMemo, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateCalendarMemo: (id: string, updates: Partial<CalendarMemo>) => Promise<void>;
  deleteCalendarMemo: (id: string) => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Stable UUID translator mapping helpers because Supabase 'public.users' id is UUID
const mapToDbUserId = (id: string): string => {
  if (!id) return `00000000-0000-0000-0000-000000000000`;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  if (id.startsWith('U-') && /^\d+$/.test(id.substring(2))) {
    const num = id.substring(2).padStart(12, '0');
    return `00000000-0000-0000-0000-${num}`;
  }
  // Deterministic hex hash conversion into 32 hex chars for UUID v4 style
  let hash1 = 0, hash2 = 0;
  for (let i = 0; i < id.length; i++) {
    const ch = id.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1) + ch;
    hash1 |= 0;
    hash2 = ((hash2 << 7) - hash2) + ch;
    hash2 |= 0;
  }
  const hex1 = Math.abs(hash1).toString(16).padStart(8, '0');
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const hex3 = Math.abs(hash1 ^ hash2).toString(16).padStart(4, '0');
  const hex4 = Math.abs(hash1 + hash2).toString(16).padStart(12, '0');
  return `${hex1}-${hex2.substring(0,4)}-4${hex3.substring(1,4)}-a${hex2.substring(4,7)}-${hex4.substring(0,12)}`;
};

export const mapFromDbUserId = (uuid: string): string => {
  if (uuid.startsWith('00000000-0000-0000-0000-')) {
    const suffix = uuid.replace('00000000-0000-0000-0000-', '');
    if (suffix === '999999999999') return 'U-temp';
    const num = parseInt(suffix, 10);
    return `U-${String(num).padStart(3, '0')}`;
  }
  return uuid;
};

// Stable UUID translator mapping helpers because Supabase 'public.operations_staff' staff_id is UUID
export const mapToDbStaffId = (id: string): string => {
  if (id && id.startsWith('STF-')) {
    const num = id.substring(4).padStart(12, '0');
    return `55555555-5555-5555-5555-${num}`;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return `55555555-5555-5555-5555-999999999999`;
};

export const mapFromDbStaffId = (uuid: string): string => {
  if (uuid && uuid.startsWith('55555555-5555-5555-5555-')) {
    const suffix = uuid.replace('55555555-5555-5555-5555-', '');
    if (suffix === '999999999999') return 'STF-temp';
    const num = parseInt(suffix, 10);
    return `STF-${String(num).padStart(3, '0')}`;
  }
  return uuid;
};

// Stable UUID translator mapping helpers because Supabase 'public.equipment' equipment_id is UUID
export const mapToDbEquipmentId = (id: string): string => {
  if (id && id.startsWith('EQ-')) {
    const num = id.substring(3).padStart(12, '0');
    return `66666666-6666-6666-6666-${num}`;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return `66666666-6666-6666-6666-999999999999`;
};

export const mapFromDbEquipmentId = (uuid: string): string => {
  if (uuid && uuid.startsWith('66666666-6666-6666-6666-')) {
    const suffix = uuid.replace('66666666-6666-6666-6666-', '');
    if (suffix === '999999999999') return 'EQ-temp';
    const num = parseInt(suffix, 10);
    return `EQ-${num}`;
  }
  return uuid;
};

export const mapUserFieldsFromDb = (u: any): any => {
  if (!u) return u;
  return {
    ...u,
    id: mapFromDbUserId(u.id),
    name: u.name || u.full_name || '',
    full_name: u.full_name || u.name || '',
    mobile: u.mobile || u.phone || '',
    phone: u.phone || u.mobile || ''
  };
};

const mapNotificationFromDb = (notif: any): Notification => {
  let user_id = notif.user_id;
  let project_id = notif.project_id;
  let task_id = notif.task_id;
  let notification_type = notif.notification_type || 'System Notification';
  let read_status = notif.read_status !== undefined ? notif.read_status : notif.is_read;

  if (notif.action_url && notif.action_url.startsWith('extra:')) {
    try {
      const extraData = JSON.parse(notif.action_url.substring(6));
      user_id = extraData.user_id || user_id;
      project_id = extraData.project_id || project_id;
      task_id = extraData.task_id || task_id;
      notification_type = extraData.notification_type || notification_type;
      if (extraData.read_status !== undefined) {
        read_status = extraData.read_status;
      }
    } catch (e) {
      console.error("Failed to parse extra notification info:", e);
    }
  }

  return {
    notification_id: notif.notification_id,
    user_id,
    project_id,
    task_id,
    notification_type,
    title: notif.title,
    message: notif.message,
    read_status: !!read_status,
    is_read: !!read_status,
    read: !!read_status,
    created_at: notif.created_at,
    recipient_role: notif.recipient_role,
    priority: notif.priority,
    recipient_user_id: notif.recipient_user_id,
    recipient_email: notif.recipient_email,
    sender_user_id: notif.sender_user_id,
    sender_name: notif.sender_name,
    related_table: notif.related_table,
    related_record_id: notif.related_record_id,
    action_url: notif.action_url,
    is_archived: !!notif.is_archived,
    read_at: notif.read_at,
    expires_at: notif.expires_at,
  };
};

const saveNotificationToSupabase = async (notif: Notification) => {
  if (!supabaseClient) return;
  
  const payload = {
    notification_id: notif.notification_id,
    recipient_role: notif.recipient_role || 'All',
    title: notif.title,
    message: notif.message,
    is_read: notif.read_status,
    user_id: notif.user_id,
    project_id: notif.project_id,
    task_id: notif.task_id,
    notification_type: notif.notification_type,
    read_status: notif.read_status,
    priority: notif.priority || 'Medium',
    recipient_user_id: notif.recipient_user_id,
    recipient_email: notif.recipient_email,
    sender_user_id: notif.sender_user_id,
    sender_name: notif.sender_name,
    related_table: notif.related_table,
    related_record_id: notif.related_record_id,
    action_url: notif.action_url,
    is_archived: notif.is_archived ?? false,
    read_at: notif.read_at,
    expires_at: notif.expires_at,
    created_at: notif.created_at || new Date().toISOString()
  };

  const { error } = await supabaseClient.from('notifications').insert(payload);
  
  if (error) {
    console.warn("Failed inserting notification with all fields, trying fallback:", error);
    const encodedExtra = JSON.stringify({
      user_id: notif.user_id,
      project_id: notif.project_id,
      task_id: notif.task_id,
      notification_type: notif.notification_type,
      read_status: notif.read_status,
      priority: notif.priority,
      recipient_user_id: notif.recipient_user_id,
      recipient_email: notif.recipient_email,
      sender_user_id: notif.sender_user_id,
      sender_name: notif.sender_name,
      related_table: notif.related_table,
      related_record_id: notif.related_record_id,
      is_archived: notif.is_archived,
      read_at: notif.read_at,
      expires_at: notif.expires_at
    });
    
    const fallbackPayload = {
      notification_id: notif.notification_id,
      recipient_role: notif.recipient_role || 'All',
      title: notif.title,
      message: notif.message,
      is_read: notif.read_status,
      action_url: `extra:${encodedExtra}`
    };
    
    const { error: fallbackError } = await supabaseClient.from('notifications').insert(fallbackPayload);
    if (fallbackError) {
      // Suppress error since notifications table may not exist
      // console.error("Fallback insert failed too:", fallbackError);
    }
  }
};

// INITIAL_PACKAGES imported from ../data/initialPackages

export const mapPackageToDbPayload = (pkg: Partial<Package> & { package_id: string; package_name: string; price: number }) => {
  const extraData = {
    category: pkg.category || 'Weddings',
    deliverables: pkg.deliverables || '',
    team_members: pkg.team_members || '',
    seasonal_offer: pkg.seasonal_offer || '',
    terms_conditions: pkg.terms_conditions || '',
    event_type: pkg.event_type || '',
    duration: pkg.duration || '',
    package_includes: pkg.package_includes || ''
  };

  return {
    package_id: pkg.package_id,
    name: pkg.package_name,
    description: JSON.stringify(extraData),
    price: pkg.price,
    status: pkg.status || 'Active',
    created_at: pkg.created_at || new Date().toISOString()
  };
};

export const mapDbRecordToPackage = (record: any): Package => {
  let category = 'Weddings'; // Default fallback
  let deliverables = record.description || '';
  let team_members = '';
  let seasonal_offer = '';
  let terms_conditions = '';
  let event_type = '';
  let duration = '';
  let package_includes = '';

  if (record.description && typeof record.description === 'string' && record.description.trim().startsWith('{') && record.description.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(record.description);
      category = parsed.category || category;
      deliverables = parsed.deliverables || '';
      team_members = parsed.team_members || '';
      seasonal_offer = parsed.seasonal_offer || '';
      terms_conditions = parsed.terms_conditions || '';
      event_type = parsed.event_type || '';
      duration = parsed.duration || '';
      package_includes = parsed.package_includes || '';
    } catch (e) {
      console.warn('Failed to parse JSON description for package:', record.package_id);
    }
  }

  return {
    package_id: record.package_id,
    package_name: record.name || record.package_name || '',
    category: record.category || category,
    price: record.price !== undefined && record.price !== null ? Number(record.price) : 0,
    status: record.status || 'Active',
    deliverables,
    team_members,
    seasonal_offer,
    terms_conditions,
    event_type,
    duration,
    package_includes,
    created_at: record.created_at
  };
};

export const validatePackagesDatabase = async (operation: 'SELECT' | 'INSERT' | 'UPDATE', payload?: any) => {
  if (!supabaseClient) {
    throw new Error('Supabase client is not initialized.');
  }

  // 1. Verify if the table exists
  const { error: tableError } = await supabaseClient.from('packages').select('package_id').limit(0);
  if (tableError) {
    if (tableError.code === '42P01' || tableError.message?.toLowerCase().includes('relation "packages" does not exist')) {
      const errorMsg = `❌ Database Error\n\nTable: packages\n\nReason: The table does not exist.\n\nSuggested Fix: Create the **packages** table in Supabase.`;
      window.alert(errorMsg);
      throw new Error(errorMsg);
    }
  }

  // 2. Verify if every required column exists
  const requiredCols = ['package_id', 'name', 'description', 'price', 'status', 'created_at'];
  for (const col of requiredCols) {
    const { error: colError } = await supabaseClient.from('packages').select(col).limit(0);
    if (colError) {
      if (colError.code === '42703' || colError.message?.toLowerCase().includes('column') || colError.message?.toLowerCase().includes('does not exist')) {
        const errorMsg = `❌ Database Error\n\nTable: packages\n\nMissing Column: ${col}\n\nReason: The column does not exist in the Supabase database.\n\nSuggested Fix: Create the column: ${col} in the table: packages`;
        window.alert(errorMsg);
        throw new Error(errorMsg);
      }
    }
  }

  // 3. For INSERT/UPDATE operations, check the payload
  if (operation === 'INSERT' || operation === 'UPDATE') {
    if (!payload) {
      const errorMsg = `❌ Mapping Error\n\nReason: Payload is missing.`;
      window.alert(errorMsg);
      throw new Error(errorMsg);
    }

    if (operation === 'INSERT') {
      if (!payload.package_id) {
        const errorMsg = `❌ Mapping Error\n\nField: Package ID\n\nReason: The frontend is not sending this value to Supabase.\n\nSuggested Fix: Include the **package_id** field in the INSERT and UPDATE payload.`;
        window.alert(errorMsg);
        throw new Error(errorMsg);
      }
    }

    if (!payload.name) {
      const errorMsg = `❌ Mapping Error\n\nField: Package Name\n\nReason: The frontend form is not sending this value to Supabase.\n\nSuggested Fix: Include the **name** field in the INSERT and UPDATE payload.`;
      window.alert(errorMsg);
      throw new Error(errorMsg);
    }

    if (payload.price === undefined || payload.price === null) {
      const errorMsg = `❌ Mapping Error\n\nField: Price\n\nReason: The frontend form is not sending this value to Supabase.\n\nSuggested Fix: Include the **price** field in the INSERT and UPDATE payload.`;
      window.alert(errorMsg);
      throw new Error(errorMsg);
    }

    if (!payload.status) {
      const errorMsg = `❌ Mapping Error\n\nField: Status\n\nReason: The frontend form is not sending this value to Supabase.\n\nSuggested Fix: Include the **status** field in the INSERT and UPDATE payload.`;
      window.alert(errorMsg);
      throw new Error(errorMsg);
    }

    if (payload.description === undefined || payload.description === null) {
      const errorMsg = `❌ Mapping Error\n\nField: Description\n\nReason: The frontend form is not sending this value to Supabase.\n\nSuggested Fix: Include the **description** field in the INSERT and UPDATE payload.`;
      window.alert(errorMsg);
      throw new Error(errorMsg);
    }
  }
};

let cachedProdStaffColumns: string[] | null = null;

export const getProductionStaffColumns = async (): Promise<string[]> => {
  if (cachedProdStaffColumns) return cachedProdStaffColumns;
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      }
    });
    if (res.ok) {
      const spec = await res.json();
      const props = spec.definitions?.production_staff?.properties;
      if (props) {
        cachedProdStaffColumns = Object.keys(props);
        console.log('[RoleContext] Detected live production_staff columns:', cachedProdStaffColumns);
        return cachedProdStaffColumns;
      }
    }
  } catch (err) {
    console.error('[RoleContext] Error detecting production_staff columns:', err);
  }
  return ['staff_id', 'name', 'mobile', 'email', 'role', 'department', 'status', 'joining_date', 'notes', 'created_at', "'production_role_speciality", 'Staff_Type', 'staff_type', 'whatsapp_number', 'production_role_speciality', 'Skill', 'skill', 'city', 'experience', 'employee_id'];
};

export const mapProductionStaffFromDb = (item: any): Staff => {
  let extra: any = {};
  if (item.notes && item.notes.trim().startsWith('{') && item.notes.trim().endsWith('}')) {
    try { extra = JSON.parse(item.notes); } catch (e) {}
  }
  
  let nestedExtra: any = {};
  if (extra.notes && typeof extra.notes === 'string' && extra.notes.trim().startsWith('{') && extra.notes.trim().endsWith('}')) {
    try { nestedExtra = JSON.parse(extra.notes); } catch (e) {}
  }
  
  const name = item.staff_name || item.name || '';
  const mobile = item.mobile_number || item.mobile || '';
  const whatsapp_number = item.whatsapp_number || nestedExtra.whatsapp_number || extra.whatsapp_number || item.mobile_number || item.mobile || '';
  
  let production_role_speciality = item.production_role_speciality || item["'production_role_speciality"] || extra.production_role_speciality || '';
  if (typeof production_role_speciality === 'string' && production_role_speciality.startsWith('[') && production_role_speciality.endsWith(']')) {
    try {
      const parsed = JSON.parse(production_role_speciality);
      if (Array.isArray(parsed)) {
        production_role_speciality = parsed.join(', ');
      }
    } catch (e) {}
  }
  
  // Prioritize explicit Freelancer over default In-House if both exist in different formats, or fallback to any specified type
  const candidates = [
    item.staff_type,
    extra.staff_type,
    nestedExtra.staff_type,
    item.Staff_Type,
    extra.Staff_Type,
    nestedExtra.Staff_Type
  ].filter(val => val === 'In-House' || val === 'Freelancer');
  const resolvedStaffType = candidates.includes('Freelancer') ? 'Freelancer' : 'In-House';

  return {
    ...item,
    ...extra,
    staff_id: item.staff_id,
    name,
    mobile,
    whatsapp_number,
    production_role_speciality,
    staff_type: resolvedStaffType,
    email: item.email || `${name.toLowerCase().replace(/\s+/g, '')}@photocrew.com`,
    role: item.role || 'Editor',
    department: item.department || 'Post-Production',
    status: item.status || 'Active',
    joining_date: item.joining_date || new Date().toISOString().split('T')[0],
    Skill: Array.isArray(item.Skill) ? item.Skill : (typeof item.Skill === 'string' ? item.Skill.split(',').map((s: any) => s.trim()).filter(Boolean) : (Array.isArray(extra.Skill) ? extra.Skill : [])),
    notes: (item.notes && item.notes.trim().startsWith('{') && item.notes.trim().endsWith('}')) ? (extra.notes || '') : item.notes
  };
};

export const mapProductionStaffToDb = async (member: Staff | Partial<Staff>) => {
  const cols = await getProductionStaffColumns();
  const dbRecord: any = {};
  const extra: any = {};

  if (member.staff_id) dbRecord.staff_id = member.staff_id;

  if (member.name !== undefined) {
    if (cols.includes('staff_name')) {
      dbRecord.staff_name = member.name;
    }
    if (cols.includes('name')) {
      dbRecord.name = member.name;
    }
  }

  if (member.mobile !== undefined) {
    if (cols.includes('mobile_number')) {
      dbRecord.mobile_number = member.mobile;
    }
    if (cols.includes('mobile')) {
      dbRecord.mobile = member.mobile;
    }
  }

  if (member.whatsapp_number !== undefined) {
    if (cols.includes('whatsapp_number')) {
      dbRecord.whatsapp_number = member.whatsapp_number;
    } else {
      extra.whatsapp_number = member.whatsapp_number;
    }
  }

  if (member.staff_type !== undefined) {
    if (cols.includes('Staff_Type')) {
      dbRecord.Staff_Type = member.staff_type;
    }
    if (cols.includes('staff_type')) {
      dbRecord.staff_type = member.staff_type;
    }
    if (!cols.includes('Staff_Type') && !cols.includes('staff_type')) {
      extra.Staff_Type = member.staff_type;
    }
  }

  if ((member as any).Staff_Type !== undefined) {
    if (cols.includes('Staff_Type')) {
      dbRecord.Staff_Type = (member as any).Staff_Type;
    }
    if (cols.includes('staff_type')) {
      dbRecord.staff_type = (member as any).Staff_Type;
    }
    if (!cols.includes('Staff_Type') && !cols.includes('staff_type')) {
      extra.Staff_Type = (member as any).Staff_Type;
    }
  }

  if (member.production_role_speciality !== undefined) {
    const skillsVal = member.production_role_speciality;
    if (cols.includes('production_role_speciality')) {
      dbRecord.production_role_speciality = skillsVal;
    } else if (cols.includes("'production_role_speciality")) {
      dbRecord["'production_role_speciality"] = skillsVal;
    } else {
      extra.production_role_speciality = skillsVal;
    }
  }

  if (member.Skill !== undefined) {
    if (cols.includes('Skill')) {
      dbRecord.Skill = member.Skill;
    } else {
      extra.Skill = member.Skill;
    }
  }

  const standardFields = ['email', 'role', 'department', 'status', 'joining_date', 'profile_photo', 'auth_user_id'];
  for (const field of standardFields) {
    if ((member as any)[field] !== undefined) {
      if (cols.includes(field)) {
        dbRecord[field] = (member as any)[field];
      } else {
        extra[field] = (member as any)[field];
      }
    }
  }

  if (!member.staff_id) {
    if (cols.includes('email') && !dbRecord.email) {
      dbRecord.email = `${(member.name || '').toLowerCase().replace(/\s+/g, '') || 'staff'}@photocrew.com`;
    }
    if (cols.includes('role') && !dbRecord.role) {
      dbRecord.role = member.role || 'Editor';
    }
    if (cols.includes('department') && !dbRecord.department) {
      dbRecord.department = member.department || 'Post-Production';
    }
    if (cols.includes('status') && !dbRecord.status) {
      dbRecord.status = member.status || 'Active';
    }
    if (cols.includes('joining_date') && !dbRecord.joining_date) {
      dbRecord.joining_date = member.joining_date || new Date().toISOString().split('T')[0];
    }
  }

  if (member.notes !== undefined) {
    extra.notes = member.notes;
  }
  if (Object.keys(extra).length > 0) {
    dbRecord.notes = JSON.stringify(extra);
  }

  return dbRecord;
};

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalModalAlert, setGlobalModalAlert] = useState<{ message: string; title: string } | null>(null);

  useEffect(() => {
    // Beautiful, non-blocking window.alert override for sandboxed frames
    window.alert = (message: string) => {
      let title = "Notification";
      const lower = message.toLowerCase();
      if (message.startsWith("🎉") || lower.includes("success") || lower.includes("successfully") || lower.includes("completed") || lower.includes("congrat")) {
        title = "Operation Successful";
      } else if (lower.includes("fail") || lower.includes("error") || lower.includes("invalid") || lower.includes("required") || lower.includes("mandatory") || lower.includes("not allow")) {
        title = "Action Required";
      } else if (lower.includes("warn") || lower.includes("caution") || lower.includes("attention")) {
        title = "System Warning";
      }
      setGlobalModalAlert({ title, message });
    };
  }, []);

  const [globalDateRange, setGlobalDateRangeState] = useState<{ start: string; end: string }>(() => {
    const savedStart = sessionStorage.getItem('erp_global_start_date');
    const savedEnd = sessionStorage.getItem('erp_global_end_date');
    return {
      start: savedStart || '2026-06-01',
      end: savedEnd || '2026-06-30'
    };
  });

  const setGlobalDateRange = (range: { start: string; end: string }) => {
    sessionStorage.setItem('erp_global_start_date', range.start);
    sessionStorage.setItem('erp_global_end_date', range.end);
    setGlobalDateRangeState(range);
  };

  const resetGlobalDateRange = () => {
    sessionStorage.removeItem('erp_global_start_date');
    sessionStorage.removeItem('erp_global_end_date');
    setGlobalDateRangeState({ start: '2026-06-01', end: '2026-06-30' });
  };

  // Initialize state arrays as empty so data is always loaded directly from Supabase (the single source of truth) without relying on cached or stale demo data
  const [users, setUsers] = useState<User[]>([]);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('erp_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const currentUserRef = useRef<User | null>(null);
  const isLoggingInRef = useRef<boolean>(false);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem('erp_role') as UserRole) || 'Business Owner';
  });

  const [currentUserName, setCurrentUserNameState] = useState<string>(() => {
    return localStorage.getItem('erp_user_name') || 'Rupand Das';
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [leadPackages, setLeadPackages] = useState<LeadPackage[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [rawFootage, setRawFootage] = useState<RawFootage[]>([]);
  const [production, setProduction] = useState<Production[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [calendarMemos, setCalendarMemos] = useState<CalendarMemo[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [productionStaff, setProductionStaff] = useState<Staff[]>([]);

  const [equipment, setEquipment] = useState<Equipment[]>([]);

  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);

  const [leadStaffAssignmentHistory, setLeadStaffAssignmentHistory] = useState<LeadStaffAssignmentHistory[]>([]);
  const [leadEquipmentHistory, setLeadEquipmentHistory] = useState<LeadEquipmentHistory[]>([]);

  const [specialities, setSpecialities] = useState<ProductionSpeciality[]>([
    { speciality_id: 'SPC-001', name: 'Wedding Video Editor', active: true },
    { speciality_id: 'SPC-002', name: 'Reel Editor', active: true },
    { speciality_id: 'SPC-003', name: 'Album Designer', active: true },
    { speciality_id: 'SPC-004', name: 'Photo Editor', active: true },
    { speciality_id: 'SPC-005', name: 'Wedding Photo Editor', active: true },
    { speciality_id: 'SPC-006', name: 'Cinematic Video Editor', active: true },
    { speciality_id: 'SPC-007', name: 'Color Grading Specialist', active: true },
    { speciality_id: 'SPC-008', name: 'Thumbnail Designer', active: true },
    { speciality_id: 'SPC-009', name: 'Motion Graphics Editor', active: true },
    { speciality_id: 'SPC-010', name: 'Short Film Editor', active: true },
    { speciality_id: 'SPC-011', name: 'Senior Editor', active: true },
    { speciality_id: 'SPC-012', name: 'QC Reviewer', active: true }
  ]);

  const [editorAssignments, setEditorAssignments] = useState<EditorAssignment[]>([]);

  const [equipmentHandovers, setEquipmentHandovers] = useState<EquipmentHandover[]>([]);















  // Track session/auth state in localStorage to keep developer/user logged-in across refreshes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('erp_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('erp_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('erp_role', currentRole);
    localStorage.setItem('erp_user_name', currentUserName);
    console.log("[CACHE SYNC EVENT] Stored current role and username");
  }, [currentRole, currentUserName]);

  const augmentedOrders = useMemo(() => {
    // Post-sales stages that should produce active orders
    const postSalesStages = [
      'New Order Received', 'Confirm Order', 'Order Confirmed', 'Operations Assigned', 'Assigned Crew', 'Staff Assigned', 'Event Scheduled',
      'Event Started', 'Event Start', 'Event Ended', 'Event End', 'Event Completed', 'Event Complete',
      'Footage Handover', 'Equipment Handover', 'Footage Handover Verified', 'Verified Footage', 'Raw Footage Received',
      'Editor Assigned', 'Assigned Editor', 'Editing Started', 'Editing In Progress', 'Internal QC Review', 'Client Review Sent', 'Internal Review', 'Client Review', 'Revision Required', 'Revision In Progress', 'Revision', 'Final Approval', 'Project Delivered', 'Project Closed',
      'Customer Review', 'Approved', 'Delivered', 'Payment Pending', 'Closed', 'Business Owner Review', 'Order Closed', 'Client Acceptance'
    ];
    
    // Start with existing booked/restored orders from DB
    const list = [...orders];
    
    // For every lead, ensure a mapped order exists if the lead is confirmed
    leads.forEach(ld => {
      if (postSalesStages.includes(ld.status)) {
        const orderExists = list.some(o => o.lead_id === ld.lead_id || o.order_id === ld.lead_id);
        if (!orderExists) {
          const isNewFormat = ld.lead_id.match(/^LD(\d+)$/);
          const ordId = isNewFormat ? `OR${isNewFormat[1]}` : `ORD-${ld.lead_id.replace(/\D/g, '') || ld.lead_id}`;
          list.push({
            order_id: ordId,
            lead_id: ld.lead_id,
            customer_name: ld.customer_name,
            mobile: ld.mobile,
            event_type: ld.event_type,
            event_date: ld.event_date,
            event_time: ld.event_time,
            reporting_time: ld.reporting_time || '08:00',
            event_location: ld.event_location,
            package_name: 'Custom Shoot Package',
            quotation_amount: ld.budget || 0,
            advance_received: 0,
            balance_amount: ld.budget || 0,
            order_status: 'Confirmed',
            current_stage: ld.status,
            sales_person: ld.sales_person || ld.created_by || 'Sales Team',
            created_at: ld.updated_at || new Date().toISOString()
          });
        }
      }
    });

    // Make sure we override fields so that the leads table remains the single source of truth for status, dates, etc.
    return list.map(o => {
      const parentLead = leads.find(l => l.lead_id === o.lead_id);
      if (parentLead) {
        return {
          ...o,
          current_stage: parentLead.status,
          customer_name: parentLead.customer_name,
          mobile: parentLead.mobile,
          event_type: parentLead.event_type,
          event_date: parentLead.event_date,
          event_time: parentLead.event_time,
          reporting_time: parentLead.reporting_time || o.reporting_time,
          event_location: parentLead.event_location,
          quotation_amount: o.quotation_amount || parentLead.budget || 0
        };
      }
      return o;
    }).filter(o => {
      // STOLID FIX: Ensure ONLY confirmed bookings with valid post-sales stages stay in the orders list
      const parentLead = leads.find(l => l.lead_id === o.lead_id);
      if (!parentLead) return true; // Keep orphaned orders just in case
      const isBookingConfirmed = parentLead.booking_status === 'Confirmed' || o.order_status === 'Confirmed' || o.order_status === 'Completed' || o.order_status === 'Delivered' || o.order_status === 'Closed';
      return postSalesStages.includes(parentLead.status) && isBookingConfirmed;
    });
  }, [orders, leads]);

  const augmentedOperations = useMemo(() => {
    const list = [...operations];
    augmentedOrders.forEach(o => {
      const opExists = list.some(op => op.order_id === o.order_id);
      if (!opExists) {
        list.push({
          operation_id: `OP-${o.order_id}`,
          order_id: o.order_id,
          photographer_assigned: 'Unassigned',
          videographer_assigned: 'Unassigned',
          drone_operator_assigned: 'Unassigned',
          assistant_assigned: 'Unassigned',
          equipment_kit: '',
          reporting_time: o.reporting_time || '08:00',
          event_status: o.current_stage,
          updated_by: 'System'
        });
      }
    });
    return list.map(op => {
      const ord = augmentedOrders.find(o => o.order_id === op.order_id);
      if (ord) {
        return {
          ...op,
          event_status: ord.current_stage,
          reporting_time: ord.reporting_time || op.reporting_time
        };
      }
      return op;
    });
  }, [operations, augmentedOrders]);

  const augmentedProduction = useMemo(() => {
    const list = [...production];
    augmentedOrders.forEach(o => {
      const prodExists = list.some(p => 
        p.tracking_id === o.order_id || 
        p.tracking_id === o.lead_id ||
        (p as any).order_id === o.order_id ||
        (p as any).lead_id === o.lead_id
      );
      if (!prodExists) {
        const parentLeadForO = leads.find(l => l.lead_id === o.lead_id);
        const defaultTargetDate = parentLeadForO?.delivery_target_date || (o.event_date ? new Date(new Date(o.event_date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '');
        list.push({
          production_id: `PRD-${o.lead_id}`,
          tracking_id: o.order_id,
          order_id: o.order_id,
          lead_id: o.lead_id,
          editor_assigned: parentLeadForO?.assigned_editor || 'Unassigned',
          raw_footage_location: '',
          editing_status: (parentLeadForO?.current_status || parentLeadForO?.status || o.current_stage) as any,
          remarks: '',
          project_priority: 'Medium',
          target_delivery_date: defaultTargetDate,
          expected_delivery_date: defaultTargetDate
        });
      }
    });
    return list.map(p => {
      const ord = augmentedOrders.find(o => o.order_id === p.tracking_id || o.lead_id === p.tracking_id || o.order_id === (p as any).order_id || o.lead_id === (p as any).lead_id);
      const parentLead = leads.find(l => l.lead_id === p.tracking_id || (ord && l.lead_id === ord.lead_id) || l.lead_id === (p as any).lead_id);
      
      const leadStatus = parentLead?.current_status || parentLead?.status;
      const leadEditor = parentLead?.assigned_editor;
      const leadEditors = parentLead?.assigned_editors;
      const leadTargetDate = parentLead?.delivery_target_date;

      let updatedP = { ...p };

      if (!p.editing_status || p.editing_status === 'Pending') {
        if (leadStatus) {
          updatedP.editing_status = leadStatus as any;
        } else if (ord) {
          updatedP.editing_status = ord.current_stage as any;
        }
      }

      if (leadEditor && leadEditor !== 'Unassigned') {
        updatedP.editor_assigned = leadEditor;
      }
      if (leadEditors) {
        updatedP.assigned_staff = leadEditors;
      }
      if (leadTargetDate) {
        updatedP.target_delivery_date = leadTargetDate;
        updatedP.expected_delivery_date = leadTargetDate;
      }

      return updatedP;
    });
  }, [production, augmentedOrders, leads]);

  const augmentedPayments = useMemo(() => {
    const list = [...payments];
    augmentedOrders.forEach(o => {
      const payExists = list.some(p => p.order_id === o.order_id);
      if (!payExists) {
        list.push({
          payment_id: `PAY-${o.order_id}`,
          order_id: o.order_id,
          quotation_amount: o.quotation_amount,
          advance_received: o.advance_received || 0,
          final_payment_received: 0,
          balance_due: o.balance_amount || o.quotation_amount,
          payment_status: 'Pending'
        });
      }
    });
    return list.map(p => {
      const ord = augmentedOrders.find(o => o.order_id === p.order_id);
      if (ord) {
        const adv = ord.advance_received || 0;
        const totalPaid = adv + (p.final_payment_received || 0);
        const bal = ord.quotation_amount - totalPaid;
        return {
          ...p,
          quotation_amount: ord.quotation_amount,
          advance_received: adv,
          balance_due: bal >= 0 ? bal : 0,
          payment_status: totalPaid >= ord.quotation_amount ? 'Fully Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Pending') as any
        };
      }
      return p;
    });
  }, [payments, augmentedOrders]);

  // Helper to strip non-database properties like customer_id before saving to Supabase
  const stripClientOnlyFields = (table: string, record: any) => {
    if (!record || typeof record !== 'object') return record;
    
    let cloned = { ...record };
    delete cloned.customer_id;

    if (table === 'raw_footage') {
      delete cloned.storage_type;
      delete cloned.upload_notes;
    }

    if (table === 'users') {
      cloned.full_name = cloned.full_name || cloned.name;
      cloned.name = cloned.name || cloned.full_name;
      cloned.phone = cloned.phone || cloned.mobile;
      cloned.mobile = cloned.mobile || cloned.phone;
      delete cloned.employee_id;
    }

    if (table === 'operations_staff') {
      const existing = staff.find(s => s.staff_id === record.staff_id);
      const merged = existing ? { ...existing, ...cloned } : cloned;
      
      const extra: any = {};
      const localKeys = ['whatsapp_number', 'production_role_speciality', 'custom_role_specialty', 'experience', 'employee_id', 'address', 'city', 'phone', 'commission_rate', 'rating', 'bio', 'Skill', 'Staff_Type'];
      for (const k of localKeys) {
        if (k in merged) {
          extra[k] = merged[k];
        }
      }

      if (merged.role) {
        extra.role = merged.role;
      }
      extra.notes = (merged.notes && !merged.notes.trim().startsWith('{')) ? merged.notes : (extra.notes || merged.notes || '');

      const mapToDbStaffRole = (role: string): string => {
        const r = (role || '').trim().toLowerCase();
        if (r.includes('photographer')) return 'Photographer';
        if (r.includes('videographer')) return 'Videographer';
        if (r.includes('drone') || r.includes('aerial')) return 'Drone Operator';
        if (r.includes('editor')) return 'Coordinator';
        if (r.includes('assistant')) return 'Assistant';
        if (r.includes('coordinator')) return 'Coordinator';
        if (r.includes('manager')) return 'Manager';
        return 'Photographer';
      };

      const dbRole = mapToDbStaffRole(merged.role || 'Production Assistant');
      
      cloned = {
        staff_id: merged.staff_id,
        name: merged.name,
        mobile: merged.mobile,
        email: merged.email,
        role: dbRole,
        department: merged.department || 'Operations',
        status: merged.status || 'Active',
        joining_date: merged.joining_date || new Date().toISOString().split('T')[0],
        profile_photo: merged.profile_photo || '',
        notes: JSON.stringify(extra),
        created_at: merged.created_at || new Date().toISOString(),
        Skill: Array.isArray(merged.Skill) ? merged.Skill : (typeof merged.Skill === 'string' ? merged.Skill.split(',').map(s => s.trim()).filter(Boolean) : []),
        Staff_Type: merged.Staff_Type || merged.staff_type || 'In-House'
      } as any;

      // Only add extra fields if they are explicitly in the record and we want to try saving them as columns
      // But based on user request, let's stick to the 11 core fields and put the rest in notes if needed.
      // However, the DB might have these columns, so we can keep them if they are in allowedColumns.
      for (const k of localKeys) {
        if (k in merged) {
          cloned[k] = merged[k];
        }
      }
    }

    if (table === 'equipment') {
      cloned.Equipment_Category = cloned.equipment_type || cloned.Equipment_Category || 'Camera';
      cloned.Equipment_Status = cloned.status || cloned.Equipment_Status || 'Active';
    }

    const allowedColumns: Record<string, string[]> = {
      users: ['id', 'email', 'role', 'name', 'full_name', 'mobile', 'phone', 'active', 'created_at', 'password', 'username', 'status'],
      leads: [
        'lead_id', 'created_date', 'lead_source', 'customer_name', 'mobile', 'alternate_mobile', 
        'email', 'event_type', 'custom_event_type', 'custom_event_name', 'shoot_type', 'event_date', 'event_time', 'event_location', 'budget', 
        'sales_person', 'status', 'remarks', 'created_by', 'updated_by', 'updated_at', 
        'assigned_editor', 'assigned_editors', 'production_role', 'delivery_target_date', 'current_status',
        'whatsapp_number', 'address', 'client_residence_address', 'city', 'state', 'pincode', 'desired_event_shoot_type', 'Select_Package_Option',
        'total_pax', 'reference_source', 
        'lead_value', 'lead_score', 'booking_status', 'reporting_time', 'Reporting_date', 'package_price', 'deliverables_description', 
        'notes_special_customizations', 'quotation_discount', 'additional_services_cost', 'Quotation_Discount', 'Additional_Services_Cost', 'Specify_Custom_Lead_Source_Name', 'Final_Quotation_Amount', 'Quotation_Discount', 'Additional_Services_Cost', 'Specify_Custom_Lead_Source_Name', 'Final_Quotation_Amount', 'sales_staff_name', 'sales_staff_mobile'
      ],
      orders: [
        'order_id', 'lead_id', 'customer_name', 'mobile', 'event_type', 'custom_event_type', 'custom_event_name', 'shoot_type', 'event_date', 
        'event_time', 'event_location', 'package_name', 'quotation_amount', 'advance_received', 
        'balance_amount', 'order_status', 'current_stage', 'sales_person', 'created_at', 
        'updated_by', 'updated_at', 'whatsapp_number', 'client_residence_address', 'city', 'state', 'pincode', 'Select_Package_Option', 
        'desired_event_shoot_type', 'reporting_time', 'Reporting_date', 'package_price', 'deliverables_description', 
        'notes_special_customizations', 'quotation_discount', 'additional_services_cost', 'Quotation_Discount', 'Additional_Services_Cost', 'Specify_Custom_Lead_Source_Name', 'Final_Quotation_Amount',
        'total_pax', 'reference_source', 'lead_value', 'lead_score', 'booking_status'
      ],
      operations: [
        'operation_id', 'order_id', 'photographer_assigned', 'videographer_assigned', 
        'drone_operator_assigned', 'assistant_assigned', 'equipment_kit', 'reporting_time', 
        'event_status', 'remarks', 'updated_by', 'Upload_Notes_Remarks', 'upload_notes_remarks',
        'Raw_Footage_Drive_Link', 'raw_footage_drive_link'
      ],
      quotations: [
        'quotation_id', 'lead_id', 'quotation_number', 'quotation_amount', 'discount_amount', 
        'tax_amount', 'final_amount', 'quotation_status', 'valid_until', 'terms_conditions', 
        'package_name', 'package_price', 'deliverables_description', 
        'notes_special_customizations', 'additional_services_cost', 
        'whatsapp_number', 'shoot_type', 'client_residence_address', 'city', 'state', 'pincode', 'desired_event_shoot_type', 'Select_Package_Option',
        'quotation_discount', 'total_pax', 'reference_source', 'lead_value', 'lead_score', 'booking_status',
        'created_at', 'created_by', 'updated_at'
      ],
      lead_packages: [
        'lead_package_id', 'lead_id', 'package_id', 'package_name', 'package_cost', 'quantity', 
        'total_amount', 'discount', 'final_amount', 'deliverables_description', 
        'notes_special_customizations', 'additional_services_cost', 'team_members', 'deliverables', 'editable_inclusions', 'editable_deliverables', 'created_at'
      ],
      raw_footage: [
        'tracking_id', 'order_id', 'event_completed_date', 'raw_received', 'server_path', 
        'uploaded_by', 'uploaded_date', 'status'
      ],
      production: [
        'production_id', 'tracking_id', 'editor_assigned', 'raw_footage_location', 
        'editing_start_date', 'expected_delivery_date', 'editing_status', 
        'customer_review_status', 'delivery_date', 'remarks', 'project_priority',
        'target_delivery_date', 'actual_delivery_date', 'assigned_staff', 'project_notes',
        'internal_comments', 'raw_footage_status', 'production_status', 'approval_status',
        'editing_progress', 'client_communication_proof', 'order_id', 'lead_id', 'customer_name',
        'event_id', 'assigned_team', 'final_consolidated_drive_link', 'current_status'
      ],
      payments: [
        'payment_id', 'order_id', 'quotation_amount', 'advance_received', 'balance_due', 
        'final_payment_received', 'payment_date', 'payment_proof_url', 'payment_status'
      ],
      activity_logs: [
        'log_id', 'user_name', 'role', 'action', 'module', 'record_id', 'timestamp', 
        'previous_stage', 'new_stage'
      ],
      staff_assignments: [
        'assignment_id', 'order_id', 'staff_role', 'staff_id', 'staff_name', 'assignment_date', 'assignment_status'
      ],
      lead_status_history: [
        'id', 'lead_id', 'order_id', 'old_status', 'new_status', 'changed_by', 'changed_by_role', 'remarks', 'created_at'
      ],
      lead_staff_assignment_history: [
        'history_id', 'lead_id', 'order_id', 'assigned_role', 'assigned_staff', 'assigned_by', 'assigned_at'
      ],
      lead_equipment_history: [
        'id', 'lead_id', 'order_id', 'equipment_name', 'equipment_status', 'returned_by', 'returned_at', 'remarks'
      ],
      notifications: [
        'notification_id', 'title', 'message', 'sender_name', 'sender_role', 'timestamp', 
        'is_read', 'recipient_role'
      ],
      equipment: [
        'equipment_id', 'equipment_name', 'brand', 'Equipment_Category', 'Equipment_Status'
      ],
      editor_assignments: [
        'assignment_id', 'production_id', 'staff_id', 'staff_name', 'speciality', 
        'assigned_date', 'target_finish_date', 'status', 'created_at', 'event_id', 
        'order_id', 'deliverable_id', 'Edited_Drive_Link', 'edited_drive_link'
      ],
      operations_staff: [
        'staff_id', 'name', 'mobile', 'whatsapp_number', 'email', 'role', 'department', 'status', 'joining_date', 
        'profile_photo', 'notes', 'production_role_speciality', 'experience', 'employee_id', 'city', 'Skill', 'Staff_Type',
        'created_by', 'updated_by', 'created_at', 'updated_at'
      ]
    };

    const validCols = allowedColumns[table];
    if (validCols) {
      const sanitized: any = {};
      for (const col of validCols) {
        if (col in cloned) {
          sanitized[col] = cloned[col];
        }
      }
      return sanitized;
    }

    return cloned;
  };

  const verifyLeadsColumns = async (): Promise<{ success: boolean; error?: string }> => {
    return { success: true };
  };

  const isNumericColumnKey = (key: string): boolean => {
    if (!key || typeof key !== 'string') return false;
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const knownKeys = new Set([
      'budget', 'package_price', 'package_cost', 'quotation_amount',
      'quotation_discount', 'quotationdiscount',
      'additional_services_cost', 'additionalservicescost',
      'final_quotation_amount', 'finalquotationamount',
      'final_amount', 'final_package_amount', 'total_amount',
      'advance_received', 'advance_collected', 'advance_payment', 'advance_paid',
      'balance_amount', 'balance', 'total_pax', 'guest_pax', 'staff_pax',
      'lead_value', 'lead_score', 'pincode', 'tax_amount', 'subtotal',
      'grand_total', 'total_payment', 'contract_final_amount', 'advance_payment_received',
      'pending_amount', 'number_of_team_members', 'event_duration', 'quantity', 'discount',
      'price', 'cost', 'amount', 'rate', 'fee', 'whatsapp_number', 'mobile', 'alternate_mobile',
      'sales_staff_mobile'
    ]);
    if (knownKeys.has(key) || knownKeys.has(k)) return true;
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
  };

  const sanitizeTimeFieldsForDb = (record: any, table?: string) => {
    if (!record || typeof record !== 'object') return record;
    const clone = { ...record };
    
    // Fallbacks for leads table not-null constraints
    if (table === 'leads') {
      if (clone.event_date === null || clone.event_date === '' || clone.event_date === undefined) {
         clone.event_date = new Date().toISOString().split('T')[0];
      }
      if (clone.event_time === null || clone.event_time === '' || clone.event_time === undefined) {
         clone.event_time = '12:00:00';
      }
    }

    const timeFields = ['event_time', 'reporting_time', 'confirmed_event_time'];
    const dateFields = ['event_date', 'booking_date', 'event_start_date', 'event_end_date', 'delivery_target_date'];

    // Comprehensive numeric sanitization to ensure empty strings are NEVER sent to NUMERIC/DECIMAL/INT columns
    for (const key of Object.keys(clone)) {
      if (isNumericColumnKey(key)) {
        const val = clone[key];
        const isPhone = key.includes('mobile') || key.includes('whatsapp') || key.includes('phone');
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

    for (const field of dateFields) {
      if (field in clone) {
        const val = clone[field];
        if (val === undefined || val === null || String(val).trim() === '') {
          clone[field] = null;
        }
      }
    }
    
    for (const field of timeFields) {
      if (field in clone) {
        const val = clone[field];
        if (val === undefined || val === null) {
          clone[field] = null;
        } else {
          const str = String(val).trim();
          if (str === '' || str === 'null' || str === 'undefined' || str === 'Invalid Date') {
            clone[field] = null;
          } else {
            try {
              const ampmMatch = str.replace(/\s+/g, ' ').toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
              const hhmmMatch = str.replace(/\s+/g, ' ').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
              if (ampmMatch) {
                let hours = parseInt(ampmMatch[1], 10);
                const minutes = ampmMatch[2];
                const period = ampmMatch[3];
                if (period === 'PM' && hours < 12) hours += 12;
                else if (period === 'AM' && hours === 12) hours = 0;
                clone[field] = `${String(hours).padStart(2, '0')}:${minutes}:00`;
              } else if (hhmmMatch) {
                const hours = parseInt(hhmmMatch[1], 10);
                const minutes = hhmmMatch[2];
                const seconds = hhmmMatch[3] || '00';
                clone[field] = `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
              } else {
                clone[field] = null;
              }
            } catch (e) {
              clone[field] = null;
            }
          }
        }
      }
    }

    // Double check NOT NULL for leads just in case it got nulled
    if (table === 'leads') {
      if (clone.event_date === null) clone.event_date = new Date().toISOString().split('T')[0];
      if (clone.event_time === null) clone.event_time = '12:00:00';
    }

    return clone;
  };

  // Synchronous CRUD wrappers for updating Supabase in backgrounds
const safeParseResponse = async (response: Response): Promise<{ ok: boolean; data: any; isJson: boolean; text: string }> => {
  try {
    const text = await response.text();
    if (!text || (!text.trim().startsWith('{') && !text.trim().startsWith('['))) {
      return { ok: false, data: null, isJson: false, text };
    }
    const data = JSON.parse(text);
    return { ok: response.ok, data, isJson: true, text };
  } catch (err) {
    return { ok: false, data: null, isJson: false, text: '' };
  }
};

  const pushInsert = async (table: string, record: any): Promise<{ success: boolean; error?: string; localFallback?: boolean }> => {
    if (!supabaseClient) return { success: true };
    try {
      if (table === 'leads') {
        if (!('total_pax' in record)) {
          record.total_pax = 0;
        }
        if (!('reference_source' in record)) {
          record.reference_source = '';
        }
      }
      const sanitized = sanitizeTimeFieldsForDb(stripClientOnlyFields(table, record), table);
      if (table === 'operations_staff' && sanitized.staff_id) {
        sanitized.staff_id = mapToDbStaffId(sanitized.staff_id);
      }
      if (table === 'equipment' && sanitized.equipment_id) {
        sanitized.equipment_id = mapToDbEquipmentId(sanitized.equipment_id);
      }
      if (table === 'leads') {
        const anyStatus = sanitized.status || sanitized.current_status || record.status || record.current_status || 'New Lead';
        sanitized.status = anyStatus;
        sanitized.current_status = anyStatus;
        if (currentUserName) {
          sanitized.created_by = `${currentUserName}|${currentRole || 'System'}`;
        }
      }
      // Try sending to server-side proxy first to bypass client RLS issues
      try {
        const response = await fetch('/api/db/insert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, record: sanitized })
        });
        const parsed = await safeParseResponse(response);
        if (parsed.isJson && parsed.data && typeof parsed.data === 'object') {
          const resJson = parsed.data;
          if (resJson && resJson.success) {
            console.log(`[pushInsert Proxy SUCCESS] for ${table}:`, resJson.data);
            updateDiagnosticMetric('insert', 'ok');

            // Clean up matching local record if any from erp_local_<tableKey>
            const localKey = `erp_local_${table}`;
            const existingLocalStr = localStorage.getItem(localKey);
            if (existingLocalStr) {
              try {
                const localRecords = JSON.parse(existingLocalStr);
                if (Array.isArray(localRecords)) {
                  const idCol = table === 'leads' ? 'lead_id' : (table === 'orders' ? 'order_id' : null);
                  if (idCol && record[idCol]) {
                    const filtered = localRecords.filter((r: any) => r && r[idCol] !== record[idCol]);
                    localStorage.setItem(localKey, JSON.stringify(filtered));
                  }
                }
              } catch (e) {
                console.error(`Error cleaning up local records on insert for ${table}:`, e);
              }
            }

            broadcastSyncPing();
            return { success: true };
          } else {
            console.warn(`[pushInsert Proxy WARN] server returned success=false for ${table}`, resJson?.error);
            return { success: false, error: resJson?.error || "Server validation failed" };
          }
        } else {
          console.warn(`[pushInsert Proxy WARN] server returned non-JSON or status ${response.status} for ${table}, falling back...`);
        }
      } catch (proxyErr) {
        console.warn(`[pushInsert Proxy ERROR] failed to reach server for ${table}, falling back...`, proxyErr);
      }

      try {
        const { data: fallbackInsData, error } = await supabaseClient.from(table).insert(sanitized).select();
        if (error) {
          if (['activity_logs', 'notifications', 'analytics_snapshots'].includes(table)) {
            return { success: true };
          }
          console.warn(`Supabase Insert error in ${table}:`, error?.message || String(error));
          updateDiagnosticMetric('insert', 'fail', error?.message || String(error));
          return { success: false, error: `[Table: ${table}] ${error?.message || String(error)}` };
        } else {
          updateDiagnosticMetric('insert', 'ok');

          // Clean up matching local record if any from erp_local_<tableKey>
          const localKey = `erp_local_${table}`;
          const existingLocalStr = localStorage.getItem(localKey);
          if (existingLocalStr) {
            try {
              const localRecords = JSON.parse(existingLocalStr);
              if (Array.isArray(localRecords)) {
                const idCol = table === 'leads' ? 'lead_id' : (table === 'orders' ? 'order_id' : null);
                if (idCol && record[idCol]) {
                  const filtered = localRecords.filter((r: any) => r && r[idCol] !== record[idCol]);
                  localStorage.setItem(localKey, JSON.stringify(filtered));
                }
              }
            } catch (e) {
              console.error(`Error cleaning up local records on insert for ${table}:`, e);
            }
          }

          // Realtime subscription will handle syncing new records
          broadcastSyncPing();

          return { success: true };
        }
      } catch (sbErr: any) {
        console.warn(`Supabase insert exception in ${table} (handled gracefully):`, sbErr?.message || String(sbErr));
        return { success: true, localFallback: true };
      }
    } catch (err: any) {
      console.warn(`Supabase Insert exception in ${table}:`, err?.message || String(err));
      updateDiagnosticMetric('insert', 'fail', err?.message || String(err));
      return { success: false, error: err?.message || String(err) };
    }
  };

  const pushUpdate = async (table: string, matchColumn: string, matchValue: any, updates: any): Promise<{ success: boolean; error?: string; localFallback?: boolean }> => {
    if (!supabaseClient) return { success: true };
    try {
      const sanitized = sanitizeTimeFieldsForDb(stripClientOnlyFields(table, updates), table);
      let finalMatchValue = matchValue;
      if (table === 'operations_staff') {
        if (matchColumn === 'staff_id' && matchValue) {
          finalMatchValue = mapToDbStaffId(matchValue);
        }
        if (sanitized.staff_id) {
          sanitized.staff_id = mapToDbStaffId(sanitized.staff_id);
        }
      }
      if (table === 'equipment') {
        if (matchColumn === 'equipment_id' && matchValue) {
          finalMatchValue = mapToDbEquipmentId(matchValue);
        }
        if (sanitized.equipment_id) {
          sanitized.equipment_id = mapToDbEquipmentId(sanitized.equipment_id);
        }
      }
      if (table === 'leads') {
        const leadId = matchColumn === 'lead_id' ? matchValue : null;
        const prevLead = leads.find(l => l.lead_id === leadId);
        if (!('total_pax' in sanitized)) {
          sanitized.total_pax = prevLead ? (prevLead.total_pax ?? 0) : 0;
        }
        if (!('reference_source' in sanitized)) {
          sanitized.reference_source = prevLead ? (prevLead.reference_source ?? '') : '';
        }
      }
      console.log(`[pushUpdate START] table: ${table}, match: ${matchColumn}=${matchValue}`, sanitized);

      // --- CONSTRAINT BYPASS LOGIC ---
      if (table === 'leads') {
        const anyStatus = sanitized.status || sanitized.current_status || updates.status || updates.current_status;
        if (anyStatus) {
          sanitized.status = anyStatus;
          sanitized.current_status = anyStatus;
        }
        if (currentUserName) {
          sanitized.updated_by = `${currentUserName}|${currentRole || 'System'}`;
        }
      } else if (table === 'orders') {
        if (sanitized.current_stage) {
          sanitized.order_status = ['Closed', 'Delivered', 'Paid'].includes(sanitized.current_stage) ? sanitized.current_stage : 'Confirmed';
        }
      }
      // -------------------------------
      
      if (Object.keys(sanitized).length === 0) {
        console.log(`[pushUpdate SKIPPED] No valid columns to update for ${table}.`);
        return { success: true };
      }

      console.log(`[pushUpdate EXECUTING] on ${table}:`, sanitized);
      
      // Try sending to server-side proxy first to bypass client RLS issues
      try {
        const response = await fetch('/api/db/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, matchColumn, matchValue: finalMatchValue, updates: sanitized })
        });
        const parsed = await safeParseResponse(response);
        if (parsed.isJson && parsed.data && typeof parsed.data === 'object') {
          const resJson = parsed.data;
          if (resJson && resJson.success) {
            console.log(`[pushUpdate Proxy SUCCESS] for ${table}:`, resJson.data);
            updateDiagnosticMetric('update', 'ok');
            if (table === 'editor_assignments') {
              const linkVal = sanitized.Edited_Drive_Link || sanitized.edited_drive_link;
              setEditorAssignments(prev => prev.map(a => a.assignment_id === finalMatchValue ? {
                ...a,
                ...sanitized,
                Edited_Drive_Link: linkVal || a.Edited_Drive_Link,
                edited_drive_link: linkVal || a.edited_drive_link
              } : a));
            }
            if (table === 'leads') {
              const leadId = finalMatchValue;
              const prevLead = leads.find(l => l.lead_id === leadId);
              const oldStatus = prevLead ? (prevLead.current_status || prevLead.status || 'New Lead') : 'New Lead';
              const anyStatus = sanitized.status || sanitized.current_status || updates.status || updates.current_status;
              
              if (anyStatus && anyStatus !== oldStatus) {
                const timestamp = new Date().toISOString();
                const linkedOrder = orders.find(o => o.lead_id === leadId);
                const orderId = linkedOrder ? linkedOrder.order_id : null;
                const authorString = currentUserName ? `${currentUserName}|${currentRole || 'System'}` : 'System';
                
                const historyPayload = {
                  history_id: `HST-${Math.floor(1000 + Math.random() * 9000)}`,
                  lead_id: leadId,
                  order_id: orderId,
                  old_status: oldStatus,
                  new_status: anyStatus,
                  changed_by: authorString,
                  remarks: sanitized.remarks || updates.remarks || ''
                };
                
                await pushInsert('lead_status_history', historyPayload);
              }
            }

            broadcastSyncPing();
            return { success: true };
          } else {
            console.warn(`[pushUpdate Proxy WARN] server returned success=false for ${table}`, resJson?.error);
            return { success: false, error: resJson?.error || "Server validation failed" };
          }
        } else {
          console.warn(`[pushUpdate Proxy WARN] server returned non-JSON or status ${response.status} for ${table}, falling back...`);
        }
      } catch (proxyErr: any) {
        console.warn(`[pushUpdate Proxy ERROR] failed to reach server for ${table}, falling back...`, proxyErr);
      }

      try {
        let { error, data } = await supabaseClient.from(table).update(sanitized).eq(matchColumn, finalMatchValue).select();
        
        // Automatic unified fallback for database check constraints or value exceptions
        if (error && (
          error.message.toLowerCase().includes('constraint') || 
          error.message.toLowerCase().includes('check') || 
          error.message.toLowerCase().includes('violate') || 
          error.message.toLowerCase().includes('status_check') ||
          error.message.toLowerCase().includes('invalid')
        )) {
           let fallbackNeeded = false;
           if (table === 'leads' && sanitized.status) {
              console.warn(`[pushUpdate FALLBACK] Constraint error on leads for status (${sanitized.status}). Stripping status and retrying with current_status only...`);
              delete sanitized.status;
              fallbackNeeded = true;
           }
           if (table === 'orders' && sanitized.order_status) {
              console.warn(`[pushUpdate FALLBACK] Constraint error on orders for stage (${sanitized.current_stage}). Stripping order_status and retrying...`);
              delete sanitized.order_status;
              fallbackNeeded = true;
           }
           if (table === 'production' && sanitized.editing_status) {
              console.warn(`[pushUpdate FALLBACK] Constraint error on production for status (${sanitized.editing_status}). Stripping editing_status and retrying...`);
              delete sanitized.editing_status;
              fallbackNeeded = true;
           }
           if (fallbackNeeded) {
              const fallback = await supabaseClient.from(table).update(sanitized).eq(matchColumn, matchValue).select();
              error = fallback.error;
              data = fallback.data;
           }
        }
        if (error) {
          if (['activity_logs', 'notifications', 'analytics_snapshots'].includes(table)) {
            return { success: true };
          }
          console.warn(`[pushUpdate ERROR] in ${table}:`, error?.message || String(error));
          updateDiagnosticMetric('update', 'fail', error?.message || String(error));
          return { success: false, error: `[Table: ${table}] ${error?.message || String(error)}` };
        } else {
          console.log(`[pushUpdate SUCCESS] returned data:`, data);
          updateDiagnosticMetric('update', 'ok');
          if (table === 'leads') {
            const leadId = matchValue;
            const prevLead = leads.find(l => l.lead_id === leadId);
            const oldStatus = prevLead ? (prevLead.current_status || prevLead.status || 'New Lead') : 'New Lead';
            const anyStatus = sanitized.status || sanitized.current_status || updates.status || updates.current_status;
            
            if (anyStatus && anyStatus !== oldStatus) {
              const timestamp = new Date().toISOString();
              const linkedOrder = orders.find(o => o.lead_id === leadId);
              const orderId = linkedOrder?.order_id || null;
              
              const roleParts = (currentUserName && currentUserName.includes('|')) 
                ? currentUserName.split('|') 
                : [currentUserName || 'System', currentRole || 'System'];
              const changedBy = roleParts[0];
              const changedByRole = roleParts[1] || currentRole || 'System';
              
              const newHist = {
                lead_id: leadId,
                order_id: orderId,
                old_status: oldStatus,
                new_status: anyStatus,
                changed_by: changedBy,
                changed_by_role: changedByRole,
                remarks: updates.remarks || sanitized.remarks || 'Status updated from dashboard',
                created_at: timestamp
              };
              
              try {
                const insertRes = await supabaseClient.from('lead_status_history').insert(newHist);
                if (insertRes.error) {
                  console.warn("Failed to insert lead status history in pushUpdate:", insertRes.error?.message || insertRes.error);
                } else {
                  setStatusHistory(prev => {
                    const updatedHist = [...prev, newHist];
                    localStorage.setItem('erp_status_history', JSON.stringify(updatedHist));
                    return updatedHist;
                  });
                }
              } catch (e: any) {
                console.warn("Failed to insert lead status history in pushUpdate (exception):", e?.message || e);
              }
              
              setLeads((prev) => 
                prev.map((ld) => {
                  if (ld.lead_id === leadId) {
                    return {
                      ...ld,
                      status: anyStatus,
                      current_status: anyStatus,
                      updated_at: timestamp
                    };
                  }
                  return ld;
                })
              );
            }
          }

          // Clean up from erp_local_<tableKey> upon successful db write
          const localKey = `erp_local_${table}`;
          const existingLocalStr = localStorage.getItem(localKey);
          if (existingLocalStr) {
            try {
              const localRecords = JSON.parse(existingLocalStr);
              if (Array.isArray(localRecords)) {
                const filtered = localRecords.filter((r: any) => r && r[matchColumn] !== matchValue);
                localStorage.setItem(localKey, JSON.stringify(filtered));
              }
            } catch (e) {
              console.error(`Error cleaning up local records for ${table}:`, e);
            }
          }

          // Realtime subscription will handle syncing updated records
          broadcastSyncPing();

          return { success: true };
        }
      } catch (sbErr: any) {
        console.warn(`Supabase update exception in ${table} (handled gracefully):`, sbErr?.message || String(sbErr));
        return { success: true, localFallback: true };
      }
    } catch (err: any) {
      console.warn(`[pushUpdate EXCEPTION] in ${table}:`, err?.message || String(err));
      updateDiagnosticMetric('update', 'fail', err?.message || String(err));
      return { success: false, error: err?.message || String(err) };
    }
  };

  const pushDelete = async (table: string, matchColumn: string, matchValue: any): Promise<{ success: boolean; error?: string }> => {
    if (!supabaseClient) return { success: true };
    try {
      let finalMatchValue = matchValue;
      if (table === 'operations_staff' && matchColumn === 'staff_id' && matchValue) {
        finalMatchValue = mapToDbStaffId(matchValue);
      }
      if (table === 'equipment' && matchColumn === 'equipment_id' && matchValue) {
        finalMatchValue = mapToDbEquipmentId(matchValue);
      }
      // Remove from local fallback store
      const localKey = `erp_local_${table}`;
      const existingLocalStr = localStorage.getItem(localKey);
      if (existingLocalStr) {
        try {
          const localRecords = JSON.parse(existingLocalStr);
          const filtered = localRecords.filter((r: any) => r && r[matchColumn] !== matchValue);
          localStorage.setItem(localKey, JSON.stringify(filtered));
        } catch (e) {}
      }

      // Try sending to server-side proxy first to bypass client RLS issues
      try {
        const response = await fetch('/api/db/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, matchColumn, matchValue: finalMatchValue })
        });
        const parsed = await safeParseResponse(response);
        if (parsed.ok && parsed.isJson) {
          const resJson = parsed.data;
          if (resJson && resJson.success) {
            console.log(`[pushDelete Proxy SUCCESS] for ${table}`);
            updateDiagnosticMetric('delete', 'ok');
            broadcastSyncPing();
            return { success: true };
          } else {
            console.warn(`[pushDelete Proxy WARN] server returned success=false for ${table}, falling back...`, resJson?.error);
          }
        } else {
          console.warn(`[pushDelete Proxy WARN] server returned non-JSON or status ${response.status} for ${table}, falling back...`);
        }
      } catch (proxyErr) {
        console.warn(`[pushDelete Proxy ERROR] failed to reach server for ${table}, falling back...`, proxyErr);
      }

      try {
        const { data: fallbackDelData, error } = await supabaseClient.from(table).delete().eq(matchColumn, finalMatchValue).select();
        if (error) {
          if (['activity_logs', 'notifications', 'analytics_snapshots'].includes(table)) {
            return { success: true };
          }
          console.warn(`Supabase Delete error in ${table}:`, error?.message || String(error));
          updateDiagnosticMetric('delete', 'fail', error?.message || String(error));
          return { success: false, error: `[Table: ${table}] ${error?.message || String(error)}` };
        } else {
          updateDiagnosticMetric('delete', 'ok');
          // Realtime subscription will handle syncing deleted records
          broadcastSyncPing();
          return { success: true };
        }
      } catch (sbErr: any) {
        console.warn(`Supabase delete exception in ${table} (handled gracefully):`, sbErr?.message || String(sbErr));
        return { success: true };
      }
    } catch (err: any) {
      updateDiagnosticMetric('delete', 'fail', err?.message || String(err));
      return { success: false, error: err?.message || String(err) };
    }
  };

  const pushUpsert = async (table: string, record: any) => {
    if (!supabaseClient) return { success: true };
    try {
      const sanitized = stripClientOnlyFields(table, record);
      
      // Try proxy first
      try {
        const response = await fetch('/api/db/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, record: sanitized })
        });
        const parsed = await safeParseResponse(response);
        if (parsed.isJson && parsed.data && typeof parsed.data === 'object') {
          const resJson = parsed.data;
          if (resJson && resJson.success) {
            updateDiagnosticMetric('insert', 'ok');
            broadcastSyncPing();
            return { success: true };
          } else {
            console.warn(`[pushUpsert Proxy WARN] server returned success=false for ${table}`, resJson?.error);
            return { success: false, error: resJson?.error || "Server validation failed" };
          }
        }
      } catch (proxyErr) {
        console.warn(`[pushUpsert Proxy ERROR] failed to reach server for ${table}, falling back...`, proxyErr);
      }

      try {
        const { error } = await supabaseClient.from(table).upsert(sanitized);
        if (error) {
          console.warn(`Supabase Upsert error in ${table}:`, error?.message || String(error));
          updateDiagnosticMetric('insert', 'fail', error?.message || String(error));
          return { success: false, error: `[Table: ${table}] ${error?.message || String(error)}` };
        } else {
          updateDiagnosticMetric('insert', 'ok');
          // Realtime subscription will handle syncing
          broadcastSyncPing();
          return { success: true };
        }
      } catch (sbErr: any) {
        console.warn(`Supabase upsert exception in ${table} (handled gracefully):`, sbErr?.message || String(sbErr));
        return { success: true };
      }
    } catch (err: any) {
      updateDiagnosticMetric('insert', 'fail', err?.message || String(err));
      return { success: false, error: err?.message || String(err) };
    }
  };

  // Fetch full dataset from Supabase
  const seedDatabase = async () => {
    if (!supabaseClient) return;
    try {
      console.log('Database is empty, starting automated initial seeding to Supabase...');
      for (const u of INITIAL_USERS) {
        await supabaseClient.from('users').upsert({
          ...u,
          id: mapToDbUserId(u.id),
          username: u.username || u.email.split('@')[0]
        });
      }
      // Upsert other tables
      if (INITIAL_LEADS?.length > 0) await supabaseClient.from('leads').upsert(INITIAL_LEADS);
      if (INITIAL_ORDERS?.length > 0) await supabaseClient.from('orders').upsert(INITIAL_ORDERS);
      if (INITIAL_OPERATIONS?.length > 0) await supabaseClient.from('operations').upsert(INITIAL_OPERATIONS);
      if (INITIAL_RAW_FOOTAGE?.length > 0) await supabaseClient.from('raw_footage').upsert(INITIAL_RAW_FOOTAGE);
      if (INITIAL_PRODUCTION?.length > 0) await supabaseClient.from('production').upsert(INITIAL_PRODUCTION);
      if (INITIAL_PAYMENTS?.length > 0) await supabaseClient.from('payments').upsert(INITIAL_PAYMENTS);
      try { if (INITIAL_LOGS?.length > 0) await supabaseClient.from('activity_logs').upsert(INITIAL_LOGS); } catch (e) {}
      try {
        if (INITIAL_PACKAGES?.length > 0) {
          for (const pkg of INITIAL_PACKAGES) {
            await pushUpsert('packages', mapPackageToDbPayload(pkg));
          }
        }
      } catch (e) {
        console.warn('Initial package seeding warning:', e);
      }

      console.log('Database initial seeding completed successfully.');
    } catch (err: any) {
      console.error('Automated database seeding failed:', err);
    }
  };

  // Fetch full dataset from Supabase
  const fetchFromDb = async (showLoader = false) => {
    if (!supabaseClient) return;
    if (showLoader) setIsDataLoading(true);

    try {
      const results = await Promise.all([
        supabaseClient.from('users').select('*'),
        supabaseClient.from('leads').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('orders').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('operations').select('*'),
        supabaseClient.from('raw_footage').select('*'),
        supabaseClient.from('production').select('*'),
        supabaseClient.from('payments').select('*'),
        supabaseClient.from('activity_logs').select('*').order('timestamp', { ascending: false }),
        supabaseClient.from('operations_staff').select('*').order('name'),
        supabaseClient.from('notifications').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('equipment').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('lead_packages').select('*'),
        supabaseClient.from('packages').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('staff_assignments').select('*'),
        supabaseClient.from('quotations').select('*'),
        supabaseClient.from('lead_status_history').select('*').order('created_at', { ascending: true }),
        supabaseClient.from('lead_staff_assignment_history').select('*').order('assigned_at', { ascending: false }),
        supabaseClient.from('lead_equipment_history').select('*').order('returned_at', { ascending: false }),
        supabaseClient.from('lead_events').select('*').order('created_at', { ascending: true }),
        supabaseClient.from('equipment_handovers').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('production_specialties').select('*'),
        supabaseClient.from('editor_assignments').select('*'),
        supabaseClient.from('production_staff').select('*'),
        supabaseClient.from('calendar_memos').select('*').order('created_at', { ascending: false })
      ]);

      const tables = [
        'users', 'leads', 'orders', 'operations', 'raw_footage', 'production', 
        'payments', 'activity_logs', 'operations_staff', 'notifications', 
        'equipment', 'lead_packages', 'packages', 'staff_assignments', 
        'quotations', 'lead_status_history', 'lead_staff_assignment_history', 
        'lead_equipment_history', 'lead_events', 'equipment_handovers', 
        'production_specialties', 'editor_assignments', 'production_staff', 'calendar_memos'
      ];
      
      let hasError = false;
      for (let i = 0; i < results.length; i++) {
        if (results[i].error) {
           console.warn(`Data Fetch Warning in table ${tables[i]}:`, results[i].error);
           if (tables[i] === 'leads' && results[i].error.message?.includes('created_at')) {
             // Fallback for leads if created_at is missing
             const fallbackRes = await supabaseClient.from('leads').select('*');
             results[i] = fallbackRes;
           }
           if (tables[i] === 'orders' && results[i].error.message?.includes('created_at')) {
             const fallbackRes = await supabaseClient.from('orders').select('*');
             results[i] = fallbackRes;
           }
        }
      }

      const [
        { data: dbUsers },
        { data: dbLeads },
        { data: dbOrders },
        { data: dbOperations },
        { data: dbRawFootage },
        { data: dbProduction },
        { data: dbPayments },
        { data: dbLogs },
        { data: dbStaff },
        { data: dbNotifications },
        { data: dbEquipment },
        { data: dbLeadPackages },
        { data: dbPackages },
        { data: dbStaffAssignments },
        { data: dbQuotations },
        { data: dbStatusHistory },
        { data: dbLeadStaffAssignmentHistory },
        { data: dbLeadEquipmentHistory },
        { data: dbLeadEvents },
        { data: dbHandovers },
        { data: dbSpecList },
        { data: dbAssignList },
        { data: dbProdStaff },
        { data: dbCalendarMemos }
      ] = results;

      if (dbUsers && dbUsers.length === 0) {
        await seedDatabase();
        await fetchFromDb(showLoader);
        return;
      }
      if (dbUsers) {
        setUsers(dbUsers.map(mapUserFieldsFromDb));
      }

      if (dbLeads) {
        const parsedLeads = dbLeads.map((l: any) => {
          let evts = [];
          if (dbLeadEvents) {
            evts = dbLeadEvents
              .filter((e: any) => e.lead_id === l.lead_id)
              .map((e: any) => ({
                ...e,
                event_start_date: e.event_start_date || e.event_date || '',
                event_end_date: e.event_end_date || e.Event_End_Date || l.Event_End_Date || '',
                event_start_time: e.event_start_time || '',
                event_end_time: e.event_end_time || ''
              }));
          }
          if (evts.length === 0 && l.notes_special_customizations) {
            evts = deserializeLeadEvents(l.notes_special_customizations).events || [];
          }
          let finalStatus = l.current_status || l.status || 'New Lead';
          if (finalStatus === 'Follow-up' || finalStatus === 'Follow-Up') {
            finalStatus = 'Follow Up';
          }
          return { ...l, status: finalStatus, current_status: finalStatus, events: evts };
        });
        setLeads(parsedLeads);
      }
      
      if (dbOrders) {
         setOrders(dbOrders.map((o: any) => ({ ...o, current_stage: o.current_stage || o.order_status })));
      }
      if (dbOperations) setOperations(dbOperations);
      if (dbRawFootage) setRawFootage(dbRawFootage);
      if (dbProduction) setProduction(dbProduction);
      if (dbPayments) setPayments(dbPayments);
      if (dbLogs) setLogs(dbLogs);
      if (dbHandovers) setEquipmentHandovers(dbHandovers);
      if (dbSpecList) setSpecialities(dbSpecList);
      if (dbAssignList) {
        setEditorAssignments(dbAssignList.map((item: any) => ({
          ...item,
          Edited_Drive_Link: item.Edited_Drive_Link || item.edited_drive_link || null,
          edited_drive_link: item.edited_drive_link || item.Edited_Drive_Link || null
        })));
      }
      
      if (dbStaff) {
         setStaff(dbStaff.map((item: any) => {
            let extra: any = {};
            if (item.notes && item.notes.trim().startsWith('{') && item.notes.trim().endsWith('}')) {
              try { extra = JSON.parse(item.notes); } catch (e) {}
            }
            return {
              ...item,
              ...extra,
              staff_id: mapFromDbStaffId(item.staff_id),
              notes: (item.notes && item.notes.trim().startsWith('{') && item.notes.trim().endsWith('}')) ? (extra.notes || '') : item.notes, Skill: Array.isArray(item.Skill) ? item.Skill : (typeof item.Skill === 'string' ? item.Skill.split(',').map(s=>s.trim()).filter(Boolean) : (Array.isArray(extra.Skill) ? extra.Skill : [])), Staff_Type: item.Staff_Type || extra.Staff_Type || 'In-House'
            };
         }));
      }

      if (dbProdStaff) {
         setProductionStaff(dbProdStaff.map(mapProductionStaffFromDb));
      }
      
      if (dbNotifications) {
        setNotifications(dbNotifications.map(mapNotificationFromDb));
      }
      if (dbEquipment) {
        setEquipment(dbEquipment.map((item: any) => ({ ...item, equipment_id: mapFromDbEquipmentId(item.equipment_id), equipment_type: item.Equipment_Category || item.equipment_type || 'Camera', status: item.Equipment_Status || item.status || 'Active' })));
      }
      if (dbLeadPackages) setLeadPackages(dbLeadPackages);
      
      let finalPackagesData = dbPackages || [];
      if (!finalPackagesData || finalPackagesData.length < 10) {
        try {
          const proxyRes = await fetch('/api/db/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'packages' })
          });
          const parsed = await safeParseResponse(proxyRes);
          if (parsed.ok && parsed.isJson) {
            const proxyJson = parsed.data;
            if (proxyJson && proxyJson.success && Array.isArray(proxyJson.data) && proxyJson.data.length > finalPackagesData.length) {
              finalPackagesData = proxyJson.data;
            }
          }
        } catch (e) {
          console.warn('[RoleContext] Proxy fetch packages fallback error:', e);
        }
      }

      // Merge fetched package data with INITIAL_PACKAGES to guarantee all 39 master packages are available
      const mappedDbPkgs = (finalPackagesData && finalPackagesData.length > 0) 
        ? finalPackagesData.map(mapDbRecordToPackage) 
        : [];
      
      const pkgMap = new Map<string, Package>();
      // First populate with all 39 master packages
      (INITIAL_PACKAGES || []).forEach(p => pkgMap.set(String(p.package_id), p));
      // Override with fresh DB values if available
      mappedDbPkgs.forEach(p => pkgMap.set(String(p.package_id), p));

      setPackages(Array.from(pkgMap.values()));
      if (dbCalendarMemos) setCalendarMemos(dbCalendarMemos);
      if (dbStaffAssignments) setStaffAssignments(dbStaffAssignments);
      
      if (dbQuotations) {
        setQuotations(dbQuotations.map((q: any) => {
           let srv = q.services_included;
           if (typeof srv === 'string') {
             try { srv = JSON.parse(srv); } catch(e){}
           }
           if (srv && !Array.isArray(srv) && typeof srv === 'object' && srv.services) {
             srv = srv.services;
           }
           return { ...q, services_included: Array.isArray(srv) ? srv : [] };
        }));
      }
      
      if (dbStatusHistory) setStatusHistory(dbStatusHistory);
      if (dbLeadStaffAssignmentHistory) setLeadStaffAssignmentHistory(dbLeadStaffAssignmentHistory);
      if (dbLeadEquipmentHistory) setLeadEquipmentHistory(dbLeadEquipmentHistory);
      
      updateDiagnosticMetric('read', 'ok');
      updateDiagnosticMetric('connection', 'connected');
    } catch (err: any) {
      console.error('Data fetch error:', err);
      window.alert(`Database Fetch Error: ${err.message}`);
    } finally {
      setIsDataLoading(false);
    }
  };

  // Listen to Supabase Auth state changes to synchronize session and handle on-the-fly profiles
  useEffect(() => {
    if (!supabaseClient) return;

    const syncProfileAndSession = async (session: any) => {
      if (!session || !session.user) {
        return;
      }
      const authUser = session.user;
      const email = authUser.email?.toLowerCase().trim();
      
      // Skip DB fetch if already logged in via login function or currently logging in
      if (isLoggingInRef.current) {
        console.log(`[SYNC SESSION] Skipping fetch for ${email} because login is in progress.`);
        return;
      }
      if (currentUserRef.current && currentUserRef.current.id === mapFromDbUserId(authUser.id)) {
        console.log(`[SYNC SESSION] Skipping fetch for ${email} because user is already set.`);
        return;
      }

      console.log(`[SYNC SESSION] Syncing profile for ${email} / Auth ID: ${authUser.id}`);
      
      // Look up profile in public.users table
      // Let's search by ID first, then by email.
      let dbUser: any = null;
      try {
        const { data: userById } = await supabaseClient
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        
        dbUser = userById;

        if (!dbUser && email) {
          const { data: userByEmail } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();
          
          if (userByEmail) {
            console.log(`[SYNC SESSION] Found user profile by email ${email} with different ID ${userByEmail.id}. Aligning ID to auth ID ${authUser.id}`);
            // Let's update the ID of the user row to match the auth ID
            const { error: updateIdErr } = await supabaseClient
              .from('users')
              .update({ id: authUser.id })
              .eq('email', email);
            
            if (!updateIdErr) {
              dbUser = { ...userByEmail, id: authUser.id };
            } else {
              console.warn(`[SYNC SESSION] Failed to update user ID to auth ID:`, updateIdErr.message);
              dbUser = userByEmail; // fallback to the existing row
            }
          }
        }
      } catch (err: any) {
        console.warn("[SYNC SESSION] Error searching for user profile:", err?.message || err);
      }

      let finalProfileUser: User;

      if (dbUser) {
        // Profile exists! Use it.
        finalProfileUser = mapUserFieldsFromDb(dbUser);
        console.log(`[SYNC SESSION] Loaded profile successfully. Role: ${finalProfileUser.role}`);
      } else {
        // Profile record is missing! Do NOT auto-create it.
        console.warn(`Profile missing for auth user ${email}. Deleting session...`);
        logout();
        return;
      }

      // Check if user is active
      if (!finalProfileUser.active) {
        console.warn(`[SYNC SESSION] User is deactivated. Logging out.`);
        logout();
        return;
      }

      // Update states
      setCurrentUser(finalProfileUser);
      setCurrentRoleState(finalProfileUser.role);
      setCurrentUserNameState(finalProfileUser.name);
      
      // Update local storage
      localStorage.setItem('erp_current_user', JSON.stringify(finalProfileUser));
      localStorage.setItem('erp_role', finalProfileUser.role);
      localStorage.setItem('erp_user_name', finalProfileUser.name);
    };

    // Check initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        syncProfileAndSession(session);
      }
    }).catch(e => {
      console.warn("Supabase getSession failed:", e?.message || String(e));
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log(`[SUPABASE AUTH EVENT]: ${event}`);
      if (session) {
        await syncProfileAndSession(session);
      } else {
        // If they signed out, clear current user
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          localStorage.removeItem('erp_current_user');
          localStorage.removeItem('erp_role');
          localStorage.removeItem('erp_user_name');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Synchronous database fetching and real-time subscription channels
  useEffect(() => {
    fetchFromDb(true);

    if (!supabaseClient) return;

    const channels = [
      { table: 'users', key: 'id', setter: setUsers },
      { table: 'leads', key: 'lead_id', setter: setLeads },
      { table: 'orders', key: 'order_id', setter: setOrders },
      { table: 'operations', key: 'operation_id', setter: setOperations },
      { table: 'raw_footage', key: 'tracking_id', setter: setRawFootage },
      { table: 'production', key: 'production_id', setter: setProduction },
      { table: 'payments', key: 'payment_id', setter: setPayments },
      { table: 'operations_staff', key: 'staff_id', setter: setStaff },
      { table: 'production_staff', key: 'staff_id', setter: setProductionStaff },
      { table: 'activity_logs', key: 'log_id', setter: setLogs },
      { table: 'notifications', key: 'notification_id', setter: setNotifications },
      { table: 'equipment', key: 'equipment_id', setter: setEquipment },
      { table: 'production_specialties', key: 'speciality_id', setter: setSpecialities },
      { table: 'editor_assignments', key: 'assignment_id', setter: setEditorAssignments },
      { table: 'staff_assignments', key: 'assignment_id', setter: setStaffAssignments },
      { table: 'lead_packages', key: 'lead_package_id', setter: setLeadPackages },
      { table: 'quotations', key: 'quotation_id', setter: setQuotations },
      { table: 'lead_status_history', key: 'id', setter: setStatusHistory },
      { table: 'lead_staff_assignment_history', key: 'id', setter: setLeadStaffAssignmentHistory },
      { table: 'lead_equipment_history', key: 'id', setter: setLeadEquipmentHistory },
      { table: 'packages', key: 'package_id', setter: setPackages },
      { table: 'calendar_memos', key: 'id', setter: setCalendarMemos }
    ].map(({ table, key, setter }) => {
      return supabaseClient
        .channel(`rt-${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            updateDiagnosticMetric('realtime', 'ok');
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setter((prev: any[]) => {
                const item = payload.new;
                let mappedItem = table === 'users' ? { ...item, id: mapFromDbUserId(item.id) } : item;
                if (table === 'notifications') mappedItem = mapNotificationFromDb(item);
                if (table === 'leads') {
                  const existingLead = prev.find((l: any) => l.lead_id === mappedItem.lead_id);
                  let finalEvents = existingLead?.events || [];
                  if (finalEvents.length === 0) {
                    finalEvents = deserializeLeadEvents(mappedItem.notes_special_customizations).events || [];
                  }
                  mappedItem = { 
                    ...mappedItem, 
                    status: mappedItem.current_status || mappedItem.status || 'New Lead', 
                    current_status: mappedItem.current_status || mappedItem.status || 'New Lead',
                    events: finalEvents
                  };
                }
                if (table === 'orders') mappedItem = { ...mappedItem, current_stage: mappedItem.current_stage || mappedItem.order_status };
                if (table === 'operations_staff') {
                  let extra: any = {};
                  if (item.notes && item.notes.trim().startsWith('{') && item.notes.trim().endsWith('}')) {
                    try { extra = JSON.parse(item.notes); } catch (e) {}
                  }
                  mappedItem = { ...item, ...extra, staff_id: mapFromDbStaffId(item.staff_id), notes: extra.notes || item.notes };
                }
                if (table === 'production_staff') {
                  mappedItem = mapProductionStaffFromDb(item);
                }
                if (table === 'packages') mappedItem = mapDbRecordToPackage(item);
                if (table === 'equipment') mappedItem = { ...item, equipment_id: mapFromDbEquipmentId(item.equipment_id) };
                
                const exists = prev.some((x: any) => x[key] === mappedItem[key]);
                if (exists) {
                  return prev.map((x: any) => (x[key] === mappedItem[key] ? mappedItem : x));
                } else {
                  if (['leads', 'orders', 'activity_logs', 'notifications'].includes(table)) {
                    return [mappedItem, ...prev];
                  } else {
                    return [...prev, mappedItem];
                  }
                }
              });
            } else if (payload.eventType === 'DELETE') {
              setter((prev: any[]) => {
                const oldItem = payload.old;
                const matchVal = table === 'users' ? mapFromDbUserId(oldItem.id) : oldItem[key];
                return prev.filter(x => x[key] !== matchVal);
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            updateDiagnosticMetric('realtime', 'ok');
          } else {
            updateDiagnosticMetric('realtime', 'fail');
          }
        });
    });

    const leadEventsChannel = supabaseClient.channel('rt-lead_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_events' }, (payload) => {
        updateDiagnosticMetric('realtime', 'ok');
        fetchFromDb(false).catch(e => console.warn('fetchFromDb failed:', e?.message || e));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          updateDiagnosticMetric('realtime', 'ok');
        } else {
          updateDiagnosticMetric('realtime', 'fail');
        }
      });

    // Handle window focus and document visibility to fetch fresh data when user returns to app
    const handleFocusOrVisible = () => {
      console.log("[SYNC] App focused/visible, pulling fresh database records...");
      fetchFromDb(false).catch(e => console.warn('fetchFromDb failed:', e?.message || e));
    };

    window.addEventListener('focus', handleFocusOrVisible);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocusOrVisible();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Background polling fallback every 15 seconds to guarantee absolute synchronization
    const pollingInterval = setInterval(() => {
      fetchFromDb(false).catch(e => console.warn('fetchFromDb polling failed:', e?.message || e));
    }, 15000);

    // Realtime subscriptions handle granular updates. No global sync needed.
    return () => {
      channels.forEach(ch => supabaseClient.removeChannel(ch));
      supabaseClient.removeChannel(leadEventsChannel);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollingInterval);
    };
  }, []);

  const broadcastSyncPing = async () => {
    // No-op: realtime postgres_changes handles granular syncing
  };



  // Handle auto-logout if user is deactivated
  useEffect(() => {
    if (currentUser && (users.length > 0 || staff.length > 0 || productionStaff.length > 0)) {
      let isActive = true; // Default to true if not found yet
      let roleToSync = currentUser.role;
      let nameToSync = currentUser.name;
      let found = false;

      // Check specific staff tables first based on user role to avoid stale override from users table
      if (currentUser.role === 'Production Staff') {
        const prodUser = productionStaff.find(s => 
          s.staff_id === currentUser.id || 
          (s.email && currentUser.email && s.email.toLowerCase() === currentUser.email.toLowerCase()) || 
          (s.mobile && currentUser.mobile && s.mobile === currentUser.mobile)
        );
        if (prodUser) {
          isActive = prodUser.status !== 'Inactive' && prodUser.status !== 'inactive';
          roleToSync = 'Production Staff';
          nameToSync = prodUser.name;
          found = true;
        }
      } else if (currentUser.role === 'Operation Staff') {
        const staffUser = staff.find(s => 
          s.staff_id === currentUser.id || 
          (s.email && currentUser.email && s.email.toLowerCase() === currentUser.email.toLowerCase()) || 
          (s.mobile && currentUser.mobile && s.mobile === currentUser.mobile)
        );
        if (staffUser) {
          isActive = staffUser.status !== 'Inactive' && staffUser.status !== 'inactive';
          roleToSync = 'Operation Staff';
          nameToSync = staffUser.name;
          found = true;
        }
      }

      if (!found) {
        const dbUser = users.find(u => 
          u.id === currentUser.id || 
          (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase()) || 
          (u.mobile && currentUser.mobile && u.mobile === currentUser.mobile)
        );
        if (dbUser) {
          isActive = dbUser.active !== false && dbUser.active !== 'false';
          roleToSync = dbUser.role || currentUser.role;
          nameToSync = dbUser.name || currentUser.name;
          found = true;
        }
      }

      if (found) {
        if (!isActive) {
          logout();
          alert('Your account is no longer active. You have been logged out.');
        } else if (roleToSync !== currentUser.role || nameToSync !== currentUser.name) {
          setCurrentUser({ ...currentUser, role: roleToSync, name: nameToSync });
          setCurrentRoleState(roleToSync);
          setCurrentUserNameState(nameToSync);
        }
      }
    }
  }, [users, staff, productionStaff, currentUser]);

  // Sync username with role switcher for smooth demo
  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
    if (role === 'Business Owner') setCurrentUserNameState('Rupand Das');
    else if (role === 'Sales Team') setCurrentUserNameState('Sarah Jenkins');
    else if (role === 'Operations Team') setCurrentUserNameState('Robert O\'Connor');
    else if (role === 'Production Team') setCurrentUserNameState('Emily Watson');
  };

  const setCurrentUserName = (name: string) => {
    setCurrentUserNameState(name);
  };

  // Login action
  const login = async (emailOrUsername: string, password: string) => {
    isLoggingInRef.current = true;
    try {
      const cleanInput = emailOrUsername.trim();
      let dbUser: any = null;

      if (!cleanInput) {
        return { success: false, error: 'Username or Email is required.' };
      }
      if (!password) {
        return { success: false, error: 'Password is required.' };
      }

      const logAttempt = (status: string, reason: string, userId?: string) => {
        console.log(`[LOGIN ${status}] ${cleanInput} - ${reason}`);
        if (supabaseClient) {
          supabaseClient.from('login_logs').insert({
            username_or_email: cleanInput,
            user_id: userId || null,
            login_status: status,
            failure_reason: reason,
            user_agent: navigator.userAgent
          }).then(({ error }) => {
            if (error) console.warn('Failed to write to login_logs:', error);
          });
        }
      };

      if (!supabaseClient) {
        return { success: false, error: 'Database client is not initialized.' };
      }

      // Step 1: Look up user profile safely without syntax/schema errors
      try {
        if (cleanInput.includes('@')) {
          // Look up by email
          const { data: byEmail, error: emailErr } = await supabaseClient
            .from('users')
            .select('*')
            .ilike('email', cleanInput)
            .limit(1);

          if (!emailErr && byEmail && byEmail.length > 0) {
            dbUser = byEmail[0];
          } else {
            // Check username column in case email was stored in username
            const { data: byUsername } = await supabaseClient
              .from('users')
              .select('*')
              .ilike('username', cleanInput)
              .limit(1);
            if (byUsername && byUsername.length > 0) {
              dbUser = byUsername[0];
            }
          }
        } else {
          // Look up by username
          const { data: byUsername } = await supabaseClient
            .from('users')
            .select('*')
            .ilike('username', cleanInput)
            .limit(1);

          if (byUsername && byUsername.length > 0) {
            dbUser = byUsername[0];
          } else {
            // Look up by mobile
            const { data: byMobile } = await supabaseClient
              .from('users')
              .select('*')
              .eq('mobile', cleanInput)
              .limit(1);
            if (byMobile && byMobile.length > 0) {
              dbUser = byMobile[0];
            }
          }
        }
      } catch (err: any) {
        console.warn('[LOGIN] Error querying users table:', err?.message || err);
      }

      // Fallback: Check in-memory staff list if not found in database directly
      if (!dbUser) {
        let matchingStaff = staff.find(s => 
          (s.email && s.email.toLowerCase() === cleanInput.toLowerCase()) ||
          (s.mobile && s.mobile === cleanInput) ||
          (s.name && (s.name.toLowerCase().replace(/\s+/g, '') + '@photocrew.com' === cleanInput.toLowerCase()))
        );
        let fallbackRole = 'Operation Staff';

        if (!matchingStaff) {
          matchingStaff = productionStaff.find(s => 
            (s.email && s.email.toLowerCase() === cleanInput.toLowerCase()) ||
            (s.mobile && s.mobile === cleanInput) ||
            (s.name && (s.name.toLowerCase().replace(/\s+/g, '') + '@photocrew.com' === cleanInput.toLowerCase()))
          );
          if (matchingStaff) {
            fallbackRole = 'Production Staff';
          }
        }

        if (matchingStaff) {
          const staffEmail = matchingStaff.email || `${matchingStaff.name.toLowerCase().replace(/\s+/g, '')}@photocrew.com`;
          dbUser = {
            id: matchingStaff.staff_id || `STAFF-${Date.now()}`,
            name: matchingStaff.name,
            email: staffEmail,
            username: staffEmail,
            mobile: matchingStaff.mobile || '',
            role: fallbackRole,
            active: matchingStaff.status !== 'Inactive',
            password: password
          };

          // Save to users table so future direct queries find them
          try {
            await supabaseClient.from('users').upsert({
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              username: dbUser.username,
              mobile: dbUser.mobile,
              role: fallbackRole,
              active: dbUser.active,
              password: password,
              created_at: new Date().toISOString()
            }, { onConflict: 'email' });
          } catch (e) {
            console.warn('[LOGIN] Auto-sync fallback to users table warning:', e);
          }
        }
      }

      let authSuccess = false;

      // Direct check against users.password column
      if (dbUser && dbUser.password && dbUser.password === password) {
        authSuccess = true;
      }

      // If direct password check didn't match, try Supabase Auth
      if (!authSuccess) {
        let loginEmail = cleanInput;
        if (dbUser && dbUser.email) {
          loginEmail = dbUser.email;
        } else if (!cleanInput.includes('@')) {
          const { data: userByUsername } = await supabaseClient
            .from('users')
            .select('*')
            .eq('username', cleanInput)
            .maybeSingle();
          if (userByUsername) {
            dbUser = userByUsername;
            loginEmail = userByUsername.email || cleanInput;
            if (userByUsername.password && userByUsername.password === password) {
              authSuccess = true;
            }
          }
        }

        if (!authSuccess) {
          try {
            const { data: authData, error: authErr } = await supabaseClient.auth.signInWithPassword({
              email: loginEmail,
              password: password
            });

            if (!authErr && authData?.session) {
              authSuccess = true;
              if (!dbUser) {
                const { data: profile } = await supabaseClient
                  .from('users')
                  .select('*')
                  .eq('email', loginEmail)
                  .maybeSingle();
                dbUser = profile;
              }
            } else if (!dbUser) {
              logAttempt('Failed', authErr?.message || 'Invalid email/username or password.');
              return { success: false, error: authErr?.message || 'Invalid email/username or password.' };
            }
          } catch (e: any) {
            console.warn("Supabase Auth sign in failed:", e?.message || e);
          }
        }
      }

      if (authSuccess && dbUser && dbUser.password !== password) {
        try {
          await supabaseClient
            .from('users')
            .update({ password: password })
            .eq('email', dbUser.email);
          dbUser.password = password;
        } catch (syncErr) {
          console.warn("[LOGIN] Failed to update password in users table:", syncErr);
        }
      }

      if (!authSuccess || !dbUser) {
        const msg = 'Invalid email/username or password.';
        logAttempt('Failed', msg, dbUser?.id);
        return { success: false, error: msg };
      }

      // Validate active status
      if (!dbUser.active) {
        const msg = 'Your account has been deactivated. Please contact the administrator.';
        logAttempt('Failed', msg, dbUser.id);
        return { success: false, error: msg };
      }

      // Validate role
      if (!dbUser.role) {
        const msg = 'User role is not configured.';
        logAttempt('Failed', msg, dbUser.id);
        return { success: false, error: msg };
      }

      const validRoles = ['Business Owner', 'Sales Team', 'Operations Team', 'Production Team', 'Operation Staff', 'Production Staff'];
      if (!validRoles.includes(dbUser.role)) {
        const msg = 'You do not have permission to access this page.';
        logAttempt('Failed', msg, dbUser.id);
        return { success: false, error: msg };
      }

      // Load credentials & fields
      const foundUser = mapUserFieldsFromDb(dbUser);

      // Successful login
      setCurrentUser(foundUser);
      setCurrentRoleState(foundUser.role);
      setCurrentUserNameState(foundUser.name);

      // Save to local storage
      localStorage.setItem('erp_current_user', JSON.stringify(foundUser));
      localStorage.setItem('erp_role', foundUser.role);
      localStorage.setItem('erp_user_name', foundUser.name);
      localStorage.setItem('erp_session_token', `local_${Date.now()}`);

      // Log login
      const newLog: ActivityLog = {
        log_id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
        user_name: foundUser.name,
        role: foundUser.role,
        action: 'User Logged In Successfully',
        module: 'Session',
        record_id: foundUser.id,
        timestamp: new Date().toISOString(),
      };
      setLogs((prev) => [newLog, ...prev]);
      pushInsert('activity_logs', newLog);

      // Always fetch fresh data from Supabase when user logs in
      try {
        fetchFromDb(true).catch(e => console.warn("[LOGIN] fetchFromDb threw:", e?.message || e));
      } catch (e: any) {
        console.warn("[LOGIN] fetchFromDb threw:", e?.message || e);
      }
      
      logAttempt('Success', 'Login successful.', dbUser.id);
      console.log("[LOGIN] Login successful, returning true");
      return { success: true };

    } finally {
      isLoggingInRef.current = false;
    }
  };

  // Logout action
  const logout = () => {
    if (currentUser) {
      const newLog: ActivityLog = {
        log_id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
        user_name: currentUser.name,
        role: currentUser.role,
        action: 'User Logged Out',
        module: 'Session',
        record_id: currentUser.id,
        timestamp: new Date().toISOString(),
      };
      setLogs((prev) => [newLog, ...prev]);
      pushInsert('activity_logs', newLog);
    }
    setCurrentUser(null);
    setCurrentRoleState('Business Owner');
    setCurrentUserNameState('Rupand Das');
    localStorage.removeItem('erp_current_user');
    localStorage.removeItem('erp_role');
    localStorage.removeItem('erp_user_name');
    if (supabaseClient) {
      supabaseClient.auth.signOut()
        .then(() => {
          console.log("[LOGOUT] Supabase Auth signOut complete.");
        })
        .catch(err => console.warn('Supabase Auth signOut failed:', err));
    }
  };

  // Helper to add activity logs
  const logActivity = (
    action: string, 
    module: string, 
    recordId: string, 
    prevStage?: string, 
    newStage?: string
  ) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    let detailedAction = action;
    if (prevStage || newStage) {
      detailedAction += ` | Previous Stage: ${prevStage || 'N/A'} | New Stage: ${newStage || 'N/A'}`;
    }
    detailedAction += ` | Date: ${dateStr} | Time: ${timeStr}`;

    const newLog: ActivityLog = {
      log_id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      user_name: currentUserName,
      role: currentRole,
      action: detailedAction,
      module,
      record_id: recordId,
      timestamp: now.toISOString(),
      previous_stage: prevStage,
      new_stage: newStage,
      date: dateStr,
      time: timeStr,
    };
    setLogs((prev) => [newLog, ...prev]);

    // Strip out non-database columns before sending to Supabase
    const dbRecord = {
      log_id: newLog.log_id,
      user_name: newLog.user_name,
      role: newLog.role,
      action: newLog.action,
      module: newLog.module,
      record_id: newLog.record_id,
      timestamp: newLog.timestamp,
    };
    pushInsert('activity_logs', dbRecord);
  };

  const resetAllData = () => {
    setUsers(INITIAL_USERS);
    setLeads(INITIAL_LEADS);
    setOrders(INITIAL_ORDERS);
    setOperations(INITIAL_OPERATIONS);
    setRawFootage(INITIAL_RAW_FOOTAGE);
    setProduction(INITIAL_PRODUCTION);
    setPayments(INITIAL_PAYMENTS);
    setLogs(INITIAL_LOGS);
    setCurrentUser(null);
    setCurrentRoleState('Business Owner');
    setCurrentUserNameState('Rupand Das');
    localStorage.removeItem('erp_current_user');

    if (supabaseClient) {
      INITIAL_USERS.forEach(u => pushUpsert('users', { ...u, id: mapToDbUserId(u.id) }));
      INITIAL_LEADS.forEach(l => pushUpsert('leads', l));
      INITIAL_ORDERS.forEach(o => pushUpsert('orders', o));
      INITIAL_OPERATIONS.forEach(op => pushUpsert('operations', op));
      INITIAL_RAW_FOOTAGE.forEach(rf => pushUpsert('raw_footage', rf));
      INITIAL_PRODUCTION.forEach(p => pushUpsert('production', p));
      INITIAL_PAYMENTS.forEach(pay => pushUpsert('payments', pay));
      INITIAL_LOGS.forEach(log => pushUpsert('activity_logs', log));
    }

    logActivity('Reset Database to Pre-seeded State', 'System', 'ALL');
  };

  const refreshData = () => {
    fetchFromDb();
    logActivity('Refreshed Workspace Data', 'System', 'ALL');
  };

  // 1. Create Lead
  const addLead = async (
    leadDetails: Omit<Lead, 'lead_id' | 'status' | 'created_by' | 'sales_person' | 'created_date'>,
    packages?: Omit<LeadPackage, 'lead_package_id' | 'lead_id'>[]
  ) => {
    // Verify logged-in user is authenticated
    if (supabaseClient) {
      const { data: sessionData, error: sessionErr } = await supabaseClient.auth.getSession();
      const { data: userData, error: userErr } = await supabaseClient.auth.getUser();

      const session = sessionData?.session;
      const authUser = userData?.user;

      console.log('SESSION', session);
      console.log('USER', authUser);

      if (sessionErr || userErr) {
        console.warn("[addLead] Session or user check failed:", sessionErr || userErr);
      }

      // If BOTH session and authUser are null AND we don't have a currentUser in React state
      if (!session && !authUser && !currentUser) {
        throw new Error("Please login again.");
      }

      // Check if session is expired
      const isExpired = session?.expires_at ? (session.expires_at <= Math.floor(Date.now() / 1000)) : false;
      if (isExpired && !authUser) {
        throw new Error("Session expired.");
      }

      // Users Table Lookup
      const currentUid = authUser?.id || session?.user?.id || currentUser?.id;
      const emailFromAuth = authUser?.email || session?.user?.email || currentUser?.email;

      let dbUser: any = null;
      if (currentUid) {
        const { data: userById, error: dbUserErr } = await supabaseClient
          .from('users')
          .select('*')
          .eq('id', currentUid)
          .maybeSingle();
        
        dbUser = userById;
        if (dbUserErr) {
          console.warn("[addLead] Users table lookup failed:", dbUserErr.message);
        }
      }

      if (!dbUser && emailFromAuth) {
        const { data: dbUserByEmail } = await supabaseClient
          .from('users')
          .select('*')
          .eq('email', emailFromAuth.toLowerCase().trim())
          .maybeSingle();
        
        if (dbUserByEmail && currentUid) {
          await supabaseClient.from('users').update({ id: currentUid }).eq('email', emailFromAuth.toLowerCase().trim());
          dbUser = { ...dbUserByEmail, id: currentUid };
        } else if (dbUserByEmail) {
          dbUser = dbUserByEmail;
        }
      }

      let finalUser = currentUser;
      if (dbUser) {
        finalUser = mapUserFieldsFromDb(dbUser);
      }

      if (!finalUser) {
        throw new Error("User record missing from users table.");
      }

      if (emailFromAuth && finalUser.email && finalUser.email.toLowerCase().trim() !== emailFromAuth.toLowerCase().trim()) {
        throw new Error("User record email does not match logged-in account.");
      }

      if (!finalUser.role) {
        throw new Error("User role not loaded correctly.");
      }

      if (!finalUser.active) {
        throw new Error("User account is deactivated.");
      }

      if (finalUser.role !== 'Sales Team' && finalUser.role !== 'Business Owner') {
        throw new Error("User does not have permission to create quotations.");
      }
    } else {
      if (!currentUser) {
        throw new Error("Please login again.");
      }
      if (currentUser.role !== 'Sales Team' && currentUser.role !== 'Business Owner') {
        throw new Error("User does not have permission to create quotations.");
      }
    }

    let nextLeadNum = 101;
    const existingLeadIds = new Set<string>();
    if (leads) {
      leads.forEach(ld => {
        if (ld.lead_id) existingLeadIds.add(ld.lead_id);
      });
    }

    if (supabaseClient) {
      try {
        const { data: dbLeads } = await supabaseClient.from('leads').select('lead_id');
        if (dbLeads) {
          dbLeads.forEach((ld: any) => {
            if (ld.lead_id) existingLeadIds.add(ld.lead_id);
          });
        }
      } catch (e) {
        console.warn("Error fetching lead_ids from DB for unique ID generation:", e);
      }
    }

    let maxLeadNum = 100;
    existingLeadIds.forEach(id => {
      const match = id.match(/^LD(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxLeadNum) {
          maxLeadNum = num;
        }
      }
    });
    nextLeadNum = maxLeadNum + 1;

    while (existingLeadIds.has(`LD${nextLeadNum}`)) {
      nextLeadNum++;
    }
    const leadId = `LD${nextLeadNum}`;
    // We still keep notes_special_customizations plain without serialized events, 
    // or we can keep it as is for backward compatibility but save events to table anyway
    const serializedNotes = leadDetails.notes_special_customizations || '';
    const newLead: Lead = {
      ...leadDetails,
      email: leadDetails.email || '',
      lead_id: leadId,
      created_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
      sales_person: currentUserName,
      sales_staff_id: currentUser?.id || '',
      status: (leadDetails as any).status || 'Create Quote',
      created_by: currentUserName,
      total_pax: leadDetails.total_pax !== undefined ? Number(leadDetails.total_pax) : 0,
      reference_source: leadDetails.reference_source || '',
      notes_special_customizations: serializedNotes
    };
    
    // Strip events property to prevent DB schema errors
    delete (newLead as any).events;
    
    console.log('Lead Payload', newLead);
    const res = await pushInsert('leads', newLead);
    console.log('Lead Insert Result', res?.success ? 'success' : 'fail');
    console.log('Lead Insert Error', res?.error || null);
    
    if (!res?.success) {
      throw new Error(res?.error || "Failed to save lead in database.");
    }

    if (leadDetails.events && leadDetails.events.length > 0) {
      for (const ev of leadDetails.events) {
        const { id, ...eventWithoutId } = ev;
        const newEventRecord = {
          lead_id: leadId,
          event_type: ev.event_type || '',
          event_name: ev.event_name || '',
          event_shoot_type: ev.event_shoot_type || '',
          event_date: ev.event_date || '',
          event_start_time: ev.event_start_time || '',
          event_end_time: ev.event_end_time || '',
          event_location: ev.event_location || '',
          google_maps_link: ev.google_maps_link || '',
          guest_pax: String(ev.guest_pax) !== '' && ev.guest_pax != null ? Number(ev.guest_pax) : null,
          staff_pax: String(ev.staff_pax) !== '' && ev.staff_pax != null ? Number(ev.staff_pax) : null,
          assigned_staff_names: ev.assigned_staff_names || '',
          assigned_staff_mobiles: ev.assigned_staff_mobiles || ''
        };
        const evRes = await pushInsert('lead_events', newEventRecord);
        if (!evRes?.success) {
          throw new Error(`Failed to save event to lead_events table: ${evRes?.error || "Unknown error"}`);
        }
      }
    }

    if (packages && packages.length > 0) {
      const formattedPackages: LeadPackage[] = packages.map((pkg, index) => ({
        ...pkg,
        lead_package_id: `LP-${leadId}-${index}-${Math.floor(100 + Math.random() * 900)}`,
        lead_id: leadId,
        created_at: new Date().toISOString()
      }));
      for (const p of formattedPackages) {
        await pushInsert('lead_packages', p);
      }
    }

    //  // Disabled to prevent full reload

    addNotification({
      user_id: 'All',
      project_id: leadId,
      task_id: 'New Lead Inflow',
      notification_type: 'New Lead Created',
      title: '🆕 New Lead Created',
      message: `A new Lead (${leadId}) has been created for ${newLead.customer_name}. Reference Source: ${newLead.reference_source || 'Direct'}.`,
      recipient_role: 'Business Owner'
    });

    logActivity(`Created Lead: ${newLead.customer_name}`, 'Sales', leadId, 'N/A', 'New Lead');
    return leadId;
  };

    const saveLeadPackages = async (
    leadId: string,
    packagesSelected: Omit<LeadPackage, 'lead_package_id' | 'lead_id'>[]
  ) => {
    const existing = leadPackages.filter(lp => lp.lead_id === leadId);
    const targetLead = leads.find(l => l.lead_id === leadId);
    const leadEventsList = targetLead?.events || [];

    if (packagesSelected && packagesSelected.length > 0) {
      const newPkgIds = new Set(packagesSelected.map(p => p.package_id));

      for (const ex of existing) {
        if (!newPkgIds.has(ex.package_id)) {
          await pushDelete('lead_packages', 'lead_package_id', ex.lead_package_id);
        }
      }

      for (const [index, pkg] of packagesSelected.entries()) {
        const existingPkg = existing.find(ex => ex.package_id === pkg.package_id);
        
        const edInclusions = pkg.editable_inclusions || (existingPkg ? existingPkg.editable_inclusions : undefined);
        const edDeliverables = pkg.editable_deliverables || (existingPkg ? existingPkg.editable_deliverables : undefined);

        let teamMembersJson = pkg.Team_Members_Included || (existingPkg ? existingPkg.Team_Members_Included : null);
        let deliverablesJson = pkg.deliverables_descriptionn || (existingPkg ? existingPkg.deliverables_descriptionn : null);

        if (!teamMembersJson && edInclusions) {
          teamMembersJson = (leadEventsList && leadEventsList.length > 0)
            ? leadEventsList.map(event => {
                const eventKey = `${pkg.package_id}_${event.id}`;
                const list = edInclusions[eventKey] !== undefined ? edInclusions[eventKey] : (edInclusions[pkg.package_id] || []);
                return {
                  event_name: event.event_name || event.event_type || 'Unnamed Event',
                  team_members: list.filter(Boolean)
                };
              })
            : [
                {
                  event_name: "General",
                  team_members: (edInclusions[pkg.package_id] || []).filter(Boolean)
                }
              ];
        }

        if (!deliverablesJson && edDeliverables) {
          deliverablesJson = (leadEventsList && leadEventsList.length > 0)
            ? leadEventsList.map(event => {
                return {
                  event_name: event.event_name || event.event_type || 'Unnamed Event',
                  deliverables: (edDeliverables[pkg.package_id] || []).filter(Boolean)
                };
              })
            : [
                {
                  event_name: "General",
                  deliverables: (edDeliverables[pkg.package_id] || []).filter(Boolean)
                }
              ];
        }

        const updatedPkgData = {
          ...pkg,
          ...(teamMembersJson ? { Team_Members_Included: teamMembersJson } : {}),
          ...(deliverablesJson ? { deliverables_descriptionn: deliverablesJson } : {})
        };

        if (existingPkg) {
          await pushUpdate('lead_packages', 'lead_package_id', existingPkg.lead_package_id, {
            ...updatedPkgData
          });
        } else {
          await pushInsert('lead_packages', {
            ...updatedPkgData,
            lead_package_id: `LP-${leadId}-${pkg.package_id}`,
            lead_id: leadId,
            created_at: new Date().toISOString()
          } as LeadPackage);
        }
      }
    } else {
      await pushDelete('lead_packages', 'lead_id', leadId);
    }
  };

  // 2. Lead Follow-Up (Screen 3)
  const updateLeadFollowUp = async (
    leadId: string, 
    status: CurrentStage, 
    callNotes: string, 
    nextFollowUpDate: string, 
    quotationAmount?: number, 
    negotiationNotes?: string
  ) => {
    if (!leadId || typeof leadId !== 'string' || leadId.trim() === '') {
      throw new Error('lead_id is missing or invalid.');
    }

    const targetLead = leads.find((ld) => ld.lead_id === leadId);
    if (supabaseClient) {
      const { data: dbLead, error: dbLeadErr } = await supabaseClient.from('leads').select('lead_id').eq('lead_id', leadId).maybeSingle();
      if (dbLeadErr) {
        throw new Error(`Failed to check if lead exists in 'leads' table. Supabase Error: ${dbLeadErr.message}`);
      }
      if (!dbLead) {
        throw new Error(`Lead record with ID "${leadId}" was not found in the "leads" table.`);
      }
    } else if (!targetLead) {
      throw new Error(`Lead record with ID "${leadId}" was not found in local cache.`);
    }

    const previousStage = targetLead ? (targetLead.current_status || targetLead.status || 'New Lead') : 'New Lead';
    const timestamp = new Date().toISOString();

    // Normalize different spellings of Follow Up to prevent fragmented sources of truth
    const normalizedStatus = (status as string === 'Follow-up' || status as string === 'Follow-Up' || status === 'Follow Up') ? 'Follow Up' : status;

    const updatesPayload: any = {
      status: normalizedStatus,
      current_status: normalizedStatus,
      budget: quotationAmount !== undefined ? quotationAmount : targetLead?.budget,
      remarks: `${targetLead?.remarks || ''}\n[Update ${timestamp.split('T')[0]}]: ${callNotes}. ${negotiationNotes ? 'Neg Notes: ' + negotiationNotes : ''}. Next follow-up: ${nextFollowUpDate}`,
      updated_by: currentUserName,
      updated_at: timestamp
    };
    
    updatesPayload.follow_up_notes = callNotes || null;
    updatesPayload.next_follow_up_date = nextFollowUpDate || null;
    
    // Extract time tag if present in callNotes
    const timeMatch = (callNotes || '').match(/\[Time:\s*([0-9]{1,2}:[0-9]{2}(?:\s*[AP]M)?)\]/i);
    if (timeMatch) {
      updatesPayload.next_follow_up_time = timeMatch[1].trim();
    }
    
    if (normalizedStatus === 'Lost Lead') {
      updatesPayload["Lost_Reason"] = callNotes; // Lost Reason is usually passed via callNotes or negotiationNotes
      updatesPayload["Lost_Notes"] = negotiationNotes || callNotes;
    }

    const res = await pushUpdate('leads', 'lead_id', leadId, updatesPayload);

    if (!res?.success) {
      throw new Error(res?.error || "Failed to save follow-up details in database.");
    }

    if (normalizedStatus !== previousStage) {
      const linkedOrder = orders.find(o => o.lead_id === leadId);
      const orderId = linkedOrder?.order_id || null;

      if (normalizedStatus === 'Order Confirmed' && !orderId) {
        throw new Error(`"order_id" is required for "Order Confirmed" status, but it was not found or is missing.`);
      }
      
      const roleParts = (currentUserName && currentUserName.includes('|')) 
        ? currentUserName.split('|') 
        : [currentUserName || 'System', currentRole || 'System'];
      const changedBy = roleParts[0];
      const changedByRole = roleParts[1] || currentRole || 'System';

      const newHist = {
        lead_id: leadId,
        order_id: orderId,
        old_status: previousStage,
        new_status: normalizedStatus,
        changed_by: changedBy,
        changed_by_role: changedByRole,
        remarks: callNotes || 'Status updated from CRM follow-up panel',
        created_at: timestamp
      };

      const resHist = await pushInsert('lead_status_history', newHist);
      if (!resHist?.success) {
        throw new Error(`"lead_status_history" insert failed. Error: ${resHist?.error || "Unknown error"}`);
      }
      setStatusHistory(prev => [...prev, newHist]);
    }

    setLeads((prev) => 
      prev.map((ld) => {
        if (ld.lead_id === leadId) {
          return {
            ...ld,
            status: normalizedStatus,
            current_status: normalizedStatus,
            budget: quotationAmount !== undefined ? quotationAmount : ld.budget,
            remarks: `${ld.remarks || ''}\n[Update ${timestamp.split('T')[0]}]: ${callNotes}. ${negotiationNotes ? 'Neg Notes: ' + negotiationNotes : ''}. Next follow-up: ${nextFollowUpDate}`,
            follow_up_notes: callNotes || undefined,
            next_follow_up_date: nextFollowUpDate || undefined,
            updated_by: currentUserName,
            updated_at: timestamp
          };
        }
        return ld;
      })
    );

    
    logActivity(`Updated Lead Follow-up, stage: ${status}`, 'Sales', leadId, previousStage, status);
  };

  // 3. Confirm Order (Action button)
  const confirmOrder = async (
    leadId: string, 
    packageName: string, 
    quotationAmount: number, 
    advanceReceived: number,
    eventDate?: string,
    eventTime?: string,
    paymentMode?: string,
    notes?: string,
    reportingTime?: string,
    transactionId?: string
  ) => {
    if (!leadId || typeof leadId !== 'string' || leadId.trim() === '') {
      throw new Error('lead_id is missing or invalid.');
    }

    const targetLead = leads.find((ld) => ld.lead_id === leadId);
    if (supabaseClient) {
      const { data: dbLead, error: dbLeadErr } = await supabaseClient.from('leads').select('lead_id').eq('lead_id', leadId).maybeSingle();
      if (dbLeadErr) {
        throw new Error(`Failed to check if lead exists in 'leads' table. Supabase Error: ${dbLeadErr.message}`);
      }
      if (!dbLead) {
        throw new Error(`Lead record with ID "${leadId}" was not found in the "leads" table.`);
      }
    } else if (!targetLead) {
      throw new Error(`Lead record with ID "${leadId}" was not found in local cache.`);
    }

    const resolvedRemarks = `${targetLead.remarks || ''}\n[Booking Confirmed Update ${new Date().toISOString().split('T')[0]}]: ${notes || 'No extra notes'}. Payment Mode: ${paymentMode || 'N/A'}`;
    const timestamp = new Date().toISOString();

    const resLead = await pushUpdate('leads', 'lead_id', leadId, { 
      status: 'Order Confirmed', 
      current_status: 'Order Confirmed', 
      booking_status: 'Confirmed',
      quotation_locked: true,
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: new Date().toLocaleTimeString(),
      package_name: packageName,
      final_package_amount: quotationAmount,
      advance_collected: advanceReceived,
      payment_mode: paymentMode || 'N/A',
      transaction_id: transactionId || 'N/A',
      contract_notes: notes || 'No extra notes',
      event_date: eventDate || targetLead.event_date,
      event_time: eventTime || targetLead.event_time,
      reporting_time: reportingTime || targetLead.reporting_time,
      remarks: resolvedRemarks,
      updated_by: currentUserName, 
      updated_at: timestamp
    });

    if (!resLead?.success) {
      throw new Error(resLead?.error || "Failed to update lead during order confirmation.");
    }

    // Step 3: Check Supabase directly for existing order
    let masterOrderId = '';
    let existingOrder = augmentedOrders.find(o => o.lead_id === leadId);
    let orderExistsInDb = false;

    if (supabaseClient) {
      const { data: dbOrder, error } = await supabaseClient.from('orders').select('*').eq('lead_id', leadId).maybeSingle();
      if (dbOrder) {
        masterOrderId = dbOrder.order_id;
        orderExistsInDb = true;
      }
    }

    if (!masterOrderId) {
      if (existingOrder && existingOrder.order_id) {
        masterOrderId = existingOrder.order_id;
      } else {
        // Generate a new Order ID starting with OR101
        let nextOrderNum = 101;
        const existingOrderIds = new Set<string>();
        orders.forEach(o => { if (o.order_id) existingOrderIds.add(o.order_id); });
        augmentedOrders.forEach(o => { if (o.order_id) existingOrderIds.add(o.order_id); });

        if (supabaseClient) {
          try {
            const { data: dbOrders } = await supabaseClient.from('orders').select('order_id');
            if (dbOrders) {
              dbOrders.forEach((o: any) => { if (o.order_id) existingOrderIds.add(o.order_id); });
            }
          } catch (e) {
            console.warn("Error fetching order_ids from DB for unique ID generation:", e);
          }
        }

        let maxOrderNum = 100;
        existingOrderIds.forEach(id => {
          const match = id.match(/^OR(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxOrderNum) {
              maxOrderNum = num;
            }
          }
        });
        nextOrderNum = maxOrderNum + 1;

        while (existingOrderIds.has(`OR${nextOrderNum}`)) {
          nextOrderNum++;
        }
        masterOrderId = `OR${nextOrderNum}`;
      }
    }

    if (!masterOrderId) {
      throw new Error(`"order_id" could not be generated or found for Order Confirmation.`);
    }
    
    if (orderExistsInDb) {
      const rOrd = await pushUpdate('orders', 'order_id', masterOrderId, {
        customer_name: targetLead.customer_name,
        mobile: targetLead.mobile,
        event_type: targetLead.event_type,
        custom_event_name: targetLead.custom_event_name || '',
        custom_event_type: targetLead.custom_event_type || '',
        event_date: eventDate || targetLead.event_date || undefined,
        event_time: eventTime || targetLead.event_time || undefined,
        reporting_time: reportingTime || targetLead.reporting_time || undefined,
        event_location: targetLead.event_location,
        package_name: packageName,
        quotation_amount: quotationAmount,
        advance_received: advanceReceived,
        balance_amount: quotationAmount - advanceReceived,
        order_status: 'Confirmed',
        current_stage: 'Order Confirmed',
        sales_person: currentUserName,
        updated_by: currentUserName,
        updated_at: timestamp,
        client_residence_address: targetLead.client_residence_address || '',
        city: targetLead.city || '',
        state: targetLead.state || '',
        pincode: targetLead.pincode || '',
        desired_event_shoot_type: targetLead.desired_event_shoot_type || '',
        package_price: quotationAmount,
        deliverables_description: targetLead.deliverables_description || '',
        notes_special_customizations: targetLead.notes_special_customizations || '',
        quotation_discount: targetLead.quotation_discount || 0,
        additional_services_cost: targetLead.additional_services_cost || 0,
      });
      if (!rOrd?.success) throw new Error("Failed to update existing order: " + rOrd?.error);
    } else {
      const newOrder: Order = {
        order_id: masterOrderId,
        lead_id: leadId,
        customer_name: targetLead.customer_name,
        mobile: targetLead.mobile,
        event_type: targetLead.event_type,
        custom_event_name: targetLead.custom_event_name || '',
        custom_event_type: targetLead.custom_event_type || '',
        shoot_type: targetLead.shoot_type || '',
        event_date: eventDate || targetLead.event_date || undefined,
        event_time: eventTime || targetLead.event_time || undefined,
        reporting_time: reportingTime || targetLead.reporting_time || undefined,
        event_location: targetLead.event_location,
        package_name: packageName,
        quotation_amount: quotationAmount,
        advance_received: advanceReceived,
        balance_amount: quotationAmount - advanceReceived,
        order_status: 'Confirmed',
        current_stage: 'Order Confirmed',
        sales_person: currentUserName,
        created_at: timestamp,
        updated_by: currentUserName,
        updated_at: timestamp,
        whatsapp_number: targetLead.whatsapp_number || undefined,
        address: targetLead.address || '',
        city: targetLead.city || '',
        state: targetLead.state || '',
        pincode: targetLead.pincode || '',
        client_residence_address: targetLead.client_residence_address || '',
        desired_event_shoot_type: targetLead.desired_event_shoot_type || '',
        package_price: quotationAmount,
        deliverables_description: targetLead.deliverables_description || '',
        notes_special_customizations: targetLead.notes_special_customizations || '',
        quotation_discount: targetLead.quotation_discount || 0,
        additional_services_cost: targetLead.additional_services_cost || 0,
      };
      const rOrd = await pushInsert('orders', newOrder);
      if (!rOrd?.success) throw new Error("Failed to insert Order: " + rOrd?.error);
    }

    // Payments
    let paymentExistsInDb = false;
    let existingPaymentId = payments.find(p => p.order_id === masterOrderId)?.payment_id;

    if (supabaseClient) {
      const { data: dbPayment } = await supabaseClient.from('payments').select('payment_id').eq('order_id', masterOrderId).maybeSingle();
      if (dbPayment) {
        existingPaymentId = dbPayment.payment_id;
        paymentExistsInDb = true;
      }
    }

    if (!paymentExistsInDb) {
      const paymentId = existingPaymentId || `PAY-${Math.floor(3012 + Math.random() * 800)}`;
      const newPayment: Payment = {
        payment_id: paymentId,
        order_id: masterOrderId,
        quotation_amount: quotationAmount,
        advance_received: advanceReceived,
        balance_due: quotationAmount - advanceReceived,
        final_payment_received: 0,
        payment_proof_url: undefined,
        payment_status: advanceReceived >= quotationAmount ? 'Fully Paid' : (advanceReceived > 0 ? 'Partially Paid' : 'Pending'),
        transaction_id: transactionId || undefined,
      };
      const rPay = await pushInsert('payments', newPayment);
      if (!rPay?.success) throw new Error("Failed to insert Payment: " + rPay?.error);
    } else if (existingPaymentId) {
      const rPay = await pushUpdate('payments', 'payment_id', existingPaymentId, {
        quotation_amount: quotationAmount,
        advance_received: advanceReceived,
        balance_due: quotationAmount - advanceReceived,
        payment_status: advanceReceived >= quotationAmount ? 'Fully Paid' : (advanceReceived > 0 ? 'Partially Paid' : 'Pending'),
        transaction_id: transactionId || undefined,
      });
      if (!rPay?.success) throw new Error("Failed to update Payment: " + rPay?.error);
    }

    // Operations
    let opExistsInDb = false;
    let existingOpId = operations.find(o => o.order_id === masterOrderId)?.operation_id;

    if (supabaseClient) {
      const { data: dbOp } = await supabaseClient.from('operations').select('operation_id').eq('order_id', masterOrderId).maybeSingle();
      if (dbOp) {
        existingOpId = dbOp.operation_id;
        opExistsInDb = true;
      }
    }

    if (!opExistsInDb) {
      const newOp: Operation = {
        operation_id: existingOpId || `OP-${Math.floor(5012 + Math.random() * 800)}`,
        order_id: masterOrderId,
        photographer_assigned: 'Unassigned',
        videographer_assigned: 'Unassigned',
        drone_operator_assigned: 'Unassigned',
        assistant_assigned: 'Unassigned',
        equipment_kit: '',
        reporting_time: reportingTime || '08:00',
        event_status: 'Operations Assigned',
        remarks: notes || '',
        updated_by: currentUserName,
      };
      const rOp = await pushInsert('operations', newOp);
      if (!rOp?.success) throw new Error("Failed to insert Operations: " + rOp?.error);
    } else if (existingOpId) {
      const rOp = await pushUpdate('operations', 'operation_id', existingOpId, {
        reporting_time: reportingTime || '08:00',
        remarks: notes || '',
        updated_by: currentUserName,
      });
      if (!rOp?.success) throw new Error("Failed to update Operations: " + rOp?.error);
    }

    // Insert into lead_status_history
    const oldStatus = targetLead.current_status || targetLead.status || 'New Lead';
    if ('Order Confirmed' !== oldStatus) {
      const roleParts = (currentUserName && currentUserName.includes('|')) 
        ? currentUserName.split('|') 
        : [currentUserName || 'System', currentRole || 'System'];
      const changedBy = roleParts[0];
      const changedByRole = roleParts[1] || currentRole || 'System';

      const newHist = {
        lead_id: leadId,
        order_id: masterOrderId,
        old_status: oldStatus,
        new_status: 'Order Confirmed',
        changed_by: changedBy,
        changed_by_role: changedByRole,
        remarks: notes || 'Order Confirmed & transitioned to Operations',
        created_at: timestamp
      };

      const resHist = await pushInsert('lead_status_history', newHist);
      if (!resHist?.success) {
        throw new Error(`"lead_status_history" insert failed. Error: ${resHist?.error || "Unknown error"}`);
      }
      setStatusHistory(prev => [...prev, newHist]);
    }

    addNotification({
      user_id: 'All',
      project_id: masterOrderId,
      task_id: 'Operations Allocation',
      notification_type: 'New Lead Assigned',
      title: 'New Order Received from Sales',
      message: `A new order (${masterOrderId}) has been confirmed for ${targetLead.customer_name}. Package: ${packageName}. Please assign crew and schedule the event!`,
      recipient_role: 'Operations Team'
    });

    setLeads((prev) => 
      prev.map((ld) => {
        if (ld.lead_id === leadId) {
          return {
            ...ld,
            status: 'Order Confirmed',
            current_status: 'Order Confirmed',
            quotation_locked: true,
            event_date: eventDate || ld.event_date,
            event_time: eventTime || ld.event_time,
            reporting_time: reportingTime || ld.reporting_time,
            remarks: resolvedRemarks,
            updated_by: currentUserName,
            updated_at: timestamp
          };
        }
        return ld;
      })
    );

    

    logActivity(`Confirmed Order for ${targetLead.customer_name}. Package: ${packageName}`, 'Sales', masterOrderId, targetLead.status, 'Order Confirmed');

    return masterOrderId;
  };

  // 4. Assign Operations
  const assignOperations = async (
    orderId: string, 
    opData: {
      photographer_assigned: string;
      videographer_assigned: string;
      drone_operator_assigned: string;
      assistant_assigned: string;
      equipment_kit: string;
      reporting_time: string;
      remarks?: string;
      current_stage?: CurrentStage;
      event_date?: string;
      event_time?: string;
      event_status?: string;
    }
  ) => {
    const targetOrder = augmentedOrders.find((o) => o.order_id === orderId);
    if (!targetOrder) throw new Error("Order not found");

    const existingOp = operations.find(o => o.order_id === orderId);
    const opId = existingOp?.operation_id || `OP-${Math.floor(5012 + Math.random() * 800)}`;
    const { current_stage, event_date, event_time, event_status, ...restOpData } = opData;
    
    // Default or specified status / stage
    const targetStatus = event_status || 'Event Scheduled';
    const targetStageNum: CurrentStage = current_stage || 'Event Scheduled';

    // Step 2 & 4: Only allow exact workflow statuses, throw custom error on spelling variations
    const allowedWorkflowStatuses = [
      'Order Confirmed',
      'Operations Assigned',
      'Assigned Crew',
      'Staff Assigned',
      'Event Scheduled',
      'Event Started',
      'Event Completed',
      'Event Ended',
      'Footage Handover',
      'Verified Footage',
      'Footage Handover Verified',
      'Event Cancelled',
      'Raw Footage Received',
      'Assigned',
      'Completed'
    ];
    if (!allowedWorkflowStatuses.includes(targetStatus)) {
      throw new Error(`Invalid event status being sent to database.`);
    }

    // Map event_status to match DB constraint: CHECK (event_status IN ('Assigned', 'Completed'))
    let dbEventStatus = 'Assigned';
    if (
      targetStatus === 'Completed' || 
      targetStatus === 'Event Completed' || 
      targetStatus === 'Event Ended' ||
      targetStatus === 'Footage Handover' ||
      targetStatus === 'Verified Footage' ||
      targetStatus === 'Footage Handover Verified' ||
      targetStatus === 'Raw Footage Received'
    ) {
      dbEventStatus = 'Completed';
    } else {
      dbEventStatus = 'Assigned';
    }

    const newOp: Operation = {
      operation_id: opId,
      order_id: orderId,
      ...restOpData,
      event_status: dbEventStatus,
      updated_by: currentUserName,
    };

    const previousStage = targetOrder ? targetOrder.current_stage : 'Order Confirmed';
    const timestamp = new Date().toISOString();

    const resOrd = await pushUpdate('orders', 'order_id', orderId, { 
      current_stage: targetStageNum,
      event_date: event_date || (targetOrder ? targetOrder.event_date : undefined),
      event_time: event_time || (targetOrder ? targetOrder.event_time : undefined),
      updated_by: currentUserName,
      updated_at: timestamp
    });

    if (!resOrd?.success) {
      throw new Error(resOrd?.error || "Failed to update order status.");
    }

    if (targetOrder) {
      const resLead = await pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
        status: targetStageNum,
        current_status: targetStageNum,
        event_date: event_date || targetOrder.event_date,
        event_time: event_time || targetOrder.event_time,
        assigned_staff: (opData as any).assigned_staff,
        assigned_roles: (opData as any).assigned_roles,
        assigned_equipment: opData.equipment_kit,
        reporting_time: opData.reporting_time,
        updated_by: currentUserName,
        updated_at: timestamp
      });
      if (!resLead?.success) {
        throw new Error(resLead?.error || "Failed to update lead status.");
      }
    }

    if (existingOp) {
      const resOp = await pushUpdate('operations', 'operation_id', existingOp.operation_id, {
        ...restOpData,
        event_status: dbEventStatus,
        updated_by: currentUserName,
      });
      if (!resOp?.success) throw new Error(resOp?.error || "Failed to update operations.");
    } else {
      const resOp = await pushInsert('operations', newOp);
      if (!resOp?.success) throw new Error(resOp?.error || "Failed to insert operations.");
    }

    // Insert into lead_status_history if stage changed
    if (previousStage !== targetStageNum && targetOrder?.lead_id) {
      const roleParts = (currentUserName && currentUserName.includes('|')) 
        ? currentUserName.split('|') 
        : [currentUserName || 'System', currentRole || 'System'];
      const changedBy = roleParts[0];
      const changedByRole = roleParts[1] || currentRole || 'System';

      const newHist = {
        lead_id: targetOrder.lead_id,
        order_id: orderId,
        old_status: previousStage,
        new_status: targetStageNum,
        changed_by: changedBy,
        changed_by_role: changedByRole,
        remarks: opData.remarks || `Status updated to ${targetStageNum}`,
        created_at: timestamp
      };

      await pushInsert('lead_status_history', newHist).catch(err => console.warn("Failed to insert lead status history:", err?.message || err));
      setStatusHistory(prev => [...prev, newHist]);
    }

    //  // Disabled to prevent full reload

    const customerName = targetOrder ? targetOrder.customer_name : 'Customer';
    const eventName = targetOrder ? (targetOrder.event_type || targetOrder.package_name || 'Event') : 'Wedding';
    const formattedDate = event_date || (targetOrder ? targetOrder.event_date : '');

    addNotification({
      user_id: 'All',
      project_id: orderId,
      task_id: 'Operations Assignment',
      notification_type: 'Event Scheduled',
      title: '📅 Event Scheduled',
      message: `${eventName} Event has been scheduled. Customer: ${customerName}. Event: ${eventName}. Date: ${formattedDate}.`,
      recipient_role: 'Sales Team'
    });

    addNotification({
      user_id: 'All',
      project_id: orderId,
      task_id: 'Operations Assignment',
      notification_type: 'Event Scheduled',
      title: '📅 Event Scheduled',
      message: `${eventName} Event has been scheduled. Customer: ${customerName}. Event: ${eventName}. Date: ${formattedDate}.`,
      recipient_role: 'Business Owner'
    });

    logActivity(`Assigned Crew for Order: ${orderId} (Status: ${targetStatus})`, 'Operations', opId, previousStage, targetStageNum);
  };

  const saveStaffAssignments = async (
    orderId: string,
    assignments: {
      staff_role: string;
      staff_id: string;
      staff_name: string;
    }[]
  ) => {
    if (!orderId) {
      throw new Error("Missing Required Field: order_id is null or empty.");
    }

    const targetOrder = augmentedOrders.find((o) => o.order_id === orderId);
    if (!targetOrder) {
      throw new Error(`Missing Order Record: Order ${orderId} not found locally.`);
    }

    const leadId = targetOrder.lead_id;
    if (!leadId) {
      throw new Error(`Missing Required Field: lead_id is null for Order ${orderId}.`);
    }

    const targetLead = leads.find(l => l.lead_id === leadId);
    if (!targetLead) {
      throw new Error(`Missing Lead Record: Lead ${leadId} not found locally.`);
    }

    const targetOp = augmentedOperations.find(o => o.order_id === orderId);
    if (!targetOp) {
      throw new Error(`Missing Operations Record: Operation for Order ${orderId} not found locally.`);
    }

    if (supabaseClient) {
      // Explicitly verify the parent records exist in the database BEFORE insert
      const { data: dbLead, error: leadErr } = await supabaseClient.from('leads').select('lead_id').eq('lead_id', leadId).single();
      if (leadErr || !dbLead) {
        if (targetLead) {
          const preparedLead = {
            ...targetLead,
            lead_source: targetLead.lead_source || 'Direct',
            email: targetLead.email || '—',
            event_time: targetLead.event_time || '12:00',
            event_location: targetLead.event_location || '—',
            budget: targetLead.budget !== undefined && targetLead.budget !== null ? targetLead.budget : 0,
            sales_person: targetLead.sales_person || 'Sales Team'
          };
          const res = await pushInsert('leads', preparedLead);
          if (!res.success) {
            throw new Error(`Failed to initialize Lead record in database:\n\n${res.error}`);
          }
        } else {
          throw new Error(`Database Error: Missing Lead Record in DB (${leadId}).`);
        }
      }

      const { data: dbOrder, error: orderErr } = await supabaseClient.from('orders').select('order_id, lead_id').eq('order_id', orderId).single();
      if (orderErr || !dbOrder) {
        if (targetOrder) {
          const preparedOrder = {
            ...targetOrder,
            event_time: targetOrder.event_time || '12:00',
            event_location: targetOrder.event_location || '—',
            package_name: targetOrder.package_name || 'Custom Shoot Package',
            balance_amount: targetOrder.balance_amount !== undefined && targetOrder.balance_amount !== null ? targetOrder.balance_amount : 0,
            sales_person: targetOrder.sales_person || 'Sales Team'
          };
          const res = await pushInsert('orders', preparedOrder);
          if (!res.success) {
            throw new Error(`Failed to initialize Order record in database:\n\n${res.error}`);
          }
        } else {
          throw new Error(`Database Error: Missing Order Record in DB (${orderId}).`);
        }
      } else if (dbOrder.lead_id !== leadId) {
        throw new Error(`Validation Error: Order ${orderId} does not belong to Lead ${leadId}.`);
      }

      const { data: dbOp, error: opErr } = await supabaseClient.from('operations').select('operation_id').eq('order_id', orderId).maybeSingle();
      if (opErr || !dbOp) {
        if (targetOp) {
          const res = await pushInsert('operations', targetOp);
          if (!res.success) {
            throw new Error(`Failed to initialize Operations record in database:\n\n${res.error}`);
          }
        } else {
          throw new Error(`Database Error: Missing Operations Record in DB for Order (${orderId}).`);
        }
      }
    }

    const timestamp = new Date().toISOString();
    const roleParts = (currentUserName && currentUserName.includes('|')) 
      ? currentUserName.split('|') 
      : [currentUserName || 'System', currentRole || 'System'];
    const changedBy = roleParts[0];
    const changedByRole = roleParts[1] || currentRole || 'System';

    if (assignments.length > 0) {
      if (supabaseClient) {
        // Delete all old assignments for this order to allow multiple staff per role without overwriting
        const { error: deleteErr } = await supabaseClient
          .from('staff_assignments')
          .delete()
          .eq('order_id', orderId);
        if (deleteErr) {
          console.error("Warning: Could not delete old staff assignments:", deleteErr);
        }
      }

      for (const a of assignments) {
        // STEP 2: SAVE ASSIGNMENT HISTORY
        const newHist = {
          lead_id: leadId,
          order_id: orderId,
          assigned_role: a.staff_role,
          assigned_staff: a.staff_name,
          assigned_by: changedBy,
          assigned_at: timestamp
        };
        const resHist = await pushInsert('lead_staff_assignment_history', newHist);
        if (!resHist.success) throw new Error(`Error saving assignment history:\n\n${resHist.error}`);

        // STEP 3: INSERT CURRENT ASSIGNMENT
        const assignId = `ASST-${Math.floor(100000 + Math.random() * 900000)}`;
        const assignDate = timestamp.split('T')[0];

        const newAssign = {
          assignment_id: assignId,
          order_id: orderId,
          staff_role: a.staff_role,
          staff_id: a.staff_id,
          staff_name: a.staff_name,
          assignment_date: assignDate,
          assignment_status: 'Assigned',
          updated_by: changedBy
        };

        const resAssign = await pushInsert('staff_assignments', newAssign);
        if (!resAssign.success) {
          if (resAssign.error?.includes('idx_unique_staff_per_order') || resAssign.error?.includes('duplicate key') || resAssign.error?.includes('23505')) {
            console.warn("Ignored staff_assignments constraint duplicate key for multi-event staff assignment:", resAssign.error);
          } else {
            console.warn("Could not insert staff assignment record, proceeding with event assignment:", resAssign.error);
          }
        }
      }

      // STEP 4: UPDATE OPERATIONS TABLE
      let opUpdates: any = {};
      for (const a of assignments) {
        if (a.staff_role === 'Photographer') opUpdates.photographer_assigned = a.staff_name;
        else if (a.staff_role === 'Videographer') opUpdates.videographer_assigned = a.staff_name;
        else if (a.staff_role === 'Drone Operator') opUpdates.drone_operator_assigned = a.staff_name;
        else if (a.staff_role === 'Assistant') opUpdates.assistant_assigned = a.staff_name;
      }
      
      if (Object.keys(opUpdates).length > 0) {
        opUpdates.updated_by = changedBy;
        const resOp = await pushUpdate('operations', 'order_id', orderId, opUpdates);
        if (!resOp.success) throw new Error(`Error updating operations record:\n\n${resOp.error}`);
      }

      if (assignments.length > 0) { // STEP 5: UPDATE LEAD STATUS
        const currentStage = targetLead.current_status || targetLead.status || 'Order Confirmed';
        const preventDowngradeStages = [
          'Event Started', 'Event Completed', 'Raw Footage Received',
          'Editor Assigned', 'Editing Started', 'Editing In Progress',
          'Internal QC Review', 'Client Review Sent', 'Internal Review',
          'Client Review', 'Revision Required', 'Revision In Progress',
          'Revision', 'Final Approval', 'Ready for Delivery',
          'Delivered', 'Completed', 'Closed', 'Project Closed', 'Project Delivered'
        ];

        if (!preventDowngradeStages.includes(currentStage)) {
          const statusHist = {
            lead_id: leadId,
            order_id: orderId,
            old_status: currentStage,
            new_status: 'Event Scheduled',
            changed_by: changedBy,
            changed_by_role: changedByRole,
            remarks: `Assigned: ${assignments.map(a => `${a.staff_role} (${a.staff_name})`).join(', ')}`,
            created_at: timestamp
          };
          await pushInsert('lead_status_history', statusHist);

          const resLead = await pushUpdate('leads', 'lead_id', leadId, { 
            current_status: 'Event Scheduled', 
            status: 'Event Scheduled',
            updated_by: changedBy
          });
          if (!resLead.success) throw new Error(`Error updating lead status:\n\n${resLead.error}`);

          const resOrder = await pushUpdate('orders', 'order_id', orderId, { 
            current_stage: 'Event Scheduled', 
            updated_by: changedBy
          });
          if (!resOrder.success) throw new Error(`Error updating order stage:\n\n${resOrder.error}`);
        }
      }

    } // STEP 6: REFRESH DASHBOARD
    

    // Create notifications for assigned staff
    assignments.forEach((a) => {
      const ord = augmentedOrders.find((o) => o.order_id === orderId);
      const op = augmentedOperations.find((o) => o.order_id === orderId);
      const customerName = ord?.customer_name || 'Valued Client';
      const eventType = ord?.event_type || 'Event';
      const eventDate = ord?.event_date || 'N/A';
      const reportingTime = op?.reporting_time || '08:00';

      // 1. New Event Assigned
      addNotification({
        user_id: a.staff_id,
        project_id: orderId,
        task_id: 'Shoot',
        notification_type: 'New Event Assigned',
        title: 'New Event Assigned',
        message: `You have been assigned as ${a.staff_role} for ${customerName}'s ${eventType} (Order: ${orderId}) on ${eventDate}.`,
        recipient_role: 'Operations Team'
      });

      // 2. Event Tomorrow Reminder
      addNotification({
        user_id: a.staff_id,
        project_id: orderId,
        task_id: 'Shoot',
        notification_type: 'Event Tomorrow Reminder',
        title: 'Event Tomorrow Reminder',
        message: `Reminder: Tomorrow is the ${eventType} shoot for ${customerName} (Order: ${orderId}). Please report at ${reportingTime}.`,
        recipient_role: 'Operations Team'
      });

      // 3. Event Today Reminder
      addNotification({
        user_id: a.staff_id,
        project_id: orderId,
        task_id: 'Shoot',
        notification_type: 'Event Today Reminder',
        title: 'Event Today Reminder',
        message: `Reminder: Today is the ${eventType} shoot for ${customerName} (Order: ${orderId}). Report on time at ${reportingTime} and update status through ERP.`,
        recipient_role: 'Operations Team'
      });
    });
  };


  // 5. Mark Event Completed (Action button in Operations)
  const markEventCompleted = async (orderId: string, serverPath: string) => {
    const trackingId = `TRK-${Math.floor(2012 + Math.random() * 800)}`;
    const pId = `PRD-${Math.floor(4012 + Math.random() * 800)}`;

    const newRawFootage: RawFootage = {
      tracking_id: trackingId,
      order_id: orderId,
      event_completed_date: new Date().toISOString().split('T')[0],
      raw_received: false,
      server_path: serverPath || `s3://photocrew-vault-production/2026/${orderId}-shoot/raw/`,
      uploaded_by: currentUserName,
      uploaded_date: new Date().toISOString(),
      status: 'Pending',
    };

    const targetOrder = augmentedOrders.find((o) => o.order_id === orderId);

    const newProd: any = {
      production_id: pId,
      tracking_id: trackingId,
      editor_assigned: 'Unassigned',
      raw_footage_location: newRawFootage.server_path,
      editing_status: 'Raw Footage Received',
      remarks: 'Raw footage uploaded. Awaiting editor assignment.',
      order_id: orderId,
      lead_id: targetOrder?.lead_id || '',
      customer_name: targetOrder?.customer_name || '',
      event_id: targetOrder?.event_type || '',
      assigned_team: targetOrder?.assigned_team || 'Unassigned',
      final_consolidated_drive_link: newRawFootage.server_path,
      current_status: 'Raw Footage Received',
      created_at: new Date().toISOString()
    };

    const previousStage = targetOrder ? targetOrder.current_stage : 'Event Scheduled';
    const timestamp = new Date().toISOString();

    // Update Operations status to completed
    const r1 = await pushUpdate('operations', 'order_id', orderId, { event_status: 'Completed' });
    if (!r1?.success) throw new Error("Failed to update operations status");

    // Update order & lead stage to 'Event Completed'
    const r2 = await pushUpdate('orders', 'order_id', orderId, { 
      current_stage: 'Event Completed',
      updated_by: currentUserName,
      updated_at: timestamp
    });
    if (!r2?.success) throw new Error("Failed to update order status");

    if (targetOrder) {
      const r3 = await pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
        status: 'Event Completed',
        current_status: 'Event Completed',
        updated_by: currentUserName,
        updated_at: timestamp
      });
      if (!r3?.success) throw new Error("Failed to update lead status");
    }

    const rRf = await pushInsert('raw_footage', newRawFootage);
    if (!rRf?.success) throw new Error("Failed to insert raw footage: " + rRf?.error);
    const rProd = await pushInsert('production', newProd);
    if (!rProd?.success) throw new Error("Failed to insert production data: " + rProd?.error);

    //  // Disabled to prevent full reload

    const customerName = targetOrder ? targetOrder.customer_name : 'Customer';
    const eventName = targetOrder ? (targetOrder.event_type || targetOrder.package_name || 'Event') : 'Wedding';

    // 1. Event Completed for Operations Team and Business Owner
    addNotification({
      user_id: 'All',
      project_id: orderId,
      task_id: 'Operations Completion',
      notification_type: 'Event Completed',
      title: '✅ Event Completed',
      message: `${eventName} coverage has been completed. Customer: ${customerName}.`,
      recipient_role: 'Operations Team'
    });
    addNotification({
      user_id: 'All',
      project_id: orderId,
      task_id: 'Operations Completion',
      notification_type: 'Event Completed',
      title: '✅ Event Completed',
      message: `${eventName} coverage has been completed. Customer: ${customerName}.`,
      recipient_role: 'Business Owner'
    });

    // 2. New Event Ready for Editing for Production Team
    addNotification({
      user_id: 'All',
      project_id: orderId,
      task_id: 'Editing Ready',
      notification_type: 'New Event Ready for Editing',
      title: '🎥 New Event Ready for Editing',
      message: `Raw footage for "${eventName}" (Order: ${orderId}) is ready for editing. Customer: ${customerName}.`,
      recipient_role: 'Production Team'
    });

    logActivity(`Marked Event Completed for Order ${orderId}. Raw Footage recorded: ${trackingId}`, 'Operations', orderId, previousStage, 'Event Completed');
  };

  // 6. Production updates (Editing progress, review, approval)
  const updateProduction = async (
    productionId: string, 
    updates: Partial<Omit<Production, 'production_id' | 'tracking_id'>>
  ) => {
    let trackingIdToUpdate = '';
    
    // De-mock production ID if it is PRD-lead_id
    const inferredTrackingId = productionId.startsWith('PRD-') ? productionId.replace('PRD-', '') : productionId;
    let targetProd = augmentedProduction.find((p) => p.production_id === productionId || p.tracking_id === inferredTrackingId);
    
    let previousStage: CurrentStage = 'Raw Footage Received';
    if (targetProd) {
      const rf = rawFootage.find((f) => f.tracking_id === targetProd.tracking_id);
      const linkedOrder = rf ? augmentedOrders.find((o) => o.order_id === rf.order_id) : undefined;
      if (linkedOrder) {
        previousStage = linkedOrder.current_stage;
      }
    } else {
      // Look up in leads
      const linkedLead = leads.find(l => l.lead_id === inferredTrackingId);
      if (linkedLead) {
        previousStage = linkedLead.status as any;
      }
    }

    const orderName = 'Project';
    const oId = inferredTrackingId;

    // Automatically set dates when stages are completed
    if (updates.editing_status) {
      const todayDateStr = new Date().toISOString().split('T')[0];
      if (updates.editing_status === 'Editing Started') {
        updates.editing_start_date = todayDateStr;
      } else if (['Project Delivered', 'Delivered', 'Completed'].includes(updates.editing_status)) {
        updates.delivery_date = todayDateStr;
        updates.actual_delivery_date = todayDateStr;
      }
    }

    // Send notifications if needed
    if (updates.editor_assigned && updates.editor_assigned !== 'Unassigned') {
      const oldEditor = targetProd?.editor_assigned;
      if (!oldEditor || oldEditor === 'Unassigned' || oldEditor === '') {
        addNotification({
          user_id: updates.editor_assigned,
          project_id: productionId,
          task_id: 'Editing',
          notification_type: 'Task Assigned',
          title: 'Editing Task Assigned',
          message: `A new editing task (Order: ${oId}) has been assigned to ${updates.editor_assigned}.`,
          recipient_role: 'Production Team'
        });
      } else if (oldEditor !== updates.editor_assigned) {
        addNotification({
          user_id: updates.editor_assigned,
          project_id: productionId,
          task_id: 'Editing',
          notification_type: 'Task Reassigned',
          title: 'Editing Task Reassigned',
          message: `Editing task (Order: ${oId}) has been reassigned from ${oldEditor} to ${updates.editor_assigned}.`,
          recipient_role: 'Production Team'
        });
      }
    }

    if (updates.editing_status && (!targetProd || updates.editing_status !== targetProd.editing_status)) {
      const status = updates.editing_status;
      if (status === 'Client Review Sent') {
        addNotification({
          user_id: targetProd?.editor_assigned || 'Unassigned',
          project_id: productionId,
          task_id: 'Editing',
          notification_type: 'Task Completed',
          title: 'Editing Task Completed',
          message: `Editing completed by ${targetProd?.editor_assigned || 'Editor'} (Order: ${oId}). Sent for customer review.`,
          recipient_role: 'Operations Team'
        });
      } else if (status === 'Revision Required') {
        addNotification({
          user_id: targetProd?.editor_assigned || 'Unassigned',
          project_id: productionId,
          task_id: 'Review',
          notification_type: 'Revision Requested',
          title: 'Project Revision Requested',
          message: `Revision was requested (Order: ${oId}). Status updated to Revision Required.`,
          recipient_role: 'Production Team'
        });
      } else if (status === 'Final Approval') {
        addNotification({
          user_id: targetProd?.editor_assigned || 'Unassigned',
          project_id: productionId,
          task_id: 'Review',
          notification_type: 'Project Approved',
          title: 'Project Customer Approved',
          message: `Project (Order: ${oId}) was approved by the customer.`,
          recipient_role: 'All'
        });
      }
    }

    const timestamp = new Date().toISOString();

    // Ensure raw footage row exists if needed before inserting production
    if (!targetProd) {
      let tempOrder = augmentedOrders.find(o => o.order_id === inferredTrackingId || o.lead_id === inferredTrackingId);
      if (!tempOrder) {
        const rf = rawFootage.find(f => f.tracking_id === inferredTrackingId || f.order_id === inferredTrackingId);
        if (rf) {
          tempOrder = augmentedOrders.find(o => o.order_id === rf.order_id);
        }
      }
      if (tempOrder) {
        const rfExists = rawFootage.some(f => f.tracking_id === inferredTrackingId);
        if (!rfExists) {
          const dummyRF = {
            tracking_id: inferredTrackingId,
            order_id: tempOrder.order_id,
            event_completed_date: tempOrder.event_date || new Date().toISOString().split('T')[0],
            raw_received: false,
            server_path: '',
            uploaded_by: currentUserName,
            uploaded_date: new Date().toISOString(),
            status: 'Pending'
          };
          const rRF = await pushInsert('raw_footage', dummyRF);
          if (rRF?.success) {
            setRawFootage(prev => [dummyRF as any, ...prev]);
          } else {
            console.warn("[updateProduction] Failed to auto-insert raw_footage placeholder:", rRF?.error);
          }
        }
      }
    }

    // Set production state in Supabase
    try {
      if (updates.editing_status) {
        updates.production_status = updates.editing_status;
        updates.current_status = updates.editing_status;
      }

      if (targetProd) {
        const rProd = await pushUpdate('production', 'production_id', targetProd.production_id, updates);
        if (!rProd?.success) {
          console.warn("[updateProduction] DB operation failed for production table update:", rProd?.error);
          throw new Error(rProd?.error || "DB operation failed for production table update");
        } else {
          setProduction(prev => prev.map(p => p.production_id === targetProd.production_id ? { ...p, ...updates } : p));
        }
      } else {
        const newPId = productionId.startsWith('PRD-') ? `PRD-${Math.floor(100000 + Math.random() * 899999)}` : productionId;
        const newProd: Production = {
          production_id: newPId,
          tracking_id: inferredTrackingId,
          editor_assigned: updates.editor_assigned || 'Unassigned',
          editing_status: (updates.editing_status || previousStage || 'Raw Footage Received') as any,
          remarks: updates.remarks || '',
          project_priority: updates.project_priority || 'Medium',
          raw_footage_location: updates.raw_footage_location || '',
          target_delivery_date: updates.target_delivery_date || '',
          expected_delivery_date: updates.expected_delivery_date || '',
          ...updates
        };
        const rProd = await pushInsert('production', newProd);
        if (!rProd?.success) {
          console.warn("[updateProduction] DB operation failed for production table insert:", rProd?.error);
          throw new Error(rProd?.error || "DB operation failed for production table insert");
        } else {
          setProduction(prev => [newProd, ...prev]);
        }
      }
    } catch (prodErr: any) {
      console.warn("[updateProduction] Production DB write exception:", prodErr?.message || prodErr);
      throw prodErr;
    }

    const actualTrackingId = targetProd ? targetProd.tracking_id : inferredTrackingId;

    // Find linked order using all possible connections (including order_id, lead_id on targetProd)
    let tgtOrder = augmentedOrders.find(o => 
      (targetProd && (o.order_id === (targetProd as any).order_id || o.lead_id === (targetProd as any).lead_id || o.order_id === targetProd.tracking_id || o.lead_id === targetProd.tracking_id)) ||
      o.order_id === actualTrackingId || 
      o.lead_id === actualTrackingId ||
      o.order_id === inferredTrackingId ||
      o.lead_id === inferredTrackingId ||
      o.order_id === productionId ||
      o.lead_id === productionId
    );
    if (!tgtOrder) {
      const rf = rawFootage.find(f => f.tracking_id === actualTrackingId || f.order_id === actualTrackingId || (targetProd && f.tracking_id === targetProd.tracking_id));
      if (rf) {
        tgtOrder = augmentedOrders.find(o => o.order_id === rf.order_id);
      }
    }

    // Find linked lead using all possible connections
    let tgtLead = leads.find(l => 
      (tgtOrder && l.lead_id === tgtOrder.lead_id) ||
      (targetProd && (l.lead_id === (targetProd as any).lead_id || l.lead_id === targetProd.tracking_id)) ||
      l.lead_id === actualTrackingId ||
      l.lead_id === inferredTrackingId ||
      l.lead_id === inferredTrackingId.replace('PRD-', '') ||
      l.lead_id === productionId
    );

    // Determine Stage to update on Order and Lead
    let nextStage: CurrentStage | null = null;
    if (updates.editing_status) {
      nextStage = updates.editing_status as any;
    } else if (updates.editor_assigned && updates.editor_assigned !== 'Unassigned') {
      nextStage = 'Editor Assigned';
    } else if (targetProd) {
      nextStage = targetProd.editing_status as any;
    }

    // Map strings & enforce Business Owner Review before closure
    if (['Closed', 'Order Closed', 'Project Closed', 'Completed', 'Project Completed'].includes(nextStage as string)) {
      if (currentRole !== 'Business Owner' && updates.editing_status !== 'Order Closed') {
        const tgtPayment = payments.find(p => p.order_id === (tgtOrder?.order_id || actualTrackingId) || p.lead_id === (tgtLead?.lead_id));
        
        const validation = performBusinessOwnerReview(tgtOrder, tgtLead, targetProd, tgtPayment);
        if (!validation.isValid) {
          nextStage = 'Business Owner Review';
          logActivity(
            `Business Owner Review Pending for Order ${tgtOrder?.order_id || actualTrackingId}. Pending items: ${validation.pendingItems.join('; ')}`,
            'Business Owner',
            tgtOrder?.order_id || actualTrackingId,
            previousStage,
            'Business Owner Review'
          );
        } else {
          nextStage = 'Order Closed';
          logActivity(
            `Business Owner Review Completed & Validated. Reviewed By: ${currentUserName || 'Business Owner'}, Review Date & Time: ${new Date().toISOString()}, Final Status: Order Closed. Notes: ${updates.remarks || 'None'}`,
            'Business Owner',
            tgtOrder?.order_id || actualTrackingId,
            'Business Owner Review',
            'Order Closed'
          );
        }
      } else {
        nextStage = 'Order Closed';
        logActivity(
          `Business Owner Review Completed & Order Closed. Reviewed By: ${currentUserName || 'Business Owner'}, Review Date & Time: ${new Date().toISOString()}, Final Status: Order Closed. Notes: ${updates.remarks || 'None'}`,
          'Business Owner',
          tgtOrder?.order_id || actualTrackingId,
          'Business Owner Review',
          'Order Closed'
        );
      }
    } else if (nextStage === 'Project Delivered') {
      nextStage = 'Delivered';
    }

    const leadIdToUpdate = tgtLead?.lead_id || tgtOrder?.lead_id || (actualTrackingId.startsWith('PRD-') ? actualTrackingId.replace('PRD-', '') : actualTrackingId);

    if (nextStage && leadIdToUpdate) {
      const leadUpdates: any = {
        updated_by: currentUserName,
        updated_at: timestamp
      };
      if (nextStage) {
        leadUpdates.status = nextStage;
        leadUpdates.current_status = nextStage;
      }
      if (updates.editor_assigned) {
        leadUpdates.assigned_editor = updates.editor_assigned;
      }
      if (updates.assigned_staff) {
        leadUpdates.assigned_editors = updates.assigned_staff;
      }
      if (updates.target_delivery_date) {
        leadUpdates.delivery_target_date = updates.target_delivery_date;
      }
      if ((updates as any).production_role) {
        leadUpdates.production_role = (updates as any).production_role;
      } else if ((updates as any).assigned_role) {
        leadUpdates.production_role = (updates as any).assigned_role;
      }
      
      console.log("Updating lead:", leadIdToUpdate, leadUpdates);
      const rLead = await pushUpdate('leads', 'lead_id', leadIdToUpdate, leadUpdates);
      if (rLead?.success) {
        setLeads(prev => prev.map(l => l.lead_id === leadIdToUpdate ? { ...l, ...leadUpdates } : l));
      } else {
        console.warn("Lead update warning:", rLead?.error);
      }
    }

    if (nextStage && tgtOrder) {
      let orderStage = nextStage;
      if (orderStage === 'Client Review Sent') orderStage = 'Customer Review';
      if (orderStage === 'Final Approval') orderStage = 'Approved';

      const isAllowedInOrders = !['Editing In Progress', 'Editor Assigned', 'Internal QC Review', 'Revision Required', 'Revision In Progress'].includes(orderStage);
      if (isAllowedInOrders) {
        const ordUpdates: any = {
          current_stage: orderStage,
          updated_by: currentUserName,
          updated_at: timestamp
        };
        const rOrd = await pushUpdate('orders', 'order_id', tgtOrder.order_id, ordUpdates);
        if (rOrd?.success) {
          setOrders(prev => prev.map(o => o.order_id === tgtOrder!.order_id ? { ...o, ...ordUpdates } : o));
        } else {
          console.warn("Order stage update warning:", rOrd?.error);
        }
      }
    }

    // Sync editor_assignments status if Client Acceptance
    if (nextStage === 'Client Acceptance' || updates.editing_status === 'Client Acceptance') {
      const pId = targetProd?.production_id || productionId;
      const trkId = targetProd?.tracking_id || inferredTrackingId;
      const oId = tgtOrder?.order_id;

      const matchingAssignments = (editorAssignments || []).filter(a => 
        a.production_id === pId || 
        a.production_id === trkId || 
        (oId && a.order_id === oId)
      );

      for (const assign of matchingAssignments) {
        await pushUpdate('editor_assignments', 'assignment_id', assign.assignment_id, { status: 'Client Acceptance' });
      }

      if (matchingAssignments.length > 0) {
        setEditorAssignments(prev => prev.map(a => 
          (a.production_id === pId || a.production_id === trkId || (oId && a.order_id === oId))
            ? { ...a, status: 'Client Acceptance' }
            : a
        ));
      }
    }

    //  // Disabled to prevent full reload

    logActivity(
      `Updated Production ${productionId}: status=${updates.editing_status || 'unchanged'}`, 
      'Production', 
      productionId,
      previousStage,
      nextStage || previousStage
    );
  };

  // accept raw footage as post-production audit step
  const acceptRawFootage = async (trackingId: string) => {
    const rf = rawFootage.find((f) => f.tracking_id === trackingId);
    if (!rf) return;

    const orderId = rf.order_id;
    const previousStage = augmentedOrders.find((o) => o.order_id === orderId)?.current_stage || 'Event Completed';
    const timestamp = new Date().toISOString();

    const r1 = await pushUpdate('raw_footage', 'tracking_id', trackingId, { status: 'Received' });
    if (!r1?.success) {
      throw new Error("Failed to update raw footage status in database.");
    }

    const r2 = await pushUpdate('orders', 'order_id', orderId, { 
      current_stage: 'Raw Footage Received',
      updated_by: currentUserName,
      updated_at: timestamp
    });
    if (!r2?.success) {
      throw new Error("Failed to update order status in database.");
    }

    const targetOrder = augmentedOrders.find((o) => o.order_id === orderId);
    if (targetOrder) {
      const r3 = await pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
        status: 'Raw Footage Received',
        current_status: 'Raw Footage Received',
        updated_by: currentUserName,
        updated_at: timestamp
      });
      if (!r3?.success) {
        throw new Error("Failed to update lead status in database.");
      }
    }

    //  // Disabled to prevent full reload

    logActivity(`Audited & accepted Raw Footage for Order: ${orderId}. Assigned to editing pipelines.`, 'Production', orderId, previousStage, 'Raw Footage Received');
  };

  const confirmRawFootageReceived = async (
    orderId: string,
    footageLink?: string,
    storageType?: string,
    uploadNotes?: string,
    paymentCollectionStatus?: string,
    additionalReceived?: number,
    transactionId?: string
  ) => {
    const targetOrder = augmentedOrders.find((o) => o.order_id === orderId);
    if (!targetOrder) return;
    const previousStage = targetOrder.current_stage;
    const targetStage: CurrentStage = 'Verified Footage';

    const resolvedLink = footageLink || `s3://photocrew-vault-production/2026/${orderId}-shoot/raw/`;
    const timestamp = new Date().toISOString();

    const rOrd = await pushUpdate('orders', 'order_id', orderId, { 
      current_stage: targetStage,
      updated_by: currentUserName,
      updated_at: timestamp
    });
    if (!rOrd?.success) {
      throw new Error("Failed to update order stage: " + rOrd?.error);
    }

    // Handle Payment Capture if provided
    if (paymentCollectionStatus) {
      const existingPayment = augmentedPayments.find(p => p.order_id === orderId);
      const totalAmount = targetOrder.quotation_amount || 0;
      const advanceAmount = targetOrder.advance_received || 0;
      const finalReceived = additionalReceived || 0;

      let payStatus: PaymentStatus = 'Pending';
      let balanceDue = totalAmount - advanceAmount - finalReceived;

      if (paymentCollectionStatus === 'Full Payment Received') {
        payStatus = 'Fully Paid';
        balanceDue = 0;
      } else if (paymentCollectionStatus === 'Partial Payment Received') {
        payStatus = 'Partially Paid';
      } else if (paymentCollectionStatus === 'Payment Pending') {
        payStatus = 'Pending';
        balanceDue = totalAmount - advanceAmount; // no additional received
      }

      const payId = existingPayment?.payment_id || `PAY-${Math.floor(3000 + Math.random() * 1000)}`;
      const updatedPayment: Payment = {
        payment_id: payId,
        order_id: orderId,
        quotation_amount: totalAmount,
        advance_received: advanceAmount,
        final_payment_received: paymentCollectionStatus === 'Full Payment Received' ? (totalAmount - advanceAmount) : finalReceived,
        balance_due: balanceDue < 0 ? 0 : balanceDue,
        payment_status: payStatus,
        payment_collection_status: paymentCollectionStatus,
        additional_received: paymentCollectionStatus === 'Full Payment Received' ? (totalAmount - advanceAmount) : finalReceived,
        payment_date: new Date().toISOString().split('T')[0],
        transaction_id: transactionId || existingPayment?.transaction_id || undefined,
      };

      if (existingPayment) {
        const rPay = await pushUpdate('payments', 'payment_id', payId, updatedPayment);
        if (!rPay?.success) {
          throw new Error("Failed to update payment details: " + rPay?.error);
        }
      } else {
        const rPay = await pushInsert('payments', updatedPayment);
        if (!rPay?.success) {
          throw new Error("Failed to insert payment details: " + rPay?.error);
        }
      }
    }

    const rLead = await pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
      status: targetStage,
      current_status: targetStage,
      updated_by: currentUserName,
      updated_at: timestamp
    });
    if (!rLead?.success) {
      throw new Error("Failed to update lead status: " + rLead?.error);
    }

    // Also update event_status of corresponding Operations record to 'Completed' (which satisfies DB constraint ('Assigned', 'Completed')) if exists, and store raw footage upload notes/remarks.
    await pushUpdate('operations', 'order_id', orderId, { 
      event_status: 'Completed',
      Upload_Notes_Remarks: uploadNotes || '',
      upload_notes_remarks: uploadNotes || '',
      Raw_Footage_Drive_Link: footageLink || '',
      raw_footage_drive_link: footageLink || ''
    });

    // Directly update local state for operations
    setOperations(prev => prev.map(op => {
      if (op.order_id === orderId) {
        return {
          ...op,
          event_status: 'Completed',
          Upload_Notes_Remarks: uploadNotes || '',
          upload_notes_remarks: uploadNotes || '',
          Raw_Footage_Drive_Link: footageLink || '',
          raw_footage_drive_link: footageLink || ''
        };
      }
      return op;
    }));

    let existingRf = rawFootage.find(f => f.order_id === orderId);
    let trackingId = existingRf?.tracking_id || `TRK-${Math.floor(2012 + Math.random() * 850)}`;

    const todayYyyyMmDd = timestamp.split('T')[0];

    const finalRf: RawFootage = {
      tracking_id: trackingId,
      order_id: orderId,
      event_completed_date: existingRf?.event_completed_date || todayYyyyMmDd,
      raw_received: true,
      server_path: resolvedLink,
      uploaded_by: currentUserName,
      uploaded_date: timestamp,
      status: 'Received',
      storage_type: storageType || 'Google Drive',
      upload_notes: uploadNotes || '',
    };

    const rRf = await pushUpsert('raw_footage', finalRf);
    if (!rRf?.success) {
      throw new Error("Failed to save raw footage record: " + (rRf?.error || "Unknown error"));
    }

    setRawFootage(prev => {
      const idx = prev.findIndex(f => f.order_id === orderId || f.tracking_id === trackingId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = finalRf;
        return copy;
      }
      return [finalRf, ...prev];
    });

    // Ensure production entry exists or update it
    let existingProd = augmentedProduction.find(p => p.tracking_id === trackingId || p.tracking_id === orderId);
    let pId = existingProd?.production_id || `PRD-${Math.floor(4012 + Math.random() * 850)}`;
    
    const targetLead = leads.find(l => l.lead_id === targetOrder?.lead_id);

    let eventNames = '';
    let eventDates = '';
    let eventTypes = '';
    if (targetLead?.events) {
       eventNames = targetLead.events.map((e:any) => e.event_name).filter(Boolean).join(', ');
       eventDates = targetLead.events.map((e:any) => e.event_date).filter(Boolean).join(', ');
       eventTypes = targetLead.events.map((e:any) => e.event_type).filter(Boolean).join(', ');
    } else {
       eventDates = targetOrder?.event_date || '';
       eventTypes = targetOrder?.event_type || '';
    }

    const newProd: any = {
      production_id: pId,
      tracking_id: trackingId,
      editor_assigned: existingProd?.editor_assigned || 'Unassigned',
      raw_footage_location: resolvedLink,
      editing_status: existingProd?.editing_status || 'Raw Footage Received',
      remarks: `Raw footage received via ${storageType || 'Google Drive'}. ${uploadNotes || ''}`,
      order_id: orderId,
      lead_id: targetOrder?.lead_id || '',
      customer_name: targetOrder?.customer_name || targetLead?.Customer_Name || '',
      customer_mobile: targetLead?.Customer_Mobile || (targetOrder as any)?.customer_mobile || '',
      whatsapp_number: targetLead?.WhatsApp_Number || (targetOrder as any)?.whatsapp_number || '',
      event_names: eventNames,
      event_dates: eventDates,
      event_types: eventTypes,
      team_members: typeof targetLead?.Team_Members === 'string' ? targetLead.Team_Members : JSON.stringify(targetLead?.Team_Members || []),
      deliverables: typeof targetLead?.Deliverables === 'string' ? targetLead.Deliverables : JSON.stringify(targetLead?.Deliverables || []),
      event_id: targetOrder?.event_type || '',
      assigned_team: targetOrder?.assigned_team || 'Unassigned',
      final_consolidated_drive_link: resolvedLink,
      sales_staff: targetOrder?.created_by || targetLead?.Sales_Staff || '',
      operations_staff: currentUserName,
      created_date: timestamp.split('T')[0],
      created_time: timestamp.split('T')[1].split('.')[0],
      current_status: 'Raw Footage Received',
      created_at: timestamp
    };

    const rProd = await pushUpsert('production', newProd);
    if (!rProd?.success) {
      throw new Error("Failed to insert production data: " + (rProd?.error || "Unknown error"));
    }

    setProduction(prev => {
      const idx = prev.findIndex(p => p.tracking_id === trackingId || p.production_id === pId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...newProd };
        return copy;
      }
      return [newProd, ...prev];
    });

    addNotification({
      user_id: 'All',
      project_id: orderId,
      task_id: 'Editing',
      notification_type: 'Task Assigned',
      title: 'New Raw Footage Received',
      message: `Raw footage for "${targetOrder.package_name || 'Shoot'}" (Order: ${orderId}) has been received and verified. Storage Type: ${storageType || 'Google Drive'}. Ready for editing!`,
      recipient_role: 'Production Team'
    });

    //  // Disabled to prevent full reload

    logActivity(`Raw Footage Received and Confirmed in system for Order: ${orderId}. Drive Link: ${resolvedLink}. Storage: ${storageType || 'Google Drive'}`, 'Operations', orderId, previousStage, targetStage);
  };

  const updateOrderStage = async (orderId: string, stage: CurrentStage) => {
    const targetOrder = augmentedOrders.find((o) => o.order_id === orderId || o.lead_id === orderId);
    const resolvedOrderId = targetOrder ? targetOrder.order_id : orderId;
    const previousStage = targetOrder ? targetOrder.current_stage : 'Order Confirmed';
    const timestamp = new Date().toISOString();

    let targetStageToSave = stage;
    if (['Closed', 'Order Closed', 'Project Closed', 'Completed'].includes(stage as string)) {
      targetStageToSave = 'Order Closed';
      logActivity(
        `Business Owner Review Completed & Order Closed. Reviewed By: ${currentUserName || 'Business Owner'}, Review Date & Time: ${timestamp}, Final Status: Order Closed.`,
        'Business Owner',
        resolvedOrderId,
        previousStage,
        'Order Closed'
      );
    }

    const rOrd = await pushUpdate('orders', 'order_id', resolvedOrderId, { 
      current_stage: targetStageToSave,
      updated_by: currentUserName,
      updated_at: timestamp
    });
    if (!rOrd?.success) {
      throw new Error("Failed to update order stage: " + rOrd?.error);
    } else {
      setOrders(prev => prev.map(o => o.order_id === resolvedOrderId ? { ...o, current_stage: targetStageToSave } : o));
    }

    if (targetOrder) {
      const rLead = await pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
        status: targetStageToSave,
        current_status: targetStageToSave,
        updated_by: currentUserName,
        updated_at: timestamp
      });
      if (!rLead?.success) {
        throw new Error("Failed to update lead status: " + rLead?.error);
      }
    }

    logActivity(`Updated stage for Order ${orderId}`, 'Operations', orderId, previousStage, targetStageToSave);
  };

  // 7. Mark Delivered (Action button)
  const markDelivered = async (trackingId: string, remarks?: string) => {
    const targetFootage = rawFootage.find((rf) => rf.tracking_id === trackingId);
    if (!targetFootage) return;

    const orderId = targetFootage.order_id;
    const previousStage = augmentedOrders.find((o) => o.order_id === orderId)?.current_stage || 'Approved';

    const targetStage: CurrentStage = 'Closed';
    const timestamp = new Date().toISOString();

    const targetProd = augmentedProduction.find((p) => p.tracking_id === trackingId);
    if (targetProd) {
      const linkedOrder = augmentedOrders.find((o) => o.order_id === orderId);
      const orderName = linkedOrder?.package_name || 'Project';
      addNotification({
        user_id: targetProd.editor_assigned,
        project_id: targetProd.production_id,
        task_id: 'Delivery',
        notification_type: 'Project Delivered',
        title: 'Project Delivered to Client',
        message: `Project "${orderName}" (Order: ${orderId}) has been successfully delivered and completed.`,
        recipient_role: 'All'
      });
      addNotification({
        user_id: targetProd.editor_assigned,
        project_id: targetProd.production_id,
        task_id: 'Delivery',
        notification_type: 'Task Completed',
        title: 'Delivery Task Completed',
        message: `Delivery completed for "${orderName}" (Order: ${orderId}).`,
        recipient_role: 'Production Team'
      });
      addNotification({
        user_id: 'All',
        project_id: orderId,
        task_id: 'Delivery',
        notification_type: 'Project Delivered',
        title: '✅ Project Delivered',
        message: `Customer deliverables for "${orderName}" (Order: ${orderId}) have been completed and delivered successfully.`,
        recipient_role: 'Sales Team'
      });
      addNotification({
        user_id: 'All',
        project_id: orderId,
        task_id: 'Delivery',
        notification_type: 'Project Delivered',
        title: '✅ Project Delivered',
        message: `Customer deliverables for "${orderName}" (Order: ${orderId}) have been completed and delivered successfully.`,
        recipient_role: 'Business Owner'
      });
    }

    // Update production status
    if (targetProd) {
      const finalRemarks = `${targetProd.remarks || ''}\n${remarks || 'Delivered to client.'}`;
      const updates = {
        editing_status: 'Delivered',
        customer_review_status: 'Approved',
        delivery_date: timestamp.split('T')[0],
        remarks: finalRemarks
      };
       
        const rProd = await pushUpdate('production', 'production_id', targetProd.production_id, updates);
      if (!rProd?.success) {
        throw new Error("Failed to update production: " + rProd?.error);
      } else {
        setProduction(prev => prev.map(p => p.production_id === targetProd.production_id ? { ...p, ...updates } as any : p));
      }
    }

    // Update order & lead stage
    const rOrd = await pushUpdate('orders', 'order_id', orderId, { 
      current_stage: targetStage, 
      order_status: 'Delivered',
      updated_by: currentUserName,
      updated_at: timestamp
    });
    if (!rOrd?.success) {
      throw new Error("Failed to update order status: " + rOrd?.error);
    }

    setOrders(prev => prev.map(o => {
      if (o.order_id === orderId) {
        return {
          ...o,
          current_stage: targetStage,
          order_status: 'Delivered',
          updated_by: currentUserName,
          updated_at: timestamp
        };
      }
      return o;
    }));

    const tgtOrder = augmentedOrders.find((o) => o.order_id === orderId);
    if (tgtOrder) {
      const rLead = await pushUpdate('leads', 'lead_id', tgtOrder.lead_id, { 
        status: targetStage,
        current_status: targetStage,
        updated_by: currentUserName,
        updated_at: timestamp
      });
      if (!rLead?.success) {
        throw new Error("Failed to update lead status: " + rLead?.error);
      }

      setLeads(prev => prev.map(l => {
        if (l.lead_id === tgtOrder.lead_id) {
          return {
            ...l,
            status: targetStage,
            current_status: targetStage,
            updated_by: currentUserName,
            updated_at: timestamp
          };
        }
        return l;
      }));
    }

    //  // Disabled to prevent full reload

    logActivity(`Marked Project Delivered to client for Order: ${orderId}`, 'Production', trackingId, previousStage, targetStage);
  };

  // 8. Payments update
  const recordPayment = async (
    orderId: string, 
    amountReceived: number, 
    paymentDate: string, 
    proofUrl?: string,
    transactionId?: string,
    paymentMode?: string,
    paymentNotes?: string
  ) => {
    let isFullyPaid = false;
    const targetPayment = augmentedPayments.find((p) => p.order_id === orderId);
    if (!targetPayment) return;

    let actualAmountReceived = amountReceived;
    const totalPaidBefore = targetPayment.advance_received + targetPayment.final_payment_received;
    
    // Prevent Paid Amount greater than Final Quotation Amount
    if (totalPaidBefore + actualAmountReceived > targetPayment.quotation_amount) {
      actualAmountReceived = targetPayment.quotation_amount - totalPaidBefore;
    }
    
    if (actualAmountReceived <= 0 && totalPaidBefore >= targetPayment.quotation_amount) {
      // Already fully paid, do not process duplicate payments
      return;
    }

    const totalPaid = totalPaidBefore + actualAmountReceived;
    const outstanding = Math.max(0, targetPayment.quotation_amount - totalPaid);
    isFullyPaid = outstanding === 0;
    const resolvedProofUrl = proofUrl || 'https://photocrew-receipts.s3.amazonaws.com/rec-custom.pdf';

    const rPay = await pushUpdate('payments', 'payment_id', targetPayment.payment_id, {
      final_payment_received: targetPayment.final_payment_received + actualAmountReceived,
      balance_due: outstanding,
      payment_date: paymentDate,
      payment_proof_url: resolvedProofUrl,
      payment_status: isFullyPaid ? 'Fully Paid' : 'Partially Paid',
      transaction_id: transactionId || targetPayment.transaction_id || undefined
    });
    if (!rPay?.success) {
      throw new Error("Failed to record payment in database: " + rPay?.error);
    }

    setPayments(prev => {
      const exists = prev.some(p => p.payment_id === targetPayment.payment_id);
      const updatedPayment = {
        ...targetPayment,
        final_payment_received: targetPayment.final_payment_received + actualAmountReceived,
        balance_due: outstanding,
        payment_date: paymentDate,
        payment_proof_url: resolvedProofUrl,
        payment_status: isFullyPaid ? 'Fully Paid' : 'Partially Paid',
        transaction_id: transactionId || targetPayment.transaction_id || undefined
      };
      if (exists) {
        return prev.map(p => p.payment_id === targetPayment.payment_id ? { ...p, ...updatedPayment } : p);
      }
      return [...prev, updatedPayment];
    });

    // Record payment in localStorage history
    const historyKey = `payment_history_${orderId}`;
    const existingHistoryStr = localStorage.getItem(historyKey);
    let historyList = [];
    if (existingHistoryStr) {
      try {
        historyList = JSON.parse(existingHistoryStr);
      } catch (e) {
        console.error("Failed to parse payment history", e);
      }
    } else {
      // If no history exists, and there is advance received, prepopulate with the advance payment!
      if (targetPayment.advance_received > 0) {
        historyList.push({
          date: targetPayment.payment_date || new Date().toISOString(),
          amount: targetPayment.advance_received,
          transactionId: 'ADVANCE-INITIAL',
          paymentMode: 'Bank Transfer',
          updatedBy: 'System',
          notes: 'Initial advance payment'
        });
      }
    }

    // Push the new transaction details
    historyList.push({
      date: new Date().toISOString(), // Use current date/time automatically as requested
      amount: actualAmountReceived,
      transactionId: transactionId || 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      paymentMode: paymentMode || 'UPI',
      updatedBy: currentUserName || 'System',
      notes: paymentNotes || 'Recorded via update payment'
    });

    localStorage.setItem(historyKey, JSON.stringify(historyList));

    // If fully paid, move order status to next transition or check if delivered first.
    // If fully paid AND previous stage was delivered, we can transition stage to Closed!
    const currentOrder = augmentedOrders.find((o) => o.order_id === orderId);
    const currentStage = currentOrder ? currentOrder.current_stage : 'Payment Pending';
    const timestamp = new Date().toISOString();

    if (currentOrder) {
      const nextOutstanding = Math.max(0, currentOrder.balance_amount - actualAmountReceived);
      const rOrd = await pushUpdate('orders', 'order_id', orderId, {
        balance_amount: nextOutstanding,
        updated_by: currentUserName,
        updated_at: timestamp
      });
      if (!rOrd?.success) {
        throw new Error("Failed to update order status: " + rOrd?.error);
      }

      setOrders(prev => prev.map(o => {
        if (o.order_id === orderId) {
          return {
            ...o,
            balance_amount: nextOutstanding,
            updated_by: currentUserName,
            updated_at: timestamp
          };
        }
        return o;
      }));
    }

    logActivity(`Recorded payment of ₹${actualAmountReceived} for Order ${orderId}. Fully paid: ${isFullyPaid}`, 'Finance', orderId, currentStage, currentStage);
  };

  // User Management Admin features
  const addUser = async (name: string, email: string, mobile: string, role: UserRole, active: boolean, password?: string, employee_id?: string) => {
    const newId = crypto.randomUUID ? crypto.randomUUID() : `U-${Math.floor(1000 + Math.random() * 9000)}`;
    const safeEmail = (email && email.trim() !== '') ? email.trim() : `${mobile ? mobile.replace(/[^a-zA-Z0-9]/g, '') : 'user'}_${newId.substring(0,6)}@photocrew.com`;
    const safeUsername = safeEmail.split('@')[0];
    
    const newUser = {
      id: newId,
      name,
      mobile,
      email: safeEmail,
      role,
      active,
      created_at: new Date().toISOString(),
      password,
      username: safeUsername,
      employee_id
    };
    
    // Save to Supabase using pushUpsert
    const dbRes = await pushUpsert('users', { ...newUser, id: mapToDbUserId(newId) });
    if (!dbRes.success) {
      if (dbRes.error && dbRes.error.includes('users_email_key')) {
        throw new Error("This email address is already in use by another user.");
      }
      throw new Error(dbRes.error || "Failed to save user to database");
    }
    
    setUsers((prev) => [...prev, newUser]);
    logActivity(`Added New User Account: ${name} (${role})`, 'UserManagement', newId);
  };

  const signUpUser = async (name: string, username: string, email: string, mobile: string, role: UserRole, password: string) => {
    throw new Error('User registration is disabled. Only pre-configured system accounts are permitted.');
  };

  const editUser = async (id: string, updates: { name: string, email: string, mobile: string, role?: UserRole, active: boolean, employee_id?: string }) => {
    const safeEmail = (updates.email && updates.email.trim() !== '') ? updates.email.trim() : `${updates.mobile ? updates.mobile.replace(/[^a-zA-Z0-9]/g, '') : 'user'}_${id.substring(0,6)}@photocrew.com`;
    const safeUpdates = { ...updates, email: safeEmail };
    
    const dbRes = await pushUpdate('users', 'id', mapToDbUserId(id), safeUpdates);
    if (!dbRes.success) {
      if (dbRes.error && dbRes.error.includes('users_email_key')) {
        throw new Error("This email address is already in use by another user.");
      }
      throw new Error(dbRes.error || "Failed to update user in database");
    }
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...safeUpdates } : u));
    logActivity(`Updated User Account Profile: ${safeUpdates.name}`, 'UserManagement', id);
  };

  const deleteUser = async (id: string) => {
    let targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    
    try {
      const { error } = await supabaseClient.from('users').delete().eq('id', mapToDbUserId(id));
      if (error) throw error;
    } catch (e: any) {
      console.error("Failed to delete from DB", e);
      throw new Error(e.message || "Failed to delete user from database");
    }
    
    setUsers((prev) => prev.filter(u => u.id !== id));
    logActivity(`Deleted User Account: ${targetUser.name}`, 'UserManagement', id);
  };

  const toggleUserStatus = async (id: string) => {
    let targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    const nextActive = !targetUser.active;
    
    const dbRes = await pushUpdate('users', 'id', mapToDbUserId(id), { active: nextActive });
    if (!dbRes.success) {
      throw new Error(dbRes.error || "Failed to update user status in database");
    }
    
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, active: nextActive } : u));
    logActivity(`${nextActive ? 'Activated' : 'Deactivated'} User Account: ${targetUser.name}`, 'UserManagement', id);
  };

  const resetUserPassword = async (id: string, newPassword: string) => {
    let targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    
    const dbRes = await pushUpdate('users', 'id', mapToDbUserId(id), { password: newPassword });
    if (!dbRes.success) {
      throw new Error(dbRes.error || "Failed to reset password in database");
    }
    
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, password: newPassword } : u));
    logActivity(`Reset Password for User account: ${targetUser.name}`, 'UserManagement', id);
  };

  const addStaff = async (member: Omit<Staff, "staff_id">) => {
    const staffId = `STF-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = new Date().toISOString();
    const newStaff: Staff = {
      ...member,
      staff_id: staffId,
      created_by: currentUserName,
      updated_by: currentUserName,
      created_at: timestamp,
      updated_at: timestamp
    };
    setStaff((prev) => [newStaff, ...prev]);
    const res = await pushInsert('operations_staff', newStaff);
    if (res.success) {
      logActivity(`Added Staff Member: ${newStaff.name}`, 'StaffManagement', staffId);
    } else {
      // Revert optimistic update if failed
      setStaff((prev) => prev.filter(s => s.staff_id !== staffId));
      throw new Error(res.error || 'Failed to add staff');
    }
    return res;
  };

  const updateStaff = async (staffId: string, updates: Partial<Staff>) => {
    const prevStaff = [...staff];
    const timestamp = new Date().toISOString();
    const updatedWithMetadata = {
      ...updates,
      updated_by: currentUserName,
      updated_at: timestamp
    };
    setStaff((prev) => prev.map((s) => s.staff_id === staffId ? { ...s, ...updatedWithMetadata } : s));
    const res = await pushUpdate('operations_staff', 'staff_id', staffId, updatedWithMetadata);
    if (res.success) {
      logActivity(`Updated Staff Member details: ${staffId}`, 'StaffManagement', staffId);
    } else {
      // Revert optimistic update if failed
      setStaff(prevStaff);
      throw new Error(res.error || 'Failed to update staff');
    }
    return res;
  };

  const deleteStaff = async (staffId: string) => {
    const prevStaff = [...staff];
    setStaff((prev) => prev.filter((s) => s.staff_id !== staffId));
    try {
      await pushDelete('operations_staff', 'staff_id', staffId);
      logActivity(`Removed Staff Member: ${staffId}`, 'StaffManagement', staffId);
    } catch (err: any) {
      setStaff(prevStaff);
      throw new Error(err.message || 'Failed to delete staff');
    }
  };

  const addProductionStaff = async (member: Omit<Staff, "staff_id">) => {
    const staffId = `STF-${Math.floor(10000 + Math.random() * 90000)}`;
    const timestamp = new Date().toISOString();
    const newStaff: Staff = {
      ...member,
      staff_id: staffId,
      created_by: currentUserName,
      updated_by: currentUserName,
      created_at: timestamp,
      updated_at: timestamp
    };

    setProductionStaff((prev) => [newStaff, ...prev]);

    const dbPayload = await mapProductionStaffToDb(newStaff);
    const res = await pushInsert('production_staff', dbPayload);
    if (res.success) {
      logActivity(`Added Production Staff Member: ${newStaff.name}`, 'StaffManagement', staffId);
    } else {
      setProductionStaff((prev) => prev.filter(s => s.staff_id !== staffId));
      throw new Error(res.error || 'Failed to add production staff');
    }
    return res;
  };

  const updateProductionStaff = async (staffId: string, updates: Partial<Staff>) => {
    const prevStaffList = [...productionStaff];
    const timestamp = new Date().toISOString();
    const updatedWithMetadata = {
      ...updates,
      updated_by: currentUserName,
      updated_at: timestamp
    };

    setProductionStaff((prev) => prev.map((s) => s.staff_id === staffId ? { ...s, ...updatedWithMetadata } : s));

    const dbUpdates = await mapProductionStaffToDb(updatedWithMetadata);
    const res = await pushUpdate('production_staff', 'staff_id', staffId, dbUpdates);
    if (res.success) {
      logActivity(`Updated Production Staff Member details: ${staffId}`, 'StaffManagement', staffId);
    } else {
      setProductionStaff(prevStaffList);
      throw new Error(res.error || 'Failed to update production staff');
    }
    return res;
  };

  const deleteProductionStaff = async (staffId: string) => {
    const prevStaffList = [...productionStaff];
    setProductionStaff((prev) => prev.filter((s) => s.staff_id !== staffId));
    const res = await pushDelete('production_staff', 'staff_id', staffId);
    if (res.success) {
      logActivity(`Deleted Production Staff Member: ${staffId}`, 'StaffManagement', staffId);
    } else {
      setProductionStaff(prevStaffList);
      throw new Error(res.error || 'Failed to delete production staff');
    }
    return res;
  };

  const addEquipment = async (equip: Omit<Equipment, 'equipment_id'>) => {
    const equipmentId = `EQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const newEquip: Equipment = {
      ...equip,
      equipment_id: equipmentId,
      created_at: now,
      updated_at: now,
      created_by: currentUserName || 'System',
      updated_by: currentUserName || 'System',
      available_quantity: equip.available_quantity ?? equip.quantity
    };
    
    // Optimistic Update
    setEquipment((prev) => [newEquip, ...prev]);
    
    const res = await pushInsert('equipment', newEquip);
    if (res.success) {
      logActivity(`Registered New Studio Gear: ${newEquip.equipment_name}`, 'EquipmentManagement', equipmentId);
    } else {
      // Revert if failed
      setEquipment((prev) => prev.filter(e => e.equipment_id !== equipmentId));
      throw new Error(res.error || 'Failed to register equipment');
    }
    return res;
  };

  const updateEquipment = async (equipmentId: string, updates: Partial<Equipment>) => {
    const prevEquipment = [...equipment];
    const now = new Date().toISOString();
    const updatedFields = {
      ...updates,
      updated_at: now,
      updated_by: currentUserName || 'System'
    };

    setEquipment((prev) => prev.map((e) => e.equipment_id === equipmentId ? { ...e, ...updatedFields } : e));
    
    const res = await pushUpdate('equipment', 'equipment_id', equipmentId, updatedFields);
    if (res.success) {
      logActivity(`Updated Studio Gear: ${equipmentId}`, 'EquipmentManagement', equipmentId);
    } else {
      setEquipment(prevEquipment);
      throw new Error(res.error || 'Failed to update equipment');
    }
    return res;
  };

  const deleteEquipment = async (equipmentId: string) => {
    // Check if equipment is assigned
    // In this app, equipment might be linked to equipment_handovers or operations
    // For now, let's just implement the delete with a check if needed by the user
    // The user said: "If equipment is currently assigned to an event, prevent deletion and display a meaningful error message."
    
    const isAssigned = operations.some(op => op.equipment_kit && op.equipment_kit.includes(equipmentId)) || 
                       equipmentHandovers.some(h => h.equipment_name && h.equipment_name.includes(equipmentId) && h.return_status === 'Not Returned');
    
    if (isAssigned) {
      throw new Error("This equipment is currently assigned to an active event or handover and cannot be deleted.");
    }

    const prevEquipment = [...equipment];
    setEquipment((prev) => prev.filter((e) => e.equipment_id !== equipmentId));
    
    const res = await pushDelete('equipment', 'equipment_id', equipmentId);
    if (res.success) {
      logActivity(`De-registered Studio Gear: ${equipmentId}`, 'EquipmentManagement', equipmentId);
    } else {
      setEquipment(prevEquipment);
      throw new Error(res.error || 'Failed to delete equipment');
    }
    return res;
  };

  const addCalendarMemo = async (memo: Omit<CalendarMemo, 'id' | 'created_at' | 'updated_at'>) => {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient.from('calendar_memos').insert([memo]).select().single();
    if (error) {
      console.error('Failed to add memo:', error);
      throw error;
    }
    if (data) {
      setCalendarMemos((prev) => [data, ...prev]);
    }
  };

  const updateCalendarMemo = async (id: string, updates: Partial<CalendarMemo>) => {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient.from('calendar_memos').update(updates).eq('id', id).select().single();
    if (error) {
      console.error('Failed to update memo:', error);
      throw error;
    }
    if (data) {
      setCalendarMemos((prev) => prev.map((m) => m.id === id ? data : m));
    }
  };

  const deleteCalendarMemo = async (id: string) => {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.from('calendar_memos').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete memo:', error);
      throw error;
    }
    setCalendarMemos((prev) => prev.filter((m) => m.id !== id));
  };

  const addPackage = async (pkg: Omit<Package, 'package_id'>) => {
    const package_id = `PKG-${(pkg.category || 'W').substring(0, 1).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
    const newPkg: Package = {
      ...pkg,
      package_id,
      created_at: new Date().toISOString()
    };

    const extraData = {
      category: newPkg.category,
      deliverables: newPkg.deliverables,
      team_members: newPkg.team_members || '',
      seasonal_offer: newPkg.seasonal_offer || '',
      terms_conditions: newPkg.terms_conditions || '',
      event_type: newPkg.event_type || '',
      duration: newPkg.duration || '',
      package_includes: newPkg.package_includes || ''
    };

    const dbPayload = {
      package_id: newPkg.package_id,
      name: newPkg.package_name,
      description: JSON.stringify(extraData),
      price: newPkg.price,
      status: newPkg.status,
      created_at: newPkg.created_at,
      category: newPkg.category
    };

    // 1. Perform Database Schema Validation before the operation
    try {
      await validatePackagesDatabase('INSERT', dbPayload);
    } catch (e) {
      console.error(e);
      throw e;
    }

    try {
      if (supabaseClient) {
        const { error } = await supabaseClient.from('packages').insert(dbPayload);
        if (error) throw error;

        // 2. Post-Save Verification
        const { data: verifyData, error: verifyError } = await supabaseClient.from('packages').select('*').eq('package_id', package_id);
        if (verifyError || !verifyData || verifyData.length === 0) {
          throw new Error(verifyError?.message || 'Record not found after creation');
        }

        const savedRec = verifyData[0];
        if (!savedRec.package_id || !savedRec.name || savedRec.price === null || !savedRec.status || savedRec.description === null) {
          throw new Error('Verification failed: Post-save verification detected NULL required fields.');
        }

        const savedPkg = mapDbRecordToPackage(savedRec);
        
        // Update local React state only after successful post-save verification!
        setPackages((prev) => [savedPkg, ...prev]);

        window.alert('Package Created Successfully');
        logActivity(`Created Package: ${savedPkg.package_name}`, 'Sales', package_id, 'Active', 'Active');
        return package_id;
      } else {
        throw new Error('Supabase client is not initialized.');
      }
    } catch (err: any) {
      console.error(err);
      window.alert(`❌ Database Error\n\nTable: packages\n\nReason: ${err.message || err}`);
      throw err;
    }
  };

  const updatePackage = async (packageId: string, updates: Partial<Package>) => {
    const existing = packages.find(p => p.package_id === packageId);
    if (!existing) {
      const errorMsg = `Package with ID ${packageId} not found in state.`;
      window.alert(errorMsg);
      throw new Error(errorMsg);
    }

    const merged = { ...existing, ...updates };

    const extraData = {
      category: merged.category,
      deliverables: merged.deliverables,
      team_members: merged.team_members || '',
      seasonal_offer: merged.seasonal_offer || '',
      terms_conditions: merged.terms_conditions || '',
      event_type: merged.event_type || '',
      duration: merged.duration || '',
      package_includes: merged.package_includes || ''
    };

    const dbPayload = {
      package_id: packageId,
      name: merged.package_name,
      description: JSON.stringify(extraData),
      price: merged.price,
      status: merged.status,
      created_at: merged.created_at || new Date().toISOString(),
      category: merged.category
    };

    // 1. Perform Database Schema Validation before the operation
    try {
      await validatePackagesDatabase('UPDATE', dbPayload);
    } catch (e) {
      console.error(e);
      throw e;
    }

    try {
      if (supabaseClient) {
        const { error } = await supabaseClient.from('packages').update({
          name: dbPayload.name,
          description: dbPayload.description,
          price: dbPayload.price,
          status: dbPayload.status,
          category: dbPayload.category
        }).eq('package_id', packageId);
        
        if (error) throw error;

        // 2. Post-Save Verification
        const { data: verifyData, error: verifyError } = await supabaseClient.from('packages').select('*').eq('package_id', packageId);
        if (verifyError || !verifyData || verifyData.length === 0) {
          throw new Error(verifyError?.message || 'Record not found after update');
        }

        const savedRec = verifyData[0];
        if (!savedRec.package_id || !savedRec.name || savedRec.price === null || !savedRec.status || savedRec.description === null) {
          throw new Error('Verification failed: Post-save verification detected NULL required fields.');
        }

        const updatedPkg = mapDbRecordToPackage(savedRec);

        // Update local React state only after successful post-save verification!
        setPackages((prev) => prev.map((p) => p.package_id === packageId ? updatedPkg : p));

        window.alert('Package Updated Successfully');
        logActivity(`Updated Package: ${updatedPkg.package_name}`, 'Sales', packageId, 'Active', 'Active');
      } else {
        throw new Error('Supabase client is not initialized.');
      }
    } catch (err: any) {
      console.error(err);
      window.alert(`❌ Database Error\n\nTable: packages\n\nReason: ${err.message || err}`);
      throw err;
    }
  };

  const deletePackage = async (packageId: string) => {
    try {
      if (supabaseClient) {
        const pkg = packages.find(p => p.package_id === packageId);
        const pkgName = pkg ? pkg.package_name : packageId;

        const { error } = await supabaseClient
          .from('packages')
          .delete()
          .eq('package_id', packageId);

        if (error) {
          throw error;
        }

        setPackages((prev) => prev.filter((p) => p.package_id !== packageId));
        logActivity(`Deleted Package: ${pkgName}`, 'Sales', packageId, 'Active', 'Deleted');
      } else {
        throw new Error('Supabase client is not initialized.');
      }
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const addNotification = async (payload: Omit<Notification, 'notification_id' | 'created_at' | 'read_status'> & { notification_id?: string; read_status?: boolean }) => {
    const notification_id = payload.notification_id || `NTF-${6001 + Math.floor(Math.random() * 10000)}`;
    const newNotif: Notification = {
      ...payload,
      notification_id,
      created_at: new Date().toISOString(),
      read_status: payload.read_status ?? false
    };
    
    // Optimistic UI update
    setNotifications((prev) => {
      const exists = prev.some(n => n.notification_id === notification_id);
      if (exists) return prev;
      return [newNotif, ...prev];
    });
    
    // Save to database
    await saveNotificationToSupabase(newNotif);
    // fetchFromDb().catch(console.error); // Disabled to prevent full reload
  };

  const markNotificationRead = async (notificationId: string) => {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => n.notification_id === notificationId ? { ...n, read_status: true, is_read: true, read: true, read_at: now } : n));
    if (!supabaseClient) return;
    
    const { error } = await supabaseClient.from('notifications').update({ read_status: true, is_read: true, read_at: now }).eq('notification_id', notificationId);
    if (error) {
      console.warn("Failed updating notification with all fields, trying fallback:", error);
      await supabaseClient.from('notifications').update({ is_read: true, read_at: now }).eq('notification_id', notificationId);
    }
  };

  const markAllNotificationsRead = async () => {
    const visibleNotifs = notifications.filter(n => {
      if (currentRole !== 'Business Owner') {
        return n.recipient_role === currentRole || n.recipient_role === 'All';
      }
      return true;
    });

    const unreadIds = visibleNotifs.filter(n => !n.read_status).map(n => n.notification_id);
    if (unreadIds.length === 0) return;

    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => unreadIds.includes(n.notification_id) ? { ...n, read_status: true, is_read: true, read: true, read_at: now } : n));

    if (!supabaseClient) return;

    const { error } = await supabaseClient
      .from('notifications')
      .update({ read_status: true, is_read: true, read_at: now })
      .in('notification_id', unreadIds);
    if (error) {
      console.warn("Failed batch update of notifications, trying fallback:", error);
      await supabaseClient
        .from('notifications')
        .update({ is_read: true, read_at: now })
        .in('notification_id', unreadIds);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));

    try {
      const deletedStr = localStorage.getItem('erp_deleted_notifications');
      const deletedIds = deletedStr ? JSON.parse(deletedStr) : [];
      if (!deletedIds.includes(notificationId)) {
        deletedIds.push(notificationId);
        localStorage.setItem('erp_deleted_notifications', JSON.stringify(deletedIds));
      }
    } catch (e) {
      console.warn("Failed to write deleted notification to localStorage:", e);
    }

    if (!supabaseClient) return;

    const { error } = await supabaseClient
      .from('notifications')
      .delete()
      .eq('notification_id', notificationId);
    if (error) {
      console.warn("Failed to delete notification in Supabase:", error);
    }
  };

  const deleteAllReadNotifications = async () => {
    const visibleNotifs = notifications.filter(n => {
      if (currentRole !== 'Business Owner') {
        return n.recipient_role === currentRole || n.recipient_role === 'All';
      }
      return true;
    });

    const readIds = visibleNotifs.filter(n => n.read_status).map(n => n.notification_id);
    if (readIds.length === 0) return;

    setNotifications((prev) => prev.filter((n) => !readIds.includes(n.notification_id)));

    try {
      const deletedStr = localStorage.getItem('erp_deleted_notifications');
      const deletedIds = deletedStr ? JSON.parse(deletedStr) : [];
      readIds.forEach(id => {
        if (!deletedIds.includes(id)) {
          deletedIds.push(id);
        }
      });
      localStorage.setItem('erp_deleted_notifications', JSON.stringify(deletedIds));
    } catch (e) {
      console.warn("Failed to write deleted notifications to localStorage:", e);
    }

    if (!supabaseClient) return;

    const { error } = await supabaseClient
      .from('notifications')
      .delete()
      .in('notification_id', readIds);
    if (error) {
      console.warn("Failed to bulk delete notifications in Supabase:", error);
    }
  };

  const archiveNotification = async (notificationId: string, archiveStatus = true) => {
    setNotifications((prev) => prev.map((n) => n.notification_id === notificationId ? { ...n, is_archived: archiveStatus } : n));

    if (!supabaseClient) return;

    const { error } = await supabaseClient
      .from('notifications')
      .update({ is_archived: archiveStatus })
      .eq('notification_id', notificationId);
    if (error) {
      console.warn("Failed to archive notification in Supabase:", error);
    }
  };

  const addSpeciality = async (name: string) => {
    const id = `SPC-${Math.floor(100 + Math.random() * 900)}`;
    const newSpec: ProductionSpeciality = {
      speciality_id: id,
      name,
      active: true,
      created_at: new Date().toISOString()
    };
    setSpecialities(prev => [newSpec, ...prev]);
    await pushInsert('production_specialties', newSpec);
    logActivity(`Created Role Speciality: ${name}`, 'Production', id);
  };

  const updateSpeciality = async (id: string, name: string) => {
    setSpecialities(prev => prev.map(s => s.speciality_id === id ? { ...s, name } : s));
    await pushUpdate('production_specialties', 'speciality_id', id, { name });
    logActivity(`Updated Speciality to: ${name}`, 'Production', id);
  };

  const deactivateSpeciality = async (id: string, active: boolean) => {
    setSpecialities(prev => prev.map(s => s.speciality_id === id ? { ...s, active } : s));
    await pushUpdate('production_specialties', 'speciality_id', id, { active });
    logActivity(`${active ? 'Activated' : 'Deactivated'} Speciality: ${id}`, 'Production', id);
  };

  const deleteSpeciality = async (id: string) => {
    setSpecialities(prev => prev.filter(s => s.speciality_id !== id));
    await pushDelete('production_specialties', 'speciality_id', id);
    logActivity(`Deleted Speciality: ${id}`, 'Production', id);
  };

  const assignEditorToProject = async (assignment: Omit<EditorAssignment, 'assignment_id' | 'status' | 'assigned_date'>) => {
    const id = `EDR-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAssign: EditorAssignment = {
      ...assignment,
      assignment_id: id,
      status: 'Assigned',
      assigned_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    setEditorAssignments(prev => [newAssign, ...prev]);
    await pushInsert('editor_assignments', newAssign);
    logActivity(`Assigned Editor: ${assignment.staff_name} as ${assignment.speciality}`, 'Production', id);
    
    const prodProj = augmentedProduction.find(p => p.production_id === assignment.production_id);
    if (prodProj) {
      const currentAssigned = prodProj.assigned_staff ? prodProj.assigned_staff.split(', ') : [];
      if (!currentAssigned.includes(assignment.staff_name)) {
        currentAssigned.push(assignment.staff_name);
        const updatedStaff = currentAssigned.join(', ');
        updateProduction(assignment.production_id, {
          assigned_staff: updatedStaff,
          editor_assigned: assignment.staff_name, // keep the latest assigned as the main editor_assigned
          production_status: 'Editor Assigned'
        });
      }
    }
  };

  const updateEditorAssignmentStatus = async (assignmentId: string, status: EditorAssignment['status']) => {
    let targetAssignment: EditorAssignment | undefined;
    
    setEditorAssignments(prev => {
      const updated = prev.map(a => {
        if (a.assignment_id === assignmentId) {
          targetAssignment = { ...a, status };
          return targetAssignment;
        }
        return a;
      });
      localStorage.setItem('erp_editor_assignments', JSON.stringify(updated));
      return updated;
    });

    await pushUpdate('editor_assignments', 'assignment_id', assignmentId, { status });
    logActivity(`Updated Editor Task ${assignmentId} status to: ${status}`, 'Production', assignmentId);
    
    // Defer reading the up-to-date assignment list to correctly calculate and push production updates
    setTimeout(() => {
      setEditorAssignments(currentAssignments => {
        const assignment = currentAssignments.find(a => a.assignment_id === assignmentId);
        if (assignment) {
          const prodId = assignment.production_id;
          const allTasks = currentAssignments.filter(t => t.production_id === prodId);
          
          const completedTasks = allTasks.filter(t => t.status === 'Completed' || t.status === 'Editing Complete' || t.status === 'Editing Completed').length;
          const totalTasks = allTasks.length;
          const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          const prodObj = (production || []).find(p => p.production_id === prodId);
          const baseStatus = prodObj?.editing_status || 'Raw Footage Received';

          let nextEditingStatus: EditingStatus | undefined = undefined;
          
          // Do not override terminal statuses
          if (!['Completed', 'Closed', 'Client Acceptance', 'Project Closed', 'Order Closed', 'Final Approval'].includes(baseStatus)) {
            if (totalTasks > 0) {
              const getTaskStageRank = (st: string, driveLink?: string) => {
                const s = st || '';
                if (['Client Acceptance'].includes(s)) return 5;
                if (['Completed', 'Editing Completed', 'Editing Complete'].includes(s)) return 4;
                if (['Customer Review', 'Client Review', 'Client Review Sent'].includes(s) || (driveLink && driveLink.trim() !== '')) return 3;
                if (['Editing Started', 'In Progress', 'Editing In Progress'].includes(s)) return 2;
                if (['Assigned Editor', 'Editor Assigned', 'Assigned'].includes(s)) return 1;
                return 0;
              };

              const ranks = allTasks.map(t => getTaskStageRank(t.status, t.edited_drive_link));
              const minRank = Math.min(...ranks);

              if (minRank >= 5) {
                nextEditingStatus = 'Client Acceptance' as any;
              } else if (minRank >= 4) {
                nextEditingStatus = 'Editing Completed' as any;
              } else if (minRank >= 3) {
                nextEditingStatus = 'Customer Review' as any;
              } else if (minRank >= 2) {
                nextEditingStatus = 'Editing Started' as any;
              } else if (minRank >= 1) {
                nextEditingStatus = 'Assigned Editor' as any;
              }
            }
          }
          
          const updates: Partial<Omit<Production, 'production_id' | 'tracking_id'>> = {
            editing_progress: `${progressPercent}%`,
            remarks: `Task updated: ${assignment.staff_name} (${assignment.speciality}) marked status to ${status}. Total Project Tasks Progress: ${progressPercent}%.`
          };
          
          if (nextEditingStatus) {
            updates.editing_status = nextEditingStatus;
          }
          
          updateProduction(prodId, updates);
        }
        return currentAssignments;
      });
    }, 50);
  };

  const deleteEditorAssignment = async (assignmentId: string) => {
    setEditorAssignments(prev => prev.filter(a => a.assignment_id !== assignmentId));
    await pushDelete('editor_assignments', 'assignment_id', assignmentId);
    logActivity(`Removed Editor Task Assignment: ${assignmentId}`, 'Production', assignmentId);
  };

  const addQuotation = async (newQuote: any): Promise<string> => {
    if (!supabaseClient) {
      setQuotations((prev) => {
        const next = [newQuote, ...prev];
        localStorage.setItem('erp_quotations', JSON.stringify(next));
        return next;
      });
      return newQuote.quotation_number;
    }

    // Verify logged-in user is authenticated
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser();
    if (userErr || !userData?.user) {
      console.warn("User is not authenticated. Cannot insert quotation.");
      throw new Error("You must be logged in to generate a quotation.");
    }

    // 1. Try to invoke the database-side atomic upsert function
    try {
      const rpcPayload = {
        p_quotation_id: newQuote.quotation_id,
        p_lead_id: newQuote.lead_id,
        p_package_name: newQuote.package_name,
        p_package_price: Number(newQuote.package_price || 0),
        p_quotation_amount: Number(newQuote.quotation_amount || 0),
        p_discount_amount: Number(newQuote.discount_amount || 0),
        p_additional_services_cost: Number(newQuote.additional_services_cost || 0),
        p_final_amount: Number(newQuote.final_amount || 0),
        p_tax_amount: Number(newQuote.tax_amount || 0),
        p_quotation_status: newQuote.quotation_status,
        p_generated_date: newQuote.generated_date || new Date().toISOString().split('T')[0],
        p_created_by: newQuote.created_by || userData.user.email || 'Sales Team',
        p_terms_conditions: newQuote.terms_conditions || '',
        p_deliverables_description: newQuote.deliverables_description || '',
        p_notes_special_customizations: newQuote.notes_special_customizations || '',
        p_client_residence_address: newQuote.client_residence_address || '',
        p_city: newQuote.city || '',
        p_state: newQuote.state || '',
        p_pincode: newQuote.pincode || '',
        p_desired_event_shoot_type: newQuote.desired_event_shoot_type || '',
        p_customer_id: newQuote.customer_id || '',
        p_customer_name: newQuote.customer_name || '',
        p_order_id: newQuote.order_id || '',
        p_pdf_url: newQuote.pdf_url || '',
        p_whatsapp_sent_status: !!newQuote.whatsapp_sent_status,
        p_viewed_status: !!newQuote.viewed_status,
        p_sales_staff_name: newQuote.sales_staff_name || '',
        p_sales_staff_mobile: newQuote.sales_staff_mobile || '',
        p_editable_inclusions: newQuote.editableInclusions || null,
        p_editable_deliverables: newQuote.editableDeliverables || null
      };

      console.log("Invoking atomic database transaction: upsert_quotation RPC...", rpcPayload);
      const { data, error } = await supabaseClient.rpc('upsert_quotation', rpcPayload);

      if (!error && data && data.length > 0) {
        const result = data[0];
        const finalQuoteId = result.r_quotation_id || newQuote.quotation_id;
        const finalQuoteNum = result.r_quotation_number || newQuote.quotation_number;
        const action = result.r_action || 'INSERT';

        console.log(`✔ Database transaction succeeded via RPC [Action: ${action}]! Final Quote Number: ${finalQuoteNum}`);

        const finalQuoteObj = {
          ...newQuote,
          quotation_id: finalQuoteId,
          quotation_number: finalQuoteNum,
          updated_at: new Date().toISOString()
        };

        setQuotations((prev) => {
          let next;
          if (action === 'UPDATE') {
            next = prev.map((q) => q.quotation_id === finalQuoteId || q.lead_id === newQuote.lead_id ? finalQuoteObj : q);
          } else {
            next = [finalQuoteObj, ...prev.filter(q => q.lead_id !== newQuote.lead_id)];
          }
          localStorage.setItem('erp_quotations', JSON.stringify(next));
          return next;
        });

        logActivity(
          `${action === 'UPDATE' ? 'Updated' : 'Generated'} Quotation: ${finalQuoteNum}`, 
          'Sales', 
          newQuote.lead_id, 
          'N/A', 
          `Quotation ${action === 'UPDATE' ? 'Updated' : 'Generated'}`
        );

        return finalQuoteNum;
      } else if (error) {
        // If it's a 404 (method not found), we fall back gracefully to the safe client-side check. Otherwise log warning.
        if (error.code !== 'P0001' && !error.message.includes('function') && !error.message.includes('404')) {
          console.warn("RPC call failed with database-level error:", error);
          throw new Error(`Database transaction failed: ${error.message}`);
        }
        console.info("RPC upsert_quotation not found or not yet applied. Falling back to progressive enhancement client check...");
      }
    } catch (rpcErr: any) {
      if (rpcErr.message && rpcErr.message.includes('Database transaction failed')) {
        throw rpcErr;
      }
      console.warn("Exception during RPC check, falling back to safe local check:", rpcErr);
    }

    // 2. Safe Progressive Fallback: Retrieve existing quotation directly from DB
    console.log("Running safe fallback: checking for existing quotation for Lead ID:", newQuote.lead_id);
    const { data: dbExisting, error: checkErr } = await supabaseClient
      .from('quotations')
      .select('quotation_id, quotation_number')
      .eq('lead_id', newQuote.lead_id)
      .maybeSingle();

    if (checkErr) {
      console.warn("Error running safe db check:", checkErr.message);
    }

    const standardPayload = {
      lead_id: newQuote.lead_id,
      quotation_amount: newQuote.quotation_amount,
      discount_amount: newQuote.discount_amount,
      tax_amount: newQuote.tax_amount || 0,
      final_amount: newQuote.final_amount,
      quotation_status: newQuote.quotation_status,
      valid_until: newQuote.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      terms_conditions: newQuote.terms_conditions || '',
      updated_at: new Date().toISOString(),
      package_name: newQuote.package_name,
      package_price: newQuote.package_price,
      deliverables_description: newQuote.deliverables_description,
      notes_special_customizations: newQuote.notes_special_customizations,
      additional_services_cost: newQuote.additional_services_cost,
      client_residence_address: newQuote.client_residence_address,
      city: newQuote.city,
      state: newQuote.state,
      pincode: newQuote.pincode,
      desired_event_shoot_type: newQuote.desired_event_shoot_type,
      customer_id: newQuote.customer_id,
      customer_name: newQuote.customer_name,
      order_id: newQuote.order_id,
      pdf_url: newQuote.pdf_url,
      whatsapp_sent_status: !!newQuote.whatsapp_sent_status,
      viewed_status: !!newQuote.viewed_status,
      generated_date: newQuote.generated_date,
      sales_staff_name: newQuote.sales_staff_name || '',
      sales_staff_mobile: newQuote.sales_staff_mobile || '',
      editableInclusions: newQuote.editableInclusions || null,
      editableDeliverables: newQuote.editableDeliverables || null
    };

    if (dbExisting) {
      console.log(`Fallback Match: Found existing quotation ${dbExisting.quotation_number}. Performing UPDATE.`);
      
      const { error: updateErr } = await supabaseClient
        .from('quotations')
        .update(standardPayload)
        .eq('quotation_id', dbExisting.quotation_id);

      if (updateErr) {
        throw new Error(`Failed to update existing quotation in database: ${updateErr.message}`);
      }

      const finalQuoteObj = {
        ...newQuote,
        quotation_id: dbExisting.quotation_id,
        quotation_number: dbExisting.quotation_number,
        updated_at: new Date().toISOString()
      };

      setQuotations((prev) => {
        const next = prev.map((q) => q.quotation_id === dbExisting.quotation_id || q.lead_id === newQuote.lead_id ? finalQuoteObj : q);
        localStorage.setItem('erp_quotations', JSON.stringify(next));
        return next;
      });

      logActivity(`Updated Quotation: ${dbExisting.quotation_number}`, 'Sales', newQuote.lead_id, 'N/A', 'Quotation Updated');
      return dbExisting.quotation_number;
    } else {
      console.log(`Fallback Match: No existing quotation found. Performing INSERT.`);
      
      const insertPayload = {
        ...standardPayload,
        quotation_id: newQuote.quotation_id,
        quotation_number: newQuote.quotation_number, // Trigger will override if sequence is applied
        created_by: newQuote.created_by || userData.user.email || 'Sales Team',
        created_at: newQuote.created_at || new Date().toISOString()
      };

      const { error: insertErr } = await supabaseClient
        .from('quotations')
        .insert(insertPayload);

      if (insertErr) {
        // Double check if there was a duplicate race condition error on quotation_number
        if (insertErr.message.includes('unique constraint') || insertErr.code === '23505') {
          console.warn("Detected constraint race condition on insert. Fetching newly created quotation row...");
          const { data: dbFresh } = await supabaseClient
            .from('quotations')
            .select('quotation_id, quotation_number')
            .eq('lead_id', newQuote.lead_id)
            .maybeSingle();

          if (dbFresh) {
            const finalQuoteObj = {
              ...newQuote,
              quotation_id: dbFresh.quotation_id,
              quotation_number: dbFresh.quotation_number,
              updated_at: new Date().toISOString()
            };
            setQuotations((prev) => {
              const next = [finalQuoteObj, ...prev.filter(q => q.lead_id !== newQuote.lead_id)];
              localStorage.setItem('erp_quotations', JSON.stringify(next));
              return next;
            });
            return dbFresh.quotation_number;
          }
        }
        throw new Error(`Failed to save new quotation to database: ${insertErr.message}`);
      }

      setQuotations((prev) => {
        const next = [newQuote, ...prev.filter(q => q.lead_id !== newQuote.lead_id)];
        localStorage.setItem('erp_quotations', JSON.stringify(next));
        return next;
      });

      logActivity(`Generated Quotation: ${newQuote.quotation_number}`, 'Sales', newQuote.lead_id, 'N/A', 'Quotation Generated');
      return newQuote.quotation_number;
    }
  };

  const updateQuotation = async (quotationId: string, updates: Partial<any>) => {
    let updatedQuote: any = null;
    
    setQuotations((prev) => {
      const next = prev.map((q) => {
        if (q.quotation_id === quotationId) {
          updatedQuote = { ...q, ...updates, updated_at: new Date().toISOString() };
          return updatedQuote;
        }
        return q;
      });
      localStorage.setItem('erp_quotations', JSON.stringify(next));
      return next;
    });

    setTimeout(async () => {
      if (!updatedQuote) return;
      if (!supabaseClient) return;

      let cleanTerms = updatedQuote.terms_conditions || '';
      if (cleanTerms.includes('\n\nMETADATA:')) {
        cleanTerms = cleanTerms.split('\n\nMETADATA:')[0];
      } else if (cleanTerms.includes('METADATA:')) {
        cleanTerms = cleanTerms.split('METADATA:')[0];
      }
      
      const standardPayload = {
        quotation_status: updatedQuote.quotation_status,
        terms_conditions: cleanTerms,
        package_name: updatedQuote.package_name,
        package_price: updatedQuote.package_price,
        deliverables_description: updatedQuote.deliverables_description,
        notes_special_customizations: updatedQuote.notes_special_customizations,
        discount_amount: updatedQuote.discount_amount,
        additional_services_cost: updatedQuote.additional_services_cost,
        quotation_amount: updatedQuote.quotation_amount,
        tax_amount: updatedQuote.tax_amount || 0,
        final_amount: updatedQuote.final_amount,
        client_residence_address: updatedQuote.client_residence_address,
        city: updatedQuote.city,
        state: updatedQuote.state,
        pincode: updatedQuote.pincode,
        desired_event_shoot_type: updatedQuote.desired_event_shoot_type,
        updated_at: new Date().toISOString(),
        customer_id: updatedQuote.customer_id,
        customer_name: updatedQuote.customer_name,
        order_id: updatedQuote.order_id,
        pdf_url: updatedQuote.pdf_url,
        whatsapp_sent_status: updatedQuote.whatsapp_sent_status,
        viewed_status: updatedQuote.viewed_status,
        generated_date: updatedQuote.generated_date,
        sales_staff_name: updatedQuote.sales_staff_name || '',
        sales_staff_mobile: updatedQuote.sales_staff_mobile || '',
        editableInclusions: updatedQuote.editableInclusions || null,
        editableDeliverables: updatedQuote.editableDeliverables || null
      };

      try {
        const { error } = await supabaseClient.from('quotations').update(standardPayload).eq('quotation_id', quotationId);
        if (error) {
          console.warn('Supabase Update error for quotations table:', error.message);
        }
      } catch (err) {
        console.warn('Supabase Exception on updating quotation:', err);
      }
    }, 10);
  };

  const addEquipmentHandover = async (handover: Omit<EquipmentHandover, 'handover_id'>) => {
    const handoverId = `HND-${Math.floor(1000 + Math.random() * 9000)}`;
    const newHandover: EquipmentHandover = {
      ...handover,
      handover_id: handoverId,
      created_at: new Date().toISOString()
    };
    setEquipmentHandovers(prev => [newHandover, ...prev]);
    await pushInsert('equipment_handovers', newHandover);
    // fetchFromDb().catch(console.error); // Disabled to prevent full reload
    logActivity(`Registered Equipment Handover status for ${handover.equipment_name}: ${handover.return_status}`, 'Operations', handover.order_id);
  };

  const addEquipmentHandovers = async (handovers: Omit<EquipmentHandover, 'handover_id'>[]) => {
    const newHandovers: EquipmentHandover[] = handovers.map((h, index) => ({
      ...h,
      handover_id: `HND-${Math.floor(1000 + Math.random() * 9000)}-${index}`,
      created_at: new Date().toISOString()
    }));
    setEquipmentHandovers(prev => [...newHandovers, ...prev]);
    for (const h of newHandovers) {
      await pushInsert('equipment_handovers', h);
      logActivity(`Registered Equipment Handover status for ${h.equipment_name}: ${h.return_status}`, 'Operations', h.order_id);
    }
    // fetchFromDb().catch(console.error); // Disabled to prevent full reload
  };

  const addLeadEquipmentHistory = async (history: Omit<LeadEquipmentHistory, 'id'>) => {
    const res = await pushInsert('lead_equipment_history', history);
    if (!res.success) {
      console.error('Error adding lead equipment history:', res.error);
      throw new Error(res.error || 'Failed to insert lead equipment history');
    }
    setLeadEquipmentHistory(prev => [{ ...history, id: `LEH-${Date.now()}-${Math.floor(Math.random()*1000)}` } as LeadEquipmentHistory, ...prev]);
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    if (!leadId || typeof leadId !== 'string' || leadId.trim() === '') {
      throw new Error('lead_id is missing or invalid.');
    }

    const prevLead = leads.find(l => l.lead_id === leadId);
    if (supabaseClient) {
      try {
        const { data: dbLead, error: dbLeadErr } = await supabaseClient.from('leads').select('lead_id').eq('lead_id', leadId).maybeSingle();
        if (dbLeadErr) {
          console.warn(`Failed to check if lead exists in 'leads' table: ${dbLeadErr.message}`);
        }
        if (!dbLead && !prevLead) {
          console.warn(`Lead record with ID "${leadId}" was not found in 'leads' table, applying update locally.`);
        }
      } catch (checkErr: any) {
        console.warn(`Lead existence check skipped or failed:`, checkErr?.message || checkErr);
      }
    } else if (!prevLead) {
      console.warn(`Lead record with ID "${leadId}" was not found in local cache.`);
    }

    const timestamp = new Date().toISOString();
    const finalUpdates = { ...updates };
    
    let updatedEvents: LeadEvent[] | undefined;
    if ('events' in finalUpdates) {
      updatedEvents = finalUpdates.events;
      const notesToUse = finalUpdates.notes_special_customizations !== undefined 
        ? finalUpdates.notes_special_customizations 
        : (prevLead?.notes_special_customizations || '');
      // Serialize events to notes_special_customizations to prevent losing them during local cache updates or db falls
      finalUpdates.notes_special_customizations = serializeLeadEvents(updatedEvents || [], deserializeLeadEvents(notesToUse).notes);
      delete finalUpdates.events;
    }
    
    // Ensure total_pax and reference_source are always included in the update payload to satisfy validation
    if (prevLead) {
      if (!('total_pax' in finalUpdates)) {
        finalUpdates.total_pax = prevLead.total_pax || 0;
      }
      if (!('reference_source' in finalUpdates)) {
        finalUpdates.reference_source = prevLead.reference_source || '';
      }
    } else {
      if (!('total_pax' in finalUpdates)) {
        finalUpdates.total_pax = 0;
      }
      if (!('reference_source' in finalUpdates)) {
        finalUpdates.reference_source = '';
      }
    }
    
    const oldStatus = prevLead ? (prevLead.current_status || prevLead.status || 'New Lead') : 'New Lead';
    
    const anyStatus = finalUpdates.status || finalUpdates.current_status;
    if (anyStatus) {
      finalUpdates.status = anyStatus as CurrentStage;
      finalUpdates.current_status = anyStatus;
    }
    const res = await pushUpdate('leads', 'lead_id', leadId, { ...finalUpdates, updated_at: timestamp });
    if (!res?.success) {
      throw new Error(res?.error || "Failed to update lead in database.");
    }

    if (updatedEvents) {
      // 1. Load existing events from DB
      const { data: existingEvents, error: fetchErr } = await supabaseClient.from('lead_events').select('id').eq('lead_id', leadId);
      if (fetchErr) {
        throw new Error(`Failed to fetch existing events: ${fetchErr.message}`);
      }
      
      const existingIds = existingEvents?.map(e => String(e.id)) || [];
      const incomingIds = updatedEvents.map(e => e.id).filter(id => id && !id.startsWith('EV-'));

      // 2. Delete removed events
      const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
      if (idsToDelete.length > 0) {
        for (const idToDelete of idsToDelete) {
          const delRes = await pushDelete('lead_events', 'id', idToDelete);
          if (!delRes.success) {
            throw new Error(`Failed to delete removed event: ${delRes.error}`);
          }
        }
      }

      // 3. Upsert (Insert new, Update existing)
      for (const ev of updatedEvents) {
        const isNew = !ev.id || ev.id.startsWith('EV-');
        
        const eventPayload = {
          lead_id: leadId,
          event_type: ev.event_type || '',
          event_name: ev.event_name || '',
          event_shoot_type: ev.event_shoot_type || '',
          event_date: ev.event_date || '',
          event_start_time: ev.event_start_time || '',
          event_end_time: ev.event_end_time || '',
          event_end_date: ev.event_end_date || (ev as any).Event_End_Date || null,
          event_location: ev.event_location || '',
          google_maps_link: ev.google_maps_link || '',
          guest_pax: String(ev.guest_pax) !== '' && ev.guest_pax != null ? Number(ev.guest_pax) : null,
          staff_pax: String(ev.staff_pax) !== '' && ev.staff_pax != null ? Number(ev.staff_pax) : null,
          assigned_staff_names: ev.assigned_staff_names || '',
          assigned_staff_mobiles: ev.assigned_staff_mobiles || '',
          reporting_date: ev.reporting_date || null,
          reporting_time: ev.reporting_time || null
        };

        if (isNew) {
          const insRes = await pushInsert('lead_events', eventPayload);
          if (!insRes.success) throw new Error(`Failed to insert new event: ${insRes.error}`);
        } else {
          const updRes = await pushUpdate('lead_events', 'id', ev.id, eventPayload);
          if (!updRes.success) throw new Error(`Failed to update existing event: ${updRes.error}`);
        }
      }
    }
    
    setLeads((prev) =>
      prev.map((ld) => {
        if (ld.lead_id === leadId) {
          const updated = {
            ...ld,
            ...finalUpdates,
            updated_at: timestamp
          };
          const parsed = deserializeLeadEvents(updated.notes_special_customizations);
          updated.events = parsed.events;
          return updated;
        }
        return ld;
      })
    );

    const newStatus = finalUpdates.current_status;
    if (newStatus && newStatus !== oldStatus) {
      const linkedOrder = orders.find(o => o.lead_id === leadId);
      const orderId = linkedOrder?.order_id || null;

      if (newStatus === 'Order Confirmed' && !orderId) {
        throw new Error(`"order_id" is required for "Order Confirmed" status, but it was not found or is missing.`);
      }
      
      const roleParts = (currentUserName && currentUserName.includes('|')) 
        ? currentUserName.split('|') 
        : [currentUserName || 'System', currentRole || 'System'];
      const changedBy = roleParts[0];
      const changedByRole = roleParts[1] || currentRole || 'System';
      
      const newHist = {
        lead_id: leadId,
        order_id: orderId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedBy,
        changed_by_role: changedByRole,
        remarks: finalUpdates.remarks || 'Status updated from CRM',
        created_at: timestamp
      };

      const resHist = await pushInsert('lead_status_history', newHist);
      if (!resHist?.success) {
        throw new Error(`"lead_status_history" insert failed. Error: ${resHist?.error || "Unknown error"}`);
      }
      setStatusHistory(prev => [...prev, newHist]);
    }

    
    return res;
  };

  const [unlockedRecords, setUnlockedRecords] = useState<UnlockOverride[]>(() => {
    const saved = localStorage.getItem('erp_unlocked_records');
    return saved ? JSON.parse(saved) : [];
  });

  const getLeadCurrentStatus = (lead: Lead): string => {
    let rawStatus = lead.current_status || lead.status || 'Create Quote';

    if (rawStatus === 'New Lead') {
      return 'Create Quote';
    }

    if (rawStatus === 'Created Quotation' || rawStatus === 'Create Quote') {
      return 'Create Quote';
    }

    if (rawStatus === 'Lost Lead' || rawStatus === 'Lead Lost') {
      return 'Lead Lost';
    }

    if (rawStatus === 'Order Confirmed' || rawStatus === 'Confirm Order') {
      return 'Confirm Order';
    }

    // Automatically transition Quote Sent -> Quote Follow-up if follow-up date/time reached
    if (rawStatus === 'Quote Sent' || rawStatus === 'Quotation Sent') {
      if (isFollowUpDateTimeReached(lead)) {
        return 'Quote Follow-up';
      }
      return 'Quote Sent';
    }

    return rawStatus;
  };

  const getLeadCurrentStage = (lead: Lead): 'Sales' | 'Operations' | 'Production' | 'Completed' => {
    const status = getLeadCurrentStatus(lead);
    
    const salesStatuses = ['New Lead', 'Contacted', 'Follow Up', 'Follow-up', 'Quote Sent', 'Quotation Sent', 'Quote Follow-up', 'Negotiation'];
    const opsStatuses = ['Confirm Order', 'Order Confirmed', 'New Order Received', 'Operations Assigned', 'Assigned Crew', 'Staff Assigned', 'Event Scheduled', 'Event Started', 'Event Start', 'Event Ended', 'Event End', 'Event Completed', 'Event Complete', 'Footage Handover', 'Equipment Handover', 'Verified Footage', 'Footage Handover Verified', 'Raw Footage Received', 'Event Cancelled'];
    const prodStatuses = ['Assigned Editor', 'Editor Assigned', 'Editing Started', 'Editing In Progress', 'Internal QC Review', 'Customer Review', 'Client Review Sent', 'Internal Review', 'Client Review', 'Revision Required', 'Revision In Progress', 'Revision', 'Client Acceptance', 'Final Approval', 'Approved', 'Ready for Delivery'];
    
    if (status === 'Delivered' || status === 'Completed' || status === 'Closed' || status === 'Project Closed' || status === 'Project Delivered') return 'Completed';
    if (prodStatuses.includes(status)) return 'Production';
    if (opsStatuses.includes(status)) return 'Operations';
    return 'Sales';
  };

  // RBAC Helper: Define allowed statuses per department
  const getDepartmentForStage = (stage: CurrentStage): Department | undefined => {
    for (const [dept, stages] of Object.entries(DEPARTMENT_STAGES)) {
      if (stages.includes(stage)) return dept as Department;
    }
    return undefined;
  };

  const isDepartmentAllowedToEdit = (role: UserRole, stage: CurrentStage): boolean => {
    const userDepts = ROLE_DEPARTMENT_MAP[role] || [];
    return Object.entries(DEPARTMENT_STAGES).some(([dept, stages]) => {
      return stages.includes(stage) && userDepts.includes(dept as Department);
    });
  };

  const unlockRecord = (recordId: string, module: 'Sales' | 'Operations' | 'Production', reason: string) => {
    const newUnlock: UnlockOverride = {
      recordId,
      unlockedBy: currentUserName || 'Business Owner',
      unlockDate: new Date().toISOString(),
      reason,
      module
    };
    const updated = [...unlockedRecords, newUnlock];
    setUnlockedRecords(updated);
    localStorage.setItem('erp_unlocked_records', JSON.stringify(updated));

    logActivity(`Unlocked ${module} Record for ${recordId}. Reason: ${reason}`, 'UserManagement', recordId);
    
    // Add a specific log log entry to activity logs if needed, also can trigger refresh
    // fetchFromDb().catch(console.error); // Disabled to prevent full reload
  };

  const lockRecord = (recordId: string, module: 'Sales' | 'Operations' | 'Production') => {
    const updated = unlockedRecords.filter(r => !(r.recordId === recordId && r.module === module));
    setUnlockedRecords(updated);
    localStorage.setItem('erp_unlocked_records', JSON.stringify(updated));

    logActivity(`Locked ${module} Record for ${recordId}`, 'UserManagement', recordId);
  };

  const isRecordLocked = (recordId: string, module: 'Sales' | 'Operations' | 'Production'): boolean => {
    const override = unlockedRecords.find(r => r.recordId === recordId && r.module === module);
    if (override) {
      return false;
    }

    if (module === 'Sales') {
      const lead = leads.find(l => l.lead_id === recordId);
      if (!lead) return false;
      const salesStages = ['New Lead', 'Contacted', 'Follow Up', 'Follow-up', 'Quotation Sent', 'Negotiation', 'Lost Lead'];
      return !salesStages.includes(lead.status);
    }

    if (module === 'Operations') {
      let orderId = recordId;
      const op = operations.find(o => o.operation_id === recordId || o.order_id === recordId);
      if (op) {
        orderId = op.order_id;
      }
      const order = augmentedOrders.find(o => o.order_id === orderId);
      if (!order) {
        const lead = leads.find(l => l.lead_id === recordId);
        if (lead && lead.status === 'Raw Footage Received') return true;
        return false;
      }
      const preRawFootageStages = [
        'New Lead', 'Follow Up', 'Quotation Sent', 'Negotiation', 'Confirm Order', 'Order Confirmed',
        'New Order Received', 'Operations Assigned', 'Assigned Crew', 'Event Scheduled', 'Staff Assigned', 'Event Started', 'Event Completed',
        'Footage Handover Verified', 'Raw Footage Received'
      ];
      return !preRawFootageStages.includes(order.current_stage);
    }

    if (module === 'Production') {
      const prodItem = augmentedProduction.find(p => p.production_id === recordId || p.tracking_id === recordId);
      if (!prodItem) {
        const order = augmentedOrders.find(o => o.order_id === recordId);
        if (order) {
          return order.current_stage === 'Project Closed' || order.current_stage === 'Completed' || order.current_stage === 'Closed';
        }
        const lead = leads.find(l => l.lead_id === recordId);
        if (lead) {
          return lead.status === 'Project Closed' || lead.status === 'Completed' || lead.status === 'Closed';
        }
        return false;
      }
      return prodItem.production_status === 'Closed';
    }

    return false;
  };

  const deleteOrderCommon = async (orderId: string, showAlert: boolean): Promise<boolean> => {
    if (!supabaseClient) return false;
    try {
      // 1. Delete associated payments
      await supabaseClient.from('payments').delete().eq('order_id', orderId);
      // 2. Delete associated operations
      await supabaseClient.from('operations').delete().eq('order_id', orderId);
      // 3. Delete associated staff assignments
      await supabaseClient.from('staff_assignments').delete().eq('order_id', orderId);

      // 4. Delete associated raw footage & production & editor assignments
      const { data: linkedFootage } = await supabaseClient.from('raw_footage').select('tracking_id').eq('order_id', orderId);
      if (linkedFootage && linkedFootage.length > 0) {
        const trackingIds = linkedFootage.map(rf => rf.tracking_id);
        
        // Find production IDs
        const { data: linkedProduction } = await supabaseClient.from('production').select('production_id').in('tracking_id', trackingIds);
        if (linkedProduction && linkedProduction.length > 0) {
          const prodIds = linkedProduction.map(p => p.production_id);
          // Delete editor assignments
          await supabaseClient.from('editor_assignments').delete().in('production_id', prodIds);
          // Delete production rows
          await supabaseClient.from('production').delete().in('production_id', prodIds);
        }
        // Delete raw footage rows
        await supabaseClient.from('raw_footage').delete().eq('order_id', orderId);
      }

      // Delete order-related history
      await supabaseClient.from('lead_status_history').delete().eq('order_id', orderId);
      await supabaseClient.from('lead_staff_assignment_history').delete().eq('order_id', orderId);
      await supabaseClient.from('lead_equipment_history').delete().eq('order_id', orderId);
      await supabaseClient.from('lead_editor_assignment_history').delete().eq('order_id', orderId);

      // Delete the order itself
      const { error } = await supabaseClient.from('orders').delete().eq('order_id', orderId);
      if (error) throw error;

      // 2. Update React states
      setOrders(prev => prev.filter(o => o.order_id !== orderId));
      setPayments(prev => prev.filter(p => p.order_id !== orderId));
      setOperations(prev => prev.filter(op => op.order_id !== orderId));
      setStaffAssignments(prev => prev.filter(sa => sa.order_id !== orderId));
      
      if (linkedFootage && linkedFootage.length > 0) {
        const trackingIds = linkedFootage.map(rf => rf.tracking_id);
        setRawFootage(prev => prev.filter(rf => rf.order_id !== orderId));
        setProduction(prev => prev.filter(p => !trackingIds.includes(p.tracking_id)));
      }

      // Clean up local fallback storage
      const localKey = 'erp_local_orders';
      const existingLocalStr = localStorage.getItem(localKey);
      if (existingLocalStr) {
        const localRecords = JSON.parse(existingLocalStr);
        const filtered = localRecords.filter((r: any) => r.order_id !== orderId);
        localStorage.setItem(localKey, JSON.stringify(filtered));
      }

      if (showAlert) {
        alert('Order and all associated operational records deleted successfully!');
      }
      logActivity(`Deleted Order: ${orderId}`, 'Sales', orderId);
      // fetchFromDb().catch(console.error); // Disabled to prevent full reload
      return true;
    } catch (err: any) {
      console.error('Failed to delete order:', err);
      if (showAlert) {
        alert(`Error deleting order: ${err.message || err}`);
      }
      return false;
    }
  };

  const deleteLead = async (leadId: string): Promise<boolean> => {
    if (!supabaseClient) return false;
    try {
      // 1. Delete child tables in Supabase first to prevent constraint issues
      await pushDelete('lead_events', 'lead_id', leadId);
      await supabaseClient.from('lead_packages').delete().eq('lead_id', leadId);
      await supabaseClient.from('quotations').delete().eq('lead_id', leadId);
      await supabaseClient.from('follow_ups').delete().eq('lead_id', leadId);
      await supabaseClient.from('lead_status_history').delete().eq('lead_id', leadId);
      await supabaseClient.from('lead_staff_assignment_history').delete().eq('lead_id', leadId);
      await supabaseClient.from('lead_equipment_history').delete().eq('lead_id', leadId);
      await supabaseClient.from('lead_editor_assignment_history').delete().eq('lead_id', leadId);

      // Delete associated orders and their children
      const { data: linkedOrders } = await supabaseClient.from('orders').select('order_id').eq('lead_id', leadId);
      if (linkedOrders && linkedOrders.length > 0) {
        for (const o of linkedOrders) {
          await deleteOrderCommon(o.order_id, false);
        }
      }

      // Delete the lead itself
      const { error } = await supabaseClient.from('leads').delete().eq('lead_id', leadId);
      if (error) throw error;

      // 2. Update React States
      setLeads(prev => prev.filter(l => l.lead_id !== leadId));
      setQuotations(prev => prev.filter(q => q.lead_id !== leadId));
      setLeadPackages(prev => prev.filter(lp => lp.lead_id !== leadId));

      // Clean up local fallback storage
      const localKey = 'erp_local_leads';
      const existingLocalStr = localStorage.getItem(localKey);
      if (existingLocalStr) {
        const localRecords = JSON.parse(existingLocalStr);
        const filtered = localRecords.filter((r: any) => r.lead_id !== leadId);
        localStorage.setItem(localKey, JSON.stringify(filtered));
      }

      alert('Lead deleted successfully!');
      logActivity(`Deleted Lead: ${leadId}`, 'Sales', leadId);
      // fetchFromDb().catch(console.error); // Disabled to prevent full reload
      return true;
    } catch (err: any) {
      console.error('Failed to delete lead:', err);
      alert(`Error deleting lead: ${err.message || err}`);
      return false;
    }
  };

  const deleteOrder = (orderId: string) => deleteOrderCommon(orderId, true);

  const deleteFollowUp = async (followUpId: string): Promise<boolean> => {
    if (!supabaseClient) return false;
    try {
      const { error } = await supabaseClient.from('follow_ups').delete().eq('follow_up_id', followUpId);
      if (error) throw error;
      alert('Follow-up record deleted successfully!');
      logActivity(`Deleted Follow Up: ${followUpId}`, 'Sales', followUpId);
      // fetchFromDb().catch(console.error); // Disabled to prevent full reload
      return true;
    } catch (err: any) {
      console.error('Failed to delete follow up:', err);
      alert(`Error deleting follow up: ${err.message || err}`);
      return false;
    }
  };

  const deleteQuotation = async (quotationId: string): Promise<boolean> => {
    if (!supabaseClient) return false;
    try {
      const { error } = await supabaseClient.from('quotations').delete().eq('quotation_id', quotationId);
      if (error) throw error;
      setQuotations(prev => prev.filter(q => q.quotation_id !== quotationId));
      alert('Quotation deleted successfully!');
      logActivity(`Deleted Quotation: ${quotationId}`, 'Sales', quotationId);
      // fetchFromDb().catch(console.error); // Disabled to prevent full reload
      return true;
    } catch (err: any) {
      console.error('Failed to delete quotation:', err);
      alert(`Error deleting quotation: ${err.message || err}`);
      return false;
    }
  };

  const deletePayment = async (paymentId: string): Promise<boolean> => {
    if (!supabaseClient) return false;
    try {
      const { error } = await supabaseClient.from('payments').delete().eq('payment_id', paymentId);
      if (error) throw error;
      setPayments(prev => prev.filter(p => p.payment_id !== paymentId));
      alert('Payment record deleted successfully!');
      logActivity(`Deleted Payment: ${paymentId}`, 'Payments', paymentId);
      // fetchFromDb().catch(console.error); // Disabled to prevent full reload
      return true;
    } catch (err: any) {
      console.error('Failed to delete payment:', err);
      alert(`Error deleting payment: ${err.message || err}`);
      return false;
    }
  };

  const deleteOperation = async (operationId: string): Promise<boolean> => {
    if (!supabaseClient) return false;
    try {
      const { error } = await supabaseClient.from('operations').delete().eq('operation_id', operationId);
      if (error) throw error;
      setOperations(prev => prev.filter(o => o.operation_id !== operationId));
      alert('Operational record deleted successfully!');
      logActivity(`Deleted Operation: ${operationId}`, 'Operations', operationId);
      // fetchFromDb().catch(console.error); // Disabled to prevent full reload
      return true;
    } catch (err: any) {
      console.error('Failed to delete operation:', err);
      alert(`Error deleting operation: ${err.message || err}`);
      return false;
    }
  };

  const deleteProduction = async (productionId: string): Promise<boolean> => {
    if (!supabaseClient) return false;
    try {
      // Delete editor assignments first
      await supabaseClient.from('editor_assignments').delete().eq('production_id', productionId);
      const { error } = await supabaseClient.from('production').delete().eq('production_id', productionId);
      if (error) throw error;
      setProduction(prev => prev.filter(p => p.production_id !== productionId));
      setEditorAssignments(prev => prev.filter(ea => ea.production_id !== productionId));
      alert('Production record deleted successfully!');
      logActivity(`Deleted Production: ${productionId}`, 'Production', productionId);
      // fetchFromDb().catch(console.error); // Disabled to prevent full reload
      return true;
    } catch (err: any) {
      console.error('Failed to delete production:', err);
      alert(`Error deleting production: ${err.message || err}`);
      return false;
    }
  };

  const deleteStaffAssignment = async (assignmentId: string): Promise<boolean> => {
    if (!supabaseClient) return false;
    try {
      const { error } = await supabaseClient.from('staff_assignments').delete().eq('assignment_id', assignmentId);
      if (error) throw error;
      setStaffAssignments(prev => prev.filter(sa => sa.assignment_id !== assignmentId));
      alert('Staff assignment deleted successfully!');
      logActivity(`Deleted Staff Assignment: ${assignmentId}`, 'Operations', assignmentId);
      // fetchFromDb().catch(console.error); // Disabled to prevent full reload
      return true;
    } catch (err: any) {
      console.error('Failed to delete staff assignment:', err);
      alert(`Error deleting staff assignment: ${err.message || err}`);
      return false;
    }
  };

  const deleteRawFootage = async (trackingId: string): Promise<boolean> => {
    if (!supabaseClient) return false;
    try {
      // Find production IDs
      const { data: linkedProduction } = await supabaseClient.from('production').select('production_id').eq('tracking_id', trackingId);
      if (linkedProduction && linkedProduction.length > 0) {
        const prodIds = linkedProduction.map(p => p.production_id);
        // Delete editor assignments
        await supabaseClient.from('editor_assignments').delete().in('production_id', prodIds);
        // Delete production rows
        await supabaseClient.from('production').delete().in('production_id', prodIds);
        setProduction(prev => prev.filter(p => !prodIds.includes(p.production_id)));
        setEditorAssignments(prev => prev.filter(ea => !prodIds.includes(ea.production_id)));
      }
      const { error } = await supabaseClient.from('raw_footage').delete().eq('tracking_id', trackingId);
      if (error) throw error;
      setRawFootage(prev => prev.filter(rf => rf.tracking_id !== trackingId));
      alert('Raw footage record deleted successfully!');
      logActivity(`Deleted Raw Footage: ${trackingId}`, 'Production', trackingId);
      // fetchFromDb().catch(console.error); // Disabled to prevent full reload
      return true;
    } catch (err: any) {
      console.error('Failed to delete raw footage:', err);
      alert(`Error deleting raw footage: ${err.message || err}`);
      return false;
    }
  };

  // Automatic Reminder Notifications for Event Dates & Target Delivery Dates
  useEffect(() => {
    if (isDataLoading) return;

    const checkAndGenerateReminders = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const nowMs = Date.now();
      
      const getDaysDiff = (targetDateStr: string, todayDateStr: string) => {
        const d1 = new Date(targetDateStr);
        const d2 = new Date(todayDateStr);
        d1.setHours(0,0,0,0);
        d2.setHours(0,0,0,0);
        const diffTime = d1.getTime() - d2.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      };

      // Load deleted notification IDs to avoid recreation
      let deletedIds: string[] = [];
      try {
        const deletedStr = localStorage.getItem('erp_deleted_notifications');
        if (deletedStr) {
          deletedIds = JSON.parse(deletedStr);
        }
      } catch (e) {
        console.warn("Error parsing deleted notifications:", e);
      }

      const newlyAddedIds = new Set<string>();

      // A. EVENT REMINDERS (for Sales Team, Operations Team, Business Owner)
      for (const order of augmentedOrders) {
        const eventDateStr = order.event_date;
        if (!eventDateStr) continue;

        const cleanEventDateStr = eventDateStr.split('T')[0];
        const daysDiff = getDaysDiff(cleanEventDateStr, todayStr);

        const isEventCompleted = order.current_stage === 'Event Completed' || order.current_stage === 'Closed' || order.current_stage === 'Raw Footage Received';
        if (isEventCompleted) continue;

        const customerName = order.customer_name || 'Valued Client';
        const eventType = order.event_type || order.package_name || 'Event';
        const orderIdValue = order.order_id;

        // Reminder thresholds: 7 days, 3 days, 1 day, 0 days (Event Day)
        const thresholds = [
          { days: 7, label: '7 Days Before' },
          { days: 3, label: '3 Days Before' },
          { days: 1, label: '1 Day Before' },
          { days: 0, label: 'Event Day' }
        ];

        for (const t of thresholds) {
          if (daysDiff === t.days) {
            const roles = ['Sales Team', 'Operations Team', 'Business Owner'];
            for (const role of roles) {
              const prefix = role.replace(/\s+/g, '');
              const notifId = `NTF-rem-event-${orderIdValue}-${prefix}-${t.days}`;
              const exists = notifications.some(n => n.notification_id === notifId) || deletedIds.includes(notifId) || newlyAddedIds.has(notifId);
              
              if (!exists) {
                newlyAddedIds.add(notifId);
                let title = '';
                let message = '';
                
                if (role === 'Sales Team' || role === 'Business Owner') {
                  title = `📅 Event Reminder (${t.label})`;
                  message = `Event scheduled for **${customerName}** (${eventType}) is coming up in ${t.days === 0 ? 'TODAY' : t.days + ' days'} (Date: ${cleanEventDateStr}).`;
                } else if (role === 'Operations Team') {
                  title = `📅 Event Schedule Reminder (${t.label})`;
                  message = `Operations Reminder: Event for **${customerName}** is scheduled in ${t.days === 0 ? 'TODAY' : t.days + ' days'}. Please verify staff assignments and kit readiness!`;
                }

                await addNotification({
                  notification_id: notifId,
                  title,
                  message,
                  recipient_role: role,
                  task_id: 'Event Reminder',
                  notification_type: role === 'Operations Team' ? 'Event Schedule Reminder' : 'Event Reminder',
                  project_id: orderIdValue,
                  priority: t.days <= 1 ? 'High' : 'Medium'
                });
              }
            }
          }
        }
      }

      // B. PRODUCTION / DELIVERY REMINDERS (for Production Team)
      for (const p of augmentedProduction) {
        const targetDateStr = p.expected_delivery_date || p.target_delivery_date;
        if (!targetDateStr) continue;

        const cleanDateStr = targetDateStr.split('T')[0];
        const daysDiff = getDaysDiff(cleanDateStr, todayStr);

        // Find customer name
        const ord = augmentedOrders.find(o => o.order_id === p.tracking_id || o.lead_id === p.tracking_id);
        const parentLead = leads.find(l => l.lead_id === p.tracking_id || (ord && l.lead_id === ord.lead_id));
        const customerName = ord?.customer_name || parentLead?.customer_name || 'Customer';
        const orderIdValue = ord?.order_id || p.tracking_id || 'N/A';

        const isDelivered = p.editing_status === 'Delivered' || p.editing_status === 'Closed' || p.editing_status === 'Approved' || p.editing_status === 'Final Approval';
        if (isDelivered) continue;

        // Delivery reminder thresholds: 7 days, 3 days, 1 day, 0 days, overdue (daysDiff < 0)
        const deliveryThresholds = [
          { days: 7, label: '7 Days Before Delivery', title: 'Target Delivery Reminder', priority: 'Medium' },
          { days: 3, label: '3 Days Before Delivery', title: 'Target Delivery Reminder', priority: 'High' },
          { days: 1, label: '1 Day Before Delivery', title: 'Target Delivery Reminder', priority: 'High' },
          { days: 0, label: 'Delivery Due Today', title: 'Delivery Due Today', priority: 'Critical' }
        ];

        for (const t of deliveryThresholds) {
          if (daysDiff === t.days) {
            const notifId = `NTF-rem-prod-${p.production_id}-${t.days}`;
            const exists = notifications.some(n => n.notification_id === notifId) || deletedIds.includes(notifId) || newlyAddedIds.has(notifId);
            
            if (!exists) {
              newlyAddedIds.add(notifId);
              await addNotification({
                notification_id: notifId,
                title: t.title,
                message: `Project for **${customerName}** is due for delivery ${t.days === 0 ? 'TODAY' : 'in ' + t.days + ' days'} (Date: ${cleanDateStr}).`,
                recipient_role: 'Production Team',
                task_id: 'Delivery Reminder',
                notification_type: 'Target Delivery Reminder',
                project_id: orderIdValue,
                priority: t.priority as any
              });
            }
          }
        }

        // Overdue Delivery
        if (daysDiff < 0) {
          const notifId = `NTF-rem-prod-${p.production_id}-overdue`;
          const exists = notifications.some(n => n.notification_id === notifId) || deletedIds.includes(notifId) || newlyAddedIds.has(notifId);
          
          if (!exists) {
            newlyAddedIds.add(notifId);
            await addNotification({
              notification_id: notifId,
              title: 'Delivery Overdue',
              message: `Project for **${customerName}** is OVERDUE! The target delivery date was ${cleanDateStr}.`,
              recipient_role: 'Production Team',
              task_id: 'Delivery Reminder',
              notification_type: 'Delivery Overdue',
              project_id: orderIdValue,
              priority: 'Critical'
            });
          }
        }
      }
    };

    checkAndGenerateReminders().catch(e => console.warn("checkAndGenerateReminders error:", e));
  }, [isDataLoading, augmentedProduction, notifications, augmentedOrders, leads]);

  const visibleLeads = useMemo(() => {
    if (currentRole === 'Sales Team' && currentUser) {
      return leads.filter(l => 
        l.sales_person === currentUserName || 
        l.created_by === currentUserName || 
        l.sales_staff_id === currentUser.id
      );
    }
    return leads;
  }, [leads, currentRole, currentUser, currentUserName]);

  const visibleOrders = useMemo(() => {
    if (currentRole === 'Sales Team' && currentUser) {
      const allowedLeadIds = new Set(visibleLeads.map(l => l.lead_id));
      return augmentedOrders.filter(o => allowedLeadIds.has(o.lead_id));
    }
    return augmentedOrders;
  }, [augmentedOrders, currentRole, visibleLeads, currentUser]);

  const visiblePayments = useMemo(() => {
    if (currentRole === 'Sales Team' && currentUser) {
      const allowedOrderIds = new Set(visibleOrders.map(o => o.order_id));
      return augmentedPayments.filter(p => allowedOrderIds.has(p.order_id));
    }
    return augmentedPayments;
  }, [augmentedPayments, currentRole, visibleOrders, currentUser]);

  return (
    <RoleContext.Provider
      value={{
        currentUser,
        currentRole,
        currentUserName,
        setCurrentRole,
        setCurrentUserName,
        isDataLoading,
        login,
        logout,
        users,
        leads: visibleLeads,
        orders: visibleOrders,
        operations: augmentedOperations,
        rawFootage,
        production: augmentedProduction,
        payments: visiblePayments,
        logs,
        staff,
        addStaff,
        updateStaff,
        deleteStaff,
        productionStaff,
        addProductionStaff,
        updateProductionStaff,
        deleteProductionStaff,
        equipment,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        notifications,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        deleteAllReadNotifications,
        archiveNotification,
        calendarMemos,
        addCalendarMemo,
        updateCalendarMemo,
        deleteCalendarMemo,
        leadPackages,
        packages,
        addPackage,
        updatePackage,
        deletePackage,
        quotations,
        addQuotation,
        updateQuotation,
        updateLead,
        saveLeadPackages,
        addLead,
        updateLeadFollowUp,
        confirmOrder,
        assignOperations,
        markEventCompleted,
        confirmRawFootageReceived,
        updateOrderStage,
        acceptRawFootage,
        updateProduction,
        markDelivered,
        recordPayment,
        resetAllData,
        refreshData,
        pushInsert,
        pushUpdate,
        statusHistory,
        getLeadCurrentStatus,
        getLeadCurrentStage,
        addUser,
        signUpUser,
        editUser,
        deleteUser,
        toggleUserStatus,
        resetUserPassword,
        staffAssignments,
        leadStaffAssignmentHistory,
        leadEquipmentHistory,
        addLeadEquipmentHistory,
        saveStaffAssignments,
        specialities,
        addSpeciality,
        updateSpeciality,
        deactivateSpeciality,
        deleteSpeciality,
        editorAssignments,
        assignEditorToProject,
        updateEditorAssignmentStatus,
        deleteEditorAssignment,
        globalDateRange,
        setGlobalDateRange,
        resetGlobalDateRange,
        equipmentHandovers,
        addEquipmentHandover,
        addEquipmentHandovers,
        unlockedRecords,
        getDepartmentForStage,
        isDepartmentAllowedToEdit,
        unlockRecord,
        lockRecord,
        isRecordLocked,
        deleteLead,
        deleteOrder,
        deleteFollowUp,
        deleteQuotation,
        deletePayment,
        deleteOperation,
        deleteProduction,
        deleteStaffAssignment,
        deleteRawFootage,
      }}
    >
      {children}
      
      {/* Premium responsive Custom Dialog popup replacing native browser alerts */}
      {globalModalAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-[4px] animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-850 rounded-3xl p-6 w-full max-w-sm w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Top gold calibrator ribbon decorator */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 animate-pulse" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  globalModalAlert.title === 'Operation Successful'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : globalModalAlert.title === 'Action Required'
                    ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold'
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
                }`}>
                  {globalModalAlert.title === 'Operation Successful' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : globalModalAlert.title === 'Action Required' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h4 className="text-[11px] font-mono font-bold tracking-widest uppercase text-zinc-350">
                    {globalModalAlert.title}
                  </h4>
                  <p className="text-[9px] text-zinc-550 uppercase font-mono tracking-wider">
                    Studio Desk Feedback
                  </p>
                </div>
              </div>
              
              <div className="h-px bg-zinc-900" />
              
              <p className="text-xs text-zinc-300 font-sans leading-relaxed break-words whitespace-pre-wrap">
                {globalModalAlert.message}
              </p>
              
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setGlobalModalAlert(null)}
                  className="w-full px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-750 text-zinc-200 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer text-center select-none duration-150"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
};
