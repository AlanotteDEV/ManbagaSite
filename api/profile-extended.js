const { adminGql, verifyCustomerToken } = require('./_shopify-admin');

const METAFIELDS_SET = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
            metafields { key }
            userErrors { field message }
        }
    }
`;

const ALLOWED_KEYS = ['birthdate', 'lang', 'favoriteGames', 'phone'];

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const auth = (req.headers.authorization || '').replace('Bearer ', '');
    if (!auth) return res.status(401).json({ error: 'Missing token' });

    const customer = await verifyCustomerToken(auth);
    if (!customer) return res.status(401).json({ error: 'Invalid token' });

    const body = req.body || {};
    const update = {};
    ALLOWED_KEYS.forEach(function(k) {
        if (body[k] !== undefined) update[k] = String(body[k]).slice(0, 500);
    });

    const result = await adminGql(METAFIELDS_SET, {
        metafields: [{
            ownerId: customer.id,
            namespace: 'profile',
            key: 'extended',
            type: 'json',
            value: JSON.stringify(update)
        }]
    });

    const errors = result.data && result.data.metafieldsSet && result.data.metafieldsSet.userErrors;
    if (errors && errors.length) return res.status(400).json({ error: errors[0].message });

    return res.status(200).json({ ok: true });
};
