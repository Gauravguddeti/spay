const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      replaceInDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.json') || file.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const newContent = content.replace(/Spendly/g, 'SPAY').replace(/spendly/g, 'spay');
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
      }
    }
  }
}

['./app', './components', './lib', './styles', './config'].forEach(replaceInDir);

if (fs.existsSync('./package.json')) {
    const content = fs.readFileSync('./package.json', 'utf8');
    fs.writeFileSync('./package.json', content.replace(/Spendly/g, 'SPAY').replace(/spendly/g, 'spay'));
}
