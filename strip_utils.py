with open("src/components/SalesModuleNew.tsx", "r") as f:
    lines = f.readlines()

# Keep lines 1 to 44 (which includes all the imports, and interface LocalEditableInputProps)
imports = lines[0:44]
# Skip lines 44 to 1936
rest = lines[1936:]

new_imports = "import { LocalEditableInput, parseQtyAndText, combineQtyAndText, formatListToStructuredObjects, buildStep3EventPayloads, parseTeamMembersJsonToRecord, parseDeliverablesJsonToRecord, CompactQtyItemRowProps, CompactQtyItemRow, validateAndFormatTime, getLogoBase64FromUrl, generateQuotationPdfFileName, generateQuotationPDF, highlightText, LEAD_SOURCES, SalesModuleProps } from './SalesUtils';\n"

with open("src/components/SalesModuleNew.tsx", "w") as f:
    f.writelines(imports)
    f.write(new_imports)
    f.writelines(rest)

