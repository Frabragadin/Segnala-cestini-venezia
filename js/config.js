/* ═══════════════════════════════════════════════════════════════════
   SegnalaCestiniVenezia — FILE DI CONFIGURAZIONE
   Modifica questo file per personalizzare l'app per il tuo comune.
   Tutti gli altri file JS leggono da APP_CONFIG — non toccarli.
   ═══════════════════════════════════════════════════════════════════ */

const APP_CONFIG = {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. GOOGLE SERVICES
  //    Ottieni questi valori dal tuo Google Workspace.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbyxeJPcP--55r_j0xoUqNNdBNPI_RkDSqe9iXRU-A7k6poUL31hesYW9vk6MZhlLjLSsg/exec',
                    // Usato da: segnalazione-civica.js (POST nuova seg.) + map.js (risolvi)
  sheetsCsvAperte:  'https://script.google.com/macros/s/AKfycbyxeJPcP--55r_j0xoUqNNdBNPI_RkDSqe9iXRU-A7k6poUL31hesYW9vk6MZhlLjLSsg/exec',
  sheetsCsvRisolte: 'https://script.google.com/macros/s/AKfycbyxeJPcP--55r_j0xoUqNNdBNPI_RkDSqe9iXRU-A7k6poUL31hesYW9vk6MZhlLjLSsg/exec',
   // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. IDENTITA' APP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  app: {
    nome:          'SegnalaCestiniVenezia',
    sottotitolo:   'Invia una nuova segnalazione',
    descrizione:   'Segnala in modo semplice e georeferenziato i problemi del tuo territorio.',
    siteUrl: 'https://frabragadin.github.io/segnala-cestini-venezia/',
    ogImage: 'https://placehold.co/1200x630/0066cc/white?text=Segnala+Cestini+Venezia',
    hashtag:       '#SegnalaCestiniVenezia',
    bannerCrediti: 'Segnala Cestini - Venezia<br/>Servizio del  Comune di Venezia · Veritas',
    // Nota: bannerCrediti viene passato come `expandcontent` a L.controlCredits() in map.js
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. PUBBLICA AMMINISTRAZIONE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  pa: {
    nome:          'Comune di Venezia',
    sito:          'https://www.comune.venezia.it',
    emailDefault:  'ambiente@gruppoveritas.it',
    twitterHandle: '@ComuneVenezia',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. MAPPA
  //    lat/lng: coordinate del centro del tuo comune.
  //    Usa Google Maps o OpenStreetMap per trovare le coordinate.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  mappa: {
    lat:          45.4384,   // latitudine Ponte di Rialto
    lng:          12.3355,   // longitudine Ponte di Rialto
    zoomForm:     14,       // zoom nel form segnalazione (segnalazione-civica.js)
    zoomPubblica: 13,       // zoom mappa pubblica (mappa.html)
    maxZoomForm:  20,       // zoom massimo nel form segnalazione
    maxZoom:      19,       // zoom massimo mappa pubblica
    fitBoundsPad: 0.15,     // padding attorno ai marker (0 = nessun margine, 0.5 = ampio)
    pageSize:     10,       // numero di segnalazioni per pagina nella lista laterale
    loadTimeout:  12000,    // timeout fetch CSV in ms
    popupDelay:   350,      // ritardo apertura popup su click lista in ms
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. CATEGORIE E DESTINATARI
  //    Ogni voce corrisponde a un bottone nel form e a una categoria
  //    nei grafici/statistiche.
  //    Sostituisce dati/destinatari.json E ALL_CATEGORIES in statistiche.js.
  //
  //    Campi:
  //      id          — identificatore univoco (no spazi)
  //      nome        — etichetta breve del bottone
  //      descrizione — sottotitolo del bottone
  //      categoria   — valore salvato nel CSV e usato nei grafici
  //      email       — email dell'ufficio competente (null = nessuna email)
  //      icon        — classe FontAwesome (es: 'fa-solid fa-road')
  //      custom      — se true, l'utente puo inserire un'email libera
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  destinatari: [
  {
    id: 'cestini',
    nome: 'Cestini pieni',
    descrizione: 'Cestino pubblico pieno o traboccante',
    categoria: 'Cestini pieni',
    email: 'ambiente@gruppoveritas.it',
    icon: 'fa-solid fa-trash-can',
    custom: false,
  },
  {
    id: 'rifiuti',
    nome: 'Rifiuti abbandonati',
    descrizione: 'Ingombri, sacchi o rifiuti fuori dai cestini',
    categoria: 'Rifiuti abbandonati',
    email: 'ambiente@gruppoveritas.it',
    icon: 'fa-solid fa-dumpster',
    custom: false,
  },
  {
    id: 'manto_stradale',
    nome: 'Manto stradale',
    descrizione: 'Buche, dissesti o cedimenti',
    categoria: 'Manto stradale',
    email: 'lavoripubblici@comune.venezia.it',
    icon: 'fa-solid fa-road',
    custom: false,
  },
  {
    id: 'illuminazione',
    nome: 'Illuminazione',
    descrizione: 'Lampione spento o guasto',
    categoria: 'Illuminazione pubblica',
    email: 'manutenzione@veritas.it',
    icon: 'fa-solid fa-lightbulb',
    custom: false,
  },
  {
    id: 'verde',
    nome: 'Verde pubblico',
    descrizione: 'Erbacce, alberi pericolanti o aiuole incolte',
    categoria: 'Verde pubblico',
    email: 'verdepubblico@comune.venezia.it',
    icon: 'fa-solid fa-tree',
    custom: false,
  },
  {
    id: 'mobilità',
    nome: 'Mobilità',
    descrizione: 'Segnaletica, dissuasori o barche in divieto',
    categoria: 'Mobilità',
    email: 'mobilita@comune.venezia.it',
    icon: 'fa-solid fa-boat',
    custom: false,
  },
],
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. IMPOSTAZIONI FORM
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  form: {
    maxFoto:           4,     // numero massimo di foto allegabili
    categorieVisibili: 6,     // categorie visibili prima del pulsante "mostra altri"
    maxRisoluzioneImg: 1280,  // larghezza/altezza max foto in px (lato lungo)
    qualitaJpeg:       0.85,  // qualita compressione JPEG (0.0–1.0)
    maxStoriaProfilo:  50,    // max segnalazioni salvate in localStorage
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. SOCIAL SHARING
  //    Rimuovi da 'piattaforme' quelle che non vuoi mostrare.
  //    Ordine dell'array = ordine dei bottoni nel form.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  social: {
    piattaforme:   ['twitter', 'whatsapp', 'facebook', 'telegram', 'bluesky'],
    maxTestoChars: 120,  // lunghezza max descrizione nel testo del post social
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. COLORI MARKER
  //    Colori dei pin sulla mappa pubblica per urgenza e stato.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  marker: {
    Alta:    '#e53535',  // rosso — urgenza alta
    Normale: '#ff9900',  // arancione — urgenza normale
    Bassa:   '#3cb4d8',  // azzurro — urgenza bassa
    Risolta: '#3d5a47',  // verde scuro — segnalazione risolta
    default: '#d4820a',  // ambra — fallback
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 9. COLORI GRAFICI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  grafici: {
    // Palette per il grafico a barre delle categorie (una per barra)
    paletteCategorie: [
      '#d4820a', '#e09a2a', '#c07020', '#f0b040', '#b06010',
      '#3cb4d8', '#2a9ec0', '#4dcae0', '#1a8aaa', '#5ad0e8',
      '#3d5a47', '#2d4435',
    ],
    // Grafico doughnut — urgenza
    urgenza: {
      Alta:    '#e53535',
      Normale: '#ff9900',
      Bassa:   '#3cb4d8',
    },
    // Grafico doughnut — stato
    stato: {
      Nuova:              '#d4820a',
      'In lavorazione':   '#3cb4d8',
      Risolta:            '#3d5a47',
      Chiusa:             '#a8a090',
    },
    // Grafico a barre — andamento nel tempo
    trend: {
      sfondo: 'rgba(212,130,10,0.75)',
      bordo:  '#d4820a',
    },
  },
};
