# Project ENM — contenu quotidien

Flux de contenu de l'application **Project ENM** (veille juridique quotidienne),
en **boîte aux lettres** : une routine dépose chaque jour la nouvelle édition,
l'appli la relève à une adresse fixe.

## Structure

| Chemin | Rôle |
| --- | --- |
| **`latest.json`** | La boîte aux lettres. L'appli lit **toujours** ce fichier. Contient l'édition courante en entier. |
| **`editions/AAAA-MM-JJ.json`** | Archive : une édition par jour. Conservées **15 jours** (les plus anciennes sont purgées automatiquement). |
| **`index.json`** | Registre des éditions récentes (date, titre d'essentiel, mot du jour, titres de rubriques). Sert à la routine pour **ne pas se répéter**. |
| `edition.template.json` | Gabarit d'une édition (schéma + couleurs de rubriques). |
| `scripts/publish.mjs` | Publie une édition : copie vers `latest.json`, reconstruit `index.json`, purge > 15 j, normalise `date`/`dateShort`. |
| `ROUTINE.md` | Mode d'emploi + prompt de la routine Claude Code Remote. |

L'appli lit :
```
https://raw.githubusercontent.com/pierreespy/project-enm-content/main/latest.json
```
Si ce fichier est indisponible ou invalide, l'appli affiche son contenu embarqué
(fallback) — elle ne plante jamais.

## Publier une édition (manuellement ou via la routine)

```bash
# 1. écrire l'édition du jour (voir edition.template.json)
#    -> editions/2026-07-10.json
# 2. publier
node scripts/publish.mjs 2026-07-10
# 3. pousser
git add -A && git commit -m "Édition du 2026-07-10" && git push
```

`publish.mjs` **valide** l'édition avant de la publier : si les rubriques ne sont
pas au nombre de 6, ou qu'un champ manque, il s'arrête sans toucher à
`latest.json` — l'appli ne verra jamais une édition à moitié écrite.

Le détail du fonctionnement de la routine et la consigne anti-répétition sont
dans **[`ROUTINE.md`](ROUTINE.md)**.

## Schéma d'une édition

Voir [`edition.template.json`](edition.template.json). En résumé :

```jsonc
{
  "dateShort": "…",          // rempli par publish.mjs
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
