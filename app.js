/* =========================================================================
   CHANTIER PARTAGÉ — application
   -------------------------------------------------------------------------
   Suivi d'installation machine en équipe : tâches du jour à cocher, points
   bloquants, point du jour. Les données sont partagées en direct entre les
   téléphones par Firebase (Firestore), et restent consultables et
   modifiables hors connexion : les changements partent dès que le réseau
   revient.

   Accès : connexion par e-mail et mot de passe, adresse validée, et présente
   dans la liste « membres » tenue par les administrateurs (Menu → Accès à
   l'appli). Les règles de sécurité (firestore.rules) font respecter tout cela
   côté serveur ; l'interface ne fait que le refléter.

   Organisation de la base :
     membres/{adresse}                 adresses autorisées (rôle membre ou admin)
     equipe/{uid}                      prénom et métier de chacun
     installations/{id}                fiche de l'installation
       taches/{id}                     tâches (jour prévu, état, qui, quand)
       blocages/{id}                   points bloquants et leur suivi
       jours/{AAAA-MM-JJ}              synthèse et clôture de la journée
   ========================================================================= */

var VERSION_APP = '1.0.0';
var VERSION_FIREBASE = '12.19.0';
var CDN_FIREBASE = 'https://www.gstatic.com/firebasejs/' + VERSION_FIREBASE + '/';

(function () {
  'use strict';

  /* ============================== Icônes ===============================
     Jeu vectoriel monochrome / duotone (grille 24 px, currentColor),
     repris de BFR-Chantier : aucun émoji dans l'interface. */
  var TRAIT = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  function svg(trace, sz) {
    var s = sz || 18;
    return '<svg class="bfr-ico" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true" ' + TRAIT + '>' + trace + '</svg>';
  }
  function duo(fond, trace, sz) {
    var s = sz || 20;
    return '<svg class="bfr-ico" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true" ' + TRAIT + '>' +
      '<g fill="currentColor" stroke="none" opacity=".14">' + fond + '</g><g>' + trace + '</g></svg>';
  }
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
    alerte: function (s) {
      var p = '<path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>';
      return duo(p, p + '<line x1="12" y1="9.5" x2="12" y2="13.5"/><line x1="12" y1="17" x2="12.01" y2="17"/>', s || 20);
    },
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
      return duo('<rect x="7.5" y="7.5" width="9" height="9" rx="1.6"/>',
        '<rect x="7.5" y="7.5" width="9" height="9" rx="1.6"/><rect x="10.4" y="10.4" width="3.2" height="3.2" rx=".6"/>' +
        '<line x1="10" y1="3.5" x2="10" y2="7.5"/><line x1="14" y1="3.5" x2="14" y2="7.5"/><line x1="10" y1="16.5" x2="10" y2="20.5"/><line x1="14" y1="16.5" x2="14" y2="20.5"/>' +
        '<line x1="3.5" y1="10" x2="7.5" y2="10"/><line x1="3.5" y1="14" x2="7.5" y2="14"/><line x1="16.5" y1="10" x2="20.5" y2="10"/><line x1="16.5" y1="14" x2="20.5" y2="14"/>', s || 20);
    },
    reunion: function (s) { return duo(BULLE, BULLE + '<path d="M17.2 9.6h2a1.8 1.8 0 0 1 1.8 1.8v3.4a1.8 1.8 0 0 1-1.8 1.8h-.6v2.6l-3.2-2.6h-3.6"/>', s || 20); },
    bulle: function (s) { return svg(BULLE, s || 18); },
    crayon: function (s) { return svg('<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><line x1="14.8" y1="5.2" x2="18" y2="8.4"/>', s || 18); },
    corbeille: function (s) { return svg('<line x1="4" y1="6.5" x2="20" y2="6.5"/><path d="M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7"/><path d="M6.5 6.5 7.4 20a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-13.5"/><line x1="10.5" y1="10.5" x2="10.5" y2="17"/><line x1="13.5" y1="10.5" x2="13.5" y2="17"/>', s || 18); },
    copie: function (s) { return svg('<rect x="9" y="9" width="11.5" height="11.5" rx="2"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>', s || 18); },
    courriel: function (s) { return duo('<rect x="2.5" y="5" width="19" height="14" rx="2.4"/>', '<rect x="2.5" y="5" width="19" height="14" rx="2.4"/><polyline points="3.2 6.5 12 12.5 20.8 6.5"/>', s || 20); },
    document: function (s) {
      var p = '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/>';
      return duo(p, p + '<polyline points="13.8 3.5 13.8 8.7 19 8.7"/><line x1="8.5" y1="12.5" x2="15.5" y2="12.5"/><line x1="8.5" y1="16" x2="13.5" y2="16"/>', s || 20);
    },
    liste: function (s) { return svg('<line x1="10" y1="6.5" x2="20.5" y2="6.5"/><line x1="10" y1="12" x2="20.5" y2="12"/><line x1="10" y1="17.5" x2="20.5" y2="17.5"/><polyline points="3.5 6.5 5 8 7.4 5.2"/><polyline points="3.5 12 5 13.5 7.4 10.7"/><circle cx="5.3" cy="17.5" r="1.4"/>', s || 18); },
    modeEmploi: function (s) {
      var p = '<path d="M2.5 4.5h6.5a4 4 0 0 1 3 1.4 4 4 0 0 1 3-1.4h6.5v13H15a3 3 0 0 0-3 1.5 3 3 0 0 0-3-1.5H2.5z"/>';
      return duo(p, p + '<line x1="12" y1="6.5" x2="12" y2="17.5"/>', s || 20);
    },
    verrou: function (s) { return svg('<rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/>', s || 18); },
    cadenasOuvert: function (s) { return duo('<rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/>', '<rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.8a4 4 0 0 1 7.6-1.8"/><line x1="12" y1="14.2" x2="12" y2="16.8"/>', s || 20); },
    sortie: function (s) { return svg('<path d="M14.5 4.5H18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3.5"/><polyline points="10 8 6 12 10 16"/><line x1="6" y1="12" x2="15.5" y2="12"/>', s || 20); },
    refaire: function (s) { return svg('<path d="M20.2 12a8.2 8.2 0 1 1-2.7-6.1"/><polyline points="20.6 3.4 20.6 8.6 15.4 8.6"/>', s || 18); },
    lecture: function (s) { return svg('<polygon points="7 4.5 19 12 7 19.5"/>', s || 18); }
  };

  /* =========================== Référentiels ============================
     Phases, gravités et « qui peut débloquer » reprennent le vocabulaire
     de BFR-Chantier, pour que les deux outils parlent la même langue. */
  var PHASES = [
    { id: 'INSTALLATION', libelle: 'Installation mécanique', court: 'Installation', icone: 'cle',
      equipe: 'Mécanicien, un câbleur en renfort selon les cas',
      resume: 'Montage mécanique, puis raccordements : électricité, air comprimé, réseau et eau selon les cas.', suite: 'MISE_EN_ROUTE' },
    { id: 'MISE_EN_ROUTE', libelle: 'Mise en route', court: 'Mise en route', icone: 'automate',
      equipe: 'Automaticien(s), un mécanicien en renfort pour les réglages',
      resume: 'Démarrage de la ligne : entrées-sorties, sens de rotation des moteurs, essais, premières productions allégées, début de la formation.', suite: 'ACCOMPAGNEMENT' },
    { id: 'ACCOMPAGNEMENT', libelle: 'Accompagnement', court: 'Accompagnement', icone: 'reunion',
      equipe: 'Automaticien, le plus souvent seul',
      resume: 'La ligne tourne et le client devient autonome : on reste sur site pour ses problèmes et ses besoins.', suite: null }
  ];
  var STATUTS = [
    { id: 'PREVU', libelle: 'Prévue', cls: 'neutre' },
    { id: 'EN_COURS', libelle: 'En cours', cls: 'cyan' },
    { id: 'ATTENTE', libelle: 'En attente', cls: 'surv' },
    { id: 'SUSPENDU', libelle: 'Suspendue', cls: 'def' },
    { id: 'RECEPTIONNE', libelle: 'Réceptionnée', cls: 'ok' },
    { id: 'CLOTURE', libelle: 'Clôturée', cls: 'nuit' }
  ];
  var GRAVITES = [
    { id: 1, libelle: "1 · Bloque l'équipe", court: 'Bloque', cls: 'def' },
    { id: 2, libelle: '2 · Ralentit', court: 'Ralentit', cls: 'surv' },
    { id: 3, libelle: '3 · Gêne', court: 'Gêne', cls: 'neutre' }
  ];
  var DEBLOQUEURS = [
    { id: 'ATELIER', libelle: "Chef d'atelier" },
    { id: 'BE_ELECTRO', libelle: 'Responsable BE électrotechnique' },
    { id: 'BUREAU_AUTO', libelle: 'Chef bureau automatisme' },
    { id: 'CHARGE_AFFAIRE', libelle: "Chargé d'affaire" },
    { id: 'EQUIPE', libelle: "L'équipe sur site" },
    { id: 'CLIENT', libelle: 'Client' },
    { id: 'FOURNISSEUR', libelle: 'Fournisseur' },
    { id: 'AUTRE_CORPS', libelle: "Autre corps d'état" }
  ];
  var METIERS = [
    { id: 'MECA', libelle: 'Mécanique', icone: 'cle' },
    { id: 'ELEC', libelle: 'Électrique', icone: 'eclaire' },
    { id: 'AUTO', libelle: 'Automatisme', icone: 'automate' },
    { id: 'CLIENT', libelle: 'Avec le client', icone: 'reunion' }
  ];
  var ROLES = ['Mécanicien', 'Câbleur', 'Automaticien', 'Chef de chantier', "Chargé d'affaire", 'Autre'];
  var ETATS = [
    { id: 'A_FAIRE', libelle: 'À faire', icone: 'vide' },
    { id: 'EN_COURS', libelle: 'En cours', icone: 'demi' },
    { id: 'FAIT', libelle: 'Faite', icone: 'valideCercle' }
  ];
  /* Tâches types par phase (catalogue de BFR-Chantier), avec le métier concerné */
  var CATALOGUE = {
    INSTALLATION: [
      ['Préparation du poste de travail et des outillages', 'MECA'],
      ['Déchargement et mise en place du matériel', 'MECA'],
      ["Montage mécanique de l'ensemble", 'MECA'],
      ['Alignement, calage et fixation au sol', 'MECA'],
      ['Montage des protecteurs et carters', 'MECA'],
      ['Raccordement des tubes et flexibles', 'MECA'],
      ['Raccordement air comprimé', 'MECA'],
      ['Raccordement eau / fluides', 'MECA'],
      ['Tirage et raccordement des câbles', 'ELEC'],
      ["Raccordement de l'armoire électrique", 'ELEC'],
      ['Mise à la terre et continuité des masses', 'ELEC'],
      ['Connexions réseau / informatique', 'ELEC'],
      ['Repérage et étiquetage', 'ELEC'],
      ['Nettoyage et remise en ordre du chantier', ''],
      ['Réunion de chantier avec le client', 'CLIENT']
    ],
    MISE_EN_ROUTE: [
      ['Mise sous tension et contrôles de sécurité', 'ELEC'],
      ['Contrôle des entrées-sorties', 'AUTO'],
      ['Contrôle du sens de rotation des moteurs', 'AUTO'],
      ['Paramétrage des variateurs', 'AUTO'],
      ["Programmation de l'automate", 'AUTO'],
      ['Réglages mécaniques avec le mécanicien', 'MECA'],
      ["Essais à blanc avec l'équipe", 'AUTO'],
      ['Premières productions allégées', 'AUTO'],
      ['Essais en production avec le client', 'CLIENT'],
      ['Début de la formation des équipes', 'CLIENT'],
      ['Formation des opérateurs', 'CLIENT'],
      ['Réunion de chantier avec le client', 'CLIENT']
    ],
    ACCOMPAGNEMENT: [
      ["Point avec l'exploitant sur les problèmes rencontrés", 'CLIENT'],
      ["Analyse d'un défaut ou d'un arrêt de ligne", 'AUTO'],
      ['Réglage fin / optimisation', 'AUTO'],
      ['Modification du programme', 'AUTO'],
      ['Formation complémentaire des opérateurs', 'CLIENT'],
      ['Formation maintenance / dépannage', 'CLIENT'],
      ["Demande d'amélioration transmise au bureau d'études", ''],
      ['Levée des réserves', ''],
      ['Réunion de chantier avec le client', 'CLIENT']
    ]
  };

  function parId(liste, id) { for (var i = 0; i < liste.length; i++) if (liste[i].id === id) return liste[i]; return null; }
  function libelleDe(liste, id) { var e = parId(liste, id); return e ? e.libelle : ''; }
  function metierCatalogue(lib) {
    var n = normaliser(lib);
    for (var p in CATALOGUE) for (var i = 0; i < CATALOGUE[p].length; i++) if (normaliser(CATALOGUE[p][i][0]) === n) return CATALOGUE[p][i][1];
    return '';
  }

  /* ============================ Utilitaires ============================ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoLocal(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function aujourdhui() { return isoLocal(new Date()); }
  function parseIso(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function ajouterJours(s, n) { var d = parseIso(s); d.setDate(d.getDate() + n); return isoLocal(d); }
  function jourDe(ms) { return ms ? isoLocal(new Date(ms)) : null; }
  function heure(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  var FMT_LONG = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var FMT_JOUR = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  var FMT_COURT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  function majuscule(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function dateLongue(s) { return FMT_LONG.format(parseIso(s)); }
  function dateJour(s) { return majuscule(FMT_JOUR.format(parseIso(s))); }
  function dateCourte(s) { return FMT_COURT.format(parseIso(s)); }
  function estWeekend(s) { var j = parseIso(s).getDay(); return j === 0 || j === 6; }
  function jourOuvreSuivant(s) { var x = ajouterJours(s, 1); while (estWeekend(x)) x = ajouterJours(x, 1); return x; }
  function joursOuvres(debut, fin) {
    if (!debut || !fin || fin < debut) return 0;
    var n = 0, d = debut, garde = 0;
    while (d <= fin && garde < 3000) { if (!estWeekend(d)) n++; d = ajouterJours(d, 1); garde++; }
    return n;
  }
  function relatifJour(s) {
    var a = aujourdhui();
    if (s === a) return "aujourd'hui";
    if (s === ajouterJours(a, 1)) return 'demain';
    if (s === ajouterJours(a, -1)) return 'hier';
    return dateCourte(s);
  }
  function quandCourt(ms) {
    if (!ms) return '';
    var j = jourDe(ms), a = aujourdhui();
    if (j === a) return heure(ms);
    if (j === ajouterJours(a, -1)) return 'hier ' + heure(ms);
    return dateCourte(j) + ' ' + heure(ms);
  }
  function depuis(ms) {
    var min = Math.max(0, Math.round((Date.now() - ms) / 60000));
    if (min < 60) return min + ' min';
    var h = Math.round(min / 60);
    if (h < 24) return h + ' h';
    return Math.round(h / 24) + ' j';
  }
  function pluriel(n, sing, plur) { return n + ' ' + (n > 1 ? (plur || sing + 's') : sing); }
  function normaliser(s) { return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '); }
  function tronquer(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).replace(/\s+$/, '') + '…' : s; }
  function cleUnique(p) { return (p || 'k') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function lireLocal(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function ecrireLocal(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } }
  function effacerLocal(k) { try { window.localStorage.removeItem(k); } catch (e) { /* rien */ } }
  function parOrdre(a, b) { return ((a.ordre || 0) - (b.ordre || 0)) || ((a.creeLe || 0) - (b.creeLe || 0)); }
  function adresseValide(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }
  function lienAppli() { return location.origin + location.pathname.replace(/index\.html$/, ''); }

  /* =============================== État ================================ */
  var S = {
    /* demarrage · config · cdn · connexion · creation · verification · acces · refuse · erreur · ok */
    etat: 'demarrage',
    fb: null, auth: null, db: null,
    utilisateur: null, moi: null, email: '', role: null,
    emailSaisi: '', erreurCode: '',
    lectureSeule: false,
    installations: new Map(), instPret: false,
    vues: new Set(), creation: null,
    equipe: new Map(), equipePret: false,
    taches: new Map(), blocages: new Map(), jours: new Map(),
    membres: new Map(),
    nav: { ecran: 'accueil', iid: null, onglet: 'journee', jour: null, filtreBlocages: 'OUVERT', voirTerminees: false, voirFaites: false, voirFil: false },
    profilPropose: false
  };
  var abonnements = new Map();

  function peutModifier() { return S.etat === 'ok' && !!S.db && !S.lectureSeule; }
  function enMap(snap) { var m = new Map(); snap.docs.forEach(function (d) { if (d.exists) m.set(d.id, d.data()); }); return m; }
  function liste(m) { var out = []; if (m) m.forEach(function (d, id) { out.push(Object.assign({ id: id }, d)); }); return out; }
  function tachesDe(iid) { return S.taches.has(iid) ? liste(S.taches.get(iid)) : null; }
  function blocagesDe(iid) { return S.blocages.has(iid) ? liste(S.blocages.get(iid)) : null; }
  function jourDoc(iid, D) { var m = S.jours.get(iid); return m ? (m.get(D) || null) : null; }
  function cheminInst(iid) { return 'installations/' + iid; }
  function cheminTache(iid, tid) { return 'installations/' + iid + '/taches/' + tid; }
  function cheminBlocage(iid, bid) { return 'installations/' + iid + '/blocages/' + bid; }
  function cheminJour(iid, D) { return 'installations/' + iid + '/jours/' + D; }

  /* ============================== Modèle ===============================
     Fonctions de calcul pures : la journée, le fil, l'avancement, le texte
     du point. Rien n'est écrit ici. */
  function vueJour(taches, D, auj) {
    var out = [];
    taches.forEach(function (t) {
      var fj = t.etat === 'FAIT' && t.faitLe ? jourDe(t.faitLe) : null;
      var motif = null;
      if (t.jour === D) motif = 'prevue';
      else if (D === auj && t.jour && t.jour < D && t.etat !== 'FAIT') motif = 'reportee';
      else if (fj === D) motif = 'faite';
      if (motif) out.push({ t: t, motif: motif, avant: !!(t.jour && t.jour < D) });
    });
    out.sort(function (a, b) {
      if (a.avant !== b.avant) return a.avant ? -1 : 1;
      if (a.avant && a.t.jour !== b.t.jour) return a.t.jour < b.t.jour ? -1 : 1;
      return parOrdre(a.t, b.t);
    });
    var faites = out.filter(function (x) { return x.t.etat === 'FAIT'; }).length;
    return { liste: out, total: out.length, faites: faites };
  }
  function blocagesOuverts(blocs) {
    return blocs.filter(function (b) { return b.statut !== 'LEVE'; }).sort(function (a, b) {
      return ((+a.gravite || 2) - (+b.gravite || 2)) || ((a.ouvertLe || 0) - (b.ouvertLe || 0));
    });
  }
  function blocagesParTache(blocs) {
    var m = new Map();
    blocs.forEach(function (b) { if (b.statut !== 'LEVE' && b.tache) { if (!m.has(b.tache)) m.set(b.tache, []); m.get(b.tache).push(b); } });
    return m;
  }
  function avancement(taches) {
    var total = taches.length, faites = taches.filter(function (t) { return t.etat === 'FAIT'; }).length;
    return { total: total, faites: faites, pct: total ? Math.round(100 * faites / total) : 0 };
  }
  function numeroJour(inst, D) {
    if (!inst.debut || D < inst.debut || estWeekend(D)) return null;
    return joursOuvres(inst.debut, D);
  }
  function libelleNumero(inst, D) {
    var n = numeroJour(inst, D);
    return n ? 'J' + n + (inst.duree ? ' / ' + inst.duree : '') : '';
  }
  function filJour(taches, blocs, jd, D) {
    var ev = [], groupes = new Map();
    taches.forEach(function (t) {
      if (t.creeLe && jourDe(t.creeLe) === D) {
        var k = (t.creePar || '') + '|' + Math.floor(t.creeLe / 60000);
        if (!groupes.has(k)) groupes.set(k, []);
        groupes.get(k).push(t);
      }
      if (t.etat === 'EN_COURS' && t.enCoursLe && jourDe(t.enCoursLe) === D) ev.push({ le: t.enCoursLe, par: t.enCoursPar, texte: 'a pris « ' + tronquer(t.libelle, 70) + ' »' });
      if (t.etat === 'FAIT' && t.faitLe && jourDe(t.faitLe) === D) ev.push({ le: t.faitLe, par: t.faitPar, texte: 'a coché « ' + tronquer(t.libelle, 70) + ' »' });
    });
    groupes.forEach(function (g) {
      var le = Math.min.apply(null, g.map(function (t) { return t.creeLe; }));
      ev.push({ le: le, par: g[0].creePar, texte: g.length > 1 ? 'a ajouté ' + g.length + ' tâches' : 'a ajouté « ' + tronquer(g[0].libelle, 70) + ' »' });
    });
    blocs.forEach(function (b) {
      if (b.ouvertLe && jourDe(b.ouvertLe) === D) ev.push({ le: b.ouvertLe, par: b.ouvertPar, texte: 'a signalé un blocage : « ' + tronquer(b.description, 70) + ' »' });
      if (b.statut === 'LEVE' && b.leveLe && jourDe(b.leveLe) === D) ev.push({ le: b.leveLe, par: b.levePar, texte: 'a levé le blocage « ' + tronquer(b.description, 60) + ' »' });
      Object.keys(b.suivi || {}).forEach(function (k) {
        var s = b.suivi[k];
        if (s && s.le && jourDe(s.le) === D) ev.push({ le: s.le, par: s.par, texte: 'sur « ' + tronquer(b.description, 40) + ' » : ' + tronquer(s.texte, 90) });
      });
    });
    if (jd && jd.clotureLe) ev.push({ le: jd.clotureLe, par: jd.cloturePar, texte: 'a clôturé la journée' });
    ev.sort(function (a, b) { return b.le - a.le; });
    return ev;
  }
  function idsActifs(fil) {
    var vus = [], chrono = fil.slice().sort(function (a, b) { return a.le - b.le; });
    chrono.forEach(function (e) { if (e.par && vus.indexOf(e.par) === -1) vus.push(e.par); });
    return vus;
  }
  function texteDuPoint(inst, D, auj, taches, blocs, jd, synthese) {
    var vj = vueJour(taches, D, auj);
    var ph = parId(PHASES, inst.phase);
    var av = avancement(taches);
    var L = [];
    L.push('POINT DU JOUR — ' + majuscule(dateLongue(D)));
    L.push([inst.titre, inst.affaire ? 'affaire ' + inst.affaire : '', inst.client ? inst.client + (inst.lieu ? ' (' + inst.lieu + ')' : '') : inst.lieu].filter(Boolean).join(' · '));
    L.push(['Phase : ' + (ph ? ph.libelle : '—'), libelleNumero(inst, D)].filter(Boolean).join(' — '));
    L.push('');
    L.push('Avancement : ' + vj.faites + ' / ' + vj.total + ' tâches du jour faites · ' + av.pct + ' % de l\'installation (' + av.faites + ' / ' + av.total + ')');
    var faites = vj.liste.filter(function (x) { return x.t.etat === 'FAIT'; });
    var reste = vj.liste.filter(function (x) { return x.t.etat !== 'FAIT'; });
    L.push('');
    L.push('FAIT');
    if (faites.length) faites.forEach(function (x) { L.push(' ✓ ' + x.t.libelle + ' (' + nomDe(x.t.faitPar) + ')'); });
    else L.push(' Aucune tâche cochée.');
    if (reste.length) {
      L.push('');
      L.push('RESTE À FAIRE');
      reste.forEach(function (x) {
        var t = x.t, info = [];
        if (t.etat === 'EN_COURS') info.push('en cours, ' + nomDe(t.enCoursPar));
        if (x.avant && t.jour) info.push('prévue ' + dateCourte(t.jour));
        L.push(' • ' + t.libelle + (info.length ? ' (' + info.join(', ') + ')' : ''));
      });
    }
    var ouverts = blocagesOuverts(blocs);
    L.push('');
    L.push('POINTS BLOQUANTS' + (ouverts.length ? ' (' + ouverts.length + ')' : ''));
    if (ouverts.length) {
      ouverts.forEach(function (b) {
        var g = parId(GRAVITES, +b.gravite);
        var att = [libelleDe(DEBLOQUEURS, b.debloqueur), b.echeance ? 'échéance ' + dateCourte(b.echeance) : ''].filter(Boolean).join(', ');
        L.push(' • [' + (g ? g.libelle : '') + (b.ouvertLe ? ', depuis ' + depuis(b.ouvertLe) : '') + '] ' + b.description + (att ? ' — attend : ' + att : ''));
      });
    } else L.push(' Aucun blocage ouvert.');
    var lendemain = jourOuvreSuivant(D);
    var prevu = taches.filter(function (t) { return t.jour === lendemain && t.etat !== 'FAIT'; }).sort(parOrdre);
    L.push('');
    L.push('PRÉVU ' + dateCourte(lendemain).toUpperCase());
    if (prevu.length) prevu.forEach(function (t) { L.push(' • ' + t.libelle); });
    else L.push(' Rien de planifié pour l\'instant.');
    var syn = (synthese != null ? synthese : (jd && jd.synthese) || '').trim();
    if (syn) { L.push(''); L.push('SYNTHÈSE'); L.push(syn); }
    return L.join('\n');
  }

  /* ============================ Personnes ==============================
     On ne stocke que des identifiants de compte. Le prénom affiché est
     celui que chacun a saisi dans « Mon profil ». */
  function nomDe(id) {
    if (!id) return '—';
    var e = S.equipe.get(id);
    if (e && e.prenom) return e.prenom;
    if (e && e.email) return e.email.split('@')[0];
    return id === S.moi ? 'vous' : 'quelqu\'un';
  }
  function initiales(id) {
    var n = nomDe(id);
    var ini = n === 'vous' || n === 'quelqu\'un' ? '?' : n.split(/[\s.\-_]+/).filter(Boolean).slice(0, 2).map(function (m) { return m.charAt(0).toUpperCase(); }).join('');
    return '<span class="initiales" title="' + esc(n) + '">' + esc(ini || '?') + '</span>';
  }

  /* ======================= Firebase : adaptateur =======================
     Une petite façade au-dessus du SDK modulaire, avec la même forme que
     le reste du code attend : db.doc(chemin), db.collection(chemin), et sur
     chaque référence get / set / update / delete / onSnapshot. */
  function adaptateur(F, fs) {
    function adapterDoc(s) { return { id: s.id, exists: s.exists(), data: function () { return s.data(); }, metadata: s.metadata }; }
    function adapterQuery(q) { return { docs: q.docs.map(adapterDoc), size: q.size, empty: q.empty, metadata: q.metadata }; }
    function refDoc(chemin) {
      var r = F.doc(fs, chemin);
      return {
        id: r.id, path: r.path,
        get: function () { return F.getDoc(r).then(adapterDoc); },
        set: function (d, o) { return o ? F.setDoc(r, d, o) : F.setDoc(r, d); },
        update: function (d) { return F.updateDoc(r, d); },
        delete: function () { return F.deleteDoc(r); },
        onSnapshot: function (suivant, erreur) { return F.onSnapshot(r, function (s) { suivant(adapterDoc(s)); }, erreur); }
      };
    }
    function refCollection(chemin) {
      var c = F.collection(fs, chemin);
      return {
        path: chemin,
        doc: function (id) { return refDoc(id ? chemin + '/' + id : F.doc(c).path); },
        get: function () { return F.getDocs(c).then(adapterQuery); },
        onSnapshot: function (suivant, erreur) { return F.onSnapshot(c, function (q) { suivant(adapterQuery(q)); }, erreur); }
      };
    }
    return { doc: refDoc, collection: refCollection };
  }

  /* ======================== Données partagées ========================== */
  function abonner(cle, ref, suivant) {
    if (abonnements.has(cle)) return;
    var desabo = ref.onSnapshot(suivant, function (e) {
      abonnements.delete(cle);
      var code = e && e.code;
      if (code === 'permission-denied' || code === 'unauthenticated') { reverifierAcces(); return; }
      if (code === 'resource-exhausted') { toast('Limite gratuite de Firebase atteinte : la mise à jour en direct reprendra demain.', 'erreur'); return; }
      setTimeout(function () { if (S.etat === 'ok') { abonnerBase(); synchroAbonnements(); } }, 4000 + Math.random() * 3000);
    });
    abonnements.set(cle, desabo);
  }
  function arreterAbonnements() {
    abonnements.forEach(function (f) { try { f(); } catch (e) { /* déjà fermé */ } });
    abonnements.clear();
  }
  function abonnerBase() {
    abonner('installations', S.db.collection('installations'), function (snap) {
      S.installations = enMap(snap);
      S.installations.forEach(function (_, id) { S.vues.add(id); });
      if (S.creation && S.installations.has(S.creation)) S.creation = null;
      S.instPret = true;
      synchroAbonnements();
      planifierRendu();
    });
    abonner('equipe', S.db.collection('equipe'), function (snap) {
      S.equipe = enMap(snap);
      if (!snap.metadata || !snap.metadata.fromCache) S.equipePret = true;
      proposerProfil();
      planifierRendu();
    });
    /* ma propre fiche d'accès : rôle à jour, et retrait détecté aussitôt */
    abonner('ma-fiche', S.db.doc('membres/' + S.email), function (s) {
      if (s.exists) {
        var r = s.data().role === 'admin' ? 'admin' : 'membre';
        if (r !== S.role) { S.role = r; ecrireLocal('cp_role', r); planifierRendu(); }
      } else if (!s.metadata || !s.metadata.fromCache) reverifierAcces();
    });
  }
  /* Abonnements aux tâches et blocages : les installations actives (pour les
     compteurs de l'accueil) et celle qui est ouverte. On ne s'abonne que
     quand l'ensemble change réellement, jamais au rendu. */
  function synchroAbonnements() {
    if (!S.db || S.etat !== 'ok') return;
    var voulu = new Set();
    var actives = [];
    S.installations.forEach(function (d, id) { if (d.statut !== 'CLOTURE' && d.statut !== 'RECEPTIONNE') actives.push({ id: id, le: d.creeLe || 0 }); });
    actives.sort(function (a, b) { return b.le - a.le; }).slice(0, 26).forEach(function (x) { voulu.add(x.id); });
    var ouverte = S.nav.ecran === 'installation' && S.installations.has(S.nav.iid) ? S.nav.iid : null;
    if (ouverte) voulu.add(ouverte);
    voulu.forEach(function (id) {
      abonner('t:' + id, S.db.collection('installations/' + id + '/taches'), function (snap) { S.taches.set(id, enMap(snap)); planifierRendu(); });
      abonner('b:' + id, S.db.collection('installations/' + id + '/blocages'), function (snap) { S.blocages.set(id, enMap(snap)); planifierRendu(); });
    });
    Array.from(abonnements.keys()).forEach(function (cle) {
      var m = /^([tbj]):(.+)$/.exec(cle);
      if (!m) return;
      var garder = m[1] === 'j' ? m[2] === ouverte : voulu.has(m[2]);
      if (!garder) {
        try { abonnements.get(cle)(); } catch (e) { /* déjà fermé */ }
        abonnements.delete(cle);
        (m[1] === 't' ? S.taches : m[1] === 'b' ? S.blocages : S.jours).delete(m[2]);
      }
    });
    if (ouverte) {
      abonner('j:' + ouverte, S.db.collection('installations/' + ouverte + '/jours'), function (snap) { S.jours.set(ouverte, enMap(snap)); planifierRendu(); });
    }
  }

  /* Écritures : envoyées tout de suite, sans attendre l'accusé du serveur.
     Hors connexion, Firestore les garde en file et les envoie au retour du
     réseau ; l'écran, lui, est à jour immédiatement. */
  function ecrire(chemin, op) {
    if (!S.db) return Promise.reject({ code: 'unavailable' });
    var p;
    try { p = op(S.db.doc(chemin)); } catch (e) { p = Promise.reject(e); }
    return Promise.resolve(p).catch(function (e) { erreurEcriture(e); throw e; });
  }
  function maj(chemin, data) { return ecrire(chemin, function (ref) { return ref.update(data); }); }
  function poser(chemin, data) { return ecrire(chemin, function (ref) { return ref.set(data); }); }
  function fusionner(chemin, data) { return ecrire(chemin, function (ref) { return ref.set(data, { merge: true }); }); }
  function supprimer(chemin) { return ecrire(chemin, function (ref) { return ref.delete(); }); }
  function silence() { /* l'erreur est déjà signalée */ }
  function erreurEcriture(e) {
    var code = e && e.code;
    if (code === 'permission-denied' || code === 'unauthenticated') {
      toast('Modification refusée : votre accès a peut-être changé.', 'erreur');
      reverifierAcces();
      return;
    }
    if (code === 'not-found') { toast('Cet élément a été supprimé entre-temps.', 'erreur'); return; }
    if (code === 'resource-exhausted') { toast('Limite gratuite de Firebase atteinte pour aujourd\'hui : réessayez demain.', 'erreur'); return; }
    if (code === 'invalid-argument') { toast('Enregistrement refusé : la donnée est invalide.', 'erreur'); return; }
    toast('Enregistrement impossible pour l\'instant (' + (code || 'erreur') + '). Réessayez.', 'erreur');
  }

  /* ============================== Actions ============================== */
  function creerTaches(iid, libelles, jour, metierForce) {
    var base = Date.now();
    libelles.forEach(function (lib, i) {
      var ref = S.db.collection('installations/' + iid + '/taches').doc();
      poser(ref.path, {
        libelle: lib, jour: jour || null, etat: 'A_FAIRE',
        metier: metierForce === 'auto' ? metierCatalogue(lib) : (metierForce || ''),
        note: '', ordre: base + i, creePar: S.moi || null, creeLe: base + i
      }).catch(silence);
    });
    return libelles.length;
  }
  function ajouterCatalogue(iid, phase) {
    var existants = new Set((tachesDe(iid) || []).map(function (t) { return normaliser(t.libelle); }));
    var libs = (CATALOGUE[phase] || []).map(function (x) { return x[0]; }).filter(function (l) { return !existants.has(normaliser(l)); });
    return creerTaches(iid, libs, null, 'auto');
  }
  function cocher(iid, tid) {
    if (!peutModifier()) return;
    var t = S.taches.get(iid) && S.taches.get(iid).get(tid);
    if (!t) return;
    var avant = { etat: t.etat || 'A_FAIRE', faitPar: t.faitPar || null, faitLe: t.faitLe || null };
    var now = Date.now();
    var apres = avant.etat === 'FAIT'
      ? { etat: t.enCoursPar ? 'EN_COURS' : 'A_FAIRE', faitPar: null, faitLe: null }
      : { etat: 'FAIT', faitPar: S.moi || null, faitLe: now };
    var chemin = cheminTache(iid, tid);
    maj(chemin, Object.assign({}, apres, { modifPar: S.moi || null, modifLe: now })).catch(silence);
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* sans vibreur */ }
    toast((apres.etat === 'FAIT' ? 'Cochée : ' : 'Décochée : ') + tronquer(t.libelle, 38), apres.etat === 'FAIT' ? 'ok' : '', {
      libelle: 'Annuler',
      fn: function () { maj(chemin, Object.assign({}, avant, { modifPar: S.moi || null, modifLe: Date.now() })).catch(silence); }
    });
  }
  function planifierTache(iid, tid, jour) {
    if (!peutModifier()) return;
    maj(cheminTache(iid, tid), { jour: jour, modifPar: S.moi || null, modifLe: Date.now() }).catch(silence);
    toast('Prévue ' + relatifJour(jour));
  }

  /* ============================ Navigation ============================= */
  function sauverNav() { ecrireLocal('cp_nav', JSON.stringify({ ecran: S.nav.ecran, iid: S.nav.iid, onglet: S.nav.onglet })); }
  function ouvrirInstallation(iid, onglet) {
    S.nav.ecran = 'installation'; S.nav.iid = iid; S.nav.onglet = onglet || 'journee'; S.nav.jour = aujourdhui();
    S.nav.voirFil = false; S.nav.voirFaites = false; S.nav.filtreBlocages = 'OUVERT';
    ecrireLocal('cp_derniere', iid);
    sauverNav(); synchroAbonnements(); rendre(); window.scrollTo(0, 0);
  }
  function allerAccueil() {
    S.nav.ecran = 'accueil'; S.nav.iid = null;
    sauverNav(); synchroAbonnements(); rendre(); window.scrollTo(0, 0);
  }

  /* ============================== Rendu ================================ */
  var renduPrevu = false;
  function planifierRendu() {
    if (renduPrevu) return;
    renduPrevu = true;
    var f = window.requestAnimationFrame || function (cb) { return setTimeout(cb, 16); };
    f(function () { renduPrevu = false; rendre(); });
  }
  function rendre() {
    var n = S.nav;
    if (S.etat === 'ok' && n.ecran === 'installation' && S.instPret && !S.installations.has(n.iid) && n.iid !== S.creation) {
      var connue = S.vues.has(n.iid);
      n.ecran = 'accueil'; n.iid = null; sauverNav(); synchroAbonnements();
      if (connue) toast('Cette installation a été supprimée.');
    }
    document.getElementById('topbar').innerHTML = vueBandeau();
    var ong = document.getElementById('onglets');
    if (S.etat === 'ok' && n.ecran === 'installation' && S.installations.has(n.iid)) { ong.hidden = false; ong.innerHTML = vueOnglets(); }
    else { ong.hidden = true; ong.innerHTML = ''; }
    document.getElementById('contenu').innerHTML = vueContenu();
    var bas = S.etat === 'ok' ? vueBarreBas() : '';
    var bb = document.getElementById('barre-bas');
    bb.hidden = !bas; bb.innerHTML = bas;
    document.getElementById('app').classList.toggle('sans-barre', !bas);
    if (feuille && feuille.o.rafraichir) feuille.o.rafraichir(feuille);
  }
  function barre(pct) { return '<div class="barre" role="presentation"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div>'; }
  function tag(cls, texte, ico) { return '<span class="tag tag-' + cls + '">' + (ico || '') + esc(texte) + '</span>'; }

  function vueBandeau() {
    var n = S.nav;
    var menu = S.etat === 'ok' ? '<button class="iconbtn" data-action="menu" aria-label="Menu">' + ICO.menu(22) + '</button>' : '';
    if (S.etat === 'ok' && n.ecran === 'installation' && S.installations.has(n.iid)) {
      var i = S.installations.get(n.iid), ph = parId(PHASES, i.phase);
      var sous = [i.affaire, i.client, ph && ph.court].filter(Boolean).join(' · ');
      return '<div class="topbar-gauche"><button class="iconbtn" data-action="retour" aria-label="Retour aux installations">' + ICO.retour(20) + '</button>' +
        '<div><div class="topbar-titre">' + esc(i.titre || 'Installation') + '</div>' + (sous ? '<div class="topbar-sous">' + esc(sous) + '</div>' : '') + '</div></div>' + menu;
    }
    return '<div class="topbar-gauche"><span class="marque-pastille">' + ICO.liste(20) + '</span>' +
      '<div><div class="topbar-titre">Chantier partagé</div><div class="topbar-sous">Installation · mise en route · accompagnement</div></div></div>' + menu;
  }
  function vueOnglets() {
    var iid = S.nav.iid, bl = blocagesDe(iid);
    var nb = bl ? blocagesOuverts(bl).length : 0;
    var defs = [['journee', 'Journée'], ['blocages', 'Blocages'], ['taches', 'Tâches'], ['fiche', 'Fiche']];
    return defs.map(function (d) {
      var actif = S.nav.onglet === d[0];
      return '<button class="onglet' + (actif ? ' actif' : '') + '" data-action="onglet" data-onglet="' + d[0] + '"' + (actif ? ' aria-current="page"' : '') + '>' + d[1] +
        (d[0] === 'blocages' && nb ? '<span class="compte">' + nb + '</span>' : '') + '</button>';
    }).join('');
  }
  function vueContenu() {
    switch (S.etat) {
      case 'demarrage': return '<section class="carte"><p class="vide-texte">Ouverture de l\'application…</p></section>';
      case 'acces': return '<section class="carte auth"><p class="vide-texte">Vérification de votre accès…</p></section>';
      case 'config': return messagePlein('Configuration Firebase à compléter',
        'Le fichier config-firebase.js contient encore les valeurs d\'exemple. Recopiez-y la configuration de votre projet Firebase (README, étape 4), publiez, puis rechargez la page.');
      case 'cdn': return messagePlein('Firebase n\'a pas pu être chargé',
        'La toute première ouverture a besoin d\'internet pour télécharger Firebase. Vérifiez la connexion, puis rechargez la page.') +
        '<button class="btn p" data-action="recharger" style="width:100%">' + ICO.refaire(18) + 'Recharger</button>';
      case 'connexion': return vueConnexion();
      case 'creation': return vueCreation();
      case 'verification': return vueVerification();
      case 'refuse': return vueRefuse();
      case 'erreur': return messagePlein('Accès impossible pour l\'instant',
        'La vérification de votre accès a échoué (' + (S.erreurCode || 'erreur inconnue') + '). Vérifiez la connexion internet, puis réessayez.') +
        '<div class="boutons-ligne"><button class="btn p" data-action="reessayer">' + ICO.refaire(18) + 'Réessayer</button><button class="btn s" data-action="deconnexion">' + ICO.sortie(18) + 'Se déconnecter</button></div>';
    }
    if (S.nav.ecran === 'installation') {
      if (S.installations.has(S.nav.iid)) return vueInstallation(Object.assign({ id: S.nav.iid }, S.installations.get(S.nav.iid)));
      if (S.nav.iid && (S.nav.iid === S.creation || !S.instPret)) return chargement();
    }
    return vueAccueil();
  }
  function messagePlein(titre, texte) {
    return '<section class="carte accueil-vide"><h2>' + esc(titre) + '</h2><p>' + esc(texte) + '</p></section>';
  }
  function vueDroits() {
    if (S.etat !== 'ok' || peutModifier()) return '';
    return '<section class="carte info"><span class="ico-texte gras">' + ICO.verrou(16) + 'Lecture seule</span><p style="margin-top:4px">Vos dernières modifications ont été refusées. Votre accès a peut-être été retiré : vérifiez auprès de l\'administrateur de l\'appli.</p></section>';
  }

  /* ---------------------------- Connexion ------------------------------ */
  function vueConnexion() {
    return '<form class="carte auth" data-form="connexion" novalidate><h2>Connexion</h2>' +
      '<p>Utilisez l\'adresse e-mail que l\'administrateur de l\'appli a autorisée.</p>' +
      champ('Adresse e-mail', '<input id="a-email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" value="' + esc(S.emailSaisi) + '">') +
      champ('Mot de passe', '<input id="a-mdp" type="password" autocomplete="current-password">') +
      '<p class="auth-erreur" id="auth-erreur" role="alert"></p>' +
      '<button type="submit" class="btn p" id="auth-valider">Se connecter</button>' +
      '<div class="auth-liens"><button type="button" class="lien" data-action="aller-creation">Créer mon compte</button>' +
      '<button type="button" class="lien" data-action="mdp-oublie">Mot de passe oublié ?</button></div></form>' +
      '<p class="auth-note">Première fois ? Touchez « Créer mon compte » avec l\'adresse autorisée.</p>';
  }
  function vueCreation() {
    return '<form class="carte auth" data-form="creation" novalidate><h2>Créer mon compte</h2>' +
      '<p>Avec l\'adresse autorisée par l\'administrateur. Choisissez un mot de passe propre à cette appli, de 8 caractères au moins.</p>' +
      champ('Adresse e-mail', '<input id="c-email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" value="' + esc(S.emailSaisi) + '">') +
      champ('Mot de passe', '<input id="c-mdp" type="password" autocomplete="new-password" minlength="8">') +
      champ('Confirmer le mot de passe', '<input id="c-mdp2" type="password" autocomplete="new-password" minlength="8">') +
      '<p class="auth-erreur" id="auth-erreur" role="alert"></p>' +
      '<button type="submit" class="btn p" id="auth-valider">Créer le compte</button>' +
      '<div class="auth-liens"><button type="button" class="lien" data-action="aller-connexion">J\'ai déjà un compte</button></div></form>';
  }
  function vueVerification() {
    var email = (S.utilisateur && S.utilisateur.email) || '';
    return '<section class="carte auth"><h2>Validez votre adresse</h2>' +
      '<p>Un e-mail de confirmation a été envoyé à <span class="auth-adresse">' + esc(email) + '</span>. Ouvrez le lien qu\'il contient (pensez aux courriers indésirables), puis revenez ici.</p>' +
      '<p class="auth-erreur" id="auth-erreur" role="alert"></p>' +
      '<button type="button" class="btn p" data-action="verifie" id="auth-valider">' + ICO.valide(18) + 'J\'ai validé mon adresse</button>' +
      '<button type="button" class="btn s" data-action="renvoyer">' + ICO.courriel(18) + 'Renvoyer l\'e-mail</button>' +
      '<div class="auth-liens"><button type="button" class="lien" data-action="deconnexion">Utiliser une autre adresse</button></div></section>';
  }
  function vueRefuse() {
    var email = (S.utilisateur && S.utilisateur.email) || '';
    return '<section class="carte auth"><h2>Accès en attente</h2>' +
      '<p>Votre compte <span class="auth-adresse">' + esc(email) + '</span> est prêt, mais cette adresse n\'est pas encore autorisée. Demandez à l\'administrateur de l\'appli de l\'ajouter (Menu, Accès à l\'appli), puis touchez « Réessayer ».</p>' +
      '<button type="button" class="btn p" data-action="reessayer">' + ICO.refaire(18) + 'Réessayer</button>' +
      '<button type="button" class="btn s" data-action="deconnexion">' + ICO.sortie(18) + 'Se déconnecter</button></section>';
  }
  function erreurAuth(msg) { var el = document.getElementById('auth-erreur'); if (el) el.textContent = msg; else toast(msg, 'erreur'); }
  function boutonAuth(occupe, texte) {
    var b = document.getElementById('auth-valider');
    if (!b) return;
    if (occupe) { b.dataset.texte = b.innerHTML; b.disabled = true; b.textContent = texte; }
    else { b.disabled = false; if (b.dataset.texte) b.innerHTML = b.dataset.texte; }
  }
  function messageAuth(e) {
    var code = (e && e.code) || '';
    var M = {
      'auth/invalid-credential': 'Adresse ou mot de passe incorrect.',
      'auth/wrong-password': 'Adresse ou mot de passe incorrect.',
      'auth/user-not-found': 'Adresse ou mot de passe incorrect.',
      'auth/invalid-email': 'Cette adresse e-mail n\'est pas valide.',
      'auth/missing-password': 'Saisissez votre mot de passe.',
      'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse : connectez-vous, ou utilisez « Mot de passe oublié ».',
      'auth/weak-password': 'Mot de passe trop faible : 8 caractères au moins.',
      'auth/password-does-not-meet-requirements': 'Ce mot de passe ne respecte pas les exigences fixées dans Firebase.',
      'auth/too-many-requests': 'Trop de tentatives : patientez quelques minutes, puis réessayez.',
      'auth/network-request-failed': 'Pas de réseau : la connexion a besoin d\'internet.',
      'auth/operation-not-allowed': 'La connexion par e-mail n\'est pas activée dans Firebase (README, étape 2).',
      'auth/user-disabled': 'Ce compte a été désactivé dans Firebase.'
    };
    return M[code] || ('Opération impossible (' + (code || 'erreur inconnue') + ').');
  }
  function reglagesLien() { return { url: lienAppli() }; }
  function envoyerVerification(u) {
    var A = S.fb.auth;
    return A.sendEmailVerification(u, reglagesLien()).catch(function (e) {
      /* domaine pas encore autorisé dans Firebase : on envoie sans lien de retour */
      if (e && /continue-uri|unauthorized-domain/.test(e.code || '')) return A.sendEmailVerification(u);
      throw e;
    });
  }
  function soumettreConnexion() {
    var email = (document.getElementById('a-email').value || '').trim();
    var mdp = document.getElementById('a-mdp').value || '';
    S.emailSaisi = email;
    if (!adresseValide(email)) { erreurAuth('Saisissez une adresse e-mail valide.'); return; }
    if (!mdp) { erreurAuth('Saisissez votre mot de passe.'); return; }
    boutonAuth(true, 'Connexion…');
    S.fb.auth.signInWithEmailAndPassword(S.auth, email, mdp).catch(function (e) { boutonAuth(false); erreurAuth(messageAuth(e)); });
  }
  function soumettreCreation() {
    var email = (document.getElementById('c-email').value || '').trim();
    var mdp = document.getElementById('c-mdp').value || '';
    var mdp2 = document.getElementById('c-mdp2').value || '';
    S.emailSaisi = email;
    if (!adresseValide(email)) { erreurAuth('Saisissez une adresse e-mail valide.'); return; }
    if (mdp.length < 8) { erreurAuth('Le mot de passe doit faire 8 caractères au moins.'); return; }
    if (mdp !== mdp2) { erreurAuth('Les deux mots de passe ne sont pas identiques.'); return; }
    boutonAuth(true, 'Création…');
    S.fb.auth.createUserWithEmailAndPassword(S.auth, email, mdp)
      .then(function (cred) { return envoyerVerification(cred.user).catch(function () { /* renvoi possible depuis l'écran suivant */ }); })
      .catch(function (e) { boutonAuth(false); erreurAuth(messageAuth(e)); });
  }
  function motDePasseOublie() {
    var champEmail = document.getElementById('a-email');
    var email = ((champEmail && champEmail.value) || S.emailSaisi || '').trim();
    if (!adresseValide(email)) { erreurAuth('Saisissez d\'abord votre adresse e-mail, puis touchez « Mot de passe oublié ».'); return; }
    S.fb.auth.sendPasswordResetEmail(S.auth, email, reglagesLien())
      .catch(function (e) { if (e && /continue-uri|unauthorized-domain/.test(e.code || '')) return S.fb.auth.sendPasswordResetEmail(S.auth, email); throw e; })
      .then(function () { toast('Si un compte existe pour cette adresse, un e-mail de réinitialisation vient de partir.', 'ok'); },
        function (e) { erreurAuth(messageAuth(e)); });
  }
  function jaiValide() {
    var u = S.auth.currentUser;
    if (!u) return;
    boutonAuth(true, 'Vérification…');
    S.fb.auth.reload(u).then(function () { return u.getIdToken(true); }).then(function () {
      var cur = S.auth.currentUser;
      if (cur && cur.emailVerified) { S.utilisateur = cur; verifierAcces(); }
      else { boutonAuth(false); erreurAuth('L\'adresse n\'est pas encore validée : ouvrez le lien reçu par e-mail, puis réessayez.'); }
    }, function (e) { boutonAuth(false); erreurAuth(messageAuth(e)); });
  }
  function deconnexion() {
    effacerLocal('cp_acces'); effacerLocal('cp_role');
    fermerFeuille(true);
    S.fb.auth.signOut(S.auth).catch(function () { /* rien */ });
  }

  /* Accès : la fiche membres/{adresse} existe → membre. Le propriétaire
     désigné dans les règles crée sa propre fiche (administrateur) à sa
     première connexion. Sinon, la lecture est refusée → accès en attente. */
  var minuteurAcces = null;
  function reverifierAcces() {
    if (S.etat !== 'ok') return;
    clearTimeout(minuteurAcces);
    minuteurAcces = setTimeout(function () { if (S.etat === 'ok') verifierAcces(); }, 600);
  }
  function verifierAcces() {
    arreterAbonnements();
    S.etat = 'acces'; rendre();
    var ref = S.db.doc('membres/' + S.email);
    ref.get().then(function (s) {
      if (s.exists) { S.role = s.data().role === 'admin' ? 'admin' : 'membre'; return null; }
      var creation = ref.set({ role: 'admin', ajoutePar: S.moi, ajouteLe: Date.now(), proprietaire: true });
      /* hors connexion, l'accusé du serveur peut tarder : on n'attend pas plus de 8 s */
      return Promise.race([creation, new Promise(function (r) { setTimeout(r, 8000); })]).then(function () { S.role = 'admin'; });
    }).then(function () {
      ecrireLocal('cp_acces', S.email);
      entrer();
    }, function (e) {
      var code = (e && e.code) || '';
      if (code === 'permission-denied') { S.etat = 'refuse'; rendre(); return; }
      if ((code === 'unavailable' || code === 'failed-precondition') && lireLocal('cp_acces') === S.email) {
        S.role = lireLocal('cp_role') || 'membre'; entrer(); return;
      }
      S.erreurCode = code; S.etat = 'erreur'; rendre();
    });
  }
  function entrer() {
    ecrireLocal('cp_role', S.role || 'membre');
    S.etat = 'ok'; S.lectureSeule = false;
    abonnerBase();
    synchroAbonnements();
    rendre();
  }
  function surUtilisateur(u) {
    arreterAbonnements();
    fermerFeuille(true);
    S.utilisateur = u;
    S.installations = new Map(); S.instPret = false; S.equipe = new Map(); S.equipePret = false;
    S.taches = new Map(); S.blocages = new Map(); S.jours = new Map(); S.membres = new Map();
    S.role = null; S.profilPropose = false; S.lectureSeule = false;
    if (!u) {
      S.moi = null; S.email = '';
      /* téléphone partagé : la personne suivante repart de l'accueil */
      S.nav.ecran = 'accueil'; S.nav.iid = null; sauverNav();
      S.etat = S.etat === 'creation' ? 'creation' : 'connexion';
      rendre();
      return;
    }
    S.moi = u.uid; S.email = String(u.email || '').toLowerCase();
    if (!u.emailVerified) { S.etat = 'verification'; rendre(); return; }
    verifierAcces();
  }

  /* ------------------------------ Accueil ------------------------------ */
  function besoinProfil() { return peutModifier() && !!S.moi && S.equipePret && !S.equipe.has(S.moi); }
  function proposerProfil() {
    if (S.profilPropose || !besoinProfil() || feuille) return;
    if (lireLocal('cp_profil_propose') === S.moi) return;
    S.profilPropose = true;
    ecrireLocal('cp_profil_propose', S.moi);
    setTimeout(function () { if (!feuille && besoinProfil()) feuilleProfil(true); }, 700);
  }
  function statsInstallation(iid, auj) {
    var t = tachesDe(iid), b = blocagesDe(iid);
    if (!t || !b) return { charge: false };
    var av = avancement(t), vj = vueJour(t, auj, auj), ouv = blocagesOuverts(b);
    return { charge: true, pct: av.pct, total: av.total, faites: av.faites, jourTotal: vj.total, jourFaites: vj.faites,
      ouverts: ouv.length, graves: ouv.filter(function (x) { return +x.gravite === 1; }).length };
  }
  function vueAccueil() {
    var auj = aujourdhui();
    var h = '<div class="date-du-jour">' + esc(majuscule(dateLongue(auj))) + '</div>' + vueDroits();
    if (besoinProfil()) {
      h += '<button class="carte info" data-action="profil" style="width:100%;text-align:left;cursor:pointer"><span class="ico-texte gras">' + ICO.personne(16) + 'Présentez-vous à l\'équipe</span>' +
        '<span style="display:block;margin-top:3px">Indiquez votre prénom et votre métier : ils s\'afficheront à côté de ce que vous cochez.</span></button>';
    }
    if (!S.instPret) return h + '<section class="carte"><p class="vide-texte">Chargement des installations…</p></section>';
    var insts = liste(S.installations);
    if (!insts.length) return h + vueAccueilVide();

    var derniere = lireLocal('cp_derniere');
    var reprise = insts.filter(function (i) { return i.id === derniere && i.statut !== 'CLOTURE'; })[0];
    if (reprise) {
      var st = statsInstallation(reprise.id, auj);
      var detail = st.charge ? (st.jourTotal ? st.jourFaites + ' / ' + st.jourTotal + ' tâches faites aujourd\'hui' : 'Rien de planifié aujourd\'hui') : '';
      h += '<button class="gros-bouton" data-action="ouvrir" data-iid="' + esc(reprise.id) + '"><span class="rond">' + ICO.lecture(18) + '</span>' +
        '<span>OUVRIR LA JOURNÉE<small>' + esc(reprise.titre || 'Installation') + (detail ? ' · ' + esc(detail) : '') + '</small></span></button>';
    }
    var groupes = [
      ['En cours', insts.filter(function (i) { return ['EN_COURS', 'ATTENTE', 'SUSPENDU'].indexOf(i.statut) !== -1; }).sort(function (a, b) { return (b.creeLe || 0) - (a.creeLe || 0); })],
      ['Prévues', insts.filter(function (i) { return !i.statut || i.statut === 'PREVU'; }).sort(function (a, b) { return (a.debut || '9') < (b.debut || '9') ? -1 : 1; })]
    ];
    groupes.forEach(function (g) {
      if (!g[1].length) return;
      h += '<h2 class="rubrique">' + g[0] + ' (' + g[1].length + ')</h2>' + g[1].map(function (i) { return carteInstallation(i, auj); }).join('');
    });
    var finies = insts.filter(function (i) { return i.statut === 'RECEPTIONNE' || i.statut === 'CLOTURE'; });
    if (finies.length) {
      h += '<button class="lien" data-action="voir-terminees">' + (S.nav.voirTerminees ? ICO.precedent(16) : ICO.suivant(16)) + (S.nav.voirTerminees ? 'Masquer' : 'Afficher') + ' les terminées (' + finies.length + ')</button>';
      if (S.nav.voirTerminees) h += '<h2 class="rubrique">Terminées (' + finies.length + ')</h2>' + finies.map(function (i) { return carteInstallation(i, auj); }).join('');
    }
    return h;
  }
  function vueAccueilVide() {
    return '<section class="carte accueil-vide"><h2>Aucune installation pour l\'instant</h2>' +
      '<p>Créez la première : toute l\'équipe la verra aussitôt, cochera les tâches au fil de la journée et signalera ce qui bloque.</p>' +
      '<ol class="etapes">' +
      '<li><span><b>Créez l\'installation.</b> Client, machine, phase : les tâches types de la phase sont proposées.</span></li>' +
      '<li><span><b>Chaque matin, planifiez la journée.</b> Les tâches non faites la veille remontent toutes seules.</span></li>' +
      '<li><span><b>Cochez au fil de l\'eau.</b> Chacun voit en direct qui a fait quoi, et à quelle heure.</span></li>' +
      '<li><span><b>Signalez les points bloquants.</b> Gravité, qui peut débloquer, échéance, suivi.</span></li>' +
      '</ol>' + (peutModifier() ? '<button class="btn p" data-action="nouvelle-installation">' + ICO.plus(18) + 'Nouvelle installation</button>' : '') + '</section>';
  }
  function carteInstallation(i, auj) {
    var st = statsInstallation(i.id, auj);
    var statut = parId(STATUTS, i.statut) || STATUTS[0];
    var ph = parId(PHASES, i.phase);
    var num = libelleNumero(i, auj);
    var meta = [i.affaire, i.lieu, ph && ph.court, num || (i.debut && i.debut > auj ? 'début ' + dateCourte(i.debut) : '')].filter(Boolean);
    var h = '<button class="carte carte-inst" data-action="ouvrir" data-iid="' + esc(i.id) + '">';
    h += '<span class="ligne"><span class="inst-titre">' + esc(i.titre || 'Sans nom') + '</span>' + tag(statut.cls, statut.libelle) + '</span>';
    if (meta.length) h += '<span class="petit inst-meta">' + esc(meta.join(' · ')) + '</span>';
    if (st.charge && !st.total) {
      h += '<span class="mini" style="display:block;margin-top:8px">Aucune tâche pour l\'instant' + (st.ouverts ? ' · ' + pluriel(st.ouverts, 'blocage ouvert', 'blocages ouverts') : '') + '</span>';
    } else if (st.charge) {
      h += barre(st.pct);
      h += '<span class="inst-stats"><span class="ico-texte">' + ICO.avancement(16) + st.pct + ' %</span>' +
        '<span class="ico-texte">' + ICO.valide(16) + (st.jourTotal ? st.jourFaites + ' / ' + st.jourTotal + ' aujourd\'hui' : 'rien aujourd\'hui') + '</span>' +
        (st.ouverts ? '<span class="ico-texte ' + (st.graves ? 'rouge' : 'attention') + '">' + ICO.interdit(16) + pluriel(st.ouverts, 'blocage') + '</span>' : '<span class="ico-texte">' + ICO.valideCercle(16) + 'aucun blocage</span>') + '</span>';
    } else if (i.statut !== 'CLOTURE' && i.statut !== 'RECEPTIONNE') {
      h += '<span class="mini" style="display:block;margin-top:8px">Chargement…</span>';
    }
    return h + '</button>';
  }

  /* --------------------------- Installation ---------------------------- */
  function vueInstallation(inst) {
    var o = S.nav.onglet;
    if (o === 'blocages') return vueBlocages(inst);
    if (o === 'taches') return vueTaches(inst);
    if (o === 'fiche') return vueFiche(inst);
    return vueJournee(inst);
  }
  function chargement() { return '<section class="carte"><p class="vide-texte">Chargement…</p></section>'; }

  function ligneTache(t, o) {
    var bl = (o.bloq && o.bloq.get(t.id)) || [];
    var etat = t.etat || 'A_FAIRE';
    var icone = etat === 'FAIT' ? ICO.valide(20) : etat === 'EN_COURS' ? ICO.demi(18) : '';
    var aria = (etat === 'FAIT' ? 'Décocher : ' : 'Cocher : ') + t.libelle;
    var caseEtat = peutModifier()
      ? '<button class="case-etat" data-action="cocher" data-tid="' + esc(t.id) + '" aria-label="' + esc(aria) + '" aria-pressed="' + (etat === 'FAIT') + '">' + icone + '</button>'
      : '<span class="case-etat" aria-hidden="true">' + icone + '</span>';
    var sous = [];
    var m = parId(METIERS, t.metier);
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
    var rapide = o.rapide && peutModifier() ? '<button class="mini-btn tache-rapide" data-action="planifier-vite" data-tid="' + esc(t.id) + '">Aujourd\'hui</button>' : '';
    return '<div class="tache etat-' + etat + (bl.length ? ' bloquee' : '') + '">' + caseEtat +
      '<button class="tache-corps" data-action="tache" data-tid="' + esc(t.id) + '"><span class="tache-lib">' + esc(t.libelle) + '</span>' +
      (sous.length ? '<span class="tache-sous">' + sous.join('') + '</span>' : '') + '</button>' + rapide + '</div>';
  }
  function ligneBlocage(b, tmap) {
    var g = parId(GRAVITES, +b.gravite) || GRAVITES[1];
    var leve = b.statut === 'LEVE';
    var auj = aujourdhui();
    var lignes = [];
    if (!leve) {
      var parts = [];
      var deb = libelleDe(DEBLOQUEURS, b.debloqueur);
      if (deb) parts.push('Attend : ' + esc(deb));
      if (b.echeance) parts.push('<span class="' + (b.echeance < auj ? 'rouge gras' : '') + '">échéance ' + esc(relatifJour(b.echeance)) + '</span>');
      if (parts.length) lignes.push('<span class="petit">' + parts.join(' · ') + '</span>');
    } else {
      lignes.push('<span class="petit vert">Levé par ' + esc(nomDe(b.levePar)) + ' · ' + esc(quandCourt(b.leveLe)) + '</span>');
    }
    var t = b.tache && tmap && tmap.get(b.tache);
    if (t) lignes.push('<span class="petit">Tâche : ' + esc(tronquer(t.libelle, 70)) + '</span>');
    var nbSuivi = Object.keys(b.suivi || {}).length;
    lignes.push('<span class="mini">Signalé par ' + esc(nomDe(b.ouvertPar)) + ' · ' + esc(quandCourt(b.ouvertLe)) +
      (!leve && b.ouvertLe ? ' · depuis ' + depuis(b.ouvertLe) : '') + (nbSuivi ? ' · ' + pluriel(nbSuivi, 'suivi') : '') + '</span>');
    return '<button class="blocage g' + g.id + (leve ? ' leve' : '') + '" data-action="blocage" data-bid="' + esc(b.id) + '">' +
      '<span class="blocage-ico">' + (leve ? ICO.valideCercle(20) : ICO.interdit(20)) + '</span>' +
      '<span class="blocage-texte"><span class="blocage-desc">' + esc(b.description) + '</span>' + lignes.join('') + '</span>' +
      tag(leve ? 'ok' : g.cls, leve ? 'Levé' : g.court) + '</button>';
  }

  function vueJournee(inst) {
    var auj = aujourdhui(), D = S.nav.jour || auj;
    var taches = tachesDe(inst.id), blocs = blocagesDe(inst.id);
    if (!taches || !blocs) return vueDroits() + chargement();
    var vj = vueJour(taches, D, auj);
    var jd = jourDoc(inst.id, D);
    var fil = filJour(taches, blocs, jd, D);
    var bloq = blocagesParTache(blocs);
    var tmap = new Map(taches.map(function (t) { return [t.id, t]; }));
    var aPlanifier = taches.filter(function (t) { return !t.jour && t.etat !== 'FAIT'; }).length;
    var ecr = peutModifier();
    var h = vueDroits();

    /* bandeau de la journée */
    var rel = relatifJour(D);
    var sous = [rel === "aujourd'hui" || rel === 'hier' || rel === 'demain' ? majuscule(rel) : '', libelleNumero(inst, D) || (estWeekend(D) ? 'Week-end' : '')].filter(Boolean).join(' · ');
    h += '<section class="jour-bloc" aria-label="Journée affichée"><div class="jour-nav">' +
      '<button class="iconbtn" data-action="jour-prec" aria-label="Jour précédent">' + ICO.precedent(20) + '</button>' +
      '<div class="jour-titre">' + esc(dateJour(D)) + (sous ? '<small>' + esc(sous) + '</small>' : '') + '</div>' +
      '<button class="iconbtn" data-action="jour-suiv" aria-label="Jour suivant">' + ICO.suivant(20) + '</button></div>';
    var restant = vj.total - vj.faites;
    h += '<div class="jour-progres"><span class="jour-chiffre">' + vj.faites + '<small> / ' + vj.total + '</small></span><span class="jour-legende">' +
      (vj.total ? (restant ? pluriel(restant, 'tâche restante', 'tâches restantes') : 'Tout est fait') : 'Aucune tâche ce jour') + '</span></div>';
    h += barre(vj.total ? Math.round(100 * vj.faites / vj.total) : 0);
    var actifs = idsActifs(fil);
    if (actifs.length) h += '<div class="avec">' + actifs.slice(0, 6).map(initiales).join('') + '<span class="avec-noms">' + esc(actifs.map(nomDe).join(', ')) + '</span></div>';
    if (jd && jd.clotureLe) h += '<div class="cloture">' + ICO.verrou(15) + '<span>Journée clôturée par ' + esc(nomDe(jd.cloturePar)) + ' · ' + esc(quandCourt(jd.clotureLe)) + '</span></div>';
    if (D !== auj) h += '<button class="lien-clair" data-action="jour-auj">Revenir à aujourd\'hui</button>';
    h += '</section>';

    /* points bloquants ouverts, en tête */
    var ouverts = blocagesOuverts(blocs);
    if (ouverts.length && D >= auj) {
      var grave = ouverts.some(function (b) { return +b.gravite === 1; });
      h += '<section class="carte"><h2 class="carte-titre ' + (grave ? 'rouge' : 'attention') + '">' + ICO.interdit(18) + 'Points bloquants (' + ouverts.length + ')</h2><div class="liste-blocages">' +
        ouverts.slice(0, 4).map(function (b) { return ligneBlocage(b, tmap); }).join('') + '</div>' +
        (ouverts.length > 4 ? '<button class="lien" data-action="onglet" data-onglet="blocages">Voir les ' + ouverts.length + ' blocages ' + ICO.suivant(14) + '</button>' : '') + '</section>';
    }

    /* tâches du jour */
    var defaut = D >= auj ? D : auj;
    h += '<section class="carte"><h2 class="carte-titre">' + ICO.valideCercle(18) + 'Tâches du jour' +
      (ecr ? '<button class="mini-btn droite" data-action="nouvelles-taches" data-jour="' + defaut + '">' + ICO.plus(14) + 'Ajouter</button>' : '') + '</h2>';
    if (!vj.liste.length) {
      h += '<p class="vide-texte">' + (D < auj ? 'Aucune tâche prévue ni faite ce jour-là.' :
        'Rien de prévu ce jour. ' + (aPlanifier ? pluriel(aPlanifier, 'tâche attend', 'tâches attendent') + ' d\'être planifiée' + (aPlanifier > 1 ? 's' : '') + '.' : 'Ajoutez les tâches de la journée : chacun pourra les cocher.')) + '</p>';
      if (ecr && D >= auj) {
        h += '<div class="boutons-ligne">' + (aPlanifier ? '<button class="btn o sm" data-action="planifier" data-jour="' + D + '">' + ICO.liste(16) + 'Planifier (' + aPlanifier + ')</button>' : '') +
          '<button class="btn s sm" data-action="nouvelles-taches" data-jour="' + D + '">' + ICO.plus(16) + 'Nouvelles tâches</button></div>';
      }
    } else {
      h += '<div class="liste-taches">' + vj.liste.map(function (x) { return ligneTache(x.t, { D: D, auj: auj, bloq: bloq, avant: x.avant, motif: x.motif }); }).join('') + '</div>';
      if (ecr && D >= auj && aPlanifier) h += '<button class="lien" data-action="planifier" data-jour="' + D + '">' + ICO.liste(16) + 'Planifier parmi les tâches à planifier (' + aPlanifier + ')</button>';
    }
    h += '</section>';

    /* prévu le jour ouvré suivant */
    if (D >= auj) {
      var L = jourOuvreSuivant(D);
      if (taches.some(function (t) { return t.jour === ajouterJours(D, 1); })) L = ajouterJours(D, 1);
      var prevu = taches.filter(function (t) { return t.jour === L && t.etat !== 'FAIT'; }).sort(parOrdre);
      h += '<section class="carte"><h2 class="carte-titre">' + ICO.calendrier(18) + 'Prévu ' + esc(relatifJour(L)) +
        (ecr ? '<button class="mini-btn droite" data-action="nouvelles-taches" data-jour="' + L + '">' + ICO.plus(14) + 'Prévoir</button>' : '') + '</h2>';
      if (prevu.length) {
        h += prevu.slice(0, 8).map(function (t) {
          var m = parId(METIERS, t.metier);
          return '<button class="prevu-ligne" data-action="tache" data-tid="' + esc(t.id) + '">' + (m ? ICO[m.icone](16) : ICO.vide(16)) + '<span>' + esc(t.libelle) + '</span></button>';
        }).join('');
        if (prevu.length > 8) h += '<p class="mini">… et ' + (prevu.length - 8) + ' autres (onglet Tâches).</p>';
      } else {
        h += '<p class="vide-texte">Rien de planifié pour l\'instant. Préparez la suite pour que l\'équipe sache par quoi commencer.</p>';
        if (ecr && aPlanifier) h += '<button class="lien" data-action="planifier" data-jour="' + L + '">' + ICO.liste(16) + 'Planifier pour ' + esc(relatifJour(L)) + '</button>';
      }
      h += '</section>';
    }

    /* fil de la journée */
    h += '<section class="carte"><h2 class="carte-titre">' + ICO.horloge(18) + 'Fil de la journée</h2>';
    if (!fil.length) h += '<p class="vide-texte">' + (D > auj ? 'La journée n\'a pas encore commencé.' : 'Chaque tâche cochée, prise en charge ou signalée apparaîtra ici avec l\'heure et le prénom.') + '</p>';
    else {
      var montres = S.nav.voirFil ? fil : fil.slice(0, 8);
      h += montres.map(function (e) {
        return '<div class="fil-ligne"><span class="fil-heure">' + heure(e.le) + '</span><span class="fil-texte"><b>' + esc(majuscule(nomDe(e.par))) + '</b> ' + esc(e.texte) + '</span></div>';
      }).join('');
      if (fil.length > 8) h += '<button class="lien" data-action="voir-fil">' + (S.nav.voirFil ? 'Réduire' : 'Tout afficher (' + fil.length + ')') + '</button>';
    }
    h += '</section>';
    return h;
  }

  function vueBlocages(inst) {
    var blocs = blocagesDe(inst.id), taches = tachesDe(inst.id);
    if (!blocs || !taches) return vueDroits() + chargement();
    var tmap = new Map(taches.map(function (t) { return [t.id, t]; }));
    var ouverts = blocagesOuverts(blocs);
    var leves = blocs.filter(function (b) { return b.statut === 'LEVE'; }).sort(function (a, b) { return (b.leveLe || 0) - (a.leveLe || 0); });
    var f = S.nav.filtreBlocages;
    var h = vueDroits();
    h += '<div class="segment" role="tablist">' +
      '<button role="tab" aria-selected="' + (f === 'OUVERT') + '" class="' + (f === 'OUVERT' ? 'actif' : '') + '" data-action="filtre-blocages" data-filtre="OUVERT">Ouverts (' + ouverts.length + ')</button>' +
      '<button role="tab" aria-selected="' + (f === 'LEVE') + '" class="' + (f === 'LEVE' ? 'actif' : '') + '" data-action="filtre-blocages" data-filtre="LEVE">Levés (' + leves.length + ')</button></div>';
    var l = f === 'LEVE' ? leves : ouverts;
    if (!l.length) {
      h += '<section class="carte"><p class="vide-texte">' + (f === 'LEVE' ? 'Aucun blocage levé pour l\'instant.' :
        'Aucun point bloquant ouvert. Si quelque chose empêche ou ralentit l\'équipe, signalez-le : tout le monde le verra en tête de la journée.') + '</p></section>';
    } else {
      h += '<section class="carte"><div class="liste-blocages">' + l.map(function (b) { return ligneBlocage(b, tmap); }).join('') + '</div></section>';
    }
    if (f === 'OUVERT') h += '<p class="mini" style="padding:0 2px">Gravité 1 : bloque l\'équipe · 2 : ralentit · 3 : gêne. Les plus graves et les plus anciens sont en tête.</p>';
    return h;
  }

  function vueTaches(inst) {
    var taches = tachesDe(inst.id), blocs = blocagesDe(inst.id);
    if (!taches || !blocs) return vueDroits() + chargement();
    var auj = aujourdhui(), bloq = blocagesParTache(blocs), av = avancement(taches);
    var h = vueDroits();
    h += '<section class="carte"><div class="resume-ligne"><span class="gros-chiffre">' + av.pct + ' %</span><span class="petit">' + av.faites + ' / ' + av.total + ' tâches faites</span></div>' + barre(av.pct) +
      '<p class="mini">Avancement de l\'installation, toutes tâches confondues.</p></section>';
    if (!taches.length) {
      h += '<section class="carte"><p class="vide-texte">Aucune tâche. Ajoutez-les une par ligne, ou reprenez les tâches types de la phase.</p>' +
        (peutModifier() ? '<div class="boutons-ligne"><button class="btn o sm" data-action="taches-types">' + ICO.liste(16) + 'Tâches types de la phase</button><button class="btn s sm" data-action="nouvelles-taches" data-jour="">' + ICO.plus(16) + 'Nouvelles tâches</button></div>' : '') + '</section>';
      return h;
    }
    var pasFaites = taches.filter(function (t) { return t.etat !== 'FAIT'; });
    var sections = [
      ['En retard', pasFaites.filter(function (t) { return t.jour && t.jour < auj; }), true],
      ['À planifier', pasFaites.filter(function (t) { return !t.jour; }), true],
      ['Aujourd\'hui', pasFaites.filter(function (t) { return t.jour === auj; }), false]
    ];
    sections.forEach(function (s) {
      if (!s[1].length) return;
      s[1].sort(function (a, b) { return (a.jour || '') < (b.jour || '') ? -1 : (a.jour || '') > (b.jour || '') ? 1 : parOrdre(a, b); });
      h += '<h2 class="rubrique">' + s[0] + ' (' + s[1].length + ')</h2><section class="carte"><div class="liste-taches">' +
        s[1].map(function (t) { return ligneTache(t, { D: s[0] === 'Aujourd\'hui' ? auj : '', auj: auj, bloq: bloq, montrerDate: s[0] !== 'Aujourd\'hui', rapide: s[2] }); }).join('') + '</div></section>';
    });
    var futur = pasFaites.filter(function (t) { return t.jour && t.jour > auj; });
    if (futur.length) {
      var parJour = new Map();
      futur.sort(function (a, b) { return a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : parOrdre(a, b); }).forEach(function (t) { if (!parJour.has(t.jour)) parJour.set(t.jour, []); parJour.get(t.jour).push(t); });
      parJour.forEach(function (l, j) {
        h += '<h2 class="rubrique">' + esc(majuscule(relatifJour(j))) + ' (' + l.length + ')</h2><section class="carte"><div class="liste-taches">' +
          l.map(function (t) { return ligneTache(t, { D: j, auj: auj, bloq: bloq, montrerDate: true }); }).join('') + '</div></section>';
      });
    }
    var faites = taches.filter(function (t) { return t.etat === 'FAIT'; }).sort(function (a, b) { return (b.faitLe || 0) - (a.faitLe || 0); });
    if (faites.length) {
      h += '<button class="lien" data-action="voir-faites">' + (S.nav.voirFaites ? 'Masquer' : 'Afficher') + ' les tâches faites (' + faites.length + ')</button>';
      if (S.nav.voirFaites) h += '<section class="carte" style="margin-top:8px"><div class="liste-taches">' + faites.map(function (t) { return ligneTache(t, { D: '', auj: auj, bloq: bloq, montrerDate: false }); }).join('') + '</div></section>';
    }
    return h;
  }

  function vueFiche(inst) {
    var taches = tachesDe(inst.id) || [], blocs = blocagesDe(inst.id) || [];
    var auj = aujourdhui(), ph = parId(PHASES, inst.phase), suite = ph && parId(PHASES, ph.suite);
    var statut = parId(STATUTS, inst.statut) || STATUTS[0];
    var av = avancement(taches), ecr = peutModifier();
    var h = vueDroits();
    if (ph) {
      h += '<section class="carte"><div class="phase-tete">' + ICO[ph.icone](24) + '<span class="phase-nom">' + esc(ph.libelle) + '</span></div>' +
        '<p class="petit" style="margin-top:6px">' + esc(ph.equipe) + '</p><p style="margin-top:6px;font-size:14px">' + esc(ph.resume) + '</p>' +
        (ecr && suite ? '<div class="boutons-ligne"><button class="btn o sm" data-action="changer-phase">Passer en ' + esc(suite.court.toLowerCase()) + ' ' + ICO.suivant(16) + '</button></div>' : '') + '</section>';
    }
    var num = libelleNumero(inst, auj);
    h += '<section class="carte"><div class="ligne"><span class="petit">' + esc([inst.client, inst.lieu].filter(Boolean).join(' · ') || 'Client non renseigné') + '</span>' + tag(statut.cls, statut.libelle) + '</div>' +
      '<div class="resume-ligne" style="margin-top:6px"><span class="gros-chiffre">' + av.pct + ' %</span><span class="petit">' + av.faites + ' / ' + av.total + ' tâches · ' + pluriel(blocagesOuverts(blocs).length, 'blocage ouvert', 'blocages ouverts') + '</span></div>' +
      barre(av.pct) + (num ? '<p class="mini">Journée ' + esc(num.replace('J', '')) + ' prévues</p>' : '') + '</section>';
    var lignes = [
      ['N° d\'affaire', inst.affaire], ['Client', inst.client], ['Lieu', inst.lieu], ['Machine / équipements', inst.machine],
      ['Début', inst.debut ? majuscule(dateLongue(inst.debut)) : ''], ['Durée prévue', inst.duree ? pluriel(+inst.duree, 'jour ouvré', 'jours ouvrés') : ''],
      ['Contraintes de site', inst.contraintes]
    ].filter(function (x) { return x[1]; });
    h += '<section class="carte"><h2 class="carte-titre">' + ICO.document(18) + 'Fiche</h2>' +
      (lignes.length ? '<dl class="fiche-dl">' + lignes.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>' : '<p class="vide-texte">Fiche à compléter.</p>') + '</section>';
    /* intervenants : ceux qui ont agi sur l'installation */
    var compte = new Map();
    function plus1(id) { if (id) compte.set(id, (compte.get(id) || 0) + 1); }
    taches.forEach(function (t) { plus1(t.creePar); plus1(t.faitPar); plus1(t.enCoursPar); });
    blocs.forEach(function (b) { plus1(b.ouvertPar); plus1(b.levePar); Object.keys(b.suivi || {}).forEach(function (k) { plus1(b.suivi[k] && b.suivi[k].par); }); });
    var ids = Array.from(compte.keys()).sort(function (a, b) { return compte.get(b) - compte.get(a); });
    h += '<section class="carte"><h2 class="carte-titre">' + ICO.effectif(18) + 'Intervenants</h2>' +
      (ids.length ? '<div class="personnes">' + ids.map(function (id) {
        var e = S.equipe.get(id);
        return '<span class="personne">' + initiales(id) + esc(majuscule(nomDe(id))) + (e && e.role ? '<span class="mini">' + esc(e.role) + '</span>' : '') + '</span>';
      }).join('') + '</div>' : '<p class="vide-texte">Les personnes qui cochent, prennent ou signalent apparaîtront ici.</p>') + '</section>';
    if (ecr) {
      var ferme = inst.statut === 'CLOTURE' || inst.statut === 'RECEPTIONNE';
      h += '<div class="boutons-ligne">' + (ferme
        ? '<button class="btn s sm" data-action="statut" data-statut="EN_COURS">' + ICO.refaire(16) + 'Rouvrir l\'installation</button>'
        : '<button class="btn s sm" data-action="statut" data-statut="CLOTURE">' + ICO.verrou(16) + 'Clôturer l\'installation</button>') +
        '<button class="btn danger sm" data-action="supprimer-installation">' + ICO.corbeille(16) + 'Supprimer</button></div>';
    }
    return h;
  }

  function vueBarreBas() {
    var n = S.nav, ecr = peutModifier();
    if (n.ecran !== 'installation' || !S.installations.has(n.iid)) {
      return ecr && S.instPret && S.installations.size ? '<button class="btn p" data-action="nouvelle-installation">' + ICO.plus(18) + 'Nouvelle installation</button>' : '';
    }
    var auj = aujourdhui(), D = n.jour || auj;
    if (n.onglet === 'journee') {
      var point = '<button class="btn o" data-action="point">' + ICO.pointSoir(18) + 'Point du jour</button>';
      if (!ecr) return point;
      return '<button class="btn s" data-action="nouvelles-taches" data-jour="' + (D >= auj ? D : auj) + '">' + ICO.plus(18) + 'Tâche</button>' +
        '<button class="btn s" data-action="nouveau-blocage">' + ICO.interdit(18) + 'Blocage</button>' + point;
    }
    if (!ecr) return '';
    if (n.onglet === 'blocages') return '<button class="btn p" data-action="nouveau-blocage">' + ICO.interdit(18) + 'Signaler un blocage</button>';
    if (n.onglet === 'taches') return '<button class="btn s" data-action="nouvelles-taches" data-jour="">' + ICO.plus(18) + 'Nouvelles tâches</button><button class="btn o" data-action="planifier" data-jour="' + auj + '">' + ICO.liste(18) + 'Planifier</button>';
    if (n.onglet === 'fiche') return '<button class="btn s" data-action="modifier-installation">' + ICO.crayon(18) + 'Modifier la fiche</button>';
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
      '<button type="button" class="iconbtn" data-f="fermer" aria-label="Fermer">' + ICO.fermer(18) + '</button></div>' +
      '<div class="feuille-corps"></div><div class="feuille-pied"></div></div>';
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
    if (immediat) f.fond.remove();
    else { f.fond.classList.remove('visible'); setTimeout(function () { f.fond.remove(); }, 200); }
    try { if (f.retour && f.retour.focus && document.contains(f.retour)) f.retour.focus({ preventScroll: true }); } catch (e) { /* rien */ }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && feuille) fermerFeuille(); });

  function champ(titre, html, aide) { return '<label class="champ"><span class="champ-titre">' + esc(titre) + (aide ? '<span class="mini">' + esc(aide) + '</span>' : '') + '</span>' + html + '</label>'; }
  function choix(groupe, valeur, contenu, actif, cls) {
    return '<button type="button" class="choix' + (cls ? ' ' + cls : '') + (actif ? ' actif' : '') + '" data-f="choix" data-groupe="' + groupe + '" data-valeur="' + esc(valeur) + '" aria-pressed="' + !!actif + '">' + contenu + '</button>';
  }
  function valeurChoix(f, groupe) { var b = f.fond.querySelector('.choix.actif[data-groupe="' + groupe + '"]'); return b ? b.getAttribute('data-valeur') : null; }
  function val(f, id) { var el = f.fond.querySelector('#' + id); return el ? el.value : ''; }
  function options(listeOpts, actuel) {
    return listeOpts.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(x[0]) === String(actuel == null ? '' : actuel) ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('');
  }
  function erreurChamp(f, id, msg) {
    var el = f.fond.querySelector('#' + id);
    if (!el) return;
    var c = el.closest('.champ');
    c.classList.add('en-erreur');
    if (!c.querySelector('.erreur-champ')) { var d = document.createElement('div'); d.className = 'erreur-champ'; d.textContent = msg; c.appendChild(d); }
    el.focus();
    el.addEventListener('input', function () { c.classList.remove('en-erreur'); var x = c.querySelector('.erreur-champ'); if (x) x.remove(); }, { once: true });
  }

  /* --------------------------- Installation ---------------------------- */
  function feuilleInstallation(iid) {
    var ex = iid ? S.installations.get(iid) : null;
    var auj = aujourdhui();
    var v = ex || { titre: '', affaire: '', client: '', lieu: '', machine: '', phase: 'INSTALLATION', debut: auj, duree: 5, contraintes: '' };
    var ph = parId(PHASES, v.phase) || PHASES[0];
    var corps =
      champ('Nom de l\'installation', '<input id="i-titre" type="text" maxlength="120" autocomplete="off" placeholder="Ligne 3, encaisseuse" value="' + esc(v.titre) + '">') +
      '<div class="duo">' + champ('N° d\'affaire', '<input id="i-affaire" type="text" maxlength="40" autocomplete="off" placeholder="25-0142" value="' + esc(v.affaire) + '">') +
      champ('Client', '<input id="i-client" type="text" maxlength="120" autocomplete="off" value="' + esc(v.client) + '">') + '</div>' +
      '<div class="duo">' + champ('Lieu', '<input id="i-lieu" type="text" maxlength="120" autocomplete="off" placeholder="Ville du site" value="' + esc(v.lieu) + '">') +
      champ('Machine / équipements', '<input id="i-machine" type="text" maxlength="200" autocomplete="off" value="' + esc(v.machine) + '">') + '</div>' +
      '<div class="champ"><span class="champ-titre">Phase en cours</span><div class="grille-choix trois">' +
      PHASES.map(function (p) { return choix('phase', p.id, ICO[p.icone](22) + esc(p.court), p.id === ph.id); }).join('') + '</div>' +
      '<p class="mini" id="i-phase-equipe" style="margin-top:6px">' + esc(ph.equipe) + '</p></div>' +
      '<div class="duo">' + champ('Début', '<input id="i-debut" type="date" value="' + esc(v.debut || '') + '">') +
      champ('Durée prévue', '<input id="i-duree" type="number" inputmode="numeric" min="1" max="250" value="' + esc(v.duree || '') + '">', 'jours ouvrés') + '</div>' +
      (ex ? champ('Statut', '<select id="i-statut">' + options(STATUTS.map(function (s) { return [s.id, s.libelle]; }), ex.statut || 'PREVU') + '</select>') : '') +
      champ('Contraintes de site', '<textarea id="i-contraintes" maxlength="1500" placeholder="Accès zone production sur autorisation, coupure d\'énergie à demander la veille…">' + esc(v.contraintes) + '</textarea>') +
      (!ex ? '<label class="case-ligne"><input type="checkbox" id="i-catalogue" checked><span>Ajouter les <b id="i-nb-cat">' + CATALOGUE[ph.id].length + '</b> tâches types de la phase, à planifier ensuite</span></label>' : '');
    ouvrirFeuille({
      titre: ex ? 'Modifier la fiche' : 'Nouvelle installation',
      corps: corps,
      pied: '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn p" data-f="valider">' + (ex ? 'Enregistrer' : 'Créer l\'installation') + '</button>',
      action: function (a, b, f) {
        if (a === 'choix') {
          var p = parId(PHASES, valeurChoix(f, 'phase'));
          f.fond.querySelector('#i-phase-equipe').textContent = p.equipe;
          var nb = f.fond.querySelector('#i-nb-cat'); if (nb) nb.textContent = CATALOGUE[p.id].length;
        }
        if (a !== 'valider') return;
        var titre = val(f, 'i-titre').trim();
        if (!titre) { erreurChamp(f, 'i-titre', 'Donnez un nom à l\'installation.'); return; }
        var phase = valeurChoix(f, 'phase') || 'INSTALLATION';
        var duree = parseInt(val(f, 'i-duree'), 10);
        var data = {
          titre: titre, affaire: val(f, 'i-affaire').trim(), client: val(f, 'i-client').trim(), lieu: val(f, 'i-lieu').trim(),
          machine: val(f, 'i-machine').trim(), phase: phase, debut: val(f, 'i-debut') || null,
          duree: duree > 0 ? Math.min(duree, 250) : null, contraintes: val(f, 'i-contraintes').trim()
        };
        var now = Date.now();
        if (ex) {
          data.statut = val(f, 'i-statut');
          var diff = {};
          Object.keys(data).forEach(function (k) { if ((data[k] == null ? '' : data[k]) !== (ex[k] == null ? '' : ex[k])) diff[k] = data[k]; });
          fermerFeuille();
          if (!Object.keys(diff).length) return;
          if (diff.phase) diff['phaseHistorique.' + cleUnique('p')] = { phase: diff.phase, le: now, par: S.moi || null };
          diff.modifPar = S.moi || null; diff.modifLe = now;
          maj(cheminInst(iid), diff).catch(silence);
          toast('Fiche enregistrée', 'ok');
          return;
        }
        var ref = S.db.collection('installations').doc();
        var id = ref.id;
        data.statut = data.debut && data.debut > auj ? 'PREVU' : 'EN_COURS';
        data.creePar = S.moi || null; data.creeLe = now; data.phaseHistorique = {};
        data.phaseHistorique[cleUnique('p')] = { phase: phase, le: now, par: S.moi || null };
        var avecCat = f.fond.querySelector('#i-catalogue') && f.fond.querySelector('#i-catalogue').checked;
        S.creation = id;
        poser(cheminInst(id), data).catch(function () { S.creation = null; planifierRendu(); });
        fermerFeuille();
        ouvrirInstallation(id, avecCat ? 'taches' : 'journee');
        if (avecCat) {
          var n = creerTaches(id, CATALOGUE[phase].map(function (x) { return x[0]; }), null, 'auto');
          toast('Installation créée avec ' + n + ' tâches à planifier', 'ok');
        } else toast('Installation créée', 'ok');
      }
    });
  }
  function feuillePhase(iid) {
    var inst = S.installations.get(iid);
    var suite = parId(PHASES, (parId(PHASES, inst.phase) || {}).suite);
    if (!suite) return;
    ouvrirFeuille({
      titre: 'Passer en ' + suite.court.toLowerCase(),
      corps: '<div class="phase-tete">' + ICO[suite.icone](24) + '<span class="phase-nom">' + esc(suite.libelle) + '</span></div>' +
        '<p class="petit" style="margin-top:6px">' + esc(suite.equipe) + '</p><p style="margin:6px 0 12px;font-size:14px">' + esc(suite.resume) + '</p>' +
        '<label class="case-ligne"><input type="checkbox" id="ph-catalogue" checked><span>Ajouter les tâches types de cette phase, à planifier ensuite</span></label>' +
        '<p class="mini">Les journées déjà passées gardent leurs tâches telles quelles.</p>',
      pied: '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn p" data-f="valider">Passer en ' + esc(suite.court.toLowerCase()) + '</button>',
      action: function (a, b, f) {
        if (a !== 'valider') return;
        var now = Date.now(), d = { phase: suite.id, modifPar: S.moi || null, modifLe: now };
        d['phaseHistorique.' + cleUnique('p')] = { phase: suite.id, le: now, par: S.moi || null };
        var cat = f.fond.querySelector('#ph-catalogue').checked;
        fermerFeuille();
        maj(cheminInst(iid), d).catch(silence);
        var n = cat ? ajouterCatalogue(iid, suite.id) : 0;
        toast('Phase : ' + suite.libelle + (n ? ' · ' + pluriel(n, 'tâche type ajoutée', 'tâches types ajoutées') : ''), 'ok');
      }
    });
  }
  function feuilleSuppressionInstallation(iid) {
    var inst = S.installations.get(iid);
    var nt = (tachesDe(iid) || []).length, nb = (blocagesDe(iid) || []).length;
    ouvrirFeuille({
      titre: 'Supprimer l\'installation',
      corps: '<p style="font-size:14.5px">Supprimer « <b>' + esc(inst.titre) + '</b> » pour toute l\'équipe ?</p>' +
        '<p class="petit" style="margin-top:8px">' + esc(pluriel(nt, 'tâche')) + ', ' + esc(pluriel(nb, 'blocage')) + ' et les points du jour seront effacés. C\'est définitif. Pour simplement la ranger, utilisez plutôt « Clôturer l\'installation ».</p>',
      pied: '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn danger" data-f="valider">' + ICO.corbeille(16) + 'Supprimer définitivement</button>',
      action: function (a, b) {
        if (a !== 'valider') return;
        b.disabled = true; b.textContent = 'Suppression…';
        var base = 'installations/' + iid;
        Promise.all(['taches', 'blocages', 'jours'].map(function (c) {
          return S.db.collection(base + '/' + c).get().then(function (s) { return s.docs.map(function (d) { return base + '/' + c + '/' + d.id; }); }, function () { return []; });
        })).then(function (lots) {
          fermerFeuille();
          allerAccueil();
          [].concat.apply([], lots).forEach(function (c) { supprimer(c).catch(silence); });
          supprimer(cheminInst(iid)).catch(silence);
          toast('Installation supprimée');
        });
      }
    });
  }

  /* ------------------------------ Tâches ------------------------------- */
  function feuilleAjoutTaches(iid, jourDefaut) {
    var inst = S.installations.get(iid);
    var auj = aujourdhui();
    var existants = new Set((tachesDe(iid) || []).map(function (t) { return normaliser(t.libelle); }));
    var sugg = (CATALOGUE[inst.phase] || []).filter(function (x) { return !existants.has(normaliser(x[0])); });
    var D = jourDefaut || '';
    var L = D ? jourOuvreSuivant(D) : jourOuvreSuivant(auj);
    var opts = [];
    if (D) opts.push([D, majuscule(relatifJour(D)) + (relatifJour(D) === dateCourte(D) ? '' : ' (' + dateCourte(D) + ')')]);
    else opts.push(['', 'À planifier (sans date)']);
    if (D !== auj) opts.push([auj, 'Aujourd\'hui (' + dateCourte(auj) + ')']);
    if (L !== D && L !== auj) opts.push([L, majuscule(relatifJour(L)) + (relatifJour(L) === dateCourte(L) ? '' : ' (' + dateCourte(L) + ')')]);
    if (D) opts.push(['', 'À planifier (sans date)']);
    opts.push(['autre', 'Autre date…']);
    var corps =
      champ('Tâches, une par ligne', '<textarea id="nt-texte" rows="5" maxlength="6000" placeholder="Contrôle des entrées-sorties&#10;Réglage des capteurs du convoyeur"></textarea>') +
      (sugg.length ? '<div class="suggestion-titre">Tâches types · ' + esc((parId(PHASES, inst.phase) || PHASES[0]).court) + '</div><div class="suggestions">' +
        sugg.map(function (x) { var m = parId(METIERS, x[1]); return '<button type="button" class="suggestion" data-f="sugg" data-lib="' + esc(x[0]) + '">' + (m ? ICO[m.icone](14) : ICO.plus(14)) + esc(x[0]) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="duo">' + champ('Prévues pour', '<select id="nt-jour">' + options(opts, D) + '</select>') +
      champ('Métier', '<select id="nt-metier">' + options([['auto', 'Selon la tâche'], ['', 'Sans métier']].concat(METIERS.map(function (m) { return [m.id, m.libelle]; })), 'auto') + '</select>') + '</div>' +
      '<div id="nt-autre" hidden>' + champ('Date', '<input id="nt-date" type="date" value="' + esc(L) + '">') + '</div>';
    ouvrirFeuille({
      titre: 'Nouvelles tâches',
      corps: corps,
      pied: '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn p" data-f="valider" id="nt-valider">Ajouter</button>',
      apres: function (f) {
        var ta = f.fond.querySelector('#nt-texte');
        var sel = f.fond.querySelector('#nt-jour');
        function lignes() { return ta.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean); }
        function compter() {
          var n = lignes().length;
          f.fond.querySelector('#nt-valider').textContent = n > 1 ? 'Ajouter ' + n + ' tâches' : 'Ajouter';
          var set = new Set(lignes().map(normaliser));
          f.fond.querySelectorAll('.suggestion').forEach(function (s) { s.classList.toggle('actif', set.has(normaliser(s.getAttribute('data-lib')))); });
        }
        f.etat.lignes = lignes; f.etat.compter = compter;
        ta.addEventListener('input', compter);
        sel.addEventListener('change', function () { f.fond.querySelector('#nt-autre').hidden = sel.value !== 'autre'; });
        setTimeout(function () { try { ta.focus({ preventScroll: true }); } catch (e) { /* rien */ } }, 220);
      },
      action: function (a, b, f) {
        var ta = f.fond.querySelector('#nt-texte');
        if (a === 'sugg') {
          var lib = b.getAttribute('data-lib');
          var ls = f.etat.lignes(), n = normaliser(lib);
          var reste = ls.filter(function (l) { return normaliser(l) !== n; });
          ta.value = (reste.length === ls.length ? ls.concat([lib]) : reste).join('\n');
          f.etat.compter();
          return;
        }
        if (a !== 'valider') return;
        var vus = new Set(), libs = [];
        f.etat.lignes().forEach(function (l) { var k = normaliser(l); if (!vus.has(k)) { vus.add(k); libs.push(l.slice(0, 200)); } });
        if (!libs.length) { erreurChamp(f, 'nt-texte', 'Écrivez au moins une tâche, ou touchez une tâche type.'); return; }
        if (libs.length > 60) libs = libs.slice(0, 60);
        var j = val(f, 'nt-jour');
        if (j === 'autre') j = val(f, 'nt-date') || '';
        var metier = val(f, 'nt-metier');
        fermerFeuille();
        creerTaches(iid, libs, j || null, metier);
        toast(pluriel(libs.length, 'tâche ajoutée', 'tâches ajoutées') + (j ? ' · ' + relatifJour(j) : ' · à planifier'), 'ok');
      }
    });
  }
  function feuillePlanifier(iid, D) {
    var dispo = (tachesDe(iid) || []).filter(function (t) { return !t.jour && t.etat !== 'FAIT'; }).sort(parOrdre);
    var corps = dispo.length
      ? '<p class="petit" style="margin-bottom:6px">Cochez ce que l\'équipe fera ' + esc(relatifJour(D)) + '.</p>' +
        '<button type="button" class="mini-btn" data-f="tout" style="margin-bottom:6px">Tout cocher</button>' +
        dispo.map(function (t) {
          var m = parId(METIERS, t.metier);
          return '<label class="case-ligne"><input type="checkbox" class="pl-case" data-tid="' + esc(t.id) + '"><span>' + esc(t.libelle) + (m ? '<span class="mini" style="display:block">' + esc(m.libelle) + '</span>' : '') + '</span></label>';
        }).join('')
      : '<p class="vide-texte">Aucune tâche à planifier. Ajoutez-en avec « Nouvelles tâches ».</p>';
    ouvrirFeuille({
      titre: 'Planifier · ' + relatifJour(D),
      corps: corps,
      pied: dispo.length ? '<button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn p" data-f="valider" id="pl-valider" disabled>Planifier</button>' : '<button type="button" class="btn s" data-f="annuler">Fermer</button>',
      apres: function (f) {
        f.fond.addEventListener('change', function () {
          var n = f.fond.querySelectorAll('.pl-case:checked').length;
          var bt = f.fond.querySelector('#pl-valider');
          if (bt) { bt.disabled = !n; bt.textContent = n ? 'Planifier ' + pluriel(n, 'tâche') : 'Planifier'; }
        });
      },
      action: function (a, b, f) {
        if (a === 'tout') {
          var cases = f.fond.querySelectorAll('.pl-case'), toutes = Array.prototype.every.call(cases, function (c) { return c.checked; });
          cases.forEach(function (c) { c.checked = !toutes; });
          f.fond.dispatchEvent(new Event('change'));
          return;
        }
        if (a !== 'valider') return;
        var ids = Array.prototype.map.call(f.fond.querySelectorAll('.pl-case:checked'), function (c) { return c.getAttribute('data-tid'); });
        if (!ids.length) return;
        var now = Date.now();
        fermerFeuille();
        ids.forEach(function (tid) { maj(cheminTache(iid, tid), { jour: D, modifPar: S.moi || null, modifLe: now }).catch(silence); });
        toast(pluriel(ids.length, 'tâche prévue', 'tâches prévues') + ' ' + relatifJour(D), 'ok');
      }
    });
  }
  function feuilleTache(iid, tid) {
    var t0 = S.taches.get(iid) && S.taches.get(iid).get(tid);
    if (!t0) return;
    var t = Object.assign({ id: tid }, t0);
    var ecr = peutModifier();
    var etat = t.etat || 'A_FAIRE';
    var corps;
    if (ecr) {
      corps = champ('Tâche', '<input id="t-lib" type="text" maxlength="200" value="' + esc(t.libelle) + '">') +
        '<div class="champ"><span class="champ-titre">État</span><div class="grille-choix trois">' +
        ETATS.map(function (e) { return choix('etat', e.id, ICO[e.icone](20) + esc(e.libelle), e.id === etat); }).join('') + '</div>' +
        '<p class="mini" id="t-qui" style="margin-top:6px"></p></div>' +
        '<div class="duo">' + champ('Prévue le', '<input id="t-jour" type="date" value="' + esc(t.jour || '') + '">', 'vide : à planifier') +
        champ('Métier', '<select id="t-metier">' + options([['', 'Sans métier']].concat(METIERS.map(function (m) { return [m.id, m.libelle]; })), t.metier || '') + '</select>') + '</div>' +
        champ('Note', '<textarea id="t-note" maxlength="1500" placeholder="Précision, référence, ce qu\'il reste à faire…">' + esc(t.note || '') + '</textarea>') +
        '<div id="t-blocages"></div>' +
        '<button type="button" class="btn s sm" data-f="bloquer" style="width:100%">' + ICO.interdit(16) + 'Signaler un blocage sur cette tâche</button>' +
        '<p class="mini" id="t-trace" style="margin-top:12px"></p>';
    } else {
      corps = '<p class="bloc-texte">' + esc(t.libelle) + '</p><div class="infos-lignes" id="t-infos"></div><div id="t-blocages"></div><p class="mini" id="t-trace" style="margin-top:12px"></p>';
    }
    function piedNormal() {
      return ecr ? '<button type="button" class="btn danger sm" data-f="supprimer" style="flex:0 1 auto">' + ICO.corbeille(16) + 'Supprimer</button><button type="button" class="btn p" data-f="valider">Enregistrer</button>'
        : '<button type="button" class="btn s" data-f="annuler">Fermer</button>';
    }
    ouvrirFeuille({
      titre: 'Tâche',
      corps: corps,
      pied: piedNormal(),
      rafraichir: function (f) {
        var tc = S.taches.get(iid) && S.taches.get(iid).get(tid);
        if (!tc) { fermerFeuille(); toast('Cette tâche a été supprimée.'); return; }
        var qui = f.fond.querySelector('#t-qui');
        if (qui) {
          var choisi = valeurChoix(f, 'etat');
          var autre = tc.etat === 'EN_COURS' && tc.enCoursPar && tc.enCoursPar !== S.moi && !f.etat.reprendre;
          var txt = '';
          if (choisi === 'EN_COURS') txt = autre ? 'Prise par ' + nomDe(tc.enCoursPar) + ' · ' + quandCourt(tc.enCoursLe) + '. ' : 'Vous la prenez en charge : l\'équipe verra votre prénom.';
          else if (choisi === 'FAIT') txt = tc.etat === 'FAIT' ? 'Faite par ' + nomDe(tc.faitPar) + ' · ' + quandCourt(tc.faitLe) : 'Elle sera cochée à votre nom.';
          qui.textContent = txt;
          if (choisi === 'EN_COURS' && autre) {
            var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'mini-btn'; bt.setAttribute('data-f', 'reprendre'); bt.textContent = 'Je la reprends';
            qui.appendChild(bt);
          }
        }
        var infos = f.fond.querySelector('#t-infos');
        if (infos) {
          var m = parId(METIERS, tc.metier), e = tc.etat || 'A_FAIRE';
          infos.innerHTML = [
            '<span>' + ICO.valideCercle(16) + esc(e === 'FAIT' ? 'Faite par ' + nomDe(tc.faitPar) + ' · ' + quandCourt(tc.faitLe) : e === 'EN_COURS' ? 'En cours · ' + nomDe(tc.enCoursPar) : 'À faire') + '</span>',
            '<span>' + ICO.calendrier(16) + esc(tc.jour ? 'Prévue ' + relatifJour(tc.jour) : 'À planifier') + '</span>',
            m ? '<span>' + ICO[m.icone](16) + esc(m.libelle) + '</span>' : '',
            tc.note ? '<span>' + ICO.bulle(16) + esc(tc.note) + '</span>' : ''
          ].join('');
        }
        var zb = f.fond.querySelector('#t-blocages');
        var bl = (blocagesDe(iid) || []).filter(function (b) { return b.tache === tid && b.statut !== 'LEVE'; });
        zb.innerHTML = bl.length ? '<div class="sous-titre">Bloquée par</div><div class="liste-blocages" style="margin-bottom:12px">' + bl.map(function (b) {
          return '<button type="button" class="blocage g' + (+b.gravite || 2) + '" data-f="voir-blocage" data-bid="' + esc(b.id) + '"><span class="blocage-ico">' + ICO.interdit(18) + '</span><span class="blocage-texte"><span class="blocage-desc">' + esc(b.description) + '</span></span></button>';
        }).join('') + '</div>' : '';
        var tr = [];
        if (tc.creeLe) tr.push('Ajoutée par ' + nomDe(tc.creePar) + ' · ' + quandCourt(tc.creeLe));
        if (tc.modifLe && tc.modifLe !== tc.creeLe) tr.push('modifiée par ' + nomDe(tc.modifPar) + ' · ' + quandCourt(tc.modifLe));
        f.fond.querySelector('#t-trace').textContent = tr.join(' · ');
      },
      apres: function (f) { f.o.rafraichir(f); },
      action: function (a, b, f) {
        if (a === 'choix' || a === 'reprendre') { if (a === 'reprendre') f.etat.reprendre = true; f.o.rafraichir(f); return; }
        if (a === 'voir-blocage') { feuilleBlocage(iid, b.getAttribute('data-bid')); return; }
        if (a === 'bloquer') { feuilleBlocageForm(iid, null, tid); return; }
        if (a === 'supprimer') {
          poserPied(f, '<p class="question">Supprimer cette tâche pour toute l\'équipe ?</p><button type="button" class="btn s" data-f="non">Annuler</button><button type="button" class="btn danger" data-f="oui-supprimer">Supprimer</button>');
          return;
        }
        if (a === 'non') { poserPied(f, piedNormal()); return; }
        if (a === 'oui-supprimer') {
          fermerFeuille();
          supprimer(cheminTache(iid, tid)).catch(silence);
          toast('Tâche supprimée');
          return;
        }
        if (a !== 'valider') return;
        var tc = S.taches.get(iid) && S.taches.get(iid).get(tid);
        if (!tc) { fermerFeuille(); return; }
        var now = Date.now(), d = {};
        var lib = val(f, 't-lib').trim() || t.libelle;
        var nouvelEtat = valeurChoix(f, 'etat') || etat;
        var jour = val(f, 't-jour') || null;
        var metier = val(f, 't-metier');
        var note = val(f, 't-note').trim();
        if (lib !== t.libelle) d.libelle = lib;
        if (jour !== (t.jour || null)) d.jour = jour;
        if (metier !== (t.metier || '')) d.metier = metier;
        if (note !== (t.note || '')) d.note = note;
        if (nouvelEtat !== etat || f.etat.reprendre) {
          d.etat = nouvelEtat;
          if (nouvelEtat === 'FAIT') { d.faitPar = S.moi || null; d.faitLe = now; }
          else { d.faitPar = null; d.faitLe = null; }
          if (nouvelEtat === 'EN_COURS' && (etat !== 'EN_COURS' || f.etat.reprendre || !tc.enCoursPar)) { d.enCoursPar = S.moi || null; d.enCoursLe = now; }
          if (nouvelEtat === 'A_FAIRE') { d.enCoursPar = null; d.enCoursLe = null; }
        }
        fermerFeuille();
        if (!Object.keys(d).length) return;
        d.modifPar = S.moi || null; d.modifLe = now;
        maj(cheminTache(iid, tid), d).catch(silence);
        toast('Tâche enregistrée', 'ok');
      }
    });
  }

  /* ----------------------------- Blocages ------------------------------ */
  function feuilleBlocageForm(iid, bid, tacheId) {
    var ex = bid ? (S.blocages.get(iid) && S.blocages.get(iid).get(bid)) : null;
    var v = ex || { description: '', gravite: 2, debloqueur: 'CHARGE_AFFAIRE', echeance: '', tache: tacheId || '' };
    var taches = (tachesDe(iid) || []).filter(function (t) { return t.etat !== 'FAIT' || t.id === v.tache; }).sort(function (a, b) { return (a.jour || '9') < (b.jour || '9') ? -1 : (a.jour || '9') > (b.jour || '9') ? 1 : parOrdre(a, b); });
    var corps =
      champ('Ce qui bloque', '<textarea id="b-desc" maxlength="600" placeholder="Variateur du convoyeur C2 en défaut au démarrage">' + esc(v.description) + '</textarea>') +
      '<div class="champ"><span class="champ-titre">Gravité</span><div class="grille-choix trois">' +
      GRAVITES.map(function (g) { return choix('gravite', g.id, ICO[g.id === 1 ? 'interdit' : g.id === 2 ? 'alerte' : 'information'](20) + esc(g.id === 1 ? 'Bloque l\'équipe' : g.court), +v.gravite === g.id, 'g' + g.id); }).join('') + '</div></div>' +
      '<div class="duo">' + champ('Qui peut débloquer', '<select id="b-debl">' + options(DEBLOQUEURS.map(function (d) { return [d.id, d.libelle]; }), v.debloqueur) + '</select>') +
      champ('Échéance', '<input id="b-ech" type="date" value="' + esc(v.echeance || '') + '">', 'facultatif') + '</div>' +
      champ('Tâche concernée', '<select id="b-tache">' + options([['', 'Aucune en particulier']].concat(taches.map(function (t) { return [t.id, tronquer(t.libelle, 70)]; })), v.tache || '') + '</select>');
    ouvrirFeuille({
      titre: ex ? 'Modifier le blocage' : 'Signaler un blocage',
      corps: corps,
      pied: (ex ? '<button type="button" class="btn danger sm" data-f="supprimer" style="flex:0 1 auto">' + ICO.corbeille(16) + 'Supprimer</button>' : '<button type="button" class="btn s" data-f="annuler">Annuler</button>') +
        '<button type="button" class="btn p" data-f="valider">' + (ex ? 'Enregistrer' : 'Signaler') + '</button>',
      apres: function (f) { if (!ex) setTimeout(function () { try { f.fond.querySelector('#b-desc').focus({ preventScroll: true }); } catch (e) { /* rien */ } }, 220); },
      action: function (a, b, f) {
        if (a === 'supprimer') {
          poserPied(f, '<p class="question">Supprimer ce blocage et son suivi ? Préférez « Lever » s\'il est résolu.</p><button type="button" class="btn s" data-f="annuler">Annuler</button><button type="button" class="btn danger" data-f="oui-supprimer">Supprimer</button>');
          return;
        }
        if (a === 'oui-supprimer') { fermerFeuille(); supprimer(cheminBlocage(iid, bid)).catch(silence); toast('Blocage supprimé'); return; }
        if (a !== 'valider') return;
        var desc = val(f, 'b-desc').trim();
        if (!desc) { erreurChamp(f, 'b-desc', 'Décrivez ce qui bloque en une phrase.'); return; }
        var now = Date.now();
        var data = { description: desc, gravite: +(valeurChoix(f, 'gravite') || 2), debloqueur: val(f, 'b-debl'), echeance: val(f, 'b-ech') || null, tache: val(f, 'b-tache') || null };
        fermerFeuille();
        if (ex) {
          maj(cheminBlocage(iid, bid), Object.assign(data, { modifPar: S.moi || null, modifLe: now })).catch(silence);
          toast('Blocage enregistré', 'ok');
          return;
        }
        var ref = S.db.collection('installations/' + iid + '/blocages').doc();
        poser(ref.path, Object.assign(data, { statut: 'OUVERT', ouvertPar: S.moi || null, ouvertLe: now, levePar: null, leveLe: null, solution: '', suivi: {} })).catch(silence);
        toast('Blocage signalé à l\'équipe', 'ok');
      }
    });
  }
  function feuilleBlocage(iid, bid) {
    if (!(S.blocages.get(iid) && S.blocages.get(iid).get(bid))) return;
    var ecr = peutModifier();
    function piedPour(b) {
      if (!ecr) return '<button type="button" class="btn s" data-f="annuler">Fermer</button>';
      return '<button type="button" class="btn s" data-f="modifier">' + ICO.crayon(16) + 'Modifier</button>' +
        (b.statut === 'LEVE' ? '<button type="button" class="btn o" data-f="rouvrir">' + ICO.refaire(16) + 'Rouvrir</button>'
          : '<button type="button" class="btn p" data-f="lever">' + ICO.valide(16) + 'Lever le blocage</button>');
    }
    var corps = '<div id="bd-infos"></div><div class="sous-titre">Suivi</div><div id="bd-suivi"></div>' +
      (ecr ? '<div class="saisie-suivi"><input id="bd-suivi-texte" type="text" maxlength="500" placeholder="Fournisseur relancé, livraison demain 8 h" aria-label="Ajouter un suivi"><button type="button" class="btn o sm" data-f="ajouter-suivi">Ajouter</button></div>' : '') +
      '<div id="bd-lever" hidden style="margin-top:14px">' + champ('Comment a-t-il été levé ?', '<textarea id="bd-solution" maxlength="600" placeholder="Variateur remplacé, essai de démarrage OK"></textarea>', 'facultatif') + '</div>';
    ouvrirFeuille({
      titre: 'Point bloquant',
      corps: corps,
      pied: piedPour(S.blocages.get(iid).get(bid)),
      rafraichir: function (f) {
        var b = S.blocages.get(iid) && S.blocages.get(iid).get(bid);
        if (!b) { fermerFeuille(); toast('Ce blocage a été supprimé.'); return; }
        var g = parId(GRAVITES, +b.gravite) || GRAVITES[1], leve = b.statut === 'LEVE', auj = aujourdhui();
        var t = b.tache && S.taches.get(iid) && S.taches.get(iid).get(b.tache);
        var infos = '<div class="ligne" style="margin-bottom:8px">' + tag(leve ? 'ok' : g.cls, leve ? 'Levé' : g.libelle) + (leve ? '' : '<span class="mini">depuis ' + esc(depuis(b.ouvertLe)) + '</span>') + '</div>' +
          '<p class="bloc-texte">' + esc(b.description) + '</p><div class="infos-lignes">' +
          '<span>' + ICO.personne(16) + 'Attend : ' + esc(libelleDe(DEBLOQUEURS, b.debloqueur) || '—') + '</span>' +
          (b.echeance ? '<span class="' + (!leve && b.echeance < auj ? 'rouge gras' : '') + '">' + ICO.calendrier(16) + 'Échéance : ' + esc(majuscule(relatifJour(b.echeance))) + (!leve && b.echeance < auj ? ' (dépassée)' : '') + '</span>' : '') +
          (t ? '<span>' + ICO.valideCercle(16) + 'Tâche : ' + esc(t.libelle) + '</span>' : '') +
          '<span>' + ICO.interdit(16) + 'Signalé par ' + esc(nomDe(b.ouvertPar)) + ' · ' + esc(quandCourt(b.ouvertLe)) + '</span>' +
          (leve ? '<span class="vert">' + ICO.valide(16) + 'Levé par ' + esc(nomDe(b.levePar)) + ' · ' + esc(quandCourt(b.leveLe)) + (b.solution ? ' : ' + esc(b.solution) : '') + '</span>' : '') + '</div>';
        f.fond.querySelector('#bd-infos').innerHTML = infos;
        var suivi = Object.keys(b.suivi || {}).map(function (k) { return b.suivi[k]; }).filter(Boolean).sort(function (x, y) { return (x.le || 0) - (y.le || 0); });
        f.fond.querySelector('#bd-suivi').innerHTML = suivi.length ? suivi.map(function (s) {
          return '<div class="suivi-ligne"><span class="mini">' + esc(majuscule(nomDe(s.par))) + ' · ' + esc(quandCourt(s.le)) + '</span><p>' + esc(s.texte) + '</p></div>';
        }).join('') : '<p class="vide-texte">Aucun suivi. Notez ici les relances, les réponses et ce qui est attendu.</p>';
        if (!f.etat.enLevee && f.etat.statut !== b.statut) { poserPied(f, piedPour(b)); }
        f.etat.statut = b.statut;
      },
      apres: function (f) {
        f.o.rafraichir(f);
        var inp = f.fond.querySelector('#bd-suivi-texte');
        if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); f.o.action('ajouter-suivi', null, f); } });
      },
      action: function (a, b, f) {
        var chemin = cheminBlocage(iid, bid), now = Date.now();
        if (a === 'modifier') { feuilleBlocageForm(iid, bid); return; }
        if (a === 'ajouter-suivi') {
          var inp = f.fond.querySelector('#bd-suivi-texte'), texte = inp.value.trim();
          if (!texte) { inp.focus(); return; }
          var d = { modifPar: S.moi || null, modifLe: now };
          d['suivi.' + cleUnique('s')] = { par: S.moi || null, le: now, texte: texte.slice(0, 500) };
          inp.value = '';
          maj(chemin, d).catch(function () { inp.value = texte; });
          return;
        }
        if (a === 'lever') {
          f.etat.enLevee = true;
          f.fond.querySelector('#bd-lever').hidden = false;
          poserPied(f, '<button type="button" class="btn s" data-f="annuler-levee">Annuler</button><button type="button" class="btn p" data-f="confirmer-levee">' + ICO.valide(16) + 'Confirmer la levée</button>');
          setTimeout(function () { try { f.fond.querySelector('#bd-solution').focus(); } catch (e) { /* rien */ } }, 60);
          return;
        }
        if (a === 'annuler-levee') { f.etat.enLevee = false; f.fond.querySelector('#bd-lever').hidden = true; poserPied(f, piedPour(S.blocages.get(iid).get(bid))); return; }
        if (a === 'confirmer-levee') {
          var sol = val(f, 'bd-solution').trim();
          fermerFeuille();
          maj(chemin, { statut: 'LEVE', levePar: S.moi || null, leveLe: now, solution: sol, modifPar: S.moi || null, modifLe: now }).catch(silence);
          toast('Blocage levé', 'ok');
          return;
        }
        if (a === 'rouvrir') {
          maj(chemin, { statut: 'OUVERT', levePar: null, leveLe: null, modifPar: S.moi || null, modifLe: now }).catch(silence);
          toast('Blocage rouvert');
        }
      }
    });
  }

  /* ---------------------------- Point du jour -------------------------- */
  function feuillePoint(iid, D) {
    var inst = S.installations.get(iid);
    var ecr = peutModifier();
    var jd0 = jourDoc(iid, D) || {};
    var corps = '<div class="carte info" style="margin-bottom:14px">Le point se construit à partir des tâches et des blocages. Ajoutez la synthèse, puis copiez le texte ou ouvrez-le dans votre messagerie.</div>' +
      (ecr ? champ('Synthèse de la journée', '<textarea id="pj-synthese" maxlength="3000" placeholder="L\'essentiel en trois lignes : avancement, difficultés, ce qui est attendu et de qui.">' + esc(jd0.synthese || '') + '</textarea>', 'enregistrée pour toute l\'équipe') : '') +
      '<div class="sous-titre">Texte du point</div><pre class="apercu-texte" id="pj-texte"></pre>' +
      '<div class="boutons-ligne"><button type="button" class="btn s sm" data-f="copier">' + ICO.copie(16) + 'Copier le texte</button>' +
      '<a class="btn s sm" id="pj-mail" href="#">' + ICO.courriel(16) + 'Ouvrir dans la messagerie</a></div>';
    function piedPour(jd) {
      if (!ecr) return '<button type="button" class="btn s" data-f="annuler">Fermer</button>';
      return jd && jd.clotureLe
        ? '<button type="button" class="btn s" data-f="rouvrir-jour">' + ICO.refaire(16) + 'Rouvrir la journée</button>'
        : '<button type="button" class="btn p" data-f="cloturer">' + ICO.verrou(16) + 'Clôturer la journée</button>';
    }
    function texteActuel(f) {
      var ta = f.fond.querySelector('#pj-synthese');
      return texteDuPoint(inst, D, aujourdhui(), tachesDe(iid) || [], blocagesDe(iid) || [], jourDoc(iid, D), ta ? ta.value : null);
    }
    function sauverSynthese(f) {
      var ta = f.fond.querySelector('#pj-synthese');
      if (!ta) return;
      var v = ta.value.trim();
      if (v === (f.etat.enregistre || '')) return;
      f.etat.enregistre = v;
      fusionner(cheminJour(iid, D), { synthese: v, synthesePar: S.moi || null, syntheseLe: Date.now() }).catch(silence);
    }
    ouvrirFeuille({
      titre: 'Point du jour · ' + dateCourte(D),
      corps: corps,
      pied: piedPour(jd0),
      rafraichir: function (f) {
        var jd = jourDoc(iid, D);
        var ta = f.fond.querySelector('#pj-synthese');
        if (ta && document.activeElement !== ta && jd && (jd.synthese || '') !== ta.value.trim() && (jd.synthese || '') !== (f.etat.enregistre || '')) {
          ta.value = jd.synthese || ''; f.etat.enregistre = jd.synthese || '';
        }
        var texte = texteActuel(f);
        f.fond.querySelector('#pj-texte').textContent = texte;
        var sujet = 'Point du jour · ' + (inst.titre || '') + ' · ' + dateCourte(D);
        f.fond.querySelector('#pj-mail').setAttribute('href', 'mailto:?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(texte));
        var clo = !!(jd && jd.clotureLe);
        if (f.etat.clo !== clo) { poserPied(f, piedPour(jd)); f.etat.clo = clo; }
      },
      apres: function (f) {
        f.etat.enregistre = (jd0.synthese || '').trim();
        f.etat.clo = !!jd0.clotureLe;
        f.o.rafraichir(f);
        var ta = f.fond.querySelector('#pj-synthese');
        if (ta) {
          var minuteur = null;
          ta.addEventListener('input', function () {
            f.fond.querySelector('#pj-texte').textContent = texteActuel(f);
            clearTimeout(minuteur);
            minuteur = setTimeout(function () { sauverSynthese(f); }, 1200);
          });
          ta.addEventListener('blur', function () { clearTimeout(minuteur); sauverSynthese(f); });
          f.etat.vider = function () { clearTimeout(minuteur); sauverSynthese(f); };
        }
      },
      ferme: function (f) { if (f.etat.vider) f.etat.vider(); },
      action: function (a, b, f) {
        if (a === 'copier') { copier(texteActuel(f), f.fond.querySelector('#pj-texte')); return; }
        var now = Date.now();
        if (a === 'cloturer') {
          if (f.etat.vider) f.etat.vider();
          fusionner(cheminJour(iid, D), { cloturePar: S.moi || null, clotureLe: now }).catch(silence);
          toast('Journée clôturée', 'ok');
          return;
        }
        if (a === 'rouvrir-jour') { fusionner(cheminJour(iid, D), { cloturePar: null, clotureLe: null }).catch(silence); toast('Journée rouverte'); }
      }
    });
  }
  function copier(texte, el) {
    var ok = function () { toast('Texte copié', 'ok'); };
    var repli = function () {
      if (el) { try { var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* rien */ } }
      toast('Copie impossible ici : le texte est sélectionné, copiez-le avec le menu du téléphone.');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texte).then(ok, repli);
      else repli();
    } catch (e) { repli(); }
  }

  /* ------------------- Menu, profil, équipe, accès --------------------- */
  function feuilleMenu() {
    var e = S.moi ? S.equipe.get(S.moi) : null;
    var admin = S.role === 'admin';
    ouvrirFeuille({
      titre: 'Menu',
      corps:
        '<p class="menu-compte">Connecté avec <b>' + esc(S.email) + '</b>' + (admin ? ' · administrateur' : '') + '</p>' +
        '<button type="button" class="menu-ligne" data-f="profil">' + ICO.personne(20) + '<span><b>Mon profil</b><span class="mini">' + esc(e ? [e.prenom, e.role].filter(Boolean).join(' · ') : 'Prénom et métier à renseigner') + '</span></span><span class="chevron">' + ICO.suivant(18) + '</span></button>' +
        '<button type="button" class="menu-ligne" data-f="equipe">' + ICO.effectif(20) + '<span><b>L\'équipe</b><span class="mini">' + esc(pluriel(S.equipe.size, 'personne présentée', 'personnes présentées')) + '</span></span><span class="chevron">' + ICO.suivant(18) + '</span></button>' +
        (admin ? '<button type="button" class="menu-ligne" data-f="acces">' + ICO.cadenasOuvert(20) + '<span><b>Accès à l\'appli</b><span class="mini">Ajouter ou retirer des adresses e-mail</span></span><span class="chevron">' + ICO.suivant(18) + '</span></button>' : '') +
        '<button type="button" class="menu-ligne" data-f="aide">' + ICO.modeEmploi(20) + '<span><b>Mode d\'emploi</b><span class="mini">Le matin, la journée, le soir</span></span><span class="chevron">' + ICO.suivant(18) + '</span></button>' +
        '<button type="button" class="menu-ligne" data-f="deconnexion">' + ICO.sortie(20) + '<span><b>Se déconnecter</b><span class="mini">Sur ce téléphone</span></span></button>' +
        '<p class="menu-version">Chantier partagé ' + esc(VERSION_APP) + ' · Firebase ' + esc(VERSION_FIREBASE) + '</p>',
      action: function (a) {
        if (a === 'profil') feuilleProfil(false);
        if (a === 'equipe') feuilleEquipe();
        if (a === 'acces') feuilleAcces();
        if (a === 'aide') feuilleAide();
        if (a === 'deconnexion') deconnexion();
      }
    });
  }
  function feuilleProfil(auto) {
    if (!S.moi) return;
    var e = S.equipe.get(S.moi) || {};
    ouvrirFeuille({
      titre: auto ? 'Bienvenue sur le chantier' : 'Mon profil',
      corps: '<p class="petit" style="margin-bottom:12px">Votre prénom s\'affiche à côté de ce que vous cochez, prenez en charge ou signalez. Toute l\'équipe le voit.</p>' +
        champ('Prénom', '<input id="p-prenom" type="text" maxlength="40" autocomplete="given-name" value="' + esc(e.prenom || '') + '">') +
        '<div class="champ"><span class="champ-titre">Métier</span><div class="grille-choix">' + ROLES.map(function (r) { return choix('role', r, esc(r), r === e.role); }).join('') + '</div></div>',
      pied: '<button type="button" class="btn s" data-f="annuler">' + (auto ? 'Plus tard' : 'Annuler') + '</button><button type="button" class="btn p" data-f="valider">Enregistrer</button>',
      action: function (a, b, f) {
        if (a !== 'valider') return;
        var p = val(f, 'p-prenom').trim();
        if (!p) { erreurChamp(f, 'p-prenom', 'Indiquez votre prénom.'); return; }
        fermerFeuille();
        poser('equipe/' + S.moi, { prenom: p.slice(0, 40), role: valeurChoix(f, 'role') || '', email: S.email, maj: Date.now() }).catch(silence);
        toast('Profil enregistré', 'ok');
      }
    });
  }
  function feuilleEquipe() {
    var gens = [];
    S.equipe.forEach(function (e, id) { gens.push({ id: id, prenom: e.prenom || '', role: e.role || '' }); });
    gens.sort(function (a, b) { return a.prenom.localeCompare(b.prenom, 'fr'); });
    ouvrirFeuille({
      titre: 'L\'équipe',
      corps: (gens.length ? '<div class="personnes" style="flex-direction:column;align-items:flex-start">' + gens.map(function (g) {
        return '<span class="personne">' + initiales(g.id) + esc(g.prenom) + (g.role ? '<span class="mini">' + esc(g.role) + '</span>' : '') + (g.id === S.moi ? '<span class="mini">(vous)</span>' : '') + '</span>';
      }).join('') + '</div>' : '<p class="vide-texte">Personne ne s\'est encore présenté.</p>') +
        '<p class="mini" style="margin-top:14px">Chacun apparaît ici après avoir renseigné son prénom (Menu, Mon profil). Les nouvelles personnes sont ajoutées par un administrateur, dans Menu, Accès à l\'appli.</p>',
      pied: '<button type="button" class="btn s" data-f="annuler">Fermer</button>'
    });
  }
  function feuilleAcces() {
    if (S.role !== 'admin') return;
    var lien = lienAppli();
    ouvrirFeuille({
      titre: 'Accès à l\'appli',
      corps: '<p class="petit" style="margin-bottom:12px">Seules les adresses de cette liste ouvrent l\'appli, une fois leur compte créé et leur e-mail validé.</p>' +
        '<form class="ajout-acces" id="ac-form" novalidate>' + champ('Adresse à ajouter', '<input id="ac-email" type="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="prenom.nom@exemple.fr">') +
        champ('Rôle', '<select id="ac-role"><option value="membre">Membre</option><option value="admin">Administrateur</option></select>') +
        '<button type="submit" class="btn p">' + ICO.plus(18) + 'Ajouter</button></form>' +
        '<p class="mini" style="margin:6px 0 4px">Un administrateur peut aussi ajouter et retirer des adresses.</p>' +
        '<div class="sous-titre">Adresses autorisées</div><div id="ac-liste"><p class="vide-texte">Chargement…</p></div>' +
        '<div class="sous-titre">Lien à envoyer</div><div class="lien-appli"><code id="ac-lien">' + esc(lien) + '</code><button type="button" class="btn s sm" data-f="copier-lien">' + ICO.copie(16) + 'Copier</button></div>' +
        '<p class="mini" style="margin-top:8px">La personne ouvre ce lien, touche « Créer mon compte » avec l\'adresse ajoutée ici, puis valide l\'e-mail reçu.</p>',
      pied: '<button type="button" class="btn s" data-f="annuler">Fermer</button>',
      apres: function (f) {
        abonner('membres', S.db.collection('membres'), function (snap) { S.membres = enMap(snap); if (feuille === f) f.o.rafraichir(f); });
        f.fond.querySelector('#ac-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var champEmail = f.fond.querySelector('#ac-email');
          var email = champEmail.value.trim().toLowerCase();
          if (!adresseValide(email)) { erreurChamp(f, 'ac-email', 'Saisissez une adresse e-mail valide.'); return; }
          if (S.membres.has(email)) { erreurChamp(f, 'ac-email', 'Cette adresse a déjà accès.'); return; }
          var role = f.fond.querySelector('#ac-role').value === 'admin' ? 'admin' : 'membre';
          poser('membres/' + email, { role: role, ajoutePar: S.moi || null, ajouteLe: Date.now() }).catch(silence);
          champEmail.value = '';
          toast('Adresse ajoutée : envoyez-lui le lien de l\'appli.', 'ok');
        });
      },
      ferme: function () {
        var fin = abonnements.get('membres');
        if (fin) { try { fin(); } catch (e) { /* rien */ } abonnements.delete('membres'); }
      },
      rafraichir: function (f) {
        var zone = f.fond.querySelector('#ac-liste');
        if (!zone) return;
        var prenoms = new Map();
        S.equipe.forEach(function (e) { if (e.email) prenoms.set(String(e.email).toLowerCase(), e.prenom || ''); });
        var lignes = [];
        S.membres.forEach(function (m, email) { lignes.push({ email: email, role: m.role === 'admin' ? 'admin' : 'membre', ajoutePar: m.ajoutePar, ajouteLe: m.ajouteLe }); });
        lignes.sort(function (a, b) { return (a.role === b.role ? 0 : a.role === 'admin' ? -1 : 1) || a.email.localeCompare(b.email); });
        zone.innerHTML = lignes.length ? lignes.map(function (l) {
          var p = prenoms.get(l.email);
          var info = [l.role === 'admin' ? 'Administrateur' : 'Membre', p ? 'compte créé (' + p + ')' : 'compte pas encore utilisé', l.ajouteLe ? 'ajoutée ' + quandCourt(l.ajouteLe) : ''].filter(Boolean).join(' · ');
          var moi = l.email === S.email;
          var bouton = moi ? '<span class="mini">(vous)</span>'
            : (f.etat.aRetirer === l.email
              ? '<button type="button" class="btn danger sm" data-f="confirmer-retrait" data-email="' + esc(l.email) + '">Confirmer</button>'
              : '<button type="button" class="btn s sm" data-f="retirer" data-email="' + esc(l.email) + '">Retirer</button>');
          return '<div class="acces-ligne"><span class="acces-texte"><b>' + esc(l.email) + '</b><span class="mini">' + esc(info) + '</span></span>' + bouton + '</div>';
        }).join('') : '<p class="vide-texte">Aucune adresse pour l\'instant.</p>';
      },
      action: function (a, b, f) {
        if (a === 'copier-lien') { copier(lien, f.fond.querySelector('#ac-lien')); return; }
        if (a === 'retirer') { f.etat.aRetirer = b.getAttribute('data-email'); f.o.rafraichir(f); return; }
        if (a === 'confirmer-retrait') {
          var email = b.getAttribute('data-email');
          f.etat.aRetirer = null;
          supprimer('membres/' + email).catch(silence);
          toast('Accès retiré : ' + email);
        }
      }
    });
  }
  function feuilleAide() {
    ouvrirFeuille({
      titre: 'Mode d\'emploi',
      corps: '<div class="aide">' +
        '<h4>Le principe</h4><p>Tout est partagé en direct. Une tâche cochée sur un téléphone apparaît aussitôt cochée sur les autres, avec le prénom et l\'heure. Sans réseau, l\'appli continue de fonctionner : les changements partent dès que le réseau revient.</p>' +
        '<h4>Le matin</h4><p>Ouvrez l\'installation sur l\'onglet Journée. Les points bloquants ouverts et les tâches non faites la veille sont en tête. Planifiez la journée parmi les tâches à planifier, ou ajoutez-en, une par ligne.</p>' +
        '<h4>Dans la journée</h4><p>Cochez la case d\'une tâche dès qu\'elle est faite ; « Annuler » reste proposé quelques secondes. Touchez son texte pour la prendre en charge (En cours), changer sa date, ajouter une note ou signaler un blocage dessus.</p>' +
        '<h4>Les points bloquants</h4><p>Gravité 1 : bloque l\'équipe. 2 : ralentit. 3 : gêne. Indiquez qui peut débloquer et pour quand. Chacun ajoute ses relances dans le suivi ; la personne qui lève le blocage note comment.</p>' +
        '<h4>Le soir</h4><p>Point du jour prépare le bilan : fait, reste à faire, blocages, prévu le lendemain. Ajoutez la synthèse, copiez le texte ou ouvrez-le dans la messagerie, puis clôturez la journée.</p>' +
        '<h4>Ajouter quelqu\'un</h4><p>Un administrateur ajoute son adresse dans Menu, Accès à l\'appli, puis lui envoie le lien. La personne crée son compte avec cette adresse et valide l\'e-mail reçu.</p></div>',
      pied: '<button type="button" class="btn s" data-f="annuler">Fermer</button>'
    });
  }

  /* ============================== Toast ================================ */
  var minuteurToast = null;
  function toast(msg, type, action) {
    var t = document.getElementById('toast');
    t.innerHTML = '<div class="toast ' + (type || '') + '"><span></span>' + (action ? '<button type="button" class="toast-action"></button>' : '') + '</div>';
    t.querySelector('span').textContent = msg;
    if (action) {
      var bt = t.querySelector('.toast-action');
      bt.textContent = action.libelle;
      bt.addEventListener('click', function () { action.fn(); masquer(); });
    }
    t.classList.add('visible');
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(masquer, action ? 5500 : type === 'erreur' ? 5000 : 2600);
    function masquer() { t.classList.remove('visible'); }
  }

  /* ============================ Événements ============================= */
  var app = document.getElementById('app');
  app.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    var quoi = form.getAttribute('data-form');
    if (quoi === 'connexion') soumettreConnexion();
    if (quoi === 'creation') soumettreCreation();
  });
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-action]');
    if (!b) return;
    var a = b.getAttribute('data-action'), iid = S.nav.iid, auj = aujourdhui();
    switch (a) {
      /* connexion */
      case 'aller-creation': {
        var em = document.getElementById('a-email'); if (em) S.emailSaisi = em.value.trim();
        S.etat = 'creation'; rendre(); break;
      }
      case 'aller-connexion': {
        var ec = document.getElementById('c-email'); if (ec) S.emailSaisi = ec.value.trim();
        S.etat = 'connexion'; rendre(); break;
      }
      case 'mdp-oublie': motDePasseOublie(); break;
      case 'verifie': jaiValide(); break;
      case 'renvoyer':
        if (S.auth.currentUser) envoyerVerification(S.auth.currentUser).then(function () { toast('E-mail renvoyé à ' + S.auth.currentUser.email, 'ok'); }, function (err) { erreurAuth(messageAuth(err)); });
        break;
      case 'reessayer': verifierAcces(); break;
      case 'deconnexion': deconnexion(); break;
      case 'recharger': location.reload(); break;
      /* application */
      case 'menu': feuilleMenu(); break;
      case 'retour': allerAccueil(); break;
      case 'ouvrir': ouvrirInstallation(b.getAttribute('data-iid')); break;
      case 'onglet': S.nav.onglet = b.getAttribute('data-onglet'); sauverNav(); rendre(); window.scrollTo(0, 0); break;
      case 'jour-prec': S.nav.jour = ajouterJours(S.nav.jour || auj, -1); S.nav.voirFil = false; rendre(); break;
      case 'jour-suiv': S.nav.jour = ajouterJours(S.nav.jour || auj, 1); S.nav.voirFil = false; rendre(); break;
      case 'jour-auj': S.nav.jour = auj; rendre(); break;
      case 'cocher': cocher(iid, b.getAttribute('data-tid')); break;
      case 'tache': feuilleTache(iid, b.getAttribute('data-tid')); break;
      case 'planifier-vite': planifierTache(iid, b.getAttribute('data-tid'), auj); break;
      case 'blocage': feuilleBlocage(iid, b.getAttribute('data-bid')); break;
      case 'nouvelle-installation': feuilleInstallation(null); break;
      case 'modifier-installation': feuilleInstallation(iid); break;
      case 'nouvelles-taches': feuilleAjoutTaches(iid, b.getAttribute('data-jour') || ''); break;
      case 'taches-types': {
        var n = ajouterCatalogue(iid, (S.installations.get(iid) || {}).phase);
        toast(n ? pluriel(n, 'tâche type ajoutée', 'tâches types ajoutées') : 'Toutes les tâches types sont déjà là', n ? 'ok' : '');
        break;
      }
      case 'planifier': feuillePlanifier(iid, b.getAttribute('data-jour') || auj); break;
      case 'nouveau-blocage': feuilleBlocageForm(iid, null, null); break;
      case 'point': feuillePoint(iid, S.nav.jour || auj); break;
      case 'profil': feuilleProfil(false); break;
      case 'filtre-blocages': S.nav.filtreBlocages = b.getAttribute('data-filtre'); rendre(); break;
      case 'voir-terminees': S.nav.voirTerminees = !S.nav.voirTerminees; rendre(); break;
      case 'voir-faites': S.nav.voirFaites = !S.nav.voirFaites; rendre(); break;
      case 'voir-fil': S.nav.voirFil = !S.nav.voirFil; rendre(); break;
      case 'changer-phase': feuillePhase(iid); break;
      case 'statut': {
        var st = b.getAttribute('data-statut');
        maj(cheminInst(iid), { statut: st, modifPar: S.moi || null, modifLe: Date.now() }).catch(silence);
        toast(st === 'CLOTURE' ? 'Installation clôturée' : 'Installation rouverte', 'ok');
        break;
      }
      case 'supprimer-installation': feuilleSuppressionInstallation(iid); break;
    }
  });

  /* ============================= Démarrage ============================= */
  function configValide(c) {
    return !!(c && c.apiKey && c.projectId && c.appId && !/REMPLIR/i.test(c.apiKey) && !/^votre-projet$/.test(c.projectId));
  }
  function demarrer() {
    try {
      var nav = JSON.parse(lireLocal('cp_nav') || 'null');
      if (nav && nav.ecran === 'installation' && nav.iid) { S.nav.ecran = 'installation'; S.nav.iid = nav.iid; S.nav.onglet = nav.onglet || 'journee'; }
    } catch (e) { /* navigation par défaut */ }
    S.nav.jour = aujourdhui();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { /* sans hors connexion */ });
    rendre();
    var cfg = window.CONFIG_FIREBASE;
    if (!configValide(cfg)) { S.etat = 'config'; rendre(); return; }
    Promise.all([import(CDN_FIREBASE + 'firebase-app.js'), import(CDN_FIREBASE + 'firebase-auth.js'), import(CDN_FIREBASE + 'firebase-firestore.js')])
      .then(function (m) {
        S.fb = { app: m[0], auth: m[1], fs: m[2] };
        var appFb = S.fb.app.initializeApp(cfg);
        S.auth = S.fb.auth.getAuth(appFb);
        S.auth.languageCode = 'fr';
        var fs;
        try {
          /* cache local persistant : l'appli reste utilisable sans réseau, sur plusieurs onglets */
          fs = S.fb.fs.initializeFirestore(appFb, {
            ignoreUndefinedProperties: true,
            localCache: S.fb.fs.persistentLocalCache({ tabManager: S.fb.fs.persistentMultipleTabManager() })
          });
        } catch (e) {
          fs = S.fb.fs.initializeFirestore(appFb, { ignoreUndefinedProperties: true });
        }
        S.db = adaptateur(S.fb.fs, fs);
        S.etat = 'connexion';
        S.fb.auth.onAuthStateChanged(S.auth, surUtilisateur);
      }, function () { S.etat = 'cdn'; rendre(); });
    /* les heures relatives (« depuis 2 h ») se rafraîchissent chaque minute */
    setInterval(function () { if (S.etat === 'ok' && !document.hidden) planifierRendu(); }, 60000);
  }
  demarrer();
})();
