const fs = require('fs');
let code = fs.readFileSync('/app/applet/src/components/SalesModule.tsx', 'utf8');
const cutIndex = code.indexOf('{/* Collapsible Quick Filters Panel */}');
code = code.substring(0, cutIndex);

// Simple JSX tag stack
const stack = [];
const tagRegex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
let match;
while ((match = tagRegex.exec(code)) !== null) {
  const fullMatch = match[0];
  const tagName = match[1];
  
  // skip self closing tags
  if (fullMatch.endsWith('/>')) continue;
  
  // skip tags that are typically self closing in HTML (but in JSX they must be closed or end with />)
  // in JSX everything without /> pushes to stack and needs a closing tag, except if it's inside a comment?
  
  if (fullMatch.startsWith('</')) {
    if (stack.length > 0 && stack[stack.length - 1] === tagName) {
      stack.pop();
    } else {
      // unmatched closing tag
      console.log('Unmatched closing tag:', fullMatch, 'at stack:', stack);
    }
  } else {
    stack.push(tagName);
  }
}
console.log('Open tags:', stack);
