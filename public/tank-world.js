(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TankWorld=factory()})(typeof window==='undefined'?globalThis:window,()=>{
const names=['错位巷道','环形包围','双河渡口','仓储迷城','折线防区','庭院攻防'];
const themes=[{id:'desert',name:'沙漠',floor:['#b6a078','#c5b08a','#917b59'],brick:['#c4a078','#806447'],solid:['#a38e6b','#75624c'],water:'#507c70',effect:null,decor:['cactus','deadwood','stone','tracks','shrub']},{id:'snow',name:'雪原',floor:['#cdd9d7','#e5ece4','#a3b6b6'],brick:['#a39a83','#6f7067'],solid:['#94a9ae','#677d85'],water:'#527a8b',effect:'snow',decor:['pine','snowbank','stone','tracks','stump']},{id:'city',name:'城市',floor:['#747f79','#89918a','#596b63'],brick:['#be8d71','#7f5b4a'],solid:['#a4b2ac','#677d76'],water:'#47766d',effect:null,decor:['lamp','crossing','parking','wreck','crater']},{id:'farm',name:'农田',floor:['#8b9a67','#a5af7a','#697b4b'],brick:['#b6a06b','#796d46'],solid:['#9d9e83','#6c775f'],water:'#5e9181',effect:'mud',decor:['crops','windmill','hut','furrow','hay']},{id:'red',name:'砂红土地',floor:['#ad7c63','#c39273','#865b4b'],brick:['#ba8162','#7b5140'],solid:['#a77356','#694b40'],water:'#728775',effect:'mud',decor:['mesa','rail','rust','shrub','gravel']}];
function create(level,options={}){const layout=((options.layoutStart||0)+level-1)%6,theme=themes[((options.themeStart||0)+level-1)%5];const a=Array.from({length:26},()=>Array(26).fill(0));
const rect=(x,y,w,h,v=1)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(i>=0&&i<26&&j>=0&&j<23)a[j][i]=v};
switch(layout){
case 0:
 // Alternating L-shaped cover: no full-length vertical firing lanes.
 for(const [x,y,flip]of [[3,4,0],[12,3,1],[20,5,0],[5,11,1],[15,10,0],[3,18,0],[12,18,1],[21,17,1]]){rect(x,y,3,2);rect(x+(flip?2:0),y,1,4)}rect(10,8,2,2,2);rect(19,13,2,2,2);rect(9,14,3,2,3);break;
case 1:
 // Two offset gates per ring create loops and flanking routes.
 rect(4,4,18,1);rect(4,19,18,1);rect(4,4,1,16);rect(21,4,1,16);rect(7,4,3,1,0);rect(17,19,3,1,0);rect(4,12,1,3,0);rect(21,7,1,3,0);
 rect(9,8,8,1,2);rect(9,15,8,1);rect(9,8,1,8);rect(16,8,1,8);rect(12,8,3,1,0);rect(9,11,1,2,0);rect(16,12,1,2,0);rect(11,15,3,1,0);rect(12,11,2,2,3);break;
case 2:
 // Wide river crossings staggered between two water bands.
 rect(0,8,26,2,3);rect(0,16,26,2,3);rect(3,8,4,2,0);rect(17,8,4,2,0);rect(9,16,4,2,0);rect(22,16,4,2,0);
 for(const [x,y]of [[8,3],[15,4],[3,12],[13,12],[21,11],[4,20],[17,20]])rect(x,y,3,2);rect(10,6,2,1,2);rect(16,18,2,1,2);break;
case 3:
 for(const [x,y]of [[3,4],[11,3],[20,4],[6,10],[15,9],[2,16],[11,16],[20,16]]){rect(x,y,3,3);rect(x+1,y+1,1,1,2)}rect(3,7,1,2);rect(18,10,3,1);rect(7,18,2,3);break;
case 4:
 rect(2,5,12,1);rect(18,5,6,1);rect(8,10,16,1);rect(2,15,12,1);rect(18,15,6,1);rect(8,20,16,1);
 rect(13,5,1,3);rect(8,10,1,3);rect(13,15,1,3);rect(3,9,2,2,2);rect(20,13,2,2,2);rect(3,19,2,2,3);break;
case 5:
 for(const [x,y]of [[3,4],[16,4],[3,14],[16,14]]){rect(x,y,7,1);rect(x,y,1,6);rect(x+6,y,1,6);rect(x,y+5,7,1);rect(x+2,y+5,3,1,0);rect(x+3,y+2,1,1,2)}rect(11,8,3,2,3);rect(12,17,2,2);break;
}
// Open spawn apron and shared base area. All fixed choke points are >=2 tiles.
for(let y=0;y<3;y++)for(let x=0;x<26;x++)a[y][x]=0;
for(let y=23;y<26;y++)for(let x=0;x<26;x++)a[y][x]=0;
for(let x=11;x<=14;x++)a[23][x]=2;for(let y=24;y<26;y++){a[y][11]=a[y][14]=1;a[y][12]=a[y][13]=4}
// Alternate a small number of brick/steel accents on later cycles.
if(level>6)for(let y=4;y<21;y++)for(let x=1;x<25;x++)if(a[y][x]===1&&(x*7+y*11+level)%19===0)a[y][x]=2;
const terrain=Array.from({length:26},()=>Array(26).fill('normal')),decor=[];
for(let y=3;y<23;y++)for(let x=0;x<26;x++){if(a[y][x])continue;const n=((Math.imul(x+19,374761393)^Math.imul(y+37,668265263))>>>0);if(theme.id==='snow'&&n%17<3)terrain[y][x]='snow';if((theme.id==='farm'||theme.id==='red')&&n%23<3)terrain[y][x]='mud';if(theme.id==='farm'&&x%7<2&&y%8>2)terrain[y][x]='wheat';if(terrain[y][x]==='normal'&&n%8===0)decor.push({x,y,type:theme.decor[n%theme.decor.length],variant:n%3})}
// Deterministic decorative props have no collision; all solid obstacles stay in the map.
return{map:a,name:names[layout],theme,terrain,decor,layout};}
return{create,names,themes};
});
