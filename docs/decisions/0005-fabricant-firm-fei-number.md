# 0005 : Identifier les fabricants par `firm_fei_number` plutôt que `recalling_firm`

- Date : 2026-11-05
- Statut : acceptée
- Données observées : openFDA `device/recall`, `last_updated` = 2026-10-31

## Contexte

La question métier Q5 ([questions-metier.md](../questions-metier.md)) répartit les produits rappelés par fabricant. Deux champs permettent d'identifier le fabricant :

| Champ | Nature (selon fields.pdf) | Limite |
|---|---|---|
| `recalling_firm` | nom de l'entreprise qui rappelle, texte libre | un même fabricant peut apparaître sous plusieurs orthographes ; le champ peut contenir l'adresse complète |
| `firm_fei_number` | identifiant d'établissement (FEI) attribué par la FDA | désigne un **site**, pas une entreprise : une entreprise à plusieurs sites a plusieurs FEI |

Compter par `recalling_firm` éclaterait un même fabricant en plusieurs lignes (« Medtronic Inc », « Medtronic, Inc. »…), sauf à normaliser les noms, ce qui est hors périmètre V1.

## Décision

`firm_fei_number` est normalisé en colonne et sert de clé de regroupement pour les répartitions par fabricant (Q5), qui sont donc comptées **par site**.

`recalling_firm` n'est pas normalisé en V1 : il reste disponible dans l'enregistrement brut (`raw_record`).

Justification :

- même démarche que pour la clé des rappels (décision 0001) : un **identifiant attribué par la FDA** plutôt qu'un texte libre ;
- pas de normalisation des noms à concevoir ni à maintenir en V1 ;
- du point de vue qualité, le site est une maille pertinente : c'est là que naissent les défauts de procédé.

## Alternatives écartées

| Option | Raison de l'écart |
|---|---|
| `recalling_firm` seul | répartitions éclatées par les variantes d'orthographe |
| `recalling_firm` normalisé (nettoyage, regroupement des variantes) | règles de rapprochement à concevoir et à justifier, risque de regroupements erronés ; hors périmètre V1 |
| `firm_fei_number` pour regrouper + `recalling_firm` comme libellé | deux colonnes pour un besoin d'affichage ; un même FEI peut avoir plusieurs noms, il faudrait choisir lequel afficher. Reporté à une future table des sociétés |
| `openfda.fei_number` | autre champ : tableau des FEI associés au dispositif, pas l'établissement qui rappelle |

## Conséquences

- **Contrat de données** : propriété `firm_fei_number` (chaîne, identifiant) ; `recalling_firm` retiré des propriétés et cité dans la description de `raw_record` ; limite ajoutée dans `limitations`.
- **Dashboard** : en V1, les fabricants sont affichés par numéro FEI, sans nom lisible.
- **Évolution prévue** : une table des sociétés (FEI → nom) pourra être construite à partir de `raw_record`, sans réinterroger l'API.
- **Présence mesurée** ([openfda-notes.md](../openfda-notes.md), test 21) : `firm_fei_number` absent sur 98 lignes (0,16 %). Ces lignes reçoivent un avertissement : gardées, mais exclues des analyses par fabricant. Pour comparaison, `recalling_firm` est absent sur 1 ligne (test 20).
- **À vérifier plus tard** : un même FEI correspond-il à plusieurs noms dans `recalling_firm` ? Ce sera la question centrale de la future table des sociétés.
