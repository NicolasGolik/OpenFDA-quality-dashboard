# 0001 : Clé unique des rappels : `product_res_number`

- Date : 2026-11-04
- Statut : acceptée
- Données observées : openFDA `device/recall`, `last_updated` = 2026-10-31, 59 659 lignes

## Contexte

Le worker interroge l'API chaque jour, alors que la source n'est mise à jour qu'une fois par semaine. Un même rappel évolue aussi dans le temps (création, classification, clôture). L'ingestion doit donc être **idempotente** : relancer le worker ne doit ni créer de doublons ni perdre de mises à jour. Elle repose sur un upsert (`INSERT ... ON CONFLICT ... DO UPDATE`), qui exige une clé :

- présente sur chaque ligne ;
- unique par ligne ;
- stable dans le temps pour un même enregistrement.

Deux champs candidats ont été testés (voir [openfda-notes.md](../openfda-notes.md)).

## Décision

`product_res_number` (ex. `Z-0001-04`) est retenu comme clé métier de la table des rappels.

## Alternatives écartées

| Candidat   | Présence                     | Unicité                                                      | Raison de l'écart                                                       |
| ---------- | ---------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `cfres_id` | absent sur 8 lignes (test 7) | non vérifiable via l'API, champ texte sans `.exact` (test 5) | 8 lignes seraient rejetées d'office, et l'unicité n'est pas démontrable |

## Conséquences

**Ce que ça implique :**

- Contrat de données : `product_res_number` absent ou vide (`''`) → **rejet** de la ligne, avec mise en quarantaine et la raison.
- Base : contrainte d'unicité sur `product_res_number`, qui sert de cible au `ON CONFLICT`.
- `cfres_id` n'est pas normalisé en colonne : il reste disponible dans l'enregistrement brut (`raw_record`, contrat de données) pour les recoupements.
- Le choix de la clé primaire (clé métier seule ou clé technique en plus) sera traité dans une décision dédiée lors de la conception du schéma (issue n° à compléter).

**Risques et parades :**

- **Champ absent de `fields.pdf`** (présent sur la page _searchable-fields_ d'openFDA). Son format ou sa présence pourraient changer sans annonce. Parade : le contrat rejette et compte les lignes sans clé, et `ingestion_runs` enregistre ces compteurs. Une hausse soudaine des rejets signale un changement côté source.
- **Format non uniforme** : on observe des années sur 2 chiffres (`Z-0001-04`) et sur 4 (`Z-0911-2011`). Toute règle de format devra accepter les deux, à mesurer avant de l'écrire.
- **Renumérotation par la FDA** : un même rappel réapparaîtrait sous une nouvelle clé, ce qui créerait un doublon logique. Ce risque n'est pas détectable par la contrainte d'unicité. Il est à surveiller via `cfres_id`.

**Reste à vérifier en SQL après le premier chargement :**

- unicité : `count(*)` comparé à `count(DISTINCT product_res_number)` ;
- absence de chaînes vides (non vérifiable via l'API, test 6) ;
- unicité de `cfres_id` sur les lignes où il est présent.
