with open('src/components/SalesModule.tsx', 'r', errors='ignore') as f:
    lines = f.readlines()

# find where "Leads Directory Header Bar & Collapsible Utilities" is in the file
# and replace everything from line 11617
new_lines = lines[:11617]
new_lines.append("""            ))}
          </div>
          
          {/* Leads Directory Header Bar & Collapsible Utilities */}
          <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 text-slate-300">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-semibold text-white">Leads Directory</h3>
               <span className="text-sm bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-full">{filteredLeads.length} Leads</span>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead>
                   <tr className="border-b border-slate-700/50 text-slate-400">
                     <th className="py-3 px-4">Lead ID</th>
                     <th className="py-3 px-4">Customer</th>
                     <th className="py-3 px-4">Mobile</th>
                     <th className="py-3 px-4">Status</th>
                     <th className="py-3 px-4">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-700/50">
                   {filteredLeads.slice(0, 50).map((lead) => (
                     <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors">
                       <td className="py-3 px-4 font-mono text-xs">{lead.lead_id}</td>
                       <td className="py-3 px-4 font-medium text-slate-200">{lead.customer_name}</td>
                       <td className="py-3 px-4">{lead.mobile}</td>
                       <td className="py-3 px-4">
                         <span className="px-2 py-1 rounded text-xs bg-slate-800 border border-slate-700">
                           {lead.current_status}
                         </span>
                       </td>
                       <td className="py-3 px-4">
                         <button 
                           onClick={() => handleSelectLead(lead)}
                           className="text-indigo-400 hover:text-indigo-300 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 rounded transition-colors"
                         >
                           View Details
                         </button>
                       </td>
                     </tr>
                   ))}
                   {filteredLeads.length === 0 && (
                     <tr>
                       <td colSpan={5} className="py-8 text-center text-slate-500">No leads found matching criteria.</td>
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
}
""")

with open('src/components/SalesModule.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
