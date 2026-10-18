/* Portfolio — interactions (aucune dépendance) */
(function () {
  'use strict';

  var header = document.querySelector('.site-header');

  /* ---------- En-tête : bordure au défilement ---------- */
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Lien actif (menu ordinateur + barre d'onglets mobile) ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-list a[href^="#"], .tabbar a[href^="#"]'));
  if ('IntersectionObserver' in window && navLinks.length) {
    var ids = [];
    navLinks.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      if (ids.indexOf(id) === -1) ids.push(id);
    });
    var setCurrent = function (id) {
      navLinks.forEach(function (a) {
        if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) setCurrent(entry.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
    setCurrent(ids[0]);
    window.addEventListener('scroll', function () {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) setCurrent(ids[ids.length - 1]);
    }, { passive: true });
  }

  /* ---------- Année du copyright ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Formulaire de contact ---------- */
  var form = document.getElementById('contact-form');
  if (!form) return;

  var status = form.querySelector('.form-status');
  var submit = form.querySelector('button[type="submit"]');
  var submitHTML = submit.innerHTML;
  var msg = form.dataset;
  var CONTACT_EMAIL = 'devkevfullstack959@gmail.com';
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var setFieldError = function (input, text) {
    var err = document.getElementById(input.id + '-err');
    if (text) {
      input.setAttribute('aria-invalid', 'true');
      if (err) err.textContent = text;
    } else {
      input.removeAttribute('aria-invalid');
      if (err) err.textContent = '';
    }
  };

  var validate = function () {
    var firstInvalid = null;
    var name = form.elements.name;
    var email = form.elements.email;
    var message = form.elements.message;

    var nameErr = name.value.trim() ? '' : msg.msgRequired;
    var emailErr = !email.value.trim() ? msg.msgRequired : (emailRe.test(email.value.trim()) ? '' : msg.msgEmail);
    var msgVal = message.value.trim();
    var messageErr = !msgVal ? msg.msgRequired : (msgVal.length < 20 ? msg.msgShort : '');

    [[name, nameErr], [email, emailErr], [message, messageErr]].forEach(function (pair) {
      setFieldError(pair[0], pair[1]);
      if (pair[1] && !firstInvalid) firstInvalid = pair[0];
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  };

  ['name', 'email', 'message'].forEach(function (n) {
    form.elements[n].addEventListener('input', function () {
      if (this.getAttribute('aria-invalid') === 'true') setFieldError(this, '');
    });
  });

  var showStatus = function (state, html) {
    status.dataset.state = state;
    status.innerHTML = html;
  };

  var mailtoLink = function () {
    var subject = encodeURIComponent((document.documentElement.lang === 'en' ? 'Project inquiry — ' : 'Demande de projet — ') + (form.elements.name.value || ''));
    var body = encodeURIComponent(form.elements.message.value || '');
    return '<a href="mailto:' + CONTACT_EMAIL + '?subject=' + subject + '&body=' + body + '">' + CONTACT_EMAIL + '</a>.';
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    var data = {};
    new FormData(form).forEach(function (value, key) { data[key] = typeof value === 'string' ? value.trim() : value; });

    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = msg.msgSending;
    showStatus('', '');

    fetch(form.getAttribute('action'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) {
          if (!res.ok || !json.ok) throw new Error(json.error || ('HTTP ' + res.status));
        });
      })
      .then(function () {
        showStatus('success', msg.msgSuccess);
        form.reset();
      })
      .catch(function () {
        showStatus('error', msg.msgError + mailtoLink());
      })
      .finally(function () {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.innerHTML = submitHTML;
      });
  });
})();
