(function () {
  const root = document.documentElement;

  function updateBtn(theme) {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateBtn(theme);
  }

  function crossfadeSwitch(next) {
    root.classList.add('theme-transitioning');
    applyTheme(next);
    setTimeout(function () { root.classList.remove('theme-transitioning'); }, 500);
  }

  // Sync theme when changed in another tab
  window.addEventListener('storage', function (e) {
    if (e.key === 'theme' && e.newValue) {
      root.setAttribute('data-theme', e.newValue);
      updateBtn(e.newValue);
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    // Safety: re-apply saved theme in case inline head script was skipped
    var saved = localStorage.getItem('theme') || 'light';
    root.setAttribute('data-theme', saved);
    updateBtn(saved);

    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    btn.addEventListener('click', function () {
      const current = root.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';

      btn.classList.add('theme-toggle--spinning');
      setTimeout(function () { btn.classList.remove('theme-toggle--spinning'); }, 450);

      const rect = btn.getBoundingClientRect();
      const x = Math.round(rect.left + rect.width / 2);
      const y = Math.round(rect.top + rect.height / 2);
      root.style.setProperty('--vt-x', x + 'px');
      root.style.setProperty('--vt-y', y + 'px');

      if (document.startViewTransition) {
        document.startViewTransition(function () { applyTheme(next); });
      } else {
        crossfadeSwitch(next);
      }
    });
  });
})();
