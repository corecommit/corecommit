const GITHUB_USER = 'corecommit';
const EXCLUDED_REPOS = ['corecommit'];

const LANG_COLORS = {
  'C++':        '#f34b7d',
  'C':          '#555555',
  'Python':     '#3572A5',
  'JavaScript': '#f1e05a',
  'TypeScript': '#3178c6',
  'Java':       '#b07219',
  'Kotlin':     '#A97BFF',
  'Rust':       '#dea584',
  'Go':         '#00ADD8',
  'Shell':      '#89e051',
  'HTML':       '#e34c26',
  'CSS':        '#563d7c',
  'Lua':        '#6699cc',
  'Ruby':       '#701516',
  'Swift':      '#F05138',
  'Dart':       '#00B4AB',
  'Vue':        '#41b883',
  'Svelte':     '#ff3e00',
  'SCSS':       '#c6538c',
  'Makefile':   '#427819',
  'CMake':      '#DA3434',
  'Nix':        '#7e7eff',
  'Zig':        '#ec915c',
  'Haskell':    '#5e5086',
};

let allRepos    = [];
let currentSort = 'updated';

// ── HELPERS ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const d = Math.floor((Date.now() - new Date(dateStr)) / 86_400_000);
  if (d === 0) return 'today';
  if (d < 2)   return '1d ago';
  if (d < 30)  return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12)  return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

// Animate a number counting up
function countUp(el, target, duration = 800) {
  const start = performance.now();
  const step = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = Math.round(ease * target);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

// ── LIVE STATS ────────────────────────────────────────────────────────────────

function updateStats(repos) {
  const totalStars = repos.reduce((a, r) => a + r.stargazers_count, 0);

  // Collect unique languages across all repos (filled in after lang fetch)
  const langSet = new Set();
  repos.forEach(r => {
    if (r._langs) Object.keys(r._langs).forEach(l => langSet.add(l));
  });

  countUp(document.getElementById('stat-repos'), repos.length);
  countUp(document.getElementById('stat-stars'), totalStars);
  countUp(document.getElementById('stat-langs'), langSet.size);
}

// ── MODAL ─────────────────────────────────────────────────────────────────────

const backdrop     = document.getElementById('modal-backdrop');
const modalClose   = document.getElementById('modal-close');
const modalName    = document.getElementById('modal-name');
const modalDesc    = document.getElementById('modal-desc');
const modalBtnSite = document.getElementById('modal-btn-website');
const modalBtnSrc  = document.getElementById('modal-btn-source');

function openModal(repo) {
  const tag = document.getElementById('modal-tag');
  const metaEl = document.getElementById('modal-meta');
  const langsEl = document.getElementById('modal-langs');

  if (tag) tag.textContent = `[0x0${String(allRepos.indexOf(repo) + 1).padStart(2,'0')}] ${repo.full_name}`;
  modalName.textContent = repo.name.replace(/-/g, ' ').toUpperCase();
  modalDesc.textContent = repo.description || 'No description provided.';
  modalBtnSrc.href = repo.html_url;

  // Meta row
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="modal-meta-item"><i class="fa-solid fa-star"></i> ${repo.stargazers_count}</span>
      <span class="modal-meta-item"><i class="fa-solid fa-code-fork"></i> ${repo.forks_count}</span>
      <span class="modal-meta-item"><i class="fa-regular fa-eye"></i> ${repo.watchers_count}</span>
      <span class="modal-meta-item"><i class="fa-regular fa-clock"></i> ${timeAgo(repo.pushed_at)}</span>
      ${repo.license ? `<span class="modal-meta-item"><i class="fa-solid fa-scale-balanced"></i> ${repo.license.spdx_id}</span>` : ''}
    `;
  }

  // Language bar
  if (langsEl) {
    const langs = repo._langs || {};
    const total = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
    const sorted = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 6);

    if (sorted.length) {
      langsEl.innerHTML = `
        <div class="modal-lang-bar">
          ${sorted.map(([lang, bytes]) => {
            const pct = Math.round((bytes / total) * 100);
            const color = LANG_COLORS[lang] || '#666';
            return `<span class="modal-lang-seg" style="width:${pct}%;background:${color}" title="${lang} ${pct}%"></span>`;
          }).join('')}
        </div>
        <div class="modal-lang-chips">
          ${sorted.map(([lang, bytes]) => {
            const pct = Math.round((bytes / total) * 100);
            const color = LANG_COLORS[lang] || '#666';
            return `<span class="modal-lang-chip"><span class="lang-dot" style="background:${color}"></span>${lang} <span class="lang-pct">${pct}%</span></span>`;
          }).join('')}
        </div>
      `;
      langsEl.style.display = 'block';
    } else {
      langsEl.style.display = 'none';
    }
  }

  const siteUrl = repo.homepage?.trim() || null;
  if (siteUrl) {
    modalBtnSite.href = siteUrl;
    modalBtnSite.classList.remove('disabled');
    modalBtnSite.removeAttribute('aria-disabled');
  } else {
    modalBtnSite.href = '#';
    modalBtnSite.classList.add('disabled');
    modalBtnSite.setAttribute('aria-disabled', 'true');
  }

  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  backdrop.classList.remove('open');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── SORT ──────────────────────────────────────────────────────────────────────

document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentSort = btn.dataset.sort;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProjects();
  });
});

function sortRepos(repos) {
  const r = [...repos];
  if (currentSort === 'updated') r.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  if (currentSort === 'stars')   r.sort((a, b) => b.stargazers_count - a.stargazers_count);
  if (currentSort === 'name')    r.sort((a, b) => a.name.localeCompare(b.name));
  if (currentSort === 'forks')   r.sort((a, b) => b.forks_count - a.forks_count);
  return r;
}

// ── RENDER PROJECTS ───────────────────────────────────────────────────────────

function renderProjects() {
  const container = document.getElementById('projects-container');
  const visible   = sortRepos(allRepos);

  document.getElementById('repo-count').textContent = `${visible.length} repos`;

  if (!visible.length) {
    container.innerHTML = '<div class="state-box">no repos to show.</div>';
    return;
  }

  const list = document.createElement('div');
  list.className = 'projects-list';

  visible.forEach((repo, i) => {
    const item = document.createElement('div');
    item.className = 'project-item';

    const langs  = repo._langs || {};
    const total  = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
    const langChips = Object.entries(langs)
      .sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([lang, bytes]) => {
        const pct   = Math.round((bytes / total) * 100);
        const color = LANG_COLORS[lang] || '#666';
        return `<span class="lang-chip">
          <span class="lang-dot" style="background:${color}"></span>
          ${lang}<span class="lang-pct"> ${pct}%</span>
        </span>`;
      }).join('');

    const topics = (repo.topics || []).slice(0, 6)
      .map(t => `<span class="topic-chip">${t}</span>`).join('');

    const license    = repo.license?.spdx_id ?? null;
    const hasWebsite = !!(repo.homepage?.trim());

    item.innerHTML = `
      <div class="project-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="project-body">
        <div class="project-name">${repo.name.replace(/-/g, ' ').toUpperCase()}</div>
        ${langChips ? `<div class="project-lang-row">${langChips}</div>` : ''}
        <div class="project-desc">${repo.description || '—'}</div>
        <div class="project-meta">
          <span class="meta-item">
            <i class="fa-solid fa-star"></i>
            <span class="meta-val">${repo.stargazers_count}</span>
          </span>
          <span class="meta-item">
            <i class="fa-solid fa-code-fork"></i>
            <span class="meta-val">${repo.forks_count}</span>
          </span>
          <span class="meta-item">
            <i class="fa-regular fa-eye"></i>
            <span class="meta-val">${repo.watchers_count}</span>
          </span>
          <span class="meta-item">
            <i class="fa-regular fa-clock"></i>
            <span class="meta-val">${timeAgo(repo.pushed_at)}</span>
          </span>
          ${license ? `<span class="meta-item">
            <i class="fa-solid fa-scale-balanced"></i>
            <span class="meta-val">${license}</span>
          </span>` : ''}
          ${hasWebsite ? `<span class="meta-item" style="color:var(--accent)">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            <span class="meta-val" style="color:var(--accent)">website</span>
          </span>` : ''}
        </div>
        ${topics ? `<div class="project-topics">${topics}</div>` : ''}
      </div>
      <i class="fa-solid fa-up-right-from-square project-open"></i>
    `;

    item.addEventListener('click', () => openModal(repo));
    list.appendChild(item);
  });

  container.innerHTML = '';
  container.appendChild(list);
}

// ── GITHUB FETCH ──────────────────────────────────────────────────────────────

async function fetchLanguages(repoName) {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${repoName}/languages`);
    return res.ok ? await res.json() : {};
  } catch { return {}; }
}

async function loadRepos() {
  const container = document.getElementById('projects-container');
  try {
    let page = 1, repos = [];

    while (true) {
      const res = await fetch(
        `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&page=${page}&sort=pushed`,
        { headers: { 'Accept': 'application/vnd.github+json' } }
      );
      if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
      const batch = await res.json();
      if (!batch.length) break;
      repos = repos.concat(batch.filter(r => !r.fork && !EXCLUDED_REPOS.includes(r.name)));
      if (batch.length < 100) break;
      page++;
    }

    if (!repos.length) {
      container.innerHTML = '<div class="state-box">no repos found.</div>';
      return;
    }

    allRepos = repos;
    renderProjects();
    updateStats(repos); // initial stats with repo count + stars

    // Fetch languages in batches of 4, update stats as they come in
    for (let i = 0; i < repos.length; i += 4) {
      await Promise.all(repos.slice(i, i + 4).map(async r => {
        r._langs = await fetchLanguages(r.name);
      }));
      renderProjects();
      updateStats(repos); // update language count progressively
    }

  } catch (err) {
    container.innerHTML = `
      <div class="state-box" style="flex-direction:column;gap:10px">
        <div style="display:flex;align-items:center;gap:8px;color:var(--accent)">
          <i class="fa-solid fa-triangle-exclamation"></i> ${err.message}
        </div>
        <div style="font-size:9px;line-height:1.9;color:var(--muted)">
          GitHub rate-limits unauthenticated requests to 60/hr.<br>
          Add an <code style="color:var(--accent2)">Authorization: Bearer YOUR_PAT</code>
          header to the fetch calls in main.js to raise the limit.
        </div>
      </div>`;
  }
}

// ── SCROLL OBSERVERS ──────────────────────────────────────────────────────────

const secObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.05 });

document.querySelectorAll('section').forEach(s => secObs.observe(s));

const navObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const active = document.querySelector(`.nav-item[href="#${e.target.id}"]`);
    if (active) active.classList.add('active');
  });
}, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

document.querySelectorAll('section[id]').forEach(s => navObs.observe(s));

// ── BOOT ──────────────────────────────────────────────────────────────────────

loadRepos();
