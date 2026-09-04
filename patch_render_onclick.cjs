const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

// For Equipment Verification Modal
code = code.replace(
  `onClick={() => setImagePreviewModal({ url: recMeta.url, date: recMeta.date, time: recMeta.time, staffName: selectedEquipmentStatus.staffName, stage: 'Equipment Received' })}`,
  `onClick={() => setImagePreviewModal({ url: recUrl, date: recTime ? formatDateDDMMYY(recTime) : '-', time: recTime ? convertTo12Hour(recTime.split('T')[1]?.split('.')[0] || '') : '-', staffName: selectedEquipmentStatus.staffName, stage: 'Equipment Received' })}`
);
code = code.replace(
  `onClick={() => setImagePreviewModal({ url: handMeta.url, date: handMeta.date, time: handMeta.time, staffName: selectedEquipmentStatus.staffName, stage: 'Equipment Handover' })}`,
  `onClick={() => setImagePreviewModal({ url: handUrl, date: handTime ? formatDateDDMMYY(handTime) : '-', time: handTime ? convertTo12Hour(handTime.split('T')[1]?.split('.')[0] || '') : '-', staffName: selectedEquipmentStatus.staffName, stage: 'Equipment Handover' })}`
);

code = code.replace(
  `<td className="py-3 px-3 text-center font-mono text-zinc-300">{recMeta.date}</td>`,
  `<td className="py-3 px-3 text-center font-mono text-zinc-300">{recTime ? formatDateDDMMYY(recTime) : '-'}</td>`
);
code = code.replace(
  `<td className="py-3 px-3 text-right font-mono text-zinc-300">{recMeta.time}</td>`,
  `<td className="py-3 px-3 text-right font-mono text-zinc-300">{recTime ? convertTo12Hour(recTime.split('T')[1]?.split('.')[0] || '') : '-'}</td>`
);

code = code.replace(
  `<td className="py-3 px-3 text-center font-mono text-zinc-300">{handMeta.date}</td>`,
  `<td className="py-3 px-3 text-center font-mono text-zinc-300">{handTime ? formatDateDDMMYY(handTime) : '-'}</td>`
);
code = code.replace(
  `<td className="py-3 px-3 text-right font-mono text-zinc-300">{handMeta.time}</td>`,
  `<td className="py-3 px-3 text-right font-mono text-zinc-300">{handTime ? convertTo12Hour(handTime.split('T')[1]?.split('.')[0] || '') : '-'}</td>`
);

// For Event Images Modal
code = code.replace(
  `onClick={() => setImagePreviewModal({ url: evStartMeta.url, date: evStartMeta.date, time: evStartMeta.time, staffName: selectedEventImages.staffName, stage: 'Event Start' })}`,
  `onClick={() => setImagePreviewModal({ url: startUrl, date: startTime ? formatDateDDMMYY(startTime) : '-', time: startTime ? convertTo12Hour(startTime.split('T')[1]?.split('.')[0] || '') : '-', staffName: selectedEventImages.staffName, stage: 'Event Start' })}`
);
code = code.replace(
  `onClick={() => setImagePreviewModal({ url: evEndMeta.url, date: evEndMeta.date, time: evEndMeta.time, staffName: selectedEventImages.staffName, stage: 'Event End' })}`,
  `onClick={() => setImagePreviewModal({ url: endUrl, date: endTime ? formatDateDDMMYY(endTime) : '-', time: endTime ? convertTo12Hour(endTime.split('T')[1]?.split('.')[0] || '') : '-', staffName: selectedEventImages.staffName, stage: 'Event End' })}`
);

code = code.replace(
  `<td className="py-3 px-3 text-center font-mono text-zinc-300">{evStartMeta.date}</td>`,
  `<td className="py-3 px-3 text-center font-mono text-zinc-300">{startTime ? formatDateDDMMYY(startTime) : '-'}</td>`
);
code = code.replace(
  `<td className="py-3 px-3 text-right font-mono text-zinc-300">{evStartMeta.time}</td>`,
  `<td className="py-3 px-3 text-right font-mono text-zinc-300">{startTime ? convertTo12Hour(startTime.split('T')[1]?.split('.')[0] || '') : '-'}</td>`
);

code = code.replace(
  `<td className="py-3 px-3 text-center font-mono text-zinc-300">{evEndMeta.date}</td>`,
  `<td className="py-3 px-3 text-center font-mono text-zinc-300">{endTime ? formatDateDDMMYY(endTime) : '-'}</td>`
);
code = code.replace(
  `<td className="py-3 px-3 text-right font-mono text-zinc-300">{evEndMeta.time}</td>`,
  `<td className="py-3 px-3 text-right font-mono text-zinc-300">{endTime ? convertTo12Hour(endTime.split('T')[1]?.split('.')[0] || '') : '-'}</td>`
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
