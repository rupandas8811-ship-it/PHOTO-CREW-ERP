const babel = require('@babel/core');
const fs = require('fs');
try {
  babel.transformSync(fs.readFileSync('src/components/SalesModule.tsx', 'utf8'), {
    filename: 'SalesModule.tsx',
    presets: ['@babel/preset-typescript', '@babel/preset-react']
  });
} catch (e) {
  console.log(e.message);
}
