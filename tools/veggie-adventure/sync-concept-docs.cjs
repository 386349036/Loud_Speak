'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),doc=path.join(root,'docs/veggie-adventure'),art=path.join(root,'art-source/veggie-adventure');
const manifest=JSON.parse(fs.readFileSync(path.join(art,'concept-manifest.json'),'utf8'));
assert.equal(manifest.generated,37);
const roster=JSON.parse(fs.readFileSync(path.join(doc,'roster.json'),'utf8'));
for(const c of roster.characters){
 const a=manifest.assets.find(a=>a.id===c.id);
 const rel=c.id==='P01'?'concepts/p01-transparent-v2.png':a.path;
 assert.ok(fs.existsSync(path.join(art,rel)));
 c.conceptImage='../../art-source/veggie-adventure/'+rel;
 if(a)c.artStatus=rel.endsWith('-v2.png')?'transparent-concept-v2':'transparent-concept-v1';
 const p=path.join(doc,c.card);let text=fs.readFileSync(p,'utf8');
 text=text.replace('状态：文字规格已定义；形象、动画与运行行为尚未制作。','状态：透明形象概念已生成；正式比例、像素网格、动画与运行行为待制作。');
 text=text.replace('验收边界：本卡仅规定设计，不能作为形象生成、动画连续性或运行测试已通过的证据。','验收边界：形象概念已生成并检查Alpha；不代表动画连续性或运行测试通过。');
 if(!text.includes('<!-- concept-delivery -->'))text+='\n<!-- concept-delivery -->\n## 形象概念交付\n\n[透明PNG](../../../art-source/veggie-adventure/'+rel+')\n\n'+(a?a.review:'主角透明视觉基准。')+'\n\n先完成形象卡，再按游戏实际显示大小统一比例、网格与动画；本图不直接登记为运行精灵。\n';
 fs.writeFileSync(p,text);
}
fs.writeFileSync(path.join(doc,'roster.json'),JSON.stringify(roster,null,2)+'\n');
for(const name of ['README.md','ROSTER.md']){
 const p=path.join(doc,name);let text=fs.readFileSync(p,'utf8');
 if(!text.includes('<!-- concept-library -->'))text+='\n<!-- concept-library -->\n## 首轮形象资产库\n\n23个角色均有形象概念，包括已有主角及22张新增角色卡。另完成8张场景和7张配套素材表。\n\n[打开素材总览](../../art-source/veggie-adventure/index.html) · [逐项清单](ASSET_PROGRESS.md) · [后续制作边界](ASSET_HANDOFF.md)\n';
 fs.writeFileSync(p,text);
}
console.log(JSON.stringify({linkedCharacters:roster.characters.length,concepts:manifest.generated,scope:'Concept cards only'}));
