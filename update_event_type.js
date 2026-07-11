const fs = require('fs');

const opLeadsFile = 'src/components/operations/OperationsLeads.tsx';
let opLeadsContent = fs.readFileSync(opLeadsFile, 'utf8');

opLeadsContent = opLeadsContent.replace(
  '<div className="text-[10px] text-zinc-400 font-sans font-normal mt-0.5">{ord.event_type}</div>',
  `{lead?.events && lead.events.length > 0 ? (
                        <div className="space-y-1.5 inner-cell-scroll mt-1">
                          {lead.events.map((ev: any, evIdx: number) => (
                            <div key={ev.id || evIdx} className="text-[10px] text-zinc-400 font-sans font-normal truncate" title={ev.event_name || ev.event_type || 'Other'}>
                              {ev.event_name || ev.event_type || 'Other'}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-400 font-sans font-normal mt-0.5">{ord.event_type}</div>
                      )}`
);

fs.writeFileSync(opLeadsFile, opLeadsContent);

const prodModuleFile = 'src/components/ProductionModule.tsx';
let prodContent = fs.readFileSync(prodModuleFile, 'utf8');

prodContent = prodContent.replace(
  `{order.event_type}`,
  `{lead?.events && lead.events.length > 0 ? (
                              <div className="space-y-1.5 inner-cell-scroll">
                                {lead.events.map((ev: any, evIdx: number) => (
                                  <div key={ev.id || evIdx} className="text-xs truncate" title={ev.event_name || ev.event_type || 'Other'}>
                                    {ev.event_name || ev.event_type || 'Other'}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              order.event_type
                            )}`
);

fs.writeFileSync(prodModuleFile, prodContent);
