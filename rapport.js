/* =========================================================================
   CHANTIER PARTAGÉ — POINT DU SOIR (PDF et aperçu à l'écran)
   -------------------------------------------------------------------------
   Une seule fonction de dessin, appelée avec Pdf.Doc (le fichier PDF) ou
   Pdf.Apercu (l'aperçu sur des canvas) : l'écran montre exactement le PDF.
   Moteur PDF : pdf.js, repris de BFR-Chantier. Charte BFR : bleu nuit,
   cyan, bleu ardoise, rouge sourd réservé aux blocages graves.
   Document INTERNE : il n'est jamais adressé au client.
   ========================================================================= */
(function (global) {
  'use strict';

  var M = global.Modele;
  var NOIR = [0.14, 0.15, 0.18];
  var GRIS = [0.42, 0.44, 0.51];
  var GRIS_CLAIR = [0.62, 0.64, 0.70];
  var NAVY = [0.20, 0.18, 0.45];          /* #332e72 */
  var BANDEAU_TEXTE = [0.82, 0.84, 0.95];
  var CYAN = [0.02, 0.73, 0.95];          /* #06baf2 */
  var CYAN_ENCRE = [0.04, 0.37, 0.50];    /* #0b5f80 */
  var GRIS_PALE = [0.965, 0.97, 0.98];
  var BORD = [0.87, 0.89, 0.92];
  var ROUGE = [0.71, 0.14, 0.09];         /* #b42318 */
  var ARDOISE = [0.29, 0.31, 0.42];       /* #4a4f6b */
  var NEUTRE = [0.39, 0.45, 0.55];        /* #64748b */
  var VERT = [0.11, 0.53, 0.46];          /* #1c8676 */
  var BLANC = [1, 1, 1];

  function couleurGravite(g) { return g === 1 ? ROUGE : g === 2 ? ARDOISE : NEUTRE; }

  function titreSection(doc, texte) {
    doc.ensure(40);
    doc.rect(doc.margin, doc.y, doc.contentWidth, 15, { fill: NAVY });
    doc.text(texte.toUpperCase(), doc.margin + 7, doc.y + 10.6, { size: 8.3, font: 'F2', color: BLANC });
    doc.y += 15 + 7;
  }
  function texteVide(doc, texte) {
    doc.ensure(16);
    doc.text(texte, doc.margin + 2, doc.y + 9, { size: 8.6, font: 'F3', color: GRIS });
    doc.y += 16;
  }
  /* Puce carrée de couleur + texte qui passe à la ligne */
  function puce(doc, texte, opt) {
    opt = opt || {};
    var retrait = opt.retrait || 0;
    var x = doc.margin + retrait;
    var largeur = doc.contentWidth - retrait - 12 - (opt.droite ? 46 : 0);
    var taille = opt.size || 8.8;
    var h = doc.paragraphHeight(texte, largeur, taille);
    doc.ensure(h + 2);
    doc.rect(x, doc.y + 3.4, 4.4, 4.4, { fill: opt.couleur || CYAN });
    var yDebut = doc.y;
    doc.y = doc.paragraph(texte, x + 11, doc.y, largeur, { size: taille, color: opt.color || NOIR, font: opt.font }) + 1.8;
    if (opt.droite) doc.text(opt.droite, doc.margin + doc.contentWidth, yDebut + taille, { size: 7.8, color: GRIS, align: 'right' });
  }

  function dessiner(doc, d) {
    var W = doc.W, m = doc.margin, cw = doc.contentWidth;
    var f = d.fiche;

    /* --- bandeau ------------------------------------------------------- */
    doc.rect(0, 0, W, 70, { fill: NAVY });
    doc.rect(0, 70, W, 3, { fill: CYAN });
    doc.text('POINT DU SOIR', m, 31, { size: 17, font: 'F2', color: BLANC });
    doc.text(M.majuscule(M.dateLongue(d.D)), m, 49, { size: 9.5, color: BANDEAU_TEXTE });
    if (f.affaire) doc.text('Affaire ' + f.affaire, W - m, 31, { size: 10.5, font: 'F2', color: BLANC, align: 'right' });
    var phase = [d.phase, d.numero].filter(Boolean).join(' · ');
    if (phase) doc.text(phase, W - m, 49, { size: 9, color: BANDEAU_TEXTE, align: 'right' });
    doc.y = 73 + 16;

    /* --- projet ------------------------------------------------------- */
    doc.text(global.Pdf.trunc(f.titre || 'Projet', cw, 13.5, true), m, doc.y + 12, { size: 13.5, font: 'F2', color: NAVY });
    doc.y += 18;
    var sous = [f.client, f.lieu, f.machine].filter(Boolean).join(' · ');
    if (sous) { doc.text(global.Pdf.trunc(sous, cw, 9), m, doc.y + 9, { size: 9, color: GRIS }); doc.y += 14; }
    doc.y += 8;

    /* --- indicateurs --------------------------------------------------- */
    var manque = d.envois.filter(function (e) { return !e.envoye && !e.estChef; }).map(function (e) { return e.prenom; });
    var cases = [
      { v: d.avancement.pct + ' %', l: 'Avancement du projet', s: d.avancement.faites + ' / ' + d.avancement.total + ' tâches', barre: d.avancement.pct },
      { v: d.jourFaites + ' / ' + d.jourTotal, l: 'Tâches du jour faites', s: d.jourTotal ? Math.round(100 * d.jourFaites / d.jourTotal) + ' % de la journée' : 'rien de prévu' },
      { v: String(d.ouverts.length), l: 'Blocages ouverts', s: d.graves ? M.pluriel(d.graves, 'bloque', 'bloquent') + ' l\'équipe' : (d.ouverts.length ? 'aucun bloquant' : 'aucun'), alerte: d.graves > 0 },
      d.attendus ? { v: d.envoyes + ' / ' + d.attendus, l: 'Avancements reçus', s: manque.length ? 'manque : ' + manque.join(', ') : 'équipe au complet', alerte: manque.length > 0, alerteDouce: true }
        : { v: '—', l: 'Avancements reçus', s: 'chef seul sur le projet' }
    ];
    var gap = 8, bw = (cw - 3 * gap) / 4, bh = 56, y0 = doc.y;
    cases.forEach(function (c, i) {
      var x = m + i * (bw + gap);
      doc.rect(x, y0, bw, bh, { fill: GRIS_PALE, stroke: BORD, lineWidth: 0.6 });
      var couleur = c.alerte ? (c.alerteDouce ? ARDOISE : ROUGE) : NAVY;
      doc.text(c.v, x + 8, y0 + 21, { size: 16, font: 'F2', color: couleur });
      doc.text(global.Pdf.trunc(c.l, bw - 14, 7.3), x + 8, y0 + 34, { size: 7.3, color: GRIS });
      doc.text(global.Pdf.trunc(c.s, bw - 14, 7.3, c.alerte), x + 8, y0 + 45, { size: 7.3, color: c.alerte ? couleur : GRIS, font: c.alerte ? 'F2' : 'F1' });
      if (c.barre != null) {
        doc.rect(x + 8, y0 + 50, bw - 16, 2.6, { fill: BORD });
        doc.rect(x + 8, y0 + 50, Math.max(0, (bw - 16) * c.barre / 100), 2.6, { fill: CYAN });
      }
    });
    doc.y = y0 + bh + 16;

    /* --- fait aujourd'hui, par personne -------------------------------- */
    titreSection(doc, 'Fait aujourd\'hui');
    if (!d.personnes.length) texteVide(doc, 'Aucune tâche cochée aujourd\'hui.');
    d.personnes.forEach(function (pe) {
      doc.ensure(30);
      doc.text(pe.prenom + (pe.role ? ' — ' + pe.role : '') + '  (' + pe.taches.length + ')', m, doc.y + 9, { size: 9, font: 'F2', color: NAVY });
      doc.y += 14;
      pe.taches.forEach(function (t) { puce(doc, t.libelle, { couleur: VERT, retrait: 4, droite: t.faitLe ? M.heure(t.faitLe) : '' }); });
      doc.y += 5;
    });

    /* --- reste à faire ------------------------------------------------- */
    if (d.reste.length) {
      titreSection(doc, 'Reste à faire');
      d.reste.forEach(function (r) {
        var info = [];
        if (r.enCours) info.push('en cours, ' + r.par);
        if (r.prevue) info.push('prévue ' + r.prevue);
        puce(doc, r.libelle + (info.length ? ' — ' + info.join(', ') : ''), { couleur: r.enCours ? ARDOISE : GRIS_CLAIR });
      });
      doc.y += 4;
    }

    /* --- points bloquants ---------------------------------------------- */
    titreSection(doc, 'Points bloquants' + (d.ouverts.length ? ' (' + d.ouverts.length + ')' : ''));
    if (!d.ouverts.length) texteVide(doc, 'Aucun blocage ouvert.');
    d.ouverts.forEach(function (b) {
      var largeur = cw - 14;
      var detail = ['Attend : ' + (b.attend || '—'), b.echeance ? 'échéance ' + b.echeance + (b.echeanceDepassee ? ' (dépassée)' : '') : '', b.depuis ? 'depuis ' + b.depuis : '', 'signalé par ' + b.par].filter(Boolean).join(' · ');
      var h = 12 + doc.paragraphHeight(b.description, largeur, 9.2, true) + doc.paragraphHeight(detail, largeur, 7.9) +
        (b.dernierSuivi ? doc.paragraphHeight('Dernier suivi : ' + b.dernierSuivi, largeur, 7.9) : 0) + 6;
      doc.ensure(h);
      var y0b = doc.y, couleur = couleurGravite(b.gravite);
      doc.rect(m, y0b, 3, h - 4, { fill: couleur });
      doc.text(b.libelleGravite, m + 10, y0b + 8, { size: 7.6, font: 'F2', color: couleur });
      var y = doc.paragraph(b.description, m + 10, y0b + 11, largeur, { size: 9.2, font: 'F2', color: NOIR });
      y = doc.paragraph(detail, m + 10, y, largeur, { size: 7.9, color: b.echeanceDepassee ? ROUGE : GRIS });
      if (b.dernierSuivi) y = doc.paragraph('Dernier suivi : ' + b.dernierSuivi, m + 10, y, largeur, { size: 7.9, font: 'F3', color: CYAN_ENCRE });
      doc.y = Math.max(y, y0b + h - 4) + 6;
    });

    /* --- prévu le jour ouvré suivant ----------------------------------- */
    titreSection(doc, 'Prévu ' + M.dateCourte(d.lendemain));
    if (!d.prevu.length) texteVide(doc, 'Rien de planifié pour l\'instant.');
    d.prevu.forEach(function (t) { puce(doc, t, { couleur: CYAN }); });
    doc.y += 4;

    /* --- équipe et avancements ----------------------------------------- */
    titreSection(doc, 'Équipe et avancements du soir');
    if (!d.envois.length) texteVide(doc, 'Personne n\'a encore rejoint le projet.');
    d.envois.forEach(function (e) {
      doc.ensure(15);
      var etat, couleur;
      if (e.estChef) { etat = 'chef de chantier'; couleur = GRIS; }
      else if (e.envoye) { etat = 'avancement reçu ' + M.heure(e.le); couleur = VERT; }
      else { etat = e.le ? 'pas reçu (dernier : ' + M.quandCourt(e.le, d.auj) + ')' : 'pas reçu'; couleur = ARDOISE; }
      doc.text(e.prenom || '—', m + 2, doc.y + 9, { size: 8.8, font: 'F2', color: NOIR });
      doc.text(M.libelleDe(M.ROLES, e.role), m + 130, doc.y + 9, { size: 8.4, color: GRIS });
      doc.text(etat, W - m, doc.y + 9, { size: 8.4, font: 'F2', color: couleur, align: 'right' });
      doc.line(m, doc.y + 13.5, W - m, doc.y + 13.5, { color: BORD, width: 0.5 });
      doc.y += 16;
    });
    doc.y += 4;

    /* --- synthèse ------------------------------------------------------ */
    if (d.synthese) {
      titreSection(doc, 'Synthèse du chef de chantier');
      var hs = doc.paragraphHeight(d.synthese, cw - 4, 9);
      doc.ensure(Math.min(hs, 200));
      doc.y = doc.paragraph(d.synthese, m + 2, doc.y, cw - 4, { size: 9, color: NOIR }) + 4;
    }

    /* --- pied de page --------------------------------------------------- */
    doc.addFooters(function (dd, i, n) {
      dd.line(m, dd.H - 27, dd.W - m, dd.H - 27, { color: BORD, width: 0.6 });
      dd.text('Chantier partagé · document interne · ' + (f.affaire || f.titre || ''), m, dd.H - 15, { size: 7, color: GRIS });
      dd.text('Page ' + i + ' / ' + n, dd.W - m, dd.H - 15, { size: 7, color: GRIS, align: 'right' });
    });
  }

  function pdf(donnees) { var doc = new global.Pdf.Doc({ margin: 34 }); dessiner(doc, donnees); return doc.blob(); }
  function apercu(donnees, echelle) { var ap = new global.Pdf.Apercu({ margin: 34 }); dessiner(ap, donnees); return global.Pdf.rendrePages(ap, { echelle: echelle || 1.5 }); }

  global.Rapport = { pdf: pdf, apercu: apercu, dessiner: dessiner };
})(typeof window !== 'undefined' ? window : globalThis);
