#!/bin/bash
find src/components -type f -name "*.tsx" | while read -r file; do
  sed -i -E 's/className="([^"]*)grid grid-cols-2([^"]*)"/className="\1grid grid-cols-1 sm:grid-cols-2\2"/g' "$file"
done
