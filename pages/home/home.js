import { db } from '../../shared/js/firebase-config.js';
import { collection, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const track   = document.getElementById('insightsTrack');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

const blogModal        = document.getElementById('blogModal');
const blogModalClose   = document.getElementById('blogModalClose');
const blogModalBdrop   = document.getElementById('blogModalBackdrop');
const blogModalCover   = document.getElementById('blogModalCover');
const blogModalTag     = document.getElementById('blogModalTag');
const blogModalTitle   = document.getElementById('blogModalTitle');
const blogModalSummary = document.getElementById('blogModalSummary');
const blogModalContent = document.getElementById('blogModalContent');

let currentIndex = 0;
let insightItems = [];

function getVisibleCount() {
  return window.innerWidth <= 600 ? 1 : 2;
}

function getCardWidth() {
  const card = track.querySelector('.insight-card');
  if (!card) return 0;
  return card.offsetWidth + 24;
}

function getMaxIndex() {
  return Math.max(0, track.querySelectorAll('.insight-card').length - getVisibleCount());
}

function updateTrack() {
  track.style.transform = `translateX(-${currentIndex * getCardWidth()}px)`;
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex >= getMaxIndex();
  prevBtn.style.opacity = prevBtn.disabled ? '0.4' : '1';
  nextBtn.style.opacity = nextBtn.disabled ? '0.4' : '1';
}

prevBtn.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; updateTrack(); } });
nextBtn.addEventListener('click', () => { if (currentIndex < getMaxIndex()) { currentIndex++; updateTrack(); } });
window.addEventListener('resize', () => { currentIndex = Math.min(currentIndex, getMaxIndex()); updateTrack(); });

function openBlogModal(item) {
  blogModalCover.style.backgroundImage = item.coverUrl ? `url('${item.coverUrl}')` : '';
  blogModalTag.textContent     = item.tag;
  blogModalTitle.textContent   = item.title;
  blogModalSummary.textContent = item.summary || '';
  blogModalContent.innerHTML   = '';
  const paragraphs = (item.content || '').split(/\n\n+/).filter(Boolean);
  paragraphs.forEach(pText => {
    const pEl = document.createElement('p');
    const lines = pText.split('\n');
    lines.forEach((line, idx) => {
      pEl.appendChild(document.createTextNode(line));
      if (idx < lines.length - 1) pEl.appendChild(document.createElement('br'));
    });
    blogModalContent.appendChild(pEl);
  });
  blogModal.classList.add('open');
  blogModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeBlogModal() {
  blogModal.classList.remove('open');
  blogModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

blogModalClose.addEventListener('click', closeBlogModal);
blogModalBdrop.addEventListener('click', closeBlogModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBlogModal(); });

function buildInsightCard(item) {
  const bgStyle = item.coverUrl
    ? `style="background-image:url('${item.coverUrl}');background-size:cover;background-position:center;"`
    : '';
  return `<article class="insight-card" style="cursor:pointer;">
    <div class="insight-card__image" ${bgStyle}></div>
    <div class="insight-card__body">
      <span class="insight-card__tag">${item.tag}</span>
      <h3 class="insight-card__title">${item.title}</h3>
      <p class="insight-card__text">${item.summary || ''}</p>
    </div>
  </article>`;
}

async function loadInsights() {
  const snap = await getDocs(query(collection(db, 'blogs'), orderBy('createdAt', 'desc'), limit(6)));
  if (!snap.empty) {
    insightItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    track.innerHTML = insightItems.map(buildInsightCard).join('');
    track.querySelectorAll('.insight-card').forEach((el, i) => {
      el.addEventListener('click', () => openBlogModal(insightItems[i]));
    });
  }
  currentIndex = 0;
  updateTrack();
}

loadInsights();
