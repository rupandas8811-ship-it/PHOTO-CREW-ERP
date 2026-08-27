with open('src/components/ProductionModule.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.rfind(')}')
if pos != -1:
    text = text[:pos] + ')}\n    </div>\n  );\n};\n\nexport default ProductionModule;\n'

with open('src/components/ProductionModule.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
