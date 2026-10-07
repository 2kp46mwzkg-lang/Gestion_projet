/* =========================================================================
   CHANTIER PARTAGÉ — MODÈLE (version sans serveur)
   -------------------------------------------------------------------------
   Fonctions pures : aucune dépendance au navigateur, aucune écriture.
   Testables en Node (module.exports) comme dans la page (window.Modele).

   Principe de l'échange sans serveur
   ----------------------------------
   Chaque téléphone garde sa copie du projet. Chaque valeur est rangée avec
   l'heure à laquelle elle a été modifiée (« horodatage par champ »). Quand
   on reçoit l'avancement d'un collègue, on compare champ par champ : la
   valeur la plus récente l'emporte. Conséquences :
     · l'ordre d'import n'a pas d'importance ;
     · importer deux fois le même fichier ne change rien ;
     · deux personnes qui modifient des champs différents d'une même tâche
       ne s'écrasent pas.
   Une entité : { id, v: { champ: valeur }, t: { champ: horodatage } }.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ============================ Référentiels =========================== */
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
    { id: 'PREVU', libelle: 'Prévu', cls: 'neutre' },
    { id: 'EN_COURS', libelle: 'En cours', cls: 'cyan' },
    { id: 'ATTENTE', libelle: 'En attente', cls: 'surv' },
    { id: 'SUSPENDU', libelle: 'Suspendu', cls: 'def' },
    { id: 'RECEPTIONNE', libelle: 'Réceptionné', cls: 'ok' },
    { id: 'CLOTURE', libelle: 'Clôturé', cls: 'nuit' }
  ];
  var GRAVITES = [
    { id: 1, libelle: "1 · Bloque l'équipe", court: 'Bloque', cls: 'def' },
    { id: 2, libelle: '2 · Ralentit', court: 'Ralentit', cls: 'surv' },
    { id: 3, libelle: '3 · Gêne', court: 'Gêne', cls: 'neutre' }
  ];
  /* Métiers des tâches */
  var METIERS = [
    { id: 'MECA', libelle: 'Mécanique', icone: 'cle' },
    { id: 'ELEC', libelle: 'Électrique', icone: 'eclaire' },
    { id: 'AUTO', libelle: 'Automatisme', icone: 'automate' },
    { id: 'CLIENT', libelle: 'Avec le client', icone: 'reunion' }
  ];
  /* Rôles que chacun s'attribue en rejoignant un projet.
     metier : les tâches présentées en premier (« Mes tâches »).
     responsable : rôle d'encadrement, destinataire possible des avancements. */
  var ROLES = [
    { id: 'CHEF', libelle: 'Chef de chantier', metier: null },
    { id: 'MECA', libelle: 'Mécanicien', metier: 'MECA' },
    { id: 'CABLEUR', libelle: 'Câbleur', metier: 'ELEC' },
    { id: 'AUTO', libelle: 'Automaticien', metier: 'AUTO' },
    { id: 'ATELIER', libelle: "Chef d'atelier", responsable: true },
    { id: 'BE_ELECTRO', libelle: 'Responsable BE électrotechnique', responsable: true },
    { id: 'BUREAU_AUTO', libelle: 'Chef bureau automatisme', responsable: true },
    { id: 'CHARGE_AFFAIRE', libelle: "Chargé d'affaire", responsable: true },
    { id: 'AUTRE', libelle: 'Autre', metier: null }
  ];
  /* Responsables dont la fiche du projet garde l'adresse (point du soir) */
  var RESPONSABLES = ['ATELIER', 'BE_ELECTRO', 'BUREAU_AUTO', 'CHARGE_AFFAIRE'];
  /* Qui peut lever un blocage → à qui part l'avancement de celui qui l'a signalé.
     Client et fournisseur ne reçoivent pas nos documents internes : c'est le
     chargé d'affaire qui fait le lien ; un autre corps d'état, le chef de chantier. */
  var DEBLOQUEURS = [
    { id: 'CHEF', libelle: 'Chef de chantier', role: 'CHEF' },
    { id: 'ATELIER', libelle: "Chef d'atelier", role: 'ATELIER' },
    { id: 'BE_ELECTRO', libelle: 'Responsable BE électrotechnique', role: 'BE_ELECTRO' },
    { id: 'BUREAU_AUTO', libelle: 'Chef bureau automatisme', role: 'BUREAU_AUTO' },
    { id: 'CHARGE_AFFAIRE', libelle: "Chargé d'affaire", role: 'CHARGE_AFFAIRE' },
    { id: 'CLIENT', libelle: 'Client', role: 'CHARGE_AFFAIRE', via: 'le chargé d\'affaire fait le lien avec le client' },
    { id: 'FOURNISSEUR', libelle: 'Fournisseur', role: 'CHARGE_AFFAIRE', via: 'le chargé d\'affaire fait le lien avec le fournisseur' },
    { id: 'AUTRE_CORPS', libelle: "Autre corps d'état", role: 'CHEF', via: 'le chef de chantier coordonne les autres corps d\'état' }
  ];
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
  /* « Responsable BE électrotechnique » → « responsable BE électrotechnique » (sigles conservés) */
  function roleMin(id) { var l = libelleDe(ROLES, id); return l ? l.charAt(0).toLowerCase() + l.slice(1) : ''; }
  function enTantQue(id) { var l = roleMin(id); return (/^[aeiouyàâéèêîôû]/i.test(l) ? 'en tant qu\'' : 'en tant que ') + l; }

  /* ============================ Utilitaires ============================ */
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
  function relatifJour(s, auj) {
    var a = auj || aujourdhui();
    if (s === a) return "aujourd'hui";
    if (s === ajouterJours(a, 1)) return 'demain';
    if (s === ajouterJours(a, -1)) return 'hier';
    return dateCourte(s);
  }
  function quandCourt(ms, auj) {
    if (!ms) return '';
    var j = jourDe(ms), a = auj || aujourdhui();
    if (j === a) return heure(ms);
    if (j === ajouterJours(a, -1)) return 'hier ' + heure(ms);
    return dateCourte(j) + ' ' + heure(ms);
  }
  function depuis(ms, maintenant) {
    var min = Math.max(0, Math.round(((maintenant || Date.now()) - ms) / 60000));
    if (min < 1) return 'moins d\'une minute';
    if (min < 60) return min + ' min';
    var h = Math.round(min / 60);
    if (h < 24) return h + ' h';
    return Math.round(h / 24) + ' j';
  }
  function pluriel(n, sing, plur) { return n + ' ' + (n > 1 ? (plur || sing + 's') : sing); }
  function normaliser(s) { return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '); }
  function tronquer(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).replace(/\s+$/, '') + '…' : s; }
  function cleUnique(p) { return (p || 'k') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function parOrdre(a, b) { return ((a.ordre || 0) - (b.ordre || 0)) || ((a.creeLe || 0) - (b.creeLe || 0)); }
  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  function emailValide(s) { return /^[^\s@,;]+@[^\s@,;]+\.[A-Za-z]{2,}$/.test(String(s || '').trim()); }
  function metierCatalogue(lib) {
    var n = normaliser(lib);
    for (var p in CATALOGUE) for (var i = 0; i < CATALOGUE[p].length; i++) if (normaliser(CATALOGUE[p][i][0]) === n) return CATALOGUE[p][i][1];
    return '';
  }

  /* Horloge du téléphone, strictement croissante : deux modifications
     faites dans la même milliseconde gardent un ordre. */
  /* Horloge « hybride » : elle ne revient jamais en arrière de ce que le
     téléphone a déjà vu passer. Une modification faite APRÈS avoir reçu celle
     d'un collègue l'emporte donc toujours sur elle, même si l'heure des deux
     téléphones diffère. Un téléphone très en avance (plus d'un jour) n'entraîne
     pas les autres. */
  var dernierTic = 0;
  function horloge() { var t = Date.now(); dernierTic = t > dernierTic ? t : dernierTic + 1; return dernierTic; }
  function observer(ts) {
    var plafond = Date.now() + 864e5;
    if (typeof ts === 'number' && isFinite(ts) && ts > dernierTic) dernierTic = Math.min(ts, plafond);
  }
  function tsMax(p) {
    var m = 0;
    function voir(e) { if (e && e.t) Object.keys(e.t).forEach(function (k) { if (e.t[k] > m) m = e.t[k]; }); }
    if (p) { voir(p.fiche); ['membres', 'taches', 'blocages', 'jours'].forEach(function (c) { Object.keys(p[c] || {}).forEach(function (id) { voir(p[c][id]); }); }); }
    return m;
  }

  /* ============================= Entités =============================== */
  function entite(id, valeurs, ts) {
    var e = { id: id, v: {}, t: {} };
    Object.keys(valeurs || {}).forEach(function (k) { e.v[k] = clone(valeurs[k]); e.t[k] = ts; });
    return e;
  }
  /* Écrit des champs (en place) avec l'horodatage donné */
  function ecrire(e, changements, ts) {
    Object.keys(changements).forEach(function (k) { e.v[k] = clone(changements[k]); e.t[k] = ts; });
    return e;
  }
  function egal(a, b) { return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b); }
  /* Fusion champ par champ : la valeur la plus récente l'emporte ; à égalité
     d'horodatage, un ordre fixe (texte de la valeur) départage, pour que tous
     les téléphones aboutissent au même résultat. */
  function fusionEntite(a, b) {
    if (!a) return clone(b);
    if (!b) return clone(a);
    var out = { id: a.id || b.id, v: {}, t: {} };
    var cles = {};
    [a.t, b.t, a.v, b.v].forEach(function (o) { Object.keys(o || {}).forEach(function (k) { cles[k] = true; }); });
    Object.keys(cles).sort().forEach(function (k) {
      var ta = (a.t && a.t[k]) || 0, tb = (b.t && b.t[k]) || 0;
      var prendreB;
      if (tb !== ta) prendreB = tb > ta;
      else prendreB = JSON.stringify(b.v[k] === undefined ? null : b.v[k]) > JSON.stringify(a.v[k] === undefined ? null : a.v[k]);
      var src = prendreB ? b : a;
      if (src.v[k] !== undefined) out.v[k] = clone(src.v[k]);
      out.t[k] = Math.max(ta, tb);
    });
    return out;
  }
  function entitesEgales(a, b) {
    if (!a || !b) return a === b;
    var cles = {};
    [a.t, b.t, a.v, b.v].forEach(function (o) { Object.keys(o || {}).forEach(function (k) { cles[k] = true; }); });
    return Object.keys(cles).every(function (k) { return (a.t[k] || 0) === (b.t[k] || 0) && egal(a.v[k], b.v[k]); });
  }
  function derniereModif(e) { var m = 0; Object.keys(e.t || {}).forEach(function (k) { if (e.t[k] > m) m = e.t[k]; }); return m; }

  /* ============================== Projet =============================== */
  var COLLECTIONS = ['membres', 'taches', 'blocages', 'jours'];

  function nouveauProjet(d, moi, ts) {
    var id = cleUnique('pr');
    var fiche = {
      titre: d.titre, affaire: d.affaire || '', client: d.client || '', lieu: d.lieu || '', machine: d.machine || '',
      phase: d.phase || 'INSTALLATION', debut: d.debut || null, duree: d.duree || null, contraintes: d.contraintes || '',
      statut: d.statut || 'EN_COURS', chefId: d.role === 'CHEF' ? moi.id : null, copieChef: true,
      creePar: moi.id, creeLe: ts
    };
    (d.responsables ? Object.keys(d.responsables) : []).forEach(function (r) { fiche['resp:' + r] = d.responsables[r]; });
    fiche['ph:' + cleUnique('p')] = { phase: fiche.phase, le: ts, par: moi.id };
    var p = { id: id, fiche: entite('fiche', fiche, ts), membres: {}, taches: {}, blocages: {}, jours: {} };
    p.membres[moi.id] = entite(moi.id, { prenom: moi.prenom, role: d.role || 'CHEF', email: d.email || '', rejointLe: ts }, ts);
    return p;
  }
  /* Fusionne un projet reçu dans le projet local (ou le crée). Renvoie le
     projet fusionné et ce qui a changé, collection par collection. */
  function fusionnerProjet(local, recu) {
    observer(tsMax(recu));
    var out = local ? clone(local) : { id: recu.id, fiche: null, membres: {}, taches: {}, blocages: {}, jours: {} };
    var stats = { fiche: 0, membres: 0, taches: 0, blocages: 0, jours: 0, total: 0, nouvellesTaches: 0, nouveauxBlocages: 0 };
    if (recu.fiche) {
      var f = fusionEntite(out.fiche, recu.fiche);
      if (!entitesEgales(out.fiche, f)) { stats.fiche = 1; out.fiche = f; }
    }
    COLLECTIONS.forEach(function (col) {
      out[col] = out[col] || {};
      Object.keys(recu[col] || {}).forEach(function (id) {
        var avant = out[col][id];
        var apres = fusionEntite(avant, recu[col][id]);
        if (!entitesEgales(avant, apres)) {
          stats[col]++;
          if (!avant && col === 'taches') stats.nouvellesTaches++;
          if (!avant && col === 'blocages') stats.nouveauxBlocages++;
          out[col][id] = apres;
        }
      });
    });
    stats.total = stats.fiche + stats.membres + stats.taches + stats.blocages + stats.jours;
    return { projet: out, stats: stats };
  }

  /* ----------------------- lectures « à plat » ------------------------- */
  function fiche(p) {
    var v = (p.fiche && p.fiche.v) || {};
    var f = Object.assign({}, v);
    f.responsables = {};
    f.historiquePhases = [];
    Object.keys(v).forEach(function (k) {
      if (k.indexOf('resp:') === 0) f.responsables[k.slice(5)] = v[k] || {};
      if (k.indexOf('ph:') === 0 && v[k]) f.historiquePhases.push(v[k]);
    });
    f.historiquePhases.sort(function (a, b) { return a.le - b.le; });
    return f;
  }
  function membres(p) {
    return Object.keys(p.membres || {}).map(function (id) { return Object.assign({ id: id }, p.membres[id].v); })
      .filter(function (m) { return !m.parti; })
      .sort(function (a, b) { return (a.rejointLe || 0) - (b.rejointLe || 0); });
  }
  function membre(p, id) { var e = p.membres && p.membres[id]; return e ? Object.assign({ id: id }, e.v) : null; }
  function tachePlate(e) {
    var v = e.v, s = v.statut || {};
    return {
      id: e.id, libelle: v.libelle || '', jour: v.jour || null, metier: v.metier || '', note: v.note || '', ordre: v.ordre || 0,
      creePar: v.creePar || null, creeLe: v.creeLe || 0, modifLe: derniereModif(e), supprime: !!v.supprime,
      etat: s.etat || 'A_FAIRE', faitPar: s.faitPar || null, faitLe: s.faitLe || null, enCoursPar: s.enCoursPar || null, enCoursLe: s.enCoursLe || null,
      modifPar: s.par || null
    };
  }
  function taches(p) {
    return Object.keys(p.taches || {}).map(function (id) { return tachePlate(p.taches[id]); }).filter(function (t) { return !t.supprime; });
  }
  function tache(p, id) { var e = p.taches && p.taches[id]; return e ? tachePlate(e) : null; }
  function blocagePlat(e) {
    var v = e.v, s = v.etat || {};
    var suivi = {};
    Object.keys(v).forEach(function (k) { if (k.indexOf('s:') === 0 && v[k]) suivi[k.slice(2)] = v[k]; });
    return {
      id: e.id, description: v.description || '', gravite: +v.gravite || 2, debloqueur: v.debloqueur || 'CHEF',
      echeance: v.echeance || null, tache: v.tache || null, ouvertPar: v.ouvertPar || null, ouvertLe: v.ouvertLe || 0,
      statut: s.statut || 'OUVERT', levePar: s.levePar || null, leveLe: s.leveLe || null, solution: s.solution || '',
      suivi: suivi, supprime: !!v.supprime, modifLe: derniereModif(e)
    };
  }
  function blocages(p) {
    return Object.keys(p.blocages || {}).map(function (id) { return blocagePlat(p.blocages[id]); }).filter(function (b) { return !b.supprime; });
  }
  function blocage(p, id) { var e = p.blocages && p.blocages[id]; return e ? blocagePlat(e) : null; }
  function jour(p, D) {
    var e = p.jours && p.jours[D];
    if (!e) return null;
    var v = e.v, c = v.cloture || {};
    return { id: D, synthese: v.synthese || '', synthesePar: v.synthesePar || null, cloturePar: c.par || null, clotureLe: c.le || null };
  }

  /* ============================== Vues ================================= */
  function vueJour(liste, D, auj) {
    var out = [];
    liste.forEach(function (t) {
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
  function avancement(liste) {
    var total = liste.length, faites = liste.filter(function (t) { return t.etat === 'FAIT'; }).length;
    return { total: total, faites: faites, pct: total ? Math.round(100 * faites / total) : 0 };
  }
  function numeroJour(f, D) {
    if (!f.debut || D < f.debut || estWeekend(D)) return null;
    return joursOuvres(f.debut, D);
  }
  function libelleNumero(f, D) {
    var n = numeroJour(f, D);
    return n ? 'J' + n + (f.duree ? ' / ' + f.duree : '') : '';
  }
  /* « Mes tâches » : celles de mon métier, celles sans métier, et celles que j'ai prises */
  function estMaTache(t, role, moiId) {
    var r = parId(ROLES, role);
    if (!r || !r.metier) return true;
    return !t.metier || t.metier === r.metier || t.enCoursPar === moiId || t.faitPar === moiId;
  }
  function filJour(liste, blocs, jd, D) {
    var ev = [], groupes = new Map();
    liste.forEach(function (t) {
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

  /* ========================== Destinataires ============================
     Avancement du soir : au chef de chantier, sauf si la personne a signalé
     un point bloquant encore ouvert ; il part alors à qui peut le lever,
     avec le chef en copie (réglage de la fiche, activé par défaut). */
  function contactRole(p, role) {
    var f = fiche(p);
    var ms = membres(p).filter(function (m) { return m.role === role; });
    var m = null;
    if (role === 'CHEF' && f.chefId) m = ms.filter(function (x) { return x.id === f.chefId; })[0] || null;
    if (!m) m = ms.filter(function (x) { return emailValide(x.email); })[0] || ms[0] || null;
    var r = f.responsables[role] || {};
    var email = (m && emailValide(m.email) ? m.email : '') || (emailValide(r.email) ? r.email : '');
    return { role: role, libelle: libelleDe(ROLES, role), nom: (m && m.prenom) || r.nom || '', email: email, membreId: m ? m.id : null };
  }
  function destinatairesAvancement(p, moiId) {
    var f = fiche(p);
    var mesBlocages = blocagesOuverts(blocages(p)).filter(function (b) { return b.ouvertPar === moiId; });
    if (!mesBlocages.length) return { motif: 'normal', a: [contactRole(p, 'CHEF')], cc: [], blocages: [] };
    var roles = [], vias = [];
    mesBlocages.forEach(function (b) {
      var d = parId(DEBLOQUEURS, b.debloqueur) || DEBLOQUEURS[0];
      if (roles.indexOf(d.role) === -1) roles.push(d.role);
      if (d.via && vias.indexOf(d.via) === -1) vias.push(d.via);
    });
    var a = roles.map(function (r) { return contactRole(p, r); });
    var cc = f.copieChef !== false && roles.indexOf('CHEF') === -1 ? [contactRole(p, 'CHEF')] : [];
    return { motif: 'blocage', a: a, cc: cc, blocages: mesBlocages, vias: vias };
  }
  /* Point du soir : les responsables de la fiche ; ceux qui peuvent lever un
     blocage ouvert passent en tête. */
  function destinatairesPoint(p) {
    var prioritaires = [];
    blocagesOuverts(blocages(p)).forEach(function (b) {
      var d = parId(DEBLOQUEURS, b.debloqueur);
      if (d && d.role !== 'CHEF' && prioritaires.indexOf(d.role) === -1) prioritaires.push(d.role);
    });
    var ordre = prioritaires.concat(RESPONSABLES.filter(function (r) { return prioritaires.indexOf(r) === -1; }));
    return ordre.map(function (r) { var c = contactRole(p, r); c.prioritaire = prioritaires.indexOf(r) !== -1; return c; });
  }
  function adressesDe(liste) {
    var vus = {};
    return liste.map(function (c) { return c.email; }).filter(function (e) { if (!emailValide(e) || vus[e.toLowerCase()]) return false; vus[e.toLowerCase()] = true; return true; });
  }

  /* ============================== Textes =============================== */
  function nomMembre(p, id) {
    if (!id) return '—';
    var m = membre(p, id);
    return (m && m.prenom) || 'quelqu\'un';
  }
  function enTete(p, D) {
    var f = fiche(p), ph = parId(PHASES, f.phase);
    return [
      [f.titre, f.affaire ? 'affaire ' + f.affaire : '', f.client ? f.client + (f.lieu ? ' (' + f.lieu + ')' : '') : f.lieu].filter(Boolean).join(' · '),
      ['Phase : ' + (ph ? ph.libelle : '—'), libelleNumero(f, D)].filter(Boolean).join(' — ')
    ];
  }
  function ligneBlocage(p, b) {
    var g = parId(GRAVITES, +b.gravite);
    var d = parId(DEBLOQUEURS, b.debloqueur);
    var att = [d ? d.libelle : '', b.echeance ? 'échéance ' + dateCourte(b.echeance) : ''].filter(Boolean).join(', ');
    return '[' + (g ? g.libelle : '') + (b.ouvertLe ? ', depuis ' + depuis(b.ouvertLe) : '') + '] ' + b.description + (att ? ' — attend : ' + att : '') +
      ' (signalé par ' + nomMembre(p, b.ouvertPar) + ')';
  }
  /* Résumé lisible joint à l'avancement d'une personne */
  function texteAvancement(p, moiId, D, auj) {
    var m = membre(p, moiId) || {};
    var liste = taches(p);
    var miennesFaites = liste.filter(function (t) { return t.etat === 'FAIT' && t.faitPar === moiId && jourDe(t.faitLe) === D; }).sort(function (a, b) { return a.faitLe - b.faitLe; });
    var enCours = liste.filter(function (t) { return t.etat === 'EN_COURS' && t.enCoursPar === moiId; });
    var mesBl = blocagesOuverts(blocages(p)).filter(function (b) { return b.ouvertPar === moiId; });
    var L = [];
    L.push('AVANCEMENT — ' + (m.prenom || '') + (m.role ? ' (' + libelleDe(ROLES, m.role) + ')' : '') + ' — ' + majuscule(dateLongue(D)));
    enTete(p, D).forEach(function (l) { L.push(l); });
    L.push('');
    L.push('FAIT (' + miennesFaites.length + ')');
    if (miennesFaites.length) miennesFaites.forEach(function (t) { L.push(' - ' + t.libelle); });
    else L.push(' Aucune tâche cochée.');
    if (enCours.length) { L.push(''); L.push('EN COURS'); enCours.forEach(function (t) { L.push(' - ' + t.libelle); }); }
    L.push('');
    L.push('POINTS BLOQUANTS' + (mesBl.length ? ' (' + mesBl.length + ')' : ''));
    if (mesBl.length) mesBl.forEach(function (b) { L.push(' - ' + ligneBlocage(p, b)); });
    else L.push(' Aucun.');
    return L.join('\n');
  }
  /* Résumé du projet, en tête du fichier envoyé à l'équipe */
  function resumeProjet(p, D) {
    var t = taches(p), av = avancement(t), ouv = blocagesOuverts(blocages(p)), f = fiche(p);
    var L = ['PROJET — ' + (f.titre || '')];
    enTete(p, D).forEach(function (l, i) { if (i) L.push(l); else if (l !== f.titre) L.push(l.replace(f.titre + ' · ', '')); });
    L.push('Avancement : ' + av.faites + ' / ' + av.total + ' tâches (' + av.pct + ' %) · ' + (ouv.length ? pluriel(ouv.length, 'point bloquant ouvert', 'points bloquants ouverts') : 'aucun point bloquant'));
    var ms = membres(p).filter(function (m) { var r = parId(ROLES, m.role); return !(r && r.responsable); });
    if (ms.length) L.push('Équipe : ' + ms.map(function (m) { return (m.prenom || '?') + (m.role ? ' (' + roleMin(m.role) + ')' : ''); }).join(', '));
    return L.join('\n');
  }
  /* Synthèse de l'équipe : qui a envoyé son avancement ce jour-là */
  function etatEnvois(p, D) {
    var f = fiche(p);
    return membres(p).filter(function (m) { var r = parId(ROLES, m.role); return !(r && r.responsable); }).map(function (m) {
      var envoye = m.dernierEnvoi && jourDe(m.dernierEnvoi) === D;
      return { id: m.id, prenom: m.prenom, role: m.role, envoye: !!envoye, le: m.dernierEnvoi || null, estChef: m.role === 'CHEF' || m.id === f.chefId };
    });
  }
  /* Données du point du soir (communes au PDF et au texte) */
  function donneesPoint(p, D, auj, synthese) {
    var f = fiche(p);
    var liste = taches(p), blocs = blocages(p);
    var vj = vueJour(liste, D, auj);
    var faitesParPersonne = new Map();
    vj.liste.filter(function (x) { return x.t.etat === 'FAIT'; }).forEach(function (x) {
      var k = x.t.faitPar || '';
      if (!faitesParPersonne.has(k)) faitesParPersonne.set(k, []);
      faitesParPersonne.get(k).push(x.t);
    });
    var personnes = [];
    faitesParPersonne.forEach(function (l, id) {
      var m = membre(p, id) || {};
      personnes.push({ id: id, prenom: m.prenom || 'quelqu\'un', role: libelleDe(ROLES, m.role), taches: l.sort(function (a, b) { return a.faitLe - b.faitLe; }) });
    });
    personnes.sort(function (a, b) { return b.taches.length - a.taches.length; });
    var reste = vj.liste.filter(function (x) { return x.t.etat !== 'FAIT'; }).map(function (x) {
      var t = x.t;
      return { libelle: t.libelle, enCours: t.etat === 'EN_COURS', par: t.etat === 'EN_COURS' ? nomMembre(p, t.enCoursPar) : '', prevue: x.avant && t.jour ? dateCourte(t.jour) : '' };
    });
    var lendemain = jourOuvreSuivant(D);
    var prevu = liste.filter(function (t) { return t.jour === lendemain && t.etat !== 'FAIT'; }).sort(parOrdre).map(function (t) { return t.libelle; });
    var ouverts = blocagesOuverts(blocs).map(function (b) {
      var d = parId(DEBLOQUEURS, b.debloqueur);
      var suivi = Object.keys(b.suivi || {}).map(function (k) { return b.suivi[k]; }).sort(function (x, y) { return y.le - x.le; })[0] || null;
      return { gravite: +b.gravite, libelleGravite: (parId(GRAVITES, +b.gravite) || {}).libelle || '', description: b.description,
        attend: d ? d.libelle : '', echeance: b.echeance ? dateCourte(b.echeance) : '', echeanceDepassee: !!(b.echeance && b.echeance < auj),
        depuis: b.ouvertLe ? depuis(b.ouvertLe) : '', par: nomMembre(p, b.ouvertPar), dernierSuivi: suivi ? suivi.texte : '' };
    });
    var jd = jour(p, D);
    var envois = etatEnvois(p, D);
    var av = avancement(liste);
    var ph = parId(PHASES, f.phase);
    return {
      fiche: f, D: D, auj: auj, phase: ph ? ph.libelle : '', numero: libelleNumero(f, D),
      avancement: av, jourFaites: vj.faites, jourTotal: vj.total,
      personnes: personnes, reste: reste, ouverts: ouverts, graves: ouverts.filter(function (b) { return b.gravite === 1; }).length,
      lendemain: lendemain, prevu: prevu, envois: envois,
      /* le chef ne s'envoie pas d'avancement : on compte les équipiers */
      envoyes: envois.filter(function (e) { return e.envoye && !e.estChef; }).length, attendus: envois.filter(function (e) { return !e.estChef; }).length,
      synthese: (synthese != null ? synthese : (jd && jd.synthese) || '').trim()
    };
  }
  function texteDuPoint(p, D, auj, synthese) {
    var d = donneesPoint(p, D, auj, synthese);
    var L = [];
    L.push('POINT DU SOIR — ' + majuscule(dateLongue(D)));
    enTete(p, D).forEach(function (l) { L.push(l); });
    L.push('');
    L.push('Avancement : ' + d.jourFaites + ' / ' + d.jourTotal + ' tâches du jour faites · ' + d.avancement.pct + ' % du projet (' + d.avancement.faites + ' / ' + d.avancement.total + ')');
    var manquent = d.envois.filter(function (e) { return !e.envoye && !e.estChef; }).map(function (e) { return e.prenom; });
    if (d.attendus) L.push('Avancements reçus : ' + d.envoyes + ' / ' + d.attendus + (manquent.length ? ' — manque : ' + manquent.join(', ') : ''));
    L.push('');
    L.push('FAIT');
    if (d.personnes.length) d.personnes.forEach(function (pe) {
      L.push(' ' + pe.prenom + (pe.role ? ' (' + pe.role + ')' : '') + ' :');
      pe.taches.forEach(function (t) { L.push('  - ' + t.libelle); });
    });
    else L.push(' Aucune tâche cochée.');
    if (d.reste.length) {
      L.push(''); L.push('RESTE À FAIRE');
      d.reste.forEach(function (r) { L.push(' - ' + r.libelle + (r.enCours ? ' (en cours, ' + r.par + ')' : '') + (r.prevue ? ' (prévue ' + r.prevue + ')' : '')); });
    }
    L.push(''); L.push('POINTS BLOQUANTS' + (d.ouverts.length ? ' (' + d.ouverts.length + ')' : ''));
    if (d.ouverts.length) blocagesOuverts(blocages(p)).forEach(function (b) { L.push(' - ' + ligneBlocage(p, b)); });
    else L.push(' Aucun blocage ouvert.');
    L.push(''); L.push('PRÉVU ' + dateCourte(d.lendemain).toUpperCase());
    if (d.prevu.length) d.prevu.forEach(function (t) { L.push(' - ' + t); }); else L.push(' Rien de planifié pour l\'instant.');
    if (d.synthese) { L.push(''); L.push('SYNTHÈSE'); L.push(d.synthese); }
    return L.join('\n');
  }

  /* ============================== Échange ==============================
     Le fichier d'échange contient le projet complet vu par l'expéditeur :
     une perte de fichier ne fait jamais rien perdre, le suivant rattrape. */
  var FORMAT = 'chantier-partage';
  function versFichier(p, type, moi, ts) {
    return {
      format: FORMAT, version: 1, type: type || 'avancement',
      de: { id: moi.id, prenom: moi.prenom || '', role: (membre(p, moi.id) || {}).role || '' },
      envoyeLe: ts || Date.now(),
      projet: { id: p.id, fiche: p.fiche, membres: p.membres, taches: p.taches, blocages: p.blocages, jours: p.jours }
    };
  }
  function validerFichier(o) {
    if (!o || typeof o !== 'object') return 'Ce fichier n\'est pas un fichier de Chantier partagé.';
    if (o.format !== FORMAT) return 'Ce fichier n\'est pas un fichier de Chantier partagé.';
    if (!o.projet || !o.projet.id || !o.projet.fiche) return 'Ce fichier est incomplet : demandez à son expéditeur de le renvoyer.';
    if (o.version > 1) return 'Ce fichier vient d\'une version plus récente de l\'appli : mettez-la à jour (rouvrez-la avec du réseau).';
    return null;
  }
  /* Fichiers échangés en .txt : Chrome sur Android refuse de partager un .json.
     La sauvegarde (téléchargée, jamais partagée) reste en .json. */
  function nomFichier(p, type, moi, D, ext) {
    var f = fiche(p);
    var base = normaliser(f.affaire || f.titre || 'projet').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'projet';
    var qui = type === 'avancement' && moi && moi.prenom ? '-' + normaliser(moi.prenom).replace(/[^a-z0-9]+/g, '-') : '';
    return (type === 'avancement' ? 'avancement' : type === 'sauvegarde' ? 'sauvegarde' : 'projet') + '-' + base + qui + '-' + D + '.' + (ext || 'txt');
  }
  /* Contenu du fichier (ou du message) échangé : lisible par une personne
     (en-tête, résumé), importable par l'appli (le code, entre ses marqueurs). */
  function texteFichier(obj, resume, code) {
    var f = fiche(obj.projet), de = obj.de || {};
    var quoi = obj.type === 'avancement' ? 'avancement de ' + (de.prenom || '?') + (de.role ? ' (' + roleMin(de.role) + ')' : '') : 'projet envoyé par ' + (de.prenom || '?');
    var D = jourDe(obj.envoyeLe);
    return ['CHANTIER PARTAGÉ — ' + quoi,
      [f.titre || 'Projet', f.affaire ? 'affaire ' + f.affaire : '', majuscule(dateLongue(D)) + ' à ' + heure(obj.envoyeLe)].filter(Boolean).join(' · '),
      'Pour l\'importer : appli Chantier partagé, bouton Recevoir, puis « Choisir des fichiers » ; ou copiez tout ce message et collez-le dans Recevoir.',
      '', resume || '', '',
      '--- code de mise à jour (à ne pas modifier) ---', code, ''].join('\n');
  }

  /* Code texte (à coller dans un message) : CP1. + gzip + base64url + .FIN ;
     CP0. sans compression quand le navigateur ne sait pas compresser.
     Le marqueur de fin permet de retrouver le code au milieu d'un message,
     même si la messagerie l'a coupé sur plusieurs lignes. */
  function versBase64Url(octets) {
    var bin = '', pas = 0x8000;
    for (var i = 0; i < octets.length; i += pas) bin += String.fromCharCode.apply(null, octets.subarray(i, i + pas));
    var b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function depuisBase64Url(s) {
    var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function flux(octets, transformation) {
    var s = new Blob([octets]).stream().pipeThrough(transformation);
    return new Response(s).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  function encoderCode(obj) {
    var octets = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'function') {
      return flux(octets, new CompressionStream('gzip')).then(function (z) { return 'CP1.' + versBase64Url(z) + '.FIN'; }, function () { return 'CP0.' + versBase64Url(octets) + '.FIN'; });
    }
    return Promise.resolve('CP0.' + versBase64Url(octets) + '.FIN');
  }
  function extraireCode(texte) {
    var t = String(texte || '');
    var m = /CP([01])\.([A-Za-z0-9_\-\s]{16,}?)\.FIN/.exec(t);
    if (m) return { compresse: m[1] === '1', corps: m[2].replace(/\s+/g, '') };
    m = /CP([01])\.([A-Za-z0-9_-]{16,})/.exec(t);
    return m ? { compresse: m[1] === '1', corps: m[2] } : null;
  }
  /* Tous les codes d'un texte : le chef peut coller d'un coup plusieurs
     messages copiés dans WhatsApp, chacun avec son code. */
  function extraireCodes(texte) {
    var t = String(texte || ''), out = [], m, re = /CP([01])\.([A-Za-z0-9_\-\s]{16,}?)\.FIN/g;
    while ((m = re.exec(t)) !== null) out.push({ compresse: m[1] === '1', corps: m[2].replace(/\s+/g, '') });
    if (!out.length) { var c = extraireCode(t); if (c) out.push(c); }
    return out;
  }
  function decoderExtrait(c) {
    var octets;
    try { octets = depuisBase64Url(c.corps); } catch (e) { return Promise.reject(new Error('Code abîmé : recopiez-le en entier.')); }
    var etape = c.compresse
      ? (typeof DecompressionStream === 'function' ? flux(octets, new DecompressionStream('gzip')) : Promise.reject(new Error('Ce navigateur ne sait pas lire ce code : importez plutôt le fichier.')))
      : Promise.resolve(octets);
    return etape.then(function (o) { return JSON.parse(new TextDecoder().decode(o)); }, function (e) { throw new Error(e && e.message && /navigateur/.test(e.message) ? e.message : 'Code abîmé : recopiez-le en entier.'); });
  }
  function decoderCode(texte) {
    var c = extraireCode(texte);
    if (!c) return Promise.reject(new Error('Aucun code Chantier partagé dans ce texte.'));
    return decoderExtrait(c);
  }
  function lireTexte(texte) {
    var t = String(texte || '').trim();
    if (t.charAt(0) === '{') {
      try { return Promise.resolve(JSON.parse(t)); } catch (e) { return Promise.reject(new Error('Fichier illisible.')); }
    }
    return decoderCode(t);
  }
  /* Le contenu d'un fichier, ou un message collé pouvant contenir plusieurs
     codes. Résultat : une liste de { o } (valide) ou { erreur }, sans jamais
     échouer en bloc : un code abîmé n'empêche pas d'importer les autres. */
  function lireTextes(texte, estFichier) {
    var t = String(texte || '').trim();
    var pasCP = 'Ce fichier n\'est pas un fichier de Chantier partagé.';
    function verifier(o) { var err = validerFichier(o); return err ? { erreur: err } : { o: o }; }
    function echec(e) { return { erreur: (e && e.message) || 'Illisible.' }; }
    if (t.charAt(0) === '{') return lireTexte(t).then(verifier, function () { return { erreur: estFichier ? pasCP : 'Texte illisible.' }; }).then(function (r) { return [r]; });
    var codes = extraireCodes(t);
    if (!codes.length) {
      var abime = /CP[01]\./.test(t) && !estFichier;
      return Promise.resolve([{ erreur: estFichier ? pasCP : abime ? 'Code incomplet ou abîmé : recopiez le message en entier.' : t ? 'Aucun code Chantier partagé dans ce texte.' : 'Rien à importer.' }]);
    }
    /* un début de code sans fin lisible : on le signale, sans bloquer les autres */
    var debuts = (t.match(/CP[01]\./g) || []).length;
    return Promise.all(codes.map(function (c) { return decoderExtrait(c).then(verifier, echec); })).then(function (liste) {
      for (var i = codes.length; i < debuts; i++) liste.push({ erreur: 'Un code est incomplet ou abîmé : demandez à son expéditeur de le renvoyer.' });
      return liste;
    });
  }

  var Modele = {
    PHASES: PHASES, STATUTS: STATUTS, GRAVITES: GRAVITES, METIERS: METIERS, ROLES: ROLES, RESPONSABLES: RESPONSABLES,
    DEBLOQUEURS: DEBLOQUEURS, ETATS: ETATS, CATALOGUE: CATALOGUE, COLLECTIONS: COLLECTIONS,
    parId: parId, libelleDe: libelleDe, roleMin: roleMin, enTantQue: enTantQue, metierCatalogue: metierCatalogue,
    pad: pad, isoLocal: isoLocal, aujourdhui: aujourdhui, parseIso: parseIso, ajouterJours: ajouterJours, jourDe: jourDe, heure: heure,
    majuscule: majuscule, dateLongue: dateLongue, dateJour: dateJour, dateCourte: dateCourte, estWeekend: estWeekend,
    jourOuvreSuivant: jourOuvreSuivant, joursOuvres: joursOuvres, relatifJour: relatifJour, quandCourt: quandCourt, depuis: depuis,
    pluriel: pluriel, normaliser: normaliser, tronquer: tronquer, cleUnique: cleUnique, parOrdre: parOrdre, clone: clone, emailValide: emailValide,
    horloge: horloge, observer: observer, tsMax: tsMax, entite: entite, ecrire: ecrire, fusionEntite: fusionEntite, entitesEgales: entitesEgales, derniereModif: derniereModif,
    nouveauProjet: nouveauProjet, fusionnerProjet: fusionnerProjet,
    fiche: fiche, membres: membres, membre: membre, taches: taches, tache: tache, blocages: blocages, blocage: blocage, jour: jour,
    vueJour: vueJour, blocagesOuverts: blocagesOuverts, blocagesParTache: blocagesParTache, avancement: avancement,
    numeroJour: numeroJour, libelleNumero: libelleNumero, estMaTache: estMaTache, filJour: filJour,
    contactRole: contactRole, destinatairesAvancement: destinatairesAvancement, destinatairesPoint: destinatairesPoint, adressesDe: adressesDe,
    nomMembre: nomMembre, texteAvancement: texteAvancement, etatEnvois: etatEnvois, donneesPoint: donneesPoint, texteDuPoint: texteDuPoint,
    FORMAT: FORMAT, versFichier: versFichier, validerFichier: validerFichier, nomFichier: nomFichier, texteFichier: texteFichier, resumeProjet: resumeProjet,
    encoderCode: encoderCode, decoderCode: decoderCode, extraireCode: extraireCode, extraireCodes: extraireCodes,
    lireTexte: lireTexte, lireTextes: lireTextes
  };
  global.Modele = Modele;
  if (typeof module !== 'undefined' && module.exports) module.exports = Modele;
})(typeof window !== 'undefined' ? window : globalThis);
