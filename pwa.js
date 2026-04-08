/* ============================================================
   pwa.js — PWA install banner logic
   ============================================================ */
(function () {
    'use strict';
    var _deferredPrompt = null;

    function _banner() { return document.getElementById('pwa-banner'); }

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        _deferredPrompt = e;
        if (!sessionStorage.getItem('pwa-dismissed')) {
            setTimeout(function () {
                var b = _banner();
                if (b) b.style.display = 'block';
            }, 2000);
        }
    });

    window._pwaInstall = function () {
        if (!_deferredPrompt) return;
        _deferredPrompt.prompt();
        _deferredPrompt.userChoice.then(function () {
            _deferredPrompt = null;
            var b = _banner();
            if (b) b.style.display = 'none';
        });
    };

    window._pwaDismiss = function () {
        var b = _banner();
        if (b) b.style.display = 'none';
        sessionStorage.setItem('pwa-dismissed', '1');
    };

    /* Service Worker registration */
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        /* Bottoni banner PWA */
        var btnDismiss = document.getElementById('pwa-btn-dismiss');
        var btnInstall = document.getElementById('pwa-btn-install');
        if (btnDismiss) btnDismiss.addEventListener('click', window._pwaDismiss);
        if (btnInstall) btnInstall.addEventListener('click', window._pwaInstall);

        /* iOS Safari: non ha beforeinstallprompt */
        var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
        var isStandalone = ('standalone' in navigator && navigator.standalone);
        if (isIos && !isStandalone && !sessionStorage.getItem('pwa-dismissed')) {
            setTimeout(function () {
                var b = _banner();
                if (b) b.style.display = 'block';
            }, 2000);
            if (btnInstall) {
                btnInstall.textContent = 'Come fare?';
                btnInstall.addEventListener('click', function () {
                    alert('Su Safari: tocca il tasto Condividi (□↑) in basso, poi "Aggiungi a schermata Home".');
                }, { once: true });
            }
        }
    });
})();
