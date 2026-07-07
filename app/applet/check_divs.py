
def check_balance(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    import re
    tokens = re.findall(r'<div|</div', content)
    balance = 0
    stack = []
    import re
    # Find all div tags with their content (simplistic)
    tags = re.findall(r'<(div|/div)', content)
    # Re-find with line numbers
    lines = content.split('\n')
    for line_num, line in enumerate(lines, 1):
        for match in re.finditer(r'<(div|/div)', line):
            tag = match.group(0)
            if tag == '<div':
                balance += 1
                stack.append(line_num)
            else:
                balance -= 1
                if stack:
                    stack.pop()
                else:
                    print(f"Extra closing div at line {line_num}")
    
    if balance > 0:
        print(f"Unclosed divs starting at lines: {stack}")
    print(f"Final balance: {balance}")

check_balance('src/components/UnifiedCalendar.tsx')
