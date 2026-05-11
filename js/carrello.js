(function () {
    var root = document.getElementById('cart-root');

    function priceNum(str) {
        var n = parseFloat(String(str).replace(/[^0-9.,]/g, '').replace(',', '.'));
        return isNaN(n) ? 0 : n;
    }

    function render() {
        var items = MBCart.getAll();
        if (items.length === 0) {
            root.innerHTML = '<div class="cart-empty">'
                + '<span class="cart-empty-icon">&#128722;</span>'
                + '<p>Il carrello è vuoto.</p>'
                + '<a href="catalogo.html">Torna al catalogo &rarr;</a>'
                + '</div>';
            return;
        }

        var itemCount = items.reduce(function(s, i) { return s + i.qty; }, 0);
        var total = items.reduce(function(s, i) { return s + priceNum(i.price) * i.qty; }, 0);

        var cards = items.map(function (item) {
            var sub = (priceNum(item.price) * item.qty).toFixed(2);
            return '<div class="cart-card" data-fid="' + item.firestoreId + '">'
                + '<img class="cart-card-img" src="' + (item.image || 'https://placehold.co/64x82/161616/444?text=?') + '" alt="' + item.title + '">'
                + '<div class="cart-card-info">'
                + '<div class="cart-card-title">' + item.title + '</div>'
                + '<div class="cart-card-unit">Prezzo unitario: ' + item.price + '</div>'
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
                + '<span>' + item.title + ' &times;' + item.qty + '</span>'
                + '<span>&euro;' + (priceNum(item.price) * item.qty).toFixed(2) + '</span>'
                + '</div>';
        }).join('');

        root.innerHTML = '<div class="cart-layout">'
            + '<div>'
            + '<div class="cart-items-list">' + cards + '</div>'
            + '</div>'
            + '<div class="cart-summary">'
            + '<div class="cart-summary-title">Riepilogo ordine</div>'
            + summaryRows
            + '<div class="cart-summary-row total">'
            + '<span>Totale (' + itemCount + ' ' + (itemCount === 1 ? 'articolo' : 'articoli') + ')</span>'
            + '<span>&euro;' + total.toFixed(2) + '</span>'
            + '</div>'
            + '<div class="cart-legal">'
            + '<label><input type="checkbox" id="accept-terms"> '
            + 'Ho letto e accetto le <a href="condizioni-vendita.html" target="_blank">condizioni di vendita</a> e la <a href="privacy.html" target="_blank">privacy policy</a>.'
            + '</label>'
            + '</div>'
            + '<div id="cart-error" class="cart-error" style="display:none"></div>'
            + '<button class="cart-checkout-btn" id="checkout-btn">Procedi al Pagamento &rarr;</button>'
            + '</div>'
            + '</div>';

        document.getElementById('checkout-btn').addEventListener('click', startCheckout);
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

        var allItems = MBCart.getAll();
        var total    = allItems.reduce(function(s, i) { return s + parseFloat(String(i.price).replace(/[^0-9.,]/g,'').replace(',','.')) * i.qty; }, 0);

        var items = allItems.map(function (i) {
            return { firestoreId: i.firestoreId, qty: i.qty };
        });

        fetch('/api/create-checkout', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ items: items }),
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
            /* Salva snapshot ordine per la pagina di conferma */
            try {
                localStorage.setItem('mb_last_order', JSON.stringify({
                    items:   allItems,
                    total:   total.toFixed(2),
                    date:    new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }),
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
