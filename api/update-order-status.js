const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore }                 = require('firebase-admin/firestore');
const { Resend }                       = require('resend');

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

async function sendShippingEmail(order, trackingCode) {
    var resend  = new Resend(process.env.RESEND_API_KEY);
    var orderId = order.stripeSessionId ? order.stripeSessionId.slice(-8).toUpperCase() : '——';
    var tracking = trackingCode ? '<p><strong>Codice tracciamento:</strong> ' + trackingCode + '</p>' : '';
    await resend.emails.send({
        from:    'MANBAGA Comics <onboarding@resend.dev>',
        to:      order.customerEmail,
        subject: 'Il tuo ordine #' + orderId + ' è stato spedito — MANBAGA Comics',
        html:    '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px">'
            + '<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:4px;overflow:hidden">'
            + '<div style="background:#DC2626;padding:24px 32px"><h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:2px">MANBAGA Comics</h1></div>'
            + '<div style="padding:32px">'
            + '<h2 style="margin-top:0">Il tuo ordine è in viaggio! 🚚</h2>'
            + '<p>Ciao <strong>' + (order.customerName || 'Cliente') + '</strong>,</p>'
            + '<p>il tuo ordine <strong>#' + orderId + '</strong> è stato spedito.</p>'
            + tracking
            + '<p style="font-size:13px;color:#6b7280">Per assistenza: <a href="mailto:manbagacomics@gmail.com" style="color:#DC2626">manbagacomics@gmail.com</a></p>'
            + '</div></div></body></html>',
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret && req.headers['x-admin-secret'] !== adminSecret) {
        return res.status(401).json({ error: 'Non autorizzato' });
    }

    const { orderId, status, trackingCode } = req.body || {};
    if (!orderId || !status) return res.status(400).json({ error: 'orderId e status richiesti' });
    const validStatuses = ['ricevuto', 'in-preparazione', 'spedito', 'consegnato'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Stato non valido' });

    const db  = getDb();
    const ref  = db.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Ordine non trovato' });

    const updateData = { status, updatedAt: new Date() };
    if (trackingCode) updateData.trackingCode = trackingCode;
    await ref.update(updateData);

    if (status === 'spedito') {
        try { await sendShippingEmail(snap.data(), trackingCode || null); }
        catch (e) { console.error('Shipping email error:', e); }
    }

    return res.status(200).json({ ok: true, orderId, status });
};
