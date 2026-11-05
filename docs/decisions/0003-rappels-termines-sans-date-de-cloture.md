# 0003 : Rappels clôturés sans date de clôture : mise en quarantaine

- Date : 2026-11-05
- Statut : acceptée
- Données observées : openFDA `device/recall`, `last_updated` = 2026-10-31, 59 659 lignes

## Contexte

`event_date_terminated` est la date à laquelle la FDA clôture un rappel. Elle ne devrait exister que pour les rappels au statut `Terminated`. Mesures (voir [openfda-notes.md](../openfda-notes.md), tests 13 à 16) :

| `recall_status` | Lignes | Sans `event_date_terminated` | Interprétation |
|---|---|---|---|
| `Open, Classified` | 14 531 | 14 531 (100 %) | attendu : rappel non clôturé |
| `Completed` | 442 | 442 (100 %) | attendu : actions terminées, rappel pas encore clôturé par la FDA |
| `Terminated` | 44 686 | **47 (0,1 %)** | **incohérent** : rappel clôturé sans date de clôture |
| **Total** | 59 659 | 15 020 | 47 + 442 + 14 531 = 15 020 (test 13) |

L'absence de date de clôture n'est donc une anomalie que pour les rappels `Terminated`. Il faut décider du traitement de ces 47 lignes.

## Décision

Un rappel au statut `Terminated` sans `event_date_terminated` est **rejeté et mis en quarantaine**, avec la raison du rejet.

L'absence de date de clôture pour les statuts `Open, Classified` et `Completed` est **normale** : ces lignes sont valides et ne déclenchent aucune règle.

Justification :

- La ligne contient une **contradiction entre deux champs** : le statut affirme une clôture que la date ne confirme pas. On ne peut pas savoir lequel des deux est faux, donc on ne peut se fier ni au statut (Q4, rappels ouverts) ni à la date (Q3, délai de clôture).
- **Impact faible** : 47 lignes sur 59 659 (0,1 %). Les exclure ne modifie pas significativement les tendances ni les répartitions.
- **Réversible** : la valeur brute est conservée dans la quarantaine. Si la FDA corrige l'enregistrement, l'ingestion suivante le rendra valide.

## Alternatives écartées

| Option | Principe | Raison de l'écart |
|---|---|---|
| Avertissement | ligne gardée, date marquée suspecte, exclue seulement de Q3 | garde dans Q4 (statut) une ligne dont le statut est peut-être faux ; plus complexe à appliquer pour 0,1 % des lignes |
| Information | ligne gardée, cas seulement compté | laisse une incohérence entrer dans toutes les analyses |
| Corriger le statut (ex. `Terminated` → `Completed`) | déduire le statut de l'absence de date | contraire au principe « ne jamais corriger silencieusement » ; rien ne prouve que c'est le statut qui est faux |

## Conséquences

- **Contrat de données** : `event_date_terminated` est `required: false`. La règle conditionnelle (« obligatoire si `recall_status` = `Terminated` ») sera exprimée dans la partie `quality`, avec la sévérité correspondant au rejet.
- **Worker** : la règle s'applique à chaque ingestion, et le nombre de lignes rejetées pour ce motif est enregistré dans `ingestion_runs`. Une hausse soudaine signalerait un changement côté source.
- **Quarantaine** : sa mise en œuvre (table séparée ou colonne de statut) sera décidée avec le schéma SQL (issue #7).
- **Analyses** : les 47 lignes sont exclues de toutes les questions métier ; le dashboard qualité des données (Q6) les compte et les affiche.
- **Règle liée à prévoir** : `event_date_terminated` doit être postérieure ou égale à `event_date_initiated` (sévérité à décider avec les règles de qualité).
