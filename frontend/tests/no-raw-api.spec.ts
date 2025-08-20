import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const ROOT = path.resolve(__dirname, '..');
const ALLOW_DIRS = [
  path.join(ROOT, 'src', 'app', 'api'), // API route files can contain "/api"
];
const ALLOW_FILES = new Set<string>([]);

function shouldSkip(file: string) {
  return (
    file.includes(`${path.sep}.next${path.sep}`) ||
    file.includes(`${path.sep}coverage${path.sep}`) ||
    file.includes(`${path.sep}tests${path.sep}`) ||
    ALLOW_DIRS.some(dir => file.startsWith(dir))
  );
}

function *walk(dir: string): Generator<string> {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) yield *walk(p);
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) yield p;
  }
}

describe('no raw /api leakage', () => {
  it('contains no raw "/api/" literals outside allowed dirs', () => {
    const offenders: string[] = [];
    for (const file of walk(path.join(ROOT, 'src'))) {
      if (shouldSkip(file)) continue;
      const text = fs.readFileSync(file, 'utf8');
      if (text.match(/(^|[^a-zA-Z])\/api\/[a-z]/)) {
        const rel = path.relative(ROOT, file).replace(/\\/g,'/');
        if (!ALLOW_FILES.has(rel)) offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });
});
