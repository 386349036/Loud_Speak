export function spriteBox(body,actor,fallbackWidth,fallbackHeight){const scale=actor?.presentation?.scale;const w=scale?actor.frameWidth*scale:fallbackWidth,h=scale?actor.frameHeight*scale:fallbackHeight;return {x:body.x+body.w/2-w/2,y:body.y+body.h-h,w,h};}
export function shieldBox(p){const h=p.crouch?20:p.form?28:18,size=h+20;return {x:p.x+p.w/2-size/2,y:p.y+p.h-h/2-size/2,w:size,h:size};}
