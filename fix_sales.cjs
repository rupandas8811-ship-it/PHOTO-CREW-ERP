const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// The corruption started right after `chartPoints: [10, 15, 12, 18, 14, 20, 16], trendText: 'Initial Lead' },`
// We will replace everything from that point onwards.

const splitPoint = content.indexOf("trendText: 'Initial Lead' },");
if (splitPoint === -1) throw new Error("Could not find split point");

const newEnd = `
              { label: 'Quote Sent', val: statQuotesSent, theme: 'purple' as CameraLensTheme, filterValue: 'Quote Sent', chartPoints: [12, 18, 15, 22, 19, 24, 21], trendText: 'Quotation' },
              { label: 'Quote Follow-up', val: statQuoteFollowups, theme: 'gold' as CameraLensTheme, filterValue: 'Quote Follow-up', chartPoints: [5, 12, 8, 15, 10, 19, 14], trendText: 'Scheduled CRM' },
              { label: 'Confirm Order', val: statConfirmedOrders, theme: 'cyan' as CameraLensTheme, filterValue: 'Confirm Order', chartPoints: [8, 15, 12, 20, 16, 25, 24], trendText: 'To Operations' },
              { label: 'Lead Lost', val: statLeadLost, theme: 'red' as CameraLensTheme, filterValue: 'Lead Lost', chartPoints: [4, 6, 3, 7, 5, 8, 4], trendText: 'Opportunity Closed' },
            ].map((card, idx) => (
              <CameraLensStatsCard
                key={idx}
                label={card.label}
                val={card.val}
                theme={card.theme}
                onClick={() => setFilterStatus(card.filterValue)}
                isActive={filterStatus === card.filterValue}
                chartPoints={card.chartPoints}
                trendText={card.trendText}
              />
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
                <thead className="bg-slate-950/50 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Lead ID</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Mobile</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredLeads.map((lead) => {
                    return (
                      <tr key={lead.lead_id} className="hover:bg-slate-800/20 transition-colors group cursor-pointer" onClick={() => setSelectedLead(lead)}>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-500">#{lead.lead_id.slice(0, 8)}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-100">
                          {lead.customer_name}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {lead.mobile || '-'}
                        </td>
                        <td className="px-4 py-3">
                           <span className="px-2 py-1 bg-slate-800 text-xs rounded text-slate-300">{lead.lead_source}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLead(lead);
                            }}
                            className="p-1.5 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No leads found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesModule;
`;

const finalContent = content.substring(0, splitPoint + 28) + newEnd;
fs.writeFileSync('src/components/SalesModule.tsx', finalContent, 'utf-8');
console.log("Done");
