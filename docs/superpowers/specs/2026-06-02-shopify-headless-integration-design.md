# Shopify Headless Integration — Design Spec
**Data:** 2026-06-02  
**Branch:** feat/ecommerce-fase1  
**Approccio:** Opzione B — Shopify come backend unico, frontend custom invariato

---

## 1. Obiettivo

Sostituire Firebase (Auth + Firestore + Functions) e Stripe con Shopify come backend
unico per pagamenti, ordini, clienti e newsletter. Il frontend — ogni HTML, CSS e
struttura visuale — rimane identico. Solo i file JavaScript vengono riscritti.

---

## 2. Architettura generale

```
Browser (HTML/CSS/JS custom)
    │
    ├─► Shopify Storefront API (GraphQL, pubblico)
    │       prodotti, carrello, auth clienti, lettura metafields
    │
    ├─► /api  (Vercel Functions — server-side, token Admin mai esposto)
    │       POST /api/wishlist           ← scrivi wishlist metafield
    │       POST /api/profile/extended   ← salva birthdate/lang/games
    │       POST /api/webhook/order-paid ← ordini pagati → aggiorna loyalty
    │       POST /api/admin/loyalty-adjust ← rettifica manuale loyalty
    │
    └─► Shopify Admin (UI nativa)
            gestione prodotti, spedizioni, newsletter (Shopify Email)
```

**Firebase rimosso interamente:** Auth, Firestore, Functions, SDK tags, security rules.  
**Stripe rimosso:** checkout gestito da Shopify hosted checkout.

---

## 3. Setup Shopify (pre-sviluppo)

### Store
- Piano: Basic (minimo)
- Provider pagamento: Shopify Payments (o Stripe via Shopify)

### API tokens
| Token | Uso | Dove vive |
|---|---|---|
| Storefront Access Token (pubblico) | Storefront API da browser | `js/shopify-api.js` |
| Admin API token (privato) | Vercel Functions | env var `SHOPIFY_ADMIN_TOKEN` |
| Webhook secret | Verifica HMAC ordini | env var `SHOPIFY_WEBHOOK_SECRET` |

### Metafield definitions (da creare in Shopify Admin)
| Namespace | Key | Tipo | Owner |
|---|---|---|---|
| `loyalty` | `total_spent` | Decimal | Customer |
| `loyalty` | `orders_placed` | Integer | Customer |
| `loyalty` | `tier` | Single line text | Customer |
| `wishlist` | `product_ids` | JSON | Customer |
| `catalog` | `badge` | Single line text | Product |
| `catalog` | `subcat` | Single line text | Product |
| `catalog` | `volume` | Single line text | Product |
| `catalog` | `available_from` | Date | Product |

### Tag prodotti (convenzione)
`cat:manga`, `cat:carte`, `cat:libri`, `cat:gadget`  
`subcat:shonen`, `subcat:pokemon`, ecc. (stessa chiave dei sottomenu attuali)

---

## 4. Nuovo file: `js/shopify-api.js`

Client GraphQL riutilizzabile da tutti gli altri script.

**Responsabilità:**
- `sfApi(query, variables)` — esegue chiamate Storefront API
- `getCustomerToken()` / `setCustomerToken(t)` / `clearCustomerToken()` — gestisce token in localStorage (`mb_customer_token`)
- `sfApiAuthed(query, variables)` — sfApi con header `customerToken` iniettato automaticamente

**Costanti esposte globalmente:**
```js
window.ShopifyAPI = { sfApi, sfApiAuthed, getCustomerToken, setCustomerToken, clearCustomerToken }
```

**Cache prodotti:** sessionStorage `mb_products_cache` con TTL 5 minuti, struttura
`{ ts: timestamp, data: [...] }`. Evita refetch su ogni navigazione pagina.

---

## 5. Auth & Account (`account-init.js` — riscrittura completa)

### Login (email/password)
```graphql
mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
  customerAccessTokenCreate(input: $input) {
    customerAccessToken { accessToken expiresAt }
    customerUserErrors { message }
  }
}
```
Token salvato in localStorage. Nessun cookie di sessione.

### Registrazione
```graphql
mutation customerCreate($input: CustomerCreateInput!) {
  customerCreate(input: $input) {
    customer { id }
    customerUserErrors { message }
  }
}
```
`acceptsMarketing: true` → iscrizione automatica newsletter Shopify Email.  
Dopo registrazione: auto-login via `customerAccessTokenCreate`.

### Logout
```graphql
mutation customerAccessTokenDelete($customerAccessToken: String!) {
  customerAccessTokenDelete(deletedAccessToken, userErrors)
}
```
Poi `clearCustomerToken()` + reload.

### Google login — RIMOSSO
Shopify Storefront API non supporta Google OAuth. Il bottone Google in `account.html`
viene nascosto (`display:none`) o sostituito con testo informativo.

### Lettura profilo + loyalty + ordini
```graphql
query getCustomer($token: String!) {
  customer(customerAccessToken: $token) {
    id firstName lastName email phone createdAt
    metafield(namespace:"loyalty", key:"total_spent")   { value }
    metafield(namespace:"loyalty", key:"orders_placed") { value }
    metafield(namespace:"loyalty", key:"tier")          { value }
    metafield(namespace:"wishlist", key:"product_ids")  { value }
    orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
      edges { node {
        id name processedAt
        totalPriceV2 { amount currencyCode }
        fulfillmentStatus
        lineItems(first: 5) { edges { node { title quantity } } }
      } }
    }
  }
}
```

### Salvataggio profilo
- Nome/cognome/telefono → `customerUpdate` via Storefront API
- Birthdate/lang/favoriteGames → `POST /api/profile/extended` (Vercel, scrive metafield `profile.extended` come JSON via Admin API)

### Funzioni invariate
`_updateTierDisplay(spent)`, `renderProfilo()`, `loadOrdini()`, `loadWishlist()`,
`showAuthTab()`, `showAccTab()` — stessa logica, stessi DOM element ID, stessa
UI manga/comic. Solo le chiamate Firebase sostituite con Shopify API.

---

## 6. Catalogo & Wishlist (`catalogo-init.js` — riscrittura parziale)

### Fetch prodotti
Sostituisce `getProducts()` (attuale: legge da Firestore/localStorage):
```graphql
query getProducts($cursor: String) {
  products(first: 250, after: $cursor, sortKey: CREATED_AT, reverse: true) {
    pageInfo { hasNextPage endCursor }
    edges { node {
      id title handle productType tags
      priceRange { minVariantPrice { amount } }
      images(first: 1) { edges { node { url } } }
      variants(first: 1) { edges { node {
        id availableForSale quantityAvailable
      } } }
      metafield(namespace:"catalog", key:"badge")          { value }
      metafield(namespace:"catalog", key:"subcat")         { value }
      metafield(namespace:"catalog", key:"volume")         { value }
      metafield(namespace:"catalog", key:"available_from") { value }
    } }
  }
}
```
Paginazione automatica se `hasNextPage: true`. Risultato mappato nel formato
`{ id, firestoreId→variantId, title, cat, subcat, badge, price, image, volume, quantity, availableFrom }`
compatibile con il render HTML esistente — `_cardHtml(p)` invariato.

### Wishlist toggle
`toggleWishlist()` sostituisce la chiamata Firestore con:
```
POST /api/wishlist
Body: { action: "add"|"remove", productId: "gid://shopify/Product/..." }
Authorization: Bearer <customerToken>
```
La funzione Vercel legge il token, recupera il customer ID, aggiorna il metafield
`wishlist.product_ids` (JSON array) via Admin API `metafieldsSet`.

`_initWishlist()` legge il metafield al login via `sfApiAuthed`.

---

## 7. Carrello & Checkout (`cart.js` + `carrello.js` — riscrittura completa)

### Cart API flow
```
cartCreate()                         → { id, checkoutUrl }  ← salvato in localStorage
cartLinesAdd(cartId, lines)          → aggiorna items
cartLinesUpdate(cartId, lines)       → cambia quantità
cartLinesRemove(cartId, lineIds)     → rimuove item
cart(id) { lines, cost, checkoutUrl }← fetch stato corrente
```

### MBCart — interfaccia pubblica invariata
```js
MBCart.add({ shopifyVariantId, title, image, price, maxQty })
MBCart.remove(lineId)
MBCart.updateQty(lineId, qty)
MBCart.getItems()   // legge da Shopify cart
MBCart.getTotal()   // da cost.totalAmount
MBCart.checkout()   // redirect a cart.checkoutUrl
MBCart.getCount()   // per badge navbar
```
Il parametro `firestoreId` viene rinominato `shopifyVariantId` internamente.
Le chiamate nei `data-cart-add` degli HTML saranno aggiornate per passare l'ID variante Shopify.

### Pagina carrello (`carrello.html`)
- Il contenuto del carrello viene reso leggendo `cart(id)` dal Shopify Cart API
- Il pulsante checkout fa `window.location.href = cart.checkoutUrl`
- `checkout-success.html` diventa opzionale (Shopify ha la sua thank-you page)

### Pre-order
Il badge `PRE-ORDER` resta visivo (gestito dal metafield `catalog.available_from`).
Il blocco acquisto sui prodotti pre-order usa lo stesso `checkoutUrl` — Shopify gestisce
la disponibilità tramite `availableForSale` e date di rilascio.

---

## 8. Sistema Loyalty

### Lettura (browser)
`customer.metafield(namespace:"loyalty", key:"total_spent")` — letto al login.
Passato a `_updateTierDisplay(spent)` — funzione invariata, stessa tier logic:
Bronze < €500, Silver €500–1499, Gold ≥ €1500.

### Aggiornamento post-acquisto
```
Shopify fires → POST /api/webhook/order-paid
  1. Verifica HMAC (SHOPIFY_WEBHOOK_SECRET)
  2. Estrae customer_id + total_price_set.shop_money.amount
  3. Legge loyalty.total_spent attuale via Admin API
  4. Aggiunge importo, ricalcola tier
  5. Scrive metafieldsSet: total_spent, orders_placed, tier
```

### Rettifica manuale (gestionale)
```
POST /api/admin/loyalty-adjust
  Authorization: Bearer <admin-jwt>  ← generato da gestionale al login admin
  Body: { customerId, delta, reason }
```

---

## 9. Newsletter

Shopify Email (incluso nel piano, fino a 10k email/mese gratis).  
Tutti i clienti registrati con `acceptsMarketing: true` ricevono le campagne.  
Nessun codice aggiuntivo — gestito interamente dall'admin Shopify.

---

## 10. Gestionale (`gestionale/gestionale.html`)

| Sezione | Stato |
|---|---|
| Gestione prodotti (CRUD Firestore) | Sostituita da Shopify Admin |
| Gestione ordini + update status | Sostituita da Shopify Admin (spedizioni, tracking) |
| Loyalty management (manuale) | Resta nel gestionale, chiama `/api/admin/loyalty-adjust` |
| Categorie/sottocategorie | Diventano tag Shopify — gestione da Shopify Admin |

Il gestionale può essere ridotto a: dashboard loyalty + report personalizzati.

---

## 11. Layer serverless Vercel (`/api`)

| File | Endpoint | Operazione |
|---|---|---|
| `api/wishlist.js` | POST `/api/wishlist` | Add/remove dal metafield wishlist.product_ids |
| `api/profile-extended.js` | POST `/api/profile/extended` | Salva birthdate/lang/games come metafield |
| `api/webhook-order.js` | POST `/api/webhook/order-paid` | Loyalty update post-acquisto |
| `api/admin-loyalty.js` | POST `/api/admin/loyalty-adjust` | Rettifica loyalty da gestionale |

**Env vars (Vercel):**
```
SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=...      # pubblico, anche in JS
SHOPIFY_ADMIN_TOKEN=...           # privato, solo server
SHOPIFY_WEBHOOK_SECRET=...        # per HMAC verify
ADMIN_JWT_SECRET=...              # per proteggere /api/admin/*
```

---

## 12. Migrazione prodotti

1. Esporta prodotti da Firestore tramite gestionale (CSV o script Node)
2. Mappa campi: `title`, `price`, `image`, `badge→metafield`, `cat→tag`, `subcat→metafield`, `volume→metafield`
3. Importa in Shopify via Admin CSV import o API batch
4. Verifica metafield definitions create e valorizzate correttamente
5. Test: prodotti visibili nel catalogo con badge e categorie corretti

---

## 13. File da rimuovere dopo migrazione

- Tutte le chiamate `firebase.auth()` e `firebase.firestore()` negli HTML
- Script tag Firebase SDK in ogni pagina HTML
- `functions/` (Firebase Cloud Functions)
- `firestore.indexes.json`
- `firestore.rules`

---

## 14. Piano implementazione (ordine)

1. Setup Shopify store + metafield definitions + Storefront/Admin tokens
2. Setup progetto Vercel + env vars
3. `js/shopify-api.js` — client base + auth token management
4. `api/webhook-order.js` — loyalty post-acquisto
5. `js/account-init.js` — riscrittura auth + profilo + loyalty + ordini + wishlist
6. `api/wishlist.js` + `api/profile-extended.js`
7. `js/catalogo-init.js` — fetch prodotti Shopify + wishlist via API
8. `js/cart.js` + `js/carrello.js` — Shopify Cart API
9. Migrazione prodotti Firestore → Shopify
10. QA completo: auth, catalogo, wishlist, carrello, checkout, loyalty, newsletter
11. Rimozione Firebase da tutti gli HTML
12. Deploy
