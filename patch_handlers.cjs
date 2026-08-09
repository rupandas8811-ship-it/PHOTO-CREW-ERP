const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const openAssign = `  const handleOpenAssignEditor = (prod: Production) => {`;
const openAssignNew = `  const handleOpenAssignEditor = (prod: Production) => {
    if (prod.production_status === 'Order Closed' || prod.editing_status === 'Order Closed') return;`;

const resendRev = `  const handleOpenResendReviewPopup = (prod: Production) => {`;
const resendRevNew = `  const handleOpenResendReviewPopup = (prod: Production) => {
    if (prod.production_status === 'Order Closed' || prod.editing_status === 'Order Closed') return;`;

const ca = `  const handleOpenClientAcceptance = (prod: Production) => {`;
const caNew = `  const handleOpenClientAcceptance = (prod: Production) => {
    if (prod.production_status === 'Order Closed' || prod.editing_status === 'Order Closed') return;`;

code = code.replace(openAssign, openAssignNew);
code = code.replace(resendRev, resendRevNew);
code = code.replace(ca, caNew);

fs.writeFileSync('src/components/ProductionModule.tsx', code);
