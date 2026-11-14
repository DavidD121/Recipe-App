# Recipe App

Cooks publish recipes and build shopping lists from them. The app combines a list's quantities
into one amount per ingredient wherever the units allow it.

## Catalog

**Item**:
An ingredient in the shared catalog, used by every recipe and shopping list. Each one is either canonical or an alias.
_Avoid_: Ingredient (when meaning the catalog entry), product

**Alias**:
An item that stands in for a canonical item, usually a misspelling or a duplicate. Anything that refers to an alias is treated as referring to its canonical item.
_Avoid_: Synonym, duplicate

**Dimension**:
What a unit measures: mass, volume or count.

**Unit**:
A named measure within one dimension, such as gram, cup or clove.

**Density**:
How many grams one millilitre of an item weighs. Volume amounts can't convert to mass without it.
_Avoid_: grams_per_ml in prose

**Count weight**:
How many grams one count unit of a particular item weighs, such as one clove of garlic. Count amounts can't convert to mass without it.

## Recipes

**Recipe**:
A cook's published dish: a description, ordered ingredients and ordered steps. Anyone can read it, and only its author can change it.

**Author**:
The user who published a recipe.
_Avoid_: Owner (reserved for shopping lists), creator

**Recipe ingredient**:
One item, with an optional amount and unit, in a recipe's ordered list. A recipe may use the same item more than once.
_Avoid_: Line (reserved for shopping lists)

**To taste**:
A recipe ingredient with no amount.

## Shopping

**Shopping list**:
A private, named list of what a user intends to buy. Only its owner can see it.

**Shopping list line**:
One entry on a shopping list: an item with an optional amount and unit. It was either added by hand or copied from a recipe.
_Avoid_: Shopping list item (the table's name, which reads as the catalog item)

**Snapshot**:
The amount, unit and recipe name copied onto a line when a recipe is added. Later edits to the recipe don't change it.

**Scale**:
The multiplier applied to a recipe's amounts when it is added to a shopping list.

**Combined entry**:
All of a shopping list's lines for one canonical item, shown together.
_Avoid_: Group, aggregate

**Combinable**:
A combined entry is combinable when every one of its lines converts to grams. Only then does it have a total.

**Checked**:
A line the shopper has marked as in the trolley. Checking a combined entry checks every line in it.
_Avoid_: Done, purchased
