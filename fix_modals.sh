#!/bin/bash
find src/components -type f -name "*.tsx" | while read -r file; do
  # Add w-full to modals if they only have max-w-* and bg-zinc-9*
  sed -i -E 's/className="([^"]*)max-w-([a-zA-Z0-9]+)([^"]*) bg-zinc-9([0-9]+)/className="\1w-full max-w-\2\3 bg-zinc-9\4/g' "$file"
  # Sometimes the order is bg-zinc-950 ... max-w-4xl
  sed -i -E 's/className="([^"]*)bg-zinc-9([0-9]+)([^"]*) max-w-([a-zA-Z0-9]+)/className="\1bg-zinc-9\2\3 w-full max-w-\4/g' "$file"
done
