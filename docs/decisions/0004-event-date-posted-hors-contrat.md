# 0004 : `event_date_posted` hors du contrat de données en V1

- Date : 2026-11-05
- Statut : acceptée
- Données observées : openFDA `device/recall`, `last_updated` = 2026-10-31, 59 659 lignes

## Contexte

`event_date_posted` est la date à laquelle la FDA classe un rappel. Elle n'est utilisée par aucune question métier ([questions-metier.md](../questions-metier.md)) : l'axe de temps des séries est `event_date_initiated`.

Elle avait été ajoutée au contrat pour deux usages secondaires :

- mesurer le délai de publication (`event_date_initiated` → `event_date_posted`), donc le nombre de semaines récentes incomplètes ;
- contrôler la cohérence des dates (`event_date_initiated` ≤ `event_date_posted`), qui révèle par exemple `Z-0911-2011` (début `0010-08-17`, classification `2011-01-18`).

Mesure ([openfda-notes.md](../openfda-notes.md), test 17) : **13 575 lignes sans `event_date_posted`, soit environ 23 %**. Ce taux est inattendu : tous les rappels ont un statut classé ou postérieur (`Open, Classified`, `Completed`, `Terminated`, test 11). La cause de ces absences n'est pas établie (rappels anciens ? statut particulier ?).

## Décision

`event_date_posted` n'est **pas normalisé en colonne** dans le contrat V1. Il reste disponible dans l'enregistrement brut (`raw_record`).

Justification :

- aucune question métier n'en a besoin ;
- avec 23 % d'absences de cause inconnue, les deux usages prévus ne porteraient que sur une partie des données, et leurs résultats seraient difficiles à interpréter ;
- comprendre ces absences demanderait une analyse supplémentaire sans bénéfice pour la V1.

## Alternatives écartées

| Option | Raison de l'écart |
|---|---|
| Normaliser le champ (`required: false`) et l'utiliser quand il est présent | mesures partielles sur 77 % des lignes, avec un biais inconnu |
| Analyser d'abord la cause des absences (croisement par statut et par période) | travail sans bénéfice pour les questions métier de la V1 |

## Conséquences

- La règle de cohérence `event_date_initiated` ≤ `event_date_posted` n'est pas mise en place. Les dates de début aberrantes (ex. `0010-08-17`) devront être détectées autrement : bornes sur `event_date_initiated`, ou cohérence avec `event_date_terminated`.
- Le délai de publication n'est pas mesuré : la limite « semaines récentes incomplètes » reste non quantifiée dans le contrat.
- L'hypothèse « openFDA ne publie les rappels qu'une fois classés » est affaiblie par le test 17 et n'est plus affirmée dans le contrat.
- Les tests 17 et suivants sont conservés dans les notes. Si un besoin apparaît (ex. mesure du délai de publication en V3), cette décision pourra être revue en partant de ces mesures : croisement des absences par statut et par période.
