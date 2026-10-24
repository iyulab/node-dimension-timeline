# Changelog

## [Unreleased]

### Fixed

- **The timeline and its context slices keep their borders and backgrounds under a document-wide CSS reset**
  (Tailwind's preflight and the like). `d-dimension-timeline` draws its box on its own container and `d-context-slice`
  on a new `base` part, inside the shadow root where a document rule cannot reach them.

### Changed

- **The built-in text defaults to English** (`DEFAULT_TIMELINE_LABELS`). The Korean text ships with the package and
  is chosen with `locale="ko"`; with `locale` empty, the component follows the nearest `lang` (including the
  document's), so a page with `<html lang="ko">` keeps the Korean text. To keep Korean on a page without `lang`, set
  `locale="ko"`.
- The sample data from `DataSourceFactory` uses English task names.
- Transition durations read `--u-duration-*` (fallbacks 80 / 140 / 220 ms — before: 100 / 150 / 200 ms) and the
  dimension menu reads `--u-layer-floating` (1000) — with the `@iyulab/components` theme loaded, they follow its timing
  and reduced-motion setting.
  `@iyulab/components` (>=1.49.0, the release that added `--u-layer-*`) is an optional peer — nothing changes
  without it.

### Added

- `locale` — the language of the built-in text. `registerTimelineLabels(locale, labels)` adds a language;
  `resolveLabels(labels, locale)` takes the locale as its second argument.
- Typed `addEventListener` / `removeEventListener` overloads for the `timeline-*` events (`TimelineEventMap`).

### Fixed

- `IntervalTree.delete()` could miss an interval whose start equals another's once the tree had rebalanced, and
  with identical intervals it could remove a different one than the predicate named.
- `CollisionLayoutEngine.layout()` with no tasks reports a `totalHeight` of 0 instead of minus one gap.
- The published package now declares `sideEffects`, so bundlers keep the modules that register the custom elements
  and can tree-shake the rest. It also declares `engines.node` and ships this changelog.
- Comments inside the component stylesheets are no longer shipped in `dist`.

## [0.2.0] - 2026-10-19

### Added

- `labels` — every string the component draws itself (dimension header, empty-selection text, search name and
  placeholder, empty and no-result text, zoom buttons, scale names, time-axis tick text via `axisLabel`) can be
  overridden; keys not given keep the defaults (`DEFAULT_TIMELINE_LABELS`, Korean). `resolveLabels` merges a partial
  object over the defaults.
- `hide-dimension-dropdown` — hides the built-in dimension picker in the top-left corner, for apps that choose
  `activeDimension` with their own control.
- The zoom buttons now carry an accessible name (`aria-label`), not only a tooltip.

## [0.1.0] - 2026-10-18

First public release.

### Added

- `<d-dimension-timeline>` — places tasks on a time axis grouped by a chosen dimension (project, assignee,
  equipment, …) instead of fixed rows; a lane only breaks when tasks overlap.
- Dimension selector, time axis (hour / day / week / month scales), context slice, and drag / resize editing
  (the demo shows an undo stack built on the edit events).
- `ArrayDataSource` and `DataSourceFactory` for feeding tasks; typed events for selection and edits.
