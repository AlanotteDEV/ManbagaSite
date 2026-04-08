/* ============================================================
   faq-init.js — script di inizializzazione per faq.html
   ============================================================ */
(function () {
    'use strict';

    /* ── Accordion ── */
    function toggleFaq(btn) {
        var isOpen = btn.classList.contains('open');
        var section = btn.closest('.faq-section');
        section.querySelectorAll('.faq-question.open').forEach(function (q) {
            q.classList.remove('open');
            q.setAttribute('aria-expanded', 'false');
            q.nextElementSibling.classList.remove('open');
        });
        if (!isOpen) {
            btn.classList.add('open');
            btn.setAttribute('aria-expanded', 'true');
            btn.nextElementSibling.classList.add('open');
        }
    }

    /* ── Category filter ── */
    function faqFilter(cat, btn) {
        document.querySelectorAll('.faq-cat-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var searchEl = document.getElementById('faq-search');
        if (searchEl) searchEl.value = '';
        clearSearch();
        document.querySelectorAll('.faq-section').forEach(function (s) {
            s.dataset.hidden = (cat !== 'all' && s.dataset.cat !== cat) ? 'true' : 'false';
        });
    }

    /* ── Search ── */
    function faqSearch(query) {
        var q = query.trim().toLowerCase();
        var totalVisible = 0;

        document.querySelectorAll('.faq-section').forEach(function (s) { s.dataset.hidden = 'false'; });

        document.querySelectorAll('.faq-item').forEach(function (item) {
            var text = item.querySelector('.faq-q-text').textContent.toLowerCase()
                + ' ' + item.querySelector('.faq-answer-inner').textContent.toLowerCase();
            var match = !q || text.includes(q);
            item.dataset.hidden = match ? 'false' : 'true';
            if (match) totalVisible++;
        });

        document.querySelectorAll('.faq-section').forEach(function (s) {
            var visible = Array.from(s.querySelectorAll('.faq-item')).some(function (i) { return i.dataset.hidden !== 'true'; });
            s.dataset.hidden = visible ? 'false' : 'true';
        });

        var noRes = document.getElementById('faq-no-results');
        var noQ   = document.getElementById('faq-no-q');
        if (q && totalVisible === 0) {
            noRes.style.display = 'block';
            if (noQ) noQ.textContent = query;
        } else {
            noRes.style.display = 'none';
        }

        document.querySelectorAll('.faq-cat-btn').forEach(function (b) { b.classList.remove('active'); });
        var firstCat = document.querySelector('.faq-cat-btn');
        if (firstCat) firstCat.classList.add('active');
    }

    function clearSearch() {
        document.getElementById('faq-no-results').style.display = 'none';
        document.querySelectorAll('.faq-item').forEach(function (i) { i.dataset.hidden = 'false'; });
    }

    /* ── Event delegation: accordion ── */
    var main = document.querySelector('.faq-main');
    if (main) {
        main.addEventListener('click', function (e) {
            var btn = e.target.closest('.faq-question');
            if (btn) toggleFaq(btn);
        });
    }

    /* ── Event delegation: category filter ── */
    var cats = document.querySelector('.faq-cats');
    if (cats) {
        cats.addEventListener('click', function (e) {
            var btn = e.target.closest('.faq-cat-btn');
            if (!btn) return;
            faqFilter(btn.dataset.cat || 'all', btn);
        });
    }

    /* ── Search input ── */
    var searchEl = document.getElementById('faq-search');
    if (searchEl) {
        searchEl.addEventListener('input', function () { faqSearch(this.value); });
    }

    /* ── Nav burger + scroll ── */
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

    /* ── Footer cookie btn ── */
    document.querySelectorAll('.footer-cookie-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (typeof mbResetCookies === 'function') mbResetCookies();
        });
    });
})();
