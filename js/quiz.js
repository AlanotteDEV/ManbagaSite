/* ============================================================
   quiz.js — Quiz Manga & Anime — MANBAGA
   ============================================================ */
(function() {
    'use strict';

    var _quizzes    = [];
    var _activeQuiz = null;
    var _currentQ   = 0;
    var _score      = 0;
    var _playerName = '';

    function _esc(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    var _CATS = {
        onepiece:   { label: 'One Piece',   color: '#DC2626' },
        naruto:     { label: 'Naruto',      color: '#EA580C' },
        dragonball: { label: 'Dragon Ball', color: '#D97706' },
        pokemon:    { label: 'Pokémon',     color: '#CA8A04' },
        yugioh:     { label: 'Yu-Gi-Oh!',  color: '#9333EA' },
        generale:   { label: 'Generale',    color: '#2563EB' }
    };

    /* ---- LocalStorage helpers --------------------------------- */
    function _lsKey(fid) { return 'quiz_done_' + fid; }

    function _isDone(fid) {
        try { return !!localStorage.getItem(_lsKey(fid)); } catch(e) { return false; }
    }
    function _markDone(fid, score, total) {
        try { localStorage.setItem(_lsKey(fid), JSON.stringify({ score: score, total: total })); } catch(e) {}
    }
    function _getDone(fid) {
        try { var v = localStorage.getItem(_lsKey(fid)); return v ? JSON.parse(v) : null; } catch(e) { return null; }
    }
    function _savedName() {
        try { return localStorage.getItem('quiz_player_name') || ''; } catch(e) { return ''; }
    }
    function _saveName(n) {
        try { localStorage.setItem('quiz_player_name', n); } catch(e) {}
    }

    /* ---- Init ------------------------------------------------- */
    function _init() {
        var tries = 0;
        var check = setInterval(function() {
            tries++;
            if (typeof _fbMainDb !== 'undefined' && _fbMainDb) {
                clearInterval(check);
                _subscribe();
            } else if (tries > 50) {
                clearInterval(check);
            }
        }, 200);
    }

    function _subscribe() {
        _fbMainDb.collection('quizzes')
            .orderBy('createdAt', 'desc')
            .limit(30)
            .onSnapshot(function(snap) {
                _quizzes = snap.docs
                    .map(function(doc) { var d = doc.data(); d._fid = doc.id; return d; })
                    .filter(function(d) { return d.active === true; })
                    .slice(0, 10);
                _render();
            }, function(err) {
                console.warn('[quiz.js]', err);
            });
    }

    /* ---- Floating hint FAB ------------------------------------ */
    function _updateFab() {
        var fab = document.getElementById('quiz-hint-fab');
        if (!fab) return;
        if (_quizzes.length > 0) {
            var section = document.getElementById('quiz');
            var visible = section && section.getBoundingClientRect().top < window.innerHeight * 0.8;
            fab.style.display = visible ? 'none' : '';
        } else {
            fab.style.display = 'none';
        }
    }

    window.addEventListener('scroll', _updateFab, { passive: true });

    /* ---- Render cards ----------------------------------------- */
    function _render() {
        var container = document.getElementById('quiz-display');
        if (!container) return;
        var section = document.getElementById('quiz');
        if (!_quizzes.length) {
            if (section) section.style.display = 'none';
            _updateFab();
            return;
        }
        if (section) section.style.display = '';
        _updateFab();

        container.innerHTML = _quizzes.map(function(q) {
            var cat  = _CATS[q.category] || _CATS.generale;
            var nq   = Array.isArray(q.questions) ? q.questions.length : 0;
            var done = _isDone(q._fid);
            var prev = done ? _getDone(q._fid) : null;
            return '<div class="quiz-card' + (done ? ' quiz-card--done' : '') + '" role="button" tabindex="0"'
                + ' style="--cat-color:' + cat.color + '"'
                + ' data-quiz-fid="' + _esc(q._fid) + '">'
                + '<div class="quiz-card-cat" style="color:' + cat.color + '">' + _esc(cat.label) + '</div>'
                + '<h3 class="quiz-card-title">' + _esc(q.title || 'Quiz') + '</h3>'
                + '<p class="quiz-card-desc">' + _esc(q.desc || '') + '</p>'
                + '<div class="quiz-card-foot">'
                + '<span class="quiz-card-nq">&#10067; ' + nq + ' domande</span>'
                + (done
                    ? '<span class="quiz-card-done">&#10003; ' + prev.score + '/' + prev.total + ' — già completato</span>'
                    : '<span class="quiz-card-play">Gioca &#8594;</span>')
                + '</div>'
                + '</div>';
        }).join('');
    }

    /* ---- Open quiz -------------------------------------------- */
    function _quizOpen(fid) {
        var q = _quizzes.find(function(x) { return x._fid === fid; });
        if (!q || !Array.isArray(q.questions) || !q.questions.length) return;
        _activeQuiz = q;
        _showModal();

        if (_isDone(fid)) {
            _renderAlreadyDone();
        } else {
            _renderNameStep();
        }
    }

    function _showModal() {
        var m = document.getElementById('quiz-modal');
        if (m) {
            m.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    window.closeQuizModal = function() {
        var m = document.getElementById('quiz-modal');
        if (m) {
            m.classList.add('hidden');
            document.body.style.overflow = '';
        }
        _activeQuiz = null;
    };

    /* ---- Name step -------------------------------------------- */
    function _renderNameStep() {
        var c = document.getElementById('quiz-modal-content');
        if (!c || !_activeQuiz) return;
        var cat = _CATS[_activeQuiz.category] || _CATS.generale;
        var saved = _savedName();

        c.innerHTML = '<div class="qm-name-step">'
            + '<div class="qm-name-cat" style="color:' + cat.color + '">' + _esc(cat.label) + '</div>'
            + '<h2 class="qm-name-title">' + _esc(_activeQuiz.title || 'Quiz') + '</h2>'
            + '<p class="qm-name-desc">Inserisci il tuo nome per partecipare alla classifica</p>'
            + '<input id="qm-name-input" class="qm-name-input" type="text" maxlength="30"'
            + ' placeholder="Il tuo nome…" value="' + _esc(saved) + '" autocomplete="off">'
            + '<p class="qm-name-note">&#9888; Puoi completare questo quiz <strong>una sola volta</strong></p>'
            + '<button class="qm-btn-start" data-action="quiz-start">&#9654; Inizia il Quiz</button>'
            + '</div>';

        var input = document.getElementById('qm-name-input');
        if (input) setTimeout(function() { input.focus(); }, 60);
    }

    function _startFromNameStep() {
        var input = document.getElementById('qm-name-input');
        var nome = input ? input.value.trim() : '';
        if (!nome) {
            if (input) { input.classList.add('qm-input--err'); input.focus(); }
            return;
        }
        _saveName(nome);
        _playerName = nome;
        _currentQ   = 0;
        _score      = 0;
        _renderQuestion();
    }

    /* ---- Render question -------------------------------------- */
    function _renderQuestion() {
        var c = document.getElementById('quiz-modal-content');
        if (!c || !_activeQuiz) return;
        var qObj  = _activeQuiz.questions[_currentQ];
        var total = _activeQuiz.questions.length;
        var pct   = Math.round((_currentQ / total) * 100);

        c.innerHTML = '<div class="qm-header">'
            + '<div class="qm-title">' + _esc(_activeQuiz.title) + '</div>'
            + '<div class="qm-progress-wrap"><div class="qm-progress-bar" style="width:' + pct + '%"></div></div>'
            + '<div class="qm-counter">' + (_currentQ + 1) + ' / ' + total + '</div>'
            + '</div>'
            + '<div class="qm-question">' + _esc(qObj.q || '') + '</div>'
            + '<div class="qm-opts">'
            + (qObj.opts || []).map(function(opt, i) {
                return '<button class="qm-opt" data-ans-idx="' + i + '">'
                    + _esc(opt) + '</button>';
            }).join('')
            + '</div>';
    }

    /* ---- Answer ----------------------------------------------- */
    function _quizAnswer(idx) {
        if (!_activeQuiz) return;
        var qObj    = _activeQuiz.questions[_currentQ];
        var correct = typeof qObj.correct === 'number' ? qObj.correct : -1;
        if (idx === correct) _score++;

        var opts = document.querySelectorAll('.qm-opt');
        opts.forEach(function(btn, i) {
            btn.disabled = true;
            if (i === correct) btn.classList.add('qm-opt--correct');
            else if (i === idx && idx !== correct) btn.classList.add('qm-opt--wrong');
        });

        setTimeout(function() {
            _currentQ++;
            if (_currentQ >= _activeQuiz.questions.length) {
                _saveResult();
            } else {
                _renderQuestion();
            }
        }, 900);
    }

    /* ---- Save result to Firestore + localStorage -------------- */
    function _saveResult() {
        var fid   = _activeQuiz._fid;
        var score = _score;
        var total = _activeQuiz.questions.length;

        _markDone(fid, score, total);
        _render(); // aggiorna badge "già completato" sulle card

        var entry = {
            quizId:      fid,
            quizTitle:   _activeQuiz.title || '',
            nome:        _playerName,
            score:       score,
            total:       total,
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (typeof _fbMainDb !== 'undefined' && _fbMainDb) {
            _fbMainDb.collection('quiz_results').add(entry)
                .then(function() { _renderResult(score, total, fid); })
                .catch(function() { _renderResult(score, total, fid); });
        } else {
            _renderResult(score, total, fid);
        }
    }

    /* ---- Result ----------------------------------------------- */
    function _renderResult(score, total, fid) {
        var c = document.getElementById('quiz-modal-content');
        if (!c) return;
        var pct = Math.round((score / total) * 100);
        var msg = pct >= 80
            ? '&#127942; Sei un vero esperto!'
            : pct >= 50
                ? '&#128522; Niente male, continua ad allenarti!'
                : '&#128540; Serve più allenamento!';

        c.innerHTML = '<div class="qm-result">'
            + '<div class="qm-result-ring">'
            + '<svg viewBox="0 0 100 100" class="qm-result-svg">'
            + '<circle class="qm-ring-bg" cx="50" cy="50" r="42" fill="none" stroke-width="10"/>'
            + '<circle class="qm-ring-fill" cx="50" cy="50" r="42" fill="none" stroke-width="10"'
            + ' stroke-dasharray="' + Math.round(pct * 2.638) + ' 264" stroke-dashoffset="0"/>'
            + '</svg>'
            + '<div class="qm-result-inner">'
            + '<div class="qm-result-score">' + score + '<span>/' + total + '</span></div>'
            + '<div class="qm-result-pct">' + pct + '%</div>'
            + '</div>'
            + '</div>'
            + '<div class="qm-result-msg">' + msg + '</div>'
            + '<div id="qm-leaderboard" class="qm-leaderboard"><div class="qm-lb-loading">Caricamento classifica…</div></div>'
            + '<div class="qm-result-btns">'
            + '<button class="qm-btn-close">Chiudi</button>'
            + '</div>'
            + '</div>';

        _loadLeaderboard(fid);
    }

    /* ---- Already done ----------------------------------------- */
    function _renderAlreadyDone() {
        var c = document.getElementById('quiz-modal-content');
        if (!c || !_activeQuiz) return;
        var fid  = _activeQuiz._fid;
        var prev = _getDone(fid);
        var score = prev ? prev.score : 0;
        var total = prev ? prev.total : _activeQuiz.questions.length;
        var pct   = total > 0 ? Math.round((score / total) * 100) : 0;

        c.innerHTML = '<div class="qm-result">'
            + '<div class="qm-already-badge">&#10003; Già completato</div>'
            + '<div class="qm-result-ring">'
            + '<svg viewBox="0 0 100 100" class="qm-result-svg">'
            + '<circle class="qm-ring-bg" cx="50" cy="50" r="42" fill="none" stroke-width="10"/>'
            + '<circle class="qm-ring-fill" cx="50" cy="50" r="42" fill="none" stroke-width="10"'
            + ' stroke-dasharray="' + Math.round(pct * 2.638) + ' 264" stroke-dashoffset="0"/>'
            + '</svg>'
            + '<div class="qm-result-inner">'
            + '<div class="qm-result-score">' + score + '<span>/' + total + '</span></div>'
            + '<div class="qm-result-pct">' + pct + '%</div>'
            + '</div>'
            + '</div>'
            + '<div class="qm-result-msg">Il tuo punteggio salvato</div>'
            + '<div id="qm-leaderboard" class="qm-leaderboard"><div class="qm-lb-loading">Caricamento classifica…</div></div>'
            + '<div class="qm-result-btns">'
            + '<button class="qm-btn-close">Chiudi</button>'
            + '</div>'
            + '</div>';

        _loadLeaderboard(fid);
    }

    /* ---- Leaderboard ------------------------------------------ */
    function _loadLeaderboard(fid) {
        var el = document.getElementById('qm-leaderboard');
        if (!el) return;
        if (typeof _fbMainDb === 'undefined' || !_fbMainDb) {
            el.innerHTML = '';
            return;
        }

        _fbMainDb.collection('quiz_results')
            .where('quizId', '==', fid)
            .orderBy('score', 'desc')
            .limit(10)
            .get()
            .then(function(snap) {
                if (snap.empty) { el.innerHTML = '<p class="qm-lb-empty">Sii il primo in classifica!</p>'; return; }
                var rows = snap.docs.map(function(doc) { return doc.data(); });
                // sort: score desc, completedAt asc (chi ha finito prima vince in caso di parità)
                rows.sort(function(a, b) {
                    if (b.score !== a.score) return b.score - a.score;
                    var ta = a.completedAt ? a.completedAt.toMillis() : 0;
                    var tb = b.completedAt ? b.completedAt.toMillis() : 0;
                    return ta - tb;
                });
                var medals = ['🥇','🥈','🥉'];
                var html = '<h4 class="qm-lb-title">&#127942; Classifica</h4>'
                    + '<ol class="qm-lb-list">';
                rows.forEach(function(r, i) {
                    var pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                    var isMe = r.nome === _playerName && _playerName;
                    html += '<li class="qm-lb-row' + (isMe ? ' qm-lb-row--me' : '') + '">'
                        + '<span class="qm-lb-pos">' + (medals[i] || (i + 1) + '.') + '</span>'
                        + '<span class="qm-lb-name">' + _esc(r.nome || 'Anonimo') + '</span>'
                        + '<span class="qm-lb-score">' + r.score + '/' + r.total
                        + ' <span class="qm-lb-pct">(' + pct + '%)</span></span>'
                        + '</li>';
                });
                html += '</ol>';
                el.innerHTML = html;
            })
            .catch(function() {
                el.innerHTML = '<p class="qm-lb-empty">Classifica non disponibile</p>';
            });
    }

    /* ---- Event delegation ------------------------------------- */
    document.addEventListener('click', function(e) {
        /* card quiz */
        var card = e.target.closest('[data-quiz-fid]');
        if (card) { _quizOpen(card.getAttribute('data-quiz-fid')); return; }

        /* inizia quiz (dal name step) */
        if (e.target.closest('[data-action="quiz-start"]')) { _startFromNameStep(); return; }

        /* risposta */
        var ans = e.target.closest('.qm-opt[data-ans-idx]');
        if (ans && !ans.disabled) { _quizAnswer(parseInt(ans.getAttribute('data-ans-idx'), 10)); return; }

        /* chiudi */
        if (e.target.closest('.qm-btn-close')) { window.closeQuizModal(); return; }

        /* chiudi click sul backdrop */
        if (e.target.closest('.quiz-modal-backdrop')) { window.closeQuizModal(); return; }
    });

    /* ---- Keyboard -------------------------------------------- */
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            var m = document.getElementById('quiz-modal');
            if (m && !m.classList.contains('hidden')) window.closeQuizModal();
            return;
        }
        if (e.key === 'Enter') {
            /* Enter su card quiz */
            var card = document.activeElement && document.activeElement.closest('[data-quiz-fid]');
            if (card) { e.preventDefault(); _quizOpen(card.getAttribute('data-quiz-fid')); return; }
            /* Enter nel campo nome */
            if (document.activeElement && document.activeElement.id === 'qm-name-input') {
                e.preventDefault();
                _startFromNameStep();
            }
        }
    });

    /* ---- Start ------------------------------------------------ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();
