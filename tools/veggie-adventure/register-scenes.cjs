'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),art=path.join(root,'art-source/veggie-adventure'),docs=path.join(root,'docs/veggie-adventure/scenes');
const rows=JSON.parse(fs.readFileSync(path.join(docs,'batch-01-sources.json'),'utf8'));
const layout=JSON.parse(fs.readFileSync(path.join(docs,'level-1-1-layout.json'),'utf8'));
async function main(){
 const assets=[];
 for(const r of rows){
  const rel='scenes/batch-01/'+r.id.toLowerCase()+'-v1.png',out=path.join(art,rel),bytes=fs.readFileSync(r.source);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  if(fs.existsSync(out))assert.ok(fs.readFileSync(out).equals(bytes),'Refuse overwrite');else fs.copyFileSync(r.source,out);
  const prompt='prompts/scenes/'+r.id.toLowerCase()+'-v1.txt';fs.mkdirSync(path.dirname(path.join(art,prompt)),{recursive:true});fs.writeFileSync(path.join(art,prompt),r.prompt);
  const meta=await sharp(out).metadata(),{data,info}=await sharp(out).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let zero=0,visible=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)zero++;if(data[i]>200)visible++;}
  assert.equal(meta.format,'png');if(r.transparent)assert.ok(meta.hasAlpha&&zero>0&&visible>0,r.id);
  assets.push({id:r.id,world:r.world,kind:r.kind,path:rel,prompt,width:info.width,height:info.height,transparent:r.transparent,alphaZero:zero,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),runtimeReady:false});
 }
 assert.equal(assets.length,6);assert.equal(new Set(assets.map(a=>a.id)).size,6);
 for(const [x,y,w,h] of layout.platforms)assert.ok(x>=0&&y>=0&&x+w<=layout.width&&y+h<=layout.height);
 fs.writeFileSync(path.join(art,'scenes/manifest.json'),JSON.stringify({stage:'separated-environment-sources',assets},null,2));
 const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>蔬果场景工作台</title><style>
 body{margin:0;background:#14221e;color:#edf0dc;font:16px/1.6 system-ui}header,main{max-width:1150px;margin:auto;padding:20px}h1{margin:0}button,label{margin-right:14px}button{padding:8px 16px;background:#dce8b1;color:#14221e;border:0;border-radius:6px}a{color:#c6e89c}.stage{position:relative;width:min(100%,768px);aspect-ratio:256/240;overflow:hidden;background:#23352f}.layer{position:absolute;height:100%;width:auto;max-width:none;image-rendering:pixelated;pointer-events:none}.mid{height:80%;bottom:0}svg{position:absolute;inset:0;width:100%;height:100%}.kit{width:100%;background:repeating-conic-gradient(#b9c1ba 0% 25%,#e1e5df 0% 50%) 0/24px 24px}.controls{padding:16px 0}input[type=range]{width:min(60vw,500px)}small{color:#c3ccbc}.notice{border-left:3px solid #d9c37c;padding-left:15px}section{margin-bottom:30px}
 </style><header><h1>场景工作台 · 首批昼夜组件</h1><p>晨光苔林 / 月夜藤园 · 32-bit二维像素</p><p class="notice">分层源资产与第一关布局草案。矩形是碰撞示意，尚无角色、碰撞模拟或可通关验证。月夜模式仅检查配色，不代表7-1地图。</p><a href="../../docs/veggie-adventure/scenes/SCENE_DESIGN.md">八世界 / 32关设计草案</a></header><main><div class="controls"><button id="day">晨光苔林</button><button id="night">月夜藤园</button><label><input id="middle" type="checkbox" checked>中景</label><label><input id="geometry" type="checkbox" checked>布局</label></div><div class="stage"><img id="far" class="layer" alt="远景"><img id="mid" class="layer mid" alt="透明中景"><svg id="map" viewBox="0 0 256 240" role="img" aria-label="第一关碰撞布局草案"></svg></div><p>镜头 <input id="camera" aria-label="横向镜头" type="range" min="0" max="1280" value="0"> <output id="position">0</output></p><p><small>背景采用有限平移；未验证无缝循环。中景显示透明度0.7用于降低干扰，不修改原图。</small></p><h2>地形与装饰组件原图</h2><img id="kit" class="kit" alt="八个独立场景组件"><p class="notice">待修整：顶面透视、草叶遮挡、等距网格及组件切分。装饰默认无碰撞，危险物另行制作。</p><h2>原图与提示词</h2>${assets.map(a=>`<p>${a.id} · <a href="${a.path}">PNG</a> · <a href="${a.prompt}">提示词</a> · ${a.width}×${a.height}</p>`).join('')}</main><script>
 const assets=${JSON.stringify(assets)},layout=${JSON.stringify(layout)};let world='01';const el=id=>document.getElementById(id);
 function render(){const cam=Number(el('camera').value);el('position').value=cam;for(const k of ['far','mid','kit'])el(k).src=assets.find(a=>a.world===world&&a.kind===k).path;
 el('far').style.left=(-cam*.08)+'px';el('mid').style.left=(-cam*.25)+'px';el('mid').style.opacity=.7;el('mid').hidden=!el('middle').checked;el('map').style.display=el('geometry').checked?'block':'none';
 el('map').innerHTML=layout.platforms.map(([x,y,w,h])=>'<rect x="'+(x*16-cam)+'" y="'+y*16+'" width="'+w*16+'" height="'+h*16+'" fill="#203d2e" fill-opacity=".82" stroke="#e5ecaa" stroke-width="1"/>').join('')+layout.markers.map(m=>'<g transform="translate('+(m.x*16-cam)+','+m.y*16+')"><rect x="-2" y="-12" width="4" height="12" fill="#ffd079"/><text y="-16" fill="#fff" stroke="#14221e" stroke-width=".4" font-size="7">'+m.label+'</text></g>').join('');}
 el('day').onclick=()=>{world='01';render()};el('night').onclick=()=>{world='07';render()};for(const id of ['middle','geometry','camera'])el(id).oninput=render;render();
 </script></html>`;
 fs.writeFileSync(path.join(art,'scene-workbench.html'),html);
 console.log(JSON.stringify({status:'passed',sources:assets.length,alphaSources:assets.filter(a=>a.transparent).length,layoutBounds:'passed',runtimeReady:false}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
