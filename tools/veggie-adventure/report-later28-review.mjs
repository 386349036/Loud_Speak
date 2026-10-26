import fs from 'node:fs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
const report=JSON.parse(fs.readFileSync('docs/veggie-adventure/LATER28_RULE_REVIEW.json'));
const terrain=JSON.parse(fs.readFileSync('docs/veggie-adventure/later28-forms-check-standing.json'));
const labels={blocks:'台阶上方砖',enemies:'巡逻',hazards:'危险机关',items:'积分',turrets:'炮台'};
const totals=report.levels.flatMap(l=>l.changes).reduce((a,c)=>(a[c.type]=(a[c.type]||0)+1,a),{});
const rows=report.levels.map(row=>{
 const l=LEVELS.find(l=>l.id===row.id),probes=terrain.results.filter(r=>r.id===l.id);
 const counts=row.changes.reduce((a,c)=>(a[c.type]=(a[c.type]||0)+1,a),{});
 const changes=Object.entries(counts).map(([k,n])=>labels[k]+' '+n).join('；')||'复核符合，无需额外移动';
 return `| ${l.id} ${l.name} | ${l.width} | ${changes} | ${probes.filter(p=>p.terrainProbePassed).length}/3 | ${probes.map(p=>p.successfulSettings.length).join('/')} | ${l.boss?l.boss.id+' 三处单向台':l.world===4?'池底水葵 '+row.aquaticPlants+' 株':'保留本世界机关'} |`;
});
fs.writeFileSync('docs/veggie-adventure/LATER28_RULE_REVIEW.md',`# 后续28关逐关复核与补充调整

2026-10-26。按[第一世界总结](WORLD01_SUMMARY_AND_RULES.md)复核2-1至8-4，保留现有加长地图、水域、世界机制、54株水葵与七个首领招式；第一世界地图没有改动。

本轮修正${Object.entries(totals).map(([k,n])=>labels[k]+n+'处').join('、')}。133块悬空砖在相邻32px砖阶附近仅剩16px头顶间隙，本轮上移16px，留出至少32px；奖励内容及物件数量保持。坑前后128px检查扩至敌兵完整巡逻范围、炮台和机关完整运动范围：转链含全部半径，落石含下落通道，捕虫株含1.5倍实际体积。积分最终位置避开砖、门、炮台和危险区域。

| 关卡 | 长度px | 本轮补充调整 | 可行形态 | 12种时机成功数：基础/成长/辣椒 | 保留特色 |
| --- | ---: | --- | --- | --- | --- |
${rows.join('\n')}

## 验证与限制

28关结构规则复核无残留问题；修复器重复执行不再移动物件。178项回归通过，包含旧档迁移、第一世界地图保留、七位首领三形态真实弱点反击、完整巡逻边界、脚底与材质检查，以及全屏视野和触控。

地形探测不再首次成功即停止：28关×3种站立形态×12种输入时机，共1008次模拟，其中${terrain.results.reduce((n,r)=>n+r.successfulSettings.length,0)}次到达出口，84/84形态组合均有可行路线。其余时机有在砖阶卡住的探测结果，未全部通过，不能称为任意输入时机均能过关。模拟关闭敌兵、首领、危险机关、炮台和门，保留水与移动平台；不构成战斗通关、人工视觉或手机实机验收。

逐物件前后坐标：[LATER28_RULE_REVIEW.json](LATER28_RULE_REVIEW.json)；全部探测记录：[later28-forms-check-standing.json](later28-forms-check-standing.json)。本轮仅本地更新，没有提交、推送或外网发布。
`);
console.log(JSON.stringify({levels:rows.length,totals}));
