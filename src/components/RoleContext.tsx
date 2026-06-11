import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Lead, Order, Operation, RawFootage, Production, Payment, ActivityLog, UserRole, CurrentStage, EditingStatus } from '../types';
import { INITIAL_USERS, INITIAL_LEADS, INITIAL_ORDERS, INITIAL_OPERATIONS, INITIAL_RAW_FOOTAGE, INITIAL_PRODUCTION, INITIAL_PAYMENTS, INITIAL_LOGS } from '../data';

interface RoleContextType {
  currentUser: User | null;
  currentRole: UserRole;
  currentUserName: string;
  setCurrentRole: (role: UserRole) => void;
  setCurrentUserName: (name: string) => void;
  login: (emailOrUsername: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  users: User[];
  leads: Lead[];
  orders: Order[];
  operations: Operation[];
  rawFootage: RawFootage[];
  production: Production[];
  payments: Payment[];
  logs: ActivityLog[];
  
  // Master flow operations
  addLead: (lead: Omit<Lead, 'lead_id' | 'status' | 'created_by' | 'sales_person' | 'created_date'>) => string;
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
    advanceReceived: number
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
    }
  ) => void;
  markEventCompleted: (orderId: string, serverPath: string) => void;
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
  addUser: (name: string, email: string, mobile: string, role: UserRole, active: boolean, password?: string) => void;
  editUser: (id: string, updates: { name: string, email: string, mobile: string, role: UserRole, active: boolean }) => void;
  toggleUserStatus: (id: string) => void;
  resetUserPassword: (id: string, newPassword: string) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial values from localStorage to support persistency, or default to seeded data
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('erp_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

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

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('erp_leads');
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('erp_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [operations, setOperations] = useState<Operation[]>(() => {
    const saved = localStorage.getItem('erp_operations');
    return saved ? JSON.parse(saved) : INITIAL_OPERATIONS;
  });

  const [rawFootage, setRawFootage] = useState<RawFootage[]>(() => {
    const saved = localStorage.getItem('erp_raw_footage');
    return saved ? JSON.parse(saved) : INITIAL_RAW_FOOTAGE;
  });

  const [production, setProduction] = useState<Production[]>(() => {
    const saved = localStorage.getItem('erp_production');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTION;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('erp_payments');
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });

  const [logs, setLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('erp_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  // Track state in localStorage
  useEffect(() => {
    localStorage.setItem('erp_users', JSON.stringify(users));
  }, [users]);

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
    localStorage.setItem('erp_logs', JSON.stringify(logs));
  }, [logs]);

  // Handle auto-logout if user is deactivated
  useEffect(() => {
    if (currentUser) {
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
  const login = (emailOrUsername: string, password: string) => {
    const cleanInput = emailOrUsername.trim().toLowerCase();
    const foundUser = users.find(u => 
      u.email.toLowerCase() === cleanInput || 
      u.name.toLowerCase() === cleanInput || 
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
    }
    setCurrentUser(null);
    setCurrentRoleState('Business Owner');
    setCurrentUserNameState('Rupand Das');
    localStorage.removeItem('erp_current_user');
  };

  // Helper to add activity logs
  const logActivity = (action: string, module: string, recordId: string) => {
    const newLog: ActivityLog = {
      log_id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      user_name: currentUserName,
      role: currentRole,
      action,
      module,
      record_id: recordId,
      timestamp: new Date().toISOString(),
    };
    setLogs((prev) => [newLog, ...prev]);
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
    logActivity('Reset Database to Pre-seeded State', 'System', 'ALL');
  };

  const refreshData = () => {
    const savedUsers = localStorage.getItem('erp_users');
    if (savedUsers) setUsers(JSON.parse(savedUsers));
    const savedLeads = localStorage.getItem('erp_leads');
    if (savedLeads) setLeads(JSON.parse(savedLeads));
    const savedOrders = localStorage.getItem('erp_orders');
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    const savedOperations = localStorage.getItem('erp_operations');
    if (savedOperations) setOperations(JSON.parse(savedOperations));
    const savedRawFootage = localStorage.getItem('erp_raw_footage');
    if (savedRawFootage) setRawFootage(JSON.parse(savedRawFootage));
    const savedProduction = localStorage.getItem('erp_production');
    if (savedProduction) setProduction(JSON.parse(savedProduction));
    const savedPayments = localStorage.getItem('erp_payments');
    if (savedPayments) setPayments(JSON.parse(savedPayments));
    const savedLogs = localStorage.getItem('erp_logs');
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    
    logActivity('Refreshed Workspace Data', 'System', 'ALL');
  };

  // 1. Create Lead
  const addLead = (leadDetails: Omit<Lead, 'lead_id' | 'status' | 'created_by' | 'sales_person' | 'created_date'>) => {
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
    logActivity(`Created Lead: ${newLead.customer_name}`, 'Sales', leadId);
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
    setLeads((prev) =>
      prev.map((ld) => {
        if (ld.lead_id === leadId) {
          return {
            ...ld,
            status,
            budget: quotationAmount !== undefined ? quotationAmount : ld.budget,
            remarks: `${ld.remarks || ''}\n[Update ${new Date().toISOString().split('T')[0]}]: ${callNotes}. ${negotiationNotes ? 'Neg Notes: ' + negotiationNotes : ''}. Next follow-up: ${nextFollowUpDate}`,
          };
        }
        return ld;
      })
    );
    logActivity(`Updated Lead Follow-up, stage: ${status}`, 'Sales', leadId);
  };

  // 3. Confirm Order (Action button)
  const confirmOrder = (
    leadId: string, 
    packageName: string, 
    quotationAmount: number, 
    advanceReceived: number
  ) => {
    const targetLead = leads.find((ld) => ld.lead_id === leadId);
    if (!targetLead) return '';

    // Update lead stage
    setLeads((prev) =>
      prev.map((ld) => (ld.lead_id === leadId ? { ...ld, status: 'Order Confirmed' } : ld))
    );

    const orderId = `ORD-${Math.floor(1012 + Math.random() * 800)}`;
    const newOrder: Order = {
      order_id: orderId,
      lead_id: leadId,
      customer_name: targetLead.customer_name,
      mobile: targetLead.mobile,
      event_type: targetLead.event_type,
      event_date: targetLead.event_date,
      event_time: targetLead.event_time,
      event_location: targetLead.event_location,
      package_name: packageName,
      quotation_amount: quotationAmount,
      advance_received: advanceReceived,
      balance_amount: quotationAmount - advanceReceived,
      order_status: 'Confirmed',
      current_stage: 'Order Confirmed',
      sales_person: currentUserName,
      created_at: new Date().toISOString(),
    };

    const paymentId = `PAY-${Math.floor(3012 + Math.random() * 800)}`;
    const newPayment: Payment = {
      payment_id: paymentId,
      order_id: orderId,
      quotation_amount: quotationAmount,
      advance_received: advanceReceived,
      balance_due: quotationAmount - advanceReceived,
      final_payment_received: 0,
      payment_status: advanceReceived > 0 ? 'Partially Paid' : 'Pending',
    };

    setOrders((prev) => [newOrder, ...prev]);
    setPayments((prev) => [newPayment, ...prev]);

    logActivity(`Confirmed Order for ${targetLead.customer_name}. Package: ${packageName}`, 'Sales', orderId);
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
    }
  ) => {
    const opId = `OP-${Math.floor(5012 + Math.random() * 800)}`;
    const newOp: Operation = {
      operation_id: opId,
      order_id: orderId,
      ...opData,
      event_status: 'Assigned',
      updated_by: currentUserName,
    };

    // Update order & lead stage
    setOrders((prev) =>
      prev.map((ord) => (ord.order_id === orderId ? { ...ord, current_stage: 'Operations Assigned' } : ord))
    );
    const targetOrder = orders.find((o) => o.order_id === orderId);
    if (targetOrder) {
      setLeads((prev) =>
        prev.map((ld) => (ld.lead_id === targetOrder.lead_id ? { ...ld, status: 'Operations Assigned' } : ld))
      );
    }

    setOperations((prev) => {
      const filtered = prev.filter((o) => o.order_id !== orderId); // remove old if exists
      return [newOp, ...filtered];
    });

    logActivity(`Assigned Crew for Order: ${orderId}`, 'Operations', opId);
  };

  // 5. Mark Event Completed (Action button in Operations)
  const markEventCompleted = (orderId: string, serverPath: string) => {
    const trackingId = `TRK-${Math.floor(2012 + Math.random() * 800)}`;
    const pId = `PRD-${Math.floor(4012 + Math.random() * 800)}`;

    const newRawFootage: RawFootage = {
      tracking_id: trackingId,
      order_id: orderId,
      event_completed_date: new Date().toISOString().split('T')[0],
      raw_received: true,
      server_path: serverPath || `s3://photocrew-vault-production/2026/${orderId}-shoot/raw/`,
      uploaded_by: currentUserName,
      uploaded_date: new Date().toISOString(),
      status: 'Received',
    };

    const newProd: Production = {
      production_id: pId,
      tracking_id: trackingId,
      editor_assigned: 'Unassigned',
      raw_footage_location: newRawFootage.server_path,
      editing_status: 'Pending',
      remarks: 'Raw footage uploaded. Awaiting editor assignment.',
    };

    // Update Operations status to completed
    setOperations((prev) =>
      prev.map((op) => (op.order_id === orderId ? { ...op, event_status: 'Completed' } : op))
    );

    // Update order & lead stage to 'Event Completed'
    setOrders((prev) =>
      prev.map((ord) => (ord.order_id === orderId ? { ...ord, current_stage: 'Event Completed' } : ord))
    );

    const targetOrder = orders.find((o) => o.order_id === orderId);
    if (targetOrder) {
      setLeads((prev) =>
        prev.map((ld) => (ld.lead_id === targetOrder.lead_id ? { ...ld, status: 'Event Completed' } : ld))
      );
    }

    setRawFootage((prev) => [newRawFootage, ...prev]);
    setProduction((prev) => [newProd, ...prev]);

    logActivity(`Marked Event Completed for Order ${orderId}. Raw Footage recorded: ${trackingId}`, 'Operations', orderId);
  };

  // 6. Production updates (Editing progress, review, approval)
  const updateProduction = (
    productionId: string, 
    updates: Partial<Omit<Production, 'production_id' | 'tracking_id'>>
  ) => {
    let trackingIdToUpdate = '';
    setProduction((prev) =>
      prev.map((prod) => {
        if (prod.production_id === productionId) {
          trackingIdToUpdate = prod.tracking_id;
          return { ...prod, ...updates };
        }
        return prod;
      })
    );

    // Determine Stage to update on Order and Lead
    let nextStage: CurrentStage | null = null;
    if (updates.editing_status === 'Editing') nextStage = 'Editing Started';
    else if (updates.editing_status === 'Customer Review') nextStage = 'Customer Review';
    else if (updates.editing_status === 'Approved') nextStage = 'Approved';
    else if (updates.editing_status === 'Delivered') nextStage = 'Delivered';

    if (nextStage && trackingIdToUpdate) {
      const rf = rawFootage.find((f) => f.tracking_id === trackingIdToUpdate);
      if (rf) {
        setOrders((prev) =>
          prev.map((ord) => (ord.order_id === rf.order_id ? { ...ord, current_stage: nextStage! } : ord))
        );
        const tgtOrder = orders.find((o) => o.order_id === rf.order_id);
        if (tgtOrder) {
          setLeads((prev) =>
            prev.map((ld) => (ld.lead_id === tgtOrder.lead_id ? { ...ld, status: nextStage! } : ld))
          );
        }
      }
    }

    logActivity(
      `Updated Production ${productionId}: status=${updates.editing_status || 'unchanged'}`, 
      'Production', 
      productionId
    );
  };

  // accept raw footage as post-production audit step
  const acceptRawFootage = (trackingId: string) => {
    const rf = rawFootage.find((f) => f.tracking_id === trackingId);
    if (!rf) return;

    const orderId = rf.order_id;

    // Update raw footage state status
    setRawFootage((prev) =>
      prev.map((footage) => (footage.tracking_id === trackingId ? { ...footage, status: 'Received' as const } : footage))
    );

    // Update order & lead stage
    setOrders((prev) =>
      prev.map((ord) => (ord.order_id === orderId ? { ...ord, current_stage: 'Raw Footage Received' } : ord))
    );

    const targetOrder = orders.find((o) => o.order_id === orderId);
    if (targetOrder) {
      setLeads((prev) =>
        prev.map((ld) => (ld.lead_id === targetOrder.lead_id ? { ...ld, status: 'Raw Footage Received' } : ld))
      );
    }

    logActivity(`Audited & accepted Raw Footage for Order: ${orderId}. Assigned to editing pipelines.`, 'Production', orderId);
  };

  // 7. Mark Delivered (Action button)
  const markDelivered = (trackingId: string, remarks?: string) => {
    const targetFootage = rawFootage.find((rf) => rf.tracking_id === trackingId);
    if (!targetFootage) return;

    const orderId = targetFootage.order_id;

    // Update production status
    setProduction((prev) =>
      prev.map((prod) =>
        prod.tracking_id === trackingId
          ? {
              ...prod,
              editing_status: 'Delivered',
              customer_review_status: 'Approved',
              delivery_date: new Date().toISOString().split('T')[0],
              remarks: `${prod.remarks || ''}\n${remarks || 'Delivered to client.'}`,
            }
          : prod
      )
    );

    // Update order & lead stage
    setOrders((prev) =>
      prev.map((ord) => (ord.order_id === orderId ? { ...ord, current_stage: 'Delivered', order_status: 'Delivered' } : ord))
    );
    const tgtOrder = orders.find((o) => o.order_id === orderId);
    if (tgtOrder) {
      setLeads((prev) =>
        prev.map((ld) => (ld.lead_id === tgtOrder.lead_id ? { ...ld, status: 'Delivered' } : ld))
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

    // If payment balance is fully cleared: Closed, else keep delivered. Let's let user collect final payment
    logActivity(`Marked Project Delivered to client for Order: ${orderId}`, 'Production', trackingId);
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
          return {
            ...pay,
            final_payment_received: pay.final_payment_received + amountReceived,
            balance_due: outstanding,
            payment_date: paymentDate,
            payment_proof_url: proofUrl || 'https://photocrew-receipts.s3.amazonaws.com/rec-custom.pdf',
            payment_status: isFullyPaid ? 'Fully Paid' : 'Partially Paid',
          };
        }
        return pay;
      })
    );

    // If fully paid, move order status to next transition or check if delivered first.
    // If fully paid AND previous stage was delivered, we can transition stage to Closed!
    let nextStage: CurrentStage = 'Payment Pending';
    const currentOrder = orders.find((o) => o.order_id === orderId);
    if (currentOrder) {
      if (isFullyPaid) {
        if (currentOrder.current_stage === 'Delivered' || currentOrder.current_stage === 'Approved') {
          nextStage = 'Closed';
        } else {
          nextStage = 'Closed'; // Automatically close completed paid orders if client desires
        }
      } else {
        nextStage = 'Payment Pending';
      }

      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.order_id === orderId) {
            return {
              ...ord,
              current_stage: nextStage,
              order_status: nextStage === 'Closed' ? 'Closed' : ord.order_status,
              balance_amount: Math.max(0, ord.balance_amount - amountReceived),
            };
          }
          return ord;
        })
      );

      setLeads((prev) =>
        prev.map((ld) => {
          if (ld.lead_id === currentOrder.lead_id) {
            return { ...ld, status: nextStage };
          }
          return ld;
        })
      );
    }

    logActivity(`Recorded payment of $${amountReceived} for Order ${orderId}. Fully paid: ${isFullyPaid}`, 'Finance', orderId);
  };

  // User Management Admin features
  const addUser = (name: string, email: string, mobile: string, role: UserRole, active: boolean, password?: string) => {
    const id = `U-${Math.floor(100 + Math.random() * 900)}`;
    const newUser: User = {
      id,
      name,
      email,
      mobile,
      role,
      active,
      created_at: new Date().toISOString().split('T')[0],
      password: password || 'temp123'
    };
    setUsers((prev) => [...prev, newUser]);
    logActivity(`Created User Account: ${name} (${role})`, 'UserManagement', id);
  };

  const editUser = (id: string, updates: { name: string, email: string, mobile: string, role: UserRole, active: boolean }) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updates } : u));
    logActivity(`Updated User Account Profile: ${updates.name}`, 'UserManagement', id);
  };

  const toggleUserStatus = (id: string) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id === id) {
        const nextActive = !u.active;
        logActivity(`${nextActive ? 'Activated' : 'Deactivated'} User Account: ${u.name}`, 'UserManagement', id);
        return { ...u, active: nextActive };
      }
      return u;
    }));
  };

  const resetUserPassword = (id: string, newPassword: string) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id === id) {
        logActivity(`Reset Password for User account: ${u.name}`, 'UserManagement', id);
        return { ...u, password: newPassword };
      }
      return u;
    }));
  };

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
        orders,
        operations,
        rawFootage,
        production,
        payments,
        logs,
        addLead,
        updateLeadFollowUp,
        confirmOrder,
        assignOperations,
        markEventCompleted,
        acceptRawFootage,
        updateProduction,
        markDelivered,
        recordPayment,
        resetAllData,
        refreshData,
        addUser,
        editUser,
        toggleUserStatus,
        resetUserPassword,
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
