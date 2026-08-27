import fs from 'fs';
import zlib from 'zlib';

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

for (const obj of objects) {
    try {
        const compressed = fs.readFileSync(obj);
        const decompressed = zlib.inflateSync(compressed);
        const text = decompressed.toString('utf8');
        
        if (text.includes('ProductionModule') && text.includes('React')) {
            console.log(`Blob ${obj} has length ${text.length}`);
            fs.writeFileSync(`blob_${obj.replace(/\//g, '_')}.txt`, text);
        }
    } catch (e) { }
}
