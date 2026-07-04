import fs from 'fs';

const clonedContent = fs.readFileSync('/tmp/photo-crew/src/components/SalesModule.tsx', 'utf-8');
let currentContent = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const markerStart = "  const handleGenerateQuote = async (isEdit: boolean): Promise<string | null> => {";
const markerEnd = "  const handlePreviewQuotePDF = async (isEdit: boolean) => {";

const clonedStart = clonedContent.indexOf(markerStart);
const clonedEnd = clonedContent.indexOf(markerEnd);

const originalFunctionStr = clonedContent.substring(clonedStart, clonedEnd);

const currentStart = currentContent.indexOf(markerStart);
const currentEnd = currentContent.indexOf(markerEnd);

currentContent = currentContent.substring(0, currentStart) + originalFunctionStr + currentContent.substring(currentEnd);

fs.writeFileSync('src/components/SalesModule.tsx', currentContent, 'utf-8');
console.log("Restored original handleGenerateQuote!");
