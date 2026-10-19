import {test,expect} from './fixture.js';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

test('downloaded HTML opens without a server and supports driving, mirrors and head return',async({page})=>{
  const root=new URL('../',import.meta.url);
  const built=JSON.parse(execFileSync(process.execPath,['tools/build-offline.mjs'],{cwd:fileURLToPath(root),encoding:'utf8'}));
  const external=[],errors=[];
  page.on('request',request=>{if(/^https?:/.test(request.url()))external.push(request.url());});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(built.file).href);
  await page.locator('#start').click();await expect(page.locator('#world')).toBeVisible();
  await page.keyboard.down('s');await page.locator('[data-gear=R]').click();await page.keyboard.up('s');
  await page.keyboard.down('w');await expect.poll(async()=>Number(await page.locator('#speed').textContent())).toBeGreaterThan(1);
  await page.keyboard.up('w');await page.keyboard.down('s');await expect(page.locator('#speed')).toHaveText('0.0');await page.keyboard.up('s');
  await page.locator('.mirror-right').click();await expect(page.locator('.mirror-right')).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape');await expect(page.locator('.mirror-right')).toHaveAttribute('aria-expanded','false');
  await page.keyboard.down('j');await expect(page.locator('#look-label')).toHaveText('左側 75°');await page.keyboard.up('j');
  await expect(page.locator('#look-label')).toHaveText('正前方');
  expect(external).toEqual([]);expect(errors).toEqual([]);
});
