import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { User, Lead, LeadPackage, Order, Operation, RawFootage, Production, Payment, ActivityLog, UserRole, CurrentStage, EditingStatus, Staff, Notification, Equipment, Package, StaffAssignment, LeadStaffAssignmentHistory, LeadEquipmentHistory, ProductionSpeciality, EditorAssignment, PaymentStatus, EquipmentHandover, UnlockOverride, DEPARTMENT_STAGES, ROLE_DEPARTMENT_MAP, Department } from '../types';
import { INITIAL_USERS, INITIAL_LEADS, INITIAL_ORDERS, INITIAL_OPERATIONS, INITIAL_RAW_FOOTAGE, INITIAL_PRODUCTION, INITIAL_PAYMENTS, INITIAL_LOGS, INITIAL_EQUIPMENT } from '../data';

import { supabaseClient, updateDiagnosticMetric } from '../supabaseClient';
import { serializeLeadEvents, deserializeLeadEvents } from '../utils';

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
  equipment: Equipment[];
  addEquipment: (equip: Omit<Equipment, 'equipment_id'>) => Promise<void>;
  updateEquipment: (equipmentId: string, updates: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (equipmentId: string) => Promise<void>;
  notifications: Notification[];
  addNotification: (payload: Omit<Notification, 'notification_id' | 'created_at' | 'read_status'> & { notification_id?: string; read_status?: boolean }) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  archiveNotification: (notificationId: string, archiveStatus?: boolean) => Promise<void>;
  
  leadPackages: LeadPackage[];
  packages: Package[];
  addPackage: (pkg: Omit<Package, 'package_id'>) => Promise<string>;
  updatePackage: (packageId: string, updates: Partial<Package>) => Promise<void>;
  deletePackage: (packageId: string) => Promise<void>;

  quotations: any[];
  addQuotation: (quotation: any) => Promise<void>;
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
    transactionId?: string
  ) => Promise<void>;
  resetAllData: () => Promise<void>;
  refreshData: () => void;
  statusHistory: any[];
  getLeadCurrentStatus: (lead: Lead) => string;
  getLeadCurrentStage: (lead: Lead) => 'Sales' | 'Operations' | 'Production' | 'Completed';
  
  // User Management Admin features
  addUser: (name: string, email: string, mobile: string, role: UserRole, active: boolean, password?: string) => Promise<void>;
  signUpUser: (name: string, username: string, email: string, mobile: string, role: UserRole, password: string) => Promise<any>;
  editUser: (id: string, updates: { name: string, email: string, mobile: string, role: UserRole, active: boolean }) => Promise<void>;
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
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Stable UUID translator mapping helpers because Supabase 'public.users' id is UUID
const mapToDbUserId = (id: string): string => {
  if (id.startsWith('U-')) {
    const num = id.substring(2).padStart(12, '0');
    return `00000000-0000-0000-0000-${num}`;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return `00000000-0000-0000-0000-999999999999`;
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

const INITIAL_PACKAGES: Package[] = [
  // Wedding Packages
  { 
    package_id: 'PKG_WED_01', 
    package_name: 'Wedding - Bronze', 
    category: 'Weddings', 
    price: 79999, 
    status: 'Active',
    deliverables: '1 Traditional Photographer, 1 Traditional Videographer, Standard Album, Full HD Output Video',
    team_members: '2 Crew Members',
    seasonal_offer: 'Complimentary Wedding Teaser (1 min)'
  }
];

export const mapDbRecordToPackage = (record: any): Package => {
  let category = 'Weddings'; // Default fallback
  let deliverables = record.description || '';
  let team_members = '';
  let seasonal_offer = '';
  let terms_conditions = '';
  let event_type = '';
  let duration = '';
  let package_includes = '';

  if (record.description && record.description.trim().startsWith('{') && record.description.trim().endsWith('}')) {
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
    package_name: record.name || '',
    category,
    price: record.price || 0,
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

  const [leads, setLeads] = useState<Lead[]>(() => {
    const cached = localStorage.getItem('erp_leads');
    return cached ? JSON.parse(cached) : [];
  });
  const [statusHistory, setStatusHistory] = useState<any[]>(() => {
    const cached = localStorage.getItem('erp_status_history');
    return cached ? JSON.parse(cached) : [];
  });
  const [quotations, setQuotations] = useState<any[]>(() => {
    const cached = localStorage.getItem('erp_quotations');
    return cached ? JSON.parse(cached) : [];
  });
  const [leadPackages, setLeadPackages] = useState<LeadPackage[]>(() => {
    const cached = localStorage.getItem('erp_lead_packages');
    return cached ? JSON.parse(cached) : [];
  });
  const [packages, setPackages] = useState<Package[]>([]);
  const [orders, setOrders] = useState<Order[]>(() => {
    const cached = localStorage.getItem('erp_orders');
    return cached ? JSON.parse(cached) : [];
  });
  const [operations, setOperations] = useState<Operation[]>(() => {
    const cached = localStorage.getItem('erp_operations');
    return cached ? JSON.parse(cached) : [];
  });
  const [rawFootage, setRawFootage] = useState<RawFootage[]>(() => {
    const cached = localStorage.getItem('erp_raw_footage');
    return cached ? JSON.parse(cached) : [];
  });
  const [production, setProduction] = useState<Production[]>(() => {
    const cached = localStorage.getItem('erp_production');
    return cached ? JSON.parse(cached) : [];
  });
  const [payments, setPayments] = useState<Payment[]>(() => {
    const cached = localStorage.getItem('erp_payments');
    return cached ? JSON.parse(cached) : [];
  });
  const [logs, setLogs] = useState<ActivityLog[]>(() => {
    const cached = localStorage.getItem('erp_activity_logs');
    return cached ? JSON.parse(cached) : [];
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  const [equipment, setEquipment] = useState<Equipment[]>([]);

  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>(() => {
    const saved = localStorage.getItem('erp_staff_assignments');
    return saved ? JSON.parse(saved) : [];
  });

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


  useEffect(() => {
    localStorage.setItem('erp_staff_assignments', JSON.stringify(staffAssignments));
  }, [staffAssignments]);

  useEffect(() => {
    localStorage.setItem('erp_lead_staff_assignment_history', JSON.stringify(leadStaffAssignmentHistory));
  }, [leadStaffAssignmentHistory]);

  useEffect(() => {
    localStorage.setItem('erp_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('erp_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('erp_operations', JSON.stringify(operations));
  }, [operations]);

  useEffect(() => {
    localStorage.setItem('erp_raw_footage', JSON.stringify(rawFootage));
  }, [rawFootage]);

  useEffect(() => {
    localStorage.setItem('erp_production', JSON.stringify(production));
  }, [production]);

  useEffect(() => {
    localStorage.setItem('erp_payments', JSON.stringify(payments));
  }, [payments]);



  useEffect(() => {
    localStorage.setItem('erp_quotations', JSON.stringify(quotations));
  }, [quotations]);

  useEffect(() => {
    localStorage.setItem('erp_lead_packages', JSON.stringify(leadPackages));
  }, [leadPackages]);

  useEffect(() => {
    localStorage.setItem('erp_packages', JSON.stringify(packages));
  }, [packages]);

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
      'New Order Received', 'Order Confirmed', 'Operations Assigned', 'Event Scheduled', 'Staff Assigned', 'Event Completed', 'Raw Footage Received',
      'Editor Assigned', 'Editing Started', 'Editing In Progress', 'Internal QC Review', 'Client Review Sent', 'Revision Required', 'Revision In Progress', 'Final Approval', 'Project Delivered', 'Project Closed',
      'Customer Review', 'Approved', 'Delivered', 'Payment Pending', 'Closed'
    ];
    
    // Start with existing booked/restored orders from DB
    const list = [...orders];
    
    // For every lead, ensure a mapped order exists if the lead is confirmed
    leads.forEach(ld => {
      if (postSalesStages.includes(ld.status)) {
        const orderExists = list.some(o => o.lead_id === ld.lead_id || o.order_id === ld.lead_id);
        if (!orderExists) {
          const ordId = `ORD-${ld.lead_id.replace(/\D/g, '') || ld.lead_id}`;
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
      const prodExists = list.some(p => p.tracking_id === o.order_id || p.tracking_id === o.lead_id);
      if (!prodExists) {
        const parentLeadForO = leads.find(l => l.lead_id === o.lead_id);
        const defaultTargetDate = parentLeadForO?.delivery_target_date || (o.event_date ? new Date(new Date(o.event_date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '');
        list.push({
          production_id: `PRD-${o.lead_id}`,
          tracking_id: o.order_id,
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
      const ord = augmentedOrders.find(o => o.order_id === p.tracking_id || o.lead_id === p.tracking_id);
      const parentLead = leads.find(l => l.lead_id === p.tracking_id || (ord && l.lead_id === ord.lead_id));
      
      const leadStatus = parentLead?.current_status || parentLead?.status;
      const leadEditor = parentLead?.assigned_editor;
      const leadEditors = parentLead?.assigned_editors;
      const leadTargetDate = parentLead?.delivery_target_date;

      let updatedP = { ...p };

      if (leadStatus) {
        updatedP.editing_status = leadStatus as any;
      } else if (ord) {
        updatedP.editing_status = ord.current_stage as any;
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

    if (table === 'users') {
      cloned.full_name = cloned.full_name || cloned.name;
      cloned.name = cloned.name || cloned.full_name;
      cloned.phone = cloned.phone || cloned.mobile;
      cloned.mobile = cloned.mobile || cloned.phone;
    }

    if (table === 'operations_staff' || table === 'production_staff') {
      const existing = staff.find(s => s.staff_id === record.staff_id);
      const merged = existing ? { ...existing, ...cloned } : cloned;
      
      const extra: any = {};
      const localKeys = ['whatsapp_number', 'production_role_speciality', 'custom_role_specialty', 'experience', 'employee_id', 'address', 'city', 'phone', 'commission_rate', 'rating', 'bio'];
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
        created_at: merged.created_at || new Date().toISOString()
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

    const allowedColumns: Record<string, string[]> = {
      users: ['id', 'email', 'role', 'name', 'full_name', 'mobile', 'phone', 'active', 'created_at', 'password', 'username', 'status'],
      leads: [
        'lead_id', 'created_date', 'lead_source', 'customer_name', 'mobile', 'alternate_mobile', 
        'email', 'event_type', 'custom_event_type', 'custom_event_name', 'shoot_type', 'event_date', 'event_time', 'event_location', 'budget', 
        'sales_person', 'status', 'remarks', 'created_by', 'updated_by', 'updated_at', 
        'assigned_editor', 'assigned_editors', 'production_role', 'delivery_target_date', 'current_status',
        'whatsapp_number', 'address', 'client_residence_address', 'city', 'state', 'pincode', 'desired_event_shoot_type', 'Select_Package_Option',
        'total_pax', 'reference_source', 
        'lead_value', 'lead_score', 'booking_status', 'reporting_time', 'package_price', 'deliverables_description', 
        'notes_special_customizations', 'quotation_discount', 'additional_services_cost'
      ],
      orders: [
        'order_id', 'lead_id', 'customer_name', 'mobile', 'event_type', 'custom_event_type', 'custom_event_name', 'shoot_type', 'event_date', 
        'event_time', 'event_location', 'package_name', 'quotation_amount', 'advance_received', 
        'balance_amount', 'order_status', 'current_stage', 'sales_person', 'created_at', 
        'updated_by', 'updated_at', 'whatsapp_number', 'client_residence_address', 'city', 'state', 'pincode', 'Select_Package_Option', 
        'desired_event_shoot_type', 'reporting_time', 'package_price', 'deliverables_description', 
        'notes_special_customizations', 'quotation_discount', 'additional_services_cost',
        'total_pax', 'reference_source', 'lead_value', 'lead_score', 'booking_status'
      ],
      operations: [
        'operation_id', 'order_id', 'photographer_assigned', 'videographer_assigned', 
        'drone_operator_assigned', 'assistant_assigned', 'equipment_kit', 'reporting_time', 
        'event_status', 'remarks', 'updated_by'
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
        'notes_special_customizations', 'additional_services_cost', 'created_at'
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
        'editing_progress'
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
      notifications: [
        'notification_id', 'title', 'message', 'sender_name', 'sender_role', 'timestamp', 
        'is_read', 'recipient_role'
      ],
      equipment: [
        'equipment_id', 'equipment_name', 'equipment_type', 'brand', 'model', 'serial_number', 
        'quantity', 'available_quantity', 'status', 'purchase_date', 'purchase_price', 
        'storage_location', 'notes', 'created_by', 'updated_by', 'created_at', 'updated_at'
      ],
      operations_staff: [
        'staff_id', 'name', 'mobile', 'whatsapp_number', 'email', 'role', 'department', 'status', 'joining_date', 
        'profile_photo', 'notes', 'production_role_speciality', 'experience', 'employee_id', 'city',
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
      if (table === 'production' && sanitized.editing_status) {
        const allowed = ['Pending', 'Editing', 'Customer Review', 'Revision Required', 'Approved', 'Delivered'];
        if (!allowed.includes(sanitized.editing_status)) {
          if (['Closed', 'Project Closed', 'Completed', 'Project Delivered'].includes(sanitized.editing_status)) {
            sanitized.editing_status = 'Delivered';
          } else {
            sanitized.editing_status = 'Pending';
          }
        }
      }
      return sanitized;
    }

    return cloned;
  };

  const verifyLeadsColumns = async (): Promise<{ success: boolean; error?: string }> => {
    return { success: true };
  };

  // Synchronous CRUD wrappers for updating Supabase in backgrounds
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
      const sanitized = stripClientOnlyFields(table, record);
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
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success) {
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
            console.warn(`[pushInsert Proxy WARN] server returned success=false for ${table}, falling back...`, resJson.error);
          }
        } else {
          console.warn(`[pushInsert Proxy WARN] server returned status ${response.status} for ${table}, falling back...`);
        }
      } catch (proxyErr) {
        console.warn(`[pushInsert Proxy ERROR] failed to reach server for ${table}, falling back...`, proxyErr);
      }

      const { error } = await supabaseClient.from(table).insert(sanitized);
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
    } catch (err: any) {
      console.warn(`Supabase Insert exception in ${table}:`, err?.message || String(err));
      updateDiagnosticMetric('insert', 'fail', err?.message || String(err));
      return { success: false, error: err?.message || String(err) };
    }
  };

  const pushUpdate = async (table: string, matchColumn: string, matchValue: any, updates: any): Promise<{ success: boolean; error?: string; localFallback?: boolean }> => {
    if (!supabaseClient) return { success: true };
    try {
      const sanitized = stripClientOnlyFields(table, updates);
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
      } else if (table === 'production') {
        if (sanitized.editing_status) {
          const allowedProductionStages = [
            'Pending', 'Editing', 'Customer Review', 'Revision Required', 'Approved', 'Delivered'
          ];
          if (!allowedProductionStages.includes(sanitized.editing_status)) {
            const mappedStatus = (() => {
              const s = sanitized.editing_status;
              if (['Closed', 'Project Closed', 'Completed', 'Project Delivered', 'Delivered'].includes(s)) return 'Delivered';
              if (['Final Approval', 'Approved'].includes(s)) return 'Approved';
              if (['Client Review Sent', 'Customer Review'].includes(s)) return 'Customer Review';
              if (['Revision Required'].includes(s)) return 'Revision Required';
              if (['Editor Assigned', 'Editing Started', 'Editing In Progress', 'Revision In Progress', 'Internal QC Review', 'Editing'].includes(s)) return 'Editing';
              return 'Pending';
            })();
            sanitized.editing_status = mappedStatus;
          }
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
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success) {
            console.log(`[pushUpdate Proxy SUCCESS] for ${table}:`, resJson.data);
            updateDiagnosticMetric('update', 'ok');

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
            console.warn(`[pushUpdate Proxy WARN] server returned success=false for ${table}, falling back...`, resJson.error);
          }
        } else {
          console.warn(`[pushUpdate Proxy WARN] server returned status ${response.status} for ${table}, falling back...`);
        }
      } catch (proxyErr) {
        console.warn(`[pushUpdate Proxy ERROR] failed to reach server for ${table}, falling back...`, proxyErr);
      }

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
            
            await fetchFromDb();
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
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success) {
            console.log(`[pushDelete Proxy SUCCESS] for ${table}`);
            updateDiagnosticMetric('delete', 'ok');
            broadcastSyncPing();
            return { success: true };
          } else {
            console.warn(`[pushDelete Proxy WARN] server returned success=false for ${table}, falling back...`, resJson.error);
          }
        } else {
          console.warn(`[pushDelete Proxy WARN] server returned status ${response.status} for ${table}, falling back...`);
        }
      } catch (proxyErr) {
        console.warn(`[pushDelete Proxy ERROR] failed to reach server for ${table}, falling back...`, proxyErr);
      }

      const { error } = await supabaseClient.from(table).delete().eq(matchColumn, finalMatchValue);
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
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success) {
            updateDiagnosticMetric('insert', 'ok');
            broadcastSyncPing();
            return { success: true };
          }
        }
      } catch (proxyErr) {
        console.warn(`[pushUpsert Proxy ERROR] failed to reach server for ${table}, falling back...`, proxyErr);
      }

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
      try { if (INITIAL_PACKAGES?.length > 0) await supabaseClient.from('packages').upsert(INITIAL_PACKAGES); } catch (e) {}

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
      const dbOperationsPromise = supabaseClient.from('operations').select('*');
      const dbRawFootagePromise = supabaseClient.from('raw_footage').select('*');
      const dbProductionPromise = supabaseClient.from('production').select('*');
      const dbPaymentsPromise = supabaseClient.from('payments').select('*');
      const dbLogsPromise = supabaseClient.from('activity_logs').select('*').order('timestamp', { ascending: false });
      const dbStaffPromise = supabaseClient.from('operations_staff').select('*').order('name').then(
        (res) => res,
        (err) => {
          console.error('Error fetching operations_staff:', err);
          return { data: null, error: err };
        }
      );
      const dbNotificationsPromise = supabaseClient.from('notifications').select('*').order('created_at', { ascending: false }).then(
        (res) => res,
        (err) => {
          console.warn('Could not read notifications from Supabase:', err);
          return { data: null, error: null };
        }
      );
      const dbEquipmentPromise = supabaseClient.from('equipment').select('*').order('created_at', { ascending: false }).then(
        (res) => res,
        () => {
          return { data: [], error: null };
        }
      );
      const dbLeadPackagesPromise = supabaseClient.from('lead_packages').select('*').then(
        (res) => {
          if (res.error) {
            console.warn('Supabase lead_packages load error:', res.error?.message);
            const cached = localStorage.getItem('erp_lead_packages');
            return { data: cached ? JSON.parse(cached) : [], error: null };
          }
          return res;
        },
        (err) => {
          console.warn('Could not read lead_packages from Supabase:', err);
          const cached = localStorage.getItem('erp_lead_packages');
          return { data: cached ? JSON.parse(cached) : [], error: null };
        }
      );

      const dbPackagesPromise = (async () => {
        try {
          await validatePackagesDatabase('SELECT');
          const res = await supabaseClient.from('packages').select('*').order('created_at', { ascending: false });
          if (res.error) throw res.error;
          return res;
        } catch (err: any) {
          console.error('Packages database validation/fetch error:', err);
          return { data: [], error: err };
        }
      })();

      const dbStaffAssignmentsPromise = supabaseClient.from('staff_assignments').select('*').then(
        (res) => {
          if (res.error) {
            console.warn('Supabase staff_assignments load error:', res.error?.message);
            const cached = localStorage.getItem('erp_staff_assignments');
            return { data: cached ? JSON.parse(cached) : [], error: null };
          }
          return res;
        },
        (err) => {
          console.warn('Could not read staff_assignments from Supabase:', err);
          const cached = localStorage.getItem('erp_staff_assignments');
          return { data: cached ? JSON.parse(cached) : [], error: null };
        }
      );

      const dbQuotationsPromise = supabaseClient.from('quotations').select('*').then(
        (res) => {
          if (res.error) {
            console.warn('Supabase quotations load error:', res.error?.message);
            const cached = localStorage.getItem('erp_quotations');
            return { data: cached ? JSON.parse(cached) : [], error: null };
          }
          return res;
        },
        (err) => {
          console.warn('Could not read quotations from Supabase:', err);
          const cached = localStorage.getItem('erp_quotations');
          return { data: cached ? JSON.parse(cached) : [], error: null };
        }
      );

      const dbStatusHistoryPromise = supabaseClient.from('lead_status_history').select('*').order('created_at', { ascending: true }).then(
        (res) => res,
        (err) => {
          console.warn('Could not read lead_status_history from Supabase:', err);
          return { data: null, error: null };
        }
      );

      const dbLeadStaffAssignmentHistoryPromise = supabaseClient.from('lead_staff_assignment_history').select('*').order('assigned_at', { ascending: false }).then(
        (res) => res,
        (err) => {
          console.warn('Could not read lead_staff_assignment_history from Supabase:', err);
          const cached = localStorage.getItem('erp_lead_staff_assignment_history');
          return { data: cached ? JSON.parse(cached) : [], error: null };
        }
      );

      const dbLeadEquipmentHistoryPromise = supabaseClient.from('lead_equipment_history').select('*').order('returned_at', { ascending: false }).then(
        (res) => res,
        (err) => {
          console.warn('Could not read lead_equipment_history from Supabase:', err);
          return { data: [], error: null };
        }
      );

      const [
        { data: dbUsers, error: uErr },
        { data: dbLeads, error: ldErr },
        { data: dbOrders, error: ordErr },
        { data: dbOperations, error: opErr },
        { data: dbRawFootage, error: rfErr },
        { data: dbProduction, error: prodErr },
        { data: dbPayments, error: payErr },
        { data: dbLogs, error: logErr },
        staffRes,
        notifRes,
        equipRes,
        leadPackagesRes,
        packagesRes,
        staffAssignmentsRes,
        quotationsRes,
        statusHistoryRes,
        leadStaffAssignmentHistoryRes,
        leadEquipmentHistoryRes
      ] = await Promise.all([
        supabaseClient.from('users').select('*'),
        supabaseClient.from('leads').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('orders').select('*').order('created_at', { ascending: false }),
        dbOperationsPromise,
        dbRawFootagePromise,
        dbProductionPromise,
        dbPaymentsPromise,
        dbLogsPromise,
        dbStaffPromise,
        dbNotificationsPromise,
        dbEquipmentPromise,
        dbLeadPackagesPromise,
        dbPackagesPromise,
        dbStaffAssignmentsPromise,
        dbQuotationsPromise,
        dbStatusHistoryPromise,
        dbLeadStaffAssignmentHistoryPromise,
        dbLeadEquipmentHistoryPromise
      ]);

      if (uErr || ldErr || ordErr || opErr || rfErr || prodErr || payErr || logErr) {
        console.warn('Some tables could not be read from Supabase (this is expected if you are not fully logged in). Attempting to load available tables and fallback to cached states...');
        updateDiagnosticMetric('read', 'warn', (uErr || ldErr || ordErr || opErr || rfErr || prodErr || payErr || logErr)?.message);
      }

      // 1. Resolve users table with local fallback if select failed
      let finalUsers = dbUsers;
      if (uErr || !dbUsers) {
        console.warn('Using INITIAL_USERS fallback because users table select failed or returned null:', uErr?.message);
        finalUsers = INITIAL_USERS.map(u => ({
          ...u,
          id: mapToDbUserId(u.id)
        }));
      }

      if (finalUsers && finalUsers.length === 0) {
        await seedDatabase();
        // retry fetch once
        await fetchFromDb(showLoader);
        return;
      }

      if (finalUsers) {
        setUsers(finalUsers.map(mapUserFieldsFromDb));
      }

      // 2. Resolve other database tables with robust cached fallbacks
      let resolvedLeads = dbLeads;
      if (ldErr || !dbLeads) {
        const cached = localStorage.getItem('erp_leads');
        resolvedLeads = cached ? JSON.parse(cached) : INITIAL_LEADS;
      } else {
        localStorage.removeItem('erp_local_leads');
      }

      // Merge with any local-only leads (only if we failed to fetch from Supabase)
      const localLeadsKey = 'erp_local_leads';
      const localLeadsStr = localStorage.getItem(localLeadsKey);
      if (ldErr && localLeadsStr) {
        try {
          const localLeads = JSON.parse(localLeadsStr);
          if (Array.isArray(localLeads) && localLeads.length > 0) {
            // Apply updates to existing leads if the local update is newer
            resolvedLeads = (resolvedLeads || []).map((dbLead: any) => {
              const localUpdate = localLeads.find((l: any) => l && l.lead_id === dbLead.lead_id);
              if (!localUpdate) return dbLead;
              const dbTime = dbLead.updated_at ? new Date(dbLead.updated_at).getTime() : 0;
              const localTime = localUpdate.updated_at ? new Date(localUpdate.updated_at).getTime() : 0;
              if (localTime >= dbTime) {
                return { ...dbLead, ...localUpdate };
              }
              return dbLead;
            });
            // Append entirely new local leads
            const resolvedIds = new Set((resolvedLeads || []).map((l: any) => l.lead_id));
            const uniqueLocal = localLeads.filter((l: any) => l && l.lead_id && !resolvedIds.has(l.lead_id));
            resolvedLeads = [...uniqueLocal, ...(resolvedLeads || [])];
          }
        } catch (e) {
          console.error('Error parsing local fallback leads:', e);
        }
      }

      let resolvedOrders = dbOrders;
      if (ordErr || !dbOrders) {
        const cached = localStorage.getItem('erp_orders');
        resolvedOrders = cached ? JSON.parse(cached) : INITIAL_ORDERS;
      } else {
        localStorage.removeItem('erp_local_orders');
      }

      // Merge with any local-only orders (only if we failed to fetch from Supabase)
      const localOrdersKey = 'erp_local_orders';
      const localOrdersStr = localStorage.getItem(localOrdersKey);
      if (ordErr && localOrdersStr) {
        try {
          const localOrders = JSON.parse(localOrdersStr);
          if (Array.isArray(localOrders) && localOrders.length > 0) {
            // Apply updates to existing orders if the local update is newer
            resolvedOrders = (resolvedOrders || []).map((dbOrder: any) => {
              const localUpdate = localOrders.find((o: any) => o && o.order_id === dbOrder.order_id);
              if (!localUpdate) return dbOrder;
              const dbTime = dbOrder.updated_at ? new Date(dbOrder.updated_at).getTime() : 0;
              const localTime = localUpdate.updated_at ? new Date(localUpdate.updated_at).getTime() : 0;
              if (localTime >= dbTime) {
                return { ...dbOrder, ...localUpdate };
              }
              return dbOrder;
            });
            // Append entirely new local orders
            const resolvedIds = new Set((resolvedOrders || []).map((o: any) => o.order_id));
            const uniqueLocal = localOrders.filter((o: any) => o && o.order_id && !resolvedIds.has(o.order_id));
            resolvedOrders = [...uniqueLocal, ...(resolvedOrders || [])];
          }
        } catch (e) {
          console.error('Error parsing local fallback orders:', e);
        }
      }

      let resolvedRawFootage = dbRawFootage;
      if (rfErr || !dbRawFootage) {
        const cached = localStorage.getItem('erp_raw_footage');
        resolvedRawFootage = cached ? JSON.parse(cached) : INITIAL_RAW_FOOTAGE;
      }

      let resolvedProduction = dbProduction;
      if (prodErr || !dbProduction) {
        const cached = localStorage.getItem('erp_production');
        resolvedProduction = cached ? JSON.parse(cached) : INITIAL_PRODUCTION;
      }

      let resolvedOperations = dbOperations;
      if (opErr || !dbOperations) {
        const cached = localStorage.getItem('erp_operations');
        resolvedOperations = cached ? JSON.parse(cached) : INITIAL_OPERATIONS;
      }

      let resolvedPayments = dbPayments;
      if (payErr || !dbPayments) {
        const cached = localStorage.getItem('erp_payments');
        resolvedPayments = cached ? JSON.parse(cached) : INITIAL_PAYMENTS;
      }

      let resolvedLogs = dbLogs;
      if (logErr || !dbLogs) {
        const cached = localStorage.getItem('erp_activity_logs');
        resolvedLogs = cached ? JSON.parse(cached) : INITIAL_LOGS;
      }

      // Resolve lead packages and merge with any local-only lead packages
      const localLeadPkgsKey = 'erp_local_lead_packages';
      const localLeadPkgsStr = localStorage.getItem(localLeadPkgsKey);
      let resolvedLeadPackages = leadPackagesRes?.data || [];
      if (leadPackagesRes?.error || !leadPackagesRes?.data) {
        const cached = localStorage.getItem('erp_lead_packages');
        resolvedLeadPackages = cached ? JSON.parse(cached) : [];
      } else {
        localStorage.removeItem('erp_local_lead_packages');
      }
      if (leadPackagesRes?.error && localLeadPkgsStr) {
        try {
          const localPkgs = JSON.parse(localLeadPkgsStr);
          if (Array.isArray(localPkgs) && localPkgs.length > 0) {
            const resolvedIds = new Set((resolvedLeadPackages || []).map((p: any) => p.lead_package_id));
            const uniqueLocal = localPkgs.filter((p: any) => p && p.lead_package_id && !resolvedIds.has(p.lead_package_id));
            resolvedLeadPackages = [...uniqueLocal, ...(resolvedLeadPackages || [])];
          }
        } catch (e) {
          console.error('Error parsing local fallback lead packages:', e);
        }
      }

      // 3. Populate React state with mapped variables
      let resolvedStatusHistory = statusHistoryRes?.data;
      if (statusHistoryRes?.error || !statusHistoryRes?.data) {
        const cached = localStorage.getItem('erp_status_history');
        resolvedStatusHistory = cached ? JSON.parse(cached) : [];
      } else {
        localStorage.setItem('erp_status_history', JSON.stringify(statusHistoryRes.data));
      }
      setStatusHistory(resolvedStatusHistory);

      if (resolvedLeads) {
        const dbStatusHist = resolvedStatusHistory || [];
        const mappedLeads = resolvedLeads.map(ld => {
          const rawStatus = ld.status || 'New Lead';
          
          // Get latest history status
          const historyForLead = dbStatusHist.filter((h: any) => h.lead_id === ld.lead_id);
          const sorted = [...historyForLead].sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const latestHistoryStatus = sorted[0]?.new_status;
          
          const finalStatus = latestHistoryStatus || ld.current_status || rawStatus;
          const parsed = deserializeLeadEvents(ld.notes_special_customizations);
          
          return {
            ...ld,
            status: finalStatus as CurrentStage,
            current_status: finalStatus,
            events: parsed.events
          };
        });
        setLeads(prev => {
          const merged = mappedLeads.map(dbLead => {
            const prevLead = prev.find(p => p.lead_id === dbLead.lead_id);
            if (!prevLead) return dbLead;
            
            const dbTime = dbLead.updated_at ? new Date(dbLead.updated_at).getTime() : 0;
            const localTime = prevLead.updated_at ? new Date(prevLead.updated_at).getTime() : 0;
            
            // If the local state is newer (e.g. from an optimistic update), keep it
            if (localTime > dbTime) {
              return { ...dbLead, ...prevLead };
            }
            return dbLead;
          });
          localStorage.setItem('erp_leads', JSON.stringify(merged));
          return merged;
        });
      }

      if (resolvedLeadPackages) {
        setLeadPackages(resolvedLeadPackages as LeadPackage[]);
        localStorage.setItem('erp_lead_packages', JSON.stringify(resolvedLeadPackages));
      }

      if (packagesRes && packagesRes.data) {
        if (packagesRes.data.length === 0 && !packagesRes.error) {
          console.log('Detected empty packages table, seeding INITIAL_PACKAGES into Supabase...');
          const mappedInitialPackages = INITIAL_PACKAGES.map(pkg => {
            const extraData = {
              category: pkg.category,
              deliverables: pkg.deliverables,
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
              status: pkg.status,
              created_at: pkg.created_at || new Date().toISOString()
            };
          });
          await supabaseClient.from('packages').upsert(mappedInitialPackages);
          
          const mapped = INITIAL_PACKAGES.map(pkg => ({
            ...pkg,
            created_at: pkg.created_at || new Date().toISOString()
          }));
          setPackages(mapped);
          localStorage.setItem('erp_packages', JSON.stringify(mapped));
        } else {
          const mapped = packagesRes.data.map(mapDbRecordToPackage);
          setPackages(mapped);
          localStorage.setItem('erp_packages', JSON.stringify(mapped));
        }
      }

      if (resolvedOrders) {
        const mappedOrders = resolvedOrders.map((ord: any) => {
          const associatedLead = resolvedLeads?.find(ld => ld.lead_id === ord.lead_id);
          const leadStatus = associatedLead?.current_status || associatedLead?.status;
          return {
            ...ord,
            current_stage: leadStatus || ord.current_stage
          };
        }) as any;
        setOrders(mappedOrders);
        localStorage.setItem('erp_orders', JSON.stringify(mappedOrders));
      }

      if (resolvedOperations) {
        setOperations(resolvedOperations);
        localStorage.setItem('erp_operations', JSON.stringify(resolvedOperations));
      }

      if (resolvedRawFootage) {
        setRawFootage(resolvedRawFootage as any);
        localStorage.setItem('erp_raw_footage', JSON.stringify(resolvedRawFootage));
      }

      if (resolvedProduction) {
        const mappedProduction = resolvedProduction.map((prod: any) => {
          let leadId = '';
          if (prod.production_id && prod.production_id.startsWith('PRD-')) {
            leadId = prod.production_id.replace('PRD-', '');
          }
          if (!leadId) {
            const raw = resolvedRawFootage?.find(r => r.tracking_id === prod.tracking_id);
            const ord = resolvedOrders?.find(o => o.order_id === raw?.order_id);
            leadId = ord?.lead_id || '';
          }
          const associatedLead = resolvedLeads?.find(ld => ld.lead_id === leadId);
          const leadStatus = associatedLead?.current_status || associatedLead?.status;
          return {
            ...prod,
            editing_status: leadStatus || prod.editing_status
          };
        }) as any;
        setProduction(mappedProduction);
        localStorage.setItem('erp_production', JSON.stringify(mappedProduction));
      }

      if (resolvedPayments) {
        setPayments(resolvedPayments as any);
        localStorage.setItem('erp_payments', JSON.stringify(resolvedPayments));
      }

      if (resolvedLogs) {
        setLogs(resolvedLogs as any);
        localStorage.setItem('erp_activity_logs', JSON.stringify(resolvedLogs));
      }
      if (staffAssignmentsRes && staffAssignmentsRes.data) {
        setStaffAssignments(staffAssignmentsRes.data as StaffAssignment[]);
        localStorage.setItem('erp_staff_assignments', JSON.stringify(staffAssignmentsRes.data));
      }

      if (leadStaffAssignmentHistoryRes && leadStaffAssignmentHistoryRes.data) {
        setLeadStaffAssignmentHistory(leadStaffAssignmentHistoryRes.data as LeadStaffAssignmentHistory[]);
        localStorage.setItem('erp_lead_staff_assignment_history', JSON.stringify(leadStaffAssignmentHistoryRes.data));
      }

      if (leadEquipmentHistoryRes && leadEquipmentHistoryRes.data) {
        setLeadEquipmentHistory(leadEquipmentHistoryRes.data as LeadEquipmentHistory[]);
      }

      if (quotationsRes && quotationsRes.data) {
        const parsedQuotes = (quotationsRes.data as any[]).map((q: any) => {
          let metadata: any = {};
          if (q.terms_conditions && q.terms_conditions.includes('METADATA:')) {
            try {
              const parts = q.terms_conditions.split('METADATA:');
              const jsonStr = parts[1]?.trim();
              if (jsonStr) {
                metadata = JSON.parse(jsonStr);
              }
            } catch (e) {
              console.warn('Failed to parse metadata from terms_conditions:', e);
            }
          }
          return {
            ...q,
            order_id: q.order_id || metadata.order_id || '',
            customer_id: q.customer_id || metadata.customer_id || '',
            pdf_url: q.pdf_url || metadata.pdf_url || '',
            whatsapp_sent_status: q.whatsapp_sent_status !== undefined ? q.whatsapp_sent_status : (metadata.whatsapp_sent_status || false),
            viewed_status: q.viewed_status !== undefined ? q.viewed_status : (metadata.viewed_status || false),
            generated_date: q.generated_date || metadata.generated_date || q.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            sales_staff_name: metadata.sales_staff_name || '',
            sales_staff_mobile: metadata.sales_staff_mobile || '',
            editableInclusions: metadata.editableInclusions || null,
            editableDeliverables: metadata.editableDeliverables || null
          };
        });
        setQuotations(parsedQuotes);
        localStorage.setItem('erp_quotations', JSON.stringify(parsedQuotes));
      }

      if (notifRes && notifRes.data) {
        setNotifications(notifRes.data.map(mapNotificationFromDb));
      }
      
      let finalStaff = (staffRes && staffRes.data) ? staffRes.data : [];
      if (staffRes && staffRes.data && staffRes.data.length === 0) {
        console.log('Operations staff table is empty in database. Seeding initial staff on-the-fly...');
        const initialStaffSeed = [
          {
            staff_id: 'STF-001',
            name: 'Emily Watson',
            mobile: '+1 (555) 234-5678',
            email: 'emily@photocrew.com',
            role: 'Production Manager',
            department: 'Operations',
            status: 'Active',
            joining_date: '2025-01-10',
            profile_photo: '',
            notes: 'Orchestrates chief editing operations and delivery workflows.',
            created_by: 'System',
            updated_by: 'System',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            staff_id: 'STF-002',
            name: 'Alex Rivera',
            mobile: '+1 (555) 345-6789',
            email: 'alex@photocrew.com',
            role: 'Senior Wedding Editor',
            department: 'Operations',
            status: 'Active',
            joining_date: '2024-03-15',
            profile_photo: '',
            notes: 'Cinematic storytelling, custom audio layout, color grading master.',
            created_by: 'System',
            updated_by: 'System',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        
        const mappedSeed = initialStaffSeed.map(s => {
          const sanitized = stripClientOnlyFields('operations_staff', s);
          sanitized.staff_id = mapToDbStaffId(s.staff_id);
          return sanitized;
        });
        await supabaseClient.from('operations_staff').upsert(mappedSeed).then(
          () => console.log('Successfully seeded operations_staff.'),
          (err) => console.warn('Failed seeding operations_staff:', err)
        );
        // Map the initial seeded staff using the same logic as database parsing so that internal state is fully aligned and loaded right after seeding
        finalStaff = mappedSeed;
      }

      if (finalStaff && finalStaff.length > 0) {
        const mappedStaff = finalStaff.map((st: any) => {
          let extra: any = {};
          if (st.notes && st.notes.trim().startsWith('{') && st.notes.trim().endsWith('}')) {
            try {
              extra = JSON.parse(st.notes);
            } catch (e) {
              // Not JSON notes, use as is
            }
          }
          return {
            ...st,
            ...extra,
            staff_id: mapFromDbStaffId(st.staff_id),
            notes: (st.notes && st.notes.trim().startsWith('{') && st.notes.trim().endsWith('}')) ? (extra.notes || '') : st.notes
          };
        });
        setStaff(mappedStaff);
      }
      let finalEquipment = (equipRes && equipRes.data) ? equipRes.data : [];
      if (equipRes && equipRes.data && equipRes.data.length === 0 && INITIAL_EQUIPMENT && INITIAL_EQUIPMENT.length > 0) {
        console.log('Equipment table is empty in database. Seeding initial equipment on-the-fly...');
        const mappedSeed = INITIAL_EQUIPMENT.map(e => {
          const sanitized = stripClientOnlyFields('equipment', e);
          sanitized.equipment_id = mapToDbEquipmentId(e.equipment_id);
          return sanitized;
        });
        await supabaseClient.from('equipment').upsert(mappedSeed).then(
          () => console.log('Successfully seeded equipment.'),
          (err) => console.warn('Failed seeding equipment:', err)
        );
        finalEquipment = mappedSeed;
      }

      if (finalEquipment && finalEquipment.length > 0) {
        const mappedEquipment = finalEquipment.map((eq: any) => ({
          ...eq,
          equipment_id: mapFromDbEquipmentId(eq.equipment_id)
        }));
        setEquipment(mappedEquipment);
      }

      // Sync specialties and editor assignments from Supabase if they exist
      try {
        const { data: dbSpecList } = await supabaseClient.from('production_specialties').select('*');
        if (dbSpecList) {
          setSpecialities(dbSpecList);
        }
      } catch (err) {
        console.warn('Could not read production_specialties from Supabase:', err);
      }

      try {
        const { data: dbAssignList } = await supabaseClient.from('editor_assignments').select('*');
        if (dbAssignList) {
          setEditorAssignments(dbAssignList);
        }
      } catch (err) {
        console.warn('Could not read editor_assignments from Supabase:', err);
      }

      try {
        const { data: dbHandovers } = await supabaseClient.from('equipment_handovers').select('*');
        if (dbHandovers && dbHandovers.length > 0) {
          setEquipmentHandovers(dbHandovers);
        }
      } catch (err) {
        console.warn('Could not read equipment_handovers from Supabase:', err);
      }

      updateDiagnosticMetric('read', 'ok');
      updateDiagnosticMetric('connection', 'connected');
    } catch (err: any) {
      console.warn('Fetch error (handled):', err?.message || String(err));
      updateDiagnosticMetric('read', 'fail', err?.message || String(err));
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
      { table: 'packages', key: 'package_id', setter: setPackages }
    ].map(({ table, key, setter }) => {
      return supabaseClient
        .channel(`rt-${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            updateDiagnosticMetric('realtime', 'ok');
            if (payload.eventType === 'INSERT') {
              setter((prev: any[]) => {
                const item = payload.new;
                let mappedItem = table === 'users' ? { ...item, id: mapFromDbUserId(item.id) } : item;
                if (table === 'notifications') {
                  mappedItem = mapNotificationFromDb(item);
                }
                if (table === 'leads') {
                  let finalStatus = mappedItem.current_status || mappedItem.status || 'New Lead';
                  if (statusHistory && statusHistory.length > 0) {
                    const historyForLead = statusHistory.filter((h: any) => h.lead_id === mappedItem.lead_id);
                    if (historyForLead.length > 0) {
                      const sorted = [...historyForLead].sort((a: any, b: any) => 
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                      );
                      if (sorted[0]?.new_status) {
                        finalStatus = sorted[0].new_status;
                      }
                    }
                  }
                  const parsed = deserializeLeadEvents(mappedItem.notes_special_customizations);
                  mappedItem = { ...mappedItem, status: finalStatus as CurrentStage, current_status: finalStatus, events: parsed.events };
                }
                if (table === 'orders') {
                  mappedItem = { ...mappedItem, current_stage: mappedItem.current_stage || mappedItem.order_status };
                }
                if (table === 'operations_staff') {
                  let extra: any = {};
                  if (item.notes && item.notes.trim().startsWith('{') && item.notes.trim().endsWith('}')) {
                    try {
                      extra = JSON.parse(item.notes);
                    } catch (e) {
                      console.warn("Real-time parsing error:", e);
                    }
                  }
                  mappedItem = {
                    ...item,
                    ...extra,
                    staff_id: mapFromDbStaffId(item.staff_id),
                    notes: (item.notes && item.notes.trim().startsWith('{') && item.notes.trim().endsWith('}')) ? (extra.notes || '') : item.notes
                  };
                }
                if (table === 'packages') {
                  mappedItem = mapDbRecordToPackage(item);
                }
                if (table === 'equipment') {
                  mappedItem = {
                    ...item,
                    equipment_id: mapFromDbEquipmentId(item.equipment_id)
                  };
                }
                const exists = prev.some(x => x[key] === mappedItem[key]);
                if (exists) return prev;
                return [mappedItem, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              setter((prev: any[]) => {
                const item = payload.new;
                let mappedItem = table === 'users' ? { ...item, id: mapFromDbUserId(item.id) } : item;
                if (table === 'notifications') {
                  mappedItem = mapNotificationFromDb(item);
                }
                if (table === 'leads') {
                  let finalStatus = mappedItem.current_status || mappedItem.status || 'New Lead';
                  if (statusHistory && statusHistory.length > 0) {
                    const historyForLead = statusHistory.filter((h: any) => h.lead_id === mappedItem.lead_id);
                    if (historyForLead.length > 0) {
                      const sorted = [...historyForLead].sort((a: any, b: any) => 
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                      );
                      if (sorted[0]?.new_status) {
                        finalStatus = sorted[0].new_status;
                      }
                    }
                  }
                  const parsed = deserializeLeadEvents(mappedItem.notes_special_customizations);
                  mappedItem = { ...mappedItem, status: finalStatus as CurrentStage, current_status: finalStatus, events: parsed.events };
                }
                if (table === 'orders') {
                  mappedItem = { ...mappedItem, current_stage: mappedItem.current_stage || mappedItem.order_status };
                }
                if (table === 'operations_staff') {
                  let extra: any = {};
                  if (item.notes && item.notes.trim().startsWith('{') && item.notes.trim().endsWith('}')) {
                    try {
                      extra = JSON.parse(item.notes);
                    } catch (e) {
                      console.warn("Real-time parsing error:", e);
                    }
                  }
                  mappedItem = {
                    ...item,
                    ...extra,
                    staff_id: mapFromDbStaffId(item.staff_id),
                    notes: (item.notes && item.notes.trim().startsWith('{') && item.notes.trim().endsWith('}')) ? (extra.notes || '') : item.notes
                  };
                }
                if (table === 'packages') {
                  mappedItem = mapDbRecordToPackage(item);
                }
                if (table === 'equipment') {
                  mappedItem = {
                    ...item,
                    equipment_id: mapFromDbEquipmentId(item.equipment_id)
                  };
                }
                return prev.map(x => (x[key] === mappedItem[key] ? mappedItem : x));
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

    // Realtime subscriptions handle granular updates. No global sync needed.
    return () => {
      channels.forEach(ch => supabaseClient.removeChannel(ch));
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const broadcastSyncPing = async () => {
    // No-op: realtime postgres_changes handles granular syncing
  };



  // Handle auto-logout if user is deactivated
  useEffect(() => {
    if (currentUser && users.length > 0) {
      const dbUser = users.find(u => u.id === currentUser.id || u.email === currentUser.email);
      if (!dbUser || !dbUser.active) {
        logout();
        alert('Your account is no longer active. You have been logged out.');
      } else if (dbUser.role !== currentUser.role || dbUser.name !== currentUser.name) {
        // Sync detail changes in business owner's panel
        setCurrentUser(dbUser);
        setCurrentRoleState(dbUser.role);
        setCurrentUserNameState(dbUser.name);
      }
    }
  }, [users, currentUser]);

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

      // Step 1: Resolve Email if Username was provided
      let loginEmail = cleanInput;
      if (!cleanInput.includes('@')) {
        // If it's a username, we must resolve it to an email first via RPC or direct query.
        // Assuming public.users is readable or we use a proxy endpoint. For now, try direct query.
        try {
          const { data, error } = await supabaseClient
            .from('users')
            .select('email')
            .eq('username', cleanInput)
            .maybeSingle();
            
          if (error) {
            logAttempt('Failed', `Error resolving username: ${error.message}`);
            return { success: false, error: `Error resolving username: ${error.message}` };
          }
          if (!data || !data.email) {
            const msg = 'User not found.';
            logAttempt('Failed', msg);
            return { success: false, error: msg };
          }
          loginEmail = data.email;
        } catch (err: any) {
          logAttempt('Failed', `Exception resolving username: ${err?.message || err}`);
          return { success: false, error: `Exception resolving username: ${err?.message || err}` };
        }
      }

      // Step 2: Authenticate using Supabase Auth
      try {
        console.log(`[LOGIN] Authenticating via Supabase Auth for: ${loginEmail}`);
        const { data: authData, error: authErr } = await supabaseClient.auth.signInWithPassword({
          email: loginEmail,
          password: password
        });

        if (authErr) {
          logAttempt('Failed', authErr.message);
          return { success: false, error: authErr.message }; // Use actual Supabase error
        }

        if (!authData.session) {
          const msg = 'Login successful, but the session could not be created.';
          logAttempt('Failed', msg);
          return { success: false, error: msg };
        }

        const authUserId = authData.user.id;
        
        // Step 3: Load user profile from public.users table after successful authentication
        const { data: profileData, error: profileErr } = await supabaseClient
          .from('users')
          .select('*')
          .eq('email', loginEmail)
          .maybeSingle();

        if (profileErr) {
          logAttempt('Failed', `Failed to load user profile: ${profileErr.message}`, authUserId);
          return { success: false, error: `Failed to load user profile: ${profileErr.message}` };
        }

        if (!profileData) {
          const msg = 'User profile not found in public.users table.';
          logAttempt('Failed', msg, authUserId);
          return { success: false, error: msg };
        }
        
        dbUser = profileData;

        // Check if database row ID needs to be updated to match the auth user's UUID
        if (dbUser.id !== authUserId) {
          console.log(`[LOGIN] Aligning database ID ${dbUser.id} to Auth UUID ${authUserId}`);
          const { error: updateIdErr } = await supabaseClient
            .from('users')
            .update({ id: authUserId })
            .eq('email', dbUser.email);

          if (!updateIdErr) {
            dbUser.id = authUserId;
          } else {
            console.warn(`[LOGIN] Failed to update db user ID to match Auth UUID:`, updateIdErr.message);
          }
        }
      } catch (authException: any) {
        logAttempt('Failed', authException?.message || String(authException));
        return { success: false, error: authException?.message || String(authException) };
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

      const validRoles = ['Business Owner', 'Sales Team', 'Operations Team', 'Production Team'];
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
        throw new Error("User does not have permission to create leads.");
      }
    } else {
      if (!currentUser) {
        throw new Error("Please login again.");
      }
      if (currentUser.role !== 'Sales Team' && currentUser.role !== 'Business Owner') {
        throw new Error("User does not have permission to create leads.");
      }
    }

    const leadId = `LD-${Math.floor(9012 + Math.random() * 988)}`;
    const serializedNotes = serializeLeadEvents(leadDetails.events || [], leadDetails.notes_special_customizations || '');
    const newLead: Lead = {
      ...leadDetails,
      email: leadDetails.email || '',
      lead_id: leadId,
      created_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
      sales_person: currentUserName,
      status: 'New Lead',
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

    // await fetchFromDb(); // Disabled to prevent full reload

    logActivity(`Created Lead: ${newLead.customer_name}`, 'Sales', leadId, 'N/A', 'New Lead');
    return leadId;
  };

  const saveLeadPackages = async (
    leadId: string,
    packagesSelected: Omit<LeadPackage, 'lead_package_id' | 'lead_id'>[]
  ) => {
    await pushDelete('lead_packages', 'lead_id', leadId);

    if (packagesSelected && packagesSelected.length > 0) {
      const formattedPackages: LeadPackage[] = packagesSelected.map((pkg, index) => ({
        ...pkg,
        lead_package_id: `LP-${leadId}-${index}-${Math.floor(100 + Math.random() * 900)}`,
        lead_id: leadId,
        created_at: new Date().toISOString()
      }));
      for (const p of formattedPackages) {
        await pushInsert('lead_packages', p);
      }
    }

    // await fetchFromDb(); // Disabled to prevent full reload
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

    const res = await pushUpdate('leads', 'lead_id', leadId, {
      status,
      current_status: status,
      budget: quotationAmount !== undefined ? quotationAmount : targetLead?.budget,
      remarks: `${targetLead?.remarks || ''}\n[Update ${timestamp.split('T')[0]}]: ${callNotes}. ${negotiationNotes ? 'Neg Notes: ' + negotiationNotes : ''}. Next follow-up: ${nextFollowUpDate}`,
      updated_by: currentUserName,
      updated_at: timestamp
    });

    if (!res?.success) {
      throw new Error(res?.error || "Failed to save follow-up details in database.");
    }

    if (status !== previousStage) {
      const linkedOrder = orders.find(o => o.lead_id === leadId);
      const orderId = linkedOrder?.order_id || null;

      if (status === 'Order Confirmed' && !orderId) {
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
        new_status: status,
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
            status,
            current_status: status,
            budget: quotationAmount !== undefined ? quotationAmount : ld.budget,
            remarks: `${ld.remarks || ''}\n[Update ${timestamp.split('T')[0]}]: ${callNotes}. ${negotiationNotes ? 'Neg Notes: ' + negotiationNotes : ''}. Next follow-up: ${nextFollowUpDate}`,
            updated_by: currentUserName,
            updated_at: timestamp
          };
        }
        return ld;
      })
    );

    await fetchFromDb();
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
      masterOrderId = existingOrder ? existingOrder.order_id : `ORD-${Math.floor(1012 + Math.random() * 800)}`;
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
        event_date: eventDate || targetLead.event_date,
        event_time: eventTime || targetLead.event_time,
        reporting_time: reportingTime || targetLead.reporting_time || '',
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
        event_date: eventDate || targetLead.event_date,
        event_time: eventTime || targetLead.event_time,
        reporting_time: reportingTime || '',
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
        whatsapp_number: targetLead.whatsapp_number || '',
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

    await fetchFromDb();

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
      'Staff Assigned',
      'Event Scheduled',
      'Event Completed',
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

    // await fetchFromDb(); // Disabled to prevent full reload

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

        // STEP 3: UPDATE CURRENT ASSIGNMENT
        const existing = staffAssignments.find(
          (ea) => ea.order_id === orderId && ea.staff_role === a.staff_role
        );
        const assignId = existing?.assignment_id || `ASST-${Math.floor(1000 + Math.random() * 9000)}`;
        const assignDate = existing?.assignment_date || timestamp.split('T')[0];

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

        if (existing) {
          const resAssign = await pushUpdate('staff_assignments', 'assignment_id', assignId, newAssign);
          if (!resAssign.success) throw new Error(`Error updating staff assignment:\n\n${resAssign.error}`);
        } else {
          const resAssign = await pushInsert('staff_assignments', newAssign);
          if (!resAssign.success) throw new Error(`Error creating staff assignment:\n\n${resAssign.error}`);
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

      // STEP 5: UPDATE LEAD STATUS
      const statusHist = {
        lead_id: leadId,
        order_id: orderId,
        old_status: targetLead.current_status || 'Order Confirmed',
        new_status: 'Staff Assigned',
        changed_by: changedBy,
        changed_by_role: changedByRole,
        remarks: `Assigned: ${assignments.map(a => `${a.staff_role} (${a.staff_name})`).join(', ')}`,
        created_at: timestamp
      };
      await pushInsert('lead_status_history', statusHist);

      const resLead = await pushUpdate('leads', 'lead_id', leadId, { 
        current_status: 'Staff Assigned', 
        status: 'Staff Assigned',
        updated_by: changedBy
      });
      if (!resLead.success) throw new Error(`Error updating lead status:\n\n${resLead.error}`);

      const resOrder = await pushUpdate('orders', 'order_id', orderId, { 
        current_stage: 'Staff Assigned', 
        updated_by: changedBy
      });
      if (!resOrder.success) throw new Error(`Error updating order stage:\n\n${resOrder.error}`);
    }

    // STEP 6: REFRESH DASHBOARD
    await fetchFromDb();

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

    const newProd: Production = {
      production_id: pId,
      tracking_id: trackingId,
      editor_assigned: 'Unassigned',
      raw_footage_location: newRawFootage.server_path,
      editing_status: 'Raw Footage Received',
      remarks: 'Raw footage uploaded. Awaiting editor assignment.',
    };

    const targetOrder = augmentedOrders.find((o) => o.order_id === orderId);
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

    await pushInsert('raw_footage', newRawFootage);
    await pushInsert('production', newProd);

    // await fetchFromDb(); // Disabled to prevent full reload

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
      if (targetProd) {
        const rProd = await pushUpdate('production', 'production_id', targetProd.production_id, updates);
        if (!rProd?.success) {
          console.warn("[updateProduction] DB operation failed for production table update, will fallback to Leads:", rProd?.error);
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
          console.warn("[updateProduction] DB operation failed for production table insert, will fallback to Leads:", rProd?.error);
        }
      }
    } catch (prodErr: any) {
      console.warn("[updateProduction] Production DB write exception:", prodErr?.message || prodErr);
    }

    const actualTrackingId = targetProd ? targetProd.tracking_id : inferredTrackingId;

    // Find linked order using all possible connections
    let tgtOrder = augmentedOrders.find(o => o.order_id === actualTrackingId || o.lead_id === actualTrackingId);
    if (!tgtOrder) {
      const rf = rawFootage.find(f => f.tracking_id === actualTrackingId || f.order_id === actualTrackingId);
      if (rf) {
        tgtOrder = augmentedOrders.find(o => o.order_id === rf.order_id);
      }
    }

    // Determine Stage to update on Order and Lead
    let nextStage: CurrentStage | null = null;
    if (updates.editing_status) {
      nextStage = updates.editing_status as any;
    } else if (updates.editor_assigned && updates.editor_assigned !== 'Unassigned') {
      nextStage = 'Editor Assigned';
    } else if (targetProd) {
      nextStage = targetProd.editing_status as any;
    }

    // Map strings to satisfy database constraints for orders & leads
    if (nextStage === 'Project Closed' || (nextStage as any) === 'Completed') {
      nextStage = 'Closed';
    } else if (nextStage === 'Project Delivered') {
      nextStage = 'Delivered';
    }

    const leadIdToUpdate = tgtOrder?.lead_id || actualTrackingId;

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
      if (!rLead?.success) {
        throw new Error("Failed to update lead: " + rLead?.error);
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
        if (!rOrd?.success) {
          throw new Error("Failed to update order: " + rOrd?.error);
        }
      }
    }

    // await fetchFromDb(); // Disabled to prevent full reload

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

    // await fetchFromDb(); // Disabled to prevent full reload

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
    const targetStage: CurrentStage = 'Raw Footage Received';

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

    // Also update event_status of corresponding Operations record to 'Completed' (which satisfies DB constraint ('Assigned', 'Completed')) if exists
    await pushUpdate('operations', 'order_id', orderId, { event_status: 'Completed' });

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

    if (existingRf) {
      const rRf = await pushUpdate('raw_footage', 'tracking_id', trackingId, finalRf);
      if (!rRf?.success) {
        throw new Error("Failed to update raw footage table: " + rRf?.error);
      }
    } else {
      const rRf = await pushInsert('raw_footage', finalRf);
      if (!rRf?.success) {
        throw new Error("Failed to insert raw footage to database: " + rRf?.error);
      }
    }

    // Ensure production entry exists or update it
    let existingProd = augmentedProduction.find(p => p.tracking_id === trackingId);
    if (existingProd) {
      const rProd = await pushUpdate('production', 'tracking_id', trackingId, {
        raw_footage_location: resolvedLink,
        remarks: `Raw footage received via ${storageType || 'Google Drive'}. ${uploadNotes || ''}`,
      });
      if (!rProd?.success) {
        throw new Error("Failed to update production data: " + rProd?.error);
      }
    } else {
      const pId = `PRD-${Math.floor(4012 + Math.random() * 850)}`;
      const newProd: Production = {
        production_id: pId,
        tracking_id: trackingId,
        editor_assigned: 'Unassigned',
        raw_footage_location: resolvedLink,
        editing_status: 'Raw Footage Received',
        remarks: `Raw footage received via ${storageType || 'Google Drive'}. ${uploadNotes || ''}`,
      };
      const rProd = await pushInsert('production', newProd);
      if (!rProd?.success) {
        throw new Error("Failed to insert production data: " + rProd?.error);
      }
    }

    addNotification({
      user_id: 'All',
      project_id: orderId,
      task_id: 'Editing',
      notification_type: 'Task Assigned',
      title: 'New Raw Footage Received',
      message: `Raw footage for "${targetOrder.package_name || 'Shoot'}" (Order: ${orderId}) has been received and verified. Storage Type: ${storageType || 'Google Drive'}. Ready for editing!`,
      recipient_role: 'Production Team'
    });

    // await fetchFromDb(); // Disabled to prevent full reload

    logActivity(`Raw Footage Received and Confirmed in system for Order: ${orderId}. Drive Link: ${resolvedLink}. Storage: ${storageType || 'Google Drive'}`, 'Operations', orderId, previousStage, targetStage);
  };

  const updateOrderStage = async (orderId: string, stage: CurrentStage) => {
    const targetOrder = augmentedOrders.find((o) => o.order_id === orderId);
    const previousStage = targetOrder ? targetOrder.current_stage : 'Order Confirmed';
    const timestamp = new Date().toISOString();

    const rOrd = await pushUpdate('orders', 'order_id', orderId, { 
      current_stage: stage,
      updated_by: currentUserName,
      updated_at: timestamp
    });
    if (!rOrd?.success) {
      throw new Error("Failed to update order stage: " + rOrd?.error);
    }

    if (targetOrder) {
      const rLead = await pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
        status: stage,
        current_status: stage,
        updated_by: currentUserName,
        updated_at: timestamp
      });
      if (!rLead?.success) {
        throw new Error("Failed to update lead status: " + rLead?.error);
      }
    }

    // await fetchFromDb(); // Disabled to prevent full reload

    logActivity(`Updated stage for Order ${orderId}`, 'Operations', orderId, previousStage, stage);
  };

  // 7. Mark Delivered (Action button)
  const markDelivered = async (trackingId: string, remarks?: string) => {
    const targetFootage = rawFootage.find((rf) => rf.tracking_id === trackingId);
    if (!targetFootage) return;

    const orderId = targetFootage.order_id;
    const previousStage = augmentedOrders.find((o) => o.order_id === orderId)?.current_stage || 'Approved';

    const payment = augmentedPayments.find((p) => p.order_id === orderId);
    const balanceDue = payment ? payment.balance_due : 1;
    const targetStage: CurrentStage = balanceDue === 0 ? 'Closed' : 'Payment Pending';
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
    }

    // Update production status
    if (targetProd) {
      const finalRemarks = `${targetProd.remarks || ''}\n${remarks || 'Delivered to client.'}`;
      const rProd = await pushUpdate('production', 'production_id', targetProd.production_id, {
        editing_status: 'Delivered',
        customer_review_status: 'Approved',
        delivery_date: timestamp.split('T')[0],
        remarks: finalRemarks
      });
      if (!rProd?.success) {
        throw new Error("Failed to update production: " + rProd?.error);
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
    }

    // await fetchFromDb(); // Disabled to prevent full reload

    logActivity(`Marked Project Delivered to client for Order: ${orderId}`, 'Production', trackingId, previousStage, targetStage);
  };

  // 8. Payments update
  const recordPayment = async (
    orderId: string, 
    amountReceived: number, 
    paymentDate: string, 
    proofUrl?: string,
    transactionId?: string
  ) => {
    let isFullyPaid = false;
    const targetPayment = augmentedPayments.find((p) => p.order_id === orderId);
    if (!targetPayment) return;

    const totalPaid = targetPayment.advance_received + targetPayment.final_payment_received + amountReceived;
    const outstanding = Math.max(0, targetPayment.quotation_amount - totalPaid);
    isFullyPaid = outstanding === 0;
    const resolvedProofUrl = proofUrl || 'https://photocrew-receipts.s3.amazonaws.com/rec-custom.pdf';

    const rPay = await pushUpdate('payments', 'payment_id', targetPayment.payment_id, {
      final_payment_received: targetPayment.final_payment_received + amountReceived,
      balance_due: outstanding,
      payment_date: paymentDate,
      payment_proof_url: resolvedProofUrl,
      payment_status: isFullyPaid ? 'Fully Paid' : 'Partially Paid',
      transaction_id: transactionId || targetPayment.transaction_id || undefined
    });
    if (!rPay?.success) {
      throw new Error("Failed to record payment in database: " + rPay?.error);
    }

    // If fully paid, move order status to next transition or check if delivered first.
    // If fully paid AND previous stage was delivered, we can transition stage to Closed!
    let nextStage: CurrentStage = 'Payment Pending';
    const currentOrder = augmentedOrders.find((o) => o.order_id === orderId);
    const previousStage = currentOrder ? currentOrder.current_stage : 'Payment Pending';
    const timestamp = new Date().toISOString();

    if (currentOrder) {
      if (isFullyPaid) {
        nextStage = 'Closed';
      } else {
        nextStage = 'Payment Pending';
      }

      const nextOutstanding = Math.max(0, currentOrder.balance_amount - amountReceived);
      const rOrd = await pushUpdate('orders', 'order_id', orderId, {
        current_stage: nextStage,
        order_status: nextStage === 'Closed' ? 'Closed' : currentOrder.order_status,
        balance_amount: nextOutstanding,
        updated_by: currentUserName,
        updated_at: timestamp
      });
      if (!rOrd?.success) {
        throw new Error("Failed to update order status: " + rOrd?.error);
      }

      const rLead = await pushUpdate('leads', 'lead_id', currentOrder.lead_id, { 
        status: nextStage,
        current_status: nextStage,
        updated_by: currentUserName,
        updated_at: timestamp
      });
      if (!rLead?.success) {
        throw new Error("Failed to update lead: " + rLead?.error);
      }
    }

    // await fetchFromDb(); // Disabled to prevent full reload

    logActivity(`Recorded payment of ₹${amountReceived} for Order ${orderId}. Fully paid: ${isFullyPaid}`, 'Finance', orderId, previousStage, nextStage);
  };

  // User Management Admin features
  const addUser = async (name: string, email: string, mobile: string, role: UserRole, active: boolean, password?: string) => {
    throw new Error('Adding users is disabled. The system operates on four fixed accounts only.');
  };

  const signUpUser = async (name: string, username: string, email: string, mobile: string, role: UserRole, password: string) => {
    throw new Error('User registration is disabled. Only pre-configured system accounts are permitted.');
  };

  const editUser = async (id: string, updates: { name: string, email: string, mobile: string, role: UserRole, active: boolean }) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updates } : u));
    await pushUpdate('users', 'id', mapToDbUserId(id), updates);
    logActivity(`Updated User Account Profile: ${updates.name}`, 'UserManagement', id);
  };

  const toggleUserStatus = async (id: string) => {
    let targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    const nextActive = !targetUser.active;
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, active: nextActive } : u));
    await pushUpdate('users', 'id', mapToDbUserId(id), { active: nextActive });
    logActivity(`${nextActive ? 'Activated' : 'Deactivated'} User Account: ${targetUser.name}`, 'UserManagement', id);
  };

  const resetUserPassword = async (id: string, newPassword: string) => {
    let targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, password: newPassword } : u));
    await pushUpdate('users', 'id', mapToDbUserId(id), { password: newPassword });
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
      created_at: newPkg.created_at
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
      created_at: merged.created_at || new Date().toISOString()
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
          status: dbPayload.status
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
          
          const completedTasks = allTasks.filter(t => t.status === 'Completed').length;
          const totalTasks = allTasks.length;
          const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          let nextEditingStatus: EditingStatus = 'Editing Started';
          if (completedTasks === totalTasks && totalTasks > 0) {
            nextEditingStatus = 'Internal QC Review';
          } else if (status === 'Review Pending') {
            nextEditingStatus = 'Internal QC Review';
          } else if (status === 'Revision') {
            nextEditingStatus = 'Revision Required';
          } else if (status === 'In Progress' || status === 'Editing Started') {
            nextEditingStatus = 'Editing In Progress';
          }
          
          updateProduction(prodId, {
            editing_status: nextEditingStatus,
            editing_progress: `${progressPercent}%`,
            remarks: `Task updated: ${assignment.staff_name} (${assignment.speciality}) marked status to ${status}. Total Project Tasks Progress: ${progressPercent}%.`
          });
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

  const addQuotation = async (newQuote: any) => {
    setQuotations((prev) => {
      const next = [newQuote, ...prev];
      localStorage.setItem('erp_quotations', JSON.stringify(next));
      return next;
    });

    logActivity(`Generated Quotation: ${newQuote.quotation_number}`, 'Sales', newQuote.lead_id, 'N/A', 'Quotation Generated');

    if (!supabaseClient) return;

    const metadataObj = {
      order_id: newQuote.order_id,
      customer_id: newQuote.customer_id,
      pdf_url: newQuote.pdf_url,
      whatsapp_sent_status: newQuote.whatsapp_sent_status,
      viewed_status: newQuote.viewed_status,
      generated_date: newQuote.generated_date,
      sales_staff_name: newQuote.sales_staff_name || '',
      sales_staff_mobile: newQuote.sales_staff_mobile || '',
      editableInclusions: newQuote.editableInclusions || null,
      editableDeliverables: newQuote.editableDeliverables || null
    };

    const packedTerms = `${newQuote.terms_conditions || ''}\n\nMETADATA:${JSON.stringify(metadataObj)}`;

    const standardPayload = {
      quotation_id: newQuote.quotation_id,
      lead_id: newQuote.lead_id,
      quotation_number: newQuote.quotation_number,
      quotation_amount: newQuote.quotation_amount,
      discount_amount: newQuote.discount_amount,
      tax_amount: newQuote.tax_amount || 0,
      final_amount: newQuote.final_amount,
      quotation_status: newQuote.quotation_status,
      valid_until: newQuote.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      terms_conditions: packedTerms,
      created_by: newQuote.created_by,
      created_at: newQuote.created_at,
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
    };

    try {
      const { error } = await supabaseClient.from('quotations').insert(standardPayload);
      if (error) {
        console.warn('Could not insert quotation into Supabase with standard fields:', error.message);
      } else {
        // fetchFromDb().catch(console.error); // Disabled to prevent full reload
      }
    } catch (err) {
      console.warn('Supabase exception on inserting quotation:', err);
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

      const metadataObj = {
        order_id: updatedQuote.order_id,
        customer_id: updatedQuote.customer_id,
        pdf_url: updatedQuote.pdf_url,
        whatsapp_sent_status: updatedQuote.whatsapp_sent_status,
        viewed_status: updatedQuote.viewed_status,
        generated_date: updatedQuote.generated_date,
        sales_staff_name: updatedQuote.sales_staff_name || '',
        sales_staff_mobile: updatedQuote.sales_staff_mobile || '',
        editableInclusions: updatedQuote.editableInclusions || null,
        editableDeliverables: updatedQuote.editableDeliverables || null
      };

      let cleanTerms = updatedQuote.terms_conditions || '';
      if (cleanTerms.includes('\n\nMETADATA:')) {
        cleanTerms = cleanTerms.split('\n\nMETADATA:')[0];
      } else if (cleanTerms.includes('METADATA:')) {
        cleanTerms = cleanTerms.split('METADATA:')[0];
      }

      const packedTerms = `${cleanTerms}\n\nMETADATA:${JSON.stringify(metadataObj)}`;

      const standardPayload = {
        quotation_status: updatedQuote.quotation_status,
        terms_conditions: packedTerms,
        package_name: updatedQuote.package_name,
        package_price: updatedQuote.package_price,
        deliverables_description: updatedQuote.deliverables_description,
        notes_special_customizations: updatedQuote.notes_special_customizations,
        discount_amount: updatedQuote.discount_amount,
        additional_services_cost: updatedQuote.additional_services_cost,
        client_residence_address: updatedQuote.client_residence_address,
        city: updatedQuote.city,
        state: updatedQuote.state,
        pincode: updatedQuote.pincode,
        desired_event_shoot_type: updatedQuote.desired_event_shoot_type,
        updated_at: new Date().toISOString()
      };

      try {
        const { error } = await supabaseClient.from('quotations').update(standardPayload).eq('quotation_id', quotationId);
        if (error) {
          console.warn('Supabase Update error for quotations table:', error.message);
        } else {
          // fetchFromDb().catch(console.error); // Disabled to prevent full reload
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
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient.from('lead_equipment_history').insert([history]).select();
    if (error) {
      console.error('Error adding lead equipment history:', error);
      throw error;
    }
    if (data) {
      setLeadEquipmentHistory(prev => [data[0] as LeadEquipmentHistory, ...prev]);
    }
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    if (!leadId || typeof leadId !== 'string' || leadId.trim() === '') {
      throw new Error('lead_id is missing or invalid.');
    }

    const prevLead = leads.find(l => l.lead_id === leadId);
    if (supabaseClient) {
      const { data: dbLead, error: dbLeadErr } = await supabaseClient.from('leads').select('lead_id').eq('lead_id', leadId).maybeSingle();
      if (dbLeadErr) {
        throw new Error(`Failed to check if lead exists in 'leads' table. Supabase Error: ${dbLeadErr.message}`);
      }
      if (!dbLead) {
        throw new Error(`Lead record with ID "${leadId}" was not found in the "leads" table.`);
      }
    } else if (!prevLead) {
      throw new Error(`Lead record with ID "${leadId}" was not found in local cache.`);
    }

    const timestamp = new Date().toISOString();
    const finalUpdates = { ...updates };
    
    if ('events' in finalUpdates) {
      const notesToUse = finalUpdates.notes_special_customizations !== undefined 
        ? finalUpdates.notes_special_customizations 
        : (prevLead?.notes_special_customizations || '');
      finalUpdates.notes_special_customizations = serializeLeadEvents(finalUpdates.events || [], notesToUse);
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

    await fetchFromDb();
    return res;
  };

  const [unlockedRecords, setUnlockedRecords] = useState<UnlockOverride[]>(() => {
    const saved = localStorage.getItem('erp_unlocked_records');
    return saved ? JSON.parse(saved) : [];
  });

  const getLeadCurrentStatus = (lead: Lead): string => {
    if (statusHistory && statusHistory.length > 0) {
      const historyForLead = statusHistory.filter((h: any) => h.lead_id === lead.lead_id);
      if (historyForLead.length > 0) {
        const sorted = [...historyForLead].sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        if (sorted[0]?.new_status) {
          return sorted[0].new_status;
        }
      }
    }

    const current = lead.current_status;
    if (current && current.trim() !== "") {
      return current;
    }
    
    return lead.status || 'New Lead';
  };

  const getLeadCurrentStage = (lead: Lead): 'Sales' | 'Operations' | 'Production' | 'Completed' => {
    const status = getLeadCurrentStatus(lead);
    
    const salesStatuses = ['New Lead', 'Contacted', 'Follow Up', 'Follow-up', 'Quotation Sent', 'Negotiation'];
    const opsStatuses = ['Order Confirmed', 'Operations Assigned', 'Staff Assigned', 'Event Scheduled', 'Event Completed'];
    const prodStatuses = ['Raw Footage Received', 'Editor Assigned', 'Editing Started', 'Editing In Progress', 'Internal QC Review', 'Client Review Sent', 'Internal Review', 'Client Review', 'Revision Required', 'Revision In Progress', 'Revision', 'Final Approval', 'Ready for Delivery'];
    
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
    const stageDept = getDepartmentForStage(stage);
    if (!stageDept) return false;
    
    const allowedDepts = ROLE_DEPARTMENT_MAP[role];
    return allowedDepts.includes(stageDept);
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
      const activeSalesStages = ['New Lead', 'Follow Up', 'Quotation Sent', 'Negotiation'];
      return !activeSalesStages.includes(lead.status);
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
        'New Lead', 'Follow Up', 'Quotation Sent', 'Negotiation', 'Order Confirmed',
        'New Order Received', 'Operations Assigned', 'Event Scheduled', 'Staff Assigned', 'Event Completed'
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

  // Automatic Reminder Notifications for Target Delivery Date
  useEffect(() => {
    if (isDataLoading) return;

    const checkAndGenerateReminders = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const nowMs = Date.now();
      
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

      for (const p of augmentedProduction) {
        const targetDateStr = p.target_delivery_date || p.expected_delivery_date;
        if (!targetDateStr) continue;

        const cleanDateStr = targetDateStr.split('T')[0];
        // Target is at 6:00 PM on target date
        const targetTimeObj = new Date(cleanDateStr + 'T18:00:00');
        const targetMs = targetTimeObj.getTime();
        const diffMs = targetMs - nowMs;
        const diffHours = diffMs / (1000 * 60 * 60);

        // Find customer name
        const ord = augmentedOrders.find(o => o.order_id === p.tracking_id || o.lead_id === p.tracking_id);
        const parentLead = leads.find(l => l.lead_id === p.tracking_id || (ord && l.lead_id === ord.lead_id));
        const customerName = ord?.customer_name || parentLead?.customer_name || 'Customer';
        const orderIdValue = ord?.order_id || p.tracking_id || 'N/A';

        // Check if project is marked as delivered
        const isDelivered = p.editing_status === 'Delivered' || p.editing_status === 'Closed' || p.editing_status === 'Approved' || p.editing_status === 'Final Approval';

        // 1. 24 Hours Before Reminder
        if (diffHours > 0 && diffHours <= 24 && !isDelivered) {
          const notifId = `NTF-rem-${p.production_id}-24h`;
          const exists = notifications.some(n => n.notification_id === notifId) || deletedIds.includes(notifId) || newlyAddedIds.has(notifId);
          if (!exists) {
            newlyAddedIds.add(notifId);
            await addNotification({
              notification_id: notifId,
              title: 'Target Delivery Reminder',
              message: `Project for **${customerName}** is due for delivery in 24 hours.`,
              recipient_role: 'Production Team',
              task_id: 'Delivery Reminder',
              notification_type: 'Target Delivery Reminder',
              project_id: orderIdValue,
              priority: 'High'
            });
          }
        }

        // 2. 5 Hours Before Reminder
        if (diffHours > 0 && diffHours <= 5 && !isDelivered) {
          const notifId = `NTF-rem-${p.production_id}-5h`;
          const exists = notifications.some(n => n.notification_id === notifId) || deletedIds.includes(notifId) || newlyAddedIds.has(notifId);
          if (!exists) {
            newlyAddedIds.add(notifId);
            await addNotification({
              notification_id: notifId,
              title: 'Urgent Delivery Reminder',
              message: `Project for **${customerName}** is due for delivery in 5 hours.`,
              recipient_role: 'Production Team',
              task_id: 'Delivery Reminder',
              notification_type: 'Target Delivery Reminder',
              project_id: orderIdValue,
              priority: 'Critical'
            });
          }
        }

        // 3. On Target Delivery Date Reminder
        if (todayStr === cleanDateStr && !isDelivered) {
          const notifId = `NTF-rem-${p.production_id}-today`;
          const exists = notifications.some(n => n.notification_id === notifId) || deletedIds.includes(notifId) || newlyAddedIds.has(notifId);
          if (!exists) {
            newlyAddedIds.add(notifId);
            await addNotification({
              notification_id: notifId,
              title: 'Delivery Due Today',
              message: `Project for **${customerName}** must be delivered today.`,
              recipient_role: 'Production Team',
              task_id: 'Delivery Reminder',
              notification_type: 'Target Delivery Reminder',
              project_id: orderIdValue,
              priority: 'Critical'
            });
          }
        }

        // 4. Overdue Delivery Reminder
        const isOverdue = (nowMs > targetMs || todayStr > cleanDateStr) && !isDelivered;
        if (isOverdue) {
          const notifId = `NTF-rem-${p.production_id}-overdue`;
          const exists = notifications.some(n => n.notification_id === notifId) || deletedIds.includes(notifId) || newlyAddedIds.has(notifId);
          if (!exists) {
            newlyAddedIds.add(notifId);
            await addNotification({
              notification_id: notifId,
              title: 'Delivery Overdue',
              message: `Project for **${customerName}** has passed its Target Delivery Date and is still pending delivery.`,
              recipient_role: 'Production Team',
              task_id: 'Delivery Reminder',
              notification_type: 'Target Delivery Reminder',
              project_id: orderIdValue,
              priority: 'Critical'
            });
          }
        }
      }
    };

    checkAndGenerateReminders().catch(e => console.warn("checkAndGenerateReminders error:", e));
  }, [isDataLoading, augmentedProduction, notifications, augmentedOrders, leads]);

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
        leads,
        orders: augmentedOrders,
        operations: augmentedOperations,
        rawFootage,
        production: augmentedProduction,
        payments: augmentedPayments,
        logs,
        staff,
        addStaff,
        updateStaff,
        deleteStaff,
        equipment,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        notifications,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        archiveNotification,
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
        statusHistory,
        getLeadCurrentStatus,
        getLeadCurrentStage,
        addUser,
        signUpUser,
        editUser,
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
          <div className="bg-zinc-950 border border-zinc-850 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
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
