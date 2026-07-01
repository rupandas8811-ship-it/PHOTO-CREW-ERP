/**
 * Photo Crew ERP Type Declarations
 */

export type UserRole = 'Business Owner' | 'Sales Team' | 'Operations Team' | 'Production Team';

export const EVENT_TYPES = [
  'Weddings',
  'Hamarlok Weddings',
  'Hindu/Malayali Weddings',
  'Engagement',
  'Pre Weddings',
  'Maternity',
  'Baby Shower',
  'New Born',
  'Baby Shoot',
  'Birthday',
  'Naming Ceremony',
  'House Warming',
  'Upanayana',
  'Half Saree',
  'Portfolio',
  'Product Shoot',
  'Corporate Events',
  'Car Shoot',
  'Bike Shoot',
  'Other'
];

export const PACKAGE_CATEGORIES = [
  'Weddings',
  'Hamarlok Weddings',
  'Engagement',
  'Pre Weddings',
  'Maternity',
  'Baby Shower',
  'New Born',
  'Baby Shoot',
  'Birthday',
  'Naming Ceremony',
  'House Warming',
  'Upanayana',
  'Half Saree',
  'Portfolio',
  'Product Shoot',
  'Corporate Events',
  'Car Shoot',
  'Bike Shoot'
];

export type Department = 'Sales' | 'Operations' | 'Production' | 'Editor' | 'Dispatch';

export const DEPARTMENT_STAGES: Record<Department, CurrentStage[]> = {
  Sales: ['New Lead', 'Contacted', 'Follow Up', 'Follow-up', 'Quotation Sent', 'Negotiation', 'Order Confirmed', 'Lost Lead'],
  Operations: ['Operations Assigned', 'Staff Assigned', 'Event Scheduled', 'Event Completed'],
  Production: ['Raw Footage Received'],
  Editor: ['Editing Started', 'Customer Review', 'Revision Required', 'Approved'],
  Dispatch: ['Delivered', 'Payment Pending', 'Closed']
};

export const ROLE_DEPARTMENT_MAP: Record<UserRole, Department[]> = {
  'Business Owner': ['Sales', 'Operations', 'Production', 'Editor', 'Dispatch'],
  'Sales Team': ['Sales'],
  'Operations Team': ['Operations'],
  'Production Team': ['Production', 'Editor', 'Dispatch']
};

export type CurrentStage =
  | 'New Lead'
  | 'Contacted'
  | 'Follow Up'
  | 'Follow-up'
  | 'Quotation Sent'
  | 'Negotiation'
  | 'Order Confirmed'
  | 'Lost Lead'
  | 'New Order Received'
  | 'Operations Assigned'
  | 'Event Scheduled'
  | 'Staff Assigned'
  | 'Event Completed'
  | 'Raw Footage Received'
  | 'Editor Assigned'
  | 'Editing Started'
  | 'Editing In Progress'
  | 'Internal QC Review'
  | 'Client Review Sent'
  | 'Revision Required'
  | 'Revision In Progress'
  | 'Final Approval'
  | 'Project Delivered'
  | 'Project Closed'
  | 'Customer Review'
  | 'Approved'
  | 'Delivered'
  | 'Payment Pending'
  | 'Closed';

export type EditingStatus =
  | 'Raw Footage Received'
  | 'Editor Assigned'
  | 'Editing Started'
  | 'Editing In Progress'
  | 'Internal QC Review'
  | 'Client Review Sent'
  | 'Revision Required'
  | 'Revision In Progress'
  | 'Final Approval'
  | 'Project Delivered'
  | 'Project Closed'
  | 'Completed';

export type PaymentStatus = 'Pending' | 'Partially Paid' | 'Fully Paid';

export interface User {
  id: string;
  name: string;
  full_name?: string;
  mobile: string;
  email: string;
  role: UserRole;
  active: boolean;
  status?: string;
  created_at: string;
  password?: string;
  username?: string;
}

export interface Lead {
  lead_id: string;
  customer_id?: string;
  created_date: string;
  lead_source: string;
  customer_name: string;
  mobile: string;
  alternate_mobile?: string;
  email: string;
  event_type: string;
  custom_event_name?: string;
  custom_event_type?: string;
  shoot_type?: string;
  event_date: string;
  event_time: string;
  reporting_time?: string;
  event_location: string;
  budget: number;
  sales_person: string;
  status: CurrentStage;
  remarks?: string;
  created_by: string;
  updated_by?: string;
  updated_at?: string;
  assigned_editor?: string;
  assigned_editors?: string;
  production_role?: string;
  delivery_target_date?: string;
  current_status?: string;
  current_stage?: 'Sales' | 'Operations' | 'Production' | 'Completed';
  whatsapp_number?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  client_residence_address?: string;
  desired_event_shoot_type?: string;
  Select_Package_Option?: string;
  package_price?: number;
  deliverables_description?: string;
  notes_special_customizations?: string;
  quotation_discount?: number;
  additional_services_cost?: number;
  total_pax?: number;
  reference_source?: string;
  lead_value?: number;
  lead_score?: number;
  booking_status?: string;
}

export interface LeadPackage {
  lead_package_id: string;
  lead_id: string;
  package_id: string;
  package_name: string;
  package_cost: number;
  quantity: number;
  total_amount: number;
  discount: number;
  final_amount: number;
  created_at?: string;
  deliverables_description?: string;
  notes_special_customizations?: string;
  additional_services_cost?: number;
}

export interface Order {
  order_id: string;
  lead_id: string;
  customer_id?: string;
  customer_name: string;
  mobile: string;
  event_type: string;
  custom_event_name?: string;
  custom_event_type?: string;
  shoot_type?: string;
  event_date: string;
  event_time: string;
  reporting_time?: string;
  event_location: string;
  package_name: string;
  quotation_amount: number;
  advance_received: number;
  balance_amount: number;
  order_status: 'Confirmed' | 'Completed' | 'Delivered' | 'Paid' | 'Closed';
  current_stage: CurrentStage;
  sales_person: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  whatsapp_number?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  client_residence_address?: string;
  desired_event_shoot_type?: string;
  Select_Package_Option?: string;
  package_price?: number;
  deliverables_description?: string;
  notes_special_customizations?: string;
  quotation_discount?: number;
  additional_services_cost?: number;
  total_pax?: number;
  reference_source?: string;
  lead_value?: number;
  lead_score?: number;
  booking_status?: string;
}

export interface Customer {
  customer_id: string;
  customer_name: string;
  mobile: string;
  alternate_mobile?: string;
  email: string;
  totalOrders: number;
  totalRevenue: number;
  previousPackages: string[];
  previousEvents: string[];
  lastEventDate?: string;
  leads: Lead[];
  orders: Order[];
  payments: Payment[];
}

export interface Operation {
  operation_id: string;
  order_id: string;
  photographer_assigned: string;
  videographer_assigned: string;
  drone_operator_assigned: string;
  assistant_assigned: string;
  equipment_kit: string;
  reporting_time: string;
  event_status: 'Assigned' | 'Completed' | 'Event Scheduled' | 'Event Completed' | 'Raw Footage Received' | string;
  remarks?: string;
  updated_by: string;
}

export interface RawFootage {
  tracking_id: string;
  order_id: string;
  event_completed_date: string;
  raw_received: boolean;
  server_path?: string;
  uploaded_by?: string;
  uploaded_date?: string;
  status: 'Pending' | 'Received';
  storage_type?: string;
  upload_notes?: string;
}

export interface Production {
  production_id: string;
  tracking_id: string;
  editor_assigned: string;
  raw_footage_location?: string; // from server_path
  editing_start_date?: string;
  expected_delivery_date?: string;
  editing_status: EditingStatus;
  customer_review_status?: 'Pending Review' | 'Feedback Given' | 'Approved';
  delivery_date?: string;
  remarks?: string;
  project_notes?: string;
  internal_comments?: string;
  assigned_staff?: string;
  project_priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  raw_footage_status?: string;
  target_delivery_date?: string;
  actual_delivery_date?: string;
  production_status?: 'New Project' | 'Footage Received' | 'Editor Assigned' | 'Editing Started' | 'In Progress' | 'Customer Review' | 'Revision Required' | 'Approved' | 'Delivered' | 'Closed';
  approval_status?: string;
  editing_progress?: string;
}

export interface Payment {
  payment_id: string;
  order_id: string;
  quotation_amount: number;
  advance_received: number;
  balance_due: number;
  final_payment_received: number;
  payment_date?: string;
  payment_proof_url?: string;
  payment_status: PaymentStatus;
  payment_collection_status?: string;
  additional_received?: number;
  transaction_id?: string;
}

export interface ActivityLog {
  log_id: string;
  user_name: string;
  role: UserRole;
  action: string;
  module: string;
  record_id: string;
  timestamp: string;
  previous_stage?: string;
  new_stage?: string;
  date?: string;
  time?: string;
}

export interface Staff {
  staff_id: string;
  name: string;
  mobile: string;
  whatsapp_number?: string;
  email: string;
  role: string;
  department: string;
  status: 'Active' | 'Inactive';
  joining_date: string;
  profile_photo?: string;
  notes?: string;
  production_role_speciality?: string;
  experience?: string;
  employee_id?: string;
  city?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductionSpeciality {
  speciality_id: string;
  name: string;
  active: boolean;
  created_at?: string;
}

export interface EditorAssignment {
  assignment_id: string;
  production_id: string;
  staff_id: string;
  staff_name: string;
  speciality: string;
  assigned_date: string;
  target_finish_date: string;
  status: 'Assigned' | 'Editing Started' | 'In Progress' | 'Review Pending' | 'Revision' | 'Completed';
  created_at?: string;
}

export interface StaffAssignment {
  assignment_id: string;
  order_id: string;
  staff_role: string;
  staff_id: string;
  staff_name: string;
  assignment_date: string;
  assignment_status: 'Assigned' | 'Completed' | 'Cancelled';
  whatsapp_sent_status?: string;
  updated_by?: string;
}

export interface LeadStaffAssignmentHistory {
  id?: string;
  lead_id: string;
  order_id?: string;
  assigned_role: string;
  assigned_staff: string;
  assigned_by?: string;
  assigned_at: string;
}

export interface Notification {
  notification_id: string;
  user_id?: string | null;
  project_id?: string | null;
  task_id?: string | null;
  notification_type: string;
  title: string;
  message: string;
  read_status: boolean;
  created_at?: string;
  is_read?: boolean;
  read?: boolean;
  recipient_role?: string;
  priority?: string | null;
  recipient_user_id?: string | null;
  recipient_email?: string | null;
  sender_user_id?: string | null;
  sender_name?: string | null;
  related_table?: string | null;
  related_record_id?: string | null;
  action_url?: string | null;
  is_archived?: boolean;
  read_at?: string | null;
  expires_at?: string | null;
}

export interface Equipment {
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  brand: string;
  model: string;
  serial_number: string;
  quantity: number;
  available_quantity: number;
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Damaged' | 'Lost' | 'Retired' | string;
  purchase_date: string;
  purchase_price?: number;
  storage_location?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Package {
  package_id: string;
  package_name: string;
  category: string;
  price: number;
  status: 'Active' | 'Inactive';
  deliverables?: string;
  team_members?: string;
  seasonal_offer?: string;
  terms_conditions?: string;
  event_type?: string;
  duration?: string;
  package_includes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EquipmentHandover {
  handover_id: string;
  order_id: string;
  equipment_name: string;
  return_status: 'Returned' | 'Not Returned' | 'Damaged' | 'Missing';
  return_date: string;
  returned_by: string;
  notes: string;
  created_at?: string;
}

export interface LeadEquipmentHistory {
  id?: string;
  lead_id: string;
  order_id?: string;
  equipment_name: string;
  equipment_status: string;
  returned_by?: string;
  returned_at?: string;
  remarks?: string;
}

export interface UnlockOverride {
  recordId: string;
  unlockedBy: string;
  unlockDate: string;
  reason: string;
  module: 'Sales' | 'Operations' | 'Production';
}



