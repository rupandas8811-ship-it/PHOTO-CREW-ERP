import React, { useState, useEffect, useRef } from 'react';
import { AddNoteModal } from "./AddNoteModal";
import { createPortal } from 'react-dom';
import { useRole, mapUserFieldsFromDb, INITIAL_PACKAGES, getStatusRank, isFollowUpDateTimeReached } from './RoleContext';
import { supabaseClient } from '../supabaseClient';
import {
  FileText, Plus, Edit, CheckSquare, Search, Filter, Ban, X, Phone, Mail, MapPin, Calendar, DollarSign, Clock, Users, ArrowRight, ChevronDown, ChevronUp, Check, Package, Trash, Trash2, Eye, Loader2, CheckCircle2, RefreshCw, AlertCircle, Activity, PhoneCall, LayoutDashboard, UserPlus, TrendingUp, Flame, CheckCircle, Download, FileSpreadsheet, Printer, MoreVertical, Unlock, XCircle, FileImage, Edit3, User, Info, ChevronRight, MessageSquare, History
} from "lucide-react";
import { Lead, CurrentStage, LeadPackage, EVENT_TYPES, PACKAGE_CATEGORIES, ACTIVE_STAGE_GROUPS, LeadEvent } from '../types';
import { StatusText } from './ui/StatusText';
import { EventDropdownCell } from './EventDropdownCell';
import { UnifiedEventDropdownCell } from './UnifiedEventDropdownCell';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { CameraLensStatsCard, CameraLensTheme } from './CameraLensStatsCard';
import { ListSortFilter, SortOrder } from './ui/ListSortFilter';

export interface QuotationService { id: string; name: string; qty: number; price: number; }
export const SHOOT_TYPES = [
  "CANDID PHOTOGRAPHY",
  "CINEMATOGRAPHY",
  "TRADITIONAL PHOTOGRAPHY",
  "TRADITIONAL VIDEOGRAPHY",
  "DRONEGRAPHY",
  "LIVE STREAMING",
  "SEMI CANDID PHOTOGRAPHY",
  "SEMI CANDID VIDEOGRAPHY",
  "STANDARD PHOTOGRAPHY",
  "STANDARD VIDEOGRAPHY"
];
import { formatINR, formatIndianPhoneNumber, validateIndianMobile, formatTime12Hour, getCustomers, triggerAutoScrollAndFocus, normalizeCategory, parseTeamMembers, formatQtyItem, formatQtyArray, formatQtyList, formatDateDDMMYY } from '../utils';
import { SalesCalendar } from './SalesCalendar';
import { CustomPackageMaster } from './CustomPackageMaster';
import { AddressAutocomplete } from './AddressAutocomplete';
import { jsPDF } from 'jspdf';

interface LocalEditableInputProps {
  value: string;
  disabled?: boolean;
  onChange: (val: string) => void;
  className?: string;
  list?: string;
  placeholder?: string;
  options?: string[];
}

const LocalEditableInput: React.FC<LocalEditableInputProps> = ({ value, disabled, onChange, className, list, placeholder, options }) => {
  const [localVal, setLocalVal] = React.useState(value);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const latestValueRef = React.useRef(value);
  const autoListId = React.useId();

  React.useEffect(() => {
    latestValueRef.current = value;
    setLocalVal(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      if (newVal !== latestValueRef.current) {
        onChange(newVal);
      }
    }, 600);
  };

  const handleBlur = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (localVal !== value) {
      onChange(localVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (localVal !== value) {
        onChange(localVal);
      }
      e.currentTarget.blur();
    }
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const datalistId = list || (options && options.length > 0 ? `datalist-${autoListId}` : undefined);

  return (
    <div className="flex-1 flex items-center gap-2">
      <input
        type="text"
        value={localVal}
        disabled={disabled}
        list={datalistId}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={className}
      />
      {options && options.length > 0 && !list && (
        <datalist id={datalistId}>
          {options.map((opt, idx) => (
            <option key={idx} value={opt} />
          ))}
        </datalist>
      )}
    </div>
  );
};

function parseQtyAndText(raw: any): { qty: number; text: string } {
  if (raw === null || raw === undefined) return { qty: 1, text: "" };

  let qty = 1;
  let text = "";

  if (typeof raw === "object") {
    const q = Number(raw.qty || raw.quantity || raw.count || 1);
    qty = isNaN(q) || q < 1 ? 1 : q;
    text = String(raw.name || raw.text || raw.deliverable || raw.title || raw.role || raw.member_name || "").trim();
    return { qty, text };
  } else {
    text = String(raw).trim();
  }

  if (!text) return { qty: 1, text: "" };

  // 1. Check for explicit (Qty: X), (quantity: X), (count: X), (Qty X) anywhere in the string
  let foundQtyFromPattern: number | null = null;
  const qtyPatterns = /\s*[\(\[-]?\s*(?:qty|quantity|count)\s*[:=]?\s*(\d+)\s*[\)\]\-]?/gi;
  let match;
  while ((match = qtyPatterns.exec(text)) !== null) {
    if (match[1]) {
      const parsedQty = parseInt(match[1], 10);
      if (!isNaN(parsedQty) && parsedQty >= 1) {
        if (foundQtyFromPattern === null) {
          foundQtyFromPattern = parsedQty;
        }
      }
    }
  }

  if (foundQtyFromPattern !== null) {
    text = text.replace(/\s*[\(\[-]?\s*(?:qty|quantity|count)\s*[:=]?\s*\d+\s*[\)\]\-]?/gi, "").trim();
    return { qty: foundQtyFromPattern, text };
  }

  // 2. Check for dimension / size specifications at the start of the string:
  // e.g. "16×6", "16x6", "12×8 Album", "16×6 Frame", "16 × 6", "12 x 18", "8x24", "8*12", "12×36"
  // If the string starts with a dimension (digits x/× digits), it is deliverable text, NOT a leading quantity!
  const isLeadingDimension = /^\d+\s*[\*xX×]\s*\d+/.test(text);
  if (isLeadingDimension) {
    return { qty: 1, text };
  }

  // 3. Check for technical specifications / units starting with numbers:
  // e.g. "4K Cinematic Video", "8K Video", "20 Pages × 2", "400 Edited Candid Photos", "50 Photos", "3 Hours", "10 Sheets"
  const isUnitOrSpec = /^\d+\s*(?:[kK]\b|min\b|mins\b|minute|minutes|sec\b|secs\b|second|seconds|hr\b|hrs\b|hour|hours|page|pages|sheet|sheets|photo|photos|image|images|pic|pics|picture|pictures|gb\b|mb\b|tb\b|day\b|days\b|edited\b)/i.test(text);
  if (isUnitOrSpec) {
    return { qty: 1, text };
  }

  // 4. Check for leading quantity with explicit multiplier:
  // e.g. "2 x Traditional Photos", "2 × Cinematic Video", "2 * Album", "2 x 16×6 Frame", "2 × 16×6"
  const multiplierMatch = text.match(/^(\d+)\s*[xX×\*]\s+(.+)$/);
  if (multiplierMatch) {
    const parsedQty = parseInt(multiplierMatch[1], 10);
    if (!isNaN(parsedQty) && parsedQty >= 1) {
      return { qty: parsedQty, text: multiplierMatch[2].trim() };
    }
  }

  // 5. Check for leading quantity followed by dimension:
  // e.g. "2 16×6", "3 12×8 Album", "2 16×6 Frame"
  const qtyDimensionMatch = text.match(/^(\d+)\s+(\d+\s*[\*xX×]\s*\d+.*)$/);
  if (qtyDimensionMatch) {
    const parsedQty = parseInt(qtyDimensionMatch[1], 10);
    if (!isNaN(parsedQty) && parsedQty >= 1) {
      return { qty: parsedQty, text: qtyDimensionMatch[2].trim() };
    }
  }

  // 6. Check for leading quantity with space followed by item name:
  // e.g. "2 Lead Photographer", "1 Drone Operator", "2 Albums", "2 Frames (12×18)"
  const wordMatch = text.match(/^(\d+)\s+([a-zA-Z\(\[\{].+)$/);
  if (wordMatch) {
    const parsedQty = parseInt(wordMatch[1], 10);
    if (!isNaN(parsedQty) && parsedQty >= 1) {
      return { qty: parsedQty, text: wordMatch[2].trim() };
    }
  }

  return { qty: 1, text };
}

function combineQtyAndText(qty: number | string, text: string): string {
  const qNum = parseInt(String(qty), 10);
  const validQty = !isNaN(qNum) && qNum >= 1 ? qNum : 1;
  const cleanText = (text || "").trim();
  if (!cleanText) return validQty > 1 ? `${validQty}` : "";
  if (validQty <= 1) {
    return cleanText;
  }
  return `${validQty} ${cleanText}`.trim();
}

export function formatListToStructuredObjects(list: any[]): { name: string; qty: number }[] {
  if (!Array.isArray(list)) return [];
  const result: { name: string; qty: number }[] = [];
  list.forEach(item => {
    if (!item) return;
    if (typeof item === 'object') {
      const rawName = String(item.name || item.role || item.member_name || item.text || item.deliverable || item.title || '').trim();
      const parsed = parseQtyAndText(rawName);
      const q = Number(item.qty || item.quantity || item.count || parsed.qty || 1);
      const qty = isNaN(q) || q < 1 ? 1 : q;
      if (parsed.text) {
        result.push({ name: parsed.text, qty });
      }
    } else if (typeof item === 'string') {
      const trimmed = item.trim();
      if (!trimmed) return;
      const parsed = parseQtyAndText(trimmed);
      if (parsed.text) {
        result.push({ name: parsed.text, qty: parsed.qty });
      }
    }
  });
  return result;
}

export function buildStep3EventPayloads(
  pkgId: string,
  currentEvents: any[],
  editableInclusions: Record<string, any[]>,
  editableDeliverables: Record<string, any[]>
) {
  const effectivePkgId = pkgId || 'Custom Package';
  const hasEvents = currentEvents && currentEvents.length > 0;
  const isMultiEvent = hasEvents && currentEvents.length > 1;
  const eventsList = hasEvents ? currentEvents : [null];

  const teamMembersJson = eventsList.map((event, idx) => {
    const evId = event?.id || event?.event_id || `event_${idx + 1}`;
    const evName = event?.event_name || event?.event_type || 'Unnamed Event';

    const keysToTry = isMultiEvent
      ? [
          `${effectivePkgId}_${evId}`,
          `${effectivePkgId}_${evName}`,
          `Custom Package_${evId}`,
          `Custom Package_${evName}`,
          `custom_package_${evId}`,
          `custom_package_${evName}`
        ]
      : [
          `${effectivePkgId}_${evId}`,
          `${effectivePkgId}_${evName}`,
          `Custom Package_${evId}`,
          `Custom Package_${evName}`,
          `custom_package_${evId}`,
          `custom_package_${evName}`,
          effectivePkgId,
          'Custom Package',
          'custom_package'
        ];

    let list: any[] = [];
    for (const k of keysToTry) {
      if (editableInclusions[k] !== undefined && Array.isArray(editableInclusions[k]) && editableInclusions[k].length > 0) {
        list = editableInclusions[k];
        break;
      }
    }

    return {
      event_id: evId,
      event_name: evName,
      team_members: formatListToStructuredObjects(list)
    };
  });

  const deliverablesJson = eventsList.map((event, idx) => {
    const evId = event?.id || event?.event_id || `event_${idx + 1}`;
    const evName = event?.event_name || event?.event_type || 'Unnamed Event';

    const keysToTry = isMultiEvent
      ? [
          `${effectivePkgId}_${evId}`,
          `${effectivePkgId}_${evName}`,
          `Custom Package_${evId}`,
          `Custom Package_${evName}`,
          `custom_package_${evId}`,
          `custom_package_${evName}`
        ]
      : [
          `${effectivePkgId}_${evId}`,
          `${effectivePkgId}_${evName}`,
          `Custom Package_${evId}`,
          `Custom Package_${evName}`,
          `custom_package_${evId}`,
          `custom_package_${evName}`,
          effectivePkgId,
          'Custom Package',
          'custom_package'
        ];

    let list: any[] = [];
    for (const k of keysToTry) {
      if (editableDeliverables[k] !== undefined && Array.isArray(editableDeliverables[k]) && editableDeliverables[k].length > 0) {
        list = editableDeliverables[k];
        break;
      }
    }

    return {
      event_id: evId,
      event_name: evName,
      deliverables: formatListToStructuredObjects(list)
    };
  });

  let flatTeamMembers: { name: string; qty: number }[] = [];
  const eventTeamMembers = teamMembersJson.flatMap(e => e.team_members || []);
  if (eventTeamMembers.length > 0) {
    flatTeamMembers = eventTeamMembers;
  } else {
    const pkgList = editableInclusions[effectivePkgId] || editableInclusions['Custom Package'] || editableInclusions['custom_package'] || [];
    flatTeamMembers = formatListToStructuredObjects(pkgList);
  }

  let flatDeliverables: { name: string; qty: number }[] = [];
  const eventDeliverables = deliverablesJson.flatMap(e => e.deliverables || []);
  if (eventDeliverables.length > 0) {
    flatDeliverables = eventDeliverables;
  } else {
    const pkgList = editableDeliverables[effectivePkgId] || editableDeliverables['Custom Package'] || editableDeliverables['custom_package'] || [];
    flatDeliverables = formatListToStructuredObjects(pkgList);
  }

  return {
    teamMembersJson,
    deliverablesJson,
    flatTeamMembers,
    flatDeliverables,
    teamMembersText: teamMembersJson.length > 1 ? JSON.stringify(teamMembersJson) : JSON.stringify(flatTeamMembers),
    deliverablesText: deliverablesJson.length > 1 ? JSON.stringify(deliverablesJson) : JSON.stringify(flatDeliverables)
  };
}

export function parseTeamMembersJsonToRecord(
  rawTeamData: any,
  pkgId: string,
  eventsList: any[] = []
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!rawTeamData) return result;

  let parsed: any = rawTeamData;
  if (typeof rawTeamData === 'string') {
    try {
      parsed = JSON.parse(rawTeamData);
    } catch (e) {
      const list = rawTeamData.split(/[,\n]/).map((s: string) => {
        const { qty, text } = parseQtyAndText(s);
        return text ? combineQtyAndText(qty, text) : '';
      }).filter(Boolean);
      if (list.length > 0) {
        result[pkgId] = list;
        result['Custom Package'] = list;
        result['custom_package'] = list;
      }
      return result;
    }
  }

  if (Array.isArray(parsed)) {
    let generalList: string[] = [];
    parsed.forEach((item: any) => {
      if (typeof item === 'string') {
        const { qty, text } = parseQtyAndText(item);
        if (text) generalList.push(combineQtyAndText(qty, text));
      } else if (item && typeof item === 'object') {
        const isEventStructure = (item.event_name || item.event_type || item.event_id) && (Array.isArray(item.team_members) || Array.isArray(item.members));
        if (isEventStructure) {
          const evName = item.event_name || item.event_type;
          const evId = item.event_id;
          const membersList = Array.isArray(item.team_members) ? item.team_members : (Array.isArray(item.members) ? item.members : []);
          const members = membersList.map((m: any) => {
            const { qty, text } = parseQtyAndText(m);
            return text ? combineQtyAndText(qty, text) : '';
          }).filter(Boolean);

          if (evName === 'General' || !evName) {
            generalList = [...generalList, ...members];
          } else {
            if (members.length > 0) {
              result[`${pkgId}_${evName}`] = members;
              result[`Custom Package_${evName}`] = members;
              result[`custom_package_${evName}`] = members;
              if (evId) {
                result[`${pkgId}_${evId}`] = members;
                result[`Custom Package_${evId}`] = members;
                result[`custom_package_${evId}`] = members;
              }
              const matchedEv = (eventsList || []).find(e =>
                (e.id && String(e.id) === String(evId)) ||
                (e.event_name && e.event_name === evName) ||
                (e.event_type && e.event_type === evName)
              );
              if (matchedEv) {
                result[`${pkgId}_${matchedEv.id}`] = members;
                result[`Custom Package_${matchedEv.id}`] = members;
                result[`custom_package_${matchedEv.id}`] = members;
              }
            }
          }
        } else {
          const rawName = item.role || item.member_name || item.name || item.text || item.title || '';
          const { qty: parsedQty, text: parsedText } = parseQtyAndText(rawName);
          const q = Number(item.qty || item.quantity || item.count || parsedQty || 1);
          const itemQty = isNaN(q) || q < 1 ? 1 : q;
          if (parsedText) {
            generalList.push(combineQtyAndText(itemQty, parsedText));
          }
        }
      }
    });

    if (generalList.length > 0) {
      result[pkgId] = generalList;
      result['Custom Package'] = generalList;
      result['custom_package'] = generalList;
      if (eventsList && eventsList.length === 1) {
        const singleEv = eventsList[0];
        if (singleEv) {
          const evId = singleEv.id || singleEv.event_id;
          const evName = singleEv.event_name || singleEv.event_type;
          if (evId) {
            result[`${pkgId}_${evId}`] = generalList;
            result[`Custom Package_${evId}`] = generalList;
            result[`custom_package_${evId}`] = generalList;
          }
          if (evName) {
            result[`${pkgId}_${evName}`] = generalList;
            result[`Custom Package_${evName}`] = generalList;
            result[`custom_package_${evName}`] = generalList;
          }
        }
      }
    }
  } else if (parsed && typeof parsed === 'object') {
    Object.keys(parsed).forEach(k => {
      if (Array.isArray(parsed[k])) {
        result[k] = parsed[k].map((s: any) => {
          const { qty, text } = parseQtyAndText(s);
          return text ? combineQtyAndText(qty, text) : '';
        }).filter(Boolean);
      }
    });
  }

  return result;
}

export function parseDeliverablesJsonToRecord(
  rawDelData: any,
  pkgId: string,
  eventsList: any[] = []
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!rawDelData) return result;

  let parsed: any = rawDelData;
  if (typeof rawDelData === 'string') {
    try {
      parsed = JSON.parse(rawDelData);
    } catch (e) {
      const list = rawDelData.split(/[,\n]/).map((s: string) => {
        const { qty, text } = parseQtyAndText(s);
        return text ? combineQtyAndText(qty, text) : '';
      }).filter(Boolean);
      if (list.length > 0) {
        result[pkgId] = list;
        result['Custom Package'] = list;
        result['custom_package'] = list;
      }
      return result;
    }
  }

  if (Array.isArray(parsed)) {
    let generalList: string[] = [];
    parsed.forEach((item: any) => {
      if (typeof item === 'string') {
        const { qty, text } = parseQtyAndText(item);
        if (text) generalList.push(combineQtyAndText(qty, text));
      } else if (item && typeof item === 'object') {
        const isEventStructure = (item.event_name || item.event_type || item.event_id) && (Array.isArray(item.deliverables) || Array.isArray(item.deliverables_list));
        if (isEventStructure) {
          const evName = item.event_name || item.event_type;
          const evId = item.event_id;
          let deliverables: string[] = [];
          if (Array.isArray(item.deliverables)) {
            deliverables = item.deliverables.map((d: any) => {
              const { qty, text } = parseQtyAndText(d);
              return text ? combineQtyAndText(qty, text) : '';
            }).filter(Boolean);
          } else if (Array.isArray(item.deliverables_list)) {
            deliverables = item.deliverables_list.map((d: any) => {
              const { qty, text } = parseQtyAndText(d);
              return text ? combineQtyAndText(qty, text) : '';
            }).filter(Boolean);
          }

          if (evName === 'General' || !evName || evName === 'Unnamed Event') {
            generalList = [...generalList, ...deliverables];
          } else {
            if (deliverables.length > 0) {
              result[`${pkgId}_${evName}`] = deliverables;
              result[`Custom Package_${evName}`] = deliverables;
              result[`custom_package_${evName}`] = deliverables;
              if (evId) {
                result[`${pkgId}_${evId}`] = deliverables;
                result[`Custom Package_${evId}`] = deliverables;
                result[`custom_package_${evId}`] = deliverables;
              }
              const matchedEv = (eventsList || []).find(e =>
                (e.id && String(e.id) === String(evId)) ||
                (e.event_name && e.event_name === evName) ||
                (e.event_type && e.event_type === evName)
              );
              if (matchedEv) {
                result[`${pkgId}_${matchedEv.id}`] = deliverables;
                result[`Custom Package_${matchedEv.id}`] = deliverables;
                result[`custom_package_${matchedEv.id}`] = deliverables;
              }
            }
          }
        } else {
          const rawName = item.name || item.deliverable || item.title || item.text || '';
          const { qty: parsedQty, text: parsedText } = parseQtyAndText(rawName);
          const q = Number(item.qty || item.quantity || item.count || parsedQty || 1);
          const itemQty = isNaN(q) || q < 1 ? 1 : q;
          if (parsedText) {
            generalList.push(combineQtyAndText(itemQty, parsedText));
          }
        }
      }
    });

    if (generalList.length > 0) {
      result[pkgId] = generalList;
      result['Custom Package'] = generalList;
      result['custom_package'] = generalList;
      if (eventsList && eventsList.length === 1) {
        const singleEv = eventsList[0];
        if (singleEv) {
          const evId = singleEv.id || singleEv.event_id;
          const evName = singleEv.event_name || singleEv.event_type;
          if (evId) {
            result[`${pkgId}_${evId}`] = generalList;
            result[`Custom Package_${evId}`] = generalList;
            result[`custom_package_${evId}`] = generalList;
          }
          if (evName) {
            result[`${pkgId}_${evName}`] = generalList;
            result[`Custom Package_${evName}`] = generalList;
            result[`custom_package_${evName}`] = generalList;
          }
        }
      }
    }
  } else if (parsed && typeof parsed === 'object') {
    Object.keys(parsed).forEach(k => {
      if (Array.isArray(parsed[k])) {
        result[k] = parsed[k].map((s: any) => {
          const { qty, text } = parseQtyAndText(s);
          return text ? combineQtyAndText(qty, text) : '';
        }).filter(Boolean);
      }
    });
  }

  return result;
}

interface CompactQtyItemRowProps {
  value: string;
  options?: string[];
  placeholder: string;
  addLabel?: string;
  accentColor?: "indigo" | "emerald";
  disabled?: boolean;
  onChange: (newValue: string) => void;
  onAdd?: () => void;
  onDelete: () => void;
}

const CompactQtyItemRow: React.FC<CompactQtyItemRowProps> = ({
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
  onDelete,
}) => {
  const { qty, text } = React.useMemo(() => parseQtyAndText(value), [value]);

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const rawVal = e.target.value;
    const newQty = parseInt(rawVal, 10);
    const validQty = isNaN(newQty) || newQty < 1 ? 1 : newQty;
    onChange(combineQtyAndText(validQty, text));
  };

  const handleTextChange = (newText: string) => {
    if (disabled) return;
    onChange(combineQtyAndText(qty, newText));
  };

  return (
    <div className={`flex items-center gap-2 bg-slate-950/40 border border-slate-800/80 p-2 sm:p-2.5 rounded-lg transition-all ${disabled ? 'opacity-60 pointer-events-none' : 'hover:border-slate-700/80'}`}>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono hidden sm:inline">Qty</span>
        <input
          type="number"
          min="1"
          disabled={disabled}
          value={qty}
          onChange={handleQtyChange}
          className="w-12 sm:w-16 bg-slate-900 border border-slate-750 focus:border-indigo-500 focus:outline-none rounded-md py-1 px-1.5 text-xs font-mono font-bold text-center text-white shrink-0 disabled:opacity-50"
          placeholder="Qty"
          title="Quantity"
        />
      </div>

      <div className="flex-1 min-w-0">
        <LocalEditableInput
          value={text}
          options={options}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleTextChange}
          className="w-full bg-slate-900 border border-slate-750 focus:border-indigo-500 focus:outline-none rounded-md py-1 px-2.5 text-xs text-slate-100 font-medium disabled:opacity-50"
        />
      </div>

      <div className="shrink-0 flex items-center justify-center">
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className={`w-10 h-10 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 text-[16px] sm:text-[11px] text-rose-400 hover:text-rose-300 font-bold font-mono bg-rose-500/10 hover:bg-rose-500/20 rounded-md transition-all flex items-center justify-center gap-1 border border-rose-500/20 ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className="sm:hidden">🗑</span>
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>
  );
};
const validateAndFormatTime = (timeStr: any, fieldLabel: string): string | null => {
  if (timeStr === undefined || timeStr === null) return null;
  const str = String(timeStr).trim();
  if (str === '' || str === 'null' || str === 'undefined' || str === 'Invalid Date') {
    return null;
  }
  const normalized = str.replace(/\s+/g, ' ');
  const ampmMatch = normalized.toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  const hhmmMatch = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  
  if (!ampmMatch && !hhmmMatch) {
    throw new Error(`${fieldLabel} is invalid.`);
  }

  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const period = ampmMatch[3];

    if (hours < 1 || hours > 12 || parseInt(minutes, 10) < 0 || parseInt(minutes, 10) > 59) {
      throw new Error(`${fieldLabel} is invalid.`);
    }

    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    const hh = String(hours).padStart(2, '0');
    return `${hh}:${minutes}:00`;
  }

  if (hhmmMatch) {
    const hours = parseInt(hhmmMatch[1], 10);
    const minutes = hhmmMatch[2];
    const seconds = hhmmMatch[3] || '00';

    if (hours < 0 || hours > 23 || parseInt(minutes, 10) < 0 || parseInt(minutes, 10) > 59 || parseInt(seconds, 10) < 0 || parseInt(seconds, 10) > 59) {
      throw new Error(`${fieldLabel} is invalid.`);
    }

    const hh = String(hours).padStart(2, '0');
    return `${hh}:${minutes}:${seconds}`;
  }

  throw new Error(`${fieldLabel} is invalid.`);
};

const getLogoBase64FromUrl = (url: string): Promise<{ base64: string; aspect: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/png');
          const aspect = img.naturalWidth / img.naturalHeight;
          resolve({ base64: dataURL, aspect });
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error('Failed to get 2D context'));
      }
    };
    img.onerror = (e) => {
      reject(e);
    };
    img.src = url;
  });
};

const generateQuotationPdfFileName = (leadObj: any): string => {
  const customerName = (leadObj?.customer_name || 'Customer').trim();
  const leadId = (leadObj?.lead_id || leadObj?.id || 'QUOTE').trim();

  // Sanitize customer name and lead ID for file system safety:
  // Replace invalid filename characters (/ \ : * ? " < > |) with underscores
  const sanitizedCustomer = customerName
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Customer';

  const sanitizedLeadId = leadId
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'QUOTE';

  return `${sanitizedCustomer}_${sanitizedLeadId}_quote.pdf`;
};

const generateQuotationPDF = (
  lead: any,
  activePkgs: any[],
  quoteNum: string,
  termsText: string,
  logoBase64?: string,
  logoAspect = 1,
  editableInclusions?: Record<string, string[]>,
  editableDeliverables?: Record<string, string[]>,
  discountValue = 0,
  additionalCharges = 0,
  quoteServices: { id: string; name: string; qty: number; price: number; isAdditional?: boolean }[] = []
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Color Palette & Premium Theme Variables (Photography Studio Inspired)
  const slateDark = [15, 23, 42];      // #0f172a
  const slateGray = [100, 116, 139];   // #64748b
  const bgLightGrid = [248, 250, 252]; // #f8fafc
  const headerBgColor = [18, 18, 22];  // Luxury Carbon Black
  const goldColor = [212, 175, 55];   // #D4AF37 Classic Gold

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return formatDateDDMMYY(dateStr) || dateStr;
  };

  // Dynamic layout configuration options (Default vs Compact to optimize page count and avoid sparse pages)
  const defaultConfig = {
    secSpacing: 6,
    rowPadding: 2.5,
    rowTextHeight: 4.2,
    termsSpacing: 3.8,
    tableSpacing: 5,
    pricingCardHeight: 25.5,
    paymentCardHeight: 29,
    boxPadding: 16,
    textPadding: 4.2,
    notesPadding: 4.2
  };

  const compactConfig = {
    secSpacing: 4,
    rowPadding: 1.5,
    rowTextHeight: 3.8,
    termsSpacing: 3.2,
    tableSpacing: 3,
    pricingCardHeight: 21,
    paymentCardHeight: 24,
    boxPadding: 12,
    textPadding: 3.6,
    notesPadding: 3.6
  };

  // Pre-split fields to calculate wrap height accurately
  const wrapCustName = doc.splitTextToSize(lead.customer_name || '', 50);
  const wrapEmail = doc.splitTextToSize(lead.email || 'Not Provided', 50);
  const displayEventType = lead.event_type === 'Other' ? (lead.custom_event_name || lead.custom_event_type || 'Other') : (lead.event_type || 'N/A');
  const wrapEventType = doc.splitTextToSize(displayEventType, 50);
  const wrapLocation = doc.splitTextToSize(lead.event_location || 'N/A', 50);

  const shootTypeStr = lead.desired_event_shoot_type || lead.shoot_type || '';
  const shootTypes = shootTypeStr ? shootTypeStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const wrapShootType = shootTypes.length > 0 
    ? shootTypes.map((st: string) => `• ${st}`) 
    : ['N/A'];  // Resolve dynamic services
  let services = [...quoteServices];

  if (!services || services.length === 0) {
    const baseSum = activePkgs.reduce((sum, p) => sum + Number(p.package_cost || p.price || 0), 0);
    const defaultItems = [
      '2 Photographers',
      '1 Cinematographer',
      'Drone Coverage',
      'LED Wall',
      'Album (40 Sheets)',
      'Teaser Video',
      'Highlight Video',
      'Full Event Coverage'
    ];
    const defaultPrices = [20000, 15000, 10000, 10050, 8000, 7000, 5000, 5000];
    const sumDefault = defaultPrices.reduce((a, b) => a + b, 0);
    const ratio = baseSum ? (baseSum / sumDefault) : 1;

    defaultItems.forEach((name, idx) => {
      services.push({
        id: `fallback_base_${idx}`,
        name,
        qty: 1,
        price: Math.round((defaultPrices[idx] || 5000) * ratio),
        isAdditional: false
      });
    });
  }

  if (additionalCharges > 0) {
    services.push({
      id: 'extra_charges',
      name: 'Extra Charges',
      qty: 1,
      price: additionalCharges,
      isAdditional: true
    });
  }

  const baseServices = services.filter(s => !s.isAdditional);
  const additionalServices = services.filter(s => s.isAdditional);

  // Helper formatting and normalization routines for cleaning characters & detecting duplicate specifications
  const normalizeForComparison = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanText = (text: string) => {
    if (!text) return '';
    let cleaned = text
      .replace(/þÿ/g, '')
      .replace(/ÿþ/g, '')
      .replace(/\uFEFF/g, '')
      .replace(/\uFFFE/g, '');
    cleaned = cleaned.replace(/^[\s•\-\*\u2022\u0095\x95\x96\u2013\u2014\s]+/g, '');
    cleaned = cleaned.replace(/[₹\u20B9\u20b9]/g, 'Rs.');
    return cleaned.trim();
  };

    // NEW PREP FOR TEAM MEMBERS (INCLUSIONS) AND DELIVERABLES
  const pkg = activePkgs[0];
  const pkgId = pkg ? (pkg.package_id || pkg.id || 'default') : 'default';
  const pkgName = pkg ? (pkg.package_name || pkg.name || 'Base Package') : 'Base Package';

  const inclusionsList = (editableInclusions?.[pkgId] || editableInclusions?.['Custom Package'] || editableInclusions?.['custom_package'] || []).filter(Boolean);

  let rawDelList: string[] = [];
  if (editableDeliverables?.[pkgId] && editableDeliverables[pkgId].filter(Boolean).length > 0) {
    rawDelList = editableDeliverables[pkgId].filter(Boolean);
  } else if (editableDeliverables?.['Custom Package'] && editableDeliverables['Custom Package'].filter(Boolean).length > 0) {
    rawDelList = editableDeliverables['Custom Package'].filter(Boolean);
  } else if (editableDeliverables?.['custom_package'] && editableDeliverables['custom_package'].filter(Boolean).length > 0) {
    rawDelList = editableDeliverables['custom_package'].filter(Boolean);
  } else if (editableDeliverables && Object.values(editableDeliverables).flat().filter(Boolean).length > 0) {
    rawDelList = Object.values(editableDeliverables).flat().filter(Boolean);
  } else {
    const delText = lead?.deliverables_description || pkg?.deliverables || pkg?.deliverables_description || lead?.deliverables || '';
    if (delText) {
      try {
        const parsed = JSON.parse(delText);
        if (Array.isArray(parsed)) {
          if (typeof parsed[0] === 'string') {
            rawDelList = parsed;
          } else if (parsed[0] && Array.isArray(parsed[0].deliverables)) {
            rawDelList = parsed.flatMap((item: any) => Array.isArray(item.deliverables) ? item.deliverables : []);
          }
        }
      } catch (e) {
        rawDelList = delText.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean);
      }
    }
  }

  const deliverablesList = rawDelList.filter(Boolean);

  const eventsToRender: {
    eventName: string;
    eventDate: string;
    eventTime: string;
    eventEndDate: string;
    eventEndTime: string;
    eventLocation: string;
    guestPax: string;
    members: string[];
    deliverables: string[];
  }[] = [];

  if (lead.events && lead.events.length > 0) {
    // 1. First, create the array of events
    const unsortedEvents: any[] = [];
    lead.events.forEach((event: any) => {
      const eventKey = `${pkgId}_${event.id}`;
      const nameKey = `${pkgId}_${event.event_name || event.event_type || 'Unnamed Event'}`;
      
      const eventInclusions = editableInclusions?.[eventKey] !== undefined
        ? editableInclusions[eventKey]
        : (editableInclusions?.[nameKey] !== undefined ? editableInclusions[nameKey] : inclusionsList);

      const eventName = event.event_name || event.event_type || 'Unnamed Event';

      const eventDeliverables = editableDeliverables?.[eventKey] !== undefined
        ? editableDeliverables[eventKey]
        : (editableDeliverables?.[nameKey] !== undefined ? editableDeliverables[nameKey] : null);

      const items = eventDeliverables !== null
        ? eventDeliverables.filter(Boolean)
        : deliverablesList;

      unsortedEvents.push({
        eventName,
        eventDate: event.event_start_date || event.event_date || "",
        eventTime: event.event_time || event.event_start_time || "",
        eventEndDate: event.event_end_date || "",
        eventEndTime: event.event_end_time || "",
        eventLocation: event.event_location || "N/A",
        guestPax: event.guest_pax !== undefined && event.guest_pax !== null && event.guest_pax !== '' ? String(event.guest_pax) : (lead.guest_pax !== undefined && lead.guest_pax !== null && lead.guest_pax !== '' ? String(lead.guest_pax) : (lead.total_pax ? String(lead.total_pax) : 'N/A')),
        members: (eventInclusions || []).filter(Boolean),
        deliverables: items
      });
    });

    // 2. Sort by event date ascending
    unsortedEvents.sort((a, b) => {
      const dateA = new Date(a.eventDate || "9999-12-31").getTime();
      const dateB = new Date(b.eventDate || "9999-12-31").getTime();
      return dateA - dateB;
    });

    // 3. Push to eventsToRender
    eventsToRender.push(...unsortedEvents);
  } else {
    eventsToRender.push({
      eventName: displayEventType,
      eventDate: lead.event_date || "",
      eventTime: lead.event_time || "",
      eventEndDate: lead.event_end_date || "",
      eventEndTime: lead.event_end_time || "",
      eventLocation: lead.event_location || "N/A",
      guestPax: lead.guest_pax !== undefined && lead.guest_pax !== null && lead.guest_pax !== '' ? String(lead.guest_pax) : (lead.total_pax ? String(lead.total_pax) : 'N/A'),
      members: (inclusionsList || []).filter(Boolean),
      deliverables: deliverablesList
    });
  }

  const custRemarks = lead.remarks_raw || lead.remarks || '';
  const teamRemarks = lead.notes || ''; 

  const defaultTerms = [
    'Payments are non-refundable.',
    'Crew food arrangements from client side.',
    '50% advance payment before the event.',
    'If duration exceeds 1 hour, additional charges of ₹1,500 per hour will be applicable.',
    '50% full payment on event day.',
    'Pendrive and Hard Disk are not included.',
    'Edited data will be shared via Google Drive link.'
  ];

  const termsToRender = termsText.split('\n').map(t => t.trim()).filter(Boolean).length > 0
    ? termsText.split('\n').map(t => t.trim()).filter(Boolean)
    : defaultTerms;

  // Layout simulation routine
  const simulate = (cfg: typeof defaultConfig) => {
    let simY = 49;
    let simPageCount = 1;

    const simTable = (itemsCount: number, hideHeader: boolean) => {
      let tableH = hideHeader ? 4 : (4 + 7.5); 
      for (let i = 0; i < itemsCount; i++) {
        tableH += Math.max(7.5, 1 * cfg.rowTextHeight + cfg.rowPadding);
      }
      if (simY + tableH > 250 && tableH <= (250 - 52)) {
        simY = 52;
        simPageCount++;
      } else {
        let currentTableY = simY + (hideHeader ? 4 : (4 + 7.5));
        for (let i = 0; i < itemsCount; i++) {
          const rowH = Math.max(7.5, 1 * cfg.rowTextHeight + cfg.rowPadding);
          if (currentTableY + rowH > 250) {
            currentTableY = 52 + (hideHeader ? 0 : 7.5);
            simPageCount++;
          }
          currentTableY += rowH;
        }
        simY = currentTableY;
      }
      simY += cfg.tableSpacing;
    };

    eventsToRender.forEach((evObj) => {
      // Event Name / Title height (approx 10.5)
      if (simY + 10.5 > 250) {
        simY = 52;
        simPageCount++;
      }
      simY += 10.5;

      // Customer details card height (26)
      if (simY + 26 > 250) {
        simY = 52;
        simPageCount++;
      }
      simY += 26 + cfg.secSpacing;

      // Team members table (hide header)
      if (evObj.members.length > 0) {
        simTable(evObj.members.length, true);
      }

      // Deliverables table (show header)
      if (evObj.deliverables.length > 0) {
        simTable(evObj.deliverables.length, true);
      }
    });

    if (additionalServices.length > 0) {
      simTable(additionalServices.length, false);
    }

    const pricingH = 4.5 + cfg.pricingCardHeight;
    if (simY + pricingH > 250) {
      simY = 52;
      simPageCount++;
    }
    simY += pricingH + cfg.secSpacing;

    if (custRemarks || teamRemarks) {
      let simBoxH = 4;
      if (custRemarks) {
        const wrappedCustSim = doc.splitTextToSize(custRemarks, 170);
        simBoxH += 4.5 + (wrappedCustSim.length * cfg.notesPadding);
      }
      if (teamRemarks) {
        const wrappedTeamSim = doc.splitTextToSize(teamRemarks, 170);
        simBoxH += 4.5 + (wrappedTeamSim.length * cfg.notesPadding) + (custRemarks ? 4 : 0);
      }
      simBoxH += 2;

      const remarksH = 4.5 + simBoxH;
      if (simY + remarksH > 250) {
        simY = 52;
        simPageCount++;
      }
      simY += remarksH + cfg.secSpacing;
    }

    // 8. TERMS & CONDITIONS (Boxed)
    if (simY + 4.5 > 250) {
      simY = 52;
      simPageCount++;
    }
    simY += 4.5; // heading

    let simTermsIndex = 0;
    while (simTermsIndex < termsToRender.length) {
      let tempY = simY + 4; // top padding of box
      let collectedOnPage = 0;

      while (simTermsIndex < termsToRender.length) {
        const term = termsToRender[simTermsIndex];
        const cleanTerm = term.replace(/^\d+[\.\s\-)]+\s*/, '').replace(/[₹\u20B9\u20b9]/g, 'Rs.').replace(/\s+/g, ' ').trim();
        const wrapped = doc.splitTextToSize(cleanTerm, 163);
        const termH = (wrapped.length * cfg.termsSpacing) + 3; // spacing between terms

        if (tempY + termH > 248) {
          if (collectedOnPage === 0) {
            // Force break page
            simY = 52;
            simPageCount++;
            tempY = simY + 4;
            continue;
          }
          break; // Stop adding terms on this page, box will end here
        }
        collectedOnPage++;
        tempY += termH;
        simTermsIndex++;
      }

      if (collectedOnPage > 0) {
        const boxH = tempY - simY + 2; // including bottom padding
        simY = simY + boxH + 4; // ending of this box plus some margin
      }
    }

    // 9. PHOTOCREW PICTURES FOOTER (Always Last, at footerY = 255)
    if (simY > 250) {
      simY = 52;
      simPageCount++;
    }
    simY = 275;

    return { pageCount: simPageCount, lastPageY: simY };
  };

  // Run simulations to select the most appropriate page-budget configuration
  const defaultRes = simulate(defaultConfig);
  let cfg = defaultConfig;

  if (defaultRes.pageCount > 1) {
    const compactRes = simulate(compactConfig);
    if (compactRes.pageCount < defaultRes.pageCount) {
      cfg = compactConfig;
    } else if (compactRes.pageCount === defaultRes.pageCount && compactRes.lastPageY < defaultRes.lastPageY) {
      if (defaultRes.pageCount === 2 && defaultRes.lastPageY < 80) {
        cfg = compactConfig;
      }
    }
  }

  // Header drawing function
  const drawPageHeader = (pageDoc: typeof doc) => {
    // Premium Dark Carbon Header Bar
    pageDoc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
    pageDoc.rect(0, 0, 210, 42, 'F'); 

    // Gold Accent Line separating header from content
    pageDoc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    pageDoc.rect(0, 41, 210, 1.2, 'F');

    let logoY = 6;
    let logoW = 18;
    let logoH = 18;
    let hasLogo = false;
    
    if (logoBase64 && logoBase64.startsWith('data:image')) {
      const maxLogoW = 24;
      const maxLogoH = 18;
      logoW = maxLogoH * logoAspect;
      logoH = maxLogoH;
      if (logoW > maxLogoW) {
        logoW = maxLogoW;
        logoH = maxLogoW / logoAspect;
      }
      logoY = (30 - logoH) / 2;
      try {
        pageDoc.addImage(logoBase64, 'PNG', 15, logoY, logoW, logoH);
        hasLogo = true;
      } catch (e) {
        console.warn('Failed to add logo image to PDF:', e);
      }
    }

    if (!hasLogo) {
      pageDoc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
      pageDoc.setLineWidth(0.6);
      pageDoc.setFillColor(18, 18, 22);
      pageDoc.circle(24, logoY + 9, 9, 'FD');
      pageDoc.setFont('helvetica', 'bold');
      pageDoc.setFontSize(11);
      pageDoc.setTextColor(255, 255, 255);
      pageDoc.text('P', 22.2, logoY + 12.2);
      logoW = 18;
      logoY = 8;
    }

    const brandingX = 15 + logoW + 5;

    // Left block: Company Branding & Location Info
    pageDoc.setFont('helvetica', 'bold');
    pageDoc.setFontSize(13.5);
    pageDoc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
    pageDoc.text('PHOTOCREW PICTURES', brandingX, logoY + 3);

    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setFontSize(7);
    pageDoc.setTextColor(185, 185, 185);
    pageDoc.text('PREMIUM PHOTOGRAPHY STUDIO & VISUAL PRODUCTION', brandingX, logoY + 7.5);
    
    pageDoc.setFontSize(7);
    pageDoc.setTextColor(150, 150, 150);
    pageDoc.text('No. 45, 1st Floor, 80 Feet Road, VijayNagar, Bangalore - 560040', brandingX, logoY + 12);
    pageDoc.text('GSTIN: 29AAFCP5894N1ZN (Registered Karnataka)', brandingX, logoY + 16.5);

    // Right block: Studio Contact Info
    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setFontSize(7.5);
    pageDoc.setTextColor(230, 230, 230);
    pageDoc.text('www.photocrewpictures.com', 195, logoY + 4, { align: 'right' });
    pageDoc.text('info@photocrewpictures.com', 195, logoY + 8.5, { align: 'right' });
    pageDoc.text('+91 9060144016', 195, logoY + 13, { align: 'right' });

    // Header Meta Row: Quote Number, Quote Date, and Validity Date
    pageDoc.setFillColor(28, 28, 35);
    pageDoc.rect(15, 30, 180, 7.5, 'F');
    
    pageDoc.setFont('helvetica', 'bold');
    pageDoc.setFontSize(8);
    pageDoc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
    pageDoc.text('QUOTATION DOCUMENT', 19, 35);

    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setFontSize(7.5);
    pageDoc.setTextColor(240, 240, 240);
    pageDoc.text(`Date: ${formatDate(lead.quotation_date || new Date().toISOString().split('T')[0])}`, 130, 35);
    pageDoc.text(`Validity: 15 Days`, 168, 35);
  };

  // Footer drawing function
  const drawPageFooter = (pageDoc: typeof doc, pageNum: number, totalPages: number) => {
    let footerY = 260;
    
    if (totalPages > 1) {
      pageDoc.setFont('helvetica', 'normal');
      pageDoc.setFontSize(7);
      pageDoc.setTextColor(148, 163, 184);
      pageDoc.text(`Page ${pageNum} of ${totalPages}`, 195, footerY + 14, { align: 'right' });
    }

    pageDoc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    pageDoc.rect(0, 292, 210, 5, 'F');
  };

  const drawPhotoCrewFooter = (pageDoc: typeof doc, footerY: number) => {
    pageDoc.setDrawColor(226, 232, 240);
    pageDoc.setLineWidth(0.3);
    pageDoc.line(15, footerY, 195, footerY);

    pageDoc.setFont('helvetica', 'bold');
    pageDoc.setFontSize(8.5);
    pageDoc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    pageDoc.text('PHOTOCREW PICTURES', 15, footerY + 5);
    
    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setFontSize(7.5);
    pageDoc.setTextColor(100, 116, 139);
    pageDoc.text('Website : https://www.photocrewpictures.com/  |  Email: info@photocrewpictures.com  |  Phone: +91 9060144016', 15, footerY + 9);

    pageDoc.setFont('helvetica', 'bold');
    pageDoc.setFontSize(8);
    pageDoc.setTextColor(goldColor[0], goldColor[1], goldColor[2]); 
    pageDoc.text('Thank You For Choosing Photocrew Pictures', 15, footerY + 14);

    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setFontSize(7.5);
    pageDoc.setTextColor(100, 116, 139);
    pageDoc.text('For Photocrew Pictures', 195, footerY + 5, { align: 'right' });
    pageDoc.setFont('helvetica', 'bold');
    pageDoc.setFontSize(8);
    pageDoc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    pageDoc.text('Authorized Signatory', 195, footerY + 12, { align: 'right' });
  };

  const createNewPage = () => {
    doc.addPage();
    return 52; 
  };

  let currentY = 49;

  const drawTeamMembersTable = (title: string, members: string[]) => {
    if (members.length === 0) return;

    let tableH = 4; // Title spacing
    const mapped = members.map((m, i) => ({ id: String(i), name: m, qty: 1, price: 0 }));

    mapped.forEach((item) => {
      const cleanedItemName = cleanText(item.name || '');
      const wrappedName = doc.splitTextToSize(cleanedItemName, 166);
      tableH += Math.max(7.5, wrappedName.length * cfg.rowTextHeight + cfg.rowPadding);
    });

    if (currentY + tableH > 250 && tableH <= (250 - 52)) {
      currentY = createNewPage();
    }

    if (currentY + 4 > 250) {
      currentY = createNewPage();
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(title, 15, currentY);
    currentY += 4;

    doc.setDrawColor(203, 213, 225); 
    doc.setLineWidth(0.2);

    // Draw top border line since we removed the header row
    doc.line(15, currentY, 195, currentY);

    mapped.forEach((item, index) => {
      const cleanedItemName = cleanText(item.name || '');
      const wrappedName = doc.splitTextToSize(cleanedItemName, 166);
      const rowHeight = Math.max(7.5, wrappedName.length * cfg.rowTextHeight + cfg.rowPadding);

      if (currentY + rowHeight > 250) {
        doc.line(15, currentY, 195, currentY);
        currentY = createNewPage();
        doc.line(15, currentY, 195, currentY);
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, rowHeight, 'F');
      }

      doc.line(15, currentY, 15, currentY + rowHeight);
      doc.line(195, currentY, 195, currentY + rowHeight);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      doc.setFillColor(51, 65, 85);
      doc.circle(20, currentY + 4.3 - 0.9, 0.6, 'F');

      wrappedName.forEach((line: string, i: number) => {
        doc.text(line, 23, currentY + 4.3 + (i * cfg.rowTextHeight));
      });

      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
      currentY += rowHeight;
    });

    currentY += cfg.tableSpacing; 
  };

  const drawEventDeliverablesTable = (title: string, deliverables: string[]) => {
    if (deliverables.length === 0) return;

    let tableH = 4; // Title spacing
    const mapped = deliverables.map((d, i) => ({ id: String(i), name: d }));

    mapped.forEach((item) => {
      let cleanedItemName = cleanText(item.name || '');
      cleanedItemName = cleanedItemName.replace(/^DELIVERABLES\s*[:-]?\s*/i, '');
      const wrappedName = doc.splitTextToSize(cleanedItemName, 166);
      tableH += Math.max(7.5, wrappedName.length * cfg.rowTextHeight + cfg.rowPadding);
    });

    if (currentY + tableH > 250 && tableH <= (250 - 52)) {
      currentY = createNewPage();
    }

    if (currentY + 4 > 250) {
      currentY = createNewPage();
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(title, 15, currentY);
    currentY += 4;

    doc.setDrawColor(203, 213, 225); 
    doc.setLineWidth(0.2);

    // Draw top border line since we removed the header row
    doc.line(15, currentY, 195, currentY);

    mapped.forEach((item, index) => {
      let cleanedItemName = cleanText(item.name || '');
      cleanedItemName = cleanedItemName.replace(/^DELIVERABLES\s*[:-]?\s*/i, '');
      const wrappedName = doc.splitTextToSize(cleanedItemName, 166);
      const rowHeight = Math.max(7.5, wrappedName.length * cfg.rowTextHeight + cfg.rowPadding);

      if (currentY + rowHeight > 250) {
        doc.line(15, currentY, 195, currentY);
        currentY = createNewPage();
        doc.line(15, currentY, 195, currentY);
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, rowHeight, 'F');
      }

      doc.line(15, currentY, 15, currentY + rowHeight);
      doc.line(195, currentY, 195, currentY + rowHeight);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      doc.setFillColor(51, 65, 85);
      doc.circle(20, currentY + 4.3 - 0.9, 0.6, 'F');

      wrappedName.forEach((line: string, i: number) => {
        doc.text(line, 23, currentY + 4.3 + (i * cfg.rowTextHeight));
      });

      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
      currentY += rowHeight;
    });

    currentY += cfg.tableSpacing; 
  };

  const drawAdditionalTable = (title: string, items: { id: string; name: string; qty: number; price: number; isAdditional?: boolean }[]) => {
    let tableH = 4 + 7.5; 
    items.forEach((item) => {
      const cleanedItemName = cleanText(item.name || '');
      const wrappedName = doc.splitTextToSize(cleanedItemName, 166);
      tableH += Math.max(7.5, wrappedName.length * cfg.rowTextHeight + cfg.rowPadding);
    });

    if (currentY + tableH > 250 && tableH <= (250 - 52)) {
      currentY = createNewPage();
    }

    if (currentY + 4 > 250) {
      currentY = createNewPage();
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(title, 15, currentY);
    currentY += 4;

    if (currentY + 7.5 > 250) {
      currentY = createNewPage();
    }
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(15, currentY, 180, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('SERVICE / DELIVERABLES', 19, currentY + 4.8);

    currentY += 7.5;

    doc.setDrawColor(203, 213, 225); 
    doc.setLineWidth(0.2);

    items.forEach((item, index) => {
      const cleanedItemName = cleanText(item.name || '');
      const wrappedName = doc.splitTextToSize(cleanedItemName, 166);
      const rowHeight = Math.max(7.5, wrappedName.length * cfg.rowTextHeight + cfg.rowPadding);

      if (currentY + rowHeight > 250) {
        doc.line(15, currentY, 195, currentY);
        currentY = createNewPage();

        doc.setFillColor(30, 41, 59);
        doc.rect(15, currentY, 180, 7.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text('SERVICE / DELIVERABLES (CONTINUED)', 19, currentY + 4.8);
        currentY += 7.5;
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, rowHeight, 'F');
      }

      doc.line(15, currentY, 15, currentY + rowHeight);
      doc.line(195, currentY, 195, currentY + rowHeight);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      doc.setFillColor(51, 65, 85);
      doc.circle(20, currentY + 4.3 - 0.9, 0.6, 'F');

      wrappedName.forEach((line: string, i: number) => {
        doc.text(line, 23, currentY + 4.3 + (i * cfg.rowTextHeight));
      });

      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
      currentY += rowHeight;
    });

    currentY += cfg.tableSpacing; 
  };

  // Now, iterate through events and draw the specified blocks
  eventsToRender.forEach((evObj, idx) => {
    // 1. EVENT NAME & META DETAILS
    if (currentY + 11 > 250) {
      currentY = createNewPage();
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
    const eventHeading = eventsToRender.length === 1
      ? `EVENT — ${evObj.eventName.toUpperCase()}`
      : `EVENT ${idx + 1} — ${evObj.eventName.toUpperCase()}`;
    doc.text(eventHeading, 15, currentY);
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
    
    const formattedEvDate = formatDate(evObj.eventDate);
    const formattedEvTime = evObj.eventTime ? formatTime12Hour(evObj.eventTime) : 'N/A';
    const formattedEndDate = formatDate(evObj.eventEndDate);
    const formattedEndTime = evObj.eventEndTime ? formatTime12Hour(evObj.eventEndTime) : 'N/A';
    
    const startStr = `Start: ${formattedEvDate} | ${formattedEvTime}`;
    const endStr = `End: ${formattedEndDate} | ${formattedEndTime}`;
    const locStr = `Location: ${evObj.eventLocation || 'N/A'}`;
    
    doc.text(`${startStr}`, 15, currentY);
    doc.text(`${endStr}`, 70, currentY);
    doc.text(`${locStr}`, 125, currentY);
    currentY += 6;

    // 2. CUSTOMER DETAILS CARD
    if (currentY + 26 > 250) {
      currentY = createNewPage();
    }

    doc.setFillColor(bgLightGrid[0], bgLightGrid[1], bgLightGrid[2]);
    doc.roundedRect(15, currentY, 180, 26, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.roundedRect(15, currentY, 180, 26, 1.5, 1.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text('CUSTOMER DETAILS', 20, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);

    const col1 = [
      { label: 'Customer Name', val: lead.customer_name || 'N/A' },
      { label: 'Mobile Number', val: lead.mobile || 'N/A' },
      { label: 'Email Address', val: lead.email || 'N/A' },
      { label: 'Quotation Date', val: formatDate(lead.quotation_date || new Date().toISOString().split('T')[0]) }
    ];

    const col2 = [
      { label: 'Sales Staff Name', val: lead.sales_staff_name || 'N/A' },
      { label: 'Sales Staff Mobile', val: lead.sales_staff_mobile || 'N/A' },
      { label: 'Guest Pax', val: evObj.guestPax || 'N/A' }
    ];

    col1.forEach((item, i) => {
      const itemY = currentY + 9.5 + (i * 4.5);
      doc.text(item.label, 20, itemY);
      doc.text(':', 45, itemY);
      doc.text(String(item.val), 47, itemY);
    });

    col2.forEach((item, i) => {
      const itemY = currentY + 9.5 + (i * 4.5);
      doc.text(item.label, 110, itemY);
      doc.text(':', 135, itemY);
      doc.text(String(item.val), 137, itemY);
    });

    currentY += 26 + cfg.secSpacing;

    // 3. TEAM MEMBERS INCLUDED
    if (evObj.members.length > 0) {
      drawTeamMembersTable('TEAM MEMBERS INCLUDED', evObj.members);
    }

    // 4. DELIVERABLES
    if (evObj.deliverables.length > 0) {
      drawEventDeliverablesTable('DELIVERABLES', evObj.deliverables);
    }
  });

  // 5. ADDITIONAL SPECIFICATIONS & SERVICE ADD-ONS (if any)
  if (additionalServices.length > 0) {
    drawAdditionalTable('ADDITIONAL SPECIFICATIONS & SERVICE ADD-ONS', additionalServices);
  }

  // 5. PRICING SUMMARY CARD
  const pricingCardTotalH = 4.5 + cfg.pricingCardHeight;
  if (currentY + pricingCardTotalH > 250) {
    currentY = createNewPage();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('PRICING SUMMARY & ESTIMATES', 15, currentY);
  currentY += 4.5;

  doc.setFillColor(248, 250, 252);
  doc.rect(15, currentY, 180, cfg.pricingCardHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(15, currentY, 180, cfg.pricingCardHeight, 'D');

  const pricingRowH = cfg.pricingCardHeight / 3;
  doc.line(15, currentY + pricingRowH, 195, currentY + pricingRowH);
  doc.line(15, currentY + (pricingRowH * 2), 195, currentY + (pricingRowH * 2));
  doc.line(115, currentY, 115, currentY + cfg.pricingCardHeight);

  // Fetch saved / entered Final Quotation Amount from Sales Dashboard Section 2 / lead record
  const getSavedFinalAmount = () => {
    if (!lead) return null;
    const candidates = [
      lead.Final_Quotation_Amount,
      lead.final_quotation_amount,
      lead.final_amount,
      lead.final_quoted_amount,
      lead.dynamicFinalAmt,
      lead.budget,
      lead.quotation_amount
    ];
    for (const val of candidates) {
      if (val !== undefined && val !== null && val !== '') {
        const num = Number(val);
        if (!Number.isNaN(num) && num > 0) {
          return num;
        }
      }
    }
    return null;
  };

  const savedFinalAmt = getSavedFinalAmount();
  const baseSumValRaw = baseServices.reduce((sum, s) => sum + (Number(s.qty) * Number(s.price)), 0);
  const addlSumVal = additionalServices.reduce((sum, s) => sum + (Number(s.qty) * Number(s.price)), 0);

  // Use the saved Final Quotation Amount from Section 2 if available, otherwise calculate
  const finalAmountSum = savedFinalAmt !== null ? savedFinalAmt : Math.max(0, baseSumValRaw + addlSumVal - discountValue);

  // Ensure baseSumVal matches when displayed if baseSumValRaw was 0
  const baseSumVal = (baseSumValRaw > 0) 
    ? baseSumValRaw 
    : Math.max(0, finalAmountSum + discountValue - addlSumVal);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  
  doc.text('Package Base Price', 19, currentY + pricingRowH - 2);
  doc.text('Quotation Discount (Applied)', 19, currentY + (pricingRowH * 2) - 2);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('FINAL ESTIMATED COMMERCIAL AMOUNT', 19, currentY + (pricingRowH * 3) - 2);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(baseSumVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 191, currentY + pricingRowH - 2, { align: 'right' });
  doc.text('- ' + discountValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 191, currentY + (pricingRowH * 2) - 2, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.text(finalAmountSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 191, currentY + (pricingRowH * 3) - 2, { align: 'right' });

  currentY += cfg.pricingCardHeight + cfg.secSpacing;

  // 6. PAYMENT DETAILS CARD (Completely hidden/removed as requested)
  // PAYMENT DETAILS section is hidden from the quotation PDF.
  // We do not increment currentY or draw the section.

  // 8. TERMS AND CONDITIONS
  if (currentY + 4.5 > 250) {
    currentY = createNewPage();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('TERMS & CONDITIONS', 15, currentY);
  currentY += 4.5;

  let termsIndex = 0;
  while (termsIndex < termsToRender.length) {
    let boxStartY = currentY;
    let tempY = currentY + 4; // top padding of box
    let pageTerms = [];

    while (termsIndex < termsToRender.length) {
      const term = termsToRender[termsIndex];
      const cleanTerm = term.replace(/^\d+[\.\s\-)]+\s*/, '').replace(/[₹\u20B9\u20b9]/g, 'Rs.').replace(/\s+/g, ' ').trim();
      const prefix = `${termsIndex + 1}. `;
      const wrapped = doc.splitTextToSize(cleanTerm, 163); // fits beautifully inside 180mm box with margins and padding
      const termHeight = (wrapped.length * cfg.termsSpacing) + 3; // spacing between terms

      if (tempY + termHeight > 248) {
        if (pageTerms.length === 0) {
          // Force break page if not even one term fits
          currentY = createNewPage();
          boxStartY = currentY;
          tempY = currentY + 4;
          continue;
        }
        break; // Stop adding terms to this page, box will end here
      }
      pageTerms.push({ prefix, wrapped, termHeight });
      tempY += termHeight;
      termsIndex++;
    }

    if (pageTerms.length > 0) {
      const boxHeight = tempY - boxStartY + 2; // including bottom padding of box
      
      // Draw a dedicated bordered content box for the terms on this page
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240); // Light gray border
      doc.setLineWidth(0.25);
      doc.roundedRect(15, boxStartY, 180, boxHeight, 1.5, 1.5, 'FD'); // Rounded corners, filled with white, and bordered

      let textOffset = boxStartY + 5; // Start with top padding
      pageTerms.forEach((pt) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(100, 116, 139);
        doc.text(pt.prefix, 23, textOffset, { align: 'right' }); // Right-aligned prefix for vertical alignment

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        pt.wrapped.forEach((line: string, lineIdx: number) => {
          doc.text(line, 25, textOffset + (lineIdx * cfg.termsSpacing)); // Left-aligned wrapped text
        });
        textOffset += (pt.wrapped.length * cfg.termsSpacing) + 3; // Add spacing between terms
      });

      currentY = boxStartY + boxHeight + 4; // Spacing after the box
    }
  }

  // 9. PHOTOCREW PICTURES FOOTER (Always Last)
  // Check if we have enough space for the footer on the current final page.
  // If not, we create a new page for it.
  if (currentY > 250) {
    currentY = createNewPage();
  }

  // Draw the one-time brand company footer on the final page
  const finalPageNum = (doc as any).internal.getNumberOfPages();
  doc.setPage(finalPageNum);
  drawPhotoCrewFooter(doc, 255);

  // Apply Brand Headers and Page Number Footers to ALL pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i === 1) {
      drawPageHeader(doc);
    }
    drawPageFooter(doc, i, totalPages);
  }

  return doc;
};


const highlightText = (text: string, search: string) => {
  if (!search.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-500/30 text-yellow-105 rounded px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};
export const LEAD_SOURCES = [
  'Instagram Marketing',
  'Facebook Leads',
  'Google Ads / Search',
  'Website Inquiry',
  'WhatsApp / Direct',
  'Reference / Referral',
  'YouTube Channel',
  'Walk In Enquiry',
  'JustDial / Third Party',
  'Past Customer Repeat',
  'Other'
];

interface SalesModuleProps {
  activeSubTab?: 'list' | 'create' | 'profiles' | 'packages' | 'calendar';
  setActiveSubTab?: (tab: 'list' | 'create' | 'profiles' | 'packages' | 'calendar') => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({ activeSubTab: externalActiveTab, setActiveSubTab: externalSetActiveTab }) => {
  const { 
    currentUser,
    currentRole, 
    leads: allLeads, 
    leadPackages, 
    orders: allOrders, 
    payments: allPayments, 
    production, 
    addLead, 
    updateLeadFollowUp, 
    confirmOrder,
    packages,
    addPackage,
    updatePackage,
    deletePackage,
    quotations: allQuotations,
    addQuotation,
    updateQuotation,
    updateLead,
    saveLeadPackages,
    unlockedRecords,
    unlockRecord,
    lockRecord,
    isRecordLocked,
    isDepartmentAllowedToEdit,
    deleteLead,
    deleteOrder,
    statusHistory,
    getLeadCurrentStatus,
    getLeadCurrentStage,
    addNotification,
    users
  } = useRole();

  const leads = currentRole === 'Sales Team' 
    ? allLeads.filter(l => l.sales_staff_id === currentUser?.id || l.sales_person === currentUser?.name) 
    : allLeads;
  const orders = currentRole === 'Sales Team' 
    ? allOrders.filter(o => leads.some(l => l.lead_id === o.lead_id)) 
    : allOrders;
  const payments = currentRole === 'Sales Team' 
    ? allPayments.filter(p => leads.some(l => l.lead_id === p.lead_id)) 
    : allPayments;
  const quotations = currentRole === 'Sales Team' 
    ? (allQuotations || []).filter((q: any) => leads.some(l => l.lead_id === q.lead_id)) 
    : (allQuotations || []);

  const [logoBase64, setLogoBase64] = useState<string>('');
  const [logoAspectRatio, setLogoAspectRatio] = useState<number>(1);
  const [unlockRequests, setUnlockRequests] = useState<any[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ customer_name: "", mobile: "", email: "", lead_source: "WhatsApp", stage: "Lead Generated", inquiry_type: "Unknown", remarks: "", address: "" });
  const [step4FollowUpNotes, setStep4FollowUpNotes] = useState<string>("");
  const [showAddNoteModal, setShowAddNoteModal] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>("");
  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      await addLead(form);
      setForm({ customer_name: "", mobile: "", email: "", lead_source: "WhatsApp", stage: "Lead Generated", inquiry_type: "Unknown", remarks: "", address: "" });
      if(externalSetActiveTab) externalSetActiveTab("Active Leads");
      setInternalTab("list");
    } catch (err: any) {
      setSubmitError(err.message || "Failed to create lead");
    }
  };

  // Fetch unlock requests
  useEffect(() => {
    if (!supabaseClient) return;

    const fetchUnlockRequests = async () => {
      const { data, error } = await supabaseClient
        .from('unlock_requests')
        .select('*');
      
      if (!error && data) {
        const normalized = data.map((r: any) => {
          const isApproved = r.request_status === 'Approved' || r.status === 'Approved';
          const isCompleted = r.request_status === 'Completed' || r.status === 'Completed';
          const isRejected = r.request_status === 'Rejected' || r.status === 'Rejected';
          const effectiveStatus = isApproved ? 'Approved' : isCompleted ? 'Completed' : isRejected ? 'Rejected' : (r.request_status || r.status || 'Pending');
          return {
            ...r,
            request_status: effectiveStatus,
            status: effectiveStatus,
            reason: r.request_reason || r.reason || '',
            sales_staff_name: r.requested_by_name || r.sales_staff_name || '',
            sales_staff_id: r.requested_by_user_id || r.sales_staff_id || ''
          };
        });
        setUnlockRequests(normalized);
      }
    };

    fetchUnlockRequests();

    const channel = supabaseClient
      .channel('rt-unlock_requests-sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unlock_requests' }, () => {
        fetchUnlockRequests();
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  // Dynamic active master roles and deliverables loaded from Supabase master tables
  const [activeMasterRoles, setActiveMasterRoles] = useState<string[]>([]);
  const [activeMasterDeliverables, setActiveMasterDeliverables] = useState<string[]>([]);

  const loadActiveMasterItems = React.useCallback(async () => {
    try {
      let rList: string[] = [];
      let dList: string[] = [];

      if (supabaseClient) {
        const { data: rData } = await supabaseClient
          .from('custom_roles')
          .select('role_name')
          .eq('status', 'Active');
        if (rData && rData.length > 0) {
          rList = rData.map((r: any) => r.role_name);
        }

        const { data: dData } = await supabaseClient
          .from('custom_deliverables')
          .select('deliverable_name')
          .eq('status', 'Active');
        if (dData && dData.length > 0) {
          dList = dData.map((d: any) => d.deliverable_name);
        }
      }

      if (rList.length === 0) {
        const saved = localStorage.getItem('erp_custom_roles_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          rList = parsed.filter((r: any) => r.status === 'Active').map((r: any) => r.role_name);
        }
      }

      if (dList.length === 0) {
        const saved = localStorage.getItem('erp_custom_deliverables_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          dList = parsed.filter((d: any) => d.status === 'Active').map((d: any) => d.deliverable_name);
        }
      }

      if (rList.length > 0) setActiveMasterRoles(rList);
      if (dList.length > 0) setActiveMasterDeliverables(dList);
    } catch (err) {
      console.warn("Error fetching active custom master items in SalesModule:", err);
    }
  }, []);

  React.useEffect(() => {
    loadActiveMasterItems();
  }, [loadActiveMasterItems]);

  React.useEffect(() => {
    const preloadLogo = async () => {
      try {
        const logoUrl = 'https://aqifyxsimhqayfjwzzwj.supabase.co/storage/v1/object/public/img/logo%20(4)%20(1).png';
        const result = await getLogoBase64FromUrl(logoUrl);
        setLogoBase64(result.base64);
        setLogoAspectRatio(result.aspect);
      } catch (e) {
        console.warn('Failed to pre-load logo image:', e);
      }
    };
    preloadLogo();
  }, []);

  // Role permissions gate
  const canEdit = (currentRole === 'Sales Team' || currentRole === 'Business Owner') && 
                  (isDepartmentAllowedToEdit(currentRole, 'Quote Sent') || isDepartmentAllowedToEdit(currentRole, 'New Lead'));

  // Toggle modes
  const [internalTab, setInternalTab] = useState<'list' | 'create' | 'profiles' | 'packages' | 'calendar'>('list');
  const activeTab = externalActiveTab || internalTab;
  const setActiveTab = externalSetActiveTab || setInternalTab;

  // Leads export report handlers
  const handleDownloadCSV = () => {
    const headers = ["Lead ID", "Order ID", "Customer Name", "Mobile Number", "Event Type", "Event Date", "Current Stage", "Current Status", "Payment Status", "Created Date"];
    const rows = filteredLeads.map(l => {
      const ord = orders.find(o => o.lead_id === l.lead_id);
      const pay = ord ? payments?.find(p => p.order_id === ord.order_id) : null;
      return [
        l.lead_id,
        ord?.order_id || 'N/A',
        l.customer_name === 'Inbound Prospect' ? '' : l.customer_name,
        l.mobile,
        l.event_type,
        l.event_date || 'N/A',
        getLeadCurrentStatus(l),
        l.remarks.slice(0, 50).replace(/["\n\r]/g, ' '),
        pay ? pay.payment_status : 'Pending',
        l.created_date
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Leads_Report_${appliedStartDate || 'all'}_to_${appliedEndDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExcel = () => {
    const headers = ["Lead ID", "Order ID", "Customer Name", "Mobile Number", "Event Type", "Event Date", "Current Stage", "Current Status", "Payment Status", "Created Date"];
    const rows = filteredLeads.map(l => {
      const ord = orders.find(o => o.lead_id === l.lead_id);
      const pay = ord ? payments?.find(p => p.order_id === ord.order_id) : null;
      return [
        l.lead_id,
        ord?.order_id || 'N/A',
        l.customer_name === 'Inbound Prospect' ? '' : l.customer_name,
        l.mobile,
        l.event_type,
        l.event_date || 'N/A',
        getLeadCurrentStatus(l),
        l.remarks.slice(0, 50).replace(/["\t\n\r]/g, ' '),
        pay ? pay.payment_status : 'Pending',
        l.created_date
      ];
    });
    
    // Generate standard TSV structure compatible with native Excel import
    const content = [headers.join("\t"), ...rows.map(e => e.join("\t"))].join("\n");
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Leads_Report_${appliedStartDate || 'all'}_to_${appliedEndDate || 'all'}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const rowsHtml = filteredLeads.map(l => {
      const ord = orders.find(o => o.lead_id === l.lead_id);
      const pay = ord ? payments?.find(p => p.order_id === ord.order_id) : null;
      return `
        <tr>
          <td>${l.lead_id}</td>
          <td>${ord?.order_id || 'N/A'}</td>
          <td>${l.customer_name === 'Inbound Prospect' ? '' : l.customer_name}</td>
          <td>${l.mobile}</td>
          <td>${l.event_type}</td>
          <td>${l.event_date || 'N/A'}</td>
          <td>${getLeadCurrentStatus(l)}</td>
          <td>${l.created_date}</td>
          <td>${pay ? pay.payment_status : 'Pending'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Leads Directory Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 20px; margin-bottom: 5px; color: #111; text-transform: uppercase; letter-spacing: 1px; }
            p { font-size: 11px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
            .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: right; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>LEADS DIRECTORY REPORT</h1>
          <p>Generated on ${new Date().toLocaleString('en-IN')} | Date Range: ${appliedStartDate || 'All'} to ${appliedEndDate || 'All'} | Records Count: ${filteredLeads.length}</p>
          <div className="overflow-x-auto w-full max-w-full">
<table>
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Event Type</th>
                <th>Event Date</th>
                <th>Current Status</th>
                <th>Created Date</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
</div>
          <div class="footer">Confidential Systems Report | ERP Sales Desk</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Package Management States
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null);
  const [isDeletingPackage, setIsDeletingPackage] = useState(false);
  const [deletePackageError, setDeletePackageError] = useState<string | null>(null);
  const [packageSuccessMsg, setPackageSuccessMsg] = useState<string | null>(null);
  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [viewingPkgDetails, setViewingPkgDetails] = useState<any | null>(null);
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [pkgForm, setPkgForm] = useState({
    package_name: '',
    category: 'Weddings',
    price: 0,
    status: 'Active' as 'Active' | 'Inactive',
    deliverables: '',
    team_members: '',
    seasonal_offer: '',
    terms_conditions: '',
    event_type: '',
    duration: '',
    package_includes: ''
  });
  const [pkgTeamMembers, setPkgTeamMembers] = useState<{qty: number, name: string}[]>([{ qty: 1, name: '' }]);
  const [pkgDeliverablesList, setPkgDeliverablesList] = useState<{qty: number, name: string}[]>([]);
  const [pkgDeliverableInput, setPkgDeliverableInput] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isComparingPkgs, setIsComparingPkgs] = useState(false);
  const [dbCategoryError, setDbCategoryError] = useState<string | null>(null);

  React.useEffect(() => {
    const checkCategoryColumn = async () => {
      if (!supabaseClient) return;
      try {
        const { error } = await supabaseClient.from('packages').select('category').limit(0);
        if (error && (error.code === '42703' || error.message?.toLowerCase().includes('column') || error.message?.toLowerCase().includes('does not exist'))) {
          setDbCategoryError(
            `❌ Database Schema Alert: The 'category' column is missing from the 'packages' table in Supabase. Although the app is safely resolving categories using automated description serialization, categories are not stored as a dedicated column at the database level.`
          );
        }
      } catch (e) {
        console.warn('Failed to check category column:', e);
      }
    };
    checkCategoryColumn();
  }, [packages]);

  React.useEffect(() => {
    const handleClose = () => {
      setIsAddFormOpen(false);
      setEditingPackage(null);
      setViewingPkgDetails(null);
      setShowStep2Popup(false);
      setShowLostModal(false);
      setShowEventForm(false);
      setShowConfirmModal(false);
      setShowFinalReportingModal(false);
      setShowStep3Popup(false);
    };
    window.addEventListener('close-all-popups', handleClose);
    return () => window.removeEventListener('close-all-popups', handleClose);
  }, []);

  // Group active packages directly loaded from Supabase!
  const categoriesList = React.useMemo(() => {
    const dbCats = Array.from(new Set((packages || []).map((p) => p.category))).filter(Boolean) as string[];
    const normalizedDbCats = dbCats.map(normalizeCategory);
    const normalizedPkgCats = PACKAGE_CATEGORIES.map(normalizeCategory);
    const customCats = normalizedDbCats.filter(c => !normalizedPkgCats.includes(c)).sort();
    return Array.from(new Set([...normalizedPkgCats, ...customCats]));
  }, [packages]);

  const PACKAGES_LIST = React.useMemo(() => {
    return categoriesList.map((cat) => ({
      categoryName: cat,
      items: (packages || [])
        .filter((p) => normalizeCategory(p.category) === cat && p.status === 'Active')
        .map((p) => ({
          id: p.package_id,
          name: p.package_name,
          cost: p.price,
          deliverables: p.deliverables || 'N/A',
          team_members: p.team_members || 'N/A',
          seasonal_offer: p.seasonal_offer || 'None'
        }))
    }));
  }, [categoriesList, packages]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [crmWizardStep, setCrmWizardStep] = useState<number>(1);
  const [crmHighestStep, setCrmHighestStep] = useState<number>(1);
  const [saveErrorPopup, setSaveErrorPopup] = useState<{ title: string; message: string } | null>(null);

  const appendCompletedStep = (existingRemarks: string | undefined, step: number) => {
    const cleanRemarks = (existingRemarks || '').replace(/\[CRM_COMPLETED_STEP:\s*\d+\]/g, '').trim();
    return `${cleanRemarks}\n[CRM_COMPLETED_STEP: ${step}]`.trim();
  };

  const [wizardLeadData, setWizardLeadData] = useState({
    customer_name: '',
    mobile: '',
    whatsapp_number: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    Specify_Custom_Lead_Source_Name: '',
    client_residence_address: '',
    desired_event_shoot_type: '',
    // Step 2
    event_type: '',
    custom_event_name: '',
    event_name: '',
    event_shoot_type: '',
    event_date: '',
    event_start_date: '',
    event_end_date: '',
    event_time: '',
    reporting_time: '',
    event_location: '',
    guest_pax: "" as any,
    staff_pax: "" as any,
    lead_source: '',
    shoot_type: '',
    // Step 3
    selected_package_id: '',
    package_cost: 0,
    deliverables: '',
    notes: '',
    // Step 4
    budget: 0,
    final_quoted_amount: 0,
    remarks: '',
    next_follow_up_date: '',
      // Step 5
    status: '' as CurrentStage,
    // Order Confirmed Rule fields
    confirmed_event_date: '',
    confirmed_event_time: '',
    final_amount: 0,
    advance_received: 0,
    package_price: 0,
    deliverables_description: '',
    notes_special_customizations: '',
    quotation_discount: 0,
    additional_services_cost: 0,
    total_pax: 0,
    reference_source: '',
    lead_value: 0,
    lead_score: 0,
    booking_status: 'Pending',
  });

  const [crmToast, setCrmToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showValidationError = (fieldId: string, msg: string) => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
      el.classList.add('!border-red-500', 'ring-1', '!ring-red-500');
      let msgEl = el.nextElementSibling as HTMLElement;
      if (!msgEl || !msgEl.classList.contains('validation-error-msg')) {
        msgEl = document.createElement('div');
        msgEl.className = 'validation-error-msg text-red-550 text-[10px] mt-1 font-bold animate-fade-in';
        el.parentNode?.insertBefore(msgEl, el.nextSibling);
      }
      msgEl.textContent = msg;
      
      const removeHighlight = () => {
        el.classList.remove('!border-red-500', 'ring-1', '!ring-red-500');
        if (msgEl && msgEl.parentNode) msgEl.parentNode.removeChild(msgEl);
        el.removeEventListener('input', removeHighlight);
        el.removeEventListener('change', removeHighlight);
      };
      el.addEventListener('input', removeHighlight);
      el.addEventListener('change', removeHighlight);
    } else {
      showToastMsg(msg, "error");
    }
  };

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setCrmToast({ message, type });
    setTimeout(() => setCrmToast(null), 3000);
  };

  React.useEffect(() => {
    if (crmToast) {
      const timer = setTimeout(() => {
        const el = document.getElementById('crm-toast-container') || document.getElementById('crm-create-toast-container');
        if (el) {
          const rect = el.getBoundingClientRect();
          const isInViewport = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
          );
          if (!isInViewport) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [crmToast]);

  const logStatusUpdateError = (params: {
    leadId: string | null;
    orderId: string | null;
    oldStatus: string | null;
    newStatus: string | null;
    updatePayload: any;
    insertPayload: any;
    dbResponse: any;
    fullError: any;
  }) => {
    console.group("%c CRM STATUS UPDATE ERROR LOG ", "background: #f43f5e; color: white; font-weight: bold; padding: 4px;");
    console.log("Lead ID:", params.leadId);
    console.log("Order ID:", params.orderId);
    console.log("Old Status:", params.oldStatus);
    console.log("New Status:", params.newStatus);
    console.log("Supabase UPDATE payload:", params.updatePayload);
    console.log("Supabase INSERT payload:", params.insertPayload);
    console.log("Database response:", params.dbResponse);
    console.log("Full error message:", params.fullError);
    console.groupEnd();
  };

  const parseStatusUpdateError = (errorMsg: string): { reason: string; suggestedFix: string } => {
    const msg = errorMsg.toLowerCase();
    
    let reason = errorMsg;
    let suggestedFix = "Please contact support or review the database connections and tables.";

    if (msg.includes("relation \"leads\" does not exist") || msg.includes("table name: leads\nmissing")) {
      reason = "Table 'leads' does not exist in the database schema.";
      suggestedFix = "Please ensure the 'leads' table is created in your Supabase database using the SQL editor.";
    } else if (msg.includes("relation \"lead_status_history\" does not exist") || msg.includes("relation \"public.lead_status_history\" does not exist")) {
      reason = "Table 'lead_status_history' does not exist in the database schema.";
      suggestedFix = "Create the 'lead_status_history' table in your Supabase database using: \n\nCREATE TABLE lead_status_history (\n  id SERIAL PRIMARY KEY,\n  lead_id TEXT,\n  order_id TEXT,\n  old_status TEXT,\n  new_status TEXT,\n  changed_by TEXT,\n  changed_by_role TEXT,\n  remarks TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);";
    } else if (msg.includes("column \"current_status\"") || msg.includes("column leads.current_status") || msg.includes("missing column name: current_status")) {
      reason = "Missing column \"current_status\" in table \"leads\".";
      suggestedFix = "Create the \"current_status\" column or update the database mapping using: \n\nALTER TABLE leads ADD COLUMN current_status TEXT;";
    } else if (msg.includes("column \"new_status\"") || msg.includes("column lead_status_history.new_status")) {
      reason = "Missing column \"new_status\" in table \"lead_status_history\".";
      suggestedFix = "Add the missing 'new_status' column to 'lead_status_history' table using: \n\nALTER TABLE lead_status_history ADD COLUMN new_status TEXT;";
    } else if (msg.includes("rls policy denied") || msg.includes("row-level security") || msg.includes("violates row-level security")) {
      reason = `RLS policy denied UPDATE on table "leads".`;
      suggestedFix = "Update the RLS policy to allow authenticated users to update lead records.";
    } else if (msg.includes("permission denied") || msg.includes("insufficient privilege")) {
      reason = `Permission denied by database. Details: ${errorMsg}`;
      suggestedFix = "Ensure the API client role has correct permissions (SELECT/INSERT/UPDATE) granted on the table.";
    } else if (msg.includes("not found") && msg.includes("leads")) {
      reason = `Lead ID invalid or lead record not found. Details: ${errorMsg}`;
      suggestedFix = "Verify that the Lead ID exists in the 'leads' table and has not been deleted.";
    } else if (msg.includes("lead_status_history insert failed because \"lead_id\" is null") || msg.includes("lead_id is null") || msg.includes("lead_id\" is null")) {
      reason = `"lead_status_history" insert failed because "lead_id" is NULL.`;
      suggestedFix = "Pass a valid \"lead_id\" before inserting the status history.";
    } else if (msg.includes("foreign key constraint")) {
      reason = `Foreign key constraint failed. Details: ${errorMsg}`;
      suggestedFix = "Check if the referenced records (e.g. lead_id, order_id) exist in their parent tables first.";
    } else if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
      reason = `Unique constraint violation. Details: ${errorMsg}`;
      suggestedFix = "Ensure that the record ID being inserted is unique and does not already exist.";
    } else if (msg.includes("network error") || msg.includes("failed to fetch") || msg.includes("database connection failed")) {
      reason = `Network error or failed to reach the database connection.`;
      suggestedFix = "Please check your internet connection or verify if your server/Supabase instances are active.";
    } else if (msg.includes("required field") || msg.includes("null value in column")) {
      reason = `Required database field is missing. Details: ${errorMsg}`;
      suggestedFix = "Ensure all required fields are filled and not null before submitting.";
    } else {
      const tableMatch = errorMsg.match(/table "([^"]+)"|relation "([^"]+)"/);
      const colMatch = errorMsg.match(/column "([^"]+)"/);
      if (tableMatch || colMatch) {
        const tableName = tableMatch ? (tableMatch[1] || tableMatch[2]) : "unknown table";
        const colName = colMatch ? colMatch[1] : "";
        reason = `Database operation failed on table "${tableName}"` + (colName ? ` for column "${colName}".` : ".");
        suggestedFix = `Verify the schema of "${tableName}" table. If "${colName}" column is missing, add it using ALTER TABLE ${tableName} ADD COLUMN ${colName} TEXT;`;
      }
    }

    return { reason, suggestedFix };
  };


  const [statusError, setStatusError] = useState<{ title: string; reason: string; suggestedFix: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalLeadId, setNoteModalLeadId] = useState("");
  const [noteModalOrderId, setNoteModalOrderId] = useState("");
  const [noteModalCustomerName, setNoteModalCustomerName] = useState("");

  const [unlockingRecordId, setUnlockingRecordId] = useState<string | null>(null);
  const [unlockReason, setUnlockReason] = useState('Data Correction');
  const [unlockCustomReason, setUnlockCustomReason] = useState('');

  // Step 2 and Step 3 Follow-up states
  const [showStep2Popup, setShowStep2Popup] = useState(false);
  const [step2FollowUpDate, setStep2FollowUpDate] = useState('');
  const [step2FollowUpNotes, setStep2FollowUpNotes] = useState('');

  const [step3FollowUpDate, setStep3FollowUpDate] = useState('');
  const [step3FollowUpTime, setStep3FollowUpTime] = useState('');
  const [step3FollowUpNotes, setStep3FollowUpNotes] = useState('');

  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('Price too high');
  const [lostNotes, setLostNotes] = useState('');
  const [otherLostReason, setOtherLostReason] = useState('');
  
  // Unlock Request State
  const [showUnlockRequestModal, setShowUnlockRequestModal] = useState(false);
  const [unlockRequestReason, setUnlockRequestReason] = useState('Customer requested additional discount');
  const [unlockRequestCustomReason, setUnlockRequestCustomReason] = useState('');
  const [selectedUnlockLead, setSelectedUnlockLead] = useState<Lead | null>(null);

  // Helper function to resolve Lost Reason and Notes strictly and cleanly from fields
  const getStrictLostReasonAndNotes = (lead: Lead | null) => {
    if (!lead) return { reason: '', notes: '' };

    let rawReason = (lead.Lost_Reason || (lead as any).lost_reason || (lead as any).LostReason || (lead as any).lostReason || '').trim();
    let rawNotes = (lead.Lost_Notes || (lead as any).lost_notes || (lead as any).LostNotes || (lead as any).lostNotes || '').trim();

    // Check if string contains internal generated activity/update text or metadata
    const isDirty = (str: string) => {
      if (!str) return false;
      return /\[Update|\bNeg Notes:|\bNext follow-up:|\bWhatsApp:|^Lost Reason:/i.test(str);
    };

    let cleanReason = rawReason;
    let cleanNotes = rawNotes;

    const parseComposite = (text: string) => {
      let r = '';
      let n = '';
      if (!text) return { r, n };

      // Pattern 1: "Lost Reason: <reason>. Notes: <notes>"
      const explicitMatch = text.match(/Lost Reason:\s*([^.\n]+?)(?:\.\s*Notes:\s*([\s\S]*?))?(?=\n\[Update|\n\[Time|\[CRM_COMPLETED_STEP|$)/i);
      if (explicitMatch) {
        if (explicitMatch[1]) r = explicitMatch[1].trim();
        if (explicitMatch[2]) n = explicitMatch[2].trim();
      }

      // Pattern 2: "[Update YYYY-MM-DD]: <reason>. Neg Notes: <notes>. Next follow-up:"
      if (!r) {
        const updateMatch = text.match(/\[Update[^\]]*\]:\s*([^.]+?)(?:\.\s*(?:Neg Notes|Notes):\s*([\s\S]*?))?(?:\.\s*Next follow-up:|$|\n)/i);
        if (updateMatch) {
          if (updateMatch[1]) r = updateMatch[1].trim();
          if (updateMatch[2]) n = updateMatch[2].trim();
        }
      }

      // Standalone notes match
      if (!n) {
        const negMatch = text.match(/(?:Neg Notes|Notes):\s*([^.\n]+?)(?:\.\s*Next follow-up:|$|\n)/i);
        if (negMatch && negMatch[1]) {
          n = negMatch[1].trim();
        }
      }
      return { r, n };
    };

    if (isDirty(cleanReason)) {
      const parsed = parseComposite(cleanReason);
      if (parsed.r) cleanReason = parsed.r;
      if (parsed.n && !cleanNotes) cleanNotes = parsed.n;
    }

    if (isDirty(cleanNotes)) {
      const parsed = parseComposite(cleanNotes);
      if (parsed.n) cleanNotes = parsed.n;
      else {
        cleanNotes = cleanNotes
          .replace(/^Neg Notes:\s*/i, '')
          .replace(/\.?\s*Next follow-up:.*$/i, '')
          .replace(/^Notes:\s*/i, '')
          .trim();
      }
    }

    // If reason is still empty or dirty, check remarks field
    if ((!cleanReason || cleanReason === 'N/A' || cleanReason === 'NULL' || isDirty(cleanReason)) && lead.remarks) {
      const parsed = parseComposite(lead.remarks);
      if (parsed.r) cleanReason = parsed.r;
      if (parsed.n && !cleanNotes) cleanNotes = parsed.n;
    }

    // Final clean-up of any stray prefix/suffix
    cleanReason = cleanReason
      .replace(/^WhatsApp:\s*\d+\s*/i, '')
      .replace(/^\[Update[^\]]*\]:\s*/i, '')
      .replace(/\.?\s*Neg Notes:.*$/i, '')
      .replace(/\.?\s*Next follow-up:.*$/i, '')
      .replace(/[,;]+$/, '')
      .trim();

    cleanNotes = cleanNotes
      .replace(/\.?\s*Next follow-up:.*$/i, '')
      .replace(/^Neg Notes:\s*/i, '')
      .replace(/^Notes:\s*/i, '')
      .replace(/[,;]+$/, '')
      .trim();

    return {
      reason: cleanReason || 'No reason provided.',
      notes: cleanNotes || ''
    };
  };

  // Helper function to resolve Lost Reason and Notes
  const getLostReasonAndNotes = (lead: Lead | null, _historyList?: any[]) => {
    return getStrictLostReasonAndNotes(lead);
  };

  const [showCancelConfirmPopup, setShowCancelConfirmPopup] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    reason: string;
    source?: string;
    failedFunction?: string;
    database?: string;
    leadId?: string;
    suggestedFix?: string;
    stack?: string;
  } | null>(null);

  const showErrorHelper = (title: string, reason: string, failedFunction: string, leadId: string, suggestedFix: string, err?: any) => {
    console.error(`❌ ${title}\nReason: ${reason}\nFunction: ${failedFunction}\n`, err);
    setErrorDetails({
      title,
      reason: err?.message || reason,
      source: 'SalesModule.tsx',
      failedFunction,
      database: 'quotations / leads',
      leadId,
      suggestedFix,
      stack: err?.stack || ''
    });
  };

  const isLeadConfirmed = selectedLead
    ? (['Confirm Order', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Closed'].includes(selectedLead.status || '') ||
       (selectedLead as any).current_status === 'Order Confirmed' ||
       (selectedLead as any).booking_status === 'Confirmed' ||
       getLeadCurrentStatus(selectedLead) === 'Order Confirmed' ||
       ['Operations', 'Production', 'Post-Production', 'Completed'].includes(getLeadCurrentStage(selectedLead)) ||
       (orders && orders.some(o => o.lead_id === selectedLead.lead_id && o.status !== 'Cancelled')))
    : false;

  const isApprovedUnlocked = selectedLead
    ? (selectedLead.quotation_locked === false ||
       unlockRequests.some(r => {
         const matchesLead = r.lead_id === selectedLead.lead_id || r.order_id === selectedLead.lead_id || r.project_id === selectedLead.lead_id;
         const matchesOrder = orders && orders.some(o => o.lead_id === selectedLead.lead_id && (o.order_id === r.order_id || o.order_id === r.lead_id));
         const matchesLeadOrderId = (selectedLead as any).order_id && (r.order_id === (selectedLead as any).order_id || r.lead_id === (selectedLead as any).order_id);
         const isApproved = r.status === 'Approved' || r.request_status === 'Approved';
         return (matchesLead || matchesOrder || matchesLeadOrderId) && isApproved;
       })) && selectedLead.quotation_locked !== true
    : false;

  const isCrmLocked = false;
  const isLeadLocked = false;
  const isLeadLost = Boolean(
    selectedLead && ['Lost Lead', 'Lead Lost', 'Lost'].includes(
      selectedLead.status || (selectedLead as any).current_status || wizardLeadData.status || ''
    )
  );

  // No longer locking steps so Sales can update/add required services
  const isStep1Locked = false;
  const isStep2Locked = false;
  const isStep3Locked = false;

  const [openDropdownLeadId, setOpenDropdownLeadId] = useState<string | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number | string, right: number | string, bottom: number | string }>({ top: 0, right: 0, bottom: 'auto' });

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.actions-dropdown-container') && !target.closest('.actions-dropdown-menu')) {
        setOpenDropdownLeadId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Repeat Customer / Reorder System states
  const [detectedCustomer, setDetectedCustomer] = useState<any>(null);
  const [showDetectionPopup, setShowDetectionPopup] = useState(false);
  const [isQuickReorderView, setIsQuickReorderView] = useState(false);
  
  // Custom states for configuring quick reorder
  const [reorderForm, setReorderForm] = useState({
    event_type: '',
    custom_event_name: '',
    custom_event_type: '',
    event_date: '',
    event_time: '12:00',
    event_location: '',
    package_name: '',
    quotation_amount: 0,
    advance_received: 0,
  });

  // Customer Profiles sub-tab states
  const [selectedCustomerProfileId, setSelectedCustomerProfileId] = useState<string | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Filter & Collapse States
  const [filterQuery, setFilterQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
  const [isDownloadReportsExpanded, setIsDownloadReportsExpanded] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSalesPerson, setFilterSalesPerson] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');

  // Extra state for "Other" lead source name input
  const [otherSource, setOtherSource] = useState('');

  // Screen 2 Form State (Wizard support)
  const [createForm, setCreateForm] = useState<{
    customer_name: string;
    mobile: string;
    alternate_mobile: string;
    email: string;
    lead_source: string;
    event_type: string;
    custom_event_name: string;
    event_name: string;
    event_shoot_type: string;
    event_date: string;
    event_start_date: string;
    event_end_date: string;
    event_time: string;
    event_location: string;
    guest_pax: number | '';
    staff_pax: number | '';
    budget: number | '';
    remarks: string;
    whatsapp_number: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    client_residence_address: string;
    desired_event_shoot_type: string;
    Select_Package_Option: string;
    total_pax: number | '';
    reference_source: string;
    lead_value: number | '';
    lead_score: number | '';
    booking_status: string;
  }>({
    customer_name: '',
    mobile: '',
    alternate_mobile: '',
    email: '',
    lead_source: '',
    event_type: '',
    custom_event_name: '',
    event_name: '',
    event_shoot_type: '',
    event_date: '',
    event_start_date: '',
    event_end_date: '',
    event_time: '',
    event_location: '',
    guest_pax: "" as any,
    staff_pax: "" as any,
    budget: '',
    remarks: '',
    whatsapp_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    Specify_Custom_Lead_Source_Name: '',
    client_residence_address: '',
    desired_event_shoot_type: '',
    Select_Package_Option: '',
    total_pax: '',
    reference_source: '',
    lead_score: '',
    booking_status: '',
  });

  const [createEvents, setCreateEvents] = useState<LeadEvent[]>([]);
  const [crmEvents, setCrmEvents] = useState<LeadEvent[]>([]);
  const [collapsedEventIds, setCollapsedEventIds] = useState<Record<string, boolean>>({});
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState<Omit<LeadEvent, 'id'>>({
    event_type: '',
    event_name: '',
    event_shoot_type: '',
    event_date: '',
    event_start_time: '',
    event_end_time: '',
    event_location: '',
    google_maps_link: '',
    guest_pax: "" as any,
    staff_pax: "" as any,
    event_start_date: '',
    event_end_date: ''
  });

  const [wizardStep, setWizardStep] = useState(1);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);

  // Package customizations
  const [pkgPrices, setPkgPrices] = useState<Record<string, number>>({});
  const [pkgDeliverables, setPkgDeliverables] = useState<Record<string, string>>({});
  const [pkgNotes, setPkgNotes] = useState<Record<string, string>>({});

  // Additional form fields for Steps 4 & 5
  const [reportingTime, setReportingTime] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [salesStatus, setSalesStatus] = useState<string>('');

  // Order Confirmed Additional mandatory fields
  const [confirmedEventDate, setConfirmedEventDate] = useState('');
  const [confirmedEventTime, setConfirmedEventTime] = useState('');
  const [finalPackageAmount, setFinalPackageAmount] = useState<number | ''>('');
  const [advanceReceived, setAdvanceReceived] = useState<number | ''>('');

  const resetForm = () => {
    setCreateForm({
      customer_name: '',
      mobile: '',
      alternate_mobile: '',
      email: '',
      lead_source: '',
      event_type: '',
      custom_event_name: '',
      event_name: '',
      event_shoot_type: '',
      event_date: '',
      event_start_date: '',
      event_end_date: '',
      event_time: '',
      event_location: '',
      guest_pax: "" as any,
      staff_pax: "" as any,
      budget: '',
      remarks: '',
      whatsapp_number: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
    Specify_Custom_Lead_Source_Name: '',
      client_residence_address: '',
      desired_event_shoot_type: '',
      Select_Package_Option: '',
      total_pax: '',
      reference_source: '',
      lead_value: '',
      lead_score: '',
      booking_status: '',
    });
    setCreateEvents([]);
    setWizardLeadData({
      customer_name: '',
      mobile: '',
      whatsapp_number: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
    Specify_Custom_Lead_Source_Name: '',
      client_residence_address: '',
      desired_event_shoot_type: '',
      event_type: '',
      custom_event_name: '',
      event_name: '',
      event_shoot_type: '',
      event_date: '',
      event_start_date: '',
      event_end_date: '',
      event_time: '',
      reporting_time: '',
      event_location: '',
      guest_pax: "" as any,
      staff_pax: "" as any,
      lead_source: '',
      shoot_type: '',
      selected_package_id: '',
      package_cost: 0,
      deliverables: '',
      notes: '',
      budget: 0,
      final_quoted_amount: 0,
      remarks: '',
      next_follow_up_date: '',
      status: '' as CurrentStage,
      confirmed_event_date: '',
      confirmed_event_time: '',
      final_amount: 0,
      advance_received: 0,
      package_price: 0,
      deliverables_description: '',
      notes_special_customizations: '',
      quotation_discount: 0,
      additional_services_cost: 0,
      total_pax: 0,
      reference_source: '',
      lead_value: 0,
      lead_score: 0,
      booking_status: 'Pending',
    });
    setOtherSource('');
    setSelectedPkgIds([]);
    setLeadDiscount('');
    setIsPkgDropdownOpen(false);
    
    // Reset wizard fields
    setWizardStep(1);
    setCrmWizardStep(1);
    setCreatedLeadId(null);
    setPkgPrices({});
    setPkgDeliverables({});
    setPkgNotes({});
    setReportingTime('');
    setInternalNotes('');
    setFollowUpDate('');
    setSalesStatus('');
    setConfirmedEventDate('');
    setConfirmedEventTime('');
    setFinalPackageAmount('');
    setAdvanceReceived('');
    setQuoteDiscount('');
    setQuoteAdditional('');
    
    setFollowUpForm({
      status: '',
      quotation_amount: '',
      advance_received: '',
      call_notes: ''
    });
    setConfirmForm({
      package_name: '',
      quotation_amount: '',
      advance_received: '',
      event_date: '',
      event_time: ''
    });
    setEventForm({
      event_type: '',
      event_name: '',
      event_shoot_type: '',
      event_date: '',
      event_start_time: '',
      event_end_time: '',
      event_location: '',
      google_maps_link: '',
      guest_pax: "" as any,
      staff_pax: "" as any,
      event_start_date: '',
      event_end_date: ''
    });
    setShowEventForm(false);
    setEditingEventId(null);
    setCollapsedEventIds({});
    setShowConfirmModal(false);
    setGeneratedPDFBlobUrl('');
    setActiveQuoteNum('');
    setEditableInclusions({});
    setEditableDeliverables({});
    setQuoteServices([]);
    setEditingServiceId(null);
    setNewServiceName('');
    setNewServiceQty(1);
    setNewServicePrice(0);
    setIsAddingInline(false);
    setStatusError(null);
    setUnlockingRecordId(null);
    setPkgSearchQuery('');

    // Clear cached quote services
    localStorage.removeItem('erp_quote_services_create');
  };

  // Action hook to reset state, auto-scroll and auto-focus when transitioning to 'create' tab
  React.useEffect(() => {
    if (activeTab === 'create') {
      resetForm();

      setTimeout(() => {
        const titleEl = document.getElementById('create_lead_form_heading');
        if (titleEl) {
          titleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          const formEl = document.querySelector('form');
          if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        const firstInput = document.querySelector('input[placeholder*="Enter customer name"]') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, 150);
    }
  }, [activeTab]);

  // Packages creation hooks
  const [selectedPkgIds, setSelectedPkgIds] = useState<string[]>([]);
  const [leadDiscount, setLeadDiscount] = useState<number>(0);
  const [isPkgDropdownOpen, setIsPkgDropdownOpen] = useState(false);
  const [pkgSearchQuery, setPkgSearchQuery] = useState('');

  // Auto calculate and sync with createForm.budget
  const selectedPkgs = PACKAGES_LIST.flatMap(cat => cat.items).filter(item => selectedPkgIds.includes(item.id));
  
  // Package Selection Price is editable, so subtotal sums the edited prices
  const subtotal = selectedPkgs.reduce((sum, item) => sum + (pkgPrices[item.id] !== undefined ? pkgPrices[item.id] : item.cost), 0);
  const finalTotal = Math.max(0, subtotal - leadDiscount);

  // Sync package configurations on changes
  React.useEffect(() => {
    const allPkgs = PACKAGES_LIST.flatMap(cat => cat.items);
    const newPrices = { ...pkgPrices };
    const newDeliverables = { ...pkgDeliverables };
    const newNotes = { ...pkgNotes };
    let changed = false;

    selectedPkgIds.forEach(id => {
      const p = allPkgs.find(item => item.id === id);
      if (p) {
        if (newPrices[id] === undefined) {
          newPrices[id] = p.cost;
          changed = true;
        }
        if (newDeliverables[id] === undefined) {
          newDeliverables[id] = p.deliverables || 'N/A';
          changed = true;
        }
        if (newNotes[id] === undefined) {
          newNotes[id] = p.seasonal_offer !== 'None' ? `Offers: ${p.seasonal_offer}` : '';
          changed = true;
        }
      }
    });

    // Remove unselected package keys
    Object.keys(newPrices).forEach(id => {
      if (!selectedPkgIds.includes(id)) {
        delete newPrices[id];
        delete newDeliverables[id];
        delete newNotes[id];
        changed = true;
      }
    });

    if (changed) {
      setPkgPrices(newPrices);
      setPkgDeliverables(newDeliverables);
      setPkgNotes(newNotes);
    }
  }, [selectedPkgIds, PACKAGES_LIST]);

  React.useEffect(() => {
    // Only auto-override if packages are actively selected
    if (selectedPkgIds.length > 0) {
      setCreateForm(prev => ({
        ...prev,
        budget: finalTotal,
        Select_Package_Option: selectedPkgIds[0] || ''
      }));
    } else {
      setCreateForm(prev => ({
        ...prev,
        Select_Package_Option: ''
      }));
    }
  }, [finalTotal, selectedPkgIds]);

  // Body scroll lock effect when Create Lead modal is open (REMOVED to allow scrolling on smaller screens)
  React.useEffect(() => {
    // Body scroll lock removed to fix scrolling issues on smaller screens.
  }, [activeTab]);

  // Screen 3 Follow-Up Form State
  const [followUpForm, setFollowUpForm] = useState({
    call_notes: '',
    next_follow_up_date: '',
    status: 'Quote Follow-up' as CurrentStage,
    quotation_amount: 3500,
    negotiation_notes: '',
    event_date: '',
    event_time: '',
    reporting_time: '08:00',
    advance_received: 0,
    payment_mode: 'UPI',
    transaction_id: '',
  });

  // Confirm Order Form State & Auto-scroll Ref
  const confirmBookingModalRef = useRef<HTMLDivElement | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCustomerInfoExpanded, setIsCustomerInfoExpanded] = useState(true);

  // Auto-scroll to Booking Confirmation modal & manage scroll locking smoothly
  useEffect(() => {
    if (showConfirmModal) {
      // 1. Prevent background dashboard scrolling while modal is active
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // 2. Smoothly scroll the viewport to ensure the modal is immediately visible and centered
      const timer = setTimeout(() => {
        if (confirmBookingModalRef.current) {
          confirmBookingModalRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showConfirmModal]);
  const [confirmForm, setConfirmForm] = useState({
    package_name: '',
    quotation_amount: '',
    advance_received: '',
    event_date: '',
    event_time: ''
  });

  const [validationError, setValidationError] = useState('');
  
  // Custom Quotation PDF Generation States
  const [showStep3Popup, setShowStep3Popup] = useState(false);
  const [generatedPDFBlobUrl, setGeneratedPDFBlobUrl] = useState<string | null>(null);
  const [quoteDiscount, setQuoteDiscount] = useState<number | ''>('');
  const [quoteAdditional, setQuoteAdditional] = useState<number | ''>('');
  const [activeQuoteNum, setActiveQuoteNum] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [editableInclusions, setEditableInclusions] = useState<Record<string, string>>({});
  const [editableDeliverables, setEditableDeliverables] = useState<Record<string, string>>({});

  const [quoteServices, setQuoteServices] = useState<QuotationService[]>([]);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceQty, setNewServiceQty] = useState<number>(1);
  const [newServicePrice, setNewServicePrice] = useState<number>(0);
  const [isAddingInline, setIsAddingInline] = useState(false);

  React.useEffect(() => {
    if (activeTab === 'create') {
      const cached = localStorage.getItem('erp_quote_services_create');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setQuoteServices(parsed);
          }
        } catch(e) {}
      } else {
        setQuoteServices([]);
      }
    } else if (activeTab === 'list' && selectedLead && showStep3Popup) {
      const cached = localStorage.getItem(`erp_quote_services_${selectedLead.lead_id}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setQuoteServices(parsed);
          }
        } catch(e) {}
      } else if ((selectedLead as any).quotations && (selectedLead as any).quotations.length > 0) {
        const latestQ = (selectedLead as any).quotations[(selectedLead as any).quotations.length - 1];
        if (latestQ.services && Array.isArray(latestQ.services)) {
           setQuoteServices(latestQ.services);
        } else if (latestQ.deliverables_json) {
           try {
             const parsed = JSON.parse(latestQ.deliverables_json);
             const fallbackServices = parsed.map((d: any, idx: number) => ({
               id: `gen-${idx}`,
               name: d.name,
               qty: d.qty || 1,
               price: 0
             }));
             setQuoteServices(fallbackServices);
           } catch(e) {}
        }
      }
    }
  }, [activeTab, selectedLead, showStep3Popup]);

  // Lead Details Modal State
  const [showLeadDetails, setShowLeadDetails] = useState(false);

  // Status Filter State
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  
  React.useEffect(() => {
    const statuses = Array.from(new Set(leads.map(getLeadCurrentStatus)));
    setStatusOptions(['All', ...statuses]);
  }, [leads, getLeadCurrentStatus]);

  // Derived Values
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => getLeadCurrentStage(l) === 'New Lead').length;
  const hotLeads = leads.filter(l => getLeadCurrentStage(l) === 'Hot Lead').length;
  const quoteFollowUp = leads.filter(l => getLeadCurrentStage(l) === 'Quote Follow-up').length;
  const quotationsSent = leads.filter(l => getLeadCurrentStage(l) === 'Quote Sent').length;
  
  const leadStageDistribution = {
    new: leads.filter(l => getLeadCurrentStage(l) === 'New Lead').length,
    hot: leads.filter(l => getLeadCurrentStage(l) === 'Hot Lead').length,
    quote: leads.filter(l => getLeadCurrentStage(l) === 'Quote Sent' || getLeadCurrentStage(l) === 'Quote Follow-up').length,
    converted: leads.filter(l => getLeadCurrentStatus(l) === 'Order Confirmed').length,
    lost: leads.filter(l => getLeadCurrentStatus(l) === 'Lost').length
  };

  const filteredLeads = leads
    .filter(l => {
      const q = filterQuery.toLowerCase();
      
      const combinedSearchString = [
        l.lead_id,
        l.customer_name,
        l.mobile,
        l.whatsapp_number,
        l.email,
        l.event_type,
        l.event_name,
        l.custom_event_name,
        getLeadCurrentStage(l),
        getLeadCurrentStatus(l),
        l.lead_source,
        l.sales_person,
        l.reference_source,
        l.address,
        l.city,
        l.client_residence_address
      ].filter(Boolean).join(" ").toLowerCase();

      return combinedSearchString.includes(q);
    })
    .filter(l => {
      if (!filterSource) return true;
      return l.lead_source === filterSource || l.reference_source === filterSource;
    })
    .filter(l => {
      if (!filterStatus || filterStatus === 'All') return true;
      return getLeadCurrentStatus(l) === filterStatus;
    })
    .filter(l => {
      if (!filterSalesPerson || filterSalesPerson === 'All') return true;
      return l.sales_person === filterSalesPerson;
    })
    .filter(l => {
      if (!appliedStartDate || !appliedEndDate) return true;
      
      const createdDateStr = String(l.created_date).split(' ')[0]; // Gets YYYY-MM-DD
      const start = new Date(appliedStartDate);
      const end = new Date(appliedEndDate);
      const target = new Date(createdDateStr);
      
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      
      // Strict range match
      return target >= start && target <= end;
    })
    .sort((a, b) => {
      const aDate = new Date(a.created_date).getTime();
      const bDate = new Date(b.created_date).getTime();
      return sortOrder === 'latest' ? bDate - aDate : aDate - bDate;
    });

  const getSubtotal = () => quoteServices.reduce((sum, s) => sum + (s.price * s.qty), 0);
  const getGrandTotal = () => Math.max(0, getSubtotal() - Number(quoteDiscount || 0) + Number(quoteAdditional || 0));

  // Package Selection & Comparison Handlers
  const togglePackageSelection = (pkgId: string) => {
    setSelectedPkgIds(prev => 
      prev.includes(pkgId) ? prev.filter(id => id !== pkgId) : [...prev, pkgId]
    );
  };

  const handlePriceChange = (pkgId: string, val: string) => {
    const num = parseInt(val.replace(/\D/g, '')) || 0;
    setPkgPrices(prev => ({ ...prev, [pkgId]: num }));
  };

  const handleDeliverableChange = (pkgId: string, val: string) => {
    setPkgDeliverables(prev => ({ ...prev, [pkgId]: val }));
  };

  const handleNotesChange = (pkgId: string, val: string) => {
    setPkgNotes(prev => ({ ...prev, [pkgId]: val }));
  };
  
  const validateCreateForm = () => {
    if (!createForm.customer_name.trim()) return "Customer Name is required";
    if (!createForm.mobile.trim()) return "Mobile Number is required";
    if (!createForm.event_type) return "Event Type is required";
    if (createForm.event_type === 'Other' && !createForm.custom_event_name.trim()) return "Please specify the custom event name";
    if (!createForm.lead_source) return "Lead Source is required";
    if (createForm.lead_source === 'Other' && !otherSource.trim()) return "Please specify the lead source";
    return null;
  };

  const handleNextStep = () => {
    if (wizardStep === 1) {
      const error = validateCreateForm();
      if (error) {
        showValidationError('customer_name', error);
        return;
      }
    }
    setWizardStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setWizardStep(prev => Math.max(1, prev - 1));
  };
  
  const handleWizardSubmit = async (finalDataOverride?: any) => {
    try {
      if (wizardStep === 1) {
        const error = validateCreateForm();
        if (error) {
          showValidationError('customer_name', error);
          return;
        }
      }

      setIsSaving(true);
      const dataToSave = finalDataOverride || createForm;

      // Extract events
      const hasEvents = createEvents.length > 0;

      const baseLeadData: Partial<Lead> = {
        customer_name: dataToSave.customer_name,
        mobile: dataToSave.mobile,
        alternate_mobile: dataToSave.alternate_mobile,
        email: dataToSave.email,
        lead_source: dataToSave.lead_source === 'Other' ? otherSource : dataToSave.lead_source,
        event_type: hasEvents ? 'Multiple Events' : dataToSave.event_type,
        custom_event_name: dataToSave.custom_event_name,
        event_name: hasEvents ? 'Multiple Events' : dataToSave.event_name,
        // event_shoot_type: dataToSave.event_shoot_type,
        event_date: hasEvents ? createEvents[0]?.event_date : dataToSave.event_date,
        // event_start_date: hasEvents ? createEvents[0]?.event_date : dataToSave.event_date,
        event_time: hasEvents ? createEvents[0]?.event_start_time : dataToSave.event_time,
        event_location: hasEvents ? createEvents[0]?.event_location : dataToSave.event_location,
        guest_pax: hasEvents ? createEvents[0]?.guest_pax : dataToSave.guest_pax,
        staff_pax: hasEvents ? createEvents[0]?.staff_pax : dataToSave.staff_pax,
        budget: dataToSave.budget ? Number(dataToSave.budget) : 0,
        remarks: dataToSave.remarks,
        whatsapp_number: dataToSave.whatsapp_number || dataToSave.mobile,
        address: dataToSave.address,
        city: dataToSave.city,
        state: dataToSave.state,
        pincode: dataToSave.pincode,
        client_residence_address: dataToSave.client_residence_address,
        desired_event_shoot_type: dataToSave.desired_event_shoot_type,
        total_pax: dataToSave.total_pax ? Number(dataToSave.total_pax) : 0,
        reference_source: dataToSave.reference_source,
        lead_value: dataToSave.lead_value ? Number(dataToSave.lead_value) : 0,
        lead_score: dataToSave.lead_score ? Number(dataToSave.lead_score) : 0,
        booking_status: 'Pending',
        current_status: 'New Lead',
        sales_person: currentUser?.name || 'System',
        sales_staff_id: currentUser?.id || 'system_id',
        created_date: new Date().toISOString()
      };

      const customId = `L-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      const leadPayload = {
        ...baseLeadData,
        lead_id: customId,
        events: hasEvents ? createEvents : [{
          id: `evt-${Date.now()}`,
          event_type: dataToSave.event_type,
          event_name: dataToSave.event_name,
          // event_shoot_type: dataToSave.event_shoot_type,
          event_date: dataToSave.event_date,
          event_start_date: dataToSave.event_date,
          event_end_date: dataToSave.event_end_date,
          event_start_time: dataToSave.event_time,
          event_location: dataToSave.event_location,
          guest_pax: dataToSave.guest_pax,
          staff_pax: dataToSave.staff_pax
        }]
      };

      const result = await addLead(leadPayload as Omit<Lead, 'id'>);
      
      if (result?.success) {
        setCreatedLeadId(result.lead.lead_id);
        if (selectedPkgIds.length > 0) {
          const lpPayloads = selectedPkgIds.map(pkgId => ({
            lead_id: result.lead.lead_id,
            package_id: pkgId,
            custom_price: pkgPrices[pkgId] || 0,
            custom_deliverables: pkgDeliverables[pkgId] || '',
            custom_notes: pkgNotes[pkgId] || ''
          }));
          await saveLeadPackages(result.lead.lead_id, lpPayloads);
        }

        const historyPayload = {
          lead_id: result.lead.lead_id,
          order_id: null,
          old_status: 'New Lead',
          new_status: 'New Lead',
          changed_by: currentUser?.name || 'System',
          changed_by_role: currentRole,
          remarks: 'Lead Created'
        };
        
        await supabaseClient.from('lead_status_history').insert([historyPayload]).select();
        
        addNotification({
          title: 'New Lead Created',
          message: `Lead ${result.lead.lead_id} for ${result.lead.customer_name} added.`,
          type: 'info'
        });

        // Add creation note (without duplicating step complete marker)
        if (dataToSave.remarks) {
            const cleanRemarks = dataToSave.remarks;
            await supabaseClient.from('lead_notes').insert([{
                lead_id: result.lead.lead_id,
                order_id: null,
                sales_person_name: currentUser?.name || 'System',
                note_text: cleanRemarks,
                customer_name: result.lead.customer_name,
                user_id: currentUser?.id
            }]);
        }

        showToastMsg(`Lead ${result.lead.lead_id} created successfully!`, 'success');
        setWizardStep(4);
      } else {
        throw new Error(result?.error || 'Failed to save lead');
      }
    } catch (err: any) {
      console.error("Error submitting lead:", err);
      showToastMsg(`Error creating lead: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const finalizeLeadCreation = () => {
    resetForm();
    setActiveTab('list');
    setWizardStep(1);
    setCreatedLeadId(null);
  };
  
  // Custom Quotation Builder Functions
  const generateQuotationNumber = () => {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `QT-${yy}${mm}${dd}-${random}`;
  };

  // Build the complete Quotation PDF structure
  const handleGeneratePDF = async () => {
    if (!selectedLead) return;
    setIsGeneratingPDF(true);

    try {
      if (!logoBase64) {
        throw new Error("Logo image not loaded yet. Please wait a moment and try again.");
      }

      // Calculate totals based on the dynamic quoteServices array
      const subTotal = getSubtotal();
      const grandTotal = getGrandTotal();

      const qtNum = activeQuoteNum || generateQuotationNumber();
      setActiveQuoteNum(qtNum);
      
      const termsConditions = "1. 50% advance payment required to confirm booking.\n2. Remaining 50% on the day of the event.\n3. Customizations may incur additional charges.";
      const doc = generateQuotationPDF(
        selectedLead,
        [],
        qtNum,
        termsConditions,
        logoBase64,
        logoAspectRatio,
        undefined,
        undefined,
        Number(quoteDiscount || 0),
        Number(quoteAdditional || 0),
        quoteServices
      );

      // Output PDF as Blob URI for iframe preview
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setGeneratedPDFBlobUrl(blobUrl);

    } catch (err: any) {
      console.error("Error generating PDF:", err);
      showErrorHelper(
        "PDF Generation Failed",
        err.message || "Failed to generate PDF Document",
        "handleGeneratePDF",
        selectedLead.lead_id,
        "Check console for specific PDF generation errors."
      );
      showToastMsg(`Failed to generate PDF: ${err.message}`, 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Convert blob URL to File and Upload
  const handleFinalizeAndSendQuote = async () => {
    if (!selectedLead || !generatedPDFBlobUrl) return;
    setIsSaving(true);
    
    try {
      // 1. Fetch blob from generated URL
      const response = await fetch(generatedPDFBlobUrl);
      const blob = await response.blob();
      
      // 2. Format proper filename
      const qtNum = activeQuoteNum;
      const fileName = generateQuotationPdfFileName(selectedLead);
      
      // 3. Upload to Supabase Storage
      const { data: storageData, error: storageError } = await supabaseClient.storage
        .from('documents')
        .upload(`quotations/${selectedLead.lead_id}/${fileName}`, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf'
        });

      if (storageError) {
        throw new Error(`Storage upload failed: ${storageError.message}`);
      }

      // 4. Get Public URL
      const { data: { publicUrl } } = supabaseClient.storage
        .from('documents')
        .getPublicUrl(`quotations/${selectedLead.lead_id}/${fileName}`);
        
      // 5. Serialize complex deliverables map back to flat JSON array (required format for old records)
      const flatDeliverables = quoteServices.map(s => ({ name: s.name, qty: s.qty, price: s.price }));
      const serializedJson = JSON.stringify(flatDeliverables);

      // 6. Save Quotation Record to database
      const quotePayload = {
        lead_id: selectedLead.lead_id,
        quotation_number: qtNum,
        file_url: publicUrl,
        file_name: fileName,
        total_amount: getGrandTotal(),
        status: 'Sent',
        generated_by: currentUser?.name || 'System',
        version: 1, // Calculate dynamic version based on existing length later
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        discount_amount: Number(quoteDiscount || 0),
        additional_charges: Number(quoteAdditional || 0),
        deliverables_json: serializedJson,
        services: quoteServices // Save dynamic structure
      };

      const result = await addQuotation(quotePayload as any);
      
      if (result.success) {
        // 7. Update lead status if needed
        if (selectedLead.status === 'New Lead') {
          await updateLeadFollowUp(selectedLead.lead_id, 'Quote Sent', '');
          // Status History
          const historyPayload = {
            lead_id: selectedLead.lead_id,
            order_id: null,
            old_status: 'New Lead',
            new_status: 'Quote Sent',
            changed_by: currentUser?.name || 'System',
            changed_by_role: currentRole,
            remarks: `System: Status updated to Quote Sent. Quotation ${qtNum} generated and sent.`
          };
          await supabaseClient.from('lead_status_history').insert([historyPayload]);
        }
        
        // Final success state
        addNotification({
          title: 'Quotation Sent',
          message: `Quotation ${qtNum} for ${selectedLead.customer_name} has been generated and saved.`,
          type: 'success'
        });
        
        showToastMsg(`Quotation successfully generated and attached to Lead ${selectedLead.lead_id}`, 'success');
        
        // Clean up UI state
        setGeneratedPDFBlobUrl('');
        setShowStep3Popup(false);
        setCrmWizardStep(4); // Move to negotiation step
        
        // Force refresh data
        window.dispatchEvent(new Event('refresh-leads'));
      } else {
        throw new Error(result.error || 'Failed to save quotation record');
      }

    } catch (err: any) {
      console.error("Error finalizing quote:", err);
      showErrorHelper(
        "Finalize Quote Failed",
        err.message || "Failed to finalize and save quotation",
        "handleFinalizeAndSendQuote",
        selectedLead.lead_id,
        "Check storage permissions and database constraints."
      );
      showToastMsg(`Error finalizing quote: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateFollowUp = async () => {
    if (!selectedLead) return;
    setIsSaving(true);
    setStatusError(null);

    const oldStatus = selectedLead.status || (selectedLead as any).current_status || 'Quote Follow-up';
    const newStatusStr = 'Quote Follow-up' as string; // Stay in follow-up but update notes
    
    // Check missing event dates requirement
    if (newStatusStr === 'Order Confirmed') {
       const missingDate = (!selectedLead.event_date && !wizardLeadData.event_date);
       if (missingDate) {
           setStatusError({
             title: 'Missing Event Date',
             reason: 'Event Date is required to move a lead to Order Confirmed status.',
             suggestedFix: 'Please set the Event Date in the lead details before confirming.'
           });
           setIsSaving(false);
           return;
       }
    }

    try {
      // Create comprehensive update string
      const updateString = [
        `[Update ${new Date().toISOString().split('T')[0]}]`,
        `Status: ${newStatusStr}`,
        `Neg Notes: ${followUpForm.negotiation_notes}`,
        `Next follow-up: ${followUpForm.next_follow_up_date || 'None'}`,
        `Quote Amt: ₹${followUpForm.quotation_amount}`
      ].filter(Boolean).join(' | ');

      // Use the safe append helper
      const newRemarks = appendCompletedStep(
        `${selectedLead.remarks || ''}\n${updateString}`.trim(),
        4
      );

      const dbUpdatePayload = {
        current_status: newStatusStr,
        status: newStatusStr,
        remarks: newRemarks,
        budget: Number(followUpForm.quotation_amount || 0)
      };

      const result = await updateLeadFollowUp(selectedLead.lead_id, newStatusStr, newRemarks);
      if (result.success) {
        
        // Clean old remarks field in case we mutated logic earlier
        const cleanRemarks = followUpForm.negotiation_notes;
        if (cleanRemarks) {
            await supabaseClient.from('lead_notes').insert([{
                lead_id: selectedLead.lead_id,
                order_id: null,
                sales_person_name: currentUser?.name || 'System',
                note_text: cleanRemarks,
                customer_name: selectedLead.customer_name,
                user_id: currentUser?.id
            }]);
        }

        const historyPayload = {
          lead_id: selectedLead.lead_id,
          order_id: null,
          old_status: oldStatus,
          new_status: newStatusStr,
          changed_by: currentUser?.name || 'System',
          changed_by_role: currentRole,
          remarks: updateString
        };
        
        const hRes = await supabaseClient.from('lead_status_history').insert([historyPayload]).select();
        
        if (hRes.error) {
           logStatusUpdateError({
             leadId: selectedLead.lead_id,
             orderId: null,
             oldStatus,
             newStatus: newStatusStr,
             updatePayload: dbUpdatePayload,
             insertPayload: historyPayload,
             dbResponse: hRes,
             fullError: hRes.error.message
           });
           const parsedErr = parseStatusUpdateError(hRes.error.message);
           setStatusError({
             title: "Status Updated, History Failed",
             reason: parsedErr.reason,
             suggestedFix: parsedErr.suggestedFix
           });
           showToastMsg("Follow-up updated, but history log failed. Check details.", "error");
        } else {
           addNotification({
            title: 'Follow-up Updated',
            message: `Lead ${selectedLead.lead_id} updated.`,
            type: 'info'
           });
           showToastMsg(`Follow-up notes updated successfully for Lead ${selectedLead.lead_id}`, 'success');
           
           // Automatically transition to step 5 (Final Actions)
           setCrmWizardStep(5);
           // setShowStep3Popup(false); <-- No longer auto-closing modal
           window.dispatchEvent(new Event('refresh-leads'));
        }
      } else {
        throw new Error(result.error || 'Failed to update follow-up');
      }
    } catch (err: any) {
      console.error("Error updating follow-up:", err);
      logStatusUpdateError({
         leadId: selectedLead.lead_id,
         orderId: null,
         oldStatus,
         newStatus: newStatusStr,
         updatePayload: {},
         insertPayload: {},
         dbResponse: err,
         fullError: err.message
      });
      const parsedErr = parseStatusUpdateError(err.message);
      setStatusError({
         title: "Follow-up Update Failed",
         reason: parsedErr.reason,
         suggestedFix: parsedErr.suggestedFix
      });
      showErrorHelper(
        "Follow-up Update Failed",
        err.message || "Failed to update lead follow-up",
        "handleUpdateFollowUp",
        selectedLead.lead_id,
        parsedErr.suggestedFix,
        err
      );
      showToastMsg(`Error updating follow-up: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateOrder = async (orderData: any, newRemarksStr: string, updateString: string) => {
      // Double check date requirements
      const missingDate = (!selectedLead?.event_date && !orderData.event_date);
      if (missingDate) {
         setStatusError({
             title: 'Missing Event Date',
             reason: 'Event Date is required to move a lead to Order Confirmed status.',
             suggestedFix: 'Please set the Event Date in the lead details before confirming.'
         });
         return { success: false, error: 'Missing Event Date' };
      }

      // Check amount requirement
      if (!orderData.final_amount || isNaN(Number(orderData.final_amount)) || Number(orderData.final_amount) <= 0) {
         setStatusError({
             title: 'Invalid Order Amount',
             reason: 'Final Order Amount must be greater than zero.',
             suggestedFix: 'Please enter a valid Final Order Amount in the booking confirmation step.'
         });
         return { success: false, error: 'Invalid Final Amount' };
      }
      
      const newRemarks = appendCompletedStep(newRemarksStr, 5);

      const orderPayload = {
          ...orderData,
          remarks: newRemarks,
          payment_mode: followUpForm.payment_mode || 'Bank Transfer',
          transaction_id: followUpForm.transaction_id || ''
      };

      const result = await confirmOrder(orderPayload);
      if (result.success) {
          
          if (updateString) {
              await supabaseClient.from('lead_notes').insert([{
                  lead_id: selectedLead!.lead_id,
                  order_id: result.order.order_id,
                  sales_person_name: currentUser?.name || 'System',
                  note_text: updateString,
                  customer_name: selectedLead!.customer_name,
                  user_id: currentUser?.id
              }]);
          }

          const historyPayload = {
            lead_id: selectedLead!.lead_id,
            order_id: result.order.order_id,
            old_status: selectedLead!.status || 'Quote Follow-up',
            new_status: 'Order Confirmed',
            changed_by: currentUser?.name || 'System',
            changed_by_role: currentRole,
            remarks: updateString || 'Converted to Order'
          };
          
          const hRes = await supabaseClient.from('lead_status_history').insert([historyPayload]).select();
          if (hRes.error) {
              const parsedErr = parseStatusUpdateError(hRes.error.message);
              setStatusError({
                 title: "Order Confirmed, History Failed",
                 reason: parsedErr.reason,
                 suggestedFix: parsedErr.suggestedFix
              });
              showToastMsg("Order Confirmed, but history log failed. See details.", "error");
          } else {
              addNotification({
                title: 'Order Confirmed!',
                message: `Lead ${selectedLead!.lead_id} successfully converted to Order ${result.order.order_id}.`,
                type: 'success'
              });
              showToastMsg(`Order Confirmed! New Order ID: ${result.order.order_id}`, 'success');
              setShowConfirmModal(false);
              setShowStep3Popup(false);
              window.dispatchEvent(new Event('refresh-leads'));
          }
      } else {
          throw new Error(result.error || 'Failed to create order');
      }
      return result;
  };

  const handleConfirmOrderSubmit = async () => {
    if (!selectedLead) return;
    setIsSaving(true);
    setStatusError(null);
    
    // Explicit Validation Rules Check (Mandatory fields for Final Step)
    if (!wizardLeadData.final_amount || isNaN(Number(wizardLeadData.final_amount)) || Number(wizardLeadData.final_amount) <= 0) {
      showValidationError('confirm_final_amount', 'Final amount must be greater than zero to confirm an order.');
      setIsSaving(false);
      return;
    }
    
    if (!wizardLeadData.advance_received || isNaN(Number(wizardLeadData.advance_received))) {
      showValidationError('confirm_advance_received', 'Advance received amount is required (can be 0).');
      setIsSaving(false);
      return;
    }

    if (!wizardLeadData.confirmed_event_date && !selectedLead.event_date) {
      showValidationError('confirm_event_date', 'Confirmed event date is required.');
      setIsSaving(false);
      return;
    }
    
    try {
      const confirmedDate = wizardLeadData.confirmed_event_date || selectedLead.event_date;
      const finalAmt = Number(wizardLeadData.final_amount);
      const advAmt = Number(wizardLeadData.advance_received);
      const balAmt = Math.max(0, finalAmt - advAmt);
      
      const updateString = [
        `[Update ${new Date().toISOString().split('T')[0]}]`,
        `Status: Order Confirmed`,
        `Final Amt: ₹${finalAmt}`,
        `Adv Rcvd: ₹${advAmt}`,
        `Notes: ${wizardLeadData.notes_special_customizations || 'None'}`
      ].filter(Boolean).join(' | ');

      const baseEvent = (selectedLead.events && selectedLead.events.length > 0) ? selectedLead.events[0] : {
        id: `evt-${Date.now()}`,
        event_type: selectedLead.event_type || '',
        event_name: selectedLead.event_name || '',
        event_shoot_type: selectedLead.event_shoot_type || '',
        event_date: confirmedDate,
        event_start_time: wizardLeadData.confirmed_event_time || selectedLead.event_time || '',
        event_location: selectedLead.event_location || ''
      };

      const orderData = {
        lead_id: selectedLead.lead_id,
        customer_name: selectedLead.customer_name,
        mobile: selectedLead.mobile,
        event_date: confirmedDate,
        event_time: wizardLeadData.confirmed_event_time || selectedLead.event_time,
        event_location: selectedLead.event_location,
        total_amount: finalAmt,
        advance_payment: advAmt,
        balance_amount: balAmt,
        payment_status: balAmt <= 0 ? 'Completed' : (advAmt > 0 ? 'Partially Paid' : 'Pending'),
        package_id: wizardLeadData.selected_package_id || selectedLead.packages?.[0]?.package_id || '',
        deliverables: wizardLeadData.deliverables_description || selectedLead.packages?.[0]?.custom_deliverables || '',
        notes: wizardLeadData.notes_special_customizations || selectedLead.remarks,
        current_status: 'Order Confirmed',
        events: selectedLead.events && selectedLead.events.length > 0 ? selectedLead.events : [baseEvent],
        sales_person: currentUser?.name || selectedLead.sales_person || 'System',
        sales_staff_id: currentUser?.id || selectedLead.sales_staff_id || 'system_id'
      };

      await handleCreateOrder(orderData, selectedLead.remarks || '', updateString);

    } catch (err: any) {
      console.error("Error confirming order:", err);
      showErrorHelper(
        "Confirm Order Failed",
        err.message || "Failed to process order confirmation",
        "handleConfirmOrderSubmit",
        selectedLead.lead_id,
        "Check database constraints and mandatory field formats.",
        err
      );
      showToastMsg(`Error confirming order: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAddNote = async () => {
    if (!noteModalLeadId) return;
    setIsSaving(true);
    setStatusError(null);
    try {
      if (!internalNotes.trim()) {
        showToastMsg('Please enter a note before saving.', 'error');
        setIsSaving(false);
        return;
      }
      
      const newRemarks = appendCompletedStep(
        `${selectedLead?.remarks || ''}\n[Note ${new Date().toISOString().split('T')[0]}]: ${internalNotes}`.trim(),
        crmWizardStep
      );
      
      const result = await updateLeadFollowUp(noteModalLeadId, selectedLead?.status || 'New Lead', newRemarks);
      if (result.success) {
        
        await supabaseClient.from('lead_notes').insert([{
            lead_id: noteModalLeadId,
            order_id: noteModalOrderId || null,
            sales_person_name: currentUser?.name || 'System',
            note_text: internalNotes,
            customer_name: noteModalCustomerName,
            user_id: currentUser?.id
        }]);

        const historyPayload = {
          lead_id: noteModalLeadId,
          order_id: noteModalOrderId || null,
          old_status: selectedLead?.status || 'New Lead',
          new_status: selectedLead?.status || 'New Lead',
          changed_by: currentUser?.name || 'System',
          changed_by_role: currentRole,
          remarks: `System Note added: ${internalNotes}`
        };
        await supabaseClient.from('lead_status_history').insert([historyPayload]);

        addNotification({
          title: 'Note Added',
          message: `Note added to Lead ${noteModalLeadId}.`,
          type: 'info'
        });
        showToastMsg('Note added successfully', 'success');
        setNoteModalOpen(false);
        setInternalNotes('');
        window.dispatchEvent(new Event('refresh-leads'));
      } else {
        throw new Error(result.error || 'Failed to add note');
      }
    } catch (err: any) {
      console.error("Error adding note:", err);
      showErrorHelper(
        "Add Note Failed",
        err.message || "Failed to append note to lead",
        "handleSaveAddNote",
        noteModalLeadId,
        "Check connection and update permissions.",
        err
      );
      showToastMsg(`Error adding note: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const [showFinalReportingModal, setShowFinalReportingModal] = useState(false);
  const handleFinalizeEventReporting = async () => {
    if (!selectedLead) return;
    setIsSaving(true);
    setStatusError(null);
    try {
      if (!reportingTime) {
        showToastMsg('Please enter reporting time before finalizing.', 'error');
        setIsSaving(false);
        return;
      }
      const newRemarks = appendCompletedStep(
        `${selectedLead.remarks || ''}\nReporting Time Finalized: ${reportingTime} | Notes: ${internalNotes}`.trim(),
        5
      );
      
      const result = await updateLeadFollowUp(selectedLead.lead_id, 'Event Scheduled', newRemarks);
      if (result.success) {
        
        await supabaseClient.from('lead_notes').insert([{
            lead_id: selectedLead.lead_id,
            order_id: null,
            sales_person_name: currentUser?.name || 'System',
            note_text: `Reporting time set to: ${reportingTime}. Notes: ${internalNotes}`,
            customer_name: selectedLead.customer_name,
            user_id: currentUser?.id
        }]);

        const historyPayload = {
          lead_id: selectedLead.lead_id,
          order_id: null,
          old_status: selectedLead.status || 'Order Confirmed',
          new_status: 'Event Scheduled',
          changed_by: currentUser?.name || 'System',
          changed_by_role: currentRole,
          remarks: `Reporting Time Finalized: ${reportingTime}`
        };
        await supabaseClient.from('lead_status_history').insert([historyPayload]);

        addNotification({
          title: 'Event Scheduled',
          message: `Reporting time finalized for Lead ${selectedLead.lead_id}.`,
          type: 'success'
        });
        showToastMsg('Event reporting finalized successfully!', 'success');
        setShowFinalReportingModal(false);
        window.dispatchEvent(new Event('refresh-leads'));
      } else {
        throw new Error(result.error || 'Failed to finalize event reporting');
      }
    } catch (err: any) {
      console.error("Error finalizing event:", err);
      showErrorHelper(
        "Finalize Event Failed",
        err.message || "Failed to update lead status to Event Scheduled",
        "handleFinalizeEventReporting",
        selectedLead.lead_id,
        "Check connection and update permissions.",
        err
      );
      showToastMsg(`Error finalizing event: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkLost = async () => {
    if (!selectedLead) return;
    setIsSaving(true);
    setStatusError(null);
    
    try {
      const finalLostReason = lostReason === 'Other' ? otherLostReason : lostReason;
      
      const updateString = [
        `[Update ${new Date().toISOString().split('T')[0]}]`,
        `Lost Reason: ${finalLostReason}`,
        `Neg Notes: ${lostNotes}`
      ].filter(Boolean).join(' | ');

      const newRemarks = `${selectedLead.remarks || ''}\n${updateString}`.trim();

      const dbUpdatePayload = {
        current_status: 'Lost Lead',
        status: 'Lost Lead',
        remarks: newRemarks,
        lost_reason: finalLostReason,
        lost_notes: lostNotes
      };

      const result = await updateLeadFollowUp(selectedLead.lead_id, 'Lost Lead', newRemarks);
      if (result.success) {
        
        await supabaseClient
          .from('leads')
          .update({ 
            lost_reason: finalLostReason,
            lost_notes: lostNotes 
          })
          .eq('lead_id', selectedLead.lead_id);

        await supabaseClient.from('lead_notes').insert([{
            lead_id: selectedLead.lead_id,
            order_id: null,
            sales_person_name: currentUser?.name || 'System',
            note_text: `Lost Lead: ${finalLostReason}. Notes: ${lostNotes}`,
            customer_name: selectedLead.customer_name,
            user_id: currentUser?.id
        }]);

        const historyPayload = {
          lead_id: selectedLead.lead_id,
          order_id: null,
          old_status: selectedLead.status || 'Unknown',
          new_status: 'Lost Lead',
          changed_by: currentUser?.name || 'System',
          changed_by_role: currentRole,
          remarks: updateString
        };
        const hRes = await supabaseClient.from('lead_status_history').insert([historyPayload]).select();
        
        if (hRes.error) {
            logStatusUpdateError({
             leadId: selectedLead.lead_id,
             orderId: null,
             oldStatus: selectedLead.status || 'Unknown',
             newStatus: 'Lost Lead',
             updatePayload: dbUpdatePayload,
             insertPayload: historyPayload,
             dbResponse: hRes,
             fullError: hRes.error.message
            });
            const parsedErr = parseStatusUpdateError(hRes.error.message);
            setStatusError({
               title: "Marked Lost, History Failed",
               reason: parsedErr.reason,
               suggestedFix: parsedErr.suggestedFix
            });
            showToastMsg("Lead marked as lost, but history log failed. Check details.", "error");
        } else {
            addNotification({
              title: 'Lead Marked as Lost',
              message: `Lead ${selectedLead.lead_id} has been marked as lost. Reason: ${finalLostReason}`,
              type: 'warning'
            });
            showToastMsg(`Lead ${selectedLead.lead_id} has been marked as lost.`, 'success');
            
            // Clean up UI state
            setShowLostModal(false);
            setLostReason('Price too high');
            setOtherLostReason('');
            setLostNotes('');
            setShowStep3Popup(false);
            
            window.dispatchEvent(new Event('refresh-leads'));
        }
      } else {
        throw new Error(result.error || 'Failed to update lead status');
      }
    } catch (err: any) {
      console.error("Error marking lead as lost:", err);
      logStatusUpdateError({
         leadId: selectedLead.lead_id,
         orderId: null,
         oldStatus: selectedLead.status || 'Unknown',
         newStatus: 'Lost Lead',
         updatePayload: {},
         insertPayload: {},
         dbResponse: err,
         fullError: err.message
      });
      const parsedErr = parseStatusUpdateError(err.message);
      setStatusError({
         title: "Mark Lost Failed",
         reason: parsedErr.reason,
         suggestedFix: parsedErr.suggestedFix
      });
      showErrorHelper(
        "Mark Lost Failed",
        err.message || "Failed to mark lead as lost",
        "handleMarkLost",
        selectedLead.lead_id,
        parsedErr.suggestedFix,
        err
      );
      showToastMsg(`Error marking as lost: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const submitUnlockRequest = async () => {
    if (!selectedUnlockLead || (!unlockRequestReason && !unlockRequestCustomReason)) return;
    setIsSaving(true);
    setStatusError(null);
    try {
      const reasonToSave = unlockRequestReason === 'Other' ? unlockRequestCustomReason : unlockRequestReason;
      
      const relatedOrder = orders?.find(o => o.lead_id === selectedUnlockLead.lead_id);
      
      const existingRequest = await supabaseClient
        .from('unlock_requests')
        .select('*')
        .eq('lead_id', selectedUnlockLead.lead_id)
        .eq('status', 'Pending')
        .single();
        
      if (existingRequest.data) {
        showToastMsg('An unlock request is already pending for this record.', 'error');
        setIsSaving(false);
        return;
      }
      
      const requestPayload = {
        lead_id: selectedUnlockLead.lead_id,
        order_id: relatedOrder?.order_id || selectedUnlockLead.lead_id, // Fallback to lead_id if order_id is null
        project_id: selectedUnlockLead.lead_id, // Add project_id to ensure Dashboard compatibility
        reason: reasonToSave,
        request_reason: reasonToSave, // Add legacy field support
        status: 'Pending',
        request_status: 'Pending', // Add legacy field support
        requested_by_name: currentUser?.name || 'System',
        requested_by_user_id: currentUser?.id,
        sales_staff_name: currentUser?.name || 'System', // Legacy field support
        sales_staff_id: currentUser?.id, // Legacy field support
        created_at: new Date().toISOString()
      };
      
      console.log("Submitting unlock request payload:", requestPayload);

      const { data, error } = await supabaseClient
        .from('unlock_requests')
        .insert([requestPayload])
        .select();

      if (error) {
        console.error("Supabase unlock request insert error:", error);
        throw error;
      }

      addNotification({
        title: 'Unlock Request Sent',
        message: `Unlock request for Lead ${selectedUnlockLead.lead_id} sent to admin.`,
        type: 'info'
      });
      showToastMsg('Unlock request submitted successfully to Admin.', 'success');
      setShowUnlockRequestModal(false);
      
      // Update local state to reflect pending request immediately
      setUnlockRequests(prev => [...prev, requestPayload]);
      
    } catch (err: any) {
      console.error("Error submitting unlock request:", err);
      showErrorHelper(
        "Unlock Request Failed",
        err.message || "Failed to submit unlock request to Admin",
        "submitUnlockRequest",
        selectedUnlockLead.lead_id,
        "Check if the unlock_requests table exists and has correct RLS policies.",
        err
      );
      showToastMsg(`Error submitting request: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStep2Submit = async () => {
    if (!selectedLead) return;
    setIsSaving(true);
    setStatusError(null);
    try {
      const updateString = [
        `[Update ${new Date().toISOString().split('T')[0]}]`,
        `Status: Next Step Follow-up`,
        `Notes: ${step2FollowUpNotes}`,
        `Next Follow-up Date: ${step2FollowUpDate || 'None'}`
      ].filter(Boolean).join(' | ');

      const newRemarks = appendCompletedStep(
        `${selectedLead.remarks || ''}\n${updateString}`.trim(),
        2
      );

      const result = await updateLeadFollowUp(selectedLead.lead_id, 'Lead Contacted', newRemarks);
      if (result.success) {
        
        await supabaseClient.from('lead_notes').insert([{
            lead_id: selectedLead.lead_id,
            order_id: null,
            sales_person_name: currentUser?.name || 'System',
            note_text: `Next Step Follow-up: ${step2FollowUpNotes}. Next Date: ${step2FollowUpDate}`,
            customer_name: selectedLead.customer_name,
            user_id: currentUser?.id
        }]);

        const historyPayload = {
          lead_id: selectedLead.lead_id,
          order_id: null,
          old_status: selectedLead.status || 'New Lead',
          new_status: 'Lead Contacted',
          changed_by: currentUser?.name || 'System',
          changed_by_role: currentRole,
          remarks: updateString
        };
        await supabaseClient.from('lead_status_history').insert([historyPayload]);

        addNotification({
          title: 'Follow-up Scheduled',
          message: `Next follow-up for Lead ${selectedLead.lead_id} scheduled for ${step2FollowUpDate}.`,
          type: 'info'
        });
        showToastMsg(`Follow-up scheduled for Lead ${selectedLead.lead_id}`, 'success');
        setShowStep2Popup(false);
        setStep2FollowUpNotes('');
        setStep2FollowUpDate('');
        window.dispatchEvent(new Event('refresh-leads'));
      } else {
        throw new Error(result.error || 'Failed to update follow-up');
      }
    } catch (err: any) {
      console.error("Error setting follow-up:", err);
      showErrorHelper(
        "Follow-up Update Failed",
        err.message || "Failed to update lead follow-up details",
        "handleStep2Submit",
        selectedLead.lead_id,
        "Check connection and update permissions.",
        err
      );
      showToastMsg(`Error updating follow-up: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStep3Submit = async () => {
    if (!selectedLead) return;
    setIsSaving(true);
    setStatusError(null);
    try {
      const updateString = [
        `[Update ${new Date().toISOString().split('T')[0]}]`,
        `Status: Office Visit/Meeting Scheduled`,
        `Meeting Date: ${step3FollowUpDate || 'None'}`,
        `Meeting Time: ${step3FollowUpTime || 'None'}`,
        `Notes: ${step3FollowUpNotes}`
      ].filter(Boolean).join(' | ');

      const newRemarks = appendCompletedStep(
        `${selectedLead.remarks || ''}\n${updateString}`.trim(),
        3
      );

      const result = await updateLeadFollowUp(selectedLead.lead_id, 'Office Visit Scheduled', newRemarks);
      if (result.success) {
        
        await supabaseClient.from('lead_notes').insert([{
            lead_id: selectedLead.lead_id,
            order_id: null,
            sales_person_name: currentUser?.name || 'System',
            note_text: `Office Visit Scheduled on ${step3FollowUpDate} at ${step3FollowUpTime}. Notes: ${step3FollowUpNotes}`,
            customer_name: selectedLead.customer_name,
            user_id: currentUser?.id
        }]);

        const historyPayload = {
          lead_id: selectedLead.lead_id,
          order_id: null,
          old_status: selectedLead.status || 'New Lead',
          new_status: 'Office Visit Scheduled',
          changed_by: currentUser?.name || 'System',
          changed_by_role: currentRole,
          remarks: updateString
        };
        await supabaseClient.from('lead_status_history').insert([historyPayload]);

        addNotification({
          title: 'Office Visit Scheduled',
          message: `Office visit for Lead ${selectedLead.lead_id} scheduled for ${step3FollowUpDate}.`,
          type: 'info'
        });
        showToastMsg(`Office visit scheduled for Lead ${selectedLead.lead_id}`, 'success');
        
        // Clean up UI state
        // setShowStep3Popup(false); <-- No longer auto-closing modal
        setStep3FollowUpNotes('');
        setStep3FollowUpDate('');
        setStep3FollowUpTime('');
        
        // Advance to Step 4 after completing Step 3
        setCrmWizardStep(4);
        window.dispatchEvent(new Event('refresh-leads'));
      } else {
        throw new Error(result.error || 'Failed to update lead');
      }
    } catch (err: any) {
      console.error("Error scheduling visit:", err);
      showErrorHelper(
        "Schedule Visit Failed",
        err.message || "Failed to update lead with office visit details",
        "handleStep3Submit",
        selectedLead.lead_id,
        "Check connection and update permissions.",
        err
      );
      showToastMsg(`Error scheduling visit: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStep3BSubmit = async () => {
    if (!selectedLead) return;
    setIsSaving(true);
    setStatusError(null);
    try {
      const updateString = [
        `[Update ${new Date().toISOString().split('T')[0]}]`,
        `Status: Office Visit Completed`,
        `Meeting Date: ${step3FollowUpDate || 'None'}`,
        `Meeting Time: ${step3FollowUpTime || 'None'}`,
        `Notes: ${step3FollowUpNotes}`
      ].filter(Boolean).join(' | ');

      const newRemarks = appendCompletedStep(
        `${selectedLead.remarks || ''}\n${updateString}`.trim(),
        3
      );

      const result = await updateLeadFollowUp(selectedLead.lead_id, 'Office Visit Completed', newRemarks);
      if (result.success) {
        
        await supabaseClient.from('lead_notes').insert([{
            lead_id: selectedLead.lead_id,
            order_id: null,
            sales_person_name: currentUser?.name || 'System',
            note_text: `Office Visit Completed. Notes: ${step3FollowUpNotes}`,
            customer_name: selectedLead.customer_name,
            user_id: currentUser?.id
        }]);

        const historyPayload = {
          lead_id: selectedLead.lead_id,
          order_id: null,
          old_status: selectedLead.status || 'New Lead',
          new_status: 'Office Visit Completed',
          changed_by: currentUser?.name || 'System',
          changed_by_role: currentRole,
          remarks: updateString
        };
        await supabaseClient.from('lead_status_history').insert([historyPayload]);

        addNotification({
          title: 'Office Visit Completed',
          message: `Office visit for Lead ${selectedLead.lead_id} completed.`,
          type: 'info'
        });
        showToastMsg(`Office visit marked as completed for Lead ${selectedLead.lead_id}`, 'success');
        
        // Clean up UI state
        // setShowStep3Popup(false); <-- No longer auto-closing modal
        setStep3FollowUpNotes('');
        setStep3FollowUpDate('');
        setStep3FollowUpTime('');
        
        // Advance to Step 4 after completing Step 3
        setCrmWizardStep(4);
        window.dispatchEvent(new Event('refresh-leads'));
      } else {
        throw new Error(result.error || 'Failed to update lead');
      }
    } catch (err: any) {
      console.error("Error completing visit:", err);
      showErrorHelper(
        "Complete Visit Failed",
        err.message || "Failed to update lead with office visit details",
        "handleStep3BSubmit",
        selectedLead.lead_id,
        "Check connection and update permissions.",
        err
      );
      showToastMsg(`Error completing visit: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Custom Quotation PDF Generation Support functions
  const openCustomPDFGenerator = (lead: Lead) => {
    setSelectedLead(lead);
    
    // Check local storage for draft services first
    const cached = localStorage.getItem(`erp_quote_services_${lead.lead_id}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuoteServices(parsed);
          setShowStep3Popup(true);
          return;
        }
      } catch(e) {}
    }
    
    // Pre-populate with existing quotation data if available
    if ((lead as any).quotations && (lead as any).quotations.length > 0) {
      const latestQ = (lead as any).quotations[(lead as any).quotations.length - 1];
      if (latestQ.services && Array.isArray(latestQ.services) && latestQ.services.length > 0) {
        setQuoteServices(latestQ.services);
        setQuoteDiscount(latestQ.discount_amount || '');
        setQuoteAdditional(latestQ.additional_charges || '');
      } else if (latestQ.deliverables_json) {
        try {
          const parsed = JSON.parse(latestQ.deliverables_json);
          const fallbackServices = parsed.map((d: any, idx: number) => ({
            id: `gen-${idx}`,
            name: d.name,
            qty: d.qty || 1,
            price: d.price || 0
          }));
          setQuoteServices(fallbackServices);
        } catch(e) {}
      }
    } else {
      // Default empty structure if no existing quotes
      setQuoteServices([]);
      setQuoteDiscount('');
      setQuoteAdditional('');
    }
    
    setShowStep3Popup(true);
  };
  const persistQuoteServices = (services: QuotationService[]) => {
     if (selectedLead) {
       localStorage.setItem(`erp_quote_services_${selectedLead.lead_id}`, JSON.stringify(services));
     } else if (activeTab === 'create') {
       localStorage.setItem(`erp_quote_services_create`, JSON.stringify(services));
     }
  };

  const handleAddCustomQuoteService = () => {
    if (!newServiceName.trim()) {
      showToastMsg('Please enter a service/deliverable name', 'error');
      return;
    }
    const newService: QuotationService = {
      id: `svc-${Date.now()}`,
      name: newServiceName.trim(),
      qty: Number(newServiceQty) || 1,
      price: Number(newServicePrice) || 0
    };
    const updated = [...quoteServices, newService];
    setQuoteServices(updated);
    persistQuoteServices(updated);
    
    // reset inline form
    setNewServiceName('');
    setNewServiceQty(1);
    setNewServicePrice(0);
    setIsAddingInline(false);
  };
  
  const handleRemoveQuoteService = (id: string) => {
    const updated = quoteServices.filter(s => s.id !== id);
    setQuoteServices(updated);
    persistQuoteServices(updated);
  };
  
  const handleUpdateQuoteService = (id: string, field: keyof QuotationService, value: any) => {
    const updated = quoteServices.map(s => {
      if (s.id === id) {
        return { ...s, [field]: field === 'name' ? value : Number(value) || 0 };
      }
      return s;
    });
    setQuoteServices(updated);
    persistQuoteServices(updated);
  };

  const handleLoadPackageToQuote = (pkgId: string) => {
    const pkg = packages.find(p => p.package_id === pkgId);
    if (!pkg) return;
    
    let loadedServices: QuotationService[] = [];
    
    // Parse package team members and deliverables JSON
    if (pkg.team_members) {
      try {
        const tm = JSON.parse(pkg.team_members);
        if (Array.isArray(tm)) {
          tm.forEach((item, idx) => {
            loadedServices.push({
              id: `tm-${pkg.package_id}-${idx}-${Date.now()}`,
              name: item.name || 'Team Member',
              qty: item.qty || 1,
              price: 0 // Base package pricing usually hides individual breakdown
            });
          });
        }
      } catch (e) {}
    }
    
    if (pkg.deliverables) {
      try {
         const del = JSON.parse(pkg.deliverables);
         if (Array.isArray(del)) {
           del.forEach((item, idx) => {
             loadedServices.push({
               id: `del-${pkg.package_id}-${idx}-${Date.now()}`,
               name: item.name || 'Deliverable',
               qty: item.qty || 1,
               price: 0
             });
           });
         }
      } catch (e) {}
    }
    
    // Add the package itself as the base price line item if we didn't parse individual components well
    if (loadedServices.length === 0) {
        loadedServices.push({
           id: `base-${pkg.package_id}-${Date.now()}`,
           name: `${pkg.package_name} (Base Package)`,
           qty: 1,
           price: pkg.price || 0
        });
    } else {
        // Add a primary package line for the main cost, components are cost 0
        loadedServices.unshift({
           id: `base-${pkg.package_id}-${Date.now()}`,
           name: `${pkg.package_name} (Package Price)`,
           qty: 1,
           price: pkg.price || 0
        });
    }

    setQuoteServices(loadedServices);
    persistQuoteServices(loadedServices);
    showToastMsg(`Loaded "${pkg.package_name}" structure`, 'success');
  };

  const handleCreatePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setDeletePackageError(null);
    setPackageSuccessMsg(null);
    try {
      if (!pkgForm.package_name) throw new Error("Package Name is required");
      
      const finalCategory = customCategory || pkgForm.category;
      if (!finalCategory) throw new Error("Category is required");

      const tMembers = pkgTeamMembers.filter(t => t.name.trim() !== '');
      const dItems = pkgDeliverablesList.filter(d => d.name.trim() !== '');

      const payload = {
        package_name: pkgForm.package_name,
        category: finalCategory,
        price: Number(pkgForm.price),
        status: pkgForm.status,
        deliverables: dItems.length > 0 ? JSON.stringify(dItems) : '',
        team_members: tMembers.length > 0 ? JSON.stringify(tMembers) : '',
        seasonal_offer: pkgForm.seasonal_offer,
        terms_conditions: pkgForm.terms_conditions,
        event_type: pkgForm.event_type,
        duration: pkgForm.duration,
        package_includes: pkgForm.package_includes
      };

      if (editingPackage) {
        const result = await updatePackage(editingPackage.package_id, payload);
        if (result.success) {
          showToastMsg('Package updated successfully!', 'success');
          setIsAddFormOpen(false);
          setEditingPackage(null);
          setCustomCategory('');
        } else throw new Error(result.error);
      } else {
        const result = await addPackage(payload);
        if (result.success) {
          showToastMsg('Package created successfully!', 'success');
          setIsAddFormOpen(false);
          setCustomCategory('');
        } else throw new Error(result.error);
      }
    } catch (err: any) {
      console.error(err);
      setDeletePackageError(err.message || 'Failed to save package');
      showToastMsg(err.message || 'Failed to save package', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditPackage = (pkg: any) => {
    setEditingPackage(pkg);
    setPkgForm({
      package_name: pkg.package_name,
      category: pkg.category || 'Weddings',
      price: pkg.price || 0,
      status: pkg.status || 'Active',
      deliverables: pkg.deliverables || '',
      team_members: pkg.team_members || '',
      seasonal_offer: pkg.seasonal_offer || '',
      terms_conditions: pkg.terms_conditions || '',
      event_type: pkg.event_type || '',
      duration: pkg.duration || '',
      package_includes: pkg.package_includes || ''
    });

    try {
      const tm = pkg.team_members ? JSON.parse(pkg.team_members) : [];
      setPkgTeamMembers(Array.isArray(tm) && tm.length > 0 ? tm : [{qty: 1, name: ''}]);
    } catch (e) {
      setPkgTeamMembers([{qty: 1, name: ''}]);
    }

    try {
      const d = pkg.deliverables ? JSON.parse(pkg.deliverables) : [];
      setPkgDeliverablesList(Array.isArray(d) ? d : []);
    } catch (e) {
      setPkgDeliverablesList([]);
    }

    if (!PACKAGE_CATEGORIES.includes(pkg.category)) {
      setCustomCategory(pkg.category);
    } else {
      setCustomCategory('');
    }

    setIsAddFormOpen(true);
  };

  const executeDeletePackage = async () => {
    if (!deletingPackageId) return;
    setIsDeletingPackage(true);
    setDeletePackageError(null);
    try {
      const result = await deletePackage(deletingPackageId);
      if (result.success) {
        setPackageSuccessMsg('Package deleted successfully');
        setDeletingPackageId(null);
        setTimeout(() => setPackageSuccessMsg(null), 3000);
      } else {
        throw new Error(result.error || 'Failed to delete package');
      }
    } catch (err: any) {
      setDeletePackageError(err.message || 'Failed to delete package');
    } finally {
      setIsDeletingPackage(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        .animate-slide-up { animation: slideUp 0.4s ease-out; }
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .glass-panel { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(226, 232, 240, 0.8); }
        .fancy-checkbox:checked + div { border-color: #0ea5e9; background-color: #f0f9ff; }
        .fancy-checkbox:checked + div svg { opacity: 1; transform: scale(1); }
      `}</style>
      
      {/* Toast Notification Container */}
      {crmToast && (
        <div id="crm-toast-container" className="fixed top-20 right-4 z-[9999] animate-fade-in pointer-events-none">
          <div className={`px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 backdrop-blur-md border ${
            crmToast.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-red-500/90 text-white border-red-400'
          }`}>
            {crmToast.type === 'success' ? <CheckCircle2 size={20} className="drop-shadow" /> : <AlertCircle size={20} className="drop-shadow" />}
            <span className="font-semibold tracking-wide drop-shadow-sm">{crmToast.message}</span>
          </div>
        </div>
      )}

      {/* Global Status Error Modal */}
      {statusError && (
         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-red-100 flex flex-col">
               <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                     <AlertCircle size={24} />
                  </div>
                  <div>
                     <h3 className="text-lg font-bold text-red-700">{statusError.title}</h3>
                     <p className="text-sm text-red-600/80 font-medium">Database Operation Failed</p>
                  </div>
               </div>
               
               <div className="p-6 overflow-y-auto max-h-[60vh] bg-slate-50">
                  <div className="mb-4">
                     <h4 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        Error Reason
                     </h4>
                     <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-700 font-mono text-xs whitespace-pre-wrap break-all shadow-inner">
                        {statusError.reason}
                     </div>
                  </div>
                  
                  <div>
                     <h4 className="text-sm font-bold text-emerald-700 mb-1 flex items-center gap-2">
                        <Activity size={14} className="text-emerald-500" />
                        Suggested Fix
                     </h4>
                     <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-sm text-emerald-800 leading-relaxed">
                        {statusError.suggestedFix}
                     </div>
                  </div>
               </div>
               
               <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
                  <button 
                     onClick={() => setStatusError(null)}
                     className="px-6 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors shadow-sm active:scale-95"
                  >
                     Acknowledge & Close
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Header and Tabs */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex-shrink-0 z-10 shadow-sm relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <PhoneCall size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Sales & Leads Desk</h2>
              <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Manage Inquiries & Quotations</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 md:pb-0">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === 'list' 
                  ? 'bg-slate-800 text-white shadow-md' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Lead Board</span>
              <span className="sm:hidden">Board</span>
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === 'create' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <UserPlus size={16} />
              <span className="hidden sm:inline">Create Lead</span>
              <span className="sm:hidden">Create</span>
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === 'packages' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Package size={16} />
              <span className="hidden sm:inline">Packages Master</span>
              <span className="sm:hidden">Packages</span>
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === 'calendar' 
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Calendar size={16} />
              <span className="hidden sm:inline">Availability</span>
              <span className="sm:hidden">Calendar</span>
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === 'profiles' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users size={16} />
              <span className="hidden sm:inline">Customer Profiles</span>
              <span className="sm:hidden">Customers</span>
            </button>
          </div>
        </div>
      </div>
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="max-w-7xl mx-auto p-4 md:p-6 pb-32">
          
          {activeTab === 'list' && (
            <div className="animate-fade-in space-y-6">
              
              {/* Dashboard Metrics (Only shown on List View) */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Leads</h3>
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Users size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{totalLeads}</p>
                    <p className="text-xs font-semibold text-blue-600 mt-1 flex items-center gap-1">
                      <TrendingUp size={12} /> Live Count
                    </p>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">New Leads</h3>
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                        <UserPlus size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{newLeads}</p>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${totalLeads ? (newLeads/totalLeads)*100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Hot Leads</h3>
                      <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                        <Flame size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{hotLeads}</p>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-orange-500 h-full rounded-full" style={{ width: `${totalLeads ? (hotLeads/totalLeads)*100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Quotes Sent</h3>
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <FileText size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{quotationsSent}</p>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${totalLeads ? (quotationsSent/totalLeads)*100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow relative overflow-hidden group col-span-2 md:col-span-1">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Converted</h3>
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <CheckCircle size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{leadStageDistribution.converted}</p>
                    <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                      <TrendingUp size={12} /> {totalLeads ? Math.round((leadStageDistribution.converted/totalLeads)*100) : 0}% Win Rate
                    </p>
                  </div>
                </div>
              </div>

              {/* DataGrid & Controls */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="relative w-full lg:w-96 flex-shrink-0 group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                      <input
                        type="text"
                        placeholder="Search Leads, Names, Numbers..."
                        value={filterQuery}
                        onChange={e => setFilterQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:font-normal shadow-inner"
                      />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                        <button
                          onClick={() => setSortOrder('latest')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${sortOrder === 'latest' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                          Newest First
                        </button>
                        <button
                          onClick={() => setSortOrder('oldest')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${sortOrder === 'oldest' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                          Oldest First
                        </button>
                      </div>

                      <button
                        onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg font-bold text-sm transition-all shadow-sm ${
                          isFiltersExpanded || filterSource || filterStatus !== 'All' || filterSalesPerson || appliedStartDate 
                          ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Filter size={16} className={isFiltersExpanded ? 'text-blue-500' : ''} />
                        Filter
                        {(filterSource || filterStatus !== 'All' || filterSalesPerson || appliedStartDate) && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 ml-1"></span>
                        )}
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isFiltersExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      <button
                        onClick={() => setIsDownloadReportsExpanded(!isDownloadReportsExpanded)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 font-bold text-sm transition-all shadow-sm"
                      >
                        <Download size={16} />
                        Export
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isDownloadReportsExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Filter Panel */}
                  {isFiltersExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200 animate-slide-up bg-white rounded-lg p-4 shadow-inner border">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Date Range From</label>
                          <input
                            type="date"
                            value={dateRangeStart}
                            onChange={(e) => setDateRangeStart(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-sm font-medium bg-slate-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Date Range To</label>
                          <input
                            type="date"
                            value={dateRangeEnd}
                            onChange={(e) => setDateRangeEnd(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-sm font-medium bg-slate-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Lead Source</label>
                          <select
                            value={filterSource}
                            onChange={(e) => setFilterSource(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-sm font-medium bg-slate-50"
                          >
                            <option value="">All Sources</option>
                            {LEAD_SOURCES.map(source => (
                              <option key={source} value={source}>{source}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Current Status</label>
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-sm font-medium bg-slate-50"
                          >
                            {statusOptions.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        {currentRole !== 'Sales Team' && (
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Sales Person</label>
                            <select
                              value={filterSalesPerson}
                              onChange={(e) => setFilterSalesPerson(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-sm font-medium bg-slate-50"
                            >
                              <option value="All">All Sales Staff</option>
                              {users.filter(u => u.role === 'Sales Team').map(u => (
                                <option key={u.id} value={u.name}>{u.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="md:col-span-2 flex items-end gap-2">
                          <button
                            onClick={() => {
                              setAppliedStartDate(dateRangeStart);
                              setAppliedEndDate(dateRangeEnd);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm w-full md:w-auto"
                          >
                            Apply Filters
                          </button>
                          <button
                            onClick={() => {
                              setDateRangeStart('');
                              setDateRangeEnd('');
                              setAppliedStartDate('');
                              setAppliedEndDate('');
                              setFilterSource('');
                              setFilterStatus('All');
                              setFilterSalesPerson('All');
                            }}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors border border-slate-300 w-full md:w-auto"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expanded Export Panel */}
                  {isDownloadReportsExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200 animate-slide-up">
                       <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                              <Download size={16} />
                            </div>
                            <h3 className="font-bold text-emerald-900">Export Leads Data</h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <button
                               onClick={handleDownloadCSV}
                               className="flex flex-col items-center justify-center p-4 bg-white border border-emerald-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all group"
                             >
                               <FileText size={24} className="text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                               <span className="font-bold text-slate-700">Download CSV</span>
                               <span className="text-xs text-slate-500 mt-1">Comma separated values</span>
                             </button>
                             
                             <button
                               onClick={handleDownloadExcel}
                               className="flex flex-col items-center justify-center p-4 bg-white border border-emerald-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all group"
                             >
                               <FileSpreadsheet size={24} className="text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                               <span className="font-bold text-slate-700">Download Excel</span>
                               <span className="text-xs text-slate-500 mt-1">.xls format spreadsheet</span>
                             </button>
                             
                             <button
                               onClick={handlePrintReport}
                               className="flex flex-col items-center justify-center p-4 bg-white border border-emerald-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all group"
                             >
                               <Printer size={24} className="text-slate-600 mb-2 group-hover:scale-110 transition-transform" />
                               <span className="font-bold text-slate-700">Print Report</span>
                               <span className="text-xs text-slate-500 mt-1">Formatted view for printing</span>
                             </button>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto min-h-[500px]">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-bold">Ref ID</th>
                        <th className="px-4 py-3 font-bold">Customer Info</th>
                        <th className="px-4 py-3 font-bold">Event Details</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3 font-bold">Lead Source</th>
                        <th className="px-4 py-3 font-bold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLeads.map((lead) => {
                        const status = getLeadCurrentStatus(lead);
                        const isLost = status === 'Lost Lead' || status === 'Lost';
                        const isConverted = status === 'Order Confirmed';
                        const ord = orders.find(o => o.lead_id === lead.lead_id);
                        
                        // Prevent unapproved editing unless it's a new lead
                        const isFullyLocked = lead.quotation_locked && !unlockRequests.some(r => 
                          (r.lead_id === lead.lead_id || r.order_id === lead.lead_id || r.project_id === lead.lead_id) && 
                          (r.status === 'Approved' || r.request_status === 'Approved')
                        );
                        
                        return (
                          <tr 
                            key={lead.lead_id} 
                            className={`hover:bg-slate-50 transition-colors ${
                              isLost ? 'bg-red-50/30' : isConverted ? 'bg-emerald-50/30' : 'bg-white'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="font-mono text-xs font-bold text-slate-700">{lead.lead_id}</div>
                              {ord && (
                                <div className="font-mono text-[10px] text-emerald-600 font-bold mt-0.5 px-1.5 py-0.5 bg-emerald-50 rounded inline-block border border-emerald-100">
                                  {ord.order_id}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 mt-1">
                                {new Date(lead.created_date).toLocaleDateString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric'
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{lead.customer_name}</div>
                              <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-1">
                                <span className="flex items-center gap-1.5"><Phone size={10} /> {lead.mobile}</span>
                                {lead.whatsapp_number && lead.whatsapp_number !== lead.mobile && (
                                  <span className="flex items-center gap-1.5 text-emerald-600"><Phone size={10} /> {lead.whatsapp_number} (WA)</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-700">{lead.event_type}</div>
                              <div className="text-xs text-slate-500 mt-0.5 flex flex-col gap-0.5">
                                {lead.custom_event_name && <span>{lead.custom_event_name}</span>}
                                {lead.event_date && (
                                  <span className="flex items-center gap-1 mt-1 font-medium text-slate-600">
                                    <Calendar size={12} />
                                    {new Date(lead.event_date).toLocaleDateString('en-IN', {
                                      day: '2-digit', month: 'short', year: 'numeric'
                                    })}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 border ${
                                isLost ? 'bg-red-50 text-red-700 border-red-200' :
                                isConverted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                status === 'Quote Sent' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                status === 'New Lead' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {status}
                              </span>
                              
                              {/* Display locked status */}
                              {isFullyLocked && !isLost && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 w-max">
                                  <Lock size={10} /> Locked
                                </div>
                              )}
                              
                              {/* Display unlock request pending status */}
                              {unlockRequests.some(r => 
                                (r.lead_id === lead.lead_id || r.order_id === lead.lead_id || r.project_id === lead.lead_id) && 
                                (r.status === 'Pending' || r.request_status === 'Pending')
                              ) && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 w-max">
                                  <Clock size={10} /> Unlock Pending
                                </div>
                              )}
                              
                              {/* Show Lost Reason if Lost */}
                              {isLost && (
                                <div className="mt-1 text-[10px] text-red-600 font-medium max-w-[150px] truncate" title={getLostReasonAndNotes(lead).reason}>
                                  Reason: {getLostReasonAndNotes(lead).reason}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs font-medium text-slate-600">{lead.lead_source}</div>
                              {currentRole !== 'Sales Team' && (
                                <div className="text-[10px] text-slate-400 mt-1 font-medium bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                                  Rep: {lead.sales_person}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="relative inline-block actions-dropdown-container">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (openDropdownLeadId === lead.lead_id) {
                                      setOpenDropdownLeadId(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const spaceBelow = window.innerHeight - rect.bottom;
                                      const spaceAbove = rect.top;
                                      
                                      let top, bottom;
                                      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
                                        top = 'auto';
                                        bottom = '100%';
                                      } else {
                                        top = '100%';
                                        bottom = 'auto';
                                      }
                                      
                                      setDropdownCoords({ top, bottom, right: 0 });
                                      setOpenDropdownLeadId(lead.lead_id);
                                    }
                                  }}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                                >
                                  <MoreVertical size={18} />
                                </button>

                                {openDropdownLeadId === lead.lead_id && (
                                  <div 
                                    className="absolute z-[100] w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 animate-fade-in actions-dropdown-menu"
                                    style={{
                                      top: dropdownCoords.top,
                                      bottom: dropdownCoords.bottom,
                                      right: dropdownCoords.right,
                                      marginTop: dropdownCoords.top === '100%' ? '0.25rem' : 0,
                                      marginBottom: dropdownCoords.bottom === '100%' ? '0.25rem' : 0,
                                    }}
                                  >
                                    <button
                                      onClick={() => {
                                        setSelectedLead(lead);
                                        
                                        // Auto-calculate step based on status
                                        let step = 1;
                                        const currentStatus = getLeadCurrentStatus(lead);
                                        
                                        if (currentStatus === 'New Lead') step = 2; // Needs Follow-up
                                        else if (currentStatus === 'Lead Contacted') step = 3; // Needs Office Visit/Quote
                                        else if (currentStatus === 'Office Visit Scheduled') step = 3; // Needs Office Visit Complete
                                        else if (currentStatus === 'Office Visit Completed' || currentStatus === 'Quote Sent') step = 4; // Negotiation
                                        else if (currentStatus === 'Quote Follow-up') step = 4; // Still in Negotiation
                                        else if (currentStatus === 'Order Confirmed' || currentStatus === 'Event Scheduled') step = 5; // Final Actions
                                        
                                        setCrmWizardStep(step);
                                        setCrmHighestStep(step);
                                        setShowLeadDetails(true);
                                        setOpenDropdownLeadId(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 font-medium text-slate-700"
                                    >
                                      <Eye size={14} className="text-blue-500" />
                                      View CRM Console
                                    </button>

                                    {/* Quick Quotation Generate option (Only if not lost/confirmed) */}
                                    {!isLost && !isConverted && (
                                      <button
                                        onClick={() => {
                                          openCustomPDFGenerator(lead);
                                          setOpenDropdownLeadId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 font-medium text-slate-700 border-t border-slate-100"
                                      >
                                        <FileText size={14} className="text-indigo-500" />
                                        Generate Quotation
                                      </button>
                                    )}

                                    {/* Request Unlock if Locked */}
                                    {isFullyLocked && (
                                      <button
                                        onClick={() => {
                                          setSelectedUnlockLead(lead);
                                          setUnlockRequestReason('Customer requested additional discount');
                                          setUnlockRequestCustomReason('');
                                          setShowUnlockRequestModal(true);
                                          setOpenDropdownLeadId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-amber-50 flex items-center gap-2 font-medium text-amber-700 border-t border-slate-100"
                                      >
                                        <Unlock size={14} />
                                        Request Unlock
                                      </button>
                                    )}

                                    {/* Mark as Lost option */}
                                    {!isLost && !isConverted && (
                                      <button
                                        onClick={() => {
                                          setSelectedLead(lead);
                                          setShowLostModal(true);
                                          setOpenDropdownLeadId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 font-medium text-red-600 border-t border-slate-100"
                                      >
                                        <XCircle size={14} />
                                        Mark as Lost
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center">
                              <Users size={32} className="text-slate-300 mb-2" />
                              <p className="font-medium text-slate-600">No leads found matching your criteria.</p>
                              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search query.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'packages' && (
            <div className="animate-fade-in space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Sales Packages & Templates</h3>
                  <p className="text-sm text-slate-500">Manage pre-defined quotation structures</p>
                </div>
                <div className="flex items-center gap-3">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setEditingPackage(null);
                        setPkgForm({
                          package_name: '',
                          category: 'Weddings',
                          price: 0,
                          status: 'Active',
                          deliverables: '',
                          team_members: '',
                          seasonal_offer: '',
                          terms_conditions: '',
                          event_type: '',
                          duration: '',
                          package_includes: ''
                        });
                        setPkgTeamMembers([{qty: 1, name: ''}]);
                        setPkgDeliverablesList([]);
                        setCustomCategory('');
                        setIsAddFormOpen(true);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/20 flex items-center gap-2"
                    >
                      <Plus size={16} /> Create Template
                    </button>
                  )}
                </div>
              </div>
              {/* Packages Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map(pkg => (
                  <div key={pkg.package_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex-grow">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                          {pkg.category}
                        </span>
                        <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded ${
                          pkg.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {pkg.status}
                        </span>
                      </div>
                      
                      <h4 className="text-lg font-bold text-slate-800 mb-1">{pkg.package_name}</h4>
                      {pkg.seasonal_offer && (
                        <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 mb-3">
                          {pkg.seasonal_offer}
                        </span>
                      )}
                      
                      <div className="mt-4 space-y-3">
                        {pkg.team_members && (
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1"><Users size={12}/> Team</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(() => {
                                try {
                                  const t = JSON.parse(pkg.team_members);
                                  return Array.isArray(t) ? t.map((m:any, i:number) => (
                                    <span key={i} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                                      {m.qty}x {m.name}
                                    </span>
                                  )) : null;
                                } catch(e) { return null; }
                              })()}
                            </div>
                          </div>
                        )}
                        
                        {pkg.deliverables && (
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1"><FileImage size={12}/> Deliverables</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(() => {
                                try {
                                  const d = JSON.parse(pkg.deliverables);
                                  return Array.isArray(d) ? d.map((item:any, i:number) => (
                                    <span key={i} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium border border-blue-100">
                                      {item.qty}x {item.name}
                                    </span>
                                  )) : null;
                                } catch(e) { return null; }
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between mt-auto">
                      <div className="text-xl font-black text-slate-800">
                        ₹{pkg.price?.toLocaleString('en-IN') || 0}
                      </div>
                      
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openEditPackage(pkg)}
                            className="p-2 bg-white text-blue-600 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors shadow-sm"
                            title="Edit Package"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => setDeletingPackageId(pkg.package_id)}
                            className="p-2 bg-white text-red-600 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-colors shadow-sm"
                            title="Delete Package"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {packages.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
                    <Package size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No packages available.</p>
                    <p className="text-xs text-slate-400 mt-1">Create predefined templates to speed up your quotation process.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="animate-fade-in max-w-4xl mx-auto">
               <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
                  <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-600 absolute top-0 left-0"></div>
                  
                  <div className="px-6 md:px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <UserPlus size={24} className="text-blue-600" />
                        Create New Lead
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 font-medium">Capture details for a new potential customer inquiry.</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateLeadSubmit} className="p-6 md:p-8 space-y-8">
                    {submitError && (
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r flex items-start gap-3 shadow-sm">
                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                        <div>
                          <p className="text-sm text-red-700 font-bold">Submission Error</p>
                          <p className="text-xs text-red-600 mt-1 font-medium">{submitError}</p>
                        </div>
                      </div>
                    )}

                    {/* Form sections are identical to original */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                        <User size={16} className="text-blue-500" /> Client Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Customer Name *</label>
                          <input
                            type="text"
                            required
                            value={form.customer_name}
                            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium"
                            placeholder="Full Name"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Mobile Number *</label>
                          <input
                            type="tel"
                            required
                            value={form.mobile}
                            onChange={(e) => {
                              const val = e.target.value;
                              setForm(prev => ({ 
                                ...prev, 
                                mobile: val,
                                whatsapp_number: prev.whatsapp_number === prev.mobile ? val : prev.whatsapp_number 
                              }));
                            }}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium"
                            placeholder="Primary Contact"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">WhatsApp Number</label>
                          <input
                            type="tel"
                            value={form.whatsapp_number}
                            onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium"
                            placeholder="Same as mobile if empty"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Location / City</label>
                          <input
                            type="text"
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all text-sm font-medium"
                            placeholder="City or Area"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Calendar size={16} className="text-indigo-500" /> Event Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Event Type *</label>
                          <select
                            required
                            value={form.event_type}
                            onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
                          >
                            <option value="">Select Event Type</option>
                            {EVENT_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        {form.event_type === 'Other' && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Custom Event Name</label>
                            <input
                              type="text"
                              required
                              value={form.custom_event_name}
                              onChange={(e) => setForm({ ...form, custom_event_name: e.target.value })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
                              placeholder="Describe the event"
                            />
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Event Date</label>
                          <input
                            type="date"
                            value={form.event_date}
                            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Lead Source</label>
                          <select
                            value={form.lead_source}
                            onChange={(e) => setForm({ ...form, lead_source: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
                          >
                            {LEAD_SOURCES.map(source => (
                              <option key={source} value={source}>{source}</option>
                            ))}
                          </select>
                        </div>
                        {form.lead_source === 'Other' && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Custom Source</label>
                            <input
                              type="text"
                              required
                              value={form.custom_source}
                              onChange={(e) => setForm({ ...form, custom_source: e.target.value })}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium"
                              placeholder="Where did they find us?"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                        <FileText size={16} className="text-amber-500" /> Additional Notes
                      </h4>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Initial Requirements / Comments</label>
                        <textarea
                          value={form.remarks}
                          onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all text-sm font-medium resize-y min-h-[100px]"
                          placeholder="Any specific requests, package interests, or initial conversation notes..."
                        ></textarea>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('list')}
                        className="px-6 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-70 flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={18} />
                            Create Lead
                          </>
                        )}
                      </button>
                    </div>
                  </form>
               </div>
            </div>
          )}

          {activeTab === 'profiles' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Users size={20} className="text-emerald-600" />
                      Customer Directory
                    </h3>
                    <p className="text-sm text-slate-500">View all leads converted to customers</p>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={filterQuery}
                      onChange={e => setFilterQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLeads
                  .filter(l => getLeadCurrentStatus(l) === 'Order Confirmed')
                  .map(customer => {
                    const ord = orders.find(o => o.lead_id === customer.lead_id);
                    return (
                      <div key={customer.lead_id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
                              {customer.customer_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">{customer.customer_name}</h4>
                              <p className="text-xs font-mono text-emerald-600 mt-0.5">{customer.lead_id}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Phone size={14} className="text-slate-400" />
                            <a href={`tel:${customer.mobile}`} className="hover:text-blue-600 transition-colors">{customer.mobile}</a>
                          </div>
                          {customer.whatsapp_number && customer.whatsapp_number !== customer.mobile && (
                            <div className="flex items-center gap-3 text-sm text-emerald-600">
                              <Phone size={14} className="text-emerald-400" />
                              <a href={`https://wa.me/${customer.whatsapp_number.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="hover:underline">{customer.whatsapp_number} (WA)</a>
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Calendar size={14} className="text-slate-400" />
                            {customer.event_date ? new Date(customer.event_date).toLocaleDateString('en-IN') : 'N/A'}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <MapPin size={14} className="text-slate-400" />
                            {customer.location || 'No location set'}
                          </div>
                        </div>
                        
                        {ord && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <button 
                              onClick={() => {
                                setSelectedLead(customer);
                                setCrmWizardStep(5);
                                setShowLeadDetails(true);
                              }}
                              className="w-full py-2 bg-slate-50 hover:bg-emerald-50 text-emerald-700 text-sm font-bold rounded-lg transition-colors border border-slate-100 hover:border-emerald-200"
                            >
                              View Order #{ord.order_id}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                })}
                {filteredLeads.filter(l => getLeadCurrentStatus(l) === 'Order Confirmed').length === 0 && (
                  <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
                    <Users size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500 font-medium">No converted customers found.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="animate-fade-in bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Calendar size={20} className="text-amber-500" />
                    Availability Calendar
                  </h3>
                  <p className="text-sm text-slate-500">Upcoming events and meetings</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {filteredLeads
                  .filter(l => l.event_date && new Date(l.event_date) >= new Date())
                  .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime())
                  .slice(0, 10)
                  .map(lead => {
                    const eventDate = new Date(lead.event_date!);
                    const isToday = eventDate.toDateString() === new Date().toDateString();
                    const status = getLeadCurrentStatus(lead);
                    
                    return (
                      <div key={lead.lead_id} className={`flex items-start gap-4 p-4 rounded-xl border ${
                        isToday ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center shrink-0 ${
                          isToday ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200'
                        }`}>
                          <span className="text-[10px] font-bold uppercase">{eventDate.toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-xl font-black leading-none">{eventDate.getDate()}</span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800">{lead.customer_name}</h4>
                            <span className="text-xs font-bold text-slate-500">{lead.event_type}</span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" /> {lead.location || 'Location TBA'}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              status === 'Order Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {status}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setCrmWizardStep(status === 'Order Confirmed' ? 5 : 1);
                                setShowLeadDetails(true);
                              }}
                              className="text-xs font-bold text-slate-500 hover:text-blue-600 underline"
                            >
                              View CRM
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
                {filteredLeads.filter(l => l.event_date && new Date(l.event_date) >= new Date()).length === 0 && (
                  <div className="py-12 text-center">
                    <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500 font-medium">No upcoming events scheduled.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Lead Details / CRM Wizard Modal */}
      {showLeadDetails && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-slate-50 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in border border-slate-200/50">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 text-lg font-bold">
                  {selectedLead.customer_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">{selectedLead.customer_name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {selectedLead.lead_id}
                    </span>
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Phone size={12} /> {selectedLead.mobile}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowLeadDetails(false);
                  setCrmWizardStep(1);
                  setCrmHighestStep(1);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Wizard Sidebar */}
              <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto hidden md:block shrink-0">
                <div className="p-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Sales Pipeline</h4>
                  <div className="space-y-2">
                    {[
                      { step: 1, title: 'Lead Initialized', icon: <UserPlus size={16} /> },
                      { step: 2, title: 'Follow-Up', icon: <Phone size={16} /> },
                      { step: 3, title: 'Meeting / Visit', icon: <MapPin size={16} /> },
                      { step: 4, title: 'Quotation', icon: <FileText size={16} /> },
                      { step: 5, title: 'Confirmation', icon: <CheckCircle size={16} /> }
                    ].map((item) => {
                      const isActive = crmWizardStep === item.step;
                      const isCompleted = getLeadCurrentStatus(selectedLead) === 'Order Confirmed' || crmHighestStep > item.step;
                      const isClickable = item.step <= crmHighestStep || getLeadCurrentStatus(selectedLead) === 'Order Confirmed';
                      
                      return (
                        <button
                          key={item.step}
                          disabled={!isClickable}
                          onClick={() => setCrmWizardStep(item.step)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all text-left ${
                            isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            isCompleted ? 'text-emerald-700 hover:bg-emerald-50' :
                            isClickable ? 'text-slate-600 hover:bg-slate-50' :
                            'text-slate-400 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-blue-600 text-white shadow-sm' :
                            isCompleted ? 'bg-emerald-100 text-emerald-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {isCompleted && !isActive ? <CheckCircle size={12} /> : item.step}
                          </div>
                          <span className="flex-1 truncate">{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Current Status Badge */}
                  <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Current Status</p>
                    <div className="font-bold text-sm text-slate-800">
                      {getLeadCurrentStatus(selectedLead)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Wizard Content Area */}
              <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-6 custom-scrollbar">
                
                {crmWizardStep === 1 && (
                  <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                          <Info size={20} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-800">Lead Details</h4>
                          <p className="text-sm text-slate-500">Initial information captured</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Event Type</p>
                          <p className="font-medium text-slate-800 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            {selectedLead.event_type} {selectedLead.custom_event_name ? `(${selectedLead.custom_event_name})` : ''}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Event Date</p>
                          <p className="font-medium text-slate-800 flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            {selectedLead.event_date ? new Date(selectedLead.event_date).toLocaleDateString('en-IN', {
                               weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
                            }) : 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location</p>
                          <p className="font-medium text-slate-800 flex items-center gap-2">
                            <MapPin size={14} className="text-slate-400" />
                            {selectedLead.location || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Source</p>
                          <p className="font-medium text-slate-800">
                            {selectedLead.lead_source}
                          </p>
                        </div>
                      </div>
                      
                      {selectedLead.remarks && (
                        <div className="mt-6 pt-4 border-t border-slate-100">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Initial Remarks</p>
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap font-medium">
                            {selectedLead.remarks.split('\n')[0]} 
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={() => {
                          setCrmHighestStep(Math.max(crmHighestStep, 2));
                          setCrmWizardStep(2);
                        }}
                        className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2"
                      >
                        Next Step <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {crmWizardStep === 2 && (
                  <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <PhoneCall size={20} />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-slate-800">Initial Follow-up</h4>
                            <p className="text-sm text-slate-500">Record conversation details</p>
                          </div>
                        </div>
                        {getLeadCurrentStatus(selectedLead) === 'Lead Contacted' && (
                          <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-5">
                        <div>
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Discussion Notes</label>
                          <textarea
                            value={step2FollowUpNotes}
                            onChange={(e) => setStep2FollowUpNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium resize-y min-h-[100px] mt-1.5"
                            placeholder="Summarize the phone conversation..."
                          ></textarea>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Next Follow-up Date (Optional)</label>
                          <input
                            type="date"
                            value={step2FollowUpDate}
                            onChange={(e) => setStep2FollowUpDate(e.target.value)}
                            className="w-full md:w-1/2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium mt-1.5"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={handleStep2Submit}
                          disabled={isSaving || !step2FollowUpNotes.trim()}
                          className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSaving ? 'Saving...' : 'Mark as Contacted & Save'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <button
                        onClick={() => setCrmWizardStep(1)}
                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
                      >
                        <ChevronRight size={16} className="rotate-180" /> Back
                      </button>
                      <button
                        onClick={() => {
                          setCrmHighestStep(Math.max(crmHighestStep, 3));
                          setCrmWizardStep(3);
                        }}
                        className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2"
                      >
                        Next Step <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
                {crmWizardStep === 3 && (
                  <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                            <MapPin size={20} />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-slate-800">Office Visit / Meeting</h4>
                            <p className="text-sm text-slate-500">Schedule and record meeting details</p>
                          </div>
                        </div>
                        {getLeadCurrentStatus(selectedLead) === 'Office Visit Scheduled' && (
                          <span className="bg-orange-50 text-orange-700 text-xs font-bold px-3 py-1 rounded-full border border-orange-200 flex items-center gap-1">
                            <Clock size={12} /> Scheduled
                          </span>
                        )}
                        {getLeadCurrentStatus(selectedLead) === 'Office Visit Completed' && (
                          <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Meeting Date (Optional)</label>
                            <input
                              type="date"
                              value={step3FollowUpDate}
                              onChange={(e) => setStep3FollowUpDate(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium mt-1.5"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Meeting Time (Optional)</label>
                            <input
                              type="time"
                              value={step3FollowUpTime}
                              onChange={(e) => setStep3FollowUpTime(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium mt-1.5"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Meeting Notes / Agenda</label>
                          <textarea
                            value={step3FollowUpNotes}
                            onChange={(e) => setStep3FollowUpNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium resize-y min-h-[100px] mt-1.5"
                            placeholder="What was discussed or what needs to be prepared..."
                          ></textarea>
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-3 justify-end">
                        <button
                          onClick={handleStep3Submit}
                          disabled={isSaving}
                          className="px-6 py-2.5 bg-orange-100 text-orange-700 font-bold rounded-lg hover:bg-orange-200 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSaving ? 'Saving...' : 'Mark as Scheduled'}
                        </button>
                        <button
                          onClick={handleStep3BSubmit}
                          disabled={isSaving || !step3FollowUpNotes.trim()}
                          className="px-6 py-2.5 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSaving ? 'Saving...' : 'Mark Meeting Completed'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <button
                        onClick={() => setCrmWizardStep(2)}
                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
                      >
                        <ChevronRight size={16} className="rotate-180" /> Back
                      </button>
                      <button
                        onClick={() => {
                          setCrmHighestStep(Math.max(crmHighestStep, 4));
                          setCrmWizardStep(4);
                        }}
                        className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2"
                      >
                        Next Step <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {crmWizardStep === 4 && (
                  <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-slate-800">Quotation Management</h4>
                            <p className="text-sm text-slate-500">Build and send customized quotes</p>
                          </div>
                        </div>
                        {getLeadCurrentStatus(selectedLead) === 'Quote Sent' && (
                          <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Quote Sent
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Quotation History */}
                         <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                               <h5 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                  <History size={16} className="text-slate-500" />
                                  Previous Quotes
                               </h5>
                            </div>
                            <div className="p-4 flex-1 overflow-y-auto max-h-[300px] bg-white">
                               {(selectedLead as any).quotations && (selectedLead as any).quotations.length > 0 ? (
                                  <div className="space-y-3">
                                     {(selectedLead as any).quotations.map((q: any, i: number) => (
                                        <div key={i} className="p-3 border border-slate-100 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group relative">
                                           <div className="flex justify-between items-start mb-2">
                                              <span className="text-xs font-bold text-slate-500">
                                                 {new Date(q.created_at).toLocaleDateString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
                                                 })}
                                              </span>
                                              <span className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">
                                                 v{i+1}
                                              </span>
                                           </div>
                                           <div className="text-sm font-bold text-slate-800 flex items-center justify-between">
                                              Total: ₹{(q.final_total || 0).toLocaleString('en-IN')}
                                              
                                              {/* Allow viewing/re-generating old quotes */}
                                              <button 
                                                onClick={() => {
                                                  // Restore old quote structure
                                                  if (q.services && Array.isArray(q.services)) {
                                                     setQuoteServices(q.services);
                                                     setQuoteDiscount(q.discount_amount || 0);
                                                     setQuoteAdditional(q.additional_charges || 0);
                                                     showToastMsg('Restored quotation v' + (i+1), 'success');
                                                  }
                                                }}
                                                className="text-indigo-600 hover:text-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                <RefreshCw size={14} />
                                              </button>
                                           </div>
                                        </div>
                                     ))}
                                  </div>
                               ) : (
                                  <div className="h-full flex flex-col items-center justify-center text-center py-8">
                                     <FileText size={24} className="text-slate-300 mb-2" />
                                     <p className="text-sm text-slate-500 font-medium">No quotes generated yet.</p>
                                  </div>
                               )}
                            </div>
                         </div>
                         
                         {/* Action Area */}
                         <div className="flex flex-col gap-4 justify-center">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-center">
                               <FileText size={32} className="text-indigo-500 mx-auto mb-3" />
                               <h5 className="font-bold text-indigo-900 mb-2">Create New Quotation</h5>
                               <p className="text-sm text-indigo-700/80 mb-5">Open the quote builder to configure services, discounts, and generate a PDF.</p>
                               
                               <button
                                  onClick={() => openCustomPDFGenerator(selectedLead)}
                                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
                               >
                                  <FileText size={18} /> Open Quote Builder
                               </button>
                            </div>
                            
                            {/* Negotiation Note Area */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                               <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-2">Negotiation Notes</label>
                               <textarea
                                 value={step4FollowUpNotes}
                                 onChange={(e) => setStep4FollowUpNotes(e.target.value)}
                                 className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium min-h-[80px]"
                                 placeholder="Record customer feedback on quotes..."
                               ></textarea>
                               <div className="mt-2 flex justify-end">
                                 <button
                                    onClick={handleUpdateFollowUp}
                                    disabled={isSaving || !step4FollowUpNotes.trim()}
                                    className="px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-md hover:bg-slate-700 disabled:opacity-50"
                                 >
                                    Save Note
                                 </button>
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <button
                        onClick={() => setCrmWizardStep(3)}
                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
                      >
                        <ChevronRight size={16} className="rotate-180" /> Back
                      </button>
                      <button
                        onClick={() => {
                          setCrmHighestStep(Math.max(crmHighestStep, 5));
                          setCrmWizardStep(5);
                        }}
                        className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2"
                      >
                        Next Step <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
                
                {crmWizardStep === 5 && (
                  <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <CheckCircle size={20} />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-slate-800">Finalize Order</h4>
                            <p className="text-sm text-slate-500">Confirm order and transition to active project</p>
                          </div>
                        </div>
                      </div>
                      
                      {getLeadCurrentStatus(selectedLead) === 'Order Confirmed' || getLeadCurrentStatus(selectedLead) === 'Event Scheduled' ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
                          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4">
                            <CheckCircle size={32} />
                          </div>
                          <h4 className="text-xl font-bold text-emerald-800 mb-2">Order Confirmed</h4>
                          <p className="text-emerald-700/80 mb-6 max-w-md mx-auto">This lead has been successfully converted into an active order. Further operations are managed in the respective dashboards.</p>
                          
                          <div className="flex flex-wrap items-center justify-center gap-4">
                            {orders.find(o => o.lead_id === selectedLead.lead_id) && (
                               <div className="bg-white border border-emerald-200 px-4 py-2 rounded-lg text-emerald-700 font-mono font-bold shadow-sm">
                                  Order ID: {orders.find(o => o.lead_id === selectedLead.lead_id)?.order_id}
                               </div>
                            )}
                            {getLeadCurrentStatus(selectedLead) === 'Order Confirmed' && (
                               <button 
                                 onClick={() => {
                                   setShowLeadDetails(false);
                                   setShowFinalReportingModal(true);
                                 }}
                                 className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2"
                               >
                                 <Clock size={16} /> Finalize Reporting Time
                               </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                            <h5 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                              <AlertCircle size={18} />
                              Pre-Confirmation Checklist
                            </h5>
                            
                            <div className="space-y-3">
                              <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100 cursor-pointer hover:border-blue-300 transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                  checked={confirmForm.paymentReceived}
                                  onChange={e => setConfirmForm({...confirmForm, paymentReceived: e.target.checked})}
                                />
                                <div>
                                  <span className="font-bold text-slate-700 block text-sm">Advance Payment Received</span>
                                  <span className="text-xs text-slate-500 mt-0.5 block">Confirm initial token/advance amount is processed.</span>
                                </div>
                              </label>
                              
                              <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100 cursor-pointer hover:border-blue-300 transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                  checked={confirmForm.contractSigned}
                                  onChange={e => setConfirmForm({...confirmForm, contractSigned: e.target.checked})}
                                />
                                <div>
                                  <span className="font-bold text-slate-700 block text-sm">Contract / Quote Accepted</span>
                                  <span className="text-xs text-slate-500 mt-0.5 block">Customer has formally accepted the final quotation terms.</span>
                                </div>
                              </label>
                              
                              <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100 cursor-pointer hover:border-blue-300 transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                  checked={confirmForm.datesFinalized}
                                  onChange={e => setConfirmForm({...confirmForm, datesFinalized: e.target.checked})}
                                />
                                <div>
                                  <span className="font-bold text-slate-700 block text-sm">Dates & Venues Finalized</span>
                                  <span className="text-xs text-slate-500 mt-0.5 block">Event schedule is locked and venues are confirmed.</span>
                                </div>
                              </label>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                             <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Final Agreed Value (₹)</label>
                                <input
                                   type="number"
                                   min="0"
                                   value={confirmForm.agreedValue}
                                   onChange={e => setConfirmForm({...confirmForm, agreedValue: Number(e.target.value)})}
                                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium mt-1.5"
                                   placeholder="0.00"
                                />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Advance Payment Received (₹)</label>
                                <input
                                   type="number"
                                   min="0"
                                   value={confirmForm.advanceReceived}
                                   onChange={e => setConfirmForm({...confirmForm, advanceReceived: Number(e.target.value)})}
                                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium mt-1.5"
                                   placeholder="0.00"
                                />
                             </div>
                          </div>
                          
                          <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Confirmation Notes</label>
                            <textarea
                              value={confirmForm.notes}
                              onChange={e => setConfirmForm({...confirmForm, notes: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium resize-y min-h-[100px] mt-1.5"
                              placeholder="Any final handover notes for operations/production teams..."
                            ></textarea>
                          </div>
                          
                          <div className="pt-4 flex justify-end">
                            <button
                               onClick={handleConfirmOrderSubmit}
                               disabled={isSaving || !confirmForm.paymentReceived || !confirmForm.contractSigned || !confirmForm.datesFinalized || confirmForm.agreedValue <= 0}
                               className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 text-lg"
                            >
                               {isSaving ? (
                                  <>
                                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                     Confirming...
                                  </>
                               ) : (
                                  <>
                                     <CheckCircle size={20} /> Convert to Order
                                  </>
                               )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-start pt-4">
                      <button
                        onClick={() => setCrmWizardStep(4)}
                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
                      >
                        <ChevronRight size={16} className="rotate-180" /> Back
                      </button>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Mark as Lost Modal */}
      {showLostModal && selectedLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in border border-slate-200">
            <div className="bg-red-50 border-b border-red-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <XCircle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-800">Mark Lead as Lost</h3>
                <p className="text-sm text-red-600/80 font-medium">Record reason for losing the deal</p>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Reason for loss</label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium mt-1.5"
                >
                  <option value="Price too high">Price too high</option>
                  <option value="Went with competitor">Went with competitor</option>
                  <option value="Event cancelled">Event cancelled</option>
                  <option value="Unresponsive">Unresponsive</option>
                  <option value="Timeline/Date unavailable">Timeline/Date unavailable</option>
                  <option value="Other">Other (Specify below)</option>
                </select>
              </div>
              
              {lostReason === 'Other' && (
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Specify Reason</label>
                  <input
                    type="text"
                    value={otherLostReason}
                    onChange={(e) => setOtherLostReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium mt-1.5"
                    placeholder="Enter custom reason..."
                  />
                </div>
              )}
              
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Additional Notes (Optional)</label>
                <textarea
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium resize-y min-h-[80px] mt-1.5"
                  placeholder="Any learnings or details about why we lost this deal..."
                ></textarea>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowLostModal(false)}
                className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkLost}
                disabled={isSaving || (lostReason === 'Other' && !otherLostReason.trim())}
                className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-md shadow-red-500/20 disabled:opacity-50"
              >
                {isSaving ? 'Processing...' : 'Confirm Lost'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Builder Modal */}
      {showStep3Popup && selectedLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-slate-50 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden animate-fade-in border border-slate-200 flex flex-col">
            <div className="bg-indigo-600 p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Quotation Builder</h3>
                  <p className="text-xs text-indigo-100 font-medium tracking-wide">For: {selectedLead.customer_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowStep3Popup(false)}
                className="p-2 text-indigo-100 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                     <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Load from Template</h4>
                     <Package size={16} className="text-slate-400" />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                     {packages.filter(p => p.status === 'Active').map(pkg => (
                        <button
                           key={pkg.package_id}
                           onClick={() => handleLoadPackageToQuote(pkg.package_id)}
                           className="shrink-0 px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-sm font-medium text-slate-700 transition-colors text-left"
                        >
                           <span className="block font-bold text-indigo-700 mb-0.5">{pkg.package_name}</span>
                           <span className="text-xs text-slate-500">₹{(pkg.price||0).toLocaleString('en-IN')}</span>
                        </button>
                     ))}
                  </div>
               </div>

               <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                     <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Quote Line Items</h4>
                  </div>
                  
                  <div className="p-4">
                     {quoteServices.map(service => (
                        <div key={service.id} className="flex flex-col md:flex-row gap-3 items-end mb-3 pb-3 border-b border-slate-100 last:border-0 last:mb-0 last:pb-0">
                           <div className="flex-1 w-full">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Service / Deliverable</label>
                              <input
                                 type="text"
                                 value={service.name}
                                 onChange={e => handleUpdateQuoteService(service.id, 'name', e.target.value)}
                                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-medium"
                              />
                           </div>
                           <div className="w-full md:w-24">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Qty</label>
                              <input
                                 type="number"
                                 min="1"
                                 value={service.qty}
                                 onChange={e => handleUpdateQuoteService(service.id, 'qty', e.target.value)}
                                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-medium text-center"
                              />
                           </div>
                           <div className="w-full md:w-32">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Price (₹)</label>
                              <input
                                 type="number"
                                 min="0"
                                 value={service.price}
                                 onChange={e => handleUpdateQuoteService(service.id, 'price', e.target.value)}
                                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-medium text-right"
                              />
                           </div>
                           <div className="w-full md:w-32">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Total</label>
                              <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded text-sm font-bold text-slate-700 text-right">
                                 ₹{((service.qty||1) * (service.price||0)).toLocaleString('en-IN')}
                              </div>
                           </div>
                           <button
                              onClick={() => handleRemoveQuoteService(service.id)}
                              className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 mb-px"
                           >
                              <Trash2 size={16} />
                           </button>
                        </div>
                     ))}
                     
                     {quoteServices.length === 0 && (
                        <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                           <p className="text-sm text-slate-500 font-medium">No items in quotation.</p>
                           <p className="text-xs text-slate-400 mt-1">Load a package or add custom items below.</p>
                        </div>
                     )}

                     <div className="mt-4 pt-4 border-t border-slate-200">
                        {isAddingInline ? (
                           <div className="flex flex-col md:flex-row gap-3 items-end bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                              <div className="flex-1 w-full">
                                 <input
                                    type="text"
                                    placeholder="Service / Deliverable Name"
                                    value={newServiceName}
                                    onChange={e => setNewServiceName(e.target.value)}
                                    autoFocus
                                    className="w-full px-3 py-2 border border-indigo-200 rounded text-sm font-medium"
                                 />
                              </div>
                              <div className="w-full md:w-24">
                                 <input
                                    type="number"
                                    placeholder="Qty"
                                    min="1"
                                    value={newServiceQty}
                                    onChange={e => setNewServiceQty(e.target.value)}
                                    className="w-full px-3 py-2 border border-indigo-200 rounded text-sm font-medium text-center"
                                 />
                              </div>
                              <div className="w-full md:w-32">
                                 <input
                                    type="number"
                                    placeholder="Price (₹)"
                                    min="0"
                                    value={newServicePrice}
                                    onChange={e => setNewServicePrice(e.target.value)}
                                    className="w-full px-3 py-2 border border-indigo-200 rounded text-sm font-medium text-right"
                                 />
                              </div>
                              <div className="flex items-center gap-2">
                                 <button
                                    onClick={handleAddCustomQuoteService}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-bold hover:bg-indigo-700 shadow-sm"
                                 >
                                    Add
                                 </button>
                                 <button
                                    onClick={() => setIsAddingInline(false)}
                                    className="px-3 py-2 bg-white text-slate-600 rounded text-sm font-bold border border-slate-200 hover:bg-slate-50"
                                 >
                                    Cancel
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <button
                              onClick={() => {
                                 setNewServiceName('');
                                 setNewServiceQty(1);
                                 setNewServicePrice(0);
                                 setIsAddingInline(true);
                              }}
                              className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:text-indigo-800 transition-colors py-2 px-3 rounded hover:bg-indigo-50"
                           >
                              <Plus size={16} /> Add Custom Item
                           </button>
                        )}
                     </div>
                  </div>
               </div>
               
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-4">
                        <div>
                           <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Discount Amount (₹)</label>
                           <input
                              type="number"
                              min="0"
                              value={quoteDiscount}
                              onChange={e => setQuoteDiscount(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
                           />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Additional Charges (₹)</label>
                           <input
                              type="number"
                              min="0"
                              value={quoteAdditional}
                              onChange={e => setQuoteAdditional(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
                           />
                        </div>
                     </div>
                     
                     <div className="bg-slate-800 rounded-xl p-5 text-white flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-2 text-sm text-slate-300">
                           <span>Subtotal:</span>
                           <span>₹{quoteServices.reduce((sum, item) => sum + ((item.qty||1) * (item.price||0)), 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2 text-sm text-emerald-400">
                           <span>Discount:</span>
                           <span>- ₹{(Number(quoteDiscount)||0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4 text-sm text-amber-400">
                           <span>Additional:</span>
                           <span>+ ₹{(Number(quoteAdditional)||0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="border-t border-slate-600 pt-3 flex justify-between items-center">
                           <span className="font-bold uppercase tracking-wider text-sm">Final Quote</span>
                           <span className="text-2xl font-black">
                              ₹{(
                                 quoteServices.reduce((sum, item) => sum + ((item.qty||1) * (item.price||0)), 0)
                                 - (Number(quoteDiscount)||0)
                                 + (Number(quoteAdditional)||0)
                              ).toLocaleString('en-IN')}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            
            <div className="bg-white p-4 border-t border-slate-200 flex justify-between shrink-0">
               <button
                  onClick={() => setShowStep3Popup(false)}
                  className="px-6 py-2 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
               >
                  Close
               </button>
               <button
                  onClick={handleGeneratePDF}
                  disabled={isSaving || quoteServices.length === 0}
                  className="px-8 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
               >
                  {isSaving ? (
                     <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Generating...
                     </>
                  ) : (
                     <>
                        <Download size={18} /> Generate PDF & Save
                     </>
                  )}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Request Modal */}
      {showUnlockRequestModal && selectedUnlockLead && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in border border-slate-200">
            <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <Unlock size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-800">Request Record Unlock</h3>
                <p className="text-sm text-amber-600/80 font-medium">Require admin approval to edit this locked record.</p>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Reason for Request</label>
                <select
                  value={unlockRequestReason}
                  onChange={(e) => setUnlockRequestReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm font-medium mt-1.5"
                >
                  <option value="Customer requested additional discount">Customer requested additional discount</option>
                  <option value="Need to change deliverables/scope">Need to change deliverables/scope</option>
                  <option value="Incorrect details entered">Incorrect details entered</option>
                  <option value="Event date/venue changed">Event date/venue changed</option>
                  <option value="Other">Other (Specify below)</option>
                </select>
              </div>
              
              {unlockRequestReason === 'Other' && (
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Specify Custom Reason</label>
                  <input
                    type="text"
                    value={unlockRequestCustomReason}
                    onChange={(e) => setUnlockRequestCustomReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm font-medium mt-1.5"
                    placeholder="Provide details for the admin..."
                  />
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowUnlockRequestModal(false)}
                className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitUnlockRequest}
                disabled={isSaving || (unlockRequestReason === 'Other' && !unlockRequestCustomReason.trim())}
                className="px-6 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {isSaving ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Final Reporting Finalize Modal */}
      {showFinalReportingModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-fade-in border border-slate-200">
            <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-800">Finalize Event Reporting</h3>
                <p className="text-sm text-emerald-600/80 font-medium">Set arrival time for {selectedLead.customer_name}</p>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Reporting Time *</label>
                <input
                  type="time"
                  value={reportingTime}
                  onChange={(e) => setReportingTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium mt-1.5"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Internal Notes (Optional)</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium resize-y min-h-[100px] mt-1.5"
                  placeholder="Any final notes for the production team..."
                ></textarea>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowFinalReportingModal(false)}
                className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeEventReporting}
                disabled={isSaving || !reportingTime}
                className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSaving ? 'Finalizing...' : 'Finalize Reporting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal (General) */}
      {showAddNoteModal && selectedLead && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in border border-slate-200">
               <div className="bg-blue-50 border-b border-blue-100 p-4 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                   <MessageSquare size={20} />
                 </div>
                 <div>
                   <h3 className="text-lg font-bold text-blue-800">Add Quick Note</h3>
                   <p className="text-sm text-blue-600/80 font-medium">For: {selectedLead.customer_name}</p>
                 </div>
               </div>
               
               <div className="p-6">
                 <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Note Content</label>
                 <textarea
                   value={noteText}
                   onChange={(e) => setNoteText(e.target.value)}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium resize-y min-h-[120px] mt-1.5"
                   placeholder="Enter your note here..."
                   autoFocus
                 ></textarea>
               </div>
               
               <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-3">
                 <button
                   onClick={() => {
                      setShowAddNoteModal(false);
                      setNoteText('');
                   }}
                   className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleSaveAddNote}
                   disabled={isSaving || !noteText.trim()}
                   className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50"
                 >
                   {isSaving ? 'Saving...' : 'Save Note'}
                 </button>
               </div>
            </div>
         </div>
      )}
      
    </div>
  );
};

export default SalesModule;
