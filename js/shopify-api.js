// js/shopify-api.js
var ShopifyAPI = (function() {
    var DOMAIN    = 'bbd6ku-jz.myshopify.com';
    var SF_TOKEN  = '401d08bb9630121d4dc0185c89c15c1a';
    var VERSION   = '2024-10';
    var AUTH_KEY  = 'mb_customer_token';
    var CART_KEY  = 'mb_cart_id';
    var CACHE_KEY = 'mb_products_cache';
    var CACHE_TTL = 5 * 60 * 1000;

    function sfApi(query, variables) {
        return fetch('https://' + DOMAIN + '/api/' + VERSION + '/graphql.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': SF_TOKEN
            },
            body: JSON.stringify({ query: query, variables: variables || {} })
        }).then(function(r) {
            if (!r.ok) throw new Error('Storefront API HTTP ' + r.status);
            return r.json();
        });
    }

    function getCustomerToken() {
        try { return localStorage.getItem(AUTH_KEY) || null; } catch(e) { return null; }
    }
    function setCustomerToken(t) {
        try { localStorage.setItem(AUTH_KEY, t); } catch(e) {}
    }
    function clearCustomerToken() {
        try { localStorage.removeItem(AUTH_KEY); } catch(e) {}
    }

    function getCartId() {
        try { return localStorage.getItem(CART_KEY) || null; } catch(e) { return null; }
    }
    function setCartId(id) {
        try { localStorage.setItem(CART_KEY, id); } catch(e) {}
    }
    function clearCartId() {
        try { localStorage.removeItem(CART_KEY); } catch(e) {}
    }

    function getProductsCache() {
        try {
            var raw = JSON.parse(sessionStorage.getItem(CACHE_KEY));
            if (!raw || !raw.ts || !raw.data) return null;
            if (Date.now() - raw.ts > CACHE_TTL) return null;
            return raw.data;
        } catch(e) { return null; }
    }
    function setProductsCache(data) {
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch(e) {}
    }
    function clearProductsCache() {
        try { sessionStorage.removeItem(CACHE_KEY); } catch(e) {}
    }

    function apiPost(path, body) {
        var token = getCustomerToken();
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return fetch(path, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body || {})
        }).then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); });
    }

    return {
        sfApi:             sfApi,
        apiPost:           apiPost,
        getCustomerToken:  getCustomerToken,
        setCustomerToken:  setCustomerToken,
        clearCustomerToken:clearCustomerToken,
        getCartId:         getCartId,
        setCartId:         setCartId,
        clearCartId:       clearCartId,
        getProductsCache:  getProductsCache,
        setProductsCache:  setProductsCache,
        clearProductsCache:clearProductsCache,
        DOMAIN:            DOMAIN
    };
})();
