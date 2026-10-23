const path=require('node:path'),fs=require('node:fs'),esbuild=require('esbuild');
const output=path.resolve(__dirname,'../../public/games/sinharaja');
fs.mkdirSync(output,{recursive:true});
esbuild.buildSync({entryPoints:[path.join(__dirname,'src/index.jsx')],outfile:path.join(output,'game.js'),bundle:true,minify:true,loader:{'.js':'jsx'},external:['/games/sinharaja/*'],define:{'process.env.NODE_ENV':'"production"'},target:['es2020'],legalComments:'eof'});
fs.copyFileSync(path.join(__dirname,'index.html'),path.join(output,'index.html'));
const licenses=['react','react-dom','scheduler','three'].map(name=>`===== ${name} =====\n${fs.readFileSync(path.join(__dirname,'node_modules',name,'LICENSE'),'utf8')}`).join('\n\n');
fs.writeFileSync(path.join(output,'DEPENDENCY_LICENSES.txt'),licenses);
console.log('Sinharaja built at '+output);
