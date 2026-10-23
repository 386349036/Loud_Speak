const assert=require('node:assert/strict'),path=require('node:path'),esbuild=require('esbuild'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(file){const code=esbuild.buildSync({entryPoints:[path.join(__dirname,'src',file)],bundle:true,write:false,format:'cjs',platform:'node',external:['react']}).outputFiles[0].text;const m={exports:{}};new Function('require','module','exports',code)(require,m,m.exports);return m.exports;}
const {I18N}=load('i18n.js');
assert.deepEqual(Object.keys(I18N.zh).sort(),Object.keys(I18N.en).sort());
for(const value of Object.values(I18N.zh))assert.match(value,/[\u4e00-\u9fff]/);
const z=load('zh.js');
for(const invalid of [null,{getItem(){throw Error('blocked')}},{getItem(){return 'broken'}}])assert.equal(z.readLanguage(invalid),'zh');
for(const lang of ['zh','en','si'])assert.equal(z.readLanguage({getItem(){return lang}}),lang);
assert.equal(z.translateText('DEPLOY CHAPTER 01 ▶'),'开始第 1 章 ▶');
assert.equal(z.translateText('🔒 LOCKED (COMPLETE CH 04)'),'🔒 完成第 4 章后解锁');
assert.equal(z.translateText('[E] Open / Close Door'),'[E] 开门 / 关门');
assert.equal(z.translateText('READY','en'),'READY');
assert.equal(z.translateText('unknown upstream string'),'unknown upstream string');
const button=lang=>renderToStaticMarkup(React.createElement(z.LanguageContext.Provider,{value:{lang}},z.localizedElement('button',{id:'READY',className:'READY',title:'[E] Open / Close Door'},['READY',7])));
assert.match(button('zh'),/>可出发7<\/button>/);assert.match(button('zh'),/id="READY" class="READY"/);assert.match(button('zh'),/title="\[E\] 开门 \/ 关门"/);assert.match(button('en'),/>READY7<\/button>/);
console.log(`PASS: ${Object.keys(I18N.zh).length} Chinese dictionary keys, safe preference fallback, language isolation, chapter/prompt text and rendered labels`);
