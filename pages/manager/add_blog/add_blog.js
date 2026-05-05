import { db } from '../../../shared/js/firebase-config.js';
import { requireAuth, signOut } from '../../../shared/js/firebase-auth.js';
import { uploadMedia } from '../../../shared/js/cloudinary.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const coverInput       = document.getElementById('coverInput');
const coverUpload      = document.getElementById('coverUpload');
const coverPreview     = document.getElementById('coverPreview');
const coverRemove      = document.getElementById('coverRemove');
const coverPlaceholder = document.getElementById('coverPlaceholder');

const titleInput   = document.getElementById('postTitle');
const titleCount   = document.getElementById('titleCount');
const summaryInput = document.getElementById('postSummary');
const summaryCount = document.getElementById('summaryCount');
const contentInput = document.getElementById('postContent');
const contentCount = document.getElementById('contentCount');
const tagSelector  = document.getElementById('tagSelector');
const selectedTag  = document.getElementById('selectedTag');
const clearBtn     = document.getElementById('clearBtn');
const blogForm     = document.getElementById('blogForm');
const formToast    = document.getElementById('formToast');

// Cover image upload
coverUpload.addEventListener('click', (e) => {
  if (e.target === coverRemove || coverRemove.contains(e.target)) return;
  coverInput.click();
});

coverInput.addEventListener('change', () => {
  const file = coverInput.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    showToast('Image exceeds 10 MB — Cloudinary free plan limit.', 'error');
    coverInput.value = '';
    return;
  }
  const url = URL.createObjectURL(file);
  coverPreview.src = url;
  coverPreview.classList.add('visible');
  coverPlaceholder.style.display = 'none';
  coverRemove.hidden = false;
});

coverRemove.addEventListener('click', (e) => {
  e.stopPropagation();
  coverInput.value = '';
  coverPreview.src = '';
  coverPreview.classList.remove('visible');
  coverPlaceholder.style.display = '';
  coverRemove.hidden = true;
});

// Character counters
titleInput.addEventListener('input', () => {
  titleCount.textContent = `${titleInput.value.length} / 120`;
});

summaryInput.addEventListener('input', () => {
  summaryCount.textContent = `${summaryInput.value.length} / 200`;
});

contentInput.addEventListener('input', () => {
  contentCount.textContent = `${contentInput.value.length} characters`;
});

// Tag selection
tagSelector.querySelectorAll('.tag-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    tagSelector.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('tag-btn--selected'));
    btn.classList.add('tag-btn--selected');
    selectedTag.value = btn.dataset.tag;
    tagSelector.classList.remove('invalid');
  });
});

// Clear form
clearBtn.addEventListener('click', () => {
  blogForm.reset();
  titleCount.textContent = '0 / 120';
  summaryCount.textContent = '0 / 200';
  contentCount.textContent = '0 characters';
  selectedTag.value = '';
  tagSelector.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('tag-btn--selected'));
  coverInput.value = '';
  coverPreview.src = '';
  coverPreview.classList.remove('visible');
  coverPlaceholder.style.display = '';
  coverRemove.hidden = true;
  hideToast();
  [titleInput, summaryInput, contentInput].forEach(el => el.classList.remove('invalid'));
  tagSelector.classList.remove('invalid');
});

// Submit
blogForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const submitBtn = blogForm.querySelector('[type="submit"]');
  const origHTML  = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Publishing…';

  try {
    let coverUrl = '';
    if (coverInput.files[0]) {
      coverUrl = await uploadMedia(coverInput.files[0], 'image');
    }

    await addDoc(collection(db, 'blogs'), {
      title:     titleInput.value.trim(),
      tag:       selectedTag.value,
      summary:   summaryInput.value.trim(),
      content:   contentInput.value.trim(),
      coverUrl,
      createdAt: serverTimestamp(),
    });
    showToast('Post published successfully!', 'success');
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

  [titleInput, summaryInput, contentInput].forEach(el => {
    if (!el.value.trim()) { el.classList.add('invalid'); valid = false; }
    else el.classList.remove('invalid');
  });

  if (!selectedTag.value) { tagSelector.classList.add('invalid'); valid = false; }
  else tagSelector.classList.remove('invalid');

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
