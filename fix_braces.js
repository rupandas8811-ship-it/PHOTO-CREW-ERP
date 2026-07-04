import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const brokenSection = `          } catch (err: any) {
            showToastMsg(err.message, "error");
            setIsSaving(false);
            return;
          }
        }
        }
        if (!salesStaffMobile || !salesStaffMobile.trim() || salesStaffMobile.trim().length !== 10 || !/^\\d+$/.test(salesStaffMobile.trim())) {
          showToastMsg("Please enter a valid 10-digit Sales Staff Mobile Number.", "error");
          setIsSaving(false);
          return;
        }
        // Open Step 2 Follow-up details modal before moving to Step 3`;

const fixedSection = `          } catch (err: any) {
            showToastMsg(err.message, "error");
            setIsSaving(false);
            return;
          }
        }

        // Open Step 2 Follow-up details modal before moving to Step 3`;

content = content.replace(brokenSection, fixedSection);
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Fixed extra brace and removed mobile validation!");
