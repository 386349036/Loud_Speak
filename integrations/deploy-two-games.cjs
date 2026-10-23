// Build dungeon first: npm run build --prefix integrations/dungeon-crawler-now
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function deploy(sourceName, slug, entries) {
  const source = path.join(__dirname, sourceName);
  const output = path.join(root, 'public/games', slug);
  fs.mkdirSync(output, { recursive: true });
  for (const entry of entries) fs.cpSync(path.join(source, entry), path.join(output, entry), { recursive: true });
  for (const entry of ['LICENSE', 'UPSTREAM.json']) fs.copyFileSync(path.join(source, entry), path.join(output, entry));
  return output;
}
const dungeonSource = path.join(__dirname, 'dungeon-crawler-now');
if (!fs.existsSync(path.join(dungeonSource, 'dist/index.html'))) throw Error('Build dungeon-crawler-now first.');
const dungeon = path.join(root, 'public/games/dungeon-crawler');
fs.mkdirSync(dungeon, { recursive: true });
fs.cpSync(path.join(dungeonSource, 'dist'), dungeon, { recursive: true });
for (const name of ['LICENSE', 'UPSTREAM.json']) fs.copyFileSync(path.join(dungeonSource, name), path.join(dungeon, name));
const htmlPath = path.join(dungeon, 'index.html');
fs.writeFileSync(htmlPath, fs.readFileSync(htmlPath, 'utf8')
  .replace(/\s*<link[^>]+https:\/\/fonts\.[^>]+>/g, '')
  .replace('<title>Infernal Ascent</title>', '<title>Infernal Ascent · 地牢探险 · Loud Speak</title>'));
const survivor = deploy('canvas-vampire-survivors', 'vampire-survivors', ['index.html', 'styles.css', 'src', 'docs/hero.svg', 'docs/og-card.svg', 'manifest.json']);
const survivorHtml = path.join(survivor, 'index.html');
fs.writeFileSync(survivorHtml, fs.readFileSync(survivorHtml, 'utf8')
  .replace(/\s*<!-- Optional offline support[\s\S]*?<\/script>/, '')
  .replace('<title>Survivor — Open Source Roguelite</title>', '<title>Survivor · 幸存者 · Loud Speak</title>'));
const storage = path.join(survivor, 'src/storage.js');
fs.writeFileSync(storage, fs.readFileSync(storage, 'utf8').replace("locale: 'en'", "locale: 'zh'"));
console.log('Deployed /games/dungeon-crawler/ and /games/vampire-survivors/');
const homePath = path.join(root, 'public/index.html');
let home = fs.readFileSync(homePath, 'utf8');
const marker = '</div><p class="sidebar-foot">';
if (!home.includes(marker)) throw Error('Sidebar insertion marker missing');
if (!home.includes('id="open-dungeon-crawler"')) {
  const links = [
    ['dungeon-crawler', '地牢探险', 'Infernal Ascent · 地牢探险（本地单人游戏）'],
    ['vampire-survivors', '幸存者', 'Survivor · 幸存者（本地游戏）'],
  ].map(([slug, label, title]) => `<a class="tank-entry tank-icon-only" id="open-${slug}" href="/games/${slug}/" target="_blank" rel="noopener noreferrer" aria-label="打开${label}，在新标签页打开" title="${title}"><img src="/assets/${slug}-icon.svg" alt="" width="64" height="64"></a>`).join('');
  home = home.replace(marker, links + marker);
  fs.writeFileSync(homePath, home);
}
