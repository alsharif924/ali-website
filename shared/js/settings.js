import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const HOME_DOC = doc(db, 'settings', 'home');
let cachedHome = null;

export async function getHomeSettings({ forceRefresh = false } = {}) {
  if (!forceRefresh && cachedHome) return cachedHome;
  try {
    const snap = await getDoc(HOME_DOC);
    cachedHome = snap.exists() ? snap.data() : {};
  } catch (err) {
    console.error('getHomeSettings failed', err);
    cachedHome = {};
  }
  return cachedHome;
}

export async function setHomeCover(field, url) {
  if (!['cover_image', 'cover_video', 'cover_systems'].includes(field)) {
    throw new Error('Invalid cover field: ' + field);
  }
  await setDoc(HOME_DOC, { [field]: url, updatedAt: serverTimestamp() }, { merge: true });
  cachedHome = null;
}
