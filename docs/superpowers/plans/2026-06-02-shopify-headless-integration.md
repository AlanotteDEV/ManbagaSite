# Shopify Headless Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Firebase Auth/Firestore/Functions and Stripe with Shopify as the single backend for payments, customers, products, and newsletter — keeping every HTML file and all CSS unchanged.

**Architecture:** A thin GraphQL client (`shopify-api.js`) handles all Storefront API calls from the browser. Four Vercel serverless functions handle Admin API writes (wishlist, profile, loyalty webhook). The Shopify hosted checkout replaces Stripe. All HTML/CSS/structure unchanged.

**Tech Stack:** Shopify Storefront API 2024-10 (GraphQL), Shopify Admin API 2024-10 (GraphQL), Vercel Functions Node.js 18, vanilla JS (no bundler), localStorage for cart/auth token persistence.

---

## File Map

**New files:**
- `js/shopify-api.js` — GraphQL client + auth token + cart ID management
- `api/_shopify-admin.js` — shared Admin API helper (internal, not a route)
- `api/wishlist.js` — add/remove wishlist via Admin API metafieldsSet
- `api/profile-extended.js` — save birthdate/lang/favoriteGames as customer metafield
- `api/webhook-order.js` — orders/paid → update loyalty metafields
- `api/admin-loyalty.js` — manual loyalty adjustment from gestionale
- `vercel.json` — Vercel routing config
- `api/package.json` — node-fetch dependency

**Rewritten files:**
- `js/cart.js` — Shopify Cart API + optimistic localStorage state
- `js/carrello.js` — Shopify cart render + checkout URL redirect
- `js/account-init.js` — Shopify Customer Storefront API
- `js/catalogo-init.js` — replace `getProducts()` + wishlist toggle

**Modified (Firebase removal):**
- All HTML files — remove Firebase SDK script tags (Task 13)

---

## Task 1: Shopify Store + Vercel Setup (manual)

**Files:** none (configuration steps)

- [ ] **Step 1: Create Shopify store**
  Go to shopify.com → start free trial → Basic plan minimum.
  Store name suggestion: `manbaga` → domain will be `manbaga.myshopify.com`.

- [ ] **Step 2: Generate Storefront API token**
  Shopify Admin → Settings → Apps and sales channels → Develop apps → Create app `ManbagaHeadless` → Configure Storefront API scopes: `unauthenticated_read_product_listings`, `unauthenticated_read_customers`, `unauthenticated_write_customers`, `unauthenticated_read_customer_tags`, `unauthenticated_write_checkouts`, `unauthenticated_read_checkouts`, `unauthenticated_read_selling_plans` → Install app → Copy **Storefront API access token**.

- [ ] **Step 3: Generate Admin API token**
  Same app → Admin API → scopes: `read_customers`, `write_customers`, `read_orders`, `write_orders`, `read_products`, `write_products` → Copy **Admin API access token**.

- [ ] **Step 4: Create metafield definitions**
  Shopify Admin → Settings → Custom data → Customers → Add definition for each:

  | Namespace & key | Type | Name |
  |---|---|---|
  | `loyalty.total_spent` | Decimal | Loyalty Total Spent |
  | `loyalty.orders_placed` | Integer | Loyalty Orders Placed |
  | `loyalty.tier` | Single line text | Loyalty Tier |
  | `wishlist.product_ids` | JSON | Wishlist Product IDs |
  | `profile.extended` | JSON | Extended Profile |

  Shopify Admin → Settings → Custom data → Products → Add:

  | Namespace & key | Type |
  |---|---|
  | `catalog.badge` | Single line text |
  | `catalog.subcat` | Single line text |
  | `catalog.volume` | Single line text |
  | `catalog.available_from` | Date |

- [ ] **Step 5: Configure Shopify Payments**
  Settings → Payments → Activate Shopify Payments (or Stripe as provider).

- [ ] **Step 6: Set up Vercel project**
  ```bash
  npm install -g vercel
  cd C:\Users\germi\ManbagaSite
  vercel
  ```
  Accept defaults. Link to new project `manbaga-site`.

- [ ] **Step 7: Set Vercel environment variables**
  ```bash
  vercel env add SHOPIFY_STORE_DOMAIN
  # value: manbaga.myshopify.com

  vercel env add SHOPIFY_STOREFRONT_TOKEN
  # value: <storefront token from Step 2>

  vercel env add SHOPIFY_ADMIN_TOKEN
  # value: <admin token from Step 3>

  vercel env add SHOPIFY_WEBHOOK_SECRET
  # value: generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

  vercel env add ADMIN_JWT_SECRET
  # value: generate same way
  ```
  Also create `.env.local` in project root (never commit):
  ```
  SHOPIFY_STORE_DOMAIN=manbaga.myshopify.com
  SHOPIFY_STOREFRONT_TOKEN=<value>
  SHOPIFY_ADMIN_TOKEN=<value>
  SHOPIFY_WEBHOOK_SECRET=<value>
  ADMIN_JWT_SECRET=<value>
  ```

- [ ] **Step 8: Add `.env.local` to `.gitignore`**
  ```bash
  echo ".env.local" >> .gitignore
  git add .gitignore
  git commit -m "chore: ignore .env.local"
  ```

---

## Task 2: Vercel config + API dependencies

**Files:**
- Create: `vercel.json`
- Create: `api/package.json`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "version": 2,
  "functions": {
    "api/*.js": {
      "runtime": "nodejs18.x",
      "maxDuration": 10
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ]
}
```

- [ ] **Step 2: Create `api/package.json`**

```json
{
  "name": "manbaga-api",
  "version": "1.0.0",
  "dependencies": {
    "node-fetch": "2.7.0"
  }
}
```

- [ ] **Step 3: Install**
  ```bash
  cd api && npm install && cd ..
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add vercel.json api/package.json api/node_modules
  git commit -m "chore: vercel config and api dependencies"
  ```

---

## Task 3: `api/_shopify-admin.js` — shared Admin API helper

**Files:**
- Create: `api/_shopify-admin.js`

- [ ] **Step 1: Create file**

```javascript
// api/_shopify-admin.js
const fetch = require('node-fetch');

const DOMAIN  = process.env.SHOPIFY_STORE_DOMAIN;
const ATOKEN  = process.env.SHOPIFY_ADMIN_TOKEN;
const SFTOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
const VERSION = '2024-10';

async function adminGql(query, variables) {
    const res = await fetch(`https://${DOMAIN}/admin/api/${VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': ATOKEN
        },
        body: JSON.stringify({ query, variables: variables || {} })
    });
    if (!res.ok) throw new Error('Admin API HTTP ' + res.status);
    return res.json();
}

// Verifies a Storefront customer token and returns { id, email } or null
async function verifyCustomerToken(token) {
    const res = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': SFTOKEN
        },
        body: JSON.stringify({
            query: `query { customer(customerAccessToken: "${token.replace(/"/g, '')}") { id email } }`
        })
    });
    const data = await res.json();
    return (data.data && data.data.customer) || null;
}

module.exports = { adminGql, verifyCustomerToken };
```

- [ ] **Step 2: Commit**
  ```bash
  git add api/_shopify-admin.js
  git commit -m "feat: shared shopify admin api helper"
  ```

---

## Task 4: `api/wishlist.js` — wishlist CRUD

**Files:**
- Create: `api/wishlist.js`

- [ ] **Step 1: Create file**

```javascript
// api/wishlist.js
const { adminGql, verifyCustomerToken } = require('./_shopify-admin');

const METAFIELDS_SET = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
            metafields { key namespace value }
            userErrors { field message }
        }
    }
`;

const GET_WISHLIST = `
    query getWishlist($id: ID!) {
        customer(id: $id) {
            metafield(namespace: "wishlist", key: "product_ids") { value }
        }
    }
`;

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const auth = (req.headers.authorization || '').replace('Bearer ', '');
    if (!auth) return res.status(401).json({ error: 'Missing token' });

    const customer = await verifyCustomerToken(auth);
    if (!customer) return res.status(401).json({ error: 'Invalid token' });

    const { action, productId } = req.body;
    if (!action || !productId) return res.status(400).json({ error: 'Missing action or productId' });

    // Read current wishlist
    const current = await adminGql(GET_WISHLIST, { id: customer.id });
    const raw = current.data && current.data.customer && current.data.customer.metafield
        ? current.data.customer.metafield.value
        : '[]';
    let ids;
    try { ids = JSON.parse(raw); } catch(e) { ids = []; }
    if (!Array.isArray(ids)) ids = [];

    if (action === 'add') {
        if (!ids.includes(productId)) ids.push(productId);
    } else if (action === 'remove') {
        ids = ids.filter(function(id) { return id !== productId; });
    } else {
        return res.status(400).json({ error: 'action must be add or remove' });
    }

    const result = await adminGql(METAFIELDS_SET, {
        metafields: [{
            ownerId: customer.id,
            namespace: 'wishlist',
            key: 'product_ids',
            type: 'json',
            value: JSON.stringify(ids)
        }]
    });

    const errors = result.data && result.data.metafieldsSet && result.data.metafieldsSet.userErrors;
    if (errors && errors.length) return res.status(400).json({ error: errors[0].message });

    return res.status(200).json({ ok: true, ids });
};
```

- [ ] **Step 2: Test locally**
  ```bash
  vercel dev
  ```
  In another terminal:
  ```bash
  curl -X POST http://localhost:3000/api/wishlist \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer INVALID_TOKEN" \
    -d '{"action":"add","productId":"gid://shopify/Product/1"}'
  ```
  Expected: `{"error":"Invalid token"}`

- [ ] **Step 3: Commit**
  ```bash
  git add api/wishlist.js
  git commit -m "feat: wishlist api endpoint via shopify admin"
  ```

---

## Task 5: `api/profile-extended.js` — save extended profile

**Files:**
- Create: `api/profile-extended.js`

- [ ] **Step 1: Create file**

```javascript
// api/profile-extended.js
const { adminGql, verifyCustomerToken } = require('./_shopify-admin');

const METAFIELDS_SET = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
            metafields { key }
            userErrors { field message }
        }
    }
`;

const ALLOWED_KEYS = ['birthdate', 'lang', 'favoriteGames', 'phone'];

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const auth = (req.headers.authorization || '').replace('Bearer ', '');
    if (!auth) return res.status(401).json({ error: 'Missing token' });

    const customer = await verifyCustomerToken(auth);
    if (!customer) return res.status(401).json({ error: 'Invalid token' });

    const body = req.body || {};
    const update = {};
    ALLOWED_KEYS.forEach(function(k) {
        if (body[k] !== undefined) update[k] = String(body[k]).slice(0, 500);
    });

    const result = await adminGql(METAFIELDS_SET, {
        metafields: [{
            ownerId: customer.id,
            namespace: 'profile',
            key: 'extended',
            type: 'json',
            value: JSON.stringify(update)
        }]
    });

    const errors = result.data && result.data.metafieldsSet && result.data.metafieldsSet.userErrors;
    if (errors && errors.length) return res.status(400).json({ error: errors[0].message });

    return res.status(200).json({ ok: true });
};
```

- [ ] **Step 2: Commit**
  ```bash
  git add api/profile-extended.js
  git commit -m "feat: profile extended fields api endpoint"
  ```

---

## Task 6: `api/webhook-order.js` — loyalty update on order paid

**Files:**
- Create: `api/webhook-order.js`

- [ ] **Step 1: Create file**

```javascript
// api/webhook-order.js
const crypto = require('crypto');
const { adminGql } = require('./_shopify-admin');

const TIER_THRESHOLDS = { silver: 500, gold: 1200 };

function tierFromSpend(spent) {
    if (spent >= TIER_THRESHOLDS.gold)   return 'gold';
    if (spent >= TIER_THRESHOLDS.silver) return 'silver';
    return 'bronze';
}

const GET_LOYALTY = `
    query getLoyalty($id: ID!) {
        customer(id: $id) {
            metafield(namespace: "loyalty", key: "total_spent")   { value }
            metafield(namespace: "loyalty", key: "orders_placed") { value }
        }
    }
`;

const SET_LOYALTY = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
            userErrors { field message }
        }
    }
`;

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    // Verify HMAC signature
    const signature  = req.headers['x-shopify-hmac-sha256'];
    const rawBody    = req.rawBody || JSON.stringify(req.body);
    const expected   = crypto
        .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
        .update(rawBody, 'utf8')
        .digest('base64');

    if (signature !== expected) return res.status(401).json({ error: 'Invalid signature' });

    const order = req.body;
    if (!order.customer || !order.customer.id) return res.status(200).json({ ok: true, skipped: 'no customer' });

    const customerId = 'gid://shopify/Customer/' + order.customer.id;
    const orderTotal = parseFloat(order.total_price || '0');

    // Read current loyalty
    const current = await adminGql(GET_LOYALTY, { id: customerId });
    const cust    = current.data && current.data.customer;
    const prevSpent  = parseFloat((cust && cust.metafield && cust.metafield.value) || '0') || 0;
    // orders_placed is second metafield — re-query with alias
    const ordersData = await adminGql(`query { customer(id: "${customerId}") { m: metafield(namespace:"loyalty",key:"orders_placed") { value } } }`);
    const prevOrders = parseInt((ordersData.data && ordersData.data.customer && ordersData.data.customer.m && ordersData.data.customer.m.value) || '0') || 0;

    const newSpent  = prevSpent + orderTotal;
    const newOrders = prevOrders + 1;
    const newTier   = tierFromSpend(newSpent);

    await adminGql(SET_LOYALTY, {
        metafields: [
            { ownerId: customerId, namespace: 'loyalty', key: 'total_spent',   type: 'number_decimal', value: newSpent.toFixed(2) },
            { ownerId: customerId, namespace: 'loyalty', key: 'orders_placed', type: 'number_integer', value: String(newOrders) },
            { ownerId: customerId, namespace: 'loyalty', key: 'tier',          type: 'single_line_text_field', value: newTier }
        ]
    });

    return res.status(200).json({ ok: true });
};
```

- [ ] **Step 2: Register webhook in Shopify Admin**
  Settings → Notifications → Webhooks → Create webhook:
  - Event: `Order payment`
  - Format: JSON
  - URL: `https://YOUR_VERCEL_URL/api/webhook-order`
  - Copy the webhook signing secret and set as `SHOPIFY_WEBHOOK_SECRET` in Vercel.

- [ ] **Step 3: Commit**
  ```bash
  git add api/webhook-order.js
  git commit -m "feat: order webhook updates loyalty metafields"
  ```

---

## Task 7: `api/admin-loyalty.js` — manual loyalty adjustment

**Files:**
- Create: `api/admin-loyalty.js`

- [ ] **Step 1: Create file**

```javascript
// api/admin-loyalty.js
const crypto = require('crypto');
const { adminGql } = require('./_shopify-admin');

const TIER_THRESHOLDS = { silver: 500, gold: 1200 };
function tierFromSpend(s) {
    if (s >= TIER_THRESHOLDS.gold)   return 'gold';
    if (s >= TIER_THRESHOLDS.silver) return 'silver';
    return 'bronze';
}

function verifyAdminJwt(header) {
    const token = (header || '').replace('Bearer ', '');
    if (!token) return false;
    // Simple HMAC-based token: base64(payload).HMAC(payload, secret)
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return false;
    const expected = crypto.createHmac('sha256', process.env.ADMIN_JWT_SECRET)
        .update(payloadB64).digest('hex');
    return sig === expected;
}

const SET_LOYALTY = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
            userErrors { field message }
        }
    }
`;

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).end();

    if (!verifyAdminJwt(req.headers.authorization)) return res.status(401).json({ error: 'Unauthorized' });

    const { customerId, newTotalSpent, newOrdersPlaced } = req.body;
    if (!customerId) return res.status(400).json({ error: 'Missing customerId' });

    const spent  = parseFloat(newTotalSpent)  || 0;
    const orders = parseInt(newOrdersPlaced)  || 0;
    const tier   = tierFromSpend(spent);

    await adminGql(SET_LOYALTY, {
        metafields: [
            { ownerId: customerId, namespace: 'loyalty', key: 'total_spent',   type: 'number_decimal', value: spent.toFixed(2) },
            { ownerId: customerId, namespace: 'loyalty', key: 'orders_placed', type: 'number_integer', value: String(orders) },
            { ownerId: customerId, namespace: 'loyalty', key: 'tier',          type: 'single_line_text_field', value: tier }
        ]
    });

    return res.status(200).json({ ok: true, tier });
};
```

- [ ] **Step 2: Commit**
  ```bash
  git add api/admin-loyalty.js
  git commit -m "feat: admin loyalty manual adjustment endpoint"
  ```

---

## Task 8: `js/shopify-api.js` — browser GraphQL client

**Files:**
- Create: `js/shopify-api.js`

- [ ] **Step 1: Create file** (replace `YOUR_STORE` and `YOUR_TOKEN` after setup)

```javascript
// js/shopify-api.js
var ShopifyAPI = (function() {
    var DOMAIN    = 'YOUR_STORE.myshopify.com';
    var SF_TOKEN  = 'YOUR_STOREFRONT_TOKEN';
    var VERSION   = '2024-10';
    var AUTH_KEY  = 'mb_customer_token';
    var CART_KEY  = 'mb_cart_id';
    var CACHE_KEY = 'mb_products_cache';
    var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

    // POST to our Vercel API layer with customer auth header
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
```

- [ ] **Step 2: Add script tag to all HTML pages that use Firebase today**

In `index.html`, `catalogo.html`, `carrello.html`, `account.html` — add before any other custom JS:
```html
<script src="js/shopify-api.js"></script>
```

- [ ] **Step 3: Verify it loads without errors**
  Open browser console on any page, type `ShopifyAPI` — should return the object.

- [ ] **Step 4: Commit**
  ```bash
  git add js/shopify-api.js index.html catalogo.html carrello.html account.html
  git commit -m "feat: shopify storefront api client"
  ```

---

## Task 9: `js/account-init.js` — full rewrite

**Files:**
- Modify: `js/account-init.js`

- [ ] **Step 1: Replace entire file**

```javascript
// js/account-init.js
(function() {
    var TIER = { silver: 500, gold: 1200 };

    function tierFromSpend(s) {
        if (s >= TIER.gold)   return 'gold';
        if (s >= TIER.silver) return 'silver';
        return 'bronze';
    }

    function esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function fmtEur(n) {
        return '€' + Number(n).toFixed(2).replace('.', ',');
    }

    /* ---- tab switching (unchanged DOM) ---- */
    window.showAuthTab = function(tab) {
        document.getElementById('form-login').style.display    = tab === 'login'    ? '' : 'none';
        document.getElementById('form-register').style.display = tab === 'register' ? '' : 'none';
        document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
        document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    };

    window.showAccTab = function(tab) {
        ['profilo','ordini','wishlist','indirizzi'].forEach(function(t) {
            var pane = document.getElementById('acc-' + t);
            var btn  = document.getElementById('atab-' + t);
            if (pane) pane.style.display = t === tab ? '' : 'none';
            if (btn)  btn.classList.toggle('active', t === tab);
        });
        if (tab === 'ordini')   loadOrdini();
        if (tab === 'wishlist') loadWishlist();
    };

    /* ---- auth actions ---- */
    window.doLogin = function() {
        var email = document.getElementById('login-email').value.trim();
        var pwd   = document.getElementById('login-pwd').value;
        var msg   = document.getElementById('login-msg');
        var btn   = document.getElementById('login-btn');
        msg.textContent = ''; msg.className = 'auth-msg';
        if (!email || !pwd) { msg.textContent = 'Compila tutti i campi.'; msg.className = 'auth-msg err'; return; }
        btn.disabled = true; btn.textContent = '...';
        ShopifyAPI.sfApi(
            'mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) { customerAccessTokenCreate(input: $input) { customerAccessToken { accessToken expiresAt } customerUserErrors { code message } } }',
            { input: { email: email, password: pwd } }
        ).then(function(res) {
            var result = res.data && res.data.customerAccessTokenCreate;
            if (!result) throw new Error('No response');
            if (result.customerUserErrors && result.customerUserErrors.length) {
                msg.textContent = _authError(result.customerUserErrors[0].code);
                msg.className = 'auth-msg err';
                btn.disabled = false; btn.textContent = 'ACCEDI';
                return;
            }
            ShopifyAPI.setCustomerToken(result.customerAccessToken.accessToken);
            _loadAndRender();
        }).catch(function() {
            msg.textContent = 'Errore di rete. Riprova.';
            msg.className = 'auth-msg err';
            btn.disabled = false; btn.textContent = 'ACCEDI';
        });
    };

    window.doRegister = function() {
        var name  = document.getElementById('reg-name').value.trim();
        var email = document.getElementById('reg-email').value.trim();
        var pwd   = document.getElementById('reg-pwd').value;
        var msg   = document.getElementById('reg-msg');
        var btn   = document.getElementById('reg-btn');
        msg.textContent = ''; msg.className = 'auth-msg';
        if (!name || !email || !pwd) { msg.textContent = 'Compila tutti i campi.'; msg.className = 'auth-msg err'; return; }
        if (pwd.length < 5) { msg.textContent = 'Password min. 5 caratteri.'; msg.className = 'auth-msg err'; return; }
        btn.disabled = true; btn.textContent = '...';
        var parts = name.trim().split(/\s+/);
        var firstName = parts[0] || name;
        var lastName  = parts.slice(1).join(' ') || '';
        ShopifyAPI.sfApi(
            'mutation customerCreate($input: CustomerCreateInput!) { customerCreate(input: $input) { customer { id } customerUserErrors { code message } } }',
            { input: { firstName: firstName, lastName: lastName, email: email, password: pwd, acceptsMarketing: true } }
        ).then(function(res) {
            var result = res.data && res.data.customerCreate;
            if (!result) throw new Error('No response');
            if (result.customerUserErrors && result.customerUserErrors.length) {
                msg.textContent = _authError(result.customerUserErrors[0].code);
                msg.className = 'auth-msg err';
                btn.disabled = false; btn.textContent = 'CREA ACCOUNT';
                return;
            }
            // Auto-login after registration
            return ShopifyAPI.sfApi(
                'mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) { customerAccessTokenCreate(input: $input) { customerAccessToken { accessToken } customerUserErrors { message } } }',
                { input: { email: email, password: pwd } }
            ).then(function(r2) {
                var t = r2.data && r2.data.customerAccessTokenCreate && r2.data.customerAccessTokenCreate.customerAccessToken;
                if (t) { ShopifyAPI.setCustomerToken(t.accessToken); _loadAndRender(); }
            });
        }).catch(function() {
            msg.textContent = 'Errore di rete. Riprova.';
            msg.className = 'auth-msg err';
            btn.disabled = false; btn.textContent = 'CREA ACCOUNT';
        });
    };

    window.doLogout = function() {
        var token = ShopifyAPI.getCustomerToken();
        if (token) {
            ShopifyAPI.sfApi(
                'mutation customerAccessTokenDelete($t: String!) { customerAccessTokenDelete(customerAccessToken: $t) { deletedAccessToken } }',
                { t: token }
            ).catch(function() {});
        }
        ShopifyAPI.clearCustomerToken();
        _showAuth();
    };

    /* ---- init ---- */
    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('acc-loading').style.display = 'none';
        // Hide Google login button — not supported by Shopify Storefront API
        var gBtn = document.getElementById('google-login-btn');
        if (gBtn) gBtn.style.display = 'none';

        var token = ShopifyAPI.getCustomerToken();
        if (token) {
            _loadAndRender();
        } else {
            _showAuth();
        }
    });

    function _showAuth() {
        document.getElementById('auth-panel').style.display    = '';
        document.getElementById('account-panel').style.display = 'none';
        var lbl = document.getElementById('nav-account-label');
        if (lbl) lbl.textContent = 'Account';
    }

    function _loadAndRender() {
        var token = ShopifyAPI.getCustomerToken();
        if (!token) { _showAuth(); return; }
        ShopifyAPI.sfApi(
            `query getCustomer($token: String!) {
                customer(customerAccessToken: $token) {
                    id firstName lastName email phone createdAt
                    loyaltySpent:    metafield(namespace: "loyalty",  key: "total_spent")   { value }
                    loyaltyOrders:   metafield(namespace: "loyalty",  key: "orders_placed") { value }
                    wishlistMeta:    metafield(namespace: "wishlist", key: "product_ids")   { value }
                    extendedProfile: metafield(namespace: "profile",  key: "extended")      { value }
                    orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
                        edges { node {
                            id name processedAt
                            totalPriceV2 { amount }
                            fulfillmentStatus
                            lineItems(first: 5) { edges { node { title quantity } } }
                        } }
                    }
                }
            }`,
            { token: token }
        ).then(function(res) {
            var cust = res.data && res.data.customer;
            if (!cust) { ShopifyAPI.clearCustomerToken(); _showAuth(); return; }
            document.getElementById('acc-loading').style.display = 'none';
            document.getElementById('auth-panel').style.display    = 'none';
            document.getElementById('account-panel').style.display = '';
            _populateHeader(cust);
            _renderProfilo(cust);
            _loadWishlistCount(cust);
        }).catch(function() { _showAuth(); });
    }

    function _populateHeader(cust) {
        var name  = ((cust.firstName || '') + ' ' + (cust.lastName || '')).trim() || cust.email.split('@')[0];
        var parts = name.trim().split(/\s+/);

        var avatarEl = document.getElementById('acc-avatar');
        if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

        var nameEl = document.getElementById('acc-name');
        if (nameEl) {
            if (parts.length >= 2) {
                var last  = parts.slice(0, -1).join(' ').toUpperCase();
                var first = parts[parts.length - 1].toUpperCase();
                nameEl.innerHTML = esc(last) + '<em>' + esc(first) + '</em>';
            } else {
                nameEl.textContent = name.toUpperCase();
            }
        }

        var emailEl = document.getElementById('acc-email');
        if (emailEl) emailEl.textContent = cust.email;

        var lbl = document.getElementById('nav-account-label');
        if (lbl) lbl.textContent = name.charAt(0).toUpperCase();

        var crumbSub = document.getElementById('crumb-sub');
        if (crumbSub) {
            var shopId = (cust.id || '').split('/').pop() || '';
            crumbSub.textContent = 'Tessera socio · ID #' + shopId.slice(-6).toUpperCase() + ' · attiva';
        }

        var memberEl = document.getElementById('member-since');
        if (memberEl && cust.createdAt) {
            var d = new Date(cust.createdAt);
            memberEl.textContent = d.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }).toUpperCase();
        }

        var spent = parseFloat((cust.loyaltySpent && cust.loyaltySpent.value) || '0') || 0;
        _updateTierDisplay(spent);
    }

    function _updateTierDisplay(spent) {
        var tierKey = tierFromSpend(spent);
        var pct = 0;
        if (tierKey === 'bronze')      pct = Math.min((spent / TIER.silver) * 50, 50);
        else if (tierKey === 'silver') pct = 50 + Math.min(((spent - TIER.silver) / (TIER.gold - TIER.silver)) * 50, 50);
        else                           pct = 100;
        setTimeout(function() {
            var fill = document.getElementById('tier-fill');
            if (fill) fill.style.width = pct + '%';
        }, 250);

        ['bronze','silver','gold'].forEach(function(t) {
            var el = document.getElementById('ts-' + t);
            if (el) el.classList.toggle('is-current', t === tierKey);
        });

        var info = {
            bronze: { abbr:'BRZ', name:'BRONZO', coinCls:'',       badge:'BRZ' },
            silver: { abbr:'SLV', name:'SILVER',  coinCls:'silver', badge:'SLV' },
            gold:   { abbr:'GLD', name:'GOLD',    coinCls:'gold',   badge:'GLD' }
        }[tierKey];

        var coinEl  = document.getElementById('tier-coin');
        var labelEl = document.getElementById('tier-label');
        var badgeEl = document.getElementById('tier-level-badge');
        if (coinEl)  { coinEl.textContent = info.abbr; coinEl.className = 'coin ' + info.coinCls; }
        if (labelEl) labelEl.textContent = info.name;
        if (badgeEl) badgeEl.textContent = info.badge;

        var fmt = fmtEur(spent);
        var spentValEl  = document.getElementById('tier-spent-val');
        var statSpentEl = document.getElementById('stat-spent');
        if (spentValEl)  spentValEl.textContent  = fmt;
        if (statSpentEl) statSpentEl.textContent = fmt;

        var nextEl = document.getElementById('tier-next-val');
        if (nextEl) {
            if (tierKey === 'gold')        nextEl.textContent = 'MAX';
            else if (tierKey === 'silver') nextEl.textContent = '€' + Math.ceil(TIER.gold - spent).toLocaleString('it-IT');
            else                           nextEl.textContent = '€' + Math.ceil(TIER.silver - spent).toLocaleString('it-IT');
        }

        var pillEl = document.getElementById('tier-pts-pill');
        if (pillEl) pillEl.textContent = '+' + Math.floor(spent) + ' PT';

        var perksBox = document.getElementById('next-perks-box');
        if (perksBox) {
            if (tierKey === 'gold') {
                perksBox.innerHTML = '<div class="hd"><b>GOLD</b> — Livello massimo!</div><ul><li>Sconto <b>10%</b> su tutto</li><li>Spedizione gratis sempre</li><li>Tavolo VIP nel weekend</li></ul>';
            } else if (tierKey === 'silver') {
                perksBox.innerHTML = '<div class="hd">Sblocca <b>GOLD</b> →</div><ul><li>Sconto <b>10%</b> + omaggio mensile</li><li>Spedizione gratis sempre</li><li>Tavolo VIP riservato nel weekend</li></ul>';
            } else {
                perksBox.innerHTML = '<div class="hd">Sblocca <b>SILVER</b> →</div><ul><li>Sconto <b>5%</b> su tutto il catalogo</li><li>Spedizione gratis sopra €39</li><li>Accesso anticipato alle uscite</li></ul>';
            }
        }

        var order = ['bronze','silver','gold'];
        var idx   = order.indexOf(tierKey);
        order.forEach(function(t, i) {
            var stEl = document.getElementById('perk-state-' + t);
            if (!stEl) return;
            if (i < idx)       { stEl.textContent = 'Completato'; stEl.className = 'perk-state current'; }
            else if (i === idx) { stEl.textContent = 'Attuale';    stEl.className = 'perk-state current'; }
            else {
                var thresh = t === 'silver' ? TIER.silver : TIER.gold;
                stEl.textContent = '€' + thresh.toLocaleString('it-IT') + ' al traguardo';
                stEl.className = 'perk-state locked';
            }
        });
    }

    function _renderProfilo(cust) {
        var el = document.getElementById('acc-profilo');
        if (!el) return;

        var extended = {};
        try { extended = JSON.parse((cust.extendedProfile && cust.extendedProfile.value) || '{}'); } catch(e) {}

        var spent  = parseFloat((cust.loyaltySpent  && cust.loyaltySpent.value)  || '0') || 0;
        var orders = parseInt((cust.loyaltyOrders && cust.loyaltyOrders.value) || '0') || 0;

        var ordersEl  = document.getElementById('stat-orders');
        var ordersSub = document.getElementById('stat-orders-sub');
        if (ordersEl)  ordersEl.textContent  = orders;
        if (ordersSub) ordersSub.textContent = orders > 0
            ? orders + ' ordine' + (orders > 1 ? 'i' : '') + ' completat' + (orders > 1 ? 'i' : 'o')
            : 'Nessun ordine ancora';

        el.innerHTML =
            '<div class="panel-head"><span>Dati personali</span><span class="grow"></span><span class="pill">Modificabili</span></div>'
            + '<div class="form-grid">'
            + '<div class="field"><label>Nome</label><input type="text" id="prof-firstname" value="' + esc(cust.firstName || '') + '"></div>'
            + '<div class="field"><label>Cognome</label><input type="text" id="prof-lastname" value="' + esc(cust.lastName || '') + '"></div>'
            + '<div class="field"><label>Email</label><input type="email" id="prof-email" value="' + esc(cust.email) + '" readonly></div>'
            + '<div class="field"><label>Telefono</label><input type="tel" id="prof-phone" value="' + esc(cust.phone || extended.phone || '') + '" placeholder="+39 ___ ___ ____"><span class="hint">Per gli aggiornamenti sulle spedizioni</span></div>'
            + '<div class="field"><label>Data di nascita</label><input type="text" id="prof-bday" value="' + esc(extended.birthdate || '') + '" placeholder="GG / MM / AAAA"><span class="hint">Riceverai un regalo per il tuo compleanno 🎁</span></div>'
            + '<div class="field"><label>Lingua preferita</label><select id="prof-lang"><option value="it">Italiano</option><option value="en">English</option><option value="ja">日本語</option></select></div>'
            + '<div class="field full"><label>Giochi preferiti</label><input type="text" id="prof-games" value="' + esc(extended.favoriteGames || '') + '" placeholder="es. Catan, Wingspan, Gloomhaven..."><span class="hint">Ci aiuta a consigliarti uscite e tornei</span></div>'
            + '</div>'
            + '<div class="form-foot"><span style="font-size:12px;color:#6b6b6b">Le modifiche sono salvate solo dopo aver premuto SALVA</span><div style="display:flex;align-items:center;gap:14px"><span id="prof-msg"></span><button class="save-btn" onclick="saveProfile()">💾 Salva modifiche</button></div></div>';

        var langEl = document.getElementById('prof-lang');
        if (langEl && extended.lang) langEl.value = extended.lang;
    }

    window.saveProfile = function() {
        var token = ShopifyAPI.getCustomerToken();
        if (!token) return;
        var msgEl = document.getElementById('prof-msg');
        var btn   = document.querySelector('.save-btn');
        var first = (document.getElementById('prof-firstname').value || '').trim();
        var last  = (document.getElementById('prof-lastname').value  || '').trim();
        var phone = (document.getElementById('prof-phone').value     || '').trim();
        var bday  = (document.getElementById('prof-bday').value      || '').trim();
        var lang  = document.getElementById('prof-lang').value;
        var games = (document.getElementById('prof-games').value     || '').trim();

        if (btn) { btn.disabled = true; btn.textContent = '...'; }

        var sfUpdate = ShopifyAPI.sfApi(
            'mutation customerUpdate($token: String!, $customer: CustomerUpdateInput!) { customerUpdate(customerAccessToken: $token, customer: $customer) { customer { firstName lastName } customerUserErrors { message } } }',
            { token: token, customer: { firstName: first, lastName: last, phone: phone || undefined } }
        );

        var extUpdate = ShopifyAPI.apiPost('/api/profile-extended', { birthdate: bday, lang: lang, favoriteGames: games, phone: phone });

        Promise.all([sfUpdate, extUpdate]).then(function() {
            if (msgEl) { msgEl.textContent = '✓ Salvato!'; msgEl.style.color = '#138a5f'; }
            if (btn)   { btn.disabled = false; btn.textContent = '💾 Salva modifiche'; }
            setTimeout(function() { if (msgEl) msgEl.textContent = ''; }, 3000);
        }).catch(function(e) {
            if (msgEl) { msgEl.textContent = 'Errore: ' + e.message; msgEl.style.color = '#dc2626'; }
            if (btn)   { btn.disabled = false; btn.textContent = '💾 Salva modifiche'; }
        });
    };

    function _loadWishlistCount(cust) {
        var raw = (cust.wishlistMeta && cust.wishlistMeta.value) || '[]';
        var ids;
        try { ids = JSON.parse(raw); } catch(e) { ids = []; }
        var el = document.getElementById('stat-wishlist');
        if (el) el.textContent = ids.length;
    }

    var _ordiniLoaded = false;
    function loadOrdini() {
        if (_ordiniLoaded) return;
        _ordiniLoaded = true;
        var token = ShopifyAPI.getCustomerToken();
        if (!token) return;
        var el = document.getElementById('acc-ordini');
        el.innerHTML = '<div class="acc-inline-load">Caricamento ordini...</div>';

        ShopifyAPI.sfApi(
            'query getOrders($token: String!) { customer(customerAccessToken: $token) { orders(first: 20, sortKey: PROCESSED_AT, reverse: true) { edges { node { id name processedAt totalPriceV2 { amount } fulfillmentStatus lineItems(first: 5) { edges { node { title quantity } } } } } } } }',
            { token: token }
        ).then(function(res) {
            var edges = res.data && res.data.customer && res.data.customer.orders && res.data.customer.orders.edges;
            if (!edges || !edges.length) {
                el.innerHTML =
                    '<div class="panel-head"><span>Storico ordini</span><span class="grow"></span><span class="pill">0 ordini</span></div>'
                    + '<div class="empty"><div class="empty-illu"><span class="glyph">📦</span><span class="stamp">VUOTO!</span></div>'
                    + '<h3>Nessun ordine <em>ancora</em></h3>'
                    + '<p>Quando farai il tuo primo ordine lo troverai qui, con tracking e ricevute.</p>'
                    + '<a href="catalogo.html" class="empty-cta">→ Esplora il catalogo</a></div>';
                return;
            }
            var rows = '';
            edges.forEach(function(e) {
                var o      = e.node;
                var id     = (o.name || '').replace('#', '');
                var dt     = o.processedAt ? new Date(o.processedAt).toLocaleDateString('it-IT', { day:'2-digit', month:'long', year:'numeric' }) : '—';
                var status = (o.fulfillmentStatus || 'UNFULFILLED').toLowerCase();
                var lbl    = { unfulfilled:'Ricevuto', in_progress:'In Prep.', fulfilled:'Spedito', restocked:'Reso' }[status] || status;
                var items  = (o.lineItems && o.lineItems.edges) || [];
                var first  = items[0] && items[0].node;
                var title  = first ? esc(first.title) : '—';
                var extra  = items.length > 1 ? ' <span style="color:#6b6b6b;font-size:.85em">+' + (items.length - 1) + ' art.</span>' : '';
                var total  = parseFloat(o.totalPriceV2 && o.totalPriceV2.amount || 0).toFixed(2);
                rows += '<div class="order">'
                    + '<div class="o-cover"><span class="o-glyph">📦</span></div>'
                    + '<div class="o-info">'
                    + '<span class="o-id">Ordine #' + esc(id) + ' · ' + dt + '</span>'
                    + '<h4 class="o-title">' + title + extra + '</h4>'
                    + '<span class="o-meta">€' + total + ' totale</span>'
                    + '</div>'
                    + '<span class="o-status ' + esc(status) + '">' + esc(lbl) + '</span>'
                    + '<span class="o-total">€' + total + '</span>'
                    + '</div>';
            });
            el.innerHTML =
                '<div class="panel-head"><span>Storico ordini</span><span class="grow"></span><span class="pill">' + edges.length + ' ordini</span></div>'
                + '<div class="order-list">' + rows + '</div>';
        }).catch(function(err) { el.innerHTML = '<div class="acc-inline-empty">Errore caricamento ordini.</div>'; });
    }

    var _wishlistLoaded = false;
    var _wlItems = {};
    function loadWishlist() {
        if (_wishlistLoaded) return;
        _wishlistLoaded = true;
        var token = ShopifyAPI.getCustomerToken();
        if (!token) return;
        var el = document.getElementById('acc-wishlist');
        el.innerHTML = '<div class="acc-inline-load">Caricamento wishlist...</div>';

        ShopifyAPI.sfApi(
            'query getWishlist($token: String!) { customer(customerAccessToken: $token) { metafield(namespace: "wishlist", key: "product_ids") { value } } }',
            { token: token }
        ).then(function(res) {
            var raw = res.data && res.data.customer && res.data.customer.metafield && res.data.customer.metafield.value;
            var ids;
            try { ids = JSON.parse(raw || '[]'); } catch(e) { ids = []; }
            var wlStat = document.getElementById('stat-wishlist');
            if (wlStat) wlStat.textContent = ids.length;

            if (!ids.length) {
                el.innerHTML =
                    '<div class="panel-head"><span>La tua wishlist</span><span class="grow"></span><span class="pill">0 articoli</span></div>'
                    + '<div class="empty"><div class="empty-illu"><span class="glyph">♡</span><span class="stamp">VUOTA!</span></div>'
                    + '<h3>Wishlist <em>vuota</em></h3>'
                    + '<p>Salva i prodotti che ti interessano cliccando il cuore nel catalogo.</p>'
                    + '<a href="catalogo.html" class="empty-cta">→ Sfoglia il catalogo</a></div>';
                return;
            }

            // Fetch product details for each ID
            var queries = ids.slice(0, 50).map(function(gid, i) {
                return 'p' + i + ': product(id: "' + gid + '") { id title priceRange { minVariantPrice { amount } } images(first:1) { edges { node { url } } } variants(first:1) { edges { node { id } } } }';
            });
            return ShopifyAPI.sfApi('query { ' + queries.join(' ') + ' }').then(function(pRes) {
                var cards = '';
                ids.forEach(function(gid, i) {
                    var p = pRes.data && pRes.data['p' + i];
                    if (!p) return;
                    var img   = p.images && p.images.edges[0] && p.images.edges[0].node.url;
                    var price = p.priceRange && '€' + parseFloat(p.priceRange.minVariantPrice.amount).toFixed(2);
                    var variantId = p.variants && p.variants.edges[0] && p.variants.edges[0].node.id;
                    _wlItems[gid] = { title: p.title, image: img, price: price, variantId: variantId };
                    var imgEl = img
                        ? '<div class="wl-img"><img src="' + esc(img) + '" alt="' + esc(p.title) + '" loading="lazy"></div>'
                        : '<div class="wl-img">' + esc((p.title || '?').charAt(0)) + '</div>';
                    cards += '<div class="wl-card">'
                        + imgEl
                        + '<div class="wl-title">' + esc(p.title) + '</div>'
                        + '<div class="wl-price">' + esc(price || '') + '</div>'
                        + '<div class="wl-actions">'
                        + '<button class="wl-add" onclick="wlAddToCart(\'' + esc(gid) + '\',this)">+ CARRELLO</button>'
                        + '<button class="wl-remove" onclick="wlRemove(\'' + esc(gid) + '\',this)" title="Rimuovi">♡</button>'
                        + '</div></div>';
                });
                el.innerHTML =
                    '<div class="panel-head"><span>La tua wishlist</span><span class="grow"></span><span class="pill red">' + ids.length + ' articoli</span></div>'
                    + '<div class="wl-grid">' + cards + '</div>';
            });
        }).catch(function() { el.innerHTML = '<div class="acc-inline-empty">Errore caricamento wishlist.</div>'; });
    }

    window.wlAddToCart = function(productGid, btn) {
        var p = _wlItems[productGid];
        if (!p || !p.variantId) return;
        MBCart.add({ variantId: p.variantId, title: p.title, image: p.image || '', price: p.price || '', maxQty: 99 });
        btn.textContent = '✓ AGGIUNTO';
        btn.disabled = true;
    };

    window.wlRemove = function(productGid, btn) {
        var token = ShopifyAPI.getCustomerToken();
        if (!token) return;
        ShopifyAPI.apiPost('/api/wishlist', { action: 'remove', productId: productGid }).then(function() {
            var card = btn.closest('.wl-card');
            if (card) card.remove();
            delete _wlItems[productGid];
            var count = Object.keys(_wlItems).length;
            var wlStat = document.getElementById('stat-wishlist');
            if (wlStat) wlStat.textContent = count;
        }).catch(function() {});
    };

    function _authError(code) {
        var map = {
            'CUSTOMER_DISABLED':        'Account disabilitato.',
            'INVALID_CREDENTIALS':      'Email o password errata.',
            'NOT_FOUND':                'Nessun account con questa email.',
            'TAKEN':                    'Email già registrata.',
            'PASSWORD_TOO_SHORT':       'Password troppo corta.',
            'UNIDENTIFIED_CUSTOMER':    'Credenziali non valide.',
            'THROTTLED':                'Troppi tentativi. Riprova tra poco.'
        };
        return map[code] || 'Errore: ' + code;
    }
})();
```

- [ ] **Step 2: Open `account.html` in browser, verify login form appears**

- [ ] **Step 3: Test login with a Shopify test customer**
  Create a customer in Shopify Admin → Customers → Add customer (email + password).
  Log in on account page, verify account panel appears with correct name.

- [ ] **Step 4: Commit**
  ```bash
  git add js/account-init.js
  git commit -m "feat: account-init rewritten for shopify customer api"
  ```

---

## Task 10: `js/catalogo-init.js` — replace product fetch + wishlist

**Files:**
- Modify: `js/catalogo-init.js`

The `catPage` module keeps all its render logic unchanged. Only two things change:
1. `getProducts()` is replaced by a Shopify fetch that writes to `window._shopifyProducts`
2. `toggleWishlist()` and `_initWishlist()` call `/api/wishlist` instead of Firestore

- [ ] **Step 1: Add product fetcher function** — replace the `_initMainFirebase` and `_mbInitWishlist` bootstrap with a new function. Add this **before** the `DOMContentLoaded` block at the bottom of `catalogo-init.js`:

```javascript
/* ---- Shopify product fetcher ---- */
function _fetchShopifyProducts() {
    var cached = ShopifyAPI.getProductsCache();
    if (cached) {
        window._shopifyProducts = cached;
        catPage.init();
        return;
    }

    var query = `query getProducts($cursor: String) {
        products(first: 250, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            edges { node {
                id title productType tags availableForSale
                priceRange { minVariantPrice { amount } }
                images(first: 1) { edges { node { url } } }
                variants(first: 1) { edges { node { id availableForSale quantityAvailable } } }
                badgeMeta:     metafield(namespace: "catalog", key: "badge")          { value }
                subcatMeta:    metafield(namespace: "catalog", key: "subcat")         { value }
                volumeMeta:    metafield(namespace: "catalog", key: "volume")         { value }
                availFromMeta: metafield(namespace: "catalog", key: "available_from") { value }
            } }
        }
    }`;

    function fetchPage(cursor, acc) {
        return ShopifyAPI.sfApi(query, cursor ? { cursor: cursor } : {}).then(function(res) {
            var conn = res.data && res.data.products;
            if (!conn) return acc;
            conn.edges.forEach(function(e) {
                var n = e.node;
                var variant = n.variants && n.variants.edges[0] && n.variants.edges[0].node;
                var catTag  = (n.tags || []).find(function(t) { return t.startsWith('cat:'); });
                var cat     = catTag ? catTag.replace('cat:', '') : (n.productType || '').toLowerCase();
                acc.push({
                    id:            n.id,
                    firestoreId:   n.id,
                    variantId:     variant ? variant.id : null,
                    title:         n.title,
                    cat:           cat,
                    subcat:        (n.badgeMeta && n.subcatMeta && n.subcatMeta.value) || '',
                    badge:         (n.badgeMeta  && n.badgeMeta.value)          || '',
                    volume:        (n.volumeMeta && n.volumeMeta.value)         || '',
                    price:         n.priceRange ? '€' + parseFloat(n.priceRange.minVariantPrice.amount).toFixed(2) : '',
                    image:         n.images && n.images.edges[0] ? n.images.edges[0].node.url : '',
                    quantity:      variant ? (variant.quantityAvailable || 0) : 0,
                    availableFrom: n.availFromMeta ? n.availFromMeta.value : null
                });
            });
            if (conn.pageInfo.hasNextPage) return fetchPage(conn.pageInfo.endCursor, acc);
            return acc;
        });
    }

    fetchPage(null, []).then(function(products) {
        ShopifyAPI.setProductsCache(products);
        window._shopifyProducts = products;
        catPage.init();
    }).catch(function(err) {
        console.error('[Catalogo] Shopify fetch error:', err);
        catPage.init(); // render empty state
    });
}

// Override getProducts to return Shopify data
window.getProducts = function() {
    return window._shopifyProducts || [];
};
```

- [ ] **Step 2: Update wishlist functions** — find `_initWishlist()` and `toggleWishlist()` and replace with:

```javascript
function _initWishlist() {
    var token = ShopifyAPI.getCustomerToken();
    if (!token) { _wlSet = {}; _refreshHearts(); return; }
    ShopifyAPI.sfApi(
        'query getWishlist($token: String!) { customer(customerAccessToken: $token) { metafield(namespace: "wishlist", key: "product_ids") { value } } }',
        { token: token }
    ).then(function(res) {
        var raw = res.data && res.data.customer && res.data.customer.metafield && res.data.customer.metafield.value;
        _wlSet = {};
        try { (JSON.parse(raw || '[]')).forEach(function(id) { _wlSet[id] = true; }); } catch(e) {}
        _wlUser = true; // flag: user is logged in
        _refreshHearts();
    }).catch(function() {});
}

window.toggleWishlist = function(productId, title, image, price, btn) {
    var token = ShopifyAPI.getCustomerToken();
    if (!token) {
        alert('Accedi al tuo account per salvare i prodotti nella wishlist.');
        return;
    }
    var action = _wlSet[productId] ? 'remove' : 'add';
    ShopifyAPI.apiPost('/api/wishlist', { action: action, productId: productId }).then(function(res) {
        if (!res.ok) return;
        if (action === 'add') {
            _wlSet[productId] = true;
            if (btn) btn.classList.add('wl-heart--on');
        } else {
            delete _wlSet[productId];
            if (btn) btn.classList.remove('wl-heart--on');
        }
    }).catch(function(err) { console.error('[WL] toggle error:', err); });
};
```

- [ ] **Step 3: Replace DOMContentLoaded bootstrap** — find the existing DOMContentLoaded at the bottom and replace the Firebase/wishlist init lines:

```javascript
// Replace:
//   setTimeout(function () {
//     if (typeof _initMainFirebase === 'function') _initMainFirebase();
//     if (typeof window._mbInitWishlist === 'function') try { window._mbInitWishlist(); } catch(e) {}
//   }, 0);
// With:
_fetchShopifyProducts();
_initWishlist();
```

- [ ] **Step 4: Test** — open `catalogo.html`, verify products load (or empty state with skeleton). Open browser console, run `getProducts()` — should return array.

- [ ] **Step 5: Commit**
  ```bash
  git add js/catalogo-init.js
  git commit -m "feat: catalogo fetches products from shopify storefront api"
  ```

---

## Task 11: `js/cart.js` — Shopify Cart API

**Files:**
- Modify: `js/cart.js` (full rewrite)

```javascript
// js/cart.js
var MBCart = (function() {
    var _cart = null; // { id, checkoutUrl, lines: [{lineId, variantId, title, image, price, qty, maxQty}] }
    var _syncing = false;

    var CART_LINES_FRAGMENT = `
        lines(first: 50) { edges { node {
            id quantity
            merchandise { ... on ProductVariant {
                id
                priceV2 { amount }
                product { title images(first:1) { edges { node { url } } } }
            } }
        } } }
    `;

    var CREATE_CART = `
        mutation cartCreate($lines: [CartLineInput!]) {
            cartCreate(input: { lines: $lines }) {
                cart { id checkoutUrl ` + CART_LINES_FRAGMENT + ` }
                userErrors { field message }
            }
        }
    `;

    var ADD_LINES = `
        mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
                cart { id checkoutUrl ` + CART_LINES_FRAGMENT + ` }
                userErrors { field message }
            }
        }
    `;

    var REMOVE_LINES = `
        mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
            cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
                cart { id checkoutUrl ` + CART_LINES_FRAGMENT + ` }
            }
        }
    `;

    var UPDATE_LINES = `
        mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
            cartLinesUpdate(cartId: $cartId, lines: $lines) {
                cart { id ` + CART_LINES_FRAGMENT + ` }
            }
        }
    `;

    var GET_CART = `
        query getCart($cartId: ID!) {
            cart(id: $cartId) {
                id checkoutUrl
                ` + CART_LINES_FRAGMENT + `
            }
        }
    `;

    function _parseCart(raw) {
        if (!raw || !raw.id) return null;
        var lines = [];
        ((raw.lines && raw.lines.edges) || []).forEach(function(e) {
            var n = e.node;
            var merch = n.merchandise;
            lines.push({
                lineId:    n.id,
                variantId: merch.id,
                title:     merch.product && merch.product.title || '',
                image:     merch.product && merch.product.images && merch.product.images.edges[0] && merch.product.images.edges[0].node.url || '',
                price:     merch.priceV2 ? '€' + parseFloat(merch.priceV2.amount).toFixed(2) : '',
                qty:       n.quantity,
                maxQty:    99
            });
        });
        return { id: raw.id, checkoutUrl: raw.checkoutUrl, lines: lines };
    }

    function _updateBadge() {
        var count = _cart ? _cart.lines.reduce(function(s, l) { return s + l.qty; }, 0) : 0;
        document.querySelectorAll('.cart-badge').forEach(function(b) {
            b.textContent = count > 99 ? '99+' : count;
            b.style.display = count > 0 ? 'inline-flex' : 'none';
        });
    }

    function _flashBadge() {
        document.querySelectorAll('.cart-badge').forEach(function(b) {
            b.classList.remove('cart-badge--flash');
            void b.offsetWidth;
            b.classList.add('cart-badge--flash');
        });
    }

    function add(product) {
        // product: { variantId, title, image, price, maxQty }
        if (_syncing) return;
        _syncing = true;
        var cartId = ShopifyAPI.getCartId();
        var promise;
        if (!cartId) {
            promise = ShopifyAPI.sfApi(CREATE_CART, { lines: [{ merchandiseId: product.variantId, quantity: 1 }] })
                .then(function(res) {
                    var raw = res.data && res.data.cartCreate && res.data.cartCreate.cart;
                    return raw;
                });
        } else {
            var existing = _cart && _cart.lines.find(function(l) { return l.variantId === product.variantId; });
            if (existing) {
                promise = ShopifyAPI.sfApi(UPDATE_LINES, { cartId: cartId, lines: [{ id: existing.lineId, quantity: existing.qty + 1 }] })
                    .then(function(res) { return res.data && res.data.cartLinesUpdate && res.data.cartLinesUpdate.cart; });
            } else {
                promise = ShopifyAPI.sfApi(ADD_LINES, { cartId: cartId, lines: [{ merchandiseId: product.variantId, quantity: 1 }] })
                    .then(function(res) { return res.data && res.data.cartLinesAdd && res.data.cartLinesAdd.cart; });
            }
        }
        return promise.then(function(raw) {
            _cart = _parseCart(raw);
            if (_cart) ShopifyAPI.setCartId(_cart.id);
            _updateBadge();
            _flashBadge();
            _syncing = false;
        }).catch(function(err) {
            console.error('[MBCart] add error:', err);
            _syncing = false;
        });
    }

    function remove(lineId) {
        var cartId = ShopifyAPI.getCartId();
        if (!cartId || !lineId) return;
        return ShopifyAPI.sfApi(REMOVE_LINES, { cartId: cartId, lineIds: [lineId] })
            .then(function(res) {
                var raw = res.data && res.data.cartLinesRemove && res.data.cartLinesRemove.cart;
                _cart = _parseCart(raw);
                _updateBadge();
            });
    }

    function setQty(lineId, qty) {
        var cartId = ShopifyAPI.getCartId();
        if (!cartId || !lineId) return;
        if (qty <= 0) return remove(lineId);
        return ShopifyAPI.sfApi(UPDATE_LINES, { cartId: cartId, lines: [{ id: lineId, quantity: qty }] })
            .then(function(res) {
                var raw = res.data && res.data.cartLinesUpdate && res.data.cartLinesUpdate.cart;
                _cart = _parseCart(raw);
                _updateBadge();
            });
    }

    function getAll() {
        return _cart ? _cart.lines.slice() : [];
    }

    function count() {
        return _cart ? _cart.lines.reduce(function(s, l) { return s + l.qty; }, 0) : 0;
    }

    function getCheckoutUrl() {
        return _cart ? _cart.checkoutUrl : null;
    }

    function clear() {
        _cart = null;
        ShopifyAPI.clearCartId();
        _updateBadge();
    }

    function load() {
        var cartId = ShopifyAPI.getCartId();
        if (!cartId) { _updateBadge(); return Promise.resolve(); }
        return ShopifyAPI.sfApi(GET_CART, { cartId: cartId }).then(function(res) {
            var raw = res.data && res.data.cart;
            if (!raw) { clear(); return; }
            _cart = _parseCart(raw);
            _updateBadge();
        }).catch(function() { _updateBadge(); });
    }

    document.addEventListener('DOMContentLoaded', function() { load(); });

    return { add: add, remove: remove, setQty: setQty, getAll: getAll, count: count, getCheckoutUrl: getCheckoutUrl, clear: clear, load: load };
})();
```

- [ ] **Step 2: Update `data-cart-add` calls in `catalogo-init.js`**

In `_cardHtml(p)`, the add-to-cart button currently passes `p.firestoreId`. Change to `p.variantId`:
```javascript
// In _cardHtml, find:
// ' data-cart-add="' + (p.firestoreId || p.id) + '"'
// Replace with:
' data-cart-add="' + (p.variantId || p.id) + '"'
```

Also update the `MBCart.add` call in the click handler (bottom of `catalogo-init.js`):
```javascript
// Find the cartAddBtn handler and update:
MBCart.add({
    variantId:  ds.cartAdd,       // was: firestoreId
    title:      ds.cartTitle || ds.cartAdd,
    image:      ds.cartImage || '',
    price:      ds.cartPrice || '',
    maxQty:     parseInt(ds.cartMaxqty) || 99,
});
```

- [ ] **Step 3: Commit**
  ```bash
  git add js/cart.js js/catalogo-init.js
  git commit -m "feat: cart.js rewritten for shopify cart api"
  ```

---

## Task 12: `js/carrello.js` — Shopify cart render + checkout

**Files:**
- Modify: `js/carrello.js` (targeted changes)

Three focused changes: (1) replace Firestore loyalty read with Shopify metafield, (2) replace product recommendations Firestore query with Shopify API, (3) replace `/api/create-checkout` call with Shopify checkout URL redirect.

- [ ] **Step 1: Replace `_initFirestoreLoyalty()`** — find the function and replace:

```javascript
function _initShopifyLoyalty() {
    var token = ShopifyAPI.getCustomerToken();
    if (!token) { render(); return; }
    ShopifyAPI.sfApi(
        'query { customer(customerAccessToken: "' + token.replace(/"/g, '') + '") { loyaltySpent: metafield(namespace:"loyalty",key:"total_spent") { value } loyaltyOrders: metafield(namespace:"loyalty",key:"orders_placed") { value } } }'
    ).then(function(res) {
        var cust = res.data && res.data.customer;
        if (!cust) { render(); return; }
        _loyaltyCache = {
            totalSpent:   parseFloat((cust.loyaltySpent  && cust.loyaltySpent.value)  || '0') || 0,
            ordersPlaced: parseInt((cust.loyaltyOrders && cust.loyaltyOrders.value) || '0')  || 0
        };
        render();
    }).catch(function() { render(); });
}
```

- [ ] **Step 2: Update `DOMContentLoaded`** — replace `_initFirestoreLoyalty()` with `_initShopifyLoyalty()`:
```javascript
document.addEventListener('DOMContentLoaded', function() {
    MBCart.load().then(function() {
        render();
        _initShopifyLoyalty();
    });
});
```

- [ ] **Step 3: Replace `loadRecommendations()`** — find the function and replace:

```javascript
function loadRecommendations(cartItems) {
    var container = document.getElementById('c-also');
    if (!container) return;

    var skelCards = [1,2,3,4].map(function() {
        return '<div class="c-skel"><div class="c-skel-cover"></div><div class="c-skel-line"></div><div class="c-skel-line short"></div></div>';
    }).join('');
    container.innerHTML = '<div class="c-also"><div class="c-also-head"><h3>POTREBBE PIACERTI <span class="swish">↓</span></h3></div>'
        + '<div class="c-also-loading">' + skelCards + '</div></div>';

    var cartVariantIds = cartItems.map(function(i) { return i.variantId; });
    var keywords = extractKeywords(cartItems);

    var products = ShopifyAPI.getProductsCache();
    if (!products || !products.length) { container.innerHTML = ''; return; }

    var candidates = products.filter(function(p) {
        return p.variantId && cartVariantIds.indexOf(p.variantId) === -1 && p.quantity > 0;
    }).map(function(p) {
        return Object.assign({}, p, { score: scoreProduct(p, keywords) });
    });

    candidates.sort(function(a, b) { return b.score - a.score; });
    var shown = candidates.filter(function(c) { return c.score > 0; }).slice(0, 4);
    if (shown.length < 4) shown = shown.concat(candidates.filter(function(c) { return c.score === 0; })).slice(0, 4);

    renderAlso(shown.map(function(p) {
        return { id: p.variantId, title: p.title, image: p.image, price: p.price, category: p.cat, quantity: p.quantity };
    }));
}
```

- [ ] **Step 4: Replace `startCheckout()`** — find the function and replace the `fetch('/api/create-checkout')` block with:

```javascript
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

    var checkoutUrl = MBCart.getCheckoutUrl();
    if (!checkoutUrl) {
        errEl.style.display = 'block';
        errEl.textContent   = 'Carrello non trovato. Ricarica la pagina.';
        btn.disabled    = false;
        btn.textContent = 'PROCEDI AL PAGAMENTO';
        return;
    }

    // Apply discount code if coupon was entered
    if (appliedCoupon && appliedCoupon.code) {
        checkoutUrl = checkoutUrl + '?discount=' + encodeURIComponent(appliedCoupon.code);
    }

    window.location.href = checkoutUrl;
}
```

- [ ] **Step 5: Update `renderAlso` data attributes** — in `renderAlso()`, the recommendation cards use `data-rec-id` for `firestoreId`. Update to pass `variantId`:
```javascript
// In renderAlso cards, change:
// '<button class="c-mini-add" data-rec-id="' + esc(p.id) + '"'
// To (p.id is now variantId):
'<button class="c-mini-add" data-rec-id="' + esc(p.id) + '"'
// The data-rec-id click handler calls MBCart.add({ firestoreId: rec.dataset.recId })
// Change that handler call to:
MBCart.add({
    variantId:  rec.dataset.recId,
    title:      rec.dataset.recTitle,
    image:      rec.dataset.recImg,
    price:      rec.dataset.recPrice,
    maxQty:     parseInt(rec.dataset.recMaxqty) || 99
});
```

- [ ] **Step 6: Update qty/remove event delegation** — `carrello.js` uses `data-fid` (firestoreId) for qty and remove. With Shopify cart, operations use `lineId`. Update the render to use `lineId` and the event handlers:

In the `render()` function, in the `cards` map, change:
```javascript
// '<div class="c-product" data-fid="' + esc(item.firestoreId) + '">'
// ...
// '<button data-qty-dec="' + item.firestoreId + '">−</button>'
// '<button data-qty-inc="' + item.firestoreId + '"'
// '<button class="c-kill" data-remove="' + item.firestoreId + '"'
// To:
'<div class="c-product" data-lid="' + esc(item.lineId) + '">'
// ...
'<button data-qty-dec="' + item.lineId + '">−</button>'
'<button data-qty-inc="' + item.lineId + '"'
'<button class="c-kill" data-remove="' + item.lineId + '"'
```

In the event delegation at the bottom, update:
```javascript
var dec = e.target.closest('[data-qty-dec]');
if (dec) {
    var itemDec = MBCart.getAll().find(function(i) { return i.lineId === dec.dataset.qtyDec; });
    if (itemDec) { MBCart.setQty(dec.dataset.qtyDec, itemDec.qty - 1).then(render); }
    return;
}
var inc = e.target.closest('[data-qty-inc]');
if (inc) {
    var itemInc = MBCart.getAll().find(function(i) { return i.lineId === inc.dataset.qtyInc; });
    if (itemInc) { MBCart.setQty(inc.dataset.qtyInc, itemInc.qty + 1).then(render); }
    return;
}
var rem = e.target.closest('[data-remove]');
if (rem) { MBCart.remove(rem.dataset.remove).then(render); return; }
```

- [ ] **Step 7: Test** — open `carrello.html`, add a product from `catalogo.html`, verify it appears. Click checkout, verify redirect to Shopify checkout URL.

- [ ] **Step 8: Commit**
  ```bash
  git add js/carrello.js
  git commit -m "feat: carrello rewritten for shopify cart + checkout redirect"
  ```

---

## Task 13: Product migration — Firestore → Shopify

**Files:** none (data migration)

- [ ] **Step 1: Export products from Firestore**
  In the gestionale, export products to JSON/CSV, or run this Node script:
  ```bash
  node -e "
  const admin = require('firebase-admin');
  const sa = require('./service-account.json');
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  admin.firestore().collection('products').get().then(snap => {
      const rows = [['Title','Body HTML','Vendor','Type','Tags','Published','Option1 Name','Option1 Value','Variant Price','Variant Inventory Qty','Image Src']];
      snap.forEach(d => {
          const p = d.data();
          const badge = p.badge ? 'catalog.badge:' + p.badge : '';
          const subcat = p.subcat ? 'catalog.subcat:' + p.subcat : '';
          rows.push([
              p.title || '',
              p.desc  || '',
              'Manbaga',
              p.cat   || '',
              ['cat:' + (p.cat||''), subcat ? 'subcat:' + p.subcat : '', badge].filter(Boolean).join(','),
              'true',
              'Title', 'Default Title',
              p.price ? String(p.price).replace(/[^0-9.,]/g,'').replace(',','.') : '0',
              p.quantity || 0,
              p.image || ''
          ]);
      });
      const csv = rows.map(r => r.map(c => '\"' + String(c).replace(/\"/g,'\"\"') + '\"').join(',')).join('\n');
      require('fs').writeFileSync('products-export.csv', csv);
      console.log('Exported', snap.size, 'products');
      process.exit(0);
  });
  " 2>&1
  ```

- [ ] **Step 2: Import to Shopify**
  Shopify Admin → Products → Import → Upload `products-export.csv` → map columns → Import.

- [ ] **Step 3: Set catalog metafields manually or via script**
  For badge and subcat metafields (exported as tags), use Shopify Admin bulk editor or a migration script calling Admin API `metafieldsSet` per product.

- [ ] **Step 4: Verify products appear in catalogo.html**
  Clear sessionStorage cache (`ShopifyAPI.clearProductsCache()` in console), reload page, verify products load with correct categories and badges.

- [ ] **Step 5: Commit** (nothing to commit — data only)

---

## Task 14: Remove Firebase from HTML files

**Files:**
- Modify: `index.html`, `catalogo.html`, `carrello.html`, `account.html`, and any other HTML file loading Firebase SDK

- [ ] **Step 1: Find all Firebase script tags**
  ```bash
  grep -rn "firebase" *.html gestionale/*.html --include="*.html"
  ```

- [ ] **Step 2: Remove Firebase SDK script tags from each HTML file**

In each file, remove lines like:
```html
<!-- REMOVE these: -->
<script src="https://www.gstatic.com/firebasejs/...firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/...firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/...firebase-firestore.js"></script>
<script src="js/firebase-init.js"></script>
<!-- or similar -->
```

- [ ] **Step 3: Verify pages load without console errors**
  Open each page, check browser console — no "firebase is not defined" errors.

- [ ] **Step 4: Remove Firebase config files**
  ```bash
  git rm firestore.rules firestore.indexes.json 2>/dev/null || true
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add -A
  git commit -m "chore: remove firebase sdk and config files"
  ```

---

## Task 15: Deploy and QA

- [ ] **Step 1: Deploy to Vercel**
  ```bash
  vercel --prod
  ```

- [ ] **Step 2: Update `js/shopify-api.js` with real domain and token**
  Replace `YOUR_STORE.myshopify.com` and `YOUR_STOREFRONT_TOKEN` with real values.

- [ ] **Step 3: Register Shopify webhook**
  Shopify Admin → Settings → Notifications → Webhooks → Add webhook:
  - Event: Order payment
  - URL: `https://YOUR_VERCEL_URL/api/webhook-order`

- [ ] **Step 4: QA checklist**
  - [ ] Register new customer → account panel appears, no Firebase errors
  - [ ] Login / logout → token stored/cleared in localStorage
  - [ ] Browse catalog → products load from Shopify
  - [ ] Filter by category, subcategory, search
  - [ ] Add to cart → badge updates, product appears in carrello
  - [ ] Wishlist toggle (logged in) → heart fills, verified in Shopify customer metafield
  - [ ] Wishlist toggle (logged out) → alert appears
  - [ ] Carrello: qty +/- works, remove works, subtotal recalculates
  - [ ] Checkout redirect → lands on Shopify hosted checkout with correct items
  - [ ] Complete test order (Shopify test mode) → webhook fires, loyalty metafield updated
  - [ ] Account page orders tab → shows Shopify orders
  - [ ] Account page wishlist tab → shows wishlisted products
  - [ ] Save profile → name/phone update + extended fields saved

- [ ] **Step 5: Final commit**
  ```bash
  git add -A
  git commit -m "feat: shopify headless integration complete"
  ```
