import {Game} from './game.mjs';
import {LEVELS,levelById,nextLevel} from '../../levels/catalog.mjs';
import {WARP_ROOM} from '../../levels/warp-room.mjs';
export class Campaign{
 constructor(){this.completed=new Set();this.game=new Game(LEVELS[0]);}
 select(id,carry={}){const level=levelById(id);if(!level)throw Error('未知关卡 '+id);this.game=new Game(level,{rebirths:this.game?.rebirths,claimedRebirthRewards:this.game?.claimedRebirthRewards,...carry});return this.game;}
 restart(){this.completed.clear();this.game=new Game(LEVELS[0]);return this.game;}
 openWarpRoom(){if(this.game.level.id!=='1-1'||!this.game.warpRequested)return false;this.game=new Game(WARP_ROOM,{score:this.game.score,rebirths:this.game.rebirths,claimedRebirthRewards:this.game.claimedRebirthRewards});return true;}
 warpTo(id){if(!this.game.level.warpRoom||!levelById(id))return false;this.select(id,{score:this.game.score,form:0});return true;}
 finish(){if(this.game.mode==='won')this.completed.add(this.game.level.id);}
 advance(){if(this.game.mode!=='won')return false;this.finish();const next=nextLevel(this.game.level.id);if(!next)return false;this.select(next.id,{score:this.game.score,form:this.game.p.form,attackBonus:this.game.p.attackBonus,rebirths:this.game.rebirths});return true;}
 restore(saved){
  this.completed=new Set(saved.completed);const run=saved.run,dead=run?.status==='dead',over=run?.status==='gameover'||dead&&!run.pendingRebirth;
  this.select(saved.level,{score:run?.entryScore??saved.checkpoint.score,form:dead||over||!run?0:run.entryForm,attackBonus:dead||over||!run?0:run.entryAttackBonus,rebirths:run?.rebirths,claimedRebirthRewards:run?.claimedRebirthRewards||[]});
  // Resuming a run always starts this stage at its entrance, never at an old flag.
  if(over){this.game.mode='gameover';this.game.score=saved.result?.score??this.game.score;}
  if(saved.complete){this.game.mode='won';this.game.score=saved.result?.score??this.game.score;this.game.p.form=saved.result?.form??saved.checkpoint.p.form;this.game.p.attackBonus=saved.result?.attackBonus??saved.checkpoint.p.attackBonus??0;this.game.resizePlayer();this.finish();}
 }
}
