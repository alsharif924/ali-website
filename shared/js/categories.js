import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export const TYPES = ['images', 'videos', 'blogs', 'systems'];

export const SEED_DATA = {
  images: [
    { slug: 'portrait',   label_en: 'Portrait',   label_ar: 'بورتريه' },
    { slug: 'landscape',  label_en: 'Landscape',  label_ar: 'مناظر طبيعية' },
    { slug: 'concept',    label_en: 'Concept',    label_ar: 'مفاهيمي' },
  ],
  videos: [
    { slug: 'realistic',  label_en: 'Realistic',  label_ar: 'واقعي' },
    { slug: 'anime',      label_en: 'Anime',      label_ar: 'أنمي' },
    { slug: 'marketing',  label_en: 'Marketing',  label_ar: 'تسويقي' },
    { slug: 'cinematic',  label_en: 'Cinematic',  label_ar: 'سينمائي' },
  ],
  systems: [
    { slug: 'ai-systems', label_en: 'AI Systems', label_ar: 'أنظمة ذكاء اصطناعي' },
    { slug: 'websites',   label_en: 'Websites',   label_ar: 'مواقع إلكترونية' },
    { slug: 'dashboards', label_en: 'Dashboards', label_ar: 'لوحات تحكم' },
  ],
  blogs: [
    { slug: 'AI IMAGE',      label_en: 'AI Image',      label_ar: 'صور بالذكاء الاصطناعي' },
    { slug: 'AI VIDEO',      label_en: 'AI Video',      label_ar: 'فيديو بالذكاء الاصطناعي' },
    { slug: 'SMART SYSTEMS', label_en: 'Smart Systems', label_ar: 'الأنظمة الذكية' },
  ],
};

const ALL_LABELS = { en: 'All', ar: 'الكل' };

const cache = new Map();
let seedPromise = null;

function docId(type, slug) {
  return `${type}__${slug}`;
}

export function getLang() {
  return localStorage.getItem('lang') === 'ar' ? 'ar' : 'en';
}

export function labelOf(cat) {
  return cat['label_' + getLang()] || cat.label_en || cat.slug;
}

export async function seedIfEmpty() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const probe = await getDocs(query(collection(db, 'categories'), limit(1)));
    if (!probe.empty) return;
    const writes = [];
    for (const type of TYPES) {
      SEED_DATA[type].forEach((cat, i) => {
        writes.push(setDoc(doc(db, 'categories', docId(type, cat.slug)), {
          type,
          slug: cat.slug,
          label_en: cat.label_en,
          label_ar: cat.label_ar,
          order: i,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }));
      });
    }
    await Promise.all(writes);
  })();
  return seedPromise;
}

export async function getCategories(type, { forceRefresh = false } = {}) {
  if (!forceRefresh && cache.has(type)) return cache.get(type);
  const snap = await getDocs(query(collection(db, 'categories'), where('type', '==', type)));
  const list = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ao = a.order ?? 999, bo = b.order ?? 999;
      if (ao !== bo) return ao - bo;
      const at = a.createdAt?.seconds || 0, bt = b.createdAt?.seconds || 0;
      return at - bt;
    });
  cache.set(type, list);
  return list;
}

export function invalidateCache(type) {
  if (type) cache.delete(type);
  else cache.clear();
}

export async function getAllCategories() {
  const result = {};
  await Promise.all(TYPES.map(async t => { result[t] = await getCategories(t, { forceRefresh: true }); }));
  return result;
}

export async function createCategory(type, { slug, label_en, label_ar }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error('Slug must be lowercase letters, numbers, and dashes only.');
  }
  if (!label_en || !label_ar) {
    throw new Error('Both English and Arabic labels are required.');
  }
  const id = docId(type, slug);
  const existing = await getDoc(doc(db, 'categories', id));
  if (existing.exists()) {
    throw new Error('A category with this slug already exists.');
  }
  const list = await getCategories(type, { forceRefresh: true });
  const order = list.length;
  await setDoc(doc(db, 'categories', id), {
    type,
    slug,
    label_en: label_en.trim(),
    label_ar: label_ar.trim(),
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  invalidateCache(type);
}

export async function updateCategory(id, { label_en, label_ar, order }) {
  const patch = { updatedAt: serverTimestamp() };
  if (label_en !== undefined) patch.label_en = label_en.trim();
  if (label_ar !== undefined) patch.label_ar = label_ar.trim();
  if (order !== undefined) patch.order = Number(order);
  await updateDoc(doc(db, 'categories', id), patch);
  invalidateCache();
}

export async function deleteCategory(id) {
  await deleteDoc(doc(db, 'categories', id));
  invalidateCache();
}

export async function countItemsUsingCategory(type, slug) {
  const snap = await getDocs(query(collection(db, type), where('tag', '==', slug)));
  return snap.size;
}

function makeFilterBtn(filter, label, isActive) {
  const btn = document.createElement('button');
  btn.className = 'filter-btn' + (isActive ? ' filter-btn--active' : '');
  btn.dataset.filter = filter;
  btn.textContent = label;
  return btn;
}

export async function renderFilterButtons(containerEl, type, { onChange, allKey } = {}) {
  if (!containerEl) return;
  const cats = await getCategories(type);
  const render = () => {
    const activeFilter = containerEl.dataset.activeFilter || 'all';
    containerEl.innerHTML = '';
    const allBtn = makeFilterBtn('all', ALL_LABELS[getLang()], activeFilter === 'all');
    if (allKey) allBtn.setAttribute('data-i18n', allKey);
    containerEl.appendChild(allBtn);
    cats.forEach(cat => {
      containerEl.appendChild(makeFilterBtn(cat.slug, labelOf(cat), activeFilter === cat.slug));
    });
    containerEl.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        containerEl.dataset.activeFilter = btn.dataset.filter;
        containerEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
        btn.classList.add('filter-btn--active');
        if (typeof onChange === 'function') onChange(btn.dataset.filter);
      });
    });
  };
  render();
  document.addEventListener('langchange', render);
}

export async function renderTagSelector(containerEl, type, hiddenInput) {
  if (!containerEl) return;
  const cats = await getCategories(type);
  const render = () => {
    const selected = hiddenInput?.value || '';
    containerEl.innerHTML = '';
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-btn' + (selected === cat.slug ? ' tag-btn--selected' : '');
      btn.dataset.tag = cat.slug;
      btn.textContent = labelOf(cat);
      btn.addEventListener('click', () => {
        containerEl.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('tag-btn--selected'));
        btn.classList.add('tag-btn--selected');
        if (hiddenInput) hiddenInput.value = cat.slug;
        containerEl.classList.remove('invalid');
      });
      containerEl.appendChild(btn);
    });
  };
  render();
  document.addEventListener('langchange', render);
}
