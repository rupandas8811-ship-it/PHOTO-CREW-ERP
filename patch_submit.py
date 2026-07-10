import re

with open('src/components/operations/EquipmentManagement.tsx', 'r') as f:
    code = f.read()

code = code.replace(
    'const { currentRole, equipment, staff, addEquipment, updateEquipment, deleteEquipment, refreshData } = useRole();',
    'const { currentRole, currentUserName, equipment, staff, addEquipment, updateEquipment, deleteEquipment, refreshData } = useRole();'
)

old_submit = """        // Registering new
        const { error } = await supabaseClient.from('equipment').insert([
          {
            equipment_name: form.equipment_name,
            brand: form.brand,
            Equipment_Category: form.equipment_type,
            Equipment_Status: form.status,
            quantity: 1,
            available_quantity: 1
          }
        ]);"""

new_submit = """        // Registering new
        const now = new Date().toISOString();
        const { error } = await supabaseClient.from('equipment').insert([
          {
            equipment_name: form.equipment_name,
            brand: form.brand,
            Equipment_Category: form.equipment_type,
            Equipment_Status: form.status,
            equipment_type: form.equipment_type,
            status: form.status,
            model: '',
            serial_number: null,
            quantity: 1,
            available_quantity: 1,
            purchase_date: null,
            purchase_price: null,
            storage_location: null,
            notes: null,
            created_by: currentUserName || 'Operations Team',
            updated_by: currentUserName || 'Operations Team',
            created_at: now,
            updated_at: now
          }
        ]);"""

code = code.replace(old_submit, new_submit)

with open('src/components/operations/EquipmentManagement.tsx', 'w') as f:
    f.write(code)

print("Done")
