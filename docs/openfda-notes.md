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

| Valeur (`term`) | Lignes (`count`) | Observation |
|---|---|---|
| `1 unit` | 491 | format « N units » |
| `1` | 355 | même sens, nombre seul |
| `180,573 units total` | 184 | séparateur de milliers ; total d'événement recopié sur chaque produit |
| `Approx. 500,000 units of all products.` | 142 | valeur approchée, total d'événement |
| `0` | 140 | zéro unité : signification inconnue (inconnu ?) |
| `5947 total` | 128 | total d'événement |
| `Total of all products (Listed #1 thru 101) = 304735 units` | 98 | phrase complète, total d'événement |

Conclusion :
`product_quantity` : non exploitable en V1. Texte libre aux formats hétérogènes, et granularité incohérente : certaines valeurs sont des totaux d'événement recopiés sur chaque produit (ex. « 180,573 units total » sur 184 lignes). Les sommer surestimerait massivement les unités. Les 87 % de lignes non couvertes par cet extrait ont des formats moins fréquents, probablement encore plus variés. Champ conservé brut dans le JSONB, non normalisé.
