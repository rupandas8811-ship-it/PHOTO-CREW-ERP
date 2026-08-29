with open('src/components/SalesModule.tsx', 'rb') as f:
    text = f.read().decode('utf-8', errors='ignore')
lines = text.split('\n')

for i in range(10110, 10125):
    print(f'{i+1}: {lines[i]}')

print('---')
for i in range(10705, 10720):
    print(f'{i+1}: {lines[i]}')
