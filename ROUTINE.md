# Routine quotidienne — génération de l'édition

Ce document est le **mode d'emploi de la routine Claude Code Remote** qui publie
chaque jour l'édition de *Project ENM*. La routine ne fait que **produire le
contenu** ; toute la mécanique (pointeur, archive, index, purge) est gérée par
`scripts/publish.mjs`.

## Fonctionnement « boîte aux lettres »

- **`latest.json`** = l'adresse fixe que l'appli relève à chaque ouverture.
- **`editions/AAAA-MM-JJ.json`** = l'archive, un fichier par jour (15 jours glissants).
- **`index.json`** = le registre des éditions récentes (titres + terme du jour),
  lu par la routine pour **ne pas se répéter**.
- Si la routine ne tourne pas un jour, l'appli continue d'afficher la dernière
  édition valide — rien ne casse.

## Étapes de la routine (dans cet ordre)

1. **Lire `index.json`** (et au besoin les fichiers `editions/*.json` récents).
   → Repérer ce qui a déjà été traité ces 15 derniers jours.
2. **Générer l'édition du jour** en respectant :
   - le schéma de `edition.template.json` ;
   - **exactement 6 rubriques, dans cet ordre** : Législation & réglementation,
     Jurisprudence, Doctrine & études, Culture générale, Pratique & procédure,
     Actualité classique ;
   - un **mot du jour** différent des termes déjà publiés (voir `index.json`) ;
   - des **URL de source réelles** et vérifiables pour chaque item.
   - Ne pas remplir `date` / `dateShort` : le script s'en charge.
3. **Écrire** le résultat dans `editions/AAAA-MM-JJ.json` (date du jour, ISO).
4. **Publier** : `node scripts/publish.mjs AAAA-MM-JJ`
   (copie vers `latest.json`, reconstruit `index.json`, purge > 15 jours,
   normalise `date`/`dateShort` et fige les couleurs de rubriques).
5. **Committer et pousser** :
   ```bash
   git add -A
   git commit -m "Édition du AAAA-MM-JJ"
   git push
   ```

## ⚠️ Anti-répétition — consigne centrale

**Avant de rédiger, lis `index.json` et traite-le comme une liste d'exclusion.**
Sur les ~15 dernières éditions, tu NE dois PAS reprendre :

- le **même `mot.term`** (mot du jour) — choisis un terme non encore paru ;
- le **même sujet d'`essentiel`** (même arrêt, même texte, même affaire) ;
- des **titres de rubriques portant sur la même actualité** déjà couverte.

En cas de doute, préfère une actualité **nouvelle** plutôt que ré-angler une
info déjà publiée. Varie aussi les domaines du droit d'un jour à l'autre
(pénal, civil, commercial, administratif, social…).

## Prompt prêt à coller pour la routine

> Tu es l'éditeur de *Project ENM*, une veille juridique quotidienne pour
> juristes, avocats et magistrats. Produis l'édition d'aujourd'hui
> (`AAAA-MM-JJ`).
>
> 1. Ouvre `index.json` : c'est la liste des éditions des 15 derniers jours
>    (titres d'essentiel, mots du jour, titres de rubriques). **Ne répète aucun**
>    mot du jour, sujet d'essentiel ni actualité déjà présents dans cette liste.
> 2. Rédige une édition **crédible et sourcée** en suivant exactement le schéma
>    de `edition.template.json` : un « essentiel » (actu phare), **6 rubriques**
>    dans l'ordre imposé (Législation & réglementation, Jurisprudence, Doctrine
>    & études, Culture générale, Pratique & procédure, Actualité classique —
>    cette dernière hors justice), et un « mot du jour » (terme, sous-titre,
>    définition courte, fiche de 3–4 sections, « voir aussi »). Chaque item a une
>    URL de source réelle. Ne renseigne pas `date` / `dateShort`.
> 3. Écris le tout dans `editions/AAAA-MM-JJ.json`.
> 4. Lance `node scripts/publish.mjs AAAA-MM-JJ`, vérifie qu'il n'affiche aucune
>    erreur, puis `git add -A && git commit -m "Édition du AAAA-MM-JJ" && git push`.

## En cas d'erreur du script

`publish.mjs` s'arrête et affiche `✗ …` si l'édition est invalide (rubriques ≠ 6,
champ manquant, JSON cassé). Corrige `editions/AAAA-MM-JJ.json` et relance —
tant qu'il n'a pas tourné sans erreur, `latest.json` n'est pas modifié, donc
l'appli n'affichera jamais une édition à moitié écrite.
