/* 设置界面：ESC 打开，音频 / 画面 / 面板 / 存档 四栏 */
const KEY = 'dsh-settings-v1';

function loadPrefs(){
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e){ return {}; }
}
function savePrefs(p){
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e){}
}

const CSS = `
#settings{position:fixed;inset:0;z-index:60;display:none;place-items:center;
  background:rgba(4,9,13,.72);backdrop-filter:blur(7px) saturate(.9);font-family:inherit}
#settings.open{display:grid}
#settings .box{width:min(880px,88vw);max-height:82vh;display:flex;flex-direction:column;
  background:linear-gradient(160deg,rgba(14,26,34,.98),rgba(8,16,22,.98));
  border:1px solid rgba(90,150,180,.35);border-radius:6px;overflow:hidden;
  box-shadow:0 24px 80px rgba(0,0,0,.7),inset 0 1px 0 rgba(150,220,255,.12)}
#settings header{display:flex;align-items:center;gap:18px;padding:14px 20px;
  border-bottom:1px solid rgba(90,150,180,.22);background:rgba(10,20,28,.6)}
#settings h2{margin:0;font-size:15px;letter-spacing:.24em;color:#cfeaf7;font-weight:600}
#settings .tabs{display:flex;gap:6px;margin-left:12px}
#settings .tabs button{background:transparent;border:1px solid rgba(90,150,180,.28);color:#8fb6c8;
  padding:6px 14px;border-radius:3px;font-size:12px;letter-spacing:.1em;cursor:pointer}
#settings .tabs button.on{background:rgba(60,140,180,.22);border-color:rgba(120,210,255,.65);color:#e8f7ff}
#settings .close{margin-left:auto;background:transparent;border:0;color:#7fa6b8;font-size:22px;
  line-height:1;cursor:pointer;padding:0 4px}
#settings .close:hover{color:#ff9a6a}
#settings .body{padding:18px 22px 22px;overflow:auto}
#settings .sec{display:none;flex-direction:column;gap:14px}
#settings .sec.on{display:flex}
#settings .row{display:grid;grid-template-columns:120px 1fr auto;align-items:center;gap:14px;
  padding:9px 12px;border:1px solid rgba(90,150,180,.16);border-radius:4px;background:rgba(16,28,36,.55)}
#settings .row .k{font-size:12px;color:#9dc0d0;letter-spacing:.06em}
#settings .row .v{font-size:12px;color:#cfeaf7;min-width:46px;text-align:right;font-variant-numeric:tabular-nums}
#settings input[type=range]{width:100%;accent-color:#48b6dc;height:16px}
#settings .seg{display:flex;gap:6px}
#settings .seg button{background:rgba(20,34,44,.9);border:1px solid rgba(90,150,180,.3);color:#9dc0d0;
  padding:6px 16px;border-radius:3px;font-size:12px;cursor:pointer;letter-spacing:.08em}
#settings .seg button.on{background:rgba(60,140,180,.25);border-color:rgba(120,210,255,.7);color:#eaf9ff}
#settings .hint{font-size:11px;color:#6f90a2;line-height:1.7}
#settings .plist{display:flex;flex-direction:column;gap:8px}
#settings .prow{display:grid;grid-template-columns:1fr 78px 96px auto;gap:10px;align-items:center;
  padding:8px 12px;border:1px solid rgba(90,150,180,.16);border-radius:4px;background:rgba(16,28,36,.55)}
#settings .prow .nm{font-size:12px;color:#bcd8e6}
#settings .prow .nudge{display:flex;gap:4px}
#settings .prow .nudge button,#settings .prow .mini{background:rgba(20,34,44,.9);
  border:1px solid rgba(90,150,180,.3);color:#9dc0d0;border-radius:3px;cursor:pointer;font-size:11px}
#settings .prow .nudge button{width:22px;height:22px;padding:0}
#settings .prow .nudge button:hover,#settings .prow .mini:hover{border-color:rgba(120,210,255,.7);color:#eaf9ff}
#settings .prow .mini{padding:4px 8px}
#settings .prow label{display:flex;align-items:center;gap:6px;font-size:11px;color:#8fb6c8;cursor:pointer}
#settings .acts{display:flex;gap:10px;margin-top:4px}
#settings .acts button{padding:9px 18px;border-radius:3px;font-size:12px;letter-spacing:.1em;cursor:pointer;
  background:rgba(30,60,76,.9);border:1px solid rgba(90,150,180,.4);color:#cfeaf7}
#settings .acts button:hover{border-color:rgba(120,210,255,.75);color:#fff}
#settings .acts button.danger{border-color:rgba(200,90,70,.5);color:#ffb59f}
`;

const PANEL_NAMES = {
  index: '设施索引', info: '建筑信息 / 生产', map: '基地平面小地图',
  res: '资源面板', stats: '统计数据', controls: '底部控制条',
  audio: '音频面板（已并入设置）'
};

export function createSettings({ audio, applyQuality, saveSys, onExit }){
  const prefs = loadPrefs();
  prefs.quality = prefs.quality || localStorage.getItem('dsh-quality') || 'high';
  prefs.panel = prefs.panel || {};

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'settings';
  root.innerHTML = `
    <div class="box">
      <header>
        <h2>设 置</h2>
        <div class="tabs">
          <button data-tab="audio">音频</button>
          <button data-tab="video">画面</button>
          <button data-tab="panel">面板</button>
          <button data-tab="save">存档</button>
        </div>
        <button class="close" title="关闭（ESC）">×</button>
      </header>
      <div class="body">
        <section class="sec" data-sec="audio">
          <div class="row"><span class="k">主音量</span>
            <input type="range" min="0" max="100" value="82" data-vol="master"><span class="v">82%</span></div>
          <div class="row"><span class="k">音乐</span>
            <input type="range" min="0" max="100" value="52" data-vol="music"><span class="v">52%</span></div>
          <div class="row"><span class="k">音效</span>
            <input type="range" min="0" max="100" value="90" data-vol="sfx"><span class="v">90%</span></div>
          <div class="hint">音量即时生效；全部静音可把主音量拖到 0。</div>
        </section>

        <section class="sec" data-sec="video">
          <div class="row"><span class="k">画质</span>
            <div class="seg">
              <button data-q="low">低</button>
              <button data-q="mid">中</button>
              <button data-q="high">高</button>
            </div><span class="v" data-qname>高</span></div>
          <div class="hint">低：关阴影、关泛光、像素比 1.0；中：阴影 1024、关泛光；高：阴影 1536、泛光、最高 1.4 倍渲染。</div>
          <div class="row"><span class="k">动态分辨率</span>
            <div class="seg"><button data-dyn="1">开</button><button data-dyn="0">关</button></div>
            <span class="v" data-dynname>开</span></div>
          <div class="hint">开：帧率不足时自动降采样；关：固定按画质档的像素比渲染。</div>
        </section>

        <section class="sec" data-sec="panel">
          <div class="hint">显示开关控制面板是否出现在画面上；方向键微调 1 像素，Shift+方向键 10 像素；「归位」恢复该面板默认位置。</div>
          <div class="plist" data-plist></div>
          <div class="acts"><button data-act="all-show">全部显示</button><button data-act="all-reset">全部归位</button></div>
        </section>

        <section class="sec" data-sec="save">
          <div class="hint">存档保存在本机浏览器里，点「保存基地」或自由模式「返回主界面」时写入，刷新后自动读取。「新档」会清空存档并重新载入初始基地（只保留开局大和、8 名哨兵和 3 名 SCV）。</div>
          <div class="acts">
            <button data-act="save">保存基地</button>
            <button data-act="load">读取存档</button>
            <button data-act="newgame">新档</button>
            <button data-act="clear" class="danger">清除存档</button>
          </div>
          <div class="hint" style="margin-top:14px">返回主界面：自由模式会先保存当前基地；战役关卡会二次确认，未完成关卡的进度不会保留，已通关进度不受影响。</div>
          <div class="acts">
            <button data-act="exit" class="danger">返回主界面</button>
          </div>
        </section>
      </div>
    </div>`;
  document.body.appendChild(root);

  const body = root.querySelector('.body');
  const tabs = Array.from(root.querySelectorAll('.tabs button'));

  function showTab(name){
    tabs.forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    root.querySelectorAll('.sec').forEach(s => s.classList.toggle('on', s.dataset.sec === name));
    prefs.tab = name; savePrefs(prefs);
  }
  tabs.forEach(b => b.addEventListener('click', () => { showTab(b.dataset.tab); audio.click && audio.click(); }));

  /* ---------------- 音频 ---------------- */
  root.querySelectorAll('input[data-vol]').forEach(inp => {
    const kind = inp.dataset.vol;
    const label = inp.parentElement.querySelector('.v');
    const v0 = prefs.vol && prefs.vol[kind] != null ? prefs.vol[kind] : Number(inp.value);
    inp.value = v0; label.textContent = v0 + '%';
    inp.addEventListener('input', () => {
      const v = Number(inp.value);
      label.textContent = v + '%';
      prefs.vol = prefs.vol || {}; prefs.vol[kind] = v; savePrefs(prefs);
      if (!audio) return;
      if (kind === 'master'){ if (audio.setMuted) audio.setMuted(v === 0); if (audio._master) audio._master.gain.setTargetAtTime(v / 100 * 0.82, audio.ctx.currentTime, 0.08); }
      if (kind === 'music' && audio.setMusicVolume) audio.setMusicVolume(v / 100);
      if (kind === 'sfx' && audio.setSfxVolume) audio.setSfxVolume(v / 100);
    });
  });

  /* ---------------- 画面 ---------------- */
  const qName = { low: '低', mid: '中', high: '高' };
  function paintQuality(q){
    root.querySelectorAll('[data-q]').forEach(b => b.classList.toggle('on', b.dataset.q === q));
    const el = root.querySelector('[data-qname]'); if (el) el.textContent = qName[q] || q;
  }
  root.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
    const q = b.dataset.q;
    prefs.quality = q; savePrefs(prefs); paintQuality(q);
    if (applyQuality) applyQuality(q);
  }));
  paintQuality(prefs.quality);
  if (prefs.quality && prefs.quality !== (localStorage.getItem('dsh-quality') || 'high') && applyQuality){
    applyQuality(prefs.quality);
  }

  const dynOn = prefs.dyn !== false;
  function paintDyn(){
    root.querySelectorAll('[data-dyn]').forEach(b => b.classList.toggle('on', (b.dataset.dyn === '1') === dynOn));
    const el = root.querySelector('[data-dynname]'); if (el) el.textContent = dynOn ? '开' : '关';
  }
  root.querySelectorAll('[data-dyn]').forEach(b => b.addEventListener('click', () => {
    prefs.dyn = b.dataset.dyn === '1'; savePrefs(prefs);
    window.__NO_AUTOSCALE__ = !prefs.dyn;
    paintDyn();
  }));
  paintDyn();
  window.__NO_AUTOSCALE__ = !dynOn;

  /* ---------------- 面板 ---------------- */
  const listEl = root.querySelector('[data-plist]');
  function panelNodes(){
    return Array.from(document.querySelectorAll('.panel, #map, #audio, #stats, #index, #info, #controls, #res'))
      .filter(el => el && el.id && el.id !== 'settings');
  }
  function ensure(id){
    prefs.panel[id] = prefs.panel[id] || {};
    return prefs.panel[id];
  }
  function paintPanels(){
    listEl.innerHTML = '';
    panelNodes().forEach(el => {
      const st = ensure(el.id);
      const row = document.createElement('div');
      row.className = 'prow';
      row.innerHTML = `
        <span class="nm">${PANEL_NAMES[el.id] || el.id}</span>
        <label><input type="checkbox" ${el.style.display === 'none' ? '' : 'checked'}> 显示</label>
        <div class="seg">
          <button class="mini" data-size="0.86">小</button>
          <button class="mini" data-size="1">中</button>
          <button class="mini" data-size="1.18">大</button>
        </div>
        <div class="nudge">
          <button data-dx="-1">←</button><button data-dx="1">→</button>
          <button data-dy="-1">↑</button><button data-dy="1">↓</button>
          <button class="mini" data-reset="1">归位</button>
        </div>`;
      row.querySelector('input').addEventListener('change', ev => {
        el.style.display = ev.target.checked ? '' : 'none';
        st.hidden = !ev.target.checked; savePrefs(prefs);
      });
      row.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => {
        const s = Number(b.dataset.size);
        el.style.transform = s === 1 ? '' : `scale(${s})`;
        el.style.transformOrigin = 'top left';
        st.scale = s; savePrefs(prefs);
      }));
      row.querySelectorAll('[data-dx],[data-dy]').forEach(b => b.addEventListener('click', () => {
        const r = el.getBoundingClientRect();
        const dx = Number(b.dataset.dx || 0) * (b.shiftKey ? 10 : 1);
        const dy = Number(b.dataset.dy || 0) * (b.shiftKey ? 10 : 1);
        el.style.position = 'fixed';
        el.style.left = (r.left + dx) + 'px';
        el.style.top = (r.top + dy) + 'px';
        el.style.right = 'auto'; el.style.bottom = 'auto';
        st.x = r.left + dx; st.y = r.top + dy; savePrefs(prefs);
      }));
      row.querySelector('[data-reset]').addEventListener('click', () => {
        el.style.left = ''; el.style.top = ''; el.style.right = ''; el.style.bottom = '';
        el.style.transform = '';
        delete st.x; delete st.y; delete st.scale; savePrefs(prefs);
      });
      listEl.appendChild(row);
    });
  }
  root.querySelector('[data-act="all-show"]').addEventListener('click', () => {
    panelNodes().forEach(el => { el.style.display = ''; ensure(el.id).hidden = false; });
    savePrefs(prefs); paintPanels();
  });
  root.querySelector('[data-act="all-reset"]').addEventListener('click', () => {
    panelNodes().forEach(el => {
      el.style.left = ''; el.style.top = ''; el.style.right = ''; el.style.bottom = '';
      el.style.transform = '';
      delete ensure(el.id).x; delete ensure(el.id).y; delete ensure(el.id).scale;
    });
    savePrefs(prefs); paintPanels();
  });

  /* ---------------- 存档 ---------------- */
  root.querySelector('[data-act="save"]').addEventListener('click', () => { if (saveSys) saveSys.save(); toast('已保存基地'); });
  root.querySelector('[data-act="load"]').addEventListener('click', () => { if (saveSys) saveSys.restore(); toast('已读取存档'); });
  root.querySelector('[data-act="newgame"]').addEventListener('click', () => {
    if (!window.confirm('开始新档？当前进度（含所有飞机和地面部队）会清空，只保留开局的大和、8 名哨兵和 3 名 SCV。')) return;
    if (window.__NEW_GAME__) window.__NEW_GAME__();
    else { if (saveSys) saveSys.clear(); location.reload(); }
  });
  root.querySelector('[data-act="clear"]').addEventListener('click', () => { if (saveSys) saveSys.clear(); toast('存档已清除'); });
  root.querySelector('[data-act="exit"]').addEventListener('click', () => {
    if (onExit) onExit();
    else location.href = location.pathname;
  });

  function toast(msg){
    const el = document.getElementById('toast');
    if (!el){ return; }
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('on'), 1800);
  }

  /* ---------------- 开关 ---------------- */
  let open = false;
  function show(tab){
    open = true;
    root.classList.add('open');
    document.body.classList.add('settings-open');
    window.__PAUSED__ = true;
    paintPanels();
    showTab(tab || prefs.tab || 'audio');
  }
  function hide(){
    open = false;
    root.classList.remove('open');
    document.body.classList.remove('settings-open');
    window.__PAUSED__ = false;
  }
  function toggle(){ open ? hide() : show(); }

  root.querySelector('.close').addEventListener('click', hide);
  root.addEventListener('pointerdown', ev => { if (ev.target === root) hide(); });

  /* 应用上次保存的面板状态 */
  panelNodes().forEach(el => {
    const st = prefs.panel[el.id];
    if (!st) return;
    if (st.hidden) el.style.display = 'none';
    if (st.scale && st.scale !== 1){ el.style.transform = `scale(${st.scale})`; el.style.transformOrigin = 'top left'; }
    if (st.x != null && st.y != null){
      el.style.position = 'fixed'; el.style.left = st.x + 'px'; el.style.top = st.y + 'px';
      el.style.right = 'auto'; el.style.bottom = 'auto';
    }
  });

  return { show, hide, toggle, isOpen: () => open, openTab: showTab };
}
