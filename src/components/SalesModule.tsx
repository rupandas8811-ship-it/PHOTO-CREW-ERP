import React, { useState, useEffect, useRef } from 'react';
import { AddNoteModal } from "./AddNoteModal";
import { createPortal } from 'react-dom';
import { useRole, mapUserFieldsFromDb, INITIAL_PACKAGES, getStatusRank, isFollowUpDateTimeReached } from './RoleContext';
import { supabaseClient } from '../supabaseClient';
import { 
  FileText, Plus, Edit, CheckSquare, Search, Filter, Ban, X, Phone, Mail, MapPin, Calendar, DollarSign, Clock, Users, ArrowRight, ChevronDown, ChevronUp, Check, Package, Trash, Trash2, Eye, Loader2, CheckCircle2, RefreshCw
} from 'lucide-react';
import { Lead, CurrentStage, LeadPackage, EVENT_TYPES, PACKAGE_CATEGORIES, ACTIVE_STAGE_GROUPS, LeadEvent } from '../types';
import { StatusText } from './ui/StatusText';
import { EventDropdownCell } from './EventDropdownCell';
import { UnifiedEventDropdownCell } from './UnifiedEventDropdownCell';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { CameraLensStatsCard, CameraLensTheme } from './CameraLensStatsCard';
import { ListSortFilter, SortOrder } from './ui/ListSortFilter';

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
  // e.g. "16√ó6", "16x6", "12√ó8 Album", "16√ó6 Frame", "16 √ó 6", "12 x 18", "8x24", "8*12", "12√ó36"
  // If the string starts with a dimension (digits x/√ó digits), it is deliverable text, NOT a leading quantity!
  const isLeadingDimension = /^\d+\s*[\*xX√ó]\s*\d+/.test(text);
  if (isLeadingDimension) {
    return { qty: 1, text };
  }

  // 3. Check for technical specifications / units starting with numbers:
  // e.g. "4K Cinematic Video", "8K Video", "20 Pages √ó 2", "400 Edited Candid Photos", "50 Photos", "3 Hours", "10 Sheets"
  const isUnitOrSpec = /^\d+\s*(?:[kK]\b|min\b|mins\b|minute|minutes|sec\b|secs\b|second|seconds|hr\b|hrs\b|hour|hours|page|pages|sheet|sheets|photo|photos|image|images|pic|pics|picture|pictures|gb\b|mb\b|tb\b|day\b|days\b|edited\b)/i.test(text);
  if (isUnitOrSpec) {
    return { qty: 1, text };
  }

  // 4. Check for leading quantity with explicit multiplier:
  // e.g. "2 x Traditional Photos", "2 √ó Cinematic Video", "2 * Album", "2 x 16√ó6 Frame", "2 √ó 16√ó6"
  const multiplierMatch = text.match(/^(\d+)\s*[xX√ó\*]\s+(.+)$/);
  if (multiplierMatch) {
    const parsedQty = parseInt(multiplierMatch[1], 10);
    if (!isNaN(parsedQty) && parsedQty >= 1) {
      return { qty: parsedQty, text: multiplierMatch[2].trim() };
    }
  }

  // 5. Check for leading quantity followed by dimension:
  // e.g. "2 16√ó6", "3 12√ó8 Album", "2 16√ó6 Frame"
  const qtyDimensionMatch = text.match(/^(\d+)\s+(\d+\s*[\*xX√ó]\s*\d+.*)$/);
  if (qtyDimensionMatch) {
    const parsedQty = parseInt(qtyDimensionMatch[1], 10);
    if (!isNaN(parsedQty) && parsedQty >= 1) {
      return { qty: parsedQty, text: qtyDimensionMatch[2].trim() };
    }
  }

  // 6. Check for leading quantity with space followed by item name:
  // e.g. "2 Lead Photographer", "1 Drone Operator", "2 Albums", "2 Frames (12√ó18)"
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
          <span className="sm:hidden">üóë</span>
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
    ? shootTypes.map((st: string) => `‚Ä¢ ${st}`) 
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
      .replace(/√æ√ø/g, '')
      .replace(/√ø√æ/g, '')
      .replace(/\uFEFF/g, '')
      .replace(/\uFFFE/g, '');
    cleaned = cleaned.replace(/^[\s‚Ä¢\-\*\u2022\u0095\x95\x96\u2013\u2014\s]+/g, '');
    cleaned = cleaned.replace(/[‚Çπ\u20B9\u20b9]/g, 'Rs.');
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
    'If duration exceeds 1 hour, additional charges of ‚Çπ1,500 per hour will be applicable.',
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

      // Team members table (with header)
      if (evObj.members.length > 0) {
        simTable(evObj.members.length, false);
      }

      // Deliverables table (with header)
      if (evObj.deliverables.length > 0) {
        simTable(evObj.deliverables.length, false);
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
        const cleanTerm = term.replace(/^\d+[\.\s\-)]+\s*/, '').replace(/[‚Çπ\u20B9\u20b9]/g, 'Rs.').replace(/\s+/g, ' ').trim();
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

  const parsePdfItem = (raw: any): { name: string; qty: number } => {
    if (raw === null || raw === undefined) return { name: '', qty: 1 };
    if (typeof raw === 'object') {
      const rawName = String(raw.name || raw.role || raw.member_name || raw.text || raw.deliverable || raw.title || '').trim();
      const parsed = parseQtyAndText(rawName);
      const q = Number(raw.qty || raw.quantity || raw.count || parsed.qty || 1);
      const qty = isNaN(q) || q < 1 ? 1 : q;
      let name = parsed.text || rawName;
      name = cleanText(name);
      name = name.replace(/^DELIVERABLES\s*[:-]?\s*/i, '');
      name = name.replace(/^TEAM MEMBERS?\s*(?:INCLUDED)?\s*[:-]?\s*/i, '');
      name = name.replace(/\s*[\(\[-]?\s*(?:qty|quantity|count)\s*[:=]?\s*\d+\s*[\)\]\-]?/gi, '').trim();
      return { name, qty };
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return { name: '', qty: 1 };
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsedObj = JSON.parse(trimmed);
          return parsePdfItem(parsedObj);
        } catch (e) {}
      }
      const parsed = parseQtyAndText(trimmed);
      let name = parsed.text || trimmed;
      name = cleanText(name);
      name = name.replace(/^DELIVERABLES\s*[:-]?\s*/i, '');
      name = name.replace(/^TEAM MEMBERS?\s*(?:INCLUDED)?\s*[:-]?\s*/i, '');
      name = name.replace(/\s*[\(\[-]?\s*(?:qty|quantity|count)\s*[:=]?\s*\d+\s*[\)\]\-]?/gi, '').trim();
      const qty = parsed.qty >= 1 ? parsed.qty : 1;
      return { name, qty };
    }
    return { name: cleanText(String(raw)), qty: 1 };
  };

  const drawTeamMembersTable = (title: string, members: any[]) => {
    if (!members || members.length === 0) return;

    const mapped = members.map(m => parsePdfItem(m)).filter(m => m.name.length > 0);
    if (mapped.length === 0) return;

    let tableH = 4 + 7.5; // Title spacing + Header row
    mapped.forEach((item) => {
      const wrappedName = doc.splitTextToSize(item.name, 154);
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

    // Header Row (Slate-800)
    doc.setFillColor(30, 41, 59);
    doc.rect(15, currentY, 180, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    // Narrow QTY column: from 15 to 35 (width 20mm), centered at 25
    doc.text('QTY', 25, currentY + 4.8, { align: 'center' });
    // Main column: from 35 to 195 (width 160mm), text start at 38
    doc.text('TEAM MEMBER', 38, currentY + 4.8);

    currentY += 7.5;

    doc.setDrawColor(203, 213, 225); 
    doc.setLineWidth(0.2);

    mapped.forEach((item, index) => {
      const wrappedName = doc.splitTextToSize(item.name, 154);
      const rowHeight = Math.max(7.5, wrappedName.length * cfg.rowTextHeight + cfg.rowPadding);

      if (currentY + rowHeight > 250) {
        doc.line(15, currentY, 195, currentY);
        currentY = createNewPage();

        doc.setFillColor(30, 41, 59);
        doc.rect(15, currentY, 180, 7.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text('QTY', 25, currentY + 4.8, { align: 'center' });
        doc.text('TEAM MEMBER (CONTINUED)', 38, currentY + 4.8);
        currentY += 7.5;
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, rowHeight, 'F');
      }

      // Vertical table border lines
      doc.line(15, currentY, 15, currentY + rowHeight);
      doc.line(35, currentY, 35, currentY + rowHeight);
      doc.line(195, currentY, 195, currentY + rowHeight);

      // Qty value (centered in 15..35)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(String(item.qty || 1), 25, currentY + 4.3, { align: 'center' });

      // Member Name in main column (at 38)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      wrappedName.forEach((line: string, i: number) => {
        doc.text(line, 38, currentY + 4.3 + (i * cfg.rowTextHeight));
      });

      // Horizontal row bottom line
      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
      currentY += rowHeight;
    });

    currentY += cfg.tableSpacing; 
  };

  const drawEventDeliverablesTable = (title: string, deliverables: any[]) => {
    if (!deliverables || deliverables.length === 0) return;

    const mapped = deliverables.map(d => parsePdfItem(d)).filter(d => d.name.length > 0);
    if (mapped.length === 0) return;

    let tableH = 4 + 7.5; // Title spacing + Header row
    mapped.forEach((item) => {
      const wrappedName = doc.splitTextToSize(item.name, 154);
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

    // Header Row (Slate-800)
    doc.setFillColor(30, 41, 59);
    doc.rect(15, currentY, 180, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    // Narrow QTY column: from 15 to 35 (width 20mm), centered at 25
    doc.text('QTY', 25, currentY + 4.8, { align: 'center' });
    // Main column: from 35 to 195 (width 160mm), text start at 38
    doc.text('DELIVERABLE', 38, currentY + 4.8);

    currentY += 7.5;

    doc.setDrawColor(203, 213, 225); 
    doc.setLineWidth(0.2);

    mapped.forEach((item, index) => {
      const wrappedName = doc.splitTextToSize(item.name, 154);
      const rowHeight = Math.max(7.5, wrappedName.length * cfg.rowTextHeight + cfg.rowPadding);

      if (currentY + rowHeight > 250) {
        doc.line(15, currentY, 195, currentY);
        currentY = createNewPage();

        doc.setFillColor(30, 41, 59);
        doc.rect(15, currentY, 180, 7.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text('QTY', 25, currentY + 4.8, { align: 'center' });
        doc.text('DELIVERABLE (CONTINUED)', 38, currentY + 4.8);
        currentY += 7.5;
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, rowHeight, 'F');
      }

      // Vertical table border lines
      doc.line(15, currentY, 15, currentY + rowHeight);
      doc.line(35, currentY, 35, currentY + rowHeight);
      doc.line(195, currentY, 195, currentY + rowHeight);

      // Qty value (centered in 15..35)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(String(item.qty || 1), 25, currentY + 4.3, { align: 'center' });

      // Deliverable Name in main column (at 38)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      wrappedName.forEach((line: string, i: number) => {
        doc.text(line, 38, currentY + 4.3 + (i * cfg.rowTextHeight));
      });

      // Horizontal row bottom line
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
      ? `EVENT ‚Äî ${evObj.eventName.toUpperCase()}`
      : `EVENT ${idx + 1} ‚Äî ${evObj.eventName.toUpperCase()}`;
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
      const cleanTerm = term.replace(/^\d+[\.\s\-)]+\s*/, '').replace(/[‚Çπ\u20B9\u20b9]/g, 'Rs.').replace(/\s+/g, ' ').trim();
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
            `‚ùå Database Schema Alert: The 'category' column is missing from the 'packages' table in Supabase. Although the app is safely resolving categories using automated description serialization, categories are not stored as a dedicated column at the database level.`
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
    console.error(`‚ùå ${title}\nReason: ${reason}\nFunction: ${failedFunction}\n`, err);
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
    quotation_amount: 0,
    advance_received: 0,
    event_date: '',
    event_time: '',
    payment_mode: 'UPI',
    notes: '',
    transaction_id: '',
  });

  // Final Reporting Details State per event
  const [eventsReporting, setEventsReporting] = useState<Record<string, { reporting_date: string, reporting_time: string }>>({});

  const initEventsReporting = (lead: Lead | null | undefined) => {
    if (!lead) return;
    const initialMap: Record<string, { reporting_date: string, reporting_time: string }> = {};
    if (lead.events && Array.isArray(lead.events) && lead.events.length > 0) {
      lead.events.forEach((ev, idx) => {
        const key = ev.id || `ev_${idx}`;
        initialMap[key] = {
          reporting_date: ev.reporting_date || (ev as any).Reporting_date || ev.event_date || ev.event_start_date || lead.Reporting_date || (lead as any).reporting_date || lead.event_date || '',
          reporting_time: ev.reporting_time || lead.reporting_time || ''
        };
      });
    } else {
      initialMap['default'] = {
        reporting_date: lead.Reporting_date || (lead as any).reporting_date || lead.event_date || '',
        reporting_time: lead.reporting_time || ''
      };
    }
    setEventsReporting(initialMap);
  };

  const [showFinalReportingModal, setShowFinalReportingModal] = useState(false);
  const [finalReportingForm, setFinalReportingForm] = useState<Record<string, { reporting_date: string, reporting_time: string }>>({});

  const areReportingDetailsComplete = (lead: Lead | null | undefined): boolean => {
    if (!lead) return false;

    if (lead.events && Array.isArray(lead.events) && lead.events.length > 0) {
      return lead.events.every((ev) => {
        const rDate = ev.reporting_date || (ev as any).Reporting_date;
        const rTime = ev.reporting_time;
        return typeof rDate === 'string' && rDate.trim() !== '' && typeof rTime === 'string' && rTime.trim() !== '';
      });
    }

    const leadRDate = lead.Reporting_date || (lead as any).reporting_date;
    const leadRTime = lead.reporting_time;
    return typeof leadRDate === 'string' && leadRDate.trim() !== '' && typeof leadRTime === 'string' && leadRTime.trim() !== '';
  };

  const openReportingDetailsModal = (lead: Lead, customMsg?: string) => {
    setSelectedLead(lead);
    const crmEvents = lead.events || [];
    const initialFormState: Record<string, { reporting_date: string, reporting_time: string }> = {};

    if (crmEvents.length > 0) {
      crmEvents.forEach((ev) => {
        initialFormState[ev.id] = {
          reporting_date: ev.reporting_date || ev.event_date || lead.Reporting_date || lead.event_date || '',
          reporting_time: ev.reporting_time || lead.reporting_time || ''
        };
      });
    } else {
      initialFormState['default'] = {
        reporting_date: lead.Reporting_date || (lead as any).reporting_date || lead.event_date || '',
        reporting_time: lead.reporting_time || ''
      };
    }

    setFinalReportingForm(initialFormState);
    setShowFinalReportingModal(true);
    showToastMsg(customMsg || "Please complete and save the Reporting Details before confirming the order.", "error");
  };

  // Quotation System State
  const [quotationTerms, setQuotationTerms] = useState(
    "1. Payments are non-refundable.\n" +
    "2. Crew food arrangements from client side.\n" +
    "3. 50% advance payment before the event.\n" +
    "4. If duration exceeds 1 hour, additional charges of ‚Çπ1,500 per hour will be applicable.\n" +
    "5. 50% full payment on event day.\n" +
    "6. Pendrive and Hard Disk are not included.\n" +
    "7. Edited data will be shared via Google Drive link."
  );
  const [generatedPDFBlobUrl, setGeneratedPDFBlobUrl] = useState<string>('');
  const [activeQuoteNum, setActiveQuoteNum] = useState<string>('');
  const [showStep3Popup, setShowStep3Popup] = useState<boolean>(false);
  const [step3Option, setStep3Option] = useState<'negotiation' | 'quotation_send'>('negotiation');

  // Customizable inclusions, deliverables, discount, and additional charges states
  const [editableInclusions, setEditableInclusions] = useState<Record<string, string[]>>({});
  const [editableDeliverables, setEditableDeliverables] = useState<Record<string, string[]>>({});
  
  const [step3AutoSaveStatus, setStep3AutoSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);

  const step3SaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveStep3DataRealtime = async (
    updatedInclusions: Record<string, string[]>,
    updatedDeliverables: Record<string, string[]>,
    activePkgId?: string,
    packageCostOverride?: number | null,
    discountOverride?: number | null,
    additionalOverride?: number | null
  ) => {
    if (isStep3Locked) return;
    const pkgId = activePkgId || wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedPkgIds[0] || 'Custom Package';
    const leadId = selectedLead?.lead_id || createdLeadId;
    if (!leadId || leadId === 'DRAFT-LEAD' || !pkgId || !supabaseClient) return;

    setStep3AutoSaveStatus('saving');

    const activeEventsList = (activeTab === 'create' && createEvents.length > 0) ? createEvents : (crmEvents && crmEvents.length > 0 ? crmEvents : []);
    const { teamMembersJson, deliverablesJson, flatTeamMembers, teamMembersText, deliverablesText } = buildStep3EventPayloads(
      pkgId,
      activeEventsList,
      updatedInclusions,
      updatedDeliverables
    );

    const safeTeamMembersText = teamMembersText;
    const safeDeliverablesText = deliverablesText;

    console.log('TEAM MEMBERS SAVE', { leadId, teamMembers: flatTeamMembers, serialized: safeTeamMembersText });

    const cleanPkgCost = packageCostOverride !== undefined ? packageCostOverride : (
      wizardLeadData.package_cost !== "" && wizardLeadData.package_cost != null && !isNaN(Number(wizardLeadData.package_cost))
      ? Number(wizardLeadData.package_cost)
      : (wizardLeadData.package_price !== "" && wizardLeadData.package_price != null && !isNaN(Number(wizardLeadData.package_price))
        ? Number(wizardLeadData.package_price)
        : (wizardLeadData.budget ? Number(wizardLeadData.budget) : null))
    );

    const cleanDiscount = discountOverride !== undefined ? (discountOverride || 0) : (
      quoteDiscount === "" || quoteDiscount == null || isNaN(Number(quoteDiscount)) ? 0 : Number(quoteDiscount)
    );
    const cleanAdditional = additionalOverride !== undefined ? (additionalOverride || 0) : (
      quoteAdditional === "" || quoteAdditional == null || isNaN(Number(quoteAdditional)) ? 0 : Number(quoteAdditional)
    );
    const cleanFinalAmt = Math.max(0, (cleanPkgCost || 0) + cleanAdditional - cleanDiscount);

    const updatePayload: any = {
      Team_Members: safeTeamMembersText,
      Add_Deliverable: safeDeliverablesText,
      Select_Package_Option: pkgId,
      Quotation_Discount: cleanDiscount,
      Additional_Services_Cost: cleanAdditional,
      Final_Quotation_Amount: cleanFinalAmt,
      Final_Package_Amount: cleanFinalAmt,
      final_package_amount: cleanFinalAmt,
      _explicit_step3_save: true
    };

    if (cleanPkgCost !== null && cleanPkgCost !== undefined) {
      updatePayload.package_price = cleanPkgCost;
      updatePayload.budget = cleanPkgCost;
    }

    if (step3SaveTimeoutRef.current) {
      clearTimeout(step3SaveTimeoutRef.current);
    }

    step3SaveTimeoutRef.current = setTimeout(async () => {
      try {
        // Direct Supabase update to ensure public.leads.Team_Members and Final_Package_Amount are immediately saved
        try {
          const { data: dbResult, error: dbError } = await supabaseClient
            .from('leads')
            .update({
              Team_Members: safeTeamMembersText,
              Add_Deliverable: safeDeliverablesText,
              Select_Package_Option: pkgId,
              Quotation_Discount: cleanDiscount,
              Additional_Services_Cost: cleanAdditional,
              Final_Quotation_Amount: cleanFinalAmt,
              Final_Package_Amount: cleanFinalAmt,
              ...(cleanPkgCost !== null && cleanPkgCost !== undefined ? { package_price: cleanPkgCost, budget: cleanPkgCost } : {})
            })
            .eq('lead_id', leadId)
            .select('*');
          console.log('TEAM MEMBERS SAVED', { leadId, Team_Members: safeTeamMembersText });
          console.log('FINAL PACKAGE AMOUNT SAVED', { leadId, Final_Package_Amount: cleanFinalAmt });
          console.log('TEAM MEMBERS DB RESULT', { data: dbResult, error: dbError });
        } catch (dbErr) {
          console.warn("Direct Supabase update warning:", dbErr);
        }

        // Update using RoleContext to keep the local leads array perfectly in sync
        await updateLead(leadId, updatePayload);
        setStep3AutoSaveStatus('saved');
        
        // Update local context manually to ensure instant visual sync in modal
        if (selectedLead) {
          setSelectedLead(prev => {
            if (!prev) return null;
            return {
              ...prev,
              Team_member: safeTeamMembersText,
              Team_Members: safeTeamMembersText,
              team_members: safeTeamMembersText,
              Add_Deliverable: safeDeliverablesText,
              deliverables_description: safeDeliverablesText,
              Select_Package_Option: pkgId,
              Quotation_Discount: cleanDiscount,
              Additional_Services_Cost: cleanAdditional,
              Final_Quotation_Amount: cleanFinalAmt,
              Final_Package_Amount: cleanFinalAmt,
              final_package_amount: cleanFinalAmt,
              ...(cleanPkgCost !== null && cleanPkgCost !== undefined ? {
                package_price: cleanPkgCost,
                budget: cleanPkgCost
              } : {})
            };
          });
        }
        
        // Also sync wizardLeadData deliverables and team members state
        setWizardLeadData(prev => ({
          ...prev,
          Team_member: safeTeamMembersText,
          Team_Members: safeTeamMembersText,
          team_members: safeTeamMembersText,
          Add_Deliverable: safeDeliverablesText,
          deliverables: deliverablesText,
          deliverables_description: deliverablesText,
          Select_Package_Option: pkgId,
          final_amount: cleanFinalAmt,
          ...(cleanPkgCost !== null && cleanPkgCost !== undefined ? {
            package_price: cleanPkgCost,
            budget: cleanPkgCost
          } : {})
        }));

        // Also save / update lead_packages record in Supabase
        try {
          const isTeamEmpty = teamMembersText === '[]' || teamMembersText === '';
          const isDelEmpty = deliverablesText === '[]' || deliverablesText === '';

          const packagePayload = {
            lead_id: leadId,
            package_id: pkgId,
            package_name: wizardLeadData.package_name || (pkgId === 'Custom Package' || pkgId === 'custom_package' ? 'Custom Package' : `Package ${pkgId}`),
            quantity: 1,
            total_amount: cleanPkgCost || 0,
            discount: quoteDiscount || 0,
            final_amount: (cleanPkgCost || 0) + (quoteAdditional || 0) - (quoteDiscount || 0),
            Team_Members_Included: teamMembersJson,
            editable_inclusions: updatedInclusions,
            deliverables_descriptionn: deliverablesJson, // keeping typo just in case other code uses it, but adding deliverables_json too
            deliverables_json: deliverablesJson,
            deliverables_description: deliverablesText,
            editable_deliverables: updatedDeliverables,
            updated_at: new Date().toISOString()
          };

          const { data: existingLps } = await supabaseClient
            .from('lead_packages')
            .select('*')
            .eq('lead_id', leadId);
          
          let targetLpId = `LP-${leadId}-${pkgId}`;
          
          if (existingLps && existingLps.length > 0) {
            const matched = existingLps.find(lp => String(lp.package_id) === String(pkgId)) || existingLps[0];
            targetLpId = matched.lead_package_id || matched.id || targetLpId;
            await supabaseClient
              .from('lead_packages')
              .update(packagePayload)
              .eq(matched.lead_package_id ? 'lead_package_id' : 'id', targetLpId);
          } else {
            await supabaseClient
              .from('lead_packages')
              .insert({
                ...packagePayload,
                lead_package_id: targetLpId,
                created_at: new Date().toISOString()
              });
          }
        } catch (e) {
          console.warn("Could not update lead_packages in saveStep3DataRealtime:", e);
        }
      } catch (err) {
        console.error("Exception in saveStep3DataRealtime:", err);
        setStep3AutoSaveStatus('error');
      }
    }, 400);
  };

  const getCleanSalesStaffName = (rawName?: any, leadObj?: Lead | null): string => {
    let candidate = String(rawName || '').trim();

    if (!candidate && leadObj) {
      if (leadObj.sales_staff_name && String(leadObj.sales_staff_name).trim()) {
        candidate = String(leadObj.sales_staff_name).trim();
      } else if (leadObj.sales_person && !['Sales', 'Sales Team', 'Admin', 'Admin User'].includes(String(leadObj.sales_person).trim())) {
        candidate = String(leadObj.sales_person).trim();
      }
    }

    if (!candidate && currentUser?.name) {
      candidate = currentUser.name;
    }

    if (!candidate) return '';

    // If candidate contains comma-separated names, extract only the actual Sales Person
    if (candidate.includes(',')) {
      if (leadObj?.sales_person && !['Sales', 'Sales Team', 'Admin', 'Admin User'].includes(String(leadObj.sales_person).trim())) {
        const sp = String(leadObj.sales_person).trim().toLowerCase();
        const parts = candidate.split(',').map(s => s.trim());
        const match = parts.find(p => p.toLowerCase() === sp || p.toLowerCase().includes(sp) || sp.includes(p.toLowerCase()));
        if (match) return match;
      }
      return candidate.split(',')[0].trim();
    }

    return candidate;
  };

  const getCleanSalesStaffMobile = (rawMobile?: any, leadObj?: Lead | null): string => {
    let candidate = String(rawMobile || '').trim();

    if (!candidate && leadObj && leadObj.sales_staff_mobile && String(leadObj.sales_staff_mobile).trim()) {
      candidate = String(leadObj.sales_staff_mobile).trim();
    }

    if (!candidate && currentUser?.mobile) {
      candidate = currentUser.mobile || '';
    }

    if (!candidate) return '';

    if (candidate.includes('||')) {
      candidate = candidate.split('||')[0].trim();
    }
    if (candidate.includes(',')) {
      candidate = candidate.split(',')[0].trim();
    }

    return candidate;
  };

  // Helper to reliably resolve Final Package Amount from existing booking / package / quotation data without returning 0 if a valid amount exists
  const getLeadFinalPackageAmount = (
    leadObj?: Lead | null,
    wizardData?: any,
    currentConfirmVal?: number
  ): number => {
    // 1. Direct candidate fields on the lead / booking object
    if (leadObj) {
      const directCandidates = [
        leadObj.Final_Package_Amount,
        (leadObj as any).final_package_amount,
        leadObj.Final_Quotation_Amount,
        (leadObj as any).final_quotation_amount,
        (leadObj as any).final_amount,
        (leadObj as any).final_quoted_amount,
        (leadObj as any).quotation_amount,
      ];
      for (const val of directCandidates) {
        if (val !== undefined && val !== null && val !== '') {
          const num = Number(val);
          if (!Number.isNaN(num) && num > 0) {
            return num;
          }
        }
      }
    }

    // 2. Wizard lead data fields if currently editing / interacting in wizard
    if (wizardData) {
      const wizCandidates = [
        wizardData.final_amount,
        wizardData.final_quoted_amount,
        wizardData.quotation_amount,
      ];
      for (const val of wizCandidates) {
        if (val !== undefined && val !== null && val !== '') {
          const num = Number(val);
          if (!Number.isNaN(num) && num > 0) {
            return num;
          }
        }
      }
    }

    // 3. Check existing confirmForm value if a valid positive number was provided
    if (currentConfirmVal !== undefined && currentConfirmVal !== null && !Number.isNaN(Number(currentConfirmVal))) {
      const num = Number(currentConfirmVal);
      if (!Number.isNaN(num) && num > 0) {
        return num;
      }
    }

    // 4. Derive from package price + additional services - discounts
    if (leadObj) {
      let basePkgPrice: number | null = null;
      if (leadObj.package_price !== undefined && leadObj.package_price !== null && !Number.isNaN(Number(leadObj.package_price)) && Number(leadObj.package_price) > 0) {
        basePkgPrice = Number(leadObj.package_price);
      } else if (wizardData?.package_cost && !Number.isNaN(Number(wizardData.package_cost)) && Number(wizardData.package_cost) > 0) {
        basePkgPrice = Number(wizardData.package_cost);
      } else if (wizardData?.package_price && !Number.isNaN(Number(wizardData.package_price)) && Number(wizardData.package_price) > 0) {
        basePkgPrice = Number(wizardData.package_price);
      } else if (packages && packages.length > 0) {
        const selectedPkgId = leadObj.Select_Package_Option || wizardData?.selected_package_id;
        const matchedPkg = packages.find(p => String(p.package_id) === String(selectedPkgId) || String(p.package_name) === String(selectedPkgId));
        if (matchedPkg) {
          const pCost = Number(matchedPkg.package_price ?? (matchedPkg as any).package_cost ?? (matchedPkg as any).price ?? (matchedPkg as any).cost ?? 0);
          if (pCost > 0) {
            basePkgPrice = pCost;
          }
        }
      }

      if (basePkgPrice === null && leadObj.budget && !Number.isNaN(Number(leadObj.budget)) && Number(leadObj.budget) > 0) {
        basePkgPrice = Number(leadObj.budget);
      }

      if (basePkgPrice !== null && basePkgPrice > 0) {
        const discount = Number(leadObj.Quotation_Discount ?? leadObj.quotation_discount ?? quoteDiscount ?? 0);
        const additional = Number(leadObj.Additional_Services_Cost ?? leadObj.additional_services_cost ?? (leadObj as any).additional_cost ?? quoteAdditional ?? 0);
        const calculated = Math.max(0, basePkgPrice + additional - discount);
        if (calculated > 0) {
          return calculated;
        }
      }
    }

    // 5. Linked order if available
    if (leadObj && orders && orders.length > 0) {
      const linkedOrder = orders.find(o => o.lead_id === leadObj.lead_id);
      if (linkedOrder) {
        const ordAmt = Number(linkedOrder.quotation_amount ?? (linkedOrder as any).final_amount ?? (linkedOrder as any).total_amount);
        if (!Number.isNaN(ordAmt) && ordAmt > 0) {
          return ordAmt;
        }
      }
    }

    // 6. Lead budget / value fallback
    if (leadObj) {
      const budgetVal = Number(leadObj.budget ?? leadObj.lead_value ?? 0);
      if (!Number.isNaN(budgetVal) && budgetVal > 0) {
        return budgetVal;
      }
    }

    return 0;
  };

  const [salesStaffName, setSalesStaffName] = useState<string>('');
  const [salesStaffMobile, setSalesStaffMobile] = useState<string>('');

  const getEffectiveSalesStaffName = (): string => {
    if (salesStaffName && String(salesStaffName).trim()) {
      return String(salesStaffName).trim();
    }
    if (currentUser?.name && String(currentUser.name).trim()) {
      return String(currentUser.name).trim();
    }
    if (selectedLead?.sales_staff_name && String(selectedLead.sales_staff_name).trim()) {
      return String(selectedLead.sales_staff_name).trim();
    }
    return 'Sales Staff';
  };

  const getEffectiveSalesStaffMobile = (): string => {
    let raw = '';
    if (salesStaffMobile && String(salesStaffMobile).trim()) {
      raw = String(salesStaffMobile).trim();
    } else if (currentUser?.mobile && String(currentUser.mobile).trim()) {
      raw = String(currentUser.mobile).trim();
    } else if (selectedLead?.sales_staff_mobile && String(selectedLead.sales_staff_mobile).trim()) {
      raw = String(selectedLead.sales_staff_mobile).trim();
    }
    const digits = raw.replace(/\D/g, '');
    return digits || raw;
  };

  React.useEffect(() => {
    if (currentUser?.name && (!salesStaffName || !salesStaffName.trim())) {
      setSalesStaffName(currentUser.name);
    }
    if (currentUser?.mobile && (!salesStaffMobile || !salesStaffMobile.trim())) {
      setSalesStaffMobile(currentUser.mobile);
    }
  }, [currentUser]);
  const [quoteDiscount, setQuoteDiscount] = useState<number | ''>('');
  const [quoteAdditional, setQuoteAdditional] = useState<number | ''>('');
  
  const [quoteServices, setQuoteServices] = useState<{ id: string; name: string; qty: number; price: number; isAdditional?: boolean }[]>([]);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  
  // Adding service inline temp states
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceQty, setNewServiceQty] = useState(1);
  const [newServicePrice, setNewServicePrice] = useState(0);
  const [isAddingInline, setIsAddingInline] = useState(false);

  const handleAddInlineService = () => {
    if (!newServiceName.trim()) return;
    const newService = {
      id: `add_${Date.now()}`,
      name: newServiceName.trim(),
      qty: Math.max(1, newServiceQty),
      price: Math.max(0, newServicePrice),
      isAdditional: true
    };
    setQuoteServices(prev => [...prev, newService]);
    // reset states
    setNewServiceName('');
    setNewServiceQty(1);
    setNewServicePrice(0);
    setIsAddingInline(false);
  };

  const handleEditServiceItem = (id: string, updatedFields: Partial<{ name: string; qty: number; price: number }>) => {
    setQuoteServices(prev => prev.map(s => s.id === id ? { ...s, ...updatedFields } : s));
  };

  const handleRemoveServiceItem = (id: string) => {
    setQuoteServices(prev => prev.filter(s => s.id !== id));
  };

  
  // Synchronize/initialize services on entering Step 4
  React.useEffect(() => {
    const isStep4Active = wizardStep === 3 || crmWizardStep === 3;
    if (!isStep4Active) {
      setEditingServiceId(null);
      setIsAddingInline(false);
      return;
    }

    const activePkgs = getSelectedPkgsInfo(crmWizardStep === 3);
    const activePkgIds = activePkgs.map(lp => lp.package_id).filter(Boolean);

    // Build expected list of base deliverables from active packages directly from packages table
    const expectedBaseDeliverables: { pkgId: string; name: string }[] = [];
    activePkgs.forEach((lp) => {
      const pkgKey = lp.package_id || 'default';
      const pObj = (packages || []).find(p => p.package_id === lp.package_id);
      const incStr = pObj?.team_members || '';
      const delStr = pObj?.deliverables || '';

      const inclusionsList = parseTeamMembers(incStr);
      const deliverablesList = delStr
        ? delStr.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
        : [];

      const combined = [...inclusionsList, ...deliverablesList];
      if (combined.length === 0) {
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
        defaultItems.forEach(name => {
          expectedBaseDeliverables.push({ pkgId: pkgKey, name });
        });
      } else {
        combined.forEach(name => {
          expectedBaseDeliverables.push({ pkgId: pkgKey, name });
        });
      }
    });

    const leadId = crmWizardStep === 3 ? (selectedLead?.lead_id || 'edit') : (createdLeadId || 'create');
    const storageKey = `erp_quote_services_${leadId}`;
    const cached = localStorage.getItem(storageKey);
    let cacheIsValid = false;

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          const cachedBaseServices = parsed.filter(s => !s.isAdditional && s.id.startsWith('base_'));
          
          if (cachedBaseServices.length === expectedBaseDeliverables.length) {
            const allMatched = expectedBaseDeliverables.every((expected) => {
              return cachedBaseServices.some(s => {
                const parts = s.id.split('_');
                const pkgIdPart = parts[1];
                return pkgIdPart === expected.pkgId && s.name === expected.name;
              });
            });
            if (allMatched) {
              cacheIsValid = true;
              setQuoteServices(parsed);
              return;
            }
          }
        }
      } catch (e) {
        console.warn("Failed to parse cached quote services", e);
      }
    }

    // Fallback/Rebuild: auto-initialize directly using data from packages table
    const initialServices: { id: string; name: string; qty: number; price: number; isAdditional: boolean }[] = [];
    activePkgs.forEach((lp) => {
      const pkgKey = lp.package_id || 'default';
      const pObj = (packages || []).find(p => p.package_id === lp.package_id);
      const incStr = pObj?.team_members || '';
      const delStr = pObj?.deliverables || '';

      const inclusionsList = parseTeamMembers(incStr);
      const deliverablesList = delStr
        ? delStr.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
        : [];

      const combined = [...inclusionsList, ...deliverablesList];

      if (combined.length === 0) {
        // Fallback standard photography inclusions
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
        const totalCost = Number(lp.package_cost || 0);
        const ratio = totalCost ? (totalCost / sumDefault) : 1;

        let distributed = 0;
        defaultItems.forEach((name, idx) => {
          let pricePerItem;
          if (idx === defaultItems.length - 1) {
            pricePerItem = totalCost - distributed;
          } else {
            pricePerItem = Math.round((defaultPrices[idx] || 5000) * ratio);
            distributed += pricePerItem;
          }
          initialServices.push({
            id: `base_${pkgKey}_${idx}`,
            name,
            qty: 1,
            price: pricePerItem,
            isAdditional: false
          });
        });
      } else {
        // Divide lp.package_cost equally among combined items
        const count = combined.length;
        const totalCost = Number(lp.package_cost || 0);
        let distributed = 0;
        combined.forEach((name, idx) => {
          let pricePerItem;
          if (idx === count - 1) {
            pricePerItem = totalCost - distributed;
          } else {
            pricePerItem = Math.round(totalCost / count);
            distributed += pricePerItem;
          }
          initialServices.push({
            id: `base_${pkgKey}_${idx}`,
            name,
            qty: 1,
            price: pricePerItem,
            isAdditional: false
          });
        });
      }
    });

    setQuoteServices(initialServices);
  }, [wizardStep, crmWizardStep, selectedLead, createdLeadId, packages, wizardLeadData.selected_package_id, selectedPkgIds]);

  // Save services to local storage whenever they change
  React.useEffect(() => {
    const isStep4Active = wizardStep === 3 || crmWizardStep === 3;
    if (!isStep4Active) return;
    const leadId = crmWizardStep === 3 ? (selectedLead?.lead_id || 'edit') : (createdLeadId || 'create');
    localStorage.setItem(`erp_quote_services_${leadId}`, JSON.stringify(quoteServices));
  }, [quoteServices, selectedLead, createdLeadId, crmWizardStep, wizardStep]);

  const handleEditInclusion = (pkgKey: string, index: number, value: string) => {
    if (isStep3Locked) return;
    setEditableInclusions(prev => {
      const list = prev[pkgKey] ? [...prev[pkgKey]] : [];
      list[index] = value;
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleRemoveInclusion = (pkgKey: string, index: number) => {
    if (isStep3Locked) return;
    setEditableInclusions(prev => {
      const list = prev[pkgKey] ? prev[pkgKey].filter((_, i) => i !== index) : [];
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleAddInclusion = (pkgKey: string, value: string) => {
    if (isStep3Locked) return;
    if (!value.trim()) return;
    setEditableInclusions(prev => {
      const list = prev[pkgKey] ? [...prev[pkgKey]] : [];
      list.push(value.trim());
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleEditDeliverable = (pkgKey: string, index: number, value: string) => {
    if (isStep3Locked) return;
    setEditableDeliverables(prev => {
      const list = prev[pkgKey] ? [...prev[pkgKey]] : [];
      list[index] = value;
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleRemoveDeliverable = (pkgKey: string, index: number) => {
    if (isStep3Locked) return;
    setEditableDeliverables(prev => {
      const list = prev[pkgKey] ? prev[pkgKey].filter((_, i) => i !== index) : [];
      return { ...prev, [pkgKey]: list };
    });
  };

  const handleAddDeliverable = (pkgKey: string, value: string) => {
    if (isStep3Locked) return;
    if (!value.trim()) return;
    setEditableDeliverables(prev => {
      const list = prev[pkgKey] ? [...prev[pkgKey]] : [];
      list.push(value.trim());
      return { ...prev, [pkgKey]: list };
    });
  };

  // Reset or clear state when selectedLead changes or is deselected
  React.useEffect(() => {
    if (!selectedLead && activeTab === 'create') {
      return;
    }
    if (!selectedLead) {
      setEditableInclusions({});
      setEditableDeliverables({});
      return;
    }
  }, [selectedLead, activeTab]);

  const lastLoadedLeadIdRef = React.useRef<string | null>(null);

  // Fetch from Supabase directly for the JSON columns
  React.useEffect(() => {
    const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option;
    const targetLeadId = selectedLead?.lead_id || (activeTab === 'create' ? createdLeadId : null);
    if (targetLeadId && targetLeadId !== 'DRAFT-LEAD' && supabaseClient) {
      const currentKey = `${targetLeadId}`;
      if (lastLoadedLeadIdRef.current === currentKey) {
        return;
      }
      const fetchSupabasePackageData = async () => {
        try {
          const { data: lpData } = await supabaseClient
            .from('lead_packages')
            .select('*')
            .eq('lead_id', targetLeadId);

          const { data, error } = await supabaseClient
            .from('leads')
            .select('*')
            .eq('lead_id', targetLeadId)
            .maybeSingle();
          
          if (!error && (data || (lpData && lpData.length > 0))) {
            lastLoadedLeadIdRef.current = currentKey;
            
            const primaryLp = lpData && lpData.length > 0 ? lpData[0] : null;
            const effectivePkgId = pkgId || data?.Select_Package_Option || primaryLp?.package_id || 'Custom Package';

            const cleanCost = primaryLp?.package_cost ?? data?.package_price ?? data?.budget;
            if (cleanCost != null && !isNaN(Number(cleanCost))) {
              setWizardLeadData(prev => {
                const existingPkg = prev.selected_package_id || prev.Select_Package_Option;
                const finalPkg = (existingPkg && existingPkg.trim() !== '') ? existingPkg : effectivePkgId;
                return {
                  ...prev,
                  package_cost: Number(cleanCost),
                  package_price: Number(cleanCost),
                  budget: Number(cleanCost),
                  notes: data?.notes_special_customizations ?? prev.notes,
                  Select_Package_Option: finalPkg,
                  selected_package_id: finalPkg,
                };
              });
            }
            if (data?.Quotation_Discount != null) {
              setQuoteDiscount(Number(data.Quotation_Discount));
            }
            if (data?.Additional_Services_Cost != null) {
              setQuoteAdditional(Number(data.Additional_Services_Cost));
            }

            const rawTeamData = data?.Team_Members || data?.Team_member || (data as any)?.team_members || primaryLp?.Team_Members_Included || primaryLp?.editable_inclusions;
            console.log('TEAM MEMBERS LOADED', { leadId: targetLeadId, Team_Members: rawTeamData });
            if (rawTeamData) {
              const loadedInclusions = parseTeamMembersJsonToRecord(rawTeamData, effectivePkgId, crmEvents);
              if (Object.keys(loadedInclusions).length > 0) {
                setEditableInclusions(loadedInclusions);
              }
            }

            const rawDelData = data?.Add_Deliverable || primaryLp?.deliverables_descriptionn || primaryLp?.editable_deliverables || data?.deliverables_description;
            console.log('DELIVERABLES LOADED', { leadId: targetLeadId, Add_Deliverable: rawDelData });
            if (rawDelData) {
              const loadedDeliverables = parseDeliverablesJsonToRecord(rawDelData, effectivePkgId, crmEvents);
              if (Object.keys(loadedDeliverables).length > 0) {
                setEditableDeliverables(loadedDeliverables);
              }
            }
          }
        } catch (e) {
          console.error('Error fetching leads/lead_packages details from Supabase', e);
        }
      };
      fetchSupabasePackageData();
    } else {
      if (!selectedLead && !createdLeadId) {
        lastLoadedLeadIdRef.current = null;
      }
    }
  }, [selectedLead?.lead_id, createdLeadId, activeTab, wizardLeadData.selected_package_id, wizardLeadData.Select_Package_Option, supabaseClient, crmEvents, crmWizardStep, wizardStep]);

  // Save to Supabase directly for the JSON columns
  const isFirstRender = React.useRef(true);
  
  // Explicit saves are now handled directly in the onChange handlers for immediate persistence
  // to avoid closure stale state overwrites in debounced effects.

  // Step 1 Automatic Data Prefill & Hydration from Supabase leads table
  React.useEffect(() => {
    if (!selectedLead?.lead_id || !supabaseClient || selectedLead.lead_id === 'DRAFT-LEAD') return;

    let isMounted = true;

    const loadStep1DataFromDB = async () => {
      try {
        const { data: dbLead, error } = await supabaseClient
          .from('leads')
          .select('*')
          .eq('lead_id', selectedLead.lead_id)
          .maybeSingle();

        if (error || !dbLead || !isMounted) return;

        setWizardLeadData(prev => ({
          ...prev,
          customer_name: dbLead.customer_name || prev.customer_name || '',
          mobile: dbLead.mobile ? String(dbLead.mobile) : (prev.mobile ? String(prev.mobile) : ''),
          whatsapp_number: dbLead.whatsapp_number ? String(dbLead.whatsapp_number) : (dbLead.mobile ? String(dbLead.mobile) : (prev.whatsapp_number ? String(prev.whatsapp_number) : '')),
          email: dbLead.email ?? prev.email ?? '',
          lead_source: dbLead.lead_source || prev.lead_source || '',
          Specify_Custom_Lead_Source_Name: dbLead.Specify_Custom_Lead_Source_Name || prev.Specify_Custom_Lead_Source_Name || '',
          address: dbLead.address || prev.address || '',
          city: dbLead.city || prev.city || '',
          state: dbLead.state || prev.state || '',
          pincode: dbLead.pincode || prev.pincode || '',
          client_residence_address: dbLead.client_residence_address || prev.client_residence_address || '',
          desired_event_shoot_type: dbLead.desired_event_shoot_type || prev.desired_event_shoot_type || '',
          status: dbLead.status || dbLead.current_status || prev.status,
          budget: dbLead.budget ?? prev.budget ?? 0,
          package_price: dbLead.package_price ?? prev.package_price ?? 0,
          Select_Package_Option: prev.Select_Package_Option || prev.selected_package_id || dbLead.Select_Package_Option || '',
          selected_package_id: prev.selected_package_id || prev.Select_Package_Option || dbLead.Select_Package_Option || '',
        }));

        // Keep selectedLead object in sync with fresh database values
        setSelectedLead(prev => {
          if (!prev || prev.lead_id !== dbLead.lead_id) return prev;
          return {
            ...prev,
            customer_name: dbLead.customer_name || prev.customer_name,
            mobile: dbLead.mobile ? String(dbLead.mobile) : prev.mobile,
            whatsapp_number: dbLead.whatsapp_number ? String(dbLead.whatsapp_number) : prev.whatsapp_number,
            email: dbLead.email ?? prev.email,
            lead_source: dbLead.lead_source || prev.lead_source,
            Specify_Custom_Lead_Source_Name: dbLead.Specify_Custom_Lead_Source_Name || prev.Specify_Custom_Lead_Source_Name,
            status: dbLead.status || dbLead.current_status || prev.status,
          };
        });
      } catch (err) {
        console.error("Error loading Step 1 data from DB:", err);
      }
    };

    loadStep1DataFromDB();

    return () => { isMounted = false; };
  }, [selectedLead?.lead_id, supabaseClient]);

  // Step 1 Customer Details Automatic Data Hydration from Supabase
  React.useEffect(() => {
    if (!selectedLead?.lead_id || selectedLead.lead_id === 'DRAFT-LEAD' || !supabaseClient) return;

    let isMounted = true;

    const hydrateCustomerDetails = async () => {
      try {
        const { data: leadData, error } = await supabaseClient
          .from('leads')
          .select('*')
          .eq('lead_id', selectedLead.lead_id)
          .maybeSingle();

        if (error || !leadData || !isMounted) return;

        setWizardLeadData(prev => ({
          ...prev,
          customer_name: leadData.customer_name || prev.customer_name || selectedLead.customer_name || '',
          mobile: String(leadData.mobile || prev.mobile || selectedLead.mobile || ''),
          whatsapp_number: String(leadData.whatsapp_number || prev.whatsapp_number || leadData.mobile || prev.mobile || selectedLead.whatsapp_number || selectedLead.mobile || ''),
          email: leadData.email ?? prev.email ?? selectedLead.email ?? '',
          lead_source: leadData.lead_source || prev.lead_source || selectedLead.lead_source || 'Reference',
          Specify_Custom_Lead_Source_Name: leadData.Specify_Custom_Lead_Source_Name || prev.Specify_Custom_Lead_Source_Name || selectedLead.Specify_Custom_Lead_Source_Name || '',
          address: leadData.address || prev.address || selectedLead.address || '',
          city: leadData.city || prev.city || selectedLead.city || '',
          state: leadData.state || prev.state || selectedLead.state || '',
          pincode: leadData.pincode || prev.pincode || selectedLead.pincode || '',
          client_residence_address: leadData.client_residence_address || prev.client_residence_address || selectedLead.client_residence_address || '',
          desired_event_shoot_type: leadData.desired_event_shoot_type || prev.desired_event_shoot_type || selectedLead.desired_event_shoot_type || '',
          Select_Package_Option: prev.Select_Package_Option || prev.selected_package_id || leadData.Select_Package_Option || selectedLead.Select_Package_Option || '',
          status: leadData.status || leadData.current_status || prev.status || selectedLead.status || '',
        }));
      } catch (err) {
        console.warn("Failed to hydrate customer details from Supabase", err);
      }
    };

    hydrateCustomerDetails();

    return () => { isMounted = false; };
  }, [selectedLead?.lead_id, supabaseClient]);

  // Step 2 Automatic Data Persistence & Prefill
  React.useEffect(() => {
    const isStep2 = (activeTab === 'create' && wizardStep === 2) || (activeTab === 'crm' && crmWizardStep === 2);
    const activeLeadId = activeTab === 'create' ? createdLeadId : selectedLead?.lead_id;

    if (!isStep2 || !activeLeadId || !supabaseClient) return;

    let isMounted = true;

    const loadStep2DataFromDB = async () => {
      try {
        // 1. Fetch lead details
        const { data: leadData, error: leadErr } = await supabaseClient
          .from('leads')
          .select('*')
          .eq('lead_id', activeLeadId)
          .maybeSingle();

        if (leadErr) {
          console.error("Error fetching lead for step 2:", leadErr);
          return;
        }

        if (!isMounted) return;

        // 2. Fetch lead events
        const { data: eventsData, error: eventsErr } = await supabaseClient
          .from('lead_events')
          .select('*')
          .eq('lead_id', activeLeadId);

        if (eventsErr) {
          console.error("Error fetching events for step 2:", eventsErr);
          return;
        }

        if (!isMounted) return;

        if (leadData) {
          // Restore follow-up details
          if (leadData.next_follow_up_date) {
            setStep2FollowUpDate(leadData.next_follow_up_date);
          }
          if (leadData.follow_up_notes) {
            setStep2FollowUpNotes(leadData.follow_up_notes);
          }
          
          setWizardLeadData(prev => ({
            ...prev,
            lead_source: leadData.lead_source || prev.lead_source,
            Specify_Custom_Lead_Source_Name: leadData.Specify_Custom_Lead_Source_Name || prev.Specify_Custom_Lead_Source_Name,
            client_residence_address: leadData.client_residence_address || prev.client_residence_address,
            city: leadData.city || prev.city,
            state: leadData.state || prev.state,
            pincode: leadData.pincode || prev.pincode,
            reference_source: leadData.reference_source || prev.reference_source,
          }));
        }

        if (eventsData && eventsData.length > 0) {
          const mappedEvents: LeadEvent[] = eventsData.map(ev => ({
            id: ev.id,
            event_type: ev.event_type,
            event_name: ev.event_name,
            event_date: ev.event_date,
            event_start_date: ev.event_date,
            event_end_date: ev.event_end_date || ev.Event_End_Date || '',
            event_location: ev.event_location,
            event_shoot_type: ev.event_shoot_type,
            guest_pax: ev.guest_pax,
            staff_pax: ev.staff_pax,
            event_start_time: ev.event_start_time,
            event_end_time: ev.event_end_time,
            google_maps_link: ev.google_maps_link,
            assigned_staff_names: ev.assigned_staff_names,
            assigned_staff_mobiles: ev.assigned_staff_mobiles,
            reporting_date: ev.reporting_date,
            reporting_time: ev.reporting_time
          }));

          if (activeTab === 'create') {
            setCreateEvents(mappedEvents);
          } else {
            setCrmEvents(mappedEvents);
          }

          // Pre-fill the form with the first event's details
          const firstEv = mappedEvents[0];
          setEventForm({
            event_type: firstEv.event_type || '',
            event_name: firstEv.event_name || '',
            event_date: firstEv.event_date || '',
            event_start_date: firstEv.event_date || '',
            event_end_date: firstEv.event_end_date || (firstEv as any).Event_End_Date || '',
            event_location: firstEv.event_location || '',
            event_shoot_type: firstEv.event_shoot_type || '',
            guest_pax: firstEv.guest_pax || '',
            staff_pax: firstEv.staff_pax || '',
            event_start_time: firstEv.event_start_time || '',
            event_end_time: firstEv.event_end_time || '',
            google_maps_link: firstEv.google_maps_link || ''
          });
          setEditingEventId(firstEv.id);
          setShowEventForm(true); // Force form to display so fields are not blank
        }
      } catch (err) {
        console.error("Error in loadStep2DataFromDB effect:", err);
      }
    };

    loadStep2DataFromDB();

    return () => {
      isMounted = false;
    };
  }, [wizardStep, crmWizardStep, activeTab, createdLeadId, selectedLead?.lead_id, supabaseClient]);

  // Auto-scroll and focus transitions for Sales Popups & Forms
  React.useEffect(() => {
    if (activeTab === 'create') {
      triggerAutoScrollAndFocus('#create_lead_form', 150);
    }
  }, [wizardStep, activeTab]);

  React.useEffect(() => {
    if (selectedLead) {
      triggerAutoScrollAndFocus('#lead_details_mobile_modal', 150);
    }
  }, [crmWizardStep, selectedLead?.lead_id]);

  React.useEffect(() => {
    if (isAddFormOpen || editingPackage) {
      triggerAutoScrollAndFocus('#add_edit_package_modal', 150);
    }
  }, [isAddFormOpen, editingPackage]);

  React.useEffect(() => {
    if (showConfirmModal) {
      triggerAutoScrollAndFocus('#confirm_booking_modal', 150);
      if (selectedLead) {
         initEventsReporting(selectedLead);
         const resolvedAmt = getLeadFinalPackageAmount(selectedLead, wizardLeadData, confirmForm.quotation_amount);
         setConfirmForm(prev => ({
            ...prev,
            quotation_amount: resolvedAmt || prev.quotation_amount || 0
         }));
      }
    }
  }, [showConfirmModal, selectedLead?.lead_id]);

  React.useEffect(() => {
    if (showFinalReportingModal) {
      triggerAutoScrollAndFocus('#final_reporting_modal', 150);
    }
  }, [showFinalReportingModal]);

  React.useEffect(() => {
    if (showStep3Popup) {
      triggerAutoScrollAndFocus('#step3_followup_modal', 150);
    }
  }, [showStep3Popup]);

  React.useEffect(() => {
    // Completely removed automated quotation number generation as per instructions
  }, [wizardStep, crmWizardStep, activeQuoteNum]);

  const getSelectedPkgsInfo = (isEdit: boolean) => {
    const finalPkgId = (isEdit
      ? (wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedLead?.Select_Package_Option)
      : (wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedPkgIds[0])) || 'Custom Package';

    if (finalPkgId === 'Custom Package' || finalPkgId === 'custom_package') {
      return [{
        package_name: 'Custom Package',
        package_id: 'Custom Package',
        package_cost: Number(wizardLeadData.package_cost) || 0,
        deliverables: wizardLeadData.deliverables || '',
        inclusions: '',
        team_members: '',
        seasonal_offer: '',
        terms_conditions: '',
        event_type: '',
        duration: '',
        category: ''
      }];
    }

    const primaryPkg = (packages || []).find(p => String(p.package_id) === String(finalPkgId) || String(p.package_name) === String(finalPkgId));
    if (primaryPkg) {
      return [{
        package_name: primaryPkg.package_name,
        package_id: primaryPkg.package_id,
        package_cost: pkgPrices[primaryPkg.package_id] !== undefined ? Number(pkgPrices[primaryPkg.package_id]) : (Number(wizardLeadData.package_cost) || Number(primaryPkg.price) || 0),
        deliverables: wizardLeadData.deliverables || pkgDeliverables[primaryPkg.package_id] || primaryPkg.deliverables || '',
        inclusions: primaryPkg.package_includes || '',
        team_members: primaryPkg.team_members || '',
        seasonal_offer: primaryPkg.seasonal_offer || '',
        terms_conditions: primaryPkg.terms_conditions || '',
        event_type: primaryPkg.event_type || '',
        duration: primaryPkg.duration || '',
        category: primaryPkg.category || ''
      }];
    }

    return [{
      package_name: wizardLeadData.package_name || 'Custom Package',
      package_id: finalPkgId || 'Custom Package',
      package_cost: Number(wizardLeadData.package_cost) || 0,
      deliverables: wizardLeadData.deliverables || '',
      inclusions: '',
      team_members: '',
      seasonal_offer: '',
      terms_conditions: '',
      event_type: '',
      duration: '',
      category: ''
    }];
  };

  const dynamicBaseSum = getSelectedPkgsInfo(crmWizardStep > 0).reduce((sum, p) => sum + Number(p.package_cost || 0), 0);
  const dynamicAdditionalSum = quoteServices
    .filter(s => s.isAdditional)
    .reduce((sum, s) => sum + (Number(s.qty) * Number(s.price)), 0);
    const discountVal = Number(quoteDiscount || 0);
  const rawDynamicFinalAmt = Math.max(0, dynamicBaseSum + Number(quoteAdditional || 0) - discountVal);
  const dynamicFinalAmt = Number.isNaN(rawDynamicFinalAmt) ? 0 : rawDynamicFinalAmt;

  React.useEffect(() => {
    setWizardLeadData(prev => {
      if (prev.final_amount !== dynamicFinalAmt) {
        return { ...prev, final_amount: dynamicFinalAmt };
      }
      return prev;
    });
  }, [dynamicFinalAmt]);

  const getLeadInfoForQuote = (isEdit: boolean) => {
    const effectiveSalesName = getEffectiveSalesStaffName();
    const effectiveSalesMobile = getEffectiveSalesStaffMobile();

    const finalAmountVal = dynamicFinalAmt;
    if (isEdit) {
      return {
        ...selectedLead,
        customer_name: wizardLeadData.customer_name,
        mobile: wizardLeadData.mobile,
        email: wizardLeadData.email,
        event_date: wizardLeadData.event_date,
        event_location: wizardLeadData.event_location,
        event_type: wizardLeadData.event_type,
        shoot_type: wizardLeadData.shoot_type,
        budget: wizardLeadData.budget || finalAmountVal,
        whatsapp_number: wizardLeadData.whatsapp_number,
        address: wizardLeadData.address,
        city: wizardLeadData.city,
        state: wizardLeadData.state,
        pincode: wizardLeadData.pincode,
        client_residence_address: wizardLeadData.client_residence_address,
        desired_event_shoot_type: wizardLeadData.desired_event_shoot_type,
        deliverables_description: wizardLeadData.deliverables,
        notes_special_customizations: wizardLeadData.notes,
        Select_Package_Option: wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || selectedLead?.Select_Package_Option || '',
        sales_staff_name: effectiveSalesName,
        sales_staff_mobile: effectiveSalesMobile,
        events: crmEvents,
        Final_Quotation_Amount: finalAmountVal || wizardLeadData.final_quoted_amount || wizardLeadData.budget || selectedLead?.Final_Quotation_Amount || selectedLead?.final_quotation_amount || selectedLead?.final_amount,
        final_quotation_amount: finalAmountVal || wizardLeadData.final_quoted_amount || wizardLeadData.budget || selectedLead?.final_quotation_amount || selectedLead?.Final_Quotation_Amount || selectedLead?.final_amount,
        final_amount: finalAmountVal || wizardLeadData.final_quoted_amount || wizardLeadData.budget || selectedLead?.final_amount || selectedLead?.Final_Quotation_Amount || selectedLead?.final_quotation_amount,
        dynamicFinalAmt: finalAmountVal
      };
    } else {
      return {
        ...createForm,
        lead_id: createdLeadId || 'DRAFT-LEAD',
        deliverables_description: selectedPkgs.map(p => pkgDeliverables[p.id] || p.deliverables || 'N/A').join('\n'),
        notes_special_customizations: selectedPkgs.map(p => pkgNotes[p.id] || '').join('\n'),
        Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || '',
        sales_staff_name: effectiveSalesName,
        sales_staff_mobile: effectiveSalesMobile,
        events: createEvents,
        Final_Quotation_Amount: finalAmountVal || createForm.budget,
        final_quotation_amount: finalAmountVal || createForm.budget,
        final_amount: finalAmountVal || createForm.budget,
        dynamicFinalAmt: finalAmountVal
      };
    }
  };

  const validateLeadForQuotation = (leadObj: any, activePkgs: any[]) => {
    const missing: string[] = [];
    if (!String(leadObj.customer_name || '').trim()) missing.push('Customer Name');
    if (!String(leadObj.mobile || '').trim()) missing.push('Mobile Number');
    if (!String(leadObj.event_type || '').trim()) missing.push('Event Type');
    if (!String(leadObj.event_date || '').trim()) missing.push('Event Date');
    if (!String(leadObj.event_location || '').trim() && !String(leadObj.location || '').trim()) missing.push('Event Location');
    if (activePkgs.length === 0) missing.push('At least one selected package');
    return missing;
  };

  const handleGenerateQuote = async (isEdit: boolean): Promise<string | null> => {
    setIsSaving(true);
    console.log("‚úî Starting quotation generation...");
    try {
      const effName = getEffectiveSalesStaffName();
      const effMobile = getEffectiveSalesStaffMobile();
      if (!salesStaffName || !salesStaffName.trim()) setSalesStaffName(effName);
      if (!salesStaffMobile || !salesStaffMobile.trim()) setSalesStaffMobile(effMobile);

      const leadObj = getLeadInfoForQuote(isEdit);
      const leadIdForError = leadObj?.lead_id || createdLeadId || 'UNKNOWN';

      console.log("‚úî Validating form...");
      const activePkgs = getSelectedPkgsInfo(isEdit);

      const missingFields = validateLeadForQuotation(leadObj, activePkgs);
      if (missingFields.length > 0) {
        showErrorHelper(
          "Quotation Incomplete",
          `Missing required fields: ${missingFields.join(', ')}`,
          "validateLeadForQuotation()",
          leadIdForError,
          "Complete all required fields before generating the quotation."
        );
        setIsSaving(false);
        return null;
      }

      const basePkgSum = dynamicBaseSum;
      const finalAmt = dynamicFinalAmt;

      const leadId = leadObj.lead_id || 'DRAFT-LEAD';
      let dbQuote = null;
      if (supabaseClient && leadId !== 'DRAFT-LEAD') {
        const { data, error } = await supabaseClient
          .from('quotations')
          .select('quotation_id, quotation_number, created_at')
          .eq('lead_id', leadId)
          .maybeSingle();
        if (!error && data) {
          dbQuote = data;
        }
      }

      const existingQuotation = dbQuote || (quotations || []).find(q => q.lead_id === leadId);
      
      const d = new Date();
      const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const randomFour = String(Math.floor(1 + Math.random() * 9999)).padStart(4, '0');
      const generatedQuotNum = existingQuotation ? existingQuotation.quotation_number : `QT-${dateStr}-${randomFour}`;
      const quotNum = activeQuoteNum || generatedQuotNum;
      
      console.log(`‚úî Creating/Updating quotation ${quotNum}...`);
      const qId = existingQuotation ? existingQuotation.quotation_id : ('QT-' + Math.random().toString(36).substring(2, 9).toUpperCase());
      
      const activePkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || 'Custom Package';
      const { teamMembersJson, deliverablesJson, teamMembersText, deliverablesText } = buildStep3EventPayloads(
        activePkgId,
        crmEvents,
        editableInclusions,
        editableDeliverables
      );
      
      const activeDeliverablesText = (deliverablesText === '[]' && leadObj.deliverables_description && leadObj.deliverables_description !== '[]') 
        ? leadObj.deliverables_description 
        : deliverablesText;
        
      const activeTeamMembersText = (teamMembersText === '[]' && (leadObj.Team_member || leadObj.Team_Members) && (leadObj.Team_member !== '[]' || leadObj.Team_Members !== '[]'))
        ? (leadObj.Team_member || leadObj.Team_Members)
        : teamMembersText;
        
      let finalBasePkgSum = basePkgSum;
      if (finalBasePkgSum === 0 && leadObj.package_price && leadObj.package_price > 0) {
        finalBasePkgSum = leadObj.package_price;
      }

      const standardQuotation = {
        quotation_id: qId,
        quotation_number: quotNum,
        lead_id: leadId,
        customer_id: leadObj.customer_name || '',
        customer_name: leadObj.customer_name || '',
        order_id: '',
        package_name: activePkgs.map(p => p.package_name).join(' + '),
        package_price: finalBasePkgSum,
        quotation_amount: finalBasePkgSum + Number(quoteAdditional || 0),
        discount: quoteDiscount,
        discount_amount: quoteDiscount,
        additional_services_cost: Number(quoteAdditional || 0),
        final_quotation_amount: finalAmt,
        final_amount: finalAmt,
        tax_amount: 0,
        quotation_status: 'Sent',
        pdf_url: '',
        generated_date: new Date().toISOString().split('T')[0],
        created_at: existingQuotation ? existingQuotation.created_at : new Date().toISOString(),
        created_by: salesStaffName || 'System',
        whatsapp_sent_status: false,
        viewed_status: false,
        terms_conditions: quotationTerms,
        deliverables_description: activeDeliverablesText,
        notes_special_customizations: leadObj.notes_special_customizations,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalAmt,
        client_residence_address: leadObj.client_residence_address,
        city: leadObj.city,
        state: leadObj.state,
        pincode: leadObj.pincode,
        desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type,

        editableInclusions: editableInclusions,
        editableDeliverables: editableDeliverables
      };

      console.log("‚úî Saving to Supabase...");
      const finalQuoteNum = await addQuotation(standardQuotation);
      console.log(`‚úî Quotation saved successfully. Confirmed Quotation Number: ${finalQuoteNum}`);
      setActiveQuoteNum(finalQuoteNum);

      if (isEdit) {
        if (wizardLeadData.selected_package_id) {
          const selectedPkg = packages.find((p) => p.package_id === wizardLeadData.selected_package_id);
          const activePackagesList = (leadPackages || []).filter(lp => lp.lead_id === selectedLead.lead_id);
          
          if (!activePackagesList.some(lp => lp.package_id === wizardLeadData.selected_package_id)) {
            activePackagesList.push({
              package_id: wizardLeadData.selected_package_id,
              package_name: selectedPkg?.package_name || 'Selected Package',
              package_cost: Number(wizardLeadData.package_cost),
              quantity: 1,
              total_amount: Number(wizardLeadData.package_cost),
              discount: 0,
              final_amount: Number(wizardLeadData.package_cost),
              deliverables_description: activeDeliverablesText,
              notes_special_customizations: wizardLeadData.notes,
              additional_services_cost: 0,
              team_members: '',
              deliverables: ''
            } as any);
          }
          
          const payloadToSave = activePackagesList.map(lp => {
            const isPrimary = lp.package_id === wizardLeadData.selected_package_id;
            const incStr = (editableInclusions[lp.package_id!] || []).join(', ');
            const delStr = (editableDeliverables[lp.package_id!] || []).join(', ');
            
            // Protect against empty object overwriting valid data during a race condition
            const hasNewInclusions = Object.keys(editableInclusions).length > 0;
            const hasNewDeliverables = Object.keys(editableDeliverables).length > 0;
            
            return {
              package_id: lp.package_id!,
              package_name: lp.package_name || 'Selected Package',
              package_cost: isPrimary ? Number(wizardLeadData.package_cost) : lp.package_cost,
              quantity: lp.quantity || 1,
              total_amount: isPrimary ? Number(wizardLeadData.package_cost) : lp.total_amount,
              discount: lp.discount || 0,
              final_amount: isPrimary ? Number(wizardLeadData.package_cost) : lp.final_amount,
              deliverables_description: isPrimary ? activeDeliverablesText : lp.deliverables_description,
              notes_special_customizations: isPrimary ? wizardLeadData.notes : lp.notes_special_customizations,
              additional_services_cost: lp.additional_services_cost || 0,
              team_members: incStr || lp.team_members || '',
              deliverables: delStr || lp.deliverables || '',
              ...(hasNewInclusions ? { editable_inclusions: editableInclusions, Team_Members_Included: teamMembersJson } : {}),
              ...(hasNewDeliverables ? { editable_deliverables: editableDeliverables, deliverables_descriptionn: deliverablesJson } : {}),
            };
          });

          await saveLeadPackages(selectedLead.lead_id, payloadToSave);
        }

        const updatedRemarks = appendCompletedStep(wizardLeadData.notes || '', 3);

        setWizardLeadData(prev => ({
          ...prev,
          budget: finalAmt,
          final_quoted_amount: finalAmt,
          status: 'Quotation Sent' as CurrentStage,
          remarks: updatedRemarks,
          deliverables: activeDeliverablesText,
          deliverables_description: activeDeliverablesText,
          Team_member: activeTeamMembersText,
          Team_Members: activeTeamMembersText,
          team_members: activeTeamMembersText
        }));
        await updateLead(leadObj.lead_id, {
          budget: finalAmt,
          status: 'Quotation Sent' as CurrentStage,
          package_price: finalBasePkgSum,
          deliverables_description: activeDeliverablesText,
          Team_member: activeTeamMembersText,
          Team_Members: activeTeamMembersText,
          team_members: activeTeamMembersText,
          notes_special_customizations: leadObj.notes_special_customizations,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalAmt,
          
          client_residence_address: leadObj.client_residence_address,
          city: leadObj.city,
          state: leadObj.state,
          pincode: leadObj.pincode,
          desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type,
          remarks: updatedRemarks,
          Select_Package_Option: leadObj.Select_Package_Option || ''
        });
        
        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'Quotation Sent' as CurrentStage,
            remarks: updatedRemarks
          };
        });
      } else {
        setCreateForm(prev => ({
          ...prev,
          budget: finalAmt
        }));
        setSalesStatus('Quotation Sent');
        await updateLead(createdLeadId!, {
          budget: finalAmt,
          status: 'Quotation Sent' as CurrentStage,
          package_price: finalBasePkgSum,
          deliverables_description: activeDeliverablesText,
          Team_member: activeTeamMembersText,
          Team_Members: activeTeamMembersText,
          team_members: activeTeamMembersText,
          notes_special_customizations: leadObj.notes_special_customizations,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalAmt,
          sales_staff_name: salesStaffName,
          sales_staff_mobile: salesStaffMobile,
          client_residence_address: leadObj.client_residence_address,
          city: leadObj.city,
          state: leadObj.state,
          pincode: leadObj.pincode,
          desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type,
          remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city),
            next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
          Select_Package_Option: leadObj.Select_Package_Option || ''
        });
      }

      console.log("‚úî Process completed");
      return finalQuoteNum;
    } catch (err: any) {
      showErrorHelper(
        "Quotation Save Failed",
        err.message || "Failed to save quotation data to the database.",
        "handleGenerateQuote()",
        isEdit && selectedLead ? selectedLead.lead_id : (createdLeadId || 'UNKNOWN'),
        "Check your network connection and ensure the lead data is valid.",
        err
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewQuotePDF = async (isEdit: boolean) => {
    try {
      const effName = getEffectiveSalesStaffName();
      const effMobile = getEffectiveSalesStaffMobile();
      if (!salesStaffName || !salesStaffName.trim()) setSalesStaffName(effName);
      if (!salesStaffMobile || !salesStaffMobile.trim()) setSalesStaffMobile(effMobile);

      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);

      const missingFields = validateLeadForQuotation(leadObj, activePkgs);
      if (missingFields.length > 0) {
        showToastMsg(`Quotation Incomplete! Please enter the following fields: ${missingFields.join(', ')}`, "error");
        return;
      }

      let currentLogo = logoBase64;
      let currentAspect = logoAspectRatio;
      try {
        const logoUrl = 'https://aqifyxsimhqayfjwzzwj.supabase.co/storage/v1/object/public/img/logo%20(4)%20(1).png';
        const result = await getLogoBase64FromUrl(logoUrl);
        currentLogo = result.base64;
        currentAspect = result.aspect;
      } catch (e) {
        console.warn("Failed to wait-load logo for preview, using preloaded:", e);
      }

      const doc = generateQuotationPDF(
        leadObj,
        activePkgs,
        "",
        quotationTerms,
        currentLogo,
        currentAspect,
        editableInclusions,
        editableDeliverables,
        Number(quoteDiscount || 0),
        Number(quoteAdditional || 0),
        quoteServices
      );
      
      const blobUrl = doc.output('bloburl');
      setGeneratedPDFBlobUrl(blobUrl);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to preview PDF.");
    }
  };

  const handleDownloadQuotePDF = async (isEdit: boolean) => {
    try {
      console.log("‚úî Generating PDF...");
      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);
      
      const doc = generateQuotationPDF(
        leadObj,
        activePkgs,
        "",
        quotationTerms,
        logoBase64,
        logoAspectRatio,
        editableInclusions,
        editableDeliverables,
        Number(quoteDiscount || 0),
        Number(quoteAdditional || 0),
        quoteServices
      );
      
      console.log("‚úî PDF generated");
      const pdfFileName = generateQuotationPdfFileName(leadObj);
      doc.save(pdfFileName);
      
      showToastMsg("Quotation successfully generated!", "success");
    } catch (err: any) {
      showErrorHelper(
        "PDF Generation Failed",
        err.message || "jsPDF failed to render the quotation document.",
        "handleDownloadQuotePDF()",
        isEdit && selectedLead ? selectedLead.lead_id : (createdLeadId || 'UNKNOWN'),
        "Check console logs to see if there is an issue with the document template or variables.",
        err
      );
    }
  };

  const handleSendWhatsAppQuote = async (isEdit: boolean) => {
    try {
      console.log("‚úî Generating PDF...");
      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);
      const finalAmt = dynamicFinalAmt;

      const doc = generateQuotationPDF(
        leadObj,
        activePkgs,
        "",
        quotationTerms,
        logoBase64,
        logoAspectRatio,
        editableInclusions,
        editableDeliverables,
        Number(quoteDiscount || 0),
        Number(quoteAdditional || 0),
        quoteServices
      );
      
      console.log("‚úî PDF generated");
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setGeneratedPDFBlobUrl(blobUrl);

      // Download the PDF automatically as requested
      const pdfFileName = generateQuotationPdfFileName(leadObj);
      doc.save(pdfFileName);

      console.log("‚úî Opening WhatsApp...");
      const rawPhone = leadObj.whatsapp_number || leadObj.mobile || '';
      const phoneStr = typeof rawPhone === 'string' ? rawPhone : String(rawPhone);
      
      const safeCustomerName = String(leadObj.customer_name || '');
      const safeEventLocation = String(leadObj.event_location || leadObj.location || 'N/A');

      let eventDetailsStr = '';
      if (leadObj.events && leadObj.events.length > 0) {
        eventDetailsStr = leadObj.events.map((ev) => {
          const eName = ev.event_name || ev.event_type || 'Event';
          const eDate = ev.event_date || 'N/A';
          const eTime = ev.event_start_time ? convertTo12Hour(ev.event_start_time) : '';
          return `üéâ ${eName}\nüìÖ Date: ${eDate}${eTime ? ` | Time: ${eTime}` : ''}`;
        }).join('\n\n') + '\n';
      } else {
        const safeEventType = String(leadObj.event_type || 'Event');
        const safeEventDate = String(leadObj.event_date || 'N/A');
        eventDetailsStr = `üéâ Event: ${safeEventType}\nüìÖ Event Date: ${safeEventDate}\n`;
      }

      const message = `Hello *${safeCustomerName}*,\n\n` +
        `Thank you for choosing *PhotoCrew Pictures*.\n\n` +
        `Please find your quotation details below:\n\n` +
        eventDetailsStr +
        `üìç Event Address: ${safeEventLocation}\n` +
        `üí∞ Final Amount: ‚Çπ${finalAmt.toLocaleString('en-IN')}\n\n` +
        `Thank you.\nPhotoCrew Pictures`;

      const cleanPhone = phoneStr.replace(/[^0-9]/g, '');
      if (!cleanPhone) {
        showErrorHelper(
          "WhatsApp Redirect Failed",
          "Customer WhatsApp or mobile number is missing.",
          "handleSendWhatsAppQuote()",
          isEdit && selectedLead ? selectedLead.lead_id : (createdLeadId || 'UNKNOWN'),
          "Enter a valid mobile/WhatsApp number in Customer Details."
        );
        return;
      }
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');

      showToastMsg("Quotation downloaded and WhatsApp prepared!", "success");
      console.log("‚úî Process completed");
    } catch (err: any) {
      showErrorHelper(
        "WhatsApp Redirect Failed",
        err.message || "Failed to prepare WhatsApp message or generate PDF.",
        "handleSendWhatsAppQuote()",
        isEdit && selectedLead ? selectedLead.lead_id : (createdLeadId || 'UNKNOWN'),
        "Check console logs to see if there is an issue with the document template or variables.",
        err
      );
    }
  };

  const handleSendEmailQuote = async (isEdit: boolean) => {
    try {
      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);
      const basePkgSum = dynamicBaseSum;
      const finalAmt = dynamicFinalAmt;
      
      const pkgNames = activePkgs.map(p => p.package_name).join(' + ') || 'Selected Package';
      const email = leadObj.email || '';
      
      const safeCustomerName = String(leadObj.customer_name || '');
      const safeEventType = String(leadObj.event_type || 'Event');

      const subject = `Photocrew Pictures - Custom Quotation Details`;
      const body = `Dear ${safeCustomerName},\n\n` +
        `Thank you for reach out to us! We are pleased to provide the custom quotation details for your upcoming ${safeEventType} shoot.\n\n` +
        `Selected Package: ${pkgNames}\n` +
        `Package Base Price: Rs. ${basePkgSum.toLocaleString('en-IN')}\n` +
        `Discount Applied: Rs. ${(quoteDiscount || 0).toLocaleString('en-IN')}\n` +
        `Final Quotation Amount: Rs. ${finalAmt.toLocaleString('en-IN')}\n\n` +
        `We will follow up shortly to discuss any specific adjustments you might need.\n\n` +
        `Warm regards,\n` +
        `The Photocrew Pictures Team\n` +
        `https://www.photocrewpictures.com/`;

      window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    } catch (err: any) {
      showToastMsg("Failed to open email client.", "error");
    }
  };

  const renderQuotationAndStep4Section = (isEdit: boolean) => {
    const activePkgs = getSelectedPkgsInfo(isEdit);
    const basePkgSum = dynamicBaseSum;
    const finalAmt = dynamicFinalAmt;
    const pkgNames = activePkgs.map(p => p.package_name).join(' + ') || 'Selected Package';

    const budgetValue = isEdit ? wizardLeadData.budget : createForm.budget;
    const setBudget = (val: number | '') => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, budget: val === '' ? 0 : val }));
      } else {
        setCreateForm(prev => ({ ...prev, budget: val }));
      }
    };

    const remarksValue = isEdit ? wizardLeadData.remarks : createForm.remarks;
    const setRemarks = (val: string) => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, remarks: val }));
      } else {
        setCreateForm(prev => ({ ...prev, remarks: val }));
      }
    };

    const notesValue = isEdit ? wizardLeadData.notes : internalNotes;
    const setNotes = (val: string) => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, notes: val }));
      } else {
        setInternalNotes(val);
      }
    };

    const followUpValue = isEdit ? wizardLeadData.next_follow_up_date : followUpDate;
    const setFollowUp = (val: string) => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, next_follow_up_date: val }));
      } else {
        setFollowUpDate(val);
      }
    };

    const leadValue = isEdit ? wizardLeadData.lead_value : createForm.lead_value;
    const setLeadValue = (val: number | '') => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, lead_value: val === '' ? 0 : val }));
      } else {
        setCreateForm(prev => ({ ...prev, lead_value: val }));
      }
    };

    const leadScore = isEdit ? wizardLeadData.lead_score : createForm.lead_score;
    const setLeadScore = (val: number | '') => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, lead_score: val === '' ? 0 : val }));
      } else {
        setCreateForm(prev => ({ ...prev, lead_score: val }));
      }
    };

    return (
      <div className="space-y-6">
        {/* Quotation Details */}
        <div className="bg-slate-900/50 border border-slate-805/40 rounded-xl p-4.5 space-y-3.5 shadow-sm">
          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wide font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <span>üìã</span> Quotation Details
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Package Amount (Editable Package Base Price) */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5 font-mono">
                <span>üí∞</span> Package Base Price (‚Çπ)
              </label>
              <input
                type="number"
                id={isEdit ? "input_section2_package_base_price" : "create_section2_package_base_price"}
                value={wizardLeadData.package_cost !== undefined && wizardLeadData.package_cost !== null ? wizardLeadData.package_cost : (basePkgSum || 0)}
                onChange={(e) => {
                  const rawVal = e.target.value;
                  const numVal = rawVal === '' ? '' : rawVal;
                  const parsedNum = rawVal === '' ? 0 : Number(numVal);
                  const currentPkg = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || 'Custom Package';
                  setWizardLeadData(prev => ({
                    ...prev,
                    package_cost: numVal,
                    package_price: numVal,
                    budget: parsedNum,
                    final_quoted_amount: parsedNum
                  }));
                  if (currentPkg) {
                    setPkgPrices(prev => ({ ...prev, [currentPkg]: parsedNum }));
                  }
                  saveStep3DataRealtime(editableInclusions, editableDeliverables, currentPkg, parsedNum);
                }}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-lg py-2 px-3 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all"
              />
            </div>

            {/* Discount */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Quotation Discount (‚Çπ)
              </label>
              <input
                type="number"
                value={quoteDiscount || ''}
                onChange={(e) => {
                  const rawVal = e.target.value;
                  const discNum = rawVal === '' ? 0 : Number(rawVal);
                  setQuoteDiscount(rawVal === '' ? 0 : discNum);
                  const currentPkg = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || 'Custom Package';
                  saveStep3DataRealtime(editableInclusions, editableDeliverables, currentPkg, undefined, discNum, quoteAdditional);
                }}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 font-mono transition-all"
              />
            </div>

            {/* Additional Services Cost - Hidden per user request */}
            <div className="hidden">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Additional Services Cost (‚Çπ)
              </label>
              <input
                type="number"
                value={quoteAdditional || ''}
                onChange={(e) => {
                  const rawVal = e.target.value;
                  const addNum = rawVal === '' ? 0 : Number(rawVal);
                  setQuoteAdditional(rawVal === '' ? 0 : addNum);
                  const currentPkg = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || 'Custom Package';
                  saveStep3DataRealtime(editableInclusions, editableDeliverables, currentPkg, undefined, quoteDiscount, addNum);
                }}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 font-mono transition-all"
              />
            </div>

            {/* Extra Charges */}

          </div>

          {/* Final Calculated Amount Badge */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between shadow-inner mt-2">
            <div className="space-y-0.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide font-mono">Final Quotation Amount</p>
              <p className="text-[9px] text-slate-500 font-mono">Formula: Base Price (‚Çπ{basePkgSum}) - Disc (‚Çπ{quoteDiscount || 0})</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-amber-500 font-mono">
                ‚Çπ{finalAmt.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action buttons directly under Quotation Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-800/60">
            {/* Download PDF */}
            <button
              type="button"
              onClick={() => handleDownloadQuotePDF(isEdit)}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-red-950/40 hover:bg-red-900/50 text-red-300 rounded-lg transition-all border border-red-900/40 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>üìÑ</span> {isSaving ? 'Processing...' : 'Download PDF Document'}
            </button>

            {/* Send WhatsApp */}
            <button
              type="button"
              onClick={() => handleSendWhatsAppQuote(isEdit)}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 rounded-lg transition-all border border-emerald-900/40 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>üí¨</span> {isSaving ? 'Processing...' : 'Send Quotation via WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep3Workspace = (isEdit: boolean) => {
    const availablePkgs = (packages && packages.length > 0) ? packages : INITIAL_PACKAGES;
    const rawPkgId = isEdit
      ? (wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedLead?.Select_Package_Option || '')
      : (wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedPkgIds[0] || '');
    const currentPkgId = (rawPkgId && rawPkgId.trim() !== '') ? rawPkgId : 'Custom Package';

    let selectedPkg = availablePkgs.find(p => String(p.package_id) === String(currentPkgId) || String(p.package_name) === String(currentPkgId));
    if (!selectedPkg && currentPkgId) {
      selectedPkg = {
        package_id: currentPkgId,
        package_name: (currentPkgId === 'custom_package' || currentPkgId === 'Custom Package') ? 'Custom Package' : `Package ${currentPkgId}`,
        price: wizardLeadData.package_cost || 0,
        deliverables: wizardLeadData.deliverables || "",
        status: "Active"
      } as any;
    }
    const selectedPkgId = selectedPkg?.package_id || 'Custom Package';
    const inclusionsList = editableInclusions[selectedPkgId] || editableInclusions['Custom Package'] || editableInclusions['custom_package'] || (Object.values(editableInclusions).find(v => Array.isArray(v) && v.length > 0) || []);
    const deliverablesList = editableDeliverables[selectedPkgId] || editableDeliverables['Custom Package'] || editableDeliverables['custom_package'] || (Object.values(editableDeliverables).find(v => Array.isArray(v) && v.length > 0) || []);
    const currentEvents = isEdit ? crmEvents : createEvents;

    return (
      <div className="space-y-4 animate-fade-in text-left">
        <div className="space-y-3.5 text-left">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase font-mono tracking-wider">Select Package Option *</label>
            {step3AutoSaveStatus === 'saving' && (
              <span className="text-[10px] text-amber-400 font-mono font-semibold animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                Saving...
              </span>
            )}
            {step3AutoSaveStatus === 'saved' && (
              <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Saved ‚úì
              </span>
            )}
            {step3AutoSaveStatus === 'error' && (
              <span className="text-[10px] text-red-400 font-mono font-semibold flex items-center gap-1">
                Save failed
              </span>
            )}
          </div>
          <select
            id={isEdit ? "select_package_option" : "wizard_step3_first_field"}
            value={currentPkgId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedPkgIds([val]);
              handlePackageDropdownChange(val);
            }}
            className="w-full bg-slate-955 border border-slate-800 focus:border-indigo-500 text-white focus:outline-none rounded-lg py-1.5 px-3 text-xs cursor-pointer"
          >
              <option value="Custom Package">Custom Package</option>
              {(() => {
                const activePkgs = availablePkgs.filter(p => {
                  if (p.status && p.status.toLowerCase() !== 'active') return false;
                  const pId = String(p.package_id || '');
                  const pName = String(p.package_name || '');
                  if (pId === 'Custom Package' || pId === 'custom_package' || pName === 'Custom Package') return false;
                  if (pName.toLowerCase().includes('legacy') || pName.toLowerCase().includes('‚Çπ0')) return false;
                  return true;
                });
                if (currentPkgId && currentPkgId !== 'Custom Package' && currentPkgId !== 'custom_package' && !activePkgs.some(p => String(p.package_id) === String(currentPkgId))) {
                  const matched = availablePkgs.find(p => String(p.package_id) === String(currentPkgId));
                  if (matched && !String(matched.package_name || '').toLowerCase().includes('legacy')) {
                    activePkgs.unshift(matched);
                  }
                }
                return activePkgs.map((pkg) => (
                  <option key={pkg.package_id} value={pkg.package_id}>
                    {pkg.package_name} (‚Çπ{Number(pkg.price).toLocaleString('en-IN')})
                  </option>
                ));
              })()}
            </select>
          </div>

          {/* Sales Executive Details */}
          <div className="hidden bg-slate-900/50 border border-slate-805/40 rounded-lg p-3 space-y-2.5 shadow-sm mt-3">
            <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide font-mono flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <span>üë§</span> Sales Executive Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Sales Staff Name *
                </label>
                <input
                  id={isEdit ? "input_sales_staff_name" : "wizard_sales_staff_name"}
                  type="text"
                  required
                  value={salesStaffName}
                  onChange={(e) => setSalesStaffName(e.target.value)}
                  placeholder="E.g., Jane Doe"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-sans transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Sales Staff Mobile Number *
                </label>
                <input
                  id={isEdit ? "input_sales_staff_mobile" : "wizard_sales_staff_mobile"}
                  type="text"
                  required
                  value={salesStaffMobile}
                  onChange={(e) => setSalesStaffMobile(e.target.value)}
                  placeholder="E.g., 9876543210"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-mono transition-all"
                />
              </div>
            </div>
          </div>

          {/* Single Package Base Price (‚Çπ) Field (Hidden visually per request, keeping value intact internally) */}
          <div className="hidden" style={{ display: 'none' }}>
            <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wide font-mono flex items-center gap-1.5">
              <span>üí∞</span> Package Base Price (‚Çπ) *
            </label>
            <input
              type="number"
              value={wizardLeadData.package_cost !== undefined && wizardLeadData.package_cost !== null ? wizardLeadData.package_cost : (selectedPkg?.price || '')}
              onChange={(e) => {
                const val = e.target.value;
                const numVal = val === '' ? 0 : Number(val);
                setWizardLeadData(prev => ({
                  ...prev,
                  package_cost: val,
                  package_price: numVal,
                  budget: numVal,
                  final_quoted_amount: numVal
                }));
                saveStep3DataRealtime(editableInclusions, editableDeliverables, wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option, numVal);
              }}
              placeholder="Enter package base price..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none rounded-lg py-1.5 px-3 text-xs text-amber-300 font-mono font-bold"
              required
            />
          </div>

          {/* Event-Wise Configuration or Single Configuration */}
          <div>
            {currentEvents && currentEvents.length > 0 ? (
              currentEvents.map((event, eventIdx) => {
                const eventKey = `${selectedPkgId}_${event.id}`;
                const nameKey = `${selectedPkgId}_${event.event_name || event.event_type || 'Unnamed Event'}`;
                const customKey = `Custom Package_${event.id}`;
                const customNameKey = `Custom Package_${event.event_name || event.event_type || 'Unnamed Event'}`;
                const customLowerKey = `custom_package_${event.id}`;
                const customLowerNameKey = `custom_package_${event.event_name || event.event_type || 'Unnamed Event'}`;

                const eventInclusions = editableInclusions[eventKey] !== undefined
                  ? editableInclusions[eventKey]
                  : (editableInclusions[nameKey] !== undefined
                    ? editableInclusions[nameKey]
                    : (editableInclusions[customKey] !== undefined
                      ? editableInclusions[customKey]
                      : (editableInclusions[customNameKey] !== undefined
                        ? editableInclusions[customNameKey]
                        : (editableInclusions[customLowerKey] !== undefined
                          ? editableInclusions[customLowerKey]
                          : (editableInclusions[customLowerNameKey] !== undefined
                            ? editableInclusions[customLowerNameKey]
                            : (currentEvents.length === 1 ? inclusionsList : []))))));

                const eventDeliverables = editableDeliverables[eventKey] !== undefined
                  ? editableDeliverables[eventKey]
                  : (editableDeliverables[nameKey] !== undefined
                    ? editableDeliverables[nameKey]
                    : (editableDeliverables[customKey] !== undefined
                      ? editableDeliverables[customKey]
                      : (editableDeliverables[customNameKey] !== undefined
                        ? editableDeliverables[customNameKey]
                        : (editableDeliverables[customLowerKey] !== undefined
                          ? editableDeliverables[customLowerKey]
                          : (editableDeliverables[customLowerNameKey] !== undefined
                            ? editableDeliverables[customLowerNameKey]
                            : (currentEvents.length === 1 ? deliverablesList : []))))));

                const startDateStr = formatDDMMYYYY(event.event_start_date || event.event_date);
                const endDateRaw = event.event_end_date || (event as any).Event_End_Date || '';
                const endDateStr = endDateRaw ? formatDDMMYYYY(endDateRaw) : 'N/A';
                const startTimeStr = event.event_start_time ? convertTo12Hour(event.event_start_time) : 'N/A';
                const endTimeStr = event.event_end_time ? convertTo12Hour(event.event_end_time) : 'N/A';
                const guestPaxVal = event.guest_pax !== '' && event.guest_pax !== null && event.guest_pax !== undefined ? event.guest_pax : 'N/A';

                return (
                  <div key={event.id || eventIdx} className="bg-slate-900/25 border border-slate-800/60 p-4 rounded-xl space-y-4 mt-3 mb-4">
                    {/* VERY SMALL COMPACT EVENT SUMMARY */}
                    <div className="bg-slate-950/60 border border-slate-800/70 p-2.5 sm:p-3 rounded-lg text-left font-mono">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-100 font-sans">
                          {event.event_name || `Event ${eventIdx + 1}`}
                        </span>
                        {event.event_type && (
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold border border-slate-700">
                            [{event.event_type}]
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300 leading-tight flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span>
                          Start: <span className="text-slate-100 font-semibold">{startDateStr}{startTimeStr !== 'N/A' ? ` | ${startTimeStr}` : ''}</span>
                        </span>
                        {(endDateRaw || endTimeStr !== 'N/A') && (
                          <>
                            <span className="text-slate-500">‚Ä¢</span>
                            <span>
                              End: <span className="text-slate-100 font-semibold">{endDateStr !== 'N/A' ? endDateStr : startDateStr}{endTimeStr !== 'N/A' ? ` | ${endTimeStr}` : ''}</span>
                            </span>
                          </>
                        )}
                        <span className="text-slate-500">‚Ä¢</span>
                        <span>
                          Guest Pax: <span className="text-slate-100 font-semibold">{guestPaxVal}</span>
                        </span>
                      </div>
                    </div>

                    {/* Team Members Included */}
                    <div>
                      <div className="mb-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">Team Members Included</label>
                      </div>
                      {eventInclusions.length === 0 ? (
                        <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
                          <p className="text-xs text-zinc-500 italic">No team members added yet.</p>
                          <button
                            type="button"
                            onClick={() => {
                              const currentList = [...eventInclusions];
                              currentList.push("");
                              const updated = {
                                ...editableInclusions,
                                [eventKey]: currentList,
                                [nameKey]: currentList
                              };
                              setEditableInclusions(updated);
                              saveStep3DataRealtime(updated, editableDeliverables);
                            }}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold font-mono bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-md border border-indigo-500/20 transition-all cursor-pointer"
                          >
                            + Add Member
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {eventInclusions.map((item, idx) => (
                            <CompactQtyItemRow
                              key={idx}
                              value={item}
                              options={activeMasterRoles}
                              placeholder="Type or select Role / Team Member..."
                              accentColor="indigo"
                              onChange={(newVal) => {
                                const currentList = [...eventInclusions];
                                currentList[idx] = newVal;
                                const updated = {
                                  ...editableInclusions,
                                  [eventKey]: currentList,
                                  [nameKey]: currentList
                                };
                                setEditableInclusions(updated);
                                saveStep3DataRealtime(updated, editableDeliverables);
                              }}
                              onDelete={() => {
                                const currentList = [...eventInclusions];
                                currentList.splice(idx, 1);
                                const updated = {
                                  ...editableInclusions,
                                  [eventKey]: currentList,
                                  [nameKey]: currentList
                                };
                                setEditableInclusions(updated);
                                saveStep3DataRealtime(updated, editableDeliverables);
                              }}
                            />
                          ))}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const currentList = [...eventInclusions];
                                currentList.push("");
                                const updated = {
                                  ...editableInclusions,
                                  [eventKey]: currentList,
                                  [nameKey]: currentList
                                };
                                setEditableInclusions(updated);
                                saveStep3DataRealtime(updated, editableDeliverables);
                              }}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold font-mono bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-md border border-indigo-500/20 transition-all cursor-pointer"
                            >
                              + Add Member
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Deliverables Description / Base Package Deliverables */}
                    <div>
                      <div className="mb-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">Deliverables Description / Base Package Deliverables</label>
                      </div>
                      {eventDeliverables.length === 0 ? (
                        <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
                          <p className="text-xs text-zinc-500 italic">No deliverables added yet.</p>
                          <button
                            type="button"
                            onClick={() => {
                              const currentList = [...eventDeliverables];
                              currentList.push("");
                              const updated = {
                                ...editableDeliverables,
                                [eventKey]: currentList,
                                [nameKey]: currentList
                              };
                              setEditableDeliverables(updated);
                              saveStep3DataRealtime(editableInclusions, updated);
                            }}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold font-mono bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                          >
                            + Add Deliverable
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {eventDeliverables.map((item, idx) => (
                            <CompactQtyItemRow
                              key={idx}
                              value={item}
                              options={activeMasterDeliverables}
                              placeholder="Type or select Deliverable..."
                              accentColor="emerald"
                              onChange={(newVal) => {
                                const currentList = [...eventDeliverables];
                                currentList[idx] = newVal;
                                const updated = {
                                  ...editableDeliverables,
                                  [eventKey]: currentList,
                                  [nameKey]: currentList
                                };
                                setEditableDeliverables(updated);
                                saveStep3DataRealtime(editableInclusions, updated);
                              }}
                              onDelete={() => {
                                const currentList = [...eventDeliverables];
                                currentList.splice(idx, 1);
                                const updated = {
                                  ...editableDeliverables,
                                  [eventKey]: currentList,
                                  [nameKey]: currentList
                                };
                                setEditableDeliverables(updated);
                                saveStep3DataRealtime(editableInclusions, updated);
                              }}
                            />
                          ))}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const currentList = [...eventDeliverables];
                                currentList.push("");
                                const updated = {
                                  ...editableDeliverables,
                                  [eventKey]: currentList,
                                  [nameKey]: currentList
                                };
                                setEditableDeliverables(updated);
                                saveStep3DataRealtime(editableInclusions, updated);
                              }}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold font-mono bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                            >
                              + Add Deliverable
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-slate-900/25 border border-slate-800/60 p-4 rounded-xl space-y-4 mt-3 mb-4">
                {/* Single Team Members Included */}
                <div>
                  <div className="mb-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">Team Members Included</label>
                  </div>
                  {inclusionsList.length === 0 ? (
                    <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
                      <p className="text-xs text-zinc-500 italic">No team members added yet.</p>
                      <button
                        type="button"
                        onClick={() => {
                          const currentList = [...inclusionsList];
                          currentList.push("");
                          const updated = {
                            ...editableInclusions,
                            [selectedPkgId]: currentList
                          };
                          setEditableInclusions(updated);
                          saveStep3DataRealtime(updated, editableDeliverables);
                        }}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold font-mono bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-md border border-indigo-500/20 transition-all cursor-pointer"
                      >
                        + Add Member
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {inclusionsList.map((item, idx) => (
                        <CompactQtyItemRow
                          key={idx}
                          value={item}
                          options={activeMasterRoles}
                          placeholder="Type or select Role / Team Member..."
                          accentColor="indigo"
                          onChange={(newVal) => {
                            const currentList = [...inclusionsList];
                            currentList[idx] = newVal;
                            const updated = {
                              ...editableInclusions,
                              [selectedPkgId]: currentList
                            };
                            setEditableInclusions(updated);
                            saveStep3DataRealtime(updated, editableDeliverables);
                          }}
                          onDelete={() => {
                            const currentList = [...inclusionsList];
                            currentList.splice(idx, 1);
                            const updated = {
                              ...editableInclusions,
                              [selectedPkgId]: currentList
                            };
                            setEditableInclusions(updated);
                            saveStep3DataRealtime(updated, editableDeliverables);
                          }}
                        />
                      ))}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const currentList = [...inclusionsList];
                            currentList.push("");
                            const updated = {
                              ...editableInclusions,
                              [selectedPkgId]: currentList
                            };
                            setEditableInclusions(updated);
                            saveStep3DataRealtime(updated, editableDeliverables);
                          }}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold font-mono bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-md border border-indigo-500/20 transition-all cursor-pointer"
                        >
                          + Add Member
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Single Deliverables */}
                <div>
                  <div className="mb-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">Deliverables Description / Base Package Deliverables</label>
                  </div>
                  {deliverablesList.length === 0 ? (
                    <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
                      <p className="text-xs text-zinc-500 italic">No deliverables added yet.</p>
                      <button
                        type="button"
                        onClick={() => {
                          const currentList = [...deliverablesList];
                          currentList.push("");
                          const updated = {
                            ...editableDeliverables,
                            [selectedPkgId]: currentList
                          };
                          setEditableDeliverables(updated);
                          saveStep3DataRealtime(editableInclusions, updated);
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold font-mono bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                      >
                        + Add Deliverable
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {deliverablesList.map((item, idx) => (
                        <CompactQtyItemRow
                          key={idx}
                          value={item}
                          options={activeMasterDeliverables}
                          placeholder="Type or select Deliverable..."
                          accentColor="emerald"
                          onChange={(newVal) => {
                            const currentList = [...deliverablesList];
                            currentList[idx] = newVal;
                            const updated = {
                              ...editableDeliverables,
                              [selectedPkgId]: currentList
                            };
                            setEditableDeliverables(updated);
                            saveStep3DataRealtime(editableInclusions, updated);
                          }}
                          onDelete={() => {
                            const currentList = [...deliverablesList];
                            currentList.splice(idx, 1);
                            const updated = {
                              ...editableDeliverables,
                              [selectedPkgId]: currentList
                            };
                            setEditableDeliverables(updated);
                            saveStep3DataRealtime(editableInclusions, updated);
                          }}
                        />
                      ))}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const currentList = [...deliverablesList];
                            currentList.push("");
                            const updated = {
                              ...editableDeliverables,
                              [selectedPkgId]: currentList
                            };
                            setEditableDeliverables(updated);
                            saveStep3DataRealtime(editableInclusions, updated);
                          }}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold font-mono bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                        >
                          + Add Deliverable
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        <div className="mt-4 flex justify-end pb-2">
          <button
            type="button"
            onClick={handleSavePackageOnly}
            disabled={isSaving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg shadow transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving Package...' : 'Save Package'}
          </button>
        </div>

        {renderQuotationAndStep4Section(isEdit)}
      </div>
    );
  };

  useEffect(() => {
    let isMounted = true;

    const fetchReportingData = async () => {
       if (!selectedLead?.lead_id) return;
       try {
          if (!supabaseClient) return;
          const { data, error } = await supabaseClient
             .from('order_event_reporting')
             .select('*')
             .eq('lead_id', selectedLead.lead_id);
          
          if (error) {
             console.error("Failed to load order_event_reporting data", error);
             return;
          }

          if (isMounted && data && data.length > 0) {
             const first = data[0];
             setWizardLeadData(prev => ({
                ...prev,
                confirmed_event_date: first.confirmed_event_date || prev.confirmed_event_date,
                confirmed_event_time: first.confirmed_event_time || prev.confirmed_event_time,
                final_amount: first.contract_final_amount || prev.final_amount,
                advance_received: first.advance_payment_received || prev.advance_received,
             }));

             setCrmEvents(prev => prev.map(ev => {
                const rep = data.find(r => r.event_id === ev.id);
                if (rep) {
                   return {
                      ...ev,
                      reporting_date: rep.reporting_date || ev.reporting_date,
                      reporting_time: rep.reporting_time || ev.reporting_time
                   };
                }
                return ev;
             }));
          }
       } catch (err) {
          console.error("Error loading reporting data", err);
       }
    };

    fetchReportingData();
    
    return () => { isMounted = false; };
  }, [selectedLead?.lead_id, supabaseClient]);

  // Sync wizardLeadData.advance_received and wizardLeadData.final_amount with latest payment and order confirmation data
  React.useEffect(() => {
    if (!selectedLead?.lead_id) return;
    const linkedOrder = orders?.find(o => o.lead_id === selectedLead.lead_id);
    const linkedPayment = linkedOrder ? payments?.find(p => p.order_id === linkedOrder.order_id) : null;
    
    if (linkedOrder || linkedPayment) {
      setWizardLeadData(prev => {
        const latestAdvance = linkedPayment ? ((linkedPayment.advance_received || 0) + (linkedPayment.final_payment_received || 0)) : (linkedOrder ? (linkedOrder.advance_received || 0) : prev.advance_received);
        const latestFinalAmount = linkedOrder ? (linkedOrder.quotation_amount || 0) : prev.final_amount;
        
        if (prev.advance_received !== latestAdvance || prev.final_amount !== latestFinalAmount) {
          return {
            ...prev,
            advance_received: latestAdvance,
            final_amount: latestFinalAmount
          };
        }
        return prev;
      });
    }
  }, [selectedLead?.lead_id, orders, payments]);

  // Handle lead select
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.role === 'sales' || e.detail?.role === 'owner' || !e.detail?.role) {
        const leadId = e.detail?.leadId || e.detail?.lead_id;
        const orderId = e.detail?.orderId || e.detail?.order_id;
        const targetLead = leads.find(
          l => (leadId && (l.lead_id === leadId || l.order_id === leadId)) ||
               (orderId && (l.lead_id === orderId || l.order_id === orderId)) ||
               (l.events && l.events.some(ev => ev.id === leadId || ev.id === orderId))
        );
        if (targetLead) {
          handleSelectLead(targetLead);
        }
      }
    };
    window.addEventListener('calendar-action-click-deferred', handler);
    window.addEventListener('calendar-action-click', handler);
    return () => {
      window.removeEventListener('calendar-action-click-deferred', handler);
      window.removeEventListener('calendar-action-click', handler);
    };
  }, [leads]);
  
  const handleSelectLead = async (lead: Lead, targetStep?: number) => {
    let fullLead = lead;
    if (supabaseClient && lead.lead_id && lead.lead_id !== 'DRAFT-LEAD') {
      try {
        const { data: dbLead, error: dbLeadErr } = await supabaseClient
          .from('leads')
          .select('*')
          .eq('lead_id', lead.lead_id)
          .maybeSingle();
        
        if (!dbLeadErr && dbLead) {
          const directLostReason = dbLead.Lost_Reason || dbLead.lost_reason || lead.Lost_Reason || (lead as any).lost_reason || '';
          const directLostNotes = dbLead.Lost_Notes || dbLead.lost_notes || lead.Lost_Notes || (lead as any).lost_notes || '';
          fullLead = {
            ...lead,
            ...dbLead,
            Lost_Reason: directLostReason,
            lost_reason: directLostReason,
            Lost_Notes: directLostNotes,
            lost_notes: directLostNotes
          };
        }
      } catch (err) {
        console.warn("Failed to fetch full lead details on select", err);
      }
    }

    // If lost lead, ensure clean reason and notes without dirty metadata
    if (['Lost Lead', 'Lead Lost', 'Lost'].includes(fullLead.status || (fullLead as any).current_status || '')) {
      const { reason: cleanR, notes: cleanN } = getStrictLostReasonAndNotes(fullLead);
      fullLead.Lost_Reason = cleanR;
      fullLead.lost_reason = cleanR;
      fullLead.Lost_Notes = cleanN;
      fullLead.lost_notes = cleanN;
    }

    setSelectedLead(fullLead);
    setCrmEvents(fullLead.events || []);

    // Always fetch fresh events to ensure no cached EV- IDs are used
    let eventsForCheck = fullLead.events || [];
    if (supabaseClient && fullLead.lead_id && fullLead.lead_id !== 'DRAFT-LEAD') {
      try {
        const { data: freshEvents, error } = await supabaseClient
          .from('lead_events')
          .select('*')
          .eq('lead_id', fullLead.lead_id)
          .order('created_at', { ascending: true });
        
        if (!error && freshEvents && freshEvents.length > 0) {
          setCrmEvents(freshEvents as LeadEvent[]);
          eventsForCheck = freshEvents as LeadEvent[];
          setSelectedLead(prev => prev ? { ...prev, events: freshEvents as LeadEvent[] } : prev);
        }
      } catch (err) {
        console.warn("Failed to load fresh events on selection", err);
      }
    }

    setGeneratedPDFBlobUrl('');
    setActiveQuoteNum('');
    setQuoteDiscount(0);
    setQuoteAdditional(0);
    // Explicitly reset only when switching to a different lead ID
    if (!selectedLead || selectedLead.lead_id !== lead.lead_id) {
      setEditableInclusions({});
      setEditableDeliverables({});
      lastLoadedLeadIdRef.current = null;
    }
    // Clean and set Sales Executive Details (isolated from Operations/Production staff on events)
    const initialSalesStaffName = getCleanSalesStaffName(lead.sales_staff_name, lead);
    const initialSalesStaffMobile = getCleanSalesStaffMobile(lead.sales_staff_mobile, lead);
    setSalesStaffName(initialSalesStaffName);
    setSalesStaffMobile(initialSalesStaffMobile);

    const activePackages = (leadPackages || []).filter(lp => lp.lead_id === lead.lead_id);
    const primaryLP = activePackages[0];
    
    // Find the latest quotation for this lead if it exists
    const latestQuote = [...(quotations || [])]
      .filter(q => q.lead_id === lead.lead_id)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];

    // Determine the target CRM step based on persisted data and status
    const hasQuotationOrPackage = !!(
      latestQuote ||
      primaryLP?.package_id ||
      (fullLead.Select_Package_Option && String(fullLead.Select_Package_Option).trim() !== '') ||
      ['Quotation Sent', 'Negotiation', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Closed', 'Lost Lead'].includes(fullLead.status || '') ||
      ['Quotation Sent', 'Negotiation', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Closed', 'Lost Lead'].includes((fullLead as any).current_status || '')
    );

    const hasCustomerDetails = !!(
      (fullLead.customer_name && String(fullLead.customer_name).trim() !== '') ||
      (fullLead.mobile && String(fullLead.mobile).trim() !== '')
    );

    const localSavedStep = localStorage.getItem(`crm_last_step_${lead.lead_id}`);
    const remarksMatch = fullLead.remarks?.match(/\[CRM_COMPLETED_STEP:\s*(\d+)\]/);
    const explicitStep = localSavedStep ? parseInt(localSavedStep, 10) : (remarksMatch ? parseInt(remarksMatch[1], 10) : null);

    const isConfirmedLead = ['Confirm Order', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Closed'].includes(fullLead.status || '') || (fullLead as any).current_status === 'Order Confirmed' || (fullLead as any).booking_status === 'Confirmed' || orders.some(o => o.lead_id === fullLead.lead_id && o.status !== 'Cancelled');
    const isUnlockedLead = unlockRequests.some(r => (r.lead_id === fullLead.lead_id || r.order_id === fullLead.lead_id || r.project_id === fullLead.lead_id) && (r.status === 'Approved' || r.request_status === 'Approved')) || unlockedRecords.some(r => r.recordId === fullLead.lead_id && r.module === 'Sales');

    // Navigation logic: always open first incomplete step. If lead is unlocked, open Step 3.
    let startStep = 1;
    if (isConfirmedLead && isUnlockedLead) {
      startStep = 3;
    } else if (explicitStep) {
      if (explicitStep >= 2) startStep = 3;
      else if (explicitStep === 1) startStep = 2;
    } else {
      if (hasQuotationOrPackage) startStep = 3;
      else if (hasCustomerDetails) startStep = 2;
      else startStep = 1;
    }

    const finalStep = targetStep || startStep;
    const completedStep = Math.max(finalStep === 3 ? 3 : (startStep === 3 ? (hasQuotationOrPackage ? 3 : 2) : startStep - 1), explicitStep || 1);
    setCrmHighestStep(completedStep);
    setCrmWizardStep(finalStep);
    
    const hasPackageAnywhere = !!(lead.Select_Package_Option || primaryLP?.package_id || latestQuote?.package_id);
    if (completedStep >= 3 || hasPackageAnywhere) {
    } else {
    }

    setQuoteDiscount(fullLead.Quotation_Discount ?? latestQuote?.discount_amount ?? 0);
    setQuoteAdditional(fullLead.Additional_Services_Cost ?? latestQuote?.additional_services_cost ?? 0);
    if (latestQuote) {
      setActiveQuoteNum(latestQuote.quotation_number || '');
      const quoteSalesName = getCleanSalesStaffName(latestQuote.sales_staff_name || lead.sales_staff_name, lead);
      const quoteSalesMobile = getCleanSalesStaffMobile(latestQuote.sales_staff_mobile || lead.sales_staff_mobile, lead);
      setSalesStaffName(quoteSalesName);
      setSalesStaffMobile(quoteSalesMobile);
    }

    const matchedPkgId = fullLead.Select_Package_Option || latestQuote?.package_id || primaryLP?.package_id || 'Custom Package';
    const matchedPkg = (packages || []).find(p => p.package_id === matchedPkgId);

    // 1. Load Deliverables
    const rawDelData = fullLead.Add_Deliverable || primaryLP?.deliverables_descriptionn || primaryLP?.editable_deliverables || fullLead.deliverables_description || latestQuote?.deliverables_description || matchedPkg?.deliverables;
    if (rawDelData) {
      const newDeliverables = parseDeliverablesJsonToRecord(rawDelData, matchedPkgId, fullLead.events || crmEvents);
      setEditableDeliverables(newDeliverables);
    } else {
      setEditableDeliverables({});
    }

    // 2. Load Team Members
    const rawTeamData = fullLead.Team_Members || fullLead.Team_member || (fullLead as any)?.team_members || primaryLP?.Team_Members_Included || primaryLP?.editable_inclusions || matchedPkg?.team_members;
    console.log('TEAM MEMBERS LOADED in openCRMModal', { leadId: fullLead.lead_id, Team_Members: rawTeamData });
    if (rawTeamData) {
      const newInclusions = parseTeamMembersJsonToRecord(rawTeamData, matchedPkgId, fullLead.events || crmEvents);
      setEditableInclusions(newInclusions);
    } else {
      setEditableInclusions({});
    }

    const firstEvent = fullLead.events && fullLead.events.length > 0 ? fullLead.events[0] : null;
    const evName = firstEvent?.event_name || fullLead.custom_event_name || '';
    const evShootType = firstEvent?.event_shoot_type || fullLead.desired_event_shoot_type || fullLead.shoot_type || '';
    const evDate = firstEvent?.event_date || fullLead.event_date || '';
    const evStartDate = firstEvent?.event_start_date || fullLead.event_date || '';
    const evEndDate = firstEvent?.event_end_date || (firstEvent as any)?.Event_End_Date || fullLead.Event_End_Date || '';
    const evLocation = firstEvent?.event_location || fullLead.event_location || '';
    const evGuestPax = firstEvent?.guest_pax ?? fullLead.guest_pax ?? fullLead.total_pax ?? '';
    const evStaffPax = firstEvent?.staff_pax ?? fullLead.staff_pax ?? '';
    setInternalNotes(fullLead.follow_up_notes || '');
    setFollowUpDate(fullLead.next_follow_up_date || '');
    
    const cleanPkgPrice = (fullLead.package_price && Number(fullLead.package_price) > 0)
      ? Number(fullLead.package_price)
      : ((primaryLP?.package_cost && Number(primaryLP.package_cost) > 0)
        ? Number(primaryLP.package_cost)
        : ((latestQuote?.package_price && Number(latestQuote.package_price) > 0)
          ? Number(latestQuote.package_price)
          : (fullLead.budget && Number(fullLead.budget) > 0
            ? Number(fullLead.budget)
            : (matchedPkg ? Number(matchedPkg.price) : 0))));
    
    setWizardLeadData({
      customer_name: fullLead.customer_name || '',
      mobile: fullLead.mobile ? String(fullLead.mobile) : '',
      whatsapp_number: fullLead.whatsapp_number ? String(fullLead.whatsapp_number) : (fullLead.mobile ? String(fullLead.mobile) : ''),
      email: fullLead.email || '',
      address: fullLead.address || '',
      city: latestQuote?.city || fullLead.city || '',
      state: latestQuote?.state || fullLead.state || '',
      pincode: latestQuote?.pincode || fullLead.pincode || '',
      client_residence_address: latestQuote?.client_residence_address || fullLead.client_residence_address || '',
      desired_event_shoot_type: latestQuote?.desired_event_shoot_type || fullLead.desired_event_shoot_type || '',
      // Step 2
      event_type: fullLead.event_type || '',
      custom_event_name: fullLead.custom_event_name || '',
      event_name: evName,
      event_shoot_type: evShootType,
      event_date: evDate,
      event_start_date: evStartDate,
      event_end_date: evEndDate,
      event_time: fullLead.event_time || '',
      reporting_time: fullLead.reporting_time || '',
      event_location: evLocation,
      guest_pax: evGuestPax,
      staff_pax: evStaffPax,
      lead_source: fullLead.lead_source || '',
      Specify_Custom_Lead_Source_Name: fullLead.Specify_Custom_Lead_Source_Name || '',
      shoot_type: evShootType,
      // Step 3
      selected_package_id: matchedPkgId || 'Custom Package',
      Select_Package_Option: matchedPkgId || 'Custom Package',
      package_cost: cleanPkgPrice || '',
      package_price: cleanPkgPrice || '',
      deliverables: typeof rawDelData === 'string' ? rawDelData : JSON.stringify(rawDelData || ''),
      deliverables_description: typeof rawDelData === 'string' ? rawDelData : JSON.stringify(rawDelData || ''),
      notes_special_customizations: fullLead.notes_special_customizations || latestQuote?.notes_special_customizations || primaryLP?.notes_special_customizations || '',
      notes: fullLead.remarks || '',
      // Step 4
      budget: cleanPkgPrice || fullLead.budget || latestQuote?.quotation_amount || 0,
      final_quoted_amount: fullLead.Final_Quotation_Amount ?? latestQuote?.final_amount ?? (primaryLP ? Number(primaryLP.final_amount) : 0),
      remarks: fullLead.remarks || '',
      next_follow_up_date: '',
      // Step 5
      status: fullLead.status || 'New Lead',
      // Order Confirmed Rule fields
      confirmed_event_date: fullLead.booking_date || fullLead.event_date || '',
      confirmed_event_time: fullLead.booking_time || fullLead.event_time || '',
      final_amount: (fullLead.Final_Package_Amount !== null && fullLead.Final_Package_Amount !== undefined && !isNaN(Number(fullLead.Final_Package_Amount)) && Number(fullLead.Final_Package_Amount) > 0)
        ? Number(fullLead.Final_Package_Amount)
        : (Number(fullLead.final_package_amount) || Number(fullLead.Final_Quotation_Amount) || (Number((fullLead as any).final_amount) > 0 ? Number((fullLead as any).final_amount) : 0)),
      advance_received: fullLead.advance_collected || 0,
      total_pax: fullLead.total_pax || 0,
      reference_source: fullLead.reference_source || '',
      lead_value: fullLead.lead_value || 0,
      lead_score: fullLead.lead_score || 0,
      booking_status: fullLead.booking_status || 'Pending',
    });

    setFollowUpForm({
      call_notes: lead.follow_up_notes || '',
      next_follow_up_date: '',
      status: lead.status,
      quotation_amount: 0,
      negotiation_notes: '',
      event_date: lead.event_date || '',
      event_time: lead.event_time || '',
      reporting_time: lead.reporting_time || '08:00',
      advance_received: 0,
      payment_mode: 'UPI',
    });
    setConfirmForm({
      package_name: packages?.find((p) => String(p.package_id) === String(lead.Select_Package_Option))?.package_name || lead.Select_Package_Option || '',
      quotation_amount: getLeadFinalPackageAmount(fullLead, wizardLeadData),
      advance_received: 0,
      event_date: lead.event_date || '',
      event_time: lead.event_time || '',
      payment_mode: 'UPI',
      notes: '',
    });
  };

  const handlePackageDropdownChange = (packageId: string) => {
    if (isStep3Locked) {
      showToastMsg("Quotation details are locked. Owner unlock approval required to edit.", "error");
      return;
    }

    const activeEvents = activeTab === 'create' ? createEvents : crmEvents;
    
    // Auto save by logged in sales user
    if (currentUser) {
      setSalesStaffName(currentUser.name || '');
      setSalesStaffMobile(currentUser.mobile || '');
    }
    
    const targetPkgId = packageId || 'Custom Package';
    setSelectedPkgIds([targetPkgId]);

    if (targetPkgId === 'Custom Package' || targetPkgId === 'custom_package') {
      const customPkgVal = 'Custom Package';
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: customPkgVal,
        Select_Package_Option: customPkgVal,
        package_name: 'Custom Package',
        package_cost: 0,
        package_price: 0,
        budget: 0,
        final_quoted_amount: 0,
      }));
      setPkgPrices(prev => ({ ...prev, [customPkgVal]: 0, 'custom_package': 0 }));

      const newInclusions = { ...editableInclusions };
      if (!newInclusions[customPkgVal]) newInclusions[customPkgVal] = [];
      const newDeliverables = { ...editableDeliverables };
      if (!newDeliverables[customPkgVal]) newDeliverables[customPkgVal] = [];

      if (activeEvents && activeEvents.length > 0) {
        activeEvents.forEach((ev) => {
          const k1 = `${customPkgVal}_${ev.id}`;
          const k2 = `${customPkgVal}_${ev.event_name || ev.event_type || 'Unnamed Event'}`;
          if (!newInclusions[k1]) newInclusions[k1] = [];
          if (!newInclusions[k2]) newInclusions[k2] = [];
          if (!newDeliverables[k1]) newDeliverables[k1] = [];
          if (!newDeliverables[k2]) newDeliverables[k2] = [];
        });
      }

      setEditableInclusions(newInclusions);
      setEditableDeliverables(newDeliverables);
      if (selectedLead && selectedLead.lead_id && selectedLead.lead_id !== 'DRAFT-LEAD') {
        saveStep3DataRealtime(newInclusions, newDeliverables, customPkgVal);
      }
      return;
    }

    const availablePkgs = (packages && packages.length > 0) ? packages : INITIAL_PACKAGES;
    const pkg = availablePkgs.find((p) => String(p.package_id) === String(targetPkgId) || String(p.package_name) === String(targetPkgId));
    if (pkg) {
      const pkgIdStr = String(pkg.package_id);
      const pkgPrice = Number(pkg.price) || 0;
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: pkgIdStr,
        Select_Package_Option: pkgIdStr,
        package_name: pkg.package_name,
        package_cost: pkgPrice,
        package_price: pkgPrice,
        deliverables: pkg.deliverables || '',
        notes: pkg.seasonal_offer ? `Seasonal Offer: ${pkg.seasonal_offer}` : prev.notes,
        budget: pkgPrice,
        final_quoted_amount: pkgPrice,
      }));
      
      const incList = parseTeamMembers(pkg.team_members);
      const defaultInc = incList.length > 0 ? incList : [];
      
      const delList = parseTeamMembers(pkg.deliverables);
      const defaultDel = delList.length > 0 ? delList : [];

      const newInclusions = { ...editableInclusions };
      newInclusions[pkgIdStr] = [...defaultInc];
      newInclusions[targetPkgId] = [...defaultInc];
      
      const newDeliverables = { ...editableDeliverables };
      newDeliverables[pkgIdStr] = [...defaultDel];
      newDeliverables[targetPkgId] = [...defaultDel];

      if (activeEvents && activeEvents.length > 0) {
        activeEvents.forEach((ev) => {
          newInclusions[`${pkgIdStr}_${ev.id}`] = [...defaultInc];
          newInclusions[`${pkgIdStr}_${ev.event_name || ev.event_type || 'Unnamed Event'}`] = [...defaultInc];
          newInclusions[`${targetPkgId}_${ev.id}`] = [...defaultInc];
          newInclusions[`${targetPkgId}_${ev.event_name || ev.event_type || 'Unnamed Event'}`] = [...defaultInc];
          
          newDeliverables[`${pkgIdStr}_${ev.id}`] = [...defaultDel];
          newDeliverables[`${pkgIdStr}_${ev.event_name || ev.event_type || 'Unnamed Event'}`] = [...defaultDel];
          newDeliverables[`${targetPkgId}_${ev.id}`] = [...defaultDel];
          newDeliverables[`${targetPkgId}_${ev.event_name || ev.event_type || 'Unnamed Event'}`] = [...defaultDel];
        });
      }

      setEditableInclusions(newInclusions);
      setEditableDeliverables(newDeliverables);
      if (selectedLead && selectedLead.lead_id && selectedLead.lead_id !== 'DRAFT-LEAD') {
        saveStep3DataRealtime(newInclusions, newDeliverables, pkgIdStr);
      }
    } else {
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: targetPkgId,
        Select_Package_Option: targetPkgId,
      }));
      if (selectedLead && selectedLead.lead_id && selectedLead.lead_id !== 'DRAFT-LEAD') {
        saveStep3DataRealtime(editableInclusions, editableDeliverables, targetPkgId);
      }
    }
  };

  const validateStep3Data = (mode: 'package' | 'all'): boolean => {
    // Validate package selection
    const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option;
    if (!pkgId || pkgId.trim() === '') {
      showValidationError("select_package_option", "Please select a package before continuing.");
      showToastMsg("‚ùå Please complete all required fields before saving the package.", "error");
      return false;
    }

    // Auto-detect & attach current logged-in Sales Executive
    const effName = getEffectiveSalesStaffName();
    const effMobile = getEffectiveSalesStaffMobile();
    if (!salesStaffName || !salesStaffName.trim()) {
      setSalesStaffName(effName);
    }
    if (!salesStaffMobile || !salesStaffMobile.trim()) {
      setSalesStaffMobile(effMobile);
    }

    if (mode === 'all') {
      if (wizardLeadData.status === 'Order Confirmed') {
        if (!wizardLeadData.confirmed_event_date) {
          showValidationError("input_confirmed_event_date", "Please provide Confirmed Event Date.");
          showToastMsg("‚ùå Please complete all required fields before saving.", "error");
          return false;
        }

        if (wizardLeadData.final_amount === undefined || wizardLeadData.final_amount === null || isNaN(wizardLeadData.final_amount) || wizardLeadData.final_amount <= 0) {
          showValidationError("input_final_amount", "Please provide Final Amount.");
          showToastMsg("‚ùå Please complete all required fields before saving.", "error");
          return false;
        }
        if (wizardLeadData.advance_received === undefined || wizardLeadData.advance_received === null || isNaN(wizardLeadData.advance_received)) {
          showValidationError("input_advance_received", "Please provide Advance Payment Received.");
          showToastMsg("‚ùå Please complete all required fields before saving.", "error");
          return false;
        }

        if (crmEvents && crmEvents.length > 0) {
          for (const ev of crmEvents) {
            const rDate = ev.reporting_date || ev.event_date || wizardLeadData.confirmed_event_date;
            if (!rDate) {
              showValidationError(`reporting_date_${ev.id}`, "Reporting Date is required.");
              showToastMsg("‚ùå Please complete all required fields before saving.", "error");
              return false;
            }
            if (!ev.reporting_time) {
              showValidationError(`reporting_time_${ev.id}`, "Reporting Time is required.");
              showToastMsg("‚ùå Please complete all required fields before saving.", "error");
              return false;
            }
          }
        }
      }
    }

    return true;
  };

  const completeApprovedUnlockRequest = async (leadId: string) => {
    if (!leadId) return;
    console.log("[DEBUG completeApprovedUnlockRequest] Executing completeApprovedUnlockRequest for leadId:", leadId);
    try {
      const linkedOrder = (orders || []).find(o => o.lead_id === leadId);
      const orderId = linkedOrder?.order_id || (selectedLead as any)?.order_id;
      const nowIso = new Date().toISOString();

      // 1. Update lead record in Supabase & context state: set quotation_locked = true
      try {
        await updateLead(leadId, { quotation_locked: true, updated_at: nowIso } as any);
        console.log("[DEBUG completeApprovedUnlockRequest] Successfully updated lead quotation_locked = true via updateLead for", leadId);
      } catch (lErr: any) {
        console.warn("[DEBUG completeApprovedUnlockRequest] updateLead warning:", lErr?.message || lErr);
      }

      if (selectedLead && selectedLead.lead_id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, quotation_locked: true } : prev);
      }

      // 2. Update unlock_requests table status to Completed
      if (supabaseClient) {
        try {
          const { data: allReqs } = await supabaseClient
            .from('unlock_requests')
            .select('*');

          if (allReqs && allReqs.length > 0) {
            const matchingReqs = allReqs.filter((r: any) => {
              const matchesLead = r.lead_id === leadId || r.order_id === leadId || r.project_id === leadId;
              const matchesOrder = orderId && (r.order_id === orderId || r.lead_id === orderId);
              return matchesLead || matchesOrder;
            });

            for (const req of matchingReqs) {
              const reqKeyCol = req.id ? 'id' : (req.request_id ? 'request_id' : 'lead_id');
              const reqKeyVal = req.id || req.request_id || req.lead_id;

              await supabaseClient
                .from('unlock_requests')
                .update({
                  request_status: 'Completed',
                  status: 'Completed',
                  completed_at: nowIso,
                  edited_at: nowIso,
                  updated_at: nowIso
                })
                .eq(reqKeyCol, reqKeyVal);
            }
          }

          // Proxy call fallback
          await fetch('/api/db/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table: 'unlock_requests',
              matchColumn: 'lead_id',
              matchValue: leadId,
              updates: { request_status: 'Completed', status: 'Completed', completed_at: nowIso, updated_at: nowIso }
            })
          }).catch(() => {});

          if (orderId && orderId !== leadId) {
            await fetch('/api/db/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                table: 'unlock_requests',
                matchColumn: 'order_id',
                matchValue: orderId,
                updates: { request_status: 'Completed', status: 'Completed', completed_at: nowIso, updated_at: nowIso }
              })
            }).catch(() => {});
          }
        } catch (dbErr: any) {
          console.warn("[DEBUG completeApprovedUnlockRequest] unlock_requests DB update warning:", dbErr?.message || dbErr);
        }
      }

      // 3. Update local React unlockRequests state
      setUnlockRequests(prev => Array.isArray(prev) ? prev.map(r => {
        const matchesLead = r.lead_id === leadId || r.order_id === leadId || r.project_id === leadId;
        const matchesOrder = orderId && (r.order_id === orderId || r.lead_id === orderId);
        if (matchesLead || matchesOrder) {
          return {
            ...r,
            request_status: 'Completed',
            status: 'Completed',
            completed_at: nowIso,
            edited_at: nowIso
          };
        }
        return r;
      }) : []);

      // Re-fetch unlock_requests from DB to stay synchronized
      if (supabaseClient) {
        const { data } = await supabaseClient.from('unlock_requests').select('*');
        if (data) {
          setUnlockRequests(data.map((r: any) => ({
            ...r,
            request_status: r.request_status || r.status || 'Pending',
            status: r.request_status || r.status || 'Pending',
            reason: r.request_reason || r.reason || '',
            sales_staff_name: r.requested_by_name || r.sales_staff_name || '',
            sales_staff_id: r.requested_by_user_id || r.sales_staff_id || ''
          })));
        }
      }

    } catch (err: any) {
      console.error("[DEBUG completeApprovedUnlockRequest] Exception during unlock completion:", err?.message || err);
    }
  };

  const handleSavePackageOnly = async () => {
    if (isSaving) return;
    if (isStep3Locked) {
      showToastMsg("Quotation details are locked. Owner unlock approval required to edit.", "error");
      return;
    }
    const targetLeadId = selectedLead?.lead_id || createdLeadId;
    setIsSaving(true);
    try {
      // 1. Perform unified validation
      if (!validateStep3Data('package')) {
        setIsSaving(false);
        return;
      }

      const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedLead?.Select_Package_Option || 'Custom Package';
      const currentEvents = selectedLead ? crmEvents : createEvents;

      const { teamMembersJson, deliverablesJson, flatTeamMembers, teamMembersText, deliverablesText } = buildStep3EventPayloads(
        pkgId,
        currentEvents,
        editableInclusions,
        editableDeliverables
      );

      // 3. Update the lead record in Supabase with latest Step 3 package / pricing / staff info
      const updatedRemarks = appendCompletedStep(wizardLeadData.notes || '', 3);
      
      const updatedEvents = currentEvents.map(ev => ({
        ...ev,
        assigned_staff_names: ev.assigned_staff_names || '',
        assigned_staff_mobiles: ev.assigned_staff_mobiles || ''
      }));

      const cleanPkgCost = wizardLeadData.package_cost !== "" && wizardLeadData.package_cost != null && !isNaN(Number(wizardLeadData.package_cost))
        ? Number(wizardLeadData.package_cost)
        : (wizardLeadData.package_price !== "" && wizardLeadData.package_price != null && !isNaN(Number(wizardLeadData.package_price))
          ? Number(wizardLeadData.package_price)
          : (wizardLeadData.budget ? Number(wizardLeadData.budget) : (selectedLead?.package_price || selectedLead?.budget || null)));

      const cleanDiscount = quoteDiscount === "" || quoteDiscount == null || isNaN(Number(quoteDiscount)) ? null : Number(quoteDiscount);
      const cleanAdditional = quoteAdditional === "" || quoteAdditional == null || isNaN(Number(quoteAdditional)) ? null : Number(quoteAdditional);
      const cleanFinalAmt = Math.max(0, (cleanPkgCost || 0) + (cleanAdditional || 0) - (cleanDiscount || 0));

      const effectiveSalesName = getEffectiveSalesStaffName();
      const effectiveSalesMobile = getEffectiveSalesStaffMobile();

      const safeTeamMembersText = teamMembersText;
      const safeDeliverablesText = deliverablesText;

      if (targetLeadId && targetLeadId !== 'DRAFT-LEAD' && supabaseClient) {
        console.log('TEAM MEMBERS SAVE in handleSavePackageOnly', { leadId: targetLeadId, teamMembers: flatTeamMembers, serialized: safeTeamMembersText });
        
        try {
          const { data: dbResult, error: dbError } = await supabaseClient
            .from('leads')
            .update({
              budget: cleanPkgCost,
              package_price: cleanPkgCost,
              deliverables_description: safeDeliverablesText,
              Team_member: safeTeamMembersText,
              Team_Members: safeTeamMembersText,
              team_members: safeTeamMembersText,
              notes_special_customizations: wizardLeadData.notes,
              remarks: updatedRemarks,
              Select_Package_Option: pkgId,
              sales_staff_name: effectiveSalesName,
              sales_staff_mobile: effectiveSalesMobile,
              Quotation_Discount: cleanDiscount,
              Additional_Services_Cost: cleanAdditional,
              Final_Quotation_Amount: cleanFinalAmt,
              Final_Package_Amount: cleanFinalAmt,
              events: updatedEvents
            })
            .eq('lead_id', targetLeadId)
            .select('*');
          console.log('TEAM MEMBERS DB RESULT handleSavePackageOnly', { data: dbResult, error: dbError });
        } catch (dbErr) {
          console.warn("Direct Supabase update warning in handleSavePackageOnly:", dbErr);
        }

        await updateLead(targetLeadId, {
          budget: cleanPkgCost,
          package_price: cleanPkgCost,
          deliverables_description: safeDeliverablesText,
          Team_member: safeTeamMembersText,
          Team_Members: safeTeamMembersText,
          team_members: safeTeamMembersText,
          notes_special_customizations: wizardLeadData.notes,
          remarks: updatedRemarks,
          Select_Package_Option: pkgId,
          sales_staff_name: effectiveSalesName,
          sales_staff_mobile: effectiveSalesMobile,
          Quotation_Discount: cleanDiscount,
          Additional_Services_Cost: cleanAdditional,
          Final_Quotation_Amount: cleanFinalAmt,
          Final_Package_Amount: cleanFinalAmt,
          final_package_amount: cleanFinalAmt,
          _explicit_step3_save: true,
          events: updatedEvents
        });

        // Also upsert to lead_packages table so that Step 3 reloads from lead_packages perfectly
        try {
          // If we safely retained the old lead data, we should also try to retain the old json data
          // if the new one is empty. We can check if teamMembersText was '[]' but we saved safeTeamMembersText
          const isTeamEmpty = teamMembersText === '[]' || teamMembersText === '';
          const isDelEmpty = deliverablesText === '[]' || deliverablesText === '';
          
          const packagePayload = {
            lead_id: targetLeadId,
            package_id: pkgId,
            package_name: wizardLeadData.package_name || (pkgId === 'Custom Package' || pkgId === 'custom_package' ? 'Custom Package' : `Package ${pkgId}`),
            quantity: 1,
            total_amount: cleanPkgCost || 0,
            discount: cleanDiscount || 0,
            final_amount: cleanFinalAmt || 0,
            Team_Members_Included: teamMembersJson,
            editable_inclusions: editableInclusions,
            deliverables_descriptionn: deliverablesJson,
            deliverables_json: deliverablesJson,
            deliverables_description: deliverablesText,
            editable_deliverables: editableDeliverables,
            updated_at: new Date().toISOString()
          };

          const { data: existingLps } = await supabaseClient
            .from('lead_packages')
            .select('*')
            .eq('lead_id', targetLeadId);

          let targetLpId = `LP-${targetLeadId}-${pkgId}`;
          if (existingLps && existingLps.length > 0) {
            const matched = existingLps.find(lp => String(lp.package_id) === String(pkgId)) || existingLps[0];
            targetLpId = matched.lead_package_id;
            await supabaseClient
              .from('lead_packages')
              .update(packagePayload)
              .eq('lead_package_id', targetLpId);
          } else {
            await supabaseClient
              .from('lead_packages')
              .insert({
                ...packagePayload,
                lead_package_id: targetLpId,
                created_at: new Date().toISOString()
              });
          }
        } catch (lpErr) {
          console.warn("Could not upsert lead_packages record:", lpErr);
        }
      }

      setWizardLeadData(prev => ({
        ...prev,
        deliverables: deliverablesText,
        deliverables_description: deliverablesText,
        package_price: cleanPkgCost ?? prev.package_price,
        selected_package_id: pkgId,
        Select_Package_Option: pkgId
      }));

      // Update the local selectedLead state so that the UI reflects it
      if (selectedLead) {
        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            budget: cleanPkgCost || 0,
            package_price: cleanPkgCost || 0,
            deliverables_description: deliverablesText,
            notes_special_customizations: wizardLeadData.notes,
            remarks: updatedRemarks,
            Select_Package_Option: pkgId,
            sales_staff_name: effectiveSalesName,
            sales_staff_mobile: effectiveSalesMobile,
            Quotation_Discount: cleanDiscount,
            Additional_Services_Cost: cleanAdditional,
            Final_Quotation_Amount: cleanFinalAmt,
          };
        });
        await completeApprovedUnlockRequest(selectedLead.lead_id);
      }

      showToastMsg("Package configuration saved successfully!", "success");
    } catch (err: any) {
      console.error("Save package only failed:", err);
      setSaveErrorPopup({
        title: "Failed to save package",
        message: "‚ùå Failed to save package.\nPlease try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStep = async (step: number) => {
    if (!selectedLead) return;
    setIsSaving(true);
    try {
      if (step === 1) {
        if (isStep1Locked) {
          showToastMsg("Customer details are locked after order confirmation.", "error");
          setIsSaving(false);
          return;
        }
        if (!wizardLeadData.mobile) {
          showToastMsg("Phone Number is required.", "error");
          setIsSaving(false);
          return;
        }
        const mobileVal = String(wizardLeadData.mobile || '').trim();
        if (!/^\d{10}$/.test(mobileVal)) {
          showToastMsg("Please enter a valid 10-digit mobile number.", "error");
          setIsSaving(false);
          return;
        }
        if (!wizardLeadData.lead_source) {
          showToastMsg("Lead Source is required.", "error");
          setIsSaving(false);
          return;
        }
        const updatedRemarks = appendCompletedStep(selectedLead.remarks || wizardLeadData.remarks, 1);
        await updateLead(selectedLead.lead_id, {
          customer_name: wizardLeadData.customer_name || '',
          mobile: wizardLeadData.mobile,
          whatsapp_number: wizardLeadData.whatsapp_number,
          email: wizardLeadData.email,
          address: wizardLeadData.address,
          city: wizardLeadData.city,
          state: wizardLeadData.state,
          pincode: wizardLeadData.pincode,
          client_residence_address: wizardLeadData.client_residence_address,
          lead_source: wizardLeadData.lead_source,
          Specify_Custom_Lead_Source_Name: wizardLeadData.lead_source === 'Other' && wizardLeadData.Specify_Custom_Lead_Source_Name?.trim() !== '' ? wizardLeadData.Specify_Custom_Lead_Source_Name.trim() : null,
          total_pax: wizardLeadData.total_pax,
          reference_source: wizardLeadData.reference_source,
          Select_Package_Option: wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || selectedLead.Select_Package_Option || '',
          remarks: updatedRemarks,
          status: getStatusRank(selectedLead.status || selectedLead.current_status) < 1 || selectedLead.status === 'New Lead' ? 'Create Quote' : (selectedLead.status || 'Create Quote'),
          current_status: getStatusRank(selectedLead.status || selectedLead.current_status) < 1 || selectedLead.status === 'New Lead' ? 'Create Quote' : (selectedLead.current_status || selectedLead.status || 'Create Quote')
        });

        const newCompleted = Math.max(crmHighestStep, 1);
        setCrmHighestStep(newCompleted);
        localStorage.setItem(`crm_last_step_${selectedLead.lead_id}`, String(newCompleted));

        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            remarks: updatedRemarks
          };
        });

        showToastMsg("CRM Updated Successfully.", "success");
      } else if (step === 2) {
        if (isStep2Locked) {
          showToastMsg("Event details are locked after order confirmation.", "error");
          setIsSaving(false);
          return;
        }
        let finalEventsList = [...crmEvents];

        if (showEventForm || finalEventsList.length === 0) {
          if (!eventForm.event_type || eventForm.event_type === '') {
            showToastMsg("Please select Event Type.", "error");
            setIsSaving(false);
            return;
          }
          if (!eventForm.event_date || eventForm.event_date === '') {
            showToastMsg("Please select Event Date.", "error");
            setIsSaving(false);
            return;
          }
          if (!eventForm.event_location || eventForm.event_location.trim() === '') {
            showToastMsg("Please enter Event Location.", "error");
            setIsSaving(false);
            return;
          }

          const dateTimeErrMsg = getEventDateTimeErrorMessage(eventForm.event_date, eventForm.event_end_date, eventForm.event_start_time, eventForm.event_end_time);
          if (dateTimeErrMsg) {
            showToastMsg(dateTimeErrMsg, "error");
            setIsSaving(false);
            return;
          }

          const guestPaxVal = eventForm.guest_pax !== '' ? Math.max(0, parseInt(String(eventForm.guest_pax)) || 0) : '';
          const staffPaxVal = eventForm.staff_pax !== '' ? Math.max(0, parseInt(String(eventForm.staff_pax)) || 0) : '';

          const eventData = {
            ...eventForm,
            guest_pax: guestPaxVal,
            staff_pax: staffPaxVal,
            event_start_date: eventForm.event_date,
            event_end_date: eventForm.event_end_date || ''
          };

          if (editingEventId) {
            finalEventsList = finalEventsList.map(ev => ev.id === editingEventId ? { ...eventData, id: editingEventId } : ev);
          } else {
            finalEventsList.push({
              ...eventData,
              id: `EV-${Math.floor(1000 + Math.random() * 9000)}`
            });
          }

          setCrmEvents(finalEventsList);
          setEditingEventId(null);
          setShowEventForm(false);
        }

        if (finalEventsList.length === 0) {
          showToastMsg("Please add at least one event.", "error");
          setIsSaving(false);
          return;
        }

        // Pre-validate and format all events in the finalEventsList
        for (const ev of finalEventsList) {
          if (!ev.event_type || ev.event_type.trim() === '') {
            showToastMsg("Please select Event Type for all events.", "error");
            setIsSaving(false); return;
          }
          if (ev.event_type === 'Other' && (!ev.event_name || ev.event_name.trim() === '')) {
            showToastMsg("Please enter Event Name for 'Other' event types.", "error");
            setIsSaving(false); return;
          }
          if (!ev.event_date || ev.event_date.trim() === '') {
            showToastMsg("Please select Event Date for all events.", "error");
            setIsSaving(false); return;
          }
          if (!ev.event_start_time || ev.event_start_time.trim() === '') {
            showToastMsg("Please select Event Start Time for all events.", "error");
            setIsSaving(false); return;
          }
          if (!ev.event_end_time || ev.event_end_time.trim() === '') {
            showToastMsg("Please select Event End Time for all events.", "error");
            setIsSaving(false); return;
          }
          if (!ev.event_location || ev.event_location.trim() === '') {
            showToastMsg("Please enter Event Location for all events.", "error");
            setIsSaving(false); return;
          }
          
          try {
            ev.event_start_time = validateAndFormatTime(ev.event_start_time, "Event Start Time") || '';
          } catch (err: any) {
            showToastMsg(err.message, "error");
            setIsSaving(false);
            return;
          }
          try {
            ev.event_end_time = validateAndFormatTime(ev.event_end_time, "Event End Time") || '';
          } catch (err: any) {
            showToastMsg(err.message, "error");
            setIsSaving(false);
            return;
          }
          
          const dateTimeErrMsg = getEventDateTimeErrorMessage(ev.event_date, ev.event_end_date, ev.event_start_time, ev.event_end_time);
          if (dateTimeErrMsg) {
            showToastMsg(dateTimeErrMsg, "error");
            setIsSaving(false);
            return;
          }
        }


        // Perform direct save for Step 2 without showing follow-up popup
        await handleSaveStep2Direct();
        return;
      } else if (step === 3) {
        if (isStep3Locked) {
          showToastMsg("Quotation details are locked. Owner unlock approval required to edit.", "error");
          setIsSaving(false);
          return;
        }
        if (!validateStep3Data('all')) {
          setIsSaving(false);
          return;
        }
        const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedLead.Select_Package_Option || 'Custom Package';
        const { teamMembersJson, deliverablesJson, flatTeamMembers, teamMembersText, deliverablesText } = buildStep3EventPayloads(
          pkgId,
          crmEvents,
          editableInclusions,
          editableDeliverables
        );

        const updatedRemarks = appendCompletedStep(wizardLeadData.notes || '', 3);
        
        const updatedEvents = crmEvents.map(ev => ({
          ...ev,
          assigned_staff_names: ev.assigned_staff_names || '',
          assigned_staff_mobiles: ev.assigned_staff_mobiles || ''
        }));

        const cleanPkgCost = wizardLeadData.package_cost !== "" && wizardLeadData.package_cost != null && !isNaN(Number(wizardLeadData.package_cost)) ? Number(wizardLeadData.package_cost) : (wizardLeadData.package_price !== "" && wizardLeadData.package_price != null && !isNaN(Number(wizardLeadData.package_price)) ? Number(wizardLeadData.package_price) : null);
        const cleanDiscount = quoteDiscount === "" || quoteDiscount == null || isNaN(Number(quoteDiscount)) ? null : Number(quoteDiscount);
        const cleanAdditional = quoteAdditional === "" || quoteAdditional == null || isNaN(Number(quoteAdditional)) ? null : Number(quoteAdditional);
        const cleanFinalAmt = Math.max(0, (cleanPkgCost || 0) + (cleanAdditional || 0) - (cleanDiscount || 0));
        const cleanPincode = wizardLeadData.pincode === "" || wizardLeadData.pincode == null ? null : wizardLeadData.pincode;

        const effectiveSalesName = getEffectiveSalesStaffName();
        const effectiveSalesMobile = getEffectiveSalesStaffMobile();

        const safeTeamMembersText = teamMembersText;
        const safeDeliverablesText = deliverablesText;

        console.log('TEAM MEMBERS SAVE in handleStep3Submit', { leadId: selectedLead.lead_id, teamMembers: flatTeamMembers, serialized: safeTeamMembersText });

        try {
          const { data: dbResult, error: dbError } = await supabaseClient
            .from('leads')
            .update({
              budget: cleanPkgCost,
              package_price: cleanPkgCost,
              deliverables_description: safeDeliverablesText,
              Team_member: safeTeamMembersText,
              Team_Members: safeTeamMembersText,
              team_members: safeTeamMembersText,
              notes_special_customizations: wizardLeadData.notes,
              remarks: updatedRemarks,
              Select_Package_Option: pkgId,
              client_residence_address: wizardLeadData.client_residence_address,
              city: wizardLeadData.city,
              state: wizardLeadData.state,
              pincode: cleanPincode,
              sales_staff_name: effectiveSalesName,
              sales_staff_mobile: effectiveSalesMobile,
              Quotation_Discount: cleanDiscount,
              Additional_Services_Cost: cleanAdditional,
              Final_Quotation_Amount: cleanFinalAmt,
              Final_Package_Amount: cleanFinalAmt,
              events: updatedEvents
            })
            .eq('lead_id', selectedLead.lead_id)
            .select('*');
          console.log('TEAM MEMBERS DB RESULT handleStep3Submit', { data: dbResult, error: dbError });
        } catch (dbErr) {
          console.warn("Direct Supabase update warning in handleStep3Submit:", dbErr);
        }

        await updateLead(selectedLead.lead_id, {
          budget: cleanPkgCost,
          package_price: cleanPkgCost,
          deliverables_description: safeDeliverablesText,
          Team_member: safeTeamMembersText,
          Team_Members: safeTeamMembersText,
          team_members: safeTeamMembersText,
          notes_special_customizations: wizardLeadData.notes,
          remarks: updatedRemarks,
          Select_Package_Option: pkgId,
          client_residence_address: wizardLeadData.client_residence_address,
          city: wizardLeadData.city,
          state: wizardLeadData.state,
          pincode: cleanPincode,
          sales_staff_name: effectiveSalesName,
          sales_staff_mobile: effectiveSalesMobile,
          Quotation_Discount: cleanDiscount,
          Additional_Services_Cost: cleanAdditional,
          Final_Quotation_Amount: cleanFinalAmt,
          Final_Package_Amount: cleanFinalAmt,
          final_package_amount: cleanFinalAmt,
          _explicit_step3_save: true,
          events: updatedEvents
        });

        setWizardLeadData(prev => ({
          ...prev,
          deliverables: safeDeliverablesText,
          deliverables_description: safeDeliverablesText,
          Team_member: safeTeamMembersText,
          Team_Members: safeTeamMembersText,
          team_members: safeTeamMembersText,
          package_price: cleanPkgCost ?? prev.package_price,
          selected_package_id: pkgId,
          Select_Package_Option: pkgId,
          final_amount: cleanFinalAmt
        }));

        const newCompleted = Math.max(crmHighestStep, 3);
        setCrmHighestStep(newCompleted);
        localStorage.setItem(`crm_last_step_${selectedLead.lead_id}`, String(newCompleted));

        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            budget: cleanPkgCost ?? prev.budget,
            package_price: cleanPkgCost ?? prev.package_price,
            deliverables_description: safeDeliverablesText,
            Team_member: safeTeamMembersText,
            Team_Members: safeTeamMembersText,
            team_members: safeTeamMembersText,
            notes_special_customizations: wizardLeadData.notes,
            remarks: updatedRemarks,
            Select_Package_Option: pkgId,
            client_residence_address: wizardLeadData.client_residence_address,
            city: wizardLeadData.city,
            state: wizardLeadData.state,
            pincode: wizardLeadData.pincode,
            sales_staff_name: effectiveSalesName,
            sales_staff_mobile: effectiveSalesMobile,
            Quotation_Discount: cleanDiscount,
            Additional_Services_Cost: cleanAdditional,
            Final_Quotation_Amount: cleanFinalAmt,
            Final_Package_Amount: cleanFinalAmt,
            final_package_amount: cleanFinalAmt
          };
        });

        if (wizardLeadData.status === 'Order Confirmed') {
          if (!wizardLeadData.confirmed_event_date) {
             showToastMsg("Please provide Confirmed Event Date.", "error");
             setIsSaving(false); return;
          }
          if (!wizardLeadData.final_amount || isNaN(wizardLeadData.final_amount)) {
             showToastMsg("Please provide Final Amount.", "error");
             setIsSaving(false); return;
          }
          
          const pkgName = packages.find(p => p.package_id === wizardLeadData.selected_package_id)?.package_name || 'Selected Package';
          
          let masterOrderId = '';
          try {
             masterOrderId = await confirmOrder(
               selectedLead.lead_id,
               pkgName,
               Number(wizardLeadData.final_amount),
               Number(wizardLeadData.advance_received || 0),
               wizardLeadData.confirmed_event_date,
               wizardLeadData.confirmed_event_time,
               'UPI',
               wizardLeadData.notes || 'Order confirmed via CRM Wizard',
               undefined,
               undefined
             );
          } catch (err: any) {
             console.error('confirmOrder error', err);
             showToastMsg('Failed to confirm order: ' + err.message, 'error');
             setIsSaving(false); return;
          }

          // Save to order_event_reporting
          try {
             if (supabaseClient) {
               const finalAmt = Number(wizardLeadData.final_amount);
               const advanceAmt = Number(wizardLeadData.advance_received || 0);
               const pendingAmt = finalAmt - advanceAmt;
               const paymentStatus = pendingAmt <= 0 ? 'Paid' : 'Pending';

               for (const ev of crmEvents) {
                 const payload = {
                   order_id: masterOrderId,
                   lead_id: selectedLead.lead_id,
                   event_id: ev.id,
                   event_name: ev.event_name || ev.event_type || 'Unknown Event',
                   confirmed_event_date: wizardLeadData.confirmed_event_date,
                   confirmed_event_time: wizardLeadData.confirmed_event_time,
                   contract_final_amount: finalAmt,
                   advance_payment_received: advanceAmt,
                   reporting_date: ev.reporting_date || ev.event_date || wizardLeadData.confirmed_event_date,
                   reporting_time: ev.reporting_time || wizardLeadData.confirmed_event_time,
                   pending_amount: pendingAmt,
                   payment_status: paymentStatus
                 };

                 const { data: existing, error: fetchErr } = await supabaseClient
                   .from('order_event_reporting')
                   .select('event_id')
                   .eq('event_id', ev.id)
                   .maybeSingle();

                 if (fetchErr && fetchErr.code !== 'PGRST116') {
                    throw fetchErr;
                 }

                 if (existing) {
                   const { error: updErr } = await supabaseClient
                     .from('order_event_reporting')
                     .update(payload)
                     .eq('event_id', ev.id);
                   if (updErr) throw updErr;
                 } else {
                   const { error: insErr } = await supabaseClient
                     .from('order_event_reporting')
                     .insert(payload);
                   if (insErr) throw insErr;
                 }
               }
             }
          } catch (err: any) {
             const errMsg = `Failed to save Order Event Reporting.\nTable Name: order_event_reporting\nColumn Name: Multiple (Check schema)\nFailed Function: handleSaveStep -> UPSERT\nSQL Operation: INSERT/UPDATE\nExact Supabase Error: ${err.message || String(err)}\nSuggested Fix: Verify table schema 'order_event_reporting' exists with correct columns.`;
             alert(errMsg);
             setIsSaving(false);
             return;
          }
          
          await completeApprovedUnlockRequest(selectedLead.lead_id);
          showToastMsg("Order Confirmed and sent to Operations.", "success");
          setSelectedLead(null);
          setIsSaving(false);
          return;
        }

        await completeApprovedUnlockRequest(selectedLead.lead_id);
        showToastMsg(`‚úÖ Quotation & CRM changes saved.`, "success");
        setStep3FollowUpDate(selectedLead?.next_follow_up_date || '');
        setStep3FollowUpTime((selectedLead as any)?.next_follow_up_time || '');
        setStep3FollowUpNotes(selectedLead?.follow_up_notes || '');
        setShowStep3Popup(true);
        setIsSaving(false);
        return; // Open follow-up popup
      }

      if (step < 3) {
        let nextStep = step + 1;
        setCrmWizardStep(nextStep);
        setTimeout(() => {
          document.getElementById('crm-wizard-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
      } else {
        setSelectedLead(null);
      }
    } catch (err: any) {
      console.error("Save failed:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);
      
      const oldStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'New Lead') : null;
      const newStatus = wizardLeadData?.status || null;
      
      logStatusUpdateError({
        leadId: selectedLead?.lead_id || null,
        orderId: null,
        oldStatus,
        newStatus,
        updatePayload: {
          budget: Number(wizardLeadData?.package_cost || wizardLeadData?.budget || 0),
          package_price: Number(wizardLeadData?.package_cost || 0),
          remarks: wizardLeadData?.remarks || wizardLeadData?.notes || '',
          Select_Package_Option: wizardLeadData?.selected_package_id || wizardLeadData?.Select_Package_Option || ''
        },
        insertPayload: null,
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "CRM Multi-step Wizard Status Update Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      showToastMsg(parsed.reason, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Automatic background sync for Quote Sent -> Quote Follow-up when follow-up date and time are reached
  React.useEffect(() => {
    if (!leads || leads.length === 0) return;

    const checkAndSyncFollowUp = () => {
      leads.forEach(async (ld) => {
        const rawSt = ld.current_status || ld.status;
        if ((rawSt === 'Quote Sent' || rawSt === 'Quotation Sent') && isFollowUpDateTimeReached(ld)) {
          try {
            await updateLeadFollowUp(
              ld.lead_id,
              'Quote Follow-up' as CurrentStage,
              'Auto updated: Scheduled follow-up date and time reached',
              ld.next_follow_up_date || '',
              Number(ld.budget || 0),
              ld.follow_up_notes || 'Follow-up date and time reached'
            );
          } catch (e) {
            // Silent auto sync
          }
        }
      });
    };

    checkAndSyncFollowUp();
    const interval = setInterval(checkAndSyncFollowUp, 30000);
    return () => clearInterval(interval);
  }, [leads]);

  const handleSaveStep2Direct = async (passedEvents?: any[]) => {
    const isCreateFlow = activeTab === 'create';
    if (!isCreateFlow && isStep2Locked) {
      showToastMsg("Event details are locked after order confirmation.", "error");
      return;
    }
    const currentLeadId = isCreateFlow ? createdLeadId : selectedLead?.lead_id;
    if (!currentLeadId) {
      showToastMsg("Lead not initialized yet.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const finalEventsList = passedEvents || (isCreateFlow ? [...createEvents] : [...crmEvents]);
      if (finalEventsList.length === 0) {
        showToastMsg("Please add at least one event.", "error");
        setIsSaving(false);
        return;
      }
      
      // Pre-validate and format all events in the finalEventsList
      for (const ev of finalEventsList) {
        if (!ev.event_type || ev.event_type.trim() === '') {
          showToastMsg("Please select Event Type for all events.", "error");
          setIsSaving(false); return;
        }
        if (ev.event_type === 'Other' && (!ev.event_name || ev.event_name.trim() === '')) {
          showToastMsg("Please enter Event Name for 'Other' event types.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_date || ev.event_date.trim() === '') {
          showToastMsg("Please select Event Date for all events.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_start_time || ev.event_start_time.trim() === '') {
          showToastMsg("Please select Event Start Time for all events.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_end_time || ev.event_end_time.trim() === '') {
          showToastMsg("Please select Event End Time for all events.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_location || ev.event_location.trim() === '') {
          showToastMsg("Please enter Event Location for all events.", "error");
          setIsSaving(false); return;
        }
        
        try {
          ev.event_start_time = validateAndFormatTime(ev.event_start_time, "Event Start Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          setIsSaving(false); return;
        }
        try {
          ev.event_end_time = validateAndFormatTime(ev.event_end_time, "Event End Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          setIsSaving(false); return;
        }
        
        const dateTimeErrMsg = getEventDateTimeErrorMessage(ev.event_date, ev.event_end_date, ev.event_start_time, ev.event_end_time);
        if (dateTimeErrMsg) {
          showToastMsg(dateTimeErrMsg, "error");
          setIsSaving(false); return;
        }
      }

      const firstEvent = finalEventsList[0];

      const formattedEventTime = validateAndFormatTime(firstEvent.event_start_time, "Event Start Time");
      const formattedReportingTime = validateAndFormatTime(isCreateFlow ? reportingTime : wizardLeadData.reporting_time, "Reporting Time");

      await updateLead(currentLeadId, {
        event_type: firstEvent.event_type === 'Other' ? 'Other' : firstEvent.event_type,
        custom_event_name: firstEvent.event_name,
        custom_event_type: firstEvent.event_type === 'Other' ? firstEvent.event_name : undefined,
        event_date: firstEvent.event_date,
        Event_End_Date: firstEvent.event_end_date || (firstEvent as any).Event_End_Date || null,
        event_time: formattedEventTime || null,
        event_start_time: firstEvent.event_start_time || null,
        event_end_time: firstEvent.event_end_time || null,
        reporting_time: formattedReportingTime || null,
        event_location: firstEvent.event_location,
        google_maps_link: firstEvent.google_maps_link || '',
        lead_source: isCreateFlow ? createForm.lead_source : wizardLeadData.lead_source,
        shoot_type: firstEvent.event_shoot_type || '',
        event_shoot_type: firstEvent.event_shoot_type || '',
        desired_event_shoot_type: firstEvent.event_shoot_type || '',
        client_residence_address: isCreateFlow ? createForm.client_residence_address : wizardLeadData.client_residence_address,
        city: isCreateFlow ? createForm.city : wizardLeadData.city,
        state: isCreateFlow ? createForm.state : wizardLeadData.state,
        pincode: isCreateFlow ? createForm.pincode : wizardLeadData.pincode,
        total_pax: firstEvent.guest_pax !== '' && firstEvent.guest_pax != null ? Number(firstEvent.guest_pax) : null,
        guest_pax: firstEvent.guest_pax !== '' && firstEvent.guest_pax != null ? Number(firstEvent.guest_pax) : null,
        staff_pax: firstEvent.staff_pax !== '' && firstEvent.staff_pax != null ? Number(firstEvent.staff_pax) : null,
        reference_source: isCreateFlow ? createForm.reference_source : wizardLeadData.reference_source || '',
        Select_Package_Option: isCreateFlow ? (createForm.Select_Package_Option || selectedPkgIds[0] || '') : (wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || selectedLead?.Select_Package_Option || ''),
        events: finalEventsList
      });

      let reloadedEvents = finalEventsList;
      if (supabaseClient) {
        const { data: dbEvents, error: dbErr } = await supabaseClient
          .from('lead_events')
          .select('*')
          .eq('lead_id', currentLeadId)
          .order('created_at', { ascending: true });
          
        if (!dbErr && dbEvents && dbEvents.length > 0) {
          reloadedEvents = dbEvents as LeadEvent[];
          if (isCreateFlow) {
            setCreateEvents(reloadedEvents);
          } else {
            setCrmEvents(reloadedEvents);
          }
        }
      }

      if (isCreateFlow) {
        // Await confirmation from Supabase that the lead and events are persisted before initializing Step 3
        if (supabaseClient && currentLeadId) {
          try {
            await supabaseClient
              .from('leads')
              .select('lead_id')
              .eq('lead_id', currentLeadId)
              .maybeSingle();
          } catch (refetchErr) {
            console.warn("Silent confirmation before Step 3 failed:", refetchErr);
          }
        }

        if (selectedPkgIds.length === 0) {
          setSelectedPkgIds(['Custom Package']);
          setWizardLeadData(prev => ({ ...prev, selected_package_id: 'Custom Package', Select_Package_Option: 'Custom Package' }));
        }
        setWizardStep(3);
      } else {
        const newCompleted = Math.max(crmHighestStep, 2);
        setCrmHighestStep(newCompleted);
        if (selectedLead) {
          localStorage.setItem(`crm_last_step_${selectedLead.lead_id}`, String(newCompleted));
        }

        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            events: reloadedEvents
          };
        });

        setCrmWizardStep(3);
      }

      showToastMsg("‚úÖ Event Details Saved Successfully", "success");
    } catch (err: any) {
      console.error("Step 2 direct save failed:", err);
      showToastMsg(`Failed to save event details: ${err.message || err}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStep3FollowUp = async () => {
    const isCreateFlow = activeTab === 'create';
    const currentLeadId = isCreateFlow ? createdLeadId : selectedLead?.lead_id;

    if (!currentLeadId) {
      showToastMsg("Lead record not found.", "error");
      return;
    }
    if (!step3FollowUpDate) {
      showToastMsg("Follow-up Date is required.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const fullNotes = step3FollowUpTime
        ? `[Time: ${step3FollowUpTime}] ${step3FollowUpNotes}`.trim()
        : step3FollowUpNotes;

      const currentPkgCost = Number(isCreateFlow ? (createForm.budget || finalTotal || 0) : (wizardLeadData.package_cost || selectedLead?.budget || 0));

      const previousStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'Create Quote') : 'Create Quote';
      const prevRank = getStatusRank(previousStatus);

      // Target stage:
      // If previous status rank < 2 (i.e. Create Quote or New Lead), update status to Quote Sent.
      // If previous status rank >= 2 (already Quote Sent, Quote Follow-up, Confirm Order, Lost Lead), preserve existing status!
      const targetStage: CurrentStage = (isCreateFlow || prevRank < 2) 
        ? ('Quote Sent' as CurrentStage) 
        : (previousStatus as CurrentStage);

      await updateLeadFollowUp(
        currentLeadId,
        targetStage,
        fullNotes || 'Quotation created & follow-up scheduled',
        step3FollowUpDate,
        currentPkgCost,
        fullNotes || 'Quotation sent'
      );

      await completeApprovedUnlockRequest(currentLeadId);

      localStorage.setItem(`follow_up_date_${currentLeadId}`, step3FollowUpDate);
      localStorage.setItem(`follow_up_notes_${currentLeadId}`, fullNotes);

      if (isCreateFlow) {
        setSalesStatus('Quote Sent' as CurrentStage);
        resetForm();
        setActiveTab('list');
      } else {
        setSelectedLead(null);
        setCrmWizardStep(1);
        setActiveTab('list');
      }

      showToastMsg("‚úÖ Quotation & Follow-up saved! Status updated to Quote Sent.", "success");
      setShowStep3Popup(false);
    } catch (err: any) {
      console.error("Failed to save Step 3 follow-up:", err);
      showToastMsg(`Failed to save follow-up: ${err.message || err}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStep2FollowUp = async () => {
    const isCreateFlow = activeTab === 'create';
    const currentLeadId = isCreateFlow ? createdLeadId : selectedLead?.lead_id;
    if (!currentLeadId) {
      showToastMsg("Lead not initialized yet.", "error");
      return;
    }
    if (!step2FollowUpDate) {
      showToastMsg("Next Follow-up Date is mandatory.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const finalEventsList = (isCreateFlow ? [...createEvents] : [...crmEvents]);
      if (finalEventsList.length === 0) {
        showToastMsg("No events found to save.", "error");
        setIsSaving(false);
        return;
      }
      
      // Pre-validate and format all events in the finalEventsList
      for (const ev of finalEventsList) {
        if (!ev.event_type || ev.event_type.trim() === '') {
          showToastMsg("Please select Event Type for all events.", "error");
          setIsSaving(false); return;
        }
        if (ev.event_type === 'Other' && (!ev.event_name || ev.event_name.trim() === '')) {
          showToastMsg("Please enter Event Name for 'Other' event types.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_date || ev.event_date.trim() === '') {
          showToastMsg("Please select Event Date for all events.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_start_time || ev.event_start_time.trim() === '') {
          showToastMsg("Please select Event Start Time for all events.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_end_time || ev.event_end_time.trim() === '') {
          showToastMsg("Please select Event End Time for all events.", "error");
          setIsSaving(false); return;
        }
        if (!ev.event_location || ev.event_location.trim() === '') {
          showToastMsg("Please enter Event Location for all events.", "error");
          setIsSaving(false); return;
        }
        
        try {
          ev.event_start_time = validateAndFormatTime(ev.event_start_time, "Event Start Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          setIsSaving(false); return;
        }
        try {
          ev.event_end_time = validateAndFormatTime(ev.event_end_time, "Event End Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          setIsSaving(false); return;
        }
        
        const dateTimeErrMsg = getEventDateTimeErrorMessage(ev.event_date, ev.event_end_date, ev.event_start_time, ev.event_end_time);
        if (dateTimeErrMsg) {
          showToastMsg(dateTimeErrMsg, "error");
          setIsSaving(false); return;
        }
      }

      const firstEvent = finalEventsList[0];

      const formattedEventTime = validateAndFormatTime(firstEvent.event_start_time, "Event Start Time");
      const formattedReportingTime = validateAndFormatTime(isCreateFlow ? reportingTime : wizardLeadData.reporting_time, "Reporting Time");

      // Save event details first
      await updateLead(currentLeadId, {
        event_type: firstEvent.event_type === 'Other' ? 'Other' : firstEvent.event_type,
        custom_event_name: firstEvent.event_name,
        custom_event_type: firstEvent.event_type === 'Other' ? firstEvent.event_name : undefined,
        event_date: firstEvent.event_date,
        Event_End_Date: firstEvent.event_end_date || (firstEvent as any).Event_End_Date || null,
        event_time: formattedEventTime || null,
        event_start_time: firstEvent.event_start_time || null,
        event_end_time: firstEvent.event_end_time || null,
        reporting_time: formattedReportingTime || null,
        event_location: firstEvent.event_location,
        google_maps_link: firstEvent.google_maps_link || '',
        lead_source: isCreateFlow ? createForm.lead_source : wizardLeadData.lead_source,
        shoot_type: firstEvent.event_shoot_type || '',
        event_shoot_type: firstEvent.event_shoot_type || '',
        desired_event_shoot_type: firstEvent.event_shoot_type || '',
        client_residence_address: isCreateFlow ? createForm.client_residence_address : wizardLeadData.client_residence_address,
        city: isCreateFlow ? createForm.city : wizardLeadData.city,
        state: isCreateFlow ? createForm.state : wizardLeadData.state,
        pincode: isCreateFlow ? createForm.pincode : wizardLeadData.pincode,
        total_pax: firstEvent.guest_pax !== '' && firstEvent.guest_pax != null ? Number(firstEvent.guest_pax) : null,
        guest_pax: firstEvent.guest_pax !== '' && firstEvent.guest_pax != null ? Number(firstEvent.guest_pax) : null,
        staff_pax: firstEvent.staff_pax !== '' && firstEvent.staff_pax != null ? Number(firstEvent.staff_pax) : null,
        
        reference_source: isCreateFlow ? createForm.reference_source : wizardLeadData.reference_source || '',
        Select_Package_Option: isCreateFlow ? (createForm.Select_Package_Option || selectedPkgIds[0] || '') : (wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || ''),
        events: finalEventsList
      });

      // Reload latest Event Details from the database to ensure we have the real IDs
      let reloadedEvents = finalEventsList;
      if (supabaseClient) {
        const { data: dbEvents, error: dbErr } = await supabaseClient
          .from('lead_events')
          .select('*')
          .eq('lead_id', currentLeadId)
          .order('created_at', { ascending: true });
          
        if (dbErr) {
          throw new Error(`Failed to verify saved events: ${dbErr.message || dbErr.details || 'Unknown database error'}`);
        }
        
        if (dbEvents && dbEvents.length > 0) {
          reloadedEvents = dbEvents as LeadEvent[];
          if (isCreateFlow) {
            setCreateEvents(reloadedEvents);
          } else {
            setCrmEvents(reloadedEvents);
          }
        }
      }

      const notesWithTag = appendCompletedStep(step2FollowUpNotes || 'Saved event details', 2);

      // Determine target status: If the current status is New Lead or empty, update to Follow Up. Otherwise preserve advanced status.
      const previousStatus = isCreateFlow ? 'New Lead' : (selectedLead ? getLeadCurrentStatus(selectedLead) : 'New Lead');
      const targetStatus = (previousStatus === 'New Lead' || !previousStatus) ? 'Follow Up' : previousStatus;

      // Update lead follow up and preserve/update status
      await updateLeadFollowUp(
        currentLeadId,
        targetStatus as CurrentStage,
        notesWithTag,
        step2FollowUpDate,
        Number(isCreateFlow ? (createForm.budget || 0) : (wizardLeadData.package_cost || selectedLead?.budget || 0)),
        step2FollowUpNotes || 'Saved event details'
      );

      localStorage.setItem(`follow_up_date_${currentLeadId}`, step2FollowUpDate);
      localStorage.setItem(`follow_up_notes_${currentLeadId}`, step2FollowUpNotes);

      if (isCreateFlow) {
        setSalesStatus(targetStatus as CurrentStage);
        setSelectedPkgIds(['Custom Package']);
        setWizardLeadData(prev => ({ ...prev, selected_package_id: 'Custom Package', Select_Package_Option: 'Custom Package' }));
        setWizardStep(3);
      } else {
        const newCompleted = Math.max(crmHighestStep, 2);
        setCrmHighestStep(newCompleted);
        if (selectedLead) {
          localStorage.setItem(`crm_last_step_${selectedLead.lead_id}`, String(newCompleted));
        }

        // Locally update the status and remarks
        const timestamp = new Date().toISOString();
        const updatedRemarks = `${selectedLead?.remarks || ''}\n[Update ${timestamp.split('T')[0]}]: ${notesWithTag}. ${step2FollowUpNotes ? 'Neg Notes: ' + step2FollowUpNotes : ''}. Next follow-up: ${step2FollowUpDate}`;

        // Locally update the status
        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: targetStatus as CurrentStage,
            current_status: targetStatus,
            remarks: updatedRemarks,
            follow_up_notes: step2FollowUpNotes,
            next_follow_up_date: step2FollowUpDate,
            events: reloadedEvents
          };
        });

        setCrmWizardStep(3);
      }

      showToastMsg("‚úÖ Event Details Saved Successfully", "success");
      setShowStep2Popup(false);
    } catch (err: any) {
      console.error("Step 2 Follow-up save failed:", err);
      const errorMsg = err?.details || err?.message || String(err);
      showToastMsg(`Save Failed: ${errorMsg}`, "error");
      showErrorHelper(
        "Step 2 Save & Next Failed",
        errorMsg,
        "handleSaveStep2FollowUp",
        currentLeadId,
        "Check event details and try again.",
        err
      );
      setTimeout(() => {
        document.getElementById('error_details_modal')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLostLead = async () => {
    if (!selectedLead) return;
    const finalReason = lostReason === 'Other' ? otherLostReason : lostReason;
    if (!finalReason || finalReason.trim() === '') {
      showToastMsg("Lost Reason is mandatory.", "error");
      return;
    }
    if (!lostNotes || lostNotes.trim() === '') {
      showToastMsg("Lost Notes are mandatory.", "error");
      return;
    }
    setIsSaving(true);
    try {
      await updateLead(selectedLead.lead_id, {
        status: 'Lost Lead',
        current_status: 'Lost Lead',
        remarks: `Lost Reason: ${finalReason}. Notes: ${lostNotes}`,
        "Lost_Reason": finalReason,
        "Lost_Notes": lostNotes,
        lost_reason: finalReason,
        lost_notes: lostNotes,
        follow_up_notes: finalReason
      } as any);

      await updateLeadFollowUp(
        selectedLead.lead_id,
        'Lost Lead',
        finalReason,
        '',
        Number(selectedLead.package_price || selectedLead.budget || 0),
        lostNotes
      );

      showToastMsg("Lead status set to Lost successfully.", "success");
      setShowLostModal(false);
      setSelectedLead(null);
    } catch (err: any) {
      console.error("Failed to set lead as lost:", err);
      showToastMsg(err.message || String(err), "error");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSubmitUnlockRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnlockLead) return;
    
    if (unlockRequestReason === 'Other' && !unlockRequestCustomReason.trim()) {
      showToastMsg("Please enter a custom reason.", "error");
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (!supabaseClient) {
        throw new Error("Supabase database client is not initialized.");
      }

      const order = orders.find(o => o.lead_id === selectedUnlockLead.lead_id);
      const orderId = order?.order_id || (selectedUnlockLead as any).order_id || selectedUnlockLead.lead_id || 'ORD-UNKNOWN';
      
      // 1. Prevent Duplicate Requests: Check if a Pending request already exists
      const { data: existingPending, error: checkErr } = await supabaseClient
        .from('unlock_requests')
        .select('*')
        .or(`lead_id.eq.${selectedUnlockLead.lead_id},order_id.eq.${orderId}`)
        .eq('request_status', 'Pending');

      if (checkErr) {
        console.error("Error checking existing pending unlock requests:", checkErr);
      }

      const localPending = unlockRequests.find((r: any) => 
        (r.lead_id === selectedUnlockLead.lead_id || r.order_id === orderId) &&
        (r.status === 'Pending' || r.request_status === 'Pending')
      );

      if ((existingPending && existingPending.length > 0) || localPending) {
        showToastMsg("An Unlock Request is already pending Business Owner approval.", "error");
        setIsSaving(false);
        return;
      }

      const fullReason = unlockRequestReason === 'Other' ? unlockRequestCustomReason.trim() : unlockRequestReason;

      const unlockRequestPayload = {
        lead_id: selectedUnlockLead.lead_id,
        order_id: orderId,
        requested_by_user_id: currentUser?.id || 'sales-user',
        requested_by_name: currentUser?.name || 'Sales Staff',
        requested_by_role: currentUser?.role || 'Sales',
        business_owner_user_id: 'BO-MAIN',
        chapter_id: selectedUnlockLead.chapter_id || 'DEFAULT',
        request_reason: fullReason || 'Unlock quotation for editing',
        request_status: 'Pending',
        requested_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      // 2. Save to Supabase: MUST succeed
      const { data: insertedData, error: reqErr } = await supabaseClient
        .from('unlock_requests')
        .insert([unlockRequestPayload])
        .select();

      if (reqErr) {
        console.error("Supabase unlock_requests insert failed:", reqErr);
        throw new Error(`Database insert failed: ${reqErr.message}`);
      }

      if (!insertedData || insertedData.length === 0) {
        throw new Error("Database insert did not return confirmation. Request not saved.");
      }



      // 4. Send notification to Business Owner
      if (addNotification) {
        try {
          const payload = {
            title: unlockRequestReason,
            message: `New unlock request received for ${selectedUnlockLead.customer_name || 'Lead'}.`,
            notification_type: 'Quotation Unlock Request',
            recipient_role: 'Business Owner',
            project_id: orderId,
            task_id: 'Pending',
            priority: 'High',
            action_url: JSON.stringify({
              lead_id: selectedUnlockLead.lead_id,
              customer_name: selectedUnlockLead.customer_name,
              mobile: selectedUnlockLead.mobile,
              sales_staff_id: currentUser?.id || '',
              sales_staff_name: currentUser?.name || '',
              sales_staff_mobile: currentUser?.mobile || ''
            })
          };
          await addNotification(payload);
        } catch (notifErr) {
          console.error("Notification error:", notifErr);
        }
      }
      
      const normalizedNewRecord = {
        ...insertedData[0],
        status: 'Pending',
        request_status: 'Pending',
        reason: fullReason,
        request_reason: fullReason,
        sales_staff_name: currentUser?.name || 'Sales Staff',
        sales_staff_id: currentUser?.id || 'sales-user',
        customer_name: selectedUnlockLead.customer_name || 'Unknown'
      };

      setUnlockRequests(prev => [
        ...prev.filter(r => r.lead_id !== selectedUnlockLead.lead_id && r.order_id !== orderId),
        normalizedNewRecord
      ]);

      showToastMsg("Unlock request submitted successfully.", "success");
      setShowUnlockRequestModal(false);
      setSelectedUnlockLead(null);
    } catch (err: any) {
      console.error("Failed to submit unlock request:", err);
      showToastMsg(err.message || String(err), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelLead = async () => {
    const targetLeadId = createdLeadId || selectedLead?.lead_id;
    if (!targetLeadId) {
      showToastMsg("No lead found to cancel.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const existingLead = leads.find(l => l.lead_id === targetLeadId) || selectedLead;
      const leadBudget = existingLead?.budget || 0;

      const finalReason = "Cancelled";
      const cancellationNotes = createdLeadId ? "Cancelled during Step 2 creation" : "Cancelled during Operations configuration";

      let finalEventsList = [...(createdLeadId ? createEvents : crmEvents)];
      if (finalEventsList.length === 0 && (eventForm.event_type || eventForm.event_name || eventForm.event_date || eventForm.event_location)) {
        finalEventsList.push({
          id: `EV-${Math.floor(1000 + Math.random() * 9000)}`,
          event_type: eventForm.event_type || '',
          event_name: eventForm.event_name || '',
          event_shoot_type: eventForm.event_shoot_type || '',
          event_date: eventForm.event_date || '',
          event_start_time: eventForm.event_start_time || '',
          event_end_time: eventForm.event_end_time || '',
          event_location: eventForm.event_location || '',
          google_maps_link: eventForm.google_maps_link || '',
          guest_pax: eventForm.guest_pax || '',
          staff_pax: eventForm.staff_pax || '',
          event_start_date: eventForm.event_date || '',
          event_end_date: eventForm.event_end_date || ''
        } as any);
      }
      const firstEvent = finalEventsList[0] || {};
      const payload: any = {
        status: 'Lost Lead',
        current_status: 'Lost Lead',
        remarks: `Lost Reason: ${finalReason}. Notes: ${cancellationNotes}`,
        "Lost_Reason": finalReason,
        "Lost_Notes": cancellationNotes,
        lost_reason: finalReason,
        lost_notes: cancellationNotes,
        
        client_residence_address: createForm.client_residence_address || existingLead?.client_residence_address || '',
        city: createForm.city || existingLead?.city || '',
        state: createForm.state || existingLead?.state || '',
        pincode: createForm.pincode || existingLead?.pincode || '',
        
        event_type: firstEvent.event_type || '',
        custom_event_name: firstEvent.event_name || '',
        event_date: firstEvent.event_date || '',
        event_start_time: firstEvent.event_start_time || null,
        event_end_time: firstEvent.event_end_time || null,
        event_location: firstEvent.event_location || '',
        google_maps_link: firstEvent.google_maps_link || '',
        event_shoot_type: firstEvent.event_shoot_type || '',
        guest_pax: firstEvent.guest_pax !== '' && firstEvent.guest_pax != null ? Number(firstEvent.guest_pax) : null,
        staff_pax: firstEvent.staff_pax !== '' && firstEvent.staff_pax != null ? Number(firstEvent.staff_pax) : null,
        
        next_follow_up_date: step2FollowUpDate || null,
        follow_up_notes: step2FollowUpNotes || null,
        
        events: finalEventsList
      };

      await updateLead(targetLeadId, payload);

      await updateLeadFollowUp(
        targetLeadId,
        'Lost Lead',
        finalReason,
        step2FollowUpDate || '',
        Number(leadBudget),
        cancellationNotes
      );

      showToastMsg("Lead marked as Lost successfully.", "success");
      setShowCancelConfirmPopup(false);
      resetForm();
      setActiveTab('list');
    } catch (err: any) {
      console.error("Error marking lead as Lost:", err);
      showToastMsg(`Failed to mark lead as Lost: ${err.message || err}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // On-change/blur handler for phone/email inputs to detect repeat customers
  const handleCheckExistingCustomer = (type: 'phone' | 'email', value: string) => {
    if (!value || value.length < 5) return;
    const parsedCustomers = getCustomers(leads, orders, payments || []);
    
    const matched = parsedCustomers.find(c => {
      if (type === 'phone') {
        const cleanInput = String(value).replace(/[^\d]/g, '').slice(-10);
        if (!cleanInput || cleanInput.length < 10) return false;
        const cleanMobile = String(c.mobile || '').replace(/[^\d]/g, '').slice(-10);
        const cleanAlt = String(c.alternate_mobile || '').replace(/[^\d]/g, '').slice(-10);
        return cleanInput === cleanMobile || (cleanAlt && cleanInput === cleanAlt);
      } else {
        const cleanInput = value.trim().toLowerCase();
        if (!cleanInput.includes('@')) return false;
        return c.email && c.email.trim().toLowerCase() === cleanInput;
      }
    });

    if (matched) {
      setDetectedCustomer(matched);
      setShowDetectionPopup(true);
    }
  };

  // Handle repeat bookings (Pre-fills customized data and issues a Lead AND dynamic Order immediately)
  const handleExecuteQuickReorder = async (cust: any) => {
    if (!reorderForm.event_date) {
      alert('Please specify the event date for the repeat customer booking.');
      return;
    }

    const newLeadId = await addLead({
      customer_name: cust.customer_name,
      mobile: cust.mobile,
      alternate_mobile: cust.alternate_mobile || undefined,
      whatsapp_number: cust.whatsapp_number || cust.mobile,
      email: cust.email,
      address: cust.address,
      city: cust.city,
      state: cust.state,
      pincode: cust.pincode,
      client_residence_address: cust.client_residence_address,
      lead_source: 'Repeat Customer Desk',
      event_type: reorderForm.event_type,
      custom_event_name: reorderForm.event_type === 'Other' ? reorderForm.custom_event_name : undefined,
      custom_event_type: reorderForm.event_type === 'Other' ? reorderForm.custom_event_name : undefined,
      event_date: reorderForm.event_date,
      event_time: reorderForm.event_time,
      event_location: reorderForm.event_location,
      budget: Number(reorderForm.quotation_amount),
      remarks: `Dynamic Repeat reservation. [CUST_ID: ${cust.customer_id}]`
    });

    const newOrderId = await confirmOrder(
      newLeadId,
      reorderForm.package_name,
      Number(reorderForm.quotation_amount),
      Number(reorderForm.advance_received)
    );

    alert(`Success! Repeat booking completed.\nNew Lead ID: ${newLeadId}\nNew Order ID: ${newOrderId}\nSame Customer ID: ${cust.customer_id}`);

    // Reset forms and view
    setShowDetectionPopup(false);
    setIsQuickReorderView(false);
    setDetectedCustomer(null);
    setReorderForm({
      event_type: '',
      custom_event_name: '',
      custom_event_type: '',
      event_date: '',
      event_time: '',
      event_location: '',
      package_name: '',
      quotation_amount: 0,
      advance_received: 0,
    });
    setActiveTab('list');
  };

  // Wizard action helpers and handlers
  const autoScrollToFormHeader = () => {
    const el = document.getElementById('create_lead_form_heading');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const formEl = document.getElementById('create_lead_form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const getRemarksPayload = (formRemarks: string, intNotes: string, fDate: string, wNum: string, adr: string, cty: string, resAdr?: string) => {
    let result = '';
    if (wNum) result += `WhatsApp: ${wNum}\n`;
    if (adr) result += `Event Venue: ${adr}\n`;
    if (resAdr) result += `Residence: ${resAdr}\n`;
    if (cty) result += `City: ${cty}\n`;
    if (fDate) result += `Follow-up Date: ${fDate}\n`;
    if (intNotes) result += `Internal Notes: ${intNotes}\n`;
    if (formRemarks) result += `Remarks: ${formRemarks}\n`;
    
    if (selectedPkgIds.length > 0) {
      result += `\n--- Selected Package Customizations ---\n`;
      selectedPkgIds.forEach(id => {
        const p = PACKAGES_LIST.flatMap(cat => cat.items).find(item => item.id === id);
        if (p) {
          result += `Package: ${p.name}\n`;
          result += `  Custom Price: ‚Çπ${(pkgPrices[id] !== undefined ? pkgPrices[id] : p.cost).toLocaleString('en-IN')}\n`;
          result += `  Deliverables: ${pkgDeliverables[id] || 'N/A'}\n`;
          result += `  Notes: ${pkgNotes[id] || 'N/A'}\n`;
        }
      });
    }
    return result;
  };

  const handleSaveEventForm = (isCrm: boolean = !!selectedLead, addAnother: boolean = false) => {
    if (!eventForm.event_type) {
      showValidationError("input_event_type", "Event Type is required.");
      return;
    }
    if (!eventForm.event_date) {
      showValidationError("input_event_date", "Event Date is required.");
      return;
    }
    if (!eventForm.event_location.trim()) {
      showValidationError("input_event_location", "Event Location is required.");
      return;
    }

    const dateTimeErrMsg = getEventDateTimeErrorMessage(eventForm.event_date, eventForm.event_end_date, eventForm.event_start_time, eventForm.event_end_time);
    if (dateTimeErrMsg) {
      showToastMsg(dateTimeErrMsg, "error");
      return;
    }

    const guestPaxVal = eventForm.guest_pax !== '' ? Math.max(0, parseInt(String(eventForm.guest_pax)) || 0) : '';
    const staffPaxVal = eventForm.staff_pax !== '' ? Math.max(0, parseInt(String(eventForm.staff_pax)) || 0) : '';

    const eventData = {
      ...eventForm,
      guest_pax: guestPaxVal,
      staff_pax: staffPaxVal,
      event_start_date: eventForm.event_date,
      event_end_date: eventForm.event_end_date || ''
    };

    const savedEventType = eventForm.event_type;

    if (isCrm) {
      if (editingEventId) {
        setCrmEvents(prev => prev.map(ev => ev.id === editingEventId ? { ...eventData, id: editingEventId } : ev));
        showToastMsg("Event updated in list.", "success");
      } else {
        const newEv: LeadEvent = {
          ...eventData,
          id: `EV-${Math.floor(1000 + Math.random() * 9000)}`
        };
        setCrmEvents(prev => [...prev, newEv]);
        showToastMsg("Event added to list.", "success");
      }
    } else {
      if (editingEventId) {
        setCreateEvents(prev => prev.map(ev => ev.id === editingEventId ? { ...eventData, id: editingEventId } : ev));
        showToastMsg("Event updated in list.", "success");
      } else {
        const newEv: LeadEvent = {
          ...eventData,
          id: `EV-${Math.floor(1000 + Math.random() * 9000)}`
        };
        setCreateEvents(prev => [...prev, newEv]);
        showToastMsg("Event added to list.", "success");
      }
    }

    setEditingEventId(null);

    if (addAnother) {
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
      setShowEventForm(true);
    } else {
      setShowEventForm(false);
    }
  };

  const handleEditEvent = (ev: LeadEvent) => {
    setEditingEventId(ev.id);
    const startDate = ev.event_start_date || ev.event_date || '';
    const endDate = ev.event_end_date || (ev as any).Event_End_Date || (ev as any).Event_end_date || '';
    const startTime = ev.event_start_time || (ev as any).start_time || (ev as any).event_time || '';
    const endTime = ev.event_end_time || (ev as any).end_time || '';
    const location = ev.event_location || (ev as any).location || (ev as any).venue_address || '';
    const maps = ev.google_maps_link || (ev as any).maps_link || '';

    setEventForm({
      event_type: ev.event_type || '',
      event_name: ev.event_name || '',
      event_shoot_type: ev.event_shoot_type || '',
      event_date: startDate,
      event_start_date: startDate,
      event_end_date: endDate,
      event_start_time: startTime,
      event_end_time: endTime,
      event_location: location,
      google_maps_link: maps,
      guest_pax: ev.guest_pax !== null && ev.guest_pax !== undefined ? ev.guest_pax : ('' as any),
      staff_pax: ev.staff_pax !== null && ev.staff_pax !== undefined ? ev.staff_pax : ('' as any),
      reporting_date: ev.reporting_date || '',
      reporting_time: ev.reporting_time || ''
    });
    setShowEventForm(true);
  };

  const handleDeleteEvent = (id: string, isCrm: boolean = !!selectedLead) => {
    if (isCrm) {
      setCrmEvents(prev => prev.filter(ev => ev.id !== id));
    } else {
      setCreateEvents(prev => prev.filter(ev => ev.id !== id));
    }
    showToastMsg("Event removed from list.", "success");
  };

  const handleAddNewEventClick = (isCrm: boolean = !!selectedLead) => {
    setEditingEventId(null);
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
    setShowEventForm(true);
  };

  const formatDDMMYYYY = (dateStr: string | undefined | null): string => {
    if (!dateStr) return 'N/A';
    const clean = dateStr.trim();
    if (!clean) return 'N/A';
    if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) return clean;
    const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return clean;
  };

  const convertTo24Hour = (timeStr: string | undefined | null): string => {
    if (!timeStr) return '';
    const clean = timeStr.trim().toUpperCase();
    if (!clean) return '';

    // Match 12-hour AM/PM format (e.g., "08:00 AM", "8:00:00 AM", "12:30 PM", "01:00:00 PM")
    const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = ampmMatch[2];
      const period = ampmMatch[3];

      if (period === 'PM' && hours < 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }

      const hh = String(hours).padStart(2, '0');
      return `${hh}:${minutes}`;
    }

    // Check if it's in 24-hour format with or without seconds (e.g., "14:30", "14:30:00", "8:30:00")
    const hhmmssMatch = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (hhmmssMatch) {
      const hh = String(parseInt(hhmmssMatch[1], 10)).padStart(2, '0');
      const mm = hhmmssMatch[2];
      return `${hh}:${mm}`;
    }

    return '';
  };

  const convertTo12Hour = (timeStr: string | undefined | null): string => {
    if (!timeStr) return '';
    const clean = timeStr.trim();
    if (!clean) return '';

    // If it already has AM/PM, format nicely
    if (clean.toUpperCase().includes('AM') || clean.toUpperCase().includes('PM')) {
      const ampmMatch = clean.toUpperCase().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
      if (ampmMatch) {
        const hh = String(parseInt(ampmMatch[1], 10)).padStart(2, '0');
        const mm = ampmMatch[2];
        const period = ampmMatch[3];
        return `${hh}:${mm} ${period}`;
      }
      return clean;
    }

    // Match 24-hour format HH:MM or HH:MM:SS
    const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) {
      return clean;
    }

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    if (hours === 0) {
      hours = 12;
    }

    const hh = String(hours).padStart(2, '0');
    return `${hh}:${minutes} ${period}`;
  };

  const parseDateParts = (dStr: string | undefined | null): { year: number; month: number; day: number } | null => {
    if (!dStr) return null;
    const clean = dStr.trim();
    if (!clean) return null;

    // YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10);
      const day = parseInt(ymdMatch[3], 10);
      if (year > 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { year, month, day };
      }
    }

    // DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      if (year > 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { year, month, day };
      }
    }

    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return {
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate()
      };
    }

    return null;
  };

  const parseTimeParts = (tStr: string | undefined | null): { hours: number; minutes: number } | null => {
    if (!tStr) return null;
    const clean = tStr.trim();
    if (!clean) return null;

    const t24 = convertTo24Hour(clean);
    if (!t24) return null;

    const parts = t24.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        return { hours, minutes };
      }
    }
    return null;
  };

  const buildDateTime = (
    dateStr: string | undefined | null,
    timeStr: string | undefined | null,
    defaultTime: { hours: number; minutes: number }
  ): Date | null => {
    const dParts = parseDateParts(dateStr);
    if (!dParts) return null;

    const tParts = parseTimeParts(timeStr) || defaultTime;
    return new Date(dParts.year, dParts.month - 1, dParts.day, tParts.hours, tParts.minutes, 0, 0);
  };

  const normalizeDateStr = (dStr: string | undefined | null): string => {
    const parts = parseDateParts(dStr);
    if (!parts) return dStr ? dStr.trim() : '';
    const y = parts.year;
    const m = String(parts.month).padStart(2, '0');
    const d = String(parts.day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getEventDateTimeErrorMessage = (
    startDate: string | undefined | null,
    endDate: string | undefined | null,
    startTime: string | undefined | null,
    endTime: string | undefined | null
  ): string | null => {
    if (!startDate || startDate.trim() === '') return null;

    const startParts = parseDateParts(startDate);
    if (!startParts) return null;

    const effectiveEndDate = endDate && endDate.trim() !== '' ? endDate : startDate;
    const endParts = parseDateParts(effectiveEndDate);
    if (!endParts) return null;

    // Rule 3 ‚Äì Check if End Date is earlier than Start Date
    if (
      startParts.year > endParts.year ||
      (startParts.year === endParts.year && startParts.month > endParts.month) ||
      (startParts.year === endParts.year && startParts.month === endParts.month && startParts.day > endParts.day)
    ) {
      return "Event End Date cannot be earlier than Event Start Date.";
    }

    const isSameDate =
      startParts.year === endParts.year &&
      startParts.month === endParts.month &&
      startParts.day === endParts.day;

    // Rule 1 ‚Äì If Start Date and End Date are the same date
    if (isSameDate) {
      const startT = parseTimeParts(startTime);
      const endT = parseTimeParts(endTime);
      if (startT && endT) {
        const startMin = startT.hours * 60 + startT.minutes;
        const endMin = endT.hours * 60 + endT.minutes;
        if (endMin <= startMin) {
          return "End Time must be later than Start Time when the Event Start Date and Event End Date are the same.";
        }
      }
    }

    // Rule 2 ‚Äì Different Start Date & End Date (End Date > Start Date): any End Time allowed
    return null;
  };

  const isEventDateTimeInvalid = (
    startDate: string | undefined | null,
    endDate: string | undefined | null,
    startTime: string | undefined | null,
    endTime: string | undefined | null
  ): boolean => {
    return getEventDateTimeErrorMessage(startDate, endDate, startTime, endTime) !== null;
  };

  const isTimeEarlier = (start: string | undefined | null, end: string | undefined | null): boolean => {
    return isEventDateTimeInvalid(eventForm.event_date, eventForm.event_end_date, start, end);
  };

  const renderEventDetailsSection = (isCrm: boolean) => {
    const eventsList = isCrm ? crmEvents : createEvents;
    const isNewFormVisible = !editingEventId && (showEventForm || eventsList.length === 0);

    const renderFormFields = (isEditingThisEvent: boolean) => (
      <div className="space-y-4">
        {/* Event Type */}
        <div className="text-left">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Event Type *
          </label>
          <select
            id="input_event_type"
            value={eventForm.event_type}
            onChange={(e) => {
              const val = e.target.value;
              setEventForm(prev => ({
                ...prev,
                event_type: val,
                event_name: prev.event_name || ''
              }));
            }}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all cursor-pointer font-bold"
          >
            <option value="">Select Event Type</option>
            {EVENT_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Conditional Event Details fields displayed only after Event Type is selected */}
        {eventForm.event_type && eventForm.event_type !== '' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            {/* Event Name */}
            <div className="sm:col-span-2 text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Event Name
              </label>
              <input
                id="input_event_name"
                type="text"
                placeholder="e.g. Sangeet, Haldi, Reception"
                value={eventForm.event_name}
                onChange={(e) => setEventForm({ ...eventForm, event_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            {/* Event Date */}
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Event Date *
              </label>
              <input
                id="input_event_date"
                type="date"
                required
                value={eventForm.event_date}
                onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono"
              />
            </div>

            {/* Event Start Time */}
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Event Start Time
              </label>
              <input
                id="input_event_start_time"
                type="time"
                value={convertTo24Hour(eventForm.event_start_time)}
                onChange={(e) => {
                  const val24 = e.target.value;
                  const val12 = convertTo12Hour(val24);
                  setEventForm({ ...eventForm, event_start_time: val12 });
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono cursor-pointer"
              />
            </div>

            {/* Event End Date */}
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Event End Date
              </label>
              <input
                id="input_event_end_date"
                type="date"
                value={eventForm.event_end_date || ''}
                onChange={(e) => setEventForm({ ...eventForm, event_end_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono cursor-pointer"
              />
            </div>

            {/* Event End Time */}
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Event End Time
              </label>
              <input
                id="input_event_end_time"
                type="time"
                value={convertTo24Hour(eventForm.event_end_time)}
                onChange={(e) => {
                  const val24 = e.target.value;
                  const val12 = convertTo12Hour(val24);
                  setEventForm({ ...eventForm, event_end_time: val12 });
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono cursor-pointer"
              />
              {(() => {
                const dateTimeErrMsg = getEventDateTimeErrorMessage(eventForm.event_date, eventForm.event_end_date, eventForm.event_start_time, eventForm.event_end_time);
                return dateTimeErrMsg ? (
                  <p className="text-[11px] text-rose-400 mt-1 animate-fade-in font-medium">
                    {dateTimeErrMsg}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Event Location - Multiline Address */}
            <div className="sm:col-span-2 text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Event Location * (Venue Address)
              </label>
              <textarea
                required
                rows={3}
                placeholder="Enter the full event location and venue address details"
                value={eventForm.event_location}
                onChange={(e) => setEventForm({ ...eventForm, event_location: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none"
              />
            </div>

            {/* Google Maps Link */}
            <div className="sm:col-span-2 text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Google Maps Location Link (Optional)
              </label>
              <input
                type="url"
                placeholder="e.g. https://maps.app.goo.gl/..."
                value={eventForm.google_maps_link}
                onChange={(e) => setEventForm({ ...eventForm, google_maps_link: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
            </div>

            {/* Guest Pax */}
            <div className="sm:col-span-2 text-left">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Guest Pax
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 150"
                value={eventForm.guest_pax}
                onChange={(e) => setEventForm({ ...eventForm, guest_pax: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono"
              />
            </div>

            {/* Save Event Buttons */}
            <div className="sm:col-span-2 flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEventId(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {isEditingThisEvent ? (
                <button
                  type="button"
                  onClick={() => handleSaveEventForm(isCrm, false)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-slate-100 font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                >
                  Update Event
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleSaveEventForm(isCrm, false)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Save Event
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEventForm(isCrm, true)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-slate-100 font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Save & Add Another Event
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );

    return (
      <div className="space-y-4">
        {/* Render Event Cards */}
        {eventsList.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Added Events ({eventsList.length})
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {eventsList.map((ev, idx) => {
                const isEditingThisEvent = editingEventId === ev.id;
                const isCollapsed = collapsedEventIds[ev.id] ?? true;
                const startDateStr = formatDDMMYYYY(ev.event_start_date || ev.event_date);
                const endDateRaw = ev.event_end_date || (ev as any).Event_End_Date || '';
                const endDateStr = endDateRaw ? formatDDMMYYYY(endDateRaw) : 'N/A';
                const startTimeStr = ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A';
                const endTimeStr = ev.event_end_time ? convertTo12Hour(ev.event_end_time) : 'N/A';

                const guestPaxVal = ev.guest_pax !== '' && ev.guest_pax !== null && ev.guest_pax !== undefined ? ev.guest_pax : 'N/A';
                const staffPaxVal = ev.staff_pax !== '' && ev.staff_pax !== null && ev.staff_pax !== undefined ? ev.staff_pax : 'N/A';

                const dateTimeSummary = (() => {
                  const startPart = `${startDateStr} ‚Ä¢ ${startTimeStr}`;
                  if (endDateRaw && endDateStr !== 'N/A') {
                    return `${startPart} ‚Üí ${endDateStr} ‚Ä¢ ${endTimeStr}`;
                  } else if (endTimeStr !== 'N/A') {
                    return `${startPart} ‚Üí ${endTimeStr}`;
                  }
                  return startPart;
                })();

                if (isEditingThisEvent) {
                  return (
                    <div key={ev.id} className="bg-slate-900 border border-cyan-500/50 rounded-xl p-4 space-y-4 shadow-lg animate-fade-in text-left">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <Edit className="w-3.5 h-3.5" /> Edit Event {idx + 1}: {ev.event_name || ev.event_type}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEventId(null);
                            setShowEventForm(false);
                          }}
                          className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      {renderFormFields(true)}
                    </div>
                  );
                }

                return (
                  <div key={ev.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
                    <div 
                      className="flex items-center justify-between p-3.5 bg-slate-950/40 cursor-pointer select-none border-b border-slate-800/40 hover:bg-slate-950/60 transition-colors"
                      onClick={() => setCollapsedEventIds(prev => ({ ...prev, [ev.id]: !isCollapsed }))}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="bg-cyan-500/10 text-cyan-400 p-1.5 rounded-lg shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="text-left space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-100">{ev.event_name || `Event ${idx + 1}`}</span>
                            <span className="text-xs text-slate-500 font-mono">|</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
                              {ev.event_type}
                            </span>
                          </div>

                          {/* Show compact summary ONLY when COLLAPSED */}
                          {isCollapsed && (
                            <>
                              <p className="text-[11px] text-slate-300 font-mono">
                                {dateTimeSummary}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                Guest Pax: <span className="text-slate-200 font-semibold">{guestPaxVal}</span>
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleEditEvent(ev)}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
                          title="Edit Event"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id, isCrm)}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remove Event"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCollapsedEventIds(prev => ({ ...prev, [ev.id]: !isCollapsed }))}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="p-4 bg-slate-900/50 text-xs text-slate-300 space-y-3">
                        {/* Event Name & Type Info Header if name differs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 font-mono">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Event Name</span>
                            <span className="text-slate-100 font-semibold">{ev.event_name || `Event ${idx + 1}`}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Event Type</span>
                            <span className="text-slate-100 font-semibold">{ev.event_type}</span>
                          </div>
                          {(ev.event_shoot_type || (ev as any).shoot_type) && (
                            <div>
                              <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Event Shoot Type</span>
                              <span className="text-slate-100 font-semibold">{ev.event_shoot_type || (ev as any).shoot_type}</span>
                            </div>
                          )}
                        </div>

                        {/* Dates & Times Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 font-mono">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Start Date</span>
                            <span className="text-slate-200 font-semibold">{startDateStr}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Start Time</span>
                            <span className="text-slate-200 font-semibold">{startTimeStr}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">End Date</span>
                            <span className="text-slate-200 font-semibold">{endDateStr}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">End Time</span>
                            <span className="text-slate-200 font-semibold">{endTimeStr}</span>
                          </div>
                        </div>

                        {/* Pax Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 font-mono">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Guest Pax</span>
                            <span className="text-slate-200 font-semibold">{guestPaxVal}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Staff Pax</span>
                            <span className="text-slate-200 font-semibold">{staffPaxVal}</span>
                          </div>
                        </div>

                        {/* Reporting Info if present */}
                        {(ev.reporting_date || ev.reporting_time) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 font-mono">
                            {ev.reporting_date && (
                              <div>
                                <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Reporting Date</span>
                                <span className="text-slate-200 font-semibold">{formatDDMMYYYY(ev.reporting_date)}</span>
                              </div>
                            )}
                            {ev.reporting_time && (
                              <div>
                                <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Reporting Time</span>
                                <span className="text-slate-200 font-semibold">{convertTo12Hour(ev.reporting_time)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Venue Address */}
                        <div className="border-t border-slate-800/40 pt-2.5 text-left">
                          <span className="text-slate-400 block mb-1 text-[10px] font-sans font-bold uppercase tracking-wider">Venue Address / Location:</span>
                          <p className="text-slate-200 bg-slate-950/20 p-2 rounded border border-slate-850/50 whitespace-pre-wrap font-mono">
                            {ev.event_location || 'N/A'}
                          </p>
                        </div>

                        {/* Google Maps Link */}
                        {ev.google_maps_link && (
                          <div className="flex items-center gap-1.5 text-cyan-400 text-left pt-1 font-mono text-[11px]">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <a 
                              href={ev.google_maps_link} 
                              target="_blank" 
                              referrerPolicy="no-referrer"
                              rel="noopener noreferrer" 
                              className="hover:underline break-all"
                            >
                              {ev.google_maps_link}
                            </a>
                          </div>
                        )}

                        {/* Assigned Staff if present */}
                        {ev.assigned_staff_names && (
                          <div className="border-t border-slate-800/40 pt-2 text-left font-mono">
                            <span className="text-slate-400 block mb-0.5 text-[10px] font-sans font-bold uppercase tracking-wider">Assigned Staff:</span>
                            <span className="text-slate-200">{ev.assigned_staff_names}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inline Event Form for New Event */}
        {isNewFormVisible ? (
          <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-4 space-y-4 animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Event Details
              </span>
              {eventsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowEventForm(false);
                    setEditingEventId(null);
                  }}
                  className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
            {renderFormFields(false)}
          </div>
        ) : (
          /* Add Another Event Button */
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => handleAddNewEventClick(isCrm)}
              className="flex items-center gap-1.5 border border-dashed border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 bg-slate-900/30 px-4 py-2.5 rounded-lg text-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Another Event</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleWizardNext = async () => {
    if (isSaving) return;

    let finalUser: any = null;

    if (wizardStep === 1) {
      if (!createForm.mobile) {
        showValidationError("input_mobile", "Phone Number is required.");
        return;
      }
      if (!createForm.lead_source || createForm.lead_source === '') {
        showValidationError("input_lead_source", "Lead Source is required.");
        return;
      }

      // Check Supabase Authentication and Session before creating lead
      if (supabaseClient) {
        try {
          const { data: sessionData, error: sessionErr } = await supabaseClient.auth.getSession();
          const { data: userData, error: userErr } = await supabaseClient.auth.getUser();

          const session = sessionData?.session;
          const authUser = userData?.user;

          console.log('SESSION', session);
          console.log('USER', authUser);

          if (sessionErr || userErr) {
            console.warn("Session/user fetch error:", sessionErr || userErr);
          }

          // If BOTH session and authUser are null AND we don't have a currentUser in React state
          if (!session && !authUser && !currentUser) {
            showToastMsg("Please login again.", "error");
            return;
          }

          // Check if session is expired
          const isExpired = session?.expires_at ? (session.expires_at <= Math.floor(Date.now() / 1000)) : false;
          if (isExpired && !authUser) {
            showToastMsg("Session expired.", "error");
            return;
          }

          // Users Table Lookup
          const currentUid = authUser?.id || session?.user?.id || currentUser?.id;
          const emailFromAuth = authUser?.email || session?.user?.email || currentUser?.email;

          let dbUser: any = null;
          if (currentUid) {
            const { data: userById, error: dbUserErr } = await supabaseClient
              .from('users')
              .select('*')
              .eq('id', currentUid)
              .maybeSingle();

            dbUser = userById;
            if (dbUserErr) {
              console.warn("Users table lookup failed in UI:", dbUserErr.message);
            }
          }

          if (!dbUser && emailFromAuth) {
            const { data: dbUserByEmail } = await supabaseClient
              .from('users')
              .select('*')
              .eq('email', emailFromAuth.toLowerCase().trim())
              .maybeSingle();
            
            if (dbUserByEmail && currentUid) {
              console.log("Aligning user profile ID during lead creation...");
              await supabaseClient
                .from('users')
                .update({ id: currentUid })
                .eq('email', emailFromAuth.toLowerCase().trim());
              dbUser = { ...dbUserByEmail, id: currentUid };
            } else if (dbUserByEmail) {
              dbUser = dbUserByEmail;
            }
          }

          finalUser = currentUser;
          if (dbUser) {
            finalUser = mapUserFieldsFromDb(dbUser);
          }

          if (!finalUser) {
            showToastMsg("User record missing from users table.", "error");
            return;
          }

          if (emailFromAuth && finalUser.email && finalUser.email.toLowerCase().trim() !== emailFromAuth.toLowerCase().trim()) {
            showToastMsg("User record email does not match logged-in account.", "error");
            return;
          }

          if (!finalUser.role) {
            showToastMsg("User role not loaded correctly.", "error");
            return;
          }

          if (!finalUser.active) {
            showToastMsg("User account is deactivated.", "error");
            return;
          }

          if (finalUser.role !== 'Sales Team' && finalUser.role !== 'Business Owner') {
            showToastMsg("User does not have permission to create quotations.", "error");
            return;
          }
        } catch (authErr: any) {
          showToastMsg(`Authentication error: ${authErr.message || authErr}`, "error");
          return;
        }
      } else {
        if (!currentUser) {
          showToastMsg("Please login again.", "error");
          return;
        }
        finalUser = currentUser;
        if (currentUser.role !== 'Sales Team' && currentUser.role !== 'Business Owner') {
          showToastMsg("User does not have permission to create quotations.", "error");
          return;
        }
      }

      const mobileVal = String(createForm.mobile || '').trim();
      if (!/^\d{10}$/.test(mobileVal)) {
        showToastMsg("Please enter a valid 10-digit mobile number.", "error");
        return;
      }
      if (createForm.email && createForm.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(createForm.email.trim())) {
          showToastMsg("Please enter a valid email address.", "error");
          return;
        }
      }

      try {
        setIsSaving(true);
        const finalSource = createForm.lead_source === 'Other' ? 'Other' : createForm.lead_source;
        const customLeadSourceName = createForm.lead_source === 'Other' && otherSource.trim() !== '' ? otherSource.trim() : null;
        let finalId = createdLeadId;
        if (!createdLeadId) {
          const newId = await addLead({
            customer_name: createForm.customer_name || '',
            mobile: createForm.mobile,
            alternate_mobile: (createForm.alternate_mobile && String(createForm.alternate_mobile).trim() !== '' && String(createForm.alternate_mobile).trim() !== '+91') ? String(createForm.alternate_mobile) : undefined,
            email: createForm.email,
            lead_source: finalSource,
            Specify_Custom_Lead_Source_Name: customLeadSourceName,
            whatsapp_number: createForm.whatsapp_number,
            address: createForm.address,
            city: createForm.city,
            state: createForm.state,
            pincode: createForm.pincode,
            client_residence_address: createForm.client_residence_address,
            shoot_type: createForm.shoot_type,
            desired_event_shoot_type: createForm.desired_event_shoot_type,
            total_pax: createForm.total_pax !== '' ? Number(createForm.total_pax) : undefined,
            reference_source: createForm.reference_source,
            booking_status: createForm.booking_status || undefined,
            event_type: createForm.event_type || '',
            event_date: createForm.event_date || '',
            event_time: createForm.event_time || '',
            event_location: createForm.event_location || '',
            budget: Number(createForm.budget) || 0,
            remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
            next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
            Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
          });
          setCreatedLeadId(newId);
          finalId = newId;
          console.log(`Created lead with ID: ${newId}`);
        } else {
          await updateLead(createdLeadId, {
            customer_name: createForm.customer_name || '',
            mobile: createForm.mobile,
            alternate_mobile: (createForm.alternate_mobile && String(createForm.alternate_mobile).trim() !== '' && String(createForm.alternate_mobile).trim() !== '+91') ? String(createForm.alternate_mobile) : undefined,
            email: createForm.email,
            lead_source: finalSource,
            Specify_Custom_Lead_Source_Name: customLeadSourceName,
            whatsapp_number: createForm.whatsapp_number,
            address: createForm.address,
            city: createForm.city,
            state: createForm.state,
            pincode: createForm.pincode,
            client_residence_address: createForm.client_residence_address,
            desired_event_shoot_type: createForm.desired_event_shoot_type,
            total_pax: createForm.total_pax !== '' ? Number(createForm.total_pax) : undefined,
            reference_source: createForm.reference_source,
            booking_status: createForm.booking_status || undefined,
            remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
            next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
            Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
          });
        }
        const isEdit = !!createdLeadId;

        const newLeadObj: Lead = {
          lead_id: finalId,
          customer_name: createForm.customer_name || '',
          mobile: createForm.mobile,
          alternate_mobile: (createForm.alternate_mobile && String(createForm.alternate_mobile).trim() !== '' && String(createForm.alternate_mobile).trim() !== '+91') ? String(createForm.alternate_mobile) : undefined,
          email: createForm.email,
          lead_source: finalSource,
            Specify_Custom_Lead_Source_Name: customLeadSourceName,
          whatsapp_number: createForm.whatsapp_number,
          address: createForm.address,
          city: createForm.city,
          state: createForm.state,
          pincode: createForm.pincode,
          client_residence_address: createForm.client_residence_address,
          shoot_type: createForm.shoot_type,
          desired_event_shoot_type: createForm.desired_event_shoot_type,
          total_pax: createForm.total_pax !== '' ? Number(createForm.total_pax) : undefined,
          reference_source: createForm.reference_source,
          booking_status: createForm.booking_status || 'Pending',
          event_type: createForm.event_type || 'Other',
          event_date: createForm.event_date || new Date().toISOString().split('T')[0],
          event_time: createForm.event_time || '12:00',
          event_location: createForm.event_location || 'TBD',
          budget: Number(createForm.budget) || 0,
          remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
          next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
          Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || '',
          status: 'Create Quote',
          created_date: new Date().toISOString().split('T')[0],
          sales_person: finalUser?.name || currentUser?.name || 'Sales Team',
          created_by: finalUser?.name || currentUser?.name || 'Sales Team'
        };

        // Stay in Create Lead form, and advance to Step 2
        setWizardStep(2);

        showToastMsg("Inbound quotation created successfully! Continuing to Step 2.", "success");
      } catch (err: any) {
        console.error("Step 1 saving failed:", err);
  
      const errMsg = err.message || String(err);
      
      if (errMsg.includes('FATAL_MISSING_COLUMN')) {
        const parts = errMsg.split('||');
        const table = parts[1] || 'leads';
        const col = parts[2] || 'Unknown';
        const sql = `ALTER TABLE "${table}" ADD COLUMN "${col}" numeric;`;
        const colType = col === 'Specify_Custom_Lead_Source_Name' ? 'text' : 'numeric';
        const properSql = `ALTER TABLE "${table}" ADD COLUMN "${col}" ${colType};`;
        
        showToastMsg(`CRITICAL DB ERROR:\nTable: ${table}\nMissing Column: ${col}\nSuggested SQL: ${properSql}`, "error");
        setIsSaving(false);
        return;
      }

        let displayedMsg = errMsg;
        
        const lowerMsg = errMsg.toLowerCase();
        if (lowerMsg.includes("row-level security policy") || lowerMsg.includes("rls") || lowerMsg.includes("security policy")) {
          displayedMsg = "Lead insert blocked by RLS policy.";
        } else if (lowerMsg.includes("user record missing") || lowerMsg.includes("missing from users table") || lowerMsg.includes("missing from users")) {
          displayedMsg = "User record missing from users table.";
        } else if (lowerMsg.includes("session expired") || lowerMsg.includes("jwt expired")) {
          displayedMsg = "Session expired.";
        } else if (lowerMsg.includes("permission") || lowerMsg.includes("permission denied")) {
          displayedMsg = "User does not have permission to create quotations.";
        } else if (lowerMsg.includes("login") || lowerMsg.includes("unauthenticated") || lowerMsg.includes("jwt")) {
          displayedMsg = "Please login again.";
        } else {
          displayedMsg = errMsg;
        }
        
        showToastMsg(displayedMsg, "error");
      } finally {
        setIsSaving(false);
      }
    }

    else if (wizardStep === 2) {
      let finalEventsList = [...createEvents];
      
      // If eventForm is visible or there are no events in the list, validate and add
      if (showEventForm || finalEventsList.length === 0) {
        if (!eventForm.event_type || eventForm.event_type === '') {
          showValidationError("input_event_type", "Please select Event Type.");
          return;
        }
        if (!eventForm.event_date || eventForm.event_date === '') {
          showValidationError("input_event_date", "Please select Event Date.");
          return;
        }
        if (!eventForm.event_location || eventForm.event_location.trim() === '') {
          showValidationError("input_event_location", "Please enter Event Location.");
          return;
        }
        const dateTimeErrMsg = getEventDateTimeErrorMessage(eventForm.event_date, eventForm.event_end_date, eventForm.event_start_time, eventForm.event_end_time);
        if (dateTimeErrMsg) {
          showValidationError("input_event_end_time", dateTimeErrMsg);
          return;
        }

        const guestPaxVal = eventForm.guest_pax !== '' ? Math.max(0, parseInt(String(eventForm.guest_pax)) || 0) : '';
        const staffPaxVal = eventForm.staff_pax !== '' ? Math.max(0, parseInt(String(eventForm.staff_pax)) || 0) : '';

        const eventData = {
          ...eventForm,
          guest_pax: guestPaxVal,
          staff_pax: staffPaxVal,
          event_start_date: eventForm.event_date,
          event_end_date: eventForm.event_end_date || ''
        };

        if (editingEventId) {
          finalEventsList = finalEventsList.map(ev => ev.id === editingEventId ? { ...eventData, id: editingEventId } : ev);
        } else {
          finalEventsList.push({
            ...eventData,
            id: `EV-${Math.floor(1000 + Math.random() * 9000)}`
          });
        }
        
        setCreateEvents(finalEventsList);
        setEditingEventId(null);
        setShowEventForm(false);
      }

      if (finalEventsList.length === 0) {
        showToastMsg("Please add at least one event.", "error");
        return;
      }

      // Pre-validate and format all events in the finalEventsList
      for (const ev of finalEventsList) {
        if (!ev.event_type || ev.event_type.trim() === '') {
          showToastMsg("Please select Event Type for all events.", "error");
          return;
        }
        if (ev.event_type === 'Other' && (!ev.event_name || ev.event_name.trim() === '')) {
          showToastMsg("Please enter Event Name for 'Other' event types.", "error");
          return;
        }
        if (!ev.event_date || ev.event_date.trim() === '') {
          showToastMsg("Please select Event Date for all events.", "error");
          return;
        }
        if (!ev.event_start_time || ev.event_start_time.trim() === '') {
          showToastMsg("Please select Event Start Time for all events.", "error");
          return;
        }
        if (!ev.event_end_time || ev.event_end_time.trim() === '') {
          showToastMsg("Please select Event End Time for all events.", "error");
          return;
        }
        if (!ev.event_location || ev.event_location.trim() === '') {
          showToastMsg("Please enter Event Location for all events.", "error");
          return;
        }
        
        try {
          ev.event_start_time = validateAndFormatTime(ev.event_start_time, "Event Start Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          return;
        }
        try {
          ev.event_end_time = validateAndFormatTime(ev.event_end_time, "Event End Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          return;
        }
        
        const dateTimeErrMsg = getEventDateTimeErrorMessage(ev.event_date, ev.event_end_date, ev.event_start_time, ev.event_end_time);
        if (dateTimeErrMsg) {
          showToastMsg(dateTimeErrMsg, "error");
          return;
        }
      }

      const firstEvent = finalEventsList[0];

      try {
        await handleSaveStep2Direct();
      } catch (err: any) {
        console.error("Step 2 saving failed:", err);
  
      const errMsg = err.message || String(err);
      
      if (errMsg.includes('FATAL_MISSING_COLUMN')) {
        const parts = errMsg.split('||');
        const table = parts[1] || 'leads';
        const col = parts[2] || 'Unknown';
        const sql = `ALTER TABLE "${table}" ADD COLUMN "${col}" numeric;`;
        const colType = col === 'Specify_Custom_Lead_Source_Name' ? 'text' : 'numeric';
        const properSql = `ALTER TABLE "${table}" ADD COLUMN "${col}" ${colType};`;
        
        showToastMsg(`CRITICAL DB ERROR:\nTable: ${table}\nMissing Column: ${col}\nSuggested SQL: ${properSql}`, "error");
        setIsSaving(false);
        return;
      }

        let displayedMsg = errMsg;
        if (errMsg.toLowerCase().includes("database") || errMsg.toLowerCase().includes("connection") || errMsg.toLowerCase().includes("failed to fetch") || errMsg.toLowerCase().includes("supabase")) {
          displayedMsg = "Database save failed: connection error.";
        } else {
          displayedMsg = `Unable to save event details: ${errMsg}`;
        }
        showToastMsg(displayedMsg, "error");
      } finally {
        setIsSaving(false);
      }
    }

  };

  const handleStatusSave = async () => {
    if (isSaving) return;
    const finalStatus = salesStatus || 'New Lead';
    try {
      setIsSaving(true);

      // Save Packages
      const selectedPkgs = PACKAGES_LIST.flatMap(cat => cat.items).filter(item => selectedPkgIds.includes(item.id));
      if (selectedPkgIds.length > 0) {
        const packagesPayload = selectedPkgs.map(pkg => ({
          package_id: pkg.id,
          package_name: pkg.name,
          package_cost: pkgPrices[pkg.id] !== undefined ? pkgPrices[pkg.id] : pkg.cost,
          quantity: 1,
          total_amount: pkgPrices[pkg.id] !== undefined ? pkgPrices[pkg.id] : pkg.cost,
          discount: leadDiscount,
          final_amount: pkgPrices[pkg.id] !== undefined ? pkgPrices[pkg.id] : pkg.cost,
          deliverables_description: pkgDeliverables[pkg.id] || pkg.deliverables || 'N/A',
          notes_special_customizations: pkgNotes[pkg.id] || '',
          additional_services_cost: 0,
          team_members: pkg.team_members || '',
          deliverables: pkg.deliverables || ''
        }));
        await saveLeadPackages(createdLeadId!, packagesPayload);
      }

      const activePkgId = createForm.Select_Package_Option || selectedPkgIds[0] || 'Custom Package';
      const activeEventsList = createEvents.length > 0 ? createEvents : [];
      const { teamMembersText, deliverablesText } = buildStep3EventPayloads(
        activePkgId,
        activeEventsList,
        editableInclusions,
        editableDeliverables
      );

      await updateLead(createdLeadId!, {
        status: finalStatus as CurrentStage,
        budget: finalTotal,
          package_price: finalTotal,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalTotal,
        deliverables_description: deliverablesText || selectedPkgs.map(p => pkgDeliverables[p.id] || p.deliverables || 'N/A').join('\n'),
        notes_special_customizations: teamMembersText || selectedPkgs.map(p => pkgNotes[p.id] || '').join('\n'),
        sales_staff_name: salesStaffName,
        sales_staff_mobile: salesStaffMobile,
        client_residence_address: createForm.client_residence_address,
        city: createForm.city,
        state: createForm.state,
        pincode: createForm.pincode,
        desired_event_shoot_type: createForm.desired_event_shoot_type,
        remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
            next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
        Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
      });
      showToastMsg("‚úÖ Quotation created successfully.", "success");
      setStep3FollowUpDate(followUpDate || '');
      setStep3FollowUpTime('');
      setStep3FollowUpNotes(internalNotes || '');
      setShowStep3Popup(true);
    } catch (err: any) {
      console.error("Step 5 status save failed:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);

      const targetLd = leads.find(l => l.lead_id === createdLeadId);
      const oldStatus = targetLd ? (targetLd.current_status || targetLd.status || 'New Lead') : null;
      const newStatus = finalStatus || null;

      logStatusUpdateError({
        leadId: createdLeadId || null,
        orderId: null,
        oldStatus,
        newStatus,
        updatePayload: {
          status: finalStatus,
          budget: finalTotal,
          package_price: finalTotal,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalTotal,
          Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
        },
        insertPayload: null,
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "Lead Stage Transition Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderConfirmedSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    const targetLd = leads.find(l => l.lead_id === createdLeadId) || selectedLead;
    if (targetLd && !areReportingDetailsComplete(targetLd)) {
      openReportingDetailsModal(targetLd, "Please complete and save the Reporting Details before confirming the order.");
      return;
    }

    if (!confirmedEventDate) {
      showToastMsg("Please select Confirmed Event Date.", "error");
      return;
    }

    if (finalPackageAmount === undefined || finalPackageAmount === 0 || isNaN(finalPackageAmount)) {
      showToastMsg("Please enter Final Amount.", "error");
      return;
    }
    if (advanceReceived === undefined || isNaN(advanceReceived)) {
      showToastMsg("Please enter Advance Paid Amount.", "error");
      return;
    }

    try {
      setIsSaving(true);
      const selectedPkgsNames = selectedPkgs.map(p => p.name).join(' + ') || 'Custom Configured Coverage';
      await confirmOrder(
        createdLeadId!,
        selectedPkgsNames,
        finalPackageAmount,
        advanceReceived,
        confirmedEventDate,
        confirmedEventTime,
        'UPI / Cash / Bank Transfer',
        getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
        reportingTime
      );
      
      showToastMsg("Quotation created successfully.", "success");
      resetForm();
      setActiveTab('list');
    } catch (err: any) {
      console.error("Failed to commit confirmed order details:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);

      const targetLd = leads.find(l => l.lead_id === createdLeadId);
      const oldStatus = targetLd ? (targetLd.current_status || targetLd.status || 'New Lead') : null;

      logStatusUpdateError({
        leadId: createdLeadId || null,
        orderId: null,
        oldStatus,
        newStatus: 'Order Confirmed',
        updatePayload: {
          status: 'Order Confirmed',
          event_date: confirmedEventDate,
          event_time: confirmedEventTime,
          reporting_time: reportingTime,
        },
        insertPayload: {
          order_status: 'Confirmed',
          current_stage: 'Order Confirmed',
          package_name: selectedPkgs.map(p => p.name).join(' + ') || 'Custom Configured Coverage',
          quotation_amount: finalPackageAmount,
          advance_received: advanceReceived,
        },
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "Order Confirmation Pipeline Transition Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle follow up submit
  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || isSaving) return;

    if (followUpForm.status === 'Order Confirmed' || followUpForm.status === 'Confirm Order') {
      if (!areReportingDetailsComplete(selectedLead)) {
        openReportingDetailsModal(selectedLead, "Please complete and save the Reporting Details before confirming the order.");
        return;
      }

      if (!followUpForm.event_date) {
        showToastMsg("Please select Confirmed Event Date.", "error");
        return;
      }

      if (followUpForm.quotation_amount === undefined || followUpForm.quotation_amount === 0 || isNaN(followUpForm.quotation_amount)) {
        showToastMsg("Please enter Final Amount.", "error");
        return;
      }
      if (followUpForm.advance_received === undefined || isNaN(followUpForm.advance_received) || Number(followUpForm.advance_received) <= 0) {
        showToastMsg("Please enter Advance Paid Amount.", "error");
        return;
      }
      if (!followUpForm.transaction_id || !followUpForm.transaction_id.trim()) {
        showToastMsg("Please enter Payment Tracking ID / Transaction Reference Number.", "error");
        return;
      }

      const packageName = packages?.find(p => String(p.package_id) === String(selectedLead.Select_Package_Option))?.package_name || selectedLead.Select_Package_Option || '';

      try {
        setIsSaving(true);
        await confirmOrder(
          selectedLead.lead_id,
          packageName,
          Number(followUpForm.quotation_amount),
          Number(followUpForm.advance_received),
          followUpForm.event_date,
          followUpForm.event_time,
          followUpForm.payment_mode || 'UPI',
          followUpForm.call_notes || 'Confirmed from CRM activity logger',
          followUpForm.reporting_time || '08:00',
          followUpForm.transaction_id
        );

        setSelectedLead(null);
        showToastMsg("Order Confirmed Successfully.", "success");
      } catch (err: any) {
        console.error("Failed to convert lead:", err);
        const errMsg = err?.message || String(err);
        const parsed = parseStatusUpdateError(errMsg);

        const oldStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'New Lead') : null;

        logStatusUpdateError({
          leadId: selectedLead?.lead_id || null,
          orderId: null,
          oldStatus,
          newStatus: 'Order Confirmed',
          updatePayload: {
            status: 'Order Confirmed',
            remarks: followUpForm.call_notes
          },
          insertPayload: {
            order_status: 'Confirmed',
            current_stage: 'Order Confirmed',
            package_name: packageName,
            quotation_amount: Number(followUpForm.quotation_amount),
            advance_received: Number(followUpForm.advance_received),
          },
          dbResponse: null,
          fullError: err
        });

        setStatusError({
          title: "Follow-up Transition to Order Confirmed Failed",
          reason: parsed.reason,
          suggestedFix: parsed.suggestedFix
        });
        alert(parsed.reason);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!followUpForm.call_notes) {
      alert('Please fill in some Call Notes to update lead follow-up.');
      return;
    }

    try {
      setIsSaving(true);
      await updateLeadFollowUp(
        selectedLead.lead_id,
        followUpForm.status,
        followUpForm.call_notes,
        followUpForm.next_follow_up_date || '',
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
      alert('CRM Updated Successfully.');
    } catch (err: any) {
      console.error("Failed to update follow-up:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);

      const oldStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'New Lead') : null;

      logStatusUpdateError({
        leadId: selectedLead?.lead_id || null,
        orderId: null,
        oldStatus,
        newStatus: followUpForm.status,
        updatePayload: {
          status: followUpForm.status,
          budget: Number(followUpForm.quotation_amount),
          remarks: followUpForm.call_notes
        },
        insertPayload: null,
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "Follow-up Pipeline Status Update Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalReportingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || isSaving) return;

    try {
      setIsSaving(true);
      
      const crmEvents = selectedLead.events || [];
      let updatedLeadFields: any = {};

      if (crmEvents.length > 0) {
        // Validate all events have required reporting details
        for (const ev of crmEvents) {
          const fd = finalReportingForm[ev.id] || { reporting_date: '', reporting_time: '' };
          if (!fd.reporting_date || !fd.reporting_date.trim() || !fd.reporting_time || !fd.reporting_time.trim()) {
            showToastMsg("Please complete Reporting Date and Reporting Time for all events.", "error");
            setIsSaving(false);
            return;
          }
        }

        // Save event-wise reporting details
        const updatedEvents = crmEvents.map(ev => {
          const fd = finalReportingForm[ev.id] || { reporting_date: '', reporting_time: '' };
          return {
            ...ev,
            reporting_date: fd.reporting_date,
            reporting_time: fd.reporting_time
          };
        });
        
        updatedLeadFields = {
          events: updatedEvents,
          Reporting_date: updatedEvents[0]?.reporting_date || '', // fallback
          reporting_time: updatedEvents[0]?.reporting_time || ''
        };
        await updateLead(selectedLead.lead_id, updatedLeadFields);
      } else {
        // Fallback for leads without explicit events
        const fd = finalReportingForm['default'] || { reporting_date: '', reporting_time: '' };
        if (!fd.reporting_date || !fd.reporting_date.trim() || !fd.reporting_time || !fd.reporting_time.trim()) {
          showToastMsg("Please complete Reporting Date and Reporting Time.", "error");
          setIsSaving(false);
          return;
        }

        updatedLeadFields = {
          Reporting_date: fd.reporting_date,
          reporting_time: fd.reporting_time
        };
        await updateLead(selectedLead.lead_id, updatedLeadFields);
      }

      const updatedLead = {
        ...selectedLead,
        ...updatedLeadFields
      };

      setShowFinalReportingModal(false);
      setSelectedLead(updatedLead);
      showToastMsg("Reporting Details Saved Successfully.", "success");

      // Auto-open Confirm Order modal once reporting details are saved
      const today = new Date().toISOString().split('T')[0];
      const linkedOrder = orders?.find(o => o.lead_id === updatedLead.lead_id);
      const linkedPayment = linkedOrder ? payments?.find(p => p.order_id === linkedOrder.order_id) : null;
      const calcAdvance = linkedPayment ? ((linkedPayment.advance_received || 0) + (linkedPayment.final_payment_received || 0)) : (linkedOrder ? (linkedOrder.advance_received || 0) : (Number(updatedLead.advance_collected) || 0));

      setConfirmForm(prev => ({
        ...prev,
        package_name: packages?.find((p) => String(p.package_id) === String(updatedLead.Select_Package_Option))?.package_name || updatedLead.Select_Package_Option || prev.package_name || '',
        quotation_amount: getLeadFinalPackageAmount(updatedLead, updatedLead.lead_id === selectedLead?.lead_id ? wizardLeadData : undefined, prev.quotation_amount),
        advance_received: calcAdvance || prev.advance_received || 0,
        event_date: updatedLead.event_date || prev.event_date || today,
        event_time: updatedLead.event_time || prev.event_time || ''
      }));
      setShowConfirmModal(true);
    } catch (err) {
      console.error(err);
      showToastMsg("Failed to save Reporting Details.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Order Confirmation Process
  const handleConfirmOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || isSaving) return;

    if (!confirmForm.event_date) {
      showToastMsg("Please select Confirmed Event Date.", "error");
      return;
    }

    const effectiveFinalAmt = getLeadFinalPackageAmount(selectedLead, wizardLeadData, confirmForm.quotation_amount);
    if (!effectiveFinalAmt || effectiveFinalAmt <= 0 || isNaN(effectiveFinalAmt)) {
      showToastMsg("Please enter Final Amount.", "error");
      return;
    }
    if (confirmForm.advance_received === undefined || isNaN(confirmForm.advance_received) || Number(confirmForm.advance_received) <= 0) {
      showToastMsg("Please enter Advance Paid Amount.", "error");
      return;
    }
    if (!confirmForm.transaction_id || !confirmForm.transaction_id.trim()) {
      showToastMsg("Please enter Payment Tracking ID / Transaction Reference Number.", "error");
      return;
    }

    // Validate that each event has a Reporting Date and Reporting Time
    if (selectedLead.events && selectedLead.events.length > 0) {
      for (let i = 0; i < selectedLead.events.length; i++) {
        const ev = selectedLead.events[i];
        const key = ev.id || `ev_${i}`;
        const rep = eventsReporting[key];
        const evTitle = ev.event_name || ev.event_type || `Event ${i + 1}`;
        if (!rep?.reporting_date || !rep.reporting_date.trim()) {
          showToastMsg(`Please enter Reporting Date for ${evTitle}.`, "error");
          return;
        }
        if (!rep?.reporting_time || !rep.reporting_time.trim()) {
          showToastMsg(`Please enter Reporting Time for ${evTitle}.`, "error");
          return;
        }
      }
    } else {
      const rep = eventsReporting['default'];
      if (!rep?.reporting_date || !rep.reporting_date.trim()) {
        showToastMsg("Please enter Reporting Date.", "error");
        return;
      }
      if (!rep?.reporting_time || !rep.reporting_time.trim()) {
        showToastMsg("Please enter Reporting Time.", "error");
        return;
      }
    }

    try {
      setIsSaving(true);

      // Save each event's reporting details to lead_events table in Supabase
      if (selectedLead.events && selectedLead.events.length > 0) {
        const updatedEvents = selectedLead.events.map((ev, idx) => {
          const key = ev.id || `ev_${idx}`;
          const rep = eventsReporting[key] || { reporting_date: '', reporting_time: '' };
          return {
            ...ev,
            reporting_date: rep.reporting_date || ev.reporting_date || ev.event_date || '',
            Reporting_date: rep.reporting_date || (ev as any).Reporting_date || ev.event_date || '',
            reporting_time: rep.reporting_time || ev.reporting_time || ''
          };
        });

        await updateLead(selectedLead.lead_id, {
          events: updatedEvents,
          Reporting_date: updatedEvents[0]?.reporting_date || '',
          reporting_time: updatedEvents[0]?.reporting_time || ''
        });
      } else {
        const rep = eventsReporting['default'] || { reporting_date: '', reporting_time: '' };
        await updateLead(selectedLead.lead_id, {
          Reporting_date: rep.reporting_date,
          reporting_time: rep.reporting_time
        });
      }

      const firstRepTime = (selectedLead.events && selectedLead.events.length > 0)
        ? eventsReporting[selectedLead.events[0].id || 'ev_0']?.reporting_time
        : eventsReporting['default']?.reporting_time;

      await confirmOrder(
        selectedLead.lead_id,
        confirmForm.package_name,
        effectiveFinalAmt,
        Number(confirmForm.advance_received),
        confirmForm.event_date,
        confirmForm.event_time,
        confirmForm.payment_mode,
        confirmForm.notes,
        firstRepTime,
        confirmForm.transaction_id
      );

      setShowConfirmModal(false);
      showToastMsg("Booking Confirmation saved successfully. Order transferred to Operations.", "success");
      setWizardLeadData(prev => ({
        ...prev,
        advance_received: Number(confirmForm.advance_received)
      }));
      setSelectedLead(null);
    } catch (err: any) {
      console.error("Failed to convert order:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);

      const oldStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'New Lead') : null;

      logStatusUpdateError({
        leadId: selectedLead?.lead_id || null,
        orderId: null,
        oldStatus,
        newStatus: 'Order Confirmed',
        updatePayload: {
          status: 'Order Confirmed',
          event_date: confirmForm.event_date,
          event_time: confirmForm.event_time,
          reporting_time: undefined,
        },
        insertPayload: {
          order_status: 'Confirmed',
          current_stage: 'Order Confirmed',
          package_name: confirmForm.package_name,
          quotation_amount: Number(confirmForm.quotation_amount),
          advance_received: Number(confirmForm.advance_received),
        },
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "Action Button Order Confirmation Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
  };

  // Companion lead metadata parse
  const getFollowUpDate = (remarks?: string) => {
    if (!remarks) return null;
    const match = remarks.match(/Next follow-up:\s*(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  };

  const todayStr = '2026-06-10';

  const statCreatedQuotation = leads.filter(l => {
    const st = getLeadCurrentStatus(l);
    return st === 'Create Quote' || st === 'Created Quotation' || st === 'New Lead';
  }).length;
  const statQuotesSent = leads.filter(l => {
    const st = getLeadCurrentStatus(l);
    return st === 'Quote Sent' || st === 'Quotation Sent';
  }).length;
  const statQuoteFollowups = leads.filter(l => {
    const st = getLeadCurrentStatus(l);
    return st === 'Quote Follow-up' || st === 'Follow Up' || st === 'Follow-up';
  }).length;
  const statConfirmedOrders = leads.filter(l => {
    const st = getLeadCurrentStatus(l);
    return st === 'Confirm Order' || st === 'Order Confirmed';
  }).length;
  const statLeadLost = leads.filter(l => {
    const st = getLeadCurrentStatus(l);
    return st === 'Lead Lost' || st === 'Lost Lead';
  }).length;

  // Filter Leads List
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.customer_name.toLowerCase().includes(filterQuery.toLowerCase()) || 
      lead.lead_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      lead.mobile.includes(filterQuery);

    const matchesSource = filterSource === '' || lead.lead_source === filterSource;
    const leadStatus = getLeadCurrentStatus(lead);
    const matchesStatus = filterStatus === '' 
      ? true 
      : filterStatus === 'Overdue' 
        ? (() => {
            if (leadStatus !== 'Follow Up') return false;
            const fDate = getFollowUpDate(lead.remarks);
            return fDate ? fDate < todayStr : false;
          })()
        : (() => {
            const statusLower = leadStatus.toLowerCase().trim();
            const filterLower = filterStatus.toLowerCase().trim();
            if (filterLower === 'create quote' || filterLower === 'created quotation') {
              return statusLower === 'create quote' || statusLower === 'created quotation' || statusLower === 'new lead';
            }
            if (filterLower === 'quote sent') {
              return statusLower === 'quote sent' || statusLower === 'quotation sent';
            }
            if (filterLower === 'quote follow-up') {
              return statusLower === 'quote follow-up' || statusLower === 'follow up' || statusLower === 'follow-up';
            }
            if (filterLower === 'confirm order') {
              return statusLower === 'confirm order' || statusLower === 'order confirmed';
            }
            if (filterLower === 'lead lost') {
              return statusLower === 'lead lost' || statusLower === 'lost lead';
            }
            if (filterLower === 'customer review') {
              return statusLower === 'customer review' || statusLower === 'client review' || statusLower === 'client review sent';
            }
            if (filterLower === 'project completed') {
              return statusLower === 'project completed' || statusLower === 'project closed' || statusLower === 'completed' || statusLower === 'closed' || statusLower === 'project delivered' || statusLower === 'delivered' || statusLower === 'approved' || statusLower === 'final approval' || statusLower === 'client approved';
            }
            if (filterLower === 'approved') {
              return statusLower === 'approved' || statusLower === 'client approved';
            }
            if (filterLower === 'project delivered') {
              return statusLower === 'project delivered' || statusLower === 'delivered';
            }
            if (filterLower === 'project closed') {
              return statusLower === 'project closed' || statusLower === 'closed';
            }
            if (filterLower === 'new project received') {
              return statusLower === 'new project received' || statusLower === 'new order received';
            }
            if (filterLower === 'follow up') {
              return statusLower === 'follow up' || statusLower === 'follow-up';
            }
            return statusLower === filterLower;
          })();
    const matchesSales = filterSalesPerson === '' || lead.sales_person === filterSalesPerson;
    const matchesDate = filterDate === '' || lead.event_date === filterDate;

    let matchesDateRange = true;
    if (appliedStartDate) {
      matchesDateRange = matchesDateRange && (lead.created_date >= appliedStartDate);
    }
    if (appliedEndDate) {
      matchesDateRange = matchesDateRange && (lead.created_date <= appliedEndDate);
    }

    return matchesSearch && matchesSource && matchesStatus && matchesSales && matchesDate && matchesDateRange;
  }).sort((a, b) => {
    const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.created_date).getTime());
    const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.created_date).getTime());
    return sortOrder === 'latest' ? timeB - timeA : timeA - timeB;
  });

  return (
    <div id="sales_module" className="space-y-6">
      {statusError && (
        <div className="fixed inset-0 bg-slate-955/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-4 flex items-center gap-3">
              <span className="p-2.5 bg-red-500/20 text-red-400 rounded-xl text-lg">‚ö†Ô∏è</span>
              <div>
                <h3 className="font-bold text-slate-100 text-sm font-sans">{statusError.title || 'Status Update Failed'}</h3>
                <p className="text-[10px] text-red-400 font-mono tracking-wider">DATABASE SCHEMA / INTEGRITY EXCEPTION</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Reason:</span>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-red-300 font-mono leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {statusError.reason}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Suggested Fix / Schema Migration:</span>
                <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-xl p-3 text-xs text-emerald-300 font-sans leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {statusError.suggestedFix}
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 border-t border-slate-800 px-6 py-3.5 flex justify-end">
              <button
                onClick={() => setStatusError(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-700"
              >
                Dismiss Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      {activeTab !== 'create' && activeTab !== 'custom_package_master' && !selectedLead && (
        <div 
          className={`${activeTab === 'calendar' ? 'hidden' : 'flex'} flex-col sm:flex-row sm:items-center justify-between gap-4`}
          style={activeTab === 'calendar' ? { display: 'none' } : undefined}
        >
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
              id="btn_lead_tab_profiles"
              onClick={() => { setActiveTab('profiles'); setSelectedLead(null); setSelectedCustomerProfileId(null); }}
              className={`hidden px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                activeTab === 'profiles'
                  ? 'bg-zinc-900 border-zinc-750 text-white font-black hover:border-zinc-700'
                  : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              üë• Customer Profiles
            </button>

            <button
              id="btn_lead_tab_calendar"
              onClick={() => { setActiveTab('calendar'); setSelectedLead(null); setSelectedCustomerProfileId(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-zinc-900 border-zinc-750 text-white font-black hover:border-zinc-700'
                  : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-405 group-hover:text-zinc-200" />
              <span>Sales Calendar</span>
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
                <span>Create Quotation</span>
              </button>
            ) : (
              <span className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 rounded px-2.5 py-1 flex items-center gap-1.5" title="You are restricted from adding leads in this role.">
                <Ban className="w-3 h-3" />
                <span>Sales Access Blocked</span>
              </span>
            )}
          </div>
        </div>
      )}

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
                <span className="text-slate-200 break-words">{selectedLead.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-350">
                <MapPin className="w-4 h-4 text-slate-505 flex-shrink-0" />
                <span className="text-slate-200">{selectedLead.event_location}</span>
              </div>
            </div>

            {/* Detailed Parameters */}
            <div className="border-t border-slate-800 pt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 block">Event Type</span>
                <strong className="text-slate-200 font-medium">{selectedLead.event_type === 'Other' ? (selectedLead.custom_event_name || selectedLead.custom_event_type || 'Other') : selectedLead.event_type}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Lead Source</span>
                <strong className="text-slate-200 font-medium">
                  {selectedLead.lead_source === 'Other' && selectedLead.Specify_Custom_Lead_Source_Name 
                    ? `Other: ${selectedLead.Specify_Custom_Lead_Source_Name}` 
                    : selectedLead.lead_source}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Events Scheduled</span>
                <div className="flex flex-col gap-1 mt-1">
                  {selectedLead.events && selectedLead.events.length > 0 ? (
                    selectedLead.events.map((ev, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-amber-500 font-semibold">{ev.event_name || ev.event_type || 'Event'}</span>
                        <br/>
                        <strong className="text-slate-200 font-medium font-mono text-[10px]">{ev.event_date} {ev.event_start_time ? `@ ${formatTime12Hour(ev.event_start_time)}` : ''}</strong>
                      </div>
                    ))
                  ) : (
                    <strong className="text-slate-200 font-medium">{selectedLead.event_date || 'N/A'} {selectedLead.event_time ? `@ ${formatTime12Hour(selectedLead.event_time)}` : ''}</strong>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block">Current Budget</span>
                <strong className="text-amber-400 font-extrabold font-mono">{formatINR(selectedLead.budget)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">City / State</span>
                <strong className="text-slate-200 font-medium">{selectedLead.city || 'N/A'} / {selectedLead.state || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Pincode</span>
                <strong className="text-slate-200 font-medium">{selectedLead.pincode || 'N/A'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Residence Address</span>
                <strong className="text-slate-200 font-medium block break-words">{selectedLead.client_residence_address || 'N/A'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Package Option</span>
                <strong className="text-slate-200 font-medium block break-words">
                  {(() => {
                    const pkg = packages.find(p => p.package_id === selectedLead.Select_Package_Option);
                    return pkg ? `${pkg.package_name} (${selectedLead.Select_Package_Option})` : (selectedLead.Select_Package_Option || 'Not selected');
                  })()}
                </strong>
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
                  onClick={() => {
                    if (!selectedLead) return;
                    const today = new Date().toISOString().split('T')[0];
                    const linkedOrder = orders?.find(o => o.lead_id === selectedLead.lead_id);
                    const linkedPayment = linkedOrder ? payments?.find(p => p.order_id === linkedOrder.order_id) : null;
                    const calcAdvance = linkedPayment ? ((linkedPayment.advance_received || 0) + (linkedPayment.final_payment_received || 0)) : (linkedOrder ? (linkedOrder.advance_received || 0) : (Number(selectedLead.advance_collected) || Number(wizardLeadData.advance_received) || 0));
                    
                    setConfirmForm({
                      ...confirmForm,
                      package_name: packages?.find((p) => String(p.package_id) === String(selectedLead.Select_Package_Option))?.package_name || selectedLead.Select_Package_Option || '',
                      quotation_amount: getLeadFinalPackageAmount(selectedLead, wizardLeadData),
                      advance_received: calcAdvance,
                      event_date: selectedLead.event_date || today,
                      event_time: selectedLead.event_time || ''
                    });
                    initEventsReporting(selectedLead);
                    setShowConfirmModal(true);
                  }}
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
              <span>üìù</span> Log Lead Follow-up activity & CRM notes
            </h3>

            {selectedLead && isLeadLocked && (
              <div className="p-4 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left animate-fade-in relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
                    <span className="animate-pulse">üîí</span> Stage-Locked: Order Confirmed
                  </div>
                  <p className="text-[11px] text-slate-350 leading-relaxed font-sans">
                    This lead is lock-protected due to having officially transitioned to operations. Only payment schedules are editable.
                  </p>
                </div>
                {currentRole === 'Business Owner' && (
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockReason('Data Correction');
                      setUnlockingRecordId(selectedLead.lead_id);
                    }}
                    className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer font-mono font-extrabold uppercase tracking-wide border border-amber-500/20 shadow-lg"
                  >
                    üîì Owner Override
                  </button>
                )}
              </div>
            )}

            {canEdit ? (
              <form onSubmit={handleFollowUpSubmit} className="space-y-4">
                <fieldset disabled={isLeadLocked} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
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
                        <option value="Quote Sent">Quote Sent</option>
                        <option value="Quote Follow-up">Quote Follow-up</option>
                        <option value="Confirm Order">Confirm Order</option>
                        {followUpForm.status && !['Quote Sent', 'Quote Follow-up', 'Confirm Order', 'Order Confirmed', 'Quotation Sent', 'Follow Up'].includes(followUpForm.status) && (
                          <option value={followUpForm.status}>{followUpForm.status}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {(followUpForm.status === 'Confirm Order' || followUpForm.status === 'Order Confirmed') ? (
                    <div className="space-y-4 pt-2 border-t border-slate-800">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Configure Confirmed Order Settings</h4>
                      
                      {/* Read-only multiple events display */}
                      {selectedLead?.events && selectedLead.events.length > 0 && (
                        <div className="space-y-2 mb-4">
                          <label className="block text-xs font-medium text-slate-400 mb-2">Confirmed Event Dates</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedLead.events.map(ev => (
                              <div key={ev.id} className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 flex flex-col">
                                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">üé¨ {ev.event_name || ev.event_type || 'Event'}</span>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-500 font-mono">Date:</span>
                                    <span className="text-[11px] text-slate-300 font-mono font-semibold">{ev.event_date || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-500 font-mono">Time:</span>
                                    <span className="text-[11px] text-slate-300 font-mono font-semibold">{ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Hidden inputs to preserve existing API requirements silently */}
                        <div className="hidden">
                          <label className="block text-xs font-medium text-slate-400 mb-1">Event Date * (Required)</label>
                          <input
                            type="date"
                            value={followUpForm.event_date || (selectedLead?.events?.[0]?.event_date) || ''}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, event_date: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
                          />
                        </div>
                        <div className="hidden">
                          <label className="block text-xs font-medium text-slate-400 mb-1">Event Time * (Required)</label>
                          <input
                            type="time"
                            value={followUpForm.event_time || (selectedLead?.events?.[0]?.event_start_time) || ''}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, event_time: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Reporting Time * (Required)
                          </label>
                          <input
                            type="time"
                            required
                            value={followUpForm.reporting_time}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, reporting_time: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Final Amount (‚Çπ) *
                          </label>
                          <input
                            type="number"
                            required
                            value={followUpForm.quotation_amount}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, quotation_amount: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Advance Amount Received (‚Çπ)
                          </label>
                          <input
                            type="number"
                            value={followUpForm.advance_received}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, advance_received: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Payment Mode
                          </label>
                          <select
                            value={followUpForm.payment_mode}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, payment_mode: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="UPI">UPI (GPay/PhonePe)</option>
                            <option value="Cash">Cash Handover</option>
                            <option value="Bank Transfer">Bank NFT/RTGS/IMPS</option>
                            <option value="Card">Credit/Debit Card</option>
                            <option value="Cheque">Cheque Deposit</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Payment Tracking ID / Transaction Reference Number *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter Transaction Ref / Tracking ID (e.g. TXN12345678)"
                            value={followUpForm.transaction_id || ''}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, transaction_id: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            Negotiated Quotation Amount (‚Çπ) *
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
                    </>
                  )}
                </fieldset>

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
                    disabled={isLeadLocked || isSaving}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all border ${
                      isLeadLocked || isSaving
                      ? 'bg-slate-800/80 text-slate-500 border-slate-800/50 cursor-not-allowed opacity-50'
                      : 'bg-indigo-650 hover:bg-indigo-550 text-white border-indigo-500/10 cursor-pointer text-shadow'
                    }`}
                  >
                    {isSaving ? 'Saving...' : (isLeadLocked ? 'üîí Locked' : followUpForm.status === 'Order Confirmed' ? 'üíç Confirm Order booking' : 'Save Follow-up Notes')}
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
        {selectedLead ? null : activeTab === 'calendar' ? (
          <SalesCalendar onSelectLead={(lead) => handleSelectLead(lead)} />
        ) : activeTab === 'profiles' ? (
          /* NEW SCREEN: Customer Profiles & History Timeline sub-tab */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Accounts Directory / Ledger */}
            <div className="lg:col-span-4 bg-slate-850 rounded-xl border border-slate-800 p-4 space-y-4 text-left">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 font-mono">
                  <span>üë•</span> CLIENT ACCOUNTS ({getCustomers(leads, orders, payments).length})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Unified customer profiles compiled via CRM phone & email graphs.
                </p>
              </div>

              {/* Search Customer Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, phone, email..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                />
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                {customerSearchQuery && (
                  <button 
                    onClick={() => setCustomerSearchQuery('')} 
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Roster List */}
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {(() => {
                  const items = getCustomers(leads, orders, payments);
                  const filtered = items.filter(c => 
                    c.customer_name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    c.customer_id.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    c.email.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    c.mobile.includes(customerSearchQuery)
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        No clients match your query.
                      </div>
                    );
                  }

                  return filtered.map((cust) => {
                    const isSelected = selectedCustomerProfileId === cust.customer_id;
                    return (
                      <div
                        key={cust.customer_id}
                        onClick={() => {
                          setSelectedCustomerProfileId(cust.customer_id);
                          setIsQuickReorderView(false);
                        }}
                        className={`p-3 rounded-xl border transition-all text-left cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600/10 border-indigo-500/40 shadow-sm shadow-indigo-505/10' 
                            : 'bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-slate-800 border border-slate-700 text-amber-500/90 px-2 py-0.5 rounded font-mono font-bold">
                            {cust.customer_id}
                          </span>
                          {cust.totalOrders >= 2 && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-black uppercase">
                              üî• REPEAT ({cust.totalOrders})
                            </span>
                          )}
                        </div>
                        
                        <h4 className="text-xs font-black text-slate-100 mt-2 font-sans break-words">
                          {cust.customer_name}
                        </h4>
                        
                        <div className="text-[10px] text-slate-400 font-mono mt-1 space-y-0.5">
                          <div className="break-words">{cust.email}</div>
                          <div>{formatIndianPhoneNumber(cust.mobile)}</div>
                        </div>

                        <div className="border-t border-slate-800/60 mt-2.5 pt-2 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">Total CLV:</span>
                          <strong className="text-emerald-450 font-bold font-mono">{formatINR(cust.totalRevenue)}</strong>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right Column: In-depth Timeline & Historiography Ledger */}
            <div className="lg:col-span-8 bg-slate-850 rounded-xl border border-slate-800 p-5 space-y-6 text-left">
              {(() => {
                const list = getCustomers(leads, orders, payments);
                // default to first customer if none is explicitly clicked
                const currentProfileId = selectedCustomerProfileId || (list.length > 0 ? list[0].customer_id : null);
                const cust = list.find(c => c.customer_id === currentProfileId);

                if (!cust) {
                  return (
                    <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-2">
                      <Users className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                      <h4 className="text-sm font-semibold text-slate-400">Select customer profile</h4>
                      <p className="text-xs text-slate-505">Pick any client from the directory to review lifetime timeline history.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6 animate-fade-in text-slate-200">
                    {/* Header profile details */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-slate-900 border border-slate-750 font-mono text-amber-500 px-2.5 py-0.5 rounded font-black font-mono">
                            {cust.customer_id}
                          </span>
                          {cust.totalOrders >= 2 && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-black">
                              LOYAL RETIRED BUYER COHORT
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg font-black text-white mt-1.5">{cust.customer_name}</h2>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 font-mono text-[10px] mt-1.5">
                          <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-indigo-400" /> {cust.email}</span>
                          <span className="text-slate-800">|</span>
                          <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-indigo-400" /> {formatIndianPhoneNumber(cust.mobile)}</span>
                          {cust.alternate_mobile && (
                            <>
                              <span className="text-slate-800">|</span>
                              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-zinc-500" /> Alt: {formatIndianPhoneNumber(cust.alternate_mobile)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsQuickReorderView(!isQuickReorderView);
                            // Set event date default to next month
                            const defaultReorderDate = new Date();
                            defaultReorderDate.setMonth(defaultReorderDate.getMonth() + 1);
                            setReorderForm(prev => ({
                              ...prev,
                              event_date: defaultReorderDate.toISOString().split('T')[0]
                            }));
                          }}
                          className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-650 to-indigo-750 hover:from-indigo-600 hover:to-indigo-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow-lg transition-all cursor-pointer font-sans"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isQuickReorderView ? "Close Reorder Desk" : "Create New Reorder"}</span>
                        </button>
                      )}
                    </div>

                    {/* Quick Reorder Config Section */}
                    {isQuickReorderView && (
                      <div className="bg-slate-900 border border-indigo-500/20 p-4 rounded-xl space-y-4 animate-fade-in-up">
                        <div className="border-b border-slate-800 pb-2">
                          <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest font-mono">
                            ‚úçÔ∏è CONFIGURE REPEAT SHOOT CONTRACT
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Book a new independent contract project. This generates a new Lead and verified Order ID, keeping customer ID intact.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className={reorderForm.event_type === 'Other' ? "sm:col-span-2 space-y-2" : ""}>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Event Type</label>
                            <select
                              value={reorderForm.event_type}
                              onChange={(e) => setReorderForm({ ...reorderForm, event_type: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
                            >
                              {EVENT_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>

                            {reorderForm.event_type === 'Other' && (
                              <div className="animate-fade-in-down mt-2">
                                <label className="block text-[11px] font-mono font-bold text-amber-500 mb-1.5">
                                  Custom Event Type *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Specify custom event type"
                                  value={reorderForm.custom_event_name}
                                  onChange={(e) => setReorderForm({ ...reorderForm, custom_event_name: e.target.value })}
                                  className="w-full bg-slate-950 border border-amber-500/50 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all text-white"
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Shoot Date *</label>
                            <input
                              type="date"
                              required
                              value={reorderForm.event_date}
                              onChange={(e) => setReorderForm({ ...reorderForm, event_date: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Execution Location</label>
                            <input
                              type="text"
                              placeholder="e.g. Grand Hyatt, Goa"
                              value={reorderForm.event_location}
                              onChange={(e) => setReorderForm({ ...reorderForm, event_location: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Package Designation</label>
                            <input
                              type="text"
                              placeholder="e.g. Royal Gold Cinema"
                              value={reorderForm.package_name}
                              onChange={(e) => setReorderForm({ ...reorderForm, package_name: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-440 mb-1">Quotation Contract Sum (‚Çπ)</label>
                            <input
                              type="number"
                              value={reorderForm.quotation_amount}
                              onChange={(e) => setReorderForm({ ...reorderForm, quotation_amount: Number(e.target.value), advance_received: Math.round(Number(e.target.value)/3) })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-440 mb-1">Advance Deposited (‚Çπ)</label>
                            <input
                              type="number"
                              value={reorderForm.advance_received}
                              onChange={(e) => setReorderForm({ ...reorderForm, advance_received: Number(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                          <button
                            type="button"
                            onClick={() => setIsQuickReorderView(false)}
                            className="bg-slate-800 hover:bg-slate-750 px-4 py-1.5 text-xs rounded border border-slate-700 text-slate-350 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteQuickReorder(cust)}
                            className="bg-indigo-600 hover:bg-indigo-555 px-4 py-1.5 text-xs text-white rounded font-bold shadow shadow-indigo-650/30 cursor-pointer"
                          >
                            Issue Repeat Order Contract
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Stats Summary widgets */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-750 text-indigo-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Total Bookings</span>
                          <span className="text-sm font-black text-slate-100 font-mono">{cust.totalOrders}</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-750 text-emerald-400">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Lifetime Revenue</span>
                          <span className="text-sm font-black text-emerald-400 font-mono">{formatINR(cust.totalRevenue)}</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-750 text-amber-500">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Latest Event Date</span>
                          <span className="text-sm font-bold text-slate-205 font-mono">{cust.lastEventDate || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timelines history segments */}
                    <div className="space-y-6">
                      
                      {/* Subsegment 1: Historical Inquiries Timeline */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 font-mono tracking-wider uppercase pb-2 border-b border-slate-800 mb-3 flex items-center gap-1.5">
                          <span>Inquiries Timeline</span>
                        </h4>
                        <div className="space-y-3">
                          {cust.leads.map((ld, i) => (
                            <div key={ld.lead_id} className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-800">
                              <span className="absolute left-[3px] top-[5px] w-1.5 h-1.5 rounded-full bg-indigo-505 ring-4 ring-slate-850" />
                              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs w-full">
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] text-amber-400 font-bold">{ld.lead_id}</span>
                                    <span className="text-[11px] text-slate-400">
                                      Source: {ld.lead_source === 'Other' && ld.Specify_Custom_Lead_Source_Name ? `Other: ${ld.Specify_Custom_Lead_Source_Name}` : ld.lead_source}
                                    </span>
                                  </div>
                                  
                                  {/* Render each event separately */}
                                  <div className="space-y-2 mt-2">
                                    {ld.events && ld.events.length > 0 ? ld.events.map((ev, evIdx) => (
                                      <div key={ev.id || evIdx} className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[10px] text-slate-500 font-mono">üìÖ {ev.event_name || ev.event_type || 'Event'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-[11px]">
                                          <span className="text-slate-300">Date: {ev.event_date || 'N/A'}</span>
                                          <span className="text-slate-300">Time: {ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A'}</span>
                                        </div>
                                      </div>
                                    )) : (
                                      <div className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[10px] text-slate-500 font-mono">üìÖ {ld.event_type || 'Event'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-[11px]">
                                          <span className="text-slate-300">Date: {ld.event_date || 'N/A'}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="bg-slate-800 px-2 py-0.5 rounded text-[9px] font-mono text-indigo-400 font-semibold uppercase">
                                    {ld.status}
                                  </span>
                                  <span className="font-mono text-[11px] text-emerald-450 font-black">
                                    {formatINR(ld.budget)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {cust.leads.length === 0 && (
                            <p className="text-[11px] text-slate-500 font-mono italic">No previous inquiries logged.</p>
                          )}
                        </div>
                      </div>

                      {/* Subsegment 2: Confirmed Orders History */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 font-mono tracking-wider uppercase pb-2 border-b border-slate-800 mb-3 flex items-center gap-1.5">
                          <span>Verified Orders & Contracts History</span>
                        </h4>
                        <div className="space-y-3">
                          {cust.orders.map((ord) => (
                            <div key={ord.order_id} className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-indigo-400 font-bold">{ord.order_id}</span>
                                  <span className="text-[11px] text-slate-400">
                                    Package: <strong className="text-slate-200">{ord.package_name}</strong> | Location: {ord.event_location}
                                  </span>
                                </div>

                                {/* Render each event separately */}
                                <div className="space-y-2 mt-2">
                                  {(() => {
                                    const ordLead = leads.find(l => l.lead_id === ord.lead_id);
                                    if (ordLead && ordLead.events && ordLead.events.length > 0) {
                                      return ordLead.events.map((ev, evIdx) => (
                                        <div key={ev.id || evIdx} className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] text-slate-500 font-mono">üìÖ {ev.event_name || ev.event_type || 'Event'}</span>
                                          </div>
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-[11px]">
                                            <span className="text-slate-300">Date: {ev.event_date || 'N/A'}</span>
                                            <span className="text-slate-300">Time: {ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A'}</span>
                                          </div>
                                        </div>
                                      ));
                                    } else {
                                      return (
                                        <div className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-[11px]">
                                            <span className="text-slate-300">Date: {ord.event_date || 'N/A'}</span>
                                          </div>
                                        </div>
                                      );
                                    }
                                  })()}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-slate-550 font-mono text-[10px] uppercase">Quotation</div>
                                  <strong className="text-emerald-450 text-[11px] font-mono font-black">{formatINR(ord.quotation_amount)}</strong>
                                </div>
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono text-amber-500 font-semibold uppercase">
                                  {ord.order_status}
                                </span>
                              </div>
                            </div>
                          ))}
                          {cust.orders.length === 0 && (
                            <p className="text-[11px] text-slate-500 font-mono italic">No confirmed order folders detected.</p>
                          )}
                        </div>
                      </div>

                      {/* Subsegment 3: Payment History Ledger */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 font-mono tracking-wider uppercase pb-2 border-b border-slate-800 mb-3 flex items-center gap-1.5">
                          <span>Financial Ledger Payments History</span>
                        </h4>
                        <div className="space-y-3">
                          {(() => {
                            const customerOrdersIds = cust.orders.map(o => o.order_id);
                            const customerPayments = payments.filter(p => customerOrdersIds.includes(p.order_id));
                            
                            if (customerPayments.length === 0) {
                              return <p className="text-[11px] text-slate-550 font-mono italic">Awaiting payment ledger clearance logs...</p>;
                            }

                            return customerPayments.map(p => (
                              <div key={p.payment_id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-mono">Invoice Code</span>
                                  <span className="font-mono text-indigo-400 font-bold">{p.payment_id} (Ref: {p.order_id})</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-mono">Deposited Cash</span>
                                  <span className="font-mono text-emerald-445 font-bold">{formatINR(p.advance_received + p.final_payment_received)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-505 text-[10px] block font-mono">Balance Due</span>
                                  <span className={`font-mono font-black ${p.balance_due > 0 ? 'text-red-405 animate-pulse' : 'text-slate-405'}`}>{formatINR(p.balance_due)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-mono">Clearance Status</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold leading-none inline-block mt-0.5 uppercase ${
                                    p.payment_status === 'Cleared' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-455 border border-rose-500/20'
                                  }`}>
                                    {p.payment_status}
                                  </span>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Subsegment 4: Delivery History */}
                      <div>
                        <h4 className="text-xs font-black text-slate-400 font-mono tracking-wider uppercase pb-2 border-b border-slate-800 mb-3 flex items-center gap-1.5">
                          <span>Operational Crews & Delivery History</span>
                        </h4>
                        <div className="space-y-3">
                          {(() => {
                            const customerOrdersIds = cust.orders.map(o => o.order_id);
                            // Link production items
                            const linkedProduction = production.filter(prod => customerOrdersIds.includes(prod.order_id));

                            if (linkedProduction.length === 0) {
                              return <p className="text-[11px] text-slate-550 font-mono italic">Roster operations not yet dispatched to editors...</p>;
                            }

                            return linkedProduction.map(prod => (
                              <div key={prod.production_id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs flex justify-between items-center text-zinc-300">
                                <div>
                                  <span className="font-mono text-[10px] text-indigo-400 font-black">PROD-{prod.production_id} / {prod.order_id}</span>
                                  <div className="text-[11px] text-slate-450 mt-0.5">
                                    Editor assigned: <strong className="text-slate-205">{prod.editor_assigned || 'Unassigned'}</strong>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-[10px] text-slate-550 font-mono uppercase">Delivery Stage</div>
                                  <span className="text-amber-500 font-black font-mono text-[11px] uppercase">{prod.editing_status}</span>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                      
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : activeTab === 'custom_package_master' ? (
          <CustomPackageMaster />
        ) : activeTab === 'packages' ? (
          /* NEW SCREEN: Package Management Catalog */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-left relative overflow-hidden font-sans">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span>Dynamic Package Catalog</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Manage core service offerings, pricing rates, and category bindings synced directly with Supabase.
                </p>
              </div>
              
              {canEdit && (
                <button
                  type="button"
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
                    setPkgTeamMembers([{ qty: 1, name: '' }]);
                    setPkgDeliverablesList([{ qty: 1, name: '' }]);
                    setPkgDeliverableInput('');
                    setCustomCategory('');
                    setIsAddFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer border border-transparent"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create offering</span>
                </button>
              )}
            </div>

            {packageSuccessMsg && (
              <div id="package_success_banner" className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 text-xs text-emerald-300 font-medium flex items-center justify-between shadow-lg animate-fade-in">
                <span className="font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{packageSuccessMsg}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPackageSuccessMsg(null)}
                  className="text-emerald-400 hover:text-emerald-200 p-1 rounded-lg hover:bg-emerald-900/40 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {dbCategoryError && (
              <div id="db_category_error_banner" className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-400 font-medium space-y-1">
                <span className="font-bold flex items-center gap-1">‚ö†Ô∏è Database Schema Notice</span>
                <p>{dbCategoryError}</p>
              </div>
            )}

            {/* In-place Add / Edit Package Modal */}
            {(isAddFormOpen || editingPackage) && (
              <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 text-left text-xs bg-black/70 animate-fade-in">
                <div id="add_edit_package_modal" className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl relative text-slate-350 overflow-hidden" style={{ maxHeight: 'calc(100vh - 40px)' }}>
                  {/* Modal Header */}
                  <div className="border-b border-slate-800 p-4 sm:p-6 flex items-center justify-between shrink-0">
                    <h4 className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-wide flex items-center gap-2">
                      <span>{editingPackage ? '‚úèÔ∏è Edit Service Package' : '‚ú® Define New Service Package'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddFormOpen(false);
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
                        setPkgTeamMembers([{ qty: 1, name: '' }]);
                        setPkgDeliverablesList([{ qty: 1, name: '' }]);
                        setPkgDeliverableInput('');
                        setCustomCategory('');
                      }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                      title="Close modal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scrollable Form Body */}
                  <div className="overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5 text-xs text-slate-300 flex-1 min-h-0 w-full max-w-full">
                    {/* SECTION 1: PACKAGE DETAILS */}
                    <div className="space-y-3 w-full max-w-full">
                      <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] font-mono text-emerald-400">
                        Package Details
                      </label>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full">
                        {/* Package Name */}
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1 text-xs">
                            Package Name <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Traditional Wedding Photography"
                            value={pkgForm.package_name}
                            onChange={(e) => setPkgForm({ ...pkgForm, package_name: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-slate-200 focus:outline-none transition-colors text-xs font-sans"
                          />
                        </div>

                        {/* Package Category */}
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1 text-xs">
                            Package Category <span className="text-rose-400">*</span>
                          </label>
                          <select
                            value={pkgForm.category}
                            onChange={(e) => setPkgForm({ ...pkgForm, category: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-slate-200 focus:outline-none transition-colors font-sans text-xs"
                          >
                            {categoriesList.filter(c => c !== 'CUSTOM_CATEGORY').map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="CUSTOM_CATEGORY">‚ûï Create Custom Category...</option>
                          </select>
                          {pkgForm.category === 'CUSTOM_CATEGORY' && (
                            <div className="animate-slide-down mt-2">
                              <label className="block text-amber-400 font-semibold mb-1 text-[11px]">New Custom Category Name</label>
                              <input
                                type="text"
                                placeholder="e.g. Newborn Baby shoot"
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                className="w-full bg-slate-950 border border-amber-500/40 focus:border-amber-500 rounded-xl py-2 px-3 text-slate-200 focus:outline-none font-sans text-xs"
                              />
                            </div>
                          )}
                        </div>

                        {/* Package Price */}
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1 text-xs">
                            Package Price (INR) <span className="text-rose-400">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">‚Çπ</span>
                            <input
                              type="number"
                              placeholder="e.g. 25000"
                              value={pkgForm.price || ''}
                              onChange={(e) => setPkgForm({ ...pkgForm, price: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 pl-7 pr-3 text-slate-200 focus:outline-none font-mono text-xs transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: TEAM MEMBERS INCLUDED */}
                    <div className="border-t border-slate-800/80 pt-4 space-y-3 w-full max-w-full">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] font-mono">
                          Team Members Included
                        </label>
                      </div>

                      {/* Column Header */}
                      <div className="flex items-center gap-2 sm:gap-3 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <div className="flex-1 min-w-0">Team Member Name / Role</div>
                        <div className="w-[60px] sm:w-[75px] text-center shrink-0">Qty</div>
                        <div className="w-9 sm:w-10 text-center shrink-0">Remove</div>
                      </div>

                      <div className="space-y-2.5 w-full max-w-full">
                        {pkgTeamMembers.map((member, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-2 sm:gap-3 w-full min-w-0 animate-fade-in"
                          >
                            {/* Member Name */}
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                placeholder="e.g. Candid Photographer"
                                value={member.name}
                                onChange={(e) => {
                                  const newList = [...pkgTeamMembers];
                                  newList[index] = { ...member, name: e.target.value };
                                  setPkgTeamMembers(newList);
                                }}
                                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-slate-200 focus:outline-none font-sans text-xs"
                              />
                            </div>

                            {/* Qty */}
                            <div className="w-[60px] sm:w-[75px] shrink-0">
                              <input
                                type="number"
                                min="1"
                                value={member.qty || 1}
                                onChange={(e) => {
                                  const newList = [...pkgTeamMembers];
                                  newList[index] = { ...member, qty: Math.max(1, parseInt(e.target.value) || 1) };
                                  setPkgTeamMembers(newList);
                                }}
                                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl py-2 px-1 text-xs font-mono font-bold text-center text-emerald-400 focus:outline-none"
                              />
                            </div>

                            {/* Remove */}
                            <div className="w-9 sm:w-10 shrink-0 flex justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = pkgTeamMembers.filter((_, idx) => idx !== index);
                                  setPkgTeamMembers(newList.length > 0 ? newList : [{ qty: 1, name: '' }]);
                                }}
                                className="w-9 h-9 sm:w-10 sm:h-10 text-slate-400 hover:text-rose-400 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                                title="Remove item"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPkgTeamMembers([...pkgTeamMembers, { qty: 1, name: '' }])}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add More</span>
                      </button>
                    </div>

                    {/* SECTION 3: DELIVERABLES */}
                    <div className="border-t border-slate-800/80 pt-4 space-y-3 w-full max-w-full">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px] font-mono">
                          Deliverables
                        </label>
                      </div>

                      {/* Column Header */}
                      <div className="flex items-center gap-2 sm:gap-3 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <div className="flex-1 min-w-0">Deliverable Name / Description</div>
                        <div className="w-[60px] sm:w-[75px] text-center shrink-0">Qty</div>
                        <div className="w-9 sm:w-10 text-center shrink-0">Remove</div>
                      </div>

                      <div className="space-y-2.5 w-full max-w-full">
                        {pkgDeliverablesList.map((del, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-2 sm:gap-3 w-full min-w-0 animate-fade-in"
                          >
                            {/* Deliverable Name */}
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                placeholder="e.g. Traditional 30 Edited Photos"
                                value={del.name}
                                onChange={(e) => {
                                  const newList = [...pkgDeliverablesList];
                                  newList[index] = { ...del, name: e.target.value };
                                  setPkgDeliverablesList(newList);
                                  setPkgForm({ ...pkgForm, deliverables: JSON.stringify(newList) });
                                }}
                                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-2 px-3 text-slate-200 focus:outline-none font-sans text-xs"
                              />
                            </div>

                            {/* Qty */}
                            <div className="w-[60px] sm:w-[75px] shrink-0">
                              <input
                                type="number"
                                min="1"
                                value={del.qty || 1}
                                onChange={(e) => {
                                  const newList = [...pkgDeliverablesList];
                                  newList[index] = { ...del, qty: Math.max(1, parseInt(e.target.value) || 1) };
                                  setPkgDeliverablesList(newList);
                                  setPkgForm({ ...pkgForm, deliverables: JSON.stringify(newList) });
                                }}
                                className="w-full bg-slate-950 border border-slate-750 focus:border-emerald-500 rounded-xl py-2 px-1 text-xs font-mono font-bold text-center text-emerald-400 focus:outline-none"
                              />
                            </div>

                            {/* Remove */}
                            <div className="w-9 sm:w-10 shrink-0 flex justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = pkgDeliverablesList.filter((_, idx) => idx !== index);
                                  const updatedList = newList.length > 0 ? newList : [{ qty: 1, name: '' }];
                                  setPkgDeliverablesList(updatedList);
                                  setPkgForm({ ...pkgForm, deliverables: JSON.stringify(updatedList) });
                                }}
                                className="w-9 h-9 sm:w-10 sm:h-10 text-slate-400 hover:text-rose-400 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/30 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                                title="Remove item"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPkgDeliverablesList([...pkgDeliverablesList, { qty: 1, name: '' }])}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add More</span>
                      </button>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-slate-800 shrink-0 bg-slate-900 z-10">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddFormOpen(false);
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
                        setPkgTeamMembers([{ qty: 1, name: '' }]);
                        setPkgDeliverablesList([{ qty: 1, name: '' }]);
                        setPkgDeliverableInput('');
                        setCustomCategory('');
                      }}
                      className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer font-medium border border-transparent"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!pkgForm.package_name.trim()) {
                           alert('Please supply a package name.');
                          return;
                        }
                        if (pkgForm.price <= 0) {
                          alert('Please enter a valid price greater than zero.');
                          return;
                        }

                        let resolvedCategory = pkgForm.category;
                        if (resolvedCategory === 'CUSTOM_CATEGORY') {
                          if (!customCategory.trim()) {
                            alert('Please enter a valid custom category name.');
                            return;
                          }
                          resolvedCategory = customCategory.trim();
                        }
                        
                        const filteredMembers = pkgTeamMembers.filter(item => item.name.trim() !== '');
                        const teamMembersStr = filteredMembers.length > 0 ? JSON.stringify(filteredMembers) : '';
                        
                        const filteredDeliverables = pkgDeliverablesList.filter(item => item.name.trim() !== '');
                        const deliverablesStr = filteredDeliverables.length > 0 ? JSON.stringify(filteredDeliverables) : '';
                        
                        const payload = {
                          ...pkgForm,
                          team_members: teamMembersStr,
                          deliverables: deliverablesStr,
                          category: resolvedCategory
                        };
                        
                        try {
                          setIsSaving(true);
                          if (editingPackage) {
                            await updatePackage(editingPackage.package_id, payload);
                          } else {
                            await addPackage(payload);
                          }
                          setIsAddFormOpen(false);
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
                          setPkgTeamMembers([{ qty: 1, name: '' }]);
                          setPkgDeliverablesList([{ qty: 1, name: '' }]);
                          setCustomCategory('');
                        } catch (err: any) {
                          alert(`Failed to save package: ${err.message || err}`);
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving}
                      className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all cursor-pointer border border-transparent disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      {isSaving ? 'Saving...' : 'Save Package'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Multi-Search & Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
              {/* Search Package Field */}
              <div className="relative w-full">
                <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-tight">Search Package</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search package name..."
                    value={catSearchQuery}
                    onChange={(e) => setCatSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-8 pr-4 text-xs text-slate-250 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  {catSearchQuery && (
                    <button
                      onClick={() => setCatSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter by Category selection */}
              <div className="w-full">
                <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-tight font-sans">Filter by Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-250 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Categories ({categoriesList.length})</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Filter by Status selection */}
              <div className="w-full">
                <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-tight font-sans">Filter by Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-250 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active Packages Only</option>
                  <option value="Inactive">Inactive Packages Only</option>
                </select>
              </div>
            </div>

            {/* Category Listing Grid */}
            <div className="space-y-6">
              {categoriesList.map((cat) => {
                // Respect category filter
                if (categoryFilter !== 'All' && cat !== categoryFilter) return null;

                const catPkgs = (packages || []).filter(
                  p => normalizeCategory(p.category) === cat && 
                  p.package_name.toLowerCase().includes(catSearchQuery.toLowerCase()) &&
                  (statusFilter === 'All' || p.status === statusFilter)
                );
                
                if (catPkgs.length === 0) return null;
                
                return (
                  <div key={cat} className="space-y-2.5 text-left animate-fade-in">
                    <h4 className="text-[10px] font-black font-mono tracking-wider text-slate-400 border-b border-slate-800 pb-1 uppercase flex justify-between items-center bg-slate-950/20 px-2 py-1 rounded">
                      <span>{cat}</span>
                      <span className="text-slate-500 font-mono">({catPkgs.length})</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {catPkgs.map((pkg) => (
                        <div
                          key={pkg.package_id}
                          className="bg-slate-955 border border-slate-850 p-4 rounded-xl flex flex-col justify-between hover:border-slate-800 transition-all space-y-4 hover:shadow-lg relative group"
                        >
                          <div className="space-y-1.5 text-left">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[9px] text-slate-500 font-bold uppercase">{pkg.package_id}</span>
                              <span className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded ${
                                pkg.status === 'Active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              }`}>
                                {pkg.status}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-slate-100 leading-tight">{pkg.package_name}</h5>
                            <p className="text-[11px] text-slate-400 break-words leading-snug">
                              {pkg.deliverables || 'No custom deliverables specified'}
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 pt-2.5 border-t border-slate-900/80">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-emerald-400">‚Çπ{pkg.price.toLocaleString('en-IN')}</span>
                            </div>
                            
                            {canEdit && (
                              <div className="grid grid-cols-3 gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPackage(pkg);
                                    setPkgForm({
                                      package_name: pkg.package_name,
                                      category: pkg.category,
                                      price: pkg.price,
                                      status: pkg.status as 'Active' | 'Inactive',
                                      deliverables: pkg.deliverables || '',
                                      team_members: pkg.team_members || '',
                                      seasonal_offer: pkg.seasonal_offer || '',
                                      terms_conditions: pkg.terms_conditions || '',
                                      event_type: pkg.event_type || '',
                                      duration: pkg.duration || '',
                                      package_includes: pkg.package_includes || ''
                                    });
                                    const parsed = parseTeamMembers(pkg.team_members);
                                    setPkgTeamMembers(parsed.length > 0 ? parsed.map(s => { const r = parseQtyAndText(s); return { qty: r.qty, name: r.text }; }) : [{ qty: 1, name: '' }]);
                                    const parsedDel = parseTeamMembers(pkg.deliverables);
                                    setPkgDeliverablesList(parsedDel.length > 0 ? parsedDel.map(s => { const r = parseQtyAndText(s); return { qty: r.qty, name: r.text }; }) : []);
                                    setCustomCategory('');
                                    setIsAddFormOpen(true);
                                  }}
                                  className="py-1 px-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] uppercase font-mono tracking-tight font-bold border border-slate-800 hover:border-slate-700 rounded transition-all cursor-pointer text-center"
                                  title="Edit package details"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextStatus = pkg.status === 'Active' ? 'Inactive' : 'Active';
                                    await updatePackage(pkg.package_id, { status: nextStatus });
                                  }}
                                  className={`py-1 px-1 text-center text-[10px] uppercase font-mono tracking-tight font-bold border rounded transition-all cursor-pointer ${
                                    pkg.status === 'Active'
                                      ? 'bg-amber-500/10 border-amber-550/20 text-amber-500 hover:bg-amber-500/20'
                                      : 'bg-emerald-500/10 border-emerald-555/20 text-emerald-400 hover:bg-emerald-500/20'
                                  }`}
                                  title={pkg.status === 'Active' ? "Deactivate Package" : "Activate Package"}
                                >
                                  {pkg.status === 'Active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingPackageId(pkg.package_id);
                                  }}
                                  className="py-1 px-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-350 text-[10px] uppercase font-mono tracking-tight font-bold rounded transition-all cursor-pointer text-center"
                                  title="Delete Package"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === 'create' ? (
          /* SCREEN 2: Create Lead Layout as dedicated Full Page inside the application */
          <div 
            id="create_lead_form"
            className="bg-[#030303] border border-slate-800 rounded-2xl w-full shadow-2xl flex flex-col overflow-hidden relative h-[calc(100vh-220px)] min-h-[500px]"
          >
            <button 
              type="button"
              onClick={() => { resetForm(); setActiveTab('list'); }}
              className="absolute top-2 right-3 z-20 p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-slate-700/50 bg-slate-950/80"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {crmToast && (
              <div id="crm-create-toast-container" className={`mx-4 mt-4 p-3 rounded-xl shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 shrink-0 ${
                crmToast.type === 'success' 
                  ? 'bg-emerald-950/90 border border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-950/90 border border-red-500/20 text-red-400'
              }`}>
                <span>{crmToast.type === 'success' ? '‚ö°' : '‚ö†Ô∏è'}</span>
                <span className="text-[11px] font-mono font-bold whitespace-pre-wrap">{crmToast.message}</span>
              </div>
            )}

            {/* Wizard Progress Bar */}
            <div className="bg-slate-955/30 px-4 sm:px-6 py-1.5 border-b border-slate-800/50 shrink-0">
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                {[
                  { step: 1, label: 'Customer' },
                  { step: 2, label: 'Event Info' },
                  { step: 3, label: 'CRM & Quotation' }
                ].map((item) => {
                  const isActive = wizardStep === item.step;
                  const isCompleted = wizardStep > item.step;
                  return (
                    <div key={item.step} className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1">
                      <div className="w-full flex items-center gap-1">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all duration-300 ${
                          isActive 
                            ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/10' 
                            : isCompleted 
                              ? 'bg-emerald-500 text-slate-955' 
                              : 'bg-slate-800 text-slate-500'
                        }`}>
                          {isCompleted ? '‚úì' : item.step}
                        </span>
                        <div className={`hidden sm:block flex-1 h-0.5 rounded transition-all duration-300 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-slate-800'
                        }`} />
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                        isActive ? 'text-cyan-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Body: Content Fields */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              
              {/* STEP 1: CUSTOMER DETAILS */}
              {wizardStep === 1 && (
                <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4 space-y-4 shadow-sm animate-fade-in">
                  <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1">
                    <Users className="w-4 h-4 text-cyan-405" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">1. Customer Details</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Customer Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-404 mb-1.5">
                        Customer Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={createForm.customer_name}
                        onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
                      />
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-404 mb-1.5">
                        Mobile Number *
                      </label>
                      <input
                        id="input_mobile"
                        type="text"
                        required
                        placeholder="e.g. 9876543210"
                        value={createForm.mobile}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
                          setCreateForm({ ...createForm, mobile: val });
                          if (val.length === 10) {
                            handleCheckExistingCustomer('phone', val);
                          }
                        }}
                        onBlur={(e) => handleCheckExistingCustomer('phone', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                      />
                    </div>

                    {/* WhatsApp Number */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-404">
                          WhatsApp Number
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (createForm.mobile) {
                              setCreateForm(prev => ({ ...prev, whatsapp_number: prev.mobile }));
                            }
                          }}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider cursor-pointer hover:underline"
                        >
                          Copy Mobile
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="WhatsApp contact number"
                        value={createForm.whatsapp_number}
                        onChange={(e) => setCreateForm({ ...createForm, whatsapp_number: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-404 mb-1.5">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="customer@domain.com"
                        value={createForm.email}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreateForm({ ...createForm, email: val });
                          if (val.includes('@') && val.length > 5 && (val.endsWith('.com') || val.endsWith('.in') || val.endsWith('.org'))) {
                            handleCheckExistingCustomer('email', val);
                          }
                        }}
                        onBlur={(e) => handleCheckExistingCustomer('email', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
                      />
                    </div>

                    {/* Lead Source */}
                    <div className="space-y-2 text-left">
                      <div>
                        <label className="block text-xs font-semibold text-slate-404 mb-1.5">
                          Inbound Lead Channel Source *
                        </label>
                        <select
                          value={createForm.lead_source}
                          required
                          onChange={(e) => setCreateForm({ ...createForm, lead_source: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all cursor-pointer"
                        >
                          <option value="">Select Lead Source</option>
                          {LEAD_SOURCES.map(source => (
                            <option key={source} value={source}>{source}</option>
                          ))}
                        </select>
                      </div>
                      {createForm.lead_source === 'Other' && (
                        <div className="animate-fade-in-down">
                          <label className="block text-xs font-mono font-bold text-amber-500 mb-1.5">
                            Specify Custom Lead Source Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Billboard, Event Flyer"
                            value={otherSource}
                            onChange={(e) => setOtherSource(e.target.value)}
                            className="w-full bg-slate-955 border border-amber-500/50 rounded-lg py-2 px-3 text-xs text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                          />
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* STEP 2: EVENT DETAILS */}
              {wizardStep === 2 && (
                <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4.5 space-y-4 shadow-sm animate-fade-in text-left">
                  <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1 text-left">
                    <Calendar className="w-4 h-4 text-cyan-405" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">2. Event Details</span>
                  </div>

                  {renderEventDetailsSection(false)}
                </div>
              )}

              {/* STEP 3: PACKAGE SELECTION */}
              {wizardStep === 3 && (
                <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4.5 space-y-4 shadow-sm animate-fade-in text-left">
                  <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1">
                    <CheckSquare className="w-4 h-4 text-cyan-405" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">3. Package Selection</span>
                  </div>

                  {renderStep3Workspace(false)}
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex justify-between items-center gap-3 border-t border-slate-800/80 py-2 px-4 sm:px-5 bg-slate-950/40 backdrop-blur-md shrink-0">
              {/* Back or Cancel */}
              <div className="flex items-center gap-2">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-4.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl cursor-pointer border border-slate-850 hover:border-slate-700 transition-colors"
                  >
                    ‚Üê Back Step
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { resetForm(); setActiveTab('list'); }}
                    className="px-4.5 py-2 text-xs font-semibold bg-slate-805 hover:bg-slate-800 text-slate-300 rounded-xl cursor-pointer border border-slate-800 hover:border-slate-700/50 transition-colors"
                  >
                    Back
                  </button>
                )}
                {wizardStep === 2 && (!createdLeadId || leads.find(l => l.lead_id === createdLeadId)?.status === 'New Lead') && (
                  <div />
                )}
              </div>

              {/* Next or Save */}
              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={handleWizardNext}
                  disabled={isSaving || (wizardStep === 3 && selectedPkgIds.length === 0)}
                  className={`px-5.5 py-2 text-xs font-bold text-white rounded-xl shadow-lg border border-transparent transition-colors flex items-center gap-1.5 ${
                    wizardStep === 3 && selectedPkgIds.length === 0
                      ? 'bg-slate-800 text-slate-500 border border-slate-850 cursor-not-allowed opacity-50 shadow-none'
                      : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/10 cursor-pointer'
                  }`}
                >
                  {isSaving ? 'Processing...' : 'Save & Continue ‚Üí'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    if (salesStatus === 'Order Confirmed') {
                      handleOrderConfirmedSubmit(e);
                    } else {
                      handleStatusSave();
                    }
                  }}
                  disabled={isSaving}
                  className="px-5.5 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer border border-transparent transition-colors flex items-center gap-1.5"
                >
                  {isSaving ? 'Saving...' : salesStatus === 'Order Confirmed' ? 'üéâ Confirm Order & Transition' : '‚úçÔ∏è Create Quotation'}
                </button>
              )}
            </div>
          </div>
        ) : (
        /* SCREEN 1: Lead List datagrid */
        <div className="space-y-4">

          {/* Sales Performance Dashboard Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-2">
            {[
              { label: 'Create Quote', val: statCreatedQuotation, theme: 'blue' as CameraLensTheme, filterValue: 'Create Quote', chartPoints: [10, 15, 12, 18, 14, 20, 16], trendText: 'Initial Lead' },

              { label: 'Quote Sent', val: statQuotesSent, theme: 'purple' as CameraLensTheme, filterValue: 'Quote Sxú¨WÎo‚8ˇﬁøb‘[- ^Öm∑[z™ÿ]È§^ªw≠ˆÀ™Íöƒ´∆Œ≈èc˘ﬂoÏ$4‰Å⁄£Hg<ûôﬂº<P°kMp}Íoí	≠Œ·G∑◊ÑÓ~MËôıG|ˆÒ€}hÇ©ÓÈRüCÌØHj¢ô5ÿ4è`Á≥N∆î'\æJŒÂ¬âT7'HWx‘n≈;Q†P∏OgèL%˜j@å»åÜ‰ö
uo∂ö0a\”;·-Ωã0	ñn'∆“ÌÁp‹π>ı"N=˝˝Á^,#)&,ú¡mË—0ã$Ÿ†û›…@qWDºJ^Ú.êÇÈi¢ìGr/·6@5&(j/íkJ<∏ñJgQ¢°=õ“"+m◊rÃ4ˆ§	ßMÿP‰mæÍH0ΩÇó hÃ˛–öë†^wIË5ÅyÀ/°û√vÒl„bQ#‰Œ± <—’pç6ÖÎò·⁄ËhŸuë˝î0‡™∏m}ñ0ÿuëEägÓ”p]∑’_≠ç¡ë≤ [œœ±j1uÂj6Guìå áêR<úâPbnÜRÇ+Vä-}œ≥∂/wçª/⁄õ_e)H ó•n0r√„Ò‘˘ó	◊˘ÿÈ¿Xö:H1˘…°åÑG=ß∑‰ Á4úò¬˜ôÁQ 'æô≠ôv˙«ª∆‰ïmO/iô„F~M∆úfO,úIƒ9hÓp:—ÒJÕ‚ß5ÒM\¯LSó:B.BD·æ)ò2ÏÉN{ê¬w∆X]KQÄeÓE1:ƒ}bbÍ,òÒÿ≥1ÉNßDµQñë≠UYìÇ•”á`Âú¿D
Ì`oc—Ï¯“ñ˙ü/⁄⁄?DÃ(RZbΩ*ÁÀúb“*Âõ/=T÷‡Ù`!W3Lq}òî8	B6ı5
tÌeP%È%È`∏1Œeô;ñﬁ*k÷&û≥Çdë¶*¶qi˙%ãz&ëT‹ÿ9.K{z™4å∑·kôüGÊ¡Ø_`ﬂô∑…⁄„õ >OÎ…“Îò"äG8Æ‰2T0≈VRVö©FØ‘Àï÷º»ä"Ö‹mÆ6[◊+ ôe≠÷h)º,h/¸çÕE€(®4∏≠K¢µL1e¨m›äæëÑœöË&’˚(HŸ5˜ˇmzçÉS∑fb(®guZÉÙ≤»ıgF¬%86Œ»“Y8?∫ÉN∞|ÿ£7≈LMßy‘´Ä⁄‹¥ØjU»ˆ7è÷3åæâPl‘Léèrjõ∑ˆx<Uò´ﬁéáë¶·C„åò∏M‹¯uìüƒù´£4ê˚r4Æ+çˇN¯#±uk„?Èñd£ó–Åﬂ·ÁªwØ:Ül◊“%úﬁÈoﬂzcÛŒmﬁ<ÊI#Ø”8“Zä=	\;Ô(ßÆéõp‹~´svls∫XZŸˆä„ nœ=MÁî4Yì}K≥„—si˙2¶ñí°òYîÜ«{å“Ls4Ë;£¯L5a\U≥Ô+Ôã/´‹†◊»Í<6—åù˛˙L/øpÛ”r˙…›ñúä) fÃÔ¿˚˜’˜ÂﬁLì¸õ”p}∫)À∫≥8x.5x¡<n§-ÖÂä°mΩù[ä^AV3Ñ&ˆ∂Ÿsc¸Ø£í∞Û∫’ï°nóçOGõOGˇ  ˇˇ ∆ç⁄