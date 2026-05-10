var MBCart = (function () {
    var KEY = 'mb_cart';

    function _load() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; }
        catch (e) { return []; }
    }

    function _save(items) {
        try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
        _updateBadge();
    }

    function _updateBadge() {
        var items = _load();
        var count = items.reduce(function (s, i) { return s + i.qty; }, 0);
        document.querySelectorAll('.cart-badge').forEach(function (b) {
            b.textContent = count > 99 ? '99+' : count;
            b.style.display = count > 0 ? 'inline-flex' : 'none';
        });
    }

    /* product: {firestoreId, title, image, price, maxQty} */
    function add(product) {
        var items = _load();
        var existing = items.find(function (i) { return i.firestoreId === product.firestoreId; });
        if (existing) {
            if (existing.qty < existing.maxQty) existing.qty++;
        } else {
            items.push({
                firestoreId: product.firestoreId,
                title:       product.title,
                image:       product.image || '',
                price:       product.price || '',
                qty:         1,
                maxQty:      product.maxQty || 99
            });
        }
        _save(items);
        _flashBadge();
    }

    function remove(firestoreId) {
        _save(_load().filter(function (i) { return i.firestoreId !== firestoreId; }));
    }

    function setQty(firestoreId, qty) {
        var items = _load();
        var item = items.find(function (i) { return i.firestoreId === firestoreId; });
        if (!item) return;
        if (qty <= 0) { remove(firestoreId); return; }
        item.qty = Math.min(qty, item.maxQty);
        _save(items);
    }

    function getAll() { return _load(); }

    function count() {
        return _load().reduce(function (s, i) { return s + i.qty; }, 0);
    }

    function clear() {
        try { localStorage.removeItem(KEY); } catch (e) {}
        _updateBadge();
    }

    function _flashBadge() {
        document.querySelectorAll('.cart-badge').forEach(function (b) {
            b.classList.remove('cart-badge--flash');
            void b.offsetWidth;
            b.classList.add('cart-badge--flash');
        });
    }

    document.addEventListener('DOMContentLoaded', _updateBadge);

    return { add: add, remove: remove, setQty: setQty, getAll: getAll, count: count, clear: clear };
})();
