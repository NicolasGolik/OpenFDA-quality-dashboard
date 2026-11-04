# 0002 : Unité de comptage : événements de rappel ou produits

- Date : 2026-11-05
- Statut : acceptée
- Données observées : openFDA `device/recall`, `last_updated` = 2026-10-31

## Contexte

Les questions métier ([questions-metier.md](../questions-metier.md)) comptent des rappels : par période (Q1, avec cartes de contrôle en V3), par cause (Q2), par domaine et fabricant (Q5). Or « un rappel » peut désigner trois niveaux différents dans les données :

```
Événement de rappel   res_event_number      1 décision de rappel, 1 cause
 └─ Produit           product_res_number    1 référence / modèle rappelé (= 1 ligne de l'API)
     └─ Unités        product_quantity      pièces physiques concernées (texte libre)
```

Un « produit » n'est pas une pièce, mais une **référence** concernée par le rappel. Un même événement peut regrouper de nombreuses références : jusqu'à 254 observées pour un seul événement (mesure du 2026-11-04, à vérifier en SQL, voir issue #13).

Analogie industrielle : l'événement est une non-conformité ouverte, les produits sont les références article citées dans la fiche, les unités sont les pièces de ces références.

**Exemple : deux semaines fictives**

|           | Événements                                                    | Produits (références) |
| --------- | ------------------------------------------------------------- | --------------------- |
| Semaine A | 10 événements, 1 référence chacun                             | 10                    |
| Semaine B | 3 événements, dont un touchant 50 références d'une même gamme | 52                    |

- Compté **par produit**, la semaine B paraît 5 fois pire que la semaine A.
- Compté **par événement**, la semaine B compte moins de problèmes (3 contre 10).

La semaine B ne traduit pas une dégradation de la qualité du secteur : un seul défaut touche une large gamme. Compter par produit mesure en partie **la taille des catalogues** des fabricants, et pas seulement la fréquence des problèmes.

**Argument statistique (cartes de contrôle)**

Une carte de contrôle sur des comptages (carte c ou u) suppose que les éléments comptés surviennent **indépendamment** les uns des autres. Les références d'un même événement partagent une même cause et arrivent en bloc : elles ne sont pas indépendantes. La série par produit est alors beaucoup plus dispersée que ce que prévoit le modèle, et les limites de contrôle déclenchent de **fausses alarmes** à chaque gros rappel.

## Décision

| Usage                                               | Unité de comptage                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| Tendance et cartes de contrôle (Q1)                 | **événement de rappel** (`res_event_number`)                               |
| Répartitions par cause, domaine, fabricant (Q2, Q5) | **produit** (`product_res_number`), précisé dans le libellé des graphiques |

## Alternatives écartées

| Comptage           | Question à laquelle il répond                       | Raison de l'écart                                                                                                                                                                  |
| ------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produits partout   | Combien de références sont touchées ?               | Fausses alarmes sur les cartes de contrôle ; mesure en partie la taille des catalogues                                                                                             |
| Événements partout | À quelle fréquence des problèmes apparaissent-ils ? | Perd l'étendue des rappels dans les répartitions                                                                                                                                   |
| Unités             | Combien de pièces sont concernées ?                 | `product_quantity` non exploitable : texte libre aux formats hétérogènes, et totaux d'événement recopiés sur chaque produit (voir [openfda-notes.md](../openfda-notes.md), test 8) |

## Conséquences

- Deux comptages coexistent : chaque graphique doit indiquer clairement ce qu'il compte.
- Compter par événement impose d'attribuer **une seule date et une seule cause** à chaque événement. À vérifier dans les données (voir issue #13) : les produits d'un même événement peuvent-ils avoir des `event_date_initiated` ou des `root_cause_description` différentes ? Si oui, une règle d'agrégation sera à définir (ex. date la plus ancienne).
- `res_event_number` devient un champ nécessaire : il entre dans le contrat de données (présence, format).

**À mesurer** : la part des événements à plusieurs produits. Si elle est faible, les deux comptages donnent des séries proches ; si elle est forte, elles divergent fortement.
