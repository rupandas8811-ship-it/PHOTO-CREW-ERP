with open('src/components/ProductionStaffDirectoryModule.tsx', 'r') as f:
    text = f.read()

# Replace the save logic
save_logic = """    try {
      if (!formName.trim()) { alert('Name is required.'); return; }
      if (!formMobile.trim()) { alert('Mobile Number is required.'); return; }

      // 1. If password is provided, create/update user in users table
      if (formPassword.trim() || !editingStaff) {
        if (!editingStaff && !formPassword.trim()) {
           alert('Password is required for new staff.');
           return;
        }
        if (formPassword.trim()) {
          const email = formEmail.trim() || `${formMobile.trim().replace(/\\s+/g, '')}@staff.local`;
          
          const { error: userError } = await supabaseClient
             .from('users')
             .upsert({
                email: email,
                password: formPassword.trim(),
                name: formName.trim(),
                role: 'Production Staff',
                active: true,
                username: formMobile.trim().replace(/\\s+/g, '')
             }, { onConflict: 'email' });
             
          if (userError) {
             console.error('Error creating user:', userError);
          }
        }
      }"""

old_save_logic = """    try {
      if (!formName.trim()) { alert('Name is required.'); return; }
      if (!formMobile.trim()) { alert('Mobile Number is required.'); return; }"""

text = text.replace(old_save_logic, save_logic)

with open('src/components/ProductionStaffDirectoryModule.tsx', 'w') as f:
    f.write(text)
