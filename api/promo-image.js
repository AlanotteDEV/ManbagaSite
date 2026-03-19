var https = require('https');
var http  = require('http');

module.exports = function (req, res) {
    var id = ((req.query.id || '') + '').toUpperCase().trim();
    if (!/^P-\d{3,4}$/.test(id)) { res.status(400).end(); return; }

    var url = 'https://en.onepiece-cardgame.com/images/cardlist/card/' + id + '_p1.png';
    var headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer':    'https://en.onepiece-cardgame.com/',
        'Accept':     'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
    };

    function pipe(targetUrl, depth) {
        if (depth > 5) { res.status(500).end(); return; }
        var mod = targetUrl.startsWith('https') ? https : http;
        mod.get(targetUrl, { headers: headers }, function (imgRes) {
            if (imgRes.statusCode === 301 || imgRes.statusCode === 302) {
                pipe(imgRes.headers.location, depth + 1);
                imgRes.resume();
                return;
            }
            if (imgRes.statusCode !== 200) { res.status(404).end(); return; }
            res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            imgRes.pipe(res);
        }).on('error', function () { res.status(500).end(); });
    }

    pipe(url, 0);
};
