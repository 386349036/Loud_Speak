const fs=require('fs'),path=require('path');
const root='art-source/veggie-adventure/animations/v1';fs.mkdirSync(root,{recursive:true});
if(fs.existsSync(path.join(root,'plan.json'))){console.log('Existing animation plan retained; use build-animations.cjs to rebuild.');process.exit(0);}
const roster=JSON.parse(fs.readFileSync('docs/veggie-adventure/roster.json','utf8').replace(/^\uFEFF/,''));
const jobs=[];
for(const c of roster.characters){for(const form of c.id==='P01'?[0,1,2]:[null]){
 const id=form===null?c.id:`P01-${form}`;
 const reference=c.id==='P01'?`prototype/hero-${form*4}.png`:c.id==='E01'?'prototype/objects-0.png':c.id==='E02'?'prototype/objects-3.png':`campaign/${c.id}-1.png`;
 const states=c.animations;const rows=states.length;
 const prompt=`Create a production sprite animation sheet for an original vegetable platform game. Reference image is identity and palette reference: preserve this exact character (${c.name}, ${c.ingredient}, ${c.silhouette})${form!==null?`, form ${['small round base potato','tall grown potato','tall chili-powered potato with red scarf'][form]}`:''}. 32-bit-era crisp 2D pixel art, readable side view facing RIGHT. Exactly 4 columns and ${rows} rows, equal rectangular cells, one complete character per cell. Each row is a DIFFERENT animation, four sequential genuinely redrawn frames with articulated limbs and expressive pose changes. Rows top to bottom: ${states.map((s,i)=>`${i+1}: ${s}`).join('; ')}. Frame order left to right. Maintain identical anatomy, costume, palette, pixel size and character scale across ALL cells. Standing feet on consistent baseline at 85 percent of each cell; center each character horizontally. Leave at least 12 percent transparent margin around every sprite. No clipping, no crossing cell boundaries. Jump/fall poses tuck or extend legs; hit and defeat have clearly distinct poses; shell states change silhouette correctly. Seamless cycles for idle/walk/run/swim/fly/float; nonlooping actions progress anticipation through follow-through. TRANSPARENT background with real alpha, no floor, no shadow, no labels, no lettering, no borders, no grid lines, no scenery. This is an animation atlas, not a character concept card. Use maximum available image resolution.`;
 jobs.push({id,name:c.name,states,columns:4,rows,reference:'C:/codex/loud/public/games/veggie-adventure/assets/'+reference,prompt,status:'pending',source:`${root}/${id}.png`,frameWidth:c.id.startsWith('B')?120:48,frameHeight:c.id==='P01'&&form>0?96:c.id.startsWith('B')?120:48});
 fs.writeFileSync(path.join(root,id+'.prompt.txt'),prompt);
}}
fs.writeFileSync(path.join(root,'plan.json'),JSON.stringify({status:'in-progress',visualVerified:false,jobs},null,2));
console.log(`Planned ${jobs.length} sheets, ${jobs.reduce((s,j)=>s+j.rows*4,0)} frames`);
