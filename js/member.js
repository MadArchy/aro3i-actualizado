(function () {
  var ACCOUNTS_KEY = 'aro_member_accounts_v1';
  var SESSION_KEY = 'aro_member_session_v1';
  var googleButtonsInitialized = false;
  var googleGsiAppInitialized = false;

  function closeMobileNav() {
    if (typeof window.ARO_closeMobileNav === 'function') window.ARO_closeMobileNav();
  }

  function getGoogleClientId() {
    if (typeof window.ARO_GOOGLE_CLIENT_ID === 'string' && window.ARO_GOOGLE_CLIENT_ID.trim()) {
      return window.ARO_GOOGLE_CLIENT_ID.trim();
    }
    var meta = document.querySelector('meta[name="aro-google-client-id"]');
    return meta && meta.getAttribute('content') ? meta.getAttribute('content').trim() : '';
  }

  function parseJwtPayload(token) {
    try {
      var parts = token.split('.');
      if (parts.length < 2) return null;
      var base64Url = parts[1];
      var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      var json = decodeURIComponent(
        atob(base64)
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function encodePw(p) {
    try {
      return btoa(unescape(encodeURIComponent(p)));
    } catch (e) {
      return '';
    }
  }

  function loadAccounts() {
    try {
      var raw = localStorage.getItem(ACCOUNTS_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveAccounts(arr) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(arr));
  }

  function getSessionEmail() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return o && o.email ? String(o.email).trim() : null;
    } catch (e) {
      return null;
    }
  }

  function setSessionEmail(email) {
    if (!email) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: email }));
  }

  function getAccountByEmail(email) {
    var lower = email.toLowerCase();
    var accounts = loadAccounts();
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].email && accounts[i].email.toLowerCase() === lower) {
        return accounts[i];
      }
    }
    return null;
  }

  function isPasswordAccount(acc) {
    return acc && acc.pwKey && String(acc.pwKey).length > 0;
  }

  function isGoogleAccount(acc) {
    return acc && acc.provider === 'google';
  }

  var MOCK_GOOGLE_EMAIL = 'guest.demo@aro.app';
  var MOCK_GOOGLE_NAME = 'Demo Google User';
  var MOCK_GOOGLE_SUB = 'mock_google_demo_sub';

  function finalizeGoogleStyleSignIn(email, name, googleSub) {
    var emailTrim = String(email).trim();
    if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      window.alert('Invalid email.');
      return;
    }
    var nameTrim = name ? String(name).trim() : '';
    var sub = googleSub ? String(googleSub) : '';

    var existing = getAccountByEmail(emailTrim);
    if (existing && isPasswordAccount(existing) && !isGoogleAccount(existing)) {
      window.alert('This email is registered with a password. Use Sign in with email and password below.');
      return;
    }

    if (existing) {
      var accounts = loadAccounts();
      for (var i = 0; i < accounts.length; i++) {
        if (accounts[i].email.toLowerCase() === emailTrim.toLowerCase()) {
          if (nameTrim) accounts[i].name = nameTrim;
          if (sub) accounts[i].googleSub = sub;
          accounts[i].provider = 'google';
          break;
        }
      }
      saveAccounts(accounts);
    } else {
      var tier = selectedTierFromOverview();
      var accountsNew = loadAccounts();
      accountsNew.push({
        email: emailTrim,
        name: nameTrim,
        pwKey: '',
        provider: 'google',
        googleSub: sub,
        tier: tier,
        subscribedAt: new Date().toISOString(),
      });
      saveAccounts(accountsNew);
    }

    setSessionEmail(emailTrim);
    fillAccountView(emailTrim);
    showMemberView('account');
    syncNavCta();
  }

  function onGoogleCredentialResponse(resp) {
    if (!resp || !resp.credential) return;
    var payload = parseJwtPayload(resp.credential);
    if (!payload || !payload.email) {
      window.alert('Could not read your Google account. Please try again.');
      return;
    }
    if (payload.email_verified === false) {
      window.alert('Please use a verified Google account email.');
      return;
    }
    var email = String(payload.email).trim();
    var name = payload.name ? String(payload.name).trim() : '';
    var sub = payload.sub ? String(payload.sub) : '';
    finalizeGoogleStyleSignIn(email, name, sub);
  }

  function renderGoogleButtons() {
    var clientId = getGoogleClientId();
    var hint = document.getElementById('member-google-config-hint');
    var wraps = [
      document.getElementById('member-google-btn-wrap'),
      document.getElementById('member-google-btn-wrap-signin'),
    ];

    if (!clientId) {
      if (hint) hint.setAttribute('hidden', 'hidden');
      wraps.forEach(function (w) {
        if (w) {
          w.innerHTML = '';
          w.setAttribute('aria-hidden', 'true');
        }
      });
      return;
    }

    if (hint) hint.setAttribute('hidden', 'hidden');

    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
      return;
    }

    if (!googleGsiAppInitialized) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: onGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      googleGsiAppInitialized = true;
    }

    wraps.forEach(function (wrap) {
      if (!wrap) return;
      wrap.innerHTML = '';
      wrap.setAttribute('aria-hidden', 'false');
      var w = wrap.getBoundingClientRect().width;
      if (!w || w < 120) w = 400;
      google.accounts.id.renderButton(wrap, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: Math.min(400, Math.floor(w)),
      });
    });

    googleButtonsInitialized = true;
  }

  function tryInitGoogleButtons() {
    if (googleButtonsInitialized && getGoogleClientId()) return;
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
      return;
    }
    renderGoogleButtons();
  }

  function selectedTierFromOverview() {
    var el = document.querySelector('input[name="member-tier-pick"]:checked');
    return el && el.value === 'plus' ? 'plus' : 'standard';
  }

  function closeCatalogIfOpen() {
    var catRoot = document.getElementById('catalog-root');
    if (catRoot && catRoot.classList.contains('is-open')) {
      catRoot.classList.remove('is-open');
      catRoot.setAttribute('aria-hidden', 'true');
    }
  }

  function closeBagIfOpen() {
    var shopRoot = document.getElementById('shop-root');
    if (shopRoot && shopRoot.classList.contains('is-open')) {
      shopRoot.classList.remove('is-open');
      shopRoot.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      var navBtn = document.getElementById('nav-cart-toggle');
      if (navBtn) navBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function showMemberView(id) {
    ['overview', 'signin', 'register', 'account'].forEach(function (v) {
      var el = document.getElementById('member-view-' + v);
      if (el) el.classList.toggle('is-hidden', v !== id);
    });
    var title = document.getElementById('member-title');
    if (title) {
      if (id === 'signin') title.textContent = 'Sign in';
      else if (id === 'register') title.textContent = 'Create account';
      else if (id === 'account') title.textContent = 'Your membership';
      else title.textContent = 'Membership';
    }
  }

  function openMember() {
    closeMobileNav();
    closeCatalogIfOpen();
    closeBagIfOpen();
    var root = document.getElementById('member-root');
    if (!root) return;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    var email = getSessionEmail();
    if (email && !getAccountByEmail(email)) {
      setSessionEmail(null);
      email = null;
    }
    if (email && getAccountByEmail(email)) {
      fillAccountView(email);
      showMemberView('account');
    } else {
      showMemberView('overview');
    }
    syncRegTierLabel();
    window.setTimeout(function () {
      tryInitGoogleButtons();
    }, 0);
    var closeBtn = document.getElementById('member-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeMember() {
    var root = document.getElementById('member-root');
    if (!root) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function syncRegTierLabel() {
    var tier = selectedTierFromOverview();
    var label = document.getElementById('member-reg-tier-label');
    if (label) {
      label.textContent = tier === 'plus' ? 'Plus' : 'Standard';
    }
  }

  function fillAccountView(email) {
    var acc = getAccountByEmail(email);
    var emEl = document.getElementById('member-account-email');
    if (emEl) emEl.textContent = email;
    var nameWrap = document.getElementById('member-account-name-wrap');
    var nameEl = document.getElementById('member-account-name');
    if (acc && acc.name) {
      if (nameEl) nameEl.textContent = acc.name;
      if (nameWrap) nameWrap.style.display = '';
    } else {
      if (nameWrap) nameWrap.style.display = 'none';
    }
    var tier = acc && acc.tier === 'plus' ? 'plus' : 'standard';
    document.querySelectorAll('.member-tier-account-input').forEach(function (inp) {
      inp.checked = inp.value === tier;
    });
  }

  function syncNavCta() {
    var label = document.getElementById('nav-member-cta-label');
    var email = getSessionEmail();
    if (!label) return;
    if (!email || !getAccountByEmail(email)) {
      label.textContent = 'Member';
      return;
    }
    var acc = getAccountByEmail(email);
    if (acc && acc.name) {
      var first = acc.name.split(/\s+/)[0];
      label.textContent = first.length > 12 ? first.slice(0, 11) + '…' : first;
    } else {
      var local = email.split('@')[0];
      label.textContent = local.length > 14 ? local.slice(0, 13) + '…' : local;
    }
  }

  function onSignInSubmit(e) {
    e.preventDefault();
    var emailEl = document.getElementById('member-si-email');
    var pwEl = document.getElementById('member-si-password');
    var email = emailEl && emailEl.value ? emailEl.value.trim() : '';
    var pw = pwEl && pwEl.value ? pwEl.value : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      window.alert('Please enter a valid email.');
      return;
    }
    if (pw.length < 8) {
      window.alert('Password must be at least 8 characters.');
      return;
    }
    var acc = getAccountByEmail(email);
    if (!acc) {
      window.alert('No account found for that email. Create an account first.');
      return;
    }
    if (isGoogleAccount(acc) || !isPasswordAccount(acc)) {
      window.alert('This account uses Google. Use Continue with Google above.');
      return;
    }
    if (acc.pwKey !== encodePw(pw)) {
      window.alert('Incorrect password.');
      return;
    }
    setSessionEmail(email);
    fillAccountView(email);
    showMemberView('account');
    syncNavCta();
    if (emailEl) emailEl.value = '';
    if (pwEl) pwEl.value = '';
  }

  function onRegisterSubmit(e) {
    e.preventDefault();
    var nameEl = document.getElementById('member-reg-name');
    var emailEl = document.getElementById('member-reg-email');
    var pwEl = document.getElementById('member-reg-password');
    var pw2El = document.getElementById('member-reg-password2');
    var name = nameEl && nameEl.value ? nameEl.value.trim() : '';
    var email = emailEl && emailEl.value ? emailEl.value.trim() : '';
    var pw = pwEl && pwEl.value ? pwEl.value : '';
    var pw2 = pw2El && pw2El.value ? pw2El.value : '';
    if (!name) {
      window.alert('Please enter your name.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      window.alert('Please enter a valid email.');
      return;
    }
    if (pw.length < 8) {
      window.alert('Password must be at least 8 characters.');
      return;
    }
    if (pw !== pw2) {
      window.alert('Passwords do not match.');
      return;
    }
    var existingReg = getAccountByEmail(email);
    if (existingReg) {
      if (isGoogleAccount(existingReg)) {
        window.alert('This email is linked to Google. Use Continue with Google to sign in.');
      } else {
        window.alert('An account with this email already exists. Sign in instead.');
      }
      return;
    }
    var tier = selectedTierFromOverview();
    var accounts = loadAccounts();
    accounts.push({
      email: email,
      name: name,
      pwKey: encodePw(pw),
      provider: 'local',
      tier: tier,
      subscribedAt: new Date().toISOString(),
    });
    saveAccounts(accounts);
    setSessionEmail(email);
    fillAccountView(email);
    showMemberView('account');
    syncNavCta();
    if (nameEl) nameEl.value = '';
    if (emailEl) emailEl.value = '';
    if (pwEl) pwEl.value = '';
    if (pw2El) pw2El.value = '';
  }

  function onSaveTier() {
    var email = getSessionEmail();
    if (!email) return;
    var acc = getAccountByEmail(email);
    if (!acc) return;
    var inp = document.querySelector('input[name="member-tier-account"]:checked');
    var tier = inp && inp.value === 'plus' ? 'plus' : 'standard';
    var accounts = loadAccounts();
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].email.toLowerCase() === email.toLowerCase()) {
        accounts[i].tier = tier;
        break;
      }
    }
    saveAccounts(accounts);
    window.alert('Plan updated (demo — no charge).');
  }

  function onSignOut() {
    setSessionEmail(null);
    showMemberView('overview');
    syncNavCta();
  }

  document.addEventListener('DOMContentLoaded', function () {
    syncNavCta();

    document.body.addEventListener(
      'click',
      function (e) {
        if (e.target.closest('[data-member-open]')) {
          e.preventDefault();
          e.stopPropagation();
          openMember();
          return;
        }
      },
      true
    );

    document.body.addEventListener('click', function (e) {
      if (e.target.closest('[data-member-close]') || e.target.closest('#member-close')) {
        e.preventDefault();
        closeMember();
        return;
      }

      var viewBtn = e.target.closest('[data-member-view]');
      if (viewBtn) {
        e.preventDefault();
        var v = viewBtn.getAttribute('data-member-view');
        if (v === 'overview') {
          showMemberView('overview');
          syncRegTierLabel();
        } else if (v === 'signin') {
          showMemberView('signin');
        } else if (v === 'register') {
          syncRegTierLabel();
          showMemberView('register');
        }
        return;
      }

      if (e.target.closest('[data-member-google-mock]')) {
        e.preventDefault();
        finalizeGoogleStyleSignIn(MOCK_GOOGLE_EMAIL, MOCK_GOOGLE_NAME, MOCK_GOOGLE_SUB);
        return;
      }
    });

    document.querySelectorAll('input[name="member-tier-pick"]').forEach(function (inp) {
      inp.addEventListener('change', syncRegTierLabel);
    });

    var formSi = document.getElementById('member-form-signin');
    if (formSi) formSi.addEventListener('submit', onSignInSubmit);

    var formReg = document.getElementById('member-form-register');
    if (formReg) formReg.addEventListener('submit', onRegisterSubmit);

    var saveTier = document.getElementById('member-save-tier');
    if (saveTier) saveTier.addEventListener('click', onSaveTier);

    var signOut = document.getElementById('member-sign-out');
    if (signOut) signOut.addEventListener('click', onSignOut);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var root = document.getElementById('member-root');
      if (root && root.classList.contains('is-open')) closeMember();
    });

    function waitForGsi() {
      var n = 0;
      var t = window.setInterval(function () {
        n += 1;
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
          window.clearInterval(t);
          tryInitGoogleButtons();
        } else if (n > 80) {
          window.clearInterval(t);
        }
      }, 100);
    }
    waitForGsi();
    window.addEventListener('load', function () {
      tryInitGoogleButtons();
    });
  });
})();
