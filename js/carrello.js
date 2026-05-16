(function () {
    // ============================================================
    // LOYALTY TIER SYSTEM
    // ============================================================
    var TIER_THRESHOLDS = { bronze: 0, silver: 500, gold: 1200 };

    var TIERS = {
        bronze: {
            key: 'bronze', label: 'BRONZO',
            shippingFree: 50,
            intro: null,
            perks: ['Spedizione gratis sopra €50', 'Accesso al catalogo standard', 'Newsletter & anteprime']
        },
        silver: {
            key: 'silver', label: 'SILVER',
            shippingFree: 10,
            intro: [{ firstOrders: 5, pct: 0.10 }],
            perks: ['Spedizione gratis sopra €10', '−10% sui primi 5 ordini', 'Accesso pre-order anticipato']
        },
        gold: {
            key: 'gold', label: 'GOLD',
            shippingFree: 0,
            intro: [{ firstOrders: 5, pct: 0.15 }, { firstOrders: 15, pct: 0.10 }],
            perks: ['Spedizione sempre gratis', '−15% sui primi 5 ordini', '−10% sui successivi 10 ordini', 'Edizioni esclusive Gold']
        }
    };

    function tierFromSpend(spent) {
        if (spent >= TIER_THRESHOLDS.gold)   return 'gold';
        if (spent >= TIER_THRESHOLDS.silver) return 'silver';
        return 'bronze';
    }

    function tierIntroDiscount(tierKey, ordersPlaced) {
        var def = TIERS[tierKey];
        if (!def || !def.intro) return 0;
        var sorted = def.intro.slice().sort(function (a, b) { return a.firstOrders - b.firstOrders; });
        for (var i = 0; i < sorted.length; i++) {
            if (ordersPlaced < sorted[i].firstOrders) return sorted[i].pct;
        }
        return 0;
    }

    function getLoyalty() {
        try {
            var stored = JSON.parse(localStorage.getItem('mb_loyalty') || '{}');
            return {
                totalSpent:   Number(stored.totalSpent)   || 0,
                ordersPlaced: Number(stored.ordersPlaced) || 0
            };
        } catch (e) {
            return { totalSpent: 0, ordersPlaced: 0 };
        }
    }

    // ============================================================
    // CART STATE
    // ============================================================
    var root         = document.getElementById('cart-root');
    var appliedCoupon = null;

    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function priceNum(str) {
        var n = parseFloat(String(str).replace(/[^0-9.,]/g, '').replace(',', '.'));
        return isNaN(n) ? 0 : n;
    }

    // ============================================================
    // TIER STRIP HTML
    // ============================================================
    function renderTierStrip(tierKey, tier, ordersPlaced, tierPct, totalSpent) {
        var order       = ['bronze', 'silver', 'gold'];
        var idx         = order.indexOf(tierKey);
        var nextKey     = idx < order.length - 1 ? order[idx + 1] : null;
        var overallPct  = Math.min(100, (totalSpent / TIER_THRESHOLDS.gold) * 100);
        var silverStop  = (TIER_THRESHOLDS.silver / TIER_THRESHOLDS.gold) * 100;

        var medalLetter = tierKey === 'bronze' ? 'B' : tierKey === 'silver' ? 'S' : 'G';
        var medalGrad   = tierKey === 'bronze'
            ? '<stop offset="0" stop-color="#c98a4e"/><stop offset="1" stop-color="#7a4a1f"/>'
            : tierKey === 'silver'
            ? '<stop offset="0" stop-color="#e8e8ec"/><stop offset="1" stop-color="#8d929a"/>'
            : '<stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#c88c00"/>';

        var statusHtml;
        if (tierPct > 0) {
            statusHtml = '<div class="tier-pct">−' + Math.round(tierPct * 100) + '%</div>'
                + '<div class="tier-pct-lab">sconto attivo<br>sul prossimo ordine</div>';
        } else if (tierKey === 'bronze') {
            statusHtml = '<div class="tier-upsell">PASSA A<br><b>SILVER</b></div>'
                + '<div class="tier-pct-lab">per sbloccare<br>−10% e spedizione</div>';
        } else {
            statusHtml = '<div class="tier-pct" style="font-size:18px">✓</div>'
                + '<div class="tier-pct-lab">benefici attivi<br>su questo ordine</div>';
        }

        var introHtml = '';
        if (tier.intro) {
            var introArr = tier.intro.slice().sort(function (a, b) { return a.firstOrders - b.firstOrders; });
            introHtml = '<div class="tier-progress">';
            for (var i = 0; i < introArr.length; i++) {
                var rule  = introArr[i];
                var prev  = i === 0 ? 0 : introArr[i - 1].firstOrders;
                var inside = ordersPlaced < rule.firstOrders;
                var used  = inside ? Math.max(0, ordersPlaced - prev) : (rule.firstOrders - prev);
                var total = rule.firstOrders - prev;
                var rem   = Math.max(0, rule.firstOrders - Math.max(prev, ordersPlaced));
                introHtml += '<div class="tier-prog-item">'
                    + '<div class="tier-prog-top"><span>−' + Math.round(rule.pct * 100) + '% sui prossimi</span>'
                    + '<b>' + rem + '/' + total + '</b></div>'
                    + '<div class="tier-prog-bar"><div class="tier-prog-fill" style="width:' + Math.min(100, (used / total) * 100) + '%"></div></div>'
                    + '</div>';
            }
            introHtml += '</div>';
        }

        var perksHtml = tier.perks.map(function (p) {
            return '<li><span class="dot"></span>' + esc(p) + '</li>';
        }).join('');

        return '<div class="tier tier-' + tierKey + '">'
            + '<div class="tier-medal">'
            + '<svg viewBox="0 0 80 80" width="64" height="64" aria-hidden="true">'
            + '<defs><linearGradient id="medal-' + tierKey + '" x1="0" x2="1" y1="0" y2="1">' + medalGrad + '</linearGradient></defs>'
            + '<path d="M22 50 L 14 78 L 28 70 L 32 62 Z" fill="#e1251b" stroke="#0c0c0c" stroke-width="2.5" stroke-linejoin="round"/>'
            + '<path d="M58 50 L 66 78 L 52 70 L 48 62 Z" fill="#e1251b" stroke="#0c0c0c" stroke-width="2.5" stroke-linejoin="round"/>'
            + '<path d="M40 4 L 47 18 L 62 12 L 58 28 L 74 32 L 60 42 L 70 56 L 54 54 L 50 70 L 40 58 L 30 70 L 26 54 L 10 56 L 20 42 L 6 32 L 22 28 L 18 12 L 33 18 Z" fill="#0c0c0c"/>'
            + '<circle cx="40" cy="36" r="22" fill="url(#medal-' + tierKey + ')" stroke="#0c0c0c" stroke-width="3"/>'
            + '<circle cx="40" cy="36" r="16" fill="none" stroke="#0c0c0c" stroke-width="1.5" opacity=".5"/>'
            + '<text x="40" y="44" text-anchor="middle" font-family="Bowlby One,sans-serif" font-size="20" fill="#0c0c0c">' + medalLetter + '</text>'
            + '</svg>'
            + '</div>'
            + '<div class="tier-info">'
            + '<div class="tier-label">IL TUO LIVELLO <span class="tier-name">' + tier.label + '</span></div>'
            + '<ul class="tier-perks">' + perksHtml + '</ul>'
            + '<div class="tier-bar-wrap">'
            + '<div class="tier-bar">'
            + '<div class="tier-bar-fill" style="width:' + overallPct + '%"></div>'
            + '<div class="tier-stop tier-stop-b' + (totalSpent >= TIER_THRESHOLDS.bronze ? ' reached' : '') + '"><span class="stop-dot">B</span></div>'
            + '<div class="tier-stop' + (totalSpent >= TIER_THRESHOLDS.silver ? ' reached' : '') + '" style="left:' + silverStop + '%"><span class="stop-dot">S</span></div>'
            + '<div class="tier-stop tier-stop-g' + (totalSpent >= TIER_THRESHOLDS.gold ? ' reached' : '') + '"><span class="stop-dot">G</span></div>'
            + '</div>'
            + '<div class="tier-bar-cap">' + (nextKey ? 'Progressi verso il livello <b>' + TIERS[nextKey].label + '</b>' : 'Hai raggiunto il massimo livello') + '</div>'
            + '</div>'
            + '</div>'
            + '<div class="tier-status">' + statusHtml + introHtml + '</div>'
            + '</div>';
    }

    // ============================================================
    // RENDER
    // ============================================================
    function render() {
        var items   = MBCart.getAll();
        var loyalty = getLoyalty();
        var tierKey = tierFromSpend(loyalty.totalSpent);
        var tier    = TIERS[tierKey];
        var tierPct = tierIntroDiscount(tierKey, loyalty.ordersPlaced);

        var tierStripHtml = renderTierStrip(tierKey, tier, loyalty.ordersPlaced, tierPct, loyalty.totalSpent);

        if (items.length === 0) {
            appliedCoupon = null;
            root.innerHTML = tierStripHtml
                + '<div style="max-width:1240px;margin:0 auto;padding:0 20px">'
                + '<div class="cart-empty">'
                + '<span class="cart-empty-icon">&#128722;</span>'
                + '<p>Il carrello è vuoto.</p>'
                + '<a href="catalogo.html">Torna al catalogo &rarr;</a>'
                + '</div></div>';
            return;
        }

        var FREE_SHIPPING_OVER = tier.shippingFree;
        var SHIPPING_COST      = 5.90;

        var itemCount    = items.reduce(function (s, i) { return s + i.qty; }, 0);
        var subtotal     = items.reduce(function (s, i) { return s + priceNum(i.price) * i.qty; }, 0);
        var promoDisc    = appliedCoupon ? Math.min(appliedCoupon.amount, subtotal) : 0;
        var tierDisc     = tierPct > 0 ? Math.max(0, subtotal - promoDisc) * tierPct : 0;
        var afterDisc    = Math.max(0, subtotal - promoDisc - tierDisc);
        var shipping     = (FREE_SHIPPING_OVER === 0 || afterDisc >= FREE_SHIPPING_OVER) ? 0 : SHIPPING_COST;
        var remaining    = Math.max(0, FREE_SHIPPING_OVER - afterDisc);
        var total        = afterDisc + shipping;
        var shipBarPct   = FREE_SHIPPING_OVER === 0 ? 100 : Math.min(100, (afterDisc / FREE_SHIPPING_OVER) * 100);

        /* Product cards */
        var cards = items.map(function (item) {
            var sub    = (priceNum(item.price) * item.qty).toFixed(2);
            var imgSrc = esc(item.image || '');
            var imgEl  = imgSrc
                ? '<img class="cart-cover-img" src="' + imgSrc + '" alt="' + esc(item.title) + '">'
                : '<div class="cart-cover-placeholder">' + esc((item.title || '?').charAt(0)) + '</div>';
            return '<div class="c-product" data-fid="' + esc(item.firestoreId) + '">'
                + '<div class="c-cover">' + imgEl + '</div>'
                + '<div class="p-info">'
                + '<h3 class="p-title">' + esc(item.title) + '</h3>'
                + '<p class="p-meta">Prezzo unitario: ' + esc(item.price) + '</p>'
                + '</div>'
                + '<div class="c-qty">'
                + '<button data-qty-dec="' + item.firestoreId + '">−</button>'
                + '<div class="v">' + item.qty + '</div>'
                + '<button data-qty-inc="' + item.firestoreId + '"' + (item.qty >= (item.maxQty || 99) ? ' disabled' : '') + '>+</button>'
                + '</div>'
                + '<div class="c-price">€' + sub + '</div>'
                + '<button class="c-kill" data-remove="' + item.firestoreId + '" aria-label="Rimuovi">×</button>'
                + '</div>';
        }).join('');

        /* Summary rows */
        var summaryRows = items.map(function (item) {
            return '<div class="sum-row muted">'
                + '<span style="max-width:65%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(item.title) + ' ×' + item.qty + '</span>'
                + '<strong>€' + (priceNum(item.price) * item.qty).toFixed(2) + '</strong>'
                + '</div>';
        }).join('');

        /* Coupon section */
        var couponHtml = appliedCoupon
            ? '<div class="c-promo">'
                + '<label class="promo-label">HAI UN CODICE SCONTO?</label>'
                + '<div class="promo-applied">'
                + '<span>✓ ' + esc(appliedCoupon.code) + ': −€' + promoDisc.toFixed(2) + '</span>'
                + '<span class="promo-x" id="remove-coupon-btn">×</span>'
                + '</div>'
                + '</div>'
            : '<div class="c-promo">'
                + '<label class="promo-label">HAI UN CODICE SCONTO?</label>'
                + '<div class="promo-row">'
                + '<input type="text" class="promo-input" id="coupon-input" placeholder="ES. MANGA10" autocomplete="off" spellcheck="false">'
                + '<button class="promo-apply" id="apply-coupon-btn">APPLICA</button>'
                + '</div>'
                + '<div class="promo-msg" id="coupon-msg"></div>'
                + '</div>';

        /* Burst */
        var burstHtml = tier.shippingFree === 0
            ? '<div class="c-burst burst-' + tierKey + '">SPED.<br>SEMPRE<span class="burst-small">GRATIS</span></div>'
            : '<div class="c-burst burst-' + tierKey + '">SPED.<br>GRATIS<span class="burst-small">SOPRA €' + tier.shippingFree + '</span></div>';

        root.innerHTML = tierStripHtml
            + '<div class="c-page">'
            /* ===== LEFT ===== */
            + '<section>'
            + '<div class="c-crumb">'
            + '<h1 class="c-title">IL TUO <em>CARRELLO</em></h1>'
            + '<div class="c-steps">'
            + '<div class="c-step c-step--done"><span class="c-step-num">1</span>CARRELLO</div>'
            + '<div class="c-step c-step--active"><span class="c-step-num">2</span>RIEPILOGO</div>'
            + '<div class="c-step"><span class="c-step-num">3</span>PAGAMENTO</div>'
            + '</div></div>'
            + '<div class="c-panel">'
            + '<div class="c-halftone c-ht-tl"></div>'
            + '<div class="c-panel-head">'
            + '<span class="c-tag">01</span><span class="c-grow">I TUOI MANGA</span>'
            + '<span class="c-cnt">' + items.length + ' ART.</span>'
            + '</div>'
            + cards
            + '<div class="c-halftone c-ht-br"></div>'
            + '</div>'
            + '<div id="c-also" class="c-also"></div>'
            + '<div class="c-trust">'
            + '<div><div class="c-ico">🚚</div><div>'
            + (tier.shippingFree === 0 ? 'Spedizione sempre gratis' : 'Spedizione gratis')
            + '<br><span class="c-muted">'
            + (tier.shippingFree === 0 ? 'per i Gold' : 'sopra €' + tier.shippingFree)
            + '</span></div></div>'
            + '<div><div class="c-ico c-ico--red">↩</div><div>Reso facile<br><span class="c-muted">entro 14 giorni</span></div></div>'
            + '<div><div class="c-ico c-ico--white">🔒</div><div>Pagamento sicuro<br><span class="c-muted">SSL · Stripe</span></div></div>'
            + '</div>'
            + '</section>'
            /* ===== RIGHT ===== */
            + '<aside class="c-side">'
            + '<div class="c-panel c-summary">'
            + burstHtml
            + '<div class="c-panel-head">'
            + '<span class="c-tag">02</span><span class="c-grow">RIEPILOGO ORDINE</span>'
            + '</div>'
            + '<div class="c-sum-body">'
            + summaryRows
            + '<hr class="c-hr">'
            + '<div class="sum-row"><span>Subtotale</span><strong>€' + subtotal.toFixed(2) + '</strong></div>'
            + (promoDisc > 0
                ? '<div class="sum-row c-discount"><span>Codice <b>' + esc(appliedCoupon.code) + '</b></span><strong>−€' + promoDisc.toFixed(2) + '</strong></div>'
                : '')
            + (tierDisc > 0
                ? '<div class="sum-row c-discount"><span>Sconto ' + tier.label + ' (' + Math.round(tierPct * 100) + '%)</span><strong>−€' + tierDisc.toFixed(2) + '</strong></div>'
                : '')
            + '<div class="sum-row"><span>Spedizione</span><strong>' + (shipping === 0 ? 'GRATIS' : '€' + shipping.toFixed(2)) + '</strong></div>'
            + '<div class="c-ship-bar">'
            + '<div class="ship-top"><span class="ship-truck"></span>'
            + (shipping === 0
                ? '<b style="color:#fff">Spedizione gratuita sbloccata!</b>'
                : 'Aggiungi <b style="color:#fff">€' + remaining.toFixed(2) + '</b> per la spedizione gratuita')
            + '</div>'
            + '<div class="ship-track"><div class="ship-fill" style="width:' + shipBarPct + '%"></div></div>'
            + '</div>'
            + '</div>'
            + '<div class="c-total-row">'
            + '<span class="c-total-lab">TOTALE<small>' + itemCount + ' articol' + (itemCount === 1 ? 'o' : 'i') + '</small></span>'
            + '<span class="c-total-val">€' + total.toFixed(2) + '</span>'
            + '</div>'
            + couponHtml
            + '<div class="c-cta-zone">'
            + '<div class="c-sfx">DON!</div>'
            + '<div class="c-terms">'
            + '<input type="checkbox" id="accept-terms" class="c-check">'
            + '<label for="accept-terms">Ho letto e accetto le <a href="condizioni-vendita.html" target="_blank">condizioni di vendita</a> e la <a href="privacy.html" target="_blank">privacy policy</a>.</label>'
            + '</div>'
            + '<div id="cart-error" class="c-error" style="display:none"></div>'
            + '<button class="c-cta-btn" id="checkout-btn">'
            + '<span class="c-lock">🔒</span>'
            + 'PROCEDI AL PAGAMENTO'
            + '<span style="margin-left:auto;font-size:13px;opacity:.85">€' + total.toFixed(2) + ' →</span>'
            + '</button>'
            + '<div class="c-secure"><span>PAGAMENTO SICURO</span>'
            + '<div class="c-pills">'
            + '<span class="c-pill">VISA</span><span class="c-pill">MC</span>'
            + '<span class="c-pill">PAYPAL</span><span class="c-pill">STRIPE</span>'
            + '</div></div>'
            + '</div>'
            + '</div>'
            + '</aside>'
            + '</div>';

        /* Prodotti consigliati */
        loadRecommendations(items);

        /* Events */
        document.getElementById('checkout-btn').addEventListener('click', startCheckout);

        var applyBtn = document.getElementById('apply-coupon-btn');
        if (applyBtn) applyBtn.addEventListener('click', applyCoupon);

        var removeBtn = document.getElementById('remove-coupon-btn');
        if (removeBtn) removeBtn.addEventListener('click', function () { appliedCoupon = null; render(); });

        var couponInput = document.getElementById('coupon-input');
        if (couponInput) couponInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') applyCoupon(); });
    }

    // ============================================================
    // PRODOTTI CONSIGLIATI
    // ============================================================
    function scoreProduct(product, cartKeywords) {
        if (!product.title) return 0;
        var titleWords = product.title.toLowerCase().split(/\s+/);
        var score = 0;
        cartKeywords.forEach(function (kw) {
            titleWords.forEach(function (w) {
                if (w === kw)                       score += 3;
                else if (w.indexOf(kw) !== -1)      score += 2;
                else if (kw.indexOf(w) !== -1)      score += 1;
            });
        });
        /* boost stesso tag/categoria */
        if (product.category) {
            cartKeywords.forEach(function (kw) {
                if (product.category.toLowerCase().indexOf(kw) !== -1) score += 2;
            });
        }
        return score;
    }

    function extractKeywords(items) {
        var stopWords = new Set(['di','del','della','il','la','lo','gli','le','un','una','uno','e','è','a','da','in','con','su','per','tra','fra','vol','volume','n','n.','the','of','and','to']);
        var kws = {};
        items.forEach(function (item) {
            var words = (item.title || '').toLowerCase().split(/[\s\-_.,:;()[\]]+/);
            words.forEach(function (w) {
                if (w.length > 2 && !stopWords.has(w) && isNaN(w)) {
                    kws[w] = (kws[w] || 0) + 1;
                }
            });
        });
        return Object.keys(kws).sort(function (a, b) { return kws[b] - kws[a]; }).slice(0, 12);
    }

    function renderAlso(products) {
        var container = document.getElementById('c-also');
        if (!container) return;
        if (!products.length) { container.innerHTML = ''; return; }

        var cards = products.map(function (p) {
            var imgEl = p.image
                ? '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
                  + '<div class="c-mini-ph" style="display:none">' + esc((p.title || '?').charAt(0)) + '</div>'
                : '<div class="c-mini-ph">' + esc((p.title || '?').charAt(0)) + '</div>';
            var ribbon = p.category
                ? '<span class="c-mini-ribbon">' + esc(p.category.toUpperCase().slice(0, 8)) + '</span>'
                : '';
            var inCart = MBCart.getAll().some(function (i) { return i.firestoreId === p.id; });
            return '<div class="c-mini">'
                + '<div class="c-mini-cover">' + imgEl + ribbon + '</div>'
                + '<h4>' + esc(p.title) + '</h4>'
                + '<div class="c-mini-row">'
                + '<span class="c-mini-price">' + esc(p.price || '') + '</span>'
                + '<button class="c-mini-add" data-rec-id="' + esc(p.id) + '"'
                + ' data-rec-title="' + esc(p.title) + '"'
                + ' data-rec-img="' + esc(p.image || '') + '"'
                + ' data-rec-price="' + esc(p.price || '') + '"'
                + ' data-rec-maxqty="' + (p.quantity || 99) + '"'
                + (inCart ? ' disabled title="Già nel carrello"' : ' aria-label="Aggiungi al carrello"')
                + '>' + (inCart ? '✓' : '+') + '</button>'
                + '</div>'
                + '</div>';
        }).join('');

        container.innerHTML = '<div class="c-also">'
            + '<div class="c-also-head">'
            + '<h3>POTREBBE PIACERTI <span class="swish">↓</span></h3>'
            + '<span>SELEZIONATI PER TE</span>'
            + '</div>'
            + '<div class="c-also-grid">' + cards + '</div>'
            + '</div>';
    }

    function loadRecommendations(cartItems) {
        var container = document.getElementById('c-also');
        if (!container || !window._mbDb) return;

        /* Skeleton */
        var skelCards = [1,2,3,4].map(function () {
            return '<div class="c-skel"><div class="c-skel-cover"></div><div class="c-skel-line"></div><div class="c-skel-line short"></div></div>';
        }).join('');
        container.innerHTML = '<div class="c-also">'
            + '<div class="c-also-head"><h3>POTREBBE PIACERTI <span class="swish">↓</span></h3></div>'
            + '<div class="c-also-loading">' + skelCards + '</div>'
            + '</div>';

        var cartIds   = cartItems.map(function (i) { return i.firestoreId; });
        var keywords  = extractKeywords(cartItems);

        window._mbDb.collection('products')
            .where('quantity', '>', 0)
            .limit(40)
            .get()
            .then(function (snap) {
                var candidates = [];
                snap.forEach(function (doc) {
                    var d = doc.data();
                    if (cartIds.indexOf(doc.id) !== -1) return;     /* già in carrello */
                    if (!d.title || !d.price) return;               /* dati mancanti */
                    candidates.push({
                        id:       doc.id,
                        title:    d.title,
                        image:    d.image || d.imageUrl || '',
                        price:    d.price,
                        category: d.category || d.tipo || '',
                        quantity: parseInt(d.quantity) || 1,
                        score:    scoreProduct(d, keywords)
                    });
                });

                /* Ordina: prima i più simili, poi per score > 0 */
                candidates.sort(function (a, b) { return b.score - a.score; });

                /* Se non ci sono risultati simili, mostra qualsiasi prodotto disponibile */
                var shown = candidates.filter(function (c) { return c.score > 0; }).slice(0, 4);
                if (shown.length < 4) {
                    var extra = candidates.filter(function (c) { return c.score === 0; });
                    shown = shown.concat(extra).slice(0, 4);
                }

                renderAlso(shown);
            })
            .catch(function () {
                /* In caso di errore, nascondi la sezione silenziosamente */
                if (container) container.innerHTML = '';
            });
    }

    // ============================================================
    // COUPON
    // ============================================================
    function applyCoupon() {
        var input = document.getElementById('coupon-input');
        var msg   = document.getElementById('coupon-msg');
        var btn   = document.getElementById('apply-coupon-btn');
        if (!input) return;
        var code = input.value.trim().toUpperCase();
        if (!code) {
            msg.textContent = 'Inserisci un codice coupon.';
            msg.className   = 'promo-msg err';
            return;
        }
        btn.disabled    = true;
        btn.textContent = '...';
        msg.textContent = '';
        msg.className   = 'promo-msg';

        fetch('/api/validate-coupon', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ code: code }),
        })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
            if (!res.ok) {
                msg.textContent = res.data.error || 'Coupon non valido.';
                msg.className   = 'promo-msg err';
                btn.disabled    = false;
                btn.textContent = 'APPLICA';
                return;
            }
            appliedCoupon = { code: res.data.code, firestoreId: res.data.firestoreId, amount: res.data.amount };
            render();
        })
        .catch(function () {
            msg.textContent = 'Errore di rete. Riprova.';
            msg.className   = 'promo-msg err';
            btn.disabled    = false;
            btn.textContent = 'APPLICA';
        });
    }

    // ============================================================
    // CHECKOUT
    // ============================================================
    function startCheckout() {
        var checkbox = document.getElementById('accept-terms');
        var errEl    = document.getElementById('cart-error');
        if (!checkbox.checked) {
            errEl.style.display = 'block';
            errEl.textContent   = 'Devi accettare le condizioni di vendita per procedere.';
            return;
        }
        errEl.style.display = 'none';

        var btn = document.getElementById('checkout-btn');
        btn.disabled    = true;
        btn.textContent = 'Caricamento...';

        var allItems = MBCart.getAll();
        var loyalty  = getLoyalty();
        var tierKey  = tierFromSpend(loyalty.totalSpent);
        var tier     = TIERS[tierKey];
        var tierPct  = tierIntroDiscount(tierKey, loyalty.ordersPlaced);

        var subtotalC  = allItems.reduce(function (s, i) {
            return s + parseFloat(String(i.price).replace(/[^0-9.,]/g, '').replace(',', '.')) * i.qty;
        }, 0);
        var promoDiscC = appliedCoupon ? Math.min(appliedCoupon.amount, subtotalC) : 0;
        var tierDiscC  = tierPct > 0 ? Math.max(0, subtotalC - promoDiscC) * tierPct : 0;
        var afterDiscC = Math.max(0, subtotalC - promoDiscC - tierDiscC);
        var freeOver   = tier.shippingFree;
        var shippingC  = (freeOver === 0 || afterDiscC >= freeOver) ? 0 : 5.90;
        var totalC     = afterDiscC + shippingC;

        var body = {
            items:               allItems.map(function (i) { return { firestoreId: i.firestoreId, qty: i.qty }; }),
            shipping:            shippingC,
            tierKey:             tierKey,
            tierDiscountCents:   Math.round(tierDiscC * 100),
        };
        if (appliedCoupon) body.couponCode = appliedCoupon.code;

        fetch('/api/create-checkout', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body),
        })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
            if (!res.ok) {
                errEl.style.display = 'block';
                errEl.textContent   = res.data.error || 'Errore durante il checkout. Riprova.';
                btn.disabled    = false;
                btn.textContent = 'PROCEDI AL PAGAMENTO';
                return;
            }
            try {
                localStorage.setItem('mb_last_order', JSON.stringify({
                    items:    allItems,
                    subtotal: subtotalC.toFixed(2),
                    shipping: shippingC.toFixed(2),
                    discount: (promoDiscC + tierDiscC).toFixed(2),
                    coupon:   appliedCoupon ? appliedCoupon.code : null,
                    tier:     tierKey,
                    total:    totalC.toFixed(2),
                    date:     new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }),
                }));
            } catch (e) {}
            MBCart.clear();
            window.location.href = res.data.url;
        })
        .catch(function () {
            errEl.style.display = 'block';
            errEl.textContent   = 'Errore di rete. Controlla la connessione e riprova.';
            btn.disabled    = false;
            btn.textContent = 'PROCEDI AL PAGAMENTO';
        });
    }

    // ============================================================
    // EVENT DELEGATION (qty / remove)
    // ============================================================
    document.addEventListener('click', function (e) {
        var dec = e.target.closest('[data-qty-dec]');
        if (dec) {
            var itemDec = MBCart.getAll().find(function (i) { return i.firestoreId === dec.dataset.qtyDec; });
            if (itemDec) MBCart.setQty(dec.dataset.qtyDec, itemDec.qty - 1);
            render(); return;
        }
        var inc = e.target.closest('[data-qty-inc]');
        if (inc) {
            var itemInc = MBCart.getAll().find(function (i) { return i.firestoreId === inc.dataset.qtyInc; });
            if (itemInc) MBCart.setQty(inc.dataset.qtyInc, itemInc.qty + 1);
            render(); return;
        }
        var rem = e.target.closest('[data-remove]');
        if (rem) { MBCart.remove(rem.dataset.remove); render(); return; }

        var rec = e.target.closest('[data-rec-id]');
        if (rec) {
            MBCart.add({
                firestoreId: rec.dataset.recId,
                title:       rec.dataset.recTitle,
                image:       rec.dataset.recImg,
                price:       rec.dataset.recPrice,
                maxQty:      parseInt(rec.dataset.recMaxqty) || 99
            });
            render(); return;
        }
    });

    document.addEventListener('DOMContentLoaded', render);
})();
