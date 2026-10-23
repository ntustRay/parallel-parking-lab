import fs from 'node:fs/promises';
import path from 'node:path';

const imports = /(?:\bfrom\s*|\bimport\s*\()(['"])(\.{1,2}\/[^'"]+\.js)\1/g;
export function dependencies(source, file) {
  return [...source.matchAll(imports)].map((match) => {
    const target = path.posix.normalize(
      path.posix.join(path.posix.dirname(file), match[2]),
    );
    if (target.startsWith('../') || path.posix.isAbsolute(target))
      throw Error('Module outside project: ' + target);
    return { specifier: match[2], target };
  });
}
export function rewriteImports(source, file, resolve) {
  const targets = new Map(
    dependencies(source, file).map((item) => [item.specifier, item.target]),
  );
  return source.replace(imports, (match, quote, specifier) =>
    match.replace(
      quote + specifier + quote,
      quote + resolve(targets.get(specifier)) + quote,
    ),
  );
}
export async function collectModules(entries, root = process.cwd()) {
  const modules = [],
    seen = new Set(),
    visiting = new Set();
  async function visit(file) {
    if (seen.has(file)) return;
    if (visiting.has(file)) throw Error('Circular offline module: ' + file);
    visiting.add(file);
    const source = await fs.readFile(path.join(root, file), 'utf8');
    const imports = dependencies(source, file);
    for (const { target } of imports) await visit(target);
    visiting.delete(file);
    seen.add(file);
    modules.push({ file, source, dependencies: imports });
  }
  for (const file of entries) await visit(file);
  return modules;
}
