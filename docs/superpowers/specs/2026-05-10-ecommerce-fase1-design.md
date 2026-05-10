# Design — E-Commerce Fase 1: Carrello + Stripe Checkout + Email Conferma

**Data**: 2026-05-10  
**Stato**: Approvato  
**Scope**: Fase 1 di 5 — carrello, pagamento Stripe, salvataggio ordine Firestore, email Resend

---

## Obiettivo

Aggiungere un sistema e-commerce completo al sito MANBAGA Comics già deployato su Vercel. Il cliente può aggiungere prodotti al carrello, pagare con carta tramite Stripe, e ricevere un'email di conferma ordine. Nessuna chiave segreta nel frontend.

---

## Architettura

```
[Catalogo / Modal] → cart.js (localStorage) → [carrello.html]
                                                      ↓
                                        api/create-checkout.js (Vercel)
                                                      ↓
                                        [Stripe Hosted Checkout]
                                                      ↓
                                          api/webhook.js (Vercel)
                                               ├→ Firestore: orders/
                                               ├→ Firestore: decrementa stock
                                               └→ Resend: email conferma
```

---

## Componenti

### Nuovi file

| File | Responsabilità |
|------|---------------|
| `js/cart.js` | CRUD carrello localStorage, badge navbar, validazione stock |
| `carrello.html` | Pagina carrello: riepilogo, +/- quantità, totale, checkout |
| `checkout-success.html` | Pagina post-pagamento: conferma ordine |
| `condizioni-vendita.html` | Pagina legale obbligatoria (D.Lgs. 206/2005) |
| `api/create-checkout.js` | Vercel serverless: crea sessione Stripe |
| `api/webhook.js` | Vercel serverless: webhook Stripe → Firestore + Resend |
| `.env` | Variabili d'ambiente (non committato) |

### File modificati

| File | Modifica |
|------|---------|
| `catalogo-init.js` | Pulsante carrello su card + modal prodotto |
| `style.css` | Stili carrello, badge navbar, pulsanti add-to-cart |
| `vercel.json` | CSP aggiornata per Stripe; rimuovi `payment=()` da Permissions-Policy |
| `privacy.html` | Aggiunta sezione "Acquisti online e trattamento dati ordini" |

---

## Flusso utente dettagliato

### 1. Aggiunta al carrello
- Ogni card prodotto e modal dettaglio espongono un'icona carrello
- `cart.js` legge `maxStock` dal prodotto (già presente in Firestore)
- Se `quantitàNelCarrello < maxStock` → aggiunge 1 unità in localStorage
- Badge navbar si aggiorna in tempo reale con il totale articoli

### 2. Pagina carrello (`carrello.html`)
- Lista articoli con immagine, nome, prezzo unitario, controlli +/-
- Rimozione singolo articolo
- Totale IVA inclusa
- Checkbox obbligatorio: *"Ho letto e accetto le [condizioni di vendita] e la [privacy policy]"*
- Bottone **"Procedi al pagamento"** → POST a `api/create-checkout.js`

### 3. Creazione sessione Stripe (`api/create-checkout.js`)
- Riceve `{ items: [{productId, quantity}] }` dal client
- Verifica stock su Firestore **lato server** per ogni articolo (anti-frode)
- Se stock insufficiente → risponde 409 con messaggio di errore
- Crea `stripe.checkout.sessions.create()`:
  - `line_items`: articoli con prezzi da Firestore (non dal client)
  - `mode: 'payment'`
  - `customer_creation: 'always'` (raccoglie email)
  - `success_url`: `https://manbaga-site.vercel.app/checkout-success.html`
  - `cancel_url`: `https://manbaga-site.vercel.app/carrello.html`
  - `locale: 'it'`
- Risponde con `{ url }` → frontend reindirizza

### 4. Stripe Checkout (hosted)
- Cliente inserisce email, nome, carta
- Stripe gestisce 3DS/SCA (obbligatorio PSD2 Europa)
- Nessun dato carta tocca i server Manbaga (PCI DSS compliance)

### 5. Webhook (`api/webhook.js`)
- Stripe POST a `https://manbaga-site.vercel.app/api/webhook`
- Verifica firma: `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`
- Se firma non valida → risponde 400, nessuna azione
- Evento: `checkout.session.completed`
- Azioni:
  1. Salva ordine su Firestore (`orders/{sessionId}`)
  2. Decrementa stock per ogni articolo su Firestore (transazione atomica)
  3. Chiama Resend API → email conferma

### 6. Email conferma (Resend)
- **A**: email cliente (da `session.customer_details.email`)
- **Da**: `ordini@manbaga.it` (o dominio verificato su Resend)
- **Oggetto**: `Ordine #XXXX confermato — MANBAGA Comics`
- **Contenuto**:
  - Logo Manbaga
  - Riepilogo articoli acquistati (nome, quantità, prezzo)
  - Totale pagato
  - Numero ordine (Stripe session ID abbreviato)
  - Nota diritto di recesso 14 giorni
  - Contatto negozio

### 7. Success page (`checkout-success.html`)
- Stripe reindirizza qui con `?session_id={CHECKOUT_SESSION_ID}`
- Mostra messaggio di conferma
- Link per tornare al catalogo
- Nota: "Riceverai una email di conferma a breve"

---

## Firestore — struttura dati

### Collezione `orders`
```
orders/{stripeSessionId}
  ├── customerEmail     string   // da Stripe
  ├── customerName      string   // da Stripe
  ├── items             array    // [{productId, nome, prezzo, quantità}]
  ├── total             number   // in centesimi
  ├── status            string   // 'paid' | 'shipped' | 'completed'
  ├── createdAt         timestamp
  └── stripeSessionId   string
```

Dati mai cancellati automaticamente (conservazione 10 anni per legge fiscale italiana).

### Prodotti — campo aggiornato
Il webhook decrementa `stock` atomicamente su `products/{productId}`.

---

## Variabili d'ambiente (`.env` / Vercel Dashboard)

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...   # non usata in Fase 1
```

Firebase Admin SDK: configurato tramite variabile `FIREBASE_SERVICE_ACCOUNT` (JSON stringificato) o variabili separate (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).

---

## Conformità legale

| Requisito | Come soddisfatto |
|-----------|-----------------|
| D.Lgs. 206/2005 — info precontrattuali | `condizioni-vendita.html` obbligatoria |
| Diritto di recesso 14gg | Nota in carrello + email conferma |
| Prezzi IVA inclusa | Tutti i prezzi mostrati sono ivati |
| Consenso T&C | Checkbox obbligatorio pre-checkout |
| GDPR — minimizzazione dati | Solo dati necessari all'ordine salvati |
| GDPR — base giuridica | Esecuzione contratto (Art. 6.1.b GDPR) |
| GDPR — DPA fornitori | Stripe DPA + Resend DPA (da firmare in dashboard) |
| PCI DSS | Stripe hosted checkout — nessun dato carta sui server |
| PSD2 / SCA | Stripe gestisce 3DS automaticamente |
| Conservazione fiscale | Ordini su Firestore senza TTL |
| Email conferma obbligatoria | Resend via webhook entro secondi dal pagamento |

---

## Aggiornamenti CSP (`vercel.json`)

```
script-src: aggiungere https://js.stripe.com
connect-src: aggiungere https://api.stripe.com
frame-src: aggiungere https://js.stripe.com https://hooks.stripe.com
Permissions-Policy: rimuovere payment=()
```

---

## Dipendenze npm (`package.json` root)

```json
{
  "dependencies": {
    "stripe": "^16.0.0",
    "resend": "^3.0.0",
    "firebase-admin": "^12.0.0"
  }
}
```

---

## Fuori scope (Fasi successive)

- Login / registrazione utenti (Fase 2)
- Storico ordini area personale (Fase 3)
- Budget alert Firebase (Fase 5)
- Gestionale: visualizzazione e gestione ordini ricevuti
