sed -i 's/productionStaff={productionStaffList}/productionStaff={productionStaff}/g' src/components/ProductionModule.tsx
sed -i 's/const staffRec = (productionStaffList || \[\]).find/const staffRec = (productionStaff || []).find/g' src/components/ProductionModule.tsx
sed -i 's/activeStaffList = productionStaffList.filter/activeStaffList = (productionStaff || []).filter/g' src/components/ProductionModule.tsx
sed -i 's/st = productionStaffList.find/st = (productionStaff || []).find/g' src/components/ProductionModule.tsx
sed -i 's/staffMem = productionStaffList.find/staffMem = (productionStaff || []).find/g' src/components/ProductionModule.tsx
