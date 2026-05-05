(function () {
  const root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
  }

  function crossfadeSwitch(next) {
    root.classList.add('theme-transitioning');
    applyTheme(next);
    setTimeout(function () { root.classList.remove('theme-transitioning'); }, 500);
  }

  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    btn.addEventListener('click', function () {
      const current = root.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';

      // Button spin
      btn.classList.add('theme-toggle--spinning');
      setTimeout(function () { btn.classList.remove('theme-toggle--spinning'); }, 450);

      // Set origin CSS vars for circular reveal animation
      const rect = btn.getBoundingClientRect();
      const x = Math.round(rect.left + rect.width / 2);
      const y = Math.round(rect.top + rect.height / 2);
      root.style.setProperty('--vt-x', x + 'px');
      root.style.setProperty('--vt-y', y + 'px');

      // Use View Transitions API if available, else smooth crossfade
      if (document.startViewTransition) {
        document.startViewTransition(function () { applyTheme(next); });
      } else {
        crossfadeSwitch(next);
      }
    });
  });
})();
