/* ============================================================
   torneo-init.js — script di inizializzazione per torneo.html
   ============================================================ */

/* ── Globals ── */
var _db, _auth, _eventId, _eventData;
var _myPlayerRef = null;
var _COLORS = ['#DC2626','#2563EB','#16A34A','#D97706','#7C3AED','#DB2777','#0891B2','#EA580C'];
function _col(s){ var n=0; for(var i=0;i<s.length;i++) n+=s.charCodeAt(i); return _COLORS[n%_COLORS.length]; }
function _ini(s){ var p=s.trim().split(/\s+/); return p.length>=2?(p[0][0]+p[1][0]).toUpperCase():s.slice(0,2).toUpperCase(); }

function _getMainDeck(p) {
    if (p.mazzi && p.mazzi.length) {
        return p.mazzi.find(function(m){ return m.isMain; }) || p.mazzi[0];
    }
    return p.mazzoAttuale && p.mazzoAttuale.nome ? p.mazzoAttuale : null;
}

function _loadMyProfile(cb) {
    var user = _auth ? _auth.currentUser : null;
    if (!user) { _myPlayerRef = null; if (cb) cb(null); return; }
    _db.collection('giocatori').where('uid','==',user.uid).limit(1).get()
        .then(function(snap){
            if (!snap.empty) {
                var p = snap.docs[0].data(); p.id = snap.docs[0].id;
                _myPlayerRef = p.id;
                if (cb) cb(p);
            } else {
                _myPlayerRef = null;
                if (cb) cb(null);
            }
        }).catch(function(){ _myPlayerRef = null; if (cb) cb(null); });
}

/* ── Registration CTA box ── */
function renderRegBox(data, status) {
    var regBox = document.getElementById('torneo-reg-box');
    var players = Array.isArray(data.players) ? data.players : [];
    var pending = Array.isArray(data.pendingPlayers) ? data.pendingPlayers : [];
    var isRegistered = _myPlayerRef && players.some(function(p){ return p.playerRef === _myPlayerRef; });
    var isPending    = _myPlayerRef && pending.some(function(p){ return p.playerRef === _myPlayerRef; });
    var user = _auth ? _auth.currentUser : null;

    if (status === 'completato') { regBox.style.display = 'none'; return; }
    regBox.style.display = 'block';

    if (!user) {
        regBox.innerHTML = '<div class="torneo-reg-title">Partecipa al Torneo</div>'
            + '<div class="torneo-reg-sub">Accedi al tuo profilo giocatore per iscriverti.</div>'
            + '<button class="btn btn-primary" style="clip-path:none;margin-top:8px" data-action="open-reg-modal">🃏 Iscriviti / Accedi</button>';
    } else if (isRegistered) {
        regBox.innerHTML = '<div class="torneo-reg-title">✓ Sei iscritto</div>'
            + '<div class="torneo-reg-sub">Il tuo mazzo attuale viene letto automaticamente dal tuo profilo giocatore.</div>';
    } else if (isPending) {
        regBox.innerHTML = '<div class="torneo-reg-title">⏳ Richiesta inviata</div>'
            + '<div class="torneo-reg-sub">La tua iscrizione è in attesa di approvazione da parte dell\'admin. Ti avviseremo presto!</div>';
    } else if (status === 'in-arrivo') {
        var html = '<div class="torneo-reg-title">Partecipa al Torneo</div>'
            + '<div class="torneo-reg-sub">Hai un profilo giocatore? Iscriviti con il tuo mazzo Main.</div>'
            + '<button class="btn btn-primary" style="clip-path:none;margin-top:8px" data-action="open-reg-modal">🃏 Registrati al Torneo</button>';
        if (data.link) { var extUrl = _safeExternalUrl(data.link); if (extUrl) html += '<div style="margin-top:10px;font-size:12px;color:rgba(0,0,0,.45)">oppure <a href="' + _esc(extUrl) + '" target="_blank" rel="noopener noreferrer" style="color:#DC2626;font-weight:700">iscriviti esternamente →</a></div>'; }
        regBox.innerHTML = html;
    } else {
        regBox.style.display = 'none';
    }
}

/* ── Registration modal ── */
function openRegModal() {
    document.getElementById('trn-reg-modal').classList.add('open');
    document.body.style.overflow = 'hidden';

    var user = _auth ? _auth.currentUser : null;
    if (!user) { _showRegStep('reg-step0'); return; }

    _loadMyProfile(function(profile){
        if (!profile) { _showRegStep('reg-step-noprofile'); return; }
        _buildConfirmCard(profile);
        _showRegStep('reg-step2');
    });
}

function _showRegStep(id) {
    ['reg-step0','reg-step-noprofile','reg-step2','reg-step3'].forEach(function(s){
        document.getElementById(s).style.display = s===id?'block':'none';
    });
}

function _buildConfirmCard(profile) {
    var deck = _getMainDeck(profile);
    var col  = _col(profile.nickname||'x');
    var deckHtml = deck && deck.nome
        ? '<div class="trn-reg-selected-deck">'
          +'<div class="trn-reg-selected-deck-title">👑 Mazzo Main — verrà registrato</div>'
          +'<div class="trn-reg-selected-deck-name">'+_esc(deck.nome)+'</div>'
          +(deck.formato?'<div class="trn-reg-selected-deck-fmt">'+_esc(deck.formato)+'</div>':'')
          +'</div>'
        : '<div style="margin-top:10px"><div class="trn-reg-selected-nodeck">⚠️ Nessun mazzo Main — verrai aggiunto senza decklist. <a href="giocatori.html" style="color:#DC2626">Aggiungi un mazzo →</a></div></div>';
    document.getElementById('reg-selected-card').innerHTML =
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">'
        +'<div class="trn-reg-avatar" style="background:'+col+';font-size:18px">'+_esc(_ini(profile.nickname||'?'))+'</div>'
        +'<div><div class="trn-reg-selected-nick">'+_esc(profile.nickname||'')+'</div>'
        +'<div style="font-size:12px;color:rgba(245,240,232,.4)">'+_esc(profile.nome||'')+'</div></div></div>'
        +deckHtml;
    document.getElementById('reg-error').style.display='none';
    document.getElementById('reg-confirm-btn').dataset.profileId = profile.id;
    document.getElementById('reg-confirm-btn').dataset.nick       = profile.nickname||'';
    document.getElementById('reg-confirm-btn').dataset.deckName   = (deck&&deck.nome)||'';
    document.getElementById('reg-confirm-btn').dataset.deckFmt    = (deck&&deck.formato)||'';
    document.getElementById('reg-confirm-btn').dataset.decklist   = (deck&&deck.decklist)||'';
}

function closeRegModal() {
    document.getElementById('trn-reg-modal').classList.remove('open');
    document.body.style.overflow = '';
}

function confirmRegistration() {
    if (!_db || !_eventId || !_eventData) return;
    if (!_auth || !_auth.currentUser) {
        var errEl0 = document.getElementById('reg-error');
        errEl0.textContent = '⚠️ Sessione scaduta. Ricarica la pagina e accedi di nuovo.';
        errEl0.style.display = 'block';
        return;
    }
    var btn = document.getElementById('reg-confirm-btn');
    var profileId = btn.dataset.profileId;
    var nick      = btn.dataset.nick;
    if (!profileId || !nick) return;

    var players = Array.isArray(_eventData.players) ? _eventData.players : [];
    var pending = Array.isArray(_eventData.pendingPlayers) ? _eventData.pendingPlayers : [];
    var dup = players.concat(pending).some(function(p) {
        return (p.playerRef && p.playerRef===profileId)
            || (p.name||'').toLowerCase()===nick.toLowerCase();
    });
    if (dup) {
        var errEl = document.getElementById('reg-error');
        errEl.textContent = players.some(function(p){ return p.playerRef===profileId; })
            ? '⚠️ Sei già iscritto a questo torneo!'
            : '⚠️ Hai già inviato una richiesta di iscrizione. Attendi l\'approvazione dell\'admin.';
        errEl.style.display = 'block';
        return;
    }

    if (_eventData.maxPlayers && players.length >= parseInt(_eventData.maxPlayers)) {
        var errEl2 = document.getElementById('reg-error');
        errEl2.textContent = '⚠️ Il torneo ha raggiunto il numero massimo di partecipanti.';
        errEl2.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Iscrizione…';

    var deckList = btn.dataset.decklist || '';
    var deckName = btn.dataset.deckName || '';

    var pendingPlayer = {
        name: nick, playerRef: profileId,
        deckList: deckList, deckName: deckName,
        requestedAt: Date.now()
    };
    _db.collection('events').doc(_eventId).update({
        pendingPlayers: firebase.firestore.FieldValue.arrayUnion(pendingPlayer)
    }).then(function(){
        document.getElementById('reg-success-msg').innerHTML =
            '⏳ Richiesta inviata per <strong>'+_esc(nick)+'</strong>!<br>'
            + 'L\'admin approverà la tua iscrizione a breve.'
            +(deckName ? '<br>Mazzo: <em>'+_esc(deckName)+'</em>' : '');
        _showRegStep('reg-step3');
        renderRegBox(_eventData, _eventData.status||'in-arrivo');
    })
    .catch(function(e){ var el=document.getElementById('reg-error'); el.textContent='Errore: '+(e.message||e); el.style.display='block'; })
    .finally(function(){ btn.disabled=false; btn.textContent='✓ Conferma Iscrizione'; });
}

var TCG_LABELS = {
    onepiece: 'One Piece TCG', pokemon: 'Pokémon TCG', yugioh: 'Yu-Gi-Oh!',
    magic: 'Magic: The Gathering', dragonball: 'Dragon Ball Super',
    naruto: 'Naruto Card Game', altri: 'TCG'
};
var TCG_COLORS = {
    onepiece: '#DC2626', pokemon: '#B45309', yugioh: '#9333EA',
    magic: '#2563EB', dragonball: '#EA580C', naruto: '#C2410C', altri: '#64748B'
};
var STATUS_LABELS = { 'in-arrivo': 'In Arrivo', 'in-corso': 'In Corso', 'completato': 'Completato' };
var STATUS_CSS    = { 'in-arrivo': 'torneo-status--in-arrivo', 'in-corso': 'torneo-status--in-corso', 'completato': 'torneo-status--completato' };

var MEDAL = ['🥇', '🥈', '🥉'];
var _trnPlayers = [];
var IMG_BASE = 'https://optcgapi.com/media/static/Card_Images/';

function _esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _safeExternalUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try { return new URL(url).protocol === 'https:' ? url : ''; }
    catch(e) { return ''; }
}

function _fetchPlayerDecks(players, cb) {
    if (!players.length || !_db) { cb(players); return; }
    var promises = players.map(function(p) {
        if (!p.playerRef) return Promise.resolve(p);
        return _db.collection('giocatori').doc(p.playerRef).get()
            .then(function(doc) {
                if (!doc.exists) return p;
                var prof = doc.data();
                var deck = _getMainDeck(prof);
                return {
                    name: p.name, playerRef: p.playerRef,
                    placement: p.placement, points: p.points,
                    wins: p.wins, losses: p.losses, draws: p.draws,
                    deckList: (deck && deck.decklist) || '',
                    deckName: (deck && deck.nome) || ''
                };
            }).catch(function() { return p; });
    });
    Promise.all(promises).then(cb).catch(function() { cb(players); });
}

function _renderRanking(players, status) {
    var rankHtml;
    if (players.length === 0) {
        rankHtml = '<div class="trn-empty">'
            + (status === 'in-arrivo' ? '⏳ Il torneo non è ancora iniziato.<br>La classifica sarà disponibile durante o dopo l\'evento.' : '📋 Nessun risultato disponibile.')
            + '</div>';
    } else {
        var sorted = players.slice().sort(function(a, b) {
            if (a.placement && b.placement) return a.placement - b.placement;
            return (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0);
        });
        _trnPlayers = sorted;
        rankHtml = '<table class="torneo-table">'
            + '<thead><tr>'
            + '<th>#</th><th>Giocatore</th>'
            + '<th>V</th><th>S</th><th>P</th>'
            + '<th>Punti</th>'
            + '</tr></thead>'
            + '<tbody>'
            + sorted.map(function(p, i) {
                var rank = p.placement || (i + 1);
                var medal = rank <= 3 ? MEDAL[rank - 1] + ' ' : '';
                var rowCls = rank <= 3 ? ' class="trn-row--' + rank + '"' : '';
                var rankCls = 'trn-rank' + (rank <= 3 ? ' trn-rank--' + rank : '');
                var deckBtn = p.deckList
                    ? '<button class="trn-deck-btn" data-action="open-deck" data-idx="' + i + '" title="Vedi deck list">&#127183;</button>'
                    : '';
                return '<tr' + rowCls + '>'
                    + '<td class="' + rankCls + '">' + rank + '</td>'
                    + '<td class="trn-name">' + medal + _esc(p.name) + deckBtn + '</td>'
                    + '<td>' + (p.wins   || 0) + '</td>'
                    + '<td>' + (p.losses || 0) + '</td>'
                    + '<td>' + (p.draws  || 0) + '</td>'
                    + '<td class="trn-pts">' + (p.points || 0) + '</td>'
                    + '</tr>';
            }).join('')
            + '</tbody></table>'
            + '<div style="margin-top:12px;font-size:11px;color:#aaa;font-weight:600;letter-spacing:0.05em">V = Vittorie &nbsp;·&nbsp; S = Sconfitte &nbsp;·&nbsp; P = Pareggi &nbsp;·&nbsp; Punti: V×3 + P×1</div>';
    }
    document.getElementById('torneo-ranking-content').innerHTML = rankHtml;
}

function renderTorneo(data) {
    var tcg    = data.tcg    || 'altri';
    var status = data.status || 'in-arrivo';
    var color  = TCG_COLORS[tcg] || '#DC2626';
    var tcgLbl = TCG_LABELS[tcg] || 'TCG';
    var stLbl  = STATUS_LABELS[status] || status;
    var players = Array.isArray(data.players) ? data.players : [];

    var dateStr = '';
    if (data.day && data.month) dateStr = data.day + ' ' + data.month + (data.year ? ' ' + data.year : '');

    var heroHtml = '<div class="torneo-tcg-badge" style="background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44">'
        + tcgLbl
        + '</div>'
        + '<h1 class="torneo-hero-title">' + _esc(data.title) + '</h1>'
        + '<div class="torneo-hero-meta">'
        + (dateStr ? '<div class="torneo-hero-meta-item">📅 ' + _esc(dateStr) + '</div>' : '')
        + (data.time  ? '<div class="torneo-hero-meta-item">⏰ ' + _esc(data.time) + '</div>' : '')
        + (data.price ? '<div class="torneo-hero-meta-item">💰 ' + _esc(data.price) + '</div>' : '')
        + (players.length ? '<div class="torneo-hero-meta-item">👥 ' + players.length + ' partecipanti</div>' : '')
        + '</div>'
        + '<div class="torneo-status-chip ' + (STATUS_CSS[status] || '') + '">' + stLbl + '</div>';
    document.getElementById('torneo-hero-inner').innerHTML = heroHtml;

    var infoCards = '';
    if (data.maxPlayers) infoCards += _infoCard(data.maxPlayers, 'Max giocatori');
    if (players.length)  infoCards += _infoCard(players.length, 'Partecipanti');
    if (data.day && data.month) infoCards += _infoCard(data.day, data.month + (data.year ? ' ' + data.year : ''));
    if (data.time) infoCards += _infoCard(data.time, 'Orario');
    document.getElementById('torneo-info-row').innerHTML = infoCards;

    document.getElementById('torneo-status-chip').innerHTML =
        '<div class="torneo-status-chip ' + (STATUS_CSS[status] || '') + '">' + stLbl + '</div>';

    renderRegBox(data, status);

    document.getElementById('torneo-main').style.display = 'block';
    document.title = (data.title || 'Torneo') + ' — MANBAGA';

    _fetchPlayerDecks(players, function(enriched) {
        _renderRanking(enriched, status);
    });
}

function _infoCard(val, lbl) {
    return '<div class="torneo-info-card">'
        + '<div class="torneo-info-val">' + _esc(String(val)) + '</div>'
        + '<div class="torneo-info-lbl">' + _esc(lbl) + '</div>'
        + '</div>';
}

function renderError(msg) {
    document.getElementById('torneo-hero-inner').innerHTML =
        '<div style="color:rgba(245,240,232,0.6);font-size:14px">' + _esc(msg || 'Torneo non trovato.') + '</div>'
        + '<a href="index.html#eventi" style="display:inline-block;margin-top:20px;color:#DC2626;font-weight:700;text-decoration:none">← Torna agli eventi</a>';
}

/* ---- Deck List Modal ---- */
function parseDeckList(text) {
    var lines = (text || '').trim().split(/\r?\n/);
    var cards = [];
    lines.forEach(function(line) {
        line = line.trim();
        if (!line) return;
        var qty = 1;
        var qm = line.match(/^(\d+)\s*[xX]?/i);
        if (qm) qty = parseInt(qm[1], 10);
        var id = null;
        var bracketM = line.match(/\[([A-Za-z]{1,6}\d{1,3}-\d{3,4}[a-z0-9_-]*)\]/i);
        if (bracketM) {
            id = bracketM[1].toUpperCase();
        } else {
            var bareM = line.match(/([A-Za-z]{1,6}\d{1,3}-\d{3,4}[a-z0-9_-]*)/i);
            if (bareM) id = bareM[1].toUpperCase();
        }
        if (id) cards.push({ qty: qty, id: id });
    });
    return cards;
}

function openDeckModal(idx) {
    var p = _trnPlayers[idx];
    if (!p) return;
    var cards = parseDeckList(p.deckList);
    var total = cards.reduce(function(s, c) { return s + c.qty; }, 0);

    document.getElementById('trn-deck-modal-name').textContent = p.name;
    document.getElementById('trn-deck-modal-count').textContent = total + ' carte totali · ' + cards.length + ' carte diverse';

    var grid;
    if (cards.length === 0) {
        grid = '<div class="trn-deck-empty">Nessuna carta trovata.<br><span style="font-size:11px;opacity:.6">Formato atteso: 4 OP01-001</span></div>';
    } else {
        grid = '<div class="trn-deck-grid">'
            + cards.map(function(c) {
                return '<div class="trn-deck-card">'
                    + '<span class="trn-deck-card-qty">×' + c.qty + '</span>'
                    + '<img src="' + IMG_BASE + _esc(c.id) + '.jpg" alt="' + _esc(c.id) + '" loading="lazy"'
                    + ' data-card-err="op" data-card-base="' + _esc(IMG_BASE) + '">'
                    + '<div class="trn-deck-card-id">' + _esc(c.id) + '</div>'
                    + '</div>';
            }).join('')
            + '</div>';
    }

    document.getElementById('trn-deck-modal-grid').innerHTML = grid;
    document.getElementById('trn-deck-modal').classList.add('is-open');
    document.body.style.overflow = 'hidden';
}

function closeDeckModal() {
    document.getElementById('trn-deck-modal').classList.remove('is-open');
    document.body.style.overflow = '';
}

/* ---- Global image error handler for One Piece deck cards ---- */
document.addEventListener('error', function(e) {
    var img = e.target;
    if (img.tagName !== 'IMG') return;
    if (img.dataset.cardErr === 'op' && !img.dataset.errHandled) {
        img.dataset.errHandled = '1';
        /* Try PNG fallback first */
        var base = img.dataset.cardBase || '';
        var alt  = img.getAttribute('alt') || '';
        if (!img.dataset.pngTried) {
            img.dataset.pngTried = '1';
            img.src = base + alt + '.png';
        } else {
            img.parentNode && img.parentNode.classList.add('no-img');
        }
    }
}, true);

/* ---- Bootstrap ---- */
document.addEventListener('DOMContentLoaded', function () {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    if (!id || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) { renderError('ID torneo non valido.'); return; }
    _eventId = id;

    /* Navbar scrolled — burger handled by script.js */
    var nav = document.getElementById('nav');
    document.addEventListener('scroll', function () {
        nav && nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    /* Modal event listeners */
    var regOverlay = document.getElementById('trn-reg-modal');
    if (regOverlay) {
        regOverlay.addEventListener('click', function(e) {
            if (e.target === regOverlay) closeRegModal();
        });
    }

    /* Close reg modal buttons */
    document.querySelectorAll('[data-close="reg-modal"]').forEach(function(btn) {
        btn.addEventListener('click', closeRegModal);
    });

    /* Confirm registration */
    var confirmBtn = document.getElementById('reg-confirm-btn');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmRegistration);

    /* Deck modal close */
    var deckModal = document.getElementById('trn-deck-modal');
    if (deckModal) {
        deckModal.addEventListener('click', function(e) {
            if (e.target === deckModal) closeDeckModal();
        });
        var deckClose = deckModal.querySelector('.trn-deck-modal-close');
        if (deckClose) deckClose.addEventListener('click', closeDeckModal);
    }

    /* Delegation: open-reg-modal, open-deck buttons (in dynamic innerHTML) */
    document.addEventListener('click', function(e) {
        if (e.target.closest('[data-action="open-reg-modal"]')) { openRegModal(); return; }
        var deckBtn = e.target.closest('[data-action="open-deck"]');
        if (deckBtn) { openDeckModal(parseInt(deckBtn.dataset.idx, 10)); return; }
    });

    /* Firebase */
    if (typeof firebase === 'undefined') { renderError('Firebase non disponibile.'); return; }
    var fbConfig = {
        apiKey:            'AIzaSyCG0-J2wxZGSz6eDh_E-aAe2uvpTGLmXz0',
        authDomain:        'prenotazioninegozio-65eb1.firebaseapp.com',
        projectId:         'prenotazioninegozio-65eb1',
        storageBucket:     'prenotazioninegozio-65eb1.appspot.com',
        messagingSenderId: '466874129336',
        appId:             '1:466874129336:web:fd07925523c35921fe8d4d'
    };
    try {
        var defaultApp;
        try { defaultApp = firebase.app(); }
        catch(e) { defaultApp = firebase.initializeApp(fbConfig); }
        _auth = defaultApp.auth();
        _db   = defaultApp.firestore();
    } catch(e) { renderError('Errore connessione Firebase.'); return; }

    _auth.onAuthStateChanged(function(){
        _loadMyProfile(function(){
            if (_eventData) renderRegBox(_eventData, _eventData.status||'in-arrivo');
        });
    });

    _db.collection('events').doc(id).onSnapshot(
        function(doc) {
            if (!doc.exists) { renderError('Torneo non trovato.'); return; }
            var data = doc.data();
            data._fid = doc.id;
            _eventData = data;
            renderTorneo(data);
        },
        function(err) { renderError('Errore caricamento: ' + err.message); }
    );
});
