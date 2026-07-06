import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// handleFollowUpSubmit wrap
const h2Search = `      if (followUpForm.advance_received === undefined || isNaN(followUpForm.advance_received)) {
        alert("Please enter Advance Paid Amount.");
        return;
      }

      try {`;
const h2Replace = `      if (followUpForm.advance_received === undefined || isNaN(followUpForm.advance_received)) {
        alert("Please enter Advance Paid Amount.");
        return;
      }

      executeWithReportingPopup(async () => {
        try {`;
content = content.replace(h2Search, h2Replace);

// End of handleFollowUpSubmit
const h2EndSearch = `      } catch (err: any) {
        console.error("Failed to commit order detail changes from follow-up:", err);
        const errMsg = err?.message || String(err);
        const parsed = parseStatusUpdateError(errMsg);
        
        logStatusUpdateError({
          leadId: selectedLead.lead_id,
          orderId: null,
          oldStatus: selectedLead.current_status || selectedLead.status || 'New Lead',
          newStatus: 'Order Confirmed',
          updatePayload: {
            status: 'Order Confirmed',
            event_date: followUpForm.event_date,
            event_time: followUpForm.event_time,
            reporting_time: followUpForm.reporting_time,
          },
          insertPayload: {
            order_status: 'Confirmed',
            current_stage: 'Order Confirmed',
            package_name: selectedLead.event_type + ' Premium Package',
            quotation_amount: followUpForm.quotation_amount,
            advance_received: followUpForm.advance_received,
          },
          dbResponse: null,
          fullError: err
        });
        setStatusError({
          title: "Follow-up Transition to Order Confirmed Failed",
          reason: parsed.reason,
          suggestedFix: parsed.suggestedFix
        });
        alert(parsed.reason);
      } finally {
        setIsSaving(false);
      }
    } else {
      // standard status update`;
const h2EndReplace = `      } catch (err: any) {
        console.error("Failed to commit order detail changes from follow-up:", err);
        const errMsg = err?.message || String(err);
        const parsed = parseStatusUpdateError(errMsg);
        
        logStatusUpdateError({
          leadId: selectedLead.lead_id,
          orderId: null,
          oldStatus: selectedLead.current_status || selectedLead.status || 'New Lead',
          newStatus: 'Order Confirmed',
          updatePayload: {
            status: 'Order Confirmed',
            event_date: followUpForm.event_date,
            event_time: followUpForm.event_time,
            reporting_time: followUpForm.reporting_time,
          },
          insertPayload: {
            order_status: 'Confirmed',
            current_stage: 'Order Confirmed',
            package_name: selectedLead.event_type + ' Premium Package',
            quotation_amount: followUpForm.quotation_amount,
            advance_received: followUpForm.advance_received,
          },
          dbResponse: null,
          fullError: err
        });
        setStatusError({
          title: "Follow-up Transition to Order Confirmed Failed",
          reason: parsed.reason,
          suggestedFix: parsed.suggestedFix
        });
        alert(parsed.reason);
      } finally {
        setIsSaving(false);
      }
      });
    } else {
      // standard status update`;
content = content.replace(h2EndSearch, h2EndReplace);

// handleConfirmOrderSubmit
const h3Search = `    if (confirmForm.advance_received === undefined || isNaN(confirmForm.advance_received)) {
      alert("Please enter Advance Paid Amount.");
      return;
    }`;
const h3Replace = `    if (confirmForm.advance_received === undefined || isNaN(confirmForm.advance_received)) {
      alert("Please enter Advance Paid Amount.");
      return;
    }`;

const h3TrySearch = `    if (confirmForm.quotation_amount === undefined || confirmForm.quotation_amount === 0 || isNaN(confirmForm.quotation_amount)) {
      alert("Please enter Final Amount.");
      return;
    }

    try {`;
const h3TryReplace = `    if (confirmForm.quotation_amount === undefined || confirmForm.quotation_amount === 0 || isNaN(confirmForm.quotation_amount)) {
      alert("Please enter Final Amount.");
      return;
    }

    executeWithReportingPopup(async () => {
      try {`;
content = content.replace(h3TrySearch, h3TryReplace);

const h3EndSearch = `        alert(parsed.reason);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Filter Leads List`;
const h3EndReplace = `        alert(parsed.reason);
      } finally {
        setIsSaving(false);
      }
      });
    }
  };

  // Filter Leads List`;
// Wait, the end might have different braces. Let's just find "    } finally {\n      setIsSaving(false);\n    }\n  };\n\n  // Filter Leads List"
const h3EndRealSearch = `      } finally {
      setIsSaving(false);
    }
  };

  // Filter Leads List`;
const h3EndRealReplace = `      } finally {
      setIsSaving(false);
    }
    });
  };

  // Filter Leads List`;
content = content.replace(h3EndRealSearch, h3EndRealReplace);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated!");
