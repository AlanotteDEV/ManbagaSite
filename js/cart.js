var MBCart = (function() {
    var FRAG = 'lines(first: 50) { edges { node { id quantity merchandise { ... on ProductVariant { id priceV2 { amount } product { title images(first:1) { edges { node { url } } } } } } } } }';
    var CREATE = 'mutation cartCreate($lines: [CartLineInput!]) { cartCreate(input: { lines: $lines }) { cart { id checkoutUrl ' + FRAG + ' } userErrors { field message } } }';
    var ADD    = 'mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { id checkoutUrl ' + FRAG + ' } userErrors { field message } } }';
    var REMOVE = 'mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { id checkoutUrl ' + FRAG + ' } } }';
    var UPDATE = 'mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { id ' + FRAG + ' } } }';
    var FETCH  = 'query getCart($cartId: ID!) { cart(id: $cartId) { id checkoutUrl ' + FRAG + ' } }';

    var _cart = null, _syncing = false;

    function _parseCart(raw) {
        if (!raw || !raw.id) return null;
        var lines = [];
        ((raw.lines && raw.lines.edges) || []).forEach(function(e) {
            var n = e.node, m = n.merchandise;
            lines.push({
                lineId: n.id, variantId: m.id,
                title:  m.product && m.product.title || '',
                image:  m.product && m.product.images && m.product.images.edges[0] && m.product.images.edges[0].node.url || '',
                price:  m.priceV2 ? '€' + parseFloat(m.priceV2.amount).toFixed(2) : '',
                qty: n.quantity, maxQty: 99
            });
        });
        return { id: raw.id, checkoutUrl: raw.checkoutUrl, lines: lines };
    }

    function _updateBadge() {
        var count = _cart ? _cart.lines.reduce(function(s,l){return s+l.qty;},0) : 0;
        document.querySelectorAll('.cart-badge').forEach(function(b) {
            b.textContent = count > 99 ? '99+' : count;
            b.style.display = count > 0 ? 'inline-flex' : 'none';
        });
    }

    function _flashBadge() {
        document.querySelectorAll('.cart-badge').forEach(function(b) {
            b.classList.remove('cart-badge--flash'); void b.offsetWidth; b.classList.add('cart-badge--flash');
        });
    }

    function add(product) {
        if (_syncing) return Promise.resolve();
        _syncing = true;
        var cartId = ShopifyAPI.getCartId(), promise;
        if (!cartId) {
            promise = ShopifyAPI.sfApi(CREATE, { lines: [{ merchandiseId: product.variantId, quantity: 1 }] })
                .then(function(r){ return r.data && r.data.cartCreate && r.data.cartCreate.cart; });
        } else {
            var ex = _cart && _cart.lines.find(function(l){ return l.variantId === product.variantId; });
            if (ex) {
                promise = ShopifyAPI.sfApi(UPDATE, { cartId: cartId, lines: [{ id: ex.lineId, quantity: ex.qty + 1 }] })
                    .then(function(r){ return r.data && r.data.cartLinesUpdate && r.data.cartLinesUpdate.cart; });
            } else {
                promise = ShopifyAPI.sfApi(ADD, { cartId: cartId, lines: [{ merchandiseId: product.variantId, quantity: 1 }] })
                    .then(function(r){ return r.data && r.data.cartLinesAdd && r.data.cartLinesAdd.cart; });
            }
        }
        return promise.then(function(raw) {
            _cart = _parseCart(raw);
            if (_cart) ShopifyAPI.setCartId(_cart.id);
            _updateBadge(); _flashBadge(); _syncing = false;
        }).catch(function(err){ console.error('[MBCart] add:', err); _syncing = false; });
    }

    function remove(lineId) {
        var cartId = ShopifyAPI.getCartId();
        if (!cartId || !lineId) return Promise.resolve();
        return ShopifyAPI.sfApi(REMOVE, { cartId: cartId, lineIds: [lineId] })
            .then(function(r){ _cart = _parseCart(r.data && r.data.cartLinesRemove && r.data.cartLinesRemove.cart); _updateBadge(); });
    }

    function setQty(lineId, qty) {
        var cartId = ShopifyAPI.getCartId();
        if (!cartId || !lineId) return Promise.resolve();
        if (qty <= 0) return remove(lineId);
        return ShopifyAPI.sfApi(UPDATE, { cartId: cartId, lines: [{ id: lineId, quantity: qty }] })
            .then(function(r){ _cart = _parseCart(r.data && r.data.cartLinesUpdate && r.data.cartLinesUpdate.cart); _updateBadge(); });
    }

    function getAll()         { return _cart ? _cart.lines.slice() : []; }
    function count()          { return _cart ? _cart.lines.reduce(function(s,l){return s+l.qty;},0) : 0; }
    function getCheckoutUrl() { return _cart ? _cart.checkoutUrl : null; }
    function clear()          { _cart = null; ShopifyAPI.clearCartId(); _updateBadge(); }

    function load() {
        var cartId = ShopifyAPI.getCartId();
        if (!cartId) { _updateBadge(); return Promise.resolve(); }
        return ShopifyAPI.sfApi(FETCH, { cartId: cartId }).then(function(r){
            var raw = r.data && r.data.cart;
            if (!raw) { clear(); return; }
            _cart = _parseCart(raw); _updateBadge();
        }).catch(function(){ _updateBadge(); });
    }

    document.addEventListener('DOMContentLoaded', function(){ load(); });
    return { add:add, remove:remove, setQty:setQty, getAll:getAll, count:count, getCheckoutUrl:getCheckoutUrl, clear:clear, load:load };
})();
