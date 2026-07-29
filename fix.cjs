const fs = require('fs');
const content = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

const target1 = `  showToast(\`✅ \${stage} confirmed! Equipment photo proofs recorded.\`);
      setPhotoModalData(null);
      setModalPhotos({});
    } catch (err: any) {
      console.error('Error confirming status update:', err);
      showToast('❌ An error occurred while confirming status update.');
    } finally {
      setIsSubmitting(false);
    }
  };`;

const newContent = content.replace(target1, '');
fs.writeFileSync('src/components/StaffModule.tsx', newContent);
console.log("Fixed syntax");
