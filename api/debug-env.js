module.exports = function handler(req, res) {
    res.status(200).json({
        FIREBASE_PROJECT_ID:    process.env.FIREBASE_PROJECT_ID || 'MANCANTE',
        FIREBASE_CLIENT_EMAIL:  process.env.FIREBASE_CLIENT_EMAIL || 'MANCANTE',
        FIREBASE_PRIVATE_KEY_start: (process.env.FIREBASE_PRIVATE_KEY || 'MANCANTE').slice(0, 40),
        STRIPE_SECRET_KEY_start: (process.env.STRIPE_SECRET_KEY || 'MANCANTE').slice(0, 10),
    });
};
