/* ============================================================
   tavoli-init.js — script di inizializzazione per tavoli.html
   ============================================================ */

/* ── FIREBASE ─────────────────────────────────────────────── */
const FB_CONFIG = {
    apiKey:      'AIzaSyCG0-J2wxZGSz6eDh_E-aAe2uvpTGLmXz0',
    authDomain:  'prenotazioninegozio-65eb1.firebaseapp.com',
    projectId:   'prenotazioninegozio-65eb1',
    databaseURL: 'https://prenotazioninegozio-65eb1-default-rtdb.europe-west1.firebasedatabase.app',
    appId:       '1:466874129336:web:fd07925523c35921fe8d4d'
};
firebase.initializeApp(FB_CONFIG);
const auth      = firebase.auth();
const db        = firebase.database();
const firestore = firebase.firestore();

/* ── TORNEO IN CORSO ──────────────────────────────────────── */
firestore.collection('events')
    .where('status', '==', 'in-corso')
    .where('type',   '==', 'competizione')
    .onSnapshot(snap => {
        const appScreen = document.getElementById('app-screen');
        if (!snap.empty) {
            const torneo = snap.docs[0].data();
            const fid    = snap.docs[0].id;
            document.getElementById('tlock-nome').textContent = torneo.title || '';
            const liveBtn = document.getElementById('tlock-live-btn');
            liveBtn.href = 'torneo.html?id=' + fid;
            liveBtn.classList.remove('hidden');
            appScreen.classList.add('torneo-attivo');
        } else {
            document.getElementById('tlock-nome').textContent = '';
            document.getElementById('tlock-live-btn').classList.add('hidden');
            appScreen.classList.remove('torneo-attivo');
        }
    }, () => {});

/* ── STATE ───────────────────────────────────────────────── */
let selectedTavolo    = null;
let selectedPeople    = null;
let selectedMaxPeople = 2;
let isReg = false;
let currentData = {};
let pendingTable  = null;

/* ── LIVE CLOCK ──────────────────────────────────────────── */
function updateClock() {
    const el = document.getElementById('live-clock');
    if (!el) return;
    const d = new Date();
    el.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
setInterval(updateClock, 1000);
updateClock();

/* ── TOAST ───────────────────────────────────────────────── */
function toast(msg, type = 'info') {
    const wrap = document.getElementById('toast-wrap');
    const icons = { ok: '✅', err: '❌', info: '🌸' };
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${esc(msg)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 280);
    }, 3800);
}

/* ── AUTH ────────────────────────────────────────────────── */
function toggleMode() {
    isReg = !isReg;
    document.getElementById('reg-nome').classList.toggle('hidden', !isReg);
    document.getElementById('auth-eyebrow').textContent = isReg ? 'Crea il tuo account' : 'Accedi per prenotare';
    document.getElementById('auth-btn').textContent     = isReg ? 'REGISTRATI 🌸' : 'ACCEDI 🌸';
    document.getElementById('auth-toggle').textContent  = isReg ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati';
}

function doAuth() {
    const email = (document.getElementById('auth-email').value || '').trim();
    const pass  = document.getElementById('auth-pass').value || '';
    if (!email || !pass) { toast('Inserisci email e password.', 'err'); return; }

    if (isReg) {
        const nome = (document.getElementById('reg-nome').value || '').trim();
        if (!nome) { toast('Inserisci il tuo nome.', 'err'); return; }
        auth.createUserWithEmailAndPassword(email, pass)
            .then(r => db.ref('utenti/' + r.user.uid).set({ nome }))
            .then(() => toast('Account creato! Benvenuto! 🎉', 'ok'))
            .catch(e => toast(e.message, 'err'));
    } else {
        auth.signInWithEmailAndPassword(email, pass)
            .then(() => toast('Accesso effettuato! 🌸', 'ok'))
            .catch(() => toast('Credenziali non valide. Riprova.', 'err'));
    }
}

function doLogout() {
    auth.signOut().then(() => {
        pendingTable = null;
        toast('A presto! 👋', 'info');
    }).catch(() => {});
}

/* ── DB LISTENER ─────────────────────────────────────────── */
db.ref('prenotazioni').on('value', snap => {
    currentData = snap.val() || {};
    render(currentData);
});

/* ── AUTH STATE ──────────────────────────────────────────── */
auth.onAuthStateChanged(user => {
    const authEl   = document.getElementById('auth-screen');
    const userEl   = document.getElementById('header-user');
    const loginBtn = document.getElementById('header-login');
    const nomeEl   = document.getElementById('header-nome');

    if (user) {
        authEl.classList.add('hidden');
        userEl.classList.remove('hidden');
        if (loginBtn) loginBtn.classList.add('hidden');

        db.ref('utenti/' + user.uid).once('value', snap => {
            const nome = snap.val()?.nome || user.email;
            if (nomeEl) nomeEl.textContent = nome;
        });

        if (pendingTable) {
            const { num, max } = pendingTable;
            pendingTable = null;
            openModal(num, max);
        } else {
            render(currentData);
        }
    } else {
        authEl.classList.add('hidden');
        userEl.classList.add('hidden');
        if (loginBtn) loginBtn.classList.remove('hidden');
        render(currentData);
    }
});

/* ── EXPIRY HELPERS ──────────────────────────────────────── */
function isExpired(p) {
    if (p.expiresAt) return p.expiresAt <= Date.now();
    if (!p.orarioUscita) return false;
    if (!p.data) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    if (p.data !== todayStr) return new Date(p.data) < new Date(todayStr);
    const [nh, nm] = [new Date().getHours(), new Date().getMinutes()];
    const nowMins  = nh * 60 + nm;
    const [uh, um] = p.orarioUscita.split(':').map(Number);
    return (uh * 60 + um) <= nowMins;
}

function isExpiringSoon(expiresAt) {
    if (!expiresAt) return false;
    const diff = expiresAt - Date.now();
    return diff > 0 && diff <= 15 * 60 * 1000;
}

/* ── RENDER ──────────────────────────────────────────────── */
function render(data) {
    const all = Object.values(data);
    autoCleanExpired(all);
    const active = all.filter(p => !isExpired(p));

    let liberi = 0, occ = 0;
    const grid = document.getElementById('grid-tavoli');
    grid.innerHTML = '';

    for (let i = 1; i <= 8; i++) {
        const bookings    = active.filter(x => String(x.tavolo) === String(i));
        const totalPeople = bookings.reduce((s, b) => s + (Number(b.persone) || 1), 0);
        const isFull      = totalPeople >= 2;
        const card        = document.createElement('div');

        if (bookings.length > 0) {
            occ++;
            if (isFull) {
                card.className = 't-card t-card--occ';
            } else {
                card.className = 't-card t-card--partial';
                card.onclick   = () => openModal(i, 2 - totalPeople);
            }
            card.innerHTML = buildOcc(i, bookings, totalPeople);
        } else {
            liberi++;
            card.className = 't-card t-card--free';
            card.onclick   = () => openModal(i, 2);
            card.innerHTML = buildFree(i);
        }
        grid.appendChild(card);
    }

    document.getElementById('n-liberi').textContent = liberi;
    document.getElementById('n-occ').textContent    = occ;

    const uid  = auth.currentUser?.uid || null;
    const mie  = uid ? active.filter(x => x.utenteId === uid) : [];
    document.getElementById('badge-count').textContent = mie.length;

    const lista = document.getElementById('lista-mie');
    if (!uid) {
        lista.innerHTML = '<p class="empty-msg">🌸 <span data-action="show-auth" style="cursor:pointer;color:var(--pink);text-decoration:underline">Accedi</span> per vedere le tue prenotazioni</p>';
    } else if (mie.length === 0) {
        lista.innerHTML = '<p class="empty-msg">🌸 Nessuna prenotazione attiva</p>';
    } else {
        lista.innerHTML = mie.map(x => {
            const n    = Number(x.persone) || 1;
            const dots = [1,2].map(d =>
                `<span class="pren-dot${d <= n ? ' filled' : ''}"></span>`
            ).join('');
            const timeStr = x.orarioUscita
                ? `${esc(x.orario)} → ${esc(x.orarioUscita)}`
                : `ore ${esc(x.orario)}`;
            const dateStr  = x.data ? ` · ${fmtDate(x.data)}` : '';
            const expSoon  = x.expiresAt ? isExpiringSoon(x.expiresAt) : false;
            return `<div class="pren-row">
                <div class="pren-main">
                    <span class="pren-table">Tavolo ${esc(String(x.tavolo))}</span>
                    <span class="pren-name">${esc(x.nome)}</span>
                    <span class="pren-meta">${timeStr}${dateStr}</span>
                    <div class="pren-people-dots">${dots}</div>
                    ${expSoon ? '<span class="t-expire-soon">⏱ In scadenza!</span>' : ''}
                </div>
                <button class="btn-del" data-action="del-pren" data-pren-id="${esc(x.id)}" title="Cancella" aria-label="Cancella prenotazione">✕</button>
            </div>`;
        }).join('');
    }
}

/* ── CARD BUILDERS ───────────────────────────────────────── */
function seats(n, type) {
    const c = i => i < n ? `seat seat--taken-${type}` : 'seat seat--empty';
    return `<div class="seats-row"><span class="${c(0)}"></span><span class="${c(1)}"></span></div>`;
}
function seatsBot(n, type) {
    const c = i => i < n ? `seat seat--taken-${type}` : 'seat seat--empty';
    return `<div class="seats-row"><span class="${c(2)}"></span><span class="${c(3)}"></span></div>`;
}

function buildFree(num) {
    return `
        <span class="t-ribbon t-ribbon--free">LIBERO</span>
        <div class="t-visual">
            ${seats(0,'free')}
            <div class="t-top">
                <span class="t-num">${num}</span>
                <span class="t-seats-count t-seats-count--free" title="2 posti disponibili">2</span>
            </div>
        </div>
        <div class="t-info"><span class="t-cta">Tocca per prenotare ✨</span></div>`;
}

function buildOcc(num, bookings, totalPeople) {
    const MAX       = 2;
    const isFull    = totalPeople >= MAX;
    const remaining = MAX - totalPeople;
    const seatType  = isFull ? 'occ' : 'partial';
    const expSoon   = bookings.some(b => b.expiresAt && isExpiringSoon(b.expiresAt));

    const entries = bookings.map(b => {
        const n = Number(b.persone) || 1;
        const timeHtml = b.orarioUscita
            ? `<span class="t-time-range">
                   <span class="t-arr">${esc(b.orario)}</span>
                   <span class="t-sep">→</span>
                   <span class="t-usc">${esc(b.orarioUscita)}</span>
               </span>`
            : `<span class="t-guest-meta">ore ${esc(b.orario)}</span>`;
        return `<div class="t-booking-entry">
            <span class="t-guest-name">${esc(b.nome)}</span>
            ${timeHtml}
            <span class="t-entry-people">${'👤'.repeat(Math.min(n,4))} ${n} pers.</span>
        </div>`;
    }).join('<div class="t-booking-sep"></div>');

    const ribbonLabel = isFull ? 'COMPLETO' : `${remaining} POSTI`;

    return `
        <span class="t-ribbon t-ribbon--${isFull ? 'occ' : 'partial'}">${ribbonLabel}</span>
        <div class="t-visual">
            ${seats(totalPeople, seatType)}
            <div class="t-top">
                <span class="t-num">${num}</span>
                <span class="t-seats-count t-seats-count--${isFull ? 'occ' : 'partial'}" title="${totalPeople}/${MAX} persone">${totalPeople}/${MAX}</span>
            </div>
        </div>
        <div class="t-info t-info--multi">
            ${entries}
            ${expSoon ? '<span class="t-expire-soon">⏱ In scadenza!</span>' : ''}
            ${!isFull ? `<span class="t-cta-partial">Tocca per aggiungere ✨</span>` : ''}
        </div>`;
}

function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(d) {
    if (!d) return '';
    try { const [y,m,g] = d.split('-'); return `${esc(g)}/${esc(m)}/${esc(y)}`; }
    catch { return esc(d); }
}

/* ── AUTH OVERLAY HELPERS ────────────────────────────────── */
function showAuthOverlay() {
    document.getElementById('auth-screen').classList.remove('hidden');
}
function hideAuthOverlay() {
    document.getElementById('auth-screen').classList.add('hidden');
}

/* ── MODAL ───────────────────────────────────────────────── */
function openModal(num, maxPeople) {
    if (!auth.currentUser) {
        pendingTable = { num, max: maxPeople || 2 };
        showAuthOverlay();
        return;
    }
    maxPeople = maxPeople || 2;
    selectedTavolo    = num;
    selectedPeople    = null;
    selectedMaxPeople = maxPeople;

    document.getElementById('modal-title').textContent = 'TAVOLO ' + num;
    document.getElementById('p-nome').value   = '';
    document.getElementById('p-ora').value    = '';
    document.getElementById('p-uscita').value = '';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('p-data').min   = today;
    document.getElementById('p-data').value = today;

    document.querySelectorAll('.people-btn').forEach(b => {
        b.classList.remove('selected');
        const n = Number(b.dataset.n);
        b.disabled = (n > maxPeople);
    });

    const note = document.getElementById('seats-note');
    if (maxPeople < 2) {
        note.textContent = `⚠️ Solo ${maxPeople} posto${maxPeople > 1 ? 'i' : ''} disponibile${maxPeople > 1 ? '' : ''} a questo tavolo`;
        note.classList.remove('hidden');
    } else {
        note.classList.add('hidden');
    }

    document.getElementById('modal-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('p-nome').focus(), 60);
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    selectedTavolo = null;
    selectedPeople = null;
}

function selectPeople(n) {
    selectedPeople = n;
    document.querySelectorAll('.people-btn').forEach(b => {
        b.classList.toggle('selected', Number(b.dataset.n) === n);
    });
}

function submitPren() {
    const tavolo = selectedTavolo;
    const nome   = (document.getElementById('p-nome').value   || '').trim();
    const data   = (document.getElementById('p-data').value   || '').trim();
    const ora    = (document.getElementById('p-ora').value    || '').trim();
    const uscita = (document.getElementById('p-uscita').value || '').trim();

    if (!nome)            { toast('Inserisci il nome per la prenotazione.', 'err'); return; }
    if (nome.length > 80) { toast('Nome troppo lungo (max 80 caratteri).', 'err'); return; }
    if (!data)            { toast('Seleziona la data.', 'err'); return; }
    if (!ora)             { toast("Inserisci l'orario di arrivo.", 'err'); return; }
    if (!uscita)          { toast("Inserisci l'orario di uscita.", 'err'); return; }
    if (ora  < '09:00')   { toast("L'orario di arrivo non può essere prima delle 09:00.", 'err'); return; }
    if (ora  > '20:30')   { toast("L'orario di arrivo non può essere dopo le 20:30.", 'err'); return; }
    if (uscita > '20:30') { toast("L'orario di uscita non può essere dopo le 20:30.", 'err'); return; }
    if (uscita <= ora)    { toast("L'orario di uscita deve essere dopo l'arrivo.", 'err'); return; }
    if (!selectedPeople)  { toast('Seleziona il numero di persone.', 'err'); return; }
    if (!tavolo)          return;

    const activeNow     = Object.values(currentData).filter(x => !isExpired(x));
    const alreadyBooked = activeNow
        .filter(x => String(x.tavolo) === String(tavolo))
        .reduce((s, b) => s + (Number(b.persone) || 1), 0);
    const remaining = 2 - alreadyBooked;
    if (selectedPeople > remaining) {
        if (remaining <= 0) {
            toast('Questo tavolo è al completo!', 'err');
        } else {
            toast(`Solo ${remaining} posto${remaining > 1 ? 'i' : ''} disponibile${remaining > 1 ? '' : ''}!`, 'err');
        }
        return;
    }

    const expiresAt = new Date(data + 'T' + uscita + ':00').getTime();

    const btn = document.getElementById('confirm-btn');
    btn.disabled = true;
    btn.textContent = 'Salvataggio...';

    const ref = db.ref('prenotazioni').push();
    const id  = ref.key;
    ref.set({
        id,
        tavolo:       tavolo,
        nome,
        data,
        orario:       ora,
        orarioUscita: uscita,
        expiresAt,
        persone:      selectedPeople,
        utenteId:     auth.currentUser.uid
    })
    .then(() => {
        closeModal();
        toast(`Tavolo ${tavolo} prenotato per ${nome}! 🌸`, 'ok');
    })
    .catch(() => toast('Errore. Verifica le regole del database Firebase.', 'err'))
    .finally(() => {
        btn.disabled = false;
        btn.textContent = '🌸 Prenota!';
    });
}

function delPren(id) {
    if (!auth.currentUser) { toast('Devi essere autenticato.', 'err'); return; }
    const booking = Object.values(currentData).find(x => String(x.id) === String(id));
    if (!booking || booking.utenteId !== auth.currentUser.uid) {
        toast('Non autorizzato.', 'err');
        return;
    }
    if (!confirm('Cancellare questa prenotazione?')) return;
    db.ref('prenotazioni/' + id).remove()
        .then(() => toast('Prenotazione cancellata.', 'info'))
        .catch(() => toast('Errore durante la cancellazione.', 'err'));
}

/* ── TABS ────────────────────────────────────────────────── */
function switchTab(tab, btn) {
    document.getElementById('view-mappa').classList.toggle('hidden', tab !== 'mappa');
    document.getElementById('view-lista').classList.toggle('hidden', tab !== 'lista');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

/* ── AUTO-SCADENZA ───────────────────────────────────────── */
function autoCleanExpired(all) {
    if (!auth.currentUser) return;
    all.forEach(p => {
        if (isExpired(p) && p.utenteId === auth.currentUser.uid) {
            db.ref('prenotazioni/' + p.id).remove()
                .then(() => toast(`Tavolo ${esc(String(p.tavolo))} liberato automaticamente! 🌸`, 'info'))
                .catch(() => {});
        }
    });
}

setInterval(() => {
    db.ref('prenotazioni').once('value', snap => {
        autoCleanExpired(Object.values(snap.val() || {}));
    });
}, 60000);

/* ── NAV BURGER ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
    var burger = document.getElementById('nav-burger');
    var links  = document.getElementById('nav-links');
    if (burger && links) {
        burger.addEventListener('click', function () {
            links.classList.toggle('open');
            burger.classList.toggle('open');
        });
        links.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () {
                links.classList.remove('open');
                burger.classList.remove('open');
            });
        });
    }
    window.addEventListener('scroll', function () {
        var nav = document.getElementById('nav');
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });

    /* ── Static HTML event listeners ── */

    /* Logout */
    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', doLogout);

    /* Header login */
    var loginBtn = document.getElementById('header-login');
    if (loginBtn) loginBtn.addEventListener('click', showAuthOverlay);

    /* Auth overlay backdrop */
    var authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.addEventListener('click', function(e) {
        if (e.target === authScreen) hideAuthOverlay();
    });

    /* Auth inputs */
    var authPass = document.getElementById('auth-pass');
    if (authPass) authPass.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') doAuth();
    });
    var authBtn = document.getElementById('auth-btn');
    if (authBtn) authBtn.addEventListener('click', doAuth);
    var authToggle = document.getElementById('auth-toggle');
    if (authToggle) authToggle.addEventListener('click', toggleMode);

    /* Modal overlay */
    var modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) closeModal();
        });
        var modalClose = modalOverlay.querySelector('.modal-close');
        if (modalClose) modalClose.addEventListener('click', closeModal);
    }

    /* Modal form */
    var pNome = document.getElementById('p-nome');
    if (pNome) pNome.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            var pData = document.getElementById('p-data');
            if (pData) pData.focus();
        }
    });

    var cancelBtn = document.getElementById('cancel-pren-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    var confirmBtn = document.getElementById('confirm-btn');
    if (confirmBtn) confirmBtn.addEventListener('click', submitPren);

    /* People selector */
    var peopleSelector = document.getElementById('people-selector');
    if (peopleSelector) {
        peopleSelector.addEventListener('click', function(e) {
            var btn = e.target.closest('.people-btn');
            if (btn && !btn.disabled) selectPeople(Number(btn.dataset.n));
        });
    }

    /* Tabs */
    document.querySelectorAll('.tab-btn[data-tab]').forEach(function(btn) {
        btn.addEventListener('click', function() { switchTab(btn.dataset.tab, btn); });
    });

    /* Keyboard shortcut */
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            const m = document.getElementById('modal-overlay');
            if (m && !m.classList.contains('hidden')) closeModal();
        }
    });

    /* Lista prenotazioni delegation (dynamic innerHTML) */
    var listaMie = document.getElementById('lista-mie');
    if (listaMie) {
        listaMie.addEventListener('click', function(e) {
            if (e.target.closest('[data-action="show-auth"]')) { showAuthOverlay(); return; }
            var delBtn = e.target.closest('[data-action="del-pren"]');
            if (delBtn) delPren(delBtn.dataset.prenId);
        });
    }
});

/* ── EASTER MEMORY GAME ──────────────────────────────────── */
(function () {
    var PAIRS = [
        ['🐉','#7c1c1c,#dc2626'], ['⚔️','#1c3a7c,#2563eb'],
        ['🏴‍☠️','#1a1a2e,#4b5563'], ['🌸','#7c1c5a,#ec4899'],
        ['🔥','#7c3a1c,#f97316'], ['👑','#7c6a1c,#eab308'],
        ['🎴','#1c5a3a,#10b981'], ['🌀','#3a1c7c,#8b5cf6']
    ];

    var _flipped=[], _matched=0, _moves=0, _lock=false, _running=false;
    var _startTime=0, _tickI=null;

    window.openEasterGame = function () {
        document.getElementById('po-game').classList.add('active');
    };
    window.closeEasterGame = function () {
        _stop();
        document.getElementById('po-game').classList.remove('active');
        _showScreen('pg-start-screen');
    };
    window.startEasterGame = function () {
        _stop();
        _flipped=[]; _matched=0; _moves=0; _lock=false; _running=true;
        _startTime=Date.now();
        document.getElementById('pg-moves').textContent='0';
        document.getElementById('pg-timer').textContent='0:00';
        _showScreen(null);
        _buildGrid();
        _tickI=setInterval(function () {
            if (!_running) return;
            var s=Math.floor((Date.now()-_startTime)/1000);
            document.getElementById('pg-timer').textContent=
                Math.floor(s/60)+':'+(s%60<10?'0':'')+s%60;
        }, 500);
    };

    function _stop() { _running=false; clearInterval(_tickI); _tickI=null; }
    function _showScreen(id) {
        ['pg-start-screen','pg-end-screen'].forEach(function (s) {
            document.getElementById(s).classList.toggle('hidden', s!==id);
        });
    }

    function _buildGrid() {
        var grid=document.getElementById('pg-grid');
        grid.innerHTML='';
        var deck=[];
        PAIRS.forEach(function (p,i) { deck.push(i); deck.push(i); });
        for (var i=deck.length-1; i>0; i--) {
            var j=Math.floor(Math.random()*(i+1));
            var tmp=deck[i]; deck[i]=deck[j]; deck[j]=tmp;
        }
        deck.forEach(function (idx) {
            var p=PAIRS[idx];
            var card=document.createElement('div');
            card.className='pg-card';
            card.dataset.idx=idx;
            card.innerHTML=
                '<div class="pg-card-inner">'
                +'<div class="pg-card-back">🥚</div>'
                +'<div class="pg-card-front" style="background:linear-gradient(145deg,'+p[1]+')">'+p[0]+'</div>'
                +'</div>';
            card.addEventListener('click', function () { _flip(card); });
            grid.appendChild(card);
        });
    }

    function _flip(card) {
        if (_lock||!_running) return;
        if (card.classList.contains('flipped')||card.classList.contains('matched')) return;
        card.classList.add('flipped');
        _flipped.push(card);
        if (_flipped.length<2) return;

        _moves++;
        document.getElementById('pg-moves').textContent=_moves;
        _lock=true;

        var a=_flipped[0], b=_flipped[1];
        if (a.dataset.idx===b.dataset.idx) {
            setTimeout(function () {
                a.classList.add('matched'); b.classList.add('matched');
                _flipped=[]; _lock=false; _matched++;
                if (_matched===PAIRS.length) _win();
            }, 400);
        } else {
            setTimeout(function () { a.classList.add('wrong'); b.classList.add('wrong'); }, 500);
            setTimeout(function () {
                a.classList.remove('flipped','wrong');
                b.classList.remove('flipped','wrong');
                _flipped=[]; _lock=false;
            }, 950);
        }
    }

    function _win() {
        _stop();
        var secs=Math.floor((Date.now()-_startTime)/1000);
        var timeStr=Math.floor(secs/60)+':'+(secs%60<10?'0':'')+secs%60;
        var stars=_moves<=16?'⭐⭐⭐':_moves<=22?'⭐⭐':'⭐';
        var msgs={
            '⭐⭐⭐':'Memoria leggendaria! Sei un vero maestro TCG 🏆',
            '⭐⭐':'Ottimo! Ti ricordi le carte quasi come Luffy si ricorda il cibo 🍖',
            '⭐':'Hai finito! La prossima andrà meglio, shinobi 🌀'
        };
        document.getElementById('pg-stars').textContent=stars;
        document.getElementById('pg-final-time').textContent=timeStr;
        document.getElementById('pg-final-moves').textContent=_moves+' mosse';
        document.getElementById('pg-final-msg').textContent=msgs[stars];
        _showScreen('pg-end-screen');
    }

    /* Easter game button listeners — run after DOM */
    document.addEventListener('DOMContentLoaded', function () {
        var openBtn = document.getElementById('open-game-btn');
        if (openBtn) openBtn.addEventListener('click', window.openEasterGame);

        document.querySelectorAll('.pg-close').forEach(function (btn) {
            btn.addEventListener('click', window.closeEasterGame);
        });
        document.querySelectorAll('.pg-start-btn').forEach(function (btn) {
            btn.addEventListener('click', window.startEasterGame);
        });
    });
})();

/* ── PASQUA OVERLAY ──────────────────────────────────────── */
(function () {
    var FINE_PASQUA = new Date('2026-04-07T00:00:00');
    var overlay = document.getElementById('pasqua-overlay');
    var pageInner = document.querySelector('.page-inner');
    if (!overlay) return;

    if (new Date() >= FINE_PASQUA) {
        overlay.classList.add('po-hidden');
        return;
    }

    if (pageInner) pageInner.style.display = 'none';

    var wrap = document.getElementById('po-stars-wrap');
    if (wrap) {
        for (var i = 0; i < 60; i++) {
            var s = document.createElement('div');
            s.className = 'po-star';
            s.style.left = Math.random() * 100 + '%';
            s.style.top  = Math.random() * 100 + '%';
            s.style.animationDuration  = (2 + Math.random() * 4).toFixed(1) + 's';
            s.style.animationDelay     = (Math.random() * 4).toFixed(1) + 's';
            s.style.width  = s.style.height = (1 + Math.random() * 2).toFixed(1) + 'px';
            wrap.appendChild(s);
        }
    }

    var timer = setInterval(function () {
        if (new Date() >= FINE_PASQUA) {
            overlay.classList.add('po-hidden');
            if (pageInner) pageInner.style.display = '';
            clearInterval(timer);
        }
    }, 60000);
})();
