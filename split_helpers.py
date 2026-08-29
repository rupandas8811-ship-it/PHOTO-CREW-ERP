import os
import re

with open('src/components/SalesModule.tsx', 'r') as f:
    lines = f.readlines()

# Find the start of SalesModule
sales_module_idx = -1
for i, line in enumerate(lines):
    if line.startswith('export const SalesModule: React.FC<SalesModuleProps> ='):
        sales_module_idx = i
        break

if sales_module_idx == -1:
    print("Could not find SalesModule")
    exit(1)

# Helper components and functions are between line 35 (interface LocalEditableInputProps) and sales_module_idx.
# Imports are 0-35.
# Let's extract them.

# First, find where imports end and interface LocalEditableInputProps begins.
interface_idx = -1
for i, line in enumerate(lines):
    if line.startswith('interface LocalEditableInputProps {'):
        interface_idx = i
        break

imports = lines[:interface_idx]
helpers = lines[interface_idx:sales_module_idx]
remainder = lines[sales_module_idx:]

# We need to construct SalesHelpers.tsx
helpers_content = "import React from 'react';\n"
helpers_content += "import { Trash2, Plus, Check, X } from 'lucide-react';\n\n"
helpers_content += "".join(helpers)

# Ensure exports are added to helper functions so we can import them in SalesModule
# function parseQtyAndText -> export function parseQtyAndText
helpers_content = re.sub(r'^function parseQtyAndText', 'export function parseQtyAndText', helpers_content, flags=re.MULTILINE)
helpers_content = re.sub(r'^function combineQtyAndText', 'export function combineQtyAndText', helpers_content, flags=re.MULTILINE)
# Add export to components if missing
helpers_content = re.sub(r'^const LocalEditableInput', 'export const LocalEditableInput', helpers_content, flags=re.MULTILINE)
helpers_content = re.sub(r'^const CompactQtyItemRow', 'export const CompactQtyItemRow', helpers_content, flags=re.MULTILINE)

with open('src/components/SalesHelpers.tsx', 'w') as f:
    f.write(helpers_content)

# Now rewrite SalesModule.tsx
new_sales_module = "".join(imports)
new_sales_module += "import { LocalEditableInput, CompactQtyItemRow, parseQtyAndText, combineQtyAndText } from './SalesHelpers';\n\n"
new_sales_module += "".join(remainder)

with open('src/components/SalesModule.tsx', 'w') as f:
    f.write(new_sales_module)

print("Extraction successful.")
