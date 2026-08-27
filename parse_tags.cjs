const fs = require('fs');
const content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// We will use a regex to find all <tag and </tag> that don't have />
const regex = /<([a-zA-Z0-9]+)([^>]*?)>|<\/([a-zA-Z0-9]+)>/g;
let match;
const stack = [];

while ((match = regex.exec(content)) !== null) {
  const fullMatch = match[0];
  
  // Ignore self-closing tags
  if (fullMatch.endsWith('/>')) continue;
  
  if (match[1]) {
    // Opening tag
    const tag = match[1];
    // Ignore br, hr, img, input, etc.
    if (['br', 'hr', 'img', 'input', 'link', 'meta'].includes(tag.toLowerCase())) continue;
    stack.push({ tag, line: content.substring(0, match.index).split('\n').length });
  } else if (match[3]) {
    // Closing tag
    const tag = match[3];
    if (stack.length === 0) {
      console.log(`Closing tag </${tag}> at line ${content.substring(0, match.index).split('\n').length} with empty stack`);
      continue;
    }
    const top = stack[stack.length - 1];
    if (top.tag === tag) {
      stack.pop();
    } else {
      console.log(`Mismatch at line ${content.substring(0, match.index).split('\n').length}: expected </${top.tag}> but found </${tag}> (opened at ${top.line})`);
      // We'll pop anyway to try to recover
      stack.pop();
    }
  }
}

console.log("Remaining in stack:", stack);
