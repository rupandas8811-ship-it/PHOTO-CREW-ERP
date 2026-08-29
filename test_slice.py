with open('src/components/SalesModule.tsx', 'rb') as f:
    text = f.read().decode('utf-8', errors='ignore')
lines = text.split('\n')

for i in range(12220, 12245):
    print(f'{i+1}: {lines[i]}')
