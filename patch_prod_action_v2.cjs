const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const old1 = `                                    {(displayStatus === "Order Closed" || displayStatus === "Closed" || displayStatus === "Completed" || displayStatus === "Project Closed") && (`;
const new1 = `                                    {isFinished && (`;

const old2 = `                                    {!(displayStatus === "Order Closed" || displayStatus === "Closed" || displayStatus === "Completed" || displayStatus === "Project Closed") && (`;
const new2 = `                                    {!isFinished && (`;

const old3 = `                                        if (displayStatus === "Order Closed" || displayStatus === "Closed" || displayStatus === "Completed" || displayStatus === "Project Closed") return;`;
const new3 = `                                        if (isFinished) return;`;

code = code.replace(old1, new1);
code = code.replace(old2, new2);
code = code.replace(old3, new3);

fs.writeFileSync('src/components/ProductionModule.tsx', code);
