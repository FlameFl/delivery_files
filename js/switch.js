    const segmented = document.querySelector('.segmented');
    const tabs = [...document.querySelectorAll('.segmented__btn')];
    const panels = [...document.querySelectorAll('.panel')];

    function setActive(tabName, focusBtn = null) {
      segmented.dataset.active = (tabName === 'sub') ? 'sub' : 'order';
      segmented.classList.add('is-animating');
      window.clearTimeout(segmented._t);
      segmented._t = window.setTimeout(() => segmented.classList.remove('is-animating'), 280);

      tabs.forEach(btn => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
        btn.tabIndex = isActive ? 0 : -1;
        if (isActive && focusBtn) btn.focus();
      });

      panels.forEach(p => {
        p.classList.toggle('is-active', p.dataset.panel === tabName);
      });
    }

    tabs.forEach(btn => {
      btn.addEventListener('click', () => setActive(btn.dataset.tab));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          const idx = tabs.indexOf(btn);
          const next = e.key === 'ArrowRight'
            ? tabs[Math.min(idx + 1, tabs.length - 1)]
            : tabs[Math.max(idx - 1, 0)];
          setActive(next.dataset.tab, true);
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActive(btn.dataset.tab);
        }
      });
    });
    
    setActive('order');