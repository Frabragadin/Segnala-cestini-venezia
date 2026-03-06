/* ═══════════════════════════════════════════════════════
   SegnalaOra — Cookie & Privacy Consent (GDPR)
   ═══════════════════════════════════════════════════════ */

const CONSENT_KEY = 'segnalaora_cookie_consent';

function _getConsent() {
  try { return localStorage.getItem(CONSENT_KEY); } catch(e) { return null; }
}
function _setConsent(val) {
  try { localStorage.setItem(CONSENT_KEY, val); } catch(e) {}
}

function _loadAnalytics() {
  if (window._gaLoaded) return;
  window._gaLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=UA-87653723-4';
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'UA-87653723-4', { anonymize_ip: true });
}

function cookieAccept() {
  _setConsent('accepted');
  document.getElementById('cookieBanner').style.display = 'none';
  _loadAnalytics();
}

function cookieRefuse() {
  _setConsent('refused');
  document.getElementById('cookieBanner').style.display = 'none';
}

function cookieShowSettings() {
  const b = document.getElementById('cookieBanner');
  if (b) b.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  const consent = _getConsent();
  if (consent === 'accepted') {
    _loadAnalytics();
  } else if (!consent) {
    const b = document.getElementById('cookieBanner');
    if (b) {
      // Piccolo ritardo per non bloccare il rendering
      setTimeout(() => { b.style.display = 'flex'; }, 600);
    }
  }
});
