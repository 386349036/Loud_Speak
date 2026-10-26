export const ENEMY_HP={mushroom:1,cabbage:2,walnut:2,spike:2,jelly:1,fish:1,corn:1,trap:1,cloud:1,bolt:1,winged:3,leaper:1,anemone:1};
export function prepareEnemyHealth(e){
 const initial=['shell','rolling'].includes(e.state)?1:ENEMY_HP[e.kind]||1;
 e.maxHp??=Math.max(initial,e.hp||0);e.hp??=e.dead?0:initial;e.hitFlash??=0;
 if(e.kind==='spike'&&e.maxHp===1){e.maxHp=2;if(!e.dead&&e.state==='walk'&&e.hp===1)e.hp=2;}
 return e;
}
