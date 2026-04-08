/* ============================================================
   MANGA MODE — Easter Egg
   Sequenza: ↓ ↓ ↑ ↑ ↓ ←
   Stessa sequenza per disattivare
   ============================================================ */
(function () {
    var SEQ = ['ArrowDown','ArrowDown','ArrowUp','ArrowUp','ArrowDown','ArrowLeft'];
    var _idx = 0;
    var _active = false;

    /* ── Iniezione CSS ── */
    var _style = document.createElement('style');
    _style.textContent = [

        /* 1. Bianco/nero su tutto */
        'body.manga-mode {',
        '  filter: grayscale(1) contrast(1.2) brightness(1.05);',
        '  transition: filter .6s ease;',
        '}',

        /* 2. Screentone: div separato per non interferire con layout */
        '#manga-screentone {',
        '  position:fixed;inset:0;z-index:9990;pointer-events:none;',
        '  background-image: radial-gradient(circle, rgba(0,0,0,0.12) 1px, transparent 1px);',
        '  background-size: 5px 5px;',
        '  opacity:0; transition: opacity .6s ease;',
        '}',
        '#manga-screentone.visible { opacity:1; }',

        /* 3. Bordi panel stile manga su card e sezioni — solo outline, no layout */
        'body.manga-mode .cat-card,',
        'body.manga-mode .ev-card,',
        'body.manga-mode .cp-card,',
        'body.manga-mode .product-card {',
        '  outline: 3px solid rgba(0,0,0,0.55);',
        '  outline-offset: -3px;',
        '}',

        /* 4. Titoli con stroke fumetto */
        'body.manga-mode h1,',
        'body.manga-mode h2,',
        'body.manga-mode .nav-logo,',
        'body.manga-mode .cat-title,',
        'body.manga-mode .hero-title {',
        '  -webkit-text-stroke: 1px rgba(0,0,0,0.4);',
        '  text-shadow: 3px 3px 0 rgba(0,0,0,0.15);',
        '}',

        /* 5. Flash bianco di attivazione */
        '#manga-flash {',
        '  position:fixed;inset:0;z-index:10000;pointer-events:none;',
        '  background:#fff;',
        '  animation: mgFlash .7s ease-out forwards;',
        '}',
        '@keyframes mgFlash {',
        '  0%   { opacity:1; }',
        '  30%  { opacity:.95; }',
        '  100% { opacity:0; }',
        '}',

        /* 6. Splash testo — lento e drammatico */
        '#manga-splash {',
        '  position:fixed;inset:0;z-index:10001;pointer-events:none;',
        '  display:flex;flex-direction:column;align-items:center;justify-content:center;',
        '  gap:12px;',
        '}',
        '#manga-splash-line1 {',
        '  font-family:"Bangers",cursive;',
        '  font-size:clamp(20px,5vw,48px);',
        '  letter-spacing:.4em;',
        '  color:#000;',
        '  -webkit-text-stroke:1px #000;',
        '  animation: mgSubIn 2.6s ease forwards;',
        '}',
        '#manga-splash-line2 {',
        '  font-family:"Bangers",cursive;',
        '  font-size:clamp(60px,16vw,150px);',
        '  letter-spacing:.08em;',
        '  color:#000;',
        '  -webkit-text-stroke:3px #000;',
        '  text-shadow:6px 6px 0 rgba(0,0,0,0.2);',
        '  animation: mgMainIn 2.6s ease forwards;',
        '  line-height:1;',
        '}',
        '#manga-splash-line3 {',
        '  font-family:"Bangers",cursive;',
        '  font-size:clamp(14px,3vw,28px);',
        '  letter-spacing:.6em;',
        '  color:rgba(0,0,0,0.4);',
        '  animation: mgSubIn 2.6s ease forwards;',
        '  animation-delay:.2s;',
        '  opacity:0;animation-fill-mode:both;',
        '}',

        /* Animazione principale: cresce lentamente, rimane visibile, poi svanisce */
        '@keyframes mgMainIn {',
        '  0%   { transform:scale(0.1) rotate(-4deg); opacity:0; }',
        '  20%  { transform:scale(1.08) rotate(1deg); opacity:1; }',
        '  55%  { transform:scale(1)    rotate(0deg); opacity:1; }',
        '  80%  { transform:scale(1)    rotate(0deg); opacity:1; }',
        '  100% { transform:scale(.96); opacity:0; }',
        '}',
        '@keyframes mgSubIn {',
        '  0%   { opacity:0; transform:translateY(10px); }',
        '  20%  { opacity:1; transform:translateY(0); }',
        '  60%  { opacity:1; }',
        '  85%  { opacity:1; }',
        '  100% { opacity:0; }',
        '}',

        /* 7. Badge indicatore fisso */
        '#manga-badge {',
        '  position:fixed;bottom:22px;left:22px;z-index:9999;pointer-events:none;',
        '  background:#000;color:#fff;',
        '  font-family:"Bangers",cursive;font-size:12px;letter-spacing:.18em;',
        '  padding:5px 14px 4px;border:2px solid rgba(255,255,255,.6);',
        '  animation: mgBadge .5s cubic-bezier(.34,1.56,.64,1) both;',
        '  animation-delay:1.8s;opacity:0;animation-fill-mode:both;',
        '}',
        '@keyframes mgBadge {',
        '  from { transform:scale(0) rotate(-6deg); opacity:0; }',
        '  to   { transform:scale(1) rotate(-2deg); opacity:1; }',
        '}',

    ].join('\n');
    document.head.appendChild(_style);

    /* ── Screentone div ── */
    var _screentone = document.createElement('div');
    _screentone.id = 'manga-screentone';
    document.body.appendChild(_screentone);

    /* ── Applica subito se era attivo nella sessione ── */
    if (sessionStorage.getItem('mb_manga') === '1') {
        document.body.classList.add('manga-mode');
        _screentone.classList.add('visible');
        _active = true;
        var b = document.createElement('div');
        b.id = 'manga-badge'; b.textContent = 'MANGA MODE';
        document.body.appendChild(b);
    }

    /* ── Attivazione ── */
    function activate() {
        _active = true;
        sessionStorage.setItem('mb_manga', '1');

        /* Flash */
        var flash = document.createElement('div');
        flash.id = 'manga-flash';
        document.body.appendChild(flash);
        setTimeout(function () { flash.remove(); }, 800);

        /* Splash testo drammatico */
        var splash = document.createElement('div');
        splash.id = 'manga-splash';
        splash.innerHTML =
            '<div id="manga-splash-line1">— MODALITÀ —</div>' +
            '<div id="manga-splash-line2">MANGA</div>' +
            '<div id="manga-splash-line3">ATTIVATA</div>';
        document.body.appendChild(splash);
        setTimeout(function () { splash.remove(); }, 2700);

        /* Applica filtro BN dopo il flash */
        setTimeout(function () {
            document.body.classList.add('manga-mode');
            _screentone.classList.add('visible');
        }, 200);

        /* Badge */
        var badge = document.createElement('div');
        badge.id = 'manga-badge';
        badge.textContent = 'MANGA MODE';
        document.body.appendChild(badge);
    }

    /* ── Disattivazione ── */
    function deactivate() {
        _active = false;
        sessionStorage.removeItem('mb_manga');

        /* Flash */
        var flash = document.createElement('div');
        flash.id = 'manga-flash';
        document.body.appendChild(flash);
        setTimeout(function () { flash.remove(); }, 800);

        /* Splash OFF */
        var splash = document.createElement('div');
        splash.id = 'manga-splash';
        splash.innerHTML =
            '<div id="manga-splash-line1">— MODALITÀ —</div>' +
            '<div id="manga-splash-line2">MANGA</div>' +
            '<div id="manga-splash-line3">DISATTIVATA</div>';
        document.body.appendChild(splash);
        setTimeout(function () { splash.remove(); }, 2700);

        setTimeout(function () {
            document.body.classList.remove('manga-mode');
            _screentone.classList.remove('visible');
        }, 200);

        var badge = document.getElementById('manga-badge');
        if (badge) badge.remove();
    }

    /* ── Key listener ── */
    document.addEventListener('keydown', function (e) {
        if (e.key === SEQ[_idx]) {
            _idx++;
            if (_idx === SEQ.length) {
                _idx = 0;
                _active ? deactivate() : activate();
            }
        } else {
            _idx = (e.key === SEQ[0]) ? 1 : 0;
        }
    });

})();
