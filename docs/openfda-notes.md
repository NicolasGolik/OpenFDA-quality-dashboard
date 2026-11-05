# Objectif du document

Journaliser les appels API et les conclusions sur les résultats obtenus

## Synthèse

Alors que l'identifiant `cfres_id` est indiqué dans la documentation comme identifiant, celui-ci n'est pas toujours présent (absent sur 8 lignes, test 7) et son unicité n'est pas vérifiable via l'API (test 5). L'unicité et la présence de `product_res_number` sont observées via l'API (tests 3 et 4) et restent à confirmer en SQL ; l'absence de chaînes vides n'a pas pu être vérifiée (test 6). Ce champ n'est pas défini dans le PDF `fields.pdf` mais est présent sur la page https://open.fda.gov/apis/device/recall/searchable-fields/.

`product_res_number` est donc retenu comme clé unique : voir la [décision 0001](decisions/0001-cle-product-res-number.md).

Au sujet de la mise à jour des données, celles-ci se font toutes les semaines selon la documentation. La dernière mise à jour observée a eu lieu le 2026-10-31, et le jeu de données openFDA compte 59 659 entrées (test 1).

Le champ `product_quantity` (nombre d'unités rappelées) n'est pas exploitable en V1 : texte libre aux formats hétérogènes, et certaines valeurs sont des totaux d'événement recopiés sur chaque produit. Les questions métier compteront donc des événements et des produits, pas des unités (test 8).

## Tests

### Test 1 : Volume et fraîcheur

Date : 4 novembre 2026
Observer le volume de données et leur fraîcheur via l'objet "Meta" qui est donné à chaque requête.

Requête : https://api.fda.gov/device/recall.json?limit=1

Résultat :
"last_updated": "2026-10-31" --> Données à jour (la documentation indique mise à jour hebdomadaire)
"total": 59659 --> Environ 60k entrées

### Test 2 : Le paramètre count renvoie par ordre décroissant

Date : 4 novembre 2026
Requête : https://api.fda.gov/device/recall.json?count=root_cause_description.exact&limit=2
Résultat :
"results": [
{
"term": "Other",
"count": 8928
},
{
"term": "Device Design",
"count": 7677
}
]
Conclusion : Count renvoie par ordre décroissant

### Test 3 : Unicité de product_res_number

Date : 4 novembre 2026
Vérifier l'unicité de la clé product_res_number

Requête : https://api.fda.gov/device/recall.json?count=product_res_number.exact&limit=1

Note : Count trie par ordre décroissant cf: https://open.fda.gov/apis/query-parameters/

Résultat : Le count le plus haut est 1
Conclusion : Aucune valeur n'apparaît plus d'une fois via l'API au 31/10/2026.

### Test 4 : product_res_number peut-il être absent ?

Date : 4 novembre 2026
Vérifier que product_res_number est toujours rempli

Requête : https://api.fda.gov/device/recall.json?search=_missing_:product_res_number&limit=1

Résultat :
"message": "No matches found!"
Conclusion : product_res_number est toujours présent, à vérifier si on a parfois product_res_number=""

### Test 5 : Unicité de cfres_id

Date : 4 novembre 2026
Requête et résultat :
https://api.fda.gov/device/recall.json?count=cfres_id&limit=1 --> illegal_argument_exception
https://api.fda.gov/device/recall.json?count=cfres_id.exact&limit=1 --> "message": "Nothing to count"

Conclusion : Impossibilité de vérifier l'unicité, nous vérifierons cela une fois les données récoltées

### Test 6 : product_res_number peut-il être une chaîne vide ?

Date : 4 novembre 2026
Requêtes :
https://api.fda.gov/device/recall.json?search=product_res_number.exact:"Z-0001-04" --> 200 ok, total 1 donc témoin fonctionne
https://api.fda.gov/device/recall.json?search=product_res_number.exact:"" --> "message": "No matches found!"

Résultat : Aucune chaîne vide trouvée via l'API.
Conclusion :
La capacité de la requête à détecter "" n'a pas pu être validée. À valider en SQL.

### Test 7 : cfres_id peut-il être absent ?

Date : 4 novembre 2026

Requête : https://api.fda.gov/device/recall.json?search=_missing_:cfres_id&limit=1
Résultat :
"results": {
"skip": 0,
"limit": 1,
"total": 8
}
Conclusion : 8 manquants, n'est pas systématiquement indiqué.

### Test 8 : La valeur quantité est-elle exploitable ?

Date : 4 novembre 2026

Requête : https://api.fda.gov/device/recall.json?count=product_quantity&limit=50

Résultat (extrait des 50 valeurs les plus fréquentes, environ 7 700 lignes sur 59 659, soit 13 %) :

| Valeur (`term`)                                             | Lignes (`count`) | Observation                                                           |
| ----------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| `1 unit`                                                    | 491              | format « N units »                                                    |
| `1`                                                         | 355              | même sens, nombre seul                                                |
| `180,573 units total`                                       | 184              | séparateur de milliers ; total d'événement recopié sur chaque produit |
| `Approx. 500,000 units of all products.`                    | 142              | valeur approchée, total d'événement                                   |
| `0`                                                         | 140              | zéro unité : signification inconnue (inconnu ?)                       |
| `5947 total`                                                | 128              | total d'événement                                                     |
| `Total of all products (Listed #1 thru 101) = 304735 units` | 98               | phrase complète, total d'événement                                    |

Conclusion :
`product_quantity` : non exploitable en V1. Texte libre aux formats hétérogènes, et granularité incohérente : certaines valeurs sont des totaux d'événement recopiés sur chaque produit (ex. « 180,573 units total » sur 184 lignes). Les sommer surestimerait massivement les unités. Les 87 % de lignes non couvertes par cet extrait ont des formats moins fréquents, probablement encore plus variés. Champ conservé brut dans le JSONB, non normalisé.

### Test 9 : Mesure de la présence de res_event_number

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=_missing_:res_event_number
Résultat : "message": "No matches found!"
Conclusion : res_event_number toujours présent sur les données actuelles

### Test 10 : Mesure de la présence de event_date_initiated

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=_missing_:event_date_initiated
Résultat : "message": "No matches found!"
Conclusion : event_date_initiated toujours présent sur les données actuelles

### Test 11: Valeurs possibles de recall_status

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?count=recall_status
Résultat:
"results": [
{
"term": "Terminated",
"count": 44686
},
{
"term": "Open, Classified",
"count": 14531
},
{
"term": "Completed",
"count": 442
}
]
Conclusion : 3 valeurs possibles : "Terminated", "Open, Classified", "Completed".
Les 3 valeurs couvrent 100 % des lignes (44 686 + 14 531 + 442 = 59 659, total du test 1) : la liste est exhaustive à cette date.
Aucune valeur « non classé » : openFDA ne publierait les rappels qu'une fois classés par la FDA (hypothèse non vérifiée).

### Test 12 : Mesure de la présence de recall_status

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=_missing_:recall_status
Résultat : "message": "No matches found!"
Conclusion : recall_status toujours présent sur les données actuelles

### Test 13 : Combien de ligne sans event_date_terminated?

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=_missing_:event_date_terminated
Résultat :
"results": {
"skip": 0,
"limit": 1,
"total": 15020
}
Conclusion : 15020 sans date de clôture

### Test 14 : Rappels avec recall_status="Terminated" sans event_date_terminated

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=recall_status:"Terminated"AND_missing_:event_date_terminated
Results :
"results": {
"skip": 0,
"limit": 1,
"total": 47
}
Conclusion : Un rappel terminé peut ne pas avoir de date de clôture
Taux (47/44686)=0,1%

### Test 15 : Rappels avec recall_status="Completed" sans event_date_terminated

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=recall_status:"Completed"AND_missing_:event_date_terminated
Results :
"results": {
"skip": 0,
"limit": 1,
"total": 442
}
Conclusion : Aucun rappel « Completed » n'a de date de clôture (comportement attendu : l'entreprise a terminé ses actions, mais la FDA n'a pas encore clôturé le rappel)
Taux: 442/442=100%

### Test 16 : Rappels avec recall_status="Open, Classified" sans event_date_terminated

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=recall_status:"Open, Classified"AND*missing*:event_date_terminated
Results :
"results": {
"skip": 0,
"limit": 1,
"total": 14531
}
Conclusion : Un rappel ouvert n'a jamais de event_date_terminated (comportement attendu : le rappel n'est pas clôturé)
Taux: 14531/14531=100%

Vérification croisée (tests 13 à 16) : 47 + 442 + 14 531 = 15 020, total du test 13. La seule anomalie est celle du test 14 : 47 rappels « Terminated » sans date de clôture (0,1 %).

### Test 17 : Mesure de la présence de event_date_posted

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=_missing_:event_date_posted
Résultat : "total": 13575
Conclusion : event_date_posted n'est pas toujours présent sur les données actuelles

### Test 18 : Mesure de la présence de root_cause_description

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=_missing_:root_cause_description
Résultat : "total": 13
Conclusion : root_cause_description n'est pas toujours présente sur les données actuelles
Taux d'absence : 13/59659=0,02%

### Test 19 : Mesure de la présence de product_code

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=_missing_:product_code
Résultat : "total": 359
Conclusion : product_code n'est pas toujours présent sur les données actuelles
Taux d'absence : 359/59659=0,6%

### Test 20 : Mesure de la présence de recalling_firm

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=_missing_:recalling_firm
Résultat : "total": 1
Conclusion : recalling_firm n'est pas toujours présent sur les données actuelles
Taux d'absence : 1/59659=0,0016%

### Test 21 : Mesure de la présence de firm_fei_number

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=_missing_:firm_fei_number
Résultat : "total": 98
Conclusion : firm_fei_number n'est pas toujours présent sur les données actuelles
Taux d'absence : 98/59659=0,16%

### Test 22 : Mesure de la présence de openfda.medical_specialty_description

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=_missing_:openfda.medical_specialty_description
Résultat : "total": 1287
Conclusion : openfda.medical_specialty_description n'est pas toujours présente sur les données actuelles
Taux d'absence : 1287/59659=2,16%

### Test 23 : Mesure de la présence de openfda.device_class

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?search=_missing_:openfda.device_class
Résultat : "total": 1287
Conclusion : openfda.device_class n'est pas toujours présente sur les données actuelles
Taux d'absence : 1287/59659=2,16%

Observation (tests 22 et 23) : les deux champs manquent exactement sur le même nombre de lignes (1 287). Hypothèse : c'est tout l'objet openfda qui est absent sur ces lignes (non vérifiée). Contrairement à fields.pdf, la spécialité ne semble pas manquer spécifiquement pour les dispositifs de classe 3.

### Test 24: Valeurs possibles de openfda.device_class

Date : 5 novembre 2026
Requête : https://api.fda.gov/device/recall.json?count=openfda.device_class
[
{
"term": "2",
"count": 44102
},
{
"term": "1",
"count": 9876
},
{
"term": "3",
"count": 3697
},
{
"term": "U",
"count": 368
},
{
"term": "N",
"count": 306
},
{
"term": "f",
"count": 23
}
]
Conclusion : 6 valeurs possibles : "1", "2", "3", "U", "N", "f".
Les 6 valeurs couvrent 100 % des lignes renseignées (44 102 + 9 876 + 3 697 + 368 + 306 + 23 = 58 372 ; avec les 1 287 lignes sans valeur du test 23, total = 59 659, total du test 1) : la liste est exhaustive à cette date.
« f » est en minuscule alors que fields.pdf documente « F » (HDE) ; « U » et « N » étant en majuscules, ce n'est vraisemblablement pas un effet de l'API (à confirmer avec search=openfda.device_class:"f").
La classe 2 représente 74 % des lignes.
