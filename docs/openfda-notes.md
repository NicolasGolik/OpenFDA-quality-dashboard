# Objectif du document

Journaliser les appels API et les conclusions sur les résultats obtenus

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

### Test 6 : product_res_number n'est jamais égal à ""

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
