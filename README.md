# Chantier partagé, version sans serveur

**Suivi d'installation machine en équipe.** On coche les tâches du jour, on signale les points bloquants et, le soir, chacun envoie son avancement. Le chef de chantier rassemble tout et envoie le **point du soir en PDF**.

Comme BFR-Report et BFR-Chantier, **tout reste dans le téléphone**. Il n'y a ni base de données, ni compte, ni serveur. L'équipe se met à jour en **s'échangeant des fichiers ou des messages** (WhatsApp, Teams, e-mail, AirDrop…).

- C'est une application web installable sur l'écran d'accueil (iPhone et Android), hébergée gratuitement sur **GitHub Pages**.
- Elle **fonctionne sans réseau** après une première ouverture.
- Elle reprend la charte, les phases, les gravités de blocage et le **moteur PDF de BFR-Chantier**.

---

## Le principe en une minute

1. **Le chef de chantier crée le projet** et l'envoie au groupe de l'équipe (onglet **Équipe**, **Envoyer le projet à l'équipe**).
2. **Chacun l'importe** avec le bouton **Recevoir** et choisit son rôle : mécanicien, câbleur, automaticien… Les tâches de son métier s'affichent en premier.
3. **Dans la journée**, chacun coche ses tâches, prend une tâche « En cours » et signale ce qui bloque, en indiquant **qui peut le lever**. Tout cela marche sans réseau.
4. **Le soir**, chacun touche **Mon avancement**. L'appli choisit le destinataire selon la règle ci-dessous.
5. **Le chef importe les avancements**, plusieurs d'un coup s'il le veut. Il ajoute sa synthèse, envoie le **point du soir en PDF**, puis **renvoie le projet à jour** à l'équipe. Chacun repart ainsi le lendemain de la même base.

---

## La règle d'envoi du soir

| Situation de la personne qui envoie | À | Copie |
|---|---|---|
| Aucun point bloquant ouvert à son nom | Chef de chantier | — |
| Blocage que seul le **chef d'atelier** peut lever | Chef d'atelier | Chef de chantier |
| Blocage pour le **BE électrotechnique** | Responsable BE électrotechnique | Chef de chantier |
| Blocage pour le **bureau automatisme** | Chef bureau automatisme | Chef de chantier |
| Blocage **client**, **fournisseur** ou **chargé d'affaire** | Chargé d'affaire, qui fait le lien | Chef de chantier |
| Blocage **autre corps d'état** ou **chef de chantier** | Chef de chantier | — |

- **Le chef en copie** est activé par défaut, car il a besoin de tous les avancements pour son point du soir. Il peut couper cette copie : onglet **Équipe**, case **Mettre le chef en copie…**. Le réglage part avec le projet et s'applique chez chacun après le prochain échange.
- **Les adresses des responsables** sont saisies par le chef dans **Équipe**, **Responsables**, **Modifier**. Elles voyagent avec le projet. Si un responsable rejoint lui-même le projet, l'adresse qu'il saisit passe en priorité.
- Dès que le blocage est **levé**, l'avancement repart au chef de chantier seul.
- L'écran d'envoi montre toujours **À** et **Copie** avant d'envoyer. Le bouton **Copier les adresses** permet de les coller dans WhatsApp, Teams ou la messagerie.

---

## Comment voyagent les données

**Ce qui part.** Chaque envoi contient **le projet complet tel que le téléphone le connaît**. Il prend la forme d'un fichier `.txt` lisible : en tête, qui envoie, quand et un résumé, puis un **code** qui contient tout le projet compressé. Le format `.txt` a une raison : Chrome sur Android refuse de partager les fichiers `.json`.

**À l'import, l'appli fusionne champ par champ** et garde la modification la plus récente. Conséquences :
- l'ordre des imports n'a pas d'importance, et importer deux fois le même fichier ne fait rien ;
- un fichier perdu n'a rien de grave, car le suivant contient tout ;
- deux personnes qui modifient des choses différentes ne se gênent jamais. Si elles modifient le même champ, la plus récente l'emporte.

**Trois façons d'envoyer**, au choix :
1. **Partager le fichier** : le partage du téléphone s'ouvre (WhatsApp, Teams, Mail, AirDrop…).
2. **E-mail** : la messagerie s'ouvre avec À, Copie et Objet déjà remplis. Le message contient le résumé et le code.
3. **Message avec le code** (« Autre façon ») : on copie ou on partage un texte, utile quand une messagerie refuse les pièces jointes.

**Deux façons de recevoir**, toujours par le bouton **Recevoir** :
1. **Choisir un ou plusieurs fichiers**. Sur iPhone, enregistrez d'abord la pièce jointe dans **Fichiers**.
2. **Coller un ou plusieurs messages** avec le bouton **Coller**. Si la messagerie permet de copier plusieurs messages d'un coup (WhatsApp sur Android, par exemple), le chef les colle ensemble et tous les avancements s'importent en une fois.

---

## Les rôles

| Rôle | Ce qui change dans l'appli |
|---|---|
| **Chef de chantier** | Il crée et envoie le projet, et voit qui a envoyé son avancement. Il prépare et envoie le **point du soir** en PDF. |
| **Mécanicien, Câbleur, Automaticien** | Le filtre **Mes tâches** montre les tâches de son métier et les tâches communes. **Toutes** montre celles de l'équipe. Le soir : **Mon avancement**. |
| **Chef d'atelier, Responsable BE électrotechnique, Chef bureau automatisme, Chargé d'affaire** | Ils reçoivent les avancements bloqués et le point du soir. Ils peuvent aussi rejoindre le projet pour le consulter et lever les blocages. |
| **Autre** | Il voit tout, sans filtre de métier. |

Chacun peut changer de rôle, de prénom ou d'adresse : onglet **Équipe**, **Vous dans ce projet**.

---

## Le point du soir

C'est une page A4 au style BFR-Chantier :
- un bandeau bleu nuit avec la date, l'affaire, la phase et le numéro de jour (J n / N) ;
- quatre indicateurs : avancement du projet, tâches du jour faites, blocages ouverts, avancements reçus avec le nom de ceux qui manquent ;
- **Fait aujourd'hui**, par personne et avec l'heure ;
- **Reste à faire** ;
- **Points bloquants**, avec la gravité, qui peut lever, l'échéance, depuis quand et le dernier suivi ;
- **Prévu** le jour ouvré suivant ;
- **Équipe et avancements du soir** ;
- **Synthèse du chef de chantier**.

**Aperçu du PDF** le montre à l'écran avant l'envoi. Les destinataires proposés sont les responsables dont l'adresse est connue, en commençant par ceux qui doivent lever un blocage ouvert. Le document est **interne** : il n'est pas prévu pour le client.

---

## Mise en ligne sur GitHub Pages (10 minutes)

Il faut seulement un **compte GitHub**. Il n'y a ni Firebase ni configuration à faire.

1. Sur GitHub, ouvrez **New repository**. Donnez-lui un nom (par exemple `chantier-equipe`), choisissez **Public** (GitHub Pages gratuit l'exige), puis **Create repository**.
2. Ouvrez **Add file**, **Upload files**. Glissez **tout le contenu** du dossier décompressé : les fichiers, le dossier `icons` et le fichier `.nojekyll` (voir la note). Ne glissez pas le dossier lui-même. Terminez par **Commit changes**.
3. Ouvrez **Settings**, **Pages**. Dans *Source*, choisissez **Deploy from a branch**, puis la branche **`main`** et le dossier **`/ (root)`**. Cliquez **Save**.
4. Une à deux minutes plus tard, l'adresse s'affiche : `https://<votre-compte>.github.io/<nom-du-dépôt>/`. Envoyez-la à l'équipe avec le fichier `INSTALLATION-COLLEGUES.md`.

> **Note.** Sur Mac et Windows, les fichiers dont le nom commence par un point sont masqués. Le fichier `.nojekyll` n'est pas indispensable : sans lui, GitHub Pages fonctionne aussi pour cette appli.

> **Le dépôt est public, mais pas les données.** Seule l'application est sur GitHub. Les projets restent dans les téléphones et ne vont que là où vous les envoyez.

---

## Mettre à jour l'application

1. Renvoyez les fichiers modifiés sur GitHub (**Add file**, **Upload files**, en remplaçant les anciens).
2. Dans **`sw.js`**, augmentez le numéro de `CACHE` (par exemple `chantier-partage-local-2.0.1`) pour faire le ménage dans les anciens fichiers.
3. Chaque téléphone prend la nouvelle version **à sa prochaine ouverture avec du réseau**. Les projets ne sont pas touchés.

Le numéro de version s'affiche en bas du **Menu**.

---

## Données et confidentialité

- **Où sont les données ?** Dans chaque téléphone, dans la base locale du navigateur (IndexedDB). Elles n'en sortent que dans les fichiers ou les messages que vous envoyez.
- **Par où passent les envois ?** Par la messagerie choisie : WhatsApp, Teams, e-mail… Vérifiez avec l'entreprise ce qui peut y transiter (noms de clients, contraintes de site, etc.).
- **Aucun compte, aucun suivi.** La seule ressource extérieure est la police de caractères (Google Fonts). Pour s'en passer, retirez les trois lignes `fonts.googleapis.com` / `fonts.gstatic.com` de `index.html`. L'appli prendra alors la police du téléphone.
- **Sauvegarde** : chaque fichier envoyé ou reçu est une copie complète du projet. L'onglet **Fiche**, bouton **Sauvegarder**, enregistre aussi une sauvegarde `.json` sur le téléphone. Pour restaurer, utilisez **Recevoir** avec n'importe quel fichier récent du projet.

---

## Limites à connaître

- **Pas de direct.** On voit le travail des autres à chaque import. C'est le prix du « sans serveur ».
- **L'heure du téléphone compte un peu.** Une modification faite après avoir reçu celle d'un collègue l'emporte toujours, même si les deux téléphones ne sont pas à la même heure. En revanche, les heures affichées (« faite à 14:32 ») viennent de chaque téléphone. Gardez l'heure automatique partout.
- **iPhone : Safari et l'icône de l'écran d'accueil ont chacun leurs données.** Utilisez toujours la même entrée, l'icône. L'appli fonctionne aussi en navigation normale, mais **pas en navigation privée**, où rien n'est gardé.
- **Retirer un projet** d'un téléphone (onglet Fiche) ne le retire pas chez les autres. **Supprimer une tâche ou un blocage**, en revanche, se propage à tous au fil des échanges.
- **La taille du code grandit avec le projet** : environ 2 300 caractères pour 15 tâches, quelques dizaines de milliers pour un gros projet. Au-delà, préférez le fichier au message, car les SMS sont trop courts.

---

## Dépannage

| Ce que vous voyez | Cause probable et solution |
|---|---|
| « Ce fichier n'est pas un fichier de Chantier partagé » | Mauvais fichier choisi (un PDF, une photo…). Choisissez le `.txt` reçu. |
| « Code abîmé » ou « Un code est incomplet » | Message coupé par la messagerie (SMS notamment). Envoyez plutôt le fichier, ou copiez le message en entier. |
| « Ce fichier vient d'une version plus récente de l'appli » | Rouvrez l'appli avec du réseau pour qu'elle se mette à jour. |
| **Partager le fichier** télécharge au lieu d'ouvrir le partage | Le navigateur ne sait pas partager (c'est le cas de certains ordinateurs). Joignez le fichier téléchargé à votre message. |
| Le bouton **Coller** ne fait rien | Le téléphone a refusé l'accès au presse-papiers. Appuyez longuement dans la zone de texte, puis **Coller**. |
| Un collègue apparaît « Rien reçu » | Son avancement du jour n'a pas encore été importé sur ce téléphone. |
| Les projets ont disparu | Vous êtes peut-être en navigation privée, dans un autre navigateur, ou dans Safari au lieu de l'icône. Sinon, réimportez n'importe quel fichier récent du projet. |

---

## Fichiers du dépôt

| Fichier | Rôle |
|---|---|
| `index.html` | La page de l'application |
| `style.css` | Charte BFR (cyan, bleu nuit, Poppins et Open Sans), thème sombre automatique |
| `modele.js` | Le cœur : projets, fusion champ par champ, règle d'envoi, textes, codes |
| `pdf.js` | Moteur PDF de BFR-Chantier, repris tel quel |
| `rapport.js` | Mise en page du point du soir (PDF et aperçu à l'écran) |
| `app.js` | Les écrans et les échanges |
| `sw.js`, `manifest.json`, `icons/` | Installation sur l'écran d'accueil et fonctionnement hors connexion |
| `INSTALLATION-COLLEGUES.md` | Le mode d'emploi à envoyer à l'équipe |
