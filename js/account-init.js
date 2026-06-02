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

    document.addEventListener('DOMContentLoaded', function() {
        var loadEl = document.getElementById('acc-loading');
        if (loadEl) loadEl.style.display = 'none';
        var gBtn = document.getElementById('google-login-btn');
        if (gBtn) gBtn.style.display = 'none';
        var token = ShopifyAPI.getCustomerToken();
        if (token) { _loadAndRender(); } else { _showAuth(); }
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
            'query getCustomer($token: String!) { customer(customerAccessToken: $token) { id firstName lastName email phone createdAt loyaltySpent: metafield(namespace: "loyalty", key: "total_spent") { value } loyaltyOrders: metafield(namespace: "loyalty", key: "orders_placed") { value } wishlistMeta: metafield(namespace: "wishlist", key: "product_ids") { value } extendedProfile: metafield(namespace: "profile", key: "extended") { value } orders(first: 20, sortKey: PROCESSED_AT, reverse: true) { edges { node { id name processedAt totalPriceV2 { amount } fulfillmentStatus lineItems(first: 5) { edges { node { title quantity } } } } } } } }',
            { token: token }
        ).then(function(res) {
            var cust = res.data && res.data.customer;
            if (!cust) { ShopifyAPI.clearCustomerToken(); _showAuth(); return; }
            var loadEl = document.getElementById('acc-loading');
            if (loadEl) loadEl.style.display = 'none';
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
                nameEl.innerHTML = esc(parts.slice(0,-1).join(' ').toUpperCase()) + '<em>' + esc(parts[parts.length-1].toUpperCase()) + '</em>';
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
            memberEl.textContent = new Date(cust.createdAt).toLocaleDateString('it-IT', { month:'short', year:'numeric' }).toUpperCase();
        }
        var spent = parseFloat((cust.loyaltySpent && cust.loyaltySpent.value) || '0') || 0;
        _updateTierDisplay(spent);
    }

    function _updateTierDisplay(spent) {
        var tierKey = tierFromSpend(spent);
        var pct = tierKey === 'gold' ? 100
            : tierKey === 'silver' ? 50 + Math.min(((spent - TIER.silver) / (TIER.gold - TIER.silver)) * 50, 50)
            : Math.min((spent / TIER.silver) * 50, 50);
        setTimeout(function() {
            var fill = document.getElementById('tier-fill');
            if (fill) fill.style.width = pct + '%';
        }, 250);
        ['bronze','silver','gold'].forEach(function(t) {
            var el = document.getElementById('ts-' + t);
            if (el) el.classList.toggle('is-current', t === tierKey);
        });
        var info = { bronze:{abbr:'BRZ',name:'BRONZO',coinCls:'',badge:'BRZ'}, silver:{abbr:'SLV',name:'SILVER',coinCls:'silver',badge:'SLV'}, gold:{abbr:'GLD',name:'GOLD',coinCls:'gold',badge:'GLD'} }[tierKey];
        var coinEl = document.getElementById('tier-coin');
        var labelEl = document.getElementById('tier-label');
        var badgeEl = document.getElementById('tier-level-badge');
        if (coinEl)  { coinEl.textContent = info.abbr; coinEl.className = 'coin ' + info.coinCls; }
        if (labelEl) labelEl.textContent = info.name;
        if (badgeEl) badgeEl.textContent = info.badge;
        var fmt = fmtEur(spent);
        var spentValEl = document.getElementById('tier-spent-val');
        var statSpentEl = document.getElementById('stat-spent');
        if (spentValEl)  spentValEl.textContent  = fmt;
        if (statSpentEl) statSpentEl.textContent = fmt;
        var nextEl = document.getElementById('tier-next-val');
        if (nextEl) {
            nextEl.textContent = tierKey === 'gold' ? 'MAX'
                : tierKey === 'silver' ? '€' + Math.ceil(TIER.gold - spent).toLocaleString('it-IT')
                : '€' + Math.ceil(TIER.silver - spent).toLocaleString('it-IT');
        }
        var pillEl = document.getElementById('tier-pts-pill');
        if (pillEl) pillEl.textContent = '+' + Math.floor(spent) + ' PT';
        var perksBox = document.getElementById('next-perks-box');
        if (perksBox) {
            perksBox.innerHTML = tierKey === 'gold'
                ? '<div class="hd"><b>GOLD</b> — Livello massimo!</div><ul><li>Sconto <b>10%</b> su tutto</li><li>Spedizione gratis sempre</li><li>Tavolo VIP nel weekend</li></ul>'
                : tierKey === 'silver'
                ? '<div class="hd">Sblocca <b>GOLD</b> →</div><ul><li>Sconto <b>10%</b> + omaggio mensile</li><li>Spedizione gratis sempre</li><li>Tavolo VIP riservato nel weekend</li></ul>'
                : '<div class="hd">Sblocca <b>SILVER</b> →</div><ul><li>Sconto <b>5%</b> su tutto il catalogo</li><li>Spedizione gratis sopra €39</li><li>Accesso anticipato alle uscite</li></ul>';
        }
        var order = ['bronze','silver','gold'];
        var idx = order.indexOf(tierKey);
        order.forEach(function(t, i) {
            var stEl = document.getElementById('perk-state-' + t);
            if (!stEl) return;
            if (i < idx)        { stEl.textContent = 'Completato'; stEl.className = 'perk-state current'; }
            else if (i === idx) { stEl.textContent = 'Attuale';    stEl.className = 'perk-state current'; }
            else { stEl.textContent = '€' + (t === 'silver' ? TIER.silver : TIER.gold).toLocaleString('it-IT') + ' al traguardo'; stEl.className = 'perk-state locked'; }
        });
    }

    function _renderProfilo(cust) {
        var el = document.getElementById('acc-profilo');
        if (!el) return;
        var extended = {};
        try { extended = JSON.parse((cust.extendedProfile && cust.extendedProfile.value) || '{}'); } catch(e) {}
        var spent  = parseFloat((cust.loyaltySpent  && cust.loyaltySpent.value)  || '0') || 0;
        var orders = parseInt( (cust.loyaltyOrders && cust.loyaltyOrders.value) || '0') || 0;
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
        Promise.all([
            ShopifyAPI.sfApi(
                'mutation customerUpdate($token: String!, $customer: CustomerUpdateInput!) { customerUpdate(customerAccessToken: $token, customer: $customer) { customer { firstName lastName } customerUserErrors { message } } }',
                { token: token, customer: { firstName: first, lastName: last, phone: phone || undefined } }
            ),
            ShopifyAPI.apiPost('/api/profile-extended', { birthdate: bday, lang: lang, favoriteGames: games, phone: phone })
        ]).then(function() {
            if (msgEl) { msgEl.textContent = '✓ Salvato!'; msgEl.style.color = '#138a5f'; }
            if (btn)   { btn.disabled = false; btn.textContent = '💾 Salva modifiche'; }
            setTimeout(function() { if (msgEl) msgEl.textContent = ''; }, 3000);
        }).catch(function(e) {
            if (msgEl) { msgEl.textContent = 'Errore: ' + (e && e.message || ''); msgEl.style.color = '#dc2626'; }
            if (btn)   { btn.disabled = false; btn.textContent = '💾 Salva modifiche'; }
        });
    };

    function _loadWishlistCount(cust) {
        var raw = (cust.wishlistMeta && cust.wishlistMeta.value) || '[]';
        var ids; try { ids = JSON.parse(raw); } catch(e) { ids = []; }
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
                el.innerHTML = '<div class="panel-head"><span>Storico ordini</span><span class="grow"></span><span class="pill">0 ordini</span></div>'
                    + '<div class="empty"><div class="empty-illu"><span class="glyph">📦</span><span class="stamp">VUOTO!</span></div>'
                    + '<h3>Nessun ordine <em>ancora</em></h3><p>Quando farai il tuo primo ordine lo troverai qui.</p>'
                    + '<a href="catalogo.html" class="empty-cta">→ Esplora il catalogo</a></div>';
                return;
            }
            var rows = '';
            edges.forEach(function(e) {
                var o     = e.node;
                var id    = (o.name || '').replace('#', '');
                var dt    = o.processedAt ? new Date(o.processedAt).toLocaleDateString('it-IT', {day:'2-digit',month:'long',year:'numeric'}) : '—';
                var status = (o.fulfillmentStatus || 'UNFULFILLED').toLowerCase();
                var lbl   = {unfulfilled:'Ricevuto',in_progress:'In Prep.',fulfilled:'Spedito',restocked:'Reso'}[status] || status;
                var items = (o.lineItems && o.lineItems.edges) || [];
                var first = items[0] && items[0].node;
                var title = first ? esc(first.title) : '—';
                var extra = items.length > 1 ? ' <span style="color:#6b6b6b;font-size:.85em">+' + (items.length-1) + ' art.</span>' : '';
                var total = parseFloat((o.totalPriceV2 && o.totalPriceV2.amount) || 0).toFixed(2);
                rows += '<div class="order"><div class="o-cover"><span class="o-glyph">📦</span></div>'
                    + '<div class="o-info"><span class="o-id">Ordine #' + esc(id) + ' · ' + dt + '</span>'
                    + '<h4 class="o-title">' + title + extra + '</h4>'
                    + '<span class="o-meta">€' + total + ' totale</span></div>'
                    + '<span class="o-status ' + esc(status) + '">' + esc(lbl) + '</span>'
                    + '<span class="o-total">€' + total + '</span></div>';
            });
            el.innerHTML = '<div class="panel-head"><span>Storico ordini</span><span class="grow"></span><span class="pill">' + edges.length + ' ordini</span></div>'
                + '<div class="order-list">' + rows + '</div>';
        }).catch(function() { el.innerHTML = '<div class="acc-inline-empty">Errore caricamento ordini.</div>'; });
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
            var ids; try { ids = JSON.parse(raw || '[]'); } catch(e) { ids = []; }
            var wlStat = document.getElementById('stat-wishlist');
            if (wlStat) wlStat.textContent = ids.length;
            if (!ids.length) {
                el.innerHTML = '<div class="panel-head"><span>La tua wishlist</span><span class="grow"></span><span class="pill">0 articoli</span></div>'
                    + '<div class="empty"><div class="empty-illu"><span class="glyph">♡</span><span class="stamp">VUOTA!</span></div>'
                    + '<h3>Wishlist <em>vuota</em></h3><p>Salva i prodotti che ti interessano cliccando il cuore nel catalogo.</p>'
                    + '<a href="catalogo.html" class="empty-cta">→ Sfoglia il catalogo</a></div>';
                return;
            }
            var queries = ids.slice(0,50).map(function(gid,i) {
                return 'p' + i + ': product(id: "' + gid + '") { id title priceRange { minVariantPrice { amount } } images(first:1) { edges { node { url } } } variants(first:1) { edges { node { id } } } }';
            });
            return ShopifyAPI.sfApi('query { ' + queries.join(' ') + ' }').then(function(pRes) {
                var cards = '';
                ids.forEach(function(gid, i) {
                    var p = pRes.data && pRes.data['p' + i];
                    if (!p) return;
                    var img      = p.images && p.images.edges[0] && p.images.edges[0].node.url;
                    var price    = p.priceRange ? '€' + parseFloat(p.priceRange.minVariantPrice.amount).toFixed(2) : '';
                    var variantId = p.variants && p.variants.edges[0] && p.variants.edges[0].node.id;
                    _wlItems[gid] = { title: p.title, image: img, price: price, variantId: variantId };
                    var imgEl = img
                        ? '<div class="wl-img"><img src="' + esc(img) + '" alt="' + esc(p.title) + '" loading="lazy"></div>'
                        : '<div class="wl-img">' + esc((p.title||'?').charAt(0)) + '</div>';
                    cards += '<div class="wl-card">' + imgEl
                        + '<div class="wl-title">' + esc(p.title) + '</div>'
                        + '<div class="wl-price">' + esc(price) + '</div>'
                        + '<div class="wl-actions">'
                        + '<button class="wl-add" onclick="wlAddToCart(\'' + esc(gid) + '\',this)">+ CARRELLO</button>'
                        + '<button class="wl-remove" onclick="wlRemove(\'' + esc(gid) + '\',this)" title="Rimuovi">♡</button>'
                        + '</div></div>';
                });
                el.innerHTML = '<div class="panel-head"><span>La tua wishlist</span><span class="grow"></span><span class="pill red">' + ids.length + ' articoli</span></div>'
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
            'CUSTOMER_DISABLED':'Account disabilitato.',
            'INVALID_CREDENTIALS':'Email o password errata.',
            'NOT_FOUND':'Nessun account con questa email.',
            'TAKEN':'Email già registrata.',
            'PASSWORD_TOO_SHORT':'Password troppo corta.',
            'UNIDENTIFIED_CUSTOMER':'Credenziali non valide.',
            'THROTTLED':'Troppi tentativi. Riprova tra poco.'
        };
        return map[code] || 'Errore: ' + code;
    }
})();
