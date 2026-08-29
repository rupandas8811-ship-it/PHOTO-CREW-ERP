import re
import os

with open('src/components/SalesModule.tsx', 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8', errors='ignore')
lines = text.split('\n')

# 1. First, create src/components/sales/useSalesDashboardState.ts
# This file will export the hook `useSalesDashboardState(externalActiveTab, externalSetActiveTab)`
# which runs all the state, database hooks, computations, and handlers.

hook_imports = """import React, { useState, useEffect, useRef } from 'react';
import { useRole, mapUserFieldsFromDb, INITIAL_PACKAGES, getStatusRank, isFollowUpDateTimeReached } from '../RoleContext';
import { supabaseClient } from '../../supabaseClient';
import { Lead, CurrentStage, LeadPackage, EVENT_TYPES, PACKAGE_CATEGORIES, ACTIVE_STAGE_GROUPS, LeadEvent } from '../../types';
import { formatINR, formatIndianPhoneNumber, validateIndianMobile, formatTime12Hour, getCustomers, triggerAutoScrollAndFocus, normalizeCategory, parseTeamMembers, formatQtyItem, formatQtyArray, formatQtyList, formatDateDDMMYY } from '../../utils';
import { jsPDF } from 'jspdf';
import { SHOOT_TYPES, LocalEditableInput, parseQtyAndText, combineQtyAndText, formatListToStructuredObjects, buildStep3EventPayloads, parseTeamMembersJsonToRecord, parseDeliverablesJsonToRecord, CompactQtyItemRowProps, CompactQtyItemRow, validateAndFormatTime, getLogoBase64FromUrl, generateQuotationPdfFileName, generateQuotationPDF, highlightText, LEAD_SOURCES, SalesModuleProps } from '../SalesUtils';
import { ListSortFilter, SortOrder } from '../ui/ListSortFilter';
"""

# Extract lines from 1937 to 9599
hook_body_lines = lines[1936:9599]
hook_body = '\n'.join(hook_body_lines)

# Transform component definition into hook definition:
# export const SalesModule: React.FC<SalesModuleProps> = ({ activeSubTab: externalActiveTab, setActiveSubTab: externalSetActiveTab }) => {
# -> export const useSalesDashboardState = (externalActiveTab?: string, externalSetActiveTab?: (tab: any) => void) => {

hook_body = re.sub(
    r'export const SalesModule:\s*React\.FC<SalesModuleProps>\s*=\s*\(\{\s*activeSubTab:\s*externalActiveTab,\s*setActiveSubTab:\s*externalSetActiveTab\s*\}\)\s*=>\s*\{',
    'export const useSalesDashboardState = (externalActiveTab?: string, externalSetActiveTab?: (tab: any) => void) => {',
    hook_body,
    count=1
)

# Apply Fix: quotation_amount resolution in hook handlers
hook_body = re.sub(
    r'quotation_amount:\s*Number\(lead\.Final_Package_Amount\).*?\|\|\s*0,',
    r'quotation_amount: Number(lead.Final_Quotation_Amount) || Number((lead as any).final_quotation_amount) || Number(lead.Final_Package_Amount) || Number((lead as any).final_package_amount) || Number((lead as any).final_amount) || (lead.lead_id === selectedLead?.lead_id ? Number(wizardLeadData.final_amount) : 0) || 0,',
    hook_body
)

hook_body = re.sub(
    r'quotation_amount:\s*Number\(selectedLead\.Final_Package_Amount\).*?\|\|\s*0,',
    r'quotation_amount: Number(selectedLead.Final_Quotation_Amount) || Number(selectedLead.Final_Package_Amount) || Number((selectedLead as any).final_package_amount) || Number((selectedLead as any).final_amount) || Number(wizardLeadData.final_amount) || 0,',
    hook_body
)

hook_body = re.sub(
    r'quotation_amount:\s*Number\(updatedLead\.Final_Package_Amount\).*?\|\|\s*prev\.quotation_amount\s*\|\|\s*0,',
    r'quotation_amount: Number(updatedLead.Final_Quotation_Amount) || Number(updatedLead.Final_Package_Amount) || Number((updatedLead as any).final_package_amount) || Number((updatedLead as any).final_amount) || Number(updatedLead.budget) || (updatedLead.lead_id === selectedLead?.lead_id ? Number(wizardLeadData.final_amount) : 0) || prev.quotation_amount || 0,',
    hook_body
)

# Collect all state variables & functions to return from the hook
# We will inspect everything defined in the hook and return a comprehensive state object.
# Let's inspect variables.

print("useSalesDashboardState parsed.")
