import React from 'react';

export const getStatusColorClass = (status: string) => {
  const s = status.toLowerCase().trim();
  if (s === 'new lead') return 'text-white';
  if (s === 'contacted') return 'text-blue-500';
  if (s === 'follow-up' || s === 'follow up') return 'text-amber-500';
  if (s === 'quotation sent') return 'text-yellow-500';
  if (s === 'negotiation') return 'text-purple-500';
  if (s === 'order confirmed') return 'text-green-500';
  if (s === 'operations' || s === 'operations assigned') return 'text-cyan-500';
  if (s === 'staff assigned') return 'text-blue-600';
  if (s === 'event scheduled') return 'text-orange-500';
  if (s === 'event completed') return 'text-green-600';
  if (s === 'raw footage received') return 'text-amber-900';
  if (s === 'production') return 'text-sky-500';
  if (s === 'editing in progress' || s === 'editing started') return 'text-indigo-600';
  if (s === 'client review' || s === 'client review sent') return 'text-pink-500';
  if (s === 'ready for delivery') return 'text-teal-500';
  if (s === 'delivered') return 'text-green-500';
  if (s === 'completed' || s === 'closed') return 'text-green-700';
  if (s === 'lost lead') return 'text-rose-500 font-bold';
  return 'text-zinc-400';
};

export const StatusText = ({ status }: { status: string }) => {
  return (
    <span className={`font-medium ${getStatusColorClass(status)}`}>
      {status}
    </span>
  );
};
