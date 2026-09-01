const fs = require('fs');
const path = require('path');

function write(relPath, content) {
  const fullPath = path.resolve(process.cwd(), relPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content.trim(), 'utf8');
  console.log('✓ Created:', relPath);
}

module.exports = { write };