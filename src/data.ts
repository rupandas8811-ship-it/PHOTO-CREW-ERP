import { User, Lead, Order, Operation, RawFootage, Production, Payment, ActivityLog, Equipment } from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'U-001',
    name: 'Business Owner',
    mobile: '+1 (555) 019-2834',
    email: 'Owner@photocrew.com',
    role: 'Business Owner',
    active: true,
    created_at: '2026-05-01T08:00:00Z',
    password: 'owner@123'
  },
  {
    id: 'U-002',
    name: 'Sales',
    mobile: '+1 (555) 014-9988',
    email: 'Sale@photocrew.com',
    role: 'Sales Team',
    active: true,
    created_at: '2026-05-02T09:30:00Z',
    password: 'sales@123'
  },
  {
    id: 'U-003',
    name: 'Operations',
    mobile: '+1 (555) 016-5544',
    email: 'Operation@photocrew.com',
    role: 'Operations Team',
    active: true,
    created_at: '2026-05-03T10:15:00Z',
    password: 'ops@123'
  },
  {
    id: 'U-004',
    name: 'Production',
    mobile: '+1 (555) 012-3322',
    email: 'Production@photocrew.com',
    role: 'Production Team',
    active: true,
    created_at: '2026-05-04T11:00:00Z',
    password: 'prod@123'
  }
];

export const INITIAL_LEADS: Lead[] = [
  {
    lead_id: 'LD-9001',
    created_date: '2026-06-10',
    lead_source: 'Instagram',
    customer_name: 'Sophia Loren',
    mobile: '+1 (555) 123-4567',
    email: 'sophia@example.com',
    event_type: 'Weddings',
    event_date: '2026-08-15',
    event_time: '14:00',
    event_location: 'Grand Hyatt Beach Lawn',
    budget: 79999,
    sales_person: 'Sarah Jenkins',
    status: 'New Lead',
    remarks: 'Inquired via Instagram DM. Wants Wedding - Bronze package.',
    created_by: 'Sarah Jenkins',
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    order_id: 'ORD-1005',
    lead_id: 'LD-9001',
    customer_name: 'Sophia Loren',
    mobile: '+1 (555) 123-4567',
    event_type: 'Weddings',
    event_date: '2026-08-15',
    event_time: '14:00',
    event_location: 'Grand Hyatt Beach Lawn',
    package_name: 'Wedding - Bronze',
    quotation_amount: 79999,
    advance_received: 40000,
    balance_amount: 39999,
    order_status: 'Confirmed',
    current_stage: 'Order Confirmed',
    sales_person: 'Sarah Jenkins',
    created_at: '2026-06-01T10:00:00Z',
  }
];

export const INITIAL_OPERATIONS: Operation[] = [
  {
    operation_id: 'OP-5006',
    order_id: 'ORD-1005',
    photographer_assigned: 'Jack Richards',
    videographer_assigned: 'Tina Fey',
    drone_operator_assigned: 'None',
    assistant_assigned: 'Steve Rogers',
    equipment_kit: 'Standard Wedding Kit',
    reporting_time: '12:00',
    event_status: 'Assigned',
    remarks: 'First shoot for new demo package.',
    updated_by: 'Robert O\'Connor',
  }
];

export const INITIAL_RAW_FOOTAGE: RawFootage[] = [];
export const INITIAL_PRODUCTION: Production[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_LOGS: ActivityLog[] = [];
export const INITIAL_EQUIPMENT: Equipment[] = [
  {
    equipment_id: 'EQ-001',
    equipment_name: 'Sony FE 24-70mm f/2.8 GM II',
    equipment_type: 'Lens',
    brand: 'Sony',
    model: 'SEL2470GM2',
    serial_number: 'SN-SNY-289410',
    quantity: 1,
    available_quantity: 1,
    status: 'Available',
    purchase_date: '2025-01-10',
    purchase_price: 2200,
    storage_location: 'Main Shelf A1',
    notes: 'Standard zoom lens.',
    created_at: new Date().toISOString()
  }
];

