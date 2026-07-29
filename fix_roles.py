import sys

with open('src/components/RoleContext.tsx', 'r') as f:
    content = f.read()

# Replace in leads
target_leads = "'Final_Quotation_Amount', 'Quotation_Discount', 'Additional_Services_Cost', 'Specify_Custom_Lead_Source_Name', 'Final_Quotation_Amount'\n      ],"
replacement_leads = "'Final_Quotation_Amount', 'Quotation_Discount', 'Additional_Services_Cost', 'Specify_Custom_Lead_Source_Name', 'Final_Quotation_Amount', 'sales_staff_name', 'sales_staff_mobile'\n      ],"

if target_leads in content:
    content = content.replace(target_leads, replacement_leads)
    print("Replaced in leads")
else:
    print("Target leads not found")

with open('src/components/RoleContext.tsx', 'w') as f:
    f.write(content)

print("Done")
