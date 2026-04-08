/* ============================================================
   MANBAGA — Cat Paw Custom Cursor (optimized)
   - rAF only fires when mouse moved (dirty flag)
   - 3 pre-built SVG layers, CSS class toggle (no innerHTML)
   - translate3d for GPU compositing
   - closest() for proper ancestor hover detection
   ============================================================ */
(function () {
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

    /* ── Inject styles ──────────────────────────────────────── */
    var styleEl = document.createElement('style');
    styleEl.textContent = [
        '*, *::before, *::after { cursor: none !important; }',
        '#mb-cursor { position:fixed; top:0; left:0; width:36px; height:36px;',
        '  pointer-events:none; z-index:999999; will-change:transform;',
        '  transform:translate3d(-9999px,-9999px,0); }',
        '#mb-cursor svg { position:absolute; top:0; left:0;',
        '  transition:opacity .08s; }',
        '#mb-cursor svg.mb-off { opacity:0; }',
        '#mb-cursor svg.mb-on  { opacity:1; }'
    ].join('\n');
    document.head.appendChild(styleEl);

    /* ── SVGs (inline, pre-built) ───────────────────────────── */
    function _makeSvg(html) {
        var el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        el.setAttribute('width', '36');
        el.setAttribute('height', '36');
        el.setAttribute('viewBox', '0 0 36 36');
        el.className = 'mb-off';
        el.innerHTML = html;
        return el;
    }

    var _svgNormal = _makeSvg(
        '<ellipse cx="10" cy="9"  rx="3.8" ry="3"   fill="#f5f0e8" stroke="#0d0d0d" stroke-width="1.2"/>' +
        '<ellipse cx="18" cy="6"  rx="3.8" ry="3"   fill="#f5f0e8" stroke="#0d0d0d" stroke-width="1.2"/>' +
        '<ellipse cx="26" cy="9"  rx="3.8" ry="3"   fill="#f5f0e8" stroke="#0d0d0d" stroke-width="1.2"/>' +
        '<ellipse cx="30" cy="17" rx="3"   ry="3.8" fill="#f5f0e8" stroke="#0d0d0d" stroke-width="1.2"/>' +
        '<ellipse cx="18" cy="22" rx="11"  ry="10"  fill="#f5f0e8" stroke="#0d0d0d" stroke-width="1.2"/>' +
        '<ellipse cx="13" cy="21" rx="2.5" ry="2"   fill="#DC2626" opacity=".75"/>' +
        '<ellipse cx="18" cy="25" rx="3"   ry="2.4" fill="#DC2626" opacity=".75"/>' +
        '<ellipse cx="23" cy="21" rx="2.5" ry="2"   fill="#DC2626" opacity=".75"/>'
    );

    var _svgHover = _makeSvg(
        '<ellipse cx="10" cy="9"  rx="4"    ry="3.2"  fill="#fff" stroke="#DC2626" stroke-width="1.4"/>' +
        '<ellipse cx="18" cy="6"  rx="4"    ry="3.2"  fill="#fff" stroke="#DC2626" stroke-width="1.4"/>' +
        '<ellipse cx="26" cy="9"  rx="4"    ry="3.2"  fill="#fff" stroke="#DC2626" stroke-width="1.4"/>' +
        '<ellipse cx="30" cy="17" rx="3.2"  ry="4"    fill="#fff" stroke="#DC2626" stroke-width="1.4"/>' +
        '<ellipse cx="18" cy="22" rx="11.5" ry="10.5" fill="#fff" stroke="#DC2626" stroke-width="1.4"/>' +
        '<ellipse cx="13" cy="21" rx="2.5"  ry="2"    fill="#DC2626" opacity=".9"/>' +
        '<ellipse cx="18" cy="25" rx="3"    ry="2.4"  fill="#DC2626" opacity=".9"/>' +
        '<ellipse cx="23" cy="21" rx="2.5"  ry="2"    fill="#DC2626" opacity=".9"/>'
    );

    var _svgClick = _makeSvg(
        '<ellipse cx="10" cy="11" rx="4.2" ry="2.5" fill="#f5f0e8" stroke="#0d0d0d" stroke-width="1.2"/>' +
        '<ellipse cx="18" cy="8"  rx="4.2" ry="2.5" fill="#f5f0e8" stroke="#0d0d0d" stroke-width="1.2"/>' +
        '<ellipse cx="26" cy="11" rx="4.2" ry="2.5" fill="#f5f0e8" stroke="#0d0d0d" stroke-width="1.2"/>' +
        '<ellipse cx="30" cy="18" rx="2.5" ry="4"   fill="#f5f0e8" stroke="#0d0d0d" stroke-width="1.2"/>' +
        '<ellipse cx="18" cy="24" rx="12"  ry="9"   fill="#f5f0e8" stroke="#0d0d0d" stroke-width="1.2"/>' +
        '<ellipse cx="13" cy="23" rx="2.8" ry="1.8" fill="#DC2626" opacity=".85"/>' +
        '<ellipse cx="18" cy="27" rx="3.2" ry="2"   fill="#DC2626" opacity=".85"/>' +
        '<ellipse cx="23" cy="23" rx="2.8" ry="1.8" fill="#DC2626" opacity=".85"/>'
    );

    /* ── Mount cursor ───────────────────────────────────────── */
    var cur = document.createElement('div');
    cur.id = 'mb-cursor';
    cur.appendChild(_svgNormal);
    cur.appendChild(_svgHover);
    cur.appendChild(_svgClick);
    document.body.appendChild(cur);

    /* ── State ──────────────────────────────────────────────── */
    var _x = 0, _y = 0;
    var _dirty = false;
    var _state = 'normal';
    var HOVER_SEL = 'a,button,label,[role="button"],[onclick],.cp-card,.p-card,.tab-btn,.nav-link';

    var _map = { normal: _svgNormal, hover: _svgHover, click: _svgClick };

    function _show(state) {
        if (_state === state) return;
        _map[_state].className = 'mb-off';
        _state = state;
        _map[_state].className = 'mb-on';
    }

    /* Quick tag check before expensive closest() traversal */
    var QUICK_TAGS = { A:1, BUTTON:1, LABEL:1, SELECT:1, INPUT:1, TEXTAREA:1 };
    function _isHoverable(el) {
        if (!el) return false;
        if (QUICK_TAGS[el.tagName]) return true;
        return !!(el.closest && el.closest(HOVER_SEL));
    }

    /* ── rAF — only runs when mouse moved ───────────────────── */
    function _tick() {
        if (_dirty) {
            cur.style.transform = 'translate3d(' + (_x - 18) + 'px,' + (_y - 18) + 'px,0)';
            _dirty = false;
        }
    }

    /* ── Events ─────────────────────────────────────────────── */
    document.addEventListener('mousemove', function (e) {
        _x = e.clientX;
        _y = e.clientY;
        _dirty = true;
        requestAnimationFrame(_tick);

        if (_state !== 'click') {
            _show(_isHoverable(e.target) ? 'hover' : 'normal');
        }
    }, { passive: true });

    document.addEventListener('mousedown', function () { _show('click'); });

    document.addEventListener('mouseup', function (e) {
        _show(_isHoverable(e.target) ? 'hover' : 'normal');
    });

    /* ── Reveal on first move ───────────────────────────────── */
    _show('normal');
})();
