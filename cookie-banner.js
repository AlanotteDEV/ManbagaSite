/**
 * MANBAGA Cookie Banner — GDPR compliant
 * Include this script in every page BEFORE </body>
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'manbaga_cookie_consent';

    // Already accepted → do nothing
    if (localStorage.getItem(STORAGE_KEY)) return;

    /* ── Inject styles ─────────────────────────────────────────── */
    var css = `
    #mb-cookie-banner {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        z-index: 99999;
        background: rgba(10,10,10,0.98);
        backdrop-filter: blur(16px);
        border-top: 2px solid rgba(244,114,182,0.3);
        padding: 18px 24px;
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
        box-shadow: 0 -8px 40px rgba(0,0,0,0.6);
        animation: mbCookieIn 0.4s cubic-bezier(0.19,1,0.22,1) forwards;
        font-family: 'Inter', sans-serif;
    }
    @keyframes mbCookieIn {
        from { transform: translateY(100%); opacity: 0; }
        to   { transform: none; opacity: 1; }
    }
    #mb-cookie-banner.out {
        animation: mbCookieOut 0.3s ease forwards;
    }
    @keyframes mbCookieOut {
        from { transform: none; opacity: 1; }
        to   { transform: translateY(100%); opacity: 0; }
    }
    #mb-cookie-banner .mb-cookie-icon {
        font-size: 26px;
        flex-shrink: 0;
    }
    #mb-cookie-banner .mb-cookie-text {
        flex: 1;
        min-width: 220px;
        font-size: 13px;
        font-weight: 500;
        color: rgba(245,240,232,0.75);
        line-height: 1.5;
        letter-spacing: 0.01em;
    }
    #mb-cookie-banner .mb-cookie-text strong {
        color: rgba(245,240,232,0.95);
        font-weight: 700;
    }
    #mb-cookie-banner .mb-cookie-text a {
        color: #F472B6;
        text-decoration: none;
        font-weight: 600;
        transition: opacity .2s;
    }
    #mb-cookie-banner .mb-cookie-text a:hover { opacity: 0.75; }
    #mb-cookie-banner .mb-cookie-actions {
        display: flex;
        gap: 10px;
        flex-shrink: 0;
        flex-wrap: wrap;
        align-items: center;
    }
    #mb-cookie-banner .mb-btn-necessary {
        padding: 9px 18px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 20px;
        color: rgba(245,240,232,0.55);
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        cursor: pointer;
        transition: all .2s;
        white-space: nowrap;
    }
    #mb-cookie-banner .mb-btn-necessary:hover {
        border-color: rgba(255,255,255,0.28);
        color: rgba(245,240,232,0.85);
    }
    #mb-cookie-banner .mb-btn-accept {
        padding: 9px 22px;
        background: linear-gradient(135deg, #F472B6, #e11d8d);
        border: none;
        border-radius: 20px;
        color: #fff;
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        cursor: pointer;
        transition: all .2s;
        white-space: nowrap;
        box-shadow: 0 4px 14px rgba(244,114,182,0.35);
    }
    #mb-cookie-banner .mb-btn-accept:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(244,114,182,0.5);
    }
    @media (max-width: 600px) {
        #mb-cookie-banner {
            flex-direction: column;
            align-items: flex-start;
            padding: 16px 16px 20px;
            gap: 14px;
        }
        #mb-cookie-banner .mb-cookie-actions {
            width: 100%;
            justify-content: stretch;
        }
        #mb-cookie-banner .mb-btn-necessary,
        #mb-cookie-banner .mb-btn-accept {
            flex: 1;
            text-align: center;
        }
    }`;

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    /* ── Inject HTML ───────────────────────────────────────────── */
    var banner = document.createElement('div');
    banner.id  = 'mb-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Consenso cookie');
    banner.innerHTML = `
        <span class="mb-cookie-icon" aria-hidden="true">🍪</span>
        <div class="mb-cookie-text">
            <strong>Questo sito usa i cookie.</strong>
            Utilizziamo cookie tecnici essenziali per il funzionamento del sito (autenticazione Firebase, prenotazioni).
            Leggi la nostra <a href="privacy.html">Privacy &amp; Cookie Policy</a>.
        </div>
        <div class="mb-cookie-actions">
            <button class="mb-btn-necessary" onclick="mbAcceptCookies('necessary')">Solo necessari</button>
            <button class="mb-btn-accept"    onclick="mbAcceptCookies('all')">Accetta tutti 🌸</button>
        </div>`;

    // Wait for DOM ready
    function appendBanner() {
        document.body.appendChild(banner);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', appendBanner);
    } else {
        appendBanner();
    }

    /* ── Accept handler ────────────────────────────────────────── */
    window.mbAcceptCookies = function (type) {
        localStorage.setItem(STORAGE_KEY, type);
        banner.classList.add('out');
        setTimeout(function () { banner.remove(); }, 320);
    };
})();

/* ── Reset / gestisci cookie (chiamato dal footer) ─────────── */
window.mbResetCookies = function () {
    var STORAGE_KEY = 'manbaga_cookie_consent';
    localStorage.removeItem(STORAGE_KEY);
    /* Ricrea il banner senza ricaricare la pagina */
    var existing = document.getElementById('mb-cookie-banner');
    if (existing) existing.remove();
    /* Richiama lo script inline per ricreare il banner */
    var s = document.createElement('script');
    s.src = 'cookie-banner.js?' + Date.now();
    document.body.appendChild(s);
};
