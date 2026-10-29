/** @jsx localizedElement */
import React,{useState,useRef,useEffect,useId} from 'react';
import {localizedElement} from './zh';
import {getNavigation,getMapView,fitMapView} from './navigation';

const SHORT_NAMES={ranger_diary:'Field Journal',glowing_brass_key:'Brass Key',cave_samples:'Research Sample',cave_gate:'Cave Gate',kudawa_helipad_flare:'Helipad',gunadasa_npc:'Ranger',outpost_radio:'Radio',outpost_douglas_reel:'Audio Reel',outpost_balm_bottle:'Balm',uv_lens_item:'UV Lens',ginger_tea_mug:'Ginger Tea',salt_pouch_outpost:'Salt'};

export default function SceneMap({stats,objective,mini=false,paused=false,onTogglePause}) {
  const svg=useRef(null),drag=useRef(null),id=useId().replace(/:/g,'');
  const [span,setSpan]=useState(mini?90:180),[pan,setPan]=useState(null),[aspect,setAspect]=useState(1.4);
  const scene=stats.sceneMap,points=scene?.landmarks||[];
  const view=getMapView(stats.playerX,stats.playerY,span,aspect,pan);
  const heading=getNavigation(stats.playerAngle,stats.playerX,stats.playerY,objective.x,objective.y).heading;
  // Only map a mission pin when it corresponds to an object present in the active 3D scene.
  const missionId=stats.chapter===1?{Book:'ranger_diary',Key:'glowing_brass_key',Target:'cave_gate',Vial:'cave_samples',Helicopter:'kudawa_helipad_flare'}[objective.icon]:null;
  const target=missionId?points.find(p=>p.id===missionId):null;
  const pointSize=span*(mini?0.025:0.007),fontSize=span*0.022;
  useEffect(()=>{
    const element=svg.current;if(!element)return;
    const measure=()=>{const r=element.getBoundingClientRect();if(r.width&&r.height)setAspect(r.width/r.height);};
    measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();
  },[]);
  const zoom=factor=>setSpan(value=>Math.max(40,Math.min(600,value*factor)));
  const down=e=>{
    if(mini||e.button!==0)return;
    const r=e.currentTarget.getBoundingClientRect();
    drag.current={id:e.pointerId,clientX:e.clientX,clientY:e.clientY,x:pan?.x??stats.playerX,z:pan?.z??stats.playerY,ratioX:view.width/r.width,ratioZ:view.height/r.height};
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move=e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;setPan({x:d.x-(e.clientX-d.clientX)*d.ratioX,z:d.z-(e.clientY-d.clientY)*d.ratioZ});};
  const end=e=>{if(drag.current?.id===e.pointerId)drag.current=null;};
  return <div className={`scene-map ${mini?'scene-map-mini':''}`}>
    <svg ref={svg} className="scene-map-svg" viewBox={`${view.x} ${view.z} ${view.width} ${view.height}`} role="img" aria-label="Live scene map" onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onWheel={mini?undefined:e=>zoom(e.deltaY>0?1.15:1/1.15)}>
      <defs><pattern id={`map-grid-${id}`} width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#244434" strokeWidth="0.25"/></pattern></defs>
      <rect x={view.x} y={view.z} width={view.width} height={view.height} fill="#07130d"/>
      <rect x={view.x} y={view.z} width={view.width} height={view.height} fill={`url(#map-grid-${id})`}/>
      {(scene?.paths||[]).map((line,i)=><polyline key={i} points={line.map(p=>`${p.x},${p.z}`).join(' ')} fill="none" stroke="#76633d" strokeWidth="2.8" opacity="0.65"/>)}
      {(scene?.buildings||[]).map((b,i)=><rect key={i} x={b.x-b.width/2} y={b.z-b.depth/2} width={b.width} height={b.depth} fill="#203b2d" stroke="#608b62" strokeWidth="0.6"/>)}
      {points.map(p=><g key={p.id}>
        <circle cx={p.x} cy={p.z} r={pointSize*(p.id===target?.id?1.15:0.65)} fill={p.id===target?.id?'#00e5ff':'#dfb857'} stroke="#07130d" strokeWidth={pointSize*0.25}><title>{p.title}</title></circle>
        {!mini&&SHORT_NAMES[p.id]&&(p.id===target?.id||['cave_gate','kudawa_helipad_flare','gunadasa_npc'].includes(p.id))&&<text x={p.x+pointSize} y={p.z-pointSize} fill="#d6e6d8" fontSize={fontSize} paintOrder="stroke" stroke="#07130d" strokeWidth={fontSize*0.18}>{SHORT_NAMES[p.id]}</text>}
      </g>)}
      {target&&<circle cx={target.x} cy={target.z} r={pointSize*2.1} fill="none" stroke="#00e5ff" strokeWidth={pointSize*0.25}/>}
      <g transform={`translate(${stats.playerX} ${stats.playerY}) rotate(${heading})`}>
        <path d={`M 0 ${-pointSize*2.5} L ${pointSize*1.5} ${pointSize*1.5} L 0 ${pointSize*0.7} L ${-pointSize*1.5} ${pointSize*1.5} Z`} fill="#65f880" stroke="#07130d" strokeWidth={pointSize*0.35}/>
      </g>
      {!mini&&<text x={stats.playerX+pointSize*2} y={stats.playerY+pointSize*3.5} fill="#65f880" fontSize={fontSize}>YOU (EXPLORER)</text>}
    </svg>
    {mini&&<span className="scene-map-mini-north">N ↑</span>}
    {!mini&&<>
      <div className="scene-map-toolbar">
        <button type="button" onClick={()=>{setPan(null);setSpan(180);}}>Follow player</button>
        <button type="button" onClick={()=>{const fit=fitMapView([...points,{x:stats.playerX,z:stats.playerY}]);setPan({x:fit.x,z:fit.z});setSpan(fit.span);}}>Overview</button>
        <button type="button" onClick={()=>zoom(1/1.25)} aria-label="Zoom in">＋</button>
        <button type="button" onClick={()=>zoom(1.25)} aria-label="Zoom out">－</button>
        <button type="button" onClick={onTogglePause}>{paused?'Resume live map':'Pause to inspect'}</button>
      </div>
      <div className="scene-map-status"><span>N ↑</span><span>X {stats.playerX.toFixed(1)} · Z {stats.playerY.toFixed(1)} · {Math.round(heading)%360}°</span><span>{paused?'Map paused':'Live tracking'}</span></div>
      <div className="scene-map-help">{target?'Drag to pan · scroll to zoom · WASD to move':'Mission object not present in this scene'}</div>
    </>}
  </div>;
}
