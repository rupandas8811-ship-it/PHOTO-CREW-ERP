const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

// Replace the `<select` block with conditionally rendered block
const oldSelect = `<select
                                      value=""
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (!val) return;`;

const newSelect = `{!(displayStatus === "Order Closed" || displayStatus === "Closed" || displayStatus === "Completed" || displayStatus === "Project Closed") && (
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        if (displayStatus === "Order Closed" || displayStatus === "Closed" || displayStatus === "Completed" || displayStatus === "Project Closed") return;
                                        const val = e.target.value;
                                        if (!val) return;`;

code = code.replace(oldSelect, newSelect);

const oldClose = `                                      <option value="edit_dossier">✎ Edit Full Dossier</option>
                                    </select>`;

const newClose = `                                      <option value="edit_dossier">✎ Edit Full Dossier</option>
                                    </select>
                                    )}`;

code = code.replace(oldClose, newClose);

fs.writeFileSync('src/components/ProductionModule.tsx', code);
