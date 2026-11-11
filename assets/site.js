// Ko-Chi Qigong — shared behaviour for every page. Plain JavaScript, no libraries.
(function () {
  var root = document.documentElement;
  var isMobile = function () { return window.matchMedia('(max-width: 900px)').matches; };

  // ---- Mobile hamburger menu ----
  var header = document.querySelector('.site-header');
  var button = header && header.querySelector('.menu-toggle');
  if (button) {
    var setMenu = function (open) {
      header.classList.toggle('menu-open', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    button.addEventListener('click', function () { setMenu(!header.classList.contains('menu-open')); });
    // Close the menu after choosing a link (matters for links to a spot on the same page, e.g. #Agenda).
    header.querySelectorAll('.mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
  }

  // ---- Page state ----
  // Some pages keep a bit of state as data-* attributes on <html> (e.g. data-activetab="2",
  // data-contactsent="true"). The page's own CSS shows/hides and restyles things based on it.
  function setState(name, value) {
    root.setAttribute('data-' + name, String(value));
    document.querySelectorAll('[data-set][aria-expanded]').forEach(function (el) {
      var p = el.getAttribute('data-set').split(':');
      el.setAttribute('aria-expanded', root.getAttribute('data-' + p[0]) === p[1] ? 'true' : 'false');
    });
  }

  // Buttons: data-set="activetab:2" sets that state. With data-set-toggle, tapping the open
  // item again on mobile closes it (accordion behaviour).
  document.querySelectorAll('[data-set]').forEach(function (el) {
    el.addEventListener('click', function () {
      var p = el.getAttribute('data-set').split(':');
      var value = p[1];
      if (el.hasAttribute('data-set-toggle') && isMobile() && root.getAttribute('data-' + p[0]) === value) value = '0';
      setState(p[0], value);
    });
  });

  // Forms: data-submit="contactsent:true" shows the thank-you message. Nothing is sent yet.
  document.querySelectorAll('form[data-submit]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var spec = form.getAttribute('data-submit');
      if (spec) { var p = spec.split(':'); setState(p[0], p[1]); }
    });
  });

  // ---- Visitor statistics (Umami Cloud: no cookies, no personal data) ----
  // Loaded here so every page gets it. data-domains: only count visits on the live site, not
  // local previews. When the custom domain goes live it is already listed, so nothing changes.
  // Views per inspiratie piece are sent as events by assets/inspiratie.js ('inspiratie-bekeken').
  var stats = document.createElement('script');
  stats.defer = true;
  stats.src = 'https://cloud.umami.is/script.js';
  stats.setAttribute('data-website-id', '00716cac-3a2f-400b-992c-1bf563423dcb');
  stats.setAttribute('data-domains', 'r-koolen.github.io,www.kochi-qigong.nl');
  document.head.appendChild(stats);

  // Events sent before the Umami script has loaded (e.g. right at page load) wait in a queue.
  var queue = [];
  var track = function (name, data) {
    try {
      if (window.umami) window.umami.track(name, data);
      else if (queue) queue.push([name, data]);
    } catch (e) { /* stats must never break the page */ }
  };
  stats.onload = function () { var q = queue; queue = null; q.forEach(function (x) { track(x[0], x[1]); }); };
  stats.onerror = function () { queue = null; }; // blocked (ad blocker / firewall): drop the queue
  window.kochiTrack = track; // used by assets/inspiratie.js
  var page = function () { return location.pathname.split('/').pop() || 'index.html'; };
  var label = function (el) { return (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60); };

  // Broken links: 404.html (<body data-404>) is shown for any missing address. Record which
  // address and where the visitor came from, so the link can be fixed or redirected.
  if (document.body.hasAttribute('data-404')) {
    track('404', { adres: location.pathname + location.search, vanaf: document.referrer || '(direct)' });
  }

  // Clicks, counted as events:
  // - contact (email / phone / WhatsApp), PDFs and links to other sites;
  // - buttons and links inside the page content (<main>), e.g. "Schrijf je in", "Aanmelden",
  //   related inspiratie pieces. The menu and footer are not counted.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (/^mailto:/i.test(href)) track('contact-email', { page: page() });
    else if (/^tel:/i.test(href)) track('contact-telefoon', { page: page() });
    else if (/^https:\/\/wa\.me\//i.test(href)) track('contact-whatsapp', { page: page() });
    else if (/\.pdf($|[?#])/i.test(href)) track('pdf', { file: href.split('/').pop(), page: page() });
    else if (/^https?:\/\//i.test(href) && a.hostname !== location.hostname) track('externe-link', { url: a.hostname, page: page() });
    else if (a.closest('main')) track('knop', { tekst: label(a), naar: href, page: page() });
  });

  // Tabs / accordion items (data-set buttons): which one is opened. Runs after the button's own
  // handler above, so the state on <html> is already updated; closing an item is not counted.
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-set]');
    if (!el) return;
    var p = el.getAttribute('data-set').split(':');
    if (root.getAttribute('data-' + p[0]) === p[1]) track('tab', { tab: label(el), page: page() });
  });

  // Form submits. Note: the forms do not send anything yet (see TODO.md), so this shows how many
  // messages are currently lost.
  document.addEventListener('submit', function () {
    track('formulier', { page: page() });
  });

  // ---- Scroll to #anchor with a little space above (pages with <body data-hash-scroll>) ----
  if (document.body.hasAttribute('data-hash-scroll')) {
    var scrollToHash = function () {
      var id = decodeURIComponent((window.location.hash || '').slice(1));
      if (!id) return;
      setTimeout(function () {
        var el = document.getElementById(id);
        if (!el) return;
        var y = el.getBoundingClientRect().top + window.pageYOffset - 20;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 150);
    };
    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
  }
})();
