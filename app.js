/* =========================================
   ALGOFORGE — Shared JS Utilities
   ========================================= */

'use strict';

// ── PROGRESS STORE ────────────────────────
// Uses localStorage so progress persists across pages
const Progress = (() => {
  const KEY = 'cp_progress';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch {}
  }

  function markSolved(slug) {
    const d = load();
    d[slug] = { status: 'solved', ts: Date.now() };
    save(d);
    _emit('progress:change', { slug, status: 'solved' });
  }

  function markReview(slug) {
    const d = load();
    d[slug] = { status: 'review', ts: Date.now() };
    save(d);
    _emit('progress:change', { slug, status: 'review' });
  }

  function clear(slug) {
    const d = load();
    delete d[slug];
    save(d);
    _emit('progress:change', { slug, status: null });
  }

  function getStatus(slug) {
    return (load()[slug] || {}).status || null;
  }

  function getAll() { return load(); }

  function solvedCount() {
    return Object.values(load()).filter(v => v.status === 'solved').length;
  }

  function _emit(event, detail) {
    document.dispatchEvent(new CustomEvent(event, { detail }));
  }

  return { markSolved, markReview, clear, getStatus, getAll, solvedCount };
})();

// ── STREAK TRACKER ────────────────────────
const Streak = (() => {
  const KEY = 'cp_streak';

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function bump() {
    const data = JSON.parse(localStorage.getItem(KEY) || '{"count":0,"last":""}');
    const t = today();
    if (data.last === t) return data.count;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);

    if (data.last === yStr) {
      data.count++;
    } else if (data.last !== t) {
      data.count = 1;
    }
    data.last = t;
    localStorage.setItem(KEY, JSON.stringify(data));
    return data.count;
  }

  function get() {
    return JSON.parse(localStorage.getItem(KEY) || '{"count":0,"last":""}').count;
  }

  return { bump, get };
})();

// ── SEARCH ────────────────────────────────
function initSearch(inputEl, rowsSelector) {
  if (!inputEl) return;
  inputEl.addEventListener('input', () => {
    const q = inputEl.value.toLowerCase().trim();
    document.querySelectorAll(rowsSelector).forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = (!q || text.includes(q)) ? '' : 'none';
    });
  });
}

// ── FILTER PILLS ─────────────────────────
function initFilters(pillsSelector, rowsSelector, dataAttr) {
  const pills = document.querySelectorAll(pillsSelector);
  if (!pills.length) return;

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const val = pill.dataset.filter;
      document.querySelectorAll(rowsSelector).forEach(row => {
        row.style.display = (val === 'all' || row.dataset[dataAttr] === val) ? '' : 'none';
      });
    });
  });
}

// ── COPY CODE BUTTON ─────────────────────
function initCopyButtons() {
  document.querySelectorAll('pre').forEach(pre => {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code');
    pre.style.position = 'relative';
    pre.appendChild(btn);
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(pre.querySelector('code')?.textContent || pre.textContent)
        .then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = 'Copy', 1800);
        });
    });
  });
}

// ── SMOOTH REVEAL ─────────────────────────
function initReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    obs.observe(el);
  });
}

// ── PROBLEM STATUS UI ─────────────────────
function renderStatusDot(slug, container) {
  const status = Progress.getStatus(slug);
  const colors = { solved: '#1a6b4a', review: '#92610a', null: '#e2ddd4' };
  const dot = container.querySelector('.status-dot');
  if (dot) {
    dot.style.background = colors[status] || colors[null];
    dot.title = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Not attempted';
  }
}

// ── READING PROGRESS BAR ─────────────────
function initReadingBar() {
  const bar = document.getElementById('reading-bar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const h = document.body.scrollHeight - window.innerHeight;
    bar.style.width = Math.min(100, (window.scrollY / h) * 100) + '%';
  }, { passive: true });
}

// ── TABLE OF CONTENTS ─────────────────────
function buildTOC(contentSelector, tocSelector) {
  const content = document.querySelector(contentSelector);
  const toc = document.querySelector(tocSelector);
  if (!content || !toc) return;

  const headings = content.querySelectorAll('h2, h3');
  if (!headings.length) return;

  const ul = document.createElement('ul');
  ul.className = 'toc-list';

  headings.forEach((h, i) => {
    if (!h.id) h.id = 'heading-' + i;
    const li = document.createElement('li');
    li.className = h.tagName === 'H3' ? 'toc-sub' : '';
    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    a.addEventListener('click', e => {
      e.preventDefault();
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    li.appendChild(a);
    ul.appendChild(li);
  });

  toc.appendChild(ul);

  // Highlight active section
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const link = toc.querySelector(`a[href="#${entry.target.id}"]`);
      if (link) link.classList.toggle('active', entry.isIntersecting);
    });
  }, { rootMargin: '0px 0px -60% 0px' });

  headings.forEach(h => obs.observe(h));
}

// ── INIT ON DOM READY ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initCopyButtons();
  initReadingBar();

  // Update nav solved counter
  const counter = document.getElementById('solved-counter');
  if (counter) counter.textContent = Progress.solvedCount();

  // Streak display
  const streakEl = document.getElementById('streak-display');
  if (streakEl) streakEl.textContent = '🔥 ' + Streak.get();
});
