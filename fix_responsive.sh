#!/bin/bash
find src/components -type f -name "*.tsx" | while read -r file; do
  # Replace w-[600px] and min-w-[1000px] in divs and tables
  sed -i 's/min-w-\[[0-9]*px\]/min-w-max/g' "$file"
  sed -i 's/w-\[1200px\]/w-full max-w-\[1200px\]/g' "$file"
  sed -i 's/w-\[800px\]/w-full max-w-\[800px\]/g' "$file"
  sed -i 's/w-\[1000px\]/w-full max-w-\[1000px\]/g' "$file"
  sed -i 's/w-\[600px\]/w-full max-w-\[600px\]/g' "$file"
  sed -i 's/w-\[500px\]/w-full max-w-\[500px\]/g' "$file"
  sed -i 's/w-\[400px\]/w-full max-w-\[400px\]/g' "$file"
  sed -i 's/w-\[300px\]/w-full max-w-\[300px\]/g' "$file"
done
