import React, { useState } from 'react';

export const SafeProofImage = ({ url, alt, label }: { url: string; alt: string; label: string }) => {
  const [hasError, setHasError] = useState(false);

  if (!url || hasError) {
    return (
      <div className="h-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center text-[11px] text-zinc-500 p-2 text-center">
        No valid proof photo found
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <a href={url} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-lg border border-zinc-800 h-28 bg-zinc-900">
        <img 
          src={url} 
          alt={alt} 
          onError={() => setHasError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
          {label}
        </div>
      </a>
    </div>
  );
};
