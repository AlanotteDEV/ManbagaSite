/**
 * MANBAGA Cookie Banner
 * ─────────────────────────────────────────────────────────────────
 * Conforme a:
 *   · Reg. UE 2016/679 (GDPR), art. 13
 *   · D.Lgs. 196/2003 (Codice Privacy), art. 122
 *   · Linee Guida Garante Privacy, 10 giugno 2021
 *
 * Questo sito usa ESCLUSIVAMENTE cookie tecnici strettamente necessari.
 * Per legge non è richiesto il consenso: il banner è un obbligo
 * di trasparenza (art. 13 GDPR), non di raccolta del consenso.
 * Un unico pulsante "Ho capito" è la scelta corretta — avere
 * "Accetta / Rifiuta" senza cookie facoltativi costituirebbe
 * dark pattern (vietato dalle Linee Guida Garante 2021).
 * ─────────────────────────────────────────────────────────────────
 */
(function () {
    'use strict';

    var KEY = 'manbaga_cookie_v2';
    if (localStorage.getItem(KEY)) return;

    /* ── Percorso privacy policy (tutte le pagine pubbliche sono in root) ── */
    var POLICY_URL = 'privacy.html';

    /* ══════════════════════════════════════════════════════════════
       CSS
    ══════════════════════════════════════════════════════════════ */
    var css = `
    /* Overlay leggero per dare risalto al banner */
    #mb-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0);
        z-index: 99990;
        pointer-events: none;
    }

    /* Banner container */
    #mb-cookie-banner {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(calc(100% + 24px));
        z-index: 99999;
        width: min(680px, calc(100vw - 32px));
        background: #111111;
        border: 1px solid rgba(255,255,255,0.09);
        border-top: 2px solid #DC2626;
        border-radius: 16px;
        box-shadow:
            0 24px 60px rgba(0,0,0,0.7),
            0 2px 0 rgba(220,38,38,0.4) inset;
        padding: 20px 22px 18px;
        font-family: 'Inter', -apple-system, sans-serif;
        opacity: 0;
        transition: transform 0.42s cubic-bezier(0.19,1,0.22,1),
                    opacity   0.42s cubic-bezier(0.19,1,0.22,1);
        will-change: transform, opacity;
    }
    #mb-cookie-banner.mb-in {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
    #mb-cookie-banner.mb-out {
        transform: translateX(-50%) translateY(calc(100% + 24px));
        opacity: 0;
    }

    /* Header row */
    #mb-cookie-banner .mb-head {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
    }
    #mb-cookie-banner .mb-shield {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px; height: 32px;
        border-radius: 8px;
        background: rgba(220,38,38,0.12);
        border: 1px solid rgba(220,38,38,0.2);
        color: #DC2626;
    }
    #mb-cookie-banner .mb-title {
        font-size: 14px;
        font-weight: 700;
        color: rgba(245,240,232,0.95);
        letter-spacing: 0.01em;
        flex: 1;
    }
    #mb-cookie-banner .mb-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px;
        background: rgba(34,197,94,0.1);
        border: 1px solid rgba(34,197,94,0.22);
        border-radius: 20px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #4ade80;
        white-space: nowrap;
        flex-shrink: 0;
    }
    #mb-cookie-banner .mb-badge-dot {
        width: 5px; height: 5px;
        border-radius: 50%;
        background: #4ade80;
        box-shadow: 0 0 5px #4ade80;
    }

    /* Body text */
    #mb-cookie-banner .mb-body {
        font-size: 12.5px;
        color: rgba(245,240,232,0.55);
        line-height: 1.6;
        margin-bottom: 16px;
    }
    #mb-cookie-banner .mb-body a {
        color: rgba(245,240,232,0.75);
        font-weight: 600;
        text-decoration: underline;
        text-underline-offset: 3px;
        transition: color .2s;
    }
    #mb-cookie-banner .mb-body a:hover { color: #f5f0e8; }

    /* Cookie chips */
    #mb-cookie-banner .mb-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 16px;
    }
    #mb-cookie-banner .mb-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        font-size: 10.5px;
        font-weight: 600;
        color: rgba(245,240,232,0.45);
        letter-spacing: 0.02em;
    }
    #mb-cookie-banner .mb-chip-icon {
        font-size: 11px;
    }

    /* Footer row */
    #mb-cookie-banner .mb-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-top: 1px solid rgba(255,255,255,0.06);
        padding-top: 14px;
    }
    #mb-cookie-banner .mb-legal {
        font-size: 10px;
        color: rgba(245,240,232,0.28);
        line-height: 1.4;
        flex: 1;
    }
    #mb-cookie-banner .mb-legal strong {
        color: rgba(245,240,232,0.4);
    }
    #mb-cookie-banner .mb-btn-ok {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 10px 22px;
        background: #DC2626;
        border: none;
        border-radius: 10px;
        color: #fff;
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
        transition: background .18s, transform .18s, box-shadow .18s;
        flex-shrink: 0;
        box-shadow: 0 4px 16px rgba(220,38,38,0.35);
        outline: none;
    }
    #mb-cookie-banner .mb-btn-ok:hover {
        background: #b91c1c;
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(220,38,38,0.5);
    }
    #mb-cookie-banner .mb-btn-ok:focus-visible {
        outline: 2px solid #f87171;
        outline-offset: 3px;
    }
    #mb-cookie-banner .mb-btn-ok:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(220,38,38,0.3);
    }

    /* Responsive */
    @media (max-width: 520px) {
        #mb-cookie-banner {
            bottom: 0;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
            border-left: none;
            border-right: none;
            width: 100%;
        }
        #mb-cookie-banner.mb-in {
            transform: translateX(-50%) translateY(0);
        }
        #mb-cookie-banner.mb-out {
            transform: translateX(-50%) translateY(100%);
        }
        #mb-cookie-banner .mb-badge { display: none; }
        #mb-cookie-banner .mb-foot {
            flex-direction: column;
            align-items: stretch;
        }
        #mb-cookie-banner .mb-btn-ok {
            justify-content: center;
            padding: 13px;
        }
        #mb-cookie-banner .mb-chips { display: none; }
    }`;

    var styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    /* ══════════════════════════════════════════════════════════════
       HTML
    ══════════════════════════════════════════════════════════════ */
    var banner = document.createElement('div');
    banner.id = 'mb-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'true');
    banner.setAttribute('aria-label', 'Informativa cookie');
    banner.setAttribute('aria-describedby', 'mb-cookie-desc');

    banner.innerHTML =
        '<div class="mb-head">' +
            '<div class="mb-shield" aria-hidden="true">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">' +
                    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' +
                '</svg>' +
            '</div>' +
            '<span class="mb-title">Cookie &amp; Privacy</span>' +
            '<span class="mb-badge"><span class="mb-badge-dot"></span>Solo tecnici</span>' +
        '</div>' +

        '<p class="mb-body" id="mb-cookie-desc">' +
            'Questo sito utilizza esclusivamente <strong style="color:rgba(245,240,232,0.8)">cookie tecnici strettamente necessari</strong> ' +
            'al funzionamento dei servizi (autenticazione, prenotazioni, catalogo). ' +
            'Nessun cookie di profilazione, analytics o pubblicit\u00e0. ' +
            'Per legge non \u00e8 richiesto il tuo consenso per i cookie tecnici &mdash; ' +
            'questo avviso \u00e8 solo un obbligo di trasparenza ai sensi dell\u2019art.&nbsp;13 GDPR.<br>' +
            '<a href="' + POLICY_URL + '" target="_blank" rel="noopener">Leggi la Privacy &amp; Cookie Policy completa \u2197</a>' +
        '</p>' +

        '<div class="mb-chips" aria-hidden="true">' +
            '<span class="mb-chip"><span class="mb-chip-icon">\uD83D\uDD25</span> Firebase Auth</span>' +
            '<span class="mb-chip"><span class="mb-chip-icon">\uD83D\uDD25</span> Firebase Firestore</span>' +
            '<span class="mb-chip"><span class="mb-chip-icon">\uD83D\uDD25</span> Firebase Realtime DB</span>' +
            '<span class="mb-chip"><span class="mb-chip-icon">\uD83D\uDD25</span> EmailJS</span>' +
            '<span class="mb-chip" title="Player caricato solo su click — opt-in"><span class="mb-chip-icon">&#9654;</span> Twitch (opt-in)</span>' +
        '</div>' +

        '<div class="mb-foot">' +
            '<p class="mb-legal">' +
                '<strong>Art. 122 D.Lgs. 196/2003 &middot; Linee Guida Garante 10/06/2021</strong><br>' +
                'I cookie tecnici non richiedono consenso. Puoi eliminarli dal tuo browser in qualsiasi momento.' +
            '</p>' +
            '<button class="mb-btn-ok" id="mb-btn-ok" type="button">' +
                '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" aria-hidden="true">' +
                    '<polyline points="20 6 9 17 4 12"/>' +
                '</svg>' +
                'Ho capito' +
            '</button>' +
        '</div>';

    /* ══════════════════════════════════════════════════════════════
       Mount & animate in
    ══════════════════════════════════════════════════════════════ */
    function mount() {
        document.body.appendChild(banner);
        /* Trigger animation after paint */
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                banner.classList.add('mb-in');
                /* Focus il pulsante per accessibilità da tastiera */
                var btn = document.getElementById('mb-btn-ok');
                if (btn) btn.focus();
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }

    /* ══════════════════════════════════════════════════════════════
       Close logic
    ══════════════════════════════════════════════════════════════ */
    function closeBanner() {
        /* Salva timestamp dell'acknowledgement */
        localStorage.setItem(KEY, JSON.stringify({
            ts: new Date().toISOString(),
            v: '2'
        }));
        banner.classList.remove('mb-in');
        banner.classList.add('mb-out');
        setTimeout(function () {
            if (banner.parentNode) banner.parentNode.removeChild(banner);
        }, 440);
    }

    /* Pulsante "Ho capito" */
    banner.addEventListener('click', function (e) {
        if (e.target && e.target.closest('#mb-btn-ok')) closeBanner();
    });

    /* Tasto Escape */
    document.addEventListener('keydown', function onKey(e) {
        if ((e.key === 'Escape' || e.keyCode === 27) && document.getElementById('mb-cookie-banner')) {
            closeBanner();
            document.removeEventListener('keydown', onKey);
        }
    });

})();

/* ══════════════════════════════════════════════════════════════
   Reset — chiamato da "Gestisci cookie" nel footer
   Rimuove il consenso e ricarica il banner
══════════════════════════════════════════════════════════════ */
window.mbResetCookies = function () {
    localStorage.removeItem('manbaga_cookie_v2');
    /* Retrocompatibilità con vecchia chiave */
    localStorage.removeItem('manbaga_cookie_consent');

    var existing = document.getElementById('mb-cookie-banner');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var s = document.createElement('script');
    s.src = 'cookie-banner.js?' + Date.now();
    document.body.appendChild(s);
};
