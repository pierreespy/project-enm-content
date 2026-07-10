# Project ENM — contenu quotidien

Flux de contenu de l'application **Project ENM** (veille juridique quotidienne).
L'app lit [`content.json`](content.json) à chaque ouverture :

```
https://raw.githubusercontent.com/pierreespy/project-enm-content/main/content.json
```

Pour publier le contenu du jour, **écraser `content.json`** avec la nouvelle
journée et pousser sur `main`. Si le fichier est indisponible ou invalide, l'app
retombe sur son contenu embarqué (fallback).

## Schéma de `content.json`

```jsonc
{
  "dateShort": "9 juill.",            // affiché en haut à droite du Journal

  "essentiel": {                       // l'actu phare (carte marine)
    "label":  "L'essentiel du jour",
    "title":  "Titre de l'actu phare",
    "dek":    "Chapô d'une à deux phrases.",
    "source": "Cass. crim., 8 juill. 2026",
    "url":    "https://…"             // ouvert au tap
  },

  "rubriques": [                       // exactement 6, dans l'ordre ci-dessous
    {
      "chip":    "Législation & réglementation",
      "title":   "Titre de l'article",
      "summary": "Résumé d'une phrase.",
      "source":  "JORF n°157, 9 juill. 2026",
      "url":     "https://…",          // ouvert au tap sur le titre / la flèche ↗
      "ink":     "#2a4a6b",            // couleur du texte de la chip
      "tint":    "#eaf0f6"             // fond de la chip
    }
    // … 5 autres : Jurisprudence, Doctrine & études, Culture générale,
    //   Pratique & procédure, Actualité classique
  ],

  "mot": {                             // le mot du jour
    "label":    "Le mot du jour",
    "term":     "Présomption de légitime défense",
    "subtitle": "Droit pénal · Article 122-6 du Code pénal",
    "defShort": "Définition courte affichée par défaut.",
    "fiche": [                         // sections de la fiche dépliable
      { "h": "En bref",   "body": "…" },
      { "h": "Fondement", "body": "…" }
    ],
    "seeAlso": "Voir aussi — …"
  }
}
```

### Couleurs des rubriques

Les 6 rubriques ont chacune leur teinte (reprises de la maquette). Pour garder
la cohérence visuelle, conservez ces paires `ink` / `tint` :

| Rubrique                       | `ink`     | `tint`    |
| ------------------------------ | --------- | --------- |
| Législation & réglementation   | `#2a4a6b` | `#eaf0f6` |
| Jurisprudence                  | `#7a2230` | `#f6ecec` |
| Doctrine & études              | `#2f5741` | `#eaf2ed` |
| Culture générale               | `#7d5a1c` | `#f6f0e2` |
| Pratique & procédure           | `#2f5566` | `#eaf2f4` |
| Actualité classique            | `#5a3f66` | `#f1ecf4` |

> Valider le JSON (`jq . content.json`) avant de pousser : un fichier invalide
> déclenche le fallback embarqué de l'app.
