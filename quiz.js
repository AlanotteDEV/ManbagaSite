/* ============================================================
   quiz.js — Quiz Manga & Anime — MANBAGA
   ============================================================ */
(function() {
    'use strict';

    var _quizzes    = [];
    var _activeQuiz = null;
    var _currentQ   = 0;
    var _score      = 0;

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
            /* Mostra solo se la sezione quiz non è già visibile a schermo */
            var section = document.getElementById('quiz');
            var visible = section && section.getBoundingClientRect().top < window.innerHeight * 0.8;
            fab.style.display = visible ? 'none' : '';
        } else {
            fab.style.display = 'none';
        }
    }

    /* Nascondi il FAB quando l'utente scrolla verso la sezione quiz */
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
            var cat = _CATS[q.category] || _CATS.generale;
            var nq  = Array.isArray(q.questions) ? q.questions.length : 0;
            /* data-fid invece di onclick inline con _fid */
            return '<div class="quiz-card" role="button" tabindex="0"'
                + ' style="--cat-color:' + cat.color + '"'
                + ' data-quiz-fid="' + _esc(q._fid) + '">'
                + '<div class="quiz-card-cat" style="color:' + cat.color + '">' + _esc(cat.label) + '</div>'
                + '<h3 class="quiz-card-title">' + _esc(q.title || 'Quiz') + '</h3>'
                + '<p class="quiz-card-desc">' + _esc(q.desc || '') + '</p>'
                + '<div class="quiz-card-foot">'
                + '<span class="quiz-card-nq">&#10067; ' + nq + ' domande</span>'
                + '<span class="quiz-card-play">Gioca &#8594;</span>'
                + '</div>'
                + '</div>';
        }).join('');
    }

    /* ---- Open quiz -------------------------------------------- */
    function _quizOpen(fid) {
        var q = _quizzes.find(function(x) { return x._fid === fid; });
        if (!q || !Array.isArray(q.questions) || !q.questions.length) return;
        _activeQuiz = q;
        _currentQ   = 0;
        _score      = 0;
        _showModal();
        _renderQuestion();
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

    /* ---- Render question -------------------------------------- */
    function _renderQuestion() {
        var c = document.getElementById('quiz-modal-content');
        if (!c || !_activeQuiz) return;
        var qObj  = _activeQuiz.questions[_currentQ];
        var total = _activeQuiz.questions.length;
        var pct   = Math.round((_currentQ / total) * 100);

        /* data-idx invece di onclick inline con indice */
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
                _renderResult();
            } else {
                _renderQuestion();
            }
        }, 900);
    }

    /* ---- Result ----------------------------------------------- */
    function _renderResult() {
        var c = document.getElementById('quiz-modal-content');
        if (!c || !_activeQuiz) return;
        var total = _activeQuiz.questions.length;
        var pct   = Math.round((_score / total) * 100);
        var msg   = pct >= 80
            ? '&#127942; Sei un vero esperto!'
            : pct >= 50
                ? '&#128522; Niente male, continua ad allenarti!'
                : '&#128540; Serve più allenamento!';

        /* data-redo-fid invece di onclick inline */
        c.innerHTML = '<div class="qm-result">'
            + '<div class="qm-result-ring">'
            + '<svg viewBox="0 0 100 100" class="qm-result-svg">'
            + '<circle class="qm-ring-bg" cx="50" cy="50" r="42" fill="none" stroke-width="10"/>'
            + '<circle class="qm-ring-fill" cx="50" cy="50" r="42" fill="none" stroke-width="10"'
            + ' stroke-dasharray="' + Math.round(pct * 2.638) + ' 264" stroke-dashoffset="0"/>'
            + '</svg>'
            + '<div class="qm-result-inner">'
            + '<div class="qm-result-score">' + _score + '<span>/' + total + '</span></div>'
            + '<div class="qm-result-pct">' + pct + '%</div>'
            + '</div>'
            + '</div>'
            + '<div class="qm-result-msg">' + msg + '</div>'
            + '<div class="qm-result-btns">'
            + '<button class="qm-btn-redo" data-redo-fid="' + _esc(_activeQuiz._fid) + '">&#128260; Rigioca</button>'
            + '<button class="qm-btn-close">Chiudi</button>'
            + '</div>'
            + '</div>';
    }

    /* ---- Event delegation (sostituisce tutti gli onclick inline) */
    document.addEventListener('click', function(e) {
        /* card quiz */
        var card = e.target.closest('[data-quiz-fid]');
        if (card) { _quizOpen(card.getAttribute('data-quiz-fid')); return; }

        /* risposta */
        var ans = e.target.closest('.qm-opt[data-ans-idx]');
        if (ans && !ans.disabled) { _quizAnswer(parseInt(ans.getAttribute('data-ans-idx'), 10)); return; }

        /* rigioca */
        var redo = e.target.closest('[data-redo-fid]');
        if (redo) { _quizOpen(redo.getAttribute('data-redo-fid')); return; }

        /* chiudi (bottone interno) */
        if (e.target.closest('.qm-btn-close')) { window.closeQuizModal(); return; }
    });

    /* ---- Keyboard -------------------------------------------- */
    document.addEventListener('keydown', function(e) {
        /* Escape chiude */
        if (e.key === 'Escape') {
            var m = document.getElementById('quiz-modal');
            if (m && !m.classList.contains('hidden')) window.closeQuizModal();
            return;
        }
        /* Enter/Space su card quiz */
        if (e.key === 'Enter' || e.key === ' ') {
            var card = document.activeElement && document.activeElement.closest('[data-quiz-fid]');
            if (card) {
                e.preventDefault();
                _quizOpen(card.getAttribute('data-quiz-fid'));
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
