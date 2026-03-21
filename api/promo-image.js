var https = require('https');
var http  = require('http');

module.exports = function (req, res) {
    var id = ((req.query.id || '') + '').toUpperCase().trim();
    if (!/^P-\d{3,4}$/.test(id)) { res.status(400).end(); return; }

    var BASE = 'https://en.onepiece-cardgame.com/images/cardlist/card/';
    // Some promos use _p1 suffix, others don't — try both
    var candidates = [BASE + id + '_p1.png', BASE + id + '.png'];
    var headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer':    'https://en.onepiece-cardgame.com/',
        'Accept':     'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
    };

    function tryNext(idx) {
        if (idx >= candidates.length) { res.status(404).end(); return; }
        pipe(candidates[idx], 0, function () { tryNext(idx + 1); });
    }

    function pipe(targetUrl, depth, onNotFound) {
        if (depth > 5) { res.status(500).end(); return; }
        var mod = targetUrl.startsWith('https') ? https : http;
        mod.get(targetUrl, { headers: headers }, function (imgRes) {
            if (imgRes.statusCode === 301 || imgRes.statusCode === 302) {
                pipe(imgRes.headers.location, depth + 1, onNotFound);
                imgRes.resume();
                return;
            }
            if (imgRes.statusCode !== 200) { imgRes.resume(); onNotFound(); return; }
            res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            imgRes.pipe(res);
        }).on('error', function () { onNotFound(); });
    }

    tryNext(0);
};
