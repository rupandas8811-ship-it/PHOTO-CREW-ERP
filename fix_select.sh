sed -i '/<\/select>/{
  N
  N
  N
  s/<\/select>\n                                className="w-full bg-slate-955 border border-amber-500\/50 rounded-lg py-2 px-3 text-xs text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"\n                              \/>\n                            <\/div>/<\/select>/g
}' src/components/SalesModule.tsx
