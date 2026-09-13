const lang = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
const isErrorPage = document.body.dataset.kind === 'error';
const safeStore = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* URLs remain usable without storage. */
    }
  },
};
const session = {
  get(key) {
    try {
      return JSON.parse(sessionStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Optional navigation memory. */
    }
  },
};
let readingHash = null;
function updateLanguageLinks() {
  if (isErrorPage) return;
  document.querySelectorAll('[data-language]').forEach((link) => {
    const destination = new URL(link.href);
    destination.search = location.search;
    destination.hash = readingHash || location.hash;
    link.href = destination.href;
  });
}
for (const link of document.querySelectorAll('[data-language]')) {
  link.addEventListener('click', () => safeStore.set('portfolio-language', link.dataset.language));
}
safeStore.set('portfolio-language', lang);
updateLanguageLinks();

const listKey = `portfolio-list-${lang}`;
if (document.body.dataset.kind === 'home') {
  const categories = ['education', 'research', 'industry'];
  const saved = session.get(listKey);
  const url = new URL(location.href);
  const legacyCategory = url.searchParams.get('filter');
  if (categories.includes(legacyCategory)) {
    url.hash = `#${legacyCategory}`;
    url.searchParams.delete('filter');
    history.replaceState(history.state, '', url);
  }
  const savePosition = () =>
    session.set(listKey, { scroll: window.scrollY, hash: readingHash || location.hash });
  document
    .querySelectorAll('.experience-entry a')
    .forEach((link) => link.addEventListener('click', savePosition));
  window.addEventListener('pagehide', savePosition);
  const sections = [...document.querySelectorAll('.academic-intro, .experience-section')];
  let observedHash = null;
  let anchorIntent = null;
  const anchorPosition = (section) =>
    Math.max(
      0,
      Math.min(
        section.getBoundingClientRect().top +
          window.scrollY -
          (parseFloat(getComputedStyle(section).scrollMarginTop) || 0),
        document.documentElement.scrollHeight - window.innerHeight,
      ),
    );
  function updateNavigation() {
    // Several sections can share the same bottom-clamped anchor position.
    if (location.hash !== observedHash) {
      observedHash = location.hash;
      const target = sections.find((section) => `#${section.id}` === observedHash);
      anchorIntent = target ? { section: target, arrived: false } : null;
    }
    if (anchorIntent) {
      const atAnchor = Math.abs(window.scrollY - anchorPosition(anchorIntent.section)) <= 2;
      if (atAnchor) anchorIntent.arrived = true;
      else if (anchorIntent.arrived) anchorIntent = null;
    }
    const passed = sections.filter((section) => section.getBoundingClientRect().top <= 150);
    // The final section can be too short to reach the header before scrolling ends.
    const atBottom =
      window.scrollY > 0 &&
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    const active =
      anchorIntent?.section.id || (atBottom ? sections.at(-1).id : passed.at(-1)?.id || 'about');
    document.querySelectorAll('[data-section]').forEach((link) => {
      if (link.dataset.section === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    readingHash = `#${active}`;
    updateLanguageLinks();
  }
  window.addEventListener('scroll', updateNavigation, { passive: true });
  window.addEventListener('hashchange', updateNavigation);
  window.addEventListener('load', updateNavigation, { once: true });
  const releaseAnchor = () => {
    if (!anchorIntent) return;
    anchorIntent = null;
    observedHash = location.hash;
    updateNavigation();
  };
  window.addEventListener('wheel', releaseAnchor, { passive: true });
  window.addEventListener('touchmove', releaseAnchor, { passive: true });
  window.addEventListener('keydown', (event) => {
    if (
      ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key) &&
      !event.target.closest('input, textarea, select, button, [contenteditable="true"], summary')
    )
      releaseAnchor();
  });
  document.querySelectorAll('[data-section]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = sections.find((section) => section.id === link.dataset.section);
      if (!target) return;
      // Re-selecting the current hash may not emit hashchange or scroll.
      anchorIntent = { section: target, arrived: false };
      requestAnimationFrame(updateNavigation);
    });
  });
  // Anchor scrolling can precede its queued events; refresh the destination at activation.
  document.querySelectorAll('[data-language]').forEach((link) => {
    link.addEventListener('click', updateNavigation);
  });
  updateNavigation();
  if (url.searchParams.has('return')) {
    const restore = () =>
      requestAnimationFrame(() => {
        if (Number.isFinite(saved?.scroll))
          window.scrollTo({ top: Math.max(0, saved.scroll), behavior: 'instant' });
        const destination = new URL(location.href);
        destination.searchParams.delete('return');
        history.replaceState(history.state, '', destination);
        updateLanguageLinks();
        updateNavigation();
      });
    if (document.readyState === 'complete') restore();
    else window.addEventListener('load', restore, { once: true });
  }
  updateLanguageLinks();
} else if (!isErrorPage && session.get(listKey)) {
  document.querySelectorAll('a[href]').forEach((link) => {
    const url = new URL(link.href);
    const home = `${document.body.dataset.base || ''}/${lang}/`;
    if (
      url.origin === location.origin &&
      url.pathname === home &&
      link.hasAttribute('data-return-to-list')
    ) {
      const saved = session.get(listKey);
      if (['#education', '#research', '#industry', '#experience'].includes(saved.hash))
        url.hash = saved.hash;
      url.searchParams.set('return', '1');
      link.href = url.href;
    }
  });
}

const scenes = [...document.querySelectorAll('[data-scene]')];
if (scenes.length) {
  let presenting = false;
  let activeIndex = Math.max(
    0,
    scenes.findIndex((scene) => `#${scene.id}` === location.hash),
  );
  const entry = document.querySelector('.enter-presentation');
  const controls = document.querySelectorAll('.presentation-controls, .presentation-top');
  const prev = document.querySelector('[data-prev]');
  const next = document.querySelector('[data-next]');
  const nextContribution = document.querySelector('[data-next-contribution]');
  const selector = document.querySelector('[data-scene-select]');
  const demoButton = document.querySelector('[data-demo-open]');
  const dialog = document.querySelector('[data-demo-dialog]');
  const dialogBody = document.querySelector('[data-demo-dialog-body]');
  let movedDemo = null;
  let demoOrigin = null;
  entry.hidden = false;
  const readingEntry = document.querySelector('.reading-present');
  readingEntry.hidden = false;

  // The selector follows each contribution's variable-length presentation.
  let group;
  for (const [index, scene] of scenes.entries()) {
    if (!group || group.label !== scene.dataset.chapter) {
      group = document.createElement('optgroup');
      group.label = scene.dataset.chapter;
      selector.append(group);
    }
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${index + 1}. ${scene.querySelector('h2').textContent}`;
    group.append(option);
  }
  const currentDemo = () => {
    const chapterId = scenes[activeIndex].id.split('--')[0];
    return [...document.querySelectorAll('.chapter-appendix')]
      .find((appendix) => appendix.dataset.chapterId === chapterId)
      ?.querySelector('[data-demo]');
  };
  function restoreDemo() {
    if (movedDemo && demoOrigin) demoOrigin.append(movedDemo);
    movedDemo = null;
    demoOrigin = null;
  }
  function closeDemo() {
    if (dialog.open) dialog.close();
    restoreDemo();
  }
  demoButton.addEventListener('click', () => {
    const demo = currentDemo();
    if (!demo || typeof dialog.showModal !== 'function') return;
    movedDemo = demo;
    demoOrigin = demo.parentElement;
    dialogBody.append(demo);
    dialog.showModal();
    dialog.querySelector('[data-demo-close]').focus();
  });
  dialog.querySelector('[data-demo-close]').addEventListener('click', closeDemo);
  dialog.addEventListener('close', () => {
    restoreDemo();
    if (presenting && !demoButton.hidden) demoButton.focus({ preventScroll: true });
  });
  let collapsedFlows = [];
  window.addEventListener('beforeprint', () => {
    closeDemo();
    collapsedFlows = [...document.querySelectorAll('.flow-detail:not([open])')];
    collapsedFlows.forEach((d) => (d.open = true));
  });
  window.addEventListener('afterprint', () => collapsedFlows.forEach((d) => (d.open = false)));

  function updateOutline() {
    document.querySelectorAll('.story-sidebar a[href^="#"]').forEach((link) => {
      if (link.hash === `#${scenes[activeIndex].id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function showScene(index, updateUrl = true) {
    closeDemo();
    activeIndex = Math.max(0, Math.min(index, scenes.length - 1));
    scenes.forEach((scene, i) => {
      scene.hidden = presenting && i !== activeIndex;
    });
    document.querySelector('[data-progress]').textContent = `${activeIndex + 1} / ${scenes.length}`;
    selector.value = String(activeIndex);
    demoButton.hidden = !currentDemo() || typeof dialog.showModal !== 'function';
    prev.disabled = activeIndex === 0;
    next.disabled = activeIndex === scenes.length - 1;
    const nextHadFocus = document.activeElement === next;
    const continuationHadFocus = document.activeElement === nextContribution;
    const canContinue = presenting && next.disabled && Boolean(nextContribution);
    next.hidden = canContinue;
    if (nextContribution) nextContribution.hidden = !canContinue;
    if (canContinue && nextHadFocus) nextContribution.focus({ preventScroll: true });
    else if (presenting && !canContinue && continuationHadFocus)
      next.focus({ preventScroll: true });
    readingHash = `#${scenes[activeIndex].id}`;
    if (updateUrl) {
      const url = new URL(location.href);
      url.hash = readingHash;
      history.replaceState(history.state, '', url);
    }
    updateOutline();
    updateLanguageLinks();
    if (presenting) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function setPresentation(enabled, updateUrl = true) {
    presenting = enabled;
    document.body.classList.toggle('is-presenting', enabled);
    controls.forEach((control) => {
      control.hidden = !enabled;
    });
    if (updateUrl) {
      const url = new URL(location.href);
      if (enabled) url.searchParams.set('present', '1');
      else url.searchParams.delete('present');
      history.replaceState(history.state, '', url);
    }
    showScene(activeIndex, updateUrl);
    if (enabled) document.querySelector('[data-exit]').focus({ preventScroll: true });
    else {
      const heading = scenes[activeIndex].querySelector('h2');
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      scenes[activeIndex].scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }
  entry.addEventListener('click', () => {
    activeIndex = 0;
    setPresentation(true);
  });
  readingEntry.addEventListener('click', () => setPresentation(true));
  scenes.forEach((scene, index) => {
    const button = scene.querySelector('[data-present-scene]');
    button.hidden = false;
    button.addEventListener('click', () => {
      activeIndex = index;
      setPresentation(true);
    });
  });
  document.querySelector('[data-exit]').addEventListener('click', () => setPresentation(false));
  selector.addEventListener('change', () => showScene(Number(selector.value)));
  prev.addEventListener('click', () => showScene(activeIndex - 1));
  next.addEventListener('click', () => showScene(activeIndex + 1));
  window.addEventListener('keydown', (event) => {
    if (!presenting || dialog.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setPresentation(false);
      return;
    }
    if (
      event.target.closest(
        'input, textarea, select, [contenteditable="true"], summary, [role="slider"], .framework-figure, .brief-table-scroll',
      )
    )
      return;
    if (['ArrowRight', 'PageDown', 'ArrowLeft', 'PageUp', 'Home', 'End'].includes(event.key))
      event.preventDefault();
    if (['ArrowRight', 'PageDown'].includes(event.key)) showScene(activeIndex + 1);
    if (['ArrowLeft', 'PageUp'].includes(event.key)) showScene(activeIndex - 1);
    if (event.key === 'Home') showScene(0);
    if (event.key === 'End') showScene(scenes.length - 1);
  });
  window.addEventListener('popstate', () => {
    activeIndex = Math.max(
      0,
      scenes.findIndex((scene) => `#${scene.id}` === location.hash),
    );
    setPresentation(new URL(location.href).searchParams.get('present') === '1', false);
  });
  window.addEventListener('hashchange', () => {
    const index = scenes.findIndex((scene) => `#${scene.id}` === location.hash);
    if (index >= 0) {
      activeIndex = index;
      readingHash = `#${scenes[index].id}`;
      if (presenting) showScene(index, false);
    }
    updateLanguageLinks();
  });
  if (new URL(location.href).searchParams.get('present') === '1') setPresentation(true, false);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (presenting) return;
        if (!entries.some((item) => item.isIntersecting)) return;
        const boundary = Math.min(200, window.innerHeight * 0.25);
        const reached = scenes
          .map((scene, index) => ({ index, top: scene.getBoundingClientRect().top }))
          .filter((item) => item.top <= boundary);
        activeIndex = reached.length ? reached.at(-1).index : 0;
        readingHash = `#${scenes[activeIndex].id}`;
        updateOutline();
        updateLanguageLinks();
      },
      { rootMargin: '-15% 0px -60% 0px' },
    );
    scenes.forEach((scene) => observer.observe(scene));
  }
}
window.addEventListener('hashchange', updateLanguageLinks);
if (document.querySelector('[data-demo]')) import('./demos.js');
document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
