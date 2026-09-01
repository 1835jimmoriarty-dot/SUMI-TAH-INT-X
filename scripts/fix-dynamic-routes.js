const fs = require('fs');
const path = require('path');

function updateRoute(relPath) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  if (!content.includes('force-dynamic')) {
    content = "export const dynamic = 'force-dynamic';\n" + content;
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Updated to force-dynamic:', relPath);
  }
}

updateRoute('src/app/api/health/route.ts');
updateRoute('src/app/api/ready/route.ts');