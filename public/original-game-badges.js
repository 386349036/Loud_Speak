(() => {
  const ids = ['tank', 'runner', 'airwar', 'sky', 'veggie-adventure', 'breakout'];
  for (const id of ids) {
    const entry = document.getElementById(`open-${id}`);
    if (!entry || entry.querySelector('.game-author-badge')) continue;
    entry.dataset.author = 'dongshoudaren';
    const badge = document.createElement('img');
    badge.className = 'game-author-badge';
    badge.src = '/assets/authors/dongshoudaren.png';
    badge.alt = '作者：冻手打人';
    badge.width = badge.height = 22;
    entry.append(badge);
    entry.title += ' · 作者：冻手打人';
    entry.setAttribute('aria-label', `${entry.getAttribute('aria-label') || entry.title}（作者：冻手打人）`);
  }
})();
