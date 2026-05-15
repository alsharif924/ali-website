import { db } from '../../../shared/js/firebase-config.js';
import { requireAuth, signOut } from '../../../shared/js/firebase-auth.js';
import { uploadMedia } from '../../../shared/js/cloudinary.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { seedIfEmpty, renderTagSelector } from '../../../shared/js/categories.js';

const thumbInput       = document.getElementById('thumbInput');
const thumbUpload      = document.getElementById('thumbUpload');
const thumbPreview     = document.getElementById('thumbPreview');
const thumbRemove      = document.getElementById('thumbRemove');
const thumbPlaceholder = document.getElementById('thumbPlaceholder');

const videoUrlInput    = document.getElementById('videoUrl');
const videoFileInput   = document.getElementById('videoFileInput');
const fileUpload       = document.getElementById('fileUpload');
const videoFileInfo    = document.getElementById('videoFileInfo');

const titleInput  = document.getElementById('videoTitle');
const titleCount  = document.getElementById('titleCount');
const descInput   = document.getElementById('videoDesc');
const descCount   = document.getElementById('descCount');
const tagSelector = document.getElementById('tagSelector');
const selectedTag = document.getElementById('selectedTag');
const orientationSelector = document.getElementById('orientationSelector');
const selectedOrientation = document.getElementById('selectedOrientation');
const DEFAULT_ORIENTATION = 'landscape';
const clearBtn    = document.getElementById('clearBtn');
const videoForm   = document.getElementById('videoForm');
const formToast   = document.getElementById('formToast');

function setOrientation(value) {
  selectedOrientation.value = value;
  orientationSelector.querySelectorAll('.tag-btn').forEach(b => {
    b.classList.toggle('tag-btn--selected', b.dataset.orientation === value);
  });
  orientationSelector.classList.remove('invalid');
}

orientationSelector.querySelectorAll('.tag-btn').forEach(btn => {
  btn.addEventListener('click', () => setOrientation(btn.dataset.orientation));
});

setOrientation(DEFAULT_ORIENTATION);
const sourceTabs  = document.getElementById('sourceTabs');
const panelUrl    = document.getElementById('panelUrl');
const panelFile   = document.getElementById('panelFile');

let activeSource = 'url';

// Source tab switching
sourceTabs.querySelectorAll('.source-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    sourceTabs.querySelectorAll('.source-tab').forEach(t => t.classList.remove('source-tab--active'));
    tab.classList.add('source-tab--active');
    activeSource = tab.dataset.tab;
    if (activeSource === 'url') {
      panelUrl.classList.remove('source-panel--hidden');
      panelFile.classList.add('source-panel--hidden');
    } else {
      panelFile.classList.remove('source-panel--hidden');
      panelUrl.classList.add('source-panel--hidden');
    }
    videoUrlInput.classList.remove('invalid');
    fileUpload.classList.remove('invalid');
  });
});

// Thumbnail upload
thumbUpload.addEventListener('click', (e) => {
  if (e.target === thumbRemove || thumbRemove.contains(e.target)) return;
  thumbInput.click();
});

thumbInput.addEventListener('change', () => {
  if (thumbInput.files[0]) loadThumb(thumbInput.files[0]);
});

function loadThumb(file) {
  if (file.size > 10 * 1024 * 1024) {
    showToast('Thumbnail exceeds 10 MB — Cloudinary free plan limit.', 'error');
    thumbInput.value = '';
    return;
  }
  const url = URL.createObjectURL(file);
  thumbPreview.src = url;
  thumbPreview.classList.add('visible');
  thumbPlaceholder.style.display = 'none';
  thumbRemove.hidden = false;
  thumbUpload.classList.remove('invalid');
}

thumbRemove.addEventListener('click', (e) => {
  e.stopPropagation();
  thumbInput.value = '';
  thumbPreview.src = '';
  thumbPreview.classList.remove('visible');
  thumbPlaceholder.style.display = '';
  thumbRemove.hidden = true;
});

// Video file drag & drop
fileUpload.addEventListener('click', () => videoFileInput.click());
fileUpload.addEventListener('dragover', (e) => { e.preventDefault(); fileUpload.classList.add('drag-over'); });
fileUpload.addEventListener('dragleave', () => fileUpload.classList.remove('drag-over'));
fileUpload.addEventListener('drop', (e) => {
  e.preventDefault();
  fileUpload.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('video/')) setVideoFile(file);
});
videoFileInput.addEventListener('change', () => {
  if (videoFileInput.files[0]) setVideoFile(videoFileInput.files[0]);
});

function setVideoFile(file) {
  if (file.size > 100 * 1024 * 1024) {
    showToast('Video exceeds 100 MB — Cloudinary free plan limit.', 'error');
    videoFileInput.value = '';
    videoFileInfo.textContent = '';
    return;
  }
  const mb = (file.size / 1048576).toFixed(1);
  videoFileInfo.textContent = `${file.name} — ${mb} MB`;
  fileUpload.classList.remove('invalid');
}

// Character counters
titleInput.addEventListener('input', () => {
  titleCount.textContent = `${titleInput.value.length} / 80`;
});

descInput.addEventListener('input', () => {
  descCount.textContent = `${descInput.value.length} / 200`;
});

// Category selection (populated from Firestore categories)
seedIfEmpty().then(() => renderTagSelector(tagSelector, 'videos', selectedTag));

// Clear form
clearBtn.addEventListener('click', () => {
  videoForm.reset();
  titleCount.textContent = '0 / 80';
  descCount.textContent = '0 / 200';
  selectedTag.value = '';
  tagSelector.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('tag-btn--selected'));
  setOrientation(DEFAULT_ORIENTATION);
  thumbInput.value = '';
  thumbPreview.src = '';
  thumbPreview.classList.remove('visible');
  thumbPlaceholder.style.display = '';
  thumbRemove.hidden = true;
  videoFileInput.value = '';
  videoFileInfo.textContent = '';
  activeSource = 'url';
  sourceTabs.querySelectorAll('.source-tab').forEach((t, i) => t.classList.toggle('source-tab--active', i === 0));
  panelUrl.classList.remove('source-panel--hidden');
  panelFile.classList.add('source-panel--hidden');
  hideToast();
  [titleInput, descInput, videoUrlInput].forEach(el => el.classList.remove('invalid'));
  thumbUpload.classList.remove('invalid');
  fileUpload.classList.remove('invalid');
  tagSelector.classList.remove('invalid');
});

// Submit
videoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const submitBtn = videoForm.querySelector('[type="submit"]');
  const origHTML  = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading…';

  try {
    const thumbnailUrl = await uploadMedia(thumbInput.files[0], 'image');

    let videoUrl = '';
    if (activeSource === 'url') {
      videoUrl = videoUrlInput.value.trim();
    } else {
      videoUrl = await uploadMedia(videoFileInput.files[0], 'video');
    }

    await addDoc(collection(db, 'videos'), {
      title:        titleInput.value.trim(),
      tag:          selectedTag.value,
      orientation:  selectedOrientation.value || DEFAULT_ORIENTATION,
      description:  descInput.value.trim(),
      thumbnailUrl,
      videoUrl,
      createdAt:    serverTimestamp(),
    });
    showToast('Video published successfully!', 'success');
    clearBtn.click();
  } catch (err) {
    console.error(err);
    showToast('Upload failed. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = origHTML;
  }
});

function validate() {
  let valid = true;

  if (!thumbInput.files[0]) { thumbUpload.classList.add('invalid'); valid = false; }
  else thumbUpload.classList.remove('invalid');

  if (activeSource === 'url') {
    if (!videoUrlInput.value.trim()) { videoUrlInput.classList.add('invalid'); valid = false; }
    else videoUrlInput.classList.remove('invalid');
  } else {
    if (!videoFileInput.files[0]) { fileUpload.classList.add('invalid'); valid = false; }
    else fileUpload.classList.remove('invalid');
  }

  if (!titleInput.value.trim()) { titleInput.classList.add('invalid'); valid = false; }
  else titleInput.classList.remove('invalid');

  if (!selectedTag.value) { tagSelector.classList.add('invalid'); valid = false; }
  else tagSelector.classList.remove('invalid');

  if (!selectedOrientation.value) { orientationSelector.classList.add('invalid'); valid = false; }
  else orientationSelector.classList.remove('invalid');

  if (!descInput.value.trim()) { descInput.classList.add('invalid'); valid = false; }
  else descInput.classList.remove('invalid');

  if (!valid) showToast('Please fill in all required fields.', 'error');
  return valid;
}

function showToast(msg, type) {
  formToast.textContent = msg;
  formToast.className = `form-toast form-toast--${type}`;
  formToast.hidden = false;
  if (type === 'success') setTimeout(hideToast, 4000);
}

function hideToast() {
  formToast.hidden = true;
  formToast.textContent = '';
}

document.getElementById('signOutBtn').addEventListener('click', signOut);
requireAuth();
