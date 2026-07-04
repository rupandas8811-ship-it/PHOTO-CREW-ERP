import re

with open('src/components/RoleContext.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """      const standardPayload = {
        quotation_status: updatedQuote.quotation_status,
        terms_conditions: packedTerms,
        package_name: updatedQuote.package_name,
        package_price: updatedQuote.package_price,
        deliverables_description: updatedQuote.deliverables_description,
        notes_special_customizations: updatedQuote.notes_special_customizations,
        discount_amount: updatedQuote.discount_amount,
        additional_services_cost: updatedQuote.additional_services_cost,
        quotation_amount: updatedQuote.quotation_amount,
        tax_amount: updatedQuote.tax_amount || 0,
        final_amount: updatedQuote.final_amount,
        client_residence_address: updatedQuote.client_residence_address,
        city: updatedQuote.city,
        state: updatedQuote.state,
        pincode: updatedQuote.pincode,
        desired_event_shoot_type: updatedQuote.desired_event_shoot_type,
        updated_at: new Date().toISOString()
      };"""

content = re.sub(r'const standardPayload = \{\n        quotation_status:.*?updated_at: new Date\(\)\.toISOString\(\)\n      \};', replacement, content, flags=re.DOTALL)

with open('src/components/RoleContext.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
