# Glossary

> **Status:** draft

## Terms

| Term | Meaning in this app | Not to be confused with | In code |
| --- | --- | --- | --- |
| Catch record | One saved entry that describes an angler's fishing catch. | A fishing trip, which is not an entity in the MVP. | `CatchRecord` |
| Angler | The person whose catch is recorded. The MVP identifies an angler by name only. | An authenticated app user; the MVP has no accounts. | `anglerName` |
| Fish category | A high-level group for a fish species: predatory or non-predatory. | Fish species. | `fishCategory` |
| Predatory fish | A fish category for species that hunt other fish, such as pike, perch, and zander. | Non-predatory fish. | `'predatory'` |
| Non-predatory fish | A fish category for species that do not hunt other fish, such as crucian carp, carp, bream, and silver carp. | Predatory fish. | `'non-predatory'` |
| Fish species | The specific kind of fish in a catch record, such as pike or carp. | Fish category. | `fishSpecies` |
| Fish count | The total number of fish in one catch record. | Total weight. | `fishCount` |
| Total weight | The combined weight of all fish in one catch record, measured in kilograms. | Fish count. | `totalWeightKg` |
| Caught at | The calendar date on which the catch was recorded. | The date when the record was added to the application. | `caughtAt` |
| Catch record ID | The stable identifier assigned to a catch record by the API when it is created, including for records initialized from seed data. It is used to edit or delete one catch record. | Angler, which is a name that can be edited and is not an identifier. | — |
| Catch statistics | The total fish count and total weight shown for the catch records currently in view. | A catch record, which holds one result. | — |
| Fish category filter | The active selection in the Fish category filter dropdown: All (default after page reload, no persistence required), Predatory, or Non-predatory. It determines which catch records are listed and which ones catch statistics cover. | Fish category, which is a property of a catch record rather than a selection. | — |
