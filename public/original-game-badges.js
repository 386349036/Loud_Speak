(() => {
  const ids = ['tank', 'runner', 'airwar', 'sky', 'veggie-adventure', 'breakout'];
  for (const id of ids) {
    const entry = document.getElementById(`open-${id}`);
    if (!entry || entry.querySelector('.game-original-badge')) continue;
    entry.classList.add('original-game');
    const badge = document.createElement('span');
    badge.className = 'game-original-badge';
    badge.textContent = '原创';
    badge.setAttribute('aria-hidden', 'true');
    entry.append(badge);
    entry.title += ' · 原创游戏';
    entry.setAttribute('aria-label', `${entry.getAttribute('aria-label') || entry.title}（原创游戏）`);
  }
})();
