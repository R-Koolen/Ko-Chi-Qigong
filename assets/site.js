// Ko-Chi qigong — shared behaviour for every page. Plain JavaScript, no libraries.
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
