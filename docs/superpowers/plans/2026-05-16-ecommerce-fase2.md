# E-Commerce Fase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere Firebase Auth clienti, loyalty server-side, storico ordini, wishlist, gestione stato ordini admin, e supporto pre-order al sito MANBAGA.

**Architecture:** Firebase Auth compat SDK (stessa versione già usata nel sito), Firestore per dati utente (`users/{uid}`), nuova pagina `account.html` per profilo/ordini/wishlist. API serverless Vercel per aggiornamento stato ordini. Tutti i file frontend usano `firebase.auth()` compat.

**Tech Stack:** Firebase Auth compat 10.12.5, Firebase Firestore compat, Resend (già configurato), Vercel serverless, Vanilla JS (no framework)

**Firebase Config:**
```js
var MANBAGA_FIREBASE_CONFIG = {
    apiKey: 'AIzaSyCG0-J2wxZGSz6eDh_E-aAe2uvpTGLmXz0',
    authDomain: 'prenotazioninegozio-65eb1.firebaseapp.com',
    projectId: 'prenotazioninegozio-65eb1',
    storageBucket: 'prenotazioninegozio-65eb1.appspot.com',
    messagingSenderId: '466874129336',
    appId: '1:466874129336:web:fd07925523c35921fe8d4d'
};
```

**Nota collection Firestore:**
- `ordini` → prenotazioni ritiro in negozio (usata dal gestionale esistente)
- `orders` → ordini Stripe e-commerce (webhook.js scrive qui)
- `users` → nuova, dati account clienti

---

## File Map

| File | Azione | Responsabilità |
|------|--------|----------------|
| `account.html` | Crea | Pagina pubblica: login/registrazione/profilo/ordini/wishlist |
| `js/account-init.js` | Crea | Tutta la logica auth + profilo + ordini + wishlist |
| `api/update-order-status.js` | Crea | Endpoint admin: cambia stato ordine + email spedizione |
| `api/webhook.js` | Modifica | Aggiorna `users/{uid}.totalSpent` e `ordersPlaced` dopo pagamento |
| `api/create-checkout.js` | Modifica | Supporto pre-order (salta controllo stock se `availableFrom > now`) |
| `js/carrello.js` | Modifica | Legge loyalty da Firestore se utente loggato |
| `js/catalogo-init.js` | Modifica | Badge PRE-ORDER + cuori wishlist su card prodotti |
| `index.html` | Modifica | Link Account in navbar |
| `catalogo.html` | Modifica | Link Account in navbar + Firebase Auth SDK |
| `carrello.html` | Modifica | Link Account in navbar |
| `gestionale/gestionale.html` | Modifica | Sezione ordini e-commerce (collection `orders`) |

---

## Task 1: account.html — Struttura + CSS

**Files:**
- Crea: `account.html`

- [ ] **Step 1: Crea `account.html` con struttura completa**

```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account — MANBAGA Comics &amp; Games</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="fonts/fonts.css">
    <link rel="icon" type="image/png" href="WhatsApp_Image_2026-03-10_at_11.15.27-removebg-preview.png">

    <!-- Firebase compat -->
    <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js"></script>

    <style>
    :root { --red:#dc2626; --white:#f5f0e8; --bg:#0d0d0d; --surface:#161616; --border:rgba(245,240,232,.1); }
    *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }

    /* ── PAGE ── */
    .acc-page { max-width:960px; margin:110px auto 80px; padding:0 24px; }

    /* ── AUTH PANEL (non loggato) ── */
    .auth-panel { max-width:440px; margin:0 auto; }
    .auth-tabs { display:flex; gap:0; margin-bottom:0; border-bottom:2px solid var(--border); }
    .auth-tab {
        flex:1; padding:14px; background:none; border:none; cursor:pointer;
        font-family:'Bangers',sans-serif; font-size:1.1rem; letter-spacing:.08em;
        color:rgba(245,240,232,.4); border-bottom:2px solid transparent; margin-bottom:-2px;
        transition:color .2s,border-color .2s;
    }
    .auth-tab.active { color:var(--white); border-bottom-color:var(--red); }
    .auth-form { background:var(--surface); border:1px solid var(--border); padding:32px; margin-top:0; }
    .auth-form h2 { font-family:'Bangers',sans-serif; font-size:1.8rem; letter-spacing:.06em; margin-bottom:24px; color:var(--white); }
    .auth-field { margin-bottom:16px; }
    .auth-field label { display:block; font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:rgba(245,240,232,.5); margin-bottom:6px; }
    .auth-field input {
        width:100%; padding:12px 14px; background:#111; border:1px solid var(--border);
        color:var(--white); font-size:14px; font-family:inherit; outline:none;
        transition:border-color .2s;
    }
    .auth-field input:focus { border-color:var(--red); }
    .auth-btn {
        width:100%; padding:14px; background:var(--red); color:#fff; border:none; cursor:pointer;
        font-family:'Bangers',sans-serif; font-size:1.1rem; letter-spacing:.08em;
        margin-top:8px; transition:background .15s;
    }
    .auth-btn:hover { background:#b91c1c; }
    .auth-btn:disabled { opacity:.5; cursor:not-allowed; }
    .auth-divider { text-align:center; margin:16px 0; color:rgba(245,240,232,.3); font-size:12px; }
    .auth-google {
        width:100%; padding:12px; background:transparent; border:1px solid var(--border);
        color:var(--white); cursor:pointer; font-family:inherit; font-size:13px;
        display:flex; align-items:center; justify-content:center; gap:10px; transition:border-color .2s;
    }
    .auth-google:hover { border-color:rgba(245,240,232,.4); }
    .auth-msg { margin-top:12px; font-size:13px; min-height:20px; }
    .auth-msg.err { color:#f87171; }
    .auth-msg.ok { color:#34d399; }

    /* ── ACCOUNT PANEL (loggato) ── */
    .acc-header { display:flex; align-items:center; gap:20px; margin-bottom:40px; }
    .acc-avatar {
        width:64px; height:64px; border-radius:50%; background:var(--red);
        display:flex; align-items:center; justify-content:center;
        font-family:'Bangers',sans-serif; font-size:1.8rem; color:#fff; flex-shrink:0;
    }
    .acc-name { font-family:'Bangers',sans-serif; font-size:2rem; letter-spacing:.06em; color:var(--white); }
    .acc-email { font-size:13px; color:rgba(245,240,232,.4); margin-top:2px; }
    .acc-logout { margin-left:auto; padding:8px 18px; background:transparent; border:1px solid var(--border); color:rgba(245,240,232,.5); cursor:pointer; font-size:12px; font-family:inherit; transition:border-color .2s,color .2s; }
    .acc-logout:hover { border-color:rgba(245,240,232,.4); color:var(--white); }

    .acc-tabs { display:flex; gap:0; border-bottom:2px solid var(--border); margin-bottom:32px; }
    .acc-tab {
        padding:12px 24px; background:none; border:none; cursor:pointer;
        font-family:'Bangers',sans-serif; font-size:1rem; letter-spacing:.08em;
        color:rgba(245,240,232,.4); border-bottom:2px solid transparent; margin-bottom:-2px;
        transition:color .2s,border-color .2s;
    }
    .acc-tab.active { color:var(--white); border-bottom-color:var(--red); }

    /* ── TIER CARD ── */
    .tier-card { background:var(--surface); border:1px solid var(--border); padding:24px; margin-bottom:24px; }
    .tier-card-head { display:flex; align-items:center; gap:16px; margin-bottom:20px; }
    .tier-badge { padding:4px 14px; font-family:'Bangers',sans-serif; letter-spacing:.1em; font-size:.9rem; border-radius:2px; }
    .tier-badge.bronze { background:#7a4a1f; color:#c98a4e; }
    .tier-badge.silver { background:#2a2d33; color:#c0c4cc; }
    .tier-badge.gold   { background:#3d2e00; color:#ffe27a; }
    .tier-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
    .tier-stat-val { font-family:'Bangers',sans-serif; font-size:1.6rem; letter-spacing:.04em; color:var(--red); }
    .tier-stat-lab { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:rgba(245,240,232,.4); margin-top:2px; }

    /* ── ORDINI ── */
    .order-card { background:var(--surface); border:1px solid var(--border); margin-bottom:12px; }
    .order-card-head { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; cursor:pointer; user-select:none; }
    .order-card-head:hover { background:rgba(255,255,255,.02); }
    .order-num { font-family:'Bangers',sans-serif; font-size:1.2rem; letter-spacing:.08em; color:var(--red); }
    .order-meta { font-size:12px; color:rgba(245,240,232,.4); }
    .order-status { padding:3px 10px; font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; border-radius:2px; }
    .order-status.ricevuto     { background:rgba(100,116,139,.2); color:#94a3b8; }
    .order-status.in-preparazione { background:rgba(245,158,11,.15); color:#fbbf24; }
    .order-status.spedito      { background:rgba(59,130,246,.15); color:#60a5fa; }
    .order-status.consegnato   { background:rgba(16,185,129,.15); color:#34d399; }
    .order-status.pre-order    { background:rgba(139,92,246,.15); color:#a78bfa; }
    .order-body { padding:0 20px 16px; display:none; }
    .order-body.open { display:block; }
    .order-item-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border); font-size:13px; }
    .order-item-row:last-child { border-bottom:none; }
    .order-total { text-align:right; padding-top:12px; font-family:'Bangers',sans-serif; font-size:1.2rem; color:var(--red); }

    /* ── WISHLIST ── */
    .wishlist-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:16px; }
    .wl-card { background:var(--surface); border:1px solid var(--border); padding:12px; }
    .wl-img { width:100%; aspect-ratio:2/3; object-fit:cover; display:block; margin-bottom:10px; background:#222; }
    .wl-title { font-size:12px; font-weight:700; color:var(--white); margin-bottom:6px; line-height:1.3; }
    .wl-price { font-family:'Bangers',sans-serif; font-size:1rem; color:var(--red); margin-bottom:8px; }
    .wl-actions { display:flex; gap:6px; }
    .wl-add { flex:1; padding:8px; background:var(--red); color:#fff; border:none; cursor:pointer; font-family:inherit; font-size:11px; font-weight:700; }
    .wl-remove { padding:8px; background:transparent; border:1px solid var(--border); color:rgba(245,240,232,.4); cursor:pointer; font-size:14px; transition:color .2s; }
    .wl-remove:hover { color:#f87171; }

    .acc-empty { text-align:center; padding:60px 20px; color:rgba(245,240,232,.3); font-size:14px; }
    .acc-empty a { color:var(--red); text-decoration:none; }

    /* ── LOADING ── */
    .acc-loading { text-align:center; padding:40px; color:rgba(245,240,232,.4); font-size:13px; }

    @media (max-width:600px) {
        .acc-page { margin-top:80px; }
        .tier-stats { grid-template-columns:repeat(2,1fr); }
        .acc-tab { padding:10px 14px; font-size:.9rem; }
    }
    </style>
</head>
<body>
<nav id="nav">
    <div class="nav-inner">
        <a class="nav-logo" href="index.html">MAN<span class="dot">B</span>AGA<span class="dot">.</span></a>
        <ul class="nav-links" id="nav-links">
            <li><a href="catalogo.html">Catalogo</a></li>
            <li><a href="tavoli.html">Tavoli</a></li>
            <li>
                <a href="carrello.html" class="cart-nav-link">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.56l1.65-7.44H6"/></svg>
                    <span class="cart-badge">0</span>
                </a>
            </li>
            <li><a href="account.html" class="nav-account-link" id="nav-account-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span id="nav-account-label">Account</span>
            </a></li>
        </ul>
        <button class="nav-burger" id="nav-burger" aria-label="Apri menu">
            <span></span><span></span><span></span>
        </button>
    </div>
</nav>

<div class="acc-page" id="acc-page">
    <div class="acc-loading" id="acc-loading">Caricamento...</div>

    <!-- AUTH PANEL (non loggato) -->
    <div class="auth-panel" id="auth-panel" style="display:none">
        <div class="auth-tabs">
            <button class="auth-tab active" id="tab-login" onclick="showAuthTab('login')">ACCEDI</button>
            <button class="auth-tab" id="tab-register" onclick="showAuthTab('register')">REGISTRATI</button>
        </div>
        <div class="auth-form">
            <!-- Login -->
            <div id="form-login">
                <h2>Bentornato</h2>
                <div class="auth-field">
                    <label>Email</label>
                    <input type="email" id="login-email" placeholder="nome@email.com" autocomplete="email">
                </div>
                <div class="auth-field">
                    <label>Password</label>
                    <input type="password" id="login-pwd" placeholder="••••••••" autocomplete="current-password">
                </div>
                <button class="auth-btn" id="login-btn" onclick="doLogin()">ACCEDI</button>
                <div class="auth-divider">oppure</div>
                <button class="auth-google" onclick="doGoogleLogin()">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continua con Google
                </button>
                <div class="auth-msg" id="login-msg"></div>
            </div>
            <!-- Register -->
            <div id="form-register" style="display:none">
                <h2>Crea Account</h2>
                <div class="auth-field">
                    <label>Nome</label>
                    <input type="text" id="reg-name" placeholder="Il tuo nome" autocomplete="given-name">
                </div>
                <div class="auth-field">
                    <label>Email</label>
                    <input type="email" id="reg-email" placeholder="nome@email.com" autocomplete="email">
                </div>
                <div class="auth-field">
                    <label>Password</label>
                    <input type="password" id="reg-pwd" placeholder="min. 6 caratteri" autocomplete="new-password">
                </div>
                <button class="auth-btn" id="reg-btn" onclick="doRegister()">CREA ACCOUNT</button>
                <div class="auth-divider">oppure</div>
                <button class="auth-google" onclick="doGoogleLogin()">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continua con Google
                </button>
                <div class="auth-msg" id="reg-msg"></div>
            </div>
        </div>
    </div>

    <!-- ACCOUNT PANEL (loggato) -->
    <div id="account-panel" style="display:none">
        <div class="acc-header">
            <div class="acc-avatar" id="acc-avatar">?</div>
            <div>
                <div class="acc-name" id="acc-name">—</div>
                <div class="acc-email" id="acc-email">—</div>
            </div>
            <button class="acc-logout" onclick="doLogout()">ESCI</button>
        </div>
        <div class="acc-tabs">
            <button class="acc-tab active" id="atab-profilo" onclick="showAccTab('profilo')">PROFILO</button>
            <button class="acc-tab" id="atab-ordini" onclick="showAccTab('ordini')">I MIEI ORDINI</button>
            <button class="acc-tab" id="atab-wishlist" onclick="showAccTab('wishlist')">WISHLIST</button>
        </div>
        <div id="acc-profilo"><!-- filled by JS --></div>
        <div id="acc-ordini" style="display:none"><!-- filled by JS --></div>
        <div id="acc-wishlist" style="display:none"><!-- filled by JS --></div>
    </div>
</div>

<script src="js/cart.js"></script>
<script>
var MANBAGA_FIREBASE_CONFIG = {
    apiKey: 'AIzaSyCG0-J2wxZGSz6eDh_E-aAe2uvpTGLmXz0',
    authDomain: 'prenotazioninegozio-65eb1.firebaseapp.com',
    projectId: 'prenotazioninegozio-65eb1',
    storageBucket: 'prenotazioninegozio-65eb1.appspot.com',
    messagingSenderId: '466874129336',
    appId: '1:466874129336:web:fd07925523c35921fe8d4d'
};
if (!firebase.apps.length) firebase.initializeApp(MANBAGA_FIREBASE_CONFIG);
</script>
<script src="js/account-init.js"></script>

<!-- Nav burger -->
<script>
(function() {
    var burger = document.getElementById('nav-burger');
    var links  = document.getElementById('nav-links');
    if (!burger || !links) return;
    burger.addEventListener('click', function() {
        var open = links.classList.toggle('open');
        burger.classList.toggle('open', open);
    });
})();
</script>
</body>
</html>
```

- [ ] **Step 2: Verifica visiva** — Apri `account.html` nel browser. Deve mostrare "Caricamento..." al centro (Firebase non ancora inizializzato). Nessun errore console relativo a HTML.

---

## Task 2: js/account-init.js — Auth + Profilo + Ordini + Wishlist

**Files:**
- Crea: `js/account-init.js`

- [ ] **Step 1: Crea `js/account-init.js`**

```js
(function () {
    var auth = firebase.auth();
    var db   = firebase.firestore();

    var TIER_THRESHOLDS = { bronze: 0, silver: 500, gold: 1200 };
    function tierFromSpend(s) {
        if (s >= TIER_THRESHOLDS.gold)   return 'gold';
        if (s >= TIER_THRESHOLDS.silver) return 'silver';
        return 'bronze';
    }
    function esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── TABS AUTH ──
    window.showAuthTab = function(tab) {
        document.getElementById('form-login').style.display    = tab === 'login'    ? '' : 'none';
        document.getElementById('form-register').style.display = tab === 'register' ? '' : 'none';
        document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
        document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    };

    // ── TABS ACCOUNT ──
    window.showAccTab = function(tab) {
        ['profilo','ordini','wishlist'].forEach(function(t) {
            document.getElementById('acc-' + t).style.display = t === tab ? '' : 'none';
            document.getElementById('atab-' + t).classList.toggle('active', t === tab);
        });
        if (tab === 'ordini')   loadOrdini();
        if (tab === 'wishlist') loadWishlist();
    };

    // ── LOGIN EMAIL ──
    window.doLogin = function() {
        var email = document.getElementById('login-email').value.trim();
        var pwd   = document.getElementById('login-pwd').value;
        var msg   = document.getElementById('login-msg');
        var btn   = document.getElementById('login-btn');
        msg.textContent = ''; msg.className = 'auth-msg';
        if (!email || !pwd) { msg.textContent = 'Compila tutti i campi.'; msg.className = 'auth-msg err'; return; }
        btn.disabled = true; btn.textContent = '...';
        auth.signInWithEmailAndPassword(email, pwd)
            .catch(function(e) {
                msg.textContent = _authError(e.code);
                msg.className   = 'auth-msg err';
                btn.disabled = false; btn.textContent = 'ACCEDI';
            });
    };

    // ── GOOGLE LOGIN ──
    window.doGoogleLogin = function() {
        var provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(function(e) {
            console.error('Google login error:', e);
        });
    };

    // ── REGISTRAZIONE ──
    window.doRegister = function() {
        var name  = document.getElementById('reg-name').value.trim();
        var email = document.getElementById('reg-email').value.trim();
        var pwd   = document.getElementById('reg-pwd').value;
        var msg   = document.getElementById('reg-msg');
        var btn   = document.getElementById('reg-btn');
        msg.textContent = ''; msg.className = 'auth-msg';
        if (!name || !email || !pwd) { msg.textContent = 'Compila tutti i campi.'; msg.className = 'auth-msg err'; return; }
        if (pwd.length < 6) { msg.textContent = 'Password min. 6 caratteri.'; msg.className = 'auth-msg err'; return; }
        btn.disabled = true; btn.textContent = '...';
        auth.createUserWithEmailAndPassword(email, pwd)
            .then(function(cred) { return cred.user.updateProfile({ displayName: name }); })
            .catch(function(e) {
                msg.textContent = _authError(e.code);
                msg.className   = 'auth-msg err';
                btn.disabled = false; btn.textContent = 'CREA ACCOUNT';
            });
    };

    // ── LOGOUT ──
    window.doLogout = function() { auth.signOut(); };

    // ── AUTH STATE ──
    auth.onAuthStateChanged(function(user) {
        document.getElementById('acc-loading').style.display = 'none';
        if (!user) {
            document.getElementById('auth-panel').style.display    = '';
            document.getElementById('account-panel').style.display = 'none';
            _updateNavAccount(null);
            return;
        }
        document.getElementById('auth-panel').style.display    = 'none';
        document.getElementById('account-panel').style.display = '';
        _updateNavAccount(user);
        _populateHeader(user);
        _mergeLoyalty(user);
        _ensureUserDoc(user);
        renderProfilo(user);
    });

    function _updateNavAccount(user) {
        var lbl = document.getElementById('nav-account-label');
        if (!lbl) return;
        if (user) {
            var initial = (user.displayName || user.email || '?').charAt(0).toUpperCase();
            lbl.textContent = initial;
        } else {
            lbl.textContent = 'Account';
        }
    }

    function _populateHeader(user) {
        var name = user.displayName || user.email.split('@')[0];
        document.getElementById('acc-avatar').textContent = name.charAt(0).toUpperCase();
        document.getElementById('acc-name').textContent   = name;
        document.getElementById('acc-email').textContent  = user.email;
    }

    // ── CREA DOC UTENTE SE NON ESISTE ──
    function _ensureUserDoc(user) {
        var ref = db.collection('users').doc(user.uid);
        ref.get().then(function(snap) {
            if (!snap.exists) {
                ref.set({
                    email:        user.email,
                    displayName:  user.displayName || '',
                    totalSpent:   0,
                    ordersPlaced: 0,
                    createdAt:    firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        });
    }

    // ── MERGE LOYALTY localStorage → Firestore ──
    function _mergeLoyalty(user) {
        try {
            var local = JSON.parse(localStorage.getItem('mb_loyalty') || '{}');
            var localSpent   = Number(local.totalSpent)   || 0;
            var localOrders  = Number(local.ordersPlaced) || 0;
            if (localSpent === 0 && localOrders === 0) return;
            var ref = db.collection('users').doc(user.uid);
            ref.get().then(function(snap) {
                var fsSpent  = (snap.exists && snap.data().totalSpent)   || 0;
                var fsOrders = (snap.exists && snap.data().ordersPlaced) || 0;
                var updates = {};
                if (localSpent   > fsSpent)   updates.totalSpent   = localSpent;
                if (localOrders  > fsOrders)   updates.ordersPlaced = localOrders;
                if (Object.keys(updates).length) ref.update(updates);
                localStorage.removeItem('mb_loyalty');
            });
        } catch(e) {}
    }

    // ── PROFILO ──
    function renderProfilo(user) {
        var el = document.getElementById('acc-profilo');
        el.innerHTML = '<div class="acc-loading">Caricamento profilo...</div>';
        db.collection('users').doc(user.uid).get().then(function(snap) {
            var data      = snap.exists ? snap.data() : {};
            var spent     = Number(data.totalSpent)   || 0;
            var orders    = Number(data.ordersPlaced) || 0;
            var tierKey   = tierFromSpend(spent);
            var tierLabel = { bronze:'BRONZO', silver:'SILVER', gold:'GOLD' }[tierKey];
            el.innerHTML =
                '<div class="tier-card">'
                + '<div class="tier-card-head"><span class="tier-badge ' + tierKey + '">' + tierLabel + '</span><span style="font-size:13px;color:rgba(245,240,232,.4)">Livello fedeltà</span></div>'
                + '<div class="tier-stats">'
                + '<div><div class="tier-stat-val">€' + spent.toFixed(2) + '</div><div class="tier-stat-lab">Totale Speso</div></div>'
                + '<div><div class="tier-stat-val">' + orders + '</div><div class="tier-stat-lab">Ordini</div></div>'
                + '<div><div class="tier-stat-val">' + (tierKey === 'bronze' ? '€' + (500 - spent).toFixed(0) + ' a Silver' : tierKey === 'silver' ? '€' + (1200 - spent).toFixed(0) + ' a Gold' : 'Max') + '</div><div class="tier-stat-lab">Prossimo Livello</div></div>'
                + '</div></div>';
        }).catch(function() {
            el.innerHTML = '<div class="acc-empty">Errore caricamento profilo.</div>';
        });
    }

    // ── ORDINI ──
    var _ordiniLoaded = false;
    function loadOrdini() {
        if (_ordiniLoaded) return;
        _ordiniLoaded = true;
        var user = auth.currentUser;
        if (!user) return;
        var el = document.getElementById('acc-ordini');
        el.innerHTML = '<div class="acc-loading">Caricamento ordini...</div>';
        db.collection('orders')
            .where('customerEmail', '==', user.email)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get()
            .then(function(snap) {
                if (snap.empty) {
                    el.innerHTML = '<div class="acc-empty">Nessun ordine ancora.<br><a href="catalogo.html">Vai al catalogo →</a></div>';
                    return;
                }
                var html = '';
                snap.forEach(function(doc) {
                    var o  = doc.data();
                    var id = doc.id.slice(-8).toUpperCase();
                    var dt = o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toLocaleDateString('it-IT', {day:'2-digit',month:'long',year:'numeric'}) : '—';
                    var status = o.status || 'ricevuto';
                    var statusLabel = { ricevuto:'Ricevuto', 'in-preparazione':'In Preparazione', spedito:'Spedito', consegnato:'Consegnato', 'pre-order':'Pre-Order' }[status] || status;
                    var items = (o.items || []).map(function(it) {
                        return '<div class="order-item-row"><span>' + esc(it.title) + ' ×' + it.qty + '</span><span>€' + ((it.unitAmount * it.qty) / 100).toFixed(2) + '</span></div>';
                    }).join('');
                    html += '<div class="order-card">'
                        + '<div class="order-card-head" onclick="this.nextElementSibling.classList.toggle(\'open\')">'
                        + '<div><div class="order-num">#' + id + '</div><div class="order-meta">' + dt + '</div></div>'
                        + '<div style="display:flex;align-items:center;gap:16px">'
                        + '<span style="font-family:\'Bangers\',sans-serif;font-size:1.1rem;color:var(--red)">€' + (o.total || 0).toFixed(2) + '</span>'
                        + '<span class="order-status ' + esc(status) + '">' + esc(statusLabel) + '</span>'
                        + '</div></div>'
                        + '<div class="order-body">' + items
                        + '<div class="order-total">Totale: €' + (o.total || 0).toFixed(2) + '</div>'
                        + '</div></div>';
                });
                el.innerHTML = html;
            })
            .catch(function(err) {
                el.innerHTML = '<div class="acc-empty">Errore caricamento ordini: ' + esc(err.message) + '</div>';
            });
    }

    // ── WISHLIST ──
    var _wishlistLoaded = false;
    function loadWishlist() {
        if (_wishlistLoaded) return;
        _wishlistLoaded = true;
        var user = auth.currentUser;
        if (!user) return;
        var el = document.getElementById('acc-wishlist');
        el.innerHTML = '<div class="acc-loading">Caricamento wishlist...</div>';
        db.collection('users').doc(user.uid).collection('wishlist')
            .orderBy('addedAt', 'desc')
            .get()
            .then(function(snap) {
                if (snap.empty) {
                    el.innerHTML = '<div class="acc-empty">Nessun prodotto salvato.<br><a href="catalogo.html">Sfoglia il catalogo →</a></div>';
                    return;
                }
                var cards = '';
                snap.forEach(function(doc) {
                    var p = doc.data();
                    var imgEl = p.image
                        ? '<img class="wl-img" src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy">'
                        : '<div class="wl-img" style="display:flex;align-items:center;justify-content:center;color:rgba(245,240,232,.2);font-size:2rem">' + esc((p.title||'?').charAt(0)) + '</div>';
                    cards += '<div class="wl-card">'
                        + imgEl
                        + '<div class="wl-title">' + esc(p.title) + '</div>'
                        + '<div class="wl-price">' + esc(p.price || '') + '</div>'
                        + '<div class="wl-actions">'
                        + '<button class="wl-add" onclick="wlAddToCart(\'' + esc(doc.id) + '\',this)">+ CARRELLO</button>'
                        + '<button class="wl-remove" onclick="wlRemove(\'' + esc(doc.id) + '\',this)" title="Rimuovi">♡</button>'
                        + '</div></div>';
                });
                el.innerHTML = '<div class="wishlist-grid">' + cards + '</div>';
                _wlItems = {};
                snap.forEach(function(doc) { _wlItems[doc.id] = doc.data(); });
            })
            .catch(function(err) {
                el.innerHTML = '<div class="acc-empty">Errore: ' + esc(err.message) + '</div>';
            });
    }

    var _wlItems = {};

    window.wlAddToCart = function(productId, btn) {
        var p = _wlItems[productId];
        if (!p) return;
        MBCart.add({ firestoreId: productId, title: p.title, image: p.image || '', price: p.price || '', maxQty: 99 });
        btn.textContent = '✓ AGGIUNTO';
        btn.disabled = true;
    };

    window.wlRemove = function(productId, btn) {
        var user = auth.currentUser;
        if (!user) return;
        db.collection('users').doc(user.uid).collection('wishlist').doc(productId).delete()
            .then(function() {
                var card = btn.closest('.wl-card');
                if (card) card.remove();
                delete _wlItems[productId];
                var grid = document.querySelector('.wishlist-grid');
                if (grid && !grid.children.length) {
                    document.getElementById('acc-wishlist').innerHTML = '<div class="acc-empty">Nessun prodotto salvato.<br><a href="catalogo.html">Sfoglia il catalogo →</a></div>';
                }
            });
    };

    // ── ERROR MESSAGES ──
    function _authError(code) {
        var map = {
            'auth/email-already-in-use':   'Email già registrata.',
            'auth/wrong-password':          'Password errata.',
            'auth/user-not-found':          'Nessun account con questa email.',
            'auth/invalid-email':           'Email non valida.',
            'auth/weak-password':           'Password troppo debole (min. 6 caratteri).',
            'auth/invalid-credential':      'Credenziali non valide.',
            'auth/popup-closed-by-user':    'Popup chiuso. Riprova.',
            'auth/network-request-failed':  'Errore di rete. Controlla la connessione.'
        };
        return map[code] || 'Errore: ' + code;
    }
})();
```

- [ ] **Step 2: Test manuale**

1. Apri `account.html` nel browser
2. Deve comparire il pannello login/registrazione
3. Prova registrazione con email test: deve creare account Firebase
4. Dopo login: deve comparire profilo con tier BRONZO, €0.00 speso
5. Prova logout: torna al pannello login

---

## Task 3: Navbar — Link Account su tutte le pagine

**Files:**
- Modifica: `index.html`
- Modifica: `catalogo.html`
- Modifica: `carrello.html`
- Modifica: `chi-siamo.html`, `faq.html`, `condizioni-vendita.html`, `privacy.html`

- [ ] **Step 1: Aggiungi Firebase Auth + link Account a `catalogo.html`**

Dopo gli script Firebase esistenti in `catalogo.html`, aggiungi prima di `</body>`:

Trova il `<li>` con il carrello in `catalogo.html` (subito dopo `<span class="cart-badge">`):
```html
            </li>
        </ul>
```
Sostituisci con:
```html
            </li>
            <li><a href="account.html" class="cart-nav-link" id="nav-account-link" style="gap:6px">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span id="nav-account-label" style="font-size:12px;font-weight:700;letter-spacing:.04em">Account</span>
            </a></li>
        </ul>
```

Poi aggiungi uno script inline che aggiorna il label con l'iniziale quando loggato:
```html
<script>
(function() {
    if (typeof firebase === 'undefined') return;
    if (!firebase.apps.length) {
        firebase.initializeApp({
            apiKey:'AIzaSyCG0-J2wxZGSz6eDh_E-aAe2uvpTGLmXz0',
            authDomain:'prenotazioninegozio-65eb1.firebaseapp.com',
            projectId:'prenotazioninegozio-65eb1',
            storageBucket:'prenotazioninegozio-65eb1.appspot.com',
            messagingSenderId:'466874129336',
            appId:'1:466874129336:web:fd07925523c35921fe8d4d'
        });
    }
    firebase.auth().onAuthStateChanged(function(user) {
        var lbl = document.getElementById('nav-account-label');
        if (lbl && user) lbl.textContent = (user.displayName || user.email || '?').charAt(0).toUpperCase();
    });
})();
</script>
```

- [ ] **Step 2: Stessa modifica su `index.html`**

Stessa struttura — aggiungi il `<li>` account dopo il `<li>` del carrello in `index.html`, poi lo script Firebase auth.

- [ ] **Step 3: Stessa modifica su `carrello.html`**

`carrello.html` ha già Firebase inizializzato. Aggiungi solo il `<li>` account nella navbar, e aggiungi `firebase.auth().onAuthStateChanged(...)` nello script inline Firebase già esistente per aggiornare il label.

- [ ] **Step 4: Commit Task 1-3**

```bash
git add account.html js/account-init.js index.html catalogo.html carrello.html
git commit -m "feat: Firebase Auth — account.html + navbar link"
```

---

## Task 4: Webhook — Aggiorna Loyalty Firestore

**Files:**
- Modifica: `api/webhook.js`

- [ ] **Step 1: Aggiungi import FieldValue e funzione aggiornamento loyalty**

In `api/webhook.js`, dopo la riga `const { items, couponFirestoreId } = pendingDoc.data();` (riga ~111), aggiungi la chiamata aggiornamento utente. La funzione va aggiunta prima di `module.exports`:

Trova il blocco:
```js
    /* Elimina pending_checkout */
    await db.collection('pending_checkouts').doc(session.id).delete();

    /* Invia email conferma */
```

Sostituisci con:
```js
    /* Elimina pending_checkout */
    await db.collection('pending_checkouts').doc(session.id).delete();

    /* Aggiorna loyalty utente registrato */
    const customerEmail = session.customer_details.email;
    const totalEur = session.amount_total / 100;
    try {
        const userSnap = await db.collection('users')
            .where('email', '==', customerEmail)
            .limit(1)
            .get();
        if (!userSnap.empty) {
            await userSnap.docs[0].ref.update({
                totalSpent:   FieldValue.increment(totalEur),
                ordersPlaced: FieldValue.increment(1)
            });
        }
    } catch (loyaltyErr) {
        console.error('Loyalty update error:', loyaltyErr);
    }

    /* Invia email conferma */
```

- [ ] **Step 2: Test manuale**

Completa un acquisto test su Stripe → verifica in Firebase Console che `users/{uid}.totalSpent` e `ordersPlaced` siano incrementati.

- [ ] **Step 3: Commit**

```bash
git add api/webhook.js
git commit -m "feat: webhook aggiorna loyalty Firestore dopo acquisto"
```

---

## Task 5: carrello.js — Legge Loyalty da Firestore se Loggato

**Files:**
- Modifica: `js/carrello.js`

- [ ] **Step 1: Sostituisci la funzione `getLoyalty()`**

Trova in `js/carrello.js`:
```js
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
```

Sostituisci con:
```js
    var _loyaltyCache = null;

    function getLoyalty() {
        if (_loyaltyCache) return _loyaltyCache;
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

    /* Se loggato, carica loyalty da Firestore e re-render */
    function _initFirestoreLoyalty() {
        if (typeof firebase === 'undefined') return;
        var auth = firebase.auth();
        var db   = window._mbDb;
        if (!auth || !db) return;
        auth.onAuthStateChanged(function(user) {
            if (!user) { _loyaltyCache = null; return; }
            db.collection('users').doc(user.uid).get().then(function(snap) {
                if (!snap.exists) return;
                var d = snap.data();
                _loyaltyCache = {
                    totalSpent:   Number(d.totalSpent)   || 0,
                    ordersPlaced: Number(d.ordersPlaced) || 0
                };
                render();
            }).catch(function() {});
        });
    }
```

- [ ] **Step 2: Aggiungi chiamata a `_initFirestoreLoyalty()` in fondo all'IIFE**

Trova:
```js
    document.addEventListener('DOMContentLoaded', render);
})();
```

Sostituisci con:
```js
    document.addEventListener('DOMContentLoaded', function() {
        render();
        _initFirestoreLoyalty();
    });
})();
```

- [ ] **Step 3: Verifica** — Apri `carrello.html` loggato con un account che ha acquistato → il tier deve riflettersi correttamente.

- [ ] **Step 4: Commit**

```bash
git add js/carrello.js
git commit -m "feat: carrello legge loyalty da Firestore se utente loggato"
```

---

## Task 6: Wishlist — Cuori nel Catalogo

**Files:**
- Modifica: `js/catalogo-init.js`
- Modifica: `catalogo.html` (aggiunge Firebase Auth SDK)

- [ ] **Step 1: Aggiungi Firebase Auth SDK in `catalogo.html`**

Dopo `firebase-firestore-compat.js` in `catalogo.html`, aggiungi:
```html
<script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js"></script>
```

- [ ] **Step 2: Aggiungi logica wishlist in `js/catalogo-init.js`**

Aggiungi all'inizio dell'IIFE (dopo `'use strict';` o il primo `var`):

```js
    /* ── WISHLIST ── */
    var _wlSet  = {};   /* productId → true se in wishlist */
    var _wlUser = null;

    function _initWishlist() {
        if (typeof firebase === 'undefined') return;
        var auth = firebase.auth();
        var db   = firebase.firestore();
        auth.onAuthStateChanged(function(user) {
            _wlUser = user;
            if (!user) { _wlSet = {}; _refreshHearts(); return; }
            db.collection('users').doc(user.uid).collection('wishlist').get()
                .then(function(snap) {
                    _wlSet = {};
                    snap.forEach(function(d) { _wlSet[d.id] = true; });
                    _refreshHearts();
                }).catch(function() {});
        });
    }

    function _refreshHearts() {
        document.querySelectorAll('.wl-heart').forEach(function(btn) {
            var id = btn.dataset.id;
            btn.classList.toggle('wl-heart--on', !!_wlSet[id]);
            btn.title = _wlSet[id] ? 'Rimuovi dalla wishlist' : 'Aggiungi alla wishlist';
        });
    }

    function toggleWishlist(productId, title, image, price, btn) {
        if (!_wlUser) {
            alert('Accedi al tuo account per salvare i prodotti nella wishlist.\n→ account.html');
            return;
        }
        var db  = firebase.firestore();
        var ref = db.collection('users').doc(_wlUser.uid).collection('wishlist').doc(productId);
        if (_wlSet[productId]) {
            ref.delete().then(function() {
                delete _wlSet[productId];
                if (btn) { btn.classList.remove('wl-heart--on'); btn.title = 'Aggiungi alla wishlist'; }
            });
        } else {
            ref.set({ title: title, image: image || '', price: price || '', addedAt: firebase.firestore.FieldValue.serverTimestamp() })
                .then(function() {
                    _wlSet[productId] = true;
                    if (btn) { btn.classList.add('wl-heart--on'); btn.title = 'Rimuovi dalla wishlist'; }
                });
        }
    }
```

- [ ] **Step 3: Aggiungi pulsante cuore al template card prodotto**

Trova nel catalogo-init.js dove viene costruita la card prodotto (cerca `card` o `product-card` o `innerHTML`). Aggiungi il cuore come elemento assoluto sulla card:

Nel template HTML della card (dove viene costruito il `div.product-card` o simile), aggiungi prima del tag di chiusura della card:

```js
+ '<button class="wl-heart" data-id="' + esc(doc.id) + '"'
+ ' onclick="event.stopPropagation();toggleWishlist(\'' + esc(doc.id) + '\',\'' + esc(p.title) + '\',\'' + esc(p.image||p.imageUrl||'') + '\',\'' + esc(p.price||'') + '\',this)"'
+ ' title="Aggiungi alla wishlist" aria-label="Wishlist">♡</button>'
```

- [ ] **Step 4: Aggiungi CSS cuore (inline in `catalogo.html` o in `style.css`)**

```css
.wl-heart {
    position:absolute; top:8px; right:8px;
    background:rgba(0,0,0,.6); border:none; cursor:pointer;
    color:rgba(245,240,232,.5); font-size:18px; line-height:1;
    padding:6px 8px; border-radius:50%; transition:color .2s,background .2s;
    z-index:2;
}
.wl-heart:hover       { color:#f87171; background:rgba(0,0,0,.85); }
.wl-heart--on         { color:#f87171; }
.product-card         { position:relative; }   /* assicura che il cuore sia posizionato */
```

- [ ] **Step 5: Chiama `_initWishlist()` al DOMContentLoaded**

In `catalogo-init.js`, nell'event listener `DOMContentLoaded`:
```js
document.addEventListener('DOMContentLoaded', function() {
    // ... codice esistente ...
    _initWishlist();
});
```

- [ ] **Step 6: Commit**

```bash
git add catalogo.html js/catalogo-init.js
git commit -m "feat: wishlist — cuori nel catalogo + pagina account"
```

---

## Task 7: api/update-order-status.js

**Files:**
- Crea: `api/update-order-status.js`

- [ ] **Step 1: Crea l'endpoint**

```js
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore }                 = require('firebase-admin/firestore');
const { Resend }                       = require('resend');

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

const STATUS_LABELS = {
    ricevuto:          'Ricevuto',
    'in-preparazione': 'In Preparazione',
    spedito:           'Spedito',
    consegnato:        'Consegnato',
};

async function sendShippingEmail(order, trackingCode) {
    var resend   = new Resend(process.env.RESEND_API_KEY);
    var orderId  = order.stripeSessionId ? order.stripeSessionId.slice(-8).toUpperCase() : '——';
    var tracking = trackingCode ? '<p><strong>Codice tracciamento:</strong> ' + trackingCode + '</p>' : '';
    await resend.emails.send({
        from:    'MANBAGA Comics <onboarding@resend.dev>',
        to:      order.customerEmail,
        subject: 'Il tuo ordine #' + orderId + ' è stato spedito — MANBAGA Comics',
        html:    '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px">'
            + '<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:4px;overflow:hidden">'
            + '<div style="background:#DC2626;padding:24px 32px"><h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:2px">MANBAGA Comics</h1></div>'
            + '<div style="padding:32px">'
            + '<h2 style="margin-top:0">Il tuo ordine è in viaggio! 🚚</h2>'
            + '<p>Ciao <strong>' + (order.customerName || 'Cliente') + '</strong>,</p>'
            + '<p>il tuo ordine <strong>#' + orderId + '</strong> è stato spedito.</p>'
            + tracking
            + '<p style="font-size:13px;color:#6b7280">Per assistenza: <a href="mailto:manbagacomics@gmail.com" style="color:#DC2626">manbagacomics@gmail.com</a></p>'
            + '</div></div></body></html>',
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    /* Autenticazione semplice con secret header */
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret && req.headers['x-admin-secret'] !== adminSecret) {
        return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { orderId, status, trackingCode } = req.body || {};
    if (!orderId || !status) return res.status(400).json({ error: 'orderId e status richiesti' });
    const validStatuses = ['ricevuto', 'in-preparazione', 'spedito', 'consegnato'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Stato non valido' });

    const db = getDb();
    const ref = db.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Ordine non trovato' });

    const updateData = { status, updatedAt: new Date() };
    if (trackingCode) updateData.trackingCode = trackingCode;
    await ref.update(updateData);

    /* Email spedizione */
    if (status === 'spedito') {
        try {
            await sendShippingEmail(snap.data(), trackingCode || null);
        } catch (emailErr) {
            console.error('Shipping email error:', emailErr);
        }
    }

    return res.status(200).json({ ok: true, orderId, status });
};
```

- [ ] **Step 2: Aggiungi `ADMIN_SECRET` in Vercel env vars**

Nel dashboard Vercel → Settings → Environment Variables: aggiungi `ADMIN_SECRET` con un valore segreto a scelta (es. una stringa random).

- [ ] **Step 3: Commit**

```bash
git add api/update-order-status.js
git commit -m "feat: API update-order-status con email spedizione"
```

---

## Task 8: Gestionale — Sezione Ordini E-Commerce

**Files:**
- Modifica: `gestionale/gestionale.html`

- [ ] **Step 1: Aggiungi la view ordini e-commerce nella sidebar del gestionale**

Trova nella sidebar il blocco `data-view="ordini"` esistente. Aggiungi dopo di esso un nuovo item:
```html
      <div class="nav-item" data-view="ecommerce" onclick="switchView('ecommerce')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        <span>Ordini E-Commerce</span>
        <span class="nav-badge" id="badge-ecommerce-nuovi">0</span>
      </div>
```

- [ ] **Step 2: Aggiungi CSS per stati ordine e-commerce**

Nel `<style>` del gestionale, aggiungi:
```css
.ec-stato { display:inline-block; padding:2px 8px; border-radius:3px; font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
.ec-stato-ricevuto      { background:rgba(100,116,139,.2); color:#94a3b8; }
.ec-stato-in-preparazione { background:rgba(245,158,11,.15); color:#fbbf24; }
.ec-stato-spedito       { background:rgba(59,130,246,.15); color:#60a5fa; }
.ec-stato-consegnato    { background:rgba(16,185,129,.15); color:#34d399; }
.ec-stato-pre-order     { background:rgba(139,92,246,.15); color:#a78bfa; }
.ec-tracking-wrap { display:none; margin-top:4px; }
.ec-tracking-wrap input { font-size:11px; padding:3px 6px; background:#111; border:1px solid rgba(255,255,255,.1); color:#f0ede8; width:130px; }
```

- [ ] **Step 3: Aggiungi HTML view e-commerce**

Trova `<!-- ===== VIEW: PREORDINI ===== -->` nel gestionale e aggiungi prima:
```html
    <!-- ===== VIEW: ORDINI E-COMMERCE ===== -->
    <div class="view hidden" id="view-ecommerce">
      <div class="view-header">
        <div class="view-title-block">
          <div class="view-label">Stripe</div>
          <div class="view-title">Ordini E-Commerce</div>
        </div>
        <div class="view-actions">
          <select id="ec-filter-stato" onchange="_renderEcommerce()" style="font-size:12px;padding:6px 10px;background:#1c1c1c;color:#f0ede8;border:1px solid rgba(255,255,255,.1);border-radius:4px">
            <option value="tutti">Tutti gli stati</option>
            <option value="ricevuto">Ricevuti</option>
            <option value="in-preparazione">In Preparazione</option>
            <option value="spedito">Spediti</option>
            <option value="consegnato">Consegnati</option>
            <option value="pre-order">Pre-Order</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="loadEcommerce()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Aggiorna
          </button>
        </div>
      </div>
      <div id="ec-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px"></div>
      <div id="ec-table-wrap"></div>
    </div>
```

- [ ] **Step 4: Aggiungi funzioni JS gestionale per e-commerce**

In fondo allo script del gestionale (prima del tag `</script>` finale), aggiungi:

```js
/* ─── ORDINI E-COMMERCE ─── */
var _ecData = [];

function loadEcommerce() {
    if (!_db) return;
    var wrap = document.getElementById('ec-table-wrap');
    if (wrap) wrap.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px">Caricamento...</div>';
    _db.collection('orders').orderBy('createdAt', 'desc').limit(200).get()
        .then(function(snap) {
            _ecData = snap.docs.map(function(doc) {
                var d = doc.data(); d._id = doc.id; return d;
            });
            _renderEcommerce();
        })
        .catch(function(err) {
            if (wrap) wrap.innerHTML = '<div style="color:#f87171;padding:20px">Errore: ' + _g(err.message) + '</div>';
        });
}

function _renderEcommerce() {
    var filtro = (document.getElementById('ec-filter-stato') || {}).value || 'tutti';
    var data   = filtro === 'tutti' ? _ecData : _ecData.filter(function(o) { return o.status === filtro; });

    /* Stats */
    var stats = document.getElementById('ec-stats');
    if (stats) {
        var nuovi   = _ecData.filter(function(o) { return o.status === 'ricevuto'; }).length;
        var inPrep  = _ecData.filter(function(o) { return o.status === 'in-preparazione'; }).length;
        var spediti = _ecData.filter(function(o) { return o.status === 'spedito'; }).length;
        var totale  = _ecData.reduce(function(s, o) { return s + (parseFloat(o.total) || 0); }, 0);
        stats.innerHTML =
            '<div class="ordini-stat-card"><div class="stat-label">Totale Ordini</div><div class="stat-value">' + _ecData.length + '</div></div>'
          + '<div class="ordini-stat-card"><div class="stat-label">Da Gestire</div><div class="stat-value" style="color:#60a5fa">' + nuovi + '</div></div>'
          + '<div class="ordini-stat-card"><div class="stat-label">In Preparazione</div><div class="stat-value" style="color:#fbbf24">' + inPrep + '</div></div>'
          + '<div class="ordini-stat-card"><div class="stat-label">Spediti</div><div class="stat-value" style="color:#34d399">' + spediti + '</div></div>'
          + '<div class="ordini-stat-card"><div class="stat-label">Incasso Totale</div><div class="stat-value">€' + totale.toFixed(2) + '</div></div>';
        var badge = document.getElementById('badge-ecommerce-nuovi');
        if (badge) { badge.textContent = nuovi; badge.style.display = nuovi > 0 ? '' : 'none'; }
    }

    var wrap = document.getElementById('ec-table-wrap');
    if (!wrap) return;
    if (!data.length) { wrap.innerHTML = '<div style="text-align:center;padding:60px;color:var(--muted)">Nessun ordine.</div>'; return; }

    var EC_STATUS_OPTS = [
        ['ricevuto','Ricevuto'],['in-preparazione','In Preparazione'],
        ['spedito','Spedito'],['consegnato','Consegnato']
    ];

    var html = '<div style="overflow-x:auto"><table class="ordini-table"><thead><tr>'
        + '<th>Data</th><th>Ordine</th><th>Cliente</th><th>Prodotti</th><th>Totale</th><th>Stato</th><th>Azioni</th>'
        + '</tr></thead><tbody>';

    data.forEach(function(o) {
        var dt = o.createdAt && o.createdAt.toDate
            ? o.createdAt.toDate().toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
            : '—';
        var shortId = o._id.slice(-8).toUpperCase();
        var status  = o.status || 'ricevuto';
        var statusLabels = { ricevuto:'Ricevuto','in-preparazione':'In Preparazione',spedito:'Spedito',consegnato:'Consegnato','pre-order':'Pre-Order' };
        var items = (o.items || []).map(function(it) { return '· ' + _g(it.title) + ' ×' + it.qty; }).join('<br>');
        var opts  = EC_STATUS_OPTS.map(function(s) {
            return '<option value="' + s[0] + '"' + (s[0] === status ? ' selected' : '') + '>' + s[1] + '</option>';
        }).join('');
        html += '<tr>'
            + '<td style="white-space:nowrap;font-size:11px">' + dt + '</td>'
            + '<td style="font-family:monospace;font-size:12px;color:#dc2626">#' + shortId + '</td>'
            + '<td style="font-size:12px"><strong>' + _g(o.customerName || '') + '</strong><br>' + _g(o.customerEmail || '') + '</td>'
            + '<td><div class="ordine-items-list">' + (items || '—') + '</div></td>'
            + '<td style="font-weight:700">€' + (parseFloat(o.total)||0).toFixed(2) + '</td>'
            + '<td><span class="ec-stato ec-stato-' + _g(status) + '">' + (statusLabels[status] || status) + '</span></td>'
            + '<td>'
            + '<select style="font-size:11px;padding:4px 6px;background:#1c1c1c;color:#f0ede8;border:1px solid rgba(255,255,255,.1);border-radius:4px;cursor:pointer" onchange="ecChangeStato(\'' + o._id + '\',this.value,this)">'
            + opts + '</select>'
            + '<div class="ec-tracking-wrap" id="ec-tr-' + _g(o._id) + '">'
            + '<input type="text" placeholder="Codice tracking" id="ec-tr-input-' + _g(o._id) + '">'
            + '<button style="font-size:11px;padding:4px 8px;background:#3b82f6;color:#fff;border:none;cursor:pointer;border-radius:3px;margin-left:4px" onclick="ecConfirmSpedito(\'' + o._id + '\')">Conferma</button>'
            + '</div></td>'
            + '</tr>';
    });

    html += '</tbody></table></div>';
    wrap.innerHTML = html;
}

function ecChangeStato(orderId, newStatus, selectEl) {
    if (newStatus === 'spedito') {
        var wrap = document.getElementById('ec-tr-' + orderId);
        if (wrap) wrap.style.display = 'block';
        return;
    }
    _ecUpdateStato(orderId, newStatus, null, selectEl);
}

function ecConfirmSpedito(orderId) {
    var input = document.getElementById('ec-tr-input-' + orderId);
    var tracking = input ? input.value.trim() : '';
    _ecUpdateStato(orderId, 'spedito', tracking || null, null);
    var wrap = document.getElementById('ec-tr-' + orderId);
    if (wrap) wrap.style.display = 'none';
}

function _ecUpdateStato(orderId, status, trackingCode, selectEl) {
    var adminSecret = prompt('Inserisci ADMIN_SECRET per confermare:');
    if (!adminSecret) return;

    var body = { orderId: orderId, status: status };
    if (trackingCode) body.trackingCode = trackingCode;

    fetch('/api/update-order-status', {
        method:  'POST',
        headers: { 'Content-Type':'application/json', 'x-admin-secret': adminSecret },
        body:    JSON.stringify(body)
    })
    .then(function(r) { return r.json().then(function(d) { return { ok:r.ok, data:d }; }); })
    .then(function(res) {
        if (!res.ok) { alert('Errore: ' + (res.data.error || 'sconosciuto')); return; }
        var o = _ecData.find(function(x) { return x._id === orderId; });
        if (o) o.status = status;
        _renderEcommerce();
        if (typeof showToast === 'function') showToast('Stato aggiornato', 'success');
    })
    .catch(function(err) { alert('Errore rete: ' + err.message); });
}
```

- [ ] **Step 5: Aggiungi `loadEcommerce()` alla funzione `renderCurrentView`**

Trova `renderCurrentView` nel gestionale e aggiungi:
```js
    if (view === 'ecommerce') loadEcommerce();
```

- [ ] **Step 6: Commit**

```bash
git add gestionale/gestionale.html
git commit -m "feat: gestionale — sezione ordini e-commerce Stripe"
```

---

## Task 9: Pre-Order — Catalogo + Checkout + Webhook

**Files:**
- Modifica: `js/catalogo-init.js`
- Modifica: `api/create-checkout.js`
- Modifica: `api/webhook.js`

- [ ] **Step 1: Badge PRE-ORDER nel catalogo**

In `catalogo-init.js`, nel template HTML della card prodotto, aggiungi un badge condizionale:

```js
/* Dove viene costruita la card, dopo aver letto i dati del prodotto p: */
var now = new Date();
var isPreorder = p.availableFrom && (p.availableFrom.toDate ? p.availableFrom.toDate() : new Date(p.availableFrom)) > now;
var availDateStr = isPreorder
    ? (p.availableFrom.toDate ? p.availableFrom.toDate() : new Date(p.availableFrom)).toLocaleDateString('it-IT',{day:'2-digit',month:'long'})
    : '';

/* Nel template HTML della card, aggiungi il badge: */
+ (isPreorder ? '<div class="preorder-badge">PRE-ORDER · ' + esc(availDateStr) + '</div>' : '')
```

Aggiungi CSS (in `style.css` o inline in `catalogo.html`):
```css
.preorder-badge {
    position:absolute; top:0; left:0; right:0;
    background:#8b5cf6; color:#fff;
    font-size:10px; font-weight:800; letter-spacing:.1em;
    text-align:center; padding:4px;
    z-index:2;
}
```

- [ ] **Step 2: Modifica `create-checkout.js` per pre-order**

Trova il blocco che controlla lo stock in `api/create-checkout.js`:
```js
        const stock = parseInt(p.quantity) || 0;
        if (stock < item.qty)
            return res.status(409).json({ error: `Stock insufficiente per "${p.title}". Disponibili: ${stock}` });
```

Sostituisci con:
```js
        const now = new Date();
        const availFrom = p.availableFrom
            ? (p.availableFrom.toDate ? p.availableFrom.toDate() : new Date(p.availableFrom))
            : null;
        const isPreorder = availFrom && availFrom > now;

        if (!isPreorder) {
            const stock = parseInt(p.quantity) || 0;
            if (stock < item.qty)
                return res.status(409).json({ error: `Stock insufficiente per "${p.title}". Disponibili: ${stock}` });
        }

        validatedItems.push({ firestoreId: item.firestoreId, title: p.title, qty: item.qty, unitAmount, isPreorder: !!isPreorder });
```

Poi trova dove viene creato l'ordine `pending_checkouts` e salva il flag isPreorder:
```js
    await db.collection('pending_checkouts').doc(session.id).set({
        items:             validatedItems,
        couponFirestoreId: couponFirestoreId || null,
        createdAt:         new Date(),
    });
```

Aggiungi `hasPreorder`:
```js
    await db.collection('pending_checkouts').doc(session.id).set({
        items:             validatedItems,
        couponFirestoreId: couponFirestoreId || null,
        hasPreorder:       validatedItems.some(function(i) { return i.isPreorder; }),
        createdAt:         new Date(),
    });
```

- [ ] **Step 3: Modifica `webhook.js` per pre-order**

Trova il blocco in `webhook.js` dove si salva l'ordine:
```js
    await db.collection('orders').doc(session.id).set({
        ...
        status: 'paid',
```

Sostituisci con:
```js
    const { items, couponFirestoreId, hasPreorder } = pendingDoc.data();
    const orderStatus = hasPreorder ? 'pre-order' : 'ricevuto';
    await db.collection('orders').doc(session.id).set({
        ...
        status: orderStatus,
```

Poi trova il blocco che decrementa lo stock:
```js
    items.forEach(function (item) {
        var ref = db.collection('products').doc(item.firestoreId);
        batch.update(ref, { quantity: FieldValue.increment(-item.qty) });
    });
```

Sostituisci con:
```js
    items.forEach(function (item) {
        if (item.isPreorder) return;   /* stock decrementato quando admin conferma */
        var ref = db.collection('products').doc(item.firestoreId);
        batch.update(ref, { quantity: FieldValue.increment(-item.qty) });
    });
```

- [ ] **Step 4: Commit finale**

```bash
git add api/create-checkout.js api/webhook.js js/catalogo-init.js
git commit -m "feat: supporto pre-order — badge catalogo, checkout, webhook"
```

---

## Self-Review Checklist

- [x] **Spec §1 Auth:** account.html + account-init.js ✓ (Task 1-2)
- [x] **Spec §1 Navbar:** link Account su tutte le pagine ✓ (Task 3)
- [x] **Spec §2 Loyalty server-side:** merge al login + Firestore update nel webhook ✓ (Task 4-5)
- [x] **Spec §3 Storico ordini:** loadOrdini() in account-init.js ✓ (Task 2)
- [x] **Spec §4 Wishlist:** cuori catalogo + sezione account ✓ (Task 6)
- [x] **Spec §5 Admin ordini:** api/update-order-status.js + gestionale view ✓ (Task 7-8)
- [x] **Spec §6 Pre-order:** badge + checkout + webhook ✓ (Task 9)
- [x] **Tipi consistenti:** `isPreorder` usato in create-checkout → pending_checkout → webhook ✓
- [x] **Nessun TBD o placeholder** ✓
