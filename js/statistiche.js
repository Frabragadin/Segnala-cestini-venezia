<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<link rel="canonical" href="https://frabragadin.github.io/Segnala-cestini-venezia/" />
<meta name="description" content="Statistiche delle segnalazioni di cestini pieni e rifiuti abbandonati nel territorio di Venezia." />
<meta name="author" content="Francesco Bragadin">
<meta http-equiv="content-language" content="IT">
<meta name="robots" content="index,follow">
<meta name="creation_Date" content="01/03/2026">
<title>Statistiche — Segnala Cestini Venezia</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Titillium+Web:ital,wght@0,300;0,400;0,600;0,700;1,300&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"/>
<link rel="stylesheet" href="css/app.css">
<link rel="shortcut icon" href="img/favicon.ico"/>
<link rel="icon" href="img/favicon.png" type="image/png"/>
<script src="js/theme.js"></script>

<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-87653723-4"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'UA-87653723-4');
</script>

<!-- Open Graph / Facebook -->
<meta property="og:type"              content="website" />
<meta property="og:url"               content="https://frabragadin.github.io/Segnala-cestini-venezia/statistiche.html" />
<meta property="og:site_name"         content="Segnala Cestini - Venezia" />
<meta property="og:title"             content="Segnala Cestini Venezia | Statistiche" />
<meta property="og:description"       content="Statistiche delle segnalazioni di cestini pieni e rifiuti abbandonati nel territorio di Venezia." />
<meta property="og:image"             content="https://frabragadin.github.io/Segnala-cestini-venezia/img/og-image.jpg" />
<meta property="og:image:width"       content="1200" />
<meta property="og:image:height"      content="630" />
<meta property="og:image:alt"         content="Segnala Cestini Venezia – statistiche" />
<meta property="og:locale"            content="it_IT" />

<!-- Twitter Card -->
<meta name="twitter:card"             content="summary_large_image" />
<meta name="twitter:site"             content="@ComuneVenezia" />
<meta name="twitter:creator"          content="@ComuneVenezia" />
<meta name="twitter:title"            content="Segnala Cestini Venezia | Statistiche" />
<meta name="twitter:description"      content="Statistiche delle segnalazioni di cestini pieni e rifiuti abbandonati nel territorio di Venezia." />
<meta name="twitter:image"            content="https://frabragadin.github.io/Segnala-cestini-venezia/img/og-image.jpg" />
<meta name="twitter:image:alt"        content="Segnala Cestini Venezia – statistiche" />
</head>
<body class="page-stats">
<div class="demo-banner"><i class="fa-solid fa-trash-can"></i> Segnala Cestini - Venezia <button class="demo-banner-close" onclick="this.parentElement.style.display='none'" title="Chiudi"><i class="fa-solid fa-xmark"></i></button></div>

<div class="stats-header">
  <div class="logo-mark"><i class="fa-solid fa-trash-can"></i></div>
  <div>
    <h1>Segnala Cestini Venezia</h1>
    <p>Statistiche segnalazioni</p>
  </div>
  <button class="btn-theme" id="themeToggle" onclick="toggleTheme()" title="Tema">
    <i class="fa-solid fa-moon"></i>
  </button>
</div>

<div id="loadingWrap" class="loading-wrap">
  <div class="spinner"></div>
  <p>Caricamento dati...</p>
</div>

<div id="statsContent" class="stats-content" style="display:none">

  <!-- STAT CARDS -->
  <div class="stat-cards">
    <div class="stat-card">
      <div class="sc-num" id="scTotale">—</div>
      <div class="sc-lbl">Totali</div>
    </div>
    <div class="stat-card warn">
      <div class="sc-num" id="scAperte">—</div>
      <div class="sc-lbl">Aperte</div>
    </div>
    <div class="stat-card danger">
      <div class="sc-num" id="scAlta">—</div>
      <div class="sc-lbl">Alta urgenza</div>
    </div>
    <div class="stat-card ok">
      <div class="sc-num" id="scRisolte">—</div>
      <div class="sc-lbl">Risolte</div>
    </div>
  </div>

  <!-- FILTRO CATEGORIA -->
  <div class="filter-bar" id="filterBar">
    <span class="filter-bar-label"><i class="fa-solid fa-filter"></i> Filtra per categoria:</span>
    <div class="cat-chips" id="catChips"></div>
  </div>

  <!-- CHARTS GRID -->
  <div class="charts-grid">

    <div class="chart-card chart-wide">
      <div class="chart-title"><i class="fa-solid fa-layer-group"></i> Segnalazioni per categoria</div>
      <div class="chart-wrap" id="wrapCategorie"><canvas id="chartCategorie"></canvas></div>
    </div>

    <div class="chart-card">
      <div class="chart-title"><i class="fa-solid fa-circle-exclamation"></i> Per urgenza</div>
      <div class="chart-wrap"><canvas id="chartUrgenza"></canvas></div>
    </div>

    <div class="chart-card">
      <div class="chart-title"><i class="fa-solid fa-clipboard-list"></i> Per stato</div>
      <div class="chart-wrap"><canvas id="chartStato"></canvas></div>
    </div>

    <div class="chart-card chart-wide">
      <div class="chart-title"><i class="fa-solid fa-chart-column"></i> Andamento nel tempo</div>
      <div class="chart-wrap"><canvas id="chartTrend"></canvas></div>
    </div>

  </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="js/config.js"></script>
<script src="js/statistiche.js"></script>

<!-- Cookie Banner -->
<div id="cookieBanner" class="cookie-banner" style="display:none">
  <div class="cookie-banner__content">
    <p><i class="fa-solid fa-cookie-bite"></i> Utilizziamo cookie analitici per migliorare il sito. Leggi la <a href="privacy.html">Privacy Policy</a>.</p>
    <div class="cookie-banner__actions">
      <button class="cookie-btn cookie-btn--accept" onclick="cookieAccept()">Accetta</button>
      <button class="cookie-btn cookie-btn--refuse" onclick="cookieRefuse()">Rifiuta</button>
    </div>
  </div>
</div>
<script src="js/cookie-consent.js"></script>

<!-- BOTTOM NAV mobile -->
<nav class="bottom-nav">
  <a class="bnav-item" href="index.html">
    <i class="fa-solid fa-camera"></i>
    <span>Segnala</span>
  </a>
  <a class="bnav-item" href="mappa.html">
    <i class="fa-solid fa-map-location-dot"></i>
    <span>Mappa</span>
  </a>
  <button class="bnav-item bnav-active" type="button">
    <i class="fa-solid fa-chart-simple"></i>
    <span>Statistiche</span>
  </button>
  <a class="bnav-item" href="profilo.html">
    <i class="fa-solid fa-user"></i>
    <span>Profilo</span>
  </a>
  <a class="bnav-item" href="info.html">
    <i class="fa-solid fa-circle-info"></i>
    <span>Info</span>
  </a>
</nav>
</body>
</html>
