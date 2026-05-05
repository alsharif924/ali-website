import { db } from '../../../shared/js/firebase-config.js';
import { requireAuth, signOut } from '../../../shared/js/firebase-auth.js';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const labels = { images: 'AI Images', videos: 'AI Videos', blogs: 'Blog Posts', systems: 'Systems' };
const TAG_LABELS = { 'ai-systems': 'AI Systems', 'websites': 'Websites', 'dashboards': 'Dashboards' };

const statEls = {
  images:  document.getElementById('statImages'),
  videos:  document.getElementById('statVideos'),
  blogs:   document.getElementById('statBlogs'),
  systems: document.getElementById('statSystems'),
};

const contentPanel  = document.getElementById('contentPanel');
const panelTitle    = document.getElementById('panelTitle');
const panelCount    = document.getElementById('panelCount');
const panelGrid     = document.getElementById('panelGrid');
const panelEmpty    = document.getElementById('panelEmpty');
const panelClose    = document.getElementById('panelClose');
const delModal      = document.getElementById('delModal');
const delBackdrop   = document.getElementById('delBackdrop');
const delCancel     = document.getElementById('delCancel');
const delConfirm    = document.getElementById('delConfirm');

const detailModal   = document.getElementById('detailModal');
const detailBackdrop= document.getElementById('detailBackdrop');
const detailClose   = document.getElementById('detailClose');
const detailMedia   = document.getElementById('detailMedia');
const detailTag     = document.getElementById('detailTag');
const detailTitle   = document.getElementById('detailTitle');
const detailDesc    = document.getElementById('detailDesc');
const detailExtra   = document.getElementById('detailExtra');

let data = { images: [], videos: [], blogs: [], systems: [] };
let activeType = null;
let pendingDelete = null;

function extractYouTubeId(url) {
  const m = (url || '').match(/(?:v=|youtu\.be\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

function updateStats() {
  Object.keys(statEls).forEach(type => {
    statEls[type].textContent = data[type].length;
  });
}

function getImg(type, item) {
  if (type === 'images') return item.imageUrl || '';
  if (type === 'videos') return item.thumbnailUrl || '';
  return item.coverUrl || '';
}

function buildCard(type, item) {
  const img = getImg(type, item);
  const trashBtn = `<button class="panel-item__trash" data-id="${item.id}" aria-label="Delete ${item.title}">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
  </button>`;

  if (type === 'blogs') {
    return `<div class="panel-item" style="cursor:pointer;">
      <img class="panel-item__img panel-item__img--wide" src="${img}" alt="${item.title}" loading="lazy" />
      <div class="panel-item__body">
        <span class="panel-item__tag">${item.tag}</span>
        <p class="panel-item__title">${item.title}</p>
        <p class="panel-item__meta">${item.summary || ''}</p>
      </div>
      ${trashBtn}
    </div>`;
  }

  const ratio = type === 'images' ? '' : ' panel-item__img--wide';
  return `<div class="panel-item" style="cursor:pointer;">
    <img class="panel-item__img${ratio}" src="${img}" alt="${item.title}" loading="lazy" />
    <div class="panel-item__body">
      <span class="panel-item__tag">${item.tag}</span>
      <p class="panel-item__title">${item.title}</p>
    </div>
    ${trashBtn}
  </div>`;
}

function openDetailModal(type, item) {
  detailMedia.innerHTML = '';
  if (type === 'videos') {
    const ytId = extractYouTubeId(item.videoUrl);
    if (ytId) {
      detailMedia.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}" allow="autoplay;encrypted-media;fullscreen" allowfullscreen></iframe>`;
    } else if (item.videoUrl) {
      detailMedia.innerHTML = `<video src="${item.videoUrl}" controls></video>`;
    }
  } else {
    const imgUrl = getImg(type, item);
    if (imgUrl) detailMedia.innerHTML = `<img src="${imgUrl}" alt="${item.title}" />`;
  }

  const tagLabel = TAG_LABELS[item.tag] || item.tag || '';
  detailTag.textContent   = tagLabel;
  detailTitle.textContent = item.title;
  detailDesc.textContent  = type === 'blogs' ? (item.summary || '') : (item.description || '');

  detailExtra.innerHTML = '';
  if (type === 'blogs' && item.content) {
    const paragraphs = item.content.split(/\n\n+/).filter(Boolean);
    paragraphs.forEach(pText => {
      const pEl = document.createElement('p');
      pText.split('\n').forEach((line, idx, arr) => {
        pEl.appendChild(document.createTextNode(line));
        if (idx < arr.length - 1) pEl.appendChild(document.createElement('br'));
      });
      detailExtra.appendChild(pEl);
    });
  }
  if (type === 'systems') {
    if (item.techTags?.length) {
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'detail-modal__tech-tags';
      tagsDiv.innerHTML = item.techTags.map(t => `<span>${t}</span>`).join('');
      detailExtra.appendChild(tagsDiv);
    }
    if (item.websiteUrl) {
      const link = document.createElement('a');
      link.href = item.websiteUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'detail-modal__link';
      link.textContent = 'View Project →';
      detailExtra.appendChild(link);
    }
  }

  detailModal.classList.add('open');
  detailModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
  detailModal.classList.remove('open');
  detailModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  detailMedia.innerHTML = '';
}

detailClose.addEventListener('click', closeDetailModal);
detailBackdrop.addEventListener('click', closeDetailModal);

function renderPanel(type) {
  const items = data[type];
  panelTitle.textContent = labels[type];
  panelCount.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
  panelGrid.className = `content-panel__grid content-panel__grid--${type}`;

  if (items.length === 0) {
    panelGrid.innerHTML = '';
    panelEmpty.hidden = false;
    return;
  }
  panelEmpty.hidden = true;
  panelGrid.innerHTML = items.map(item => buildCard(type, item)).join('');

  panelGrid.querySelectorAll('.panel-item__trash').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      pendingDelete = { type, id: btn.dataset.id };
      delModal.hidden = false;
    });
  });

  panelGrid.querySelectorAll('.panel-item').forEach((el, i) => {
    el.addEventListener('click', e => {
      if (e.target.closest('.panel-item__trash')) return;
      openDetailModal(type, items[i]);
    });
  });
}

function openPanel(type) {
  activeType = type;
  document.querySelectorAll('.stat-card').forEach(c => c.classList.toggle('active', c.dataset.type === type));
  contentPanel.hidden = false;
  renderPanel(type);
  contentPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closePanel() {
  activeType = null;
  contentPanel.hidden = true;
  document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
}

document.querySelectorAll('.stat-card').forEach(card => {
  card.addEventListener('click', () => {
    const type = card.dataset.type;
    if (activeType === type) { closePanel(); } else { openPanel(type); }
  });
});

panelClose.addEventListener('click', closePanel);

delConfirm.addEventListener('click', async () => {
  if (!pendingDelete) return;
  const { type, id } = pendingDelete;
  delConfirm.disabled = true;
  try {
    await deleteDoc(doc(db, type, id));
    data[type] = data[type].filter(item => item.id !== id);
    pendingDelete = null;
    delModal.hidden = true;
    updateStats();
    renderPanel(type);
  } catch (err) {
    console.error('Delete failed', err);
  } finally {
    delConfirm.disabled = false;
  }
});

delCancel.addEventListener('click', () => { delModal.hidden = true; pendingDelete = null; });
delBackdrop.addEventListener('click', () => { delModal.hidden = true; pendingDelete = null; });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (detailModal.classList.contains('open')) { closeDetailModal(); return; }
    delModal.hidden = true;
    pendingDelete = null;
  }
});

async function loadAll() {
  const types = ['images', 'videos', 'blogs', 'systems'];
  await Promise.all(types.map(async type => {
    const q = query(collection(db, type), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    data[type] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }));
  updateStats();
  if (activeType) renderPanel(activeType);
}

document.getElementById('signOutBtn').addEventListener('click', signOut);
requireAuth(() => loadAll());
