#!/bin/bash
find src/components -type f -name "*.tsx" | while read -r file; do
  sed -i 's/grid-cols-2 sm:grid-cols-2 lg:grid-cols-4/grid-cols-1 sm:grid-cols-2 lg:grid-cols-4/g' "$file"
  sed -i 's/grid-cols-2 sm:grid-cols-4/grid-cols-1 sm:grid-cols-2 lg:grid-cols-4/g' "$file"
  sed -i 's/grid-cols-3 sm:grid-cols-3 lg:grid-cols-6/grid-cols-1 sm:grid-cols-3 lg:grid-cols-6/g' "$file"
  sed -i 's/grid-cols-4 md:grid-cols-6/grid-cols-2 sm:grid-cols-4 md:grid-cols-6/g' "$file"
done
