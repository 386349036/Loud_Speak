(() => {
  const preview = document.createElement('img');
  preview.className = 'author-avatar-preview';
  preview.alt = '';
  preview.hidden = true;
  preview.setAttribute('aria-hidden', 'true');
  document.body.append(preview);
  const hide = () => { preview.hidden = true; };
  for (const avatar of document.querySelectorAll('.community-authors .author-avatar')) {
    avatar.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      const box = avatar.getBoundingClientRect();
      const size = 100, gap = 8;
      preview.src = avatar.currentSrc || avatar.src;
      preview.style.left = `${Math.max(gap, Math.min(innerWidth - size - gap, box.left + box.width / 2 - size / 2))}px`;
      preview.style.top = `${Math.max(gap, Math.min(innerHeight - size - gap, box.bottom - size))}px`;
      preview.hidden = false;
    });
    avatar.addEventListener('pointerleave', hide);
    avatar.addEventListener('pointercancel', hide);
  }
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
  window.addEventListener('blur', hide);
})();
