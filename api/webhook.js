const stripe    = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');

/* Disabilita body parser Vercel — Stripe ha bisogno del raw body per verificare la firma */

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

async function getRawBody(req) {
    return new Promise(function (resolve, reject) {
        var chunks = [];
        req.on('data', function (c) { chunks.push(c); });
        req.on('end',  function ()  { resolve(Buffer.concat(chunks)); });
        req.on('error', reject);
    });
}

async function sendConfirmationEmail(session, items) {
    var resend  = new Resend(process.env.RESEND_API_KEY);
    var orderId = session.id.slice(-8).toUpperCase();
    var total   = (session.amount_total / 100).toFixed(2);

    var rowsHtml = items.map(function (item) {
        var unitPrice = (item.unitAmount / 100).toFixed(2);
        var lineTotal = ((item.unitAmount * item.qty) / 100).toFixed(2);
        return '<tr>'
            + '<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">' + item.title + '</td>'
            + '<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">' + item.qty + '</td>'
            + '<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">€' + unitPrice + '</td>'
            + '<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">€' + lineTotal + '</td>'
            + '</tr>';
    }).join('');

    var customerName = (session.customer_details && session.customer_details.name) || 'Cliente';
    var customerEmail = session.customer_details.email;

    await resend.emails.send({
        from:    'MANBAGA Comics <onboarding@resend.dev>',
        to:      customerEmail,
        subject: 'Ordine #' + orderId + ' confermato — MANBAGA Comics',
        html: '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px">'
            + '<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:4px;overflow:hidden">'
            + '<div style="background:#DC2626;padding:24px 32px">'
            + '<h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:2px">MANBAGA Comics</h1>'
            + '</div>'
            + '<div style="padding:32px">'
            + '<h2 style="margin-top:0;color:#0d0d0d">Ordine confermato!</h2>'
            + '<p>Ciao <strong>' + customerName + '</strong>,</p>'
            + '<p>il tuo ordine <strong>#' + orderId + '</strong> è stato ricevuto e il pagamento confermato.</p>'
            + '<table style="width:100%;border-collapse:collapse;margin:24px 0">'
            + '<thead><tr style="background:#f5f0e8">'
            + '<th style="padding:10px 12px;text-align:left;font-size:13px">Prodotto</th>'
            + '<th style="padding:10px 12px;text-align:center;font-size:13px">Qtà</th>'
            + '<th style="padding:10px 12px;text-align:right;font-size:13px">Prezzo</th>'
            + '<th style="padding:10px 12px;text-align:right;font-size:13px">Totale</th>'
            + '</tr></thead>'
            + '<tbody>' + rowsHtml + '</tbody>'
            + '<tfoot><tr>'
            + '<td colspan="3" style="padding:12px;font-weight:bold;text-align:right;font-size:15px">TOTALE</td>'
            + '<td style="padding:12px;font-weight:bold;text-align:right;font-size:15px;color:#DC2626">€' + total + '</td>'
            + '</tr></tfoot>'
            + '</table>'
            + '<p style="font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:16px;margin-bottom:0">'
            + 'Hai diritto di recedere dal contratto entro 14 giorni dalla ricezione senza penali. '
            + 'Per informazioni: <a href="https://manbaga-site.vercel.app/condizioni-vendita.html" style="color:#DC2626">condizioni di vendita</a>.<br>'
            + 'Per assistenza: <a href="mailto:manbagacomics@gmail.com" style="color:#DC2626">manbagacomics@gmail.com</a>'
            + '</p>'
            + '</div></div></body></html>',
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const rawBody = await getRawBody(req);
    const sig     = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Stripe webhook signature failed:', err.message);
        return res.status(400).json({ error: 'Firma webhook non valida' });
    }

    if (event.type !== 'checkout.session.completed') {
        return res.status(200).json({ received: true });
    }

    const session = event.data.object;
    const db      = getDb();

    /* Leggi items validati salvati al momento del checkout */
    const pendingDoc = await db.collection('pending_checkouts').doc(session.id).get();
    if (!pendingDoc.exists) {
        console.error('pending_checkout non trovato per session:', session.id);
        return res.status(200).json({ received: true });
    }
    const { items } = pendingDoc.data();

    /* Salva ordine */
    await db.collection('orders').doc(session.id).set({
        stripeSessionId: session.id,
        customerEmail:   session.customer_details.email,
        customerName:    (session.customer_details && session.customer_details.name) || '',
        items:           items,
        total:           session.amount_total / 100,
        status:          'paid',
        createdAt:       FieldValue.serverTimestamp(),
    });

    /* Decrementa stock con batch atomico per ogni prodotto */
    const batch = db.batch();
    items.forEach(function (item) {
        var ref = db.collection('products').doc(item.firestoreId);
        batch.update(ref, { quantity: FieldValue.increment(-item.qty) });
    });
    await batch.commit();

    /* Elimina pending_checkout */
    await db.collection('pending_checkouts').doc(session.id).delete();

    /* Invia email conferma */
    try {
        await sendConfirmationEmail(session, items);
    } catch (emailErr) {
        console.error('Resend email error:', emailErr);
        /* Non bloccare la risposta — ordine è già salvato */
    }

    return res.status(200).json({ received: true });
};

module.exports.config = { api: { bodyParser: false } };
