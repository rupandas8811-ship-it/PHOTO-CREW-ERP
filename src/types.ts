/**
 * Photo Crew ERP Type Declarations
 */

export type UserRole = 'Business Owner' | 'Sales Team' | 'Operations Team' | 'Production Team';

export const EVENT_TYPES = [
  'Weddings',
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

export type Department = 'Sales' | 'Operations' | 'Production' | 'Editor' | 'Dispatch';

export const DEPARTMENT_STAGES: Record<Department, CurrentStage[]> = {
  Sales: ['New Lead', 'Follow Up', 'Quotation Sent', 'Negotiation', 'Order Confirmed'],
  Operations: ['Operations Assigned', 'Event Scheduled', 'Event Completed'],
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
  | 'Follow Up'
  | 'Quotation Sent'
  | 'Negotiation'
  | 'Order Confirmed'
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
  whatsapp_number?: string;
  address?: string;
  city?: string;
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
  email: string;
  role: string;
  department: string;
  status: 'Active' | 'Inactive';
  joining_date: string;
  profile_photo?: string;
  notes?: string;
  phone?: string;
  commission_rate?: number;
  rating?: number;
  bio?: string;
  created_at?: string;
  whatsapp_number?: string;
  production_role_speciality?: string;
  custom_role_specialty?: string;
  experience?: string;
  employee_id?: string;
  address?: string;
  city?: string;
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
  recipient_role?: string;
}

export interface Equipment {
  equipment_id: string;
  name: string;
  type: 'Camera' | 'Lens' | 'Drone' | 'Gimbal' | 'Tripod' | 'Light' | 'Audio Equipment' | 'Memory Cards' | 'Batteries' | 'Other' | string;
  brand: string;
  model: string;
  serial_number: string;
  quantity: number;
  status: 'Available' | 'Assigned' | 'In Use' | 'Under Maintenance' | 'Damaged';
  purchase_date: string;
  notes?: string;
  created_at?: string;
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

export interface UnlockOverride {
  recordId: string;
  unlockedBy: string;
  unlockDate: string;
  reason: string;
  module: 'Sales' | 'Operations' | 'Production';
}



