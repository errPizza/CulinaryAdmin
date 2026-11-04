import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const pages = ['resumen', 'licencias', 'ganancias', 'versiones', 'soporte', 'fallos', 'sucursales', 'dueno', 'equipo'];
const names = { resumen: '01-resumen', licencias: '02-licencias', ganancias: '03-ganancias', versiones: '04-versiones', soporte: '05-soporte', fallos: '06-fallos', sucursales: '07-sucursales', dueno: '08-panel-del-dueno', equipo: '09-equipo-y-seguridad' };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
page.on('pageerror', e => console.log('ERR', e.message));
for (const p of process.argv[2] ? [process.argv[2]] : pages) {
  await page.goto(pathToFileURL(path.join(dir, 'maqueta.html')).href + '?p=' + p);
  await page.waitForSelector('body[data-ready]');
  await page.waitForTimeout(150);
  const over = await page.evaluate(() => { const m = document.querySelector('.main'); return m.scrollHeight - m.clientHeight; });
  await page.screenshot({ path: path.join(dir, names[p] + '.png') });
  console.log(names[p], 'overflow', over);
}
await browser.close();
