import os
import zlib

for root, dirs, files in os.walk('.git/objects'):
    for file in files:
        path = os.path.join(root, file)
        try:
            with open(path, 'rb') as f:
                data = zlib.decompress(f.read())
                if b'delivItem.editedDriveLink' in data:
                    print(f"Found in {path}")
        except Exception as e:
            pass
