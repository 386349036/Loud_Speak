const fs=require('node:fs');
const file=process.argv[2]||'public/games/veggie-adventure/js/main.mjs';let source=fs.readFileSync(file,'utf8');
if(source.includes("from './asset-loader.mjs'")){console.log('Loader already patched');process.exit(0);}
const oldStart="function play(){",oldLoad=/ await Promise\.all\(m\.assets\.map\(a=>new Promise\(\(resolve,reject\)=>\{[^\n]+\}\)\)\);\r?\n/;
if(!source.includes(oldStart)||!oldLoad.test(source)||!source.includes(' sync();ready=true;'))throw Error('Unsupported boot structure; no changes written');
source="import {createAssetLoader} from './asset-loader.mjs';\n"+source;
source=source.replace('let game=campaign.game,','let assetLoader=null,loadingGame=null;\nlet game=campaign.game,');
source=source.replace(oldStart,`function play(){
 if(loadingGame===game)return;
 const target=game,pending=assetLoader?.ensure(game.level,(n,total)=>{if(game===target)$('detail').textContent='关卡素材 '+n+' / '+total;});
 if(pending){loadingGame=target;show('正在准备关卡','优先加载当前场景，请稍候。','加载中');$('start').disabled=true;
  pending.then(()=>{if(loadingGame===target)loadingGame=null;if(game===target){$('start').disabled=false;if(document.hidden||document.hasFocus?.()===false)show('准备完成','点击继续冒险。');else play();}}).catch(e=>{if(loadingGame===target)loadingGame=null;if(game===target){$('start').disabled=false;show('资源暂未加载完成',e.message+'，点击重试。','重试');}});return;}
`);
source=source.replace(oldLoad,'');
source=source.replace(' sync();ready=true;',` game=campaign.game;
 assetLoader=createAssetLoader({assets:m.assets,images,Image,revision:m.deliveryVersion});
 await assetLoader.ensure(game.level,(n,total)=>{$('detail').textContent='当前关卡素材 '+n+' / '+total;});
 sync();ready=true;`);
fs.writeFileSync(file,source);console.log('Patched only scene loading: '+file);
