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
                + '<p style="font-size:3rem">&#128722;</p>'
                + '<p>Il carrello è vuoto.</p>'
                + '<a href="catalogo.html">Torna al catalogo &rarr;</a>'
                + '</div>';
            return;
        }

        var total = items.reduce(function (s, i) { return s + priceNum(i.price) * i.qty; }, 0);

        var rows = items.map(function (item) {
            return '<tr data-fid="' + item.firestoreId + '">'
                + '<td><div style="display:flex;align-items:center;gap:12px">'
                + '<img class="cart-item-img" src="' + (item.image || 'https://placehold.co/56x72/0d0d0d/333?text=Cover') + '" alt="' + item.title + '">'
                + '<span class="cart-item-name">' + item.title + '</span>'
                + '</div></td>'
                + '<td class="cart-item-price">' + item.price + '</td>'
                + '<td><div class="cart-qty-ctrl">'
                + '<button data-qty-dec="' + item.firestoreId + '">&minus;</button>'
                + '<span>' + item.qty + '</span>'
                + '<button data-qty-inc="' + item.firestoreId + '" ' + (item.qty >= item.maxQty ? 'disabled' : '') + '>+</button>'
                + '</div></td>'
                + '<td class="cart-item-price">&euro;' + (priceNum(item.price) * item.qty).toFixed(2) + '</td>'
                + '<td><button class="cart-remove-btn" data-remove="' + item.firestoreId + '" title="Rimuovi">&times;</button></td>'
                + '</tr>';
        }).join('');

        root.innerHTML = '<table class="cart-table">'
            + '<thead><tr><th>Prodotto</th><th>Prezzo</th><th>Qt&agrave;</th><th>Subtotale</th><th></th></tr></thead>'
            + '<tbody>' + rows + '</tbody>'
            + '</table>'
            + '<div class="cart-summary">'
            + '<div class="cart-total">Totale: &euro;' + total.toFixed(2) + '</div>'
            + '<div class="cart-legal">'
            + '<label><input type="checkbox" id="accept-terms"> '
            + 'Ho letto e accetto le <a href="condizioni-vendita.html" target="_blank">condizioni di vendita</a> e la <a href="privacy.html" target="_blank">privacy policy</a>.'
            + '</label>'
            + '</div>'
            + '<div id="cart-error" class="cart-error" style="display:none"></div>'
            + '<button class="cart-checkout-btn" id="checkout-btn">Procedi al Pagamento &rarr;</button>'
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

        var items = MBCart.getAll().map(function (i) {
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
