/* ==========================================================================
   bestiary.js — 怪物图鉴系统
   ========================================================================== */
'use strict';

(function () {
  // 怪物数据（从 ENEMY_DEFS 提取）
  const BEAST_DATA = {
    // ===== 普通敌人 =====
    gaper: {
      id: 'gaper',
      name: 'Gaper',
      nameZh: '哭脸怪',
      type: 'normal',
      desc: '无休止的追击者。一旦发现玩家就会永久加速，持续追击直到死亡。',
      behavior: '直线追踪，接触伤害。进入视野后会"觉醒"并永久加速35%。',
      danger: 2,
      floors: 'Basement（第1层）、Cellar（第2层）、Caves（第3层）',
      hp: 7,
      damage: 2,
      speed: 68,
      speedAwake: 92,  // 68 * 1.35
      flying: false,
      tips: '保持移动，不要让它们包围你。可以用障碍物阻挡。',
    },

    pooter: {
      id: 'pooter',
      name: 'Pooter',
      nameZh: '飞蝇',
      type: 'normal',
      desc: '悬停在中距离的飞行敌人，会向玩家发射瞄准弹。',
      behavior: '保持165-260像素距离，横向游走，定期发射单发瞄准弹。',
      danger: 2,
      floors: 'Basement（第1层）、Cellar（第2层）、Caves（第3层）',
      hp: 6,
      damage: 1,
      speed: 55,
      flying: true,
      tips: '可以飞越障碍物。注意躲避其瞄准弹，移动射击即可。',
    },

    horf: {
      id: 'horf',
      name: 'Horf',
      nameZh: '吐口怪',
      type: 'normal',
      desc: '固定位置的炮台型敌人，向玩家发射三连扇形弹幕。',
      behavior: '完全固定（仅被击退推动），距离460内会蓄力发射扇形弹幕。',
      danger: 3,
      floors: 'Basement（第1层）、Cellar（第2层）、Caves（第3层）、Catacombs（第4层）',
      hp: 10,
      damage: 1,
      speed: 0,
      flying: false,
      tips: '优先击杀。站在弹幕间隙或从侧面攻击。被击退后需要时间归位。',
    },

    attackFly: {
      id: 'fly',
      name: 'Attack Fly',
      nameZh: '苍蝇',
      type: 'normal',
      desc: '高速不规则突进的小型飞行敌人，撞墙反弹。',
      behavior: '高速漂移，撞墙反弹，纯接触伤害威胁。',
      danger: 3,
      floors: '从Basement（第1层）开始普遍出现',
      hp: 5,
      damage: 1,
      speed: 120,
      flying: true,
      tips: '难以预测轨迹。保持移动或用穿透道具一次性清理。',
    },

    clotty: {
      id: 'clotty',
      name: 'Clotty',
      nameZh: '血块',
      type: 'normal',
      desc: '缓慢跳跃逼近的敌人，会向四个方向同时发射弹幕。',
      behavior: '跳跃式接近，定期发射四向十字齐射。',
      danger: 3,
      floors: 'Caves（第3层）、Catacombs（第4层）、Depths（第5层）',
      hp: 12,
      damage: 2,
      speed: 44,
      flying: false,
      tips: '站在弹幕间隙（斜向位置）攻击。跳跃后有短暂停顿。',
    },

    boomFly: {
      id: 'boomfly',
      name: 'Boom Fly',
      nameZh: '爆炸蝇',
      type: 'normal',
      desc: '漂移的飞行敌人，死亡时会爆炸并发射环形弹幕。',
      behavior: '匀速直线漂移，撞墙反弹。死亡时触发爆炸：环形弹幕+范围伤害。',
      danger: 4,
      floors: '从Caves（第3层）开始出现',
      hp: 8,
      damage: 1,
      speed: 90,
      flying: true,
      tips: '不要靠近击杀！远距离消灭或引诱它撞击其他敌人。',
    },

    hopper: {
      id: 'hopper',
      name: 'Hopper',
      nameZh: '跳虫',
      type: 'normal',
      desc: '蓄力大跳的敌人，滞空时无法被击中位移。',
      behavior: '蓄力后朝玩家位置大跳，滞空期间无敌，落地产生冲击波。',
      danger: 3,
      floors: 'Catacombs（第4层）、Depths（第5层）、Necropolis（第6层）',
      hp: 9,
      damage: 2,
      speed: 0,
      flying: false,
      tips: '滞空时无法击退，等落地后再攻击。跳跃落点可预测。',
    },

    maw: {
      id: 'maw',
      name: 'Maw',
      nameZh: '血口',
      type: 'normal',
      desc: '悬停保持远距的飞行敌人，发射两倍伤害的巨型血球。',
      behavior: '保持200-300像素距离，蓄力后吐出大型血球（伤害x2）。',
      danger: 4,
      floors: 'Depths（第5层）、Necropolis（第6层）、Womb（第7层）',
      hp: 11,
      damage: 2,
      speed: 62,
      flying: true,
      tips: '血球较大但速度慢，侧步躲避。优先击杀高伤害威胁。',
    },

    globin: {
      id: 'globin',
      name: 'Globin',
      nameZh: '泥人',
      type: 'normal',
      desc: '直线追击的敌人，首次死亡会重组复活一次。',
      behavior: '直线追击。首次"死亡"后瘫成泥滩，2.4秒后重组恢复60%血量。',
      danger: 3,
      floors: 'Necropolis（第6层）、Womb（第7层）、Utero（第8层）',
      hp: 12,
      damage: 2,
      speed: 78,
      flying: false,
      tips: '必须打两次！泥滩状态时持续攻击可阻止复活。',
    },

    knight: {
      id: 'knight',
      name: 'Knight',
      nameZh: '骑士',
      type: 'normal',
      desc: '带面甲的装甲敌人，正面92%免伤，必须从背后攻击。',
      behavior: '缓慢推进，面甲转向有延迟（每秒2弧度），仅背部可伤。',
      danger: 4,
      floors: 'Womb（第7层）、Utero（第8层）、Sheol（第10层）',
      hp: 16,
      damage: 2,
      speed: 62,
      flying: false,
      tips: '绕背攻击！利用转向延迟，围绕它转圈射击。',
    },

    vis: {
      id: 'vis',
      name: 'Vis',
      nameZh: '血肠',
      type: 'normal',
      desc: '缓慢逼近的敌人，蓄力后发射贯穿全场的血腥激光。',
      behavior: '缓慢接近，蓄力0.85秒后发射横扫激光（可侧步躲避）。',
      danger: 5,
      floors: '从Utero（第8层）开始出现',
      hp: 22,
      damage: 2,
      speed: 34,
      flying: false,
      tips: '激光预警明显，横向移动躲避。远距离即可安全击杀。',
    },

    // ===== Boss =====
    monstro: {
      id: 'monstro',
      name: 'Monstro',
      nameZh: '蒙斯特罗',
      type: 'boss',
      desc: '第1-2层Boss。多阶段跳跃攻击和呕吐弹幕的巨型怪物。',
      behavior: '跳跃冲撞 → 呕吐散射 → 高跳砸击（红圈预警）+ 环形弹幕。血量<50%进入狂暴。',
      danger: 6,
      floors: 'Basement（第1层）、Cellar（第2层）',
      hp: 160,
      damage: 2,
      speed: 0,
      flying: false,
      tips: '观察红圈预警躲避砸击。呕吐时保持移动，弹幕间隙大。',
    },

    duke: {
      id: 'duke',
      name: 'Duke of Flies',
      nameZh: '苍蝇公爵',
      type: 'boss',
      desc: '第1、3层Boss。召唤苍蝇群、环形吐弹、直线冲刺的肿胀苍蝇囊。',
      behavior: '悬空漂移，召唤苍蝇群、环形弹幕、直线冲刺攻击。',
      danger: 5,
      floors: 'Basement（第1层）、Caves（第3层）',
      hp: 140,
      damage: 2,
      speed: 0,
      flying: true,
      tips: '优先清理召唤的小苍蝇。冲刺前有明显蓄力，横向躲避。',
    },

    larry: {
      id: 'larry',
      name: 'Larry Jr.',
      nameZh: '拉里二世',
      type: 'boss',
      desc: '第2、4层Boss。5节身体的蠕虫，只走四方向，撞墙转向并喷弹。',
      behavior: '5节身体链，四向移动，撞墙时朝玩家转向并从尾节喷环形弹幕。',
      danger: 6,
      floors: 'Cellar（第2层）、Catacombs（第4层）',
      hp: 243,
      damage: 2,
      speed: 0,
      flying: false,
      tips: '攻击任何一节都有效。预测撞墙时机躲避弹幕。',
    },

    chub: {
      id: 'chub',
      name: 'Chub',
      nameZh: '胖虫',
      type: 'boss',
      desc: '第3、5层Boss。三节肥虫，张嘴蓄力后高速冲撞，撞墙炸弹。',
      behavior: '与玩家轴对齐时张嘴蓄力 → 高速冲撞 → 撞墙炸弹幕+吐苍蝇。',
      danger: 6,
      floors: 'Caves（第3层）、Depths（第5层）',
      hp: 393,
      damage: 2,
      speed: 0,
      flying: false,
      tips: '蓄力时远离墙壁！冲撞后硬直较大，趁机输出。',
    },

    gurdy: {
      id: 'gurdy',
      name: 'Gurdy',
      nameZh: '格迪',
      type: 'boss',
      desc: '第4、6层Boss。钉死在房间顶部的肉瘤墙，弹幕多样。',
      behavior: '5连扇形弹 / 10-12发环形弹 / 召唤飞行小怪。',
      danger: 7,
      floors: 'Catacombs（第4层）、Necropolis（第6层）',
      hp: 545,
      damage: 2,
      speed: 0,
      flying: false,
      tips: '纯弹幕Boss，保持中距离移动射击。优先清理召唤物。',
    },

    monstroII: {
      id: 'monstroII',
      name: 'Monstro II',
      nameZh: '蒙斯特罗二世',
      type: 'boss',
      desc: '第5、7层Boss。两连跳砸、扫射血腥激光、召唤小怪的增强版。',
      behavior: '两连跳（首跳8向弹幕）→ 扫射激光 → 召唤Maw/Boom Fly。',
      danger: 8,
      floors: 'Depths（第5层）、Womb（第7层）',
      hp: 805,
      damage: 2,
      speed: 0,
      flying: false,
      tips: '激光锁定角度后扫射，垂直躲避。跳砸预警明显。',
    },

    mom: {
      id: 'mom',
      name: 'Mom',
      nameZh: '妈妈',
      type: 'boss',
      desc: '第6层Boss。天花板伸下的巨腿，踩击+眼睛点射+召唤小怪。',
      behavior: '影子锁定后踩击（可踩碎石头）→ 门缝伸眼点射 → 召唤Globin/Hopper。',
      danger: 8,
      floors: 'Necropolis（第6层）',
      hp: 1031,
      damage: 2,
      speed: 0,
      flying: false,
      tips: '踩击落地时才可伤。躲在石头后但注意会被踩碎。',
    },

    scolex: {
      id: 'scolex',
      name: 'Scolex',
      nameZh: '史克莱克斯',
      type: 'boss',
      desc: '第7、8层Boss。钢甲蠕虫，仅尾部可伤，钻地无敌+滑行喷弹。',
      behavior: '大部分时间钻地无敌，破土后高速滑行，尾部反向喷弹幕。',
      danger: 8,
      floors: 'Womb（第7层）、Utero（第8层）',
      hp: 1319,
      damage: 2,
      speed: 0,
      flying: false,
      tips: '观察尾部闪光！破土时围绕其旋转，等待尾部暴露。',
    },

    momsHeart: {
      id: 'momsHeart',
      name: "Mom's Heart",
      nameZh: '妈妈的心脏',
      type: 'boss',
      desc: '第8层Boss。顶部悬吊心脏，四套弹幕交替+召唤小怪波次。',
      behavior: '脉冲环 / 双螺旋 / 瞄准帘幕 / 追踪直线，间隙召唤小怪。血量<60%进入二阶段。',
      danger: 9,
      floors: 'Utero（第8层）',
      hp: 1801,
      damage: 2,
      speed: 0,
      flying: true,
      tips: '弹幕密集，保持中远距离。优先清理召唤物避免被包围。',
    },

    hush: {
      id: 'hush',
      name: 'Hush',
      nameZh: '赫什',
      type: 'boss',
      desc: '第9层Boss。每损失20%血量清屏瞬移，弹幕多样+四向激光。',
      behavior: '血量每降20%触发沉底瞬移。带缺口密集弹环、旋转齐射、U形扇形、四向激光十字。',
      danger: 10,
      floors: 'Blue Womb（第9层）',
      hp: 2450,
      damage: 2,
      speed: 0,
      flying: false,
      tips: '沉底时无敌，观察弹幕缺口躲避。激光十字需走位预判。',
    },

    satan: {
      id: 'satan',
      name: 'Satan',
      nameZh: '撒旦',
      type: 'boss',
      desc: '第10层Boss。三阶段：扇形连射 → 双手弹幕+横扫激光 → 离地踩击+召唤。',
      behavior: '三阶段递进：扇形连射 → 双手半环弹+横扫激光 → 影子预警踩击+召唤Boom Fly。',
      danger: 10,
      floors: 'Sheol（第10层）',
      hp: 3320,
      damage: 2,
      speed: 0,
      flying: false,
      tips: '每阶段独立血条。激光横扫时垂直躲避。影子出现立即离开。',
    },

    isaacBoss: {
      id: 'isaacBoss',
      name: 'Isaac',
      nameZh: '以撒',
      type: 'boss',
      desc: '第11层Boss。三阶段：辐射弹+回旋弹 → 激光十字 → 长翅膀冲刺。',
      behavior: '10向辐射弹 / 弧线回旋弹 → 激光十字 → 长翅膀预判冲刺。全程有点射。',
      danger: 10,
      floors: 'Cathedral（第11层）',
      hp: 4486,
      damage: 2,
      speed: 0,
      flying: false,
      tips: '回旋弹会飞回，注意轨迹。冲刺阶段预判走位。',
    },

    blueBaby: {
      id: 'blueBaby',
      name: 'BlueBaby',
      nameZh: '蓝宝',
      type: 'boss',
      desc: '第12层最终Boss。与Isaac同形但更快，追踪弹+环绕苍蝇+六向激光。',
      behavior: '所有子弹带追踪，持续召唤环绕苍蝇，六向激光+高速冲刺。',
      danger: 10,
      floors: 'The Chest（第12层）',
      hp: 6347,
      damage: 2,
      speed: 0,
      flying: false,
      tips: '追踪弹威胁极大，保持高速移动。优先清理苍蝇。',
    },
  };

  // 图鉴状态
  let isOpen = false;
  let activeTab = 'normal';  // 'normal' | 'boss'
  let selectedBeast = null;

  // 创建图鉴DOM
  function createBestiaryUI() {
    const container = document.createElement('div');
    container.id = 'bestiary';
    container.innerHTML = `
      <div class="beast-list">
        <div class="beast-header">
          <h2>📖 怪物图鉴</h2>
          <div class="beast-tabs">
            <button class="beast-tab active" data-tab="normal">普通敌人</button>
            <button class="beast-tab" data-tab="boss">Boss</button>
          </div>
        </div>
        <div class="beast-search">
          <input type="text" placeholder="搜索怪物名称..." id="beast-search-input">
        </div>
        <div class="beast-scroll" id="beast-list-items"></div>
      </div>

      <div class="beast-detail">
        <div class="beast-detail-header">
          <h2 class="beast-detail-title">选择一个怪物查看详情</h2>
          <button class="beast-close" id="beast-close">✕</button>
        </div>
        <div class="beast-detail-content" id="beast-detail-content">
          <div class="beast-empty">
            <div class="beast-empty-icon">👹</div>
            <div class="beast-empty-text">点击左侧列表查看怪物详情</div>
          </div>
        </div>
      </div>

      <div class="beast-keybind">
        按 <kbd>B</kbd> 打开/关闭图鉴
      </div>
    `;

    document.body.appendChild(container);

    // 绑定事件
    document.getElementById('beast-close').addEventListener('click', toggleBestiary);
    document.querySelectorAll('.beast-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    document.getElementById('beast-search-input').addEventListener('input', handleSearch);
  }

  // 渲染列表
  function renderList(filter = '') {
    const listEl = document.getElementById('beast-list-items');
    listEl.innerHTML = '';

    const beasts = Object.values(BEAST_DATA)
      .filter(b => b.type === activeTab)
      .filter(b => !filter ||
        b.nameZh.includes(filter) ||
        b.name.toLowerCase().includes(filter.toLowerCase()) ||
        b.desc.includes(filter)
      );

    beasts.forEach(beast => {
      const item = document.createElement('div');
      item.className = `beast-item ${beast.type === 'boss' ? 'boss' : ''} ${selectedBeast?.id === beast.id ? 'active' : ''}`;

      // 小图标容器
      const iconSmall = document.createElement('div');
      iconSmall.className = 'beast-icon-small';
      if (ENEMY_DEFS[beast.id] && ENEMY_DEFS[beast.id].draw) {
        const canvas = document.createElement('canvas');
        canvas.width = 88;
        canvas.height = 88;
        const ctx = canvas.getContext('2d');
        ctx.translate(44, 44);
        ENEMY_DEFS[beast.id].draw(ctx, {
          x: 0, y: 0, r: 20, animT: 0, hitFlash: 0, invuln: 0,
          state: 'idle', st: 0, faceX: 0, faceY: 1
        });
        iconSmall.appendChild(canvas);
      }

      item.innerHTML = `
        <div class="beast-item-info">
          <div class="beast-item-name">${beast.nameZh}</div>
          <div class="beast-item-type">${beast.name}</div>
        </div>
      `;
      item.insertBefore(iconSmall, item.firstChild);

      item.addEventListener('click', () => selectBeast(beast));
      listEl.appendChild(item);
    });
  }

  // 选择怪物
  function selectBeast(beast) {
    selectedBeast = beast;
    renderList(document.getElementById('beast-search-input').value);
    renderDetail(beast);
  }

  // 渲染详情
  function renderDetail(beast) {
    const content = document.getElementById('beast-detail-content');
    const isBoss = beast.type === 'boss';

    // 计算属性百分比（用于进度条）
    const maxHp = isBoss ? 6347 : 22;
    const maxDmg = isBoss ? 2 : 2;
    const maxSpeed = isBoss ? 120 : 120;

    content.innerHTML = `
      <div class="beast-preview">
        <div class="beast-icon-large ${isBoss ? 'boss' : ''}" id="beast-icon-large"></div>

        <div class="beast-stats">
          <div class="beast-stat">
            <div class="beast-stat-label">生命值</div>
            <div class="beast-stat-bar">
              <div class="beast-stat-fill hp" style="width: ${(beast.hp / maxHp) * 100}%"></div>
            </div>
            <div class="beast-stat-value">${beast.hp}</div>
          </div>
          <div class="beast-stat">
            <div class="beast-stat-label">伤害</div>
            <div class="beast-stat-bar">
              <div class="beast-stat-fill dmg" style="width: ${(beast.damage / maxDmg) * 100}%"></div>
            </div>
            <div class="beast-stat-value">${beast.damage}</div>
          </div>
          <div class="beast-stat">
            <div class="beast-stat-label">速度</div>
            <div class="beast-stat-bar">
              <div class="beast-stat-fill speed" style="width: ${(beast.speed / maxSpeed) * 100}%"></div>
            </div>
            <div class="beast-stat-value">${beast.speed}</div>
          </div>
        </div>
      </div>

      <div class="beast-info">
        <div class="beast-section">
          <h3>📋 简介</h3>
          <p>${beast.desc}</p>
        </div>

        <div class="beast-section">
          <h3>⚔️ 行为模式</h3>
          <p>${beast.behavior}</p>
        </div>

        <div class="beast-section">
          <h3>💡 应对策略</h3>
          <p>${beast.tips}</p>
        </div>

        <div class="beast-section">
          <h3>📍 出现楼层</h3>
          <p>${beast.floors}</p>
          <div class="beast-tags">
            ${beast.flying ? '<span class="beast-tag flying">飞行</span>' : ''}
            ${beast.danger >= 7 ? '<span class="beast-tag danger">高危</span>' : ''}
            ${isBoss ? '<span class="beast-tag danger">Boss</span>' : ''}
          </div>
        </div>
      </div>
    `;

    // 绘制大图标
    const iconLarge = document.getElementById('beast-icon-large');
    if (ENEMY_DEFS[beast.id] && ENEMY_DEFS[beast.id].draw) {
      const canvas = document.createElement('canvas');
      canvas.width = 180;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      ctx.translate(90, 90);
      ctx.scale(1.8, 1.8);
      ENEMY_DEFS[beast.id].draw(ctx, {
        x: 0, y: 0, r: 20, animT: 0, hitFlash: 0, invuln: 0,
        state: 'idle', st: 0, faceX: 0, faceY: 1
      });
      iconLarge.appendChild(canvas);
    }

    document.querySelector('.beast-detail-title').textContent = `${beast.nameZh} (${beast.name})`;
  }

  // 切换标签
  function switchTab(tab) {
    activeTab = tab;
    selectedBeast = null;
    document.querySelectorAll('.beast-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    renderList(document.getElementById('beast-search-input').value);
    document.getElementById('beast-detail-content').innerHTML = `
      <div class="beast-empty">
        <div class="beast-empty-icon">👹</div>
        <div class="beast-empty-text">点击左侧列表查看怪物详情</div>
      </div>
    `;
    document.querySelector('.beast-detail-title').textContent = '选择一个怪物查看详情';
  }

  // 搜索
  function handleSearch(e) {
    renderList(e.target.value);
  }

  // 打开/关闭图鉴
  function toggleBestiary() {
    isOpen = !isOpen;
    const bestiary = document.getElementById('bestiary');
    if (isOpen) {
      bestiary.classList.add('active');
      renderList();
      // 暂停游戏并关闭其他UI
      if (window.__game && window.__game.raw) {
        window.__game.raw.paused = true;
        window.__game.raw.inventoryOpen = false;
        document.getElementById('screen-inventory').classList.add('hidden');
        document.getElementById('screen-pause').classList.add('hidden');
      }
    } else {
      bestiary.classList.remove('active');
      // 恢复游戏
      if (window.__game && window.__game.raw) {
        window.__game.raw.paused = false;
      }
    }
  }

  // 初始化
  function init() {
    createBestiaryUI();

    // 键盘快捷键
    window.addEventListener('keydown', (e) => {
      // 只在游戏进行时才能打开图鉴
      if (e.code === 'KeyB' && !e.repeat) {
        if (window.__game && window.__game.raw &&
            (window.__game.raw.state === 'playing' || window.__game.raw.state === 'transition')) {
          toggleBestiary();
        }
      }
      if (e.code === 'Escape' && isOpen) {
        toggleBestiary();
      }
    });
  }

  // 等待DOM加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露给全局（用于调试）
  window.toggleBestiary = toggleBestiary;
})();