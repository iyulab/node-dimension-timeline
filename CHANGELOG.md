# Changelog

## [Unreleased]

## [0.1.0] - Unreleased

First public release.

### Added

- `<d-dimension-timeline>` — places tasks on a time axis grouped by a chosen dimension (project, assignee,
  equipment, …) instead of fixed rows; a lane only breaks when tasks overlap.
- Dimension selector, time axis (hour / day / week / month scales), context slice, and drag / resize editing
  (the demo shows an undo stack built on the edit events).
- `ArrayDataSource` and `DataSourceFactory` for feeding tasks; typed events for selection and edits.
