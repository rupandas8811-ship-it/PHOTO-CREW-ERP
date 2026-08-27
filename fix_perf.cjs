const fs = require('fs');

let code = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');

// 1. In updateLead, remove maybeSingle check
code = code.replace(/if \(supabaseClient\) \{\s*try \{\s*const \{ data: dbLead, error: dbLeadErr \} = await supabaseClient\.from\('leads'\)\.select\('lead_id'\)\.eq\('lead_id', leadId\)\.maybeSingle\(\);\s*if \(dbLeadErr\) \{\s*console\.warn\([^)]+\);\s*\}\s*if \(!dbLead && !prevLead\) \{\s*console\.warn\([^)]+\);\s*\}\s*\} catch \(checkErr: any\) \{\s*console\.warn\([^)]+\);\s*\}\s*\} else if \(!prevLead\) \{\s*console\.warn\([^)]+\);\s*\}/s, `if (!prevLead) {
      console.warn(\`Lead record with ID "\${leadId}" was not found in local cache.\`);
    }`);

// 2. In updateLead, parallelize idsToDelete
code = code.replace(/for \(const idToDelete of idsToDelete\) \{\s*const delRes = await pushDelete\('lead_events', 'id', idToDelete\);\s*if \(!delRes\.success\) \{\s*throw new Error\(\`Failed to delete removed event: \$\{delRes\.error\}\`\);\s*\}\s*\}/s, `await Promise.all(idsToDelete.map(async (idToDelete) => {
          const delRes = await pushDelete('lead_events', 'id', idToDelete);
          if (!delRes.success) {
            throw new Error(\`Failed to delete removed event: \${delRes.error}\`);
          }
        }));`);

// 3. In updateLead, parallelize updatedEvents
code = code.replace(/for \(const ev of updatedEvents\) \{/s, `await Promise.all(updatedEvents.map(async (ev) => {`);
code = code.replace(/if \(!updRes\.success\) throw new Error\(\`Failed to update existing event: \$\{updRes\.error\}\`\);\s*\}\s*\}/s, `if (!updRes.success) throw new Error(\`Failed to update existing event: \${updRes.error}\`);
        }
      }));`);

// 4. In updateLeadFollowUp, remove maybeSingle check
code = code.replace(/if \(supabaseClient\) \{\s*const \{ data: dbLead, error: dbLeadErr \} = await supabaseClient\.from\('leads'\)\.select\('lead_id'\)\.eq\('lead_id', leadId\)\.maybeSingle\(\);\s*if \(dbLeadErr\) \{\s*throw new Error\(\`Failed to check if lead exists in 'leads' table\. Supabase Error: \$\{dbLeadErr\.message\}\`\);\s*\}\s*if \(!dbLead\) \{\s*throw new Error\(\`Lead record with ID "\$\{leadId\}" was not found in the "leads" table\.\`\);\s*\}\s*\} else if \(!targetLead\) \{\s*throw new Error\(\`Lead record with ID "\$\{leadId\}" was not found in local cache\.\`\);\s*\}/s, `if (!targetLead) {
      throw new Error(\`Lead record with ID "\${leadId}" was not found in local cache.\`);
    }`);

// 5. In confirmOrder, remove maybeSingle check for leads
code = code.replace(/if \(supabaseClient\) \{\s*const \{ data: dbLead, error: dbLeadErr \} = await supabaseClient\.from\('leads'\)\.select\('lead_id'\)\.eq\('lead_id', leadId\)\.maybeSingle\(\);\s*if \(dbLeadErr\) \{\s*throw new Error\(\`Failed to check if lead exists in 'leads' table\. Supabase Error: \$\{dbLeadErr\.message\}\`\);\s*\}\s*if \(!dbLead\) \{\s*throw new Error\(\`Lead record with ID "\$\{leadId\}" was not found in the "leads" table\.\`\);\s*\}\s*\} else if \(!targetLead\) \{\s*throw new Error\(\`Lead record with ID "\$\{leadId\}" was not found in local cache\.\`\);\s*\}/s, `if (!targetLead) {
      throw new Error(\`Lead record with ID "\${leadId}" was not found in local cache.\`);
    }`);

fs.writeFileSync('src/components/RoleContext.tsx', code);
console.log('RoleContext.tsx updated');
