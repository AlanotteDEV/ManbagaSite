/* ============================================================
   catalogo-init.js — script di inizializzazione per catalogo.html
   ============================================================ */

/* ---- Global image error handler (product covers) ---- */
document.addEventListener('error', function(e) {
    var img = e.target;
    if (img.tagName !== 'IMG' || img.dataset.errHandled) return;
    if (img.classList.contains('cp-card-img') || img.classList.contains('rv-thumb')) {
        img.dataset.errHandled = '1';
        img.src = 'https://placehold.co/300x400/0d0d0d/333?text=Cover';
    }
}, true);

var catPage = (function () {

    var _JP_MAP = {
        manga:  { jp: 'マンガ・コミック', kanji: '漫' },
        libri:  { jp: '本・小説',         kanji: '本' },
        carte:  { jp: 'カード・ゲーム',   kanji: '遊' },
        gadget: { jp: 'フィギュア・グッズ', kanji: '具' }
    };

    var _DEFAULT_CATS = {
        manga: {
            label: 'Manga & Comics', jp: 'マンガ・コミック', kanji: '漫',
            subs: [
                { key: 'shonen',  label: 'Shonen' }, { key: 'seinen',  label: 'Seinen' },
                { key: 'shojo',   label: 'Shojo' },  { key: 'josei',   label: 'Josei' },
                { key: 'kodomo',  label: 'Kodomomuke' }, { key: 'isekai', label: 'Isekai' },
                { key: 'sport',   label: 'Sport' },  { key: 'horror',  label: 'Horror & Thriller' },
                { key: 'fantasy', label: 'Fantasy & Avventura' }, { key: 'mecha', label: 'Mecha & Sci-Fi' },
                { key: 'slice',   label: 'Slice of Life' }, { key: 'yaoi', label: 'Boys Love (BL)' },
                { key: 'yuri',    label: 'Girls Love (GL)' }, { key: 'comics', label: 'Comics & Graphic Novel' },
                { key: 'manwha',  label: 'Manwha' }, { key: 'romance', label: 'Romance' }
            ]
        },
        libri:  { label: 'Libri',           jp: '本・小説',         kanji: '本', subs: [{ key: 'romanzi', label: 'Romanzi' }] },
        carte:  {
            label: 'Carte & Giochi', jp: 'カード・ゲーム', kanji: '遊',
            subs: [
                { key: 'pokemon',    label: 'Pokémon TCG' }, { key: 'yugioh',     label: 'Yu-Gi-Oh!' },
                { key: 'magic',      label: 'Magic: The Gathering' }, { key: 'onepiece', label: 'One Piece TCG' },
                { key: 'dragonball', label: 'Dragon Ball Super' }, { key: 'naruto', label: 'Naruto Card Game' },
                { key: 'altri',      label: 'Board Games & Altri' }
            ]
        },
        gadget: {
            label: 'Gadget & Figures', jp: 'フィギュア・グッズ', kanji: '具',
            subs: [
                { key: 'figure', label: 'Action Figures' }, { key: 'funko', label: 'Funko Pop' },
                { key: 'statuette', label: 'Statuette' }, { key: 'poster', label: 'Poster & Art' },
                { key: 'abbigliamento', label: 'Abbigliamento' }, { key: 'accessori', label: 'Accessori' },
                { key: 'lego', label: 'Lego' }, { key: 'peluche', label: 'Peluche & Plushie' }
            ]
        }
    };

    function _buildCatsFromStorage() {
        try {
            var raw = localStorage.getItem('manbaga_categories');
            if (!raw) return _DEFAULT_CATS;
            var data = JSON.parse(raw);
            if (!data || !data.cats || !data.cats.length) return _DEFAULT_CATS;
            var result = {};
            data.cats.forEach(function (c) {
                var jpFallback = _JP_MAP[c.key] || { jp: c.label, kanji: (c.label || '?').charAt(0) };
                var rawSubs = (data.subcats && data.subcats[c.key]) || [];
                result[c.key] = {
                    label: c.label,
                    jp:    c.jp    || jpFallback.jp,
                    kanji: c.kanji || jpFallback.kanji,
                    subs:  rawSubs.map(function (s) { return { key: s[0], label: s[1] }; })
                };
            });
            return result;
        } catch (e) { return _DEFAULT_CATS; }
    }

    var CATS = _buildCatsFromStorage();

    var _cat = 'carte';
    var _sub = 'all';
    var _query = '';
    var _page  = 0;
    var PAGE_SIZE = 25;

    function _parseUrl() {
        var params = new URLSearchParams(window.location.search);
        var c = params.get('cat');
        var s = params.get('sub');
        if (c && CATS[c]) _cat = c;
        if (s && CATS[_cat] && CATS[_cat].subs && CATS[_cat].subs.some(function(sub){ return sub.key === s; })) _sub = s;
    }

    function _updateUrl() {
        var url = 'catalogo.html?cat=' + _cat + (_sub && _sub !== 'all' ? '&sub=' + _sub : '');
        history.replaceState(null, '', url);
    }

    function _countCat(products, cat) {
        return products.filter(function (p) { return p.cat === cat; }).length;
    }
    function _countSub(products, cat, sub) {
        if (sub === 'all') return _countCat(products, cat);
        return products.filter(function (p) { return p.cat === cat && p.subcat === sub; }).length;
    }

    function _updateCounts(products) {
        Object.keys(CATS).forEach(function (catKey) {
            var el = document.getElementById('cnt-' + catKey + '-all');
            if (el) el.textContent = _countCat(products, catKey);
            CATS[catKey].subs.forEach(function (s) {
                var sel = document.getElementById('cnt-' + catKey + '-' + s.key);
                if (sel) sel.textContent = _countSub(products, catKey, s.key);
            });
        });
    }

    function _updateSidebar() {
        Object.keys(CATS).forEach(function (catKey) {
            var block = document.getElementById('cpnb-' + catKey);
            if (!block) return;
            if (catKey === _cat) {
                block.classList.add('is-active');
                var hdBtn = block.querySelector('.cp-nav-hd');
                if (hdBtn) hdBtn.setAttribute('aria-expanded', 'true');
            } else {
                block.classList.remove('is-active');
                var hdBtn2 = block.querySelector('.cp-nav-hd');
                if (hdBtn2) hdBtn2.setAttribute('aria-expanded', 'false');
            }
            var subList = document.getElementById('cpsub-' + catKey);
            if (!subList) return;
            subList.querySelectorAll('.cp-sub-btn').forEach(function (btn) {
                btn.classList.toggle('is-active', catKey === _cat && btn.dataset.sub === _sub);
            });
        });
    }

    function _updateMobTabs() {
        var tabs = document.querySelectorAll('#cp-mob-tabs .cp-mob-tab');
        tabs.forEach(function (tab) {
            tab.classList.toggle('is-active', tab.dataset.cat === _cat);
        });
    }

    function _updatePills(products) {
        var bar = document.getElementById('cp-pills-bar');
        if (!bar) return;
        var catDef = CATS[_cat];
        if (!catDef) { bar.innerHTML = ''; return; }
        var allCount = _countCat(products, _cat);
        var html = '<button class="cp-pill' + (_sub === 'all' ? ' is-active' : '') + '" data-sub="all">'
            + 'Tutti'
            + '<span class="cp-pill-cnt">' + allCount + '</span>'
            + '</button>';
        catDef.subs.forEach(function (s) {
            var cnt = _countSub(products, _cat, s.key);
            html += '<button class="cp-pill' + (_sub === s.key ? ' is-active' : '') + '" data-sub="' + s.key + '">'
                + s.label
                + '<span class="cp-pill-cnt">' + cnt + '</span>'
                + '</button>';
        });
        bar.innerHTML = html;
    }

    function _updateHeader(filteredCount) {
        var catDef = CATS[_cat] || { label: 'Catalogo', jp: 'カタログ' };
        var jpEl    = document.getElementById('cp-content-jp');
        var titleEl = document.getElementById('cp-content-title');
        var subLbl  = document.getElementById('cp-sub-label');
        var countEl = document.getElementById('cp-result-count');
        var bcCat   = document.getElementById('cp-bc-cat');
        if (jpEl)    jpEl.textContent = catDef.jp;
        if (bcCat)   bcCat.textContent = catDef.label;
        var subLabel = '';
        if (_sub && _sub !== 'all') {
            var found = (catDef.subs || []).find(function (s) { return s.key === _sub; });
            if (found) subLabel = ' — ' + found.label;
        }
        if (titleEl) {
            titleEl.innerHTML = catDef.label.replace(/&/g, '&amp;')
                + (subLabel ? ' <span class="cp-sub-active-label">' + subLabel.replace(/&/g, '&amp;') + '</span>' : '');
        }
        if (subLbl) subLbl.style.display = 'none';
        if (countEl) {
            countEl.textContent = filteredCount === 1 ? '1 prodotto' : filteredCount + ' prodotti';
        }
    }

    function _sortProducts(products) {
        var sortEl = document.getElementById('cp-sort');
        var mode = sortEl ? sortEl.value : 'recent';
        var copy = products.slice();
        if (mode === 'recent') {
            copy.sort(function (a, b) { return b.id - a.id; });
        } else if (mode === 'az') {
            copy.sort(function (a, b) { return a.title.localeCompare(b.title, 'it'); });
        } else if (mode === 'stato') {
            var BADGE_ORDER = { 'NOVITÀ': 0, 'HOT': 1, 'IN ARRIVO': 2, 'PREORDINA': 3, 'OUT OF STOCK': 4, 'ESAURITO': 5, '': 6 };
            copy.sort(function (a, b) {
                var oa = BADGE_ORDER[a.badge] !== undefined ? BADGE_ORDER[a.badge] : 6;
                var ob = BADGE_ORDER[b.badge] !== undefined ? BADGE_ORDER[b.badge] : 6;
                return oa - ob;
            });
        }
        return copy;
    }

    function _cardHtml(p) {
        var isOos = (p.badge === 'OUT OF STOCK' || p.badge === 'ESAURITO');
        var html = '<div class="cp-card' + (isOos ? ' cp-card--oos' : '') + '" data-pid="' + p.id + '">';
        html += '<div class="product-badge" data-badge="' + (p.badge || 'Disponibile') + '">' + (p.badge || 'Disponibile') + '</div>';
        html += '<div class="cp-card-img-wrap">'
            + '<img class="cp-card-img" src="' + p.image + '" alt="' + _esc(p.title) + '" loading="lazy">'
            + '<div class="cp-card-overlay"><span>Scopri &#8250;</span></div>'
            + '</div>'
            + '<div class="cp-card-body">'
            + '<div class="cp-card-store">MANBAGA.</div>'
            + '<div class="cp-card-title">' + _esc(p.title) + '</div>';
        if (p.volume) html += '<div class="cp-card-vol">' + _esc(p.volume) + '</div>';
        if (p.price)  html += '<div class="cp-card-price">' + _esc(p.price) + '</div>';
        html += '</div></div>';
        return html;
    }

    function _esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function render() {
        var allProducts = getProducts();
        var isSearching = _query.trim().length > 0;
        var filtered;
        if (isSearching) {
            var q = _query.trim().toLowerCase();
            filtered = allProducts.filter(function (p) {
                return (p.cat) && (
                    (p.title  || '').toLowerCase().includes(q) ||
                    (p.volume || '').toLowerCase().includes(q) ||
                    (p.desc   || '').toLowerCase().includes(q)
                );
            });
        } else {
            var catProducts = _cat
                ? allProducts.filter(function (p) { return p.cat === _cat; })
                : allProducts.filter(function (p) { return !!p.cat; });
            filtered = (_cat && _sub && _sub !== 'all')
                ? catProducts.filter(function (p) { return p.subcat === _sub; })
                : catProducts;
        }

        var scopeEl = document.getElementById('cp-search-scope');
        var clearBtn = document.getElementById('cp-search-clear');
        if (scopeEl)  scopeEl.classList.toggle('hidden', !isSearching);
        if (clearBtn) clearBtn.classList.toggle('hidden', !isSearching);

        filtered = _sortProducts(filtered);

        _updateCounts(allProducts);
        _updateSidebar();
        _updateMobTabs();
        _updatePills(allProducts);
        _updateHeader(filtered.length);
        _updateUrl();

        var grid = document.getElementById('cp-grid');
        if (!grid) return;

        if (filtered.length === 0) {
            if (typeof _fbProducts !== 'undefined' && _fbProducts === null && allProducts.length === 0) {
                var skCards = '';
                for (var sk = 0; sk < 12; sk++) {
                    skCards += '<div class="cp-skeleton-card">'
                        + '<div class="cp-skeleton-img"></div>'
                        + '<div class="cp-skeleton-body">'
                        + '<div class="cp-skeleton-line"></div>'
                        + '<div class="cp-skeleton-line short"></div>'
                        + '<div class="cp-skeleton-line xshort"></div>'
                        + '</div></div>';
                }
                grid.innerHTML = '<div class="cp-skeleton-grid">' + skCards + '</div>';
                _renderPagination(0, 0);
                return;
            }
            grid.innerHTML = '<div class="cp-empty">'
                + '<div class="cp-empty-kanji">空</div>'
                + '<div class="cp-empty-title">Nessun prodotto in questa sezione</div>'
                + '<p class="cp-empty-msg">Non ci sono ancora prodotti qui.<br>'
                + 'Seguici su <a href="https://www.instagram.com/_manbaga_/" target="_blank" rel="noopener noreferrer" style="color:#DC2626">Instagram</a> per scoprire le novità!</p>'
                + '</div>';
            _renderPagination(0, 0);
            return;
        }

        var totalPages = Math.ceil(filtered.length / PAGE_SIZE);
        if (_page >= totalPages) _page = totalPages - 1;
        if (_page < 0) _page = 0;

        var paginated = filtered.slice(_page * PAGE_SIZE, (_page + 1) * PAGE_SIZE);

        grid.innerHTML = paginated.map(function (p, i) {
            return '<div style="animation-delay:' + (i * 0.05) + 's">' + _cardHtml(p) + '</div>';
        }).join('');

        var wrappers = grid.querySelectorAll(':scope > div[style]');
        wrappers.forEach(function (wrapper) {
            var card = wrapper.querySelector('.cp-card');
            if (card) {
                card.style.animationDelay = wrapper.style.animationDelay;
                wrapper.replaceWith(card);
            }
        });

        _renderPagination(totalPages, filtered.length);
    }

    function _renderPagination(totalPages, totalItems) {
        var el = document.getElementById('cp-pagination');
        if (!el) return;
        if (totalPages <= 1) { el.innerHTML = ''; return; }

        var html = '<div class="cp-pag-info">Pagina ' + (_page + 1) + ' di ' + totalPages
            + ' &nbsp;·&nbsp; ' + totalItems + ' prodotti</div>'
            + '<div class="cp-pag-btns">';

        html += '<button class="cp-pag-btn" data-page="' + (_page - 1) + '"'
            + (_page === 0 ? ' disabled' : '') + '>&#8592; Precedente</button>';

        var start = Math.max(0, _page - 2);
        var end   = Math.min(totalPages - 1, _page + 2);
        if (start > 0) html += '<button class="cp-pag-btn cp-pag-num" data-page="0">1</button>'
            + (start > 1 ? '<span class="cp-pag-ellipsis">…</span>' : '');
        for (var i = start; i <= end; i++) {
            html += '<button class="cp-pag-btn cp-pag-num' + (i === _page ? ' is-active' : '') + '" data-page="' + i + '">' + (i + 1) + '</button>';
        }
        if (end < totalPages - 1) html += (end < totalPages - 2 ? '<span class="cp-pag-ellipsis">…</span>' : '')
            + '<button class="cp-pag-btn cp-pag-num" data-page="' + (totalPages - 1) + '">' + totalPages + '</button>';

        html += '<button class="cp-pag-btn" data-page="' + (_page + 1) + '"'
            + (_page >= totalPages - 1 ? ' disabled' : '') + '>Successiva &#8594;</button>';

        html += '</div>';
        el.innerHTML = html;
    }

    function goPage(n) {
        _page = n;
        render();
        var main = document.getElementById('cp-main');
        if (main) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function setCat(cat) {
        if (!CATS[cat]) return;
        _cat = (_cat === cat) ? null : cat;
        _sub = 'all';
        _page = 0;
        render();
    }

    function setSub(sub) {
        _sub = sub || 'all';
        _page = 0;
        render();
    }

    function _generateNav() {
        var mobTabsEl  = document.getElementById('cp-mob-tabs');
        var sidebarEl  = document.getElementById('cp-nav-blocks');
        var tabsHtml   = '';
        var sidebarHtml = '';
        var keys = Object.keys(CATS);
        keys.forEach(function (catKey, idx) {
            var cat = CATS[catKey];
            var num = (idx + 1 < 10 ? '0' : '') + (idx + 1);
            tabsHtml += '<button class="cp-mob-tab" role="tab" data-cat="' + catKey + '">'
                + '<span>' + _esc(cat.label) + '</span>'
                + '</button>';
            sidebarHtml += '<div class="cp-nav-block" id="cpnb-' + catKey + '">'
                + '<button class="cp-nav-hd" data-cat="' + catKey + '" aria-expanded="false">'
                + '<span class="cp-nav-num">' + num + '</span>'
                + '<span class="cp-nav-info">'
                + '<span class="cp-nav-name">' + _esc(cat.label) + '</span>'
                + '<span class="cp-nav-jp">' + cat.jp + '</span>'
                + '</span>'
                + '<span class="cp-nav-arrow">›</span>'
                + '</button>'
                + '<ul class="cp-sub-list" id="cpsub-' + catKey + '">'
                + '<li><button class="cp-sub-btn" data-sub="all">Tutti <span class="cp-cnt" id="cnt-' + catKey + '-all">0</span></button></li>';
            cat.subs.forEach(function (s) {
                sidebarHtml += '<li><button class="cp-sub-btn" data-sub="' + s.key + '">'
                    + _esc(s.label)
                    + ' <span class="cp-cnt" id="cnt-' + catKey + '-' + s.key + '">0</span>'
                    + '</button></li>';
            });
            sidebarHtml += '</ul></div>';
        });
        if (mobTabsEl) mobTabsEl.innerHTML = tabsHtml;
        if (sidebarEl) sidebarEl.innerHTML = sidebarHtml;
    }

    function init() {
        CATS = _buildCatsFromStorage();
        _generateNav();
        _parseUrl();
        render();
    }

    function setSearch(q) {
        _query = q || '';
        _page = 0;
        render();
    }

    function clearSearch() {
        _query = '';
        _page = 0;
        var input = document.getElementById('cp-search-input');
        if (input) input.value = '';
        render();
    }

    function refreshCats() {
        CATS = _buildCatsFromStorage();
        _generateNav();
        render();
    }

    return {
        setCat:       setCat,
        setSub:       setSub,
        render:       render,
        init:         init,
        setSearch:    setSearch,
        clearSearch:  clearSearch,
        goPage:       goPage,
        refreshCats:  refreshCats
    };
})();

/* ---- Recently Viewed ---- */
function renderRecentlyViewed() {
    var section = document.getElementById('recently-viewed-section');
    var grid    = document.getElementById('recently-viewed-grid');
    if (!section || !grid) return;
    try {
        var ids   = JSON.parse(localStorage.getItem('mb_recent') || '[]');
        var prods = typeof getProducts === 'function' ? getProducts() : [];
        var items = ids.map(function(id) {
            return prods.find(function(p) { return p.id === id; });
        }).filter(Boolean);
        if (items.length < 2) { section.style.display = 'none'; return; }
        section.style.display = 'block';
        grid.innerHTML = items.map(function(p) {
            var isOos = p.badge === 'OUT OF STOCK' || p.badge === 'ESAURITO';
            return '<div class="rv-item" data-rv-pid="' + p.id + '" style="cursor:pointer;position:relative;' + (isOos ? 'opacity:.5;' : '') + '">'
                + '<div style="aspect-ratio:3/4;background:#1a1a1a;overflow:hidden;margin-bottom:8px">'
                + '<img class="rv-thumb" src="' + (p.image || '') + '" alt="' + _escHtml(p.title) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform .3s">'
                + (p.badge ? '<div style="position:absolute;top:6px;left:6px;font-size:9px;font-weight:700;letter-spacing:.08em;padding:2px 7px;background:' + (p.badge==='HOT'||p.badge==='NOVITÀ'?'#DC2626':'#374151') + ';color:#fff">' + p.badge + '</div>' : '')
                + '</div>'
                + '<div style="font-size:11px;font-weight:600;color:rgba(245,240,232,.8);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _escHtml(p.title) + '</div>'
                + (p.price ? '<div style="font-size:11px;color:#DC2626;font-weight:700;margin-top:2px">' + _escHtml(p.price) + '</div>' : '')
                + '</div>';
        }).join('');
    } catch(e) { section.style.display = 'none'; }
}

function _escHtml(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function clearRecentlyViewed() {
    localStorage.removeItem('mb_recent');
    var section = document.getElementById('recently-viewed-section');
    if (section) section.style.display = 'none';
}

/* ---- Bootstrap on DOMContentLoaded ---- */
document.addEventListener('DOMContentLoaded', function () {
    catPage.init();
    setTimeout(function () {
        if (typeof _initMainFirebase === 'function') _initMainFirebase();
    }, 0);
    setTimeout(renderRecentlyViewed, 300);

    /* ── Static HTML event listeners ── */

    /* Product modal */
    var productModal = document.getElementById('product-modal');
    if (productModal) {
        productModal.addEventListener('click', function(e) {
            if (e.target === productModal && typeof closeProductModal === 'function') closeProductModal();
        });
        var closeBtn = productModal.querySelector('.btn-modal-close');
        if (closeBtn) closeBtn.addEventListener('click', function() {
            if (typeof closeProductModal === 'function') closeProductModal();
        });
    }

    /* Search input */
    var searchInput = document.getElementById('cp-search-input');
    if (searchInput) searchInput.addEventListener('input', function() { catPage.setSearch(this.value); });

    /* Search clear button */
    var searchClear = document.getElementById('cp-search-clear');
    if (searchClear) searchClear.addEventListener('click', function() { catPage.clearSearch(); });

    /* Sort select */
    var sortSelect = document.getElementById('cp-sort');
    if (sortSelect) sortSelect.addEventListener('change', function() { catPage.render(); });

    /* Clear recently viewed */
    var clearRvBtn = document.getElementById('clear-rv-btn');
    if (clearRvBtn) clearRvBtn.addEventListener('click', clearRecentlyViewed);

    /* Image lightbox */
    var imgLightbox = document.getElementById('img-lightbox');
    if (imgLightbox) {
        imgLightbox.addEventListener('click', function(e) {
            if (e.target === imgLightbox && typeof closeImageZoom === 'function') closeImageZoom();
        });
        var lbClose = imgLightbox.querySelector('.lightbox-close');
        if (lbClose) lbClose.addEventListener('click', function() {
            if (typeof closeImageZoom === 'function') closeImageZoom();
        });
        var lbImg = document.getElementById('lightbox-img');
        if (lbImg) lbImg.addEventListener('click', function(e) { e.stopPropagation(); });
    }

    /* ── Event delegation for dynamically generated elements ── */
    document.addEventListener('click', function(e) {
        /* Sidebar nav header → setCat */
        var navHd = e.target.closest('.cp-nav-hd[data-cat]');
        if (navHd) { catPage.setCat(navHd.dataset.cat); return; }

        /* Sidebar sub buttons → setSub */
        var subBtn = e.target.closest('.cp-sub-btn[data-sub]');
        if (subBtn) {
            /* Only fire if inside the active cat nav block, or pills bar */
            catPage.setSub(subBtn.dataset.sub); return;
        }

        /* Mobile tabs → setCat */
        var mobTab = e.target.closest('.cp-mob-tab[data-cat]');
        if (mobTab) { catPage.setCat(mobTab.dataset.cat); return; }

        /* Pills → setSub */
        var pill = e.target.closest('#cp-pills-bar .cp-pill[data-sub]');
        if (pill) { catPage.setSub(pill.dataset.sub); return; }

        /* Pagination → goPage */
        var pagBtn = e.target.closest('#cp-pagination .cp-pag-btn[data-page]');
        if (pagBtn && !pagBtn.disabled) { catPage.goPage(parseInt(pagBtn.dataset.page, 10)); return; }

        /* Product card → openProductModal */
        var card = e.target.closest('.cp-card[data-pid]');
        if (card && typeof openProductModal === 'function') {
            openProductModal(parseInt(card.dataset.pid, 10)); return;
        }

        /* Recently viewed item → openProductModal */
        var rv = e.target.closest('.rv-item[data-rv-pid]');
        if (rv && typeof openProductModal === 'function') {
            openProductModal(parseInt(rv.dataset.rvPid, 10)); return;
        }
    });

    /* Recently viewed thumbnail hover effect via delegation */
    document.addEventListener('mouseover', function(e) {
        if (e.target.classList.contains('rv-thumb')) e.target.style.transform = 'scale(1.05)';
    });
    document.addEventListener('mouseout', function(e) {
        if (e.target.classList.contains('rv-thumb')) e.target.style.transform = '';
    });
});
