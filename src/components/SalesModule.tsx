import React, { useState } from 'react';
import { useRole } from './RoleContext';
import { 
  Plus, Edit, CheckSquare, Search, Filter, Ban, X, Phone, Mail, MapPin, Calendar, DollarSign, Clock, Users, ArrowRight
} from 'lucide-react';
import { Lead, CurrentStage } from '../types';
import { formatINR, formatIndianPhoneNumber, validateIndianMobile, formatTime12Hour } from '../utils';

export const SalesModule: React.FC = () => {
  const { currentRole, leads, addLead, updateLeadFollowUp, confirmOrder } = useRole();

  // Role permissions gate
  const canEdit = currentRole === 'Sales Team' || currentRole === 'Business Owner';

  // Toggle modes
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Filter States
  const [filterQuery, setFilterQuery] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSalesPerson, setFilterSalesPerson] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Extra state for "Other" lead source name input
  const [otherSource, setOtherSource] = useState('');

  // Screen 2 Form State
  const [createForm, setCreateForm] = useState({
    customer_name: '',
    mobile: '+91 ',
    alternate_mobile: '+91 ',
    email: '',
    lead_source: 'Website Form',
    event_type: 'Wedding Shoot',
    event_date: '',
    event_time: '12:00',
    event_location: '',
    budget: 35000,
    remarks: '',
  });

  // Screen 3 Follow-Up Form State
  const [followUpForm, setFollowUpForm] = useState({
    call_notes: '',
    next_follow_up_date: '',
    status: 'Follow Up' as CurrentStage,
    quotation_amount: 3500,
    negotiation_notes: '',
  });

  // Confirm Order Form State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmForm, setConfirmForm] = useState({
    package_name: 'Luxury Cinematic Bundle',
    quotation_amount: 3500,
    advance_received: 1000,
  });

  // Handle lead select
  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setFollowUpForm({
      call_notes: '',
      next_follow_up_date: '',
      status: lead.status,
      quotation_amount: lead.budget,
      negotiation_notes: '',
    });
    setConfirmForm({
      package_name: lead.event_type + ' Premium Package',
      quotation_amount: lead.budget,
      advance_received: Math.round(lead.budget / 3),
    });
  };

  // Handle lead creation
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.customer_name || !createForm.mobile || !createForm.email) {
      alert('Required fields must be completed.');
      return;
    }

    // Validate Indian mobile numbers
    if (!validateIndianMobile(createForm.mobile)) {
      alert('Please enter a valid Indian mobile number starting with 6, 7, 8, or 9 (10 digits).');
      return;
    }
    if (createForm.alternate_mobile && createForm.alternate_mobile.trim() !== '' && createForm.alternate_mobile.trim() !== '+91' && !validateIndianMobile(createForm.alternate_mobile)) {
      alert('Please enter a valid alternate Indian mobile number starting with 6, 7, 8, or 9 (10 digits).');
      return;
    }

    const finalSource = createForm.lead_source === 'Other' ? (otherSource ? `Other: ${otherSource}` : 'Other') : createForm.lead_source;

    const newId = addLead({
      customer_name: createForm.customer_name,
      mobile: createForm.mobile,
      alternate_mobile: (createForm.alternate_mobile && createForm.alternate_mobile.trim() !== '' && createForm.alternate_mobile.trim() !== '+91') ? createForm.alternate_mobile : undefined,
      email: createForm.email,
      lead_source: finalSource,
      event_type: createForm.event_type,
      event_date: createForm.event_date || new Date().toISOString().split('T')[0],
      event_time: createForm.event_time,
      event_location: createForm.event_location,
      budget: Number(createForm.budget),
      remarks: createForm.remarks,
    });

    setCreateForm({
      customer_name: '',
      mobile: '+91 ',
      alternate_mobile: '+91 ',
      email: '',
      lead_source: 'Website Form',
      event_type: 'Wedding Shoot',
      event_date: '',
      event_time: '12:00',
      event_location: '',
      budget: 35000,
      remarks: '',
    });
    setOtherSource('');

    setActiveTab('list');
    alert(`Lead created with ID: ${newId}`);
  };

  // Handle follow up submit
  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    if (!followUpForm.call_notes) {
      alert('Please fill in some Call Notes to update lead follow-up.');
      return;
    }

    updateLeadFollowUp(
      selectedLead.lead_id,
      followUpForm.status,
      followUpForm.call_notes,
      followUpForm.next_follow_up_date || new Date().toISOString().split('T')[0],
      Number(followUpForm.quotation_amount),
      followUpForm.negotiation_notes
    );

    // Refresh selected lead state
    setSelectedLead((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        status: followUpForm.status,
        budget: Number(followUpForm.quotation_amount),
      };
    });

    // Clear follow up text
    setFollowUpForm(prev => ({ ...prev, call_notes: '', negotiation_notes: '' }));
    alert('Follow-up activity recorded.');
  };

  // Handle Order Confirmation Process
  const handleConfirmOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    const orderId = confirmOrder(
      selectedLead.lead_id,
      confirmForm.package_name,
      Number(confirmForm.quotation_amount),
      Number(confirmForm.advance_received)
    );

    setShowConfirmModal(false);
    setSelectedLead(null);
    alert(`Lead Successfully Converted! Order Contract Generated: ${orderId}`);
  };

  // Filter Leads List
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.customer_name.toLowerCase().includes(filterQuery.toLowerCase()) || 
      lead.lead_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      lead.mobile.includes(filterQuery);

    const matchesSource = filterSource === '' || lead.lead_source === filterSource;
    const matchesStatus = filterStatus === '' || lead.status === filterStatus;
    const matchesSales = filterSalesPerson === '' || lead.sales_person === filterSalesPerson;
    const matchesDate = filterDate === '' || lead.event_date === filterDate;

    return matchesSearch && matchesSource && matchesStatus && matchesSales && matchesDate;
  });

  return (
    <div id="sales_module" className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span className="p-1 px-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono rounded tracking-widest">SALES</span>
            <span>Sales & Lead Desk</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Collect potential inbound queries, log CRM call reports, propose quotations and confirm contracts.
          </p>
        </div>

        {/* Create and Tabs Controls */}
        <div className="flex items-center gap-2">
          <button
            id="btn_lead_tab_list"
            onClick={() => { setActiveTab('list'); setSelectedLead(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              activeTab === 'list' && !selectedLead
                ? 'bg-zinc-900 border-zinc-750 text-white font-black hover:border-zinc-700'
                : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Leads Directory
          </button>
          
          {canEdit ? (
            <button
              id="btn_lead_create_flag"
              onClick={() => { setActiveTab('create'); setSelectedLead(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all ${
                activeTab === 'create'
                  ? 'bg-emerald-600 hover:bg-emerald-505 text-white'
                  : 'bg-emerald-500/10 hover:bg-emerald-600/20 text-emerald-450 border border-emerald-500/25'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Lead</span>
            </button>
          ) : (
            <span className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 rounded px-2.5 py-1 flex items-center gap-1.5" title="You are restricted from adding leads in this role.">
              <Ban className="w-3 h-3" />
              <span>Sales Access Blocked</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Sandbox Area */}
      {false && selectedLead && (
        <div className="hidden lg:grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column A: Lead Details & Meta */}
          <div className="lg:col-span-4 bg-slate-850 rounded-xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded font-black border border-slate-700">
                  {selectedLead.lead_id}
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-2">{selectedLead.customer_name}</h3>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-450 hover:text-slate-250 text-xs rounded transition-all cursor-pointer text-slate-400"
              >
                Close Back
              </button>
            </div>

            {/* Informational Items */}
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-2.5 text-slate-350">
                <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="font-mono text-slate-200">{formatIndianPhoneNumber(selectedLead.mobile)}</span>
              </div>
              {selectedLead.alternate_mobile && (
                <div className="flex items-center gap-2.5 text-slate-350">
                  <Phone className="w-4 h-4 text-slate-505 flex-shrink-0" />
                  <span>Alt: <span className="font-mono text-slate-200">{formatIndianPhoneNumber(selectedLead.alternate_mobile)}</span></span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-slate-350">
                <Mail className="w-4 h-4 text-slate-505 flex-shrink-0" />
                <span className="text-slate-200 truncate">{selectedLead.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-350">
                <MapPin className="w-4 h-4 text-slate-505 flex-shrink-0" />
                <span className="text-slate-200">{selectedLead.event_location}</span>
              </div>
            </div>

            {/* Detailed Parameters */}
            <div className="border-t border-slate-800 pt-3.5 grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 block">Shoot Type</span>
                <strong className="text-slate-200 font-medium">{selectedLead.event_type}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Lead Source</span>
                <strong className="text-slate-200 font-medium">{selectedLead.lead_source}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Date Scheduled</span>
                <strong className="text-slate-200 font-medium">{selectedLead.event_date} @ {formatTime12Hour(selectedLead.event_time)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Current Budget</span>
                <strong className="text-amber-400 font-extrabold font-mono">{formatINR(selectedLead.budget)}</strong>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 text-[11px]">
              <span className="text-slate-500 block mb-1">Remarks & Audits</span>
              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 font-mono text-[10px] text-slate-400 max-h-36 overflow-y-auto whitespace-pre-wrap">
                {selectedLead.remarks || 'No remarks recorded.'}
              </div>
            </div>

            {/* Action Area: Convert Lead */}
            {canEdit && (
              <div className="border-t border-slate-800 pt-4">
                <button
                  id="btn_confirm_order"
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-950/20 text-xs transition-all cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>CONFIRM ORDER CONTRACT</span>
                </button>
              </div>
            )}
          </div>

          {/* Column B: Follow-up Activity Logger */}
          <div className="lg:col-span-8 bg-slate-850 rounded-xl border border-slate-800 p-5">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 pb-2.5 border-b border-slate-800 mb-4">
              <span>📝</span> Log Lead Follow-up activity & CRM notes
            </h3>

            {canEdit ? (
              <form onSubmit={handleFollowUpSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status Options */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Transition ERP Stage *
                    </label>
                    <select
                      value={followUpForm.status}
                      onChange={(e) => setFollowUpForm({ ...followUpForm, status: e.target.value as CurrentStage })}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Follow Up">Follow Up</option>
                      <option value="Quotation Sent">Quotation Sent</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Order Confirmed">Order Confirmed</option>
                    </select>
                  </div>

                  {/* Next Date */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Next Follow-up Action Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={followUpForm.next_follow_up_date}
                      onChange={(e) => setFollowUpForm({ ...followUpForm, next_follow_up_date: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  {/* Proposed budget */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Negotiated Quotation Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={followUpForm.quotation_amount}
                      onChange={(e) => setFollowUpForm({ ...followUpForm, quotation_amount: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {/* Call reports */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Call / Conversation Notes *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Log exact customer concerns, desired outputs, specific package selections, or callbacks."
                    value={followUpForm.call_notes}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, call_notes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  ></textarea>
                </div>

                {/* Negotiation notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Negotiation Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Specific price offsets, discount justifications, extra features offered..."
                    value={followUpForm.negotiation_notes}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, negotiation_notes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="px-4 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg transition-all cursor-pointer"
                  >
                    Discard Back
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-650 hover:bg-indigo-550 text-white rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    Save Follow-up Notes
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-2">
                <Ban className="w-10 h-10 text-slate-650 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-350">Access Restrictions Active</h4>
                <p className="text-xs max-w-sm mx-auto">
                  Only the **Sales Team** or the **Business Owner** possess authorized write clearances to log client interaction updates. Keep testing with another persona.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Sandbox Area & Mobile Base view */}
      <div className="space-y-6">
        {activeTab === 'create' ? (
        /* SCREEN 2: Create Lead Layout as centered Popup Modal */
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col p-6 space-y-6 text-left">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>✍️</span> Capture New Inbound Query
              </h3>
            <button 
              onClick={() => setActiveTab('list')}
              className="p-1 px-2.5 bg-slate-805 hover:bg-slate-800 text-slate-400 text-xs rounded transition-all cursor-pointer"
            >
              Back directory
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Cust Name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Sophia Loren"
                  value={createForm.customer_name}
                  onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Primary Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="sophia@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Primary Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+1 (555) 019-4820"
                  value={createForm.mobile}
                  onChange={(e) => setCreateForm({ ...createForm, mobile: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Alt Mobile */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Alternate Mobile (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 012-3456"
                  value={createForm.alternate_mobile}
                  onChange={(e) => setCreateForm({ ...createForm, alternate_mobile: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Desired Event Shoot Type
                </label>
                <select
                  value={createForm.event_type}
                  onChange={(e) => setCreateForm({ ...createForm, event_type: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="Wedding Shoot">Wedding Shoot</option>
                  <option value="Destination Wedding">Destination Wedding</option>
                  <option value="Pre-Wedding Shoot">Pre-Wedding Shoot</option>
                  <option value="Corporate Event">Corporate Event</option>
                  <option value="Real Estate Reel">Real Estate Reel</option>
                  <option value="Fashion Portfolio">Fashion Portfolio</option>
                  <option value="Music Video Launch">Music Video Launch</option>
                  <option value="Birthday Banquet">Birthday Banquet</option>
                </select>
              </div>

              {/* Lead Source */}
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Inbound Lead Channel Source
                  </label>
                  <select
                    value={createForm.lead_source}
                    onChange={(e) => setCreateForm({ ...createForm, lead_source: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="Website Form">Website Form</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook Ad">Facebook Ad</option>
                    <option value="Google Search">Google Search</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {createForm.lead_source === 'Other' && (
                  <div>
                    <label className="block text-xs font-mono font-bold text-amber-500 mb-1 animate-fade-in-down">
                      Specify Custom Lead Source Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. YouTube, Billboard, Event Flyer"
                      value={otherSource}
                      onChange={(e) => setOtherSource(e.target.value)}
                      className="w-full bg-slate-900 border border-amber-500/50 rounded-lg py-1.5 px-3 text-xs text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Event Date */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Estimated Event Date *
                </label>
                <input
                  type="date"
                  required
                  value={createForm.event_date}
                  onChange={(e) => setCreateForm({ ...createForm, event_date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-755 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none font-mono"
                />
              </div>

              {/* Event Time */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Estimated Reporting Time *
                </label>
                <input
                  type="time"
                  required
                  value={createForm.event_time}
                  onChange={(e) => setCreateForm({ ...createForm, event_time: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-755 rounded-lg py-1.5 px-3 text-xs text-slate-105 focus:outline-none font-mono"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Initial Proposed Budget (₹)
                </label>
                <input
                  type="number"
                  required
                  value={createForm.budget}
                  onChange={(e) => setCreateForm({ ...createForm, budget: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-755 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none font-mono"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Shoot Geography / Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Grand Hyatt Central Beach Lawn"
                  value={createForm.event_location}
                  onChange={(e) => setCreateForm({ ...createForm, event_location: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-755 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none"
                />
              </div>

            </div>

            {/* Init query remarks */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Remarks & Detailed Inbound Scope
              </label>
              <textarea
                rows={3}
                placeholder="List customized requests, physical albums requirement, or crew limits."
                value={createForm.remarks}
                onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })}
                className="w-full bg-slate-900 border border-slate-755 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              ></textarea>
            </div>

            {/* Submit layout */}
            <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md hover:shadow-emerald-900/10 cursor-pointer"
              >
                Create Inbound Lead
              </button>
            </div>
          </form>
          </div>
        </div>
      ) : (
        /* SCREEN 1: Lead List datagrid */
        <div className="space-y-4">
          
          {/* Quick Filters Panel */}
          <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-850 shadow-xl grid grid-cols-1 sm:grid-cols-5 gap-3 items-end relative overflow-hidden">
            {/* Corner calibration tick marks */}
            <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-emerald-500/40" />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-emerald-500/40" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-emerald-500/40" />
            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-emerald-500/40" />

            {/* Search query */}
            <div className="col-span-1 sm:col-span-1.5">
              <label className="block text-[10px] uppercase font-mono font-bold text-zinc-400 mb-1">
                Search Lead / Customer Name
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-emerald-505 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="ID, name, or phone..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                />
              </div>
            </div>

            {/* Source */}
            <div>
              <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">
                Lead Source
              </label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
              >
                <option value="">All Sources</option>
                <option value="Website Form">Website Form</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook Ad">Facebook Ad</option>
                <option value="Google Search">Google Search</option>
                <option value="Referral">Referral</option>
              </select>
            </div>

            {/* Status (Stage) */}
            <div>
              <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">
                Active Stage
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
              >
                <option value="">All Stages</option>
                <option value="New Lead">New Lead</option>
                <option value="Follow Up">Follow Up</option>
                <option value="Quotation Sent">Quotation Sent</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Order Confirmed">Order Confirmed</option>
                <option value="Operations Assigned">Operations Assigned</option>
                <option value="Event Completed">Event Completed</option>
                <option value="Editing Started">Editing Started</option>
                <option value="Customer Review">Customer Review</option>
                <option value="Delivered">Delivered</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Clear filters trigger */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setFilterQuery('');
                  setFilterSource('');
                  setFilterStatus('');
                  setFilterSalesPerson('');
                  setFilterDate('');
                }}
                className="w-full flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 py-1.5 px-3 text-xs text-slate-300 rounded-lg transition-all cursor-pointer"
                title="Reset queries"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Table view */}
          <div className="bg-zinc-900/20 rounded-2xl border border-zinc-850 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-950/70 text-zinc-405 font-bold border-b border-zinc-850 text-[10px] uppercase font-mono tracking-wider">
                    <th className="p-3.5 pl-5">Lead ID</th>
                    <th className="p-3.5">Customer Name</th>
                    <th className="p-3.5">Mobile Contact</th>
                    <th className="p-3.5">Inbound Source</th>
                    <th className="p-3.5">Event Date</th>
                    <th className="p-3.5">Allocated Rep</th>
                    <th className="p-3.5">Current Stage</th>
                    <th className="p-3.5 text-right pr-5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => {
                      const isActiveInSales = ['New Lead', 'Follow Up', 'Quotation Sent', 'Negotiation'].includes(lead.status);
                      return (
                        <tr 
                          key={lead.lead_id} 
                          className="hover:bg-zinc-900/30 text-zinc-300 transition-all"
                        >
                          <td className="p-3.5 pl-5 font-mono text-[11px] font-bold text-indigo-400">
                            {lead.lead_id}
                          </td>
                          <td className="p-3.5 font-bold text-white">
                            {lead.customer_name}
                          </td>
                          <td className="p-3.5 font-mono text-zinc-400">
                            {formatIndianPhoneNumber(lead.mobile)}
                          </td>
                          <td className="p-3.5">
                            <span className="bg-zinc-950 text-amber-400 border border-zinc-850 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                              {lead.lead_source.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-zinc-350">
                            {lead.event_date}
                          </td>
                          <td className="p-3.5 text-zinc-400 font-bold">
                            {lead.sales_person}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-tight uppercase border ${
                              lead.status === 'New Lead' ? 'bg-indigo-555/15 text-indigo-400 border-indigo-505/20' :
                              lead.status === 'Follow Up' ? 'bg-emerald-555/15 text-emerald-400 border-emerald-505/20' :
                              lead.status === 'Quotation Sent' ? 'bg-amber-555/15 text-amber-400 border-amber-505/20' :
                              lead.status === 'Negotiation' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-extrabold animate-pulse' :
                              lead.status === 'Order Confirmed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-450/40 font-black' :
                              'bg-zinc-900 text-zinc-400 border-zinc-800'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right pr-5">
                            <button
                              id={`btn_followup_${lead.lead_id}`}
                              onClick={() => handleSelectLead(lead)}
                              className="px-3.5 py-1.5 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-amber-400 hover:text-white rounded-xl border border-zinc-850 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow"
                            >
                              <Edit className="w-3 h-3" />
                              <span>{isActiveInSales && canEdit ? 'Manage CRM' : 'View CRM'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500">
                        <Filter className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                        <span className="text-xs font-mono text-zinc-500">No matching records in the directory grid. Try resetting filters.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Confirmation Modal to Officially Log and Book Contract */}
      {showConfirmModal && selectedLead && (
        <div className="fixed inset-0 bg-black/75 z-55 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-850 border border-slate-800 rounded-xl overflow-hidden max-w-md w-full shadow-2xl p-5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                <span>💍</span> Create Order ID & Generate Contract
              </h4>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-500 hover:text-slate-350 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900 p-3 rounded border border-slate-800 text-[11px] space-y-1">
              <p className="text-slate-400">Client: <strong className="text-slate-205">{selectedLead.customer_name}</strong></p>
              <p className="text-slate-400">Type: <strong className="text-slate-205">{selectedLead.event_type}</strong></p>
              <p className="text-slate-400">Address: <strong className="text-slate-205">{selectedLead.event_location}</strong></p>
            </div>

            <form onSubmit={handleConfirmOrderSubmit} className="space-y-4 text-xs">
              
              {/* Product package */}
              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Product Package Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Royal Destination Platinum"
                  value={confirmForm.package_name}
                  onChange={(e) => setConfirmForm({ ...confirmForm, package_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Quotation Amt */}
                <div>
                  <label className="block font-medium text-slate-400 mb-1">
                    Final Contract Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={confirmForm.quotation_amount}
                    onChange={(e) => setConfirmForm({ ...confirmForm, quotation_amount: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none font-mono"
                  />
                </div>

                {/* Advance Amount */}
                <div>
                  <label className="block font-medium text-slate-400 mb-1">
                    Advance Collected (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={confirmForm.advance_received}
                    onChange={(e) => setConfirmForm({ ...confirmForm, advance_received: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-755 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Balance due readout */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                <span className="text-slate-350">Balance Outstanding Due:</span>
                <strong className="text-emerald-400 font-mono font-black">
                  {formatINR(Math.max(0, confirmForm.quotation_amount - confirmForm.advance_received))}
                </strong>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn_confirm_submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/30"
                >
                  <span>Approve Contract Book</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile/Tablet Popup Modal for Lead Follow-up Details */}
      {selectedLead && (
        <div id="lead_details_mobile_modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-805 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850 sticky top-0 z-10 backdrop-blur-md">
              <h3 className="text-xs font-black text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <span>💍</span> Lead CRM follow-up Desk
              </h3>
              <button 
                onClick={() => setSelectedLead(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-705 text-slate-300 hover:text-white text-xs rounded-xl transition-all cursor-pointer border border-slate-700 font-bold"
              >
                Close
              </button>
            </div>
            
            <div className="p-5 space-y-6 text-xs text-left">
              {/* Column A: Lead Details & Meta */}
              <div className="bg-slate-850 rounded-xl border border-slate-800 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded font-black border border-slate-700">
                    {selectedLead.lead_id}
                  </span>
                  <span className="text-[10px] text-zinc-400">Owner: {selectedLead.sales_person}</span>
                </div>
                
                <h3 className="text-base font-bold text-white">{selectedLead.customer_name}</h3>

                {/* Informational Items */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-350">
                    <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="font-mono text-slate-205">{formatIndianPhoneNumber(selectedLead.mobile)}</span>
                  </div>
                  {selectedLead.alternate_mobile && (
                    <div className="flex items-center gap-2.5 text-slate-350">
                      <Phone className="w-4 h-4 text-slate-505 flex-shrink-0" />
                      <span>Alt: <span className="font-mono text-slate-205">{formatIndianPhoneNumber(selectedLead.alternate_mobile)}</span></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-slate-350">
                    <Mail className="w-4 h-4 text-slate-552 flex-shrink-0" />
                    <span className="text-slate-205 truncate">{selectedLead.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-350">
                    <MapPin className="w-4 h-4 text-slate-552 flex-shrink-0" />
                    <span className="text-slate-205">{selectedLead.event_location}</span>
                  </div>
                </div>

                {/* Detailed Parameters */}
                <div className="border-t border-slate-800 pt-3 grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Shoot Type</span>
                    <strong className="text-slate-205 font-medium">{selectedLead.event_type}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Lead Source</span>
                    <strong className="text-slate-205 font-medium">{selectedLead.lead_source}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date Scheduled</span>
                    <strong className="text-slate-205 font-medium">{selectedLead.event_date} @ {formatTime12Hour(selectedLead.event_time)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-505 block">Current Budget</span>
                    <strong className="text-amber-455 font-extrabold font-mono">{formatINR(selectedLead.budget)}</strong>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 text-[11px]">
                <span className="text-slate-500 block mb-1">Remarks & Audits</span>
                <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 font-mono text-[10px] text-slate-400 max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {selectedLead.remarks || 'No remarks recorded.'}
                </div>
              </div>

              {/* Convert Lead button */}
              {canEdit && (
                <div className="border-t border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg text-xs transition-all cursor-pointer font-bold"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>CONFIRM ORDER CONTRACT</span>
                  </button>
                </div>
              )}

              {/* Column B: Activity Logger */}
              <div className="bg-slate-850 rounded-xl border border-slate-800 p-4 space-y-4">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5 pb-2 border-b border-slate-800">
                  <span>📝</span> CRM Notes & Follow-up
                </h3>

                {canEdit ? (
                  <form onSubmit={handleFollowUpSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 text-left">
                      {/* Status select */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate-450 mb-1">
                          Transition ERP Stage *
                        </label>
                        <select
                          value={followUpForm.status}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, status: e.target.value as CurrentStage })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100"
                        >
                          <option value="Follow Up">Follow Up</option>
                          <option value="Quotation Sent">Quotation Sent</option>
                          <option value="Negotiation">Negotiation</option>
                          <option value="Order Confirmed">Order Confirmed</option>
                        </select>
                      </div>

                      {/* Date picker */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate-450 mb-1">
                          Next Follow-up Action Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={followUpForm.next_follow_up_date}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, next_follow_up_date: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono"
                        />
                      </div>

                      {/* Quotation amount */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate-455 mb-1">
                          Negotiated Quotation Amount (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          value={followUpForm.quotation_amount}
                          onChange={(e) => setFollowUpForm({ ...followUpForm, quotation_amount: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono"
                        />
                      </div>
                    </div>

                    {/* Conversation/Notes */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-455 mb-1">
                        Call / Conversation Notes *
                      </label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Log customer concerns, callbacks or package details."
                        value={followUpForm.call_notes}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, call_notes: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-805 rounded-lg py-2 px-3 text-xs text-zinc-100 font-sans"
                      ></textarea>
                    </div>

                    {/* Negotiation notes */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-455 mb-1">
                        Negotiation Notes (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Price offsets, justifications..."
                        value={followUpForm.negotiation_notes}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, negotiation_notes: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-zinc-100"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 font-bold">
                      <button
                        type="button"
                        onClick={() => setSelectedLead(null)}
                        className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-755 text-slate-300 rounded-lg cursor-pointer border border-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs bg-indigo-650 hover:bg-indigo-555 text-white rounded-lg shadow-sm cursor-pointer"
                      >
                        Save Follow-up Notes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-2">
                    <Ban className="w-8 h-8 text-slate-650 mx-auto" />
                    <h4 className="text-xs font-semibold text-slate-350">Access Restricted</h4>
                    <p className="text-[10px] leading-relaxed max-w-sm mx-auto">
                      Only the **Sales Team** or the **Business Owner** possess authorized write clearances to log client interaction updates. Keep testing with another persona.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
