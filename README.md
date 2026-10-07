# Chantier partagé

**Suivi d'installation machine en équipe** : les tâches du jour à cocher, les points bloquants, le point du soir. Toute l'équipe voit et modifie les mêmes données, en direct, depuis son téléphone.

Inspirée de BFR-Chantier (même charte, mêmes phases, mêmes gravités de blocage), avec une différence de fond : **les données sont partagées** entre plusieurs personnes, par une base Firebase.

- Application web installable sur l'écran d'accueil (iPhone et Android), hébergée sur **GitHub Pages**.
- Données synchronisées en direct par **Firebase** (offre gratuite).
- **Fonctionne hors connexion** une fois ouverte une première fois : les changements partent dès que le réseau revient.
- **Accès par e-mail** : seules les adresses que vous autorisez entrent, après validation de leur adresse.

---

## Ce que fait l'application

| Écran | Contenu |
|---|---|
| **Accueil** | Les installations en cours et prévues : avancement, tâches du jour faites, blocages ouverts. |
| **Journée** | Blocages ouverts et tâches non faites la veille en tête. On coche d'un geste (prénom et heure affichés, « Annuler » quelques secondes), on prend une tâche « En cours » pour éviter les doublons. Fil horodaté de qui a fait quoi. Prévu du lendemain. |
| **Blocages** | Gravité 1 bloque l'équipe, 2 ralentit, 3 gêne. Qui peut débloquer, échéance, tâche concernée, fil de suivi, levée avec la solution. |
| **Tâches** | Tâches types de la phase proposées à la création, saisie une par ligne, planification au jour, avancement global. |
| **Fiche** | Client, machine, phase (installation mécanique → mise en route → accompagnement), contraintes de site, intervenants. |
| **Point du jour** | Le bilan prêt à copier ou à ouvrir dans la messagerie : fait, reste à faire, blocages, prévu demain, synthèse. Puis clôture de la journée. |

---

## Mise en ligne, pas à pas (environ 20 minutes)

Il faut un **compte Google** (pour Firebase) et un **compte GitHub**.

### 1. Créer le projet Firebase

1. Ouvrir **https://console.firebase.google.com** et se connecter avec le compte Google.
2. **Créer un projet** → nom au choix (par exemple `chantier-partage`) → Google Analytics n'est **pas** nécessaire.
3. Rester sur l'offre gratuite **Spark** : aucune carte bancaire n'est demandée.

### 2. Activer la connexion par e-mail

1. Dans le menu de gauche : **Authentication** → **Commencer**.
2. Onglet **Méthode de connexion** (*Sign-in method*) → **Adresse e-mail/Mot de passe** → **Activer** (le premier interrupteur seulement, pas « Lien envoyé par e-mail ») → **Enregistrer**.

### 3. Créer la base et poser les règles de sécurité

1. Menu de gauche : **Firestore Database** → **Créer une base de données**.
   - Si la console demande l'édition : **Standard** (c'est elle qui a l'offre gratuite, le direct et le hors connexion).
   - Emplacement : en Europe, par exemple `europe-west9 (Paris)` ou `eur3`. **Ce choix est définitif.**
   - Démarrer en **mode production**.
2. Onglet **Règles** : effacer tout, coller le contenu du fichier **`firestore.rules`** de ce dépôt.
3. **Avant de publier**, remplacer dans la fonction `proprietaire()` l'adresse `votre.adresse@exemple.fr` par **votre propre adresse**, en minuscules. C'est elle qui aura toujours accès et qui pourra ajouter les autres.
4. **Publier**.

> Ne remettez pas votre adresse dans le fichier `firestore.rules` du dépôt GitHub si le dépôt est public : la version qui compte est celle publiée dans la console Firebase.

### 4. Déclarer l'application Web et copier sa configuration

1. Roue dentée en haut à gauche → **Paramètres du projet** → onglet **Général**.
2. Dans **Vos applications**, cliquer l'icône **Web** (`</>`) → donner un nom → **ne pas** cocher Firebase Hosting → **Enregistrer l'application**.
3. Firebase affiche un bloc `const firebaseConfig = { ... }`. Recopier les six valeurs (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) dans le fichier **`config-firebase.js`**, à la place des valeurs d'exemple.

> Ces valeurs ne sont pas secrètes : elles disent seulement à quel projet l'appli se connecte. La protection des données repose sur les règles (étape 3) et sur la liste des adresses autorisées.

### 5. Publier sur GitHub Pages

1. Sur GitHub : **New repository** → nom (par exemple `chantier-partage`) → **Public** (GitHub Pages gratuit l'exige) → **Create repository**.
2. **Add file → Upload files** → glisser **tout le contenu** du dossier décompressé (les fichiers **et** le dossier `icons`), pas le dossier lui-même → **Commit changes**.
3. **Settings → Pages** → *Source* : **Deploy from a branch** → branche **`main`**, dossier **`/ (root)`** → **Save**.
4. Une à deux minutes plus tard, l'adresse s'affiche en haut de la page : `https://<votre-compte>.github.io/<nom-du-dépôt>/`.

### 6. Autoriser l'adresse GitHub dans Firebase

**Authentication → Paramètres** (*Settings*) → **Domaines autorisés** → **Ajouter un domaine** → `<votre-compte>.github.io`.

Sans cela, l'e-mail de validation part quand même, mais sans le bouton qui ramène vers l'appli.

### 7. Premier lancement : vous devenez administrateur

1. Ouvrir l'adresse GitHub Pages sur le téléphone.
2. **Créer mon compte** avec **l'adresse mise dans les règles** (étape 3) et un mot de passe propre à cette appli.
3. Ouvrir l'e-mail reçu, cliquer le lien de validation, revenir dans l'appli → **J'ai validé mon adresse**.
4. L'appli vous inscrit automatiquement comme **administrateur** et vous demande votre prénom et votre métier.
5. Installer l'appli sur l'écran d'accueil (voir `INSTALLATION-COLLEGUES.md`).

### 8. Ajouter des collègues

1. **Menu → Accès à l'appli** → saisir l'adresse e-mail du collègue → rôle **Membre** (ou **Administrateur** pour qu'il puisse, lui aussi, ajouter des gens) → **Ajouter**.
2. **Copier** le lien de l'appli (même écran) et le lui envoyer, avec le fichier `INSTALLATION-COLLEGUES.md`.
3. Il crée son compte **avec cette adresse exacte**, valide l'e-mail reçu, et arrive directement sur les installations.

Pour retirer quelqu'un : même écran → **Retirer** → **Confirmer**. Il perd l'accès aussitôt.

---

## Mettre à jour l'application

1. Modifier les fichiers, puis les renvoyer sur GitHub (**Add file → Upload files**, en remplaçant les anciens).
2. Dans **`sw.js`**, augmenter le numéro de `CACHE` (par exemple `chantier-partage-1.0.1`) : les anciens fichiers en cache sont alors nettoyés.
3. Chaque téléphone prend la nouvelle version **à sa prochaine ouverture avec du réseau**. Si un téléphone reste en retard, le rouvrir une seconde fois suffit. Les données ne sont pas touchées : elles sont dans Firebase.

Le numéro de version en cours s'affiche en bas du **Menu**.

---

## Données, sécurité, gratuité

- **Où sont les données ?** Dans la base Firestore de votre projet Firebase (Google), dans la région choisie à l'étape 3. Contrairement à BFR-Report et BFR-Chantier, elles ne restent pas que dans les téléphones : c'est ce qui permet le partage. Chaque téléphone en garde une copie pour travailler hors connexion.
- **Qui y accède ?** Uniquement les comptes dont l'adresse e-mail est **validée** et **présente dans la liste « membres »** (plus le propriétaire désigné dans les règles). C'est vérifié par Firebase, côté serveur, à chaque lecture et chaque écriture.
- **Mots de passe** : gérés par Firebase Authentication, jamais stockés dans l'appli. Conseillez à chacun un mot de passe propre à cette appli. « Mot de passe oublié » envoie un lien de réinitialisation.
- **Ce qu'il faut éviter d'y mettre** : tout ce que votre entreprise ne veut pas voir hors de ses murs. Vérifiez avec elle ce qui peut y figurer (noms de clients, contraintes de site, etc.).
- **Gratuité** : l'offre Spark de Firestore inclut chaque jour 50 000 lectures, 20 000 écritures et 20 000 suppressions, plus 1 Gio de stockage. C'est très large pour une équipe de chantier. Si une limite est atteinte, l'appli le signale et tout reprend le lendemain. Ne passez pas à l'offre payante Blaze sans le vouloir.
- **Optionnel, pour aller plus loin** : dans la console Google Cloud (*API et services → Identifiants*), restreindre la clé d'API aux sites `https://<votre-compte>.github.io/*` et `https://<projet>.firebaseapp.com/*`.

---

## Dépannage

| Ce que vous voyez | Cause probable et solution |
|---|---|
| « Configuration Firebase à compléter » | `config-firebase.js` contient encore les valeurs d'exemple (étape 4). |
| « Firebase n'a pas pu être chargé » | Pas de réseau à la toute première ouverture. Ouvrir une fois avec internet. |
| « La connexion par e-mail n'est pas activée dans Firebase » | Étape 2 à faire. |
| Vous êtes le propriétaire et l'appli affiche « Accès en attente » | L'adresse dans la fonction `proprietaire()` des règles n'est pas la vôtre, ou les règles n'ont pas été publiées (étape 3). Corriger, publier, puis **Réessayer**. |
| Un collègue voit « Accès en attente » | Son adresse n'est pas dans **Menu → Accès à l'appli**, ou il a créé son compte avec une autre adresse. |
| L'e-mail de validation n'arrive pas | Regarder dans les courriers indésirables, puis **Renvoyer l'e-mail**. Les modèles d'e-mail se règlent dans **Authentication → Modèles**. |
| « J'ai validé » ne passe pas | Le lien de l'e-mail n'a pas encore été ouvert, ou il a expiré : **Renvoyer l'e-mail**. |
| « Limite gratuite de Firebase atteinte » | Quota du jour dépassé : tout reprend le lendemain. |
| Le téléphone affiche une ancienne version | Le rouvrir avec du réseau, une seconde fois si besoin. |

---

## Structure du dépôt

```
index.html              la page de l'application
style.css               charte (cyan #06baf2, bleu nuit #332e72, bleu ardoise, rouge sourd)
app.js                  l'application : écrans, connexion, accès, synchronisation
config-firebase.js      ← la configuration de VOTRE projet Firebase (étape 4)
firestore.rules         règles de sécurité à coller dans la console Firebase (étape 3)
sw.js                   fonctionnement hors connexion (service worker)
manifest.json           installation sur l'écran d'accueil
icons/                  icônes de l'application
INSTALLATION-COLLEGUES.md   le guide à envoyer aux collègues
.nojekyll               dit à GitHub Pages de servir les fichiers tels quels (facultatif)
```

Organisation de la base Firestore :

```
membres/{adresse e-mail}          adresses autorisées, rôle membre ou admin
equipe/{identifiant du compte}    prénom et métier de chacun
installations/{id}                fiche de l'installation
  taches/{id}                     tâches : jour prévu, état, qui, quand
  blocages/{id}                   points bloquants et leur suivi
  jours/{AAAA-MM-JJ}              synthèse et clôture de la journée
```

Aucune dépendance à installer : Firebase (version **12.19.0**) est chargé depuis le site officiel de Google (`www.gstatic.com/firebasejs/`), puis gardé en cache pour le hors connexion. Pour changer de version, modifier `VERSION_FIREBASE` en tête de `app.js`.
