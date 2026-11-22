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
    // Blocks with data-show="activetab:energie" are only shown in that state (e.g. the Agenda panels).
    document.querySelectorAll('[data-show]').forEach(function (el) {
      var p = el.getAttribute('data-show').split(':');
      el.hidden = root.getAttribute('data-' + p[0]) !== p[1];
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

  // A link to a shown/hidden block (e.g. voor-particulieren.html#bewust-zijn-met-energie) opens it.
  // Scrolling to it: "Scroll to #anchor" at the bottom.
  var openHashTarget = function () {
    var el = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!el || !el.hasAttribute('data-show')) return;
    var p = el.getAttribute('data-show').split(':');
    setState(p[0], p[1]);
  };
  openHashTarget();
  window.addEventListener('hashchange', openHashTarget);

  // ---- Forms ----
  // <form data-form="contact" data-submit="contactsent:true">: the fields are checked here, then
  // sent to a Google Apps Script that saves them in Petra's Google Sheet and emails her
  // (guide: tools/forms/README.md, local only, not in git). data-submit is the page state that shows the thank-you message.
  // A checkbox group that needs at least one tick: put data-required-group on its container.
  // The address below does not depend on the site's domain: nothing changes at the domain switch.
  var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbw4omw1UxtKWV-tEaQqdfZaA0gudes_vtdgDvyKKjhpwXzqXZgkkvxTE03fcctEvhk/exec'; // web app URL (Apps Script: Deploy → Manage deployments)
  var FORM_EMAIL = 'Kochi.qigong@gmail.com'; // shown when sending fails
  var pageOpenedAt = Date.now();

  function checkForm(form) {
    form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea').forEach(function (el) {
      el.value = el.value.trim(); // only spaces counts as empty
      var bad = el.type === 'email' && el.value !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(el.value);
      el.setCustomValidity(bad ? 'Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.nl.' : '');
    });
    form.querySelectorAll('[data-required-group]').forEach(function (group) {
      var boxes = group.querySelectorAll('input[type="checkbox"]');
      var ticked = Array.prototype.some.call(boxes, function (b) { return b.checked; });
      boxes[0].setCustomValidity(ticked ? '' : 'Kies minstens één optie.');
    });
    return form.reportValidity(); // shows the browser's message at the first problem
  }

  function formStatus(form, text, withEmail) {
    var el = form.querySelector('.form-status');
    if (!el) {
      el = document.createElement('p');
      el.className = 'form-status';
      el.setAttribute('role', 'status');
      var button = form.querySelector('[type="submit"]');
      button.parentNode.insertBefore(el, button);
    }
    el.textContent = text;
    if (withEmail) {
      var a = document.createElement('a');
      a.href = 'mailto:' + FORM_EMAIL;
      a.textContent = FORM_EMAIL;
      el.appendChild(a);
      el.appendChild(document.createTextNode('.'));
    }
  }

  function sendForm(form) {
    var data = new URLSearchParams(new FormData(form));
    data.set('formulier', form.getAttribute('data-form'));
    data.set('t', String(Date.now() - pageOpenedAt));
    var abort = window.AbortController ? new AbortController() : null;
    if (abort) setTimeout(function () { abort.abort(); }, 20000);
    return fetch(FORM_ENDPOINT, { method: 'POST', body: data, signal: abort ? abort.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (r) { if (!r || r.ok !== true) throw new Error((r && r.error) || 'failed'); });
  }

  document.querySelectorAll('form[data-form]').forEach(function (form) {
    // Spam trap: a field people never see (off-screen, skipped by Tab and screen readers).
    // Bots that fill in every field give themselves away.
    var trap = document.createElement('div');
    trap.className = 'form-hp';
    trap.setAttribute('aria-hidden', 'true');
    trap.innerHTML = '<label>Laat dit veld leeg <input type="text" name="hp" tabindex="-1" autocomplete="off"></label>';
    form.insertBefore(trap, form.firstChild);

    var spec = (form.getAttribute('data-submit') || '').split(':');
    var button = form.querySelector('[type="submit"]');
    var buttonText = button.textContent;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.hasAttribute('data-busy') || !checkForm(form)) return;
      if (spec[0]) setState(spec[0], 'false');
      form.setAttribute('data-busy', '');
      button.disabled = true;
      button.textContent = 'Bezig met verzenden…';
      formStatus(form, '');
      var finish = function (ok) {
        form.removeAttribute('data-busy');
        button.disabled = false;
        button.textContent = buttonText;
        track('formulier', { formulier: form.getAttribute('data-form'), resultaat: ok ? 'verzonden' : 'mislukt', page: page() });
      };
      (FORM_ENDPOINT ? sendForm(form) : Promise.reject(new Error('no endpoint'))).then(function () {
        finish(true);
        form.reset();
        if (spec[0]) setState(spec[0], spec[1]);
      }, function () {
        finish(false);
        formStatus(form, 'Het versturen is helaas niet gelukt. Probeer het later nog eens, of mail je bericht naar ', true);
      });
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

  // ---- Scroll to #anchor with a little space above (pages with <body data-hash-scroll>) ----
  if (document.body.hasAttribute('data-hash-scroll')) {
    var scrollToHash = function () {
      var id = decodeURIComponent((window.location.hash || '').slice(1));
      if (!id) return;
      setTimeout(function () {
        var el = document.getElementById(id);
        if (!el) return;
        // An Agenda item on mobile: its panel sits under its tab, so scroll to the tab (title visible).
        var tab = isMobile() && el.hasAttribute('data-show') && document.querySelector('[aria-controls="' + id + '"]');
        if (tab) el = tab;
        var y = el.getBoundingClientRect().top + window.pageYOffset - 20;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 150);
    };
    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
  }
})();
