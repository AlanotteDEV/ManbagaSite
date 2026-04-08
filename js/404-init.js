/* ============================================================
   404-init.js — script di inizializzazione per 404.html
   ============================================================ */
/* Auto-redirect after 30s */
var _countdown = 30;
var _t = setInterval(function () {
    _countdown--;
    if (_countdown <= 0) { clearInterval(_t); window.location.href = 'index.html'; }
}, 1000);

/* Back button */
var _backBtn = document.getElementById('back-btn');
if (_backBtn) {
    _backBtn.addEventListener('click', function (e) {
        e.preventDefault();
        history.back();
    });
}
