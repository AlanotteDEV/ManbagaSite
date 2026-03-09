/* ============================================================
   MANBAGA Comics & Games — script.js
   ============================================================ */

'use strict';

/* ============================================================
   LOADER
   ============================================================ */
window.addEventListener('load', function () {
    // Minimo 2.4s per far vedere tutta l'animazione
    setTimeout(function () {
        const loader = document.getElementById('loader');
        if (!loader) return;

        loader.classList.add('exit');
        document.body.classList.remove('is-loading');

        setTimeout(function () {
            loader.remove();
            // Avvia reveal per elementi già in viewport
            checkReveal();
        }, 900);
    }, 2400);
});

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
function checkReveal() {
    const observer = new IntersectionObserver(function (entries) {
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
    const nav = document.getElementById('nav');
    const burger = document.getElementById('nav-burger');
    const navLinks = document.getElementById('nav-links');

    // Classe scrolled per stile nav
    window.addEventListener('scroll', function () {
        if (window.scrollY > 40) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // Hamburger toggle
    if (burger) {
        burger.addEventListener('click', function () {
            burger.classList.toggle('open');
            navLinks.classList.toggle('open');
        });
    }

    // Chiudi nav su click link
    if (navLinks) {
        navLinks.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () {
                navLinks.classList.remove('open');
                if (burger) burger.classList.remove('open');
            });
        });
    }

    // Chiudi modal con ESC
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
let _logoClicks = 0;
let _logoTimer;

document.addEventListener('DOMContentLoaded', function () {
    const logoLink = document.getElementById('logo-link');
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
    const events = getEvents();
    const container = document.getElementById('events-display');
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
   RENDER PRODOTTI
   ============================================================ */
function renderProducts() {
    const products = getProducts();
    const container = document.getElementById('products-display');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '<div class="products-empty">Nessun prodotto ancora caricato.<br><small>Seguici su Instagram per scoprire le novità in negozio!</small></div>';
        return;
    }

    container.innerHTML = products.map(function (p) {
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
            + '</div>'
            + '</div>';
    }).join('');
}

/* ============================================================
   PRODUCT MODAL
   ============================================================ */
function openProductModal(productId) {
    var product = getProducts().find(function (p) { return p.id === productId; });
    if (!product) return;

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
        + '<div class="pd-desc-block" style="margin-bottom:24px">'
        + '<h3>Descrizione</h3>'
        + '<p>' + product.desc.replace(/\n/g, '<br>') + '</p>'
        + '</div>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
        + '<button class="btn btn-primary" style="clip-path:none;flex:1;border-radius:0;min-width:140px" onclick="window.open(\'https://wa.me/393XXXXXXXXX\',\'_blank\')">'
        + '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'
        + ' WhatsApp'
        + '</button>'
        + '<button class="btn btn-ghost" style="flex:1;border-radius:0;min-width:140px" onclick="window.open(\'https://www.instagram.com/_manbaga_/\',\'_blank\')">'
        + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>'
        + ' Instagram'
        + '</button>'
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
    var login = document.getElementById('admin-login');
    var dash  = document.getElementById('admin-dashboard');
    var logoutBtn = document.getElementById('admin-logout-btn');
    var pwdInput  = document.getElementById('password-input');

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
    // Eventi
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

    // Prodotti
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
   DEMO SEED — dati di esempio (verrà sostituito da Supabase)
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
    var VERSION = 'v7';
    if (localStorage.getItem('manbaga-demo-seeded') === VERSION) return;
    /* Forza aggiornamento demo: sovrascrive solo i record con id demo (9xxx / 8xxx) */
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
    var lb = document.getElementById('img-lightbox');
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
   CONTATTI — FORM EMAIL
   SOSTITUISCI "INSERIRE_TUA_EMAIL" con la tua email reale
   ============================================================ */
function sendContactMail(e) {
    e.preventDefault();

    var nome     = document.getElementById('contact-nome').value.trim();
    var email    = document.getElementById('contact-email').value.trim();
    var oggetto  = document.getElementById('contact-oggetto').value.trim();
    var msg      = document.getElementById('contact-msg').value.trim();

    var subjectText = oggetto
        ? oggetto + ' — Messaggio da ' + nome
        : 'Messaggio dal sito MANBAGA — ' + nome;

    var subject = encodeURIComponent(subjectText);
    var body    = encodeURIComponent(
        'Nome: ' + nome + '\r\n' +
        'Email risposta: ' + email + '\r\n\r\n' +
        'Messaggio:\r\n' + msg
    );

    /* ⬇ SOSTITUISCI con la tua email reale */
    window.open('mailto:INSERIRE_TUA_EMAIL@gmail.com?subject=' + subject + '&body=' + body, '_self');

    var btn = document.getElementById('contact-submit-btn');
    if (btn) {
        var orig = btn.innerHTML;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Client email aperto!';
        btn.disabled = true;
        setTimeout(function () {
            btn.innerHTML = orig;
            btn.disabled = false;
        }, 3500);
    }
}
