import {EVOLVED_SCALE} from './player-size.mjs';
export function spriteBox(body,actor,fallbackWidth,fallbackHeight){const scale=actor?.presentation?.scale;const w=scale?actor.frameWidth*scale:fallbackWidth,h=scale?actor.frameHeight*scale:fallbackHeight;return {x:body.x+body.w/2-w/2,y:body.y+body.h-h,w,h};}
export function playerBox(p,actor,fallbackWidth,fallbackHeight){const box=spriteBox(p,actor,fallbackWidth,fallbackHeight),scale=p.form?EVOLVED_SCALE:1,w=box.w*scale,h=box.h*scale;return {x:p.x+p.w/2-w/2,y:p.y+p.h-h,w,h};}
export function shieldBox(p){const scale=p.form?EVOLVED_SCALE:1,h=(p.crouch?20:p.form?28:18)*scale,size=((p.crouch?20:p.form?28:18)+20)*scale;return {x:p.x+p.w/2-size/2,y:p.y+p.h-h/2-size/2,w:size,h:size};}
