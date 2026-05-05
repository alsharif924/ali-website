import { db } from '../../shared/js/firebase-config.js';
import { collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const systemsGrid    = document.getElementById('systemsGrid');
const filterBtns     = document.querySelectorAll('.systems-filters .filter-btn');
const sysModal       = document.getElementById('sysModal');
const sysModalClose  = document.getElementById('sysModalClose');
const sysModalBdrop  = document.getElementById('sysModalBackdrop');
const sysModalImg    = document.getElementById('sysModalImg');
const sysModalTag    = document.getElementById('sysModalTag');
const sysModalTitle  = document.getElementById('sysModalTitle');
const sysModalDesc   = document.getElementById('sysModalDesc');
const sysModalTags   = document.getElementById('sysModalTechTags');
const sysModalLink   = document.getElementById('sysModalLink');

let activeFilter = 'all';
let items = [];

const TAG_LABELS = {
  'ai-systems':  'AI Systems',
  'websites':    'Websites',
  'dashboards':  'Dashboards',
};

function buildCard(item) {
  const label    = TAG_LABELS[item.tag] || item.tag;
  const tagsHtml = (item.techTags || []).map(t => `<span>${t}</span>`).join('');
  return `<div class="system-card" data-category="${item.tag}" style="cursor:pointer;">
    <div class="system-card__image">
      <img src="${item.coverUrl}" alt="${item.title}" loading="lazy" />
      <span class="system-card__badge">${label}</span>
    </div>
    <div class="system-card__body">
      <h3 class="system-card__title">${item.title}</h3>
      <p class="system-card__text">${item.description}</p>
      <div class="system-card__tags">${tagsHtml}</div>
    </div>
  </div>`;
}

function applyFilter(filter) {
  activeFilter = filter;
  systemsGrid.querySelectorAll('.system-card').forEach(el => {
    el.classList.toggle('hidden', filter !== 'all' && el.dataset.category !== filter);
  });
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('filter-btn--active'));
    btn.classList.add('filter-btn--active');
    applyFilter(btn.dataset.filter);
  });
});

function openSysModal(item) {
  const label = TAG_LABELS[item.tag] || item.tag;
  sysModalImg.src = item.coverUrl;
  sysModalImg.alt = item.title;
  sysModalTag.textContent   = label;
  sysModalTitle.textContent = item.title;
  sysModalDesc.textContent  = item.description;
  sysModalTags.innerHTML = (item.techTags || []).map(t => `<span>${t}</span>`).join('');
  if (item.websiteUrl) {
    sysModalLink.href   = item.websiteUrl;
    sysModalLink.hidden = false;
  } else {
    sysModalLink.hidden = true;
  }
  sysModal.classList.add('open');
  sysModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeSysModal() {
  sysModal.classList.remove('open');
  sysModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function bindCards() {
  systemsGrid.querySelectorAll('.system-card').forEach((el, i) => {
    el.addEventListener('click', () => openSysModal(items[i]));
  });
}

sysModalClose.addEventListener('click', closeSysModal);
sysModalBdrop.addEventListener('click', closeSysModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSysModal(); });

async function loadSystems() {
  const snap = await getDocs(query(collection(db, 'systems'), orderBy('createdAt', 'desc')));
  if (snap.empty) {
    systemsGrid.innerHTML = '<p class="gallery-empty">No systems yet.</p>';
    return;
  }
  items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  systemsGrid.innerHTML = items.map(buildCard).join('');
  applyFilter(activeFilter);
  bindCards();
}

loadSystems();
