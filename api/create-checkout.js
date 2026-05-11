const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore }                 = require('firebase-admin/firestore');

function getDb() {
    if (!getApps().length) {
        console.log('[DEBUG] FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
        console.log('[DEBUG] FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
        console.log('[DEBUG] FIREBASE_PRIVATE_KEY starts:', (process.env.FIREBASE_PRIVATE_KEY || '').slice(0, 30));
        initializeApp({ credential: cert({
            projectId:   process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        })});
    }
    return getFirestore();
}

function parsePrice(priceStr) {
    /* "€15.90" → 1590 centesimi */
    var n = parseFloat(String(priceStr).replace(/[^0-9.,]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : Math.round(n * 100);
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { items, shipping: shippingRaw, couponCode } = req.body || {};
    if (!Array.isArray(items) || items.length === 0)
        return res.status(400).json({ error: 'Carrello vuoto' });
    const shippingCost = (typeof shippingRaw === 'number' && shippingRaw >= 0) ? shippingRaw : null;

    if (!process.env.FIREBASE_CLIENT_EMAIL) return res.status(500).json({ error: 'ENV MANCANTE: FIREBASE_CLIENT_EMAIL' });
    if (!process.env.FIREBASE_PROJECT_ID)   return res.status(500).json({ error: 'ENV MANCANTE: FIREBASE_PROJECT_ID' });
    if (!process.env.FIREBASE_PRIVATE_KEY)  return res.status(500).json({ error: 'ENV MANCANTE: FIREBASE_PRIVATE_KEY' });
    if (!process.env.STRIPE_SECRET_KEY)     return res.status(500).json({ error: 'ENV MANCANTE: STRIPE_SECRET_KEY' });

    let db;
    try { db = getDb(); } catch(e) { return res.status(500).json({ error: 'Firebase init error: ' + e.message }); }

    const lineItems      = [];
    const validatedItems = [];

    for (const item of items) {
        if (!item.firestoreId || !Number.isInteger(item.qty) || item.qty < 1)
            return res.status(400).json({ error: 'Dati carrello non validi' });

        const doc = await db.collection('products').doc(item.firestoreId).get();
        if (!doc.exists)
            return res.status(400).json({ error: `Prodotto non trovato: ${item.firestoreId}` });

        const p = doc.data();
        const stock = parseInt(p.quantity) || 0;
        if (stock < item.qty)
            return res.status(409).json({ error: `Stock insufficiente per "${p.title}". Disponibili: ${stock}` });

        const unitAmount = parsePrice(p.price);
        if (unitAmount <= 0)
            return res.status(400).json({ error: `Prezzo non valido per "${p.title}"` });

        lineItems.push({
            price_data: {
                currency: 'eur',
                product_data: {
                    name:   p.title + (p.volume ? ` — ${p.volume}` : ''),
                    images: p.image ? [p.image] : [],
                },
                unit_amount: unitAmount,
            },
            quantity: item.qty,
        });
        validatedItems.push({ firestoreId: item.firestoreId, title: p.title, qty: item.qty, unitAmount });
    }

    /* Spedizione — €5.90 sotto €50, gratuita sopra */
    const subtotalCents = validatedItems.reduce((s, i) => s + i.unitAmount * i.qty, 0);
    const freeShipping  = subtotalCents >= 5000;
    const shippingCents = freeShipping ? 0 : 590;
    if (shippingCents > 0) {
        lineItems.push({
            price_data: {
                currency: 'eur',
                product_data: { name: 'Spedizione standard' },
                unit_amount: shippingCents,
            },
            quantity: 1,
        });
    }

    /* Coupon sconto — validazione server-side */
    let stripeCouponId   = null;
    let couponFirestoreId = null;
    let discountCents    = 0;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
        const normalized = couponCode.trim().toUpperCase();
        const snap = await db.collection('coupons')
            .where('code', '==', normalized)
            .where('status', '==', 'attivo')
            .limit(1)
            .get();

        if (!snap.empty) {
            const couponDoc  = snap.docs[0];
            const couponData = couponDoc.data();

            /* Controlla scadenza */
            let expired = false;
            if (couponData.expiresAt) {
                const expiry = couponData.expiresAt.toDate ? couponData.expiresAt.toDate() : new Date(couponData.expiresAt);
                if (expiry < new Date()) expired = true;
            }

            if (!expired) {
                const totalCents  = subtotalCents + shippingCents;
                discountCents     = Math.min(Math.round(couponData.amount * 100), totalCents);
                couponFirestoreId = couponDoc.id;

                /* Crea coupon Stripe monouso per questo checkout */
                const sc = await stripe.coupons.create({
                    amount_off:      discountCents,
                    currency:        'eur',
                    duration:        'once',
                    name:            `Sconto ${normalized}`,
                    max_redemptions: 1,
                });
                stripeCouponId = sc.id;
            }
        }
        /* Se coupon non trovato/scaduto, si procede senza sconto (non bloccare il checkout) */
    }

    const host   = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto  = req.headers['x-forwarded-proto'] || 'https';
    const origin = host ? `${proto}://${host}` : (process.env.SITE_ORIGIN || 'https://manbagacomicsandgames.vercel.app').replace(/\/$/, '');

    const sessionParams = {
        payment_method_types: ['card'],
        line_items:           lineItems,
        mode:                 'payment',
        customer_creation:    'always',
        locale:               'it',
        success_url:          `${origin}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:           `${origin}/carrello.html`,
    };
    if (stripeCouponId) {
        sessionParams.discounts = [{ coupon: stripeCouponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    /* Salva items e coupon per il webhook */
    await db.collection('pending_checkouts').doc(session.id).set({
        items:             validatedItems,
        couponFirestoreId: couponFirestoreId || null,
        createdAt:         new Date(),
    });

    return res.status(200).json({ url: session.url });
};
