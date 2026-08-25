import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
const allPaths = new Set();
function addPaths(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  list.forEach(f => {
    const full = path.join(dir, f);
    allPaths.add(full);
    if (fs.statSync(full).isDirectory()) addPaths(full);
  });
}
addPaths('./src');

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const resolved = path.resolve(path.dirname(file), importPath);
      // check if resolved exists ignoring extension
      let found = false;
      const exts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css'];
      for (const ext of exts) {
        if (fs.existsSync(resolved + ext)) {
          found = true;
          // check actual casing
          const dir = path.dirname(resolved + ext);
          const base = path.basename(resolved + ext);
          const actualFiles = fs.readdirSync(dir);
          if (!actualFiles.includes(base)) {
            console.error(`Case mismatch in ${file}: imported '${importPath}', actual file is '${base}'`);
            process.exit(1);
          }
          break;
        }
      }
      if (!found && fs.existsSync(resolved)) {
         // might be a directory with index
         if (fs.statSync(resolved).isDirectory()) {
           const actualFiles = fs.readdirSync(path.dirname(resolved));
           if (!actualFiles.includes(path.basename(resolved))) {
             console.error(`Case mismatch in ${file}: imported directory '${importPath}'`);
             process.exit(1);
           }
         }
      }
    }
  }
});
console.log('Case check passed');
