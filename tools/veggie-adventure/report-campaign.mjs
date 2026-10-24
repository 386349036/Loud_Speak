import fs from 'node:fs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
const plan=JSON.parse(fs.readFileSync('docs/veggie-adventure/scenes/level-asset-map.json')).levels;
const manifest={version:1,status:'implemented-awaiting-user-playtest',formalAnimation:'deferred-by-user',visualVerified:false,levels:LEVELS.map(l=>({id:l.id,name:plan.find(p=>p.id===l.id).name,focus:plan.find(p=>p.id===l.id).focus,module:'world-'+l.id.split('-')[0].padStart(2,'0')+'/level-'+l.id+'.mjs',world:Number(l.id.split('-')[0]),boss:l.boss?.id||null,enemyKinds:[...new Set(l.enemies.map(e=>e.kind))],waterRegions:(l.water||[]).length,movingPlatforms:(l.movers||[]).length,hazards:[...new Set((l.hazards||[]).map(h=>h.kind))],turrets:(l.turrets||[]).length,gates:(l.gates||[]).length,background:l.background||'W01-far',mid:l.mid===undefined?'W01-mid':l.mid,terrain:l.terrain||'W01-kit',runtimeReady:true,visualVerified:false}))};
fs.writeFileSync('public/games/veggie-adventure/levels/manifest.json',JSON.stringify(manifest,null,2)+'\n');
const table=manifest.levels.map(l=>'| '+l.id+' | '+l.name+' | '+l.focus+' | '+(l.boss||'—')+' |').join('\n');
fs.writeFileSync('docs/veggie-adventure/CAMPAIGN_LEVELS.md','# 32关实现索引\n\n状态：关卡数据与行为已接入运行；正式动画暂缓，视觉和游玩由用户验收。\n\n| 关卡 | 名称 | 主要内容 | 首领 |\n|---|---|---|---|\n'+table+'\n\n机器清单：public/games/veggie-adventure/levels/manifest.json。所有关卡可从游戏选关菜单进入，也可从1-1连续推进。\n');
console.log('Campaign runtime manifest and 32-level index written.');
