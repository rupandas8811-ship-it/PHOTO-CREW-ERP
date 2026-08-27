const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/ProductionModule.tsx');
const text = fs.readFileSync(filePath, 'utf8');
const lines = text.split('\n');

// Find index of the loop
const blockIndex = lines.findIndex(l => l.includes('// Standardized flat styles to prevent nested template-literals/ternaries/comments in JSX'));
if (blockIndex === -1) {
  console.error("Could not find the block comment in ProductionModule.tsx!");
  process.exit(1);
}

// Let's modify the variable definitions inside the map loop (lines 9581-9588 area)
// Let us add 'stageNameTextColor' and 'stageNameClassName' definitions right under indicatorDotClassName
const dotLineIndex = lines.findIndex((l, idx) => idx >= blockIndex && l.includes('const indicatorDotClassName ='));
if (dotLineIndex === -1) {
  console.error("Could not find indicatorDotClassName!");
  process.exit(1);
}

// Insert stageName styling logic right after dotLineIndex
lines.splice(dotLineIndex + 1, 0, 
`                                let stageNameTextColor = "text-zinc-650";
                                if (isCurrent) {
                                  stageNameTextColor = "text-amber-400 font-extrabold";
                                } else if (isDone) {
                                  stageNameTextColor = "text-zinc-200";
                                }
                                const stageNameClassName = \`text-[11px] font-bold font-mono transition-colors \${stageNameTextColor}\`;`
);

// Now let's find and replace the span tag
const spanIndex = lines.findIndex((l, idx) => idx >= dotLineIndex && l.includes('text-[11px] font-bold font-mono transition-colors'));
if (spanIndex === -1) {
  console.error("Could not find span block!");
  process.exit(1);
}

// We want to replace lines from spanIndex to spanIndex + 6
// Let's print them first to confirm
console.log("Replacing lines:");
for (let i = 0; i <= 6; i++) {
  console.log(`- ${lines[spanIndex + i]}`);
}

// Replace them with a single line: <span className={stageNameClassName}>
lines.splice(spanIndex, 7, `                                        <span className={stageNameClassName}>`);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log("Successfully replaced nested class logic with clean flat variable!");
