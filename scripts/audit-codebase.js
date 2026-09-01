const fs = require('fs');
const path = require('path');

console.log('--- Starting Comprehensive Codebase Audit ---');

const srcDir = path.join(__dirname, '..', 'src');
let issues = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const code = fs.readFileSync(fullPath, 'utf8');
      
      // Check 1: API routes without try-catch or without dynamic export
      if (fullPath.includes(path.join('app', 'api'))) {
        if (!code.includes('export const dynamic') && !code.includes('export async function GET')) {
          issues.push({ file: fullPath, issue: 'Missing export const dynamic' });
        }
      }

      // Check 2: Potential unhandled JSON parse crashes
      if (code.includes('JSON.parse(') && !code.includes('try {') && !code.includes('try{')) {
        issues.push({ file: fullPath, issue: 'Potentially unsafe JSON.parse without try-catch' });
      }

      // Check 3: Missing null checks on array methods
      if (code.includes('.map(') && !code.includes('?.map') && code.includes('data.map')) {
        issues.push({ file: fullPath, issue: 'Array map without optional chaining' });
      }
    }
  }
}

scanDir(srcDir);
console.log(`Audit complete. Found ${issues.length} potential issues to review.`);
issues.forEach(i => console.log(`- [${path.basename(i.file)}] ${i.issue}`));