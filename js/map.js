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
    satelliteLayer.addTo(map);
  } else {
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
  // URL STATICO del tuo CSV pubblicato da Google Sheets
  // BASTA UN SOLO FILE con TUTTE le segnalazioni (sia aperte che risolte)
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTRuFsEGIFOFHPeRKV-3UiSpmyxc1nDXhoOEfL6ZghT0p9vIS26zhNdKbjXUDbWvqR193c2FYHOXlOE/pub?gid=0&single=true&output=csv';
  
  // Se vuoi usare quello da config.js, decommenta la riga sotto
  // const url = APP_CONFIG.sheetsCsvTutte;
  
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
    
    // CARICA UNA SOLA VOLTA
    allReports = parseCSV(text);
    
    // Pulisce eventuali duplicati per ID_Segnalazione
    const uniqueReports = [];
    const seenIds = new Set();
    for (const report of allReports) {
      if (!seenIds.has(report.ID_Segnalazione)) {
        seenIds.add(report.ID_Segnalazione);
        uniqueReports.push(report);
      }
    }
    allReports = uniqueReports;
    
    console.log(`Caricate ${allReports.length} segnalazioni uniche`);
    
    renderCategoryChips();
    renderAll();
    document.getElementById('loadingOverlay').style.display = 'none';
  } catch(e) {
    clearTimeout(timeoutId);
    console.error('Errore caricamento CSV:', e);
    const msg = e.name === 'AbortError'
      ? '⏱ Caricamento troppo lento. Controlla la connessione o riprova.'
      : '❌ Impossibile caricare le segnalazioni. Controlla la connessione o riprova tra qualche minuto.';
    showError(msg);
    showDemoData();
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
    if (!obj.Lat || isNaN(parseFloat(obj.Lat))) continue;
    if (!obj.ID_Segnalazione) {
      obj.ID_Segnalazione = obj.Timestamp_UTC
        ? 'SGN-' + obj.Timestamp_UTC.replace(/\W/g, '')
        : 'row-' + i;
    }
    reports.push(obj);
  }

  return reports;
}

function splitCSVRows(text) {
  const rows = [];
  let rowStart = 0;
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { i++; }
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
//  DATI DEMO
// ─────────────────────────────────────────────────────────
function showDemoData() {
  const now = new Date();
  const fmt = d => d.toLocaleDateString('it-IT');

  allReports = [
    { ID_Segnalazione:'SGN-demo1', Data: fmt(now), Categoria:'Cestino pieno', Categoria_Emoji:'🗑️', Urgenza:'Alta', Descrizione:'Cestino traboccante in Piazza San Marco', Nome_Segnalante:'Mario R.', Indirizzo_Completo:'Piazza San Marco, Venezia', Via:'Piazza San Marco', Comune:'Venezia', Lat:'45.4342', Long:'12.3390', Stato:'Nuova', Fonte_Posizione:'GPS' },
    { ID_Segnalazione:'SGN-demo2', Data: fmt(new Date(now-86400000)), Categoria:'Cestino danneggiato', Categoria_Emoji:'🗑️', Urgenza:'Normale', Descrizione:'Cestino rotto sul Ponte di Rialto', Nome_Segnalante:'Anna B.', Indirizzo_Completo:'Ponte di Rialto, Venezia', Via:'Ponte di Rialto', Comune:'Venezia', Lat:'45.4380', Long:'12.3355', Stato:'In lavorazione', Fonte_Posizione:'GPS' }
  ];

  document.getElementById('loadingOverlay').style.display = 'none';
  renderCategoryChips();
  renderAll();
}

function showError(msg) {
  document.getElementById('loadingOverlay').innerHTML = `
    <div style="text-align:center;padding:1.5rem 1rem;">
      <p style="color:#c0392b;margin-bottom:0.85rem;font-size:0.9rem;line-height:1.5;">${msg}</p>
      <button onclick="loadData()" style="background:none;border:1.5px solid #c0392b;border-radius:8px;padding:0.4rem 1rem;font-size:0.85rem;cursor:pointer;color:#c0392b;font-family:'DM Sans',sans-serif;">🔄 Riprova</button>
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
  renderCategoryChips();
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
    if (viewMode === 'aperte') {
      if (r.Stato === 'Risolta' || r.Stato === 'Chiusa') return false;
    } else if (viewMode === 'risolte') {
      if (r.Stato !== 'Risolta') return false;
    }
    
    if (activeCats !== null && !activeCats.has(r.Categoria)) return false;
    if (!isInPeriod(r.Data, activeFilters.periodo)) return false;
    if (activeFilters.urgenza !== 'all' && r.Urgenza !== activeFilters.urgenza) return false;
    if (activeFilters.stato !== 'all' && r.Stato !== activeFilters.stato) return false;
    
    return true;
  });
}

// ─────────────────────────────────────────────────────────
//  CATEGORIE
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
      if (activeCats === null) activeCats = new Set(cats);
      if (activeCats.has(cat)) activeCats.delete(cat);
      else activeCats.add(cat);
      if (activeCats.size === cats.length) activeCats = null;
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
    activeCats = new Set();
  } else {
    activeCats = null;
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
//  RICERCA INDIRIZZO
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
      onerror="this.style.display='none'">`;
  }
  return html;
}

function catIcon(val) {
  if (!val) return '📌';
  return val.startsWith('fa-') ? `<i class="${val}"></i>` : val;
}

function makeStatoBadge(stato) {
  const cls = { Nuova: 'stato-nuova', 'In lavorazione': 'stato-lavorazione', Risolta: 'stato-risolta', Chiusa: 'stato-chiusa' };
  return `<span class="stato-badge ${cls[stato] || 'stato-nuova'}">${stato || 'Nuova'}</span>`;
}

function renderList() {
  const list = document.getElementById('reportList');

  if (filteredReports.length === 0) {
    const hasFilters = activeFilters.urgenza !== 'all' || activeFilters.stato !== 'all';
    list.innerHTML = `<div class="no-results">
      🔍 Nessuna segnalazione trovata${hasFilters ? ' con i filtri selezionati' : ''}.
      ${hasFilters ? '<br><button class="no-results-reset" onclick="resetFilters()">Rimuovi filtri</button>' : ''}
    </div>`;
    return;
  }

  const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageReports = filteredReports.slice(start, end);

  let html = '<div class="report-list-container">';
  pageReports.forEach(report => {
    const isHighlighted = highlightedId === report.ID_Segnalazione;
    const addrShort = (report.Via ? report.Via + (report.Numero_Civico ? ' ' + report.Numero_Civico : '') + ', ' : '') +
                      (report.Comune || report.Indirizzo_Completo || '');
    
    html += `
      <div class="report-item ${isHighlighted ? 'highlight' : ''}" data-id="${report.ID_Segnalazione}" onclick="focusReport('${report.ID_Segnalazione}')">
        <div class="report-item-header">
          <span class="report-category">${catIcon(report.Categoria_Emoji)} ${report.Categoria}</span>
          ${makeStatoBadge(report.Stato)}
        </div>
        <div class="report-item-address">📍 ${addrShort}</div>
        <div class="report-item-date">📅 ${report.Data} ${report.Ora || ''}</div>
        <div class="report-item-urgency" style="color:${APP_CONFIG.marker[report.Urgenza] || APP_CONFIG.marker.default}">
          ${report.Urgenza === 'Alta' ? '🔴' : report.Urgenza === 'Bassa' ? '🔵' : '🟠'} ${report.Urgenza}
        </div>
        ${report.Descrizione ? `<div class="report-item-desc">${report.Descrizione.substring(0, 100)}${report.Descrizione.length > 100 ? '...' : ''}</div>` : ''}
      </div>
    `;
  });
  html += '</div>';

  if (totalPages > 1) {
    html += '<div class="pagination">';
    html += `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹ Precedente</button>`;
    html += `<span class="page-info">Pagina ${currentPage} di ${totalPages}</span>`;
    html += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Successiva ›</button>`;
    html += '</div>';
  }

  list.innerHTML = html;
}

function changePage(page) {
  const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderList();
  const listContainer = document.getElementById('reportList');
  if (listContainer) listContainer.scrollTop = 0;
}

function highlightListItem(id) {
  document.querySelectorAll('.report-item').forEach(item => {
    item.classList.remove('highlight');
  });
  const item = document.querySelector(`.report-item[data-id="${id}"]`);
  if (item) {
    item.classList.add('highlight');
    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  highlightedId = id;
}

function expandReportItem(id) {
  focusReport(id);
}

function focusReport(id) {
  const marker = markerById[id];
  if (!marker) return;
  marker.openPopup();
  highlightListItem(id);
  map.setView(marker.getLatLng(), Math.max(map.getZoom(), 16), { animate: true });
}

function openLightbox(imgUrl) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.9);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `;
  const img = document.createElement('img');
  img.src = imgUrl;
  img.style.cssText = `
    max-width: 90%;
    max-height: 90%;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
  `;
  overlay.appendChild(img);
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

// Inizializzazione al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadData();
  
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      applyMapTheme();
    });
  }
  
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    applyMapTheme();
  }
});
