/* ============================================================
   poll.js — Sondaggi — MANBAGA
   ============================================================ */
(function() {
    'use strict';

    var _polls = [];
    var _uid   = null; // Firebase Anonymous UID

    /* ---- Auth anonima ----------------------------------------- */
    function _ensureAuth(cb) {
        try {
            /* Usa la stessa app di _fbMainDb (named 'main'), non il default app.
               Così il token auth viene incluso nelle richieste Firestore. */
            var auth = (typeof _fbMainApp !== 'undefined' && _fbMainApp)
                ? _fbMainApp.auth()
                : firebase.app('main').auth();
            var user = auth.currentUser;
            if (user) { _uid = user.uid; cb(); return; }
            auth.signInAnonymously()
                .then(function(r) { _uid = r.user.uid; cb(); })
                .catch(function()  { _uid = null;       cb(); });
        } catch(e) {
            _uid = null;
            cb();
        }
    }

    /* ---- Init ------------------------------------------------- */
    function _init() {
        var tries = 0;
        var check = setInterval(function() {
            tries++;
            if (typeof _fbMainDb !== 'undefined' && _fbMainDb) {
                clearInterval(check);
                _ensureAuth(function() { _subscribe(); });
            } else if (tries > 50) {
                clearInterval(check);
            }
        }, 200);
    }

    function _subscribe() {
        _fbMainDb.collection('polls')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .onSnapshot(function(snap) {
                _polls = snap.docs
                    .map(function(doc) { var d = doc.data(); d._fid = doc.id; return d; })
                    .filter(function(d) { return d.active === true; })
                    .slice(0, 5);
                _render();
            }, function(err) {
                console.warn('[poll.js]', err);
            });
    }

    /* ---- Controllo voto --------------------------------------- */
    function _hasVoted(fid) {
        if (_uid && localStorage.getItem('mb-v2-' + fid + '-' + _uid)) return true;
        if (localStorage.getItem('mb-voted-' + fid)) return true;
        return false;
    }

    function _getVotedOpt(fid) {
        if (_uid) {
            var v = localStorage.getItem('mb-v2-' + fid + '-' + _uid);
            if (v) return v;
        }
        return localStorage.getItem('mb-voted-' + fid);
    }

    /* ---- Render ----------------------------------------------- */
    function _render() {
        var container = document.getElementById('poll-display');
        if (!container) return;
        var section = document.getElementById('sondaggi');

        var poll = _polls[0]; /* sondaggio attivo più recente */
        if (!poll) {
            if (section) section.style.display = 'none';
            return;
        }
        if (section) section.style.display = '';

        var voted = _getVotedOpt(poll._fid);
        var opts  = Array.isArray(poll.options) ? poll.options : [];
        var votes = poll.votes || {};
        var total = opts.reduce(function(sum, o) { return sum + (votes[o] || 0); }, 0);

        var safeFid = _esc(poll._fid);

        var optsHtml = opts.map(function(opt, idx) {
            var v   = votes[opt] || 0;
            var pct = total > 0 ? Math.round((v / total) * 100) : 0;
            var isMine = (voted === opt);

            if (voted) {
                return '<div class="poll-opt poll-opt--result' + (isMine ? ' poll-opt--mine' : '') + '">'
                    + '<div class="poll-opt-top">'
                    + '<span class="poll-opt-label">' + _esc(opt) + (isMine ? ' &#10003;' : '') + '</span>'
                    + '<span class="poll-opt-pct">' + pct + '%</span>'
                    + '</div>'
                    + '<div class="poll-bar-wrap"><div class="poll-bar" style="width:' + pct + '%"></div></div>'
                    + '</div>';
            }
            /* data-attributes invece di onclick inline con dati utente */
            return '<button class="poll-opt poll-opt--vote"'
                + ' data-poll-fid="' + safeFid + '"'
                + ' data-poll-idx="' + idx + '">'
                + _esc(opt)
                + '</button>';
        }).join('');

        container.innerHTML = '<div class="poll-card">'
            + '<h3 class="poll-title">' + _esc(poll.title || 'Sondaggio') + '</h3>'
            + (poll.subtitle ? '<p class="poll-subtitle">' + _esc(poll.subtitle) + '</p>' : '')
            + '<div class="poll-opts">' + optsHtml + '</div>'
            + (voted && total > 0
                ? '<div class="poll-total">&#128202; ' + total + ' vot' + (total === 1 ? 'o' : 'i') + ' totali</div>'
                : (!voted ? '<div class="poll-hint">Vota per vedere i risultati</div>' : ''))
            + '</div>';
    }

    /* ---- Event delegation (no onclick inline) ----------------- */
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('[data-poll-fid]');
        if (!btn) return;
        var fid = btn.getAttribute('data-poll-fid');
        var idx = parseInt(btn.getAttribute('data-poll-idx'), 10);
        if (!fid || isNaN(idx)) return;
        var poll = _polls.find(function(p) { return p._fid === fid; });
        if (!poll || !Array.isArray(poll.options)) return;
        var opt = poll.options[idx];
        if (opt == null) return;
        _vote(fid, opt);
    });

    /* ---- Voto ------------------------------------------------- */
    function _vote(fid, opt) {
        var poll = _polls.find(function(p) { return p._fid === fid; });
        if (!poll) return;
        if (_hasVoted(fid)) return;

        /* Salva localmente (uid-keyed = molto più difficile da bypassare) */
        if (_uid) localStorage.setItem('mb-v2-' + fid + '-' + _uid, opt);
        localStorage.setItem('mb-voted-' + fid, opt); /* fallback compatibilità */

        /* Aggiornamento ottimistico locale */
        if (!poll.votes) poll.votes = {};
        poll.votes[opt] = (poll.votes[opt] || 0) + 1;
        _render();

        /* Firestore: batch — incremento voti + registrazione voter */
        var batch = _fbMainDb.batch();
        var pollRef = _fbMainDb.collection('polls').doc(fid);
        var upd = {};
        upd['votes.' + opt] = firebase.firestore.FieldValue.increment(1);
        batch.update(pollRef, upd);

        /* voters/{uid} — le regole Firestore impediscono sovrascrittura */
        if (_uid) {
            var voterRef = pollRef.collection('voters').doc(_uid);
            batch.set(voterRef, {
                opt: opt,
                ts: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        batch.commit().catch(function() { /* errore silenzioso */ });
    }

    /* ---- Helpers ---------------------------------------------- */
    function _esc(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ---- Start ------------------------------------------------ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
