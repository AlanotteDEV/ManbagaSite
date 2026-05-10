# E-Commerce Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere carrello, Stripe Checkout, salvataggio ordini su Firestore e email di conferma Resend al sito MANBAGA Comics.

**Architecture:** Cart in localStorage gestito da `js/cart.js`. Due Vercel API routes gestiscono la logica server: `api/create-checkout.js` crea la sessione Stripe (verificando stock su Firestore Admin SDK), `api/webhook.js` riceve la conferma Stripe, salva l'ordine, decrementa lo stock e invia l'email Resend. Nessuna chiave segreta nel frontend.

**Tech Stack:** Stripe Node.js SDK v16, Resend SDK v3, Firebase Admin SDK v12, Vercel Serverless Functions (Node 20), vanilla JS/HTML esistente

---

## File Map

| Azione | File | Responsabilità |
|--------|------|----------------|
| Crea | `package.json` | Dipendenze Node per API routes Vercel |
| Crea | `.env.example` | Template variabili d'ambiente |
| Crea | `js/cart.js` | CRUD carrello localStorage + badge navbar |
| Crea | `api/create-checkout.js` | Crea sessione Stripe + salva pending_checkout |
| Crea | `api/webhook.js` | Webhook Stripe → Firestore + Resend |
| Crea | `carrello.html` | Pagina carrello con riepilogo e checkout |
| Crea | `checkout-success.html` | Pagina conferma post-pagamento |
| Crea | `condizioni-vendita.html` | Pagina legale obbligatoria D.Lgs. 206/2005 |
| Modifica | `js/catalogo-init.js` | Aggiungi pulsante carrello su card e modal |
| Modifica | `style.css` | Stili carrello, badge, pulsanti add-to-cart |
| Modifica | `vercel.json` | CSP aggiornata per Stripe |
| Modifica | `privacy.html` | Sezione acquisti online |
| Modifica | `index.html`, `catalogo.html`, `chi-siamo.html`, `faq.html`, `giocatori.html`, `tavoli.html`, `cronologia-tornei.html` | Icona carrello nella navbar |

---

## Task 1: Setup — package.json e variabili d'ambiente

**Files:**
- Crea: `package.json`
- Crea: `.env.example`
- Modifica: `.gitignore`

- [ ] **Step 1: Elimina il file stray con percorso nel nome**

```bash
rm "C:UsersgermiManbagaSitepackage.json"
```

- [ ] **Step 2: Crea `package.json` alla root**

```json
{
  "name": "manbaga-site",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": "20" },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "resend": "^3.0.0",
    "stripe": "^16.0.0"
  }
}
```

- [ ] **Step 3: Crea `.env.example`**

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
FIREBASE_PROJECT_ID=manbaga-...
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@manbaga-....iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SITE_ORIGIN=https://manbaga-site.vercel.app
```

- [ ] **Step 4: Verifica che `.env` sia in `.gitignore`**

Apri `.gitignore` e assicurati che contenga:
```
.env
.env.local
node_modules/
```
Se manca, aggiungilo.

- [ ] **Step 5: Installa dipendenze**

```bash
npm install
```

Output atteso: cartella `node_modules/` creata con stripe, resend, firebase-admin.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore
git commit -m "chore: aggiungi package.json con dipendenze Stripe/Resend/Firebase-Admin"
```

---

## Task 2: Aggiorna CSP in vercel.json per Stripe

**Files:**
- Modifica: `vercel.json`

- [ ] **Step 1: Apri `vercel.json` e individua il header `Content-Security-Policy`**

Il valore attuale contiene `payment=()` in `Permissions-Policy` (blocca Stripe) e mancano i domini Stripe in `script-src`, `connect-src`, `frame-src`.

- [ ] **Step 2: Sostituisci l'intero blocco `headers` con la versione aggiornata**

Trova:
```json
{ "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=(), interest-cohort=()" },
{ "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' https://www.gstatic.com https://cdn.jsdelivr.net https://*.firebasedatabase.app; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src * data: blob:; connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com https://firebaseinstallations.googleapis.com https://*.firebasedatabase.app wss://*.firebasedatabase.app https://firebasestorage.googleapis.com https://*.firebaseapp.com https://api.scryfall.com https://optcgapi.com https://api.emailjs.com https://decapi.me https://api.pokemontcg.io https://db.ygoprodeck.com; frame-src https://player.twitch.tv; frame-ancestors 'none'; base-uri 'self'; form-action 'self' mailto:" }
```

Sostituisci con:
```json
{ "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=(), interest-cohort=()" },
{ "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' https://www.gstatic.com https://cdn.jsdelivr.net https://*.firebasedatabase.app https://js.stripe.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src * data: blob:; connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com https://firebaseinstallations.googleapis.com https://*.firebasedatabase.app wss://*.firebasedatabase.app https://firebasestorage.googleapis.com https://*.firebaseapp.com https://api.scryfall.com https://optcgapi.com https://api.emailjs.com https://decapi.me https://api.pokemontcg.io https://db.ygoprodeck.com https://api.stripe.com; frame-src https://player.twitch.tv https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com mailto:" }
```

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "security: aggiorna CSP per integrare Stripe Checkout"
```

---

## Task 3: Crea js/cart.js — gestione carrello localStorage

**Files:**
- Crea: `js/cart.js`

Il modulo espone `MBCart` globale. Usa `localStorage` con chiave `mb_cart`. Ogni item: `{firestoreId, title, image, price, qty, maxQty}`. `price` è stringa es. "€15.90" — viene usata solo per display, mai inviata al server.

- [ ] **Step 1: Crea `js/cart.js`**

```javascript
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
```

- [ ] **Step 2: Verifica manuale in browser**

Apri la console del browser su qualsiasi pagina del sito che carica cart.js (lo aggiungeremo ai template nel Task 12) e digita:
```javascript
MBCart.add({firestoreId:'test',title:'Naruto Vol.1',image:'',price:'€8.00',maxQty:5});
MBCart.getAll(); // deve restituire array con 1 elemento
MBCart.count();  // deve restituire 1
MBCart.clear();
```

- [ ] **Step 3: Commit**

```bash
git add js/cart.js
git commit -m "feat: aggiungi gestione carrello localStorage (MBCart)"
```

---

## Task 4: Crea api/create-checkout.js — sessione Stripe

**Files:**
- Crea: `api/create-checkout.js`

Riceve `POST {items:[{firestoreId, qty}]}`. Verifica stock su Firestore (lato server — non ci si fida del client). Crea sessione Stripe. Salva `pending_checkouts/{sessionId}` per il webhook. Risponde con `{url}`.

- [ ] **Step 1: Crea la cartella api se non esiste**

```bash
mkdir -p api
```

- [ ] **Step 2: Crea `api/create-checkout.js`**

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore }                 = require('firebase-admin/firestore');

function getDb() {
    if (!getApps().length) {
        initializeApp({ credential: cert({
            projectId:   process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        })});
    }
    return getFirestore();
}

function parsePrice(priceStr) {
    /* "€15.90" → 1590 centesimi */
    var n = parseFloat(String(priceStr).replace(/[^0-9.,]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : Math.round(n * 100);
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0)
        return res.status(400).json({ error: 'Carrello vuoto' });

    const db = getDb();
    const lineItems = [];
    const validatedItems = [];

    for (const item of items) {
        if (!item.firestoreId || !Number.isInteger(item.qty) || item.qty < 1)
            return res.status(400).json({ error: 'Dati carrello non validi' });

        const doc = await db.collection('products').doc(item.firestoreId).get();
        if (!doc.exists)
            return res.status(400).json({ error: `Prodotto non trovato: ${item.firestoreId}` });

        const p = doc.data();
        const stock = parseInt(p.quantity) || 0;
        if (stock < item.qty)
            return res.status(409).json({ error: `Stock insufficiente per "${p.title}". Disponibili: ${stock}` });

        const unitAmount = parsePrice(p.price);
        if (unitAmount <= 0)
            return res.status(400).json({ error: `Prezzo non valido per "${p.title}"` });

        lineItems.push({
            price_data: {
                currency: 'eur',
                product_data: {
                    name:   p.title + (p.volume ? ` — ${p.volume}` : ''),
                    images: p.image ? [p.image] : [],
                },
                unit_amount: unitAmount,
            },
            quantity: item.qty,
        });
        validatedItems.push({ firestoreId: item.firestoreId, title: p.title, qty: item.qty, unitAmount });
    }

    const origin = process.env.SITE_ORIGIN || 'https://manbaga-site.vercel.app';

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items:   lineItems,
        mode:         'payment',
        customer_creation: 'always',
        locale:       'it',
        success_url:  `${origin}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:   `${origin}/carrello.html`,
    });

    /* Salva items validati per il webhook (decremento stock) */
    await db.collection('pending_checkouts').doc(session.id).set({
        items:     validatedItems,
        createdAt: new Date(),
    });

    return res.status(200).json({ url: session.url });
};
```

- [ ] **Step 3: Verifica locale con curl (richiede .env compilato e `vercel dev` attivo)**

```bash
curl -X POST http://localhost:3000/api/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"items":[{"firestoreId":"TEST_ID","qty":1}]}'
```

Output atteso (se TEST_ID non esiste): `{"error":"Prodotto non trovato: TEST_ID"}`

- [ ] **Step 4: Commit**

```bash
git add api/create-checkout.js
git commit -m "feat: aggiungi API Stripe create-checkout con verifica stock Firestore"
```

---

## Task 5: Crea api/webhook.js — webhook Stripe

**Files:**
- Crea: `api/webhook.js`

Riceve eventi Stripe. Verifica firma HMAC. Su `checkout.session.completed`: legge `pending_checkouts/{sessionId}`, salva ordine su Firestore, decrementa stock con transazione atomica, invia email Resend, elimina pending_checkout.

**IMPORTANTE:** Vercel legge il body come Buffer raw per i webhook — serve `export const config` per disabilitare il body parser.

- [ ] **Step 1: Crea `api/webhook.js`**

```javascript
const stripe    = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');

/* Disabilita body parser Vercel — Stripe ha bisogno del raw body per verificare la firma */
module.exports.config = { api: { bodyParser: false } };

function getDb() {
    if (!getApps().length) {
        initializeApp({ credential: cert({
            projectId:   process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        })});
    }
    return getFirestore();
}

async function getRawBody(req) {
    return new Promise(function (resolve, reject) {
        var chunks = [];
        req.on('data', function (c) { chunks.push(c); });
        req.on('end',  function ()  { resolve(Buffer.concat(chunks)); });
        req.on('error', reject);
    });
}

async function sendConfirmationEmail(session, items) {
    var resend  = new Resend(process.env.RESEND_API_KEY);
    var orderId = session.id.slice(-8).toUpperCase();
    var total   = (session.amount_total / 100).toFixed(2);

    var rowsHtml = items.map(function (item) {
        var unitPrice = (item.unitAmount / 100).toFixed(2);
        var lineTotal = ((item.unitAmount * item.qty) / 100).toFixed(2);
        return '<tr>'
            + '<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">' + item.title + '</td>'
            + '<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">' + item.qty + '</td>'
            + '<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">€' + unitPrice + '</td>'
            + '<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">€' + lineTotal + '</td>'
            + '</tr>';
    }).join('');

    var customerName = (session.customer_details && session.customer_details.name) || 'Cliente';
    var customerEmail = session.customer_details.email;

    await resend.emails.send({
        from:    'MANBAGA Comics <ordini@manbaga.it>',
        to:      customerEmail,
        subject: 'Ordine #' + orderId + ' confermato — MANBAGA Comics',
        html: '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px">'
            + '<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:4px;overflow:hidden">'
            + '<div style="background:#DC2626;padding:24px 32px">'
            + '<h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:2px">MANBAGA Comics</h1>'
            + '</div>'
            + '<div style="padding:32px">'
            + '<h2 style="margin-top:0;color:#0d0d0d">Ordine confermato!</h2>'
            + '<p>Ciao <strong>' + customerName + '</strong>,</p>'
            + '<p>il tuo ordine <strong>#' + orderId + '</strong> è stato ricevuto e il pagamento confermato.</p>'
            + '<table style="width:100%;border-collapse:collapse;margin:24px 0">'
            + '<thead><tr style="background:#f5f0e8">'
            + '<th style="padding:10px 12px;text-align:left;font-size:13px">Prodotto</th>'
            + '<th style="padding:10px 12px;text-align:center;font-size:13px">Qtà</th>'
            + '<th style="padding:10px 12px;text-align:right;font-size:13px">Prezzo</th>'
            + '<th style="padding:10px 12px;text-align:right;font-size:13px">Totale</th>'
            + '</tr></thead>'
            + '<tbody>' + rowsHtml + '</tbody>'
            + '<tfoot><tr>'
            + '<td colspan="3" style="padding:12px;font-weight:bold;text-align:right;font-size:15px">TOTALE</td>'
            + '<td style="padding:12px;font-weight:bold;text-align:right;font-size:15px;color:#DC2626">€' + total + '</td>'
            + '</tr></tfoot>'
            + '</table>'
            + '<p style="font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:16px;margin-bottom:0">'
            + 'Hai diritto di recedere dal contratto entro 14 giorni dalla ricezione senza penali. '
            + 'Per informazioni: <a href="https://manbaga-site.vercel.app/condizioni-vendita.html" style="color:#DC2626">condizioni di vendita</a>.<br>'
            + 'Per assistenza: <a href="mailto:manbagacomics@gmail.com" style="color:#DC2626">manbagacomics@gmail.com</a>'
            + '</p>'
            + '</div></div></body></html>',
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const rawBody = await getRawBody(req);
    const sig     = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Stripe webhook signature failed:', err.message);
        return res.status(400).json({ error: 'Firma webhook non valida' });
    }

    if (event.type !== 'checkout.session.completed') {
        return res.status(200).json({ received: true });
    }

    const session = event.data.object;
    const db      = getDb();

    /* Leggi items validati salvati al momento del checkout */
    const pendingDoc = await db.collection('pending_checkouts').doc(session.id).get();
    if (!pendingDoc.exists) {
        console.error('pending_checkout non trovato per session:', session.id);
        return res.status(200).json({ received: true });
    }
    const { items } = pendingDoc.data();

    /* Salva ordine */
    await db.collection('orders').doc(session.id).set({
        stripeSessionId: session.id,
        customerEmail:   session.customer_details.email,
        customerName:    (session.customer_details && session.customer_details.name) || '',
        items:           items,
        total:           session.amount_total / 100,
        status:          'paid',
        createdAt:       FieldValue.serverTimestamp(),
    });

    /* Decrementa stock con transazione atomica per ogni prodotto */
    const batch = db.batch();
    items.forEach(function (item) {
        var ref = db.collection('products').doc(item.firestoreId);
        batch.update(ref, { quantity: FieldValue.increment(-item.qty) });
    });
    await batch.commit();

    /* Elimina pending_checkout */
    await db.collection('pending_checkouts').doc(session.id).delete();

    /* Invia email conferma */
    try {
        await sendConfirmationEmail(session, items);
    } catch (emailErr) {
        console.error('Resend email error:', emailErr);
        /* Non bloccare la risposta — ordine è già salvato */
    }

    return res.status(200).json({ received: true });
};
```

- [ ] **Step 2: Commit**

```bash
git add api/webhook.js
git commit -m "feat: aggiungi webhook Stripe con salvataggio ordine e email Resend"
```

---

## Task 6: Stili carrello in style.css

**Files:**
- Modifica: `style.css`

Aggiungi alla fine del file tutti gli stili necessari per il carrello.

- [ ] **Step 1: Apri `style.css` e aggiungi in fondo**

```css
/* ============================================================
   CART — Badge, pulsanti, pagina carrello
   ============================================================ */

/* Badge navbar */
.cart-nav-link {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.cart-badge {
    display: none;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    background: var(--red);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    border-radius: 9px;
    line-height: 1;
    position: absolute;
    top: -8px;
    right: -10px;
    pointer-events: none;
    transition: transform .15s;
}
.cart-badge--flash { animation: badge-pop .25s ease; }
@keyframes badge-pop {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.4); }
    100% { transform: scale(1); }
}

/* Pulsante aggiungi al carrello sulla card */
.cp-card-cart-btn {
    position: absolute;
    bottom: 8px;
    right: 8px;
    width: 34px;
    height: 34px;
    background: var(--red);
    color: #fff;
    border: none;
    border-radius: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity .2s, transform .2s, background .15s;
    z-index: 2;
}
.cp-card:hover .cp-card-cart-btn,
.cp-card:focus-within .cp-card-cart-btn { opacity: 1; transform: translateY(0); }
.cp-card-cart-btn:hover { background: #b91c1c; }
.cp-card-cart-btn:disabled { background: #9ca3af; cursor: default; }

/* Pulsante nel modal */
.btn-add-to-cart {
    clip-path: none;
    border-radius: 0;
    min-width: 160px;
    background: var(--red);
    border: none;
    color: #fff;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: .05em;
    cursor: pointer;
    transition: background .15s;
}
.btn-add-to-cart:hover { background: #b91c1c; }
.btn-add-to-cart:disabled { background: #9ca3af; cursor: default; }

/* Pagina carrello */
.cart-page {
    max-width: 860px;
    margin: 80px auto 60px;
    padding: 0 20px;
}
.cart-page h1 {
    font-family: 'Bangers', sans-serif;
    font-size: 2.4rem;
    letter-spacing: .08em;
    margin-bottom: 32px;
}
.cart-empty {
    text-align: center;
    padding: 60px 20px;
    color: #6b7280;
}
.cart-empty a { color: var(--red); text-decoration: none; font-weight: 700; }

.cart-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
.cart-table th {
    text-align: left;
    padding: 10px 12px;
    background: #f5f0e8;
    font-size: 12px;
    letter-spacing: .08em;
    text-transform: uppercase;
}
.cart-table td { padding: 14px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
.cart-item-img { width: 56px; height: 72px; object-fit: cover; margin-right: 12px; }
.cart-item-name { font-weight: 700; font-size: 14px; }
.cart-item-price { color: var(--red); font-weight: 700; }

.cart-qty-ctrl {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid #d1d5db;
}
.cart-qty-ctrl button {
    width: 28px; height: 28px;
    background: none; border: none; cursor: pointer;
    font-size: 16px; font-weight: 700; line-height: 1;
    transition: background .1s;
}
.cart-qty-ctrl button:hover { background: #f3f4f6; }
.cart-qty-ctrl span { min-width: 24px; text-align: center; font-weight: 700; font-size: 14px; }

.cart-remove-btn {
    background: none; border: none; color: #9ca3af;
    cursor: pointer; font-size: 18px; padding: 4px;
    transition: color .15s;
}
.cart-remove-btn:hover { color: var(--red); }

.cart-summary {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 16px;
}
.cart-total {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--red);
}
.cart-legal {
    font-size: 13px;
    color: #6b7280;
    line-height: 1.5;
}
.cart-legal a { color: var(--red); }
.cart-legal label { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; }
.cart-legal input[type="checkbox"] { margin-top: 3px; accent-color: var(--red); flex-shrink: 0; }
.cart-checkout-btn {
    padding: 14px 32px;
    background: var(--red);
    color: #fff;
    border: none;
    font-family: 'Bangers', sans-serif;
    font-size: 1.1rem;
    letter-spacing: .08em;
    cursor: pointer;
    transition: background .15s;
    width: 100%;
    max-width: 320px;
}
.cart-checkout-btn:hover:not(:disabled) { background: #b91c1c; }
.cart-checkout-btn:disabled { background: #9ca3af; cursor: default; }
.cart-error { color: var(--red); font-size: 13px; font-weight: 700; margin-top: 8px; }

@media (max-width: 640px) {
    .cart-table thead { display: none; }
    .cart-table td { display: block; padding: 6px 0; border: none; }
    .cart-table tr { border-bottom: 1px solid #e5e7eb; padding: 12px 0; display: block; }
    .cart-item-img { width: 44px; height: 56px; }
    .cart-summary { align-items: stretch; }
    .cart-checkout-btn { max-width: 100%; }
}
```

- [ ] **Step 2: Commit**

```bash
git add style.css
git commit -m "feat: aggiungi stili carrello, badge navbar e pulsanti add-to-cart"
```

---

## Task 7: Aggiungi pulsante carrello su card e modal in catalogo-init.js

**Files:**
- Modifica: `js/catalogo-init.js`

- [ ] **Step 1: In `_cardHtml` (riga ~212), aggiungi il pulsante carrello nella card**

Trova:
```javascript
        html += '</div>'; /* close cp-card-body */
        html += '</div>'; /* close cp-card */
        return html;
```

Sostituisci con:
```javascript
        html += '</div>'; /* close cp-card-body */
        /* Pulsante carrello — nascosto su OOS e IN ARRIVO */
        if (!isOos && !isInArrivo) {
            html += '<button class="cp-card-cart-btn" data-cart-add="' + p.id + '" title="Aggiungi al carrello">'
                + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.56l1.65-7.44H6"/></svg>'
                + '</button>';
        }
        html += '</div>'; /* close cp-card */
        return html;
```

- [ ] **Step 2: In `openProductModal` (in `script.js` riga ~760), aggiungi pulsante al modal**

Trova la riga con `ritiroBtn`:
```javascript
    var ritiroBtn = (!isOos && !isInArrivo && !isPreorder)
        ? '<button class="btn" style="clip-path:none;flex:1;border-radius:0;min-width:160px;background:#15803D;border:none;color:#fff" data-action="show-ritiro" data-pid="' + _pid + '">'
```

Subito prima di quel blocco, aggiungi:
```javascript
    var addToCartBtn = (!isOos && !isInArrivo && !isPreorder)
        ? '<button class="btn-add-to-cart" data-cart-add="' + _pid + '">'
            + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.56l1.65-7.44H6"/></svg>'
            + ' Aggiungi al Carrello'
            + '</button>'
        : '';
```

Poi trova il punto dove `actionBtn` e `ritiroBtn` vengono inseriti nell'HTML del modal (cerca `actionBtn + ritiroBtn` oppure dove questi due vengono concatenati) e aggiungi `addToCartBtn`:
```javascript
    /* Sostituisci la riga che concatena actionBtn e ritiroBtn con: */
    + '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px">'
    + addToCartBtn
    + actionBtn
    + ritiroBtn
    + '</div>'
```

- [ ] **Step 3: Aggiungi event delegation per `data-cart-add` in `catalogo-init.js`**

Alla fine del blocco `document.addEventListener('click', function(e) { ... })` in `catalogo-init.js` (prima della chiusura `});`), aggiungi:

```javascript
        /* Add to cart — card e modal */
        var cartAddBtn = e.target.closest('[data-cart-add]');
        if (cartAddBtn && typeof MBCart !== 'undefined') {
            e.stopPropagation();
            var pid = cartAddBtn.dataset.cartAdd;
            var product = typeof getProducts === 'function'
                ? getProducts().find(function (p) { return String(p.id) === String(pid) || p.firestoreId === pid; })
                : null;
            if (product) {
                MBCart.add({
                    firestoreId: product.firestoreId || String(product.id),
                    title:       product.title,
                    image:       product.image || '',
                    price:       product.price || '',
                    maxQty:      parseInt(product.quantity) || 99,
                });
                cartAddBtn.textContent = '✓ Aggiunto';
                setTimeout(function () {
                    cartAddBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.56l1.65-7.44H6"/></svg>';
                }, 1200);
            }
            return;
        }
```

- [ ] **Step 4: Commit**

```bash
git add js/catalogo-init.js js/script.js
git commit -m "feat: aggiungi pulsante carrello su card prodotto e modal dettaglio"
```

---

## Task 8: Crea carrello.html — pagina carrello

**Files:**
- Crea: `carrello.html`

- [ ] **Step 1: Crea `carrello.html`**

```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Carrello — MANBAGA Comics & Games</title>
    <link rel="stylesheet" href="style.css">
    <link rel="icon" type="image/png" href="WhatsApp_Image_2026-03-10_at_11.15.27-removebg-preview.png">
    <link rel="stylesheet" href="fonts/fonts.css">
</head>
<body>

<nav id="nav">
    <div class="nav-inner">
        <a class="nav-logo" href="index.html">MANBAGA</a>
        <ul class="nav-links" id="nav-links">
            <li><a href="catalogo.html">Catalogo</a></li>
            <li><a href="tavoli.html">Tavoli</a></li>
            <li><a href="chi-siamo.html">Chi Siamo</a></li>
            <li><a href="giocatori.html">Giocatori</a></li>
            <li>
                <a href="carrello.html" class="cart-nav-link">
                    🛒 Carrello
                    <span class="cart-badge">0</span>
                </a>
            </li>
        </ul>
        <button class="nav-burger" id="nav-burger" aria-label="Apri menu">&#9776;</button>
    </div>
</nav>

<main class="cart-page">
    <h1>Il tuo Carrello</h1>
    <div id="cart-root"></div>
</main>

<script src="js/cart.js"></script>
<script>
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
                + '<p style="font-size:3rem">🛒</p>'
                + '<p>Il carrello è vuoto.</p>'
                + '<a href="catalogo.html">Torna al catalogo →</a>'
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
                + '<button data-qty-dec="' + item.firestoreId + '">−</button>'
                + '<span>' + item.qty + '</span>'
                + '<button data-qty-inc="' + item.firestoreId + '" ' + (item.qty >= item.maxQty ? 'disabled' : '') + '>+</button>'
                + '</div></td>'
                + '<td class="cart-item-price">€' + (priceNum(item.price) * item.qty).toFixed(2) + '</td>'
                + '<td><button class="cart-remove-btn" data-remove="' + item.firestoreId + '" title="Rimuovi">✕</button></td>'
                + '</tr>';
        }).join('');

        root.innerHTML = '<table class="cart-table">'
            + '<thead><tr><th>Prodotto</th><th>Prezzo</th><th>Qtà</th><th>Subtotale</th><th></th></tr></thead>'
            + '<tbody>' + rows + '</tbody>'
            + '</table>'
            + '<div class="cart-summary">'
            + '<div class="cart-total">Totale: €' + total.toFixed(2) + '</div>'
            + '<div class="cart-legal">'
            + '<label><input type="checkbox" id="accept-terms"> '
            + 'Ho letto e accetto le <a href="condizioni-vendita.html" target="_blank">condizioni di vendita</a> e la <a href="privacy.html" target="_blank">privacy policy</a>.'
            + '</label>'
            + '</div>'
            + '<div id="cart-error" class="cart-error" style="display:none"></div>'
            + '<button class="cart-checkout-btn" id="checkout-btn">Procedi al Pagamento →</button>'
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

        var btn   = document.getElementById('checkout-btn');
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
            /* Pulisci carrello prima di redirect — il webhook confermerà l'ordine */
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
        if (dec) { MBCart.setQty(dec.dataset.qtyDec, MBCart.getAll().find(function(i){return i.firestoreId===dec.dataset.qtyDec;}).qty - 1); render(); return; }

        var inc = e.target.closest('[data-qty-inc]');
        if (inc) { MBCart.setQty(inc.dataset.qtyInc, MBCart.getAll().find(function(i){return i.firestoreId===inc.dataset.qtyInc;}).qty + 1); render(); return; }

        var rem = e.target.closest('[data-remove]');
        if (rem) { MBCart.remove(rem.dataset.remove); render(); return; }
    });

    render();
})();
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add carrello.html
git commit -m "feat: aggiungi pagina carrello con riepilogo, quantità e checkout"
```

---

## Task 9: Crea checkout-success.html

**Files:**
- Crea: `checkout-success.html`

- [ ] **Step 1: Crea `checkout-success.html`**

```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ordine Confermato — MANBAGA Comics</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="fonts/fonts.css">
    <link rel="icon" type="image/png" href="WhatsApp_Image_2026-03-10_at_11.15.27-removebg-preview.png">
    <style>
        .success-wrap {
            max-width: 560px;
            margin: 100px auto 60px;
            padding: 0 24px;
            text-align: center;
        }
        .success-icon { font-size: 4rem; margin-bottom: 16px; }
        .success-wrap h1 {
            font-family: 'Bangers', sans-serif;
            font-size: 2.4rem;
            letter-spacing: .08em;
            margin-bottom: 12px;
        }
        .success-wrap p { color: #6b7280; line-height: 1.6; margin-bottom: 32px; }
        .success-wrap a.btn {
            display: inline-block;
            padding: 12px 32px;
            background: var(--red);
            color: #fff;
            text-decoration: none;
            font-family: 'Bangers', sans-serif;
            font-size: 1.1rem;
            letter-spacing: .08em;
        }
        .order-id { font-size: 13px; color: #9ca3af; margin-top: 24px; }
    </style>
</head>
<body>
<nav id="nav">
    <div class="nav-inner">
        <a class="nav-logo" href="index.html">MANBAGA</a>
    </div>
</nav>

<div class="success-wrap">
    <div class="success-icon">✅</div>
    <h1>Ordine Confermato!</h1>
    <p>Il pagamento è andato a buon fine. Riceverai una email di conferma con il riepilogo del tuo ordine a breve.<br><br>
    Grazie per aver acquistato da MANBAGA Comics!</p>
    <a href="catalogo.html" class="btn">Torna al Catalogo</a>
    <p class="order-id" id="order-id"></p>
</div>

<script>
(function () {
    var params    = new URLSearchParams(window.location.search);
    var sessionId = params.get('session_id');
    if (sessionId) {
        var shortId = sessionId.slice(-8).toUpperCase();
        document.getElementById('order-id').textContent = 'Numero ordine: #' + shortId;
    }
})();
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add checkout-success.html
git commit -m "feat: aggiungi pagina conferma ordine post-pagamento Stripe"
```

---

## Task 10: Crea condizioni-vendita.html

**Files:**
- Crea: `condizioni-vendita.html`

- [ ] **Step 1: Crea `condizioni-vendita.html`**

```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Condizioni di Vendita — MANBAGA Comics</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="fonts/fonts.css">
    <link rel="icon" type="image/png" href="WhatsApp_Image_2026-03-10_at_11.15.27-removebg-preview.png">
    <style>
        .legal-wrap { max-width: 760px; margin: 80px auto 60px; padding: 0 24px; }
        .legal-wrap h1 { font-family:'Bangers',sans-serif; font-size:2.4rem; letter-spacing:.08em; margin-bottom:8px; }
        .legal-wrap h2 { font-size:1.1rem; font-weight:700; margin:28px 0 8px; }
        .legal-wrap p, .legal-wrap li { line-height:1.7; color:#374151; font-size:15px; }
        .legal-wrap ul { padding-left:20px; }
        .legal-updated { font-size:13px; color:#9ca3af; margin-bottom:32px; }
    </style>
</head>
<body>
<nav id="nav">
    <div class="nav-inner">
        <a class="nav-logo" href="index.html">MANBAGA</a>
        <ul class="nav-links">
            <li><a href="catalogo.html">Catalogo</a></li>
            <li><a href="privacy.html">Privacy</a></li>
        </ul>
    </div>
</nav>

<div class="legal-wrap">
    <h1>Condizioni di Vendita</h1>
    <p class="legal-updated">Ultimo aggiornamento: 10 maggio 2026</p>

    <h2>1. Venditore</h2>
    <p>MANBAGA Comics, con sede a Canosa di Puglia (BT), email: manbagacomics@gmail.com.</p>

    <h2>2. Oggetto</h2>
    <p>Le presenti condizioni regolano la vendita a distanza di prodotti tramite il sito manbaga-site.vercel.app, ai sensi del D.Lgs. 206/2005 (Codice del Consumo) e del D.Lgs. 70/2003.</p>

    <h2>3. Prezzi</h2>
    <p>Tutti i prezzi indicati sono comprensivi di IVA. Le spese di spedizione, se applicabili, vengono indicate prima della conferma dell'ordine.</p>

    <h2>4. Conclusione del contratto</h2>
    <p>Il contratto si considera concluso quando il cliente riceve l'email di conferma ordine dopo il pagamento. L'accettazione dell'ordine è subordinata alla disponibilità del prodotto.</p>

    <h2>5. Pagamenti</h2>
    <p>I pagamenti online vengono processati tramite Stripe (stripe.com), piattaforma certificata PCI DSS. MANBAGA Comics non entra mai in possesso dei dati della carta di credito del cliente. Sono accettate le principali carte di credito e debito.</p>

    <h2>6. Consegna e ritiro</h2>
    <p>I prodotti acquistati online sono disponibili per il ritiro in negozio a Canosa di Puglia. Il cliente viene contattato via email quando l'ordine è pronto per il ritiro.</p>

    <h2>7. Diritto di recesso</h2>
    <p>Il cliente ha diritto di recedere dal contratto entro <strong>14 giorni</strong> dalla ricezione del prodotto, senza necessità di fornire motivazioni, ai sensi dell'art. 52 D.Lgs. 206/2005.</p>
    <p>Per esercitare il diritto di recesso, il cliente deve inviare una comunicazione esplicita a manbagacomics@gmail.com prima della scadenza del termine. Il prodotto deve essere restituito nelle stesse condizioni in cui è stato ricevuto.</p>
    <ul>
        <li>Il rimborso viene effettuato entro 14 giorni dalla ricezione della comunicazione di recesso, utilizzando lo stesso metodo di pagamento dell'acquisto.</li>
        <li>Il diritto di recesso non si applica ai prodotti personalizzati o sigillati aperti dopo la consegna (es. carte da gioco singole estratte da buste).</li>
    </ul>

    <h2>8. Garanzia legale</h2>
    <p>Tutti i prodotti sono coperti dalla garanzia legale di conformità di 24 mesi ai sensi degli artt. 128-135 D.Lgs. 206/2005.</p>

    <h2>9. Risoluzione delle controversie</h2>
    <p>Per qualsiasi controversia è competente il Tribunale di Trani. Per la risoluzione alternativa delle controversie (ODR) è disponibile la piattaforma europea: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">ec.europa.eu/consumers/odr</a>.</p>

    <h2>10. Contatti</h2>
    <p>Email: <a href="mailto:manbagacomics@gmail.com">manbagacomics@gmail.com</a></p>
</div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add condizioni-vendita.html
git commit -m "feat: aggiungi pagina condizioni di vendita (D.Lgs. 206/2005)"
```

---

## Task 11: Aggiorna privacy.html — sezione acquisti online

**Files:**
- Modifica: `privacy.html`

- [ ] **Step 1: Apri `privacy.html` e aggiungi una nuova sezione "Acquisti online"**

Trova la sezione che contiene "Richiesta Articoli" e dopo di essa aggiungi:

```html
<section>
  <h2>Acquisti online e trattamento dati ordini</h2>
  <h3>Dati raccolti</h3>
  <p>In fase di acquisto online vengono raccolti: nome, indirizzo email, dati di pagamento (gestiti esclusivamente da Stripe — MANBAGA Comics non accede mai ai dati della carta).</p>
  <h3>Finalità e base giuridica</h3>
  <p>I dati sono trattati per eseguire il contratto di vendita (art. 6.1.b GDPR) e per adempiere agli obblighi fiscali e legali (art. 6.1.c GDPR).</p>
  <h3>Conservazione</h3>
  <p>I dati degli ordini vengono conservati per 10 anni in ottemperanza agli obblighi fiscali italiani (art. 2220 c.c.).</p>
  <h3>Fornitori terzi</h3>
  <ul>
    <li><strong>Stripe</strong> (processore pagamenti, USA/EU) — DPA disponibile su stripe.com/legal/dpa</li>
    <li><strong>Resend</strong> (servizio email transazionale) — DPA disponibile su resend.com/legal/dpa</li>
  </ul>
</section>
```

- [ ] **Step 2: Commit**

```bash
git add privacy.html
git commit -m "docs: aggiungi sezione acquisti online in privacy.html"
```

---

## Task 12: Aggiungi icona carrello alla navbar di tutte le pagine

**Files:**
- Modifica: `index.html`, `catalogo.html`, `chi-siamo.html`, `faq.html`, `giocatori.html`, `tavoli.html`, `cronologia-tornei.html`

In ogni file, carica `js/cart.js` e aggiungi il link carrello con badge nella `<ul class="nav-links">`.

- [ ] **Step 1: Per ogni file HTML, aggiungi `<script src="js/cart.js"></script>` prima del tag `</body>`**

Nei file che già caricano `script.js` aggiungi cart.js prima di script.js. Esempio per `index.html`:
```html
<script src="js/cart.js"></script>
<script src="js/script.js"></script>
```

- [ ] **Step 2: In ogni `<ul class="nav-links">` aggiungi il link carrello**

```html
<li>
    <a href="carrello.html" class="cart-nav-link">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.56l1.65-7.44H6"/></svg>
        <span class="cart-badge">0</span>
    </a>
</li>
```

Files da modificare: `index.html`, `catalogo.html`, `chi-siamo.html`, `faq.html`, `giocatori.html`, `tavoli.html`, `cronologia-tornei.html`.

- [ ] **Step 3: Commit**

```bash
git add index.html catalogo.html chi-siamo.html faq.html giocatori.html tavoli.html cronologia-tornei.html
git commit -m "feat: aggiungi icona carrello con badge nella navbar di tutte le pagine"
```

---

## Task 13: Configurazione Vercel e test end-to-end

**Files:**
- Nessuna modifica al codice — solo configurazione e test

- [ ] **Step 1: Configura variabili d'ambiente su Vercel Dashboard**

Vai su vercel.com → progetto → Settings → Environment Variables e aggiungi:
- `STRIPE_SECRET_KEY` = (dalla Stripe Dashboard → API Keys)
- `STRIPE_WEBHOOK_SECRET` = (al passo 3)
- `RESEND_API_KEY` = (da resend.com → API Keys)
- `FIREBASE_PROJECT_ID` = (dal file firebase-config.js del progetto)
- `FIREBASE_CLIENT_EMAIL` = (da Firebase Console → Impostazioni progetto → Account di servizio → Genera nuova chiave privata → campo `client_email` nel JSON)
- `FIREBASE_PRIVATE_KEY` = (dal JSON generato, campo `private_key` — incolla il valore intero con `\n`)
- `SITE_ORIGIN` = `https://manbaga-site.vercel.app`

- [ ] **Step 2: Configura Resend**

1. Vai su resend.com → crea account
2. Domains → Add Domain → verifica `manbaga.it` (o usa il dominio Resend di test inizialmente)
3. API Keys → crea chiave e copia in `RESEND_API_KEY`
4. Firma il DPA (resend.com/legal/dpa) per conformità GDPR

- [ ] **Step 3: Configura webhook Stripe**

1. Deploy il codice su Vercel (`git push`)
2. Vai su dashboard.stripe.com → Webhooks → Add endpoint
3. URL: `https://manbaga-site.vercel.app/api/webhook`
4. Events: seleziona `checkout.session.completed`
5. Copia il `Signing secret` e aggiungilo come `STRIPE_WEBHOOK_SECRET` su Vercel
6. Esegui un **redeploy** su Vercel per caricare le env vars aggiornate

- [ ] **Step 4: Firma il DPA Stripe**

Vai su dashboard.stripe.com → Impostazioni → Conformità → Data Processing Agreement → firma.

- [ ] **Step 5: Test con Stripe Test Mode**

Usa `STRIPE_SECRET_KEY=sk_test_...` inizialmente.

1. Apri `catalogo.html`
2. Aggiungi un prodotto al carrello (il badge deve aggiornarsi)
3. Vai su `carrello.html` — il prodotto deve apparire
4. Modifica quantità con + e −
5. Accetta le condizioni e clicca "Procedi al Pagamento"
6. Inserisci carta di test Stripe: `4242 4242 4242 4242`, scadenza qualsiasi futura, CVC qualsiasi
7. Completa il pagamento
8. Verifica redirect a `checkout-success.html`
9. Controlla Firestore → collezione `orders` → nuovo documento
10. Controlla email ricevuta (verifica inbox del cliente test)
11. Controlla Firestore → `products/{id}` → `quantity` decrementato correttamente

- [ ] **Step 6: Switch a Stripe Live Mode**

Quando i test passano:
1. Sostituisci `STRIPE_SECRET_KEY` con `sk_live_...`
2. Ricrea il webhook su Stripe Live Mode con `whsec_live_...`
3. Aggiorna `STRIPE_WEBHOOK_SECRET` su Vercel
4. Redeploy

- [ ] **Step 7: Budget Alert Firebase (FASE 5 anticipata)**

1. Vai su console.cloud.google.com → Billing → Budgets & alerts
2. Crea budget: nome "Manbaga Firebase", importo €10/mese
3. Aggiungi alert al 50% (€5), 90% (€9), 100% (€10)
4. Email di notifica: manbagacomics@gmail.com

---

## Checklist self-review spec

- [x] Task 1: setup package.json ✓
- [x] Task 2: CSP Stripe ✓  
- [x] Task 3: cart.js con CRUD e badge ✓
- [x] Task 4: create-checkout.js con verifica stock server-side ✓
- [x] Task 5: webhook.js con firma, Firestore, Resend ✓
- [x] Task 6: stili CSS ✓
- [x] Task 7: pulsanti card e modal ✓
- [x] Task 8: carrello.html con checkbox T&C obbligatorio ✓
- [x] Task 9: checkout-success.html ✓
- [x] Task 10: condizioni-vendita.html (D.Lgs. 206/2005) ✓
- [x] Task 11: privacy.html sezione acquisti ✓
- [x] Task 12: navbar carrello tutte le pagine ✓
- [x] Task 13: deploy + test end-to-end + budget alert ✓
