# Changelog

## [Unreleased]

### Added

- `labels` — every string the component draws itself (dimension header, empty-selection text, search name and
  placeholder, empty and no-result text, zoom buttons, scale names, time-axis tick text via `axisLabel`) can be
  overridden; keys not given keep the defaults (`DEFAULT_TIMELINE_LABELS`, Korean). `resolveLabels` merges a partial
  object over the defaults.
- `hide-dimension-dropdown` — hides the built-in dimension picker in the top-left corner, for apps that choose
  `activeDimension` with their own control.
- The zoom buttons now carry an accessible name (`aria-label`), not only a tooltip.

## [0.1.0] - Unreleased

First public release.

### Added

- `<d-dimension-timeline>` — places tasks on a time axis grouped by a chosen dimension (project, assignee,
  equipment, …) instead of fixed rows; a lane only breaks when tasks overlap.
- Dimension selector, time axis (hour / day / week / month scales), context slice, and drag / resize editing
  (the demo shows an undo stack built on the edit events).
- `ArrayDataSource` and `DataSourceFactory` for feeding tasks; typed events for selection and edits.
