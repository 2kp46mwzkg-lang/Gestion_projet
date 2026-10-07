/* =========================================================================
   CHANTIER PARTAGÉ — application (version sans serveur)
   -------------------------------------------------------------------------
   Tout reste dans le téléphone (base locale IndexedDB), comme BFR-Report et
   BFR-Chantier. L'équipe se synchronise par fichiers :
     · le chef crée le projet et l'envoie à l'équipe ;
     · chacun l'importe (« Recevoir ») et choisit son rôle ;
     · le soir, chacun envoie son avancement : au chef de chantier, ou, s'il
       a signalé un point bloquant encore ouvert, à qui peut le lever (chef
       en copie) ;
     · le chef importe les avancements, envoie le point du soir en PDF et
       renvoie le projet à jour à l'équipe.
   La fusion (modele.js) est champ par champ, la valeur la plus récente
   l'emporte : l'ordre des imports n'a pas d'importance.
   ========================================================================= */
(function () {
  'use strict';

  var VERSION_APP = '2.0.0';
  var M = window.Modele;

  /* ============================== Icônes =============================== */
  var TRAIT = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  function svg(trace, sz) { var s = sz || 18; return '<svg class="bfr-ico" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true" ' + TRAIT + '>' + trace + '</svg>'; }
  function duo(fond, trace, sz) { var s = sz || 20; return '<svg class="bfr-ico" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true" ' + TRAIT + '><g fill="currentColor" stroke="none" opacity=".14">' + fond + '</g><g>' + trace + '</g></svg>'; }
  function disque(cx, cy, r) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>'; }
  var BULLE = '<path d="M4.6 4.5h8.4a1.8 1.8 0 0 1 1.8 1.8v3.4a1.8 1.8 0 0 1-1.8 1.8H8.6l-3.2 2.6v-2.6h-.8A1.8 1.8 0 0 1 2.8 9.7V6.3a1.8 1.8 0 0 1 1.8-1.8z"/>';
  var ICO = {
    menu: function (s) { return svg('<line x1="3.5" y1="7" x2="20.5" y2="7"/><line x1="3.5" y1="12" x2="20.5" y2="12"/><line x1="3.5" y1="17" x2="20.5" y2="17"/>', s || 22); },
    retour: function (s) { return svg('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="11 18 5 12 11 6"/>', s || 20); },
    fermer: function (s) { return svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', s || 18); },
    suivant: function (s) { return svg('<polyline points="9 18 15 12 9 6"/>', s || 18); },
    precedent: function (s) { return svg('<polyline points="15 18 9 12 15 6"/>', s || 18); },
    plus: function (s) { return svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', s || 18); },
    valide: function (s) { return svg('<polyline points="19.5 7 9.5 17.5 4.5 12.5"/>', s || 18); },
    valideCercle: function (s) { return duo(disque(12, 12, 10.5), '<circle cx="12" cy="12" r="9"/><polyline points="16 9 10.8 15 8 12.2"/>', s || 20); },
    demi: function (s) { return svg('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/>', s || 20); },
    vide: function (s) { return svg('<circle cx="12" cy="12" r="9"/>', s || 20); },
    interdit: function (s) { return duo(disque(12, 12, 10.5), '<circle cx="12" cy="12" r="9"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/>', s || 20); },
    alerte: function (s) { var p = '<path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'; return duo(p, p + '<line x1="12" y1="9.5" x2="12" y2="13.5"/><line x1="12" y1="17" x2="12.01" y2="17"/>', s || 20); },
    information: function (s) { return duo(disque(12, 12, 10.5), '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/>', s || 20); },
    avancement: function (s) { return svg('<polyline points="3.5 17 9 11.5 13 15.5 20.5 8"/><polyline points="15.5 8 20.5 8 20.5 13"/>', s || 18); },
    effectif: function (s) { return svg('<circle cx="9" cy="8.5" r="3.5"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.2a3.3 3.3 0 0 1 0 6.6"/><path d="M17.5 14.8c2.1.6 3.5 2.3 3.5 4.7"/>', s || 18); },
    personne: function (s) { return svg('<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c0-4 3.4-6.6 7.5-6.6s7.5 2.6 7.5 6.6"/>', s || 18); },
    calendrier: function (s) { return svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/>', s || 20); },
    horloge: function (s) { return svg('<circle cx="12" cy="12" r="8.5"/><polyline points="12 7.5 12 12.2 15.5 14"/>', s || 18); },
    pointSoir: function (s) { var p = '<path d="M20.5 14.2A8.7 8.7 0 0 1 9.8 3.5 9.2 9.2 0 1 0 20.5 14.2z"/>'; return duo(p, p, s || 20); },
    cle: function (s) { return svg('<path d="M14.6 6.4a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>', s || 20); },
    eclaire: function (s) { var p = '<polygon points="13.5 2.5 4.5 13.5 11.5 13.5 10.5 21.5 19.5 10.5 12.5 10.5"/>'; return duo(p, p, s || 20); },
    automate: function (s) {
      return duo('<rect x="7.5" y="7.5" width="9" height="9" rx="1.6"/>', '<rect x="7.5" y="7.5" width="9" height="9" rx="1.6"/><rect x="10.4" y="10.4" width="3.2" height="3.2" rx=".6"/>' +
        '<line x1="10" y1="3.5" x2="10" y2="7.5"/><line x1="14" y1="3.5" x2="14" y2="7.5"/><line x1="10" y1="16.5" x2="10" y2="20.5"/><line x1="14" y1="16.5" x2="14" y2="20.5"/>' +
        '<line x1="3.5" y1="10" x2="7.5" y2="10"/><line x1="3.5" y1="14" x2="7.5" y2="14"/><line x1="16.5" y1="10" x2="20.5" y2="10"/><line x1="16.5" y1="14" x2="20.5" y2="14"/>', s || 20);
    },
    reunion: function (s) { return duo(BULLE, BULLE + '<path d="M17.2 9.6h2a1.8 1.8 0 0 1 1.8 1.8v3.4a1.8 1.8 0 0 1-1.8 1.8h-.6v2.6l-3.2-2.6h-3.6"/>', s || 20); },
    bulle: function (s) { return svg(BULLE, s || 18); },
    crayon: function (s) { return svg('<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><line x1="14.8" y1="5.2" x2="18" y2="8.4"/>', s || 18); },
    corbeille: function (s) { return svg('<line x1="4" y1="6.5" x2="20" y2="6.5"/><path d="M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7"/><path d="M6.5 6.5 7.4 20a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-13.5"/><line x1="10.5" y1="10.5" x2="10.5" y2="17"/><line x1="13.5" y1="10.5" x2="13.5" y2="17"/>', s || 18); },
    copie: function (s) { return svg('<rect x="9" y="9" width="11.5" height="11.5" rx="2"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>', s || 18); },
    courriel: function (s) { return duo('<rect x="2.5" y="5" width="19" height="14" rx="2.4"/>', '<rect x="2.5" y="5" width="19" height="14" rx="2.4"/><polyline points="3.2 6.5 12 12.5 20.8 6.5"/>', s || 20); },
    envoi: function (s) { return svg('<line x1="21" y1="3" x2="11" y2="13"/><polygon points="21 3 14.5 21 11 13 3 9.5"/>', s || 18); },
    recevoir: function (s) { return svg('<line x1="12" y1="3.5" x2="12" y2="15"/><polyline points="7.5 10.5 12 15 16.5 10.5"/><path d="M4.5 17.5v1.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1.5"/>', s || 20); },
    document: function (s) { var p = '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/>'; return duo(p, p + '<polyline points="13.8 3.5 13.8 8.7 19 8.7"/><line x1="8.5" y1="12.5" x2="15.5" y2="12.5"/><line x1="8.5" y1="16" x2="13.5" y2="16"/>', s || 20); },
    liste: function (s) { return svg('<line x1="10" y1="6.5" x2="20.5" y2="6.5"/><line x1="10" y1="12" x2="20.5" y2="12"/><line x1="10" y1="17.5" x2="20.5" y2="17.5"/><polyline points="3.5 6.5 5 8 7.4 5.2"/><polyline points="3.5 12 5 13.5 7.4 10.7"/><circle cx="5.3" cy="17.5" r="1.4"/>', s || 18); },
    modeEmploi: function (s) { var p = '<path d="M2.5 4.5h6.5a4 4 0 0 1 3 1.4 4 4 0 0 1 3-1.4h6.5v13H15a3 3 0 0 0-3 1.5 3 3 0 0 0-3-1.5H2.5z"/>'; return duo(p, p + '<line x1="12" y1="6.5" x2="12" y2="17.5"/>', s || 20); },
    verrou: function (s) { return svg('<rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/>', s || 18); },
    refaire: function (s) { return svg('<path d="M20.2 12a8.2 8.2 0 1 1-2.7-6.1"/><polyline points="20.6 3.4 20.6 8.6 15.4 8.6"/>', s || 18); },
    lecture: function (s) { return svg('<polygon points="7 4.5 19 12 7 19.5"/>', s || 18); },
    apercu: function (s) { return duo('<circle cx="12" cy="12" r="3.2"/>', '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3.2"/>', s || 18); }
  };

  var parId = M.parId, libelleDe = M.libelleDe, majuscule = M.majuscule, dateLongue = M.dateLongue, dateJour = M.dateJour,
    dateCourte = M.dateCourte, relatifJour = function (s) { return M.relatifJour(s); }, quandCourt = function (ms) { return M.quandCourt(ms); },
    pluriel = M.pluriel, normaliser = M.normaliser, tronquer = M.tronquer, heure = M.heure, jourDe = M.jourDe, aujourdhui = M.aujourdhui,
    ajouterJours = M.ajouterJours, estWeekend = M.estWeekend, jourOuvreSuivant = M.jourOuvreSuivant, parOrdre = M.parOrdre, depuis = function (ms) { return M.depuis(ms); };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lireLocal(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function ecrireLocal(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } }

  /* ========================= Base locale ===============================
     IndexedDB : une fiche par projet, et les réglages du téléphone. */
  var Base = (function () {
    var NOM = 'chantier_partage_local_v1', db = null;
    function ouvrir() {
      return new Promise(function (ok, ko) {
        if (!('indexedDB' in window)) { ko(new Error('indisponible')); return; }
        var r = window.indexedDB.open(NOM, 1);
        r.onupgradeneeded = function () {
          var d = r.result;
          if (!d.objectStoreNames.contains('projets')) d.createObjectStore('projets', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('reglages')) d.createObjectStore('reglages', { keyPath: 'cle' });
        };
        r.onsuccess = function () { db = r.result; ok(db); };
        r.onerror = function () { ko(r.error); };
      });
    }
    function tx(store, mode, fn) {
      return new Promise(function (ok, ko) {
        if (!db) { ko(new Error('base fermée')); return; }
        var t = db.transaction(store, mode), req = fn(t.objectStore(store));
        t.oncomplete = function () { ok(req ? req.result : undefined); };
        t.onerror = function () { ko(t.error); };
        t.onabort = function () { ko(t.error); };
      });
    }
    return {
      ouvrir: ouvrir,
      tout: function (store) { return tx(store, 'readonly', function (s) { return s.getAll(); }); },
      mettre: function (store, obj) { return tx(store, 'readwrite', function (s) { return s.put(obj); }); },
      supprimer: function (store, cle) { return tx(store, 'readwrite', function (s) { return s.delete(cle); }); }
    };
  })();

  /* =============================== État ================================ */
  var S = {
    pret: false, memoireSeule: false,
    moi: { id: null, prenom: '' },
    projets: new Map(),
    nav: { ecran: 'accueil', pid: null, onglet: 'journee', jour: null, filtreBlocages: 'OUVERT', voirTerminees: false, voirFaites: false, voirFil: false, toutes: null }
  };
  function projet(pid) { return S.projets.get(pid || S.nav.pid) || null; }
  function monMembre(p) { return p ? M.membre(p, S.moi.id) : null; }
  function monRole(p) { var m = monMembre(p); return m ? m.role : null; }
  function estChef(p) { if (!p) return false; var f = M.fiche(p); return monRole(p) === 'CHEF' || f.chefId === S.moi.id; }
  function nomDe(id) {
    if (!id) return '—';
    if (id === S.moi.id) return S.moi.prenom || 'vous';
    var p = projet();
    var m = p ? M.membre(p, id) : null;
    return (m && m.prenom) || 'quelqu\'un';
  }
  function initiales(id) {
    var n = nomDe(id);
    var ini = n === 'vous' || n === 'quelqu\'un' ? '?' : n.split(/[\s.\-_]+/).filter(Boolean).slice(0, 2).map(function (m) { return m.charAt(0).toUpperCase(); }).join('');
    return '<span class="initiales" title="' + esc(n) + '">' + esc(ini || '?') + '</span>';
  }

  /* ============================ Écritures ============================== */
  var minuteursSauvegarde = new Map();
  function enregistrer(pid) {
    clearTimeout(minuteursSauvegarde.get(pid));
    minuteursSauvegarde.set(pid, setTimeout(function () { sauverMaintenant(pid); }, 250));
  }
  function sauverMaintenant(pid) {
    minuteursSauvegarde.delete(pid);
    var p = S.projets.get(pid);
    if (!p || S.memoireSeule) return Promise.resolve();
    return Base.mettre('projets', p).catch(function () { toast('Enregistrement impossible sur ce téléphone : exportez le projet pour ne rien perdre.', 'erreur'); });
  }
  function toutSauver() { Array.from(minuteursSauvegarde.keys()).forEach(function (pid) { clearTimeout(minuteursSauvegarde.get(pid)); sauverMaintenant(pid); }); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) toutSauver(); });
  window.addEventListener('pagehide', toutSauver);

  function modifier(pid, col, id, changements) {
    var p = S.projets.get(pid);
    if (!p) return;
    var ts = M.horloge();
    if (col === 'fiche') M.ecrire(p.fiche, changements, ts);
    else {
      if (!p[col][id]) p[col][id] = M.entite(id, {}, ts);
      M.ecrire(p[col][id], changements, ts);
    }
    enregistrer(pid);
    planifierRendu();
  }
  function creer(pid, col, valeurs) {
    var p = S.projets.get(pid);
    var id = M.cleUnique(col.charAt(0));
    p[col][id] = M.entite(id, valeurs, M.horloge());
    enregistrer(pid);
    planifierRendu();
    return id;
  }
  /* Enregistre « X a envoyé son avancement à telle heure » (le plus récent gagne) */
  function noterEnvoi(p, personneId, le) {
    var e = p.membres[personneId];
    if (!e || ((e.t.dernierEnvoi || 0) >= le)) return;
    M.ecrire(e, { dernierEnvoi: le }, le);
  }

  /* ============================== Actions ============================== */
  function creerTaches(pid, libelles, jour, metierForce) {
    var base = Date.now();
    libelles.forEach(function (lib, i) {
      creer(pid, 'taches', {
        libelle: lib, jour: jour || null, metier: metierForce === 'auto' ? M.metierCatalogue(lib) : (metierForce || ''),
        note: '', ordre: base + i, creePar: S.moi.id, creeLe: base + i, statut: { etat: 'A_FAIRE' }
      });
    });
    return libelles.length;
  }
  function ajouterCatalogue(pid, phase) {
    var existants = new Set(M.taches(projet(pid)).map(function (t) { return normaliser(t.libelle); }));
    var libs = (M.CATALOGUE[phase] || []).map(function (x) { return x[0]; }).filter(function (l) { return !existants.has(normaliser(l)); });
    return creerTaches(pid, libs, null, 'auto');
  }
  function statutDe(t) { return { etat: t.etat, faitPar: t.faitPar, faitLe: t.faitLe, enCoursPar: t.enCoursPar, enCoursLe: t.enCoursLe, par: t.modifPar }; }
  function cocher(pid, tid) {
    var p = projet(pid), t = p && M.tache(p, tid);
    if (!t) return;
    var avant = statutDe(t), now = Date.now();
    var apres = t.etat === 'FAIT'
      ? { etat: t.enCoursPar ? 'EN_COURS' : 'A_FAIRE', faitPar: null, faitLe: null, enCoursPar: t.enCoursPar, enCoursLe: t.enCoursLe, par: S.moi.id }
      : { etat: 'FAIT', faitPar: S.moi.id, faitLe: now, enCoursPar: t.enCoursPar, enCoursLe: t.enCoursLe, par: S.moi.id };
    modifier(pid, 'taches', tid, { statut: apres });
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* sans vibreur */ }
    toast((apres.etat === 'FAIT' ? 'Cochée : ' : 'Décochée : ') + tronquer(t.libelle, 38), apres.etat === 'FAIT' ? 'ok' : '', {
      libelle: 'Annuler', fn: function () { modifier(pid, 'taches', tid, { statut: avant }); }
    });
  }

  /* ======================= Échange de fichiers ========================= */
  /* Prépare un envoi : le code (projet complet compressé) et le fichier .txt
     qui l'accompagne d'un en-tête et d'un résumé lisibles. */
  function preparerEnvoi(pid, type, resume) {
    var p = projet(pid);
    var obj = M.versFichier(p, type, S.moi, Date.now());
    return M.encoderCode(obj).then(function (code) {
      return { obj: obj, json: JSON.stringify(obj), code: code, fichier: M.texteFichier(obj, resume, code), nom: M.nomFichier(p, type, S.moi, aujourdhui()) };
    });
  }
  /* Partage du message texte (résumé + code) : WhatsApp, SMS, Teams… ; sinon copie */
  function partagerMessage(texte, titre) {
    if (typeof navigator.share !== 'function') { copier(texte, null, 'Message copié : collez-le dans votre messagerie'); return Promise.resolve('copie'); }
    return navigator.share({ title: titre, text: texte }).then(function () { return 'partage'; }, function (e) {
      if (e && e.name === 'AbortError') return 'annule';
      copier(texte, null, 'Message copié : collez-le dans votre messagerie');
      return 'copie';
    });
  }
  /* Partage du téléphone (WhatsApp, Mail, Teams, AirDrop…) ; sinon téléchargement */
  function partager(contenu, nom, type, titre, texte) {
    var fichier;
    try { fichier = new File([contenu], nom, { type: type }); } catch (e) { fichier = null; }
    if (fichier && navigator.canShare && navigator.canShare({ files: [fichier] })) {
      return navigator.share({ files: [fichier], title: titre, text: texte }).then(function () { return 'partage'; }, function (e) {
        if (e && e.name === 'AbortError') return 'annule';
        return telecharger(contenu, nom, type);
      });
    }
    return Promise.resolve(telecharger(contenu, nom, type));
  }
  function telecharger(contenu, nom, type) {
    try {
      var url = URL.createObjectURL(new Blob([contenu], { type: type }));
      var a = document.createElement('a');
      a.href = url; a.download = nom; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      return 'telecharge';
    } catch (e) { return 'impossible'; }
  }
  function lienMail(a, cc, sujet, corps) {
    var params = [];
    if (cc && cc.length) params.push('cc=' + encodeURIComponent(cc.join(',')));
    params.push('subject=' + encodeURIComponent(sujet));
    params.push('body=' + encodeURIComponent(corps));
    return 'mailto:' + (a || []).map(encodeURIComponent).join(',') + '?' + params.join('&');
  }
  /* Lit des sources (fichiers choisis, ou message collé pouvant contenir
     plusieurs codes) : liste de { nom, o } ou { nom, erreur }. */
  function lireSources(sources) {
    return Promise.all(sources.map(function (s) {
      return M.lireTextes(s.texte, s.fichier).then(function (liste) {
        return liste.map(function (r) { return { nom: s.nom, o: r.o, erreur: r.erreur }; });
      });
    })).then(function (l) { return [].concat.apply([], l); });
  }
  /* Fusionne ce qui a été lu. Un projet absent du téléphone se rejoint (avec
     tous les fichiers reçus pour lui) ; les autres se mettent à jour. La
     fusion étant champ par champ, l'ordre des fichiers n'a pas d'importance. */
  function importer(resultats, suite) {
    var bons = resultats.filter(function (r) { return r.o; }), rates = resultats.filter(function (r) { return !r.o; });
    if (!bons.length) return Promise.reject(new Error(rates.length ? rates.map(function (r) { return (resultats.length > 1 && r.nom ? r.nom + ' : ' : '') + r.erreur; }).join(' ') : 'Rien à importer.'));
    var aRejoindre = null, ignores = 0, touches = [], stats = { total: 0, taches: 0, blocages: 0, membres: 0, fiche: 0, jours: 0 }, qui = [];
    bons.forEach(function (r) {
      var o = r.o, pid = o.projet.id, local = S.projets.get(pid);
      if (!local) {
        if (!aRejoindre) aRejoindre = { o: o, envois: [] };
        else if (aRejoindre.o.projet.id === pid) aRejoindre.o = Object.assign({}, aRejoindre.o, { projet: M.fusionnerProjet(aRejoindre.o.projet, o.projet).projet });
        else { ignores++; return; }
        if (o.type === 'avancement' && o.de && o.de.id) aRejoindre.envois.push({ id: o.de.id, le: o.envoyeLe || Date.now() });
        return;
      }
      var res = M.fusionnerProjet(local, o.projet);
      if (o.type === 'avancement' && o.de && o.de.id) noterEnvoi(res.projet, o.de.id, o.envoyeLe || Date.now());
      S.projets.set(pid, res.projet);
      enregistrer(pid);
      if (touches.indexOf(pid) === -1) touches.push(pid);
      Object.keys(stats).forEach(function (k) { stats[k] += res.stats[k] || 0; });
      var nom = o.de && o.de.id && o.de.id !== S.moi.id ? (o.de.prenom || 'quelqu\'un') : 'vous';
      qui.push(o.type === 'avancement' ? nom : 'projet de ' + nom);
    });
    fermerFeuille(true);
    if (touches.length) {
      var pid0 = touches.indexOf(S.nav.pid) !== -1 ? S.nav.pid : touches[0];
      if (S.nav.ecran !== 'projet' || S.nav.pid !== pid0) ouvrirProjet(pid0); else rendre();
    }
    if (aRejoindre) { feuilleRejoindre(aRejoindre.o, aRejoindre.envois); return Promise.resolve(null); }
    if (suite) suite(touches);
    var detail = stats.total ? [stats.taches ? pluriel(stats.taches, 'tâche') : '', stats.blocages ? pluriel(stats.blocages, 'blocage') : '',
      stats.membres ? pluriel(stats.membres, 'personne') : '', stats.fiche ? 'la fiche' : '', stats.jours ? 'le point du jour' : ''].filter(Boolean).join(', ') + ' mis à jour' : 'rien de nouveau, déjà à jour';
    var titre = bons.length === 1 ? (bons[0].o.type === 'avancement' ? 'Avancement de ' + qui[0] : 'Projet reçu') + ' (' + quandCourt(bons[0].o.envoyeLe) + ')'
      : pluriel(bons.length - ignores, 'fichier importé', 'fichiers importés') + ' (' + qui.filter(function (x, i) { return qui.indexOf(x) === i; }).join(', ') + ')';
    var rate = (rates.length ? ' · ' + pluriel(rates.length, 'illisible', 'illisibles') + ' : ' + rates.map(function (r) { return r.nom || 'code'; }).join(', ') : '') +
      (ignores ? ' · ' + pluriel(ignores, 'fichier d\'un autre projet ignoré', 'fichiers d\'autres projets ignorés') : '');
    toast(titre + ' : ' + detail + rate, rates.length || ignores ? 'erreur' : stats.total ? 'ok' : '');
    return Promise.resolve(touches);
  }

  /* ============================ Navigation ============================= */
  function sauverNav() { ecrireLocal('cp2_nav', JSON.stringify({ ecran: S.nav.ecran, pid: S.nav.pid, onglet: S.nav.onglet })); }
  function ouvrirProjet(pid, onglet) {
    var p = projet(pid);
    S.nav.ecran = 'projet'; S.nav.pid = pid; S.nav.onglet = onglet || 'journee'; S.nav.jour = aujourdhui();
    S.nav.voirFil = false; S.nav.voirFaites = false; S.nav.filtreBlocages = 'OUVERT';
    var r = parId(M.ROLES, monRole(p));
    S.nav.toutes = !(r && r.metier);
    ecrireLocal('cp2_dernier', pid);
    sauverNav(); rendre(); window.scrollTo(0, 0);
  }
  function allerAccueil() { S.nav.ecran = 'accueil'; S.nav.pid = null; sauverNav(); rendre(); window.scrollTo(0, 0); }

  /* ============================== Rendu ================================ */
  var renduPrevu = false;
  function planifierRendu() {
    if (renduPrevu) return;
    renduPrevu = true;
    (window.requestAnimationFrame || function (cb) { return setTimeout(cb, 16); })(function () { renduPrevu = false; rendre(); });
  }
  function rendre() {
    if (S.pret && S.nav.ecran === 'projet' && !projet()) { S.nav.ecran = 'accueil'; S.nav.pid = null; }
    document.getElementById('topbar').innerHTML = vueBandeau();
    var ong = document.getElementById('onglets');
    if (S.pret && S.nav.ecran === 'projet') { ong.hidden = false; ong.innerHTML = vueOnglets(); } else { ong.hidden = true; ong.innerHTML = ''; }
    document.getElementById('contenu').innerHTML = vueContenu();
    var bas = S.pret ? vueBarreBas() : '';
    var bb = document.getElementById('barre-bas');
    bb.hidden = !bas; bb.innerHTML = bas;
    document.getElementById('app').classList.toggle('sans-barre', !bas);
    if (feuille && feuille.o.rafraichir) feuille.o.rafraichir(feuille);
  }
  function barre(pct) { return '<div class="barre" role="presentation"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div>'; }
  function tag(cls, texte, ico) { return '<span class="tag tag-' + cls + '">' + (ico || '') + esc(texte) + '</span>'; }

  function vueBandeau() {
    var droite = '<div class="topbar-actions"><button class="iconbtn" data-action="recevoir" aria-label="Recevoir un fichier">' + ICO.recevoir(20) + '</button>' +
      '<button class="iconbtn" data-action="menu" aria-label="Menu">' + ICO.menu(22) + '</button></div>';
    if (S.nav.ecran === 'projet' && projet()) {
      var f = M.fiche(projet()), ph = parId(M.PHASES, f.phase), r = monRole(projet());
      var sous = [f.affaire, ph && ph.court, r ? libelleDe(M.ROLES, r) : ''].filter(Boolean).join(' · ');
      return '<div class="topbar-gauche"><button class="iconbtn" data-action="retour" aria-label="Retour aux projets">' + ICO.retour(20) + '</button>' +
        '<div><div class="topbar-titre">' + esc(f.titre || 'Projet') + '</div>' + (sous ? '<div class="topbar-sous">' + esc(sous) + '</div>' : '') + '</div></div>' + droite;
    }
    return '<div class="topbar-gauche"><span class="marque-pastille">' + ICO.liste(20) + '</span>' +
      '<div><div class="topbar-titre">Chantier partagé</div><div class="topbar-sous">Installation · mise en route · accompagnement</div></div></div>' + droite;
  }
  function vueOnglets() {
    var p = projet(), nb = M.blocagesOuverts(M.blocages(p)).length;
    var defs = [['journee', 'Journée'], ['blocages', 'Blocages'], ['taches', 'Tâches'], ['equipe', 'Équipe'], ['fiche', 'Fiche']];
    return defs.map(function (d) {
      var actif = S.nav.onglet === d[0];
      return '<button class="onglet' + (actif ? ' actif' : '') + '" data-action="onglet" data-onglet="' + d[0] + '"' + (actif ? ' aria-current="page"' : '') + '>' + d[1] +
        (d[0] === 'blocages' && nb ? '<span class="compte">' + nb + '</span>' : '') + '</button>';
    }).join('');
  }
  function vueContenu() {
    if (!S.pret) return '<section class="carte"><p class="vide-texte">Ouverture…</p></section>';
    var h = S.memoireSeule ? '<section class="carte info"><b>Ce navigateur ne garde pas les données.</b> Ouvrez l\'appli dans Safari ou Chrome (pas en navigation privée), ou exportez le projet avant de fermer.</section>' : '';
    if (S.nav.ecran === 'projet' && projet()) return h + vueProjet(projet());
    return h + vueAccueil();
  }
  function chargement() { return '<section class="carte"><p class="vide-texte">Chargement…</p></section>'; }

  /* ------------------------------ Accueil ------------------------------ */
  function statsProjet(p, auj) {
    var t = M.taches(p), av = M.avancement(t), vj = M.vueJour(t, auj, auj), ouv = M.blocagesOuverts(M.blocages(p));
    return { pct: av.pct, total: av.total, jourTotal: vj.total, jourFaites: vj.faites, ouverts: ouv.length, graves: ouv.filter(function (b) { return +b.gravite === 1; }).length };
  }
  function vueAccueil() {
    var auj = aujourdhui();
    var h = '<div class="date-du-jour">' + esc(majuscule(dateLongue(auj))) + '</div>';
    var liste = Array.from(S.projets.values());
    if (!liste.length) return h + vueAccueilVide();
    var dernier = lireLocal('cp2_dernier');
    var reprise = liste.filter(function (p) { return p.id === dernier && M.fiche(p).statut !== 'CLOTURE'; })[0];
    if (reprise) {
      var st = statsProjet(reprise, auj);
      h += '<button class="gros-bouton" data-action="ouvrir" data-pid="' + esc(reprise.id) + '"><span class="rond">' + ICO.lecture(18) + '</span>' +
        '<span>OUVRIR LA JOURNÉE<small>' + esc(M.fiche(reprise).titre || 'Projet') + ' · ' + esc(st.jourTotal ? st.jourFaites + ' / ' + st.jourTotal + ' tâches faites aujourd\'hui' : 'rien de planifié aujourd\'hui') + '</small></span></button>';
    }
    var actifs = liste.filter(function (p) { var s = M.fiche(p).statut; return s !== 'CLOTURE' && s !== 'RECEPTIONNE'; }).sort(function (a, b) { return (M.fiche(b).creeLe || 0) - (M.fiche(a).creeLe || 0); });
    var finis = liste.filter(function (p) { var s = M.fiche(p).statut; return s === 'CLOTURE' || s === 'RECEPTIONNE'; });
    if (actifs.length) h += '<h2 class="rubrique">Projets en cours (' + actifs.length + ')</h2>' + actifs.map(function (p) { return carteProjet(p, auj); }).join('');
    if (finis.length) {
      h += '<button class="lien" data-action="voir-terminees">' + (S.nav.voirTerminees ? 'Masquer' : 'Afficher') + ' les projets terminés (' + finis.length + ')</button>';
      if (S.nav.voirTerminees) h += finis.map(function (p) { return carteProjet(p, auj); }).join('');
    }
    return h;
  }
  function vueAccueilVide() {
    return '<section class="carte accueil-vide"><h2>Aucun projet sur ce téléphone</h2>' +
      '<p>Tout reste dans le téléphone, sans serveur ni compte. L\'équipe se met à jour en s\'envoyant des fichiers.</p>' +
      '<ol class="etapes">' +
      '<li><span><b>Le chef crée le projet</b> et l\'envoie à l\'équipe (WhatsApp, Teams, mail, AirDrop).</span></li>' +
      '<li><span><b>Chacun l\'importe</b> avec le bouton Recevoir et choisit son rôle.</span></li>' +
      '<li><span><b>Dans la journée</b>, chacun coche ses tâches et signale ce qui bloque, même sans réseau.</span></li>' +
      '<li><span><b>Le soir</b>, chacun envoie son avancement ; le chef l\'importe et envoie le point du soir en PDF.</span></li>' +
      '</ol><div class="boutons-ligne"><button class="btn p" data-action="nouveau-projet">' + ICO.plus(18) + 'Nouveau projet</button>' +
      '<button class="btn o" data-action="recevoir">' + ICO.recevoir(18) + 'Recevoir un fichier</button></div></section>';
  }
  function carteProjet(p, auj) {
    var f = M.fiche(p), st = statsProjet(p, auj);
    var statut = parId(M.STATUTS, f.statut) || M.STATUTS[1];
    var ph = parId(M.PHASES, f.phase);
    var num = M.libelleNumero(f, auj);
    var role = monRole(p);
    var meta = [f.affaire, f.lieu, ph && ph.court, num, role ? libelleDe(M.ROLES, role) : ''].filter(Boolean);
    var h = '<button class="carte carte-inst" data-action="ouvrir" data-pid="' + esc(p.id) + '">';
    h += '<span class="ligne"><span class="inst-titre">' + esc(f.titre || 'Sans nom') + '</span>' + tag(statut.cls, statut.libelle) + '</span>';
    if (meta.length) h += '<span class="petit inst-meta">' + esc(meta.join(' · ')) + '</span>';
    if (!st.total) h += '<span class="mini" style="display:block;margin-top:8px">Aucune tâche pour l\'instant</span>';
    else {
      h += barre(st.pct) + '<span class="inst-stats"><span class="ico-texte">' + ICO.avancement(16) + st.pct + ' %</span>' +
        '<span class="ico-texte">' + ICO.valide(16) + (st.jourTotal ? st.jourFaites + ' / ' + st.jourTotal + ' aujourd\'hui' : 'rien aujourd\'hui') + '</span>' +
        (st.ouverts ? '<span class="ico-texte ' + (st.graves ? 'rouge' : 'attention') + '">' + ICO.interdit(16) + pluriel(st.ouverts, 'blocage') + '</span>' : '<span class="ico-texte">' + ICO.valideCercle(16) + 'aucun blocage</span>') + '</span>';
    }
    return h + '</button>';
  }

  /* ------------------------------ Projet ------------------------------- */
  function vueProjet(p) {
    switch (S.nav.onglet) {
      case 'blocages': return vueBlocages(p);
      case 'taches': return vueTaches(p);
      case 'equipe': return vueEquipe(p);
      case 'fiche': return vueFiche(p);
      default: return vueJournee(p);
    }
  }
  function ligneTache(t, o) {
    var bl = (o.bloq && o.bloq.get(t.id)) || [];
    var etat = t.etat || 'A_FAIRE';
    var icone = etat === 'FAIT' ? ICO.valide(20) : etat === 'EN_COURS' ? ICO.demi(18) : '';
    var sous = [];
    var m = parId(M.METIERS, t.metier);
    if (m) sous.push('<span class="ico-texte">' + ICO[m.icone](14) + esc(m.libelle) + '</span>');
    if (etat === 'FAIT' && t.faitLe) sous.push('<span class="vert">Faite par ' + esc(nomDe(t.faitPar)) + ' · ' + esc(jourDe(t.faitLe) === o.D ? heure(t.faitLe) : quandCourt(t.faitLe)) + '</span>');
    else if (etat === 'EN_COURS') sous.push('<span class="attention gras">En cours · ' + esc(nomDe(t.enCoursPar)) + '</span>');
    if (o.montrerDate) {
      if (t.jour && t.jour !== o.D) sous.push(tag(t.jour < o.auj && etat !== 'FAIT' ? 'surv' : 'neutre', 'Prévue ' + relatifJour(t.jour)));
    } else {
      if (o.avant && t.jour) sous.push(tag('surv', (etat === 'FAIT' ? 'Prévue ' : 'Reportée du ') + dateCourte(t.jour)));
      if (o.motif === 'faite' && t.jour && t.jour > o.D) sous.push(tag('neutre', 'Prévue ' + dateCourte(t.jour)));
      if (o.motif === 'faite' && !t.jour) sous.push(tag('neutre', 'Hors planning'));
      if (o.D < o.auj && etat !== 'FAIT' && o.motif === 'prevue') sous.push(tag('surv', 'Non faite ce jour-là'));
    }
    if (bl.length) sous.push(tag('def', 'Bloquée', ICO.interdit(12)));
    if (t.note) sous.push('<span class="note">' + esc(tronquer(t.note, 110)) + '</span>');
    var rapide = o.rapide ? '<button class="mini-btn tache-rapide" data-action="planifier-vite" data-tid="' + esc(t.id) + '">Aujourd\'hui</button>' : '';
    return '<div class="tache etat-' + etat + (bl.length ? ' bloquee' : '') + '">' +
      '<button class="case-etat" data-action="cocher" data-tid="' + esc(t.id) + '" aria-label="' + esc((etat === 'FAIT' ? 'Décocher : ' : 'Cocher : ') + t.libelle) + '" aria-pressed="' + (etat === 'FAIT') + '">' + icone + '</button>' +
      '<button class="tache-corps" data-action="tache" data-tid="' + esc(t.id) + '"><span class="tache-lib">' + esc(t.libelle) + '</span>' +
      (sous.length ? '<span class="tache-sous">' + sous.join('') + '</span>' : '') + '</button>' + rapide + '</div>';
  }
  function ligneBlocage(b, tmap) {
    var g = parId(M.GRAVITES, +b.gravite) || M.GRAVITES[1], leve = b.statut === 'LEVE', auj = aujourdhui();
    var lignes = [];
    if (!leve) {
      var parts = [], d = parId(M.DEBLOQUEURS, b.debloqueur);
      if (d) parts.push('Attend : ' + esc(d.libelle));
      if (b.echeance) parts.push('<span class="' + (b.echeance < auj ? 'rouge gras' : '') + '">échéance ' + esc(relatifJour(b.echeance)) + '</span>');
      if (parts.length) lignes.push('<span class="petit">' + parts.join(' · ') + '</span>');
    } else lignes.push('<span class="petit vert">Levé par ' + esc(nomDe(b.levePar)) + ' · ' + esc(quandCourt(b.leveLe)) + '</span>');
    var t = b.tache && tmap && tmap.get(b.tache);
    if (t) lignes.push('<span class="petit">Tâche : ' + esc(tronquer(t.libelle, 70)) + '</span>');
    var nbSuivi = Object.keys(b.suivi || {}).length;
    lignes.push('<span class="mini">Signalé par ' + esc(nomDe(b.ouvertPar)) + ' · ' + esc(quandCourt(b.ouvertLe)) + (!leve && b.ouvertLe ? ' · depuis ' + depuis(b.ouvertLe) : '') + (nbSuivi ? ' · ' + pluriel(nbSuivi, 'suivi') : '') + '</span>');
    return '<button class="blocage g' + g.id + (leve ? ' leve' : '') + '" data-action="blocage" data-bid="' + esc(b.id) + '">' +
      '<span class="blocage-ico">' + (leve ? ICO.valideCercle(20) : ICO.interdit(20)) + '</span>' +
      '<span class="blocage-texte"><span class="blocage-desc">' + esc(b.description) + '</span>' + lignes.join('') + '</span>' + tag(leve ? 'ok' : g.cls, leve ? 'Levé' : g.court) + '</button>';
  }

  function vueJournee(p) {
    var f = M.fiche(p), auj = aujourdhui(), D = S.nav.jour || auj;
    var toutes = M.taches(p), blocs = M.blocages(p);
    var role = monRole(p), rDef = parId(M.ROLES, role);
    var filtrable = !!(rDef && rDef.metier);
    var miennes = filtrable ? toutes.filter(function (t) { return M.estMaTache(t, role, S.moi.id); }) : toutes;
    var vjTout = M.vueJour(toutes, D, auj), vjMes = filtrable ? M.vueJour(miennes, D, auj) : vjTout;
    var vj = filtrable && !S.nav.toutes ? vjMes : vjTout;
    var jd = M.jour(p, D);
    var fil = M.filJour(toutes, blocs, jd, D);
    var bloq = M.blocagesParTache(blocs);
    var tmap = new Map(toutes.map(function (t) { return [t.id, t]; }));
    var aPlanifier = toutes.filter(function (t) { return !t.jour && t.etat !== 'FAIT'; }).length;
    var h = '';

    /* bandeau de la journée (toute l'équipe) */
    var rel = relatifJour(D);
    var sous = [rel === "aujourd'hui" || rel === 'hier' || rel === 'demain' ? majuscule(rel) : '', M.libelleNumero(f, D) || (estWeekend(D) ? 'Week-end' : '')].filter(Boolean).join(' · ');
    h += '<section class="jour-bloc" aria-label="Journée affichée"><div class="jour-nav">' +
      '<button class="iconbtn" data-action="jour-prec" aria-label="Jour précédent">' + ICO.precedent(20) + '</button>' +
      '<div class="jour-titre">' + esc(dateJour(D)) + (sous ? '<small>' + esc(sous) + '</small>' : '') + '</div>' +
      '<button class="iconbtn" data-action="jour-suiv" aria-label="Jour suivant">' + ICO.suivant(20) + '</button></div>';
    var restant = vjTout.total - vjTout.faites;
    h += '<div class="jour-progres"><span class="jour-chiffre">' + vjTout.faites + '<small> / ' + vjTout.total + '</small></span><span class="jour-legende">' +
      (vjTout.total ? (restant ? pluriel(restant, 'tâche restante', 'tâches restantes') : 'Tout est fait') : 'Aucune tâche ce jour') + ' · équipe</span></div>';
    h += barre(vjTout.total ? Math.round(100 * vjTout.faites / vjTout.total) : 0);
    var actifs = M.filJour(toutes, blocs, jd, D).slice().sort(function (a, b) { return a.le - b.le; }).map(function (e) { return e.par; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    if (actifs.length) h += '<div class="avec">' + actifs.slice(0, 6).map(initiales).join('') + '<span class="avec-noms">' + esc(actifs.map(nomDe).join(', ')) + '</span></div>';
    if (jd && jd.clotureLe) h += '<div class="cloture">' + ICO.verrou(15) + '<span>Point du soir envoyé par ' + esc(nomDe(jd.cloturePar)) + ' · ' + esc(quandCourt(jd.clotureLe)) + '</span></div>';
    if (D !== auj) h += '<button class="lien-clair" data-action="jour-auj">Revenir à aujourd\'hui</button>';
    h += '</section>';

    /* points bloquants ouverts */
    var ouverts = M.blocagesOuverts(blocs);
    if (ouverts.length && D >= auj) {
      var grave = ouverts.some(function (b) { return +b.gravite === 1; });
      h += '<section class="carte"><h2 class="carte-titre ' + (grave ? 'rouge' : 'attention') + '">' + ICO.interdit(18) + 'Points bloquants (' + ouverts.length + ')</h2><div class="liste-blocages">' +
        ouverts.slice(0, 4).map(function (b) { return ligneBlocage(b, tmap); }).join('') + '</div>' +
        (ouverts.length > 4 ? '<button class="lien" data-action="onglet" data-onglet="blocages">Voir les ' + ouverts.length + ' blocages ' + ICO.suivant(14) + '</button>' : '') + '</section>';
    }

    /* tâches du jour, avec le filtre « mes tâches » selon le rôle */
    var defaut = D >= auj ? D : auj;
    h += '<section class="carte"><h2 class="carte-titre">' + ICO.valideCercle(18) + (filtrable && !S.nav.toutes ? 'Mes tâches du jour' : 'Tâches du jour') +
      '<button class="mini-btn droite" data-action="nouvelles-taches" data-jour="' + defaut + '">' + ICO.plus(14) + 'Ajouter</button></h2>';
    if (filtrable) {
      h += '<div class="segment segment-petit" role="tablist">' +
        '<button role="tab" aria-selected="' + !S.nav.toutes + '" class="' + (!S.nav.toutes ? 'actif' : '') + '" data-action="filtre-taches" data-toutes="0" title="' + esc(rDef.libelle) + ' : tâches de votre métier et tâches communes">Mes tâches (' + vjMes.total + ')</button>' +
        '<button role="tab" aria-selected="' + !!S.nav.toutes + '" class="' + (S.nav.toutes ? 'actif' : '') + '" data-action="filtre-taches" data-toutes="1">Toutes (' + vjTout.total + ')</button></div>';
    }
    if (!vj.liste.length) {
      h += '<p class="vide-texte">' + (D < auj ? 'Aucune tâche prévue ni faite ce jour-là.' :
        (filtrable && !S.nav.toutes && vjTout.total ? 'Rien pour votre métier ce jour. Les autres tâches sont dans « Toutes ».' :
          'Rien de prévu ce jour. ' + (aPlanifier ? pluriel(aPlanifier, 'tâche attend', 'tâches attendent') + ' d\'être planifiée' + (aPlanifier > 1 ? 's' : '') + '.' : 'Ajoutez les tâches de la journée.'))) + '</p>';
      if (D >= auj && aPlanifier) h += '<div class="boutons-ligne"><button class="btn o sm" data-action="planifier" data-jour="' + D + '">' + ICO.liste(16) + 'Planifier (' + aPlanifier + ')</button></div>';
    } else {
      h += '<div class="liste-taches">' + vj.liste.map(function (x) { return ligneTache(x.t, { D: D, auj: auj, bloq: bloq, avant: x.avant, motif: x.motif }); }).join('') + '</div>';
      if (D >= auj && aPlanifier) h += '<button class="lien" data-action="planifier" data-jour="' + D + '">' + ICO.liste(16) + 'Planifier parmi les tâches à planifier (' + aPlanifier + ')</button>';
    }
    h += '</section>';

    /* l'échange du soir */
    if (D === auj) h += carteSoir(p);

    /* prévu le jour ouvré suivant */
    if (D >= auj) {
      var L = jourOuvreSuivant(D);
      if (toutes.some(function (t) { return t.jour === ajouterJours(D, 1); })) L = ajouterJours(D, 1);
      var prevu = toutes.filter(function (t) { return t.jour === L && t.etat !== 'FAIT'; }).sort(parOrdre);
      h += '<section class="carte"><h2 class="carte-titre">' + ICO.calendrier(18) + 'Prévu ' + esc(relatifJour(L)) +
        '<button class="mini-btn droite" data-action="nouvelles-taches" data-jour="' + L + '">' + ICO.plus(14) + 'Prévoir</button></h2>';
      if (prevu.length) {
        h += prevu.slice(0, 8).map(function (t) { var m = parId(M.METIERS, t.metier); return '<button class="prevu-ligne" data-action="tache" data-tid="' + esc(t.id) + '">' + (m ? ICO[m.icone](16) : ICO.vide(16)) + '<span>' + esc(t.libelle) + '</span></button>'; }).join('');
        if (prevu.length > 8) h += '<p class="mini">… et ' + (prevu.length - 8) + ' autres (onglet Tâches).</p>';
      } else {
        h += '<p class="vide-texte">Rien de planifié pour l\'instant.</p>';
        if (aPlanifier) h += '<button class="lien" data-action="planifier" data-jour="' + L + '">' + ICO.liste(16) + 'Planifier pour ' + esc(relatifJour(L)) + '</button>';
      }
      h += '</section>';
    }

    /* fil de la journée */
    h += '<section class="carte"><h2 class="carte-titre">' + ICO.horloge(18) + 'Fil de la journée</h2>';
    if (!fil.length) h += '<p class="vide-texte">' + (D > auj ? 'La journée n\'a pas encore commencé.' : 'Ce que chacun coche ou signale apparaît ici, avec l\'heure, dès que son avancement est importé.') + '</p>';
    else {
      h += (S.nav.voirFil ? fil : fil.slice(0, 8)).map(function (e) {
        return '<div class="fil-ligne"><span class="fil-heure">' + heure(e.le) + '</span><span class="fil-texte"><b>' + esc(majuscule(nomDe(e.par))) + '</b> ' + esc(e.texte) + '</span></div>';
      }).join('');
      if (fil.length > 8) h += '<button class="lien" data-action="voir-fil">' + (S.nav.voirFil ? 'Réduire' : 'Tout afficher (' + fil.length + ')') + '</button>';
    }
    return h + '</section>';
  }
  /* Carte « Ce soir » : l'envoi de l'avancement (équipier) ou la collecte (chef) */
  function carteSoir(p) {
    var auj = aujourdhui();
    var h = '<section class="carte carte-soir"><h2 class="carte-titre">' + ICO.pointSoir(18) + 'Ce soir</h2>';
    if (estChef(p)) {
      var env = M.etatEnvois(p, auj).filter(function (e) { return !e.estChef; });
      var recus = env.filter(function (e) { return e.envoye; });
      var manque = env.filter(function (e) { return !e.envoye; }).map(function (e) { return e.prenom; });
      h += '<p class="soir-etat">' + (env.length ? '<b>' + recus.length + ' / ' + env.length + '</b> avancements reçus' + (manque.length ? ' · manque : ' + esc(manque.join(', ')) : ' · équipe au complet') :
        'Personne n\'a encore rejoint le projet : envoyez-le à l\'équipe (onglet Équipe).') + '</p>' +
        '<div class="boutons-ligne"><button class="btn s sm" data-action="recevoir">' + ICO.recevoir(16) + 'Recevoir un avancement</button>' +
        '<button class="btn p sm" data-action="point">' + ICO.pointSoir(16) + 'Point du soir</button></div>';
    } else {
      var moi = monMembre(p) || {};
      var dest = M.destinatairesAvancement(p, S.moi.id);
      var noms = dest.a.map(function (c) { return c.nom || c.libelle; });
      var envoye = moi.dernierEnvoi && jourDe(moi.dernierEnvoi) === auj;
      h += '<p class="soir-etat">' + (envoye ? ICO.valide(16) + ' Avancement parti à ' + heure(moi.dernierEnvoi) + '. Renvoyez-le si vous avez encore avancé.' :
        'Votre avancement n\'est pas encore parti aujourd\'hui.') + '</p>' +
        '<p class="mini">' + (dest.motif === 'blocage' ? 'Point bloquant ouvert : il partira à ' + esc(noms.join(', ')) + (dest.cc.length ? ', le chef en copie' : '') + '.' : 'Il partira au chef de chantier' + (noms[0] ? ' (' + esc(noms[0]) + ')' : '') + '.') + '</p>' +
        '<div class="boutons-ligne"><button class="btn p sm" data-action="envoyer">' + ICO.envoi(16) + 'Envoyer mon avancement</button></div>';
    }
    return h + '</section>';
  }

  function vueBlocages(p) {
    var blocs = M.blocages(p), tmap = new Map(M.taches(p).map(function (t) { return [t.id, t]; }));
    var ouverts = M.blocagesOuverts(blocs);
    var leves = blocs.filter(function (b) { return b.statut === 'LEVE'; }).sort(function (a, b) { return (b.leveLe || 0) - (a.leveLe || 0); });
    var f = S.nav.filtreBlocages, l = f === 'LEVE' ? leves : ouverts;
    var h = '<div class="segment" role="tablist">' +
      '<button role="tab" aria-selected="' + (f === 'OUVERT') + '" class="' + (f === 'OUVERT' ? 'actif' : '') + '" data-action="filtre-blocages" data-filtre="OUVERT">Ouverts (' + ouverts.length + ')</button>' +
      '<button role="tab" aria-selected="' + (f === 'LEVE') + '" class="' + (f === 'LEVE' ? 'actif' : '') + '" data-action="filtre-blocages" data-filtre="LEVE">Levés (' + leves.length + ')</button></div>';
    if (!l.length) h += '<section class="carte"><p class="vide-texte">' + (f === 'LEVE' ? 'Aucun blocage levé pour l\'instant.' : 'Aucun point bloquant ouvert. Si quelque chose empêche ou ralentit le travail, signalez-le : votre avancement du soir partira directement à qui peut le lever.') + '</p></section>';
    else h += '<section class="carte"><div class="liste-blocages">' + l.map(function (b) { return ligneBlocage(b, tmap); }).join('') + '</div></section>';
    if (f === 'OUVERT') h += '<p class="mini" style="padding:0 2px">Gravité 1 : bloque l\'équipe · 2 : ralentit · 3 : gêne. Les plus graves et les plus anciens sont en tête.</p>';
    return h;
  }

  function vueTaches(p) {
    var taches = M.taches(p), auj = aujourdhui(), bloq = M.blocagesParTache(M.blocages(p)), av = M.avancement(taches);
    var h = '<section class="carte"><div class="resume-ligne"><span class="gros-chiffre">' + av.pct + ' %</span><span class="petit">' + av.faites + ' / ' + av.total + ' tâches faites</span></div>' + barre(av.pct) +
      '<p class="mini">Avancement du projet tel que ce téléphone le connaît : il se complète à chaque avancement importé.</p></section>';
    if (!taches.length) {
      return h + '<section class="carte"><p class="vide-texte">Aucune tâche. Ajoutez-les une par ligne, ou reprenez les tâches types de la phase.</p>' +
        '<div class="boutons-ligne"><button class="btn o sm" data-action="taches-types">' + ICO.liste(16) + 'Tâches types de la phase</button><button class="btn s sm" data-action="nouvelles-taches" data-jour="">' + ICO.plus(16) + 'Nouvelles tâches</button></div></section>';
    }
    var pasFaites = taches.filter(function (t) { return t.etat !== 'FAIT'; });
    [['En retard', pasFaites.filter(function (t) { return t.jour && t.jour < auj; }), true],
     ['À planifier', pasFaites.filter(function (t) { return !t.jour; }), true],
     ['Aujourd\'hui', pasFaites.filter(function (t) { return t.jour === auj; }), false]].forEach(function (s) {
      if (!s[1].length) return;
      s[1].sort(function (a, b) { return (a.jour || '') < (b.jour || '') ? -1 : (a.jour || '') > (b.jour || '') ? 1 : parOrdre(a, b); });
      h += '<h2 class="rubrique">' + s[0] + ' (' + s[1].length + ')</h2><section class="carte"><div class="liste-taches">' +
        s[1].map(function (t) { return ligneTache(t, { D: s[0] === 'Aujourd\'hui' ? auj : '', auj: auj, bloq: bloq, montrerDate: s[0] !== 'Aujourd\'hui', rapide: s[2] }); }).join('') + '</div></section>';
    });
    var futur = pasFaites.filter(function (t) { return t.jour && t.jour > auj; }).sort(function (a, b) { return a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : parOrdre(a, b); });
    var parJour = new Map();
    futur.forEach(function (t) { if (!parJour.has(t.jour)) parJour.set(t.jour, []); parJour.get(t.jour).push(t); });
    parJour.forEach(function (l, j) {
      h += '<h2 class="rubrique">' + esc(majuscule(relatifJour(j))) + ' (' + l.length + ')</h2><section class="carte"><div class="liste-taches">' +
        l.map(function (t) { return ligneTache(t, { D: j, auj: auj, bloq: bloq, montrerDate: true }); }).join('') + '</div></section>';
    });
    var faites = taches.filter(function (t) { return t.etat === 'FAIT'; }).sort(function (a, b) { return (b.faitLe || 0) - (a.faitLe || 0); });
    if (faites.length) {
      h += '<button class="lien" data-action="voir-faites">' + (S.nav.voirFaites ? 'Masquer' : 'Afficher') + ' les tâches faites (' + faites.length + ')</button>';
      if (S.nav.voirFaites) h += '<section class="carte" style="margin-top:8px"><div class="liste-taches">' + faites.map(function (t) { return ligneTache(t, { D: '', auj: auj, bloq: bloq }); }).join('') + '</div></section>';
    }
    return h;
  }

  function vueEquipe(p) {
    var f = M.fiche(p), auj = aujourdhui(), chef = estChef(p);
    var h = '';
    /* la règle d'envoi du soir */
    h += '<section class="carte info"><span class="ico-texte gras">' + ICO.envoi(16) + 'Envoi du soir</span>' +
      '<p style="margin-top:4px">Chacun envoie son avancement au chef de chantier. Si quelqu\'un a signalé un point bloquant encore ouvert, son avancement part à la personne qui peut le lever' +
      (f.copieChef !== false ? ', avec le chef en copie' : '') + '.</p>' +
      (chef ? '<label class="case-ligne" style="padding-bottom:0"><input type="checkbox" id="eq-copie" data-action="copie-chef"' + (f.copieChef !== false ? ' checked' : '') + '><span>Mettre le chef en copie quand un avancement part au responsable d\'un blocage</span></label>' : '') + '</section>';
    /* avancements du jour */
    var env = M.etatEnvois(p, auj);
    h += '<section class="carte"><h2 class="carte-titre">' + ICO.effectif(18) + 'L\'équipe (' + env.length + ')' +
      '<button class="mini-btn droite" data-action="inviter">' + ICO.plus(14) + 'Inviter</button></h2>';
    h += env.length ? env.map(function (e) {
      var m = M.membre(p, e.id) || {};
      var etat = e.estChef ? tag('nuit', 'Chef de chantier') : e.envoye ? tag('ok', 'Reçu ' + heure(e.le)) : tag('surv', e.le ? 'Dernier : ' + quandCourt(e.le) : 'Rien reçu');
      return '<div class="acces-ligne">' + initiales(e.id) + '<span class="acces-texte"><b>' + esc(e.prenom || '—') + (e.id === S.moi.id ? ' (vous)' : '') + '</b>' +
        '<span class="mini">' + esc([libelleDe(M.ROLES, e.role), m.email].filter(Boolean).join(' · ')) + '</span></span>' + etat + '</div>';
    }).join('') : '<p class="vide-texte">Personne d\'autre n\'a encore rejoint le projet.</p>';
    h += '<p class="mini" style="margin-top:8px">L\'équipe se complète à chaque avancement importé. « Reçu » : l\'avancement du jour est arrivé sur ce téléphone.</p></section>';
    /* responsables */
    h += '<section class="carte"><h2 class="carte-titre">' + ICO.courriel(18) + 'Responsables' + (chef ? '<button class="mini-btn droite" data-action="responsables">' + ICO.crayon(14) + 'Modifier</button>' : '') + '</h2>' +
      '<p class="petit" style="margin-bottom:6px">Ils reçoivent le point du soir, et l\'avancement de celui qui signale un blocage qu\'eux seuls peuvent lever.</p>' +
      M.RESPONSABLES.concat(['CHEF']).map(function (r) {
        var c = M.contactRole(p, r);
        return '<div class="acces-ligne"><span class="acces-texte"><b>' + esc(c.libelle) + '</b><span class="mini">' + esc([c.nom, c.email].filter(Boolean).join(' · ') || 'adresse à compléter') + '</span></span>' +
          (c.email ? '' : tag('surv', 'Sans adresse')) + '</div>';
      }).join('') + '</section>';
    /* moi */
    var moi = monMembre(p) || {};
    h += '<section class="carte"><h2 class="carte-titre">' + ICO.personne(18) + 'Vous dans ce projet<button class="mini-btn droite" data-action="mon-role">' + ICO.crayon(14) + 'Modifier</button></h2>' +
      '<p>' + esc(S.moi.prenom || 'Prénom à renseigner') + ' · ' + esc(libelleDe(M.ROLES, moi.role) || 'rôle à choisir') + (moi.email ? ' · ' + esc(moi.email) : '') + '</p></section>';
    return h;
  }

  function vueFiche(p) {
    var f = M.fiche(p), taches = M.taches(p), auj = aujourdhui(), ph = parId(M.PHASES, f.phase), suite = ph && parId(M.PHASES, ph.suite);
    var statut = parId(M.STATUTS, f.statut) || M.STATUTS[1], av = M.avancement(taches);
    var h = '';
    if (ph) h += '<section class="carte"><div class="phase-tete">' + ICO[ph.icone](24) + '<span class="phase-nom">' + esc(ph.libelle) + '</span></div>' +
      '<p class="petit" style="margin-top:6px">' + esc(ph.equipe) + '</p><p style="margin-top:6px;font-size:14px">' + esc(ph.resume) + '</p>' +
      (suite ? '<div class="boutons-ligne"><button class="btn o sm" data-action="changer-phase">Passer en ' + esc(suite.court.toLowerCase()) + ' ' + ICO.suivant(16) + '</button></div>' : '') + '</section>';
    var num = M.libelleNumero(f, auj);
    h += '<section class="carte"><div class="ligne"><span class="petit">' + esc([f.client, f.lieu].filter(Boolean).join(' · ') || 'Client non renseigné') + '</span>' + tag(statut.cls, statut.libelle) + '</div>' +
      '<div class="resume-ligne" style="margin-top:6px"><span class="gros-chiffre">' + av.pct + ' %</span><span class="petit">' + av.faites + ' / ' + av.total + ' tâches</span></div>' + barre(av.pct) +
      (num ? '<p class="mini">Journée ' + esc(num.replace('J', '')) + ' prévues</p>' : '') + '</section>';
    var lignes = [['N° d\'affaire', f.affaire], ['Client', f.client], ['Lieu', f.lieu], ['Machine / équipements', f.machine],
      ['Début', f.debut ? majuscule(dateLongue(f.debut)) : ''], ['Durée prévue', f.duree ? pluriel(+f.duree, 'jour ouvré', 'jours ouvrés') : ''], ['Contraintes de site', f.contraintes]].filter(function (x) { return x[1]; });
    h += '<section class="carte"><h2 class="carte-titre">' + ICO.document(18) + 'Fiche</h2>' +
      (lignes.length ? '<dl class="fiche-dl">' + lignes.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>' : '<p class="vide-texte">Fiche à compléter.</p>') + '</section>';
    var ferme = f.statut === 'CLOTURE' || f.statut === 'RECEPTIONNE';
    h += '<div class="boutons-ligne">' + (ferme ? '<button class="btn s sm" data-action="statut" data-statut="EN_COURS">' + ICO.refaire(16) + 'Rouvrir le projet</button>'
      : '<button class="btn s sm" data-action="statut" data-statut="CLOTURE">' + ICO.verrou(16) + 'Clôturer le projet</button>') +
      '<button class="btn s sm" data-action="sauvegarder">' + ICO.recevoir(16) + 'Sauvegarder (fichier)</button>' +
      '<button class="btn danger sm" data-action="retirer-projet">' + ICO.corbeille(16) + 'Retirer de ce téléphone</button></div>';
    return h;
  }

  function vueBarreBas() {
    var n = S.nav, p = projet();
    if (n.ecran !== 'projet' || !p) {
      return S.projets.size ? '<button class="btn s" data-action="recevoir">' + ICO.recevoir(18) + 'Recevoir</button><button class="btn p" data-action="nouveau-projet">' + ICO.plus(18) + 'Nouveau projet</button>' : '';
    }
    var auj = aujourdhui(), D = n.jour || auj, chef = estChef(p);
    if (n.onglet === 'journee') {
      return '<button class="btn s" data-action="nouvelles-taches" data-jour="' + (D >= auj ? D : auj) + '">' + ICO.plus(18) + 'Tâche</button>' +
        '<button class="btn s" data-action="nouveau-blocage">' + ICO.interdit(18) + 'Blocage</button>' +
        (chef ? '<button class="btn o" data-action="point">' + ICO.pointSoir(18) + 'Point du soir</button>' : '<button class="btn o" data-action="envoyer">' + ICO.envoi(18) + 'Mon avancement</button>');
    }
    if (n.onglet === 'blocages') return '<button class="btn p" data-action="nouveau-blocage">' + ICO.interdit(18) + 'Signaler un blocage</button>';
    if (n.onglet === 'taches') return '<button class="btn s" data-action="nouvelles-taches" data-jour="">' + ICO.plus(18) + 'Nouvelles tâches</button><button class="btn o" data-action="planifier" data-jour="' + auj + '">' + ICO.liste(18) + 'Planifier</button>';
    if (n.onglet === 'equipe') return chef ? '<button class="btn p" data-action="inviter">' + ICO.envoi(18) + 'Envoyer le projet à l\'équipe</button>' : '<button class="btn p" data-action="envoyer">' + ICO.envoi(18) + 'Envoyer mon avancement</button>';
    if (n.onglet === 'fiche') return '<button class="btn s" data-action="modifier-projet">' + ICO.crayon(18) + 'Modifier la fiche</button>';
    return '';
  }

  /* ============================== Feuilles ============================= */
  var feuille = null;
  function ouvrirFeuille(o) {
    fermerFeuille(true);
    document.getElementById('toast').classList.remove('visible');
    var fond = document.createElement('div');
    fond.className = 'feuille-fond';
    fond.innerHTML = '<div class="feuille" role="dialog" aria-modal="true" aria-labelledby="feuille-titre"><div class="feuille-tete"><h3 id="feuille-titre"></h3>' +
      '<button type="button" class="iconbtn" data-f="fermer" aria-label="Fermer">' + ICO.fermer(18) + '</button></div><div class="feuille-corps"></div><div class="feuille-pied"></div></div>';
    fond.querySelector('#feuille-titre').textContent = o.titre;
    var f = { fond: fond, corps: fond.querySelector('.feuille-corps'), pied: fond.querySelector('.feuille-pied'), o: o, retour: document.activeElement, etat: {} };
    f.corps.innerHTML = o.corps || '';
    poserPied(f, o.pied || '');
    document.body.appendChild(fond);
    document.body.classList.add('sans-defilement');
    (window.requestAnimationFrame || setTimeout)(function () { fond.classList.add('visible'); });
    fond.addEventListener('click', function (e) {
      if (e.target === fond) { fermerFeuille(); return; }
      var b = e.target.closest('[data-f]');
      if (!b || !fond.contains(b)) return;
      var a = b.getAttribute('data-f');
      if (a === 'fermer' || a === 'annuler') { fermerFeuille(); return; }
      if (a === 'choix') {
        var g = b.getAttribute('data-groupe');
        fond.querySelectorAll('.choix[data-groupe="' + g + '"]').forEach(function (x) { x.classList.toggle('actif', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      }
      if (o.action) o.action(a, b, f, e);
    });
    feuille = f;
    if (o.apres) o.apres(f);
    return f;
  }
  function poserPied(f, html) { f.pied.innerHTML = html; f.pied.hidden = !html; }
  function fermerFeuille(immediat) {
    var f = feuille;
    if (!f) return;
    feuille = null;
    if (f.o.ferme) f.o.ferme(f);
    document.body.classList.remove('sans-defilement');
    if (immediat) f.fond.remove(); else { f.fond.classList.remove('visible'); setTimeout(function () { f.fond.remove(); }, 200); }
    try { if (f.retour && f.retour.focus && document.contains(f.retour)) f.retour.focus({ preventScroll: true }); } catch (e) { /* rien */ }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && feuille) fermerFeuille(); });

  function champ(titre, html, aide) { return '<label class="champ"><span class="champ-titre">' + esc(titre) + (aide ? '<span class="mini">' + esc(aide) + '</span>' : '') + '</span>' + html + '</label>'; }
  function choix(groupe, valeur, contenu, actif, cls) {
    return '<button type="button" class="choix' + (cls ? ' ' + cls : '') + (actif ? ' actif' : '') + '" data-f="choix" data-groupe="' + groupe + '" data-valeur="' + esc(valeur) + '" aria-pressed="' + !!actif + '">' + contenu + '</button>';
  }
  function valeurChoix(f, groupe) { var b = f.fond.querySelector('.choix.actif[data-groupe="' + groupe + '"]'); return b ? b.getAttribute('data-valeur') : null; }
  function val(f, id) { var el = f.fond.querySelector('#' + id); return el ? el.value : ''; }
  function options(listeOpts, actuel) { return listeOpts.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(x[0]) === String(actuel == null ? '' : actuel) ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); }
  function erreurChamp(f, id, msg) {
    var el = f.fond.querySelector('#' + id);
    if (!el) { toast(msg, 'erreur'); return; }
    var c = el.closest('.champ') || el.parentNode;
    c.classList.add('en-erreur');
    if (!c.querySelector('.erreur-champ')) { var d = document.createElement('div'); d.className = 'erreur-champ'; d.textContent = msg; c.appendChild(d); }
    try { el.focus(); } catch (e) { /* rien */ }
    el.addEventListener('input', function () { c.classList.remove('en-erreur'); var x = c.querySelector('.erreur-champ'); if (x) x.remove(); }, { once: true });
  }
  function grilleRoles(actuel, filtre) {
    return '<div class="grille-choix">' + M.ROLES.filter(filtre || function () { return true; }).map(function (r) { return choix('role', r.id, esc(r.libelle), r.id === actuel); }).join('') + '</div>';
  }
  function champPrenom() {
    return S.moi.prenom ? '' : champ('Votre prénom', '<input id="x-prenom" type="text" maxlength="40" autocomplete="given-name" placeholder="Il s\'affiche à côté de ce que vous cochez">');
  }
  function lirePrenom(f) {
    if (S.moi.prenom) return true;
    var p = val(f, 'x-prenom').trim();
    if (!p) { erreurChamp(f, 'x-prenom', 'Indiquez votre prénom.'); return false; }
    S.moi.prenom = p.slice(0, 40);
    if (!S.memoireSeule) Base.mettre('reglages', { cle: 'moi', id: S.moi.id, prenom: S.moi.prenom }).catch(function () { /* rien */ });
    return true;
  }

  /* ----------------------------- Projet -------------------------------- */
  function feuilleProjet(pid) {
    var ex = pid ? M.fiche(projet(pid)) : null, auj = aujourdhui();
    var v = ex || { titre: '', affaire: '', client: '', lieu: '', machine: '', phase: 'INSTALLATION', debut: auj, duree: 5, contraintes: '' };
    var ph = parId(M.PHASES, v.phase) || M.PHASES[0];
    var corps = (ex ? '' : champPrenom()) +
      champ('Nom du projet', '<input id="i-titre" type="text" maxlength="120" autocomplete="off" placeholder="Ligne 3, encaisseuse" value="' + esc(v.titre) + '">') +
      '<div class="duo">' + champ('N° d\'affaire', '<input id="i-affaire" type="text" maxlength="40" autocomplete="off" placeholder="25-0142" value="' + esc(v.affaire) + '">') +
      champ('Client', '<input id="i-client" type="text" maxlength="120" autocomplete="off" value="' + esc(v.client) + '">') + '</div>' +
      '<div class="duo">' + champ('Lieu', '<input id="i-lieu" type="text" maxlength="120" autocomplete="off" placeholder="Ville du site" value="' + esc(v.lieu) + '">') +
      champ('Machine / équipements', '<input id="i-machine" type="text" maxlength="200" autocomplete="off" value="' + esc(v.machine) + '">') + '</div>' +
      '<div class="champ"><span class="champ-titre">Phase en cours</span><div class="grille-choix trois">' +
      M.PHASES.map(function (p) { return choix('phase', p.id, ICO[p.icone](22) + esc(p.court), p.id === ph.id); }).join('') + '</div>' +
      '<p class="mini" id="i-phase-equipe" style="margin-top:6px">' + esc(ph.equipe) + '</p></div>' +
      '<div class="duo">' + champ('Début', '<input id="i-debut" type="date" value="' + esc(v.debut || '') + '">') +
      champ('Durée prévue', '<input id="i-duree" type="number" inputmode="numeric" min="1" max="250" value="' + esc(v.duree || '') + '">', 'jours ouvrés') + '</div>' +
      (ex ? champ('Statut', '<select id="i-statut">' + options(M.STATUTS.map(function (s) { return [s.id, s.libelle]; }), ex.statut || 'EN_COURS') + '</select>') : '') +
      champ('Contraintes de site', '<textarea id="i-contraintes" maxlength="1500" placeholder="Accès zone production sur autorisation, coupure d\'énergie à demander la veille…">' + esc(v.contraintes) + '</textarea>') +
      (!ex ? '<div class="champ"><span class="champ-titre">Votre rôle sur ce projet</span>' + grilleRoles('CHEF') + '</div>' +
        champ('Votre adresse e-mail', '<input id="i-email" type="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="pour recevoir les avancements du soir">', 'chef : recommandée') +
        '<label class="case-ligne"><input type="checkbox" id="i-catalogue" checked><span>Ajouter les <b id="i-nb-cat">' + M.CATALOGUE[ph.id].length + '</b> tâches types de la phase, à planifier ensuite</span></label>' : '');
    ouvrirFeuille({
      titre: ex ? 'Modifier la fiche' : 'Nouveau projet',
      corps: corps,
      pied: '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn p" data-f="valider">' + (ex ? 'Enregistrer' : 'Créer le projet') + '</button>',
      action: function (a, b, f) {
        if (a === 'choix' && b.getAttribute('data-groupe') === 'phase') {
          var pp = parId(M.PHASES, valeurChoix(f, 'phase'));
          f.fond.querySelector('#i-phase-equipe').textContent = pp.equipe;
          var nb = f.fond.querySelector('#i-nb-cat'); if (nb) nb.textContent = M.CATALOGUE[pp.id].length;
        }
        if (a !== 'valider') return;
        if (!ex && !lirePrenom(f)) return;
        var titre = val(f, 'i-titre').trim();
        if (!titre) { erreurChamp(f, 'i-titre', 'Donnez un nom au projet.'); return; }
        var email = val(f, 'i-email').trim();
        if (email && !M.emailValide(email)) { erreurChamp(f, 'i-email', 'Cette adresse e-mail n\'est pas valide.'); return; }
        var duree = parseInt(val(f, 'i-duree'), 10);
        var data = { titre: titre, affaire: val(f, 'i-affaire').trim(), client: val(f, 'i-client').trim(), lieu: val(f, 'i-lieu').trim(), machine: val(f, 'i-machine').trim(),
          phase: valeurChoix(f, 'phase') || 'INSTALLATION', debut: val(f, 'i-debut') || null, duree: duree > 0 ? Math.min(duree, 250) : null, contraintes: val(f, 'i-contraintes').trim() };
        if (ex) {
          data.statut = val(f, 'i-statut');
          var diff = {};
          Object.keys(data).forEach(function (k) { if ((data[k] == null ? '' : data[k]) !== (ex[k] == null ? '' : ex[k])) diff[k] = data[k]; });
          fermerFeuille();
          if (!Object.keys(diff).length) return;
          if (diff.phase) diff['ph:' + M.cleUnique('p')] = { phase: diff.phase, le: Date.now(), par: S.moi.id };
          modifier(pid, 'fiche', null, diff);
          toast('Fiche enregistrée', 'ok');
          return;
        }
        data.role = valeurChoix(f, 'role') || 'CHEF';
        data.email = email;
        data.statut = data.debut && data.debut > aujourdhui() ? 'PREVU' : 'EN_COURS';
        var p = M.nouveauProjet(data, S.moi, M.horloge());
        S.projets.set(p.id, p);
        var avecCat = f.fond.querySelector('#i-catalogue').checked;
        if (avecCat) creerTaches(p.id, M.CATALOGUE[data.phase].map(function (x) { return x[0]; }), null, 'auto');
        sauverMaintenant(p.id);
        fermerFeuille(true);
        ouvrirProjet(p.id, avecCat ? 'taches' : 'journee');
        toast('Projet créé' + (avecCat ? ' avec ' + M.CATALOGUE[data.phase].length + ' tâches à planifier' : '') + ' : envoyez-le à l\'équipe (onglet Équipe).', 'ok');
      }
    });
  }
  function feuillePhase(pid) {
    var f = M.fiche(projet(pid)), suite = parId(M.PHASES, (parId(M.PHASES, f.phase) || {}).suite);
    if (!suite) return;
    ouvrirFeuille({
      titre: 'Passer en ' + suite.court.toLowerCase(),
      corps: '<div class="phase-tete">' + ICO[suite.icone](24) + '<span class="phase-nom">' + esc(suite.libelle) + '</span></div>' +
        '<p class="petit" style="margin-top:6px">' + esc(suite.equipe) + '</p><p style="margin:6px 0 12px;font-size:14px">' + esc(suite.resume) + '</p>' +
        '<label class="case-ligne"><input type="checkbox" id="ph-catalogue" checked><span>Ajouter les tâches types de cette phase, à planifier ensuite</span></label>',
      pied: '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn p" data-f="valider">Passer en ' + esc(suite.court.toLowerCase()) + '</button>',
      action: function (a, b, fe) {
        if (a !== 'valider') return;
        var d = { phase: suite.id }; d['ph:' + M.cleUnique('p')] = { phase: suite.id, le: Date.now(), par: S.moi.id };
        var cat = fe.fond.querySelector('#ph-catalogue').checked;
        fermerFeuille();
        modifier(pid, 'fiche', null, d);
        var n = cat ? ajouterCatalogue(pid, suite.id) : 0;
        toast('Phase : ' + suite.libelle + (n ? ' · ' + pluriel(n, 'tâche type ajoutée', 'tâches types ajoutées') : ''), 'ok');
      }
    });
  }
  function feuilleRetirer(pid) {
    var f = M.fiche(projet(pid));
    ouvrirFeuille({
      titre: 'Retirer le projet',
      corps: '<p style="font-size:14.5px">Retirer « <b>' + esc(f.titre) + '</b> » de ce téléphone ?</p>' +
        '<p class="petit" style="margin-top:8px">Les autres membres de l\'équipe le gardent. Pour le retrouver plus tard, il suffira d\'importer à nouveau un fichier du projet. Pensez à sauvegarder avant si vous avez des changements que personne n\'a reçus.</p>',
      pied: '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn danger" data-f="valider">' + ICO.corbeille(16) + 'Retirer</button>',
      action: function (a) {
        if (a !== 'valider') return;
        S.projets.delete(pid);
        clearTimeout(minuteursSauvegarde.get(pid)); minuteursSauvegarde.delete(pid);
        if (!S.memoireSeule) Base.supprimer('projets', pid).catch(function () { /* rien */ });
        fermerFeuille(true);
        allerAccueil();
        toast('Projet retiré de ce téléphone');
      }
    });
  }
  function feuilleResponsables(pid) {
    var f = M.fiche(projet(pid));
    ouvrirFeuille({
      titre: 'Responsables',
      corps: '<p class="petit" style="margin-bottom:12px">Ces adresses partent avec le projet : toute l\'équipe les connaît après le prochain échange. Si un responsable rejoint lui-même le projet, l\'adresse qu\'il saisit passe en priorité.</p>' +
        M.RESPONSABLES.map(function (r) {
          var c = f.responsables[r] || {};
          return '<div class="sous-titre">' + esc(libelleDe(M.ROLES, r)) + '</div><div class="duo">' +
            champ('Nom', '<input id="r-nom-' + r + '" type="text" maxlength="60" value="' + esc(c.nom || '') + '">') +
            champ('E-mail', '<input id="r-email-' + r + '" type="email" inputmode="email" autocapitalize="off" spellcheck="false" value="' + esc(c.email || '') + '">') + '</div>';
        }).join(''),
      pied: '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn p" data-f="valider">Enregistrer</button>',
      action: function (a, b, fe) {
        if (a !== 'valider') return;
        var d = {}, erreur = false;
        M.RESPONSABLES.forEach(function (r) {
          var nom = val(fe, 'r-nom-' + r).trim(), email = val(fe, 'r-email-' + r).trim();
          if (email && !M.emailValide(email)) { erreurChamp(fe, 'r-email-' + r, 'Adresse invalide.'); erreur = true; }
          var avant = f.responsables[r] || {};
          if (nom !== (avant.nom || '') || email !== (avant.email || '')) d['resp:' + r] = { nom: nom, email: email };
        });
        if (erreur) return;
        fermerFeuille();
        if (Object.keys(d).length) { modifier(pid, 'fiche', null, d); toast('Responsables enregistrés', 'ok'); }
      }
    });
  }
  function feuilleMonRole(pid) {
    var p = projet(pid), moi = monMembre(p) || {};
    ouvrirFeuille({
      titre: 'Vous dans ce projet',
      corps: champ('Votre prénom', '<input id="x-prenom2" type="text" maxlength="40" autocomplete="given-name" value="' + esc(S.moi.prenom || '') + '">') +
        '<div class="champ"><span class="champ-titre">Votre rôle</span>' + grilleRoles(moi.role) + '</div>' +
        champ('Votre adresse e-mail', '<input id="x-email" type="email" inputmode="email" autocapitalize="off" spellcheck="false" value="' + esc(moi.email || '') + '">', 'facultative'),
      pied: '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn p" data-f="valider">Enregistrer</button>',
      action: function (a, b, fe) {
        if (a !== 'valider') return;
        var prenom = val(fe, 'x-prenom2').trim(), email = val(fe, 'x-email').trim();
        if (!prenom) { erreurChamp(fe, 'x-prenom2', 'Indiquez votre prénom.'); return; }
        if (email && !M.emailValide(email)) { erreurChamp(fe, 'x-email', 'Cette adresse e-mail n\'est pas valide.'); return; }
        S.moi.prenom = prenom.slice(0, 40);
        if (!S.memoireSeule) Base.mettre('reglages', { cle: 'moi', id: S.moi.id, prenom: S.moi.prenom }).catch(function () { /* rien */ });
        fermerFeuille();
        var role = valeurChoix(fe, 'role') || moi.role || 'AUTRE';
        modifier(pid, 'membres', S.moi.id, { prenom: S.moi.prenom, role: role, email: email });
        if (role === 'CHEF' && !M.fiche(p).chefId) modifier(pid, 'fiche', null, { chefId: S.moi.id });
        toast('Enregistré : l\'équipe le verra à votre prochain envoi', 'ok');
      }
    });
  }

  /* --------------------------- Tâches ---------------------------------- */
  function feuilleAjoutTaches(pid, jourDefaut) {
    var f = M.fiche(projet(pid)), auj = aujourdhui();
    var existants = new Set(M.taches(projet(pid)).map(function (t) { return normaliser(t.libelle); }));
    var sugg = (M.CATALOGUE[f.phase] || []).filter(function (x) { return !existants.has(normaliser(x[0])); });
    var D = jourDefaut || '', L = D ? jourOuvreSuivant(D) : jourOuvreSuivant(auj);
    var opts = [];
    if (D) opts.push([D, majuscule(relatifJour(D)) + (relatifJour(D) === dateCourte(D) ? '' : ' (' + dateCourte(D) + ')')]);
    else opts.push(['', 'À planifier (sans date)']);
    if (D !== auj) opts.push([auj, 'Aujourd\'hui (' + dateCourte(auj) + ')']);
    if (L !== D && L !== auj) opts.push([L, majuscule(relatifJour(L)) + (relatifJour(L) === dateCourte(L) ? '' : ' (' + dateCourte(L) + ')')]);
    if (D) opts.push(['', 'À planifier (sans date)']);
    opts.push(['autre', 'Autre date…']);
    var corps = champ('Tâches, une par ligne', '<textarea id="nt-texte" rows="5" maxlength="6000" placeholder="Contrôle des entrées-sorties&#10;Réglage des capteurs du convoyeur"></textarea>') +
      (sugg.length ? '<div class="suggestion-titre">Tâches types · ' + esc((parId(M.PHASES, f.phase) || M.PHASES[0]).court) + '</div><div class="suggestions">' +
        sugg.map(function (x) { var m = parId(M.METIERS, x[1]); return '<button type="button" class="suggestion" data-f="sugg" data-lib="' + esc(x[0]) + '">' + (m ? ICO[m.icone](14) : ICO.plus(14)) + esc(x[0]) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="duo">' + champ('Prévues pour', '<select id="nt-jour">' + options(opts, D) + '</select>') +
      champ('Métier', '<select id="nt-metier">' + options([['auto', 'Selon la tâche'], ['', 'Sans métier']].concat(M.METIERS.map(function (m) { return [m.id, m.libelle]; })), 'auto') + '</select>') + '</div>' +
      '<div id="nt-autre" hidden>' + champ('Date', '<input id="nt-date" type="date" value="' + esc(L) + '">') + '</div>';
    ouvrirFeuille({
      titre: 'Nouvelles tâches', corps: corps,
      pied: '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn p" data-f="valider" id="nt-valider">Ajouter</button>',
      apres: function (fe) {
        var ta = fe.fond.querySelector('#nt-texte'), sel = fe.fond.querySelector('#nt-jour');
        function lignes() { return ta.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean); }
        function compter() {
          var n = lignes().length;
          fe.fond.querySelector('#nt-valider').textContent = n > 1 ? 'Ajouter ' + n + ' tâches' : 'Ajouter';
          var set = new Set(lignes().map(normaliser));
          fe.fond.querySelectorAll('.suggestion').forEach(function (s) { s.classList.toggle('actif', set.has(normaliser(s.getAttribute('data-lib')))); });
        }
        fe.etat.lignes = lignes; fe.etat.compter = compter;
        ta.addEventListener('input', compter);
        sel.addEventListener('change', function () { fe.fond.querySelector('#nt-autre').hidden = sel.value !== 'autre'; });
        setTimeout(function () { try { ta.focus({ preventScroll: true }); } catch (e) { /* rien */ } }, 220);
      },
      action: function (a, b, fe) {
        var ta = fe.fond.querySelector('#nt-texte');
        if (a === 'sugg') {
          var lib = b.getAttribute('data-lib'), ls = fe.etat.lignes(), n = normaliser(lib);
          var reste = ls.filter(function (l) { return normaliser(l) !== n; });
          ta.value = (reste.length === ls.length ? ls.concat([lib]) : reste).join('\n');
          fe.etat.compter();
          return;
        }
        if (a !== 'valider') return;
        var vus = new Set(), libs = [];
        fe.etat.lignes().forEach(function (l) { var k = normaliser(l); if (!vus.has(k)) { vus.add(k); libs.push(l.slice(0, 200)); } });
        if (!libs.length) { erreurChamp(fe, 'nt-texte', 'Écrivez au moins une tâche, ou touchez une tâche type.'); return; }
        libs = libs.slice(0, 60);
        var j = val(fe, 'nt-jour'); if (j === 'autre') j = val(fe, 'nt-date') || '';
        var metier = val(fe, 'nt-metier');
        fermerFeuille();
        creerTaches(pid, libs, j || null, metier);
        toast(pluriel(libs.length, 'tâche ajoutée', 'tâches ajoutées') + (j ? ' · ' + relatifJour(j) : ' · à planifier'), 'ok');
      }
    });
  }
  function feuillePlanifier(pid, D) {
    var dispo = M.taches(projet(pid)).filter(function (t) { return !t.jour && t.etat !== 'FAIT'; }).sort(parOrdre);
    ouvrirFeuille({
      titre: 'Planifier · ' + relatifJour(D),
      corps: dispo.length ? '<p class="petit" style="margin-bottom:6px">Cochez ce que l\'équipe fera ' + esc(relatifJour(D)) + '.</p><button type="button" class="mini-btn" data-f="tout" style="margin-bottom:6px">Tout cocher</button>' +
        dispo.map(function (t) { var m = parId(M.METIERS, t.metier); return '<label class="case-ligne"><input type="checkbox" class="pl-case" data-tid="' + esc(t.id) + '"><span>' + esc(t.libelle) + (m ? '<span class="mini" style="display:block">' + esc(m.libelle) + '</span>' : '') + '</span></label>'; }).join('')
        : '<p class="vide-texte">Aucune tâche à planifier. Ajoutez-en avec « Nouvelles tâches ».</p>',
      pied: dispo.length ? '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn p" data-f="valider" id="pl-valider" disabled>Planifier</button>' : '<button type="button" class="btn s" data-f="annuler">Fermer</button>',
      apres: function (fe) {
        fe.fond.addEventListener('change', function () {
          var n = fe.fond.querySelectorAll('.pl-case:checked').length, bt = fe.fond.querySelector('#pl-valider');
          if (bt) { bt.disabled = !n; bt.textContent = n ? 'Planifier ' + pluriel(n, 'tâche') : 'Planifier'; }
        });
      },
      action: function (a, b, fe) {
        if (a === 'tout') {
          var cases = fe.fond.querySelectorAll('.pl-case'), toutes = Array.prototype.every.call(cases, function (c) { return c.checked; });
          cases.forEach(function (c) { c.checked = !toutes; });
          fe.fond.dispatchEvent(new Event('change'));
          return;
        }
        if (a !== 'valider') return;
        var ids = Array.prototype.map.call(fe.fond.querySelectorAll('.pl-case:checked'), function (c) { return c.getAttribute('data-tid'); });
        if (!ids.length) return;
        fermerFeuille();
        ids.forEach(function (tid) { modifier(pid, 'taches', tid, { jour: D }); });
        toast(pluriel(ids.length, 'tâche prévue', 'tâches prévues') + ' ' + relatifJour(D), 'ok');
      }
    });
  }
  function feuilleTache(pid, tid) {
    var t = M.tache(projet(pid), tid);
    if (!t) return;
    var etat = t.etat || 'A_FAIRE';
    var corps = champ('Tâche', '<input id="t-lib" type="text" maxlength="200" value="' + esc(t.libelle) + '">') +
      '<div class="champ"><span class="champ-titre">État</span><div class="grille-choix trois">' +
      M.ETATS.map(function (e) { return choix('etat', e.id, ICO[e.icone](20) + esc(e.libelle), e.id === etat); }).join('') + '</div><p class="mini" id="t-qui" style="margin-top:6px"></p></div>' +
      '<div class="duo">' + champ('Prévue le', '<input id="t-jour" type="date" value="' + esc(t.jour || '') + '">', 'vide : à planifier') +
      champ('Métier', '<select id="t-metier">' + options([['', 'Sans métier']].concat(M.METIERS.map(function (m) { return [m.id, m.libelle]; })), t.metier || '') + '</select>') + '</div>' +
      champ('Note', '<textarea id="t-note" maxlength="1500" placeholder="Précision, référence, ce qu\'il reste à faire…">' + esc(t.note || '') + '</textarea>') +
      '<div id="t-blocages"></div><button type="button" class="btn s sm" data-f="bloquer" style="width:100%">' + ICO.interdit(16) + 'Signaler un blocage sur cette tâche</button>' +
      '<p class="mini" id="t-trace" style="margin-top:12px"></p>';
    function piedNormal() { return '<button type="button" class="btn danger sm" data-f="supprimer" style="flex:0 1 auto">' + ICO.corbeille(16) + 'Supprimer</button><button type="button" class="btn p" data-f="valider">Enregistrer</button>'; }
    ouvrirFeuille({
      titre: 'Tâche', corps: corps, pied: piedNormal(),
      rafraichir: function (fe) {
        var tc = M.tache(projet(pid), tid);
        if (!tc || tc.supprime) { fermerFeuille(); return; }
        var qui = fe.fond.querySelector('#t-qui'), choisi = valeurChoix(fe, 'etat');
        var autre = tc.etat === 'EN_COURS' && tc.enCoursPar && tc.enCoursPar !== S.moi.id && !fe.etat.reprendre;
        qui.textContent = choisi === 'EN_COURS' ? (autre ? 'Prise par ' + nomDe(tc.enCoursPar) + ' · ' + quandCourt(tc.enCoursLe) + '. ' : 'Vous la prenez en charge : l\'équipe verra votre prénom.')
          : choisi === 'FAIT' ? (tc.etat === 'FAIT' ? 'Faite par ' + nomDe(tc.faitPar) + ' · ' + quandCourt(tc.faitLe) : 'Elle sera cochée à votre nom.') : '';
        if (choisi === 'EN_COURS' && autre) { var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'mini-btn'; bt.setAttribute('data-f', 'reprendre'); bt.textContent = 'Je la reprends'; qui.appendChild(bt); }
        var bl = M.blocages(projet(pid)).filter(function (b) { return b.tache === tid && b.statut !== 'LEVE'; });
        fe.fond.querySelector('#t-blocages').innerHTML = bl.length ? '<div class="sous-titre">Bloquée par</div><div class="liste-blocages" style="margin-bottom:12px">' + bl.map(function (b) {
          return '<button type="button" class="blocage g' + (+b.gravite || 2) + '" data-f="voir-blocage" data-bid="' + esc(b.id) + '"><span class="blocage-ico">' + ICO.interdit(18) + '</span><span class="blocage-texte"><span class="blocage-desc">' + esc(b.description) + '</span></span></button>';
        }).join('') + '</div>' : '';
        var tr = [];
        if (tc.creeLe) tr.push('Ajoutée par ' + nomDe(tc.creePar) + ' · ' + quandCourt(tc.creeLe));
        if (tc.modifLe && tc.modifLe !== tc.creeLe) tr.push('dernière modification ' + quandCourt(tc.modifLe));
        fe.fond.querySelector('#t-trace').textContent = tr.join(' · ');
      },
      apres: function (fe) { fe.o.rafraichir(fe); },
      action: function (a, b, fe) {
        if (a === 'choix' || a === 'reprendre') { if (a === 'reprendre') fe.etat.reprendre = true; fe.o.rafraichir(fe); return; }
        if (a === 'voir-blocage') { feuilleBlocage(pid, b.getAttribute('data-bid')); return; }
        if (a === 'bloquer') { feuilleBlocageForm(pid, null, tid); return; }
        if (a === 'supprimer') { poserPied(fe, '<p class="question">Supprimer cette tâche ? Elle disparaîtra chez les autres au prochain échange.</p><button type="button" class="btn s" data-f="non">Annuler</button><button type="button" class="btn danger" data-f="oui-supprimer">Supprimer</button>'); return; }
        if (a === 'non') { poserPied(fe, piedNormal()); return; }
        if (a === 'oui-supprimer') { fermerFeuille(); modifier(pid, 'taches', tid, { supprime: true }); toast('Tâche supprimée'); return; }
        if (a !== 'valider') return;
        var tc = M.tache(projet(pid), tid);
        if (!tc) { fermerFeuille(); return; }
        var now = Date.now(), d = {};
        var lib = val(fe, 't-lib').trim() || t.libelle, nouvelEtat = valeurChoix(fe, 'etat') || etat;
        var jour = val(fe, 't-jour') || null, metier = val(fe, 't-metier'), note = val(fe, 't-note').trim();
        if (lib !== t.libelle) d.libelle = lib;
        if (jour !== (t.jour || null)) d.jour = jour;
        if (metier !== (t.metier || '')) d.metier = metier;
        if (note !== (t.note || '')) d.note = note;
        if (nouvelEtat !== etat || fe.etat.reprendre) {
          var s = statutDe(tc);
          s.etat = nouvelEtat; s.par = S.moi.id;
          if (nouvelEtat === 'FAIT') { s.faitPar = S.moi.id; s.faitLe = now; } else { s.faitPar = null; s.faitLe = null; }
          if (nouvelEtat === 'EN_COURS' && (etat !== 'EN_COURS' || fe.etat.reprendre || !tc.enCoursPar)) { s.enCoursPar = S.moi.id; s.enCoursLe = now; }
          if (nouvelEtat === 'A_FAIRE') { s.enCoursPar = null; s.enCoursLe = null; }
          d.statut = s;
        }
        fermerFeuille();
        if (!Object.keys(d).length) return;
        modifier(pid, 'taches', tid, d);
        toast('Tâche enregistrée', 'ok');
      }
    });
  }

  /* -------------------------- Blocages --------------------------------- */
  function feuilleBlocageForm(pid, bid, tacheId) {
    var ex = bid ? M.blocage(projet(pid), bid) : null;
    var v = ex || { description: '', gravite: 2, debloqueur: 'CHEF', echeance: '', tache: tacheId || '' };
    var taches = M.taches(projet(pid)).filter(function (t) { return t.etat !== 'FAIT' || t.id === v.tache; }).sort(function (a, b) { return (a.jour || '9') < (b.jour || '9') ? -1 : (a.jour || '9') > (b.jour || '9') ? 1 : parOrdre(a, b); });
    var corps = champ('Ce qui bloque', '<textarea id="b-desc" maxlength="600" placeholder="Variateur du convoyeur C2 en défaut au démarrage">' + esc(v.description) + '</textarea>') +
      '<div class="champ"><span class="champ-titre">Gravité</span><div class="grille-choix trois">' +
      M.GRAVITES.map(function (g) { return choix('gravite', g.id, ICO[g.id === 1 ? 'interdit' : g.id === 2 ? 'alerte' : 'information'](20) + esc(g.id === 1 ? 'Bloque l\'équipe' : g.court), +v.gravite === g.id, 'g' + g.id); }).join('') + '</div></div>' +
      champ('Qui peut le lever', '<select id="b-debl">' + options(M.DEBLOQUEURS.map(function (d) { return [d.id, d.libelle]; }), v.debloqueur) + '</select>', 'reçoit votre avancement du soir') +
      '<p class="mini" id="b-via" style="margin:-6px 0 12px"></p>' +
      '<div class="duo">' + champ('Échéance', '<input id="b-ech" type="date" value="' + esc(v.echeance || '') + '">', 'facultatif') +
      champ('Tâche concernée', '<select id="b-tache">' + options([['', 'Aucune en particulier']].concat(taches.map(function (t) { return [t.id, tronquer(t.libelle, 60)]; })), v.tache || '') + '</select>') + '</div>';
    ouvrirFeuille({
      titre: ex ? 'Modifier le blocage' : 'Signaler un blocage', corps: corps,
      pied: (ex ? '<button type="button" class="btn danger sm" data-f="supprimer" style="flex:0 1 auto">' + ICO.corbeille(16) + 'Supprimer</button>' : '<button type="button" class="btn s" data-f="annuler">Annuler</button>') +
        '<button type="button" class="btn p" data-f="valider">' + (ex ? 'Enregistrer' : 'Signaler') + '</button>',
      apres: function (fe) {
        var sel = fe.fond.querySelector('#b-debl');
        function via() { var d = parId(M.DEBLOQUEURS, sel.value); fe.fond.querySelector('#b-via').textContent = d && d.via ? 'Votre avancement partira au ' + M.roleMin(d.role) + ' : ' + d.via + '.' : ''; }
        sel.addEventListener('change', via); via();
        if (!ex) setTimeout(function () { try { fe.fond.querySelector('#b-desc').focus({ preventScroll: true }); } catch (e) { /* rien */ } }, 220);
      },
      action: function (a, b, fe) {
        if (a === 'supprimer') { poserPied(fe, '<p class="question">Supprimer ce blocage et son suivi ? Préférez « Lever » s\'il est résolu.</p><button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn danger" data-f="oui-supprimer">Supprimer</button>'); return; }
        if (a === 'oui-supprimer') { fermerFeuille(); modifier(pid, 'blocages', bid, { supprime: true }); toast('Blocage supprimé'); return; }
        if (a !== 'valider') return;
        var desc = val(fe, 'b-desc').trim();
        if (!desc) { erreurChamp(fe, 'b-desc', 'Décrivez ce qui bloque en une phrase.'); return; }
        var data = { description: desc, gravite: +(valeurChoix(fe, 'gravite') || 2), debloqueur: val(fe, 'b-debl'), echeance: val(fe, 'b-ech') || null, tache: val(fe, 'b-tache') || null };
        fermerFeuille();
        if (ex) { modifier(pid, 'blocages', bid, data); toast('Blocage enregistré', 'ok'); return; }
        creer(pid, 'blocages', Object.assign(data, { ouvertPar: S.moi.id, ouvertLe: Date.now(), etat: { statut: 'OUVERT' } }));
        var d = parId(M.DEBLOQUEURS, data.debloqueur);
        toast('Blocage noté : votre avancement du soir partira au ' + M.roleMin(d ? d.role : 'CHEF'), 'ok');
      }
    });
  }
  function feuilleBlocage(pid, bid) {
    if (!M.blocage(projet(pid), bid)) return;
    function piedPour(b) {
      return '<button type="button" class="btn s" data-f="modifier">' + ICO.crayon(16) + 'Modifier</button>' +
        (b.statut === 'LEVE' ? '<button type="button" class="btn o" data-f="rouvrir">' + ICO.refaire(16) + 'Rouvrir</button>' : '<button type="button" class="btn p" data-f="lever">' + ICO.valide(16) + 'Lever le blocage</button>');
    }
    var corps = '<div id="bd-infos"></div><div class="sous-titre">Suivi</div><div id="bd-suivi"></div>' +
      '<div class="saisie-suivi"><input id="bd-suivi-texte" type="text" maxlength="500" placeholder="Fournisseur relancé, livraison demain 8 h" aria-label="Ajouter un suivi"><button type="button" class="btn o sm" data-f="ajouter-suivi">Ajouter</button></div>' +
      '<div id="bd-lever" hidden style="margin-top:14px">' + champ('Comment a-t-il été levé ?', '<textarea id="bd-solution" maxlength="600" placeholder="Variateur remplacé, essai de démarrage OK"></textarea>', 'facultatif') + '</div>';
    ouvrirFeuille({
      titre: 'Point bloquant', corps: corps, pied: piedPour(M.blocage(projet(pid), bid)),
      rafraichir: function (fe) {
        var b = M.blocage(projet(pid), bid);
        if (!b || b.supprime) { fermerFeuille(); return; }
        var g = parId(M.GRAVITES, +b.gravite) || M.GRAVITES[1], leve = b.statut === 'LEVE', auj = aujourdhui();
        var t = b.tache && M.tache(projet(pid), b.tache), d = parId(M.DEBLOQUEURS, b.debloqueur);
        fe.fond.querySelector('#bd-infos').innerHTML = '<div class="ligne" style="margin-bottom:8px">' + tag(leve ? 'ok' : g.cls, leve ? 'Levé' : g.libelle) + (leve ? '' : '<span class="mini">depuis ' + esc(depuis(b.ouvertLe)) + '</span>') + '</div>' +
          '<p class="bloc-texte">' + esc(b.description) + '</p><div class="infos-lignes">' +
          '<span>' + ICO.personne(16) + 'Peut le lever : ' + esc(d ? d.libelle : '—') + '</span>' +
          (b.echeance ? '<span class="' + (!leve && b.echeance < auj ? 'rouge gras' : '') + '">' + ICO.calendrier(16) + 'Échéance : ' + esc(majuscule(relatifJour(b.echeance))) + (!leve && b.echeance < auj ? ' (dépassée)' : '') + '</span>' : '') +
          (t ? '<span>' + ICO.valideCercle(16) + 'Tâche : ' + esc(t.libelle) + '</span>' : '') +
          '<span>' + ICO.interdit(16) + 'Signalé par ' + esc(nomDe(b.ouvertPar)) + ' · ' + esc(quandCourt(b.ouvertLe)) + '</span>' +
          (leve ? '<span class="vert">' + ICO.valide(16) + 'Levé par ' + esc(nomDe(b.levePar)) + ' · ' + esc(quandCourt(b.leveLe)) + (b.solution ? ' : ' + esc(b.solution) : '') + '</span>' : '') + '</div>';
        var suivi = Object.keys(b.suivi || {}).map(function (k) { return b.suivi[k]; }).filter(Boolean).sort(function (x, y) { return (x.le || 0) - (y.le || 0); });
        fe.fond.querySelector('#bd-suivi').innerHTML = suivi.length ? suivi.map(function (s) { return '<div class="suivi-ligne"><span class="mini">' + esc(majuscule(nomDe(s.par))) + ' · ' + esc(quandCourt(s.le)) + '</span><p>' + esc(s.texte) + '</p></div>'; }).join('')
          : '<p class="vide-texte">Aucun suivi. Notez ici les relances, les réponses et ce qui est attendu.</p>';
        if (!fe.etat.enLevee && fe.etat.statut !== b.statut) poserPied(fe, piedPour(b));
        fe.etat.statut = b.statut;
      },
      apres: function (fe) {
        fe.o.rafraichir(fe);
        fe.fond.querySelector('#bd-suivi-texte').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fe.o.action('ajouter-suivi', null, fe); } });
      },
      action: function (a, b, fe) {
        var now = Date.now();
        if (a === 'modifier') { feuilleBlocageForm(pid, bid); return; }
        if (a === 'ajouter-suivi') {
          var inp = fe.fond.querySelector('#bd-suivi-texte'), texte = inp.value.trim();
          if (!texte) { inp.focus(); return; }
          var d = {}; d['s:' + M.cleUnique('s')] = { par: S.moi.id, le: now, texte: texte.slice(0, 500) };
          inp.value = '';
          modifier(pid, 'blocages', bid, d);
          return;
        }
        if (a === 'lever') {
          fe.etat.enLevee = true; fe.fond.querySelector('#bd-lever').hidden = false;
          poserPied(fe, '<button type="button" class="btn s" data-f="annuler-levee">Annuler</button><button type="button" class="btn p" data-f="confirmer-levee">' + ICO.valide(16) + 'Confirmer la levée</button>');
          return;
        }
        if (a === 'annuler-levee') { fe.etat.enLevee = false; fe.fond.querySelector('#bd-lever').hidden = true; poserPied(fe, piedPour(M.blocage(projet(pid), bid))); return; }
        if (a === 'confirmer-levee') {
          var sol = val(fe, 'bd-solution').trim();
          fermerFeuille();
          modifier(pid, 'blocages', bid, { etat: { statut: 'LEVE', levePar: S.moi.id, leveLe: now, solution: sol } });
          toast('Blocage levé', 'ok');
          return;
        }
        if (a === 'rouvrir') { modifier(pid, 'blocages', bid, { etat: { statut: 'OUVERT' } }); toast('Blocage rouvert'); }
      }
    });
  }

  /* ========================= Envois et réception ======================= */
  function blocContacts(liste, titre) {
    if (!liste.length) return '';
    return '<div class="dest-bloc"><span class="dest-titre">' + esc(titre) + '</span>' + liste.map(function (c) {
      return '<div class="dest-ligne"><b>' + esc(c.nom || c.libelle) + '</b>' + (c.nom ? '<span class="mini"> · ' + esc(c.libelle) + '</span>' : '') +
        '<span class="dest-mail ' + (c.email ? '' : 'attention') + '">' + esc(c.email || 'adresse inconnue') + '</span></div>';
    }).join('') + '</div>';
  }
  function zoneCode(code) {
    return '<details class="code-details"><summary>Autre façon : un message avec le code</summary>' +
      '<p class="mini" style="margin:6px 0">Le message reprend le résumé et ce code. Le destinataire le copie en entier et le colle dans « Recevoir ».</p>' +
      '<textarea id="x-code" class="code-texte" readonly rows="3" aria-label="Code de mise à jour">' + esc(code) + '</textarea>' +
      '<div class="boutons-ligne" style="margin-top:8px"><button type="button" class="btn s sm" data-f="copier-code">' + ICO.copie(16) + 'Copier le message</button>' +
      (typeof navigator.share === 'function' ? '<button type="button" class="btn s sm" data-f="partager-texte">' + ICO.envoi(16) + 'Partager le message</button>' : '') + '</div></details>';
  }
  /* Équipier : envoyer mon avancement du soir */
  function feuilleEnvoyer(pid) {
    var p = projet(pid), auj = aujourdhui();
    var dest = M.destinatairesAvancement(p, S.moi.id);
    var motif = dest.motif === 'blocage'
      ? 'Vous avez ' + pluriel(dest.blocages.length, 'point bloquant ouvert', 'points bloquants ouverts') + ' : votre avancement part à qui peut le lever' + (dest.cc.length ? ', le chef de chantier en copie' : '') + '.' + (dest.vias && dest.vias.length ? ' (' + dest.vias.join(' ; ') + ')' : '')
      : 'Aucun point bloquant ouvert à votre nom : votre avancement part au chef de chantier.';
    var texte = M.texteAvancement(p, S.moi.id, auj, auj);
    ouvrirFeuille({
      titre: 'Envoyer mon avancement',
      corps: '<section class="carte info" style="margin-bottom:12px">' + esc(motif) + '</section>' +
        blocContacts(dest.a, 'À') + blocContacts(dest.cc, 'Copie') +
        '<button type="button" class="btn s sm" data-f="copier-adresses" style="width:100%;margin:4px 0 12px">' + ICO.copie(16) + 'Copier les adresses</button>' +
        '<div class="sous-titre">Ce qui part</div><pre class="apercu-texte" id="x-texte">' + esc(texte) + '</pre>' +
        '<p class="mini" style="margin-top:6px">Le fichier joint contient le projet tel que votre téléphone le connaît : en l\'important, le destinataire récupère votre travail.</p>' +
        '<div id="x-code-zone"><p class="vide-texte">Préparation…</p></div>',
      pied: '<a class="btn s" id="x-mail" href="#" style="flex:0 1 auto">' + ICO.courriel(18) + 'E-mail</a><button type="button" class="btn p" data-f="partager" id="x-partager" disabled>' + ICO.envoi(18) + 'Partager le fichier</button>',
      apres: function (fe) {
        preparerEnvoi(pid, 'avancement', texte).then(function (env) {
          fe.etat.env = env;
          fe.fond.querySelector('#x-code-zone').innerHTML = zoneCode(env.code);
          fe.fond.querySelector('#x-partager').disabled = false;
          /* le lien e-mail ne peut pas joindre de fichier : le message contient le code, s'il n'est pas trop long */
          var corps = env.fichier.length < 16000 ? env.fichier : texte + '\n\n(Projet trop volumineux pour tenir dans cet e-mail : le fichier ' + env.nom + ' suit à part.)';
          var f = M.fiche(p);
          fe.fond.querySelector('#x-mail').setAttribute('href', lienMail(M.adressesDe(dest.a), M.adressesDe(dest.cc), 'Avancement ' + (S.moi.prenom || '') + ' · ' + (f.affaire || f.titre || '') + ' · ' + dateCourte(auj), corps));
        });
      },
      action: function (a, b, fe) {
        var env = fe.etat.env;
        if (a === 'copier-adresses') { var ad = M.adressesDe(dest.a.concat(dest.cc)); if (ad.length) copier(ad.join(', '), null, 'Adresses copiées'); else toast('Aucune adresse connue : choisissez le destinataire dans le partage.', 'erreur'); return; }
        if (a === 'copier-code' && env) { copier(env.fichier, fe.fond.querySelector('#x-code'), 'Message copié : collez-le dans votre messagerie'); noterMonEnvoi(pid); return; }
        if (a === 'partager-texte' && env) { partagerMessage(env.fichier, 'Avancement ' + (S.moi.prenom || '')).then(function (r) { if (r !== 'annule') noterMonEnvoi(pid); }); return; }
        if (a === 'partager' && env) {
          var f = M.fiche(p);
          partager(env.fichier, env.nom, 'text/plain', 'Avancement ' + (S.moi.prenom || ''), texte).then(function (r) {
            if (r === 'annule') return;
            noterMonEnvoi(pid);
            fermerFeuille();
            toast(r === 'partage' ? 'Avancement envoyé' : 'Fichier enregistré : joignez-le à votre message (' + (f.affaire || f.titre || '') + ')', 'ok');
          });
        }
      }
    });
    var lienM = document.getElementById('x-mail');
    if (lienM) lienM.addEventListener('click', function () { noterMonEnvoi(pid); });
  }
  function noterMonEnvoi(pid) { modifier(pid, 'membres', S.moi.id, { dernierEnvoi: Date.now() }); }

  /* Chef (ou tout membre) : envoyer le projet à l'équipe — invitation et mise à jour */
  function feuilleProjetEquipe(pid) {
    var p = projet(pid), f = M.fiche(p);
    var adresses = M.adressesDe(M.membres(p).filter(function (m) { return m.id !== S.moi.id; }).map(function (m) { return { email: m.email }; }));
    var texte = 'Projet « ' + (f.titre || '') + ' »' + (f.affaire ? ' (affaire ' + f.affaire + ')' : '') + ' — Chantier partagé.\n' +
      'Ouvrez le fichier joint avec l\'appli (bouton Recevoir). La première fois, choisissez votre rôle ; ensuite, votre téléphone est mis à jour.';
    ouvrirFeuille({
      titre: 'Envoyer le projet à l\'équipe',
      corps: '<p class="petit" style="margin-bottom:10px">Le fichier contient tout le projet : tâches, blocages, avancements déjà reçus. Envoyez-le au groupe de l\'équipe le matin, ou le soir après le point, pour que chacun reparte de la même base. Un nouveau venu l\'importe et choisit son rôle.</p>' +
        (adresses.length ? '<div class="dest-bloc"><span class="dest-titre">Adresses connues</span><div class="dest-ligne"><span class="dest-mail">' + esc(adresses.join(', ')) + '</span></div></div>' +
          '<button type="button" class="btn s sm" data-f="copier-adresses" style="width:100%;margin:4px 0 12px">' + ICO.copie(16) + 'Copier les adresses</button>' : '') +
        '<div id="x-code-zone"><p class="vide-texte">Préparation…</p></div>',
      pied: '<button type="button" class="btn s" data-f="annuler">Fermer</button><button type="button" class="btn p" data-f="partager" id="x-partager" disabled>' + ICO.envoi(18) + 'Partager le fichier</button>',
      apres: function (fe) {
        preparerEnvoi(pid, 'projet', M.resumeProjet(p, aujourdhui())).then(function (env) {
          fe.etat.env = env;
          fe.fond.querySelector('#x-code-zone').innerHTML = zoneCode(env.code);
          fe.fond.querySelector('#x-partager').disabled = false;
        });
      },
      action: function (a, b, fe) {
        var env = fe.etat.env;
        if (a === 'copier-adresses') { copier(adresses.join(', '), null, 'Adresses copiées'); return; }
        if (a === 'copier-code' && env) { copier(env.fichier, fe.fond.querySelector('#x-code'), 'Message copié : collez-le dans le groupe de l\'équipe'); return; }
        if (a === 'partager-texte' && env) { partagerMessage(env.fichier, 'Projet ' + (f.titre || '')); return; }
        if (a === 'partager' && env) {
          partager(env.fichier, env.nom, 'text/plain', 'Projet ' + (f.titre || ''), texte).then(function (r) {
            if (r === 'annule') return;
            fermerFeuille();
            toast(r === 'partage' ? 'Projet envoyé à l\'équipe' : 'Fichier enregistré : envoyez-le au groupe de l\'équipe', 'ok');
          });
        }
      }
    });
  }

  /* Chef : le point du soir en PDF */
  function feuillePoint(pid) {
    var p = projet(pid), auj = aujourdhui(), D = S.nav.jour && S.nav.jour <= auj ? S.nav.jour : auj;
    var jd0 = M.jour(p, D) || {};
    ouvrirFeuille({
      titre: 'Point du soir · ' + dateCourte(D),
      corps: '<div class="carte info" style="margin-bottom:12px">Importez d\'abord les avancements reçus (bouton Recevoir) : le point reprend le travail de tous ceux dont le fichier est arrivé.</div>' +
        '<div id="pt-envois"></div>' +
        champ('Synthèse du chef de chantier', '<textarea id="pt-synthese" maxlength="3000" placeholder="L\'essentiel en trois lignes : avancement, difficultés, ce qui est attendu et de qui.">' + esc(jd0.synthese || '') + '</textarea>') +
        '<div id="pt-dest"></div>' +
        '<div class="boutons-ligne" style="margin-top:4px"><button type="button" class="btn s sm" data-f="apercu">' + ICO.apercu(16) + 'Aperçu du PDF</button><button type="button" class="btn s sm" data-f="copier-texte">' + ICO.copie(16) + 'Copier le texte</button></div>' +
        '<div id="pt-apercu" class="apercu-pages"></div>' +
        '<div id="pt-apres" hidden class="carte info" style="margin-top:12px">Point envoyé. Renvoyez maintenant le projet à jour à l\'équipe, pour que chacun reparte demain de la même base.' +
        '<button type="button" class="btn p sm" data-f="equipe" style="width:100%;margin-top:8px">' + ICO.envoi(16) + 'Envoyer le projet à l\'équipe</button></div>',
      pied: '<button type="button" class="btn s" data-f="annuler">Fermer</button><button type="button" class="btn p" data-f="partager">' + ICO.envoi(18) + 'Partager le PDF</button>',
      rafraichir: function (fe) {
        var env = M.etatEnvois(projet(pid), D).filter(function (e) { return !e.estChef; });
        fe.fond.querySelector('#pt-envois').innerHTML = '<div class="sous-titre">Avancements reçus (' + env.filter(function (e) { return e.envoye; }).length + ' / ' + env.length + ')' +
          '<button type="button" class="mini-btn" data-f="recevoir" style="margin-left:8px;text-transform:none;letter-spacing:0">' + ICO.recevoir(14) + 'Recevoir</button></div>' +
          (env.length ? env.map(function (e) { return '<div class="acces-ligne">' + initiales(e.id) + '<span class="acces-texte"><b>' + esc(e.prenom) + '</b><span class="mini">' + esc(libelleDe(M.ROLES, e.role)) + '</span></span>' + (e.envoye ? tag('ok', 'Reçu ' + heure(e.le)) : tag('surv', 'Pas reçu')) + '</div>'; }).join('')
            : '<p class="vide-texte">Personne n\'a encore rejoint le projet.</p>');
        var dest = M.destinatairesPoint(projet(pid));
        var avec = dest.filter(function (c) { return c.email; });
        fe.fond.querySelector('#pt-dest').innerHTML = '<div class="sous-titre">Destinataires</div>' +
          (avec.length ? avec.map(function (c) { return '<div class="dest-ligne"><b>' + esc(c.nom || c.libelle) + '</b><span class="mini"> · ' + esc(c.libelle) + (c.prioritaire ? ' · blocage à lever' : '') + '</span><span class="dest-mail">' + esc(c.email) + '</span></div>'; }).join('') +
            '<button type="button" class="btn s sm" data-f="copier-adresses" style="width:100%;margin:6px 0 12px">' + ICO.copie(16) + 'Copier les adresses</button>'
            : '<p class="vide-texte">Aucune adresse de responsable : complétez-les dans l\'onglet Équipe, ou choisissez les destinataires dans le partage.</p>');
      },
      apres: function (fe) {
        fe.o.rafraichir(fe);
        var ta = fe.fond.querySelector('#pt-synthese'), minuteur = null;
        fe.etat.sauver = function () {
          clearTimeout(minuteur);
          var v = ta.value.trim(), avant = (M.jour(projet(pid), D) || {}).synthese || '';
          if (v !== avant) modifier(pid, 'jours', D, { synthese: v, synthesePar: S.moi.id });
        };
        ta.addEventListener('input', function () { clearTimeout(minuteur); minuteur = setTimeout(fe.etat.sauver, 800); });
        ta.addEventListener('blur', fe.etat.sauver);
      },
      ferme: function (fe) { if (fe.etat.sauver) fe.etat.sauver(); },
      action: function (a, b, fe) {
        if (fe.etat.sauver) fe.etat.sauver();
        var d = M.donneesPoint(projet(pid), D, auj);
        var f = M.fiche(projet(pid));
        if (a === 'recevoir') { feuilleRecevoir(function (pids) { if (pids && pids.indexOf(pid) !== -1) feuillePoint(pid); }); return; }
        if (a === 'copier-adresses') { copier(M.adressesDe(M.destinatairesPoint(projet(pid))).join(', '), null, 'Adresses copiées'); return; }
        if (a === 'copier-texte') { copier(M.texteDuPoint(projet(pid), D, auj), null, 'Texte du point copié'); return; }
        if (a === 'equipe') { feuilleProjetEquipe(pid); return; }
        if (a === 'apercu') {
          var zone = fe.fond.querySelector('#pt-apercu');
          zone.innerHTML = '<p class="vide-texte">Mise en page…</p>';
          window.Rapport.apercu(d, 1.6).then(function (pages) { zone.innerHTML = ''; pages.forEach(function (c) { zone.appendChild(c); }); }, function () { zone.innerHTML = '<p class="vide-texte">Aperçu impossible sur ce téléphone : le PDF reste disponible.</p>'; });
          return;
        }
        if (a === 'partager') {
          var nom = 'point-du-soir-' + (normaliser(f.affaire || f.titre || 'projet').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'projet') + '-' + D + '.pdf';
          var texte = 'Point du soir — ' + (f.titre || '') + (f.affaire ? ' (affaire ' + f.affaire + ')' : '') + ' — ' + dateCourte(D) + '\n\n' + M.texteDuPoint(projet(pid), D, auj);
          var blob = window.Rapport.pdf(d);
          partager(blob, nom, 'application/pdf', 'Point du soir ' + dateCourte(D), texte).then(function (r) {
            if (r === 'annule') return;
            modifier(pid, 'jours', D, { cloture: { par: S.moi.id, le: Date.now() } });
            fe.fond.querySelector('#pt-apres').hidden = false;
            toast(r === 'partage' ? 'Point du soir envoyé' : 'PDF enregistré : joignez-le à votre e-mail', 'ok');
          });
        }
      }
    });
  }

  /* Recevoir : un ou plusieurs fichiers, ou un ou plusieurs messages collés */
  function feuilleRecevoir(suite) {
    function erreur(fe, err) { fe.fond.querySelector('#rc-erreur').textContent = (err && err.message) || 'Import impossible.'; }
    ouvrirFeuille({
      titre: 'Recevoir',
      corps: '<p class="petit" style="margin-bottom:12px">Les avancements des collègues, ou le projet envoyé par le chef. Le projet de ce téléphone se met à jour ; rien de ce que vous avez saisi ne se perd.</p>' +
        '<label class="btn p" style="width:100%;margin-bottom:6px">' + ICO.recevoir(18) + 'Choisir un ou plusieurs fichiers<input id="rc-fichier" type="file" multiple hidden></label>' +
        '<p class="mini" style="margin-bottom:14px">Sur iPhone : dans Mail ou WhatsApp, enregistrez d\'abord les pièces jointes dans « Fichiers », puis sélectionnez-les ici, plusieurs à la fois si besoin.</p>' +
        '<div class="champ"><span class="champ-titre">Ou collez un ou plusieurs messages' +
        (navigator.clipboard && typeof navigator.clipboard.readText === 'function' ? '<button type="button" class="mini-btn" data-f="coller">' + ICO.copie(14) + 'Coller</button>' : '') + '</span>' +
        '<textarea id="rc-code" rows="4" aria-label="Message ou code reçu" placeholder="Le message reçu, ou plusieurs messages copiés d\'un coup : chacun contient un code qui commence par CP1."></textarea></div>' +
        '<p class="auth-erreur" id="rc-erreur" role="alert"></p>',
      pied: '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn p" data-f="importer">Importer</button>',
      apres: function (fe) {
        fe.fond.querySelector('#rc-fichier').addEventListener('change', function (e) {
          var fichiers = Array.prototype.slice.call((e.target.files) || []);
          e.target.value = '';
          if (!fichiers.length) return;
          fe.fond.querySelector('#rc-erreur').textContent = '';
          Promise.all(fichiers.map(function (fi) { return fi.text().then(function (t) { return { nom: fi.name, texte: t, fichier: true }; }, function () { return { nom: fi.name, texte: '', fichier: true }; }); }))
            .then(lireSources).then(function (r) { return importer(r, suite); }).catch(function (err) { erreur(fe, err); });
        });
      },
      action: function (a, b, fe) {
        if (a === 'coller') {
          navigator.clipboard.readText().then(function (t) {
            fe.fond.querySelector('#rc-code').value = t || '';
            if (t && t.trim()) fe.o.action('importer', null, fe);
            else erreur(fe, { message: 'Le presse-papiers est vide : copiez d\'abord le message reçu.' });
          }, function () { erreur(fe, { message: 'Collage refusé par le téléphone : appuyez longuement dans la zone, puis « Coller ».' }); });
          return;
        }
        if (a !== 'importer') return;
        var t = val(fe, 'rc-code').trim();
        if (!t) { erreur(fe, { message: 'Collez d\'abord le message reçu, ou choisissez un fichier.' }); return; }
        lireSources([{ nom: '', texte: t, fichier: false }]).then(function (r) { return importer(r, suite); }).catch(function (err) { erreur(fe, err); });
      }
    });
  }
  /* Premier import d'un projet : on le rejoint avec un rôle */
  function feuilleRejoindre(o, envois) {
    var recu = o.projet, f = M.fiche(recu);
    var chef = f.chefId ? M.membre(recu, f.chefId) : null;
    var ancien = M.membre(recu, S.moi.id);
    var roleDefaut = ancien && ancien.role ? ancien.role : f.chefId ? null : 'CHEF';
    ouvrirFeuille({
      titre: ancien ? 'Revenir sur le projet' : 'Rejoindre le projet',
      corps: '<section class="carte" style="margin-bottom:12px"><b>' + esc(f.titre || 'Projet') + '</b><p class="petit">' + esc([f.affaire, f.client, f.lieu].filter(Boolean).join(' · ')) + '</p>' +
        (chef ? '<p class="mini" style="margin-top:4px">Chef de chantier : ' + esc(chef.prenom) + '</p>' : '') + '</section>' + champPrenom() +
        '<div class="champ"><span class="champ-titre">Votre rôle sur ce projet</span>' + grilleRoles(roleDefaut) + '</div>' +
        champ('Votre adresse e-mail', '<input id="rj-email" type="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="facultative" value="' + esc(ancien && ancien.email || '') + '">', 'utile si vous recevez des avancements'),
      pied: '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn p" data-f="valider">Rejoindre</button>',
      action: function (a, b, fe) {
        if (a !== 'valider') return;
        if (!lirePrenom(fe)) return;
        var role = valeurChoix(fe, 'role');
        if (!role) { toast('Choisissez votre rôle sur ce projet.', 'erreur'); return; }
        var email = val(fe, 'rj-email').trim();
        if (email && !M.emailValide(email)) { erreurChamp(fe, 'rj-email', 'Cette adresse e-mail n\'est pas valide.'); return; }
        var p = M.fusionnerProjet(null, recu).projet;
        var ts = M.horloge();
        (envois || []).forEach(function (e) { noterEnvoi(p, e.id, e.le); });
        var valeurs = { prenom: S.moi.prenom, role: role, email: email };
        if (!ancien) valeurs.rejointLe = ts;
        if (ancien && ancien.parti) valeurs.parti = false;
        p.membres[S.moi.id] = M.fusionEntite(p.membres[S.moi.id], M.entite(S.moi.id, valeurs, ts));
        if (role === 'CHEF' && !f.chefId) M.ecrire(p.fiche, { chefId: S.moi.id }, ts);
        S.projets.set(p.id, p);
        sauverMaintenant(p.id);
        fermerFeuille(true);
        ouvrirProjet(p.id);
        toast((ancien ? 'Projet retrouvé' : 'Projet rejoint') + ' ' + M.enTantQue(role) + (role === 'CHEF' ? '' : ' : le soir, « Mon avancement » envoie votre journée'), 'ok');
      }
    });
  }

  /* ------------------------- Menu, aide -------------------------------- */
  function feuilleMenu() {
    ouvrirFeuille({
      titre: 'Menu',
      corps: '<p class="menu-compte">Sur ce téléphone : <b>' + esc(S.moi.prenom || 'prénom à renseigner') + '</b> · ' + pluriel(S.projets.size, 'projet') + '</p>' +
        '<button type="button" class="menu-ligne" data-f="prenom">' + ICO.personne(20) + '<span><b>Mon prénom</b><span class="mini">Affiché à côté de ce que vous cochez</span></span><span class="chevron">' + ICO.suivant(18) + '</span></button>' +
        '<button type="button" class="menu-ligne" data-f="recevoir">' + ICO.recevoir(20) + '<span><b>Recevoir</b><span class="mini">Fichiers ou messages : avancements, projet du chef</span></span><span class="chevron">' + ICO.suivant(18) + '</span></button>' +
        '<button type="button" class="menu-ligne" data-f="aide">' + ICO.modeEmploi(20) + '<span><b>Mode d\'emploi</b><span class="mini">Le matin, la journée, le soir</span></span><span class="chevron">' + ICO.suivant(18) + '</span></button>' +
        '<p class="menu-version">Chantier partagé ' + esc(VERSION_APP) + ' · sans serveur · moteur PDF de BFR-Chantier</p>',
      action: function (a) {
        if (a === 'prenom') feuillePrenom();
        if (a === 'recevoir') feuilleRecevoir();
        if (a === 'aide') feuilleAide();
      }
    });
  }
  function feuillePrenom() {
    ouvrirFeuille({
      titre: 'Mon prénom',
      corps: champ('Prénom', '<input id="x-prenom3" type="text" maxlength="40" autocomplete="given-name" value="' + esc(S.moi.prenom || '') + '">') +
        '<p class="mini">Il apparaît chez les autres à votre prochain envoi.</p>',
      pied: '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn p" data-f="valider">Enregistrer</button>',
      action: function (a, b, fe) {
        if (a !== 'valider') return;
        var pr = val(fe, 'x-prenom3').trim();
        if (!pr) { erreurChamp(fe, 'x-prenom3', 'Indiquez votre prénom.'); return; }
        S.moi.prenom = pr.slice(0, 40);
        if (!S.memoireSeule) Base.mettre('reglages', { cle: 'moi', id: S.moi.id, prenom: S.moi.prenom }).catch(function () { /* rien */ });
        S.projets.forEach(function (p, pid) { if (p.membres[S.moi.id]) modifier(pid, 'membres', S.moi.id, { prenom: S.moi.prenom }); });
        fermerFeuille();
        toast('Prénom enregistré', 'ok');
      }
    });
  }
  function feuilleAide() {
    ouvrirFeuille({
      titre: 'Mode d\'emploi',
      corps: '<div class="aide">' +
        '<h4>Le principe</h4><p>Tout reste dans votre téléphone, sans serveur ni compte, et l\'appli marche sans réseau. L\'équipe se met à jour en s\'envoyant des fichiers : chaque import fusionne les changements, la modification la plus récente l\'emporte et rien ne se perd.</p>' +
        '<h4>Pour commencer</h4><p>Le chef crée le projet, puis l\'envoie à l\'équipe (onglet Équipe). Chacun l\'importe avec Recevoir et choisit son rôle : mécanicien, câbleur, automaticien… Les tâches de votre métier s\'affichent en premier.</p>' +
        '<h4>Dans la journée</h4><p>Cochez vos tâches, prenez-les en charge (En cours), signalez ce qui bloque en indiquant qui peut le lever.</p>' +
        '<h4>Le soir</h4><p>Chacun touche « Mon avancement » : le fichier part au chef de chantier, ou, si vous avez signalé un blocage encore ouvert, à la personne qui peut le lever, le chef en copie (réglable dans l\'onglet Équipe). Le chef importe les avancements, envoie le point du soir en PDF, puis renvoie le projet à jour à l\'équipe.</p>' +
        '<h4>Recevoir</h4><p>Un message : copiez-le en entier, puis Recevoir, Coller. Plusieurs messages copiés d\'un coup s\'importent ensemble. Un fichier : Recevoir, Choisir un ou plusieurs fichiers ; sur iPhone, enregistrez d\'abord la pièce jointe dans « Fichiers ».</p>' +
        '<h4>Sauvegarde</h4><p>Chaque fichier envoyé est aussi une sauvegarde complète du projet. Onglet Fiche, « Sauvegarder » en enregistre un sur le téléphone.</p></div>',
      pied: '<button type="button" class="btn s" data-f="annuler">Fermer</button>'
    });
  }
  function copier(texte, el, message) {
    var ok = function () { toast(message || 'Copié', 'ok'); };
    var repli = function () {
      if (el) { try { el.focus(); el.select(); } catch (e) { /* rien */ } }
      toast('Copie impossible ici : sélectionnez le texte et copiez-le avec le menu du téléphone.');
    };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texte).then(ok, repli); else repli(); } catch (e) { repli(); }
  }

  /* ============================== Toast ================================ */
  var minuteurToast = null;
  function toast(msg, type, action) {
    var t = document.getElementById('toast');
    t.innerHTML = '<div class="toast ' + (type || '') + '"><span></span>' + (action ? '<button type="button" class="toast-action"></button>' : '') + '</div>';
    t.querySelector('span').textContent = msg;
    if (action) { var bt = t.querySelector('.toast-action'); bt.textContent = action.libelle; bt.addEventListener('click', function () { action.fn(); masquer(); }); }
    t.classList.add('visible');
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(masquer, action ? 5500 : type === 'erreur' ? 5000 : 3200);
    function masquer() { t.classList.remove('visible'); }
  }

  /* ============================ Événements ============================= */
  var app = document.getElementById('app');
  app.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'eq-copie' && S.nav.pid) {
      modifier(S.nav.pid, 'fiche', null, { copieChef: !!e.target.checked });
      toast(e.target.checked ? 'Le chef sera en copie des avancements bloqués' : 'Les avancements bloqués partiront au seul responsable', 'ok');
    }
  });
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-action]');
    if (!b || b.id === 'eq-copie') return;
    var a = b.getAttribute('data-action'), pid = S.nav.pid, auj = aujourdhui();
    switch (a) {
      case 'menu': feuilleMenu(); break;
      case 'recevoir': feuilleRecevoir(); break;
      case 'retour': allerAccueil(); break;
      case 'ouvrir': ouvrirProjet(b.getAttribute('data-pid')); break;
      case 'nouveau-projet': feuilleProjet(null); break;
      case 'modifier-projet': feuilleProjet(pid); break;
      case 'onglet': S.nav.onglet = b.getAttribute('data-onglet'); sauverNav(); rendre(); window.scrollTo(0, 0); break;
      case 'jour-prec': S.nav.jour = ajouterJours(S.nav.jour || auj, -1); S.nav.voirFil = false; rendre(); break;
      case 'jour-suiv': S.nav.jour = ajouterJours(S.nav.jour || auj, 1); S.nav.voirFil = false; rendre(); break;
      case 'jour-auj': S.nav.jour = auj; rendre(); break;
      case 'filtre-taches': S.nav.toutes = b.getAttribute('data-toutes') === '1'; rendre(); break;
      case 'cocher': cocher(pid, b.getAttribute('data-tid')); break;
      case 'tache': feuilleTache(pid, b.getAttribute('data-tid')); break;
      case 'planifier-vite': modifier(pid, 'taches', b.getAttribute('data-tid'), { jour: auj }); toast('Prévue aujourd\'hui'); break;
      case 'blocage': feuilleBlocage(pid, b.getAttribute('data-bid')); break;
      case 'nouvelles-taches': feuilleAjoutTaches(pid, b.getAttribute('data-jour') || ''); break;
      case 'taches-types': { var n = ajouterCatalogue(pid, M.fiche(projet()).phase); toast(n ? pluriel(n, 'tâche type ajoutée', 'tâches types ajoutées') : 'Toutes les tâches types sont déjà là', n ? 'ok' : ''); break; }
      case 'planifier': feuillePlanifier(pid, b.getAttribute('data-jour') || auj); break;
      case 'nouveau-blocage': feuilleBlocageForm(pid, null, null); break;
      case 'envoyer': feuilleEnvoyer(pid); break;
      case 'point': feuillePoint(pid); break;
      case 'inviter': feuilleProjetEquipe(pid); break;
      case 'responsables': feuilleResponsables(pid); break;
      case 'mon-role': feuilleMonRole(pid); break;
      case 'filtre-blocages': S.nav.filtreBlocages = b.getAttribute('data-filtre'); rendre(); break;
      case 'voir-terminees': S.nav.voirTerminees = !S.nav.voirTerminees; rendre(); break;
      case 'voir-faites': S.nav.voirFaites = !S.nav.voirFaites; rendre(); break;
      case 'voir-fil': S.nav.voirFil = !S.nav.voirFil; rendre(); break;
      case 'changer-phase': feuillePhase(pid); break;
      case 'statut': { var st = b.getAttribute('data-statut'); modifier(pid, 'fiche', null, { statut: st }); toast(st === 'CLOTURE' ? 'Projet clôturé' : 'Projet rouvert', 'ok'); break; }
      case 'sauvegarder':
        preparerEnvoi(pid, 'projet').then(function (env) { var r = telecharger(env.json, M.nomFichier(projet(pid), 'sauvegarde', S.moi, aujourdhui(), 'json'), 'application/json'); toast(r === 'telecharge' ? 'Sauvegarde enregistrée dans les téléchargements' : 'Sauvegarde impossible sur ce navigateur', r === 'telecharge' ? 'ok' : 'erreur'); });
        break;
      case 'retirer-projet': feuilleRetirer(pid); break;
    }
  });

  /* ============================= Démarrage ============================= */
  function demarrer() {
    try {
      var nav = JSON.parse(lireLocal('cp2_nav') || 'null');
      if (nav && nav.ecran === 'projet' && nav.pid) { S.nav.ecran = 'projet'; S.nav.pid = nav.pid; S.nav.onglet = nav.onglet || 'journee'; }
    } catch (e) { /* navigation par défaut */ }
    S.nav.jour = aujourdhui();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { /* sans hors connexion */ });
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* rien */ }
    rendre();
    Base.ouvrir().then(function () {
      return Promise.all([Base.tout('projets'), Base.tout('reglages')]);
    }).then(function (r) {
      (r[0] || []).forEach(function (p) { if (p && p.id && p.fiche) { S.projets.set(p.id, p); M.observer(M.tsMax(p)); } });
      var moi = (r[1] || []).filter(function (x) { return x.cle === 'moi'; })[0];
      if (moi && moi.id) S.moi = { id: moi.id, prenom: moi.prenom || '' };
      else { S.moi = { id: M.cleUnique('pe'), prenom: '' }; return Base.mettre('reglages', { cle: 'moi', id: S.moi.id, prenom: '' }); }
    }).catch(function () {
      S.memoireSeule = true;
      if (!S.moi.id) S.moi = { id: M.cleUnique('pe'), prenom: '' };
    }).then(function () {
      S.pret = true;
      if (S.nav.ecran === 'projet' && S.projets.has(S.nav.pid)) { var r2 = parId(M.ROLES, monRole(projet())); S.nav.toutes = !(r2 && r2.metier); }
      rendre();
    });
    setInterval(function () { if (S.pret && !document.hidden) planifierRendu(); }, 60000);
  }
  demarrer();
})();
