import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function walkDir(dir) {
    let results = [];
    let list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        let stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walkDir(file));
        } else { 
            results.push(file);
        }
    });
    return results;
}

const objects = walkDir('.git/objects').filter(f => !f.includes('/pack/') && !f.includes('/info/'));
let maxLen = 0;
let bestBlob = null;
let bestContent = '';

for (const obj of objects) {
    try {
        const compressed = fs.readFileSync(obj);
        const decompressed = zlib.inflateSync(compressed);
        const text = decompressed.toString('utf8');
        if (text.includes('Sales Performance Dashboard Grid') && text.includes('export const SHOOT_TYPES')) {
            if (text.length > maxLen) {
                maxLen = text.length;
                bestBlob = obj;
                bestContent = text;
            }
        }
    } catch (e) {
        // ignore
    }
}

if (bestBlob) {
    console.log("Found backup in", bestBlob, "length:", maxLen);
    const contentOffset = bestContent.indexOf('\0') + 1;
    fs.writeFileSync('SalesModule_recovered.tsx', bestContent.substring(contentOffset));
    console.log("Saved to SalesModule_recovered.tsx");
} else {
    console.log("Not found.");
}
