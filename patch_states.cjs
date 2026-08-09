const fs = require('fs');
let content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const statesToAdd = `
  // Missing UI States
  const [activeWorkflowProd, setActiveWorkflowProd] = useState<any | null>(null);
  const [workflowActionType, setWorkflowActionType] = useState<string | null>(null);
  const [wfError, setWfError] = useState('');
  const [wfSuccess, setWfSuccess] = useState('');
  const [wfTargetDeliveryDate, setWfTargetDeliveryDate] = useState('');
  const [wfDeliverableAssignments, setWfDeliverableAssignments] = useState<any[]>([]);
  const [wfProjectNotes, setWfProjectNotes] = useState('');
  const [wfSelectedEventId, setWfSelectedEventId] = useState<string | null>(null);
  const [wfPriority, setWfPriority] = useState('');
  const [wfEditor, setWfEditor] = useState('');
  const [wfDeliveryNotes, setWfDeliveryNotes] = useState('');
  const [wfReviewLink, setWfReviewLink] = useState('');
  const [wfReviewNotes, setWfReviewNotes] = useState('');
  const [wfRevisionDeadline, setWfRevisionDeadline] = useState('');
  const [wfRevisionNotes, setWfRevisionNotes] = useState('');
  const [wfDeliveryLink, setWfDeliveryLink] = useState('');
  const [wfDownloadLink, setWfDownloadLink] = useState('');
  const [wfGoogleDriveLink, setWfGoogleDriveLink] = useState('');
  const [wfPreviewLink, setWfPreviewLink] = useState('');
  const [wfInternalComments, setWfInternalComments] = useState('');
  const [selectedWfEditor, setSelectedWfEditor] = useState('');
  const [selectedWfStaffByDeliverable, setSelectedWfStaffByDeliverable] = useState<any>({});
  const [wfStaffTypeByDeliverable, setWfStaffTypeByDeliverable] = useState<any>({});

  const [addStaffError, setAddStaffError] = useState('');
  const [addStaffSuccess, setAddStaffSuccess] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [assignedEditorsModalProd, setAssignedEditorsModalProd] = useState<any | null>(null);
  const [assignRoleFilter, setAssignRoleFilter] = useState('All');
  
  const [caChecklist, setCaChecklist] = useState<any>({});
  const [caChecklistCompleted, setCaChecklistCompleted] = useState(false);
  const [caCommunicationProof, setCaCommunicationProof] = useState<File | null>(null);
  const [caInternalValidation, setCaInternalValidation] = useState(false);
  const [caUploadingProof, setCaUploadingProof] = useState(false);
  const [clientAcceptanceProd, setClientAcceptanceProd] = useState<any | null>(null);
  const [closingNotes, setClosingNotes] = useState('');
  
  const [crewSearch, setCrewSearch] = useState('');
  const [crewStatusFilter, setCrewStatusFilter] = useState('All');
  const [customDeliverables, setCustomDeliverables] = useState('');
  const [customerReviewMessage, setCustomerReviewMessage] = useState('');
  const [customerReviewPhone, setCustomerReviewPhone] = useState('');
  const [customerReviewResendProd, setCustomerReviewResendProd] = useState<any | null>(null);
  
  const [deliverableStaffRows, setDeliverableStaffRows] = useState<any[]>([]);
  const [deliverablesTargetDates, setDeliverablesTargetDates] = useState<any>({});
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryLink, setDeliveryLink] = useState('');
  const [dossierError, setDossierError] = useState('');
  const [dossierSuccessMessage, setDossierSuccessMessage] = useState('');
  
  const [editedStaffMobiles, setEditedStaffMobiles] = useState<any>({});
  const [editingStaffId, setEditingStaffId] = useState('');
  const [editorWhatsappData, setEditorWhatsappData] = useState<any | null>(null);
  const [editorWhatsappError, setEditorWhatsappError] = useState('');
  const [editorWhatsappModalOpen, setEditorWhatsappModalOpen] = useState(false);
  const [editorWhatsappProdId, setEditorWhatsappProdId] = useState('');
  const [isSavingDossier, setIsSavingDossier] = useState(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [lastModalProdId, setLastModalProdId] = useState('');
  
  const [leadActualDeliveryDate, setLeadActualDeliveryDate] = useState('');
  const [leadClientApprovalDate, setLeadClientApprovalDate] = useState('');
  const [leadClientReviewDate, setLeadClientReviewDate] = useState('');
  const [leadEditor, setLeadEditor] = useState('');
  const [leadExpectedDeliveryDate, setLeadExpectedDeliveryDate] = useState('');
  const [leadFootageStatus, setLeadFootageStatus] = useState('');
  const [leadPriority, setLeadPriority] = useState('');
  const [leadProdStatus, setLeadProdStatus] = useState('');
  const [leadRawFootageDate, setLeadRawFootageDate] = useState('');
  const [leadRemarks, setLeadRemarks] = useState('');
  const [leadStaff, setLeadStaff] = useState('');
  const [leadStartDate, setLeadStartDate] = useState('');
  const [leadTargetDeliveryDate, setLeadTargetDeliveryDate] = useState('');
  
  const [newSkillText, setNewSkillText] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffMobile, setNewStaffMobile] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffSkills, setNewStaffSkills] = useState('');
  const [newStaffType, setNewStaffType] = useState('In-House');
  const [newStaffWhatsapp, setNewStaffWhatsapp] = useState('');
  
  const [previewStaffMessage, setPreviewStaffMessage] = useState('');
  const [qcNotes, setQcNotes] = useState('');
  const [reviewLink, setReviewLink] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [revisionComments, setRevisionComments] = useState('');
  const [revisionDeadline, setRevisionDeadline] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterStaffName, setRosterStaffName] = useState('');
  const [rosterStatusFilter, setRosterStatusFilter] = useState('All');
  
  const [selectedEditors, setSelectedEditors] = useState<string[]>([]);
  const [selectedLeadProd, setSelectedLeadProd] = useState<any | null>(null);
  const [selectedStage, setSelectedStage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [whatsappShareModalOpen, setWhatsappShareModalOpen] = useState(false);
  const [whatsappShareData, setWhatsappShareData] = useState<any | null>(null);
`;

const insertMarker = "const getProductionStatus = (prod: Production): string => {";

if (content.includes(insertMarker)) {
  content = content.replace(insertMarker, statesToAdd + "\n  " + insertMarker);
  fs.writeFileSync('src/components/ProductionModule.tsx', content);
  console.log("Successfully patched missing states!");
} else {
  console.log("Could not find insert marker.");
}
