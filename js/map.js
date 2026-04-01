/* ═══════════════════════════════════════════════════════
   SegnalaOra — Mappa segnalazioni civiche
   Logica JavaScript della pagina index.html
   Versione con supporto tema chiaro/scuro per la mappa
   ═══════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────
//  CONFIGURAZIONE — valori letti da js/config.js (APP_CONFIG)
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
//  REGISTRO UTILIZZI (progetto originale)
//  Invia l'hostname di questa istanza all'autore del progetto
//  una volta al giorno per browser, tramite il foglio "Utilizzi".
//  Per non partecipare: lascia SEGNALAORA_REGISTRY_URL vuoto
//  oppure rimuovi questo blocco.
// ─────────────────────────────────────────────────────────
const SEGNALAORA_REGISTRY_URL = '';   // ← incolla qui l'URL /exec del tuo Apps Script

// ─────────────────────────────────────────────────────────
//  STATO
// ─────────────────────────────────────────────────────────
let allReports      = [];
let filteredReports = [];
let markers         = [];
let markerById      = {};   // ID_Segnalazione → Leaflet marker
let map;
let osmLayerLight;          // Layer OSM chiaro (default)
let osmLayerDark;           // Layer OSM scuro
let satelliteLayer;         // Layer satellite
let currentMapStyle = 'osm'; // 'osm' o 'satellite'
let activeFilters = { urgenza: 'all', stato: 'all', periodo: 'all' };
let activeCats    = null;   // null = tutte selezionate; Set = solo queste categorie
let highlightedId = null;
let viewMode      = 'aperte';   // 'aperte' | 'risolte'
let _focusTimer   = null;       // timer per apertura popup da focusReport
let currentPage   = 1;
const PAGE_SIZE   = APP_CONFIG.mappa.pageSize;

// ─────────────────────────────────────────────────────────
//  MAPPA INIT
// ─────────────────────────────────────────────────────────
function initMap() {
  map = L.map('map', { zoomControl: true, maxZoom: APP_CONFIG.mappa.maxZoom }).setView(
    [APP_CONFIG.mappa.lat, APP_CONFIG.mappa.lng], APP_CONFIG.mappa.zoomPubblica
  );
  new L.Hash(map);

  // Crea i layer mappa
  osmLayerLight = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> By <a href="https://opendatasicilia.it/" title="@opendatasicilia" target="_blank">@opendatasicilia</a>',
    maxZoom: 19
  });

  // Layer OSM scuro (Stadia Maps Alidade Smooth Dark)
  osmLayerDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, © <a href="https://carto.com/attributions">CARTO</a> By <a href="https://opendatasicilia.it/" title="@opendatasicilia" target="_blank">@opendatasicilia</a>',
    maxZoom: 19
  });

  satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    attribution: '© <a href="https://maps.google.com" target="_blank">Google Maps</a> By <a href="https://opendatasicilia.it/" title="@opendatasicilia" target="_blank">@opendatasicilia</a>',
    maxZoom: 19
  });

  // Applica il layer iniziale in base al tema
  applyMapTheme();

  // Toggle grafico OSM / Satellite
  const LayerToggleControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd(m) {
      const wrap   = L.DomUtil.create('div', 'map-layer-toggle leaflet-control');
      const btnRow = L.DomUtil.create('div', 'mlt-btns', wrap);
      const btnOsm = L.DomUtil.create('button', 'mlt-btn active', btnRow);
      btnOsm.innerHTML = '<i class="fa-solid fa-map"></i> Mappa';
      const btnSat = L.DomUtil.create('button', 'mlt-btn', btnRow);
      btnSat.innerHTML = '<i class="fa-solid fa-satellite"></i> Satellite';
    
      L.DomEvent.disableClickPropagation(wrap);

      L.DomEvent.on(btnOsm, 'click', () => {
        currentMapStyle = 'osm';
        applyMapTheme();
        btnOsm.classList.add('active');
        btnSat.classList.remove('active');
      });
      
      L.DomEvent.on(btnSat, 'click', () => {
        currentMapStyle = 'satellite';
        applyMapTheme();
        btnSat.classList.add('active');
        btnOsm.classList.remove('active');
      });
      
      return wrap;
    }
  });
  new LayerToggleControl().addTo(map);

  // Pulsante Home — riporta la vista su tutti i marker visibili
  const HomeControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd() {
      const wrap = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      const btn  = L.DomUtil.create('button', 'map-home-btn', wrap);
      btn.innerHTML = '<i class="fa-solid fa-house"></i>';
      btn.title     = 'Panoramica — tutte le segnalazioni';
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', goHome);
      return wrap;
    }
  });
  new HomeControl().addTo(map);

  // Legenda urgenza come controllo Leaflet (bottomleft)
  const LegendControl = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd() {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML =
        '<div class="legend-title">Urgenza</div>' +
        '<div class="legend-row"><div class="legend-dot" style="background:#e53535"></div> Alta</div>' +
        '<div class="legend-row"><div class="legend-dot" style="background:#ff9900"></div> Normale</div>' +
        '<div class="legend-row"><div class="legend-dot" style="background:#3cb4d8"></div> Bassa</div>';
      L.DomEvent.disableClickPropagation(div);
      return div;
    }
  });
  new LegendControl().addTo(map);

  // Credits / logo — Leaflet-Control-Credits (L.controlCredits)
  L.controlCredits({
    position:      'bottomright',
    imageurl:      'img/opendatasicilia.png',
    imagealt:      'SegnalaOra — OpenDataSicilia',
    tooltip:       'SegnalaOra — OpenDataSicilia',
    width:         '50px',
    height:        '58px',
    expandcontent: APP_CONFIG.app.bannerCrediti,
  }).addTo(map);
}

/**
 * Applica il layer mappa appropriato in base al tema corrente
 * e alla scelta dell'utente (OSM o Satellite)
 */
function applyMapTheme() {
  // Rimuovi tutti i tile layer correnti
  map.eachLayer((layer) => {
    if (layer instanceof L.TileLayer) {
      map.removeLayer(layer);
    }
  });

  // Determina se il tema scuro è attivo
  const isDark = document.documentElement.classList.contains('dark');
  
  if (currentMapStyle === 'satellite') {
    // Satellite: sempre lo stesso (già sufficientemente scuro)
    satelliteLayer.addTo(map);
  } else {
    // Mappa OSM: scegli versione in base al tema
    if (isDark) {
      osmLayerDark.addTo(map);
    } else {
      osmLayerLight.addTo(map);
    }
  }
}

function goHome() {
  if (markers.length > 0) {
    map.fitBounds(L.featureGroup(markers).getBounds().pad(APP_CONFIG.mappa.fitBoundsPad), { animate: true });
  } else {
    map.setView([APP_CONFIG.mappa.lat, APP_CONFIG.mappa.lng], APP_CONFIG.mappa.zoomPubblica, { animate: true });
  }
}

// ─────────────────────────────────────────────────────────
//  CARICAMENTO CSV
// ─────────────────────────────────────────────────────────
async function loadData() {
  // Usa un unico file CSV per tutte le segnalazioni
  const url = APP_CONFIG.sheetsCsvTutte; // o APP_CONFIG.sheetsCsvAperte se contiene già tutto
  
  if (!url) {
    showDemoData();
    return;
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), APP_CONFIG.mappa.loadTimeout);

  try {
    const cacheBust = url.startsWith('http') ? '&t=' : '?t=';
    const res  = await fetch(url + cacheBust + Date.now(), { signal: controller.signal });
    const text = await res.text();
    clearTimeout(timeoutId);
    allReports = parseCSV(text);
    
    // Filtra in base al viewMode per mostrare solo quelle appropriate
    renderCategoryChips();
    renderAll(); // renderAll() già applica i filtri in base a viewMode
    document.getElementById('loadingOverlay').style.display = 'none';
  } catch(e) {
    clearTimeout(timeoutId);
    const msg = e.name === 'AbortError'
      ? '⏱ Caricamento troppo lento. Controlla la connessione o riprova.'
      : '❌ Impossibile caricare le segnalazioni. Controlla la connessione o riprova tra qualche minuto.';
    showError(msg);
  }
}

function parseCSV(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const rows = splitCSVRows(normalized);
  if (rows.length < 2) return [];

  const headers = parseCSVLine(rows[0]);
  const reports = [];

  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;
    const vals = parseCSVLine(rows[i]);
    const obj  = {};
    headers.forEach((h, idx) => {
      obj[h.trim().replace(/^\uFEFF/, '')] = (vals[idx] !== undefined ? vals[idx] : '').trim();
    });
    // Salta righe senza latitudine valida
    if (!obj.Lat || isNaN(parseFloat(obj.Lat))) continue;
    // Fallback ID univoco se la colonna ID_Segnalazione manca nel foglio
    if (!obj.ID_Segnalazione) {
      obj.ID_Segnalazione = obj.Timestamp_UTC
        ? 'SGN-' + obj.Timestamp_UTC.replace(/\W/g, '')
        : 'row-' + i;
    }
    reports.push(obj);
  }

  return reports;
}

// Divide il testo CSV in righe logiche rispettando i campi quoted multiriga
function splitCSVRows(text) {
  const rows = [];
  let rowStart = 0;
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { i++; } // "" escaped quote
      else inQuotes = !inQuotes;
    } else if (ch === '\n' && !inQuotes) {
      rows.push(text.slice(rowStart, i));
      rowStart = i + 1;
    }
  }
  const last = text.slice(rowStart);
  if (last.trim()) rows.push(last);
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current  = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─────────────────────────────────────────────────────────
//  DATI DEMO (quando gli URL CSV non sono configurati)
// ─────────────────────────────────────────────────────────
function showDemoData() {
  const now = new Date();
  const fmt = d => d.toLocaleDateString('it-IT');

  allReports = [
    { ID_Segnalazione:'SGN-demo1', Data: fmt(now),                    Categoria:'Buche e dissesti stradali',    Categoria_Emoji:'🕳️', Urgenza:'Alta',    Descrizione:'Buca profonda 30cm in mezzo alla carreggiata',    Nome_Segnalante:'Mario R.',  Indirizzo_Completo:'Via Maqueda 100, Palermo',      Via:'Via Maqueda',       Comune:'Palermo', Lat:'38.1144', Long:'13.3614', Stato:'Nuova',        Fonte_Posizione:'GPS'     },
    { ID_Segnalazione:'SGN-demo2', Data: fmt(new Date(now-86400000)),  Categoria:'Illuminazione pubblica guasta',Categoria_Emoji:'💡',  Urgenza:'Normale', Descrizione:'Lampione spento da 3 giorni',                     Nome_Segnalante:'Anna B.',   Indirizzo_Completo:'Via Roma 45, Palermo',          Via:'Via Roma',          Comune:'Palermo', Lat:'38.1172', Long:'13.3644', Stato:'In lavorazione',Fonte_Posizione:'GPS'     },
    { ID_Segnalazione:'SGN-demo3', Data: fmt(new Date(now-172800000)), Categoria:'Rifiuti abbandonati',          Categoria_Emoji:'🗑️', Urgenza:'Normale', Descrizione:'Cumulo di rifiuti ingombranti sul marciapiede',    Nome_Segnalante:'Luca M.',   Indirizzo_Completo:'Piazza Politeama, Palermo',     Via:'Piazza Politeama',  Comune:'Palermo', Lat:'38.1196', Long:'13.3568', Stato:'Risolta',      Fonte_Posizione:'EXIF'    },
    { ID_Segnalazione:'SGN-demo4', Data: fmt(new Date(now-259200000)), Categoria:'Segnaletica danneggiata',      Categoria_Emoji:'🚧', Urgenza:'Bassa',   Descrizione:'Cartello stradale divelta dal vento',             Nome_Segnalante:'Sara T.',   Indirizzo_Completo:'Via Libertà 120, Palermo',      Via:'Via Libertà',       Comune:'Palermo', Lat:'38.1241', Long:'13.3583', Stato:'Nuova',        Fonte_Posizione:'Manuale' },
    { ID_Segnalazione:'SGN-demo5', Data: fmt(new Date(now-345600000)), Categoria:'Alberi e verde pubblico',      Categoria_Emoji:'🌳', Urgenza:'Alta',    Descrizione:'Albero pericolante dopo la tempesta',             Nome_Segnalante:'Paolo G.',  Indirizzo_Completo:'Corso Calatafimi 80, Palermo',  Via:'Corso Calatafimi',  Comune:'Palermo', Lat:'38.1098', Long:'13.3412', Stato:'Risolta',      Fonte_Posizione:'GPS'     },
  ];

  document.getElementById('loadingOverlay').style.display = 'none';
  renderCategoryChips();

  const notice = document.createElement('div');
  notice.style.cssText = 'position:absolute;top:1rem;left:50%;transform:translateX(-50%);background:#fff8e1;border:1.5px solid #ffd54f;border-radius:8px;padding:0.6rem 1rem;font-size:0.75rem;z-index:300;color:#5a4000;white-space:nowrap;';
  notice.textContent = '⚠ Dati demo — assicurati che dati/segnalazioni.csv esista nel repository';
  document.querySelector('.app-body').appendChild(notice);

  renderAll();
}

function showError(msg) {
  document.getElementById('loadingOverlay').innerHTML = `
    <div style="text-align:center;padding:1.5rem 1rem;">
      <p style="color:#c0392b;margin-bottom:0.85rem;font-size:0.9rem;line-height:1.5;">${msg}</p>
      <button onclick="loadData()"
        style="background:none;border:1.5px solid #c0392b;border-radius:8px;padding:0.4rem 1rem;
               font-size:0.85rem;cursor:pointer;color:#c0392b;font-family:'DM Sans',sans-serif;">
        🔄 Riprova
      </button>
    </div>`;
}

// ─────────────────────────────────────────────────────────
//  FILTRI
// ─────────────────────────────────────────────────────────
function setFilter(type, val, el) {
  activeFilters[type] = val;
  el.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  updateFilterActiveBar();
  renderAll();
}

function resetFilters() {
  activeFilters = { urgenza: 'all', stato: 'all', periodo: 'all' };
  activeCats    = null;
  document.querySelectorAll('.chip').forEach(c => {
    if (c.dataset.val === 'all') c.classList.add('active');
    else c.classList.remove('active');
  });
  const periodoSel = document.getElementById('periodoFilter');
  if (periodoSel) periodoSel.value = 'all';
  renderCategoryChips();   // ricostruisce il panel con tutte checked
  updateFilterActiveBar();
  renderAll();
}

function setPeriodo(val) {
  activeFilters.periodo = val;
  updateFilterActiveBar();
  renderAll();
}

function setViewMode(mode) {
  viewMode = mode;
  activeFilters.urgenza = 'all';
  activeFilters.stato   = 'all';
  activeCats            = null;
  document.getElementById('tabAperte').classList.toggle('active', mode === 'aperte');
  document.getElementById('tabRisolte').classList.toggle('active', mode === 'risolte');
  document.getElementById('tabRisolte').classList.toggle('active-resolved', mode === 'risolte');
  document.getElementById('statsAperte').style.display  = mode === 'aperte'  ? '' : 'none';
  document.getElementById('statsRisolte').style.display = mode === 'risolte' ? '' : 'none';
  document.getElementById('filtersPanel').style.display = mode === 'risolte' ? 'none' : '';
  loadData();
}

function parseItalianDate(str) {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  return new Date(+parts[2], +parts[1] - 1, +parts[0]);
}

function isInPeriod(dateStr, periodo) {
  if (periodo === 'all') return true;
  const d = parseItalianDate(dateStr);
  if (!d) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(periodo));
  return d >= cutoff;
}

function applyFilters() {
  return allReports.filter(r => {
    // Filtra in base al viewMode (aperte/risolte)
    if (viewMode === 'aperte') {
      // Mostra solo NON risolte (Nuova, In lavorazione)
      if (r.Stato === 'Risolta' || r.Stato === 'Chiusa') return false;
    } else if (viewMode === 'risolte') {
      // Mostra solo risolte
      if (r.Stato !== 'Risolta') return false;
    }
    
    // Altri filtri
    if (activeCats !== null && !activeCats.has(r.Categoria)) return false;
    if (!isInPeriod(r.Data, activeFilters.periodo)) return false;
    if (activeFilters.urgenza !== 'all' && r.Urgenza !== activeFilters.urgenza) return false;
    if (activeFilters.stato !== 'all' && r.Stato !== activeFilters.stato) return false;
    
    return true;
  });
}

// ─────────────────────────────────────────────────────────
//  DROPDOWN MULTI-SELECT CATEGORIA
// ─────────────────────────────────────────────────────────
function renderCategoryChips() {
  const container = document.getElementById('catChecks');
  if (!container) return;

  const cats = [...new Set(allReports.map(r => r.Categoria).filter(Boolean))].sort();
  container.innerHTML = '';

  cats.forEach(cat => {
    const div = document.createElement('div');
    div.className  = 'col-panel-option';
    const sel      = activeCats === null || activeCats.has(cat);
    div.innerHTML  = `<span class="col-chk${sel ? ' checked' : ''}"></span>`
                   + `<span class="col-opt-label${sel ? ' selected' : ''}">${cat}</span>`;
    div.addEventListener('click', () => {
      if (activeCats === null) activeCats = new Set(cats);  // da "tutte" a selettivo
      if (activeCats.has(cat)) activeCats.delete(cat);
      else activeCats.add(cat);
      if (activeCats.size === cats.length) activeCats = null; // tutte selezionate → reset
      const isSel = activeCats === null || activeCats.has(cat);
      div.querySelector('.col-chk').className       = 'col-chk'       + (isSel ? ' checked' : '');
      div.querySelector('.col-opt-label').className = 'col-opt-label' + (isSel ? ' selected' : '');
      syncCatCheckbox(cats);
      updateFilterActiveBar();
      renderAll();
    });
    container.appendChild(div);
  });

  syncCatCheckbox(cats);
}

function syncCatCheckbox(cats) {
  const total   = cats.length;
  const selCount = activeCats === null ? total : activeCats.size;
  const badge    = document.getElementById('catDdBadge');
  if (badge) badge.textContent = selCount;

  const chk = document.getElementById('catChkAll');
  if (!chk) return;
  const allSel  = activeCats === null;
  const noneSel = activeCats !== null && activeCats.size === 0;
  chk.className = 'col-chk' + (allSel ? ' checked' : noneSel ? '' : ' indeterminate');
  const lbl = document.querySelector('#catOptAll .col-opt-label');
  if (lbl) lbl.className = 'col-opt-label col-opt-all-label' + (allSel ? ' selected' : '');
}

function toggleCatPanel() {
  const panel   = document.getElementById('catPanel');
  const chevron = document.getElementById('catPanelChevron');
  const open    = panel.style.display === 'block';
  panel.style.display = open ? 'none' : 'block';
  chevron.className   = 'col-dd-chevron fa-solid ' + (open ? 'fa-chevron-down' : 'fa-chevron-up');
}

function toggleAllCatsClick() {
  const cats   = [...document.querySelectorAll('#catChecks .col-panel-option')]
                   .map(d => d.querySelector('.col-opt-label').textContent);
  const allSel = activeCats === null;
  if (allSel) {
    activeCats = new Set();   // deseleziona tutte
  } else {
    activeCats = null;        // seleziona tutte
  }
  document.querySelectorAll('#catChecks .col-panel-option').forEach(div => {
    const sel = activeCats === null;
    div.querySelector('.col-chk').className       = 'col-chk'       + (sel ? ' checked' : '');
    div.querySelector('.col-opt-label').className = 'col-opt-label' + (sel ? ' selected' : '');
  });
  syncCatCheckbox(cats);
  updateFilterActiveBar();
  renderAll();
}

function clearCatFilter(e) {
  e.stopPropagation();
  activeCats = null;
  renderCategoryChips();
  updateFilterActiveBar();
  renderAll();
}

function updateFilterActiveBar() {
  const bar  = document.getElementById('filterActiveBar');
  const text = document.getElementById('filterActiveText');
  if (!bar || !text) return;

  const parts = [];

  if (activeCats !== null) {
    if (activeCats.size === 0) {
      parts.push('<strong>Categoria:</strong> nessuna');
    } else {
      parts.push('<strong>Categoria:</strong> ' + [...activeCats].join(', '));
    }
  }

  const pSel = document.getElementById('periodoFilter');
  if (pSel && pSel.value !== 'all') {
    const pLabels = { '7': 'Ultimi 7 giorni', '30': 'Ultimi 30 giorni', '90': 'Ultimi 90 giorni' };
    parts.push('<strong>Periodo:</strong> ' + (pLabels[pSel.value] || pSel.value));
  }
  if (activeFilters.urgenza !== 'all') parts.push('<strong>Urgenza:</strong> ' + activeFilters.urgenza);
  if (activeFilters.stato   !== 'all') parts.push('<strong>Stato:</strong> '   + activeFilters.stato);

  bar.style.display  = parts.length ? 'flex' : 'none';
  text.innerHTML     = parts.join(' &nbsp;·&nbsp; ');
}

// ─────────────────────────────────────────────────────────
//  RICERCA INDIRIZZO (Nominatim)
// ─────────────────────────────────────────────────────────
async function searchAddress() {
  const input = document.getElementById('addrInput');
  const query = (input ? input.value : '').trim();
  if (!query) { if (input) input.focus(); return; }

  const btn = document.querySelector('.addr-search-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }

  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(query);
    const res  = await fetch(url, { headers: { 'Accept-Language': 'it' } });
    const data = await res.json();

    if (data && data.length > 0) {
      const { lat, lon, display_name } = data[0];
      map.setView([parseFloat(lat), parseFloat(lon)], 16, { animate: true });
      // Marker temporaneo
      const pin = L.marker([parseFloat(lat), parseFloat(lon)], {
        icon: L.divIcon({
          className: '',
          html: '<div style="width:14px;height:14px;background:var(--amber);border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
          iconSize: [14,14], iconAnchor: [7,7]
        })
      }).addTo(map).bindPopup(`<small>${display_name}</small>`).openPopup();
      setTimeout(() => map.removeLayer(pin), 8000);
    } else {
      if (input) { input.classList.add('addr-not-found'); setTimeout(() => input.classList.remove('addr-not-found'), 1200); }
    }
  } catch(e) {}

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>'; }
}

// ─────────────────────────────────────────────────────────
//  RENDER
// ─────────────────────────────────────────────────────────
function renderAll() {
  filteredReports = applyFilters();
  currentPage = 1;
  updateStats();
  renderMarkers();
  renderList();
}

function updateStats() {
  // Calcola i totali su TUTTE le segnalazioni (non filtrate)
  const totali = allReports.length;
  const nuove = allReports.filter(r => r.Stato === 'Nuova').length;
  const lavorazione = allReports.filter(r => r.Stato === 'In lavorazione').length;
  const risolte = allReports.filter(r => r.Stato === 'Risolta').length;
  
  if (viewMode === 'risolte') {
    const statRes = document.getElementById('statRes');
    if (statRes) statRes.textContent = risolte;
  } else {
    const statNuove = document.getElementById('statNuove');
    const statLav = document.getElementById('statLav');
    const statTot = document.getElementById('statTot');
    if (statNuove) statNuove.textContent = nuove;
    if (statLav) statLav.textContent = lavorazione;
    if (statTot) statTot.textContent = totali;
  }
  
  // Aggiorna il badge nel tab Risolte
  const tabRisolte = document.getElementById('tabRisolte');
  if (tabRisolte) {
    let badge = tabRisolte.querySelector('.tab-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'tab-badge';
      tabRisolte.appendChild(badge);
    }
    badge.textContent = risolte;
  }
  
  // Aggiorna anche il badge nel tab Aperte (opzionale)
  const tabAperte = document.getElementById('tabAperte');
  if (tabAperte) {
    let badge = tabAperte.querySelector('.tab-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'tab-badge';
      tabAperte.appendChild(badge);
    }
    badge.textContent = nuove + lavorazione;
  }
}

function makeMarkerIcon(urgenza, stato) {
  if (stato === 'Risolta') {
    return L.divIcon({
      className: '',
      html: `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 14 22 14 22S28 23.8 28 14C28 6.3 21.7 0 14 0z" fill="${APP_CONFIG.marker.Risolta}"/>
        <path d="M8 14l4 4 8-8" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>`,
      iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -36]
    });
  }
  const color = APP_CONFIG.marker[urgenza] || APP_CONFIG.marker.default;
  return L.divIcon({
    className: '',
    html: `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 14 22 14 22S28 23.8 28 14C28 6.3 21.7 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`,
    iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -36]
  });
}

function renderMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers    = [];
  markerById = {};

  filteredReports.forEach(report => {
    const lat = parseFloat(report.Lat);
    const lng = parseFloat(report.Long);
    if (isNaN(lat) || isNaN(lng)) return;

    const m = L.marker([lat, lng], { icon: makeMarkerIcon(report.Urgenza, report.Stato) });
    m.bindPopup(makePopupHTML(report), { maxWidth: 300 });
    m.on('click', () => {
      if (window.innerWidth <= 768) {
        m.closePopup();
        expandReportItem(report.ID_Segnalazione);
      } else {
        highlightListItem(report.ID_Segnalazione);
      }
    });
    m.addTo(map);
    markers.push(m);
    markerById[report.ID_Segnalazione] = m;
  });

  if (markers.length > 0) {
    map.fitBounds(L.featureGroup(markers).getBounds().pad(APP_CONFIG.mappa.fitBoundsPad));
  }
}

function makePopupHTML(r) {
  const urgColor  = APP_CONFIG.marker[r.Urgenza] || APP_CONFIG.marker.default;
  const addrShort = (r.Via ? r.Via + (r.Numero_Civico ? ' ' + r.Numero_Civico : '') + ', ' : '') +
                    (r.Comune || r.Indirizzo_Completo || '');

  let html = `<div class="popup-cat">${catIcon(r.Categoria_Emoji)} ${r.Categoria}</div>`;
  html += `<div class="popup-row"><span>📌</span><span>${addrShort || r.Indirizzo_Completo}</span></div>`;
  html += `<div class="popup-row"><span>📅</span><span>${r.Data} ${r.Ora || ''}</span></div>`;
  html += `<div class="popup-row">
    <span style="color:${urgColor};font-weight:600">${
      r.Urgenza === 'Alta' ? '🔴' : r.Urgenza === 'Bassa' ? '🔵' : '🟠'
    } ${r.Urgenza}</span>
    <span style="margin-left:0.5rem">${makeStatoBadge(r.Stato)}</span>
  </div>`;
  if (r.Nome_Segnalante) {
    html += `<div class="popup-row"><span>👤</span><span>${r.Nome_Segnalante}</span></div>`;
  }
  if (r.Descrizione) {
    html += `<div class="popup-descr">${r.Descrizione.substring(0, 120)}${r.Descrizione.length > 120 ? '...' : ''}</div>`;
  }
  if (r.URL_Immagine) {
    html += `<img class="popup-img-thumb" src="${r.URL_Immagine}"
      loading="lazy" title="Clicca per ingrandire"
      onclick="openLightbox('${r.URL_Immagine}')"
      onerror="this.style.display='none'
