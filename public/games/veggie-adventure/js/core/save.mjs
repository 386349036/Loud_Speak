import {LEVELS,levelById} from '../../levels/catalog.mjs';
import {ENEMY_ART} from './enemies.mjs';
import {BOSS_BALANCE_VERSION,BOSS_SKILLS,bossMaxHp} from './boss-balance.mjs';
import {Game,MAX_REBIRTHS} from './game.mjs';
import {INITIAL_REBIRTHS,validRebirthReward} from './rebirth-rewards.mjs';
const validAttack=(form,n)=>Number.isInteger(n)&&n>=0&&n<=3&&(form===2||n===0);
export const SAVE_KEY='veggie-adventure-campaign-v2';
export const DEBUG_SAVE_KEY='veggie-adventure-debug-v1';
export const LEGACY_SAVE_KEY='veggie-adventure-prototype-v1';
export function encodeSave(game,completed=[]){return JSON.stringify({version:3,level:game.level.id,layoutVersion:game.level.layoutVersion||1,complete:game.mode==='won',completed:[...new Set(completed)],result:{score:game.score,form:game.p.form,attackBonus:game.p.attackBonus??0},run:{rebirths:game.rebirths,claimedRebirthRewards:game.claimedRebirthRewards,entryScore:game.entryScore,entryForm:game.entryForm,entryAttackBonus:game.entryAttackBonus??0,status:game.mode,pendingRebirth:game.pendingRebirth},checkpoint:game.checkpoint});}
export function decodeSave(text){
 try{
  const d=JSON.parse(text),l=levelById(d.level),s=d.checkpoint,p=s.p;
  if(!l||![1,2,3].includes(d.version)||typeof d.complete!=='boolean')return null;
  const prior=(l.priorLayouts||[l.priorLayout]).find(p=>p&&(d.layoutVersion??1)===p.version);
  if(d.version===3){const r=d.run;if(!r||!Number.isInteger(r.rebirths)||r.rebirths<0||r.rebirths>MAX_REBIRTHS||!Number.isFinite(r.entryScore)||r.entryScore<0||![0,1,2].includes(r.entryForm)||!['playing','dead','won','gameover'].includes(r.status)||typeof r.pendingRebirth!=='boolean'||d.complete!==(r.status==='won'))return null;r.claimedRebirthRewards??=[];if(!Array.isArray(r.claimedRebirthRewards)||r.claimedRebirthRewards.length>8||r.claimedRebirthRewards.some(id=>!validRebirthReward(id))||new Set(r.claimedRebirthRewards).size!==r.claimedRebirthRewards.length||r.rebirths>INITIAL_REBIRTHS+r.claimedRebirthRewards.length)return null;if(r.status==='gameover'&&(r.rebirths!==0||r.pendingRebirth)||r.status!=='dead'&&r.pendingRebirth||r.status==='dead'&&!r.pendingRebirth&&r.rebirths!==0)return null;if(r.entryAttackBonus===undefined)r.entryAttackBonus=0;if(!validAttack(r.entryForm,r.entryAttackBonus))return null;}else delete d.run;
  if(d.version===1){
   if(d.level!=='1-1')return null;Object.assign(s,{movers:[],turrets:[],gates:[],boss:null,time:0,serial:0});p.swimCooldown=0;p.inWater=false;d.completed=d.complete?['1-1']:[];
  }
  for(const k of ['x','y','w','h','vx','vy','form','hurt','star','shotCooldown'])if(!Number.isFinite(p[k]))return null;
  // Recognize this exact historic shape before validating its wider coordinates.
  const oldCourtyard=d.level==='1-4'&&(d.layoutVersion??1)===1&&s.blocks.length===12&&s.enemies.filter(e=>typeof e.id==='number').length===2&&[0,3].includes(s.movers.length)&&s.turrets.length===0&&s.gates.length===0&&s.boss?.left===1424&&s.boss?.right===1712;
  if(p.attackBonus===undefined)p.attackBonus=0;if(!validAttack(p.form,p.attackBonus))return null;
  const validSize=p.form?((p.w===12&&[14,28].includes(p.h))||(p.w===9.6&&[11.2,22.4].includes(p.h))):p.w===12&&p.h===14;
  if(![0,1,2].includes(p.form)||p.x<0||p.x>(prior?.width||(oldCourtyard?1792:l.width))-p.w||p.y< -64||p.y>240||!validSize||p.hurt<0||p.star<0)return null;
  if(!Number.isFinite(s.score)||s.score<0||!Number.isFinite(s.remaining)||s.remaining<=0||s.remaining>(prior?.timeLimit||l.timeLimit||300)||!Number.isFinite(s.time)||s.time<0||!Number.isFinite(s.serial))return null;
  for(const key of ['enemies','blocks','items','movers','turrets','gates']){
   if(!Array.isArray(s[key])||s[key].length>200)return null;
   for(const a of s[key])for(const k of ['x','y','w','h'])if(!Number.isFinite(a[k])||Math.abs(a[k])>10000||(['w','h'].includes(k)&&a[k]<=0))return null;
  }
  // Only the known 1792px courtyard layout may migrate across actor-count changes.
  if(oldCourtyard&&(['enemies','blocks','items','movers','turrets','gates'].some(key=>s[key].some(a=>a.x<0||a.x+a.w>1792))||p.x>1792-p.w))return null;
  const oldCampaign=prior&&['blocks','movers','turrets','gates'].every(k=>s[k].length===prior.counts[k])&&s.enemies.filter(e=>typeof e.id==='number').length===prior.counts.enemies&&(!prior.boss||s.boss?.left===prior.boss.left&&s.boss?.right===prior.boss.right);
  if(oldCampaign&&(p.x>prior.width-p.w||s.remaining>prior.timeLimit||['enemies','blocks','items','movers','turrets','gates'].some(key=>s[key].some(a=>a.x<0||a.x+a.w>prior.width))))return null;
  const shape=oldCourtyard?{blocks:new Array(12),enemies:new Array(2),movers:new Array(3),turrets:[],gates:[]}:oldCampaign?Object.fromEntries(Object.entries(prior.counts).map(([k,n])=>[k,new Array(n)])):l;
  // Earlier 1-4 checkpoints predate the three fixed arena ledges.
  if(d.level==='1-4'&&s.movers.length===0&&l.movers.every(m=>m.kind==='ledge'&&m.arena))s.movers=structuredClone(l.movers);
  for(const key of ['blocks','movers','turrets','gates'])if(s[key].length!==(shape[key]||[]).length)return null;
  if(s.enemies.filter(e=>typeof e.id==='number').length!==shape.enemies.length)return null;
  for(const e of s.enemies)if(!ENEMY_ART[e.kind]||!['walk','shell','rolling','stunned'].includes(e.state)||e.state==='stunned'&&e.kind!=='winged'||!['vx','vy','timer','grace'].every(k=>Number.isFinite(e[k])))return null;
  for(const e of s.enemies){if(e.hp!==undefined&&(!Number.isInteger(e.hp)||e.hp<0||e.hp>3))return null;if(e.maxHp!==undefined&&(!Number.isInteger(e.maxHp)||e.maxHp<1||e.maxHp>3||e.hp>e.maxHp))return null;}
  for(const b of s.blocks)if(!['reward','brick'].includes(b.kind))return null;
  for(const i of s.items)if(!['seed','carrot','chili','star','rebirth'].includes(i.kind)||i.kind==='rebirth'&&!validRebirthReward(i.rewardId))return null;
  for(const m of s.movers)if(!['lift','crumble','ledge'].includes(m.kind)||!Number.isFinite(m.baseX)||!Number.isFinite(m.baseY)||(m.kind==='lift'&&(!Number.isFinite(m.period)||m.period<=0||!Number.isFinite(m.range)))||(m.kind==='crumble'&&!Number.isFinite(m.timer)))return null;
  for(const t of s.turrets)if(!Number.isFinite(t.cooldown)||!Number.isFinite(t.windup))return null;
  if(l.boss){
   const b=s.boss;if(!b||b.id!==l.boss.id||b.kind!==l.boss.kind||!['idle','windup','attack','expose','recover','defeated'].includes(b.phase)||!['x','y','w','h','timer','hits','cycle','invulnerable','left','right'].every(k=>Number.isFinite(b[k])))return null;
   const legacy=b.balanceVersion===undefined&&(b.maxHp===undefined||b.maxHp===3),current=b.balanceVersion===BOSS_BALANCE_VERSION&&b.maxHp===bossMaxHp(b);
   if((!legacy&&!current)||!Number.isInteger(b.hp)||b.hp<0||b.hp>(legacy?3:b.maxHp))return null;
   if(b.skillCooldowns!==undefined){if(!b.skillCooldowns||typeof b.skillCooldowns!=='object'||Array.isArray(b.skillCooldowns))return null;for(const [key,value] of Object.entries(b.skillCooldowns))if(!BOSS_SKILLS[b.kind][key]||!Number.isFinite(value)||value<0||value>BOSS_SKILLS[b.kind][key].cooldown+1e-6)return null;}
  }else if(s.boss!==null)return null;
  if(!Array.isArray(d.completed)||d.completed.length>32||d.completed.some(id=>!LEVELS.some(l=>l.id===id)))return null;
  if(d.result&&(!Number.isFinite(d.result.score)||d.result.score<0||![0,1,2].includes(d.result.form)))return null;
  if(d.result){if(d.result.attackBonus===undefined)d.result.attackBonus=0;if(!validAttack(d.result.form,d.result.attackBonus))return null;}
  if(oldCourtyard||oldCampaign){
   const fresh=new Game(l,{score:d.run?.entryScore??s.score,form:d.run?.entryForm??0,attackBonus:d.run?.entryAttackBonus??0,rebirths:d.run?.rebirths,claimedRebirthRewards:d.run?.claimedRebirthRewards});
   d.checkpoint=fresh.checkpoint;d.layoutVersion=l.layoutVersion;d.layoutMigrated=true;
  }
  return d;
 }catch{return null;}
}
