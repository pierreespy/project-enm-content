# Routine bi-quotidienne — génération des éditions

Ce document est le **mode d'emploi de la routine Claude Code Remote** qui publie
**deux fois par jour** l'édition de *Project ENM*. La routine ne fait que
**produire le contenu** ; toute la mécanique (pointeur, archive, index, purge)
est gérée par `scripts/publish.mjs`.

## Les deux créneaux

| Créneau | Déclenchement (cron UTC) | Heure de Paris (été) | Fichier |
| --- | --- | --- | --- |
| **`matin`** | `50 0 * * *` | ~02h50 | `editions/AAAA-MM-JJ-matin.json` |
| **`midi`** | `50 11 * * *` | ~13h50 | `editions/AAAA-MM-JJ-midi.json` |

Une seule routine porte les deux créneaux (cron `50 0,11 * * *`).
**Détermine le créneau à partir de l'heure UTC au moment où tu tournes :**

```bash
date -u +%H   # < 06 → matin, sinon → midi
```

En cas de rattrapage manuel, choisis le créneau qui n'a pas encore été publié
pour la journée (voir `index.json`).

### Ligne éditoriale par créneau

- **Matin** — l'édition de référence de la journée : elle fait le point sur
  l'actualité juridique de la veille et de la nuit (JORF du jour, arrêts
  publiés, doctrine), et donne le ton de la journée.
- **Midi** — l'édition de mise à jour : elle couvre **ce qui est sorti depuis
  l'édition du matin** (décisions du jour, communiqués, débats parlementaires,
  actualité de la matinée). Elle ne rejoue pas le matin : si la journée a été
  calme sur un domaine, va chercher ailleurs (doctrine récente, rapport, étude)
  plutôt que de ré-angler la même info.

Les deux créneaux respectent **le même schéma** : un essentiel, 6 rubriques dans
l'ordre imposé, un mot du jour.

## Fonctionnement « boîte aux lettres »

- **`latest.json`** = l'adresse fixe que l'appli relève à chaque ouverture.
  Elle contient **la dernière édition publiée**, matin ou midi (champ `slot`).
- **`editions/AAAA-MM-JJ-<matin|midi>.json`** = l'archive, deux fichiers par
  jour (15 jours glissants, soit ~30 éditions).
- **`index.json`** = le registre des éditions récentes (date, créneau, titres et
  terme du jour), lu par la routine pour **ne pas se répéter**.
- Si la routine saute un créneau, l'appli continue d'afficher la dernière
  édition valide — rien ne casse.

> Les anciens fichiers `editions/AAAA-MM-JJ.json` (sans créneau, avant le
> passage à deux éditions par jour) restent valides et lisibles jusqu'à leur
> purge automatique ; `slot` y vaut `null`.

## Étapes de la routine (dans cet ordre)

1. **Déterminer le créneau** (`matin` ou `midi`) — voir ci-dessus.
2. **Lire `index.json`** (et au besoin les fichiers `editions/*.json` récents).
   → Repérer ce qui a déjà été traité ces 15 derniers jours, **y compris
   l'édition de l'autre créneau du jour même**.
3. **Générer l'édition** en respectant :
   - le schéma de `edition.template.json` ;
   - **exactement 6 rubriques, dans cet ordre** : Législation & réglementation,
     Jurisprudence, Doctrine & études, Culture générale, Pratique & procédure,
     Actualité classique ;
   - un **mot du jour** différent des termes déjà publiés (voir `index.json`)
     **et véritablement pointu** (voir « Exigence de complexité » ci-dessous) ;
   - des **URL de source réelles** et vérifiables pour chaque item.
   - Ne pas remplir `date` / `dateShort` / `slot` : le script s'en charge.
4. **Écrire** le résultat dans `editions/AAAA-MM-JJ-<matin|midi>.json`
   (date du jour, ISO).
5. **Créneau `matin` uniquement** — écrire la leçon d'astrophysique du jour
   (voir « Le cours d'astrophysique » ci-dessous). Le créneau `midi` saute
   cette étape.
6. **Publier** : `node scripts/publish.mjs AAAA-MM-JJ-<matin|midi>`
   (copie vers `latest.json` avec la leçon en cours, reconstruit `index.json`
   et `astro/index.json`, purge > 15 jours, normalise `date`/`dateShort`/`slot`
   et fige les couleurs de rubriques).
7. **Committer et pousser** :
   ```bash
   git add -A
   git commit -m "Édition du AAAA-MM-JJ (matin)"   # ou (midi)
   git push
   ```

## ⚠️ Anti-répétition — consigne centrale

**Avant de rédiger, lis `index.json` et traite-le comme une liste d'exclusion.**
Sur les ~30 dernières éditions (15 jours × 2 créneaux), tu NE dois PAS reprendre :

- le **même `mot.term`** (mot du jour) — choisis un terme non encore paru,
  **y compris celui publié le matin même** ;
- le **même sujet d'`essentiel`** (même arrêt, même texte, même affaire) ;
- des **titres de rubriques portant sur la même actualité** déjà couverte.

En cas de doute, préfère une actualité **nouvelle** plutôt que ré-angler une
info déjà publiée. Varie aussi les domaines du droit d'une édition à l'autre
(pénal, civil, commercial, administratif, social…) — la contrainte vaut d'un
créneau au suivant, pas seulement d'un jour au suivant.

## 🎯 Exigence de complexité — le mot du jour

Le « mot du jour » doit **apprendre quelque chose** à un juriste. Ce n'est pas
une définition de culture générale : c'est un terme **technique, pointu ou
méconnu** dont l'explication a une réelle valeur ajoutée.

**Test décisif :** si un étudiant de L1, un justiciable ou un lecteur non
juriste peut deviner le sens du terme sans fiche, **il est trop trivial —
change-le**. Le bon terme, on doit *avoir besoin* de la fiche pour le maîtriser.

**À éviter** (notions triviales, évidentes ou trop médiatisées) :
- droit de se taire, présomption d'innocence, légitime défense, garde à vue,
  prescription, préjudice, préavis, exequatur, dol, force majeure…
- plus largement, tout terme qu'un dictionnaire courant définit correctement.

**À privilégier** (mécanismes précis, faux-amis, notions doctrinales fines,
locutions latines rares, régimes procéduraux techniques) :
- ex. : *substitution de motifs*, *forclusion*, *déchéance quadriennale*,
  *astreinte comminatoire*, *novation par changement de débiteur*, *obligation
  in solidum* (≠ solidarité), *acquiescement à jugement*, *réputé non écrit*,
  *saisine d'office*, *fongibilité asymétrique* (LOLF), *ultra petita*,
  *rescision pour lésion*, *stellionat*, *quasi-usufruit*, *tierce opposition*…
- ces exemples sont indicatifs : **varie les branches du droit** (civil, pénal,
  procédure, administratif, commercial, fiscal, social) d'une édition à l'autre
  et ne les épuise pas.

En cas d'hésitation entre deux termes, **choisis toujours le plus pointu** —
celui qui distingue une véritable expertise d'une connaissance de surface.

## Prompt prêt à coller pour la routine

> Tu es l'éditeur de *Project ENM*, une veille juridique publiée **deux fois par
> jour** (créneaux « matin » et « midi ») pour juristes, avocats et magistrats.
>
> 1. **Détermine le créneau** : `date -u +%H` — heure UTC < 06 → `matin`,
>    sinon → `midi`. La date du jour est en ISO (`AAAA-MM-JJ`).
> 2. Ouvre `index.json` : c'est la liste des éditions des 15 derniers jours
>    (date, créneau, titres d'essentiel, mots du jour, titres de rubriques).
>    **Ne répète aucun** mot du jour, sujet d'essentiel ni actualité déjà
>    présents dans cette liste — **l'édition de l'autre créneau du jour même y
>    comprise**. Si tu produis l'édition du midi, couvre en priorité ce qui est
>    sorti **depuis** celle du matin.
> 3. Rédige une édition **crédible et sourcée** en suivant exactement le schéma
>    de `edition.template.json` : un « essentiel » (actu phare), **6 rubriques**
>    dans l'ordre imposé (Législation & réglementation, Jurisprudence, Doctrine
>    & études, Culture générale, Pratique & procédure, Actualité classique —
>    cette dernière hors justice), et un « mot du jour » (terme, sous-titre,
>    définition courte, fiche de 3–4 sections, « voir aussi »). Le mot du jour
>    doit être **véritablement pointu** : un terme technique, doctrinal ou
>    méconnu dont un juriste a réellement besoin de la fiche pour le maîtriser —
>    **jamais** une notion triviale (droit de se taire, présomption d'innocence,
>    garde à vue…) qu'un non-juriste devinerait sans explication. En cas
>    d'hésitation, choisis le terme le plus pointu et varie les branches du droit
>    d'une édition à l'autre. Chaque item a une URL de source réelle. Ne renseigne
>    pas `date` / `dateShort` / `slot`.
> 4. Écris le tout dans `editions/AAAA-MM-JJ-<matin|midi>.json`.
> 5. **Si et seulement si tu produis l'édition du `matin`** : écris aussi la
>    leçon d'astrophysique du jour dans `astro/lessons/<NNN>-<slug>.json`, en
>    suivant `astro/lesson.template.json`, la progression et les règles
>    d'écriture de la section « Le cours d'astrophysique » de ce document. Lis
>    d'abord `astro/index.json` : la nouvelle leçon prend le numéro suivant et
>    ne peut s'appuyer que sur les termes déjà définis. Le lecteur est juriste,
>    sans formation scientifique : aucune équation, chaque terme défini à son
>    apparition, **une seule idée par leçon**. C'est un **mini-cours** : 2 à 3
>    sections, 300 à 500 mots en tout, 2-3 minutes de lecture. Si le sujet
>    déborde, coupe-le en deux leçons plutôt que d'allonger celle du jour.
> 6. Lance `node scripts/publish.mjs AAAA-MM-JJ-<matin|midi>`, vérifie qu'il
>    n'affiche aucune erreur (il joint la leçon en cours à `latest.json`), puis
>    `git add -A && git commit -m "Édition du AAAA-MM-JJ (<matin|midi>)" && git push`.

## 🔭 Le cours d'astrophysique (une leçon par jour)

L'appli a un troisième onglet, **Astrophysique** : un **mini-cours** suivi, qui
part de zéro et progresse d'une leçon par jour. Le lecteur est **juriste, sans
aucune formation scientifique** — c'est la contrainte qui commande tout le reste.

Ce cours mise sur la **régularité, pas sur le volume** : une notion par jour,
2 à 3 minutes de lecture, tous les jours. Une leçon qu'on repousse au lendemain
faute de temps est une leçon perdue — mieux vaut découper que condenser.

### Qui écrit, et quand

- **Seul le créneau `matin` écrit une nouvelle leçon.** Le créneau `midi` n'en
  écrit aucune : `publish.mjs` rejoint automatiquement la leçon en cours à
  `latest.json` à chaque publication. Une journée = une leçon.
- Fichier : `astro/lessons/<NNN>-<slug>.json` — numéro sur 3 chiffres, **suite
  exacte** de la précédente (`002`, `003`…), slug en minuscules sans accents.
  Le champ `n` doit valoir le même numéro : le script refuse toute discontinuité.
- Schéma : `astro/lesson.template.json`. Les leçons ne sont **jamais purgées**,
  le cours est cumulatif.
- `astro/index.json` (reconstruit par le script) liste les leçons publiées et
  **tous les termes déjà définis**. Lis-le avant d'écrire : c'est ce que le
  lecteur est censé savoir, et ce que tu peux donc réutiliser sans redéfinir.

### Règles d'écriture — non négociables

1. **Aucun prérequis scientifique.** Pas d'équation, pas de notation, pas de
   symbole. Les chiffres servent à donner des ordres de grandeur, jamais à
   calculer. Si une idée exige un outil mathématique, elle attend son tour.
2. **Chaque terme technique est défini au moment où il apparaît**, en une
   phrase, dans le corps du texte — puis repris dans `keyTerms`.
3. **Une leçon = une idée.** Mieux vaut une notion comprise que trois survolées.
4. **On ne s'appuie que sur l'acquis.** Une leçon peut mobiliser librement les
   termes des leçons précédentes (voir `astro/index.json`), jamais ceux des
   suivantes.
5. **Format court, contrôlé par le script** : 2 à 3 sections de 80 à 150 mots,
   **300 à 500 mots en tout** (2-3 min de lecture), 1 à 3 `keyTerms`, un `recap`
   d'une à deux phrases, un `next` qui annonce la leçon du lendemain. Le champ
   `intro` est facultatif et le plus souvent inutile : on entre dans le sujet.
   `publish.mjs` **avertit** au-delà de 520 mots ou 3 sections, et **refuse** la
   publication au-delà de 700 mots ou 4 sections.
   Si un sujet ne tient pas dans ce format, **coupe-le en deux leçons** — c'est
   la bonne réponse, jamais la leçon longue.
6. **Pas de fausse image.** Une métaphore qui induit en erreur (le trou noir qui
   « aspire », l'électron qui « tourne autour ») coûte plus cher qu'elle ne
   rapporte. Une analogie juridique bien vue est bienvenue, mais avec parcimonie
   — le lecteur veut apprendre l'astrophysique, pas relire du droit.
7. **Ton** : sobre et adulte, celui de la veille juridique. Ni familier, ni
   émerveillé, ni professoral.

### Progression prévue

Le fil directeur, à suivre sauf raison de s'en écarter (une actualité
astronomique majeure peut justifier une leçon hors série, à condition qu'elle
n'exige rien de non encore acquis) :

| # | Leçon |
| - | --- |
| 1 | *(publiée)* Décrire ou expliquer : astronomie, astrophysique, et le pari des lois universelles |
| 2 | La lumière, seul témoin : ce qui nous parvient, et rien d'autre |
| 3 | La lumière ne va pas infiniment vite |
| 4 | L'année-lumière est une distance, pas une durée |
| 5 | Voir loin, c'est voir tôt — et ce que cela interdit |
| 6 | Ce qu'on voit vraiment dans le ciel : étoiles, planètes, ce qui les distingue |
| 7 | Le système solaire en temps de trajet |
| 8 | La gravité : qui attire quoi, et selon quelle règle |
| 9 | Pourquoi les astres tournent au lieu de tomber |
| 10 | Une étoile, c'est quoi : une boule de gaz qui tient debout |
| 11 | Pourquoi une étoile brille : la fusion |
| 12 | L'équilibre entre gravité et pression, et pourquoi il finit par céder |
| 13 | La couleur d'une étoile dit sa température |
| 14 | Décomposer la lumière : le spectre |
| 15 | Les raies spectrales, signature des éléments |
| 16 | L'effet Doppler : lire un mouvement dans la lumière |
| 17 | Le décalage vers le rouge |
| 18 | La naissance des étoiles : nuages de gaz et effondrement |
| 19 | La mort des petites étoiles : naines blanches |
| 20 | La mort des grosses : supernova |
| 21 | D'où viennent les atomes dont nous sommes faits |
| 22 | Étoiles à neutrons |
| 23 | Trous noirs : ce qu'ils sont réellement, et ce qu'ils ne sont pas |
| 24 | Les galaxies, et la nôtre |

Au-delà : matière noire, expansion de l'univers, Big Bang et rayonnement
fossile, énergie noire, exoplanètes, instruments d'observation et ondes
gravitationnelles — **à la même granularité**, une notion par jour. Puis, dans
le même esprit : approfondissement des notions déjà posées, ou sujets nouveaux
qu'elles rendent enfin accessibles.

## En cas d'erreur du script

`publish.mjs` s'arrête et affiche `✗ …` si l'édition est invalide (rubriques ≠ 6,
champ manquant, JSON cassé). Corrige `editions/AAAA-MM-JJ-<matin|midi>.json` et
relance — tant qu'il n'a pas tourné sans erreur, `latest.json` n'est pas modifié,
donc l'appli n'affichera jamais une édition à moitié écrite.

Il affiche aussi un avertissement `! aucun créneau…` si tu lui passes une date
sans suffixe : c'est l'ancien format, encore accepté mais à ne plus utiliser.
