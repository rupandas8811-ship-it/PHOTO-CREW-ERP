with open('src/components/ProductionModule.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove one </div> from the end
pos = text.rfind('</div>')
if pos != -1:
    text = text[:pos] + text[pos+6:]

with open('src/components/ProductionModule.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
