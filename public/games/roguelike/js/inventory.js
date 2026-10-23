/* ==========================================================================
   inventory.js — 背包UI交互逻辑
   ========================================================================== */
(function() {
  'use strict';

  let selectedIndex = null;

  /**
   * 更新背包UI
   */
  function updateInventoryUI() {
    const grid = document.getElementById('inventory-items');
    const empty = document.getElementById('inventory-empty');
    const detail = document.getElementById('inventory-detail');

    if (!window.__game || !window.__game.raw) {
      return;
    }

    const items = window.__game.raw.player.items;

    // 清空网格
    grid.innerHTML = '';

    // 空背包
    if (items.length === 0) {
      empty.style.display = 'flex';
      grid.style.display = 'none';
      detail.classList.add('hidden');
      selectedIndex = null;
      return;
    }

    empty.style.display = 'none';
    grid.style.display = 'grid';

    // 渲染物品
    items.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'inventory-item';
      if (selectedIndex === i) {
        card.classList.add('selected');
      }

      // 绘制图标
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.translate(64, 64);
      ctx.scale(2, 2);
      item.icon(ctx);
      ctx.restore();

      card.appendChild(canvas);

      // 使用createElement而不是innerHTML +=避免破坏canvas
      const nameDiv = document.createElement('div');
      nameDiv.className = 'inventory-item-name';
      nameDiv.textContent = item.name;
      card.appendChild(nameDiv);

      card.addEventListener('click', () => selectItem(i));
      grid.appendChild(card);
    });

    // 重新选中之前选中的物品
    if (selectedIndex !== null && selectedIndex < items.length) {
      showItemDetail(selectedIndex);
    } else {
      detail.classList.add('hidden');
      selectedIndex = null;
    }
  }

  /**
   * 选中物品
   * @param {number} index - 物品索引
   */
  function selectItem(index) {
    if (!window.__game || !window.__game.raw) {
      return;
    }
    const detail = document.getElementById('inventory-detail');
    const items = window.__game.raw.player.items;

    if (selectedIndex === index) {
      // 再次点击同一个物品，准备丢弃
      showDropConfirm(index);
    } else {
      selectedIndex = index;
      updateInventoryUI();
    }
  }

  /**
   * 显示物品详情
   * @param {number} index - 物品索引
   */
  function showItemDetail(index) {
    if (!window.__game || !window.__game.raw) {
      return;
    }
    const detail = document.getElementById('inventory-detail');
    const item = window.__game.raw.player.items[index];

    if (!item) {
      return;
    }

    document.getElementById('detail-desc').textContent = item.desc;

    detail.classList.remove('hidden');

    // 绑定丢弃按钮
    document.getElementById('btn-drop').onclick = () => showDropConfirm(index);
  }

  /**
   * 显示丢弃确认对话框
   * @param {number} index - 物品索引
   */
  function showDropConfirm(index) {
    if (!window.__game || !window.__game.raw) {
      return;
    }
    const item = window.__game.raw.player.items[index];
    if (!item) {
      return;
    }

    document.getElementById('confirm-text').textContent = `确定要丢弃【${item.name}】吗？`;
    document.getElementById('confirm-dialog').classList.remove('hidden');

    document.getElementById('btn-confirm-drop').onclick = () => confirmDrop(index);
    document.getElementById('btn-cancel-drop').onclick = () => {
      document.getElementById('confirm-dialog').classList.add('hidden');
    };

    // 点击背景关闭弹窗
    document.getElementById('confirm-dialog').onclick = (e) => {
      if (e.target.id === 'confirm-dialog') {
        document.getElementById('confirm-dialog').classList.add('hidden');
      }
    };
  }

  /**
   * 确认丢弃物品
   * @param {number} index - 物品索引
   */
  function confirmDrop(index) {
    if (!window.__game || !window.__game.raw) {
      return;
    }
    window.__game.raw.player.removeItem(index, window.__game.raw);
    selectedIndex = null;
    updateInventoryUI();
    document.getElementById('inventory-detail').classList.add('hidden');
    document.getElementById('confirm-dialog').classList.add('hidden');
  }

  // 导出给全局
  window.updateInventoryUI = updateInventoryUI;
})();