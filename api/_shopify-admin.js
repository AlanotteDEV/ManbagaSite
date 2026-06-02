const fetch = require('node-fetch');

const DOMAIN  = process.env.SHOPIFY_STORE_DOMAIN;
const ATOKEN  = process.env.SHOPIFY_ADMIN_TOKEN;
const SFTOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
const VERSION = '2024-10';

async function adminGql(query, variables) {
    const res = await fetch(`https://${DOMAIN}/admin/api/${VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': ATOKEN
        },
        body: JSON.stringify({ query, variables: variables || {} })
    });
    if (!res.ok) throw new Error('Admin API HTTP ' + res.status);
    return res.json();
}

async function verifyCustomerToken(token) {
    const res = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': SFTOKEN
        },
        body: JSON.stringify({
            query: `query { customer(customerAccessToken: "${token.replace(/"/g, '')}") { id email } }`
        })
    });
    const data = await res.json();
    return (data.data && data.data.customer) || null;
}

module.exports = { adminGql, verifyCustomerToken };
