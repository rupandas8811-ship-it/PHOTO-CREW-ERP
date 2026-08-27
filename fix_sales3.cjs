const fs = require('fs');
let content = fs.readFileSync('temp.tsx', 'utf8');

const tail = `
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
                onClick={() => setFilterStatus(card.filterValue as any)}
                isActive={filterStatus === card.filterValue}
                chartPoints={card.chartPoints}
                trendText={card.trendText}
              />
            ))}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300 whitespace-nowrap">
                <thead className="bg-zinc-950/50 border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Lead ID</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Events</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.lead_id || lead.id} className="hover:bg-zinc-800/20 transition-colors group">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-zinc-500">#{(lead.lead_id || lead.id || '').slice(0, 6)}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-100">
                        {lead.customer_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 truncate max-w-[150px]">
                          {lead.event_type || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{lead.mobile || '-'}</td>
                      <td className="px-4 py-3">
                        <StatusText status={lead.current_status || lead.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-300">
                        {(lead.total_amount || lead.quotation_amount) > 0 ? \`$\${(lead.total_amount || lead.quotation_amount).toLocaleString()}\` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="p-1.5 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
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
    </div>
  );
};
`;

content = content + tail;
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf8');
