(function () {
    var root = document.getElementById('cart-root');
    var appliedCoupon = null; /* { code, firestoreId, amount } */

    function esc(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function priceNum(str) {
        var n = parseFloat(String(str).replace(/[^0-9.,]/g, '').replace(',', '.'));
        return isNaN(n) ? 0 : n;
    }

    function render() {
        var items = MBCart.getAll();
        if (items.length === 0) {
            appliedCoupon = null;
            root.innerHTML = '<div class="cart-empty">'
                + '<span class="cart-empty-icon">&#128722;</span>'
                + '<p>Il carrello è vuoto.</p>'
                + '<a href="catalogo.html">Torna al catalogo &rarr;</a>'
                + '</div>';
            return;
        }

        var SHIPPING_COST      = 5.90;
        var FREE_SHIPPING_OVER = 50.00;

        var itemCount = items.reduce(function(s, i) { return s + i.qty; }, 0);
        var subtotal  = items.reduce(function(s, i) { return s + priceNum(i.price) * i.qty; }, 0);
        var shipping  = subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_COST;
        var discount  = appliedCoupon ? Math.min(appliedCoupon.amount, subtotal + shipping) : 0;
        var total     = subtotal + shipping - discount;

        var cards = items.map(function (item) {
            var sub = (priceNum(item.price) * item.qty).toFixed(2);
            return '<div class="cart-card" data-fid="' + esc(item.firestoreId) + '">'
                + '<img class="cart-card-img" src="' + esc(item.image || 'https://placehold.co/64x82/161616/444?text=?') + '" alt="' + esc(item.title) + '">'
                + '<div class="cart-card-info">'
                + '<div class="cart-card-title">' + esc(item.title) + '</div>'
                + '<div class="cart-card-unit">Prezzo unitario: ' + esc(item.price) + '</div>'
                + '</div>'
                + '<div class="cart-qty-ctrl">'
                + '<button data-qty-dec="' + item.firestoreId + '">&minus;</button>'
                + '<span>' + item.qty + '</span>'
                + '<button data-qty-inc="' + item.firestoreId + '" ' + (item.qty >= item.maxQty ? 'disabled' : '') + '>+</button>'
                + '</div>'
                + '<div class="cart-card-price">&euro;' + sub + '</div>'
                + '<button class="cart-remove-btn" data-remove="' + item.firestoreId + '" title="Rimuovi">&times;</button>'
                + '</div>';
        }).join('');

        var summaryRows = items.map(function(item) {
            return '<div class="cart-summary-row">'
                + '<span>' + esc(item.title) + ' &times;' + item.qty + '</span>'
                + '<span>&euro;' + (priceNum(item.price) * item.qty).toFixed(2) + '</span>'
                + '</div>';
        }).join('');

        var couponHtml;
        if (appliedCoupon) {
            couponHtml = '<div class="cart-coupon cart-coupon--applied">'
                + '<div class="cart-coupon-applied-row">'
                + '<span class="cart-coupon-check">&#10003;</span>'
                + '<div class="cart-coupon-applied-info">'
                + '<div class="cart-coupon-applied-code">' + esc(appliedCoupon.code) + '</div>'
                + '<div class="cart-coupon-applied-label">Sconto di &euro;' + discount.toFixed(2) + ' applicato</div>'
                + '</div>'
                + '<button class="cart-remove-coupon" id="remove-coupon-btn" title="Rimuovi coupon">&times;</button>'
                + '</div>'
                + '</div>';
        } else {
            couponHtml = '<div class="cart-coupon">'
                + '<div class="cart-coupon-title">Hai un codice sconto?</div>'
                + '<div class="cart-coupon-row">'
                + '<input type="text" class="cart-coupon-input" id="coupon-input" placeholder="Es. MANGA10" autocomplete="off" spellcheck="false">'
                + '<button class="cart-coupon-btn" id="apply-coupon-btn">Applica</button>'
                + '</div>'
                + '<div class="cart-coupon-msg" id="coupon-msg"></div>'
                + '</div>';
        }

        root.innerHTML = '<div class="cart-layout">'
            + '<div>'
            + '<div class="cart-items-list">' + cards + '</div>'
            + '</div>'
            + '<div class="cart-summary">'
            + '<div class="cart-summary-title">Riepilogo ordine</div>'
            + summaryRows
            + '<div class="cart-summary-divider"></div>'
            + '<div class="cart-summary-row">'
            + '<span>Subtotale</span><span>&euro;' + subtotal.toFixed(2) + '</span>'
            + '</div>'
            + '<div class="cart-summary-row">'
            + '<span>Spedizione</span>'
            + (shipping === 0
                ? '<span style="color:#22c55e;font-weight:700">Gratuita &#10003;</span>'
                : '<span>&euro;' + shipping.toFixed(2) + '</span>')
            + '</div>'
            + (shipping > 0
                ? '<div class="cart-free-shipping-hint">Aggiungi &euro;' + (FREE_SHIPPING_OVER - subtotal).toFixed(2) + ' per la spedizione gratuita</div>'
                : '')
            + (appliedCoupon
                ? '<div class="cart-summary-row discount">'
                    + '<span>Sconto <span class="cart-coupon-pill">' + esc(appliedCoupon.code) + '</span></span>'
                    + '<span>-&euro;' + discount.toFixed(2) + '</span>'
                    + '</div>'
                : '')
            + '<div class="cart-summary-row total">'
            + '<span>Totale (' + itemCount + ' ' + (itemCount === 1 ? 'articolo' : 'articoli') + ')</span>'
            + '<span>&euro;' + total.toFixed(2) + '</span>'
            + '</div>'
            + couponHtml
            + '<div class="cart-legal">'
            + '<label><input type="checkbox" id="accept-terms"> '
            + 'Ho letto e accetto le <a href="condizioni-vendita.html" target="_blank">condizioni di vendita</a> e la <a href="privacy.html" target="_blank">privacy policy</a>.'
            + '</label>'
            + '</div>'
            + '<div id="cart-error" class="cart-error" style="display:none"></div>'
            + '<button class="cart-checkout-btn" id="checkout-btn">'
            + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
            + 'Procedi al Pagamento'
            + '</button>'
            + '<div class="cart-secure-badge">'
            + '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>'
            + 'Pagamento sicuro SSL &mdash; Stripe'
            + '</div>'
            + '</div>'
            + '</div>';

        document.getElementById('checkout-btn').addEventListener('click', startCheckout);

        var applyBtn = document.getElementById('apply-coupon-btn');
        if (applyBtn) applyBtn.addEventListener('click', applyCoupon);

        var removeBtn = document.getElementById('remove-coupon-btn');
        if (removeBtn) removeBtn.addEventListener('click', function () { appliedCoupon = null; render(); });

        var couponInput = document.getElementById('coupon-input');
        if (couponInput) couponInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') applyCoupon();
        });
    }

    function applyCoupon() {
        var input = document.getElementById('coupon-input');
        var msg   = document.getElementById('coupon-msg');
        var btn   = document.getElementById('apply-coupon-btn');
        if (!input) return;

        var code = input.value.trim().toUpperCase();
        if (!code) {
            msg.textContent = 'Inserisci un codice coupon.';
            msg.className   = 'cart-coupon-msg err';
            return;
        }

        btn.disabled    = true;
        btn.textContent = '...';
        msg.textContent = '';
        msg.className   = 'cart-coupon-msg';

        fetch('/api/validate-coupon', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ code: code }),
        })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
            if (!res.ok) {
                msg.textContent = res.data.error || 'Coupon non valido.';
                msg.className   = 'cart-coupon-msg err';
                btn.disabled    = false;
                btn.textContent = 'Applica';
                return;
            }
            appliedCoupon = {
                code:        res.data.code,
                firestoreId: res.data.firestoreId,
                amount:      res.data.amount,
            };
            render();
        })
        .catch(function () {
            msg.textContent = 'Errore di rete. Riprova.';
            msg.className   = 'cart-coupon-msg err';
            btn.disabled    = false;
            btn.textContent = 'Applica';
        });
    }

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

        var allItems  = MBCart.getAll();
        var subtotalC = allItems.reduce(function(s, i) { return s + parseFloat(String(i.price).replace(/[^0-9.,]/g,'').replace(',','.')) * i.qty; }, 0);
        var shippingC = subtotalC >= 50 ? 0 : 5.90;
        var discountC = appliedCoupon ? Math.min(appliedCoupon.amount, subtotalC + shippingC) : 0;
        var totalC    = subtotalC + shippingC - discountC;

        var items = allItems.map(function (i) {
            return { firestoreId: i.firestoreId, qty: i.qty };
        });

        var body = { items: items, shipping: shippingC };
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
                btn.textContent = 'Procedi al Pagamento →';
                return;
            }
            try {
                localStorage.setItem('mb_last_order', JSON.stringify({
                    items:    allItems,
                    subtotal: subtotalC.toFixed(2),
                    shipping: shippingC.toFixed(2),
                    discount: discountC.toFixed(2),
                    coupon:   appliedCoupon ? appliedCoupon.code : null,
                    total:    totalC.toFixed(2),
                    date:     new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }),
                }));
            } catch(e) {}
            MBCart.clear();
            window.location.href = res.data.url;
        })
        .catch(function () {
            errEl.style.display = 'block';
            errEl.textContent   = 'Errore di rete. Controlla la connessione e riprova.';
            btn.disabled    = false;
            btn.textContent = 'Procedi al Pagamento →';
        });
    }

    document.addEventListener('click', function (e) {
        var dec = e.target.closest('[data-qty-dec]');
        if (dec) {
            var itemDec = MBCart.getAll().find(function(i){ return i.firestoreId === dec.dataset.qtyDec; });
            if (itemDec) MBCart.setQty(dec.dataset.qtyDec, itemDec.qty - 1);
            render(); return;
        }
        var inc = e.target.closest('[data-qty-inc]');
        if (inc) {
            var itemInc = MBCart.getAll().find(function(i){ return i.firestoreId === inc.dataset.qtyInc; });
            if (itemInc) MBCart.setQty(inc.dataset.qtyInc, itemInc.qty + 1);
            render(); return;
        }
        var rem = e.target.closest('[data-remove]');
        if (rem) { MBCart.remove(rem.dataset.remove); render(); return; }
    });

    document.addEventListener('DOMContentLoaded', render);
})();
