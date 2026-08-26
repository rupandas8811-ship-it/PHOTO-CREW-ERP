sed -i 's/const { client_communication_proof, ...dbUpdates } = updates;/ /g' src/components/RoleContext.tsx
sed -i 's/const rProd = await pushUpdate('"'"'production'"'"', '"'"'production_id'"'"', targetProd.production_id, dbUpdates);/const rProd = await pushUpdate('"'"'production'"'"', '"'"'production_id'"'"', targetProd.production_id, updates);/g' src/components/RoleContext.tsx
