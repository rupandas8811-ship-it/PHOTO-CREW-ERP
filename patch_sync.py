import re

with open('src/components/SalesModule.tsx', 'r') as f:
    code = f.read()

# Fix advance payment sync in handleConfirmOrderSubmit
old_sync = """      setShowConfirmModal(false);
      showToastMsg("Order Confirmed Successfully.", "success");"""

new_sync = """      setShowConfirmModal(false);
      showToastMsg("Booking Confirmation saved successfully.", "success");
      setWizardLeadData(prev => ({
        ...prev,
        advance_received: Number(confirmForm.advance_received)
      }));"""

code = code.replace(old_sync, new_sync)

with open('src/components/SalesModule.tsx', 'w') as f:
    f.write(code)

print("Done")
