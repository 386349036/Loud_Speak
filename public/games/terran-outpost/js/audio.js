/* ============================================================
   音频引擎：全程序化合成（无外部音频文件）
   总线的分层：音乐 / 音效 / 空间化 → 压缩器 → 输出
   音乐：军事工业氛围（低频持续音 + 弦乐铺底 + 行军鼓 + 金属敲击）
   音效：UI / 选中 / 无线电应答 / 完工 / 入账 / 焊花 / 气动门 / 警报 / 引擎
   ============================================================ */
const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function createAudio({ context = null } = {}){
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = context || (Ctx ? new Ctx() : null);
  if (!ctx) return nullAudio();

  /* ------------------------------------------------ 混响与总线 --- */
  function makeImpulse(seconds = 2.6, decay = 2.4){
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++){
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  const master = ctx.createGain();
  master.gain.value = 0.82;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -17;
  comp.knee.value = 24;
  comp.ratio.value = 3.4;
  comp.attack.value = 0.006;
  comp.release.value = 0.25;
  master.connect(comp);
  comp.connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse();
  const wet = ctx.createGain();
  wet.gain.value = 0.2;
  reverb.connect(wet);
  wet.connect(master);

  const musicBus = ctx.createGain();
  musicBus.gain.value = 0.52;
  musicBus.connect(master);
  const musicSend = ctx.createGain();
  musicSend.gain.value = 0.28;
  musicBus.connect(musicSend);
  musicSend.connect(reverb);

  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);
  const sfxSend = ctx.createGain();
  sfxSend.gain.value = 0.14;
  sfxBus.connect(sfxSend);
  sfxSend.connect(reverb);

  const noiseBuf = (() => {
    const len = Math.floor(ctx.sampleRate * 2);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  })();

  function noise(){
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    s.playbackRate.value = 0.85 + Math.random() * 0.3;
    return s;
  }

  function env(g, t0, a, d, peak = 1){
    g.gain.cancelScheduledValues(t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  function panTo(node, pan){
    if (!ctx.createStereoPanner) return node;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(p);
    return p;
  }

  /* ------------------------------------------------ 空间化 --- */
  let camera = null;
  function attachCamera(cam){ camera = cam; }
  function place(pos){
    if (!pos || !camera) return { pan: 0, gain: 1 };
    if (typeof pos.x !== 'number' || typeof pos.z !== 'number') return { pan: 0, gain: 1 };
    const m = camera.matrixWorld.elements;
    const fwdX = -m[8], fwdZ = -m[10];
    const yaw = Math.atan2(fwdX, fwdZ);
    const dx = pos.x - camera.position.x;
    const dz = pos.z - camera.position.z;
    const dy = pos.y - camera.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const ang = Math.atan2(dx, dz) - yaw;
    const pan = Math.max(-0.85, Math.min(0.85, Math.sin(ang) * 0.9));
    const gain = Math.max(0.07, Math.min(1, 32 / (16 + dist)));
    /* 坐标偶尔会因为某个物体变成 NaN，AudioParam 不接受非有限值（会抛异常并冻结主循环） */
    if (!Number.isFinite(pan) || !Number.isFinite(gain)) return { pan: 0, gain: 1 };
    return { pan, gain };
  }

  /* 把末端节点送到总线（带空间位置） */
  function out(node, pos, gainScale = 1){
    const pl = place(pos);
    if (pl.pan === 0 && pl.gain === 1){
      node.connect(sfxBus);
      return;
    }
    const g = ctx.createGain();
    const v = pl.gain * gainScale;
    g.gain.value = Number.isFinite(v) ? v : 0.6;
    node.connect(g);
    const p = panTo(g, pl.pan);
    p.connect(sfxBus);
  }

  /* ------------------------------------------------ 音效 --- */
  let muted = false;
  const live = new Set();

  /* 金属点击（按钮 / 菜单） */
  function click(pos){
    const t = ctx.currentTime;
    const n = noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 1.7;
    const g = ctx.createGain();
    env(g, t, 0.003, 0.085, 0.45);
    n.connect(bp); bp.connect(g); out(g, pos);
    n.start(t); n.stop(t + 0.11);

    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1900, t);
    o.frequency.exponentialRampToValueAtTime(760, t + 0.045);
    const g2 = ctx.createGain();
    env(g2, t, 0.002, 0.06, 0.2);
    o.connect(g2); out(g2, pos);
    o.start(t); o.stop(t + 0.09);
  }

  /* 选中建筑：无线电双音确认 + 通讯底噪 */
  function select(pos){
    const t = ctx.currentTime;
    [0, 0.075].forEach((dt, i) => {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(i ? 1180 : 940, t + dt);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1250;
      bp.Q.value = 3.2;
      const g = ctx.createGain();
      env(g, t + dt, 0.004, i ? 0.1 : 0.07, 0.15);
      o.connect(bp); bp.connect(g); out(g, pos);
      o.start(t + dt); o.stop(t + dt + 0.2);
    });
    const n = noise();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1900;
    const g = ctx.createGain();
    env(g, t, 0.01, 0.12, 0.045);
    n.connect(hp); hp.connect(g); out(g, pos);
    n.start(t); n.stop(t + 0.22);
  }

  /* 下达指令 / 设集结点：三连应答音 */
  function ack(pos){
    const t = ctx.currentTime;
    [[0, 660], [0.07, 880], [0.15, 1180]].forEach(([dt, f]) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      env(g, t + dt, 0.005, 0.075, 0.14);
      o.connect(g); out(g, pos);
      o.start(t + dt); o.stop(t + dt + 0.12);
    });
  }

  /* 错误：低频蜂鸣 */
  function error(pos){
    const t = ctx.currentTime;
    [[190, 120, 0.2, 0.18], [96, 96, 0.22, 0.1]].forEach(([f1, f2, dur, amp]) => {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.8);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      const g = ctx.createGain();
      env(g, t, 0.01, dur, amp);
      o.connect(lp); lp.connect(g); out(g, pos);
      o.start(t); o.stop(t + dur + 0.08);
    });
  }

  /* 完工：三音上行（金属钟） */
  function complete(pos){
    const t = ctx.currentTime;
    [69, 72, 76].forEach((m, i) => {
      const dt = i * 0.1;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = NOTE(m);
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = NOTE(m) * 2.01;
      const g = ctx.createGain();
      env(g, t + dt, 0.008, 0.85, 0.15);
      const g2 = ctx.createGain();
      env(g2, t + dt, 0.008, 0.45, 0.045);
      o.connect(g); out(g, pos);
      o2.connect(g2); out(g2, pos);
      o.start(t + dt); o.stop(t + dt + 1.05);
      o2.start(t + dt); o2.stop(t + dt + 0.65);
    });
  }

  /* 入账：清脆叮 */
  function deposit(pos){
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(1760, t + 0.08);
    const g = ctx.createGain();
    env(g, t, 0.004, 0.2, 0.14);
    o.connect(g); out(g, pos);
    o.start(t); o.stop(t + 0.28);

    const n = noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 5200;
    const gn = ctx.createGain();
    env(gn, t, 0.002, 0.05, 0.06);
    n.connect(bp); bp.connect(gn); out(gn, pos);
    n.start(t); n.stop(t + 0.08);
  }

  /* 气动门：气阀嘶声 + 伺服滑音 */
  function door(pos, open = true){
    const t = ctx.currentTime;
    const n = noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(open ? 900 : 1500, t);
    bp.frequency.exponentialRampToValueAtTime(open ? 2200 : 700, t + 0.45);
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    env(g, t, 0.03, 0.48, 0.09);
    n.connect(bp); bp.connect(g); out(g, pos);
    n.start(t); n.stop(t + 0.6);

    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(open ? 180 : 320, t);
    o.frequency.linearRampToValueAtTime(open ? 300 : 150, t + 0.4);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    const g2 = ctx.createGain();
    env(g2, t + 0.02, 0.05, 0.4, 0.07);
    o.connect(lp); lp.connect(g2); out(g2, pos);
    o.start(t + 0.02); o.stop(t + 0.5);
  }

  /* 警报 klaxon */
  function alarm(pos){
    const t = ctx.currentTime;
    [0, 0.42].forEach(dt => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(520, t + dt);
      o.frequency.exponentialRampToValueAtTime(300, t + dt + 0.3);
      const bp = ctx.createBiquadFilter();
      bp.type = 'lowpass';
      bp.frequency.value = 1200;
      const g = ctx.createGain();
      env(g, t + dt, 0.03, 0.32, 0.11);
      o.connect(bp); bp.connect(g); out(g, pos);
      o.start(t + dt); o.stop(t + dt + 0.4);
    });
  }

  /* 焊花：爆裂 + 嘶声 */
  function weld(pos){
    const t = ctx.currentTime;
    const n = noise();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2600;
    const g = ctx.createGain();
    env(g, t, 0.002, 0.12, 0.085);
    n.connect(hp); hp.connect(g); out(g, pos);
    n.start(t); n.stop(t + 0.16);

    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 140 + Math.random() * 90;
    const g2 = ctx.createGain();
    env(g2, t, 0.002, 0.05, 0.04);
    o.connect(g2); out(g2, pos);
    o.start(t); o.stop(t + 0.08);
  }

  /* 命中：短促的金属/肉体撞击 */
  let lastHit = 0;
  function hit(pos){
    const now = performance.now();
    if (now - lastHit < 55) return;      /* 节流：避免密集命中把音频节点打爆 */
    lastHit = now;
    const t = ctx.currentTime;
    const n = noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900 + Math.random() * 700;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    env(g, t, 0.002, 0.055, 0.03);
    n.connect(bp); bp.connect(g); out(g, pos);
    n.start(t); n.stop(t + 0.1);

    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(320 + Math.random() * 160, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    const g2 = ctx.createGain();
    env(g2, t, 0.002, 0.05, 0.03);
    o.connect(g2); out(g2, pos);
    o.start(t); o.stop(t + 0.1);
  }

  /* 爆炸：低频冲击 + 噪声尾 */
  function explode(pos){
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.5);
    const g = ctx.createGain();
    env(g, t, 0.004, 0.26, 0.4);
    o.connect(g); out(g, pos);
    o.start(t); o.stop(t + 0.55);

    const n = noise();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, t);
    lp.frequency.exponentialRampToValueAtTime(300, t + 0.6);
    const g2 = ctx.createGain();
    env(g2, t, 0.004, 0.2, 0.45);
    n.connect(lp); lp.connect(g2); out(g2, pos);
    n.start(t); n.stop(t + 0.7);
  }

  /* 液压/机械臂 */
  function servo(pos){
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(90, t);
    o.frequency.linearRampToValueAtTime(150, t + 0.18);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const g = ctx.createGain();
    env(g, t, 0.02, 0.2, 0.075);
    o.connect(lp); lp.connect(g); out(g, pos);
    o.start(t); o.stop(t + 0.26);
  }

  /* 大和炮蓄能：低频上扫 + 越来越亮的谐波 */
  function yamatoCharge(dur = 2.4, pos){
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(46, t);
    o.frequency.exponentialRampToValueAtTime(210, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(180, t);
    lp.frequency.exponentialRampToValueAtTime(2600, t + dur);
    lp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + dur * 0.96);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    o.connect(lp); lp.connect(g); out(g, pos);
    o.start(t); o.stop(t + dur + 0.1);

    const n = noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + dur);
    bp.Q.value = 3;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.09, t + dur * 0.95);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    n.connect(bp); bp.connect(g2); out(g2, pos);
    n.start(t); n.stop(t + dur + 0.1);
  }

  /* 大和炮发射：极低频冲击 + 宽带爆裂 + 长尾 */
  function yamatoFire(pos){
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.9);
    const g = ctx.createGain();
    env(g, t, 0.003, 0.5, 0.9);
    o.connect(g); out(g, pos);
    o.start(t); o.stop(t + 1.0);

    const n = noise();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(7000, t);
    lp.frequency.exponentialRampToValueAtTime(420, t + 0.7);
    const g2 = ctx.createGain();
    env(g2, t, 0.002, 0.4, 0.7);
    n.connect(lp); lp.connect(g2); out(g2, pos);
    n.start(t); n.stop(t + 0.9);
  }

  /* ------------------------------------------------ 持续音 --- */
  function makeLoopVoice({ type = 'sawtooth', freq = 60, filter = 300, noiseMix = 0.4 }){
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = freq * 1.006;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = filter;
    lp.Q.value = 1.1;

    const n = noise();
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 700;
    nf.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.value = noiseMix;

    const outGain = ctx.createGain();
    outGain.gain.value = 0;
    o.connect(lp); o2.connect(lp); lp.connect(outGain);
    n.connect(nf); nf.connect(ng); ng.connect(outGain);
    outGain.connect(sfxBus);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.7;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = filter * 0.35;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);

    o.start(t); o2.start(t); n.start(t); lfo.start(t);
    const voice = {
      set(v){ outGain.gain.setTargetAtTime(v, ctx.currentTime, 0.12); },
      setPitch(f){
        o.frequency.setTargetAtTime(f, ctx.currentTime, 0.2);
        o2.frequency.setTargetAtTime(f * 1.006, ctx.currentTime, 0.2);
      },
      stop(){
        try { o.stop(); o2.stop(); n.stop(); lfo.stop(); } catch (e){ /* noop */ }
      }
    };
    live.add(voice);
    return voice;
  }

  let buildLoop = null;
  function startBuild(){
    if (!buildLoop) buildLoop = makeLoopVoice({ type: 'square', freq: 52, filter: 180, noiseMix: 0.25 });
    buildLoop.set(0.045);
  }
  function stopBuild(){ if (buildLoop) buildLoop.set(0); }

  let shipLoop = null;
  function setShip(level){
    if (!Number.isFinite(level)) level = 0;
    if (level > 0.01){
      /* 引擎：低频轰鸣为主、噪声只作底噪，整体压低到不抢戏 */
      if (!shipLoop) shipLoop = makeLoopVoice({ type: 'sawtooth', freq: 44, filter: 190, noiseMix: 0.38 });
      shipLoop.set(0.055 * level);
      shipLoop.setPitch(40 + 16 * level);
    } else if (shipLoop) shipLoop.set(0);
  }

  let tankLoop = null;
  function setTank(level){
    if (!Number.isFinite(level)) level = 0;
    if (level > 0.01){
      if (!tankLoop) tankLoop = makeLoopVoice({ type: 'sawtooth', freq: 62, filter: 220, noiseMix: 0.5 });
      tankLoop.set(0.05 * level);
    } else if (tankLoop) tankLoop.set(0);
  }

  /* ------------------------------------------------ 音乐 --- */
  const BPM = 84;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const CHORDS = [
    { root: 45, notes: [57, 60, 64] },
    { root: 41, notes: [53, 57, 60] },
    { root: 48, notes: [55, 60, 64] },
    { root: 43, notes: [55, 59, 62] }
  ];

  let mood = 0;
  let musicOn = false;
  let nextBarTime = 0;
  let barIndex = 0;
  let drone = null;

  function padVoice(chord, t0, dur){
    for (const m of chord.notes){
      for (const det of [-7, 6]){
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = NOTE(m);
        o.detune.value = det;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(380, t0);
        lp.frequency.linearRampToValueAtTime(760, t0 + dur * 0.55);
        lp.frequency.linearRampToValueAtTime(460, t0 + dur);
        lp.Q.value = 0.6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.028, t0 + dur * 0.4);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(lp); lp.connect(g); g.connect(musicBus);
        o.start(t0); o.stop(t0 + dur + 0.1);
      }
    }
    const b = ctx.createOscillator();
    b.type = 'sine';
    b.frequency.value = NOTE(chord.root - 12);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t0);
    bg.gain.exponentialRampToValueAtTime(0.085, t0 + 0.4);
    bg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    b.connect(bg); bg.connect(musicBus);
    b.start(t0); b.stop(t0 + dur + 0.1);
  }

  function kick(t, gain){
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(115, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.17);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    o.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + 0.4);
  }

  function snare(t, gain){
    const n = noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1750;
    bp.Q.value = 1.1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    n.connect(bp); bp.connect(g); g.connect(musicBus);
    n.start(t); n.stop(t + 0.2);
  }

  function hat(t, gain){
    const n = noise();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
    n.connect(hp); hp.connect(g); g.connect(musicBus);
    n.start(t); n.stop(t + 0.08);
  }

  /* 金属敲击：工业感的“钢梁”音 */
  function anvil(t, gain){
    [320, 487, 731].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain / (i + 1.4), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5 - i * 0.3);
      o.connect(g); g.connect(musicBus);
      o.start(t); o.stop(t + 1.6);
    });
  }

  /* 低音铜管式涌动（每 8 小节一次） */
  function swell(t, chord, dur){
    [chord.notes[0] - 12, chord.notes[1] - 12].forEach(m => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = NOTE(m);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(160, t);
      lp.frequency.linearRampToValueAtTime(520, t + dur * 0.6);
      lp.frequency.linearRampToValueAtTime(200, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(lp); lp.connect(g); g.connect(musicBus);
      o.start(t); o.stop(t + dur + 0.1);
    });
  }

  function scheduleMusicWindow(fromTime, duration){
    let t = fromTime;
    let i = barIndex;
    while (t < fromTime + duration){
      const chord = CHORDS[Math.floor(i / 2) % CHORDS.length];
      padVoice(chord, t, BAR * 0.98);
      /* 行军鼓：1、3 拍重音，弱拍轻击 */
      kick(t, mood > 0.5 ? 0.16 : 0.24);
      kick(t + BEAT * 2, 0.17);
      if (mood < 0.8){
        for (let b = 0; b < 4; b++){
          if (b % 2 === 1) snare(t + BEAT * b, 0.075);
          else hat(t + BEAT * b + BEAT * 0.5, 0.028);
        }
      }
      /* 金属敲击：每两小节一次，夜里更稀 */
      if (i % 2 === 0 && mood < 0.6) anvil(t + BEAT * 3.5, 0.045);
      /* 铜管涌动：每 8 小节 */
      if (i % 8 === 4) swell(t, chord, BAR * 1.9);
      t += BAR;
      i++;
    }
    barIndex = i;
    nextBarTime = t;
  }

  let scheduler = null;
  function startMusic(){
    if (musicOn || !ctx) return;
    musicOn = true;
    nextBarTime = ctx.currentTime + 0.2;
    barIndex = 0;
    /* 持续低频 drone（氛围底座） */
    if (!drone){
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 41.2;      // E1
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = 61.7;     // B1
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 150;
      lp.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 6);
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.05;
      const lg = ctx.createGain();
      lg.gain.value = 40;
      lfo.connect(lg); lg.connect(lp.frequency);
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musicBus);
      o.start(); o2.start(); lfo.start();
      drone = { o, o2, lfo, g };
    }
    scheduleMusicWindow(nextBarTime, BAR * 2.1);
    scheduler = setInterval(() => {
      if (!musicOn) return;
      const ahead = ctx.currentTime + BAR * 2.1;
      if (nextBarTime < ahead) scheduleMusicWindow(nextBarTime, BAR * 1.4);
    }, 850);
  }

  function stopMusic(){
    musicOn = false;
    if (scheduler){ clearInterval(scheduler); scheduler = null; }
    if (drone){
      drone.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6);
    }
  }

  /* ------------------------------------------------ 控制 --- */
  function setMuted(v){
    muted = v;
    master.gain.setTargetAtTime(v ? 0 : 0.82, ctx.currentTime, 0.1);
    for (const voice of live){ if (v) voice.set(0); }
  }
  function setMusicVolume(v){ musicBus.gain.setTargetAtTime(v, ctx.currentTime, 0.12); }
  function setSfxVolume(v){ sfxBus.gain.setTargetAtTime(v, ctx.currentTime, 0.12); }
  function setMood(k){
    mood = k;
    musicBus.gain.setTargetAtTime(0.52 - 0.14 * k, ctx.currentTime, 1.4);
  }
  function resume(){ if (!hardStopped && ctx.state === 'suspended') ctx.resume(); }

  /* 页面隐藏/关闭时真正掐断声音：只把音量调小不够，浏览器仍可能在后台调度 */
  let hardStopped = false;
  let pageSuspended = false;

  function suspendPage(){
    if (hardStopped) return;
    pageSuspended = true;
    try {
      if (ctx.state === 'running') ctx.suspend();
      if (master.gain.cancelScheduledValues) master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
    } catch (e){ /* 页面正在销毁，忽略 */ }
  }

  function resumePage(){
    if (hardStopped || !pageSuspended) return;
    pageSuspended = false;
    try {
      master.gain.setValueAtTime(muted ? 0 : 0.82, ctx.currentTime);
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e){ /* noop */ }
  }

  function shutdown(){
    if (hardStopped) return;
    hardStopped = true;
    musicOn = false;
    if (scheduler){ clearInterval(scheduler); scheduler = null; }
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
    } catch (e){ /* noop */ }
    for (const voice of live){ try { voice.stop(); } catch (e){ /* noop */ } }
    if (drone){
      try { drone.o.stop(); drone.o2.stop(); drone.lfo.stop(); } catch (e){ /* noop */ }
      drone = null;
    }
    try {
      if (ctx.state !== 'closed') ctx.close();
    } catch (e){ /* noop */ }
  }

  const api = {
    ctx, resume, suspend: suspendPage, shutdown, setMuted, setMusicVolume, setSfxVolume, setMood, attachCamera,
    _master: master, _music: musicBus, _sfx: sfxBus,
    get muted(){ return muted; },
    click, select, ack, error, complete, deposit, door, alarm, weld, servo, hit, explode,
    yamatoCharge, yamatoFire,
    startBuild, stopBuild, setShip, setTank,
    startMusic, stopMusic,
    scheduleMusicWindow,
    setBuildActivity(on){ if (on) startBuild(); else stopBuild(); },
    setTankActivity(on){ setTank(on ? 1 : 0); }
  };

  /* 音频永远不能把主循环带崩：任何一层抛错都在这里吞掉并只记一次 */
  for (const k of Object.keys(api)){
    const fn = api[k];
    if (typeof fn !== 'function') continue;
    api[k] = (...args) => {
      try { return fn(...args); }
      catch (e){
        if (!api._lastError){ api._lastError = String(e && e.message || e); console.warn('[audio]', api._lastError); }
        return undefined;
      }
    };
  }
  api.attachCamera = (cam) => { try { camera = cam; } catch (e){} };

  /* 关闭页面/切到后台时真正停掉 WebAudio，避免“关了游戏还有声音” */
  window.addEventListener('pagehide', (e) => {
    try { e.persisted ? suspendPage() : shutdown(); } catch (err){}
  });
  window.addEventListener('beforeunload', () => {
    try { shutdown(); } catch (err){}
  });
  window.addEventListener('pageshow', (e) => {
    try { if (e.persisted) resumePage(); } catch (err){}
  });
  document.addEventListener('visibilitychange', () => {
    try { document.hidden ? suspendPage() : resumePage(); } catch (err){}
  });

  return api;
}

/* 无 AudioContext 时的空实现，保证主程序不崩 */
function nullAudio(){
  const noop = () => {};
  return {
    ctx: null, resume: noop, setMuted: noop, setMusicVolume: noop, setSfxVolume: noop, setMood: noop,
    attachCamera: noop, muted: false,
    click: noop, select: noop, ack: noop, error: noop, complete: noop, deposit: noop,
    door: noop, alarm: noop, weld: noop, servo: noop, hit: noop, explode: noop,
    yamatoCharge: noop, yamatoFire: noop,
    startBuild: noop, stopBuild: noop, setShip: noop, setTank: noop,
    startMusic: noop, stopMusic: noop, scheduleMusicWindow: noop,
    setBuildActivity: noop, setTankActivity: noop
  };
}
