const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),output=path.join(root,'public/games/veggie-adventure/assets/audio/sfx'),source=path.join(root,'art-source/veggie-adventure/audio/action-sfx-v1'),rate=24000;
const tone=(from,to,duration,start=0,gain=1,type='triangle')=>({from,to,duration,start,gain,type});
const recipes={
 jump:[tone(260,880,.15)],swim:[tone(170,430,.13,0,.7,'sine'),tone(600,260,.09,.04,.25,'noise')],
 'brick-break':[tone(220,55,.15,0,.65,'noise'),tone(150,65,.08,0,.6,'square')],
 'reward-spawn':[tone(460,720,.06,0,.7),tone(720,1060,.09,.055,.7)],
 'pickup-seed':[tone(1050,1400,.07,0,.7,'sine'),tone(1600,1900,.06,.04,.45,'sine')],
 'pickup-upgrade':[tone(330,440,.06),tone(440,580,.06,.055),tone(660,880,.12,.11)],
 'pickup-star':[tone(520,720,.07),tone(780,980,.07,.06),tone(1040,1320,.12,.12)],
 'life-up':[tone(392,392,.07),tone(494,494,.07,.065),tone(588,588,.07,.13),tone(784,1046,.2,.195)],
 'stomp-normal':[tone(220,65,.105,0,.9,'triangle'),tone(250,100,.045,0,.2,'noise')],
 'stomp-flight':[tone(980,260,.13,0,.8,'sine'),tone(460,220,.1,.045,.35,'triangle')],
 'stomp-shell':[tone(680,220,.13,0,.8,'square'),tone(1100,450,.08,.015,.45,'sine')],
 'stomp-boss':[tone(110,38,.24,0,1,'triangle'),tone(330,75,.18,0,.5,'noise'),tone(220,110,.18,.055,.4,'sine')],
 'stomp-water':[tone(320,100,.17,0,.7,'sine'),tone(900,460,.08,.025,.5,'sine'),tone(1100,540,.07,.08,.35,'noise')],
 'shell-bounce':[tone(910,630,.075,0,.75,'sine'),tone(1365,945,.07,0,.3,'sine')],
 'boss-armor':[tone(260,240,.09,0,.65,'square'),tone(1680,950,.08,0,.35,'sine')],
 'boss-hit':[tone(140,55,.17,0,.8,'triangle'),tone(600,160,.09,0,.35,'noise')],
 fire:[tone(720,190,.105,0,.7,'square'),tone(500,120,.07,0,.3,'noise')],
 hurt:[tone(520,180,.16,0,.6,'square'),tone(160,70,.14,.04,.4,'triangle')],
 'shell-dash':[tone(180,470,.1,0,.7,'noise'),tone(200,340,.12,0,.4,'triangle')],
 'spine-volley':[tone(1150,420,.09,0,.5,'noise'),tone(940,360,.08,.025,.6,'square')],
 'plant-spit':[tone(180,450,.08,0,.8,'sine'),tone(450,140,.11,.045,.7,'triangle')],
 warp:[tone(330,880,.12),tone(660,1320,.15,.1),tone(990,1760,.18,.2)]
};
function synth(key,layers){
 const duration=Math.max(...layers.map(l=>l.start+l.duration))+.012,n=Math.ceil(duration*rate),samples=new Float64Array(n);let seed=crypto.createHash('sha256').update(key).digest().readUInt32LE(0)||1;
 const noise=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};
 for(const l of layers)for(let i=Math.round(l.start*rate);i<Math.min(n,Math.ceil((l.start+l.duration)*rate));i++){
  const t=i/rate-l.start,q=Math.max(0,Math.min(1,t/l.duration)),phase=2*Math.PI*(l.from*t+(l.to-l.from)*t*t/(2*l.duration)),env=Math.min(1,t/.003)*Math.pow(1-q,1.5);
  const wave=l.type==='noise'?noise():l.type==='square'?(Math.sin(phase)>=0?1:-1):l.type==='sine'?Math.sin(phase):2/Math.PI*Math.asin(Math.sin(phase));samples[i]+=wave*env*l.gain;
 }
 let peak=0,filtered=0;for(let i=0;i<n;i++){filtered+=.65*(samples[i]-filtered);samples[i]=filtered;peak=Math.max(peak,Math.abs(filtered));}
 const wav=Buffer.alloc(44+n*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++)wav.writeInt16LE(Math.round(samples[i]/Math.max(peak,.001)*.72*32767),44+i*2);
 return {wav,duration:n/rate,peakDb:20*Math.log10(.72)};
}
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(source,{recursive:true});const sounds={};
for(const [id,layers] of Object.entries(recipes)){const {wav,duration,peakDb}=synth(id,layers);fs.writeFileSync(path.join(output,id+'.wav'),wav);sounds[id]={path:id+'.wav',duration,bytes:wav.length,sha256:crypto.createHash('sha256').update(wav).digest('hex'),peakDb,cooldown:['swim','jump'].includes(id)?.1:.06,gain:1};}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({version:1,format:'PCM WAV mono 24kHz 16-bit',source:'Original deterministic synthesis; not extracted from commercial games',sounds},null,2)+'\n');
fs.writeFileSync(path.join(source,'recipes.json'),JSON.stringify({rate,method:'Original pitch envelopes, triangle/sine/square voices and seeded noise; 0.72 sample peak; short attack and release; no external services',recipes,sounds},null,2)+'\n');
console.log(JSON.stringify({sounds:Object.keys(sounds).length,bytes:Object.values(sounds).reduce((n,s)=>n+s.bytes,0)}));
