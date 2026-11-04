# Questions métier

Utilisateur visé : responsable qualité ou affaires réglementaires chez un fabricant de dispositifs médicaux, qui veut suivre les rappels du secteur pour anticiper les risques sur ses propres produits.

Unité de comptage : par défaut, une ligne de `device/recall` correspond à **un produit rappelé**. Un même événement de rappel (`res_event_number`) peut regrouper plusieurs produits. Chaque question doit préciser si elle compte des produits ou des événements.

## Q1 : Le nombre de rappels augmente-t-il ?

- Pourquoi : détecter une hausse anormale (dérive) plutôt qu'une variation habituelle.
- Indicateur : nombre d'événements de rappel par période ; en V3, carte de contrôle sur cette série.
- Granularité : semaine ou mois (environ 55 à 70 rappels par semaine).
- Champs nécessaires : `event_date_initiated` (axe de temps, voir ci-dessous), `product_res_number`, `res_event_number`.
- Faisabilité : à mesurer.
- Version : V1 (courbe), V3 (SPC).

## Q2 : Quelles causes dominent, et lesquelles progressent ?

- Pourquoi : orienter les efforts qualité (conception, procédés, logiciel…) vers les causes qui pèsent ou qui montent.
- Indicateur : nombre et part des produits rappelés par cause, par période.
- Granularité : mois ou trimestre.
- Champs nécessaires : `root_cause_description`, date d'axe de temps.
- Faisabilité : à mesurer. Points d'attention : la cause la plus fréquente est « Other », et la cause peut être modifiée jusqu'à la clôture du rappel (« Under Investigation by firm »).
- Version : V1 (répartition), V3 (SPC sur une cause).

## Q3 : Combien de temps faut-il pour clôturer un rappel ?

- Pourquoi : mesurer la durée d'exposition au risque et comparer les causes entre elles.
- Indicateur : délai entre le début et la clôture du rappel (médiane, distribution).
- Granularité : par année de début, par cause.
- Champs nécessaires : `event_date_initiated`, `event_date_terminated`, `recall_status`, `root_cause_description`.
- Faisabilité : à mesurer. Point d'attention : seuls les rappels clôturés ont un délai ; les rappels récents, encore ouverts, sont exclus, ce qui biaise le calcul vers les délais courts.
- Version : V1.

## Q4 : Combien de rappels sont encore ouverts ?

- Pourquoi : connaître le stock de rappels en cours, et repérer ceux ouverts depuis longtemps.
- Indicateur : nombre de rappels par statut ; ancienneté des rappels non clôturés.
- Granularité : instantané (à la date de la dernière ingestion).
- Champs nécessaires : `recall_status`, `event_date_initiated`.
- Faisabilité : à mesurer (valeurs possibles de `recall_status` à lister).
- Version : V1.

## Q5 : Quels domaines et quels fabricants sont les plus concernés ?

- Pourquoi : situer son propre domaine par rapport au reste du secteur.
- Indicateur : nombre de produits rappelés par spécialité médicale, par type de dispositif, par fabricant.
- Granularité : année.
- Champs nécessaires : `openfda.medical_specialty_description`, `product_code`, `openfda.device_class`, `recalling_firm`.
- Faisabilité : à mesurer. Points d'attention : la documentation indique que la spécialité manque pour les dispositifs de classe 3 ; un même fabricant peut apparaître sous plusieurs orthographes.
- Version : V1.

## Q6 : Quelle part des données est exploitable ?

- Pourquoi : savoir quelle confiance accorder aux indicateurs ci-dessus.
- Indicateur : nombre de lignes rejetées, avec avertissement, ou valides, par règle du contrat de données et par ingestion.
- Granularité : par ingestion.
- Champs nécessaires : résultats de la validation (`ingestion_runs`, table de quarantaine).
- Faisabilité : dépend du contrat de données (issue #3).
- Version : V1.

## Choix retenus

- **Axe de temps : `event_date_initiated`** (date à laquelle le fabricant lance le rappel), plutôt que `event_date_posted` (date de classification par la FDA). Il reflète l'apparition des problèmes chez les fabricants, et non le rythme de traitement de la FDA. Conséquences : dates aberrantes à traiter par le contrat de données (ex. `0010-08-17`), et semaines récentes possiblement incomplètes.
- **Unité de comptage** : tendance et cartes de contrôle (Q1) comptées par **événement de rappel** (`res_event_number`) ; répartitions par cause, domaine, fabricant (Q2, Q5) comptées par **produit** (`product_res_number`), en le précisant dans le libellé des graphiques. Voir la [décision 0002](decisions/0002-comptage-evenement-vs-produit.md).

## Questions ouvertes

Conséquences du comptage par événement, à vérifier dans les données (voir issue #13) :

- Pour une répartition par cause comptée par événement, quelle cause retenir si les produits d'un même événement ont des causes différentes ? (À vérifier : est-ce possible dans les données ?)
- Quelle date retenir pour un événement si ses produits ont des `event_date_initiated` différentes ? (Même vérification.)
