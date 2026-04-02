/**
 * SegnalaCestiniVenezia - Statistiche
 * Gestione grafici e statistiche
 */

let allReports = [];
let charts = {};
let activeCategory = null;

document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

async function loadData() {
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTRuFsEGIFOFHPeRKV-3UiSpmyxc1nDXhoOEfL6ZghT0p9vIS26zhNdKbjXUDbWvqR193c2FYHOXlOE/pub?gid=0&single=true&output=csv';
    
    if (!url) {
        console.error('URL CSV non configurato');
        document.getElementById('loadingWrap').style.display = 'none';
        document.getElementById('statsContent').style.display = 'block';
        return;
    }

    try {
        const response = await fetch(url + '?t=' + Date.now());
        const text = await response.text();
        allReports = parseCSV(text);
        
        updateStatsCards();
        renderCategoryFilters();
        renderCharts();
        
        document.getElementById('loadingWrap').style.display = 'none';
        document.getElementById('statsContent').style.display = 'block';
    } catch(error) {
        console.error('Errore caricamento:', error);
        document.getElementById('loadingWrap').innerHTML = '<p>❌ Errore caricamento dati</p>';
    }
}

function parseCSV(text) {
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
    return reports;
}

function updateStatsCards() {
    const totale = allReports.length;
    const aperte = allReports.filter(r => r.Stato !== 'Risolta' && r.Stato !== 'Chiusa').length;
    const alta = allReports.filter(r => r.Urgenza === 'Alta').length;
    const risolte = allReports.filter(r => r.Stato === 'Risolta').length;
    
    document.getElementById('scTotale').textContent = totale;
    document.getElementById('scAperte').textContent = aperte;
    document.getElementById('scAlta').textContent = alta;
    document.getElementById('scRisolte').textContent = risolte;
}

function renderCategoryFilters() {
    const container = document.getElementById('catChips');
    if (!container) return;
    
    const categories = [...new Set(allReports.map(r => r.Categoria).filter(Boolean))].sort();
    
    container.innerHTML = '<button class="cat-chip active" data-cat="all">Tutte</button>';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-chip';
        btn.textContent = cat;
        btn.dataset.cat = cat;
        btn.onclick = () => filterByCategory(cat);
        container.appendChild(btn);
    });
}

function filterByCategory(category) {
    activeCategory = category === 'all' ? null : category;
    document.querySelectorAll('.cat-chip').forEach(btn => {
        btn.classList.remove('active');
        if ((category === 'all' && btn.dataset.cat === 'all') || btn.dataset.cat === category) {
            btn.classList.add('active');
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
    
    const ctxCat = document.getElementById('chartCategorie').getContext('2d');
    charts.categorie = new Chart(ctxCat, {
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
    
    const ctxUrg = document.getElementById('chartUrgenza').getContext('2d');
    charts.urgenza = new Chart(ctxUrg, {
        type: 'doughnut',
        data: {
            labels: ['Alta', 'Normale', 'Bassa'],
            datasets: [{
                data: [urgenza.Alta, urgenza.Normale, urgenza.Bassa],
                backgroundColor: ['#e53535', '#ff9900', '#3cb4d8']
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
                backgroundColor: ['#d4820a', '#3cb4d8', '#3d5a47']
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
    
    // Grafico trend
    const months = {};
    filtered.forEach(r => {
        if (r.Data) {
            const parts = r.Data.split('/');
            if (parts.length === 3) {
                const month = parts[1] + '/' + parts[2];
                months[month] = (months[month] || 0) + 1;
            }
        }
    });
    
    const sortedMonths = Object.keys(months).sort((a,b) => {
        const [ma, ya] = a.split('/');
        const [mb, yb] = b.split('/');
        return new Date(ya, ma-1) - new Date(yb, mb-1);
    });
    
    const ctxTrend = document.getElementById('chartTrend').getContext('2d');
    charts.trend = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: sortedMonths,
            datasets: [{
                label: 'Segnalazioni',
                data: sortedMonths.map(m => months[m]),
                borderColor: '#d4820a',
                backgroundColor: 'rgba(212,130,10,0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}
