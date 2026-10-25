import {LEVELS,levelById} from '../../levels/catalog.mjs';
import {ENEMY_ART} from './enemies.mjs';
export const SAVE_KEY='veggie-adventure-campaign-v2';
export const LEGACY_SAVE_KEY='veggie-adventure-prototype-v1';
export function encodeSave(game,completed=[]){return JSON.stringify({version:2,level:game.level.id,complete:game.mode==='won',completed:[...new Set(completed)],result:{score:game.score,form:game.p.form},checkpoint:game.checkpoint});}
export function decodeSave(text){
 try{
  const d=JSON.parse(text),l=levelById(d.level),s=d.checkpoint,p=s.p;
  if(!l||![1,2].includes(d.version)||typeof d.complete!=='boolean')return null;
  if(d.version===1){
   if(d.level!=='1-1')return null;Object.assign(s,{movers:[],turrets:[],gates:[],boss:null,time:0,serial:0});p.swimCooldown=0;p.inWater=false;d.completed=d.complete?['1-1']:[];
  }
  for(const k of ['x','y','w','h','vx','vy','form','hurt','star','shotCooldown'])if(!Number.isFinite(p[k]))return null;
  if(![0,1,2].includes(p.form)||p.x<0||p.x>l.width-p.w||p.y< -64||p.y>240||p.w!==12||![14,28].includes(p.h)||p.hurt<0||p.star<0)return null;
  if(!Number.isFinite(s.score)||s.score<0||!Number.isFinite(s.remaining)||s.remaining<=0||s.remaining>(l.timeLimit||300)||!Number.isFinite(s.time)||s.time<0||!Number.isFinite(s.serial))return null;
  for(const key of ['enemies','blocks','items','movers','turrets','gates']){
   if(!Array.isArray(s[key])||s[key].length>200)return null;
   for(const a of s[key])for(const k of ['x','y','w','h'])if(!Number.isFinite(a[k])||Math.abs(a[k])>10000||(['w','h'].includes(k)&&a[k]<=0))return null;
  }
  // Earlier 1-4 checkpoints predate the three fixed arena ledges.
  if(d.level==='1-4'&&s.movers.length===0&&l.movers.every(m=>m.kind==='ledge'&&m.arena))s.movers=structuredClone(l.movers);
  for(const key of ['blocks','movers','turrets','gates'])if(s[key].length!==(l[key]||[]).length)return null;
  if(s.enemies.filter(e=>typeof e.id==='number').length!==l.enemies.length)return null;
  for(const e of s.enemies)if(!ENEMY_ART[e.kind]||!['walk','shell','rolling'].includes(e.state)||!['vx','vy','timer','grace'].every(k=>Number.isFinite(e[k])))return null;
  for(const b of s.blocks)if(!['reward','brick'].includes(b.kind))return null;
  for(const i of s.items)if(!['seed','carrot','chili','star'].includes(i.kind))return null;
  for(const m of s.movers)if(!['lift','crumble','ledge'].includes(m.kind)||!Number.isFinite(m.baseX)||!Number.isFinite(m.baseY)||(m.kind==='lift'&&(!Number.isFinite(m.period)||m.period<=0||!Number.isFinite(m.range)))||(m.kind==='crumble'&&!Number.isFinite(m.timer)))return null;
  for(const t of s.turrets)if(!Number.isFinite(t.cooldown)||!Number.isFinite(t.windup))return null;
  if(l.boss){const b=s.boss;if(!b||b.id!==l.boss.id||b.kind!==l.boss.kind||![0,1,2,3].includes(b.hp)||!['idle','windup','attack','expose','recover','defeated'].includes(b.phase)||!['x','y','w','h','timer','hits','cycle','invulnerable','left','right'].every(k=>Number.isFinite(b[k])))return null;}else if(s.boss!==null)return null;
  if(!Array.isArray(d.completed)||d.completed.length>32||d.completed.some(id=>!LEVELS.some(l=>l.id===id)))return null;
  if(d.result&&(!Number.isFinite(d.result.score)||d.result.score<0||![0,1,2].includes(d.result.form)))return null;
  return d;
 }catch{return null;}
}
