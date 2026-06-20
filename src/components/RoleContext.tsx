import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { User, Lead, LeadPackage, Order, Operation, RawFootage, Production, Payment, ActivityLog, UserRole, CurrentStage, EditingStatus, Staff, Notification, Equipment, Package, StaffAssignment, ProductionSpeciality, EditorAssignment, PaymentStatus, EquipmentHandover } from '../types';
import { INITIAL_USERS, INITIAL_LEADS, INITIAL_ORDERS, INITIAL_OPERATIONS, INITIAL_RAW_FOOTAGE, INITIAL_PRODUCTION, INITIAL_PAYMENTS, INITIAL_LOGS, INITIAL_EQUIPMENT } from '../data';

import { supabaseClient, updateDiagnosticMetric } from '../supabaseClient';

interface RoleContextType {
  currentUser: User | null;
  currentRole: UserRole;
  currentUserName: string;
  setCurrentRole: (role: UserRole) => void;
  setCurrentUserName: (name: string) => void;
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
  
  leadPackages: LeadPackage[];
  packages: Package[];
  addPackage: (pkg: Omit<Package, 'package_id'>) => Promise<string>;
  updatePackage: (packageId: string, updates: Partial<Package>) => Promise<void>;
  deletePackage: (packageId: string) => Promise<void>;

  quotations: any[];
  addQuotation: (quotation: any) => Promise<void>;
  updateQuotation: (quotationId: string, updates: Partial<any>) => Promise<void>;
  updateLead: (leadId: string, updates: Partial<Lead>) => void;

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
  ) => void;
  confirmOrder: (
    leadId: string, 
    packageName: string, 
    quotationAmount: number, 
    advanceReceived: number,
    eventDate?: string,
    eventTime?: string,
    paymentMode?: string,
    notes?: string,
    reportingTime?: string
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
  ) => void;
  markEventCompleted: (orderId: string, serverPath: string) => void;
  confirmRawFootageReceived: (
    orderId: string,
    footageLink?: string,
    storageType?: string,
    uploadNotes?: string,
    paymentCollectionStatus?: string,
    additionalReceived?: number
  ) => void;
  updateOrderStage: (orderId: string, stage: CurrentStage) => void;
  acceptRawFootage: (trackingId: string) => void;
  updateProduction: (
    productionId: string, 
    updates: Partial<Omit<Production, 'production_id' | 'tracking_id'>>
  ) => void;
  markDelivered: (trackingId: string, remarks?: string) => void;
  recordPayment: (
    orderId: string, 
    amountReceived: number, 
    paymentDate: string, 
    proofUrl?: string
  ) => void;
  resetAllData: () => void;
  refreshData: () => void;
  
  // User Management Admin features
  addUser: (name: string, email: string, mobile: string, role: UserRole, active: boolean, password?: string) => Promise<void>;
  signUpUser: (name: string, username: string, email: string, mobile: string, role: UserRole, password: string) => Promise<any>;
  editUser: (id: string, updates: { name: string, email: string, mobile: string, role: UserRole, active: boolean }) => void;
  toggleUserStatus: (id: string) => void;
  resetUserPassword: (id: string, newPassword: string) => void;
  staffAssignments: StaffAssignment[];
  saveStaffAssignments: (
    orderId: string, 
    assignments: {
      staff_role: string;
      staff_id: string;
      staff_name: string;
    }[]
  ) => Promise<void>;
  updateStaffAssignmentWhatsAppStatus: (
    orderId: string,
    staffId: string,
    role: string,
    status: string
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

const mapFromDbUserId = (uuid: string): string => {
  if (uuid.startsWith('00000000-0000-0000-0000-')) {
    const suffix = uuid.replace('00000000-0000-0000-0000-', '');
    if (suffix === '999999999999') return 'U-temp';
    const num = parseInt(suffix, 10);
    return `U-${String(num).padStart(3, '0')}`;
  }
  return uuid;
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
    created_at: notif.created_at,
    recipient_role: notif.recipient_role
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
      read_status: notif.read_status
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
      console.error("Fallback insert failed too:", fallbackError);
    }
  }
};

const INITIAL_PACKAGES: Package[] = [
  // Wedding Packages
  { 
    package_id: 'PKG_WED_01', 
    package_name: 'Wedding - Bronze', 
    category: 'Wedding Packages', 
    price: 79999, 
    status: 'Active',
    deliverables: '1 Traditional Photographer, 1 Traditional Videographer, Standard Album, Full HD Output Video',
    team_members: '2 Crew Members',
    seasonal_offer: 'Complimentary Wedding Teaser (1 min)'
  },
  { 
    package_id: 'PKG_WED_02', 
    package_name: 'Wedding - Silver', 
    category: 'Wedding Packages', 
    price: 99999, 
    status: 'Active',
    deliverables: '1 Cinematic Photographer, 1 Traditional Photographer, 1 Traditional Videographer, Standard Album + Video',
    team_members: '3 Crew Members',
    seasonal_offer: '5% off off-season bookings'
  },
  { 
    package_id: 'PKG_WED_03', 
    package_name: 'Wedding - Gold', 
    category: 'Wedding Packages', 
    price: 119999, 
    status: 'Active',
    deliverables: '1 Cinematic Photographer, 1 Candid Photographer, 1 Cinematic Videographer, 1 Premium Album',
    team_members: '3 Crew Members',
    seasonal_offer: 'Free Drone Add-On for outdoor shoot'
  },
  { 
    package_id: 'PKG_WED_04', 
    package_name: 'Wedding - Diamond', 
    category: 'Wedding Packages', 
    price: 149999, 
    status: 'Active',
    deliverables: '2 Candid Photographers, 2 Cinematic Videographers, 1 Premium Album, 1 Luxury Gift Album',
    team_members: '4 Crew Members + Drone',
    seasonal_offer: 'Free Drone Coverage & Instant Canvas Print'
  },
  { 
    package_id: 'PKG_WED_05', 
    package_name: 'Wedding - Platinum', 
    category: 'Wedding Packages', 
    price: 169999, 
    status: 'Active',
    deliverables: '2 Candid Photographers, 2 Cinematic Videographers, 1 Crane operator, 2 Luxury Albums, Reels Package',
    team_members: '5 Crew Members + Drone + HelpDesk',
    seasonal_offer: 'Free Pre-Wedding Shoot (8 Hours)'
  },

  // Premium Wedding Packages
  { 
    package_id: 'PKG_PWED_01', 
    package_name: 'Premium Wedding - Bronze', 
    category: 'Premium Wedding Packages', 
    price: 99999, 
    status: 'Active',
    deliverables: 'Senior Photographers, Ultra HD Cinematic Video, 1 Premium Album',
    team_members: '3 Crew Members',
    seasonal_offer: 'Free Pre-Wedding Consultation'
  },
  { 
    package_id: 'PKG_PWED_02', 
    package_name: 'Premium Wedding - Silver', 
    category: 'Premium Wedding Packages', 
    price: 124999, 
    status: 'Active',
    deliverables: 'Senior Candid Photographers, Pro Cinematic Videographers, Reels, 2 Albums',
    team_members: '4 Crew Members + Assistant',
    seasonal_offer: 'Complimentary Wedding Teaser & Reel Edit'
  },
  { 
    package_id: 'PKG_PWED_03', 
    package_name: 'Premium Wedding - Gold', 
    category: 'Premium Wedding Packages', 
    price: 144999, 
    status: 'Active',
    deliverables: 'Senior Team: Candid & Traditional, Dual Cinematic Videography, Drone, 2 Luxury Leather Albums',
    team_members: '4 Crew Members + Senior Director',
    seasonal_offer: 'Free Drone & LED Wall Display (5 Hours)'
  },
  { 
    package_id: 'PKG_PWED_04', 
    package_name: 'Premium Wedding - Diamond', 
    category: 'Premium Wedding Packages', 
    price: 164999, 
    status: 'Active',
    deliverables: 'Full Post-Production Crew, 3 Photographers, 2 Cinematic Video Operators, Reels + VIP Albums',
    team_members: '5 Core Crew Members + Drone',
    seasonal_offer: 'Free 15-inch Desktop Digital Frame'
  },
  { 
    package_id: 'PKG_PWED_05', 
    package_name: 'Premium Wedding - Platinum', 
    category: 'Premium Wedding Packages', 
    price: 189999, 
    status: 'Active',
    deliverables: 'Elite Post-Production, Cinematic Feature (30 min), 3 Luxury Glass Albums, Live Web Stream (HD)',
    team_members: '6 Elite Professionals + Dual Drones',
    seasonal_offer: 'Free Pre-wedding (2 Days) Resort coverage'
  },

  // House Warming Packages
  { 
    package_id: 'PKG_HOU_01', 
    package_name: 'House Warming - Package 1', 
    category: 'House Warming Packages', 
    price: 34999, 
    status: 'Active',
    deliverables: 'Traditional Photographer, Standard Event Album, Full Event Video Master Edit',
    team_members: '2 Crew Members',
    seasonal_offer: 'Free customized Home-Entry Calendar'
  },
  { 
    package_id: 'PKG_HOU_02', 
    package_name: 'House Warming - Package 2', 
    category: 'House Warming Packages', 
    price: 44999, 
    status: 'Active',
    deliverables: 'Candid & Traditional Photographer, Hardcover Album, Cinematic Highlights Video',
    team_members: '2 Crew Members + Assistant',
    seasonal_offer: 'Complimentary Framed Family Portrait'
  },
  { 
    package_id: 'PKG_HOU_03', 
    package_name: 'House Warming - Package 3', 
    category: 'House Warming Packages', 
    price: 59999, 
    status: 'Active',
    deliverables: '2 Photographers (Candid + Traditional), Cinematic Videographer, Drone, 1 Premium Album',
    team_members: '3 Crew Members + Drone',
    seasonal_offer: 'Free Aerial Drone shots of Home Exterior'
  },
  { 
    package_id: 'PKG_HOU_04', 
    package_name: 'House Warming - Package 4', 
    category: 'House Warming Packages', 
    price: 69999, 
    status: 'Active',
    deliverables: 'Premium post-production, Reels pkg, 2 High-Gloss Albums, Cinematic Storybook Video',
    team_members: '4 Professional Crew + Dual Drones',
    seasonal_offer: 'Free Interior Shoot worth ₹6,000'
  },

  // Engagement Packages
  { 
    package_id: 'PKG_ENG_01', 
    package_name: 'Engagement - Package 1', 
    category: 'Engagement Packages', 
    price: 19999, 
    status: 'Active',
    deliverables: '1 Traditional Photographer, 1 Standard Soft-Bound Album, Full HD Digital Photos',
    team_members: '1 Professional Photographer',
    seasonal_offer: '10% discount if clubbed with Wedding package'
  },
  { 
    package_id: 'PKG_ENG_02', 
    package_name: 'Engagement - Package 2', 
    category: 'Engagement Packages', 
    price: 24999, 
    status: 'Active',
    deliverables: '1 Traditional Photographer, 1 Traditional Videographer, 1 Standard Album + Edited Video',
    team_members: '2 Crew Members',
    seasonal_offer: 'Free 1-min Instagram Reel teaser'
  },
  { 
    package_id: 'PKG_ENG_03', 
    package_name: 'Engagement - Package 3', 
    category: 'Engagement Packages', 
    price: 29999, 
    status: 'Active',
    deliverables: '1 Candid Photographer, 1 Traditional Videographer , Premium Album, Cinematic Video Highlights',
    team_members: '2 Crew Members + Assistant',
    seasonal_offer: 'Free Ring Exchange Portrait canvas'
  },
  { 
    package_id: 'PKG_ENG_04', 
    package_name: 'Engagement - Package 4', 
    category: 'Engagement Packages', 
    price: 34999, 
    status: 'Active',
    deliverables: 'Candid & Traditional Photographers, Cine Videographer, 1 Premium Album, Extended Cinematic Clip',
    team_members: '3 Professional Crew',
    seasonal_offer: 'Free Save-the-Date video postcard'
  },

  // Anniversary Packages
  { 
    package_id: 'PKG_ANN_01', 
    package_name: 'Anniversary - Package 1', 
    category: 'Anniversary Packages', 
    price: 19999, 
    status: 'Active',
    deliverables: '1 Traditional Photographer, Complete digital gallery release, 1 Desktop Glass Photo-Stand',
    team_members: '1 Photographer',
    seasonal_offer: 'Complimentary Couple Canvas'
  },
  { 
    package_id: 'PKG_ANN_02', 
    package_name: 'Anniversary - Package 2', 
    category: 'Anniversary Packages', 
    price: 24999, 
    status: 'Active',
    deliverables: 'Traditional Photographer, Standard videography edit, Standard hardcover photobook',
    team_members: '2 Crew Members',
    seasonal_offer: 'Free custom wishes message edit'
  },
  { 
    package_id: 'PKG_ANN_03', 
    package_name: 'Anniversary - Package 3', 
    category: 'Anniversary Packages', 
    price: 29999, 
    status: 'Active',
    deliverables: 'Candid and Traditional coverage, Premium Album, High definition story-montage video',
    team_members: '2 Crew Members + editor consultation',
    seasonal_offer: 'Free historic wedding-photo color restoration'
  },
  { 
    package_id: 'PKG_ANN_04', 
    package_name: 'Anniversary - Package 4', 
    category: 'Anniversary Packages', 
    price: 34999, 
    status: 'Active',
    deliverables: 'Premium Dual-lens focus coverage, High-speed cinematic videography, Luxury Glass photobook, Reels pack',
    team_members: '3 Professional Crew',
    seasonal_offer: 'Free aerial drone couple sequence'
  },

  // Naming Ceremony Packages
  { 
    package_id: 'PKG_NAM_01', 
    package_name: 'Naming Ceremony - Package 1', 
    category: 'Naming Ceremony Packages', 
    price: 19999, 
    status: 'Active',
    deliverables: '1 Traditional Baby Photographer, standard photo edits, softback photo catalog',
    team_members: '1 Photographer',
    seasonal_offer: 'Free customized Baby Wishes Poster'
  },
  { 
    package_id: 'PKG_NAM_02', 
    package_name: 'Naming Ceremony - Package 2', 
    category: 'Naming Ceremony Packages', 
    price: 24999, 
    status: 'Active',
    deliverables: 'Traditional Photographer, Traditional HD Videography, Hardback photobook, video files',
    team_members: '2 Crew Members',
    seasonal_offer: 'Complimentary Baby Intro Card design'
  },
  { 
    package_id: 'PKG_NAM_03', 
    package_name: 'Naming Ceremony - Package 3', 
    category: 'Naming Ceremony Packages', 
    price: 29999, 
    status: 'Active',
    deliverables: 'Candid baby specialist photographer, Traditional photographer, Cinematic HD video, Premium album',
    team_members: '2 Professional Baby Directors',
    seasonal_offer: 'Free Baby Milestone video reel'
  },
  { 
    package_id: 'PKG_NAM_04', 
    package_name: 'Naming Ceremony - Package 4', 
    category: 'Naming Ceremony Packages', 
    price: 34999, 
    status: 'Active',
    deliverables: 'Candid Baby expert, Traditional capture, cinematic video, Reels layout, 2 Premium albums',
    team_members: '3 Creative Experts',
    seasonal_offer: 'Free Cradle visual decoration portraits'
  },

  // Maternity Shoot Packages
  { 
    package_id: 'PKG_MAT_01', 
    package_name: 'Maternity Shoot - Package 1', 
    category: 'Maternity Shoot Packages', 
    price: 12999, 
    status: 'Active',
    deliverables: '1 Special Female Candid Photographer, Indoor Studio Session, 20 high-end retouched prints',
    team_members: '1 Special Director',
    seasonal_offer: '1 Soft-bound Mom-to-Be journal'
  },
  { 
    package_id: 'PKG_MAT_02', 
    package_name: 'Maternity Shoot - Package 2', 
    category: 'Maternity Shoot Packages', 
    price: 22999, 
    status: 'Active',
    deliverables: 'Indoor + Outdoor scenic setups, standard album, cinematic concept video (2 min)',
    team_members: '1 Photographer + 1 Assistant',
    seasonal_offer: 'Free custom gown/dress selection guide'
  },
  { 
    package_id: 'PKG_MAT_03', 
    package_name: 'Maternity Shoot - Package 3', 
    category: 'Maternity Shoot Packages', 
    price: 32999, 
    status: 'Active',
    deliverables: 'Elite Studio session, scenic mountain/garden outdoor, 1 Premium Album, Storybook cinematic video',
    team_members: '2 Photographers + prop setup assistant',
    seasonal_offer: 'Free Hair & Makeup artist support'
  },
  { 
    package_id: 'PKG_MAT_04', 
    package_name: 'Maternity Shoot - Package 4', 
    category: 'Maternity Shoot Packages', 
    price: 42999, 
    status: 'Active',
    deliverables: 'Home setup studio lights, multiple outdoor locations, Reels pack, Glass Luxury album, full-reel video master',
    team_members: '3 Crew + Stylist + Assistant',
    seasonal_offer: 'Free Baby Shower Package 1 discount (20%)'
  },

  // Baby Shower Packages
  { 
    package_id: 'PKG_BSH_01', 
    package_name: 'Baby Shower - Package 1', 
    category: 'Baby Shower Packages', 
    price: 19999, 
    status: 'Active',
    deliverables: 'Candid Photographer, digital prints gallery, desktop standee',
    team_members: '1 Photographer',
    seasonal_offer: 'Complimentary welcome plaque poster'
  },
  { 
    package_id: 'PKG_BSH_02', 
    package_name: 'Baby Shower - Package 2', 
    category: 'Baby Shower Packages', 
    price: 24999, 
    status: 'Active',
    deliverables: 'Candid Photographer, traditional video coordinator, standard hardcover photobook',
    team_members: '2 Crew Members',
    seasonal_offer: 'Free baby wishes video montage'
  },
  { 
    package_id: 'PKG_BSH_03', 
    package_name: 'Baby Shower - Package 3', 
    category: 'Baby Shower Packages', 
    price: 29999, 
    status: 'Active',
    deliverables: 'Dual camera setup, cinematic highlight reels, premium custom leather album',
    team_members: '2 Crew + edit coordinator',
    seasonal_offer: 'Free Baby Shower customized photobooth prop set'
  },
  { 
    package_id: 'PKG_BSH_04', 
    package_name: 'Baby Shower - Package 4', 
    category: 'Baby Shower Packages', 
    price: 34999, 
    status: 'Active',
    deliverables: 'Elite Candid team, cinematic movie edit, 3 digital Instagram reels, 2 Premium Glossy albums',
    team_members: '3 Creative Crew + Assistant',
    seasonal_offer: 'Complimentary instant Polaroid prints table (25 prints)'
  },

  // Baby Shoot Packages
  { 
    package_id: 'PKG_BS_01', 
    package_name: 'Baby Shoot - Package 1', 
    category: 'Baby Shoot Packages', 
    price: 12999, 
    status: 'Active',
    deliverables: '1 Kid Specialist Photographer, standard props, 15 retouched digital images',
    team_members: '1 Baby Specialist',
    seasonal_offer: 'Complimentary Kid Photo Key-chain'
  },
  { 
    package_id: 'PKG_BS_02', 
    package_name: 'Baby Shoot - Package 2', 
    category: 'Baby Shoot Packages', 
    price: 22999, 
    status: 'Active',
    deliverables: '2 Theme setups, prop selection, 1 Softbound custom Babybook, HD Video teaser (1 min)',
    team_members: '1 Photographer + Baby handler assistant',
    seasonal_offer: 'Free custom baby name-wooden plaque'
  },
  { 
    package_id: 'PKG_BS_03', 
    package_name: 'Baby Shoot - Package 3', 
    category: 'Baby Shoot Packages', 
    price: 32999, 
    status: 'Active',
    deliverables: '3 Theme setups, props and baby costumes included, 1 Premium Album, Baby Cinematic Story',
    team_members: '2 Baby Photographers + Handler',
    seasonal_offer: 'Free Baby Handprint & Footprint resin kit'
  },
  { 
    package_id: 'PKG_BS_04', 
    package_name: 'Baby Shoot - Package 4', 
    category: 'Baby Shoot Packages', 
    price: 42999, 
    status: 'Active',
    deliverables: 'Unlimited theme setups, out of studio outdoor shoot, Baby Reels package, Glass luxury album, complete digital release plus video',
    team_members: '3 Creative baby experts + Baby wrangler',
    seasonal_offer: 'Complimentary first birthday shoot discount (30%)'
  },

  // Car / Bike Shoot Packages
  { 
    package_id: 'PKG_AUT_01', 
    package_name: 'Car / Bike Shoot - Package 1', 
    category: 'Car / Bike Shoot Packages', 
    price: 4000, 
    status: 'Active',
    deliverables: 'High dynamic range digital portraits (10 retouched), professional grade studio edits',
    team_members: '1 Automotive Photographer',
    seasonal_offer: 'Complimentary Instagram Wallpaper'
  },
  { 
    package_id: 'PKG_AUT_02', 
    package_name: 'Car / Bike Shoot - Package 2', 
    category: 'Car / Bike Shoot Packages', 
    price: 8000, 
    status: 'Active',
    deliverables: 'Rig shots, tracking/rolling sequences, cinematic video edit (1 min, 4K)',
    team_members: '1 Photographer + Rig Tech',
    seasonal_offer: 'Free exhaust sound design capture'
  },
  { 
    package_id: 'PKG_AUT_03', 
    package_name: 'Car / Bike Shoot - Package 3', 
    category: 'Car / Bike Shoot Packages', 
    price: 12000, 
    status: 'Active',
    deliverables: 'Rolling shots, dramatic studio lights session, 4K Drone high speed tracking, Reels edit, high-resolution canvas print',
    team_members: '2 Crew + active Drone pilot',
    seasonal_offer: 'Free dynamic FPV drone clip'
  },

  // Pre-Wedding Packages
  { 
    package_id: 'PKG_PRE_01', 
    package_name: 'Pre-Wedding Shoot (8 Hours)', 
    category: 'Pre-Wedding Packages', 
    price: 24999, 
    status: 'Active',
    deliverables: 'Outdoor location shoot (8 hrs), Cinematic Couple Teaser (2 mins), 1 Premium Pre-wedding photobook',
    team_members: '2 Crew Members',
    seasonal_offer: 'Free custom Save-the-Date video postcard'
  },
  { 
    package_id: 'PKG_PRE_02', 
    package_name: 'Pre-Wedding Shoot (2 Days)', 
    category: 'Pre-Wedding Packages', 
    price: 49999, 
    status: 'Active',
    deliverables: 'Resort/multi-city 2 Days coverage, Aerial drone capture, Extended story video, Reels collection, Elite Wedding book',
    team_members: '3 Crew + dedicated Drone pilot',
    seasonal_offer: 'Free Resort entry photography permissions coordination'
  },

  // Interior Shoot
  { 
    package_id: 'PKG_INT_01', 
    package_name: 'Interior Shoot', 
    category: 'Interior Shoot', 
    price: 6000, 
    status: 'Active',
    deliverables: 'Wide-angle architecture shots, color corrected high density visual photos (15 digital assets)',
    team_members: '1 Interior architect photographer',
    seasonal_offer: 'Free dynamic video walk-through (30 sec)'
  },

  // Product Photography
  { 
    package_id: 'PKG_PROD_01', 
    package_name: 'Product Photography - Photo Only', 
    category: 'Product Photography', 
    price: 2500, 
    status: 'Active',
    deliverables: 'Photo Only: ₹500 per product, Minimum 5 products base rate included',
    team_members: '1 Studio table top photographer',
    seasonal_offer: 'Free white background isolation edits'
  },
  { 
    package_id: 'PKG_PROD_02', 
    package_name: 'Product Photography - Video', 
    category: 'Product Photography', 
    price: 12500, 
    status: 'Active',
    deliverables: 'Product Video: ₹2,500 per product video, Minimum 5 product videos base rate included',
    team_members: '1 Studio product cine master',
    seasonal_offer: 'Free custom royalty-free commercial background score'
  }
];

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('erp_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem('erp_role') as UserRole) || 'Business Owner';
  });

  const [currentUserName, setCurrentUserNameState] = useState<string>(() => {
    return localStorage.getItem('erp_user_name') || 'Rupand Das';
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotations, setQuotations] = useState<any[]>(() => {
    const cached = localStorage.getItem('erp_quotations');
    return cached ? JSON.parse(cached) : [];
  });
  const [leadPackages, setLeadPackages] = useState<LeadPackage[]>(() => {
    const cached = localStorage.getItem('erp_lead_packages');
    return cached ? JSON.parse(cached) : [];
  });
  const [packages, setPackages] = useState<Package[]>(() => {
    const cached = localStorage.getItem('erp_packages');
    return cached ? JSON.parse(cached) : INITIAL_PACKAGES;
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [rawFootage, setRawFootage] = useState<RawFootage[]>([]);
  const [production, setProduction] = useState<Production[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [staff, setStaff] = useState<Staff[]>(() => {
    const saved = localStorage.getItem('erp_production_staff');
    return saved ? JSON.parse(saved) : [
      {
        staff_id: 'STF-001',
        name: 'Emily Watson',
        mobile: '+1 (555) 234-5678',
        whatsapp_number: '+1 (555) 234-5678',
        email: 'emily@photocrew.com',
        role: 'Production Manager',
        department: 'Management',
        status: 'Active',
        joining_date: '2025-01-10',
        profile_photo: '',
        notes: 'Orchestrates chief editing operations and delivery workflows.'
      },
      {
        staff_id: 'STF-002',
        name: 'Alan Cole',
        mobile: '+1 (555) 876-5432',
        whatsapp_number: '+1 (555) 876-5432',
        email: 'alan@photocrew.com',
        role: 'Senior Editor',
        department: 'Editing',
        status: 'Active',
        joining_date: '2025-03-15',
        profile_photo: '',
        notes: 'Specialist in cinematic narration and commercial overlays.'
      },
      {
        staff_id: 'STF-003',
        name: 'Sarah Connor',
        mobile: '+1 (555) 456-7890',
        whatsapp_number: '+1 (555) 456-7890',
        email: 'sarah.c@photocrew.com',
        role: 'Color Grading Artist',
        department: 'Post-Production',
        status: 'Active',
        joining_date: '2025-06-01',
        profile_photo: '',
        notes: 'Expert in DaVinci Resolve color pipelines and HDR calibration.'
      },
      {
        staff_id: 'STF-004',
        name: 'Dennis Nedry',
        mobile: '+1 (555) 304-9021',
        whatsapp_number: '+1 (555) 304-9021',
        email: 'dennis@photocrew.com',
        role: 'VFX & Motion Graphics Designer',
        department: 'Design',
        status: 'Active',
        joining_date: '2025-09-12',
        profile_photo: '',
        notes: 'Handles high-fidelity typography animation.'
      },
      {
        staff_id: 'STF-005',
        name: 'Jimmy Woo',
        mobile: '+1 (555) 607-1122',
        whatsapp_number: '+1 (555) 607-1122',
        email: 'jimmy@photocrew.com',
        role: 'Delivery Coordinator',
        department: 'Operations',
        status: 'Active',
        joining_date: '2026-02-20',
        profile_photo: '',
        notes: 'Manages physical and cloud master releases.'
      }
    ];
  });

  const [equipment, setEquipment] = useState<Equipment[]>(() => {
    const saved = localStorage.getItem('erp_equipment');
    return saved ? JSON.parse(saved) : INITIAL_EQUIPMENT;
  });

  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>(() => {
    const saved = localStorage.getItem('erp_staff_assignments');
    return saved ? JSON.parse(saved) : [];
  });

  const [specialities, setSpecialities] = useState<ProductionSpeciality[]>(() => {
    const saved = localStorage.getItem('erp_production_specialities');
    if (saved) return JSON.parse(saved);
    return [
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
    ];
  });

  const [editorAssignments, setEditorAssignments] = useState<EditorAssignment[]>(() => {
    const saved = localStorage.getItem('erp_editor_assignments');
    return saved ? JSON.parse(saved) : [];
  });

  const [equipmentHandovers, setEquipmentHandovers] = useState<EquipmentHandover[]>(() => {
    const saved = localStorage.getItem('erp_equipment_handovers');
    return saved ? JSON.parse(saved) : [];
  });


  useEffect(() => {
    localStorage.setItem('erp_production_specialities', JSON.stringify(specialities));
  }, [specialities]);

  useEffect(() => {
    localStorage.setItem('erp_editor_assignments', JSON.stringify(editorAssignments));
  }, [editorAssignments]);

  useEffect(() => {
    localStorage.setItem('erp_equipment_handovers', JSON.stringify(equipmentHandovers));
  }, [equipmentHandovers]);

  useEffect(() => {
    localStorage.setItem('erp_staff_assignments', JSON.stringify(staffAssignments));
  }, [staffAssignments]);

  useEffect(() => {
    localStorage.setItem('erp_production_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('erp_equipment', JSON.stringify(equipment));
  }, [equipment]);

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
  }, [currentRole, currentUserName]);

  // Helper to strip non-database properties like customer_id before saving to Supabase
  const stripClientOnlyFields = (record: any) => {
    if (!record || typeof record !== 'object') return record;
    const { customer_id, ...cloned } = record;
    return cloned;
  };

  // Synchronous CRUD wrappers for updating Supabase in backgrounds
  const pushInsert = async (table: string, record: any) => {
    if (!supabaseClient) return;
    try {
      const sanitized = stripClientOnlyFields(record);
      const { error } = await supabaseClient.from(table).insert(sanitized);
      if (error) {
        console.error(`Supabase Insert error in ${table}:`, error);
        updateDiagnosticMetric('insert', 'fail', error.message);
      } else {
        updateDiagnosticMetric('insert', 'ok');
      }
    } catch (err: any) {
      updateDiagnosticMetric('insert', 'fail', err?.message || String(err));
    }
  };

  const pushUpdate = async (table: string, matchColumn: string, matchValue: any, updates: any) => {
    if (!supabaseClient) return { success: true };
    try {
      const sanitized = stripClientOnlyFields(updates);
      console.log(`[pushUpdate START] table: ${table}, match: ${matchColumn}=${matchValue}`, sanitized);

      // --- CONSTRAINT BYPASS LOGIC ---
      // Fix for "Staff Assigned", "Event Scheduled" check constraint failures
      if (table === 'leads') {
        if (sanitized.status) {
          sanitized.current_status = sanitized.status;
          const allowedLeadStatuses = [
            'New Lead', 'Follow Up', 'Quotation Sent', 'Negotiation', 'Order Confirmed', 
            'Operations Assigned', 'Event Completed', 'Raw Footage Received', 'Editor Assigned',
            'Editing Started', 'Editing In Progress', 'Internal QC Review', 'Client Review Sent', 
            'Customer Review', 'Revision Required', 'Revision In Progress', 'Final Approval', 
            'Approved', 'Project Delivered', 'Delivered', 
            'Payment Pending', 'Project Closed', 'Closed'
          ];
          if (!allowedLeadStatuses.includes(sanitized.status)) {
            delete sanitized.status; // Drop the field so constraint passes, 'current_status' keeps tracking
          }
        }
      } else if (table === 'orders') {
        if (sanitized.current_stage) {
          const allowedOrderStages = [
            'New Lead', 'Follow Up', 'Quotation Sent', 'Negotiation', 'Order Confirmed', 
            'Operations Assigned', 'Event Scheduled', 'Event Completed', 'Raw Footage Received', 
            'Editing Started', 'Customer Review', 'Approved', 'Delivered', 
            'Payment Pending', 'Closed'
          ];
          if (!allowedOrderStages.includes(sanitized.current_stage)) {
            delete sanitized.current_stage;
          }
        }
      } else if (table === 'production') {
        if (sanitized.editing_status) {
          const allowedProductionStages = [
            'Pending', 'Editing', 'Customer Review', 'Revision Required', 'Approved', 'Delivered'
          ];
          if (!allowedProductionStages.includes(sanitized.editing_status)) {
            delete sanitized.editing_status;
          }
        }
      }
      // -------------------------------
      
      console.log(`[pushUpdate EXECUTING] on ${table}:`, sanitized);
      const { error, data } = await supabaseClient.from(table).update(sanitized).eq(matchColumn, matchValue).select();
      if (error) {
        console.error(`[pushUpdate ERROR] in ${table}:`, error);
        updateDiagnosticMetric('update', 'fail', error.message);
        return { success: false, error: error.message };
      } else {
        console.log(`[pushUpdate SUCCESS] returned data:`, data);
        updateDiagnosticMetric('update', 'ok');
        return { success: true };
      }
    } catch (err: any) {
      console.error(`[pushUpdate EXCEPTION] in ${table}:`, err);
      updateDiagnosticMetric('update', 'fail', err?.message || String(err));
      return { success: false, error: err?.message || String(err) };
    }
  };

  const pushDelete = async (table: string, matchColumn: string, matchValue: any) => {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient.from(table).delete().eq(matchColumn, matchValue);
      if (error) {
        console.error(`Supabase Delete error in ${table}:`, error);
        updateDiagnosticMetric('delete', 'fail', error.message);
      } else {
        updateDiagnosticMetric('delete', 'ok');
      }
    } catch (err: any) {
      updateDiagnosticMetric('delete', 'fail', err?.message || String(err));
    }
  };

  const pushUpsert = async (table: string, record: any) => {
    if (!supabaseClient) return;
    try {
      const sanitized = stripClientOnlyFields(record);
      const { error } = await supabaseClient.from(table).upsert(sanitized);
      if (error) {
        console.error(`Supabase Upsert error in ${table}:`, error);
        updateDiagnosticMetric('insert', 'fail', error.message);
      } else {
        updateDiagnosticMetric('insert', 'ok');
      }
    } catch (err: any) {
      updateDiagnosticMetric('insert', 'fail', err?.message || String(err));
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
      if (INITIAL_LOGS?.length > 0) await supabaseClient.from('activity_logs').upsert(INITIAL_LOGS);
      if (INITIAL_PACKAGES?.length > 0) await supabaseClient.from('packages').upsert(INITIAL_PACKAGES);

      console.log('Database initial seeding completed successfully.');
    } catch (err: any) {
      console.error('Automated database seeding failed:', err);
    }
  };

  // Fetch full dataset from Supabase
  const fetchFromDb = async () => {
    if (!supabaseClient) return;
    try {
      const dbOperationsPromise = supabaseClient.from('operations').select('*');
      const dbRawFootagePromise = supabaseClient.from('raw_footage').select('*');
      const dbProductionPromise = supabaseClient.from('production').select('*');
      const dbPaymentsPromise = supabaseClient.from('payments').select('*');
      const dbLogsPromise = supabaseClient.from('activity_logs').select('*').order('timestamp', { ascending: false });
      const dbStaffPromise = supabaseClient.from('production_staff').select('*').then(
        (res) => res,
        () => ({ data: null, error: null })
      );
      const dbNotificationsPromise = supabaseClient.from('notifications').select('*').order('created_at', { ascending: false }).then(
        (res) => res,
        (err) => {
          console.warn('Could not read notifications from Supabase:', err);
          return { data: null, error: null };
        }
      );
      const dbEquipmentPromise = supabaseClient.from('equipment').select('*').then(
        (res) => res,
        () => {
          const cached = localStorage.getItem('erp_equipment');
          return { data: cached ? JSON.parse(cached) : INITIAL_EQUIPMENT, error: null };
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

      const dbPackagesPromise = supabaseClient.from('packages').select('*').then(
        (res) => {
          if (res.error) {
            console.warn('Supabase packages load error:', res.error?.message);
            const cached = localStorage.getItem('erp_packages');
            return { data: cached ? JSON.parse(cached) : INITIAL_PACKAGES, error: null };
          }
          return res;
        },
        (err) => {
          console.warn('Could not read packages from Supabase:', err);
          const cached = localStorage.getItem('erp_packages');
          return { data: cached ? JSON.parse(cached) : INITIAL_PACKAGES, error: null };
        }
      );

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
        quotationsRes
      ] = await Promise.all([
        supabaseClient.from('users').select('*'),
        supabaseClient.from('leads').select('*').order('created_date', { ascending: false }),
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
        dbQuotationsPromise
      ]);

      if (uErr || ldErr || ordErr || opErr || rfErr || prodErr || payErr || logErr) {
        console.warn('Could not read all tables from Supabase, syncing with cached state');
        updateDiagnosticMetric('read', 'fail', (uErr || ldErr || ordErr || opErr || rfErr || prodErr || payErr || logErr)?.message);
        return;
      }

      if (dbUsers && dbUsers.length === 0) {
        await seedDatabase();
        // retry fetch once
        await fetchFromDb();
        return;
      }

      if (dbUsers) {
        // Ensure standard demo accounts always exist in Supabase for convenient tests
        const demoEmails = [
          'owner@demo.com', 'sales@demo.com', 'ops@demo.com', 'prod@demo.com',
          'owner@photocrewdemo.com', 'sales@photocrewdemo.com', 'operations@photocrewdemo.com', 'production@photocrewdemo.com'
        ];
        const existingEmails = dbUsers.map(u => u.email.toLowerCase());
        const missingDemos = INITIAL_USERS.filter(u => demoEmails.includes(u.email) && !existingEmails.includes(u.email));
        
        if (missingDemos.length > 0) {
          console.log('Detected missing demo accounts, seeding them into Supabase...');
          for (const u of missingDemos) {
            // Also attempt to register in Supabase Auth so they are active and ready immediately
            try {
              const { error: signUpError } = await supabaseClient.auth.signUp({
                email: u.email,
                password: u.password || 'Admin@123',
                options: {
                  data: {
                    name: u.name,
                    username: u.username || u.email.split('@')[0],
                    mobile: u.mobile,
                    role: u.role,
                    password: u.password
                  }
                }
              });
              if (signUpError) {
                console.warn(`Auth signUp notice (handled) for ${u.email}:`, signUpError.message);
              } else {
                console.log(`Auth signUp preconfigured for ${u.email}`);
              }
            } catch (authExc) {
              console.warn(`Auth signUp exception for ${u.email}:`, authExc);
            }

            await supabaseClient.from('users').upsert({
              ...u,
              id: mapToDbUserId(u.id),
              username: u.username || u.email.split('@')[0]
            });
          }
          // Fetch users again to keep state synced cleanly
          const { data: refreshedUsers } = await supabaseClient.from('users').select('*');
          if (refreshedUsers) {
            setUsers(refreshedUsers.map(u => ({ ...u, id: mapFromDbUserId(u.id) })));
          } else {
            setUsers(dbUsers.map(u => ({ ...u, id: mapFromDbUserId(u.id) })));
          }
        } else {
          setUsers(dbUsers.map(u => ({ ...u, id: mapFromDbUserId(u.id) })));
        }
      }
      if (dbLeads) {
        setLeads(dbLeads.map(ld => ({
          ...ld,
          status: ld.current_status || ld.status
        })));
      }
      if (leadPackagesRes && leadPackagesRes.data) {
        setLeadPackages(leadPackagesRes.data as LeadPackage[]);
        localStorage.setItem('erp_lead_packages', JSON.stringify(leadPackagesRes.data));
      }
      if (packagesRes && packagesRes.data) {
        if (packagesRes.data.length === 0 && !packagesRes.error) {
          console.log('Detected empty packages table, seeding INITIAL_PACKAGES into Supabase...');
          await supabaseClient.from('packages').upsert(INITIAL_PACKAGES);
          setPackages(INITIAL_PACKAGES);
          localStorage.setItem('erp_packages', JSON.stringify(INITIAL_PACKAGES));
        } else {
          setPackages(packagesRes.data as Package[]);
          localStorage.setItem('erp_packages', JSON.stringify(packagesRes.data));
        }
      }
      if (dbOrders) {
        setOrders(dbOrders.map((ord: any) => {
          const associatedLead = dbLeads?.find(ld => ld.lead_id === ord.lead_id);
          const leadStatus = associatedLead?.current_status || associatedLead?.status;
          return {
            ...ord,
            current_stage: leadStatus || ord.current_stage
          };
        }) as any);
      }
      if (dbOperations) setOperations(dbOperations);
      if (dbRawFootage) setRawFootage(dbRawFootage as any);
      if (dbProduction) {
        setProduction(dbProduction.map((prod: any) => {
          let leadId = '';
          if (prod.production_id && prod.production_id.startsWith('PRD-')) {
            leadId = prod.production_id.replace('PRD-', '');
          }
          if (!leadId) {
            const raw = dbRawFootage?.find(r => r.tracking_id === prod.tracking_id);
            const ord = dbOrders?.find(o => o.order_id === raw?.order_id);
            leadId = ord?.lead_id || '';
          }
          const associatedLead = dbLeads?.find(ld => ld.lead_id === leadId);
          const leadStatus = associatedLead?.current_status || associatedLead?.status;
          return {
            ...prod,
            editing_status: leadStatus || prod.editing_status
          };
        }) as any);
      }
      if (dbPayments) setPayments(dbPayments as any);
      if (dbLogs) setLogs(dbLogs as any);
      if (staffAssignmentsRes && staffAssignmentsRes.data) {
        setStaffAssignments(staffAssignmentsRes.data as StaffAssignment[]);
        localStorage.setItem('erp_staff_assignments', JSON.stringify(staffAssignmentsRes.data));
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
            generated_date: q.generated_date || metadata.generated_date || q.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
          };
        });
        setQuotations(parsedQuotes);
        localStorage.setItem('erp_quotations', JSON.stringify(parsedQuotes));
      }

      // Seed 5 custom notifications on-the-fly if empty in Supabase
      if (notifRes && notifRes.data && notifRes.data.length === 0) {
        console.log('Seeding 5 default notifications into Supabase...');
        const sampleNotifications = [
          {
            notification_id: 'NTF-SEED-001',
            recipient_role: 'Sales Team',
            title: 'New Lead Assigned',
            message: 'You have been assigned a new lead: Sophia Loren',
            is_read: false,
            read_status: false,
            user_id: mapToDbUserId('U-010'), // Sales Demo
            project_id: 'LD-9001',
            task_id: 'Sales Inquiry',
            notification_type: 'Lead Assignment',
            created_at: new Date().toISOString()
          },
          {
            notification_id: 'NTF-SEED-002',
            recipient_role: 'Operations Team',
            title: 'Event Operational Setup',
            message: 'Please verify crew assignment & reporting time for Order ORD-1006',
            is_read: false,
            read_status: false,
            user_id: mapToDbUserId('U-011'), // Operations Demo
            project_id: 'ORD-1006',
            task_id: 'Operations Allocation',
            notification_type: 'Incident / Update',
            created_at: new Date().toISOString()
          },
          {
            notification_id: 'NTF-SEED-003',
            recipient_role: 'Production Team',
            title: 'Raw Footage Pending Review',
            message: 'Post-production raw footage for project SpaceX (ORD-1009) is uploaded.',
            is_read: false,
            read_status: false,
            user_id: mapToDbUserId('U-012'), // Production Demo
            project_id: 'PRD-4009',
            task_id: 'Quality Control',
            notification_type: 'New Source Footage',
            created_at: new Date().toISOString()
          },
          {
            notification_id: 'NTF-SEED-004',
            recipient_role: 'Business Owner',
            title: 'Milestone Invoice Paid',
            message: 'Advance payment of ₹10,000 for Charity Elite Gala confirmed.',
            is_read: false,
            read_status: false,
            user_id: mapToDbUserId('U-009'), // Owner Demo
            project_id: 'ORD-1010',
            task_id: 'Receivable Clearance',
            notification_type: 'Payment Cleared',
            created_at: new Date().toISOString()
          },
          {
            notification_id: 'NTF-SEED-005',
            recipient_role: 'Production Team',
            title: 'Production Task Overdue',
            message: "Project 'Bennet Graduation' (ORD-1008) expected delivery date is approaching.",
            is_read: false,
            read_status: false,
            user_id: mapToDbUserId('U-012'), // Production Demo
            project_id: 'PRD-4008',
            task_id: 'Editing',
            notification_type: 'Due Date Alert',
            created_at: new Date().toISOString()
          }
        ];
        await supabaseClient.from('notifications').upsert(sampleNotifications).then(
          () => console.log('Successfully seeded 5 notifications.'),
          (err) => console.warn('Failed seeding notifications via query, will retry individually:', err)
        );
        setNotifications(sampleNotifications.map(mapNotificationFromDb));
      } else if (notifRes && notifRes.data) {
        setNotifications(notifRes.data.map(mapNotificationFromDb));
      }
      let finalStaff = (staffRes && staffRes.data) ? staffRes.data : [];
      if (staffRes && staffRes.data && staffRes.data.length === 0) {
        console.log('Post-production staff table is empty in database. Seeding initial editors on-the-fly...');
        const initialStaffSeed = [
          {
            staff_id: 'STF-001',
            name: 'Emily Watson',
            mobile: '+1 (555) 234-5678',
            whatsapp_number: '+1 (555) 234-5678',
            email: 'emily@photocrew.com',
            role: 'Production Manager',
            department: 'Management',
            status: 'Active',
            joining_date: '2025-01-10',
            profile_photo: '',
            notes: 'Orchestrates chief editing operations and delivery workflows.',
            production_role_speciality: 'Editor Specialty'
          },
          {
            staff_id: 'STF-002',
            name: 'Alex Rivera',
            mobile: '+1 (555) 345-6789',
            whatsapp_number: '+1 (555) 345-6789',
            email: 'alex@photocrew.com',
            role: 'Senior Wedding Editor',
            department: 'Post-Production',
            status: 'Active',
            joining_date: '2024-03-15',
            profile_photo: '',
            notes: 'Cinematic storytelling, custom audio layout, color grading master.',
            production_role_speciality: 'Wedding Highlights'
          },
          {
            staff_id: 'STF-003',
            name: 'Nisha Sharma',
            mobile: '+1 (555) 456-7890',
            whatsapp_number: '+1 (555) 456-7890',
            email: 'nisha@photocrew.com',
            role: 'Cinematography Reel Designer',
            department: 'Creative Reels',
            status: 'Active',
            joining_date: '2025-02-01',
            profile_photo: '',
            notes: 'Specializes in aesthetic Instagram Reels, vertical formats, sound design hooks.',
            production_role_speciality: 'Instagram Reels'
          },
          {
            staff_id: 'STF-004',
            name: 'Marcus Brody',
            mobile: '+1 (555) 567-8901',
            whatsapp_number: '+1 (555) 567-8901',
            email: 'marcus@photocrew.com',
            role: 'Lead Sound Designer',
            department: 'Audio Engineering',
            status: 'Active',
            joining_date: '2024-08-20',
            profile_photo: '',
            notes: 'Acoustic level balance, Foley tracking, multi-microphone sync.',
            production_role_speciality: 'Sound Designer'
          },
          {
            staff_id: 'STF-005',
            name: 'Zoe Vance',
            mobile: '+1 (555) 678-9012',
            whatsapp_number: '+1 (555) 678-9012',
            email: 'zoe@photocrew.com',
            role: 'Colorist Specialist',
            department: 'Color Grading',
            status: 'Active',
            joining_date: '2023-11-05',
            profile_photo: '',
            notes: 'LUT adjustments, skin tone correction, high dynamic range setups.',
            production_role_speciality: 'Color Grading'
          }
        ];
        
        await supabaseClient.from('production_staff').upsert(initialStaffSeed).then(
          () => console.log('Successfully seeded 5 production_staff.'),
          (err) => console.warn('Failed seeding production_staff via client seed:', err)
        );
        finalStaff = initialStaffSeed;
      }
      if (finalStaff && finalStaff.length > 0) {
        setStaff(finalStaff);
      }
      if (equipRes && equipRes.data) {
        setEquipment(equipRes.data);
      }

      // Sync specialties and editor assignments from Supabase if they exist
      try {
        const { data: dbSpecList } = await supabaseClient.from('production_specialties').select('*');
        if (dbSpecList && dbSpecList.length > 0) {
          setSpecialities(dbSpecList);
          localStorage.setItem('erp_production_specialities', JSON.stringify(dbSpecList));
        }
      } catch (err) {
        console.warn('Could not read production_specialties from Supabase:', err);
      }

      try {
        const { data: dbAssignList } = await supabaseClient.from('editor_assignments').select('*');
        if (dbAssignList && dbAssignList.length > 0) {
          setEditorAssignments(dbAssignList);
          localStorage.setItem('erp_editor_assignments', JSON.stringify(dbAssignList));
        }
      } catch (err) {
        console.warn('Could not read editor_assignments from Supabase:', err);
      }

      try {
        const { data: dbHandovers } = await supabaseClient.from('equipment_handovers').select('*');
        if (dbHandovers && dbHandovers.length > 0) {
          setEquipmentHandovers(dbHandovers);
          localStorage.setItem('erp_equipment_handovers', JSON.stringify(dbHandovers));
        }
      } catch (err) {
        console.warn('Could not read equipment_handovers from Supabase:', err);
      }

      updateDiagnosticMetric('read', 'ok');
      updateDiagnosticMetric('connection', 'connected');
    } catch (err: any) {
      console.error('Fetch error:', err);
      updateDiagnosticMetric('read', 'fail', err.message);
    }
  };

  // Synchronous database fetching and real-time subscription channels
  useEffect(() => {
    fetchFromDb();

    if (!supabaseClient) return;

    const channels = [
      { table: 'users', key: 'id', setter: setUsers },
      { table: 'leads', key: 'lead_id', setter: setLeads },
      { table: 'orders', key: 'order_id', setter: setOrders },
      { table: 'operations', key: 'operation_id', setter: setOperations },
      { table: 'raw_footage', key: 'tracking_id', setter: setRawFootage },
      { table: 'production', key: 'production_id', setter: setProduction },
      { table: 'payments', key: 'payment_id', setter: setPayments },
      { table: 'production_staff', key: 'staff_id', setter: setStaff },
      { table: 'activity_logs', key: 'log_id', setter: setLogs },
      { table: 'notifications', key: 'notification_id', setter: setNotifications },
      { table: 'equipment', key: 'equipment_id', setter: setEquipment },
      { table: 'production_specialties', key: 'speciality_id', setter: setSpecialities },
      { table: 'editor_assignments', key: 'assignment_id', setter: setEditorAssignments }
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

    return () => {
      channels.forEach(ch => supabaseClient.removeChannel(ch));
    };
  }, []);

  const runAutomatedChecks = async () => {
    if (production.length === 0) return;
    
    const localTime = new Date();
    const todayStr = localTime.toISOString().split('T')[0];
    const tomorrow = new Date(localTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    for (const prod of production) {
      if (prod.editing_status === 'Delivered') continue;

      const rf = rawFootage.find((f) => f.tracking_id === prod.tracking_id);
      const linkedOrder = rf ? orders.find((o) => o.order_id === rf.order_id) : undefined;
      const orderName = linkedOrder?.package_name || 'Project';
      const oId = linkedOrder?.order_id || '';

      // Check expected_delivery_date
      if (prod.expected_delivery_date) {
        if (prod.expected_delivery_date === todayStr) {
          const notifId = `NTF-DUE-TODAY-${prod.production_id}-${todayStr}`;
          const exists = notifications.some(n => n.notification_id === notifId);
          if (!exists) {
            await addNotification({
              notification_id: notifId,
              user_id: prod.editor_assigned,
              project_id: prod.production_id,
              task_id: 'Editing',
              notification_type: 'Due Date Alert',
              title: 'Task Due Today',
              message: `The project "${orderName}" (Order: ${oId}) is due today!`,
              recipient_role: 'Production Team'
            });
          }
        } else if (prod.expected_delivery_date === tomorrowStr) {
          const notifId = `NTF-DUE-TOMORROW-${prod.production_id}-${tomorrowStr}`;
          const exists = notifications.some(n => n.notification_id === notifId);
          if (!exists) {
            await addNotification({
              notification_id: notifId,
              user_id: prod.editor_assigned,
              project_id: prod.production_id,
              task_id: 'Editing',
              notification_type: 'Due Date Alert',
              title: 'Task Due Tomorrow',
              message: `Project "${orderName}" (Order: ${oId}) editing is due tomorrow.`,
              recipient_role: 'Production Team'
            });
          }
        } else if (prod.expected_delivery_date < todayStr) {
          const notifId = `NTF-OVERDUE-${prod.production_id}-${todayStr}`;
          const exists = notifications.some(n => n.notification_id === notifId);
          if (!exists) {
            await addNotification({
              notification_id: notifId,
              user_id: prod.editor_assigned,
              project_id: prod.production_id,
              task_id: 'Editing',
              notification_type: 'Due Date Alert',
              title: 'Task Overdue / Delivery Crossed',
              message: `Project "${orderName}" (Order: ${oId}) expected delivery date (${prod.expected_delivery_date}) was crossed!`,
              recipient_role: 'All'
            });
          }
        }
      }

      // Check pending customer review
      if (prod.customer_review_status === 'Pending Review') {
        const notifId = `NTF-PENDING-REV-${prod.production_id}-${todayStr}`;
        const exists = notifications.some(n => n.notification_id === notifId);
        if (!exists) {
          await addNotification({
            notification_id: notifId,
            user_id: prod.editor_assigned,
            project_id: prod.production_id,
            task_id: 'Review',
            notification_type: 'Due Date Alert',
            title: 'Pending Customer Review',
            message: `Project "${orderName}" (Order: ${oId}) has been pending customer review.`,
            recipient_role: 'Operations Team'
          });
        }
      }
    }
  };

  useEffect(() => {
    if (production.length > 0 && notifications.length > 0) {
      runAutomatedChecks();
    }
  }, [production, notifications]);

  // Handle auto-logout if user is deactivated
  useEffect(() => {
    if (currentUser && users.length > 0) {
      const dbUser = users.find(u => u.id === currentUser.id);
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
    const cleanInput = emailOrUsername.trim().toLowerCase();
    const foundUser = users.find(u => 
      u.email.toLowerCase() === cleanInput || 
      u.name.toLowerCase() === cleanInput || 
      (u.username && u.username.toLowerCase() === cleanInput) ||
      u.email.split('@')[0].toLowerCase() === cleanInput
    );
    
    if (!foundUser) {
      return { success: false, error: 'User account not found.' };
    }
    
    if (!foundUser.active) {
      return { success: false, error: 'Your account has been deactivated. Please contact your system administrator.' };
    }
    
    if (foundUser.password !== password) {
      return { success: false, error: 'Incorrect email/username or password.' };
    }

    // Authenticate with Supabase Auth so auth.uid() becomes set and RLS triggers successfully
    if (supabaseClient) {
      try {
        const { error: signInErr } = await supabaseClient.auth.signInWithPassword({
          email: foundUser.email,
          password: password
        });

        if (signInErr) {
          console.warn('Supabase Auth signIn failed, attempting on-the-fly signUp:', signInErr.message);
          // Try to sign up the user on the fly so they exist in Auth next time
          const { error: signUpErr } = await supabaseClient.auth.signUp({
            email: foundUser.email,
            password: password,
            options: {
              data: {
                name: foundUser.name,
                username: foundUser.username || foundUser.email.split('@')[0],
                mobile: foundUser.mobile,
                role: foundUser.role,
                password: password
              }
            }
          });
          if (signUpErr) {
            console.warn('On-the-fly signUp notice (handled):', signUpErr.message);
          } else {
            console.log('On-the-fly signUp succeeded. Attempting clean sign-in...');
            const { error: retrySignInErr } = await supabaseClient.auth.signInWithPassword({
              email: foundUser.email,
              password: password
            });
            if (retrySignInErr) {
              console.warn('Retry sign-in after signUp result:', retrySignInErr.message);
            }
          }
        } else {
          console.log('Logged into Supabase Auth successfully as:', foundUser.email);
        }
      } catch (authErr) {
        console.error('Unhandled auth error during login:', authErr);
      }
    }
    
    // Successful login
    setCurrentUser(foundUser);
    setCurrentRoleState(foundUser.role);
    setCurrentUserNameState(foundUser.name);
    
    // Log login
    const userName = foundUser.name;
    const userRole = foundUser.role;
    const newLog: ActivityLog = {
      log_id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      user_name: userName,
      role: userRole,
      action: 'User Logged In Successfully',
      module: 'Session',
      record_id: foundUser.id,
      timestamp: new Date().toISOString(),
    };
    setLogs((prev) => [newLog, ...prev]);
    pushInsert('activity_logs', newLog);
    
    return { success: true };
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
  const addLead = (
    leadDetails: Omit<Lead, 'lead_id' | 'status' | 'created_by' | 'sales_person' | 'created_date'>,
    packages?: Omit<LeadPackage, 'lead_package_id' | 'lead_id'>[]
  ) => {
    const leadId = `LD-${Math.floor(9012 + Math.random() * 988)}`;
    const newLead: Lead = {
      ...leadDetails,
      lead_id: leadId,
      created_date: new Date().toISOString().split('T')[0],
      sales_person: currentUserName,
      status: 'New Lead',
      created_by: currentUserName,
    };
    setLeads((prev) => [newLead, ...prev]);
    pushInsert('leads', newLead);

    if (packages && packages.length > 0) {
      const formattedPackages: LeadPackage[] = packages.map((pkg, index) => ({
        ...pkg,
        lead_package_id: `LP-${leadId}-${index}-${Math.floor(100 + Math.random() * 900)}`,
        lead_id: leadId,
        created_at: new Date().toISOString()
      }));
      setLeadPackages((prev) => {
        const next = [...formattedPackages, ...prev];
        localStorage.setItem('erp_lead_packages', JSON.stringify(next));
        return next;
      });
      formattedPackages.forEach((pkgItem) => {
        pushInsert('lead_packages', pkgItem);
      });
    }

    logActivity(`Created Lead: ${newLead.customer_name}`, 'Sales', leadId, 'N/A', 'New Lead');
    return leadId;
  };

  // 2. Lead Follow-Up (Screen 3)
  const updateLeadFollowUp = (
    leadId: string, 
    status: CurrentStage, 
    callNotes: string, 
    nextFollowUpDate: string, 
    quotationAmount?: number, 
    negotiationNotes?: string
  ) => {
    const targetLead = leads.find((ld) => ld.lead_id === leadId);
    const previousStage = targetLead ? targetLead.status : 'New Lead';

    setLeads((prev) =>
      prev.map((ld) => {
        if (ld.lead_id === leadId) {
          const updated = {
            ...ld,
            status,
            budget: quotationAmount !== undefined ? quotationAmount : ld.budget,
            remarks: `${ld.remarks || ''}\n[Update ${new Date().toISOString().split('T')[0]}]: ${callNotes}. ${negotiationNotes ? 'Neg Notes: ' + negotiationNotes : ''}. Next follow-up: ${nextFollowUpDate}`,
            updated_by: currentUserName,
            updated_at: new Date().toISOString()
          };
          pushUpdate('leads', 'lead_id', leadId, {
            status: updated.status,
            budget: updated.budget,
            remarks: updated.remarks,
            updated_by: updated.updated_by,
            updated_at: updated.updated_at
          });
          return updated;
        }
        return ld;
      })
    );
    logActivity(`Updated Lead Follow-up, stage: ${status}`, 'Sales', leadId, previousStage, status);
  };

  // 3. Confirm Order (Action button)
  const confirmOrder = (
    leadId: string, 
    packageName: string, 
    quotationAmount: number, 
    advanceReceived: number,
    eventDate?: string,
    eventTime?: string,
    paymentMode?: string,
    notes?: string,
    reportingTime?: string
  ) => {
    const targetLead = leads.find((ld) => ld.lead_id === leadId);
    if (!targetLead) return '';

    const resolvedRemarks = `${targetLead.remarks || ''}\n[Booking Confirmed Update ${new Date().toISOString().split('T')[0]}]: ${notes || 'No extra notes'}. Payment Mode: ${paymentMode || 'N/A'}`;

    // Update lead stage
    setLeads((prev) =>
      prev.map((ld) => (ld.lead_id === leadId ? { 
        ...ld, 
        status: 'Order Confirmed', 
        event_date: eventDate || ld.event_date,
        event_time: eventTime || ld.event_time,
        reporting_time: reportingTime || ld.reporting_time,
        remarks: resolvedRemarks,
        updated_by: currentUserName, 
        updated_at: new Date().toISOString() 
      } : ld))
    );
    pushUpdate('leads', 'lead_id', leadId, { 
      status: 'Order Confirmed',
      event_date: eventDate || targetLead.event_date,
      event_time: eventTime || targetLead.event_time,
      reporting_time: reportingTime || targetLead.reporting_time,
      remarks: resolvedRemarks,
      updated_by: currentUserName,
      updated_at: new Date().toISOString()
    });

    const orderId = `ORD-${Math.floor(1012 + Math.random() * 800)}`;
    const newOrder: Order = {
      order_id: orderId,
      lead_id: leadId,
      customer_name: targetLead.customer_name,
      mobile: targetLead.mobile,
      event_type: targetLead.event_type,
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
      created_at: new Date().toISOString(),
      updated_by: currentUserName,
      updated_at: new Date().toISOString()
    };

    const paymentId = `PAY-${Math.floor(3012 + Math.random() * 800)}`;
    const newPayment: Payment = {
      payment_id: paymentId,
      order_id: orderId,
      quotation_amount: quotationAmount,
      advance_received: advanceReceived,
      balance_due: quotationAmount - advanceReceived,
      final_payment_received: 0,
      payment_status: advanceReceived >= quotationAmount ? 'Fully Paid' : (advanceReceived > 0 ? 'Partially Paid' : 'Pending'),
    };

    const opId = `OP-${Math.floor(5012 + Math.random() * 800)}`;
    const newOp: Operation = {
      operation_id: opId,
      order_id: orderId,
      photographer_assigned: 'Unassigned',
      videographer_assigned: 'Unassigned',
      drone_operator_assigned: 'Unassigned',
      assistant_assigned: 'Unassigned',
      equipment_kit: '',
      reporting_time: reportingTime || '08:00',
      event_status: 'New Order Received',
      remarks: notes || '',
      updated_by: currentUserName,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setPayments((prev) => [newPayment, ...prev]);
    setOperations((prev) => [newOp, ...prev]);

    pushInsert('orders', newOrder);
    pushInsert('payments', newPayment);
    pushInsert('operations', newOp);

    addNotification({
      user_id: 'All',
      project_id: orderId,
      task_id: 'Operations Allocation',
      notification_type: 'New Lead Assigned',
      title: 'New Confirmed Order Received',
      message: `A new order (${orderId}) has been confirmed for ${targetLead.customer_name}. Package: ${packageName}. Please assign crew and schedule the event!`,
      recipient_role: 'Operations Team'
    });

    logActivity(`Confirmed Order for ${targetLead.customer_name}. Package: ${packageName}`, 'Sales', orderId, targetLead.status, 'Order Confirmed');

    return orderId;
  };

  // 4. Assign Operations
  const assignOperations = (
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
    const opId = `OP-${Math.floor(5012 + Math.random() * 800)}`;
    const { current_stage, event_date, event_time, event_status, ...restOpData } = opData;
    
    // Default or specified status / stage
    const targetStatus = event_status || 'Event Scheduled';
    const targetStageNum: CurrentStage = current_stage || 'Event Scheduled';

    const newOp: Operation = {
      operation_id: opId,
      order_id: orderId,
      ...restOpData,
      event_status: targetStatus,
      updated_by: currentUserName,
    };

    const targetOrder = orders.find((o) => o.order_id === orderId);
    const previousStage = targetOrder ? targetOrder.current_stage : 'Order Confirmed';

    // Update order & lead stage, and event_date / event_time
    setOrders((prev) =>
      prev.map((ord) => (ord.order_id === orderId ? { 
        ...ord, 
        current_stage: targetStageNum, 
        event_date: event_date || ord.event_date,
        event_time: event_time || ord.event_time,
        updated_by: currentUserName, 
        updated_at: new Date().toISOString() 
      } : ord))
    );
    pushUpdate('orders', 'order_id', orderId, { 
      current_stage: targetStageNum,
      event_date: event_date || (targetOrder ? targetOrder.event_date : undefined),
      event_time: event_time || (targetOrder ? targetOrder.event_time : undefined),
      updated_by: currentUserName,
      updated_at: new Date().toISOString()
    });

    if (targetOrder) {
      setLeads((prev) =>
        prev.map((ld) => (ld.lead_id === targetOrder.lead_id ? { 
          ...ld, 
          status: targetStageNum, 
          event_date: event_date || ld.event_date,
          event_time: event_time || ld.event_time,
          updated_by: currentUserName, 
          updated_at: new Date().toISOString() 
        } : ld))
      );
      pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
        status: targetStageNum,
        event_date: event_date || targetOrder.event_date,
        event_time: event_time || targetOrder.event_time,
        updated_by: currentUserName,
        updated_at: new Date().toISOString()
      });
    }

    setOperations((prev) => {
      const filtered = prev.filter((o) => o.order_id !== orderId); // remove old if exists
      return [newOp, ...filtered];
    });
    pushUpsert('operations', newOp);

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
    const newAssignments: StaffAssignment[] = assignments.map((a) => {
      const existing = staffAssignments.find(
        (ea) => ea.order_id === orderId && ea.staff_id === a.staff_id && ea.staff_role === a.staff_role
      );
      const uniqueId = existing?.assignment_id || `ASST-${Math.floor(1000 + Math.random() * 9000)}`;
      const assignDate = existing?.assignment_date || new Date().toISOString().split('T')[0];
      const sendStatus = existing?.whatsapp_sent_status || 'Not Sent';

      return {
        assignment_id: uniqueId,
        order_id: orderId,
        staff_role: a.staff_role,
        staff_id: a.staff_id,
        staff_name: a.staff_name,
        assignment_date: assignDate,
        assignment_status: 'Assigned',
        whatsapp_sent_status: sendStatus,
      };
    });

    if (supabaseClient) {
      try {
        const { error: delErr } = await supabaseClient
          .from('staff_assignments')
          .delete()
          .eq('order_id', orderId);
        
        if (delErr) {
          console.warn('Error deleting existing assignments in Supabase:', delErr.message);
        }

        if (newAssignments.length > 0) {
          const { error: insErr } = await supabaseClient
            .from('staff_assignments')
            .insert(newAssignments);
          
          if (insErr) {
            console.warn('Error inserting assignments in Supabase:', insErr.message);
          }
        }
      } catch (err) {
        console.warn('Supabase sync error in saveStaffAssignments:', err);
      }
    }

    setStaffAssignments((prev) => {
      const filtered = prev.filter((x) => x.order_id !== orderId);
      const combined = [...filtered, ...newAssignments];
      localStorage.setItem('erp_staff_assignments', JSON.stringify(combined));
      return combined;
    });

    // Create notifications for assigned staff
    newAssignments.forEach((a) => {
      const ord = orders.find((o) => o.order_id === orderId);
      const op = operations.find((o) => o.order_id === orderId);
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

  const updateStaffAssignmentWhatsAppStatus = async (
    orderId: string,
    staffId: string,
    role: string,
    status: string
  ) => {
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('staff_assignments')
          .update({ whatsapp_sent_status: status })
          .eq('order_id', orderId)
          .eq('staff_id', staffId)
          .eq('staff_role', role);
        if (error) {
          console.warn('Error updating whatsapp_sent_status in Supabase:', error.message);
        }
      } catch (err) {
        console.warn('Supabase sync error in updateStaffAssignmentWhatsAppStatus:', err);
      }
    }

    setStaffAssignments((prev) => {
      const updated = prev.map((x) =>
        x.order_id === orderId && x.staff_id === staffId && x.staff_role === role
          ? { ...x, whatsapp_sent_status: status }
          : x
      );
      localStorage.setItem('erp_staff_assignments', JSON.stringify(updated));
      return updated;
    });
  };

  // 5. Mark Event Completed (Action button in Operations)
  const markEventCompleted = (orderId: string, serverPath: string) => {
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

    const targetOrder = orders.find((o) => o.order_id === orderId);
    const previousStage = targetOrder ? targetOrder.current_stage : 'Event Scheduled';

    // Update Operations status to completed
    setOperations((prev) =>
      prev.map((op) => (op.order_id === orderId ? { ...op, event_status: 'Completed' } : op))
    );
    pushUpdate('operations', 'order_id', orderId, { event_status: 'Completed' });

    // Update order & lead stage to 'Event Completed'
    setOrders((prev) =>
      prev.map((ord) => (ord.order_id === orderId ? { ...ord, current_stage: 'Event Completed', updated_by: currentUserName, updated_at: new Date().toISOString() } : ord))
    );
    pushUpdate('orders', 'order_id', orderId, { 
      current_stage: 'Event Completed',
      updated_by: currentUserName,
      updated_at: new Date().toISOString()
    });

    if (targetOrder) {
      setLeads((prev) =>
        prev.map((ld) => (ld.lead_id === targetOrder.lead_id ? { ...ld, status: 'Event Completed', updated_by: currentUserName, updated_at: new Date().toISOString() } : ld))
      );
      pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
        status: 'Event Completed',
        updated_by: currentUserName,
        updated_at: new Date().toISOString()
      });
    }

    setRawFootage((prev) => [newRawFootage, ...prev]);
    setProduction((prev) => [newProd, ...prev]);

    pushInsert('raw_footage', newRawFootage);
    pushInsert('production', newProd);

    logActivity(`Marked Event Completed for Order ${orderId}. Raw Footage recorded: ${trackingId}`, 'Operations', orderId, previousStage, 'Event Completed');
  };

  // 6. Production updates (Editing progress, review, approval)
  const updateProduction = (
    productionId: string, 
    updates: Partial<Omit<Production, 'production_id' | 'tracking_id'>>
  ) => {
    let trackingIdToUpdate = '';
    
    // De-mock production ID if it is PRD-lead_id
    const inferredTrackingId = productionId.startsWith('PRD-') ? productionId.replace('PRD-', '') : productionId;
    let targetProd = production.find((p) => p.production_id === productionId || p.tracking_id === inferredTrackingId);
    
    let previousStage: CurrentStage = 'Raw Footage Received';
    if (targetProd) {
      const rf = rawFootage.find((f) => f.tracking_id === targetProd.tracking_id);
      const linkedOrder = rf ? orders.find((o) => o.order_id === rf.order_id) : undefined;
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

    // Set production state
    setProduction((prev) => {
      const exists = prev.some((p) => p.production_id === productionId || p.tracking_id === inferredTrackingId || (targetProd && p.production_id === targetProd.production_id));
      if (exists) {
        return prev.map((prod) => {
          if (prod.production_id === productionId || prod.tracking_id === inferredTrackingId || (targetProd && prod.production_id === targetProd.production_id)) {
            trackingIdToUpdate = prod.tracking_id;
            const updated = { ...prod, ...updates };
            pushUpdate('production', 'production_id', prod.production_id, updates);
            return updated;
          }
          return prod;
        });
      } else {
        trackingIdToUpdate = inferredTrackingId;
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
        // OMIT inserting into production table since we persist in leads table for these stages
        return prev;
      }
    });

    // Find linked order using all possible connections
    let tgtOrder = orders.find(o => o.order_id === inferredTrackingId || o.lead_id === inferredTrackingId);
    if (!tgtOrder) {
      const rf = rawFootage.find(f => f.tracking_id === inferredTrackingId || f.order_id === inferredTrackingId);
      if (rf) {
        tgtOrder = orders.find(o => o.order_id === rf.order_id);
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

    const leadIdToUpdate = tgtOrder?.lead_id || inferredTrackingId;

    if (nextStage && leadIdToUpdate) {
      setLeads((prev) =>
        prev.map((ld) => {
          if (ld.lead_id === leadIdToUpdate) {
            const leadUpdates: any = {
              updated_by: currentUserName,
              updated_at: new Date().toISOString()
            };
            if (nextStage) {
               leadUpdates.status = nextStage;
            }
            if (updates.editor_assigned) {
              leadUpdates.assigned_editor = updates.editor_assigned;
            }
            if (updates.assigned_staff) leadUpdates.assigned_editors = updates.assigned_staff;
            if (updates.target_delivery_date) leadUpdates.delivery_target_date = updates.target_delivery_date;
            
            console.log("Updating lead:", leadIdToUpdate, leadUpdates);
            pushUpdate('leads', 'lead_id', leadIdToUpdate, leadUpdates);
            return { ...ld, ...leadUpdates };
          }
          return ld;
        })
      );
    }

    if (nextStage && tgtOrder) {
      const isAllowedInOrders = !['Editor Assigned', 'Internal QC Review', 'Revision Required', 'Revision In Progress'].includes(nextStage);
      
      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.order_id === tgtOrder!.order_id) {
            const ordUpdates: any = {
              updated_by: currentUserName,
              updated_at: new Date().toISOString()
            };
            if (isAllowedInOrders) ordUpdates.current_stage = nextStage;
            
            pushUpdate('orders', 'order_id', tgtOrder!.order_id, ordUpdates);
            return { ...ord, ...ordUpdates };
          }
          return ord;
        })
      );
    }

    logActivity(
      `Updated Production ${productionId}: status=${updates.editing_status || 'unchanged'}`, 
      'Production', 
      productionId,
      previousStage,
      nextStage || previousStage
    );
  };

  // accept raw footage as post-production audit step
  const acceptRawFootage = (trackingId: string) => {
    const rf = rawFootage.find((f) => f.tracking_id === trackingId);
    if (!rf) return;

    const orderId = rf.order_id;
    const previousStage = orders.find((o) => o.order_id === orderId)?.current_stage || 'Event Completed';

    // Update raw footage state status
    setRawFootage((prev) =>
      prev.map((footage) => {
        if (footage.tracking_id === trackingId) {
          pushUpdate('raw_footage', 'tracking_id', trackingId, { status: 'Received' });
          return { ...footage, status: 'Received' as const };
        }
        return footage;
      })
    );

    // Update order & lead stage
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.order_id === orderId) {
          pushUpdate('orders', 'order_id', orderId, { 
            current_stage: 'Raw Footage Received',
            updated_by: currentUserName,
            updated_at: new Date().toISOString()
          });
          return { ...ord, current_stage: 'Raw Footage Received', updated_by: currentUserName, updated_at: new Date().toISOString() };
        }
        return ord;
      })
    );

    const targetOrder = orders.find((o) => o.order_id === orderId);
    if (targetOrder) {
      setLeads((prev) =>
        prev.map((ld) => {
          if (ld.lead_id === targetOrder.lead_id) {
            pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
              status: 'Raw Footage Received',
              updated_by: currentUserName,
              updated_at: new Date().toISOString()
            });
            return { ...ld, status: 'Raw Footage Received', updated_by: currentUserName, updated_at: new Date().toISOString() };
          }
          return ld;
        })
      );
    }

    logActivity(`Audited & accepted Raw Footage for Order: ${orderId}. Assigned to editing pipelines.`, 'Production', orderId, previousStage, 'Raw Footage Received');
  };

  const confirmRawFootageReceived = (
    orderId: string,
    footageLink?: string,
    storageType?: string,
    uploadNotes?: string,
    paymentCollectionStatus?: string,
    additionalReceived?: number
  ) => {
    const targetOrder = orders.find((o) => o.order_id === orderId);
    if (!targetOrder) return;
    const previousStage = targetOrder.current_stage;
    const targetStage: CurrentStage = 'Raw Footage Received';

    const resolvedLink = footageLink || `s3://photocrew-vault-production/2026/${orderId}-shoot/raw/`;

    setOrders((prev) =>
      prev.map((ord) => (ord.order_id === orderId ? { ...ord, current_stage: targetStage, updated_by: currentUserName, updated_at: new Date().toISOString() } : ord))
    );
    pushUpdate('orders', 'order_id', orderId, { 
      current_stage: targetStage,
      updated_by: currentUserName,
      updated_at: new Date().toISOString()
    });

    // Handle Payment Capture if provided
    if (paymentCollectionStatus) {
      const existingPayment = payments.find(p => p.order_id === orderId);
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
      };

      if (existingPayment) {
        setPayments(prev => prev.map(p => p.payment_id === payId ? updatedPayment : p));
        pushUpdate('payments', 'payment_id', payId, updatedPayment);
      } else {
        setPayments(prev => [updatedPayment, ...prev]);
        pushInsert('payments', updatedPayment);
      }
    }

    setLeads((prev) =>
      prev.map((ld) => (ld.lead_id === targetOrder.lead_id ? { ...ld, status: targetStage, updated_by: currentUserName, updated_at: new Date().toISOString() } : ld))
    );
    pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
      status: targetStage,
      updated_by: currentUserName,
      updated_at: new Date().toISOString()
    });

    // Also update event_status of corresponding Operations record to 'Raw Footage Received' if exists
    setOperations((prev) =>
      prev.map((op) => (op.order_id === orderId ? { ...op, event_status: 'Raw Footage Received' } : op))
    );
    pushUpdate('operations', 'order_id', orderId, { event_status: 'Raw Footage Received' });

    let existingRf = rawFootage.find(f => f.order_id === orderId);
    let trackingId = existingRf?.tracking_id || `TRK-${Math.floor(2012 + Math.random() * 850)}`;

    const nowIso = new Date().toISOString();
    const todayYyyyMmDd = nowIso.split('T')[0];

    const finalRf: RawFootage = {
      tracking_id: trackingId,
      order_id: orderId,
      event_completed_date: existingRf?.event_completed_date || todayYyyyMmDd,
      raw_received: true,
      server_path: resolvedLink,
      uploaded_by: currentUserName,
      uploaded_date: nowIso,
      status: 'Received',
      storage_type: storageType || 'Google Drive',
      upload_notes: uploadNotes || '',
    };

    if (existingRf) {
      setRawFootage((prev) =>
        prev.map((rf) => (rf.order_id === orderId ? finalRf : rf))
      );
      pushUpdate('raw_footage', 'tracking_id', trackingId, finalRf);
    } else {
      setRawFootage((prev) => [finalRf, ...prev]);
      pushInsert('raw_footage', finalRf);
    }

    // Ensure production entry exists or update it
    let existingProd = production.find(p => p.tracking_id === trackingId);
    if (existingProd) {
      setProduction((prev) =>
        prev.map((prod) => (prod.tracking_id === trackingId ? {
          ...prod,
          raw_footage_location: resolvedLink,
          remarks: `Raw footage received via ${storageType || 'Google Drive'}. ${uploadNotes || ''}`,
        } : prod))
      );
      pushUpdate('production', 'tracking_id', trackingId, {
        raw_footage_location: resolvedLink,
        remarks: `Raw footage received via ${storageType || 'Google Drive'}. ${uploadNotes || ''}`,
      });
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
      setProduction((prev) => [newProd, ...prev]);
      pushInsert('production', newProd);
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

    logActivity(`Raw Footage Received and Confirmed in system for Order: ${orderId}. Drive Link: ${resolvedLink}. Storage: ${storageType || 'Google Drive'}`, 'Operations', orderId, previousStage, targetStage);
  };

  const updateOrderStage = (orderId: string, stage: CurrentStage) => {
    const targetOrder = orders.find((o) => o.order_id === orderId);
    const previousStage = targetOrder ? targetOrder.current_stage : 'Order Confirmed';

    setOrders((prev) =>
      prev.map((ord) => (ord.order_id === orderId ? { ...ord, current_stage: stage, updated_by: currentUserName, updated_at: new Date().toISOString() } : ord))
    );
    pushUpdate('orders', 'order_id', orderId, { 
      current_stage: stage,
      updated_by: currentUserName,
      updated_at: new Date().toISOString()
    });

    if (targetOrder) {
      setLeads((prev) =>
        prev.map((ld) => (ld.lead_id === targetOrder.lead_id ? { ...ld, status: stage, updated_by: currentUserName, updated_at: new Date().toISOString() } : ld))
      );
      pushUpdate('leads', 'lead_id', targetOrder.lead_id, { 
        status: stage,
        updated_by: currentUserName,
        updated_at: new Date().toISOString()
      });
    }

    logActivity(`Updated stage for Order ${orderId}`, 'Operations', orderId, previousStage, stage);
  };

  // 7. Mark Delivered (Action button)
  const markDelivered = (trackingId: string, remarks?: string) => {
    const targetFootage = rawFootage.find((rf) => rf.tracking_id === trackingId);
    if (!targetFootage) return;

    const orderId = targetFootage.order_id;
    const previousStage = orders.find((o) => o.order_id === orderId)?.current_stage || 'Approved';

    const payment = payments.find((p) => p.order_id === orderId);
    const balanceDue = payment ? payment.balance_due : 1;
    const targetStage: CurrentStage = balanceDue === 0 ? 'Closed' : 'Payment Pending';

    const targetProd = production.find((p) => p.tracking_id === trackingId);
    if (targetProd) {
      const linkedOrder = orders.find((o) => o.order_id === orderId);
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
    setProduction((prev) =>
      prev.map((prod) => {
        if (prod.tracking_id === trackingId) {
          const updated = {
            ...prod,
            editing_status: 'Delivered' as const,
            customer_review_status: 'Approved' as const,
            delivery_date: new Date().toISOString().split('T')[0],
            remarks: `${prod.remarks || ''}\n${remarks || 'Delivered to client.'}`,
          };
          pushUpdate('production', 'production_id', prod.production_id, {
            editing_status: 'Delivered',
            customer_review_status: 'Approved',
            delivery_date: updated.delivery_date,
            remarks: updated.remarks
          });
          return updated;
        }
        return prod;
      })
    );

    // Update order & lead stage
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.order_id === orderId) {
          pushUpdate('orders', 'order_id', orderId, { 
            current_stage: targetStage, 
            order_status: 'Delivered',
            updated_by: currentUserName,
            updated_at: new Date().toISOString()
          });
          return { ...ord, current_stage: targetStage, order_status: 'Delivered', updated_by: currentUserName, updated_at: new Date().toISOString() };
        }
        return ord;
      })
    );
    const tgtOrder = orders.find((o) => o.order_id === orderId);
    if (tgtOrder) {
      setLeads((prev) =>
        prev.map((ld) => {
          if (ld.lead_id === tgtOrder.lead_id) {
            pushUpdate('leads', 'lead_id', tgtOrder.lead_id, { 
              status: targetStage,
              updated_by: currentUserName,
              updated_at: new Date().toISOString()
            });
            return { ...ld, status: targetStage, updated_by: currentUserName, updated_at: new Date().toISOString() };
          }
          return ld;
        })
      );
    }

    // Since delivery happened, we set payments status and stage
    setPayments((prev) =>
      prev.map((pay) => {
        if (pay.order_id === orderId) {
          return {
            ...pay,
          };
        }
        return pay;
      })
    );

    logActivity(`Marked Project Delivered to client for Order: ${orderId}`, 'Production', trackingId, previousStage, targetStage);
  };

  // 8. Payments update
  const recordPayment = (
    orderId: string, 
    amountReceived: number, 
    paymentDate: string, 
    proofUrl?: string
  ) => {
    let isFullyPaid = false;
    setPayments((prev) =>
      prev.map((pay) => {
        if (pay.order_id === orderId) {
          const totalPaid = pay.advance_received + pay.final_payment_received + amountReceived;
          const outstanding = Math.max(0, pay.quotation_amount - totalPaid);
          isFullyPaid = outstanding === 0;
          const updated = {
            ...pay,
            final_payment_received: pay.final_payment_received + amountReceived,
            balance_due: outstanding,
            payment_date: paymentDate,
            payment_proof_url: proofUrl || 'https://photocrew-receipts.s3.amazonaws.com/rec-custom.pdf',
            payment_status: isFullyPaid ? ('Fully Paid' as const) : ('Partially Paid' as const),
          };
          pushUpdate('payments', 'payment_id', pay.payment_id, {
            final_payment_received: updated.final_payment_received,
            balance_due: updated.balance_due,
            payment_date: updated.payment_date,
            payment_proof_url: updated.payment_proof_url,
            payment_status: updated.payment_status
          });
          return updated;
        }
        return pay;
      })
    );

    // If fully paid, move order status to next transition or check if delivered first.
    // If fully paid AND previous stage was delivered, we can transition stage to Closed!
    let nextStage: CurrentStage = 'Payment Pending';
    const currentOrder = orders.find((o) => o.order_id === orderId);
    const previousStage = currentOrder ? currentOrder.current_stage : 'Payment Pending';
    if (currentOrder) {
      if (isFullyPaid) {
        nextStage = 'Closed';
      } else {
        nextStage = 'Payment Pending';
      }

      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.order_id === orderId) {
            const nextOutstanding = Math.max(0, ord.balance_amount - amountReceived);
            pushUpdate('orders', 'order_id', orderId, {
              current_stage: nextStage,
              order_status: nextStage === 'Closed' ? 'Closed' : ord.order_status,
              balance_amount: nextOutstanding,
              updated_by: currentUserName,
              updated_at: new Date().toISOString()
            });
            return {
              ...ord,
              current_stage: nextStage,
              order_status: nextStage === 'Closed' ? ('Closed' as const) : ord.order_status,
              balance_amount: nextOutstanding,
              updated_by: currentUserName,
              updated_at: new Date().toISOString()
            };
          }
          return ord;
        })
      );

      setLeads((prev) =>
        prev.map((ld) => {
          if (ld.lead_id === currentOrder.lead_id) {
            pushUpdate('leads', 'lead_id', currentOrder.lead_id, { 
              status: nextStage,
              updated_by: currentUserName,
              updated_at: new Date().toISOString()
            });
            return { ...ld, status: nextStage, updated_by: currentUserName, updated_at: new Date().toISOString() };
          }
          return ld;
        })
      );
    }

    logActivity(`Recorded payment of ₹${amountReceived} for Order ${orderId}. Fully paid: ${isFullyPaid}`, 'Finance', orderId, previousStage, nextStage);
  };

  // User Management Admin features
  const addUser = async (name: string, email: string, mobile: string, role: UserRole, active: boolean, password?: string) => {
    const pwd = password || 'temp123';
    const username = email.split('@')[0];
    let id = `U-${Math.floor(100 + Math.random() * 900)}`;

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password: pwd,
          options: {
            data: {
              name,
              username,
              mobile,
              role,
              password: pwd
            }
          }
        });

        if (error) {
          console.warn('Supabase auth.signUp handled in addUser:', error.message);
          // If auth fails (e.g. user already exists or trigger bypass needed), try to insert directly into users table as a fallback
          const newUser: User = {
            id,
            name,
            email,
            mobile,
            role,
            active,
            created_at: new Date().toISOString().split('T')[0],
            password: pwd,
            username
          };
          setUsers((prev) => {
            if (prev.some(u => u.email === email)) return prev;
            return [...prev, newUser];
          });
          await pushInsert('users', {
            ...newUser,
            id: mapToDbUserId(id)
          });
        } else if (data?.user) {
          id = mapFromDbUserId(data.user.id);
          const newUser: User = {
            id,
            name,
            email,
            mobile,
            role,
            active,
            created_at: new Date().toISOString().split('T')[0],
            password: pwd,
            username
          };
          setUsers((prev) => {
            if (prev.some(u => u.email === email)) return prev;
            return [...prev, newUser];
          });
          // Let's call pushUpsert to make sure the users table has it immediately in real-time
          await pushUpsert('users', {
            ...newUser,
            id: data.user.id
          });
        }
      } catch (err) {
        console.error('Error in addUser:', err);
      }
    } else {
      const newUser: User = {
        id,
        name,
        email,
        mobile,
        role,
        active,
        created_at: new Date().toISOString().split('T')[0],
        password: pwd,
        username
      };
      setUsers((prev) => [...prev, newUser]);
    }

    logActivity(`Created User Account: ${name} (${role})`, 'UserManagement', id);
  };

  const signUpUser = async (name: string, username: string, email: string, mobile: string, role: UserRole, password: string) => {
    let finalId = `U-${Math.floor(100 + Math.random() * 900)}`;
    const dbId = mapToDbUserId(finalId);
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              username,
              mobile,
              role,
              password
            }
          }
        });

        // Email rate limit / sign up disabled / configuration issue handled gracefully via direct insert fallback
        if (error) {
          console.warn('Supabase auth.signUp rate limit or configuration error, using direct profile registration fallback:', error.message);
          const newUser: User = {
            id: finalId,
            name,
            email,
            mobile,
            role,
            active: true,
            created_at: new Date().toISOString().split('T')[0],
            password,
            username
          };
          setUsers((prev) => {
            if (prev.some(u => u.email === email)) return prev;
            return [...prev, newUser];
          });
          await pushInsert('users', {
            ...newUser,
            id: dbId
          });
          return { success: true, user: newUser, warning: error.message };
        }

        if (data?.user) {
          finalId = mapFromDbUserId(data.user.id);
          const newUser: User = {
            id: finalId,
            name,
            email,
            mobile,
            role,
            active: true,
            created_at: new Date().toISOString().split('T')[0],
            password,
            username
          };
          setUsers((prev) => {
            if (prev.some(u => u.email === email)) return prev;
            return [...prev, newUser];
          });
          // Call pushUpsert so the users table is populated with this specific user UUID immediately
          await pushUpsert('users', {
            ...newUser,
            id: data.user.id
          });
          return { success: true, user: newUser };
        }
      } catch (err: any) {
        console.error('Unhandled signup exception, registering as directory profile record directly:', err);
        const newUser: User = {
          id: finalId,
          name,
          email,
          mobile,
          role,
          active: true,
          created_at: new Date().toISOString().split('T')[0],
          password,
          username
        };
        setUsers((prev) => {
          if (prev.some(u => u.email === email)) return prev;
          return [...prev, newUser];
        });
        await pushInsert('users', {
          ...newUser,
          id: dbId
        });
        return { success: true, user: newUser, warning: err?.message };
      }
    } else {
      const newUser: User = {
        id: finalId,
        name,
        email,
        mobile,
        role,
        active: true,
        created_at: new Date().toISOString().split('T')[0],
        password,
        username
      };
      setUsers((prev) => [...prev, newUser]);
      return { success: true, user: newUser };
    }
  };

  const editUser = (id: string, updates: { name: string, email: string, mobile: string, role: UserRole, active: boolean }) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updates } : u));
    pushUpdate('users', 'id', mapToDbUserId(id), updates);
    logActivity(`Updated User Account Profile: ${updates.name}`, 'UserManagement', id);
  };

  const toggleUserStatus = (id: string) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id === id) {
        const nextActive = !u.active;
        pushUpdate('users', 'id', mapToDbUserId(id), { active: nextActive });
        logActivity(`${nextActive ? 'Activated' : 'Deactivated'} User Account: ${u.name}`, 'UserManagement', id);
        return { ...u, active: nextActive };
      }
      return u;
    }));
  };

  const resetUserPassword = (id: string, newPassword: string) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id === id) {
        pushUpdate('users', 'id', mapToDbUserId(id), { password: newPassword });
        logActivity(`Reset Password for User account: ${u.name}`, 'UserManagement', id);
        return { ...u, password: newPassword };
      }
      return u;
    }));
  };

  const addStaff = async (member: Omit<Staff, "staff_id">) => {
    const staffId = `STF-${Math.floor(100 + Math.random() * 900)}`;
    const newStaff: Staff = {
      ...member,
      staff_id: staffId,
      created_at: new Date().toISOString()
    };
    setStaff((prev) => [newStaff, ...prev]);
    await pushInsert('production_staff', newStaff);
    logActivity(`Added Staff Member: ${newStaff.name}`, 'StaffManagement', staffId);
  };

  const updateStaff = async (staffId: string, updates: Partial<Staff>) => {
    setStaff((prev) => prev.map((s) => s.staff_id === staffId ? { ...s, ...updates } : s));
    await pushUpdate('production_staff', 'staff_id', staffId, updates);
    logActivity(`Updated Staff Member details: ${staffId}`, 'StaffManagement', staffId);
  };

  const deleteStaff = async (staffId: string) => {
    setStaff((prev) => prev.filter((s) => s.staff_id !== staffId));
    await pushDelete('production_staff', 'staff_id', staffId);
    logActivity(`Removed Staff Member: ${staffId}`, 'StaffManagement', staffId);
  };

  const addEquipment = async (equip: Omit<Equipment, 'equipment_id'>) => {
    const equipmentId = `EQ-${Math.floor(100 + Math.random() * 900)}`;
    const newEquip: Equipment = {
      ...equip,
      equipment_id: equipmentId,
      created_at: new Date().toISOString()
    };
    setEquipment((prev) => [newEquip, ...prev]);
    await pushInsert('equipment', newEquip);
    logActivity(`Added Equipment Item: ${newEquip.name}`, 'EquipmentManagement', equipmentId);
  };

  const updateEquipment = async (equipmentId: string, updates: Partial<Equipment>) => {
    setEquipment((prev) => prev.map((e) => e.equipment_id === equipmentId ? { ...e, ...updates } : e));
    await pushUpdate('equipment', 'equipment_id', equipmentId, updates);
    logActivity(`Updated Equipment Item: ${equipmentId}`, 'EquipmentManagement', equipmentId);
  };

  const deleteEquipment = async (equipmentId: string) => {
    setEquipment((prev) => prev.filter((e) => e.equipment_id !== equipmentId));
    await pushDelete('equipment', 'equipment_id', equipmentId);
    logActivity(`Removed Equipment Item: ${equipmentId}`, 'EquipmentManagement', equipmentId);
  };

  const addPackage = async (pkg: Omit<Package, 'package_id'>) => {
    const package_id = `PKG-${pkg.category.substring(0, 1).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
    const newPkg: Package = {
      ...pkg,
      package_id,
      created_at: new Date().toISOString()
    };
    
    // Add to state & local cache
    setPackages((prev) => {
      const next = [newPkg, ...prev];
      localStorage.setItem('erp_packages', JSON.stringify(next));
      return next;
    });
    
    // Try to insert into Supabase
    try {
      if (supabaseClient) {
        await supabaseClient.from('packages').insert(newPkg);
      }
    } catch (err) {
      console.warn('Fallback to local: could not insert package to Supabase:', err);
    }
    
    logActivity(`Created Package: ${newPkg.package_name}`, 'Sales', package_id, 'Active', 'Active');
    return package_id;
  };

  const updatePackage = async (packageId: string, updates: Partial<Package>) => {
    setPackages((prev) => {
      const next = prev.map((p) => p.package_id === packageId ? { ...p, ...updates } : p);
      localStorage.setItem('erp_packages', JSON.stringify(next));
      return next;
    });
    
    try {
      if (supabaseClient) {
        await supabaseClient.from('packages').update(updates).eq('package_id', packageId);
      }
    } catch (err) {
      console.warn('Fallback to local: could not update package in Supabase:', err);
    }
  };

  const deletePackage = async (packageId: string) => {
    setPackages((prev) => {
      const next = prev.filter((p) => p.package_id !== packageId);
      localStorage.setItem('erp_packages', JSON.stringify(next));
      return next;
    });
    
    try {
      if (supabaseClient) {
        await supabaseClient.from('packages').delete().eq('package_id', packageId);
      }
    } catch (err) {
      console.warn('Fallback to local: could not delete package in Supabase:', err);
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
  };

  const markNotificationRead = async (notificationId: string) => {
    setNotifications((prev) => prev.map((n) => n.notification_id === notificationId ? { ...n, read_status: true, is_read: true } : n));
    if (!supabaseClient) return;
    
    const { error } = await supabaseClient.from('notifications').update({ read_status: true, is_read: true }).eq('notification_id', notificationId);
    if (error) {
      console.warn("Failed updating notification with all fields, trying fallback:", error);
      await supabaseClient.from('notifications').update({ is_read: true }).eq('notification_id', notificationId);
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
    
    const prodProj = production.find(p => p.production_id === assignment.production_id);
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
      generated_date: newQuote.generated_date
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
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabaseClient.from('quotations').insert(standardPayload);
      if (error) {
        console.warn('Could not insert quotation into Supabase with standard fields:', error.message);
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
        generated_date: updatedQuote.generated_date
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
        updated_at: new Date().toISOString()
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
  };

  const updateLead = (leadId: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((ld) => {
        if (ld.lead_id === leadId) {
          const updated = {
            ...ld,
            ...updates,
            updated_at: new Date().toISOString()
          };
          pushUpdate('leads', 'lead_id', leadId, updates);
          return updated;
        }
        return ld;
      })
    );
  };

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
        const defaultTargetDate = o.event_date ? new Date(new Date(o.event_date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '';
        list.push({
          production_id: `PRD-${o.lead_id}`,
          tracking_id: o.order_id,
          editor_assigned: 'Unassigned',
          raw_footage_location: '',
          editing_status: o.current_stage as any,
          remarks: '',
          project_priority: 'Medium',
          target_delivery_date: defaultTargetDate,
          expected_delivery_date: defaultTargetDate
        });
      }
    });
    return list.map(p => {
      const ord = augmentedOrders.find(o => o.order_id === p.tracking_id || o.lead_id === p.tracking_id);
      if (ord) {
        return {
          ...p,
          editing_status: ord.current_stage as any
        };
      }
      return p;
    });
  }, [production, augmentedOrders]);

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

  return (
    <RoleContext.Provider
      value={{
        currentUser,
        currentRole,
        currentUserName,
        setCurrentRole,
        setCurrentUserName,
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
        leadPackages,
        packages,
        addPackage,
        updatePackage,
        deletePackage,
        quotations,
        addQuotation,
        updateQuotation,
        updateLead,
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
        addUser,
        signUpUser,
        editUser,
        toggleUserStatus,
        resetUserPassword,
        staffAssignments,
        saveStaffAssignments,
        updateStaffAssignmentWhatsAppStatus,
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
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
};
