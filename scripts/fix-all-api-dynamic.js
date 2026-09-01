const fs = require('fs');
const path = require('path');

// 1. Add force-dynamic to all API routes
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');

function ensureDynamic(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      ensureDynamic(fullPath);
    } else if (entry.name === 'route.ts') {
      let code = fs.readFileSync(fullPath, 'utf8');
      if (!code.includes("export const dynamic = 'force-dynamic'") && !code.includes('export const dynamic = "force-dynamic"')) {
        code = "export const dynamic = 'force-dynamic';\n" + code;
        fs.writeFileSync(fullPath, code, 'utf8');
        console.log('Added force-dynamic to:', path.relative(apiDir, fullPath));
      }
    }
  }
}

ensureDynamic(apiDir);
console.log('All API routes ensured dynamic.');