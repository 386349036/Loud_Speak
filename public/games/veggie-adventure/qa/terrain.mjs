import {terrainTileId} from '../js/render.mjs';
const descriptions={W01:'草根砂土 / 风化砂岩',W02:'根须黏土 / 矿晶页岩',W03:'盘根浅土 / 多孔轻石',W04:'湿泥苔土 / 河床卵石',W05:'落叶腐殖土 / 赤岩根基',W06:'灰烬焦土 / 耐火砖基',W07:'冷色藤土 / 银脉玄武岩',W08:'石榴根土 / 王庭砌石'};
try{
 const r=await fetch('../assets/manifest.json');if(!r.ok)throw Error('素材清单读取失败');const m=await r.json(),assets=new Map(m.assets.map(a=>[a.id,a]));
 const image=id=>{const img=document.createElement('img');img.src='../assets/'+assets.get(id).path;img.alt=id;img.width=48;img.height=48;return img;};
 for(const [id,set] of Object.entries(m.terrainSets)){
  const card=document.createElement('article'),title=document.createElement('h2'),description=document.createElement('p'),strip=document.createElement('div'),swatches=document.createElement('div');
  title.textContent=id+' · '+set.name;description.textContent=descriptions[id];strip.className='strip';swatches.className='swatches';
  for(let row=0;row<3;row++)for(let col=0;col<8;col++)strip.append(image(terrainTileId(id+'-kit',row?1:0,col*16,208+row*16,assets)));
  for(const [n,tile] of [...set.soil,...set.foundation].entries()){const cell=document.createElement('div'),label=document.createElement('small');label.textContent=['泥土 A','泥土 B','地基 A','地基 B'][n];cell.append(image(tile),label);swatches.append(cell);}
  card.append(title,description,strip,swatches);document.getElementById('worlds').append(card);
 }
}catch(e){document.getElementById('error').textContent=e.message;}
