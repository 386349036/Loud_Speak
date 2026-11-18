/* 终局目标：自由模式摧毁虫巢主基地；战役模式由 campaign 调用 win()。 */
const TOTAL_WAVES = 10;

export function createVictory({ enemies, combat, onVictory, onDefeat }){
  let state = 'playing';
  let elapsed = 0;
  let data = null;
  let auto = true;

  function finish(type, extra){
    if (state !== 'playing') return;
    state = type;
    data = {
      type,
      waves: enemies.wave,
      cleared: enemies.clearedWave,
      kills: combat ? combat.kills : 0,
      seconds: elapsed,
      hive: !!enemies.hive,
      ...(extra || {})
    };
    if (type === 'victory') onVictory && onVictory(data);
    else onDefeat && onDefeat(data);
  }

  function update(dt){
    if (state !== 'playing') return;
    elapsed += dt;
    if (!auto) return;
    const hive = enemies.hive;
    if (hive){
      /* 主巢被摧毁即胜利；守家波次只是压力，不再是胜利条件 */
      if (hive.dead) finish('victory');
      return;
    }
    /* 兼容没有主巢的旧局面 */
    if (enemies.clearedWave >= TOTAL_WAVES && enemies.aliveCount() === 0){
      finish('victory');
    }
  }

  function fail(){ finish('defeat'); }
  function win(extra){ finish('victory', extra); }
  function setAuto(v){ auto = !!v; }

  return {
    update, fail, win, setAuto, TOTAL_WAVES,
    get state(){ return state; },
    get data(){ return data; },
    get auto(){ return auto; }
  };
}
