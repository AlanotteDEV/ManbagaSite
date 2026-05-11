const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

function getDb() {
    if (!getApps().length) {
        initializeApp({ credential: cert({
            projectId:   process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        })});
    }
    return getFirestore();
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { code } = req.body || {};
    if (!code || typeof code !== 'string' || !code.trim())
        return res.status(400).json({ error: 'Codice coupon non valido' });

    if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY)
        return res.status(500).json({ error: 'Configurazione server mancante' });

    let db;
    try { db = getDb(); } catch (e) { return res.status(500).json({ error: 'Errore server' }); }

    const normalized = code.trim().toUpperCase();
    const snap = await db.collection('coupons')
        .where('code', '==', normalized)
        .where('status', '==', 'attivo')
        .limit(1)
        .get();

    if (snap.empty)
        return res.status(404).json({ error: 'Coupon non valido o già utilizzato' });

    const doc    = snap.docs[0];
    const coupon = doc.data();

    if (coupon.expiresAt) {
        const expiry = coupon.expiresAt.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
        if (expiry < new Date())
            return res.status(400).json({ error: 'Coupon scaduto' });
    }

    return res.status(200).json({
        valid:       true,
        firestoreId: doc.id,
        amount:      coupon.amount,
        code:        coupon.code,
    });
};
