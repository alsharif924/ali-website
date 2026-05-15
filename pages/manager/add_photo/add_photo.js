import { db } from '../../../shared/js/firebase-config.js';
import { requireAuth, signOut } from '../../../shared/js/firebase-auth.js';
import { uploadMedia } from '../../../shared/js/cloudinary.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { seedIfEmpty, renderTagSelector } from '../../../shared/js/categories.js';

const imageInput       = document.getElementById('imageInput');
const imageUpload      = document.getElementById('imageUpload');
const imagePreview     = document.getElementById('imagePreview');
const imageRemove      = document.getElementById('imageRemove');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const fileInfo         = document.getElementById('fileInfo');

const titleInput  = document.getElementById('photoTitle');
const titleCount  = document.getElementById('titleCount');
const descInput   = document.getElementById('photoDesc');
const descCount   = document.getElementById('descCount');
const tagSelector = document.getElementById('tagSelector');
const selectedTag = document.getElementById('selectedTag');
const orientationSelector = document.getElementById('orientationSelector');
const selectedOrientation = document.getElementById('selectedOrientation');
const DEFAULT_ORIENTATION = 'portrait';
const clearBtn    = document.getElementById('clearBtn');
const photoForm   = document.getElementById('photoForm');
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

// Click to upload
imageUpload.addEventListener('click', (e) => {
  if (e.target === imageRemove || imageRemove.contains(e.target)) return;
  imageInput.click();
});

// Drag & drop
imageUpload.addEventListener('dragover', (e) => {
  e.preventDefault();
  imageUpload.classList.add('drag-over');
});
imageUpload.addEventListener('dragleave', () => imageUpload.classList.remove('drag-over'));
imageUpload.addEventListener('drop', (e) => {
  e.preventDefault();
  imageUpload.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadPreview(file);
});

imageInput.addEventListener('change', () => {
  if (imageInput.files[0]) loadPreview(imageInput.files[0]);
});

function loadPreview(file) {
  if (file.size > 10 * 1024 * 1024) {
    showToast('Image exceeds 10 MB — Cloudinary free plan limit.', 'error');
    imageInput.value = '';
    return;
  }
  const url = URL.createObjectURL(file);
  imagePreview.src = url;
  imagePreview.classList.add('visible');
  imagePlaceholder.style.display = 'none';
  imageRemove.hidden = false;
  imageUpload.classList.remove('invalid');
  const kb = (file.size / 1024).toFixed(0);
  const mb = (file.size / 1048576).toFixed(2);
  fileInfo.textContent = `${file.name} — ${mb > 1 ? mb + ' MB' : kb + ' KB'}`;
}

imageRemove.addEventListener('click', (e) => {
  e.stopPropagation();
  imageInput.value = '';
  imagePreview.src = '';
  imagePreview.classList.remove('visible');
  imagePlaceholder.style.display = '';
  imageRemove.hidden = true;
  fileInfo.textContent = '';
});

// Character counters
titleInput.addEventListener('input', () => {
  titleCount.textContent = `${titleInput.value.length} / 80`;
});

descInput.addEventListener('input', () => {
  descCount.textContent = `${descInput.value.length} / 200`;
});

// Tag selection (populated from Firestore categories)
seedIfEmpty().then(() => renderTagSelector(tagSelector, 'images', selectedTag));

// Clear form
clearBtn.addEventListener('click', () => {
  photoForm.reset();
  titleCount.textContent = '0 / 80';
  descCount.textContent = '0 / 200';
  selectedTag.value = '';
  tagSelector.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('tag-btn--selected'));
  setOrientation(DEFAULT_ORIENTATION);
  imageInput.value = '';
  imagePreview.src = '';
  imagePreview.classList.remove('visible');
  imagePlaceholder.style.display = '';
  imageRemove.hidden = true;
  fileInfo.textContent = '';
  hideToast();
  titleInput.classList.remove('invalid');
  imageUpload.classList.remove('invalid');
  tagSelector.classList.remove('invalid');
});

// Submit
photoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const submitBtn = photoForm.querySelector('[type="submit"]');
  const origHTML  = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading…';

  try {
    const imageUrl = await uploadMedia(imageInput.files[0], 'image');
    await addDoc(collection(db, 'images'), {
      title:       titleInput.value.trim(),
      tag:         selectedTag.value,
      orientation: selectedOrientation.value || DEFAULT_ORIENTATION,
      description: descInput.value.trim(),
      imageUrl,
      createdAt:   serverTimestamp(),
    });
    showToast('Photo uploaded successfully!', 'success');
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

  if (!imageInput.files[0]) {
    imageUpload.classList.add('invalid');
    valid = false;
  } else {
    imageUpload.classList.remove('invalid');
  }

  if (!titleInput.value.trim()) {
    titleInput.classList.add('invalid');
    valid = false;
  } else {
    titleInput.classList.remove('invalid');
  }

  if (!selectedTag.value) {
    tagSelector.classList.add('invalid');
    valid = false;
  } else {
    tagSelector.classList.remove('invalid');
  }

  if (!selectedOrientation.value) {
    orientationSelector.classList.add('invalid');
    valid = false;
  } else {
    orientationSelector.classList.remove('invalid');
  }

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
