import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, Plus, Edit, CheckSquare, Search, Filter, Ban, X, Phone, Mail, MapPin, Calendar, DollarSign, Clock, Users, ArrowRight, ChevronDown, ChevronUp, Check, Package, Trash, Trash2, Eye, Loader2, CheckCircle2, RefreshCw
} from 'lucide-react';
import { Lead, CurrentStage, LeadPackage, EVENT_TYPES, PACKAGE_CATEGORIES, ACTIVE_STAGE_GROUPS, LeadEvent } from '../../types';
import { StatusText } from '../ui/StatusText';
import { EventDropdownCell } from '../EventDropdownCell';
import { UnifiedEventDropdownCell } from '../UnifiedEventDropdownCell';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { CameraLensStatsCard, CameraLensTheme } from '../CameraLensStatsCard';
import { ListSortFilter, SortOrder } from '../ui/ListSortFilter';
import { formatINR, formatIndianPhoneNumber, validateIndianMobile, formatTime12Hour, getCustomers, triggerAutoScrollAndFocus, normalizeCategory, parseTeamMembers, formatQtyItem, formatQtyArray, formatQtyList, formatDateDDMMYY } from '../../utils';
import { SalesCalendar } from '../SalesCalendar';
import { CustomPackageMaster } from '../CustomPackageMaster';
import { AddressAutocomplete } from '../AddressAutocomplete';
import { jsPDF } from 'jspdf';
import { SHOOT_TYPES, LocalEditableInput, parseQtyAndText, combineQtyAndText, formatListToStructuredObjects, buildStep3EventPayloads, parseTeamMembersJsonToRecord, parseDeliverablesJsonToRecord, CompactQtyItemRowProps, CompactQtyItemRow, validateAndFormatTime, getLogoBase64FromUrl, generateQuotationPdfFileName, generateQuotationPDF, highlightText, LEAD_SOURCES, SalesModuleProps } from '../SalesUtils';
import { AddNoteModal } from '../AddNoteModal';


export interface SalesBookingConfirmationModalProps {
  showConfirmModal: boolean;
  selectedLead: Lead | null;
  confirmBookingModalRef: React.RefObject<HTMLDivElement>;
  confirmForm: any;
  setConfirmForm: React.Dispatch<React.SetStateAction<any>>;
  packages: any[];
  isCustomerInfoExpanded: boolean;
  setIsCustomerInfoExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  eventsReporting: Record<string, { reporting_date: string; reporting_time: string }>;
  setEventsReporting: React.Dispatch<React.SetStateAction<Record<string, { reporting_date: string; reporting_time: string }>>>;
  formatDDMMYYYY: (d: any) => string;
  convertTo12Hour: (t: any) => string;
  isConfirmingBooking: boolean;
  handleConfirmOrder: (e: React.FormEvent) => Promise<void>;
  setShowConfirmModal: React.Dispatch<React.SetStateAction<boolean>>;
  orders: any[];
  wizardLeadData: any;
}

export const SalesBookingConfirmationModal: React.FC<SalesBookingConfirmationModalProps> = (props) => {
  const {
    showConfirmModal,
    selectedLead,
    confirmBookingModalRef,
    confirmForm,
    setConfirmForm,
    packages,
    isCustomerInfoExpanded,
    setIsCustomerInfoExpanded,
    eventsReporting,
    setEventsReporting,
    formatDDMMYYYY,
    convertTo12Hour,
    isConfirmingBooking,
    handleConfirmOrder,
    setShowConfirmModal,
    orders,
    wizardLeadData
  } = props;

  if (!showConfirmModal || !selectedLead) return null;

  return (
    <>
      {showConfirmModal && selectedLead && (
        <div 
          className="fixed inset-0 bg-black/85 z-[95] flex items-center justify-center p-2.5 sm:p-4 md:p-6 backdrop-blur-md overflow-hidden transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm_booking_modal_title"
        >
          <div 
            ref={confirmBookingModalRef}
            id="confirm_booking_modal" 
            className="bg-slate-850 border border-slate-750 rounded-2xl overflow-hidden max-w-lg md:max-w-xl w-full shadow-2xl flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150 relative"
          >
            {/* Header - Fixed at Top */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-5 py-3 sm:py-3.5 shrink-0 bg-slate-850">
              <h4 id="confirm_booking_modal_title" className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2 font-sans min-w-0">
                <span className="text-base sm:text-lg shrink-0">💍</span>
                <span className="truncate">Booking Confirmation & Contract Form</span>
              </h4>
              <button 
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
                title="Close"
                aria-label="Close Booking Confirmation Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ONE SINGLE SCROLLABLE CONTAINER FOR THE ENTIRE POPUP CONTENT */}
            <div className="overflow-y-auto overflow-x-hidden px-3.5 sm:px-5 md:px-6 py-4 custom-scrollbar flex-1">
              <form onSubmit={handleConfirmOrderSubmit} className="space-y-4 text-xs">
                
                {/* Collapsible Customer Information Card - Expands naturally with NO inner scrollbar */}
                {(() => {
                  const combinedType = (selectedLead.events && selectedLead.events.length > 0)
                    ? selectedLead.events
                        .map(ev => ev.event_name || ev.event_type)
                        .filter(Boolean)
                        .join(', ') || selectedLead.event_type || 'Event'
                    : (selectedLead.event_type === 'Other'
                        ? (selectedLead.custom_event_name || selectedLead.custom_event_type || 'Other')
                        : (selectedLead.event_type || 'Event'));

                  return (
                    <div className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setIsCustomerInfoExpanded(!isCustomerInfoExpanded)}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer select-none"
                      >
                        <span className="flex items-center gap-1.5 text-slate-200 font-medium truncate">
                          Customer Information
                        </span>
                        <span className="flex items-center gap-1 text-slate-400 text-[11px] font-medium shrink-0">
                          <span>{isCustomerInfoExpanded ? 'Hide' : 'Show'}</span>
                          {isCustomerInfoExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </span>
                      </button>

                      {isCustomerInfoExpanded && (
                        <div className="px-3.5 pb-3.5 pt-1.5 border-t border-slate-800/60 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-slate-300">
                            <div className="min-w-0">
                              <span className="text-slate-400 font-medium text-[11px] block">Client Name</span>
                              <strong className="text-slate-100 font-semibold text-xs break-words">{selectedLead.customer_name || 'N/A'}</strong>
                            </div>
                            <div className="min-w-0">
                              <span className="text-slate-400 font-medium text-[11px] block">Mobile Number</span>
                              <strong className="text-slate-100 font-mono font-semibold text-xs break-all">{selectedLead.mobile || 'N/A'}</strong>
                            </div>
                            <div className="sm:col-span-2 min-w-0">
                              <span className="text-slate-400 font-medium text-[11px] block">Address</span>
                              <strong className="text-slate-100 font-semibold text-xs break-words">{selectedLead.event_location || 'N/A'}</strong>
                            </div>
                            <div className="sm:col-span-2 pt-1 border-t border-slate-800/60 min-w-0">
                              <span className="text-slate-400 font-medium text-[11px] block">Type</span>
                              <strong className="text-amber-400 font-semibold text-xs break-words">{combinedType}</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Product package name - Read-Only */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Product Package Name *
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={confirmForm.package_name || packages?.find((p) => String(p.package_id) === String(selectedLead.Select_Package_Option))?.package_name || selectedLead.Select_Package_Option || 'Custom Selected Package'}
                    className="w-full h-9 bg-slate-900/80 border border-slate-750 rounded-lg px-3 text-slate-200 text-xs font-medium focus:outline-none opacity-85 cursor-not-allowed select-none shadow-inner"
                  />
                </div>

                {/* Event Date & Reporting Details Section */}
                <div>
                  <label className="block text-xs font-semibold text-amber-400 mb-1.5 flex items-center justify-between flex-wrap gap-1">
                    <span>📅 Events & Reporting Details *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Set reporting time for crew</span>
                  </label>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-3.5 space-y-3">
                    {selectedLead?.events && selectedLead.events.length > 0 ? (
                      selectedLead.events.map((ev, i) => {
                        const key = ev.id || `ev_${i}`;
                        const repData = eventsReporting[key] || {
                          reporting_date: ev.reporting_date || (ev as any).Reporting_date || ev.event_date || ev.event_start_date || selectedLead.Reporting_date || (selectedLead as any).reporting_date || selectedLead.event_date || '',
                          reporting_time: ev.reporting_time || selectedLead.reporting_time || ''
                        };

                        const startDateStr = formatDDMMYYYY(ev.event_start_date || ev.event_date);
                        const startTimeStr = ev.event_start_time ? convertTo12Hour(ev.event_start_time) : (selectedLead.event_time ? convertTo12Hour(selectedLead.event_time) : 'TBD');
                        const endTimeStr = ev.event_end_time ? convertTo12Hour(ev.event_end_time) : '';
                        const eventTimeDisplay = endTimeStr ? `${startTimeStr} – ${endTimeStr}` : startTimeStr;

                        return (
                          <div key={key} className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                              <span className="text-xs font-bold text-amber-400 font-sans tracking-wide">
                                {selectedLead.events.length > 1 ? `EVENT ${i + 1}` : 'EVENT DETAILS'}
                              </span>
                              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 truncate max-w-[150px]">
                                {ev.event_shoot_type || selectedLead.shoot_type || 'Shoot'}
                              </span>
                            </div>

                            {/* Event Name, Date, Time info */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-md border border-slate-800/60 text-[11px]">
                              <div className="min-w-0">
                                <span className="text-slate-400 block text-[10px] uppercase font-mono">Event Name</span>
                                <span className="text-slate-200 font-semibold break-words">{ev.event_name || ev.event_type || 'Event'}</span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-slate-400 block text-[10px] uppercase font-mono">Event Date</span>
                                <span className="text-slate-200 font-semibold font-mono">{startDateStr}</span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-slate-400 block text-[10px] uppercase font-mono">Event Time</span>
                                <span className="text-slate-200 font-semibold font-mono">{eventTimeDisplay}</span>
                              </div>
                            </div>

                            {/* Reporting Date & Reporting Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                              <div>
                                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                                  Reporting Date *
                                </label>
                                <input
                                  type="date"
                                  required
                                  value={repData.reporting_date || ''}
                                  onChange={(e) => {
                                    setEventsReporting(prev => ({
                                      ...prev,
                                      [key]: {
                                        ...(prev[key] || { reporting_time: '' }),
                                        reporting_date: e.target.value
                                      }
                                    }));
                                  }}
                                  className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                                  Reporting Time *
                                </label>
                                <input
                                  type="time"
                                  required
                                  value={repData.reporting_time || ''}
                                  onChange={(e) => {
                                    setEventsReporting(prev => ({
                                      ...prev,
                                      [key]: {
                                        ...(prev[key] || { reporting_date: '' }),
                                        reporting_time: e.target.value
                                      }
                                    }));
                                  }}
                                  className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-xs font-bold text-amber-400 font-sans tracking-wide">
                            EVENT DETAILS
                          </span>
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 truncate max-w-[150px]">
                            {selectedLead.shoot_type || 'Shoot'}
                          </span>
                        </div>

                        {/* Single Event Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-md border border-slate-800/60 text-[11px]">
                          <div className="min-w-0">
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Event Name</span>
                            <span className="text-slate-200 font-semibold break-words">{selectedLead.event_type === 'Other' ? (selectedLead.custom_event_name || selectedLead.custom_event_type || 'Other') : (selectedLead.event_type || 'General Event')}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Event Date</span>
                            <span className="text-slate-200 font-semibold font-mono">{formatDDMMYYYY(selectedLead.event_date)}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">Event Time</span>
                            <span className="text-slate-200 font-semibold font-mono">{selectedLead.event_time ? convertTo12Hour(selectedLead.event_time) : 'TBD'}</span>
                          </div>
                        </div>

                        {/* Reporting Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                          <div>
                            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                              Reporting Date *
                            </label>
                            <input
                              type="date"
                              required
                              value={eventsReporting['default']?.reporting_date || selectedLead.Reporting_date || (selectedLead as any).reporting_date || selectedLead.event_date || ''}
                              onChange={(e) => {
                                setEventsReporting(prev => ({
                                  ...prev,
                                  default: {
                                    ...(prev['default'] || { reporting_time: '' }),
                                    reporting_date: e.target.value
                                  }
                                }));
                              }}
                              className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                              Reporting Time *
                            </label>
                            <input
                              type="time"
                              required
                              value={eventsReporting['default']?.reporting_time || selectedLead.reporting_time || ''}
                              onChange={(e) => {
                                setEventsReporting(prev => ({
                                  ...prev,
                                  default: {
                                    ...(prev['default'] || { reporting_date: '' }),
                                    reporting_time: e.target.value
                                  }
                                }));
                              }}
                              className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <input type="hidden" value={confirmForm.event_date || ''} />
                </div>

                {/* Package cost and advance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Final Package Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      readOnly
                      value={confirmForm.quotation_amount || Number(selectedLead?.Final_Quotation_Amount) || Number((selectedLead as any)?.final_quotation_amount) || Number(selectedLead?.Final_Package_Amount) || Number((selectedLead as any)?.final_package_amount) || Number((selectedLead as any)?.final_amount) || (Number(wizardLeadData.final_amount) > 0 ? Number(wizardLeadData.final_amount) : 0)}
                      className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-3 text-slate-100 text-xs focus:outline-none font-mono opacity-80 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Advance Collected (₹)
                    </label>
                    <input
                      type="number"
                      value={confirmForm.advance_received}
                      onChange={(e) => setConfirmForm({ ...confirmForm, advance_received: Number(e.target.value) })}
                      className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-3 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Payment Mode & Payment Tracking ID in a responsive 2-column layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Payment Mode
                    </label>
                    <select
                      value={confirmForm.payment_mode}
                      onChange={(e) => setConfirmForm({ ...confirmForm, payment_mode: e.target.value })}
                      className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-3 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="UPI">UPI (GPay/PhonePe)</option>
                      <option value="Cash">Cash Handover</option>
                      <option value="Bank Transfer">Bank NFT/RTGS/IMPS</option>
                      <option value="Card">Credit/Debit Card</option>
                      <option value="Cheque">Cheque Deposit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Payment Tracking / Ref Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TXN12345678"
                      value={confirmForm.transaction_id || ''}
                      onChange={(e) => setConfirmForm({ ...confirmForm, transaction_id: e.target.value })}
                      className="w-full h-9 bg-slate-900 border border-slate-750 rounded-lg px-3 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Balance due readout */}
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-300">Remaining Balance Due:</span>
                  <strong className="text-emerald-400 font-mono font-bold text-sm sm:text-base">
                    {formatINR(Math.max(0, confirmForm.quotation_amount - confirmForm.advance_received))}
                  </strong>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2.5 border-t border-slate-800 pt-3.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl cursor-pointer text-xs font-medium transition-colors text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn_confirm_submit"
                    disabled={isSaving}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/20 text-xs transition-all text-center"
                  >
                    <span>{isSaving ? 'Processing...' : 'Approve & Book Contract'}</span>
                    {!isSaving && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </>
  );
};
