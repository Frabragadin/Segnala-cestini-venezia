# SegnalaOra — Segnalazioni Civiche

Strumento open source per segnalare problemi del territorio al proprio Comune: buche stradali, rifiuti abbandonati, illuminazione pubblica guasta, verde incurato e molto altro.

**Zero backend** — gira interamente su GitHub Pages. I dati vengono salvati su Google Sheets tramite Google Apps Script.

---

## Funzionalità principali

### 📷 Form di segnalazione (`segnalazione-civica.html`)
Wizard a 4 step guidato:

1. **Foto** — scatta o carica un'immagine; il GPS viene estratto automaticamente dai metadati EXIF
2. **Posizione** — marker trascinabile su mappa Leaflet/OpenStreetMap; geocoding inverso automatico con Nominatim
3. **Dettagli** — categoria (13 tipologie), livello di urgenza, descrizione, nome ed e-mail obbligatori
4. **Invio** — trasmette i dati a Google Sheets (Apps Script), apre i canali selezionati (email Comune, Polizia Locale, WhatsApp, Twitter/X, Facebook) e invia una **e-mail di conferma** automatica al segnalante

Ogni segnalazione riceve un **ID univoco** (`SGN-<timestamp>`) copiabile con un clic e un **token segreto** monouso usato per la risoluzione sicura.

### 🗺️ Mappa pubblica (`index.html`)
- Visualizza tutte le segnalazioni su mappa interattiva con marker colorati per urgenza
- **Tab Aperte / Risolte** — alterna tra segnalazioni attive e già risolte
- Filtri per urgenza e stato nel pannello laterale
- Popup per ogni segnalazione con dettagli, foto (se disponibile) e badge di stato
- Ricerca/zoom automatico al click sulla lista laterale

### ✅ Workflow di risoluzione
La PA riceve nell'e-mail un link `index.html?risolvi=<token>` che apre un modal di conferma. La risoluzione:
1. Aggiorna `Stato → Risolta` e `Data_Risoluzione` direttamente nel foglio Google Sheets tramite Apps Script
2. Ricarica automaticamente la mappa dopo 4 secondi

Il **token** di risoluzione non è mai esposto nel CSV pubblico (rimosso automaticamente dal workflow di sincronizzazione).

### 📸 Upload immagini su GitHub
Le foto caricate vengono inviate in base64 ad Apps Script, che le scrive direttamente nella cartella `img/` del repository tramite GitHub API. L'URL di GitHub Pages viene memorizzato in `URL_Immagine` e mostrato nel popup della mappa.

---

## Architettura

```
segnalazione-civica.html   ─── POST JSON ──▶  Apps Script  ──▶  Google Sheets
                                              └── Gmail (conferma al segnalante)
                                              └── GitHub API (img/{ID}.jpg)

index.html  ◀── fetch CSV ──  Google Sheets (pubblicato come CSV)
                              (sync ogni 30 min via GitHub Actions)
```

| File | Ruolo |
|---|---|
| `segnalazione-civica.html` | Form wizard 4 step |
| `index.html` | Mappa pubblica segnalazioni |
| `dati/apps-script.gs` | Google Apps Script (backend serverless) |
| `dati/template-google-sheets.csv` | Template intestazioni foglio (37 colonne) |
| `dati/segnalazioni.csv` | Copia locale del CSV (generata da GitHub Actions) |
| `.github/workflows/sync-sheets.yml` | Sincronizza il CSV ogni 30 minuti |
| `.github/workflows/sync-images.yml` | Scarica/ottimizza immagini (attivazione manuale) |
| `img/` | Immagini delle segnalazioni caricate via GitHub API |

---

## Setup

### 1. Google Sheets
- Crea un foglio e importa `dati/template-google-sheets.csv` come intestazione (riga 1)
- **File → Pubblica sul Web → CSV** → copia l'URL e incollalo in `SHEETS_CSV_URL` nei due file HTML e nel workflow `sync-sheets.yml`

### 2. Google Apps Script
- Vai su [script.google.com](https://script.google.com) → Nuovo progetto
- Incolla il contenuto di `dati/apps-script.gs`
- Imposta `SHEET_ID` e `SHEET_NAME` con i valori del tuo foglio
- **Distribuisci → Nuova distribuzione → App web** — Esegui come: Me | Accesso: Chiunque
- Incolla l'URL `/exec` nel campo `appsScriptUrl` del CONFIG in entrambi i file HTML

### 3. Personalizzazione Comune
Nel blocco `CONFIG` di `segnalazione-civica.html` compila:
```js
comune: {
  nome:         'Comune di ...',
  emailTecnico: 'ufficio.tecnico@comune.it',
  emailPolizia: 'polizialocale@comune.it',
  whatsapp:     '+39...',
  twitter:      '@ComuneXX',
  facebookPage: 'https://www.facebook.com/ComuneXX',
  siteUrl:      'https://tuonome.github.io/Segnalazioni/',
}
```

### 4. Upload immagini (opzionale)
- Genera un **GitHub Personal Access Token** con scope `repo`
- In Apps Script → Impostazioni progetto → Proprietà script → aggiungi `GITHUB_TOKEN = <token>`
- Il token non va mai scritto nel codice

### 5. GitHub Pages
- Repository → Settings → Pages → Branch: `master` / `(root)`

---

## Librerie utilizzate

- [Leaflet.js](https://leafletjs.com/) 1.9.4 — mappe OpenStreetMap
- [exifr](https://github.com/MikeKovarik/exifr) — estrazione GPS da EXIF foto
- [Font Awesome](https://fontawesome.com/) 6.7.2 — icone
- [Nominatim](https://nominatim.org/) (OpenStreetMap) — geocoding inverso
- Google Fonts: Fraunces + DM Sans

---

## Crediti

Idea di **Andrea Borruso**, **Salvatore Fiandaca**, **Ciro Spataro** e **Giovan Battista Vitrano**
By [@opendatasicilia](https://opendatasicilia.it)

Sviluppo tecnico realizzato attraverso una collaborazione **human–Claude AI** (Anthropic).

<img width="430" height="932" alt="2026-03-06_15h47_51" src="https://github.com/user-attachments/assets/d0740be9-4fd8-430e-a6e4-3c8c4ae0f017" /> <img width="430" height="932" alt="2026-03-06_15h47_42" src="https://github.com/user-attachments/assets/45818975-3a87-4066-81ec-e1c18612442b" /> <img width="430" height="932" alt="2026-03-06_15h48_09" src="https://github.com/user-attachments/assets/34e4cd8e-3bd7-4c65-ab20-3bc6a6e56cd9" />
<img width="430" height="932" alt="2026-03-06_15h48_22" src="https://github.com/user-attachments/assets/1119e6a2-48ec-4e12-b099-52e2f95222bb" /> <img width="430" height="932" alt="2026-03-06_15h48_29" src="https://github.com/user-attachments/assets/091e4e4d-7f17-439c-aab4-161061ab1e9b" />


