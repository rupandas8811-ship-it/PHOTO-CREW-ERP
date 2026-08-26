sed -i 's/const updates: Partial<Production> = {/const updates: any = {/g' src/components/ProductionModule.tsx
sed -i 's/client_communication_proof: caCommunicationProof/client_communication_proof: caCommunicationProof,/g' src/components/ProductionModule.tsx
