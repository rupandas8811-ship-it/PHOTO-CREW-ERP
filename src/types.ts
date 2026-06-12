/**
 * Photo Crew ERP Type Declarations
 */

export type UserRole = 'Business Owner' | 'Sales Team' | 'Operations Team' | 'Production Team';

export type CurrentStage =
  | 'New Lead'
  | 'Follow Up'
  | 'Quotation Sent'
  | 'Negotiation'
  | 'Order Confirmed'
  | 'Operations Assigned'
  | 'Event Scheduled'
  | 'Event Completed'
  | 'Raw Footage Received'
  | 'Editor Assigned'
  | 'Editing Started'
  | 'Customer Review'
  | 'Revision Required'
  | 'Approved'
  | 'Delivered'
  | 'Payment Pending'
  | 'Closed';

export type EditingStatus =
  | 'Pending'
  | 'Editing'
  | 'Customer Review'
  | 'Revision Required'
  | 'Approved'
  | 'Delivered';

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
  created_date: string;
  lead_source: string;
  customer_name: string;
  mobile: string;
  alternate_mobile?: string;
  email: string;
  event_type: string;
  event_date: string;
  event_time: string;
  event_location: string;
  budget: number;
  sales_person: string;
  status: CurrentStage;
  remarks?: string;
  created_by: string;
  updated_by?: string;
  updated_at?: string;
}

export interface Order {
  order_id: string;
  lead_id: string;
  customer_name: string;
  mobile: string;
  event_type: string;
  event_date: string;
  event_time: string;
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

export interface Operation {
  operation_id: string;
  order_id: string;
  photographer_assigned: string;
  videographer_assigned: string;
  drone_operator_assigned: string;
  assistant_assigned: string;
  equipment_kit: string;
  reporting_time: string;
  event_status: 'Assigned' | 'Completed';
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
