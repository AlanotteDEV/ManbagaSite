(function () {
    var auth = firebase.auth();
    var db   = firebase.firestore();

    var TIER = { bronze: 0, silver: 500, gold: 1500 };

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

    /* ---- auth tab switching ---- */
    window.showAuthTab = function(tab) {
        document.getElementById('form-login').style.display    = tab === 'login'    ? '' : 'none';
        document.getElementById('form-register').style.display = tab === 'register' ? '' : 'none';
        document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
        document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    };

    /* ---- account tab switching ---- */
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

    /* ---- auth state ---- */
    auth.onAuthStateChanged(function(user) {
        document.getElementById('acc-loading').style.display = 'none';
        if (!user) {
            document.getElementById('auth-panel').style.display    = '';
            document.getElementById('account-panel').style.display = 'none';
            var lbl = document.getElementById('nav-account-label');
            if (lbl) lbl.textContent = 'Account';
            return;
        }
        document.getElementById('auth-panel').style.display    = 'none';
        document.getElementById('account-panel').style.display = '';
        _populateHeader(user);
        _ensureUserDoc(user);
        renderProfilo(user);
        _loadWishlistCount(user);
    });

    /* ---- populate header / char card ---- */
    function _populateHeader(user) {
        var name   = user.displayName || user.email.split('@')[0];
        var parts  = name.trim().split(/\s+/);

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
        if (emailEl) emailEl.textContent = user.email;

        var lbl = document.getElementById('nav-account-label');
        if (lbl) lbl.textContent = name.charAt(0).toUpperCase();

        var crumbSub = document.getElementById('crumb-sub');
        if (crumbSub) crumbSub.textContent = 'Tessera socio · ID #' + user.uid.slice(-6).toUpperCase() + ' · attiva';
    }

    /* ---- ensure/read user doc + member since ---- */
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
            var data = snap.exists ? snap.data() : {};
            var memberEl = document.getElementById('member-since');
            if (memberEl) {
                var d = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate()
                      : user.metadata && user.metadata.creationTime ? new Date(user.metadata.creationTime)
                      : new Date();
                memberEl.textContent = d.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }).toUpperCase();
            }
        });
    }

    /* ---- tier display update ---- */
    function _updateTierDisplay(spent) {
        var tierKey = tierFromSpend(spent);

        /* bar fill */
        var pct = 0;
        if (tierKey === 'bronze')      pct = Math.min((spent / TIER.silver) * 50, 50);
        else if (tierKey === 'silver') pct = 50 + Math.min(((spent - TIER.silver) / (TIER.gold - TIER.silver)) * 50, 50);
        else                           pct = 100;
        setTimeout(function() {
            var fill = document.getElementById('tier-fill');
            if (fill) fill.style.width = pct + '%';
        }, 250);

        /* tier stops */
        ['bronze','silver','gold'].forEach(function(t) {
            var el = document.getElementById('ts-' + t);
            if (el) el.classList.toggle('is-current', t === tierKey);
        });

        /* coin + label + badge */
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

        /* spent values */
        var fmt = fmtEur(spent);
        var spentValEl  = document.getElementById('tier-spent-val');
        var statSpentEl = document.getElementById('stat-spent');
        if (spentValEl)  spentValEl.textContent  = fmt;
        if (statSpentEl) statSpentEl.textContent = fmt;

        /* next level */
        var nextEl = document.getElementById('tier-next-val');
        if (nextEl) {
            if (tierKey === 'gold')        nextEl.textContent = 'MAX';
            else if (tierKey === 'silver') nextEl.textContent = '€' + Math.ceil(TIER.gold - spent).toLocaleString('it-IT');
            else                           nextEl.textContent = '€' + Math.ceil(TIER.silver - spent).toLocaleString('it-IT');
        }

        /* points pill (equal to spent rounded) */
        var pillEl = document.getElementById('tier-pts-pill');
        if (pillEl) pillEl.textContent = '+' + Math.floor(spent) + ' PT';

        /* next perks box */
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

        /* perk states */
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

    /* ---- render profile tab ---- */
    function renderProfilo(user) {
        var el = document.getElementById('acc-profilo');
        if (!el) return;
        el.innerHTML = '<div class="acc-inline-load">Caricamento...</div>';
        db.collection('users').doc(user.uid).get().then(function(snap) {
            var data   = snap.exists ? snap.data() : {};
            var spent  = Number(data.totalSpent)   || 0;
            var orders = Number(data.ordersPlaced) || 0;

            _updateTierDisplay(spent);

            var ordersEl  = document.getElementById('stat-orders');
            var ordersSub = document.getElementById('stat-orders-sub');
            if (ordersEl)  ordersEl.textContent  = orders;
            if (ordersSub) ordersSub.textContent = orders > 0
                ? orders + ' ordine' + (orders > 1 ? 'i' : '') + ' completat' + (orders > 1 ? 'i' : 'o')
                : 'Nessun ordine ancora';

            var name   = data.displayName || user.displayName || '';
            var parts  = name.trim().split(/\s+/);
            var first  = parts[0] || '';
            var last   = parts.slice(1).join(' ') || '';

            el.innerHTML =
                '<div class="panel-head"><span>Dati personali</span><span class="grow"></span><span class="pill">Modificabili</span></div>'
                + '<div class="form-grid">'
                + '<div class="field"><label>Nome</label><input type="text" id="prof-firstname" value="' + esc(first) + '"></div>'
                + '<div class="field"><label>Cognome</label><input type="text" id="prof-lastname" value="' + esc(last) + '"></div>'
                + '<div class="field"><label>Email</label><input type="email" id="prof-email" value="' + esc(user.email) + '" readonly></div>'
                + '<div class="field"><label>Telefono</label><input type="tel" id="prof-phone" value="' + esc(data.phone || '') + '" placeholder="+39 ___ ___ ____"><span class="hint">Per gli aggiornamenti sulle spedizioni</span></div>'
                + '<div class="field"><label>Data di nascita</label><input type="text" id="prof-bday" value="' + esc(data.birthdate || '') + '" placeholder="GG / MM / AAAA"><span class="hint">Riceverai un regalo per il tuo compleanno 🎁</span></div>'
                + '<div class="field"><label>Lingua preferita</label><select id="prof-lang"><option value="it">Italiano</option><option value="en">English</option><option value="ja">日本語</option></select></div>'
                + '<div class="field full"><label>Giochi preferiti</label><input type="text" id="prof-games" value="' + esc(data.favoriteGames || '') + '" placeholder="es. Catan, Wingspan, Gloomhaven..."><span class="hint">Ci aiuta a consigliarti uscite e tornei</span></div>'
                + '</div>'
                + '<div class="form-foot"><span style="font-size:12px;color:#6b6b6b">Le modifiche sono salvate solo dopo aver premuto SALVA</span><div style="display:flex;align-items:center;gap:14px"><span id="prof-msg"></span><button class="save-btn" onclick="saveProfile()">💾 Salva modifiche</button></div></div>';

            var langEl = document.getElementById('prof-lang');
            if (langEl && data.lang) langEl.value = data.lang;
        }).catch(function() { el.innerHTML = '<div class="acc-inline-empty">Errore caricamento profilo.</div>'; });
    }

    /* ---- save profile ---- */
    window.saveProfile = function() {
        var user = auth.currentUser;
        if (!user) return;
        var msgEl = document.getElementById('prof-msg');
        var btn   = document.querySelector('.save-btn');
        var first = (document.getElementById('prof-firstname').value || '').trim();
        var last  = (document.getElementById('prof-lastname').value  || '').trim();
        var displayName = [first, last].filter(Boolean).join(' ') || first;
        var phone = (document.getElementById('prof-phone').value || '').trim();
        var bday  = (document.getElementById('prof-bday').value  || '').trim();
        var lang  = document.getElementById('prof-lang').value;
        var games = (document.getElementById('prof-games').value || '').trim();

        if (btn) { btn.disabled = true; btn.textContent = '...'; }
        Promise.all([
            user.updateProfile({ displayName: displayName }),
            db.collection('users').doc(user.uid).set({ displayName: displayName, phone: phone, birthdate: bday, lang: lang, favoriteGames: games }, { merge: true })
        ]).then(function() {
            _populateHeader(user);
            if (msgEl) { msgEl.textContent = '✓ Salvato!'; msgEl.style.color = '#138a5f'; }
            if (btn)   { btn.disabled = false; btn.textContent = '💾 Salva modifiche'; }
            setTimeout(function() { if (msgEl) msgEl.textContent = ''; }, 3000);
        }).catch(function(e) {
            if (msgEl) { msgEl.textContent = 'Errore: ' + e.message; msgEl.style.color = '#dc2626'; }
            if (btn)   { btn.disabled = false; btn.textContent = '💾 Salva modifiche'; }
        });
    };

    /* ---- wishlist count for stats strip ---- */
    function _loadWishlistCount(user) {
        db.collection('users').doc(user.uid).collection('wishlist').get().then(function(snap) {
            var el = document.getElementById('stat-wishlist');
            if (el) el.textContent = snap.size;
        }).catch(function() {});
    }

    /* ---- orders tab ---- */
    var _ordiniLoaded = false;
    function loadOrdini() {
        if (_ordiniLoaded) return;
        _ordiniLoaded = true;
        var user = auth.currentUser;
        if (!user) return;
        var el = document.getElementById('acc-ordini');
        el.innerHTML = '<div class="acc-inline-load">Caricamento ordini...</div>';
        db.collection('orders')
            .where('customerEmail', '==', user.email)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get()
            .then(function(snap) {
                if (snap.empty) {
                    el.innerHTML =
                        '<div class="panel-head"><span>Storico ordini</span><span class="grow"></span><span class="pill">0 ordini</span></div>'
                        + '<div class="empty">'
                        + '<div class="empty-illu"><span class="glyph">📦</span><span class="stamp">VUOTO!</span></div>'
                        + '<h3>Nessun ordine <em>ancora</em></h3>'
                        + '<p>Quando farai il tuo primo ordine lo troverai qui, con tracking e ricevute.</p>'
                        + '<a href="catalogo.html" class="empty-cta">→ Esplora il catalogo</a>'
                        + '</div>';
                    return;
                }
                var rows = '';
                snap.forEach(function(doc) {
                    var o      = doc.data();
                    var id     = doc.id.slice(-8).toUpperCase();
                    var dt     = o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toLocaleDateString('it-IT', { day:'2-digit', month:'long', year:'numeric' }) : '—';
                    var status = o.status || 'ricevuto';
                    var lbl    = { ricevuto:'Ricevuto', 'in-preparazione':'In Prep.', spedito:'Spedito', consegnato:'Consegnato', 'pre-order':'Preordine' }[status] || status;
                    var first  = (o.items || [])[0];
                    var title  = first ? esc(first.title) : '—';
                    var extra  = (o.items || []).length > 1 ? ' <span style="color:#6b6b6b;font-size:.85em">+' + ((o.items||[]).length - 1) + ' art.</span>' : '';
                    rows += '<div class="order">'
                        + '<div class="o-cover"><span class="o-glyph">📦</span></div>'
                        + '<div class="o-info">'
                        + '<span class="o-id">Ordine #' + id + ' · ' + dt + '</span>'
                        + '<h4 class="o-title">' + title + extra + '</h4>'
                        + '<span class="o-meta">€' + (o.total || 0).toFixed(2) + ' totale</span>'
                        + '</div>'
                        + '<span class="o-status ' + esc(status) + '">' + esc(lbl) + '</span>'
                        + '<span class="o-total">€' + (o.total || 0).toFixed(2) + '</span>'
                        + '</div>';
                });
                el.innerHTML =
                    '<div class="panel-head"><span>Storico ordini</span><span class="grow"></span><span class="pill">' + snap.size + ' ordini</span></div>'
                    + '<div class="order-list">' + rows + '</div>';
            })
            .catch(function(err) { el.innerHTML = '<div class="acc-inline-empty">Errore: ' + esc(err.message) + '</div>'; });
    }

    /* ---- wishlist tab ---- */
    var _wishlistLoaded = false;
    var _wlItems = {};
    function loadWishlist() {
        if (_wishlistLoaded) return;
        _wishlistLoaded = true;
        var user = auth.currentUser;
        if (!user) return;
        var el = document.getElementById('acc-wishlist');
        el.innerHTML = '<div class="acc-inline-load">Caricamento wishlist...</div>';
        db.collection('users').doc(user.uid).collection('wishlist')
            .orderBy('addedAt', 'desc')
            .get()
            .then(function(snap) {
                var wlStat = document.getElementById('stat-wishlist');
                if (wlStat) wlStat.textContent = snap.size;

                if (snap.empty) {
                    el.innerHTML =
                        '<div class="panel-head"><span>La tua wishlist</span><span class="grow"></span><span class="pill">0 articoli</span></div>'
                        + '<div class="empty">'
                        + '<div class="empty-illu"><span class="glyph">♡</span><span class="stamp">VUOTA!</span></div>'
                        + '<h3>Wishlist <em>vuota</em></h3>'
                        + '<p>Salva i prodotti che ti interessano cliccando il cuore nel catalogo.</p>'
                        + '<a href="catalogo.html" class="empty-cta">→ Sfoglia il catalogo</a>'
                        + '</div>';
                    return;
                }
                var cards = '';
                snap.forEach(function(doc) {
                    var p = doc.data();
                    _wlItems[doc.id] = p;
                    var imgEl = p.image
                        ? '<div class="wl-img"><img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy"></div>'
                        : '<div class="wl-img">' + esc((p.title || '?').charAt(0)) + '</div>';
                    cards += '<div class="wl-card">'
                        + imgEl
                        + '<div class="wl-title">' + esc(p.title) + '</div>'
                        + '<div class="wl-price">' + esc(p.price || '') + '</div>'
                        + '<div class="wl-actions">'
                        + '<button class="wl-add" onclick="wlAddToCart(\'' + esc(doc.id) + '\',this)">+ CARRELLO</button>'
                        + '<button class="wl-remove" onclick="wlRemove(\'' + esc(doc.id) + '\',this)" title="Rimuovi">♡</button>'
                        + '</div></div>';
                });
                el.innerHTML =
                    '<div class="panel-head"><span>La tua wishlist</span><span class="grow"></span><span class="pill red">' + snap.size + ' articoli</span></div>'
                    + '<div class="wl-grid">' + cards + '</div>';
            })
            .catch(function(err) { el.innerHTML = '<div class="acc-inline-empty">Errore: ' + esc(err.message) + '</div>'; });
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
                var count = Object.keys(_wlItems).length;
                var wlStat = document.getElementById('stat-wishlist');
                if (wlStat) wlStat.textContent = count;
                var grid = document.querySelector('.wl-grid');
                if (grid && !grid.children.length) {
                    document.getElementById('acc-wishlist').innerHTML =
                        '<div class="panel-head"><span>La tua wishlist</span><span class="grow"></span><span class="pill">0 articoli</span></div>'
                        + '<div class="acc-inline-empty">Nessun prodotto salvato. <a href="catalogo.html">Sfoglia il catalogo →</a></div>';
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
