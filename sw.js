/* =========================================================================
   Service worker — Chantier partagé (sans serveur) : fonctionnement hors connexion
   -------------------------------------------------------------------------
   · Fichiers de l'appli : réseau d'abord (une nouvelle version est prise dès
     la prochaine ouverture avec du réseau), puis le cache. Au-delà de 3,5 s
     sans réponse du réseau, le cache est servi sans attendre.
   · Polices Google : cache d'abord, elles ne changent pas.
   · Les données ne passent jamais par ici : elles restent dans le téléphone
     (IndexedDB) et voyagent dans les fichiers que l'équipe s'envoie.
   À chaque publication, augmentez le numéro de CACHE pour faire le ménage.
   ========================================================================= */
const CACHE = 'chantier-partage-local-2.0.0';
const CACHE_EXTERNE = 'chantier-partage-local-externe';
const FICHIERS = ['./', './index.html', './style.css', './modele.js', './pdf.js', './rapport.js', './app.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon.png'];
const DELAI_RESEAU = 3500;

const delai = (ms) => new Promise((ok) => setTimeout(ok, ms));

function servir(requete, estPage) {
  const reseau = fetch(requete, { cache: 'no-cache' }).then((rep) => {
    if (rep && rep.ok) {
      const copie = rep.clone();
      caches.open(CACHE).then((c) => c.put(requete, copie)).catch(() => {});
    }
    return rep && rep.ok ? rep : null;
  }).catch(() => null);

  return Promise.race([reseau, delai(DELAI_RESEAU)]).then((vite) =>
    vite || caches.match(requete, { ignoreSearch: true })
      .then((c) => c || (estPage ? caches.match('./') : null))
      .then((c) => c || reseau)
      .then((c) => c || new Response('Hors connexion', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
  );
}

function cacheDabord(requete) {
  return caches.match(requete).then((c) => c || fetch(requete).then((rep) => {
    if (rep && (rep.ok || rep.type === 'opaque')) {
      const copie = rep.clone();
      caches.open(CACHE_EXTERNE).then((cache) => cache.put(requete, copie)).catch(() => {});
    }
    return rep;
  }));
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((noms) => Promise.all(noms.filter((n) => n !== CACHE && n !== CACHE_EXTERNE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin) {
    e.respondWith(servir(e.request, e.request.mode === 'navigate'));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(cacheDabord(e.request));
});
