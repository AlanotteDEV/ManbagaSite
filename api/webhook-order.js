const crypto = require('crypto');
const { adminGql } = require('./_shopify-admin');

const TIER_THRESHOLDS = { silver: 500, gold: 1200 };

function tierFromSpend(spent) {
    if (spent >= TIER_THRESHOLDS.gold)   return 'gold';
    if (spent >= TIER_THRESHOLDS.silver) return 'silver';
    return 'bronze';
}

const GET_LOYALTY = `
    query getLoyalty($id: ID!) {
        customer(id: $id) {
            spentMeta:  metafield(namespace: "loyalty", key: "total_spent")   { value }
            ordersMeta: metafield(namespace: "loyalty", key: "orders_placed") { value }
        }
    }
`;

const SET_LOYALTY = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
            userErrors { field message }
        }
    }
`;

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const signature = req.headers['x-shopify-hmac-sha256'];
    const rawBody   = req.rawBody || JSON.stringify(req.body);
    const expected  = crypto
        .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
        .update(rawBody, 'utf8')
        .digest('base64');

    if (signature !== expected) return res.status(401).json({ error: 'Invalid signature' });

    const order = req.body;
    if (!order.customer || !order.customer.id) return res.status(200).json({ ok: true, skipped: 'no customer' });

    const customerId = 'gid://shopify/Customer/' + order.customer.id;
    const orderTotal = parseFloat(order.total_price || '0');

    const current    = await adminGql(GET_LOYALTY, { id: customerId });
    const cust       = current.data && current.data.customer;
    const prevSpent  = parseFloat((cust && cust.spentMeta  && cust.spentMeta.value)  || '0') || 0;
    const prevOrders = parseInt( (cust && cust.ordersMeta && cust.ordersMeta.value) || '0') || 0;

    const newSpent  = prevSpent + orderTotal;
    const newOrders = prevOrders + 1;
    const newTier   = tierFromSpend(newSpent);

    await adminGql(SET_LOYALTY, {
        metafields: [
            { ownerId: customerId, namespace: 'loyalty', key: 'total_spent',   type: 'number_decimal',         value: newSpent.toFixed(2) },
            { ownerId: customerId, namespace: 'loyalty', key: 'orders_placed', type: 'number_integer',         value: String(newOrders) },
            { ownerId: customerId, namespace: 'loyalty', key: 'tier',          type: 'single_line_text_field', value: newTier }
        ]
    });

    return res.status(200).json({ ok: true });
};
