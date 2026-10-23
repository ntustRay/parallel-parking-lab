import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectModules } from './modules.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const modules = await collectModules(['game.js'], root);
const { version } = JSON.parse(
  await fs.readFile(path.join(root, 'package.json'), 'utf8'),
);
const css = await fs.readFile(path.join(root, 'style.css'), 'utf8');
const bootSource = await fs.readFile(path.join(root, 'bootstrap.js'), 'utf8');
const appLicense = await fs.readFile(path.join(root, 'LICENSE'), 'utf8');
const threeLicense = await fs.readFile(
  path.join(root, 'vendor/THREE-LICENSE.txt'),
  'utf8',
);
const assets = {};
for (const file of ['sedan-cabin.glb', 'sedan-exterior.glb'])
  assets[file] = (await fs.readFile(path.join(root, 'assets', file))).toString(
    'base64',
  );
const data = JSON.stringify(modules).replaceAll('<', '\\u003c');
const bootstrap = [
  'const modules=JSON.parse(document.querySelector("#offline-modules").textContent),urls={};',
  'globalThis.parkingAssets=' + JSON.stringify(assets) + ';',
  'try{',
  'for(const {file,source,dependencies}of modules){',
  'const targets=Object.fromEntries(dependencies.map(d=>[d.specifier,d.target]));',
  'const resolved=source.replace(/(?:\\bfrom\\s*|\\bimport\\s*\\()([\\x27\\x22])(\\.{1,2}\\/[^\\x27\\x22]+\\.js)\\1/g,(match,q,specifier)=>{',
  'const url=urls[targets[specifier]];if(!url)throw Error("Missing offline module: "+specifier);',
  'return match.replace(q+specifier+q,q+url+q);});',
  'urls[file]=URL.createObjectURL(new Blob([resolved],{type:"text/javascript"}));}',
  'const start=' +
    JSON.stringify(bootSource) +
    '.replace(/import\\(([\\x27\\x22])\\.\\/game\\.js\\1\\)/,"import("+JSON.stringify(urls["game.js"])+")");',
  'await import(URL.createObjectURL(new Blob([start],{type:"text/javascript"})));',
  '}catch(error){console.error(error);window.parkingBoot?.fail("離線場景無法開啟，請重新下載完整 HTML 後再試。");}',
].join('\n');
let html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
html = html.replace(
  '<link rel="stylesheet" href="style.css">',
  () => '<style>' + css + '</style>',
);
html = html.replace(
  '<script type="module" src="bootstrap.js"></script>',
  () =>
    '<script type="application/json" id="offline-modules">' +
    data +
    '</script><script type="module">' +
    bootstrap +
    '</script>',
);
html = html.replace(
  '</head>',
  () =>
    '<meta name="parking-build" content="offline-v' +
    version +
    '"><!-- ' +
    (appLicense + '\nThree.js: ' + threeLicense).replaceAll('--', '—') +
    ' --></head>',
);
const destination = path.join(
  root,
  'dist',
  'parking-lab-v' + version + '.html',
);
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.writeFile(destination, html);
console.log(
  JSON.stringify({
    file: destination,
    bytes: Buffer.byteLength(html),
    modules: modules.length,
    assets: Object.keys(assets),
  }),
);
