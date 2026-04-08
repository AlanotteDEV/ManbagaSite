/* ============================================================
   privacy-init.js — script di inizializzazione per privacy.html
   ============================================================ */
(function () {
    'use strict';

    /* Imposta data ultimo aggiornamento */
    var el = document.getElementById('last-update');
    if (el) {
        el.textContent = new Intl.DateTimeFormat('it-IT', {
            day: '2-digit', month: 'long', year: 'numeric'
        }).format(new Date('2026-04-08'));
    }

    /* Nav burger */
    var burger = document.getElementById('nav-burger');
    var links  = document.getElementById('nav-links');
    var nav    = document.getElementById('nav');
    if (burger && links) {
        burger.addEventListener('click', function () {
            burger.classList.toggle('open');
            links.classList.toggle('open');
        });
        links.addEventListener('click', function (e) {
            if (e.target.tagName === 'A') {
                burger.classList.remove('open');
                links.classList.remove('open');
            }
        });
    }
    window.addEventListener('scroll', function () {
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });

    /* Footer cookie btn */
    document.querySelectorAll('.footer-cookie-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (typeof mbResetCookies === 'function') mbResetCookies();
        });
    });
})();
