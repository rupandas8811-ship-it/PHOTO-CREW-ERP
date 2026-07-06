import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const searchStr = `    if (confirmForm.advance_received === undefined || isNaN(confirmForm.advance_received)) {
      alert("Please enter Advance Paid Amount.");
      return;
    }

    try {`;

const replaceStr = `    if (confirmForm.advance_received === undefined || isNaN(confirmForm.advance_received)) {
      alert("Please enter Advance Paid Amount.");
      return;
    }

    executeWithReportingPopup(async () => {
      try {`;

content = content.replace(searchStr, replaceStr);

const h3EndSearch = `        alert(parsed.reason);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Companion lead metadata parse`;

// Wait, looking at temp.txt:
//   332	      });
//   333	      alert(parsed.reason);
//   334	    } finally {
//   335	      setIsSaving(false);
//   336	    }
//   337	  };
//   338	
//   339	  // Companion lead metadata parse

const h3EndRealSearch = `      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
  };

  // Companion lead metadata parse`;
const h3EndRealReplace = `      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
    });
  };

  // Companion lead metadata parse`;
content = content.replace(h3EndRealSearch, h3EndRealReplace);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Fixed handleConfirmOrderSubmit");
