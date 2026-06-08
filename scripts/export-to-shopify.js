#!/usr/bin/env node
// Export prodotti da Firestore → CSV pronto per import Shopify
// Uso: node scripts/export-to-shopify.js
// Prerequisito: serviceAccountKey.json nella root del progetto

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const KEY_PATH = path.join(__dirname, '..', 'serviceAccountKey.json');

if (!fs.existsSync(KEY_PATH)) {
    console.error('❌  serviceAccountKey.json non trovato in', path.dirname(KEY_PATH));
    console.error('   Scaricalo da: Firebase Console → Project Settings → Account di servizio → Genera nuova chiave');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(require(KEY_PATH))
});

const db = admin.firestore();

function slugify(str) {
    return (str || '')
        .toLowerCase()
        .replace(/[àáâã]/g, 'a').replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i').replace(/[òóôõ]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function parsePrice(raw) {
    if (!raw) return '';
    return String(raw).replace(/[^0-9.,]/g, '').replace(',', '.');
}

function catToTags(p) {
    var tags = [];
    if (p.cat)    tags.push('cat:' + p.cat);
    if (p.subcat) tags.push('subcat:' + p.subcat);
    if (p.showInNovita) tags.push('novita');
    return tags.join(', ');
}

function escCsv(val) {
    if (val == null) return '';
    var s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

async function main() {
    console.log('📥  Lettura prodotti da Firestore...');
    const snap = await db.collection('products').get();
    console.log('   Trovati', snap.size, 'prodotti');

    const headers = [
        'Handle',
        'Title',
        'Body (HTML)',
        'Vendor',
        'Type',
        'Tags',
        'Published',
        'Option1 Name',
        'Option1 Value',
        'Variant SKU',
        'Variant Price',
        'Variant Inventory Policy',
        'Variant Inventory Qty',
        'Variant Fulfillment Service',
        'Image Src',
        'Image Position',
        'Metafield: catalog.badge [single_line_text_field]',
        'Metafield: catalog.subcat [single_line_text_field]',
        'Metafield: catalog.volume [single_line_text_field]',
        'Metafield: catalog.available_from [date]'
    ];

    var rows = [headers.join(',')];

    snap.forEach(function(doc) {
        var p = doc.data();
        var handle  = slugify((p.title || '') + (p.volume ? '-vol-' + p.volume : ''));
        var price   = parsePrice(p.price);
        var qty     = (p.quantity != null) ? String(p.quantity) : '0';
        var invPolicy = (p.badge === 'PREORDINA' || p.badge === 'IN ARRIVO') ? 'continue' : 'deny';
        var availFrom = p.availableFrom
            ? (p.availableFrom.toDate ? p.availableFrom.toDate().toISOString().split('T')[0] : String(p.availableFrom))
            : '';

        var row = [
            escCsv(handle),
            escCsv(p.title || ''),
            escCsv(''),
            escCsv('Manbaga'),
            escCsv(p.cat || ''),
            escCsv(catToTags(p)),
            'TRUE',
            'Title',
            'Default Title',
            escCsv(doc.id),
            escCsv(price),
            escCsv(invPolicy),
            escCsv(qty),
            'manual',
            escCsv(p.imageUrl || ''),
            '1',
            escCsv(p.badge || ''),
            escCsv(p.subcat || ''),
            escCsv(p.volume || ''),
            escCsv(availFrom)
        ];
        rows.push(row.join(','));
    });

    var outPath = path.join(__dirname, '..', 'shopify-products.csv');
    fs.writeFileSync(outPath, rows.join('\n'), 'utf8');
    console.log('✅  Esportati', snap.size, 'prodotti in', outPath);
    console.log('');
    console.log('📋  Prossimo passo:');
    console.log('   Shopify Admin → Prodotti → Importa → carica shopify-products.csv');
    process.exit(0);
}

main().catch(function(err) {
    console.error('❌  Errore:', err.message);
    process.exit(1);
});
