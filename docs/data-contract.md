# Objectif du document

L'objectif de ce document est de définir les termes retenus issus de l'API OpenFDA.

# Problèmes observés

## Problème 1 : product_res_number

Le champ `product_res_number` n'est pas défini dans le PDF `fields.pdf`, mais il est présent sur la page https://open.fda.gov/apis/device/recall/searchable-fields/. Le PDF semble donc incomplet ; la cause n'est pas connue.

Via l'API, aucun doublon ni aucune absence n'ont été observés (voir [openfda-notes.md](openfda-notes.md), tests 3 et 4) ; à confirmer en SQL.

Ce champ est retenu comme clé unique : voir la [décision 0001](decisions/0001-cle-product-res-number.md).

Action : contacter le responsable de la collecte des données (OpenFDA) pour clarifier le cas de ce champ.
