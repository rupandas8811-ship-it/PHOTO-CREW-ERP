import re

with open('src/components/SalesModule.tsx', 'r') as f:
    code = f.read()

# 1. HIDE CONFIRMED EVENT TIME in Step 3 validation
val_code_1 = """        if (!wizardLeadData.confirmed_event_time) {
          showValidationError("input_confirmed_event_time", "Please provide Confirmed Event Time.");
          showToastMsg("❌ Please complete all required fields before saving.", "error");
          return false;
        }"""
code = code.replace(val_code_1, "")

# 1. HIDE CONFIRMED EVENT TIME in Step 3 UI
ui_code_1 = """                              <div>
                                <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-mono font-bold">Confirmed Event Time *</label>
                                <input
                                  id="input_confirmed_event_time"
                                  type="time"
                                  value={wizardLeadData.confirmed_event_time || ''}
                                  disabled={isLeadLocked}
                                  onChange={(e) => setWizardLeadData({ ...wizardLeadData, confirmed_event_time: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-white font-mono"
                                  required
                                />
                              </div>"""
code = code.replace(ui_code_1, "")

# 2. HIDE EVENT TIME from popup validation
val_code_2a = """    if (!confirmedEventTime) {
      showToastMsg("Please select Confirmed Event Time.", "error");
      return;
    }"""
val_code_2b = """      if (!followUpForm.event_time) {
        showToastMsg("Please select Confirmed Event Time.", "error");
        return;
      }"""
val_code_2c = """    if (!confirmForm.event_time) {
      showToastMsg("Please select Confirmed Event Time.", "error");
      return;
    }"""
code = code.replace(val_code_2a, "")
code = code.replace(val_code_2b, "")
code = code.replace(val_code_2c, "")

# 2. HIDE EVENT TIME from popup UI
ui_code_2 = """                <div>
                  <label className="block font-medium text-slate-400 mb-1">
                    Event Time
                  </label>
                  <input
                    type="time"
                    value={confirmForm.event_time}
                    onChange={(e) => setConfirmForm({ ...confirmForm, event_time: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>"""
code = code.replace(ui_code_2, "")

with open('src/components/SalesModule.tsx', 'w') as f:
    f.write(code)

print("Done")
