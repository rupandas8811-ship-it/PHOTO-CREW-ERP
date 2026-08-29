import React from 'react';
import { Trash2, Plus, Check, X } from 'lucide-react';

interface LocalEditableInputProps {
  value: string;
  disabled?: boolean;
  onChange: (val: string) => void;
  className?: string;
  list?: string;
  placeholder?: string;
  options?: string[];
}

export const LocalEditableInput: React.FC<LocalEditableInputProps> = ({ value, disabled, onChange, className, list, placeholder, options }) => {
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

export function parseQtyAndText(raw: any): { qty: number; text: string } {
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

export function combineQtyAndText(qty: number | string, text: string): string {
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

export const CompactQtyItemRow: React.FC<CompactQtyItemRowProps> = ({
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

