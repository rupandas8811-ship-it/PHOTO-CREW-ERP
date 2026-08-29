import re
import os

with open('src/components/SalesModule.tsx', 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8', errors='ignore')
lines = text.split('\n')

# 1. Booking Confirmation Modal (lines ~12227 to 12603)
# 2. Final Reporting Modal (lines ~12604 to 12828)
# 3. FollowUp / Step3 Modal (lines ~12829 to 12910)
# 4. Error Details Modal (lines ~12911 to 12955)
# 5. Lost Lead Modal (lines ~12956 to 13049)
# 6. Unlock Request Modal (lines ~13050 to 13132)
# 7. Cancel Confirm Modal (lines ~13133 to 13178)
# 8. Packages Modal & View Pkg Details (lines 14515 to 15340)

print(f"Total lines: {len(lines)}")
