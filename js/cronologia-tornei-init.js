/* ============================================================
   cronologia-tornei-init.js — script di inizializzazione per cronologia-tornei.html
   ============================================================ */

var TCG_LABELS = {
    onepiece: 'One Piece TCG', pokemon: 'Pokémon TCG', yugioh: 'Yu-Gi-Oh!',
    magic: 'Magic: The Gathering', dragonball: 'Dragon Ball Super',
    naruto: 'Naruto Card Game', altri: 'TCG'
};
var TCG_COLORS = {
    onepiece: '#DC2626', pokemon: '#B45309', yugioh: '#9333EA',
    magic: '#2563EB', dragonball: '#EA580C', naruto: '#C2410C', altri: '#64748B'
};
var MEDAL = ['🥇', '🥈', '🥉'];

function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _dateSort(e) {
    var months = {gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,
                  luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12};
    var y = parseInt(e.year, 10) || 0;
    var m = months[(e.month || '').toLowerCase()] || 0;
    var d = parseInt(e.day, 10) || 0;
    return y * 10000 + m * 100 + d;
}

function renderCronologia(events) {
    var loading = document.getElementById('crono-loading');
    var content = document.getElementById('crono-content');
    loading.style.display = 'none';
    content.style.display = 'block';

    if (events.length === 0) {
        content.innerHTML = '<div class="crono-empty">🏆 Nessun torneo completato ancora.<br>I risultati appariranno qui dopo la fine dei tornei.</div>';
        return;
    }

    events.sort(function(a, b) { return _dateSort(b) - _dateSort(a); });

    var byYear = {};
    events.forEach(function(e) {
        var yr = String(e.year || 'Archivio');
        if (!byYear[yr]) byYear[yr] = [];
        byYear[yr].push(e);
    });

    var years = Object.keys(byYear).sort(function(a, b) { return b - a; });

    var html = '';
    years.forEach(function(yr) {
        html += '<div class="crono-year-label">&#127942; ' + _esc(yr) + '</div>';
        html += '<div class="crono-grid">';
        byYear[yr].forEach(function(e) {
            var tcg    = e.tcg || 'altri';
            var color  = TCG_COLORS[tcg] || '#64748B';
            var tcgLbl = TCG_LABELS[tcg] || 'TCG';
            var players = Array.isArray(e.players) ? e.players : [];
            var dateStr = '';
            if (e.day && e.month) dateStr = e.day + ' ' + e.month + (e.year ? ' ' + e.year : '');

            var sorted = players.slice().sort(function(a, b) {
                if (a.placement && b.placement) return a.placement - b.placement;
                return (b.points || 0) - (a.points || 0) || (b.wins || 0) - (a.wins || 0);
            });
            var podiumHtml = '';
            sorted.slice(0, 3).forEach(function(p, i) {
                var rank = p.placement || (i + 1);
                podiumHtml += '<div class="crono-podium-row">'
                    + '<span>' + (MEDAL[rank - 1] || rank + '.') + '</span>'
                    + '<span>' + _esc(p.name) + '</span>'
                    + '<span class="crono-podium-pts">' + (p.points || 0) + ' pt</span>'
                    + '</div>';
            });

            html += '<div class="crono-card">'
                + '<div class="crono-card-header">'
                + '<div class="crono-card-tcg" style="background:' + color + '18;color:' + color + ';border:1px solid ' + color + '33">' + _esc(tcgLbl) + '</div>'
                + '<div class="crono-card-title">' + _esc(e.title) + '</div>'
                + '<div class="crono-card-meta">'
                + (dateStr ? '<span>📅 ' + _esc(dateStr) + '</span>' : '')
                + (players.length ? '<span>👥 ' + players.length + ' partecipanti</span>' : '')
                + '</div>'
                + '</div>'
                + (podiumHtml ? '<div class="crono-card-podium">' + podiumHtml + '</div>' : '')
                + '<div class="crono-card-footer">'
                + '<a href="torneo.html?id=' + _esc(e._fid) + '" class="crono-view-btn">Vedi classifica completa →</a>'
                + '</div>'
                + '</div>';
        });
        html += '</div>';
    });

    content.innerHTML = html;
}

/* ---- Bootstrap ---- */
document.addEventListener('DOMContentLoaded', function () {
    /* Navbar scrolled effect — nav burger handled by script.js */
    var nav = document.getElementById('nav');
    document.addEventListener('scroll', function () {
        nav && nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    if (typeof firebase === 'undefined') {
        document.getElementById('crono-loading').textContent = 'Errore: Firebase non disponibile.';
        return;
    }

    var fbConfig = {
        apiKey:            'AIzaSyCG0-J2wxZGSz6eDh_E-aAe2uvpTGLmXz0',
        authDomain:        'prenotazioninegozio-65eb1.firebaseapp.com',
        projectId:         'prenotazioninegozio-65eb1',
        storageBucket:     'prenotazioninegozio-65eb1.appspot.com',
        messagingSenderId: '466874129336',
        appId:             '1:466874129336:web:fd07925523c35921fe8d4d'
    };

    var app, db;
    try {
        try { app = firebase.app('crono'); }
        catch(e) { app = firebase.initializeApp(fbConfig, 'crono'); }
        db = app.firestore();
    } catch(e) {
        document.getElementById('crono-loading').textContent = 'Errore connessione Firebase.';
        return;
    }

    db.collection('events')
        .where('type', '==', 'competizione')
        .where('status', '==', 'completato')
        .get()
        .then(function(snap) {
            var events = [];
            snap.forEach(function(doc) {
                var d = doc.data();
                d._fid = doc.id;
                events.push(d);
            });
            renderCronologia(events);
        })
        .catch(function(err) {
            document.getElementById('crono-loading').textContent = 'Errore caricamento: ' + err.message;
        });
});
