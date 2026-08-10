const fs = require('fs');
let code = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

const regex = /for \(const req of matchingReqs\) \{\s*const reqKeyCol = req\.id \? 'id' : \(req\.request_id \? 'request_id' : 'lead_id'\);\s*const reqKeyVal = req\.id || req\.request_id || req\.lead_id;\s*await supabaseClient\s*\.from\('unlock_requests'\)\s*\.update\(\{ status: 'approved' \}\)\s*\.eq\(reqKeyCol, reqKeyVal\);\s*\}/;

const match = code.match(regex);
if (match) {
  const replacement = `await Promise.all(matchingReqs.map(async (req) => {
              const reqKeyCol = req.id ? 'id' : (req.request_id ? 'request_id' : 'lead_id');
              const reqKeyVal = req.id || req.request_id || req.lead_id;

              await supabaseClient
                .from('unlock_requests')
                .update({ status: 'approved' })
                .eq(reqKeyCol, reqKeyVal);
            }));`;
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/components/SalesModule.tsx', code);
  console.log('Parallelized completeApprovedUnlockRequest loop.');
} else {
  console.log('Could not find loop in completeApprovedUnlockRequest');
}
