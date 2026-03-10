/* ============================================================
   MANBAGA Comics & Games — script.js
   ============================================================ */

'use strict';

/* ============================================================
   EMAIL CONFIG — EmailJS (GRATUITO fino a 200 email/mese)
   ============================================================
   ISTRUZIONI SETUP (5 minuti):
   1. Vai su https://www.emailjs.com e crea un account gratuito
   2. Dashboard → "Add New Service" → Gmail
      → collegalo a manbagacomics@gmail.com → copia il SERVICE ID
   3. Dashboard → "Email Templates" → crea DUE template:

      ─ Template 1: ID = "template_contact"
        Subject: {{subject}}
        Body:
          Da: {{from_name}} <{{from_email}}>
          ---
          {{message}}
        To email: manbagacomics@gmail.com

      ─ Template 2: ID = "template_preorder"
        Subject: [PREORDINE] {{product_title}} {{product_volume}}
        Body:
          ⭐ NUOVA RICHIESTA DI PREORDINE

          Prodotto: {{product_title}}
          Volume:   {{product_volume}}
          Stato:    {{product_badge}}

          ─────────────────────────────
          Cliente:  {{customer_name}}
          Contatto: {{customer_contact}}
          Note:     {{customer_notes}}
        To email: manbagacomics@gmail.com

   4. Dashboard → Account → General → API Keys → copia la Public Key
   5. Sostituisci i valori nelle costanti qui sotto
   ============================================================ */
var EMAILJS_CONFIG = {
    publicKey:         'RMUoD23dWNtheAZiE',
    serviceId:         'service_x1xol32',
    templateContact:   'template_z2rchyq',
    templateAutoreply: 'template_xar3ak7'
};

var _emailjsReady = false;

document.addEventListener('DOMContentLoaded', function () {
    if (typeof emailjs !== 'undefined' && EMAILJS_CONFIG.publicKey !== 'YOUR_PUBLIC_KEY') {
        emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
        _emailjsReady = true;
    }
});

/* ============================================================
   LOADER
   ============================================================ */
window.addEventListener('load', function () {
    setTimeout(function () {
        var loader = document.getElementById('loader');
        if (!loader) return;

        loader.classList.add('exit');
        document.body.classList.remove('is-loading');

        setTimeout(function () {
            loader.remove();
            checkReveal();
        }, 900);
    }, 2400);
});

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
function checkReveal() {
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });

    document.querySelectorAll('.reveal').forEach(function (el) {
        observer.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', checkReveal);

/* ============================================================
   NAVIGATION — scrolled state + mobile
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
    var nav     = document.getElementById('nav');
    var burger  = document.getElementById('nav-burger');
    var navLinks = document.getElementById('nav-links');

    window.addEventListener('scroll', function () {
        if (window.scrollY > 40) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    if (burger) {
        burger.addEventListener('click', function () {
            burger.classList.toggle('open');
            navLinks.classList.toggle('open');
        });
    }

    if (navLinks) {
        navLinks.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () {
                navLinks.classList.remove('open');
                if (burger) burger.classList.remove('open');
            });
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeImageZoom();
            closeProductModal();
            closeAdminModal();
        }
    });
});

/* ============================================================
   LOGO — triplo click → admin
   ============================================================ */
var _logoClicks = 0;
var _logoTimer;

document.addEventListener('DOMContentLoaded', function () {
    var logoLink = document.getElementById('logo-link');
    if (!logoLink) return;

    logoLink.addEventListener('click', function (e) {
        e.preventDefault();
        _logoClicks++;
        clearTimeout(_logoTimer);

        if (_logoClicks >= 3) {
            _logoClicks = 0;
            openAdminModal();
            return;
        }

        _logoTimer = setTimeout(function () {
            _logoClicks = 0;
        }, 600);
    });
});

/* ============================================================
   STORAGE HELPERS
   ============================================================ */
function getEvents() {
    try { return JSON.parse(localStorage.getItem('manbaga-events') || '[]'); }
    catch (e) { return []; }
}

function setEvents(data) {
    localStorage.setItem('manbaga-events', JSON.stringify(data));
}

function getProducts() {
    try { return JSON.parse(localStorage.getItem('manbaga-products') || '[]'); }
    catch (e) { return []; }
}

function setProducts(data) {
    localStorage.setItem('manbaga-products', JSON.stringify(data));
}

/* ============================================================
   RENDER EVENTI
   ============================================================ */
function renderEvents() {
    var events = getEvents();
    var container = document.getElementById('events-display');
    if (!container) return;

    if (events.length === 0) {
        container.innerHTML = '<div class="events-empty">Nessun evento in programma al momento.<br>Seguici su Instagram per aggiornamenti!</div>';
        return;
    }

    container.innerHTML = events.map(function (e) {
        return '<div class="event-row">'
            + '<div class="event-date-box">'
            + '<div class="event-day-num">' + (e.day || '—') + '</div>'
            + '<div class="event-month-txt">' + ((e.month || '').toUpperCase()) + '</div>'
            + (e.year ? '<div class="event-year-txt">' + e.year + '</div>' : '')
            + '</div>'
            + '<div class="event-body">'
            + (e.tag ? '<div class="event-tag">' + e.tag + '</div>' : '')
            + '<h3 class="event-title">' + e.title + '</h3>'
            + '<p class="event-desc">' + e.desc + '</p>'
            + '<div class="event-meta">'
            + (e.time ? '<span>⏰ ' + e.time + '</span>' : '')
            + (e.price ? '<span>' + e.price + '</span>' : '')
            + '</div>'
            + '</div>'
            + '</div>';
    }).join('');
}

/* ============================================================
   RENDER PRODOTTI — CAROSELLO
   ============================================================ */
function renderProducts() {
    var products = getProducts();
    var track = document.getElementById('products-display');
    if (!track) return;

    if (products.length === 0) {
        /* Nascondi i bottoni carosello se non ci sono prodotti */
        var prevBtn = document.getElementById('carousel-prev');
        var nextBtn = document.getElementById('carousel-next');
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';

        track.innerHTML = '<div class="products-empty">Nessun prodotto ancora caricato.<br>'
            + '<small>Seguici su Instagram per scoprire le novità in negozio!</small></div>';
        return;
    }

    track.innerHTML = products.map(function (p) {
        var isOos = (p.badge === 'OUT OF STOCK' || p.badge === 'ESAURITO');
        return '<div class="product-card' + (isOos ? ' product-card--oos' : '') + '" data-badge="' + (p.badge || '') + '" onclick="openProductModal(' + p.id + ')">'
            + (p.badge ? '<div class="product-badge" data-badge="' + p.badge + '">' + p.badge + '</div>' : '')
            + '<div class="product-img-wrap">'
            + '<img class="product-img" src="' + p.image + '" alt="' + p.title + '" loading="lazy" onerror="this.src=\'https://placehold.co/400x500/0a0a0a/333?text=Cover\'">'
            + '<div class="product-img-overlay"><span>Scopri di più</span></div>'
            + '</div>'
            + '<div class="product-info">'
            + '<div class="product-store-tag">MANBAGA.</div>'
            + '<div class="product-name">' + p.title + '</div>'
            + '<div class="product-vol">' + (p.volume || '') + '</div>'
            + (p.price ? '<div class="product-price">' + p.price + '</div>' : '')
            + '</div>'
            + '</div>';
    }).join('');

    /* Init carosello dopo render */
    initCarousel();
}

/* ============================================================
   CAROSELLO — LOGICA
   ============================================================ */
var _carouselIdx  = 0;
var _carouselAuto = null;
var _carouselGap  = 20;

function getVisibleCount() {
    var w = window.innerWidth;
    if (w >= 1100) return 3;
    if (w >= 640)  return 2;
    return 1;
}

function initCarousel() {
    _carouselIdx = 0;

    var prevBtn = document.getElementById('carousel-prev');
    var nextBtn = document.getElementById('carousel-next');

    if (prevBtn) {
        prevBtn.replaceWith(prevBtn.cloneNode(true)); /* rimuove listener precedenti */
        prevBtn = document.getElementById('carousel-prev');
        prevBtn.addEventListener('click', function () { carouselStep(-1); });
    }
    if (nextBtn) {
        nextBtn.replaceWith(nextBtn.cloneNode(true));
        nextBtn = document.getElementById('carousel-next');
        nextBtn.addEventListener('click', function () { carouselStep(1); });
    }

    /* Pausa autoplay al mouseenter del viewport */
    var viewport = document.querySelector('.carousel-viewport');
    if (viewport) {
        viewport.addEventListener('mouseenter', stopCarouselAuto);
        viewport.addEventListener('mouseleave', startCarouselAuto);
    }

    /* Resize handler */
    window.addEventListener('resize', debounce(function () {
        updateCarousel(false);
    }, 200));

    buildCarouselDots();
    updateCarousel(false);
    startCarouselAuto();
}

function carouselStep(dir) {
    var products    = getProducts();
    var visible     = getVisibleCount();
    var maxIdx      = Math.max(0, products.length - visible);
    var next        = _carouselIdx + dir;

    /* Loop infinito */
    if (next < 0)       next = maxIdx;
    if (next > maxIdx)  next = 0;

    _carouselIdx = next;
    updateCarousel(true);
    resetCarouselAuto();
}

function buildCarouselDots() {
    var dotsBar  = document.getElementById('carousel-dots');
    if (!dotsBar) return;

    var products = getProducts();
    var visible  = getVisibleCount();
    var total    = Math.max(1, products.length - visible + 1);

    dotsBar.innerHTML = '';
    for (var i = 0; i < total; i++) {
        var dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        (function (idx) {
            dot.addEventListener('click', function () {
                _carouselIdx = idx;
                updateCarousel(true);
                resetCarouselAuto();
            });
        })(i);
        dotsBar.appendChild(dot);
    }
}

function updateCarousel(animate) {
    var track    = document.getElementById('products-display');
    var viewport = document.querySelector('.carousel-viewport');
    if (!track || !viewport) return;

    var visible    = getVisibleCount();
    var products   = getProducts();
    var maxIdx     = Math.max(0, products.length - visible);
    _carouselIdx   = Math.min(_carouselIdx, maxIdx);

    /* Calcola larghezza card */
    var vw       = viewport.offsetWidth;
    var totalGap = (visible - 1) * _carouselGap;
    var cardW    = (vw - totalGap) / visible;

    track.querySelectorAll('.product-card').forEach(function (card) {
        card.style.width    = cardW + 'px';
        card.style.minWidth = cardW + 'px';
    });

    /* Transizione */
    track.style.transition = animate
        ? 'transform 0.55s cubic-bezier(0.19,1,0.22,1)'
        : 'none';

    var offset = _carouselIdx * (cardW + _carouselGap);
    track.style.transform = 'translateX(-' + offset + 'px)';

    /* Dots */
    var dots = document.querySelectorAll('.carousel-dot');
    dots.forEach(function (d, i) {
        d.classList.toggle('active', i === _carouselIdx);
    });

    /* Bottoni */
    var prevBtn = document.getElementById('carousel-prev');
    var nextBtn = document.getElementById('carousel-next');
    if (prevBtn) prevBtn.disabled = (_carouselIdx <= 0);
    if (nextBtn) nextBtn.disabled = (_carouselIdx >= maxIdx);
}

function startCarouselAuto() {
    stopCarouselAuto();
    var products = getProducts();
    if (products.length <= getVisibleCount()) return; /* nulla da scorrere */

    _carouselAuto = setInterval(function () {
        carouselStep(1);
    }, 4000);
}

function stopCarouselAuto() {
    if (_carouselAuto) { clearInterval(_carouselAuto); _carouselAuto = null; }
}

function resetCarouselAuto() {
    stopCarouselAuto();
    startCarouselAuto();
}

function debounce(fn, delay) {
    var t;
    return function () {
        clearTimeout(t);
        t = setTimeout(fn, delay);
    };
}

/* ============================================================
   PRODUCT MODAL
   ============================================================ */
function openProductModal(productId) {
    var product = getProducts().find(function (p) { return p.id === productId; });
    if (!product) return;

    var isPreorder = (product.badge === 'PREORDINA' || product.badge === 'IN ARRIVO');

    /* Bottone azione principale */
    var actionBtn = isPreorder
        ? '<button class="btn btn-primary" style="clip-path:none;flex:1;border-radius:0;min-width:160px;background:#4F46E5;border:none" onclick="showPreorderForm(' + product.id + ')">'
            + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h6"/><polyline points="16 2 22 2 22 8"/><line x1="11" y1="13" x2="22" y2="2"/></svg>'
            + ' Richiedi Preordine'
            + '</button>'
        : '<button class="btn btn-primary" style="clip-path:none;flex:1;border-radius:0;min-width:140px" onclick="window.open(\'https://www.instagram.com/_manbaga_/\',\'_blank\')">'
            + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>'
            + ' Vedi su Instagram'
            + '</button>';

    document.getElementById('product-detail-content').innerHTML =
        '<div class="pd-grid">'
        + '<div class="pd-img-wrap" onclick="zoomProductImage(\'' + product.image.replace(/'/g, "\\'") + '\',\'' + product.title.replace(/'/g, "\\'") + '\')">'
        + '<img class="pd-img" src="' + product.image + '" alt="' + product.title + '" onerror="this.src=\'https://placehold.co/400x500/0a0a0a/333?text=Cover\'">'
        + '<div class="pd-zoom-hint"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg> Clicca per ingrandire</div>'
        + '</div>'
        + '<div>'
        + (product.badge ? '<div class="pd-badge" data-badge="' + product.badge + '">' + product.badge + '</div>' : '')
        + '<h2 class="pd-title">' + product.title + '</h2>'
        + '<div class="pd-vol">' + (product.volume || '') + '</div>'
        + (product.price ? '<div class="pd-price">' + product.price + '</div>' : '')
        + '<div class="pd-desc-block" style="margin-bottom:24px">'
        + '<h3>Descrizione</h3>'
        + '<p>' + product.desc.replace(/\n/g, '<br>') + '</p>'
        + '</div>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
        + actionBtn
        + '<button class="btn btn-ghost" style="flex:1;border-radius:0;min-width:140px" onclick="window.open(\'https://www.instagram.com/_manbaga_/\',\'_blank\')">'
        + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>'
        + ' Instagram'
        + '</button>'
        + '</div>'
        /* Form preordine (nascosto) */
        + '<div id="preorder-form-' + product.id + '" class="preorder-panel hidden" data-product-id="' + product.id + '">'
        + '<div class="preorder-panel-head">&#9993; Richiesta Preordine — ' + product.title + '</div>'
        + '<div class="form-row"><label class="form-label">Il tuo nome *</label>'
        + '<input type="text" id="po-name-' + product.id + '" class="form-input" placeholder="Nome e Cognome"></div>'
        + '<div class="form-row"><label class="form-label">Email o Telefono *</label>'
        + '<input type="text" id="po-contact-' + product.id + '" class="form-input" placeholder="email@esempio.it oppure +39 …"></div>'
        + '<div class="form-row"><label class="form-label">Note (opzionale)</label>'
        + '<textarea id="po-notes-' + product.id + '" class="form-input" rows="2" placeholder="Quantità, variante, data prevista ritiro…"></textarea></div>'
        + '<div style="display:flex;gap:8px;margin-top:4px">'
        + '<button class="btn btn-primary" style="clip-path:none;flex:1;border-radius:0;background:#4F46E5;border:none" onclick="submitPreorder(' + product.id + ')">'
        + '&#10003; INVIA RICHIESTA'
        + '</button>'
        + '<button class="btn btn-ghost" style="border-radius:0;min-width:100px" onclick="hidePreorderForm(' + product.id + ')">Annulla</button>'
        + '</div>'
        + '</div>'
        + '</div>'
        + '</div>';

    document.getElementById('product-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

/* ============================================================
   PREORDINE — mostra/nascondi form + invio mail
   ============================================================ */
function showPreorderForm(productId) {
    var panel = document.getElementById('preorder-form-' + productId);
    if (panel) {
        panel.classList.remove('hidden');
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function hidePreorderForm(productId) {
    var panel = document.getElementById('preorder-form-' + productId);
    if (panel) panel.classList.add('hidden');
}

function submitPreorder(productId) {
    var product = getProducts().find(function (p) { return p.id === productId; });
    if (!product) return;

    var name    = document.getElementById('po-name-'    + productId).value.trim();
    var contact = document.getElementById('po-contact-' + productId).value.trim();
    var notes   = document.getElementById('po-notes-'   + productId).value.trim();

    if (!name || !contact) {
        alert('⚠️ Inserisci nome e contatto per procedere.');
        return;
    }

    var submitBtn = document.querySelector('#preorder-form-' + productId + ' .btn-primary');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Invio in corso…'; }

    /* Prova EmailJS; fallback a mailto: */
    if (_emailjsReady) {
        emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templatePreorder, {
            product_title:    product.title,
            product_volume:   product.volume || '—',
            product_badge:    product.badge  || '—',
            customer_name:    name,
            customer_contact: contact,
            customer_notes:   notes || 'Nessuna nota'
        })
        .then(function () {
            _preorderSuccess(productId, submitBtn);
        })
        .catch(function (err) {
            console.error('EmailJS error:', err);
            _preorderMailtoFallback(product, name, contact, notes);
            _preorderSuccess(productId, submitBtn);
        });
    } else {
        /* Fallback mailto: */
        _preorderMailtoFallback(product, name, contact, notes);
        _preorderSuccess(productId, submitBtn);
    }
}

function _preorderMailtoFallback(product, name, contact, notes) {
    var subject = encodeURIComponent('[PREORDINE] ' + product.title + ' ' + (product.volume || ''));
    var body    = encodeURIComponent(
        '⭐ NUOVA RICHIESTA DI PREORDINE\n\n'
        + 'Prodotto: ' + product.title + '\n'
        + 'Volume:   ' + (product.volume || '—') + '\n'
        + 'Stato:    ' + (product.badge  || '—') + '\n\n'
        + '─────────────────────────────\n'
        + 'Cliente:  ' + name    + '\n'
        + 'Contatto: ' + contact + '\n'
        + 'Note:     ' + (notes || 'Nessuna nota')
    );
    window.open('mailto:manbagacomics@gmail.com?subject=' + subject + '&body=' + body, '_self');
}

function _preorderSuccess(productId, btn) {
    var panel = document.getElementById('preorder-form-' + productId);
    if (panel) {
        panel.innerHTML = '<div class="preorder-success">'
            + '<div class="preorder-success-icon">&#10003;</div>'
            + '<div class="preorder-success-title">Richiesta inviata!</div>'
            + '<p class="preorder-success-msg">Ti contatteremo presto a conferma del preordine.<br>'
            + '<strong>Grazie per la fiducia!</strong></p>'
            + '</div>';
    }
    if (btn) { btn.disabled = false; }
}

/* ============================================================
   ADMIN MODAL
   ============================================================ */
function openAdminModal() {
    document.getElementById('admin-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
        var inp = document.getElementById('password-input');
        if (inp) inp.focus();
    }, 100);
}

function closeAdminModal() {
    document.getElementById('admin-modal').classList.add('hidden');
    document.body.style.overflow = '';
    _resetAdminView();
}

function _resetAdminView() {
    var login    = document.getElementById('admin-login');
    var dash     = document.getElementById('admin-dashboard');
    var logoutBtn= document.getElementById('admin-logout-btn');
    var pwdInput = document.getElementById('password-input');

    if (login)     login.classList.remove('hidden');
    if (dash)      dash.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (pwdInput)  { pwdInput.value = ''; pwdInput.placeholder = '••••••••'; }
}

function checkAdminPassword() {
    var pwd = document.getElementById('password-input').value;
    if (pwd === '12032025Xd2%') {
        document.getElementById('admin-login').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        document.getElementById('admin-logout-btn').classList.remove('hidden');
        loadAdminData();
    } else {
        var inp = document.getElementById('password-input');
        inp.value = '';
        inp.placeholder = '❌ Password errata…';
        inp.style.borderColor = '#DC2626';
        setTimeout(function () {
            inp.placeholder = '••••••••';
            inp.style.borderColor = '';
        }, 2000);
    }
}

function logoutAdmin() {
    _resetAdminView();
}

function switchAdminTab(tab, btn) {
    document.querySelectorAll('.admin-tab-content').forEach(function (el) {
        el.classList.add('hidden');
    });
    document.getElementById('admin-tab-' + tab).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(function (b) {
        b.classList.remove('active');
    });
    btn.classList.add('active');
}

/* ============================================================
   ADMIN — LOAD DATA
   ============================================================ */
function loadAdminData() {
    var events = getEvents();
    var evList = document.getElementById('admin-events-list');
    if (evList) {
        if (events.length === 0) {
            evList.innerHTML = '<p style="text-align:center;color:#999;padding:20px 0;font-size:13px">Nessun evento</p>';
        } else {
            evList.innerHTML = events.map(function (e) {
                return '<div class="admin-item">'
                    + '<div>'
                    + '<div class="admin-item-title">' + (e.day || '') + ' ' + (e.month || '') + ' — ' + e.title + '</div>'
                    + '<div class="admin-item-sub">' + (e.time || '') + (e.price ? ' · ' + e.price : '') + '</div>'
                    + '</div>'
                    + '<button class="btn-del" onclick="deleteAdminEvent(' + e.id + ')">✕</button>'
                    + '</div>';
            }).join('');
        }
    }

    var products = getProducts();
    var prList = document.getElementById('admin-products-list');
    if (prList) {
        if (products.length === 0) {
            prList.innerHTML = '<p style="text-align:center;color:#999;padding:20px 0;font-size:13px">Nessun prodotto</p>';
        } else {
            prList.innerHTML = products.map(function (p) {
                return '<div class="admin-item">'
                    + '<div>'
                    + '<div class="admin-item-title">' + p.title + '</div>'
                    + '<div class="admin-item-sub">' + (p.volume || '') + (p.badge ? ' · ' + p.badge : '') + (p.price ? ' · ' + p.price : '') + '</div>'
                    + '</div>'
                    + '<button class="btn-del" onclick="deleteAdminProduct(' + p.id + ')">✕</button>'
                    + '</div>';
            }).join('');
        }
    }
}

/* ============================================================
   ADMIN — EVENTI CRUD
   ============================================================ */
function addAdminEvent() {
    var day   = document.getElementById('event-day').value.trim();
    var month = document.getElementById('event-month').value.trim();
    var year  = document.getElementById('event-year').value.trim();
    var title = document.getElementById('event-title').value.trim();
    var desc  = document.getElementById('event-desc').value.trim();
    var time  = document.getElementById('event-time').value.trim();
    var price = document.getElementById('event-price').value.trim();

    if (!title || !desc) {
        alert('⚠️ Titolo e descrizione sono obbligatori.');
        return;
    }

    var events = getEvents();
    events.push({ id: Date.now(), day: day, month: month, year: year, title: title, desc: desc, time: time, price: price });
    setEvents(events);

    ['event-day','event-month','event-year','event-title','event-desc','event-time','event-price'].forEach(function (id) {
        document.getElementById(id).value = '';
    });

    loadAdminData();
    renderEvents();
}

function deleteAdminEvent(id) {
    if (!confirm('Eliminare questo evento?')) return;
    setEvents(getEvents().filter(function (e) { return e.id !== id; }));
    loadAdminData();
    renderEvents();
}

/* ============================================================
   ADMIN — PRODOTTI CRUD
   ============================================================ */
function addAdminProduct() {
    var title  = document.getElementById('product-title').value.trim();
    var volume = document.getElementById('product-volume').value.trim();
    var desc   = document.getElementById('product-desc').value.trim();
    var image  = document.getElementById('product-image').value.trim();
    var price  = document.getElementById('product-price').value.trim();
    var badge  = document.getElementById('product-badge').value;

    if (!title || !desc || !image) {
        alert('⚠️ Titolo, descrizione e immagine sono obbligatori.');
        return;
    }

    var products = getProducts();
    products.push({ id: Date.now(), title: title, volume: volume, desc: desc, image: image, price: price, badge: badge });
    setProducts(products);

    ['product-title','product-volume','product-desc','product-image','product-price'].forEach(function (id) {
        document.getElementById(id).value = '';
    });
    document.getElementById('product-badge').value = '';

    loadAdminData();
    renderProducts();
}

function deleteAdminProduct(id) {
    if (!confirm('Eliminare questo prodotto?')) return;
    setProducts(getProducts().filter(function (p) { return p.id !== id; }));
    loadAdminData();
    renderProducts();
}

/* ============================================================
   DEMO SEED
   ============================================================ */
var _DEMO_PRODUCTS = [
    {
        id: 9001,
        title: 'Pokémon TCG',
        volume: 'Destined Rivals — Elite Trainer Box',
        desc: 'L\'Elite Trainer Box dell\'espansione Scarlet & Violet — Destined Rivals include 9 bustine, carte energia, segnalini, dado, divisori e la coin da collezione. Nuovi Pokémon ex, illustrazioni speciali olografiche e carte Tera rarissime. In arrivo nel nostro store: contattaci per prenotare!',
        image: 'https://raw.githubusercontent.com/1niceroli/ptcg-assets/main/sv10/elite-trainer-box-svp-203.png',
        price: '',
        badge: 'IN ARRIVO'
    },
    {
        id: 9002,
        title: 'Yu-Gi-Oh!',
        volume: '2025 Mega-Pack Tin — 3 Mega Pack inclusi',
        desc: 'La leggendaria Mega-Pack Tin 2025 di Konami: ogni tin contiene 3 Mega Pack con reprint di carte da torneo di altissimo livello, incluse Starlight Rare e Prismatic Secret Rare. Ideale per potenziare qualsiasi mazzo competitivo. Disponibile a preordine — ritira in negozio alla data di uscita.',
        image: 'https://www.yugioh-card.com/en/wp-content/uploads/2025/04/2025-tin_MPtin_01.png',
        price: '',
        badge: 'PREORDINA'
    },
    {
        id: 9003,
        title: 'One Piece TCG',
        volume: 'OP-09 — Emperors in the New World',
        desc: 'La nona espansione del One Piece Card Game celebra il 2° anniversario dell\'edizione inglese con carte dal design più ricercato che mai. I Quattro Imperatori — Luffy, Buggy, Shanks e Teach — protagonisti assoluti. Display da 24 bustine, 12 carte per busta. Bustine singole disponibili in store.',
        image: 'https://cdn11.bigcommerce.com/s-ua4dd/images/stencil/1280x1280/products/247527/329332/BJP2746340__90219.1730152686.png?c=2',
        price: '',
        badge: ''
    },
    {
        id: 9004,
        title: 'Pokémon TCG',
        volume: 'Journey Together — Elite Trainer Box',
        desc: 'L\'Elite Trainer Box di Scarlet & Violet — Journey Together ha fatto sold-out mondiale in pochi giorni. Include 9 bustine, carte energia, accessori da torneo e coin da collezione. Seguici su Instagram per sapere quando torniamo disponibili.',
        image: 'https://raw.githubusercontent.com/1niceroli/ptcg-assets/main/sv9/elite-trainer-box-svp-189.png',
        price: '',
        badge: 'OUT OF STOCK'
    }
];

var _DEMO_EVENTS = [
    {
        id: 8001,
        day: '14',
        month: 'MAR',
        year: '2026',
        tag: 'TORNEO UFFICIALE',
        title: 'Local Store — One Piece TCG',
        desc: 'Torneo ufficiale Local Store di One Piece Card Game. Formato Swiss 4 round + Top 8 eliminazione diretta. Premi garantiti per i primi classificati. Iscrizioni entro le 15:00 del giorno stesso con mazzo registrato.',
        time: '15:30',
        price: 'Ingresso 6€'
    }
];

function seedDemoData() {
    var VERSION = 'v8';
    if (localStorage.getItem('manbaga-demo-seeded') === VERSION) return;
    var existingProducts = getProducts().filter(function (p) { return p.id < 9000; });
    var existingEvents   = getEvents().filter(function (e) { return e.id < 8000; });
    setProducts(existingProducts.concat(_DEMO_PRODUCTS));
    setEvents(existingEvents.concat(_DEMO_EVENTS));
    localStorage.setItem('manbaga-demo-seeded', VERSION);
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
    seedDemoData();
    renderEvents();
    renderProducts();
});

/* ============================================================
   ZOOM IMMAGINE PRODOTTO (lightbox)
   ============================================================ */
function zoomProductImage(src, alt) {
    var lb  = document.getElementById('img-lightbox');
    var img = document.getElementById('lightbox-img');
    if (!lb || !img) return;
    img.src = src;
    img.alt = alt || '';
    lb.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeImageZoom() {
    var lb = document.getElementById('img-lightbox');
    if (!lb) return;
    lb.classList.add('hidden');
    document.getElementById('lightbox-img').src = '';
    if (!document.getElementById('product-modal').classList.contains('hidden')
        || !document.getElementById('admin-modal').classList.contains('hidden')) return;
    document.body.style.overflow = '';
}

/* ============================================================
   CONTATTI — FORM EMAIL (con EmailJS o mailto: fallback)
   ============================================================ */
function sendContactMail(e) {
    e.preventDefault();

    var nome    = document.getElementById('contact-nome').value.trim();
    var email   = document.getElementById('contact-email').value.trim();
    var oggetto = document.getElementById('contact-oggetto').value.trim();
    var msg     = document.getElementById('contact-msg').value.trim();

    var btn = document.getElementById('contact-submit-btn');
    var origHTML = btn ? btn.innerHTML : '';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '…Invio in corso';
    }

    if (_emailjsReady) {
        var subjectText = oggetto
            ? oggetto + ' — Messaggio da ' + nome
            : 'Messaggio dal sito MANBAGA — ' + nome;

        /* 1) Notifica al negozio */
        emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateContact, {
            from_name:  nome,
            from_email: email,
            subject:    subjectText,
            message:    msg,
            reply_to:   email
        })
        .then(function () {
            _contactSuccess(btn, origHTML);
            /* 2) Autoreply al cliente — errori silenziosi, non bloccano l'UX */
            emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateAutoreply, {
                to_email:     email,
                to_name:      nome,
                orig_subject: subjectText,
                orig_message: msg
            }).catch(function (err) {
                console.warn('Autoreply non inviato:', err);
            });
        })
        .catch(function (err) {
            console.error('EmailJS error:', err);
            _contactMailtoFallback(nome, email, oggetto, msg);
            _contactSuccess(btn, origHTML);
        });
    } else {
        /* Fallback mailto: */
        _contactMailtoFallback(nome, email, oggetto, msg);
        _contactSuccess(btn, origHTML);
    }
}

function _contactMailtoFallback(nome, email, oggetto, msg) {
    var subjectText = oggetto
        ? oggetto + ' — Messaggio da ' + nome
        : 'Messaggio dal sito MANBAGA — ' + nome;

    var subject = encodeURIComponent(subjectText);
    var body    = encodeURIComponent(
        'Nome: ' + nome + '\r\n' +
        'Email risposta: ' + email + '\r\n\r\n' +
        'Messaggio:\r\n' + msg
    );
    window.open('mailto:manbagacomics@gmail.com?subject=' + subject + '&body=' + body, '_self');
}

function _contactSuccess(btn, origHTML) {
    if (!btn) return;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Messaggio inviato!';
    setTimeout(function () {
        btn.innerHTML = origHTML;
        btn.disabled  = false;

        /* Reset form */
        ['contact-nome','contact-email','contact-oggetto','contact-msg'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
    }, 3500);
}
