# E-Commerce Fase 2 — Design Spec
**Data:** 2026-05-16  
**Branch:** feat/ecommerce-fase2  
**Stato:** Approvato

---

## Obiettivo

Aggiungere account cliente (Firebase Auth), loyalty server-side, storico ordini, wishlist, gestione stato ordini nell'admin, e supporto pre-order.

---

## 1. Firebase Auth — Account Cliente

### Metodo
Email/Password + Google OAuth via Firebase Auth.

### Nuovi file
- `account.html` — pagina pubblica unica per: login, registrazione, profilo, storico ordini, wishlist
- `js/account-init.js` — tutta la logica auth

### Flusso
1. Utente clicca "Account" che appare sopra in navbar solo dopo aver aperto il carrello → `account.html`
2. Se non loggato: mostra form login/registrazione (tab)
3. Se loggato: mostra profilo (tier, spesa totale, ordini), storico ordini, wishlist
4. Logout disponibile in pagina

### Navbar
Tutte le pagine aggiungono in nav: link "Account" con icona persona. Se loggato, mostra iniziale nome utente come avatar.

### Schema Firestore — `users/{uid}`
```
{
  email: string,
  displayName: string,
  totalSpent: number,       // euro, aggiornato da webhook
  ordersPlaced: number,     // aggiornato da webhook
  createdAt: Timestamp,
  wishlist: subcollection   // vedi §4
}
```

---

## 2. Loyalty Server-Side

### Problema attuale
`mb_loyalty` in localStorage: si perde al cambio device, manipolabile, non aggiornato automaticamente dal webhook.

### Soluzione
- Webhook cerca `users` per `email == session.customer_details.email` e aggiorna `totalSpent` e `ordersPlaced` via `FieldValue.increment`
- Al login: merge localStorage → Firestore (prende il valore maggiore, poi svuota localStorage)
- `carrello.js`: se `firebase.auth().currentUser`, legge tier da Firestore; altrimenti fallback localStorage

### Fallback
Clienti non registrati continuano a usare localStorage (nessuna regressione).

---

## 3. Storico Ordini

### Query
`db.collection('orders').where('customerEmail','==', user.email).orderBy('createdAt','desc').limit(20)`

### UI (in `account.html`)
- Lista card: numero ordine, data, articoli (titolo × qty), totale, stato badge
- Click espande dettaglio prodotti
- Stato badge: `ricevuto` (grigio) → `in preparazione` (giallo) → `spedito` (blu) → `consegnato` (verde)

---

## 4. Wishlist

### Schema Firestore — `users/{uid}/wishlist/{productId}`
```
{
  title: string,
  image: string,
  price: string,
  addedAt: Timestamp
}
```

### UI Catalogo
- Icona cuore su ogni card prodotto (richiede Firebase auth check)
- Se non loggato: click sul cuore → tooltip "Accedi per salvare"
- Se loggato: toggle add/remove, cuore pieno/vuoto

### UI Account
- Griglia prodotti salvati con pulsante "Aggiungi al carrello" e "Rimuovi"

---

## 5. Admin — Gestione Stato Ordini

### Nuovo file
- `api/update-order-status.js` — endpoint POST autenticato

### Request
```json
{ "orderId": "cs_xxx", "status": "spedito", "trackingCode": "optional" }
```

### Logica
1. Aggiorna `orders/{orderId}.status` in Firestore
2. Se `status == 'spedito'`: invia email al cliente via Resend con tracking (se fornito)
3. Richiede header `x-admin-secret` (env var `ADMIN_SECRET`) per autenticazione

### UI Gestionale
La view "Ordini Online" (già esistente) aggiunge:
- Select dropdown per cambiare stato
- Input tracking code (opzionale, visibile solo se stato → spedito)
- Badge "NUOVO" sugli ordini con status `ricevuto` non ancora visti
- Statistiche: totale ordini oggi, ricavi del mese, ordini in attesa

---

## 6. Pre-Order

### Schema prodotto (campo aggiuntivo)
```
availableFrom: Timestamp | null   // null = disponibile subito
```

### Catalogo
- Badge "PRE-ORDER" + data disponibilità sulle card
- Aggiungibile al carrello normalmente

### Checkout
- `create-checkout.js`: se prodotto ha `availableFrom > now`, non controlla stock (non decrementa)
- Salva ordine con `status: 'pre-order'` invece di `'paid'`

### Webhook
- Ordini pre-order non decrementano stock al pagamento
- Stock decrementato quando admin cambia stato → `'in preparazione'`

### Gestionale — view Preordini (già esiste)
- Mostra ordini con `status: 'pre-order'` con data disponibilità
- Pulsante "Conferma disponibilità" → cambia stato + decrementa stock

---

## Sequenza di implementazione

1. `account.html` + `js/account-init.js` (auth UI)
2. Navbar aggiornata su tutte le pagine
3. Loyalty merge al login + `carrello.js` update
4. Webhook aggiornamento loyalty Firestore
5. Storico ordini in `account.html`
6. Wishlist (catalogo + account)
7. `api/update-order-status.js`
8. Gestionale ordini: stato + statistiche
9. Pre-order: campo, catalogo, checkout, webhook

---

## Dipendenze tecniche

- Firebase Auth già importato nel gestionale e carrello
- Resend già configurato nel webhook
- Nessuna dipendenza npm aggiuntiva
