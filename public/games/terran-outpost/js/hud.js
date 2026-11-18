/* HUD 面板：自由拖拽 + 逐个隐藏，位置写入 localStorage */
const KEY = 'dsh-hud-v1';

function load(){
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
  catch (e){ return {}; }
}

export function initHud(){
  const panels = Array.from(document.querySelectorAll('.panel, #map, #audio, #stats, #index, #info'))
    .filter(el => el && el.id);
  if (!panels.length) return null;

  let state = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e){} };

  const bar = document.getElementById('b-panels');
  const total = panels.length;

  function syncButton(){
    if (!bar) return;
    const hidden = panels.filter(p => state[p.id] && state[p.id].hidden).length;
    bar.classList.toggle('on', hidden > 0);
    bar.textContent = hidden ? `显示面板 (${hidden})` : '面板';
  }

  panels.forEach(el => {
    const st = state[el.id] || (state[el.id] = {});
    el.dataset.hud = '1';

    /* 右上角隐藏按钮 */
    if (!el.querySelector('.hud-x')){
      const x = document.createElement('button');
      x.className = 'hud-x';
      x.type = 'button';
      x.title = '隐藏此面板';
      x.textContent = '×';
      x.addEventListener('click', ev => {
        ev.stopPropagation();
        st.hidden = true; save(); apply(el, st); syncButton();
      });
      el.appendChild(x);
    }

    /* 恢复位置 / 隐藏 */
    apply(el, st);

    /* 拖拽：按住面板任意非控件区域 */
    let drag = null;
    el.addEventListener('pointerdown', ev => {
      if (ev.button !== 0) return;
      if (ev.target.closest('button, input, canvas, a, select')) return;
      const r = el.getBoundingClientRect();
      drag = { dx: ev.clientX - r.left, dy: ev.clientY - r.top, moved: false };
      el.classList.add('dragging');
      el.setPointerCapture && el.setPointerCapture(ev.pointerId);
    });
    el.addEventListener('pointermove', ev => {
      if (!drag) return;
      const x = Math.max(4, Math.min(window.innerWidth - 60, ev.clientX - drag.dx));
      const y = Math.max(4, Math.min(window.innerHeight - 40, ev.clientY - drag.dy));
      st.x = Math.round(x); st.y = Math.round(y);
      drag.moved = true;
      apply(el, st);
    });
    const end = () => {
      if (!drag) return;
      el.classList.remove('dragging');
      if (drag.moved){ st.hidden = false; save(); }
      drag = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    /* 双击标题区归位 */
    el.addEventListener('dblclick', ev => {
      if (ev.target.closest('button, input')) return;
      delete st.x; delete st.y; save(); apply(el, st);
    });
  });

  function apply(el, st){
    if (st.hidden){ el.style.display = 'none'; return; }
    el.style.display = '';
    if (st.x !== undefined && st.y !== undefined){
      el.style.left = st.x + 'px';
      el.style.top = st.y + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      /* 保留设置页设置的缩放（transform-origin 在左上角，与 left/top 不冲突） */
    }
  }

  /* 顶部按钮：一键显示全部被隐藏的面板 */
  function restoreAll(){
    panels.forEach(p => {
      if (!state[p.id]) state[p.id] = {};
      p.hidden = false;
      state[p.id].hidden = false;
      if (p.style.display === 'none'){ p.style.display = ''; }
      apply(p, state[p.id]);
    });
    save(); syncButton();
  }
  /* 兜底：按 H 一定能把面板找回来（即使装着按钮的面板被隐藏） */
  window.addEventListener('keydown', ev => {
    if (ev.key === 'h' || ev.key === 'H'){
      if (ev.target && /input|textarea/i.test(ev.target.tagName)) return;
      restoreAll();
    }
  });
  if (bar){
    const clone = bar.cloneNode(true);
    bar.replaceWith(clone);
    clone.addEventListener('click', () => {
      const hidden = panels.filter(p => state[p.id] && state[p.id].hidden);
      if (!hidden.length){
        panels.forEach(p => { delete state[p.id].x; delete state[p.id].y; state[p.id].hidden = false; apply(p, state[p.id]); });
        save();
      } else {
        restoreAll();
        return;
      }
      syncButton();
    });
  }
  syncButton();

  return {
    panels,
    reset(){
      for (const p of panels){ state[p.id] = {}; apply(p, state[p.id]); }
      save(); syncButton();
    },
    hideAll(){
      panels.forEach(p => { state[p.id].hidden = true; apply(p, state[p.id]); });
      save(); syncButton();
    },
    get state(){ return state; }
  };
}
