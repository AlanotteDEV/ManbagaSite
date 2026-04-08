/* ============================================================
   chi-siamo-init.js — script di inizializzazione per chi-siamo.html
   ============================================================ */
(function () {
    'use strict';

    /* ── Lightbox ── */
    function openLb(src, cap) {
        document.getElementById('lb-img').src = src;
        document.getElementById('lb-cap').textContent = cap;
        document.getElementById('lb').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeLb() {
        var lb = document.getElementById('lb');
        if (lb) lb.classList.remove('active');
        var img = document.getElementById('lb-img');
        if (img) img.src = '';
        document.body.style.overflow = '';
    }

    /* Escape key */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeLb();
    });

    /* Click delegation: gallery frames → open, overlay/close → close */
    document.addEventListener('click', function (e) {
        var frame = e.target.closest('[data-lb-src]');
        if (frame) {
            openLb(frame.dataset.lbSrc, frame.dataset.lbCap || '');
            return;
        }
        var lb = document.getElementById('lb');
        if (lb && lb.classList.contains('active')) {
            if (e.target === lb || e.target.closest('.lb-close')) {
                closeLb();
            }
        }
    });

    /* ── Nav burger + scroll ── */
    var burger = document.getElementById('nav-burger');
    var links  = document.getElementById('nav-links');
    if (burger && links) {
        burger.addEventListener('click', function () {
            burger.classList.toggle('open');
            links.classList.toggle('open');
        });
        links.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () {
                burger.classList.remove('open');
                links.classList.remove('open');
            });
        });
    }
    window.addEventListener('scroll', function () {
        var nav = document.getElementById('nav');
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });

    /* ── Footer cookie btn ── */
    document.querySelectorAll('.footer-cookie-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (typeof mbResetCookies === 'function') mbResetCookies();
        });
    });
})();
