with open('src/components/ProductionStaffDirectoryModule.tsx', 'r') as f:
    text = f.read()

# 1. Re-add formPassword properly.
import re

# Insert formPassword state
if 'const [formPassword' not in text:
    text = text.replace("const [formMobile, setFormMobile] = useState('');", "const [formMobile, setFormMobile] = useState('');\n  const [formPassword, setFormPassword] = useState('');")

# Reset formPassword in open/close form logic
text = text.replace("setFormMobile(st.mobile || '');", "setFormMobile(st.mobile || '');\n    setFormPassword('');")
text = text.replace("setFormMobile('');", "setFormMobile('');\n    setFormPassword('');")

# Insert UI for password
old_email = """value={formEmail}
                              onChange={(e) => setFormEmail(e.target.value)}
                              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-purple-500 focus:bg-purple-500/5 transition-all"
                              placeholder="john@example.com"
                            />
                          </div>
                        </div>"""
new_email = """value={formEmail}
                              onChange={(e) => setFormEmail(e.target.value)}
                              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-purple-500 focus:bg-purple-500/5 transition-all"
                              placeholder="john@example.com"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                            <ShieldAlert className="w-3 h-3" /> Password (Login)
                          </label>
                          <div className="relative group">
                            <input 
                              type="password"
                              value={formPassword}
                              onChange={(e) => setFormPassword(e.target.value)}
                              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-purple-500 focus:bg-purple-500/5 transition-all"
                              placeholder={editingStaff ? "Leave blank to keep existing" : "Enter password"}
                            />
                          </div>
                        </div>"""

text = text.replace(old_email, new_email)

# Replace save logic
old_save_logic = """    try {
      if (!formName.trim()) { alert('Name is required.'); return; }
      if (!formMobile.trim()) { alert('Mobile Number is required.'); return; }"""

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

text = text.replace(old_save_logic, save_logic)

with open('src/components/ProductionStaffDirectoryModule.tsx', 'w') as f:
    f.write(text)
