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

    window.showAuthTab = function(tab) {
        document.getElementById('form-login').style.display    = tab === 'login'    ? '' : 'none';
        document.getElementById('form-register').style.display = tab === 'register' ? '' : 'none';
        document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
        document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    };

    window.showAccTab = function(tab) {
        ['profilo','ordini','wishlist'].forEach(function(t) {
            document.getElementById('acc-' + t).style.display = t === tab ? '' : 'none';
            document.getElementById('atab-' + t).classList.toggle('active', t === tab);
        });
        if (tab === 'ordini')   loadOrdini();
        if (tab === 'wishlist') loadWishlist();
    };

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

    window.doGoogleLogin = function() {
        var provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(function(e) { console.error('Google login:', e); });
    };

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

    window.doLogout = function() { auth.signOut(); };

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
        lbl.textContent = user ? (user.displayName || user.email || '?').charAt(0).toUpperCase() : 'Account';
    }

    function _populateHeader(user) {
        var name = user.displayName || user.email.split('@')[0];
        document.getElementById('acc-avatar').textContent = name.charAt(0).toUpperCase();
        document.getElementById('acc-name').textContent   = name;
        document.getElementById('acc-email').textContent  = user.email;
    }

    function _ensureUserDoc(user) {
        db.collection('users').doc(user.uid).get().then(function(snap) {
            if (!snap.exists) {
                db.collection('users').doc(user.uid).set({
                    email:        user.email,
                    displayName:  user.displayName || '',
                    totalSpent:   0,
                    ordersPlaced: 0,
                    createdAt:    firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        });
    }

    function _mergeLoyalty(user) {
        try {
            var local = JSON.parse(localStorage.getItem('mb_loyalty') || '{}');
            var localSpent  = Number(local.totalSpent)   || 0;
            var localOrders = Number(local.ordersPlaced) || 0;
            if (localSpent === 0 && localOrders === 0) return;
            db.collection('users').doc(user.uid).get().then(function(snap) {
                var fsSpent  = (snap.exists && snap.data().totalSpent)   || 0;
                var fsOrders = (snap.exists && snap.data().ordersPlaced) || 0;
                var updates  = {};
                if (localSpent  > fsSpent)  updates.totalSpent   = localSpent;
                if (localOrders > fsOrders) updates.ordersPlaced = localOrders;
                if (Object.keys(updates).length) db.collection('users').doc(user.uid).update(updates);
                localStorage.removeItem('mb_loyalty');
            });
        } catch(e) {}
    }

    function renderProfilo(user) {
        var el = document.getElementById('acc-profilo');
        el.innerHTML = '<div class="acc-loading">Caricamento profilo...</div>';
        db.collection('users').doc(user.uid).get().then(function(snap) {
            var data    = snap.exists ? snap.data() : {};
            var spent   = Number(data.totalSpent)   || 0;
            var orders  = Number(data.ordersPlaced) || 0;
            var tierKey = tierFromSpend(spent);
            var tierLbl = { bronze:'BRONZO', silver:'SILVER', gold:'GOLD' }[tierKey];
            var nextMsg = tierKey === 'bronze' ? '€' + (500 - spent).toFixed(0) + ' a Silver'
                        : tierKey === 'silver' ? '€' + (1200 - spent).toFixed(0) + ' a Gold'
                        : 'Livello massimo';
            el.innerHTML =
                '<div class="tier-card">'
                + '<div class="tier-card-head"><span class="tier-badge ' + tierKey + '">' + tierLbl + '</span><span style="font-size:13px;color:rgba(245,240,232,.4)">Livello fedeltà</span></div>'
                + '<div class="tier-stats">'
                + '<div><div class="tier-stat-val">€' + spent.toFixed(2) + '</div><div class="tier-stat-lab">Totale Speso</div></div>'
                + '<div><div class="tier-stat-val">' + orders + '</div><div class="tier-stat-lab">Ordini</div></div>'
                + '<div><div class="tier-stat-val">' + nextMsg + '</div><div class="tier-stat-lab">Prossimo Livello</div></div>'
                + '</div></div>';
        }).catch(function() { el.innerHTML = '<div class="acc-empty">Errore caricamento profilo.</div>'; });
    }

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
                    var o      = doc.data();
                    var id     = doc.id.slice(-8).toUpperCase();
                    var dt     = o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'}) : '—';
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
                        + '<div class="order-body">' + items + '<div class="order-total">Totale: €' + (o.total || 0).toFixed(2) + '</div></div>'
                        + '</div>';
                });
                el.innerHTML = html;
            })
            .catch(function(err) { el.innerHTML = '<div class="acc-empty">Errore: ' + esc(err.message) + '</div>'; });
    }

    var _wishlistLoaded = false;
    var _wlItems = {};
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
                    _wlItems[doc.id] = p;
                    var imgEl = p.image
                        ? '<img class="wl-img" src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy">'
                        : '<div class="wl-img" style="display:flex;align-items:center;justify-content:center;color:rgba(245,240,232,.2);font-size:2rem">' + esc((p.title||'?').charAt(0)) + '</div>';
                    cards += '<div class="wl-card">'
                        + imgEl
                        + '<div class="wl-title">' + esc(p.title) + '</div>'
                        + '<div class="wl-price">' + esc(p.price || '') + '</div>'
                        + '<div class="wl-actions">'
                        + '<button class="wl-add" onclick="wlAddToCart(\'' + esc(doc.id) + '\',this)">+ CARRELLO</button>'
                        + '<button class="wl-remove" onclick="wlRemove(\'' + esc(doc.id) + '\',this)">♡</button>'
                        + '</div></div>';
                });
                el.innerHTML = '<div class="wishlist-grid">' + cards + '</div>';
            })
            .catch(function(err) { el.innerHTML = '<div class="acc-empty">Errore: ' + esc(err.message) + '</div>'; });
    }

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

    function _authError(code) {
        var map = {
            'auth/email-already-in-use':  'Email già registrata.',
            'auth/wrong-password':         'Password errata.',
            'auth/user-not-found':         'Nessun account con questa email.',
            'auth/invalid-email':          'Email non valida.',
            'auth/weak-password':          'Password troppo debole.',
            'auth/invalid-credential':     'Credenziali non valide.',
            'auth/popup-closed-by-user':   'Popup chiuso. Riprova.',
            'auth/network-request-failed': 'Errore di rete.'
        };
        return map[code] || 'Errore: ' + code;
    }
})();
