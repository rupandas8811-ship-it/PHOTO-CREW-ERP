import re

with open('src/components/SalesModule.tsx', 'r') as f:
    content = f.read()

marker = '{/* Filters Toggle Button */}'
pos = content.rfind(marker)
if pos != -1:
    prefix = content[:pos]
    
    tail = """{/* Filters Toggle Button */}
                      <button
                        type="button"
                        id="btn_toggle_filters"
                        onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-sm ${
                          isFiltersExpanded || activeFilterCount > 0
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
                            : 'bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <Filter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Filters</span>
                        {activeFilterCount > 0 && (
                          <span className="bg-emerald-500 text-zinc-950 text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                            {activeFilterCount}
                          </span>
                        )}
                        {isFiltersExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-emerald-400 ml-0.5 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5 shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Download Reports Panel */}
                  {isDownloadReportsExpanded && (
                    <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center gap-2.5 animate-in fade-in duration-200">
                      <span className="text-xs text-zinc-400 font-bold mr-1 flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        Export Formats:
                      </span>
                      <button
                        type="button"
                        onClick={handleDownloadCSV}
                        className="px-3 py-1.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        Download CSV
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadExcel}
                        className="px-3 py-1.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        Download Excel (.xls)
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintReport}
                        className="px-3 py-1.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5 text-purple-400" />
                        Print / PDF Report
                      </button>
                    </div>
                  )}

                  {/* Filters Collapsible Panel */}
                  {isFiltersExpanded && (
                    <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 animate-in fade-in duration-200">
                      {/* Search Query */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search lead, customer, phone..."
                          value={filterQuery}
                          onChange={(e) => setFilterQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>

                      {/* Lead Source Filter */}
                      <div>
                        <select
                          value={filterSource}
                          onChange={(e) => setFilterSource(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                        >
                          <option value="">All Lead Sources</option>
                          <option value="Instagram">Instagram</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Google / Website">Google / Website</option>
                          <option value="Referral">Referral</option>
                          <option value="Direct Walk-in">Direct Walk-in</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Lead Status Filter */}
                      <div>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                        >
                          <option value="">All Sales Statuses</option>
                          <option value="Create Quote">Create Quote (New Lead)</option>
                          <option value="Quote Sent">Quote Sent</option>
                          <option value="Quote Follow-up">Quote Follow-up</option>
                          <option value="Confirm Order">Confirm Order</option>
                          <option value="Lead Lost">Lead Lost</option>
                        </select>
                      </div>

                      {/* Date Range Start */}
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={dateRangeStart || appliedStartDate}
                          onChange={(e) => {
                            setDateRangeStart(e.target.value);
                            setAppliedStartDate(e.target.value);
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                          title="Start Date"
                        />
                        <span className="text-zinc-500 text-xs">-</span>
                        <input
                          type="date"
                          value={dateRangeEnd || appliedEndDate}
                          onChange={(e) => {
                            setDateRangeEnd(e.target.value);
                            setAppliedEndDate(e.target.value);
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                          title="End Date"
                        />
                      </div>

                      {/* Reset Filters */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterQuery('');
                            setFilterSource('');
                            setFilterStatus('');
                            setDateRangeStart('');
                            setDateRangeEnd('');
                            setAppliedStartDate('');
                            setAppliedEndDate('');
                          }}
                          className="w-full py-1.5 px-3 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-750 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3 text-zinc-400" />
                          <span>Clear Filters</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Datagrid Table of Leads */}
                <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto w-full max-w-full">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-950/80 border-b border-zinc-800/80 text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-3.5 font-bold">Lead / Date</th>
                          <th className="py-3 px-3.5 font-bold">Customer Info</th>
                          <th className="py-3 px-3.5 font-bold">Event Details</th>
                          <th className="py-3 px-3.5 font-bold">Package & Budget</th>
                          <th className="py-3 px-3.5 font-bold text-center">Status</th>
                          <th className="py-3 px-3.5 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850/60">
                        {filteredLeads.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-zinc-500">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <span className="text-3xl">📭</span>
                                <p className="font-bold text-sm text-zinc-400">No leads found</p>
                                <p className="text-xs text-zinc-600">Try adjusting your filters or search terms</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredLeads.map((lead) => {
                            const curStatus = getLeadCurrentStatus(lead);
                            const activeEvents = lead.events && lead.events.length > 0
                              ? lead.events
                              : [{
                                  id: lead.lead_id,
                                  event_name: lead.event_type || 'Event',
                                  event_type: lead.event_type,
                                  event_date: lead.event_date,
                                  event_time: lead.event_time,
                                  event_location: lead.event_location
                                }];

                            return (
                              <tr 
                                key={lead.lead_id} 
                                className="hover:bg-zinc-850/30 transition-colors group cursor-pointer"
                                onClick={() => handleSelectLead(lead)}
                              >
                                {/* Lead ID & Created Date */}
                                <td className="py-3 px-3.5 align-top">
                                  <div className="font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                                    <span>{lead.lead_id}</span>
                                  </div>
                                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                    {lead.created_date ? formatDateDDMMYY(lead.created_date) : 'N/A'}
                                  </div>
                                </td>

                                {/* Customer Info */}
                                <td className="py-3 px-3.5 align-top">
                                  <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                                    <span>{lead.customer_name}</span>
                                  </div>
                                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-zinc-500 shrink-0" />
                                    <span>{formatIndianPhoneNumber(lead.mobile)}</span>
                                  </div>
                                  {lead.email && (
                                    <div className="text-[10px] text-zinc-500 truncate max-w-[180px] mt-0.5">
                                      {lead.email}
                                    </div>
                                  )}
                                  {lead.lead_source && (
                                    <div className="mt-1">
                                      <span className="inline-block px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                                        {lead.lead_source === 'Other' && lead.Specify_Custom_Lead_Source_Name
                                          ? `Other: ${lead.Specify_Custom_Lead_Source_Name}`
                                          : lead.lead_source}
                                      </span>
                                    </div>
                                  )}
                                </td>

                                {/* Event Details */}
                                <td className="py-3 px-3.5 align-top max-w-[280px]" onClick={(e) => e.stopPropagation()}>
                                  <UnifiedEventDropdownCell events={activeEvents} isSales={true} />
                                </td>

                                {/* Package & Budget */}
                                <td className="py-3 px-3.5 align-top">
                                  <div className="font-mono font-bold text-emerald-400">
                                    {lead.final_quoted_amount || lead.budget ? formatINR(lead.final_quoted_amount || lead.budget) : '₹0'}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 truncate max-w-[140px] mt-0.5">
                                    {lead.Select_Package_Option || 'No Package'}
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="py-3 px-3.5 align-top text-center" onClick={(e) => e.stopPropagation()}>
                                  <StatusText status={curStatus} />
                                  {lead.next_follow_up_date && (
                                    <div className="text-[9px] font-mono text-amber-400/80 mt-1 flex items-center justify-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" />
                                      <span>{formatDateDDMMYY(lead.next_follow_up_date)}</span>
                                    </div>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-3.5 align-top text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNoteModalLeadId(lead.lead_id);
                                        setNoteModalOrderId('');
                                        setNoteModalCustomerName(lead.customer_name);
                                        setNoteModalOpen(true);
                                      }}
                                      className="p-1.5 bg-blue-950/40 hover:bg-blue-900/60 text-blue-400 hover:text-white rounded-lg border border-blue-900/40 transition-all cursor-pointer shadow"
                                      title="Add Note"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectLead(lead)}
                                      className="px-2.5 py-1 text-[11px] font-bold bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-400 hover:text-white rounded-lg border border-cyan-800/60 transition-all cursor-pointer shadow flex items-center gap-1"
                                    >
                                      <span>Manage</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Global Modals & Dialogs */}
      {/* 1. Add Note Modal */}
      <AddNoteModal
        isOpen={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false);
          setNoteModalLeadId('');
          setNoteModalOrderId('');
          setNoteModalCustomerName('');
        }}
        leadId={noteModalLeadId}
        orderId={noteModalOrderId}
        customerName={noteModalCustomerName}
      />

      {/* 2. Lost Lead Modal */}
      {showLostModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-white font-mono uppercase">Mark Lead as Lost</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLostModal(false)}
                className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Lost Reason *</label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="Budget Constraint">Budget Constraint</option>
                  <option value="Competitor Chosen">Competitor Chosen</option>
                  <option value="Event Postponed / Cancelled">Event Postponed / Cancelled</option>
                  <option value="Non-responsive / Ghosted">Non-responsive / Ghosted</option>
                  <option value="Requirements Mismatch">Requirements Mismatch</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              {lostReason === 'Other' && (
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">Specify Other Reason *</label>
                  <input
                    type="text"
                    value={otherLostReason}
                    onChange={(e) => setOtherLostReason(e.target.value)}
                    placeholder="Enter custom lost reason"
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Lost Notes / Context *</label>
                <textarea
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  placeholder="Describe why this opportunity was closed..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => setShowLostModal(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-900 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLostLead}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Updating...' : 'Confirm Lost Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Unlock Request Modal */}
      {showUnlockRequestModal && selectedUnlockLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSubmitUnlockRequest} className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🔓</span>
                <h3 className="text-sm font-bold text-white font-mono uppercase">Request Unlock from Owner</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUnlockRequestModal(false)}
                className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Reason for Unlock *</label>
                <select
                  value={unlockRequestReason}
                  onChange={(e) => setUnlockRequestReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="Customer requested date/time change">Customer requested date/time change</option>
                  <option value="Customer upgraded package deliverables">Customer upgraded package deliverables</option>
                  <option value="Discount renegotiation">Discount renegotiation</option>
                  <option value="Correction of client contact details">Correction of client contact details</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              {unlockRequestReason === 'Other' && (
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">Custom Reason *</label>
                  <input
                    type="text"
                    value={unlockRequestCustomReason}
                    onChange={(e) => setUnlockRequestCustomReason(e.target.value)}
                    placeholder="Enter custom unlock reason"
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => setShowUnlockRequestModal(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-200 bg-zinc-900 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Delete Package Confirmation Modal */}
      {deletingPackageId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <Trash2 className="w-4 h-4" />
              <span>Delete Package Confirmation</span>
            </div>
            <p className="text-xs text-zinc-400">Are you sure you want to permanently delete this package? This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPackageId(null)}
                className="px-3.5 py-1.5 text-xs font-bold bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!deletingPackageId) return;
                  await deletePackage(deletingPackageId);
                  setDeletingPackageId(null);
                }}
                className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesModule;
"""
    with open('src/components/SalesModule.tsx', 'w') as f:
        f.write(prefix + tail)
    print("File written cleanly!")
else:
    print("Marker not found!")
