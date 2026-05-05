import { auth } from '../../../shared/js/firebase-config.js';
import { onAuthStateChanged, ALLOWED, DASH_URL, signInWithGoogle } from '../../../shared/js/firebase-auth.js';
import { signOut as fbSignOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const googleSignInBtn = document.getElementById('googleSignIn');
const errorEl         = document.getElementById('loginError');
const origBtnHTML     = googleSignInBtn.innerHTML;

// Redirect already-authenticated allowed users straight to dashboard
onAuthStateChanged(auth, user => {
  if (user && ALLOWED.includes(user.email)) {
    window.location.replace(DASH_URL);
  }
});

googleSignInBtn.addEventListener('click', async () => {
  googleSignInBtn.disabled = true;
  googleSignInBtn.textContent = 'Signing in…';
  errorEl.hidden = true;

  try {
    const user = await signInWithGoogle();
    if (ALLOWED.includes(user.email)) {
      window.location.replace(DASH_URL);
    } else {
      await fbSignOut(auth); // sign out without redirect
      errorEl.textContent = `${user.email} is not authorized. Contact the site owner for access.`;
      errorEl.hidden = false;
      googleSignInBtn.disabled = false;
      googleSignInBtn.innerHTML = origBtnHTML;
    }
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      errorEl.textContent = 'Sign-in failed. Please try again.';
      errorEl.hidden = false;
    }
    googleSignInBtn.disabled = false;
    googleSignInBtn.innerHTML = origBtnHTML;
  }
});
