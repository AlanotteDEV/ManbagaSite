const { adminGql, verifyCustomerToken } = require('./_shopify-admin');

const METAFIELDS_SET = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
            metafields { key namespace value }
            userErrors { field message }
        }
    }
`;

const GET_WISHLIST = `
    query getWishlist($id: ID!) {
        customer(id: $id) {
            metafield(namespace: "wishlist", key: "product_ids") { value }
        }
    }
`;

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

    const { action, productId } = req.body;
    if (!action || !productId) return res.status(400).json({ error: 'Missing action or productId' });

    const current = await adminGql(GET_WISHLIST, { id: customer.id });
    const raw = current.data && current.data.customer && current.data.customer.metafield
        ? current.data.customer.metafield.value
        : '[]';
    let ids;
    try { ids = JSON.parse(raw); } catch(e) { ids = []; }
    if (!Array.isArray(ids)) ids = [];

    if (action === 'add') {
        if (!ids.includes(productId)) ids.push(productId);
    } else if (action === 'remove') {
        ids = ids.filter(function(id) { return id !== productId; });
    } else {
        return res.status(400).json({ error: 'action must be add or remove' });
    }

    const result = await adminGql(METAFIELDS_SET, {
        metafields: [{
            ownerId: customer.id,
            namespace: 'wishlist',
            key: 'product_ids',
            type: 'json',
            value: JSON.stringify(ids)
        }]
    });

    const errors = result.data && result.data.metafieldsSet && result.data.metafieldsSet.userErrors;
    if (errors && errors.length) return res.status(400).json({ error: errors[0].message });

    return res.status(200).json({ ok: true, ids });
};
