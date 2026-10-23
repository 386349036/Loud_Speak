const fs=require('fs'),path=require('path');
const root=__dirname;
const segments=JSON.parse(fs.readFileSync(path.join(root,'zh-segments.json'),'utf8'));
const translations=new Map(fs.readFileSync(path.join(root,'zh-translations.tsv'),'utf8').trim().split(/\r?\n/).map(line=>{const i=line.indexOf('\t');return [+line.slice(0,i),line.slice(i+1)];}));
if(translations.size!==segments.length)throw Error('Translation count mismatch');
const dictionary=new Map(segments.map((s,i)=>{if(!translations.get(i))throw Error('Missing '+i);return [s,translations.get(i)];}));
const files=[path.join(root,'index.html')];
function walk(p){for(const entry of fs.readdirSync(p,{withFileTypes:true})){const q=path.join(p,entry.name);if(entry.isDirectory())walk(q);else if(/\.(js|css)$/.test(q))files.push(q);}}
walk(path.join(root,'src'));
let count=0;
for(const file of files){
  let text=fs.readFileSync(file,'utf8');
  text=text.replace(/[\u0600-\u06ff]+(?:[ \t]+[\u0600-\u06ff]+)*/g,s=>{if(!dictionary.has(s))throw Error('Unknown Arabic: '+s);count++;return dictionary.get(s);});
  text=text.replace(/lang="ar"/g,'lang="zh-CN"').replace(/dir="rtl"/g,'dir="ltr"').replace(/direction:\s*rtl/g,'direction: ltr');
  fs.writeFileSync(file,text);
}
console.log('Chinese localization applied: '+count+' occurrences in '+files.length+' files');
