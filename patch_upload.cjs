const fs = require('fs');
let content = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

const target1 = `      const newProofs: EquipmentProofItem[] = reqItems.map(item => ({
        equipmentName: item.name,
        assetId: item.assetId,
        photoUrl: modalPhotos[item.name],
        capturedAt: timestamp
      }));`;

const replace1 = `      // Ensure upload to Supabase
      const uploadedProofs: EquipmentProofItem[] = [];
      for (const item of reqItems) {
        let finalUrl = modalPhotos[item.name];
        
        // If it's a base64 data URL, upload it to Supabase
        if (finalUrl && finalUrl.startsWith('data:image')) {
          try {
            const res = await fetch(finalUrl);
            const blob = await res.blob();
            const fileName = \`proofs/\${booking.orderId}_\${stage.replace(/\\s+/g, '_')}_\${Date.now()}.jpg\`;
            
            const { data, error } = await supabaseClient.storage.from('img').upload(fileName, blob, {
              contentType: 'image/jpeg',
              upsert: true
            });
            
            if (error) {
              console.error("Storage upload error:", error);
              throw error;
            }
            
            const { data: { publicUrl } } = supabaseClient.storage.from('img').getPublicUrl(data.path);
            finalUrl = publicUrl;
          } catch (uploadErr: any) {
             console.error("Error uploading to Supabase:", uploadErr);
             showToast(\`❌ Failed to upload photo: \${uploadErr.message || "Unknown error"}\`);
             setIsSubmitting(false);
             return; // Do NOT continue or mark as complete
          }
        }
        
        uploadedProofs.push({
          equipmentName: item.name,
          assetId: item.assetId,
          photoUrl: finalUrl,
          capturedAt: timestamp
        });
      }

      const newProofs: EquipmentProofItem[] = uploadedProofs;`;

if (content.includes(target1)) {
  content = content.replace(target1, replace1);
  console.log("Patched upload logic!");
} else {
  console.log("Could not find target1");
}

fs.writeFileSync('src/components/StaffModule.tsx', content);
