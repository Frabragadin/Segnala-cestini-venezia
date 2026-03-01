# Piano: Web App SegnalaOra — Segnalazioni Civiche

## Contesto

Il progetto ha già un prototipo UI funzionante (`segnalazione-civica.html`, 919 righe) con wizard 4 step, design system coerente, Leaflet/OSM, GPS, reverse geocoding via Nominatim.

**Cosa mancava al prototipo:**
- Estrazione EXIF GPS reale dalla foto
- Ridimensionamento immagini a 1280px
- Invio dati a backend/archivio
- Mappa pubblica delle segnalazioni
- Link sociali funzionanti

**Approccio scelto: zero backend, zero API key esposte nel codice**

| Funzione | Soluzione |
|---|---|
| Archivio dati | Google Form nascosto → Google Sheets automatico |
| Mappa pubblica | Google Sheets pubblicato come CSV → `fetch()` senza API |
| Immagini | Ridimensionate a 1280px client-side (Canvas API), allegate via email |
| Social/email | Web intents: `mailto:`, `wa.me`, Twitter Intent, Facebook Share |

---

## Struttura file

```
Segnalazioni/
├── index.html                      ← Mappa pubblica di tutte le segnalazioni
├── segnalazione-civica.html        ← App segnalazione (wizard 4 step)
├── piano.md                        ← Questo file
├── js/
│   └── (exifr caricato da CDN)
├── dati/
│   └── template-google-sheets.csv  ← Template importazione Google Sheets
└── img/                            ← Vuota
```

---

## Funzionalità implementate

### `segnalazione-civica.html`

#### Step 1 — Foto
- Upload tramite fotocamera o galleria
- **Ridimensionamento automatico a max 1280px** (Canvas API, qualità 85%)
- **Estrazione EXIF GPS** dalla foto con libreria `exifr` (CDN)
- Mostra dimensioni risultanti e dimensione file
- Indicatore visivo se GPS trovato nei metadati

#### Step 2 — Posizione
- Mappa Leaflet/OpenStreetMap interattiva
- Marker trascinabile e click sulla mappa per riposizionare
- **Priorità posizione:** EXIF foto → GPS device → Manuale
- Reverse geocoding via Nominatim (via, civico, CAP, comune, provincia, regione)
- Pulsante "Da foto EXIF" visibile solo se coordinate trovate

#### Step 3 — Dettagli
- 13 categorie con emoji
- Urgenza (Alta/Normale/Bassa)
- Descrizione libera
- Nome/nickname (opzionale)
- Email per aggiornamenti (opzionale)

#### Step 4 — Invio
- Selezione destinatari: Comune, WhatsApp, Twitter/X, Facebook, Polizia Locale
- Anteprima messaggio generato dinamicamente
- Avviso visivo se `CONFIG` non è ancora configurato

#### Invio reale
```
onSend():
  1. POST silenzioso a Google Form (no-cors, dati in Google Sheets)
  2. Email  → mailto: con soggetto e corpo precompilati
  3. WhatsApp → wa.me con testo pronto
  4. Twitter/X → twitter.com/intent/tweet con testo e hashtag
  5. Facebook → facebook.com/sharer con URL
  6. Schermata successo con ID ticket (SGN-XXXXXXXXXX)
```

### `index.html` (mappa pubblica)
- Mappa Leaflet full-screen
- Fetch automatico dal Google Sheets CSV pubblicato
- Marker colorati per urgenza: 🔴 Alta · 🟡 Normale · 🟢 Bassa
- Popup con: categoria, data, indirizzo, urgenza, stato
- Pannello filtri: categoria, urgenza, stato, periodo
- Counter: totale · in attesa · risolte
- Link "Fai una segnalazione →"

---

## Colonne Google Sheets (35 campi)

| # | Campo | Tipo | Descrizione |
|---|---|---|---|
| 1 | ID_Segnalazione | Testo | SGN-XXXXXXXXXX (timestamp ms) |
| 2 | Timestamp_UTC | Data/Ora | ISO 8601 |
| 3 | Data | Data | gg/mm/aaaa |
| 4 | Ora | Ora | hh:mm |
| 5 | Categoria | Testo | Es: Buche stradali |
| 6 | Categoria_Emoji | Testo | Es: 🕳️ |
| 7 | Urgenza | Testo | Alta / Normale / Bassa |
| 8 | Descrizione | Testo lungo | Note libere dell'utente |
| 9 | Nome_Segnalante | Testo | Nickname o anonimo |
| 10 | Email_Segnalante | Email | Opzionale |
| 11 | Lat | Numero | Decimale (es. 38.115556) |
| 12 | Long | Numero | Decimale (es. 13.361389) |
| 13 | Indirizzo_Completo | Testo | Da Nominatim reverse geocoding |
| 14 | Via | Testo | Estratto da Nominatim |
| 15 | Numero_Civico | Testo | Estratto da Nominatim |
| 16 | CAP | Testo | Estratto da Nominatim |
| 17 | Comune | Testo | Estratto da Nominatim |
| 18 | Provincia | Testo | Estratto da Nominatim |
| 19 | Regione | Testo | Estratto da Nominatim |
| 20 | Fonte_Posizione | Testo | GPS / EXIF / Manuale |
| 21 | Accuratezza_GPS_m | Numero | Metri (solo se GPS device) |
| 22 | Destinatari | Testo | Lista separata da ";" |
| 23 | Canale_Email | Sì/No | Email PA aperta |
| 24 | Canale_WhatsApp | Sì/No | Link WhatsApp aperto |
| 25 | Canale_Twitter | Sì/No | Tweet intent aperto |
| 26 | Canale_Facebook | Sì/No | Share dialog aperto |
| 27 | Ha_Immagine | Sì/No | Utente ha caricato foto |
| 28 | Dimensioni_Immagine | Testo | Es: 1280x960 |
| 29 | Testo_Messaggio | Testo lungo | Messaggio completo generato |
| 30 | URL_Segnalazione | URL | Link pubblico all'app |
| 31 | Stato | Testo | Nuova / In lavorazione / Risolta / Chiusa |
| 32 | Note_Ufficio | Testo | Uso interno PA |
| 33 | Operatore | Testo | Chi ha gestito la pratica |
| 34 | Data_Presa_Carico | Data | Quando PA ha iniziato |
| 35 | Data_Risoluzione | Data | Quando risolta |

---

## Setup manuale (10 minuti, una volta sola)

### 1. Crea il Google Form

1. Vai su [forms.google.com](https://forms.google.com) e crea un nuovo form
2. Aggiungi i 35 campi usando i nomi esatti della tabella sopra
3. Imposta tutti i campi come **risposta breve** (o paragrafo per i testi lunghi)
4. Non rendere obbligatorio nessun campo (l'app li gestisce internamente)

### 2. Recupera l'URL del form e gli ID dei campi

1. Pubblica il form → clicca **Anteprima** (icona occhio)
2. Nell'URL del form pubblicato, annota la parte `1FAIpQLSXXXXX`
3. L'URL action sarà: `https://docs.google.com/forms/d/e/1FAIpQLSXXXXX/formResponse`
4. Fai clic destro → **Ispeziona** → cerca gli input con `name="entry.XXXXXXXXXX"`
5. Ogni campo ha un `entry.XXXXXXXXXX` unico — annotali tutti

### 3. Collega il form a Google Sheets

1. Nel form: **Risposte** → icona Sheets → **Crea foglio di lavoro**
2. Si crea automaticamente un foglio con tutte le risposte

### 4. Pubblica il foglio come CSV (per la mappa)

1. Nel Google Sheet: **File → Pubblica sul web**
2. Seleziona **Foglio 1** e formato **Valori separati da virgola (.csv)**
3. Clicca **Pubblica** → copia l'URL generato

### 5. Configura l'app

Apri `segnalazione-civica.html` e compila la sezione `CONFIG`:

```javascript
const CONFIG = {
  googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSXXXXX/formResponse',
  formFields: {
    id:              'entry.XXXXXXXXXX',
    timestamp:       'entry.XXXXXXXXXX',
    // ... tutti i campi
  },
  comune: {
    nome:         'Comune di Palermo',
    emailTecnico: 'ufficio.tecnico@comune.palermo.it',
    emailPolizia: 'polizialocale@comune.palermo.it',
    whatsapp:     '+390916000000',
    twitter:      '@ComunePalermo',
    facebookPage: 'https://www.facebook.com/ComunediPalermo',
    siteUrl:      'https://tuoutente.github.io/Segnalazioni/',
  },
  sheetsCSV: 'https://docs.google.com/spreadsheets/d/ID/pub?gid=0&single=true&output=csv',
};
```

---

## Checklist di verifica

- [ ] Upload foto → preview visibile, dimensioni ridotte a max 1280px
- [ ] Foto con GPS EXIF → coordinate estratte automaticamente
- [ ] GPS device → marker mappa posizionato correttamente
- [ ] Click mappa → marker si sposta, indirizzo aggiornato
- [ ] Drag marker → indirizzo aggiornato
- [ ] Form compilato → POST silenzioso → dati in Google Sheet entro 30 secondi
- [ ] Email → si apre client email con destinatario e testo precompilati
- [ ] WhatsApp → link apre WA/browser con messaggio pronto
- [ ] Twitter/X → intent apre tweet con testo e hashtag
- [ ] Facebook → share dialog si apre con URL
- [ ] Mappa pubblica (index.html) → tutti i marker visibili
- [ ] Filtri mappa → funzionano per categoria/urgenza/stato
- [ ] Popup marker → mostra dettagli completi
- [ ] Mobile iOS Safari → tutto funzionante
- [ ] Mobile Android Chrome → tutto funzionante

---

## Note tecniche

### Perché `mode: 'no-cors'` per Google Form
Il fetch in `no-cors` produce una risposta opaca (non leggibile) ma il dato arriva comunque nel Google Sheet. Non c'è modo di confermare il successo lato client — per questo si mostra sempre la schermata di successo dopo il tentativo.

### Immagini
Le immagini vengono ridimensionate client-side ma **non archiviate in modo centralizzato** senza un backend. Le opzioni disponibili:
- **Email:** l'utente può allegare la foto manualmente
- **Con backend:** usare Cloudinary unsigned upload o GitHub API tramite Apps Script

### EXIF GPS e HEIC (iPhone)
La libreria `exifr` supporta HEIC/HEIF. Su iOS, le foto scattate con Safari potrebbero essere convertite in JPEG prima dell'upload — in quel caso l'EXIF viene preservato.

### Aggiornamento mappa
La mappa pubblica (`index.html`) legge il CSV del Google Sheet pubblicato. L'aggiornamento non è istantaneo: Google può impiegare fino a qualche minuto a propagare le nuove righe nel CSV pubblicato.
