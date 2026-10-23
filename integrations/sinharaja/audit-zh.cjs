// Inventory original text literals that still need a Chinese display translation.
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const bundle=esbuild.buildSync({stdin:{contents:"import './src/i18n.js'; export {translateText} from './src/zh.js';",resolveDir:__dirname},bundle:true,write:false,format:'cjs',platform:'node',external:['react']}).outputFiles[0].text;
const m={exports:{}};new Function('require','module','exports',bundle)(require,m,m.exports);
const items=new Set();
for(const name of process.argv.includes('--app')?['App.js']:['App.js','Sinharaja3DEngine.js']){
 const text=esbuild.transformSync(fs.readFileSync(path.join(__dirname,'src',name),'utf8'),{loader:'jsx',charset:'utf8',supported:{'template-literal':false}}).code;
 for(const match of text.matchAll(/"(?:[^"\\]|\\.)*"/g))try{const value=JSON.parse(match[0]).replace(/\s+/g,' ').trim();const candidate=process.argv.includes('--english')?!/[\u0d80-\u0dff]/.test(value)&&/[A-Za-z]{2}/.test(value)&&/[\s!?]/.test(value)&&!/^M[\d.]/.test(value):/[\u0d80-\u0dff]/.test(value);if(candidate&&m.exports.translateText(value)===value)items.add(value)}catch{}
}
if(process.argv.includes('--save'))fs.writeFileSync(path.resolve(__dirname,'../../.tmp-sinharaja-source/zh-inventory.json'),JSON.stringify([...items],null,2));
for(const [index,value] of [...items].entries())console.log(index+' '+JSON.stringify(value));
console.log('Untranslated Sinhala literals: '+items.size);
