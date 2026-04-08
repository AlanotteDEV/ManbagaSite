/* ============================================================
   giocatori.js — Logica pagina Giocatori
   Estratto dall'inline <script> di giocatori.html.
   Modifiche: event delegation al posto di onclick inline,
   nome/cognome nascosto dalla griglia pubblica (solo nickname),
   onerror gestito tramite data-attribute + handler globale.
   ============================================================ */
'use strict';

/* ── Firebase ── */
var _fbCfg = {
    apiKey:'AIzaSyCG0-J2wxZGSz6eDh_E-aAe2uvpTGLmXz0',
    authDomain:'prenotazioninegozio-65eb1.firebaseapp.com',
    projectId:'prenotazioninegozio-65eb1',
    storageBucket:'prenotazioninegozio-65eb1.appspot.com',
    messagingSenderId:'466874129336',
    appId:'1:466874129336:web:fd07925523c35921fe8d4d'
};
var _app = firebase.apps.length ? firebase.app() : firebase.initializeApp(_fbCfg);
var _db   = _app.firestore();
var _auth = _app.auth();

var IMG_BASE = 'https://optcgapi.com/media/static/Card_Images/';

/* ── State ── */
var _players     = [];
var _currentUser = null;
var _myProfile   = null;
var _deckRaw     = '';
var _deckFormato = '';
var _mazziTargetId  = null;
var _mazziIsOwner   = false;
var _editDeckId     = null;

/* ── Helpers ── */
var _COLORS = ['#DC2626','#2563EB','#16A34A','#D97706','#7C3AED','#DB2777','#0891B2','#EA580C'];
function _color(s) { var n=0; for(var i=0;i<s.length;i++) n+=s.charCodeAt(i); return _COLORS[n%_COLORS.length]; }
function _initials(s) { var p=s.trim().split(/\s+/); return p.length>=2?(p[0][0]+p[1][0]).toUpperCase():s.slice(0,2).toUpperCase(); }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function uuid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

function getPlayerMazzi(p) {
    if (p.mazzi && p.mazzi.length) return p.mazzi;
    if (p.mazzoAttuale && p.mazzoAttuale.nome) {
        return [{ id:'legacy', nome:p.mazzoAttuale.nome, formato:p.mazzoAttuale.formato||'', decklist:p.mazzoAttuale.decklist||'', isMain:true }];
    }
    return [];
}
function getMainDeck(p) {
    var mazzi = getPlayerMazzi(p);
    return mazzi.find(function(m){ return m.isMain; }) || mazzi[0] || null;
}

/* ── Toast ── */
var _tc = null;
function showToast(msg, type) {
    if (!_tc) { _tc=document.createElement('div'); _tc.style.cssText='position:fixed;bottom:80px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px'; document.body.appendChild(_tc); }
    var t=document.createElement('div');
    t.style.cssText='padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.3)';
    t.style.background=type==='success'?'#16a34a':type==='error'?'#dc2626':'#2563eb';
    t.textContent=msg; _tc.appendChild(t);
    setTimeout(function(){ t.remove(); }, 3200);
}

/* ── Auth state ── */
function onAuthStateChanged(user) {
    _currentUser = user;
    var btn   = document.getElementById('gp-auth-btn');
    var label = document.getElementById('gp-auth-label');
    if (user) {
        _myProfile = _players.find(function(p){ return p.uid===user.uid; }) || null;
        var nick = _myProfile ? _myProfile.nickname : (user.email||'').split('@')[0];
        label.textContent = nick;
        btn.classList.add('logged');
    } else {
        _myProfile = null;
        label.textContent = 'Accedi';
        btn.classList.remove('logged');
    }
    updateFab();
    filterPlayers();
}

function updateFab() {
    var fab   = document.getElementById('gp-fab');
    var label = document.getElementById('gp-fab-label');
    if (!_currentUser) {
        fab.removeAttribute('hidden');
        label.textContent = 'Accedi';
        fab.querySelector('svg').style.display = 'none';
    } else if (!_myProfile) {
        fab.removeAttribute('hidden');
        fab.querySelector('svg').style.display = '';
        label.textContent = 'Crea profilo';
    } else {
        fab.setAttribute('hidden','');
    }
}

function onFabClick() {
    if (!_currentUser) { switchAuthTab('login'); openModal('auth'); }
    else if (!_myProfile) { switchAuthTab('register'); openModal('auth'); }
}

function onAuthBtnClick() {
    if (_currentUser) {
        if (confirm('Vuoi uscire dall\'account?')) {
            _auth.signOut().then(function(){ showToast('Disconnesso','info'); });
        }
    } else {
        switchAuthTab('login');
        openModal('auth');
    }
}

/* ── Firebase subscribe ── */
function init() {
    _db.collection('giocatori').orderBy('createdAt','desc').onSnapshot(function(snap) {
        _players = snap.docs.map(function(d){ var o=d.data(); o.id=d.id; return o; });
        if (_currentUser) {
            _myProfile = _players.find(function(p){ return p.uid===_currentUser.uid; }) || null;
            var label = document.getElementById('gp-auth-label');
            if (_myProfile) label.textContent = _myProfile.nickname;
        }
        var totalDecks = _players.reduce(function(s,p){ return s+getPlayerMazzi(p).length; },0);
        document.getElementById('stat-players').textContent = _players.length;
        document.getElementById('stat-decks').textContent   = totalDecks;
        renderGrid(_players);
        updateFab();
    }, function(){ /* Firestore error */ });

    _auth.onAuthStateChanged(onAuthStateChanged);
}

/* ── Render grid ──
   GDPR minimizzazione (art. 5.1.c): la griglia pubblica mostra solo il
   nickname. Il nome e cognome reale NON è mostrato agli altri utenti.
   Solo il proprietario del profilo vede il badge "IL TUO PROFILO".
   ── */
function renderGrid(list) {
    var g = document.getElementById('gp-grid');
    if (!list || !list.length) {
        g.innerHTML='<div class="gp-empty"><span class="gp-empty-kanji">無</span><p>Nessun giocatore ancora.<br>Sii il primo a registrarti!</p></div>';
        return;
    }
    g.innerHTML = list.map(function(p) {
        var col    = _color(p.nickname||'x');
        var ini    = _initials(p.nickname||'?');
        var isMe   = _currentUser && p.uid===_currentUser.uid;
        var mazzi  = getPlayerMazzi(p);
        var main   = getMainDeck(p);
        var extra  = mazzi.length > 1 ? mazzi.length-1 : 0;

        var deckHtml;
        if (main) {
            deckHtml = '<div class="gp-main-deck">'
                +'<div class="gp-main-deck-lbl"><span>👑 Mazzo Main</span></div>'
                +'<div class="gp-main-deck-name">'+esc(main.nome)+'</div>'
                +(main.formato?'<div class="gp-main-deck-fmt">'+esc(main.formato)+'</div>':'')
                +'</div>';
        } else {
            deckHtml = '<div class="gp-main-deck"><div class="gp-deck-empty">Nessun mazzo registrato</div></div>';
        }
        if (extra>0) deckHtml += '<div class="gp-deck-count">+'+extra+' altro'+(extra>1?'i':'')+' mazz'+(extra>1?'i':'o')+'</div>';

        /* Event delegation: data-action invece di onclick inline */
        var actions = '<div class="gp-actions">';
        actions += '<button class="gp-btn" data-action="mazzi" data-pid="'+esc(p.id)+'">🃏 '+(isMe?'I tuoi mazzi':'Mazzi')+'</button>';
        if (isMe) actions += '<button class="gp-btn gp-btn--red" data-action="mazzi" data-pid="'+esc(p.id)+'">✏️ Modifica</button>';
        actions += '</div>';

        return '<div class="gp-card'+(isMe?' gp-card--mine':'')+'">'
            +'<div class="gp-card-head"><div class="gp-avatar" style="background:'+col+'">'+esc(ini)+'</div>'
            +'<div style="min-width:0"><div class="gp-nickname">'+esc(p.nickname||'')+'</div>'
            /* Mostra il badge solo al proprietario. Per gli altri: nessun dato personale aggiuntivo. */
            +(isMe?'<div class="gp-mine-badge">IL TUO PROFILO</div>':'')
            +'</div></div>'
            +deckHtml
            +actions
            +'</div>';
    }).join('');
}

function filterPlayers() {
    var q = document.getElementById('gp-search').value.trim().toLowerCase();
    var f = document.getElementById('gp-filter').value;
    var r = _players.filter(function(p) {
        var mq = !q || (p.nickname||'').toLowerCase().includes(q);
        var mf = !f  || getPlayerMazzi(p).some(function(m){ return m.formato===f; });
        return mq && mf;
    });
    renderGrid(r);
}

/* ── Modals ── */
function openModal(id) { document.getElementById('ov-'+id).classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(id) { document.getElementById('ov-'+id).classList.remove('open'); document.body.style.overflow=''; }

/* ── Auth modal ── */
function switchAuthTab(tab) {
    document.getElementById('atab-login').classList.toggle('active', tab==='login');
    document.getElementById('atab-register').classList.toggle('active', tab==='register');
    document.getElementById('auth-login').style.display    = tab==='login'?'block':'none';
    document.getElementById('auth-register').style.display = tab==='register'?'block':'none';
}

function submitLogin() {
    var email = document.getElementById('login-email').value.trim();
    var pw    = document.getElementById('login-pw').value;
    var err   = document.getElementById('login-err');
    err.style.display='none';
    if (!email||!pw) { err.textContent='Compila tutti i campi.'; err.style.display='block'; return; }
    var btn=document.getElementById('login-btn'); btn.disabled=true; btn.textContent='Accesso…';
    _auth.signInWithEmailAndPassword(email,pw)
        .then(function(){ closeModal('auth'); showToast('Bentornato! 👋','success'); })
        .catch(function(e){ err.textContent=_authError(e.code); err.style.display='block'; })
        .finally(function(){ btn.disabled=false; btn.textContent='Entra'; });
}

function submitRegister() {
    var nome  = document.getElementById('reg-nome').value.trim();
    var nick  = document.getElementById('reg-nick').value.trim();
    var email = document.getElementById('reg-email').value.trim();
    var pw    = document.getElementById('reg-pw').value;
    var nickErr    = document.getElementById('reg-nick-err');
    var err        = document.getElementById('reg-err');
    var privacyEl  = document.getElementById('reg-privacy');
    var privacyErr = document.getElementById('reg-privacy-err');
    nickErr.classList.remove('on'); err.style.display='none'; privacyErr.style.display='none';
    if (!nome||!nick||!email||!pw) { err.textContent='Compila tutti i campi obbligatori.'; err.style.display='block'; return; }
    if (nome.length > 80) { err.textContent='Nome troppo lungo (max 80 caratteri).'; err.style.display='block'; return; }
    if (nick.length > 30) { err.textContent='Nickname troppo lungo (max 30 caratteri).'; err.style.display='block'; return; }
    if (!privacyEl.checked) { privacyErr.style.display='block'; return; }
    var nl = nick.toLowerCase();
    if (_players.some(function(p){ return (p.nicknameLower||(p.nickname||'').toLowerCase())===nl; })) { nickErr.classList.add('on'); return; }
    var btn=document.getElementById('reg-btn'); btn.disabled=true; btn.textContent='Creazione…';
    _auth.createUserWithEmailAndPassword(email,pw)
        .then(function(cred){
            return _db.collection('giocatori').add({
                uid:cred.user.uid, nome:nome, nickname:nick, nicknameLower:nl,
                mazzi:[], mazzoAttuale:null,
                createdAt:firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(function(){ closeModal('auth'); showToast('Benvenuto '+nick+' 🎮','success'); })
        .catch(function(e){ err.textContent=_authError(e.code)||(e.message||e); err.style.display='block'; })
        .finally(function(){ btn.disabled=false; btn.textContent='Crea Profilo'; });
}

function _authError(code) {
    var map = {
        'auth/user-not-found':'Utente non trovato.',
        'auth/wrong-password':'Password errata.',
        'auth/invalid-credential':'Email o password errati.',
        'auth/email-already-in-use':'Email già registrata. Prova ad accedere.',
        'auth/weak-password':'Password troppo corta (min. 6 caratteri).',
        'auth/invalid-email':'Email non valida.'
    };
    return map[code]||null;
}

/* ── Deck manager modal ── */
function openMazziModal(playerId) {
    var p = _players.find(function(x){ return x.id===playerId; });
    if (!p) return;
    _mazziTargetId = playerId;
    _mazziIsOwner  = !!((_currentUser && p.uid===_currentUser.uid));

    document.getElementById('mazzi-modal-title').innerHTML = _mazziIsOwner
        ? 'I TUOI <span>MAZZI</span>'
        : 'MAZZI DI <span>'+esc(p.nickname||'')+'</span>';
    document.getElementById('mazzi-modal-sub').textContent = _mazziIsOwner
        ? 'Gestisci la tua collezione. Il mazzo 👑 Main verrà usato ai tornei.'
        : 'Collezione mazzi di '+(p.nickname||'')+'. Solo il proprietario può modificarli.';
    document.getElementById('mazzi-add-btn').style.display = _mazziIsOwner?'block':'none';

    renderMazziList(p);
    openModal('mazzi');
}

function renderMazziList(p) {
    var mazzi = getPlayerMazzi(p);
    var el    = document.getElementById('mazzi-list');
    if (!mazzi.length) {
        el.innerHTML = '<div class="gp-deck-empty-list">'
            +(_mazziIsOwner?'Nessun mazzo. Aggiungine uno con il pulsante qui sotto.':'Nessun mazzo registrato.')
            +'</div>';
        return;
    }
    /* Event delegation: data-action + data-mid invece di onclick inline */
    el.innerHTML = mazzi.map(function(m){
        var isMain = !!m.isMain;
        var hasList = m.decklist && m.decklist.trim();
        var html = '<div class="gp-deck-item'+(isMain?' is-main':'')+'" id="deck-item-'+m.id+'">'
            +'<div class="gp-deck-item-info">'
            +'<div class="gp-deck-item-name">'
            +(isMain?'<span class="gp-crown">👑</span>':'')
            +esc(m.nome)
            +(isMain?'<span class="gp-main-tag">MAIN</span>':'')
            +'</div>'
            +(m.formato?'<div class="gp-deck-item-fmt">'+esc(m.formato)+'</div>':'')
            +'</div>'
            +'<div class="gp-deck-item-btns">';
        if (hasList) html += '<button class="gp-icon-btn" data-action="view-deck" data-mid="'+esc(m.id)+'" title="Vedi carte">🃏</button>';
        if (_mazziIsOwner) {
            html += '<button class="gp-icon-btn'+(isMain?' active':'')+'" data-action="set-main" data-mid="'+esc(m.id)+'" title="Imposta come Main">👑</button>';
            html += '<button class="gp-icon-btn" data-action="edit-deck" data-mid="'+esc(m.id)+'" title="Modifica">✏️</button>';
            html += '<button class="gp-icon-btn gp-icon-btn--del" data-action="del-deck" data-mid="'+esc(m.id)+'" title="Elimina">🗑️</button>';
        }
        html += '</div></div>';
        return html;
    }).join('');
}

function openAddDeck() {
    _editDeckId = null;
    document.getElementById('deck-edit-title').innerHTML = 'NUOVO <span>MAZZO</span>';
    document.getElementById('de-nome').value='';
    document.getElementById('de-fmt').value='';
    document.getElementById('de-list').value='';
    closeModal('mazzi');
    openModal('deck-edit');
}

function editDeck(deckId) {
    var p = _players.find(function(x){ return x.id===_mazziTargetId; });
    if (!p) return;
    var mazzi = getPlayerMazzi(p);
    var deck  = mazzi.find(function(m){ return m.id===deckId; });
    if (!deck) return;
    _editDeckId = deckId;
    document.getElementById('deck-edit-title').innerHTML = 'MODIFICA <span>MAZZO</span>';
    document.getElementById('de-nome').value  = deck.nome||'';
    document.getElementById('de-fmt').value   = deck.formato||'';
    document.getElementById('de-list').value  = deck.decklist||'';
    closeModal('mazzi');
    openModal('deck-edit');
}

function submitDeckEdit() {
    if (!_currentUser || !_mazziTargetId || !_mazziIsOwner) return;
    var nome    = document.getElementById('de-nome').value.trim();
    if (!nome) { showToast('Nome mazzo obbligatorio','error'); return; }
    var formato  = document.getElementById('de-fmt').value;
    var decklist = document.getElementById('de-list').value.trim();
    var btn = document.getElementById('de-btn'); btn.disabled=true; btn.textContent='Salvataggio…';

    var p     = _players.find(function(x){ return x.id===_mazziTargetId; });
    var mazzi = p ? getPlayerMazzi(p).slice() : [];
    mazzi = mazzi.filter(function(m){ return m.id!=='legacy'; });

    if (_editDeckId) {
        mazzi = mazzi.map(function(m){
            if (m.id===_editDeckId) return { id:m.id, nome:nome, formato:formato, decklist:decklist, isMain:m.isMain };
            return m;
        });
    } else {
        var isFirst = mazzi.length===0;
        mazzi.push({ id:uuid(), nome:nome, formato:formato, decklist:decklist, isMain:isFirst });
    }

    var main = mazzi.find(function(m){ return m.isMain; }) || mazzi[0];
    var mazzoAttuale = main ? { nome:main.nome, formato:main.formato, decklist:main.decklist } : null;

    _db.collection('giocatori').doc(_mazziTargetId).update({ mazzi:mazzi, mazzoAttuale:mazzoAttuale })
        .then(function(){
            showToast(_editDeckId?'Mazzo aggiornato ✓':'Mazzo aggiunto ✓','success');
            if (main && (_editDeckId ? mazzi.find(function(m){ return m.id===_editDeckId&&m.isMain; }) : mazzi.length===1))
                _propagateDeckToEvents(_mazziTargetId, main.decklist||'');
            closeModal('deck-edit');
            setTimeout(function(){
                var updated = _players.find(function(x){ return x.id===_mazziTargetId; });
                if (updated) { renderMazziList(updated); openModal('mazzi'); }
            }, 300);
        })
        .catch(function(e){ showToast('Errore: '+(e.message||e),'error'); })
        .finally(function(){ btn.disabled=false; btn.textContent='Salva'; });
}

function _propagateDeckToEvents(playerId, decklist) {
    _db.collection('events').where('status','in',['in-arrivo','in-corso']).get()
        .then(function(snap){
            var promises = [];
            snap.docs.forEach(function(doc){
                var players = (doc.data().players||[]).slice();
                var idx = -1;
                for (var i=0;i<players.length;i++){
                    if (players[i].playerRef===playerId){ idx=i; break; }
                }
                if (idx !== -1) {
                    var src = players[idx];
                    players[idx] = { name: src.name, playerRef: src.playerRef, placement: src.placement, points: src.points, wins: src.wins, losses: src.losses, draws: src.draws, requestedAt: src.requestedAt, deckList: decklist||'', deckName: src.deckName||'' };
                    promises.push(doc.ref.update({ players: players }));
                }
            });
            if (promises.length) {
                Promise.all(promises).then(function(){
                    showToast('Deck aggiornato nei tornei attivi ✓','success');
                });
            }
        });
}

function setMain(deckId) {
    if (!_currentUser||!_mazziTargetId||!_mazziIsOwner) return;
    var p     = _players.find(function(x){ return x.id===_mazziTargetId; });
    var mazzi = p ? getPlayerMazzi(p).slice() : [];
    mazzi = mazzi.filter(function(m){ return m.id!=='legacy'; });
    mazzi = mazzi.map(function(m){ return { id:m.id, nome:m.nome, formato:m.formato, decklist:m.decklist, isMain:m.id===deckId }; });
    var main = mazzi.find(function(m){ return m.isMain; });
    var mazzoAttuale = main ? { nome:main.nome, formato:main.formato, decklist:main.decklist } : null;
    _db.collection('giocatori').doc(_mazziTargetId).update({ mazzi:mazzi, mazzoAttuale:mazzoAttuale })
        .then(function(){
            showToast('Mazzo Main aggiornato 👑','success');
            var updated = _players.find(function(x){ return x.id===_mazziTargetId; });
            if (updated) renderMazziList(updated);
            if (main) _propagateDeckToEvents(_mazziTargetId, main.decklist||'');
        })
        .catch(function(e){ showToast('Errore: '+(e.message||e),'error'); });
}

function deleteDeck(deckId) {
    if (!_currentUser||!_mazziTargetId||!_mazziIsOwner) return;
    if (!confirm('Eliminare questo mazzo?')) return;
    var p     = _players.find(function(x){ return x.id===_mazziTargetId; });
    var mazzi = p ? getPlayerMazzi(p).slice() : [];
    mazzi = mazzi.filter(function(m){ return m.id!=='legacy' && m.id!==deckId; });
    if (mazzi.length && !mazzi.some(function(m){ return m.isMain; })) mazzi[0].isMain=true;
    var main = mazzi.find(function(m){ return m.isMain; }) || mazzi[0];
    var mazzoAttuale = main ? { nome:main.nome, formato:main.formato, decklist:main.decklist } : null;
    _db.collection('giocatori').doc(_mazziTargetId).update({ mazzi:mazzi, mazzoAttuale:mazzoAttuale })
        .then(function(){
            showToast('Mazzo eliminato','info');
            var updated = _players.find(function(x){ return x.id===_mazziTargetId; });
            if (updated) renderMazziList(updated);
        })
        .catch(function(e){ showToast('Errore: '+(e.message||e),'error'); });
}

/* ── Deck viewer ── */
function openDeckViewById(playerId, deckId) {
    var p = _players.find(function(x){ return x.id===playerId; });
    if (!p) return;
    var mazzi = getPlayerMazzi(p);
    var deck  = mazzi.find(function(m){ return m.id===deckId; }) || mazzi[0];
    if (!deck) return;
    _deckRaw     = deck.decklist||'';
    _deckFormato = (deck.formato||'').toLowerCase();
    document.getElementById('deck-title').textContent = (deck.nome||'Deck')+' — '+(p.nickname||'');
    document.getElementById('deck-fmt').textContent   = deck.formato||'';
    document.getElementById('deck-raw').textContent   = _deckRaw;
    document.getElementById('deck-copy').textContent  = 'Copia';
    document.getElementById('deck-copy').classList.remove('copied');
    switchDeckTab('cards');
    openModal('deck');
}

function switchDeckTab(tab) {
    ['cards','raw'].forEach(function(t){
        document.getElementById('dtab-'+t).classList.toggle('active',t===tab);
        document.getElementById('dp-'+t).classList.toggle('active',t===tab);
    });
    if (tab==='cards') renderDeckCards();
}

function copyDeck() {
    if (!_deckRaw) return;
    navigator.clipboard.writeText(_deckRaw).then(function(){
        var b=document.getElementById('deck-copy');
        b.textContent='✓ Copiata!'; b.classList.add('copied');
        setTimeout(function(){ b.textContent='Copia'; b.classList.remove('copied'); },2000);
    });
}

/* ── Parser decklist ── */
function parseDeck(raw) {
    var lines=(raw||'').trim().split(/\r?\n/);
    var cards=[],section='';
    lines.forEach(function(line){
        line=line.trim(); if(!line) return;
        var qty=1, qm=line.match(/^(\d+)\s*[xX]?/i);
        if(qm) qty=parseInt(qm[1],10);
        var idM=line.match(/\[([A-Za-z]{1,6}\d{0,3}-\d{3,4}[a-z0-9_-]*)\]/i)||line.match(/([A-Za-z]{1,6}\d{0,3}-\d{3,4}[a-z0-9_-]*)/i);
        if(idM){ cards.push({qty:qty,id:idM[1].toUpperCase(),name:idM[1].toUpperCase(),section:section,hasId:true}); }
        else {
            var nameM=line.match(/^\d+[xX]?\s+(.+)$/)||line.match(/^[xX]?\d+\s+(.+)$/);
            if(nameM){ cards.push({qty:qty,id:null,name:nameM[1].trim(),section:section,hasId:false}); }
            else { section=line.replace(/^[\/\/#\-]+\s*/,''); }
        }
    });
    return cards;
}

function renderDeckCards() {
    var view=document.getElementById('deck-grid');
    var cards=parseDeck(_deckRaw);
    if(!cards.length){ view.innerHTML='<div class="gp-loading">Nessuna carta trovata.</div>'; return; }
    var total=cards.reduce(function(s,c){ return s+c.qty; },0);
    var header='<div style="font-size:11px;color:rgba(245,240,232,.38);margin-bottom:12px">Totale: <strong style="color:#f5f0e8">'+total+' carte</strong></div>';
    var allIds=cards.every(function(c){ return c.hasId; });
    if(allIds){ view.innerHTML=header+buildIdGrid(cards); return; }
    var isMagic=_deckFormato.includes('magic')||!_deckFormato;
    if(isMagic){
        view.innerHTML='<div class="gp-loading">Caricamento immagini Scryfall…</div>';
        var unique=[],seen={};
        cards.forEach(function(c){ if(!seen[c.name]){ seen[c.name]=true; unique.push({name:c.name}); } });
        var batches=[]; for(var i=0;i<unique.length;i+=75) batches.push(unique.slice(i,i+75));
        var imgMap={};
        function fetchBatch(idx){
            if(idx>=batches.length){ view.innerHTML=header+buildNameGrid(cards,imgMap); return; }
            fetch('https://api.scryfall.com/cards/collection',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifiers:batches[idx]})})
            .then(function(r){ return r.json(); })
            .then(function(d){
                (d.data||[]).forEach(function(c){
                    var img=c.image_uris?c.image_uris.normal:(c.card_faces&&c.card_faces[0].image_uris?c.card_faces[0].image_uris.normal:null);
                    if(img) imgMap[c.name.toLowerCase()]=img;
                }); fetchBatch(idx+1);
            }).catch(function(){ view.innerHTML=header+buildNameGrid(cards,imgMap); });
        }
        fetchBatch(0);
    } else { view.innerHTML=header+buildTextList(cards); }
}

/* buildIdGrid: usa data-attributes al posto di onerror inline */
function buildIdGrid(cards){
    var html='',cur=null; html+='<div class="gp-card-grid">';
    cards.forEach(function(c){
        if(c.section!==cur){ if(cur!==null) html+='</div><div class="gp-card-grid">'; if(c.section) html+='</div><div class="gp-sep">'+esc(c.section)+'</div><div class="gp-card-grid">'; cur=c.section; }
        var isPromo=/^P-\d{3,4}$/i.test(c.id);
        var imgSrc = isPromo
            ? '/api/promo-image?id='+encodeURIComponent(c.id.toUpperCase())
            : IMG_BASE+c.id+'.jpg';
        /* data-card-err="promo|op" gestito dal global error handler in script.js */
        html+='<div class="gp-card-item" title="'+esc(c.id)+'">'
            +'<img src="'+imgSrc+'" alt="'+esc(c.id)+'" loading="lazy"'
            +' data-card-err="'+(isPromo?'promo':'op')+'"'
            +' data-card-base="'+esc(IMG_BASE)+'">'
            +'<div class="gp-no-img" style="display:none">'+esc(c.id)+'</div>'
            +'<span class="gp-card-qty">×'+c.qty+'</span>'
            +'<div class="gp-card-id">'+esc(c.id)+'</div>'
            +'</div>';
    }); return html+'</div>';
}
function buildNameGrid(cards,imgMap){
    var html='',cur=null; html+='<div class="gp-card-grid">';
    cards.forEach(function(c){
        if(c.section!==cur){ if(cur!==null) html+='</div><div class="gp-card-grid">'; if(c.section) html+='</div><div class="gp-sep">'+esc(c.section)+'</div><div class="gp-card-grid">'; cur=c.section; }
        var img=imgMap[c.name.toLowerCase()];
        if(img){ html+='<div class="gp-card-item" title="'+esc(c.name)+'">'+'<img src="'+img+'" alt="'+esc(c.name)+'" loading="lazy">'+'<span class="gp-card-qty">×'+c.qty+'</span>'+'<div class="gp-card-id">'+esc(c.name)+'</div>'+'</div>'; }
        else { html+='<div class="gp-card-item"><div class="gp-no-img">'+esc(c.name)+'</div>'+'<span class="gp-card-qty">×'+c.qty+'</span>'+'<div class="gp-card-id">'+esc(c.name)+'</div>'+'</div>'; }
    }); return html+'</div>';
}
function buildTextList(cards){
    return cards.map(function(c){
        return (c.section?'<div class="gp-sep">'+esc(c.section)+'</div>':'')
            +'<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">'
            +'<span style="background:rgba(220,38,38,.18);color:#DC2626;border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700;min-width:26px;text-align:center">'+c.qty+'x</span>'
            +'<span style="font-size:13px">'+esc(c.name)+'</span></div>';
    }).join('');
}

/* ── Event delegation per tutto il documento ── */
document.addEventListener('click', function(e) {
    /* data-deck-tab delegation */
    var tabTarget = e.target.closest('[data-deck-tab]');
    if (tabTarget) { switchDeckTab(tabTarget.getAttribute('data-deck-tab')); return; }

    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');
    switch (action) {
        case 'mazzi':       openMazziModal(target.getAttribute('data-pid')); break;
        case 'view-deck':   openDeckViewById(_mazziTargetId, target.getAttribute('data-mid')); break;
        case 'set-main':    setMain(target.getAttribute('data-mid')); break;
        case 'edit-deck':   editDeck(target.getAttribute('data-mid')); break;
        case 'del-deck':    deleteDeck(target.getAttribute('data-mid')); break;
        case 'auth-btn':    onAuthBtnClick(); break;
        case 'fab':         onFabClick(); break;
        case 'add-deck':    openAddDeck(); break;
        case 'submit-deck': submitDeckEdit(); break;
        case 'copy-deck':   copyDeck(); break;
        case 'atab-login':  switchAuthTab('login'); break;
        case 'atab-reg':    switchAuthTab('register'); break;
        case 'submit-login': submitLogin(); break;
        case 'submit-reg':   submitRegister(); break;
    }
    /* Chiusura modali */
    var closeId = target.getAttribute('data-close');
    if (closeId) closeModal(closeId);
});

/* Overlay backdrop click */
document.addEventListener('click', function(e) {
    ['auth','mazzi','deck-edit','deck'].forEach(function(id) {
        var ov = document.getElementById('ov-'+id);
        if (ov && e.target === ov) closeModal(id);
    });
});

/* Global image error handler per carte (data-card-err) */
document.addEventListener('error', function(e) {
    var img = e.target;
    if (img.tagName !== 'IMG') return;
    var errType = img.getAttribute('data-card-err');
    if (!errType) return;
    if (errType === 'promo') {
        /* Promo: nascondi img, mostra fallback testo */
        img.style.display = 'none';
        var fb = img.nextElementSibling;
        if (fb) fb.style.display = 'flex';
    } else if (errType === 'op') {
        /* One Piece: primo errore → prova PNG, secondo → fallback */
        if (!img.dataset.errHandled) {
            img.dataset.errHandled = '1';
            img.src = (img.getAttribute('data-card-base') || '') + img.alt + '.png';
        } else {
            img.style.display = 'none';
            var fb2 = img.nextElementSibling;
            if (fb2) fb2.style.display = 'flex';
        }
    }
}, true);

/* ── DOMContentLoaded ── */
document.addEventListener('DOMContentLoaded', function(){
    /* Navbar */
    var burger=document.getElementById('nav-burger');
    var links=document.getElementById('nav-links');
    if(burger) burger.addEventListener('click',function(){ links.classList.toggle('open'); burger.classList.toggle('open'); });
    document.addEventListener('scroll',function(){ var nav=document.getElementById('nav'); if(nav) nav.classList.toggle('scrolled',window.scrollY>50); },{passive:true});
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') ['auth','mazzi','deck-edit','deck'].forEach(function(id){ closeModal(id); }); });

    /* Rimuovi l'attribute data-action dagli elementi statici HTML e assegna
       action corrispondente (già impostati nel markup via data-action) */

    /* Filter change */
    var filterEl = document.getElementById('gp-filter');
    if (filterEl) filterEl.addEventListener('change', filterPlayers);

    /* Search input */
    var searchEl = document.getElementById('gp-search');
    if (searchEl) searchEl.addEventListener('input', filterPlayers);

    init();
    setTimeout(function(){ document.body.classList.remove('is-loading'); },300);
});
