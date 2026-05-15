import { db } from '../../shared/js/firebase-config.js';
import { collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getCategories, renderFilterButtons, labelOf } from '../../shared/js/categories.js';

const galleryGrid   = document.getElementById('galleryGrid');
const filtersEl     = document.querySelector('.gallery-filters');
const lightbox      = document.getElementById('lightbox');
const lightboxImg   = document.getElementById('lightboxImg');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxTag   = document.getElementById('lightboxTag');
const lightboxDesc  = document.getElementById('lightboxDesc');
const lightboxClose = document.getElementById('lightboxClose');

let activeFilter = 'all';
let items = [];
let tagToLabel = new Map();

function tagLabel(slug) {
  return tagToLabel.get(slug) || slug || '';
}

function buildItem(item) {
  const orient = item.orientation === 'landscape' ? 'landscape' : 'portrait';
  return `<div class="gallery-item gallery-item--${orient}" data-category="${item.tag}" style="cursor:pointer;">
    <div class="gallery-item__img-wrap">
      <img src="${item.imageUrl}" alt="${item.title}" loading="lazy" />
      <div class="gallery-item__overlay">
        <span class="gallery-item__view-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </span>
      </div>
    </div>
    <div class="gallery-item__info">
      <span class="gallery-item__tag">${tagLabel(item.tag)}</span>
      <h3 class="gallery-item__title">${item.title}</h3>
    </div>
  </div>`;
}

function applyFilter(filter) {
  activeFilter = filter;
  galleryGrid.querySelectorAll('.gallery-item').forEach(el => {
    el.classList.toggle('hidden', filter !== 'all' && el.dataset.category !== filter);
  });
}

async function refreshTagToLabel() {
  const cats = await getCategories('images');
  tagToLabel = new Map(cats.map(c => [c.slug, labelOf(c)]));
}

function openLightbox(item) {
  lightboxImg.src = item.imageUrl;
  lightboxImg.alt = item.title;
  lightboxTitle.textContent = item.title;
  lightboxTag.textContent = tagLabel(item.tag);
  lightboxDesc.textContent = item.description || '';
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function bindCards() {
  galleryGrid.querySelectorAll('.gallery-item').forEach((el, i) => {
    el.addEventListener('click', () => openLightbox(items[i]));
  });
}

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

document.addEventListener('langchange', async () => {
  await refreshTagToLabel();
  if (items.length) {
    galleryGrid.innerHTML = items.map(buildItem).join('');
    applyFilter(activeFilter);
    bindCards();
  }
});

async function loadImages() {
  await refreshTagToLabel();
  await renderFilterButtons(filtersEl, 'images', { onChange: applyFilter, allKey: 'gallery.filter.all' });
  const snap = await getDocs(query(collection(db, 'images'), orderBy('createdAt', 'desc')));
  if (snap.empty) {
    galleryGrid.innerHTML = '<p class="gallery-empty">No images yet.</p>';
    return;
  }
  items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  galleryGrid.innerHTML = items.map(buildItem).join('');
  applyFilter(activeFilter);
  bindCards();
}

loadImages();
