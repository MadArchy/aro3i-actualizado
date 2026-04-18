(function () {
  var ACCOUNTS_KEY = 'aro_member_accounts_v1';
  var TEST_EMAIL = 'test@aro.demo';
  var TEST_PASSWORD = 'test12345';

  function encodePw(p) {
    try {
      return btoa(unescape(encodeURIComponent(p)));
    } catch (e) {
      return '';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    try {
      var raw = localStorage.getItem(ACCOUNTS_KEY);
      var accounts = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(accounts)) accounts = [];
      var exists = accounts.some(function (a) {
        return a.email && a.email.toLowerCase() === TEST_EMAIL.toLowerCase();
      });
      if (exists) return;
      accounts.push({
        email: TEST_EMAIL,
        name: 'Test User',
        pwKey: encodePw(TEST_PASSWORD),
        provider: 'local',
        tier: 'standard',
        subscribedAt: new Date().toISOString(),
      });
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {}
  });
})();
