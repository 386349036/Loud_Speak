// Explicit, read-only-save QA controls; no invincibility, auto-play or forced victory.
export function bindFull32Review({document,mount,onPosition}){
 const row=document.createElement('div');row.className='level-picker';
 const form=document.createElement('select');form.id='audit-form';form.setAttribute('aria-label','巡检形态');
 for(const [value,name] of [['0','初始'],['1','成长'],['2','辣椒']]){const o=document.createElement('option');o.value=value;o.textContent=name;form.append(o);}
 const x=document.createElement('input');x.type='number';x.value='32';x.min='0';x.setAttribute('aria-label','巡检横坐标');x.style.width='80px';
 const foot=document.createElement('input');foot.type='number';foot.value='208';foot.setAttribute('aria-label','巡检落脚高度');foot.style.width='80px';
 const button=document.createElement('button');button.textContent='定位并应用形态';button.onclick=()=>{onPosition({x:Number(x.value),foot:Number(foot.value),form:Number(form.value)});button.blur();};
 const note=document.createElement('p');note.textContent='完整巡检工具：定位会重开本关并应用所选形态；保留正常伤害，不自动游玩，不写存档。定位观察不代表连续通关。';
 row.append('形态 ',form,' x ',x,' 脚底 ',foot,button);mount.append(row,note);
 return {form:()=>Number(form.value)};
}
