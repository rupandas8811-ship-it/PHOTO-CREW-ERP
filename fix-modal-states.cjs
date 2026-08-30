const fs = require('fs');
let code = fs.readFileSync('src/components/production/ProductionWorkflowModal.tsx', 'utf8');

const missingStates = `
  const [deliverableStaffRows, setDeliverableStaffRows] = useState<Record<string, any[]>>({});
  const [wfReviewLink, setWfReviewLink] = useState('');
  const [wfPreviewLink, setWfPreviewLink] = useState('');
  const [wfReviewNotes, setWfReviewNotes] = useState('');
  const [wfRevisionNotes, setWfRevisionNotes] = useState('');
  const [wfRevisionDeadline, setWfRevisionDeadline] = useState('');
  const [wfDeliveryLink, setWfDeliveryLink] = useState('');
  const [wfGoogleDriveLink, setWfGoogleDriveLink] = useState('');
  const [wfDownloadLink, setWfDownloadLink] = useState('');
  const [wfDeliveryNotes, setWfDeliveryNotes] = useState('');
  const [qcNotes, setQcNotes] = useState('');
  const [reviewLink, setReviewLink] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionDeadline, setRevisionDeadline] = useState('');
  const [revisionComments, setRevisionComments] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [deliveryLink, setDeliveryLink] = useState('');
  const [currentRole, setCurrentRole] = useState('Admin'); // Fallback
  
  const updateOrderStage = async () => {};
  const getAssignedEditorsList = () => [];
  const getRawFootageDriveLink = () => '';
  const performBusinessOwnerReview = async () => {};
  type EditingStatus = string;
`;

let injectionPoint = code.indexOf('// WORKFLOW HANDLERS');
code = code.substring(0, injectionPoint) + missingStates + "\\n" + code.substring(injectionPoint);

fs.writeFileSync('src/components/production/ProductionWorkflowModal.tsx', code);
