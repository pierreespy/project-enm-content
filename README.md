# Project ENM — contenu bi-quotidien

Flux de contenu de l'application **Project ENM** (veille juridique), en **boîte
aux lettres** : une routine dépose **deux fois par jour** une nouvelle édition
(créneaux « matin » et « midi »), l'appli la relève à une adresse fixe.

| Créneau | Cron (UTC) | Heure de Paris (été) |
| --- | --- | --- |
| `matin` | `50 0 * * *` | ~02h50 |
| `midi` | `50 11 * * *` | ~13h50 |

## Structure

| Chemin | Rôle |
| --- | --- |
| **`latest.json`** | La boîte aux lettres. L'appli lit **toujours** ce fichier. Contient l'édition courante en entier. |
| **`editions/AAAA-MM-JJ-<matin\|midi>.json`** | Archive : **deux éditions par jour**. Conservées **15 jours** (~30 fichiers ; les plus anciennes sont purgées automatiquement). |
| **`index.json`** | Registre des éditions récentes (date, créneau, titre d'essentiel, mot du jour, titres de rubriques). Sert à la routine pour **ne pas se répéter**. |
| `edition.template.json` | Gabarit d'une édition (schéma + couleurs de rubriques). |
| `scripts/publish.mjs` | Publie une édition : copie vers `latest.json`, reconstruit `index.json`, purge > 15 j, normalise `date`/`dateShort`/`slot`. |
| `ROUTINE.md` | Mode d'emploi + prompt de la routine Claude Code Remote. |

L'appli lit :
```
https://raw.githubusercontent.com/pierreespy/project-enm-content/main/latest.json
```
Si ce fichier est indisponible ou invalide, l'appli affiche son contenu embarqué
(fallback) — elle ne plante jamais.

## Publier une édition (manuellement ou via la routine)

```bash
# 1. écrire l'édition du créneau (voir edition.template.json)
#    -> editions/2026-07-10-matin.json   (ou -midi)
# 2. publier
node scripts/publish.mjs 2026-07-10-matin
# 3. pousser
git add -A && git commit -m "Édition du 2026-07-10 (matin)" && git push
```

Les anciens fichiers sans créneau (`editions/AAAA-MM-JJ.json`) restent acceptés
— le script affiche seulement un avertissement — le temps qu'ils soient purgés.

`publish.mjs` **valide** l'édition avant de la publier : si les rubriques ne sont
pas au nombre de 6, ou qu'un champ manque, il s'arrête sans toucher à
`latest.json` — l'appli ne verra jamais une édition à moitié écrite.

Le détail du fonctionnement de la routine et la consigne anti-répétition sont
dans **[`ROUTINE.md`](ROUTINE.md)**.

## Schéma d'une édition

Voir [`edition.template.json`](edition.template.json). En résumé :

```jsonc
{
  "date": "…",               // rempli par publish.mjs
  "dateShort": "…",          // rempli par publish.mjs
  "slot": "matin" | "midi",  // rempli par publish.mjs (absent sur les archives d'avant)
  "essentiel": { "label", "title", "dek", "source", "url" },
  "rubriques": [             // exactement 6, dans l'ordre ci-dessous
    { "chip", "title", "summary", "source", "url", "ink", "tint" }
  ],
  "mot": {
    "label", "term", "subtitle", "defShort",
    "fiche": [ { "h", "body" } ],
    "seeAlso"
  }
}
```

### Rubriques — ordre et couleurs (figés par `publish.mjs`)

| # | Rubrique | `ink` | `tint` |
| - | --- | --- | --- |
| 1 | Législation & réglementation | `#2a4a6b` | `#eaf0f6` |
| 2 | Jurisprudence | `#7a2230` | `#f6ecec` |
| 3 | Doctrine & études | `#2f5741` | `#eaf2ed` |
| 4 | Culture générale | `#7d5a1c` | `#f6f0e2` |
| 5 | Pratique & procédure | `#2f5566` | `#eaf2f4` |
| 6 | Actualité classique *(hors justice)* | `#5a3f66` | `#f1ecf4` |
