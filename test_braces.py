import re

with open('src/components/ProductionModule.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Filter out comments and strings
text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
text = re.sub(r'//.*', '', text)
text = re.sub(r'\"(?:\\\\.|[^\\\\\"])*\"', '\"\"', text)
text = re.sub(r'\'(?:\\\\.|[^\\\\\'])*\'', '\'\'', text)
text = re.sub(r'\`(?:\\\\.|[^\\\\\`])*\`', '\`\`', text)
# Attempt to filter out regexes that might break the naive brace matching
text = re.sub(r'/[^/\n]+/[gimuy]*', '', text)

stack = []
for i, char in enumerate(text):
    if char in '{[(':
        stack.append((char, i))
    elif char in '}])':
        if not stack:
            print(f'Extra {char} at {i}')
        else:
            top_char, top_pos = stack[-1]
            if (char == '}' and top_char == '{') or \
               (char == ']' and top_char == '[') or \
               (char == ')' and top_char == '('):
                stack.pop()
            else:
                pass # print(f'Mismatch {char} at {i}, expected match for {top_char} from {top_pos}')
                stack.pop() # Try to recover

print('Remaining open:', [(c, pos) for c, pos in stack])
