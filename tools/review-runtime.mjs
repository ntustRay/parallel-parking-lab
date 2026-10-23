import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
    : 'playwright'
);
const browser = await chromium.launch({ headless: true });
const root = path.resolve('_site'),
  errors = [],
  unexpected = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('http://parking.test/**', async (route) => {
    const url = new URL(route.request().url());
    const file = path.resolve(
      root,
      '.' +
        (url.pathname === '/'
          ? '/index.html'
          : decodeURIComponent(url.pathname)),
    );
    assert.ok(file.startsWith(root + path.sep));
    const type =
      {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript',
        '.css': 'text/css',
      }[path.extname(file)] || 'application/octet-stream';
    await route.fulfill({ body: await fs.readFile(file), contentType: type });
  });
  await page.goto('http://parking.test/');
  await page.locator('#start').click();
  await page.keyboard.press('f');
  await page.keyboard.down('w');
  const samples = await page.evaluate(async () => {
    const samples = [];
    let previous = -1;
    for (let i = 0; i < 45; i++) {
      await new Promise(requestAnimationFrame);
      const data = window.parkingDiagnostics;
      if (data.frames !== previous) {
        samples.push(data);
        previous = data.frames;
      }
    }
    return samples;
  });
  await page.keyboard.up('w');
  await page.keyboard.press('p');
  assert.ok(samples.length >= 3);
  for (const sample of samples) {
    assert.equal(sample.worldUpdates, sample.frames);
    assert.equal(sample.views, 4);
  }
  for (const key of ['2', '3', '4', '1']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(100);
  }
  // Rebuilding each course must leave shared vehicle meshes usable.
  for (const exercise of [
    'garage',
    's-curve',
    'uturn-two',
    'uturn-four',
    'parallel',
  ]) {
    await page.locator('#settings').click();
    await page.locator('#exercise').selectOption(exercise);
    await page.locator('#start').click();
    await page.waitForTimeout(120);
  }
  const { version } = JSON.parse(await fs.readFile('package.json', 'utf8'));
  const offlineHTML = await fs.readFile(
    'dist/parking-lab-v' + version + '.html',
    'utf8',
  );
  const offline = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  offline.on('pageerror', (error) => errors.push(error.message));
  await offline.route('**/*', async (route) => {
    if (route.request().url() === 'http://offline.parking.test/')
      return route.fulfill({
        body: offlineHTML,
        contentType: 'text/html; charset=utf-8',
      });
    unexpected.push(route.request().url());
    await route.abort();
  });
  await offline.goto('http://offline.parking.test/');
  await offline.locator('#setup[open]').waitFor();
  await offline.locator('#start').click();
  await offline.waitForFunction(() => window.parkingDiagnostics?.frames > 0);
  assert.deepEqual(
    unexpected,
    [],
    'offline build must not request network resources',
  );
  assert.deepEqual(errors, [], 'runtime errors');
  const sorted = samples.map((s) => s.cpuFrameMs).sort((a, b) => a - b);
  const report = {
    version,
    viewport: { width: 1440, height: 960 },
    renderer: 'CI Chromium; CPU submission time, not GPU frame time',
    samples: samples.length,
    worldUpdatesPerFrame: 1,
    viewsPerFrame: 4,
    medianCpuMs: sorted[Math.floor(sorted.length / 2)],
    p95CpuMs: sorted[Math.floor(sorted.length * 0.95)],
    maxCalls: Math.max(...samples.map((s) => s.calls)),
    maxTriangles: Math.max(...samples.map((s) => s.triangles)),
    offline: { externalRequests: unexpected.length, booted: true },
    errors,
  };
  await fs.writeFile(
    '_site/screenshots/runtime-review.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
