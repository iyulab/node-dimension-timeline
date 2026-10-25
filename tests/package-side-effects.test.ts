import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, test } from 'vitest';

// A bundler honours `sideEffects` strictly: inside a module it treats as free of side effects, an import made only for its
// effect (a bare `import` of a path) is dropped, however side-effectful `./x.js` itself is declared. Every module that makes such an
// import — the registration chain from the package entry down to `customElements.define` — must therefore be declared too.

const root = join(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { sideEffects: string[]; exports: { '.': { import: string } } };

// Globs of the `./dist/components/**/*.js` shape: a double star and slash is any number of folders, a single star stays within one.
function toRegExp(glob: string): RegExp {
  const body = glob
    .replace(/^\.\//, '')
    .split('**/')
    .map(part => part.split('*').map(literal => literal.replace(/[.^$+?()|{}\\]/g, '\\$&')).join('[^/]*'))
    .join('(?:.*/)?');
  return new RegExp(`^${body}$`);
}

const declared = pkg.sideEffects.map(toRegExp);
const isDeclared = (path: string) => declared.some(r => r.test(path.replace(/^\.\//, '')));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? sources(full) : full.endsWith('.ts') ? [full] : [];
  });
}

describe('package sideEffects', () => {
  test('the entry is declared — it imports the element registrations for their effect only', () => {
    expect(isDeclared(pkg.exports['.'].import)).toBe(true);
    expect(isDeclared('src/index.ts')).toBe(true);
  });

  test('every source module with an import made only for its effect is declared', () => {
    const bare = /^\s*import\s+['"][^'"]+['"]\s*;?\s*$/m;
    const missing = sources(join(root, 'src'))
      .filter(file => bare.test(readFileSync(file, 'utf8')))
      .map(file => relative(root, file).split(sep).join('/'))
      .filter(path => !isDeclared(path));
    expect(missing).toEqual([]);
  });
});
