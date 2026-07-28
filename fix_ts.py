import re

# Fix App.tsx
with open('src/App.tsx', 'r') as f:
    text = f.read()

if "import { ProductionStaffModule } from './components/ProductionStaffModule';" not in text:
    text = text.replace("import { StaffModule } from './components/StaffModule';", "import { StaffModule } from './components/StaffModule';\nimport { ProductionStaffModule } from './components/ProductionStaffModule';")
    
# Wait, let me check if `<ProductionStaffModule` is used in App.tsx
if "<ProductionStaffModule" in text and "import { ProductionStaffModule" not in text:
    pass # I already added the import above.

with open('src/App.tsx', 'w') as f:
    f.write(text)

# Fix types.ts
with open('src/types.ts', 'r') as f:
    text = f.read()

# Fix EditingStatus
old_status = "export type EditingStatus = 'Raw Footage Received' | 'Editor Assigned' | 'Editing Started' | 'Editing In Progress' | 'Internal QC Review' | 'Client Review Sent' | 'Revision Required' | 'Revision In Progress' | 'Final Approval' | 'Project Delivered' | 'Editing Complete' | 'Client Review';"
new_status = "export type EditingStatus = 'Raw Footage Received' | 'Editor Assigned' | 'Editing Started' | 'Editing In Progress' | 'Internal QC Review' | 'Client Review Sent' | 'Revision Required' | 'Revision In Progress' | 'Final Approval' | 'Project Delivered' | 'Editing Complete' | 'Client Review' | 'Project Completed' | 'Completed';"
text = text.replace(old_status, new_status)

# Fix departmentAccess
old_access = """export const departmentAccess: Record<UserRole, Department[]> = {
  'Business Owner': ['Sales', 'Operations', 'Production', 'Dispatch', 'Editor'],
  'Sales Team': ['Sales'],
  'Operations Team': ['Operations'],
  'Production Team': ['Production', 'Editor', 'Dispatch'],
  'Operation Staff': [],
};"""
new_access = """export const departmentAccess: Record<UserRole, Department[]> = {
  'Business Owner': ['Sales', 'Operations', 'Production', 'Dispatch', 'Editor'],
  'Sales Team': ['Sales'],
  'Operations Team': ['Operations'],
  'Production Team': ['Production', 'Editor', 'Dispatch'],
  'Operation Staff': [],
  'Production Staff': [],
};"""
text = text.replace(old_access, new_access)

with open('src/types.ts', 'w') as f:
    f.write(text)
