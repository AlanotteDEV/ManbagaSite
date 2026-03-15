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
    templateAutoreply: 'template_xar3ak7',
    templatePreorder:  'template_preorder'
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

    var _scrollRaf = false;
    window.addEventListener('scroll', function () {
        if (_scrollRaf) return;
        _scrollRaf = true;
        requestAnimationFrame(function () {
            nav.classList.toggle('scrolled', window.scrollY > 40);
            _scrollRaf = false;
        });
    }, { passive: true });

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
   STORAGE HELPERS — con Firebase Firestore (+ localStorage cache)
   ============================================================ */

/* Cache in-memory aggiornata da Firebase */
var _fbProducts = null; /* null = non ancora caricati */
var _fbEvents   = null;
var _fbMainApp  = null;
var _fbMainDb   = null;

/* Config Firebase (stesso progetto del gestionale) */
var _MAIN_FB_CONFIG = {
    apiKey:            'AIzaSyCG0-J2wxZGSz6eDh_E-aAe2uvpTGLmXz0',
    authDomain:        'prenotazioninegozio-65eb1.firebaseapp.com',
    projectId:         'prenotazioninegozio-65eb1',
    storageBucket:     'prenotazioninegozio-65eb1.appspot.com',
    messagingSenderId: '466874129336',
    appId:             '1:466874129336:web:fd07925523c35921fe8d4d'
};

function _initMainFirebase() {
    if (_fbMainDb) return;
    if (typeof firebase === 'undefined') return;
    try {
        try { _fbMainApp = firebase.app('main'); }
        catch(e) { _fbMainApp = firebase.initializeApp(_MAIN_FB_CONFIG, 'main'); }
        _fbMainDb = _fbMainApp.firestore();
        _subscribeFirestoreProducts();
        _subscribeFirestoreEvents();
    } catch(e) {
        console.warn('Firebase main init error:', e);
    }
}

function _subscribeFirestoreProducts() {
    if (!_fbMainDb) return;
    _fbMainDb.collection('products').orderBy('createdAt', 'desc').onSnapshot(
        function(snap) {
            _fbProducts = snap.docs.map(function(doc) {
                var d = doc.data();
                if (!d.id) d.id = d.firestoreId || doc.id;
                /* Normalizza imageUrl → image per compatibilità */
                if (d.imageUrl && !d.image) d.image = d.imageUrl;
                return d;
            });
            /* Aggiorna cache localStorage */
            try { localStorage.setItem('manbaga-products', JSON.stringify(_fbProducts)); } catch(e){}
            /* Re-render */
            renderProducts();
            if (typeof catPage !== 'undefined') catPage.render();
        },
        function(err) { console.warn('Firestore products error:', err); }
    );
}

function _subscribeFirestoreEvents() {
    if (!_fbMainDb) return;
    _fbMainDb.collection('events').orderBy('createdAt', 'desc').onSnapshot(
        function(snap) {
            _fbEvents = snap.docs.map(function(doc) {
                var d = doc.data();
                if (!d.id) d.id = doc.id;
                d._fid = doc.id; /* Firestore doc ID for torneo.html links */
                return d;
            });
            try { localStorage.setItem('manbaga-events', JSON.stringify(_fbEvents)); } catch(e){}
            renderEvents();
        },
        function(err) { console.warn('Firestore events error:', err); }
    );
}

function getEvents() {
    if (_fbEvents !== null) return _fbEvents;
    try { return JSON.parse(localStorage.getItem('manbaga-events') || '[]'); }
    catch (e) { return []; }
}

function setEvents(data) {
    localStorage.setItem('manbaga-events', JSON.stringify(data));
}

function getProducts() {
    if (_fbProducts !== null) return _fbProducts;
    try { return JSON.parse(localStorage.getItem('manbaga-products') || '[]'); }
    catch (e) { return []; }
}

function setProducts(data) {
    localStorage.setItem('manbaga-products', JSON.stringify(data));
}

/* ============================================================
   RENDER EVENTI — Tabs: competizione | evento
   ============================================================ */

var _evTab = 'competizione'; /* active tab */

var _TCG_LABELS = {
    onepiece: 'One Piece', pokemon: 'Pokémon TCG', yugioh: 'Yu-Gi-Oh!',
    magic: 'Magic: TG', dragonball: 'Dragon Ball', naruto: 'Naruto', altri: 'TCG'
};
var _STATUS_LABELS = {
    'in-arrivo': 'In Arrivo', 'in-corso': 'In Corso', 'completato': 'Completato'
};

function switchEvTab(type) {
    _evTab = type;
    document.querySelectorAll('.ev-tab').forEach(function(btn) {
        btn.classList.toggle('is-active', btn.dataset.type === type);
        btn.setAttribute('aria-selected', btn.dataset.type === type ? 'true' : 'false');
    });
    renderEvents();
}

function renderEvents() {
    var allEvents = getEvents();
    var container = document.getElementById('events-display');
    if (!container) return;

    var filtered = allEvents.filter(function(e) {
        if ((e.type || 'evento') !== _evTab) return false;
        if (e.type === 'competizione' && e.status === 'completato') return false;
        return true;
    });

    if (filtered.length === 0) {
        var msgs = {
            competizione: 'Nessun torneo in programma al momento.',
            evento:       'Nessun evento in programma al momento.'
        };
        container.innerHTML = '<div class="events-empty">'
            + (msgs[_evTab] || 'Nessun evento.')
            + '<br>Seguici su <a href="https://www.instagram.com/_manbaga_/" target="_blank" rel="noopener noreferrer" style="color:#DC2626">Instagram</a> per aggiornamenti!</div>';
        return;
    }

    container.innerHTML = filtered.map(function(e) {
        return ((e.type || 'evento') === 'competizione') ? _renderCompCard(e) : _renderEventCard(e);
    }).join('');
}

function _renderEventCard(e) {
    var tagCls = e.type === 'community' ? ' event-tag--community' : '';
    return '<div class="event-row">'
        + '<div class="event-date-box">'
        + '<div class="event-day-num">' + (e.day || '—') + '</div>'
        + '<div class="event-month-txt">' + ((e.month || '').toUpperCase()) + '</div>'
        + (e.year ? '<div class="event-year-txt">' + e.year + '</div>' : '')
        + '</div>'
        + '<div class="event-body">'
        + (e.tag ? '<div class="event-tag' + tagCls + '">' + e.tag + '</div>' : '')
        + '<h3 class="event-title">' + e.title + '</h3>'
        + '<p class="event-desc">' + e.desc + '</p>'
        + '<div class="event-meta">'
        + (e.time  ? '<span>⏰ ' + e.time + '</span>' : '')
        + (e.price ? '<span>' + e.price + '</span>' : '')
        + '</div>'
        + (e.link ? '<a href="' + e.link + '" target="_blank" rel="noopener noreferrer" class="event-link-btn" onclick="event.stopPropagation()">Iscriviti &#8594;</a>' : '')
        + '</div>'
        + '</div>';
}

function _renderCompCard(e) {
    var tcg     = e.tcg    || 'altri';
    var status  = e.status || 'in-arrivo';
    var players = Array.isArray(e.players) ? e.players : [];
    var tcgLbl  = _TCG_LABELS[tcg]    || 'TCG';
    var stLbl   = _STATUS_LABELS[status] || status;
    var fid     = e._fid   || e.id;

    var actions = '';
    if (e.link && status === 'in-arrivo') {
        actions += '<a href="' + e.link + '" target="_blank" rel="noopener noreferrer" class="event-link-btn" onclick="event.stopPropagation()">Iscriviti &#8594;</a>';
    }
    if (status === 'in-arrivo' && fid) {
        actions += '<a href="torneo.html?id=' + fid + '" class="ev-ranking-btn">&#128197; Info torneo</a>';
    }
    if (status === 'in-corso') {
        actions += '<a href="torneo.html?id=' + fid + '" class="ev-ranking-btn ev-ranking-btn--live">&#128202; Live</a>';
    }
    if (status === 'completato') {
        actions += '<a href="torneo.html?id=' + fid + '" class="ev-ranking-btn">&#127942; Classifica</a>';
    }

    return '<div class="event-row event-row--comp">'
        + '<div class="event-date-box">'
        + '<div class="event-day-num">' + (e.day || '—') + '</div>'
        + '<div class="event-month-txt">' + ((e.month || '').toUpperCase()) + '</div>'
        + (e.year ? '<div class="event-year-txt">' + e.year + '</div>' : '')
        + '<div class="ev-tcg-badge ev-tcg--' + tcg + '">' + tcgLbl + '</div>'
        + '</div>'
        + '<div class="event-body">'
        + '<div class="ev-comp-hd">'
        + '<div class="event-tag">&#127942; TORNEO</div>'
        + '<div class="ev-status-badge ev-status--' + status + '">' + stLbl + '</div>'
        + (players.length ? '<span style="font-size:11px;color:#888;font-weight:600">' + players.length + ' partecipanti</span>' : '')
        + '</div>'
        + '<h3 class="event-title">' + e.title + '</h3>'
        + '<p class="event-desc">' + e.desc + '</p>'
        + '<div class="event-meta">'
        + (e.time       ? '<span>&#9200; ' + e.time + '</span>' : '')
        + (e.price      ? '<span>' + e.price + '</span>' : '')
        + (e.maxPlayers ? '<span>&#128101; Max ' + e.maxPlayers + '</span>' : '')
        + '</div>'
        + (actions ? '<div class="ev-comp-actions">' + actions + '</div>' : '')
        + '</div>'
        + '</div>';
}

/* ============================================================
   RENDER PRODOTTI — CAROSELLO
   ============================================================ */
/* Lista prodotti attiva nel carosello — condivisa con carouselStep/buildCarouselDots */
var _carouselProducts = [];

var _DAY_MS = 24 * 60 * 60 * 1000;

function _getProductTimestamp(p) {
    var ca = p.createdAt;
    if (!ca) return (p.id > 1e12) ? p.id : null;
    if (typeof ca.toMillis === 'function') return ca.toMillis();
    if (ca._seconds) return ca._seconds * 1000;
    if (ca.seconds)  return ca.seconds  * 1000;
    return null;
}

function _getNovitaProducts() {
    var all  = getProducts();
    var now  = Date.now();
    var novita = all.filter(function(p) {
        if (!p.showInNovita) return false;
        var ts = _getProductTimestamp(p);
        if (ts === null) return true; /* nessun timestamp → mostra comunque */
        var days = (typeof p.novitaDays === 'number' && p.novitaDays > 0) ? p.novitaDays : 4;
        return (now - ts) <= days * _DAY_MS;
    });
    /* Fallback SOLO se il campo non esiste ancora su nessun prodotto (dati legacy/demo) */
    var hasField = all.some(function(p) { return typeof p.showInNovita !== 'undefined'; });
    if (novita.length === 0 && !hasField && all.length > 0) return all;
    return novita;
}

function renderProducts() {
    var products = _getNovitaProducts();
    _carouselProducts = products; /* aggiorna lista condivisa */
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
            + '<div class="product-badge" data-badge="' + (p.badge || 'Disponibile') + '">' + (p.badge || 'Disponibile') + '</div>'
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

        /* Touch swipe su mobile */
        var _touchStartX = 0;
        viewport.addEventListener('touchstart', function(e) {
            _touchStartX = e.changedTouches[0].clientX;
            stopCarouselAuto();
        }, { passive: true });
        viewport.addEventListener('touchend', function(e) {
            var dx = e.changedTouches[0].clientX - _touchStartX;
            if (Math.abs(dx) > 48) carouselStep(dx < 0 ? 1 : -1);
            startCarouselAuto();
        }, { passive: true });
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
    var products    = _carouselProducts.length ? _carouselProducts : _getNovitaProducts();
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

    var products = _carouselProducts.length ? _carouselProducts : _getNovitaProducts();
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
    var _pid = String(product.id);
    var actionBtn = isPreorder
        ? '<button class="btn btn-primary" style="clip-path:none;flex:1;border-radius:0;min-width:160px;background:#4F46E5;border:none" onclick="showPreorderForm(\'' + _pid + '\')">'
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
        + '<div class="pd-badge" data-badge="' + (product.badge || 'Disponibile') + '">' + (product.badge || 'Disponibile') + '</div>'
        + '<h2 class="pd-title">' + product.title + '</h2>'
        + '<div class="pd-vol">' + (product.volume || '') + '</div>'
        + (product.price ? '<div class="pd-price">' + product.price + '</div>' : '')
        + '<div class="pd-desc-block" style="margin-bottom:24px">'
        + '<h3>Descrizione</h3>'
        + '<p>' + product.desc.replace(/\n/g, '<br>') + '</p>'
        + '</div>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
        + actionBtn
        + '</div>'
        /* Form preordine (nascosto) */
        + '<div id="preorder-form-' + _pid + '" class="preorder-panel hidden" data-product-id="' + _pid + '">'
        + '<div class="preorder-panel-head">&#9993; Richiesta Preordine — ' + product.title + '</div>'
        + '<div class="form-row"><label class="form-label">Il tuo nome *</label>'
        + '<input type="text" id="po-name-' + _pid + '" class="form-input" placeholder="Nome e Cognome"></div>'
        + '<div class="form-row"><label class="form-label">Email o Telefono *</label>'
        + '<input type="text" id="po-contact-' + _pid + '" class="form-input" placeholder="email@esempio.it oppure +39 …"></div>'
        + '<div class="form-row"><label class="form-label">Note (opzionale)</label>'
        + '<textarea id="po-notes-' + _pid + '" class="form-input" rows="2" placeholder="Quantità, variante, data prevista ritiro…"></textarea></div>'
        + '<p style="font-size:11px;color:rgba(245,240,232,0.45);line-height:1.5;margin:8px 0 4px">'
        + 'Inviando questa richiesta accetti il trattamento dei tuoi dati personali per la gestione del preordine, '
        + 'ai sensi del <a href="privacy.html" target="_blank" style="color:rgba(245,240,232,0.65);text-decoration:underline">GDPR e della nostra Privacy Policy</a>. '
        + 'I dati (nome, contatto) saranno usati esclusivamente per contattarti riguardo a questo preordine e non ceduti a terzi.'
        + '</p>'
        + '<div style="display:flex;gap:8px;margin-top:4px">'
        + '<button class="btn btn-primary" style="clip-path:none;flex:1;border-radius:0;background:#4F46E5;border:none" onclick="submitPreorder(\'' + _pid + '\')">'
        + '&#10003; INVIA RICHIESTA'
        + '</button>'
        + '<button class="btn btn-ghost" style="border-radius:0;min-width:100px" onclick="hidePreorderForm(\'' + _pid + '\')">Annulla</button>'
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
    var product = getProducts().find(function (p) { return String(p.id) === String(productId); });
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

    if (!_fbMainDb) {
        alert('Connessione non disponibile. Riprova tra un momento.');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Invia Richiesta'; }
        return;
    }

    _fbMainDb.collection('preordini').add({
        productId:       String(productId),
        productTitle:    product.title    || '',
        productVolume:   product.volume   || '',
        productBadge:    product.badge    || '',
        customerName:    name,
        customerContact: contact,
        customerNotes:   notes || '',
        status:          'nuovo',
        createdAt:       firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
        _preorderSuccess(productId, submitBtn);
    }).catch(function(err) {
        console.error('Preorder save error:', err);
        var msg = (err && err.message) ? err.message : String(err);
        /* Messaggio user-friendly per errore permessi Firestore */
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
            msg = 'Servizio temporaneamente non disponibile. Contattaci su Instagram o WhatsApp per il preordine.';
        }
        alert('Errore durante l\'invio:\n' + msg);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Invia Richiesta'; }
    });
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
    var cat    = document.getElementById('product-cat')    ? document.getElementById('product-cat').value    : '';
    var subcat = document.getElementById('product-subcat') ? document.getElementById('product-subcat').value : '';

    if (!title || !desc || !image) {
        alert('⚠️ Titolo, descrizione e immagine sono obbligatori.');
        return;
    }

    var products = getProducts();
    products.push({ id: Date.now(), title: title, volume: volume, desc: desc, image: image, price: price, badge: badge, cat: cat, subcat: subcat });
    setProducts(products);

    ['product-title','product-volume','product-desc','product-image','product-price'].forEach(function (id) {
        document.getElementById(id).value = '';
    });
    document.getElementById('product-badge').value = '';
    if (document.getElementById('product-cat'))    document.getElementById('product-cat').value = '';
    if (document.getElementById('product-subcat')) document.getElementById('product-subcat').value = '';

    loadAdminData();
    renderProducts();
}

/* ============================================================
   ADMIN — AGGIORNA SOTTOCATEGORIE IN BASE ALLA CATEGORIA
   ============================================================ */
function updateAdminSubcats() {
    var catSel    = document.getElementById('product-cat');
    var subcatSel = document.getElementById('product-subcat');
    if (!catSel || !subcatSel) return;
    var cat = catSel.value;
    var SUBCATS = {
        manga:  [ ['shonen','Shonen'],['seinen','Seinen'],['shojo','Shojo'],['josei','Josei'],['kodomo','Kodomomuke'],['isekai','Isekai'],['sport','Sport'],['horror','Horror & Thriller'],['fantasy','Fantasy & Avventura'],['mecha','Mecha & Sci-Fi'],['slice','Slice of Life'],['yaoi','Boys Love (BL)'],['yuri','Girls Love (GL)'],['comics','Comics & Graphic Novel'],['manwha','Manwha'] ],
        libri:  [ ['romanzi','Romanzi'] ],
        carte:  [ ['pokemon','Pokémon TCG'],['yugioh','Yu-Gi-Oh!'],['magic','Magic: The Gathering'],['onepiece','One Piece TCG'],['dragonball','Dragon Ball Super'],['naruto','Naruto Card Game'],['altri','Board Games & Altri'] ],
        gadget: [ ['figure','Action Figures'],['funko','Funko Pop'],['statuette','Statuette'],['poster','Poster & Art'],['abbigliamento','Abbigliamento'],['accessori','Accessori'],['lego','Lego'],['peluche','Peluche & Plushie'] ]
    };
    if (!cat || !SUBCATS[cat]) {
        subcatSel.innerHTML = '<option value="">-- Prima scegli la categoria --</option>';
        return;
    }
    subcatSel.innerHTML = '<option value="">-- Sottocategoria --</option>'
        + SUBCATS[cat].map(function(s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('');
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
        badge: 'IN ARRIVO',
        cat: 'carte',
        subcat: 'pokemon'
    },
    {
        id: 9002,
        title: 'Yu-Gi-Oh!',
        volume: '2025 Mega-Pack Tin — 3 Mega Pack inclusi',
        desc: 'La leggendaria Mega-Pack Tin 2025 di Konami: ogni tin contiene 3 Mega Pack con reprint di carte da torneo di altissimo livello, incluse Starlight Rare e Prismatic Secret Rare. Ideale per potenziare qualsiasi mazzo competitivo. Disponibile a preordine — ritira in negozio alla data di uscita.',
        image: 'https://www.yugioh-card.com/en/wp-content/uploads/2025/04/2025-tin_MPtin_01.png',
        price: '',
        badge: 'PREORDINA',
        cat: 'carte',
        subcat: 'yugioh'
    },
    {
        id: 9003,
        title: 'One Piece TCG',
        volume: 'OP-09 — Emperors in the New World',
        desc: 'La nona espansione del One Piece Card Game celebra il 2° anniversario dell\'edizione inglese con carte dal design più ricercato che mai. I Quattro Imperatori — Luffy, Buggy, Shanks e Teach — protagonisti assoluti. Display da 24 bustine, 12 carte per busta. Bustine singole disponibili in store.',
        image: 'https://cdn11.bigcommerce.com/s-ua4dd/images/stencil/1280x1280/products/247527/329332/BJP2746340__90219.1730152686.png?c=2',
        price: '',
        badge: '',
        cat: 'carte',
        subcat: 'onepiece'
    },
    {
        id: 9004,
        title: 'Pokémon TCG',
        volume: 'Journey Together — Elite Trainer Box',
        desc: 'L\'Elite Trainer Box di Scarlet & Violet — Journey Together ha fatto sold-out mondiale in pochi giorni. Include 9 bustine, carte energia, accessori da torneo e coin da collezione. Seguici su Instagram per sapere quando torniamo disponibili.',
        image: 'https://raw.githubusercontent.com/1niceroli/ptcg-assets/main/sv9/elite-trainer-box-svp-189.png',
        price: '',
        badge: 'OUT OF STOCK',
        cat: 'carte',
        subcat: 'pokemon'
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
    var VERSION = 'v9';
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
    /* Mostra subito i dati dalla cache localStorage (render veloce) */
    renderEvents();
    renderProducts();
    /* Poi si connette a Firebase e aggiorna in real-time */
    _initMainFirebase();
    /* Demo data solo se Firestore non ha ancora dati (primo avvio) */
    setTimeout(function () {
        if (_fbProducts === null && getProducts().length === 0) {
            seedDemoData();
            renderEvents();
            renderProducts();
        }
    }, 4000);
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


/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;

    var icons = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠' };
    var toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.setAttribute('role', 'alert');
    toast.innerHTML =
        '<span class="toast-icon">' + (icons[type] || icons.info) + '</span>' +
        '<span>' + message + '</span>';

    container.appendChild(toast);

    setTimeout(function () {
        toast.classList.add('toast--exit');
        setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 3600);
}


/* ============================================================
   FIREBASE — GESTIONE TAVOLI
   ============================================================ */
var _tavFirebaseConfig = {
    apiKey:      'AIzaSyCG0-J2wxZGSz6eDh_E-aAe2uvpTGLmXz0',
    authDomain:  'prenotazioninegozio-65eb1.firebaseapp.com',
    projectId:   'prenotazioninegozio-65eb1',
    databaseURL: 'https://prenotazioninegozio-65eb1-default-rtdb.europe-west1.firebasedatabase.app',
    appId:       '1:466874129336:web:fd07925523c35921fe8d4d'
};

var _tavApp            = null;
var _tavAuth           = null;
var _tavDb             = null;
var _tavSelectedTavolo = null;
var _tavIsReg          = false;
var _tavListener       = null;

function tavInit() {
    if (typeof firebase === 'undefined') return;

    try { _tavApp = firebase.app('tavoli'); }
    catch (e) { _tavApp = firebase.initializeApp(_tavFirebaseConfig, 'tavoli'); }

    _tavAuth = _tavApp.auth();
    _tavDb   = _tavApp.database();

    _tavAuth.onAuthStateChanged(function (user) {
        var authEl = document.getElementById('tavoli-auth');
        var appEl  = document.getElementById('tavoli-app');
        if (!authEl || !appEl) return;

        if (user) {
            authEl.classList.add('hidden');
            appEl.classList.remove('hidden');

            _tavDb.ref('utenti/' + user.uid).once('value', function (snap) {
                var nome = (snap.val() && snap.val().nome) ? snap.val().nome : user.email;
                var el = document.getElementById('tav-nome');
                if (el) el.textContent = 'Benvenuto, ' + nome;
            });

            if (_tavListener) _tavDb.ref('prenotazioni').off('value', _tavListener);
            _tavListener = _tavDb.ref('prenotazioni').on('value', function (snap) {
                _tavRender(snap.val() || {});
            });

        } else {
            authEl.classList.remove('hidden');
            appEl.classList.add('hidden');
            if (_tavListener) {
                _tavDb.ref('prenotazioni').off('value', _tavListener);
                _tavListener = null;
            }
        }
    });
}

function tavHandleAuthSubmit() {
    var email = (document.getElementById('tav-email') || {}).value;
    var pass  = (document.getElementById('tav-password') || {}).value;
    if (!email || !pass) { showToast('Inserisci email e password.', 'error'); return; }

    if (_tavIsReg) {
        var nome = (document.getElementById('tav-reg-nome') || {}).value.trim();
        if (!nome) { showToast('Inserisci il tuo nome.', 'error'); return; }
        _tavAuth.createUserWithEmailAndPassword(email.trim(), pass)
            .then(function (r) {
                return _tavDb.ref('utenti/' + r.user.uid).set({ nome: nome });
            })
            .then(function () { showToast('Account creato! Benvenuto.', 'success'); })
            .catch(function (e) { showToast(e.message, 'error'); });
    } else {
        _tavAuth.signInWithEmailAndPassword(email.trim(), pass)
            .then(function () { showToast('Accesso effettuato!', 'success'); })
            .catch(function () { showToast('Credenziali non valide. Riprova.', 'error'); });
    }
}

function tavToggleAuthMode() {
    _tavIsReg = !_tavIsReg;
    var nomeEl   = document.getElementById('tav-reg-nome');
    var subEl    = document.getElementById('tav-auth-sub');
    var btnEl    = document.getElementById('tav-auth-btn');
    var toggleEl = document.getElementById('tav-auth-toggle');

    if (nomeEl)   nomeEl.classList.toggle('hidden', !_tavIsReg);
    if (subEl)    subEl.textContent   = _tavIsReg ? 'Crea il tuo account' : 'Accedi per prenotare';
    if (btnEl)    btnEl.textContent   = _tavIsReg ? 'REGISTRATI' : 'ACCEDI';
    if (toggleEl) toggleEl.textContent = _tavIsReg ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati';
}

function _tavRender(data) {
    if (!_tavAuth || !_tavAuth.currentUser) return;
    var prenotazioni = Object.values(data);
    var liberi = 0, occupati = 0;
    var grid = document.getElementById('tav-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (var i = 1; i <= 16; i++) {
        var p = null;
        for (var j = 0; j < prenotazioni.length; j++) {
            if (String(prenotazioni[j].tavolo) === String(i)) { p = prenotazioni[j]; break; }
        }

        var card = document.createElement('div');
        if (p) {
            occupati++;
            card.className = 'tavolo-card tavolo-card--occupato';
            card.innerHTML = _buildTavoloOccupato(i, p);
        } else {
            liberi++;
            card.className = 'tavolo-card tavolo-card--libero';
            (function (num) {
                card.onclick = function () { tavOpenModal(num); };
            }(i));
            card.innerHTML = _buildTavoloLibero(i);
        }
        grid.appendChild(card);
    }

    var elL = document.getElementById('count-liberi');
    var elO = document.getElementById('count-occupati');
    if (elL) elL.textContent = liberi;
    if (elO) elO.textContent = occupati;

    /* Lista (solo prenotazioni proprie) */
    var uid = _tavAuth.currentUser.uid;
    var mie = prenotazioni.filter(function (x) { return x.utenteId === uid; });
    var badge = document.getElementById('tav-count-pre');
    if (badge) badge.textContent = mie.length;

    var lista = document.getElementById('tav-lista');
    if (!lista) return;
    if (mie.length === 0) {
        lista.innerHTML = '<p class="tav-empty-msg">Nessuna prenotazione attiva</p>';
    } else {
        lista.innerHTML = mie.map(function (x) {
            return '<div class="tav-pren-item">' +
                '<div class="tav-pren-main">' +
                    '<span class="tav-pren-table">Tavolo ' + x.tavolo + '</span>' +
                    '<span class="tav-pren-name">' + _esc(x.nome) + '</span>' +
                    '<span class="tav-pren-time">Arrivo ore ' + _esc(x.orario) + '</span>' +
                '</div>' +
                '<button class="tav-cancel-btn" onclick="tavCancella(\'' + x.id + '\')" title="Cancella prenotazione" aria-label="Cancella prenotazione">&#10005;</button>' +
            '</div>';
        }).join('');
    }
}

function _buildTavoloLibero(n) {
    return '<div class="tavolo-shape">' +
        '<div class="chair-row"><span class="chair"></span><span class="chair"></span></div>' +
        '<div class="tavolo-top">' +
            '<span class="tavolo-num">' + n + '</span>' +
            '<span class="tavolo-status-badge badge--libero">FREE</span>' +
        '</div>' +
        '<div class="chair-row"><span class="chair"></span><span class="chair"></span></div>' +
    '</div>' +
    '<div class="tavolo-info"><span class="tavolo-cta">Tocca per prenotare</span></div>';
}

function _buildTavoloOccupato(n, p) {
    return '<div class="tavolo-shape">' +
        '<div class="chair-row"><span class="chair"></span><span class="chair"></span></div>' +
        '<div class="tavolo-top">' +
            '<span class="tavolo-num">' + n + '</span>' +
            '<span class="tavolo-status-badge badge--occupato">OCC.</span>' +
        '</div>' +
        '<div class="chair-row"><span class="chair"></span><span class="chair"></span></div>' +
    '</div>' +
    '<div class="tavolo-info">' +
        '<span class="tavolo-guest-name">' + _esc(p.nome) + '</span>' +
        '<span class="tavolo-guest-time">ore ' + _esc(p.orario) + '</span>' +
    '</div>';
}

function _esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function tavOpenModal(num) {
    _tavSelectedTavolo = num;
    var titleEl = document.getElementById('tav-modal-title');
    var nomeEl  = document.getElementById('tav-p-nome');
    var oraEl   = document.getElementById('tav-p-ora');
    var modal   = document.getElementById('tav-modal');
    if (titleEl) titleEl.textContent = 'TAVOLO ' + num;
    if (nomeEl)  nomeEl.value = '';
    if (oraEl)   oraEl.value  = '';
    if (modal)   modal.classList.remove('hidden');
    setTimeout(function () { if (nomeEl) nomeEl.focus(); }, 60);
}

function tavCloseModal() {
    var modal = document.getElementById('tav-modal');
    if (modal) modal.classList.add('hidden');
    _tavSelectedTavolo = null;
}

function tavSubmitPrenotazione() {
    var nome = ((document.getElementById('tav-p-nome') || {}).value || '').trim();
    var ora  = ((document.getElementById('tav-p-ora')  || {}).value || '').trim();

    if (!nome) { showToast('Inserisci il nome per la prenotazione.', 'error'); return; }
    if (!ora)  { showToast('Inserisci l\'orario di arrivo.', 'error'); return; }
    if (!_tavSelectedTavolo) return;

    var id = Date.now();
    _tavDb.ref('prenotazioni/' + id).set({
        id:       id,
        tavolo:   _tavSelectedTavolo,
        nome:     nome,
        orario:   ora,
        utenteId: _tavAuth.currentUser.uid
    })
    .then(function () {
        tavCloseModal();
        showToast('Tavolo ' + _tavSelectedTavolo + ' prenotato per ' + nome + '!', 'success');
    })
    .catch(function () {
        showToast('Errore. Verifica le regole del database Firebase.', 'error');
    });
}

function tavCancella(id) {
    if (!confirm('Vuoi cancellare questa prenotazione?')) return;
    _tavDb.ref('prenotazioni/' + id).remove()
        .then(function () { showToast('Prenotazione cancellata.', 'info'); })
        .catch(function () { showToast('Errore durante la cancellazione.', 'error'); });
}

function tavSwitchTab(tab, btn) {
    var mappa = document.getElementById('tav-view-mappa');
    var lista = document.getElementById('tav-view-lista');
    if (mappa) mappa.classList.toggle('hidden', tab !== 'mappa');
    if (lista) lista.classList.toggle('hidden', tab !== 'lista');
    document.querySelectorAll('.tav-tab').forEach(function (b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
}

function tavLogout() {
    if (_tavAuth) {
        _tavAuth.signOut()
            .then(function () { showToast('Disconnesso correttamente.', 'info'); })
            .catch(function () {});
    }
}

/* Chiudi modal tavolo con Escape */
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        var modal = document.getElementById('tav-modal');
        if (modal && !modal.classList.contains('hidden')) tavCloseModal();
    }
});

/* Init tavoli quando DOM pronto */
document.addEventListener('DOMContentLoaded', function () {
    if (typeof firebase !== 'undefined') tavInit();
});

/* ============================================================
   RECENSIONI — Sistema reale con Firebase + approvazione
   ============================================================ */

/* SVG fiore di loto (riutilizzato per le stelle) */
var _LOTUS_SVG = '<svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:block"><g transform="translate(12,12)"><ellipse cx="0" cy="-5.5" rx="3.2" ry="5" fill="currentColor" opacity="0.9"/><ellipse cx="0" cy="-5.5" rx="3" ry="4.7" fill="currentColor" opacity="0.7" transform="rotate(72)"/><ellipse cx="0" cy="-5.5" rx="3.2" ry="5" fill="currentColor" opacity="0.9" transform="rotate(144)"/><ellipse cx="0" cy="-5.5" rx="3" ry="4.7" fill="currentColor" opacity="0.7" transform="rotate(216)"/><ellipse cx="0" cy="-5.5" rx="3.2" ry="5" fill="currentColor" opacity="0.9" transform="rotate(288)"/><circle cx="0" cy="0" r="3" fill="rgba(255,255,255,0.9)"/><circle cx="0" cy="0" r="1.2" fill="currentColor"/></g></svg>';

var _rvStelle   = 0;   /* valutazione selezionata nel form */
var _rvColors   = ['#ef4444','#f97316','#eab308','#22c55e','#10b981'];
var _rvLabels   = ['','Pessimo','Scarso','Nella media','Ottimo','Eccellente'];

/* --- Subscribe Firestore recensioni approvate --- */
function _subscribeRecensioni() {
    if (!_fbMainDb) return;
    _fbMainDb.collection('recensioni')
        .where('approvata', '==', true)
        .orderBy('createdAt', 'desc')
        .onSnapshot(function(snap) {
            var list = snap.docs.map(function(doc) {
                var d = doc.data(); d.id = doc.id; return d;
            });
            renderRecensioni(list);
        }, function(_err) {
            /* Se manca l'indice o i permessi, proviamo senza orderBy */
            _fbMainDb.collection('recensioni')
                .where('approvata', '==', true)
                .onSnapshot(function(snap2) {
                    var list = snap2.docs.map(function(doc) {
                        var d = doc.data(); d.id = doc.id; return d;
                    });
                    list.sort(function(a,b){ return (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0); });
                    renderRecensioni(list);
                });
        });
}

function renderRecensioni(list) {
    var container = document.getElementById('reviews-container');
    var footer    = document.getElementById('reviews-footer');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px 20px;color:rgba(255,255,255,.3);font-size:14px">'
            + 'Ancora nessuna recensione &mdash; sii il primo! 🌸</div>';
        if (footer) footer.style.display = 'none';
        return;
    }

    /* Score medio */
    var totStelle = list.reduce(function(s,r){ return s + (r.stelle||5); }, 0);
    var avg = (totStelle / list.length).toFixed(1);

    container.innerHTML = list.map(function(r, idx) {
        var n    = Math.max(1, Math.min(5, r.stelle || 5));
        var nome = r.nome || 'Anonimo';
        var init = nome.charAt(0).toUpperCase();
        var avatarColors = ['linear-gradient(135deg,#dc2626,#f472b6)',
                            'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                            'linear-gradient(135deg,#10b981,#059669)',
                            'linear-gradient(135deg,#f59e0b,#d97706)',
                            'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                            'linear-gradient(135deg,#ec4899,#be185d)'];
        var avatarBg = avatarColors[idx % avatarColors.length];
        var loti = '';
        for (var i = 1; i <= 5; i++) {
            loti += '<span class="lotus-star' + (i <= n ? '' : ' lotus-star--dim') + '" style="color:' + (i <= n ? (_rvColors[n-1]||'#dc2626') : '') + '">' + _LOTUS_SVG + '</span>';
        }
        var delay = ['','reveal-d1','reveal-d2','reveal-d3','reveal-d1','reveal-d2'][idx % 6];
        return '<div class="review-card reveal ' + delay + '">'
            + '<div class="review-lotus">' + loti + '</div>'
            + '<p class="review-text">&laquo;' + _escHtml(r.testo || '') + '&raquo;</p>'
            + '<div class="review-author">'
            + '<div class="review-avatar" style="background:' + avatarBg + '">' + _escHtml(init) + '</div>'
            + '<div><div class="review-name">' + _escHtml(nome) + '</div>'
            + '<div class="review-sub">' + _fmtDataRecensione(r.createdAt) + '</div>'
            + '</div></div></div>';
    }).join('');

    /* Footer score */
    if (footer) {
        footer.style.display = 'flex';
        var avgEl   = document.getElementById('reviews-avg');
        var countEl = document.getElementById('reviews-count');
        if (avgEl)   avgEl.textContent   = avg;
        if (countEl) countEl.textContent = list.length;
    }

    checkReveal();
}

function _fmtDataRecensione(ts) {
    if (!ts) return 'Cliente MANBAGA';
    try {
        var d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
        return d.toLocaleDateString('it-IT', { month:'long', year:'numeric' });
    } catch(e) { return 'Cliente MANBAGA'; }
}

function _escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* --- Modal form recensione --- */
function openReviewModal() {
    _rvStelle = 0;
    var modal       = document.getElementById('review-modal');
    var formView    = document.getElementById('rv-form-view');
    var successView = document.getElementById('rv-success-view');
    var nome        = document.getElementById('rv-nome');
    var testo       = document.getElementById('rv-testo');
    var err         = document.getElementById('rv-error');
    var btn         = document.getElementById('rv-submit-btn');

    if (formView)    formView.style.display    = 'flex';
    if (successView) successView.style.display = 'none';
    if (nome)  nome.value  = '';
    if (testo) testo.value = '';
    if (err)   { err.style.display = 'none'; err.textContent = ''; }
    var charsEl = document.getElementById('rv-chars');
    if (charsEl) charsEl.textContent = '0';
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-3px;margin-right:6px"><polyline points="20 6 9 17 4 12"/></svg>Invia Recensione'; }
    updateStarDisplay(0);
    if (modal) modal.classList.remove('hidden');
    if (nome) setTimeout(function(){ nome.focus(); }, 80);
}

function closeReviewModal() {
    var modal = document.getElementById('review-modal');
    if (modal) modal.classList.add('hidden');
}

function selectStar(n) {
    _rvStelle = n;
    updateStarDisplay(n);
}

function hoverStar(n) {
    updateStarDisplay(n || _rvStelle);
}

function updateStarDisplay(n) {
    var btns  = document.querySelectorAll('.rv-star-btn');
    var label = document.getElementById('rv-star-label');
    btns.forEach(function(btn) {
        var v = parseInt(btn.dataset.v);
        /* Inietta SVG se il bottone è vuoto */
        if (!btn.querySelector('svg')) btn.innerHTML = _LOTUS_SVG;
        var active = v <= n;
        btn.style.color     = active ? (_rvColors[n-1] || '#dc2626') : 'rgba(220,38,38,0.25)';
        btn.style.transform = active ? 'scale(1.25)' : 'scale(1)';
        btn.style.opacity   = active ? '1' : '0.4';
    });
    if (label) {
        label.textContent = _rvLabels[n] || 'Seleziona una valutazione';
        label.style.color = n ? (_rvColors[n-1] || '') : '';
    }
}

/* Contatore caratteri textarea + pre-popola stelle */
document.addEventListener('DOMContentLoaded', function() {
    var ta = document.getElementById('rv-testo');
    if (ta) ta.addEventListener('input', function() {
        var el = document.getElementById('rv-chars');
        if (el) el.textContent = ta.value.length;
    });
    /* Pre-popola i bottoni stelle con i fiori SVG al caricamento pagina,
       così sono sempre visibili quando il modal si apre */
    if (document.querySelector('.rv-star-btn')) updateStarDisplay(0);
});

function submitRecensione() {
    var nome  = (document.getElementById('rv-nome')  || {}).value || '';
    var testo = (document.getElementById('rv-testo') || {}).value || '';
    var errEl = document.getElementById('rv-error');
    var btn   = document.getElementById('rv-submit-btn');

    nome  = nome.trim();
    testo = testo.trim();

    function showErr(msg) {
        if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    }

    if (!nome)       { showErr('Inserisci il tuo nome.'); return; }
    if (!_rvStelle)  { showErr('Seleziona una valutazione.'); return; }
    if (!testo || testo.length < 10) { showErr('Scrivi almeno 10 caratteri.'); return; }
    if (errEl) errEl.style.display = 'none';

    if (!_fbMainDb) {
        showErr('Connessione Firebase non disponibile. Riprova tra un secondo.');
        return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = 'Invio…'; }

    _fbMainDb.collection('recensioni').add({
        nome:      nome,
        testo:     testo,
        stelle:    _rvStelle,
        approvata: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
        var formView    = document.getElementById('rv-form-view');
        var successView = document.getElementById('rv-success-view');
        var nameEl      = document.getElementById('rv-success-name');
        if (formView)    formView.style.display    = 'none';
        if (successView) successView.style.display = 'flex';
        if (nameEl)      nameEl.textContent        = nome;
    }).catch(function(e) {
        showErr('Errore: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-3px;margin-right:6px"><polyline points="20 6 9 17 4 12"/></svg>Invia Recensione'; }
    });
}

/* Chiudi modal recensione con Escape */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        var m = document.getElementById('review-modal');
        if (m && !m.classList.contains('hidden')) closeReviewModal();
    }
});

/* Avvia subscribe recensioni assieme agli altri dati */
(function() {
    var _origInit = _initMainFirebase;
    _initMainFirebase = function() {
        _origInit();
        /* Aspetta che _fbMainDb sia pronto */
        var tries = 0;
        var check = setInterval(function() {
            tries++;
            if (_fbMainDb) { clearInterval(check); _subscribeRecensioni(); }
            else if (tries > 30) clearInterval(check);
        }, 200);
    };
})();
