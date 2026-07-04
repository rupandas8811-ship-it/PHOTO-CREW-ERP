sed -i -e '/if (!salesStaffName || !salesStaffName.trim()) {/,/return;/d' src/components/SalesModule.tsx
