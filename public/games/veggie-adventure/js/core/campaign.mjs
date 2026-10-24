import {Game} from './game.mjs';
import {LEVELS,levelById,nextLevel} from '../../levels/catalog.mjs';
export class Campaign{
 constructor(){this.completed=new Set();this.game=new Game(LEVELS[0]);}
 select(id,carry={}){const level=levelById(id);if(!level)throw Error('未知关卡 '+id);this.game=new Game(level,carry);return this.game;}
 finish(){if(this.game.mode==='won')this.completed.add(this.game.level.id);}
 advance(){if(this.game.mode!=='won')return false;this.finish();const next=nextLevel(this.game.level.id);if(!next)return false;this.select(next.id,{score:this.game.score,form:this.game.p.form});return true;}
 restore(saved){this.completed=new Set(saved.completed);this.select(saved.level);this.game.checkpoint=saved.checkpoint;this.game.restore();if(saved.complete){this.game.mode='won';this.game.score=saved.result?.score??this.game.score;this.game.p.form=saved.result?.form??this.game.p.form;this.game.resizePlayer();this.finish();}}
}
