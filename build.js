import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { collectModules, rewriteImports } from './tools/modules.mjs';

const root = process.cwd(),
  output = path.resolve(root, '_site');
if (path.dirname(output) !== root)
  throw Error('Build output must be inside the project');
const modules = await collectModules(['bootstrap.js']);
const css = await fs.readFile('style.css', 'utf8'),
  html = await fs.readFile('index.html', 'utf8');
const assets = await Promise.all(
  ['sedan-cabin.glb', 'sedan-exterior.glb'].map(async (file) => ({
    file,
    data: await fs.readFile('assets/' + file),
  })),
);
const digest = createHash('sha256').update(css).update(html);
for (const { file, source } of modules) digest.update(file).update(source);
for (const { data } of assets) digest.update(data);
const hash = digest.digest('hex').slice(0, 12);
const hashed = (file) => file.replace(/(\.[^./]+)$/, '.' + hash + '$1');
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
for (const { file, source } of modules) {
  const destination = path.join(output, hashed(file));
  await fs.mkdir(path.dirname(destination), { recursive: true });
  let content = rewriteImports(source, file, (target) => {
    const relative = path.posix.relative(
      path.posix.dirname(file),
      hashed(target),
    );
    return relative.startsWith('.') ? relative : './' + relative;
  });
  if (file === 'model-assets.js')
    content = content.replace("'./assets/'", "'./assets/" + hash + "/'");
  await fs.writeFile(destination, content, 'utf8');
}
await fs.mkdir(path.join(output, 'assets', hash), { recursive: true });
for (const { file, data } of assets)
  await fs.writeFile(path.join(output, 'assets', hash, file), data);
await fs.writeFile(path.join(output, hashed('style.css')), css, 'utf8');
await fs.writeFile(
  path.join(output, 'index.html'),
  html
    .replace('href="style.css"', 'href="' + hashed('style.css') + '"')
    .replace('src="bootstrap.js"', 'src="' + hashed('bootstrap.js') + '"'),
  'utf8',
);
try {
  await fs.cp('docs/screenshots', path.join(output, 'screenshots'), {
    recursive: true,
  });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
console.log(
  'Static build: _site/ (' + hash + ', ' + modules.length + ' modules, 2 GLBs)',
);
