# Guida — Creare APK Android del Gestionale MANBAGA con Capacitor

## Prerequisiti da installare

### 1. Node.js
- Scarica da https://nodejs.org (versione LTS)
- Installa normalmente
- Verifica: apri terminale e scrivi `node --version`

### 2. Android Studio
- Scarica da https://developer.android.com/studio
- Durante l'installazione spunta **Android SDK**, **Android SDK Platform**, **Android Virtual Device**
- Al primo avvio lascia che scarichi tutto quello che serve (ci vuole un po')

### 3. Java JDK (se non già installato)
- Android Studio di solito lo installa da solo
- Se dà problemi: scarica **JDK 17** da https://adoptium.net

---

## Configurazione Android Studio

Dopo l'installazione apri Android Studio e vai in:
**SDK Manager → SDK Tools** e assicurati che siano spuntati:
- Android SDK Build-Tools
- Android Emulator
- Android SDK Platform-Tools

Poi imposta la variabile d'ambiente `ANDROID_HOME`:
- Windows: Cerca "Variabili d'ambiente" nelle impostazioni di sistema
- Aggiungi variabile utente: `ANDROID_HOME` = `C:\Users\TUO_NOME\AppData\Local\Android\Sdk`
- Aggiungi al PATH: `%ANDROID_HOME%\tools` e `%ANDROID_HOME%\platform-tools`

---

## Creazione del progetto Capacitor

### Step 1 — Crea una cartella dedicata

Crea una cartella nuova chiamata `manbaga-gestionale-app` da qualche parte sul PC (es. Desktop).

Copia dentro questa cartella **tutto il contenuto** della cartella `gestionale/`:
```
manbaga-gestionale-app/
  ├── gestionale.html       ← rinominalo in index.html !
  ├── (eventuali altre risorse)
```

> ⚠️ IMPORTANTE: Capacitor si aspetta un file `index.html` come entry point.
> Rinomina `gestionale.html` in `index.html`.

---

### Step 2 — Inizializza il progetto

Apri il terminale nella cartella `manbaga-gestionale-app` e lancia:

```bash
npm init -y
```

Poi installa Capacitor:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

---

### Step 3 — Inizializza Capacitor

```bash
npx cap init "MANBAGA Gestionale" "it.manbaga.gestionale" --web-dir .
```

Questo crea un file `capacitor.config.json` nella cartella.

Aprilo e assicurati che sia così:

```json
{
  "appId": "it.manbaga.gestionale",
  "appName": "MANBAGA Gestionale",
  "webDir": ".",
  "server": {
    "androidScheme": "https"
  }
}
```

---

### Step 4 — Aggiungi la piattaforma Android

```bash
npx cap add android
```

Questo crea una cartella `android/` nel progetto.

---

### Step 5 — Sincronizza i file

Ogni volta che modifichi i file HTML/CSS/JS devi lanciare:

```bash
npx cap sync android
```

---

### Step 6 — Apri in Android Studio

```bash
npx cap open android
```

Si apre Android Studio con il progetto.

---

## Compilazione APK

In Android Studio:

1. Aspetta che finisca il Gradle sync (barra in basso — ci vuole qualche minuto la prima volta)
2. Vai su **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Aspetta la compilazione
4. Clicca su **"locate"** nel popup che appare in basso a destra
5. Trovi il file APK in: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Installazione sul telefono Android

1. Copia il file `app-debug.apk` sul telefono (via USB, WhatsApp, email, Google Drive — come preferisci)
2. Sul telefono vai in **Impostazioni → Sicurezza → Installa app da fonti sconosciute** e abilitalo
3. Apri il file APK dal telefono → Installa
4. Trovi l'app installata con il nome **MANBAGA Gestionale**

---

## Icona dell'app (opzionale)

Per mettere il logo MANBAGA come icona:

1. In Android Studio vai in `app/src/main/res/`
2. Sostituisci i file `ic_launcher.png` nelle varie cartelle `mipmap-*` con il logo ridimensionato
   - `mipmap-mdpi`: 48×48px
   - `mipmap-hdpi`: 72×72px
   - `mipmap-xhdpi`: 96×96px
   - `mipmap-xxhdpi`: 144×144px
   - `mipmap-xxxhdpi`: 192×192px

Oppure usa Android Studio: tasto destro su `res → New → Image Asset` e importa il logo.

---

## Aggiornare l'app dopo modifiche

Quando modifichi il gestionale (HTML/CSS/JS) e vuoi aggiornare l'APK:

```bash
npx cap sync android
```

Poi in Android Studio: **Build → Build APK** e reinstalli sul telefono.

---

## Risoluzione problemi comuni

**"ANDROID_HOME not set"**
→ Imposta la variabile d'ambiente come descritto sopra e riapri il terminale.

**Gradle sync fallisce**
→ In Android Studio: File → Invalidate Caches → Restart. Se persiste aggiorna Gradle dall'SDK Manager.

**L'app si apre ma Firebase non carica**
→ Normale se il telefono non ha internet. Con connessione attiva funziona tutto.

**"App not installed" durante installazione APK**
→ Disinstalla prima la versione precedente se presente, poi reinstalla.

**Schermo bianco all'apertura**
→ Controlla che `gestionale.html` sia stato rinominato in `index.html` e che `webDir` in `capacitor.config.json` sia `.`

---

## Note finali

- L'APK generato è in modalità **debug** — funziona perfettamente per uso personale
- Se un giorno vuoi pubblicarlo sul Play Store serve firmare l'APK in modalità **release** (procedura diversa)
- Ogni modifica al gestionale richiede `npx cap sync` + rebuild APK + reinstallazione
- Se preferisci evitare questo ciclo, considera di mettere il gestionale su un URL (Netlify o Firebase Hosting sono gratuiti) — accessibile da qualsiasi dispositivo senza APK
