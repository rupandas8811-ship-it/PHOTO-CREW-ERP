with open('src/components/ProductionStaffDirectoryModule.tsx', 'r') as f:
    text = f.read()

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

with open('src/components/ProductionStaffDirectoryModule.tsx', 'w') as f:
    f.write(text)
