import {LEVELS} from './catalog.mjs';
const worldX=world=>24+(world-1)%4*120;
const worldFloor=world=>world<=4?120:216;
export const WARP_ROOM={
 id:'warp-room',name:'隐秘选关房',warpRoom:true,width:512,height:240,timeLimit:3600,spawn:{x:4,y:202},exit:560,
 background:'W01-far',mid:null,terrain:'W01-kit',platforms:[{x:0,y:216,w:512,h:24}],
 blocks:LEVELS.map(l=>{const [world,stage]=l.id.split('-').map(Number);return {x:worldX(world)+(stage-1)*24,y:worldFloor(world)-56,w:16,h:16,kind:'warp',warpTo:l.id,label:String(stage),labelAsset:'warp-stage-'+stage,terrain:`W${String(world).padStart(2,'0')}-kit`,world};}),
 // Shelves and clear aisles are reachable with the unchanged standing jump.
 movers:[...Array.from({length:4},(_,i)=>({kind:'warp-shelf',x:16+i*120,y:120,w:104,h:8,oneWay:true,terrain:`W0${i+1}-kit`})),
  ...[120,240,360].map(x=>({kind:'warp-bridge',x,y:120,w:16,h:8,oneWay:true})),
  ...[120,240,360].map(x=>({kind:'warp-step',x,y:168,w:16,h:8,oneWay:true}))],
 enemies:[],items:[],water:[],hazards:[],turrets:[],gates:[],boss:null
};
