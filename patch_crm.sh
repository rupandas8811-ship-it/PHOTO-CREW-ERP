sed -i '/<\/select>/a\
                          {wizardLeadData.lead_source === "Other" \&\& (\
                            <div className="animate-fade-in-down mt-2">\
                              <label className="block text-xs font-mono font-bold text-amber-500 mb-1.5">\
                                Specify Custom Lead Source Name *\
                              </label>\
                              <input\
                                type="text"\
                                required\
                                placeholder="e.g. Billboard, Event Flyer"\
                                value={wizardLeadData.Specify_Custom_Lead_Source_Name || ""}\
                                disabled={isLeadLocked}\
                                onChange={(e) => setWizardLeadData({ ...wizardLeadData, Specify_Custom_Lead_Source_Name: e.target.value })}\
                                className="w-full bg-slate-955 border border-amber-500/50 rounded-lg py-2 px-3 text-xs text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"\
                              />\
                            </div>\
                          )}' src/components/SalesModule.tsx
