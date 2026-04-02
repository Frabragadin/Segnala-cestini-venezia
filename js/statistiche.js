/**
 * Segnala Cestini Venezia - Statistiche
 * Gestisce grafici e statistiche delle segnalazioni
 */

let allReports = [];
let charts = {};
let activeCategory = null;

// Carica i dati all'avvio
document.addEventListener('DOMContentLoaded', () => {
  loadStatsData();
});

async function loadStatsData() {
  const url = APP_CONFIG.sheetsCsvTutte;
  
  if (!url) {
    console.error('URL CSV non configurato');
    document.getElementById('loadingWrap').style.display = 'none';
    return;
  }

  try {
    const cacheBust = url.startsWith('http') ? '&t=' : '?t=';
    const response = await fetch(url + cacheBust + Date.now());
    const text = await response.text();
    allReports = parseStatsCSV(text);
    
    // Aggiorna statistiche e grafici
    updateStatsCards();
    renderCategoryChips();
    renderCharts();
    
    // Nascondi loading
    document.getElementById('loadingWrap').style.display = 'none';
    document.getElementById('statsContent').style.display = 'block';
    
  } catch(error) {
    console.error('Errore caricamento dati:', error);
    document.getElementById('loadingWrap').innerHTML = '<p>❌ Errore caricamento dati. Riprova più tardi.</p>';
  }
}

function parseStatsCSV(text) {
  const lines = text.split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const reports = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
    const report = {};
    
    headers.forEach((h, idx) => {
      report[h] = values[idx] || '';
    });
    
    if (report.Lat && !isNaN(parseFloat(report.Lat))) {
      reports.push(report);
    }
  }
  
  console.log(`Caricate ${reports.length} segnalazioni`);
  return reports;
}

function updateStatsCards() {
  const totale = allReports.length;
  const aperte = allReports.filter(r => r.Stato !== 'Risolta' && r.Stato !== 'Chiusa').length;
  const altaUrgenza = allReports.filter(r => r.Urgenza === 'Alta').length;
  const risolte = allReports.filter(r => r.Stato === 'Risolta').length;
  
  document.getElementById('scTotale').textContent = totale;
  document.getElementById('scAperte').textContent = aperte;
  document.getElementById('scAlta').textContent = altaUrgenza;
  document.getElementById('scRisolte').textContent = risolte;
}

function renderCategoryChips() {
  const container = document.getElementById('catChips');
  if (!container) return;
  
  const categories = [...new Set(allReports.map(r => r.Categoria).filter(Boolean))].sort();
  
  container.innerHTML = '<button class="cat-chip active" data-category="all">Tutte</button>';
  
  categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = 'cat-chip';
    chip.textContent = cat;
    chip.dataset.category = cat;
    chip.onclick = () => filterByCategory(cat);
    container.appendChild(chip);
  });
}

function filterByCategory(category) {
  activeCategory = category === 'all' ? null : category;
  
  // Aggiorna stile chip
  document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.classList.remove('active');
    if ((category === 'all' && chip.dataset.category === 'all') ||
        (chip.dataset.category === category)) {
      chip.classList.add('active');
    }
  });
  
  renderCharts();
}

function getFilteredReports() {
  if (!activeCategory) return allReports;
  return allReports.filter(r => r.Categoria === activeCategory);
}

function renderCharts() {
  const filtered = getFilteredReports();
  
  // Distruggi grafici esistenti
  Object.values(charts).forEach(chart => {
    if (chart) chart.destroy();
  });
  
  // Grafico categorie
  const categories = {};
  filtered.forEach(r => {
    const cat = r.Categoria || 'Sconosciuta';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  const ctxCategorie = document.getElementById('chartCategorie').getContext('2d');
  charts.categorie = new Chart(ctxCategorie, {
    type: 'bar',
    data: {
      labels: Object.keys(categories),
      datasets: [{
        label: 'Segnalazioni',
        data: Object.values(categories),
        backgroundColor: '#d4820a',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
  
  // Grafico urgenza
  const urgenza = { Alta: 0, Normale: 0, Bassa: 0 };
  filtered.forEach(r => {
    const u = r.Urgenza || 'Normale';
    if (urgenza[u] !== undefined) urgenza[u]++;
    else urgenza.Normale++;
  });
  
  const ctxUrgenza = document.getElementById('chartUrgenza').getContext('2d');
  charts.urgenza = new Chart(ctxUrgenza, {
    type: 'doughnut',
    data: {
      labels: ['Alta', 'Normale', 'Bassa'],
      datasets: [{
        data: [urgenza.Alta, urgenza.Normale, urgenza.Bassa],
        backgroundColor: ['#e53535', '#ff9900', '#3cb4d8'],
        borderRadius: 8
      }]
    },
    options: { responsive: true, maintainAspectRatio: true }
  });
  
  // Grafico stato
  const stato = { Nuova: 0, 'In lavorazione': 0, Risolta: 0 };
  filtered.forEach(r => {
    const s = r.Stato || 'Nuova';
    if (stato[s] !== undefined) stato[s]++;
    else stato.Nuova++;
  });
  
  const ctxStato = document.getElementById('chartStato').getContext('2d');
  charts.stato = new Chart(ctxStato, {
    type: 'doughnut',
    data: {
      labels: ['Nuova', 'In lavorazione', 'Risolta'],
      datasets: [{
        data: [stato.Nuova, stato['In lavorazione'], stato.Risolta],
        backgroundColor: ['#d4820a', '#0984e3', '#2ecc71'],
        borderRadius: 8
      }]
    },
    options: { responsive: true, maintainAspectRatio: true }
  });
  
  // Grafico trend temporale
  const months = {};
  filtered.forEach(r => {
    if (r.Data) {
      const date = new Date(r.Data.split('/').reverse().join('-'));
      const month = date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
      months[month] = (months[month] || 0) + 1;
    }
  });
  
  const ctxTrend = document.getElementById('chartTrend').getContext('2d');
  charts.trend = new Chart(ctxTrend, {
    type: 'line',
    data: {
      labels: Object.keys(months),
      datasets: [{
        label: 'Segnalazioni',
        data: Object.values(months),
        borderColor: '#d4820a',
        backgroundColor: 'rgba(212,130,10,0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: { responsive: true, maintainAspectRatio: true }
  });
}
