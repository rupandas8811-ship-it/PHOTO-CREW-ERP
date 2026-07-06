import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

content = content.replace(
  /                \{\[\n                  \{ step: 1, label: 'Customer' \},\n                  \{ step: 2, label: 'Event Info' \},\n                  \{ step: 3, label: 'Packages' \},\n                  \{ step: 4, label: 'Budget\/Notes' \},\n                  \{ step: 5, label: 'Finalize' \}\n                \]\.map\(\(item\) => \{/g,
  `                {[
                  { step: 1, label: 'Customer' },
                  { step: 2, label: 'Event Info' },
                  { step: 3, label: 'CRM & Quotation' }
                ].map((item) => {`
);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated Progress Bar");
