import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

function findFiles(dir, pattern) {
  const results = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        results.push(...findFiles(full, pattern));
      } else if (entry.endsWith(pattern)) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

const files = findFiles('.vercel/output', '.vc-config.json');
for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  if (content.includes('nodejs18.x')) {
    writeFileSync(file, content.replace(/nodejs18\.x/g, 'nodejs20.x'));
    console.log(`Patched runtime: ${file}`);
  }
}
