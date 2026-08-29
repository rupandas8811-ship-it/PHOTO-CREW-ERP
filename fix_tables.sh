#!/bin/bash
find src/components -type f -name "*.tsx" | while read -r file; do
  # Replace `<table className="...">` with `<div className="overflow-x-auto w-full max-w-full"><table className="...">`
  # and `</table>` with `</table></div>`
  
  # Wait, it's risky if some are already wrapped. Let's just sed replace `<table` with `<div className="overflow-x-auto w-full max-w-full"><table` 
  # and `</table>` with `</table></div>`.
  # Then run another script to remove nested `overflow-x-auto` if they occur.
  
  awk '
  /<table/ && !/overflow-x-auto/ {
    # Check if previous line had overflow-x-auto
    if (prev !~ /overflow-x-auto/ && prev !~ /overflow-x-auto/) {
      sub(/<table/, "<div className=\"overflow-x-auto w-full max-w-full\">\n<table")
      wrapped=1
    }
  }
  /<\/table>/ {
    if (wrapped==1) {
      sub(/<\/table>/, "</table>\n</div>")
      wrapped=0
    }
  }
  { prev = $0; print }
  ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done
