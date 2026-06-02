const crypto = require('crypto');
const { adminGql } = require('./_shopify-admin');

const TIER_THRESHOLDS = { silver: 500, gold: 1200 };
function tierFromSpend(s) {
    if (s >= TIER_THRESHOLDS.gold)   return 'gold';
    if (s >= TIER_THRESHOLDS.silver) return 'silver';
    return 'bronze';
}

function verifyAdminJwt(header) {
    const token = (header || '').replace('Bearer ', '');
    if (!token) return false;
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return false;
    const expected = crypto.createHmac('sha256', process.env.ADMIN_JWT_SECRET)
        .update(payloadB64).digest('hex');
    return sig === expected;
}

const SET_LOYALTY = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
            userErrors { field message }
        }
    }
`;

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).end();

    if (!verifyAdminJwt(req.headers.authorization)) return res.status(401).json({ error: 'Unauthorized' });

    const { customerId, newTotalSpent, newOrdersPlaced } = req.body;
    if (!customerId) return res.status(400).json({ error: 'Missing customerId' });

    const spent  = parseFloat(newTotalSpent)  || 0;
    const orders = parseInt(newOrdersPlaced)  || 0;
    const tier   = tierFromSpend(spent);

    await adminGql(SET_LOYALTY, {
        metafields: [
            { ownerId: customerId, namespace: 'loyalty', key: 'total_spent',   type: 'number_decimal',         value: spent.toFixed(2) },
            { ownerId: customerId, namespace: 'loyalty', key: 'orders_placed', type: 'number_integer',         value: String(orders) },
            { ownerId: customerId, namespace: 'loyalty', key: 'tier',          type: 'single_line_text_field', value: tier }
        ]
    });

    return res.status(200).json({ ok: true, tier });
};
