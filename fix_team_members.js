import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

const fixes = [
  {
    find: `                                                <div className="flex-1">
                                                  <input
                                                    type="text"
                                                    placeholder="Staff Name"
                                                    value={staffName}
                                                    onChange={(e) => {
                                                      const currentList = [...(editableInclusions[eventKey] !== undefined ? editableInclusions[eventKey] : inclusionsList)];
                                                      currentList[idx] = e.target.value;
                                                      setEditableInclusions({
                                                        ...editableInclusions,
                                                        [eventKey]: currentList
                                                      });
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100"
                                                  />
                                                </div>`,
    replace: `                                                <div className="flex-1 grid grid-cols-2 gap-2">
                                                  <input
                                                    type="text"
                                                    placeholder="Staff Name"
                                                    value={staffName}
                                                    onChange={(e) => {
                                                      const currentList = [...(editableInclusions[eventKey] !== undefined ? editableInclusions[eventKey] : inclusionsList)];
                                                      currentList[idx] = \`\${e.target.value}|\${staffMobile}\`;
                                                      setEditableInclusions({
                                                        ...editableInclusions,
                                                        [eventKey]: currentList
                                                      });
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100"
                                                  />
                                                  <input
                                                    type="text"
                                                    placeholder="Mobile Number"
                                                    value={staffMobile}
                                                    onChange={(e) => {
                                                      const currentList = [...(editableInclusions[eventKey] !== undefined ? editableInclusions[eventKey] : inclusionsList)];
                                                      currentList[idx] = \`\${staffName}|\${e.target.value}\`;
                                                      setEditableInclusions({
                                                        ...editableInclusions,
                                                        [eventKey]: currentList
                                                      });
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100 font-mono"
                                                  />
                                                </div>`
  },
  {
    find: `                                            <div className="flex-1">
                                              <input
                                                type="text"
                                                placeholder="Staff Name"
                                                value={staffName}
                                                onChange={(e) => {
                                                  const currentList = [...(editableInclusions[pkgId] || [])];
                                                  currentList[idx] = e.target.value;
                                                  setEditableInclusions({
                                                    ...editableInclusions,
                                                    [pkgId]: currentList
                                                  });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100"
                                              />
                                            </div>`,
    replace: `                                            <div className="flex-1 grid grid-cols-2 gap-2">
                                              <input
                                                type="text"
                                                placeholder="Staff Name"
                                                value={staffName}
                                                onChange={(e) => {
                                                  const currentList = [...(editableInclusions[pkgId] || [])];
                                                  currentList[idx] = \`\${e.target.value}|\${staffMobile}\`;
                                                  setEditableInclusions({
                                                    ...editableInclusions,
                                                    [pkgId]: currentList
                                                  });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100"
                                              />
                                              <input
                                                type="text"
                                                placeholder="Mobile Number"
                                                value={staffMobile}
                                                onChange={(e) => {
                                                  const currentList = [...(editableInclusions[pkgId] || [])];
                                                  currentList[idx] = \`\${staffName}|\${e.target.value}\`;
                                                  setEditableInclusions({
                                                    ...editableInclusions,
                                                    [pkgId]: currentList
                                                  });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100 font-mono"
                                              />
                                            </div>`
  },
  {
    find: `                                                    <div className="flex-1">
                                                      <input
                                                        type="text"
                                                        placeholder="Staff Name"
                                                        value={staffName}
                                                        disabled={isLeadLocked}
                                                        onChange={(e) => {
                                                          const currentList = [...(editableInclusions[eventKey] !== undefined ? editableInclusions[eventKey] : inclusionsList)];
                                                          currentList[idx] = e.target.value;
                                                          setEditableInclusions({
                                                            ...editableInclusions,
                                                            [eventKey]: currentList
                                                          });
                                                        }}
                                                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100"
                                                      />
                                                    </div>`,
    replace: `                                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                                      <input
                                                        type="text"
                                                        placeholder="Staff Name"
                                                        value={staffName}
                                                        disabled={isLeadLocked}
                                                        onChange={(e) => {
                                                          const currentList = [...(editableInclusions[eventKey] !== undefined ? editableInclusions[eventKey] : inclusionsList)];
                                                          currentList[idx] = \`\${e.target.value}|\${staffMobile}\`;
                                                          setEditableInclusions({
                                                            ...editableInclusions,
                                                            [eventKey]: currentList
                                                          });
                                                        }}
                                                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100"
                                                      />
                                                      <input
                                                        type="text"
                                                        placeholder="Mobile Number"
                                                        value={staffMobile}
                                                        disabled={isLeadLocked}
                                                        onChange={(e) => {
                                                          const currentList = [...(editableInclusions[eventKey] !== undefined ? editableInclusions[eventKey] : inclusionsList)];
                                                          currentList[idx] = \`\${staffName}|\${e.target.value}\`;
                                                          setEditableInclusions({
                                                            ...editableInclusions,
                                                            [eventKey]: currentList
                                                          });
                                                        }}
                                                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100 font-mono"
                                                      />
                                                    </div>`
  },
  {
    find: `                                              <div className="flex-1">
                                                <input
                                                  type="text"
                                                  placeholder="Staff Name"
                                                  value={staffName}
                                                  disabled={isLeadLocked}
                                                  onChange={(e) => {
                                                    const currentList = [...(editableInclusions[selectedPkgId] || [])];
                                                    currentList[idx] = e.target.value;
                                                    setEditableInclusions({
                                                      ...editableInclusions,
                                                      [selectedPkgId]: currentList
                                                    });
                                                  }}
                                                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100"
                                                />
                                              </div>`,
    replace: `                                              <div className="flex-1 grid grid-cols-2 gap-2">
                                                <input
                                                  type="text"
                                                  placeholder="Staff Name"
                                                  value={staffName}
                                                  disabled={isLeadLocked}
                                                  onChange={(e) => {
                                                    const currentList = [...(editableInclusions[selectedPkgId] || [])];
                                                    currentList[idx] = \`\${e.target.value}|\${staffMobile}\`;
                                                    setEditableInclusions({
                                                      ...editableInclusions,
                                                      [selectedPkgId]: currentList
                                                    });
                                                  }}
                                                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100"
                                                />
                                                <input
                                                  type="text"
                                                  placeholder="Mobile Number"
                                                  value={staffMobile}
                                                  disabled={isLeadLocked}
                                                  onChange={(e) => {
                                                    const currentList = [...(editableInclusions[selectedPkgId] || [])];
                                                    currentList[idx] = \`\${staffName}|\${e.target.value}\`;
                                                    setEditableInclusions({
                                                      ...editableInclusions,
                                                      [selectedPkgId]: currentList
                                                    });
                                                  }}
                                                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100 font-mono"
                                                />
                                              </div>`
  }
];

let replacedCount = 0;
for (const fix of fixes) {
  if (content.includes(fix.find)) {
    content = content.replace(fix.find, fix.replace);
    replacedCount++;
  } else {
    console.log("Could not find block:\n" + fix.find);
  }
}

fs.writeFileSync('src/components/SalesModule.tsx', content);
console.log('Replaced ' + replacedCount + ' blocks.');
