const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const base = process.env.GAME_TEST_URL || 'http://localhost:3210';
async function read(url) {
  const res = await fetch(base + url);
  assert.equal(res.status, 200, url);
  return Buffer.from(await res.arrayBuffer());
}
async function main() {
  const home = (await read('/')).toString();
  let checked = 0;
  for (const slug of ['dungeon-crawler', 'vampire-survivors']) {
    assert.equal(home.split(`id="open-${slug}"`).length - 1, 1);
    assert.ok(home.includes(`href="/games/${slug}/"`));
    assert.ok((await read(`/assets/${slug}-icon.svg`)).toString().includes('<svg'));
    const folder = path.join(root, 'public/games', slug);
    const files = fs.readdirSync(folder, { recursive: true }).filter(f => fs.statSync(path.join(folder, f)).isFile());
    for (let start = 0; start < files.length; start += 12) {
      await Promise.all(files.slice(start, start + 12).map(async file => {
        const bytes = await read(`/games/${slug}/${file.replaceAll('\\', '/')}`);
        assert.deepEqual(bytes, fs.readFileSync(path.join(folder, file)), file);
        checked++;
      }));
    }
    const html = (await read(`/games/${slug}/`)).toString();
    assert.ok(!html.includes('fonts.googleapis.com'));
    assert.ok(!html.includes('serviceWorker'));
    assert.ok(fs.readFileSync(path.join(folder, 'LICENSE'), 'utf8').includes('MIT License'));
  }
  console.log(`PASS: homepage icons, licenses and ${checked} deployed files verified byte-for-byte at ${base}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
