/* ============================================================
   MANBAGA Comics & Games — Firebase Config (CONDIVISO)
   ============================================================
   ⚙️  ISTRUZIONI SETUP FIREBASE (una-tantum, ~10 min)
   ─────────────────────────────────────────────────────
   1. Vai su https://console.firebase.google.com
   2. Usa il progetto esistente: prenotazioninegozio-65eb1
      (già attivo per il sistema Tavoli)
   3. Abilita Cloud Firestore:
      → Build → Firestore Database → Create database
      → Scegli "Production mode"
      → Regole iniziali (incolla):
         rules_version = '2';
         service cloud.firestore {
           match /databases/{database}/documents {
             match /products/{id} {
               allow read: if true;
               allow write: if true;
             }
             match /events/{id} {
               allow read: if true;
               allow write: if true;
             }
           }
         }
   4. Abilita Firebase Storage:
      → Build → Storage → Get started
      → Regole iniziali:
         rules_version = '2';
         service firebase.storage {
           match /b/{bucket}/o {
             match /products/{allPaths=**} {
               allow read: if true;
               allow write: if true;
             }
           }
         }
   5. Recupera il tuo storageBucket dalla console:
      → Project Settings → General → Your apps → Firebase SDK snippet
      (di solito: prenotazioninegozio-65eb1.appspot.com
       oppure: prenotazioninegozio-65eb1.firebasestorage.app)
      → Aggiornalo nel valore storageBucket qui sotto
   ============================================================ */

var MANBAGA_FIREBASE_CONFIG = {
    apiKey:            'AIzaSyCG0-J2wxZGSz6eDh_E-aAe2uvpTGLmXz0',
    authDomain:        'prenotazioninegozio-65eb1.firebaseapp.com',
    projectId:         'prenotazioninegozio-65eb1',
    storageBucket:     'prenotazioninegozio-65eb1.appspot.com', /* ← aggiorna se necessario */
    messagingSenderId: '466874129336',
    appId:             '1:466874129336:web:fd07925523c35921fe8d4d'
};
