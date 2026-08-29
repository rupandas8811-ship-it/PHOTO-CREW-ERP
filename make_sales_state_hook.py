import re
import os

with open('src/components/SalesModule.tsx', 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8', errors='ignore')
lines = text.split('\n')

hook_imports = """import React, { useState, useEffect, useRef } from 'react';
import { useRole, mapUserFieldsFromDb, INITIAL_PACKAGES, getStatusRank, isFollowUpDateTimeReached } from '../RoleContext';
import { supabaseClient } from '../../supabaseClient';
import { Lead, CurrentStage, LeadPackage, EVENT_TYPES, PACKAGE_CATEGORIES, ACTIVE_STAGE_GROUPS, LeadEvent } from '../../types';
import { formatINR, formatIndianPhoneNumber, validateIndianMobile, formatTime12Hour, getCustomers, triggerAutoScrollAndFocus, normalizeCategory, parseTeamMembers, formatQtyItem, formatQtyArray, formatQtyList, formatDateDDMMYY } from '../../utils';
import { jsPDF } from 'jspdf';
import { SHOOT_TYPES, LocalEditableInput, parseQtyAndText, combineQtyAndText, formatListToStructuredObjects, buildStep3EventPayloads, parseTeamMembersJsonToRecord, parseDeliverablesJsonToRecord, CompactQtyItemRowProps, CompactQtyItemRow, validateAndFormatTime, getLogoBase64FromUrl, generateQuotationPdfFileName, generateQuotationPDF, highlightText, LEAD_SOURCES, SalesModuleProps } from '../SalesUtils';
import { ListSortFilter, SortOrder } from '../ui/ListSortFilter';
"""

# Lines 1937 to 9599 is the body of state & logic
body_lines = lines[1936:9599]
body = '\n'.join(body_lines)

# Transform header
body = re.sub(
    r'export const SalesModule:\s*React\.FC<SalesModuleProps>\s*=\s*\(\{\s*activeSubTab:\s*externalActiveTab,\s*setActiveSubTab:\s*externalSetActiveTab\s*\}\)\s*=>\s*\{',
    'export const useSalesDashboardState = (externalActiveTab?: string, externalSetActiveTab?: (tab: any) => void) => {',
    body,
    count=1
)

# Apply Fix 1: quotation_amount in hook calculations
body = re.sub(
    r'quotation_amount:\s*Number\(lead\.Final_Package_Amount\).*?\|\|\s*0,',
    r'quotation_amount: Number(lead.Final_Quotation_Amount) || Number((lead as any).final_quotation_amount) || Number(lead.Final_Package_Amount) || Number((lead as any).final_package_amount) || Number((lead as any).final_amount) || (lead.lead_id === selectedLead?.lead_id ? Number(wizardLeadData.final_amount) : 0) || 0,',
    body
)

body = re.sub(
    r'quotation_amount:\s*Number\(selectedLead\.Final_Package_Amount\).*?\|\|\s*0,',
    r'quotation_amount: Number(selectedLead.Final_Quotation_Amount) || Number(selectedLead.Final_Package_Amount) || Number((selectedLead as any).final_package_amount) || Number((selectedLead as any).final_amount) || Number(wizardLeadData.final_amount) || 0,',
    body
)

body = re.sub(
    r'quotation_amount:\s*Number\(updatedLead\.Final_Package_Amount\).*?\|\|\s*prev\.quotation_amount\s*\|\|\s*0,',
    r'quotation_amount: Number(updatedLead.Final_Quotation_Amount) || Number(updatedLead.Final_Package_Amount) || Number((updatedLead as any).final_package_amount) || Number((updatedLead as any).final_amount) || Number(updatedLead.budget) || (updatedLead.lead_id === selectedLead?.lead_id ? Number(wizardLeadData.final_amount) : 0) || prev.quotation_amount || 0,',
    body
)

# Find all defined variable and function names in body
names = set(re.findall(r'(?:const|let|var)\s+(\w+)\s*=', body))
destructured = re.findall(r'const\s*\{\s*([^}]+)\s*\}\s*=', body)
for d in destructured:
    for item in d.split(','):
        n = item.strip().split(':')[0].strip()
        if n and re.match(r'^[a-zA-Z_$][a-zA-Z0-9_$]*$', n):
            names.add(n)

array_destructured = re.findall(r'const\s*\[\s*([^\]]+)\s*\]\s*=', body)
for a in array_destructured:
    for item in a.split(','):
        n = item.strip()
        if n and re.match(r'^[a-zA-Z_$][a-zA-Z0-9_$]*$', n):
            names.add(n)

# Filter out JS keywords and invalid tokens
invalid = {'true', 'false', 'null', 'undefined', 'async', 'function', 'class', 'let', 'const', 'var', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'return', 'import', 'export', 'from', 'as', 'new', 'this', 'typeof', 'instanceof', 'void', 'delete', 'in', 'of', 'try', 'catch', 'finally', 'throw'}
valid_names = sorted([n for n in names if n not in invalid and not n.startswith('_')])

return_stmt = "  return {\n" + ",\n".join([f"    {n}" for n in valid_names]) + "\n  };\n};\n"

full_hook_code = hook_imports + "\n" + body + "\n" + return_stmt

with open('src/components/sales/useSalesDashboardState.ts', 'w', encoding='utf-8') as f:
    f.write(full_hook_code)

print(f"useSalesDashboardState.ts generated successfully with {len(full_hook_code.splitlines())} lines.")
