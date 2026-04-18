(function () {
  var successTimer;
  var STORAGE_KEY = 'aro_cart_v1';
  var CATALOG = {
    floss: {
      name: 'ARO-FLOSS',
      priceCents: 1800,
      tagline: 'Vitamin-coated floss pick',
      blurb: 'Floss your teeth and feed your body in the same daily habit.',
      available: true,
      accent: 'floss',
    },
    pick: {
      name: 'ARO-PIK',
      priceCents: 2200,
      tagline: 'Precision gingival strip',
      blurb: '30 seconds at the gumline for targeted, high-absorption delivery.',
      available: true,
      accent: 'pick',
    },
    flow: {
      name: 'ARO-FLO',
      priceCents: 3200,
      tagline: 'Drinkable multivitamin shot',
      blurb: 'A complete multivitamin in one quick, great-tasting sip.',
      available: false,
      accent: 'flow',
    },
    ez: {
      name: 'ARO-EZ',
      priceCents: 2800,
      tagline: 'Pills reinvented',
      blurb: 'Smaller, smoother, pleasant pills you will actually take every day.',
      available: false,
      accent: 'ez',
    },
    fuel: {
      name: 'ARO-FUEL',
      priceCents: 4500,
      tagline: 'Protein + multivitamin',
      blurb: 'Clean protein fused with a full daily vitamin matrix in one scoop.',
      available: false,
      accent: 'fuel',
    },
  };
  var CATALOG_ORDER = ['floss', 'pick', 'flow', 'ez', 'fuel'];
  var WAITLIST_STORAGE_KEY = 'aro_waitlist_signups_v1';
  var MEMBER_SESSION_KEY = 'aro_member_session_v1';
  var MEMBER_ACCOUNTS_KEY = 'aro_member_accounts_v1';

  function getMemberSessionEmail() {
    try {
      var raw = localStorage.getItem(MEMBER_SESSION_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return o && o.email ? String(o.email).trim() : null;
    } catch (e) {
      return null;
    }
  }

  function getMemberAccount() {
    var email = getMemberSessionEmail();
    if (!email) return null;
    try {
      var accounts = JSON.parse(localStorage.getItem(MEMBER_ACCOUNTS_KEY) || '[]');
      if (!Array.isArray(accounts)) return null;
      var lower = email.toLowerCase();
      for (var i = 0; i < accounts.length; i++) {
        if (accounts[i].email && accounts[i].email.toLowerCase() === lower) {
          return accounts[i];
        }
      }
    } catch (e) {}
    return null;
  }

  function isMemberLoggedIn() {
    return !!getMemberAccount();
  }

  function saveWaitlistEntry(entry) {
    try {
      var raw = localStorage.getItem(WAITLIST_STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      list.push(
        Object.assign({ at: new Date().toISOString() }, entry)
      );
      localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  var waitlistProductId = null;

  function showWaitlistViews(which) {
    var m = document.getElementById('waitlist-view-member');
    var g = document.getElementById('waitlist-view-guest');
    var t = document.getElementById('waitlist-view-thanks');
    if (which === 'none') {
      if (m) m.classList.add('is-hidden');
      if (g) g.classList.add('is-hidden');
      if (t) t.classList.add('is-hidden');
      return;
    }
    if (m) m.classList.toggle('is-hidden', which !== 'member');
    if (g) g.classList.toggle('is-hidden', which !== 'guest');
    if (t) t.classList.toggle('is-hidden', which !== 'thanks');
  }

  function openWaitlist(productId) {
    if (!CATALOG[productId]) return;
    waitlistProductId = productId;
    var p = CATALOG[productId];
    var root = document.getElementById('waitlist-root');
    var title = document.getElementById('waitlist-title');
    if (title) title.textContent = 'Waitlist — ' + p.name;

    if (isMemberLoggedIn()) {
      var acc = getMemberAccount();
      var em = acc && acc.email ? acc.email : getMemberSessionEmail();
      var copy = document.getElementById('waitlist-member-copy');
      if (copy) {
        copy.textContent =
          "You're on the list. We'll send product updates to " +
          em +
          ' as soon as ' +
          p.name +
          ' is available for purchase.';
      }
      showWaitlistViews('member');
    } else {
      var intro = document.getElementById('waitlist-guest-intro');
      if (intro) {
        intro.textContent =
          'Enter your details so we can reach you when ' +
          p.name +
          ' is available.';
      }
      var form = document.getElementById('waitlist-form-guest');
      if (form) form.reset();
      showWaitlistViews('guest');
    }

    if (root) {
      root.classList.add('is-open');
      root.setAttribute('aria-hidden', 'false');
    }
    var btn = document.getElementById('waitlist-close-btn');
    if (btn) btn.focus();
  }

  function closeWaitlist() {
    var root = document.getElementById('waitlist-root');
    if (!root) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    waitlistProductId = null;
    showWaitlistViews('none');
  }

  function onWaitlistGuestSubmit(e) {
    e.preventDefault();
    var pid = waitlistProductId;
    if (!pid || !CATALOG[pid]) return;
    var p = CATALOG[pid];
    var nameEl = document.getElementById('waitlist-guest-name');
    var emailEl = document.getElementById('waitlist-guest-email');
    var phoneEl = document.getElementById('waitlist-guest-phone');
    var name = nameEl && nameEl.value ? nameEl.value.trim() : '';
    var email = emailEl && emailEl.value ? emailEl.value.trim() : '';
    var phone = phoneEl && phoneEl.value ? phoneEl.value.trim() : '';
    if (!name) {
      window.alert('Please enter your name.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      window.alert('Please enter a valid email.');
      return;
    }
    saveWaitlistEntry({
      productId: pid,
      productName: p.name,
      name: name,
      email: email,
      phone: phone || '',
      member: false,
    });
    var thanks = document.getElementById('waitlist-thanks-copy');
    if (thanks) {
      thanks.textContent =
        "Thanks — we'll contact you at " +
        email +
        ' when ' +
        p.name +
        ' is available. (Demo — stored in this browser only.)';
    }
    showWaitlistViews('thanks');
  }

  function onWaitlistMemberOk() {
    var pid = waitlistProductId;
    if (!pid || !CATALOG[pid]) {
      closeWaitlist();
      return;
    }
    var p = CATALOG[pid];
    var acc = getMemberAccount();
    var em = acc && acc.email ? acc.email : getMemberSessionEmail();
    if (em) {
      saveWaitlistEntry({
        productId: pid,
        productName: p.name,
        email: em,
        name: acc && acc.name ? acc.name : '',
        member: true,
      });
    }
    closeWaitlist();
  }

  function fmt(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  function loadCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(lines) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }

  function getLines() {
    return loadCart();
  }

  function addProduct(id, qty) {
    if (!CATALOG[id]) return;
    var n = typeof qty === 'number' && qty > 0 ? qty : 1;
    var lines = getLines();
    var i = lines.findIndex(function (l) {
      return l.id === id;
    });
    if (i >= 0) lines[i].qty = Math.min(99, lines[i].qty + n);
    else lines.push({ id: id, qty: n });
    saveCart(lines);
    renderAll();
  }

  function setQty(id, qty) {
    var lines = getLines();
    var i = lines.findIndex(function (l) {
      return l.id === id;
    });
    if (i < 0) return;
    var q = Math.max(0, Math.min(99, qty));
    if (q === 0) lines.splice(i, 1);
    else lines[i].qty = q;
    saveCart(lines);
    renderAll();
  }

  function totalCents() {
    return getLines().reduce(function (sum, l) {
      var p = CATALOG[l.id];
      return sum + (p ? p.priceCents * l.qty : 0);
    }, 0);
  }

  function totalQty() {
    return getLines().reduce(function (s, l) {
      return s + l.qty;
    }, 0);
  }

  function syncAddButtons() {
    document.querySelectorAll('[data-add-product]').forEach(function (btn) {
      var id = btn.getAttribute('data-add-product');
      var p = CATALOG[id];
      if (p) btn.textContent = 'Add to bag — ' + fmt(p.priceCents);
    });
  }

  function renderCatalog() {
    var grid = document.getElementById('catalog-grid');
    if (!grid) return;
    grid.innerHTML = CATALOG_ORDER.map(function (id) {
      var p = CATALOG[id];
      var soon = p.available
        ? ''
        : '<span class="catalog-card-soon">Coming soon</span>';
      var cta = p.available
        ? '<button type="button" class="btn-teal catalog-card-cta" data-add-product="' +
          id +
          '" data-catalog-add>Add to bag — ' +
          fmt(p.priceCents) +
          '</button>'
        : '<button type="button" class="btn-ghost catalog-card-cta" data-waitlist-product="' +
          id +
          '">Join the waitlist</button>';
      return (
        '<article class="catalog-card catalog-card--' +
          p.accent +
          '">' +
          '<div class="catalog-card-head">' +
          '<span class="catalog-card-name">' +
          p.name +
          '</span>' +
          soon +
          '</div>' +
          '<p class="catalog-card-tag">' +
          p.tagline +
          '</p>' +
          '<p class="catalog-card-blurb">' +
          p.blurb +
          '</p>' +
          '<div class="catalog-card-foot">' +
          '<span class="catalog-card-price">' +
          fmt(p.priceCents) +
          '</span>' +
          cta +
          '</div>' +
          '</article>'
      );
    }).join('');
  }

  function openCatalog() {
    var root = document.getElementById('catalog-root');
    if (!root) return;
    renderCatalog();
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var closeBtn = document.getElementById('catalog-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeCatalog() {
    var root = document.getElementById('catalog-root');
    if (!root) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    var shop = document.getElementById('shop-root');
    if (!shop || !shop.classList.contains('is-open')) {
      document.body.style.overflow = '';
    }
  }

  function renderBagLines() {
    var host = document.getElementById('shop-lines');
    var subEl = document.getElementById('shop-subtotal');
    var chk = document.getElementById('shop-checkout-btn');
    if (!host) return;

    var lines = getLines();
    if (lines.length === 0) {
      host.innerHTML =
        '<p class="shop-empty">Your bag is empty. Add a product from any product page.</p>';
      if (chk) chk.disabled = true;
    } else {
      if (chk) chk.disabled = false;
      host.innerHTML = lines
        .map(function (l) {
          var p = CATALOG[l.id];
          if (!p) return '';
          var sub = p.priceCents * l.qty;
          return (
            '<div class="shop-line shop-line--' +
            l.id +
            '" data-line-id="' +
            l.id +
            '">' +
            '<div class="shop-line-top">' +
            '<span class="shop-line-name">' +
            p.name +
            '</span>' +
            '<span class="shop-line-price">' +
            fmt(sub) +
            '</span>' +
            '</div>' +
            '<div class="shop-line-controls">' +
            '<div class="shop-qty">' +
            '<button type="button" class="shop-qty-btn" data-qty-delta="' +
            l.id +
            '" data-delta="-1" aria-label="Decrease quantity">−</button>' +
            '<span class="shop-qty-val">' +
            l.qty +
            '</span>' +
            '<button type="button" class="shop-qty-btn" data-qty-delta="' +
            l.id +
            '" data-delta="1" aria-label="Increase quantity">+</button>' +
            '</div>' +
            '<button type="button" class="shop-remove" data-remove="' +
            l.id +
            '">Remove</button>' +
            '</div>' +
            '</div>'
          );
        })
        .join('');
    }
    if (subEl) subEl.textContent = fmt(totalCents());
    var coTotal = document.getElementById('shop-co-total');
    if (coTotal) coTotal.textContent = fmt(totalCents());
  }

  function updateBadge() {
    var n = totalQty();
    document.querySelectorAll('.shop-count').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : String(n);
      el.classList.toggle('shop-count--empty', n === 0);
    });
  }

  function renderAll() {
    updateBadge();
    syncAddButtons();
    renderBagLines();
    if (getLines().length === 0) showBagView();
  }

  function setNavExpanded(open) {
    var navBtn = document.getElementById('nav-cart-toggle');
    if (navBtn) navBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function openBag() {
    var root = document.getElementById('shop-root');
    if (!root) return;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setNavExpanded(true);
    showBagView();
    var closeBtn = document.getElementById('shop-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeBag() {
    var root = document.getElementById('shop-root');
    if (!root) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setNavExpanded(false);
    showBagView();
  }

  function showBagView() {
    var bag = document.getElementById('shop-view-bag');
    var co = document.getElementById('shop-view-checkout');
    var title = document.getElementById('shop-bag-title');
    if (bag) bag.classList.remove('is-hidden');
    if (co) co.classList.add('is-hidden');
    if (title) title.textContent = 'Your bag';
  }

  function showCheckoutView() {
    if (getLines().length === 0) return;
    var bag = document.getElementById('shop-view-bag');
    var co = document.getElementById('shop-view-checkout');
    var title = document.getElementById('shop-bag-title');
    if (bag) bag.classList.add('is-hidden');
    if (co) co.classList.remove('is-hidden');
    if (title) title.textContent = 'Checkout';
    var email = document.getElementById('shop-co-email');
    if (email) email.focus();
  }

  function hideSuccess() {
    var msg = document.getElementById('shop-success');
    if (msg) msg.classList.add('is-hidden');
  }

  function placeOrder(e) {
    e.preventDefault();
    var emailEl = document.getElementById('shop-co-email');
    var email = emailEl && emailEl.value ? emailEl.value.trim() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      window.alert('Please enter a valid email.');
      return;
    }
    var msg = document.getElementById('shop-success');
    var slot = msg && msg.querySelector('[data-shop-success-email]');
    if (slot) slot.textContent = email;
    if (msg) msg.classList.remove('is-hidden');
    saveCart([]);
    showBagView();
    renderAll();
    if (emailEl) emailEl.value = '';
    var nameEl = document.getElementById('shop-co-name');
    if (nameEl) nameEl.value = '';
    if (successTimer) window.clearTimeout(successTimer);
    successTimer = window.setTimeout(hideSuccess, 8000);
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderAll();

    document.body.addEventListener('click', function (e) {
      var catOpen = e.target.closest('[data-catalog-open]');
      if (catOpen) {
        e.preventDefault();
        openCatalog();
        return;
      }

      var wlProduct = e.target.closest('[data-waitlist-product]');
      if (wlProduct) {
        e.preventDefault();
        openWaitlist(wlProduct.getAttribute('data-waitlist-product'));
        return;
      }

      if (e.target.closest('[data-waitlist-member-ok]')) {
        e.preventDefault();
        onWaitlistMemberOk();
        return;
      }

      if (
        e.target.closest('[data-waitlist-close]') ||
        e.target.closest('#waitlist-close-btn')
      ) {
        e.preventDefault();
        closeWaitlist();
        return;
      }

      if (e.target.closest('[data-catalog-close]')) {
        e.preventDefault();
        closeCatalog();
        return;
      }

      if (e.target.closest('#catalog-close')) {
        e.preventDefault();
        closeCatalog();
        return;
      }

      var catAdd = e.target.closest('[data-catalog-add]');
      if (catAdd) {
        e.preventDefault();
        addProduct(catAdd.getAttribute('data-add-product'), 1);
        return;
      }

      var cartOpen = e.target.closest('[data-cart-open]');
      if (cartOpen) {
        e.preventDefault();
        if (
          document
            .getElementById('catalog-root')
            .classList.contains('is-open')
        ) {
          closeCatalog();
        }
        openBag();
        return;
      }

      if (e.target.closest('#nav-cart-toggle') || e.target.closest('#nav-cart-mobile')) {
        e.preventDefault();
        var root = document.getElementById('shop-root');
        if (root && root.classList.contains('is-open')) closeBag();
        else openBag();
        return;
      }

      var addBtn = e.target.closest('[data-add-product]');
      if (addBtn) {
        e.preventDefault();
        addProduct(addBtn.getAttribute('data-add-product'), 1);
        openBag();
        return;
      }

      var delta = e.target.closest('[data-qty-delta]');
      if (delta) {
        var id = delta.getAttribute('data-qty-delta');
        var d = parseInt(delta.getAttribute('data-delta'), 10) || 0;
        var lines = getLines();
        var line = null;
        for (var j = 0; j < lines.length; j++) {
          if (lines[j].id === id) {
            line = lines[j];
            break;
          }
        }
        if (line) setQty(id, line.qty + d);
        return;
      }

      var rem = e.target.closest('[data-remove]');
      if (rem) {
        setQty(rem.getAttribute('data-remove'), 0);
        return;
      }

      if (e.target.closest('#shop-close') || e.target.closest('[data-shop-close]')) {
        closeBag();
        return;
      }

      if (e.target.closest('#shop-overlay-hit')) {
        closeBag();
        return;
      }

      if (e.target.closest('#shop-checkout-btn')) {
        e.preventDefault();
        showCheckoutView();
        return;
      }

      if (e.target.closest('#shop-back-bag')) {
        e.preventDefault();
        showBagView();
        return;
      }

      if (e.target.closest('#shop-place-order')) {
        placeOrder(e);
      }
    });

    var wlFormGuest = document.getElementById('waitlist-form-guest');
    if (wlFormGuest) wlFormGuest.addEventListener('submit', onWaitlistGuestSubmit);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var wlRoot = document.getElementById('waitlist-root');
      if (wlRoot && wlRoot.classList.contains('is-open')) {
        closeWaitlist();
        return;
      }
      var catRoot = document.getElementById('catalog-root');
      if (catRoot && catRoot.classList.contains('is-open')) {
        closeCatalog();
        return;
      }
      var root = document.getElementById('shop-root');
      if (root && root.classList.contains('is-open')) closeBag();
    });
  });
})();
