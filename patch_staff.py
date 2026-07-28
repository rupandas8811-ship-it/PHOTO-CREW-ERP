import re

with open('src/components/ProductionStaffDirectoryModule.tsx', 'r') as f:
    text = f.read()

# Add Password Input in form
form_mobile_ui = """                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                          Password (for Staff Login)
                        </label>
                        <div className="relative group">
                          <input 
                            type="password"
                            value={formPassword}
                            onChange={(e) => setFormPassword(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-purple-500 focus:bg-purple-500/5 transition-all"
                            placeholder={editingStaff ? "Leave blank to keep existing password" : "Enter a secure password"}
                          />
                        </div>
                      </div>"""

text = text.replace('                      </div>\n\n                      <div className="space-y-1.5">', form_mobile_ui)

# Update handleSaveStaff
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
          const email = formEmail.trim() || `${formMobile.trim()}@staff.local`;
          
          const { error: userError } = await supabaseClient
             .from('users')
             .upsert({
                email: email,
                password: formPassword.trim(),
                name: formName.trim(),
                role: 'Production Staff',
                active: true,
                username: formMobile.trim()
             }, { onConflict: 'email' });
             
          if (userError) {
             console.error('Error creating user:', userError);
          }
        }
      }"""

text = re.sub(r'    try \{\n      if \(!formName\.trim\(\)\) \{ alert\(\'Name is required\.\'\); return; \}\n      if \(!formMobile\.trim\(\)\) \{ alert\(\'Mobile Number is required\.\'\); return; \}', save_logic, text)

# add supabaseClient import
if 'import { supabaseClient } from' not in text:
    text = text.replace("import { useRole } from './RoleContext';", "import { useRole } from './RoleContext';\nimport { supabaseClient } from '../supabaseClient';")

with open('src/components/ProductionStaffDirectoryModule.tsx', 'w') as f:
    f.write(text)
