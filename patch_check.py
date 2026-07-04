with open('src/components/SalesModule.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """  const handleCheckExistingCustomer = (type: 'phone' | 'email', value: string) => {
    if (!value || value.length < 5) return;
    const parsedCustomers = getCustomers(leads, orders, payments || []);
    
    const matched = parsedCustomers.find(c => {
      if (type === 'phone') {
        const cleanInput = value.replace(/[^\\d]/g, '').slice(-10);
        if (!cleanInput || cleanInput.length < 10) return false;
        
        const cleanMobile = c.mobile.replace(/[^\\d]/g, '').slice(-10);
        const cleanAlt = c.alternate_mobile?.replace(/[^\\d]/g, '').slice(-10);
        
        return cleanInput === cleanMobile || (cleanAlt && cleanInput === cleanAlt);
      } else {
        const cleanInput = value.trim().toLowerCase();
        if (!cleanInput.includes('@')) return false;
        return c.email && c.email.trim().toLowerCase() === cleanInput;
      }
    });"""

replacement = """  const handleCheckExistingCustomer = (type: 'phone' | 'email', value: string) => {
    if (!value || value.length < 5) return;
    const parsedCustomers = getCustomers(leads, orders, payments || []);
    
    const matched = parsedCustomers.find(c => {
      if (type === 'phone') {
        const cleanInput = String(value).replace(/[^\\d]/g, '').slice(-10);
        if (!cleanInput || cleanInput.length < 10) return false;
        
        const cleanMobile = String(c.mobile || '').replace(/[^\\d]/g, '').slice(-10);
        const cleanAlt = String(c.alternate_mobile || '').replace(/[^\\d]/g, '').slice(-10);
        
        return cleanInput === cleanMobile || (cleanAlt && cleanInput === cleanAlt);
      } else {
        const cleanInput = String(value).trim().toLowerCase();
        if (!cleanInput.includes('@')) return false;
        return c.email && String(c.email).trim().toLowerCase() === cleanInput;
      }
    });"""

# Because JS has /[^\d]/g, we wrote /[^\\d]/g in python strings above. Let's make sure it matches.
# Actually, the original text in the file is /[^\d]/g. Let's fix target and replacement.
target = target.replace('\\\\', '\\')
replacement = replacement.replace('\\\\', '\\')

content = content.replace(target, replacement)

with open('src/components/SalesModule.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
