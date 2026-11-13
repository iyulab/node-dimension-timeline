# Changelog

## [Unreleased]

### Added

- **`custom-elements.json` — a Custom Elements Manifest for every element.** The package ships `dist/custom-elements.json`
  (`@iyulab/dimension-timeline/dist/custom-elements.json`, declared in the `customElements` field of `package.json`) so editors,
  documentation tools and AI agents can read each element's attributes, properties, events and CSS parts without
  parsing the source. It is generated at build time (`npm run analyze`) and lists the events an element raises through
  `emit()` with a literal name. The five elements' class descriptions replace the placeholders and carry the tag name
  (`@customElement d-…`), which the analyzer needs because these elements are registered through `static define(name)`.
- **An agent skill (`skills/iyulab-dimension-timeline/SKILL.md`).** The package now ships the same kind of short usage guide as the other
  element packages: the data model, the properties and methods, the events with their `detail` shapes (including which ones can be
  cancelled), data sources, wording and locale, and a pointer to the Custom Elements Manifest.

### Removed

- **`InteractionManager`, `InteractionConfig` and `SelectionState` are no longer exported.** The element never used them (its drag and
  selection handling is its own), and the cross-dimension drag they sketched was never connected. Nothing in this package, its
  tests or its demo referred to them.
- **`cross-dimension-move` (`crossDimensionMove`) is gone from `<d-dimension-timeline>`.** The element never read it: dragging a task
  moved it in time only, `timeline-task-move`'s `newDimensionValue` always equalled `originalDimensionValue`, and the data source
  received `start` and `end` only. Setting the attribute had no effect, so removing it changes no behaviour.
- **Eight names are gone from `TimelineEventMap`, with their detail types** — `timeline-task-contextmenu`, `timeline-dimension-filter`,
  `timeline-view-change`, `timeline-zoom`, `timeline-scale-change`, `timeline-canvas-click`, `timeline-context-toggle` and
  `timeline-context-drop` (`TimelineTaskContextMenuDetail`, `TimelineDimensionFilterDetail`, `TimelineViewChangeDetail`,
  `TimelineZoomDetail`, `TimelineScaleChangeDetail`, `TimelineCanvasClickDetail`, `TimelineContextToggleDetail`,
  `TimelineContextDropDetail`). Nothing raised them, so a listener typed through the map waited for an event that never came. A test
  now fails when the map lists a name no `emit()` call raises. Types only; nothing changes at runtime.

### Fixed

- **A double-click reaches your listener once.** `timeline-task-dblclick` and `timeline-canvas-dblclick` arrived twice per double-click: the
  inner canvas raised the event across the shadow boundary and the element raised it again under the same name, so a handler (open an
  editor, create a task) ran twice, and the second `timeline-canvas-dblclick` had no `date`. Parts now keep their events inside the
  element, so the page sees only what the element raises. The same boundary stops the parts' unprefixed `dimension-change`,
  `dimension-value-click`, `dimension-filter`, `context-toggle` and `context-drop` and the canvas's `timeline-canvas-mousemove`,
  `timeline-canvas-mousedown`, `timeline-task-mousedown` and `timeline-canvas-resize` from reaching the document — none was documented.
  `timeline-task-hover` still reaches the page.
- **`timeline-task-delete-request` and `timeline-boundary-reached` are typed on the element.** The element has always raised both
  (the Delete key on a selected task; the viewport reaching the edge of the loaded range), but `TimelineEventMap` did not list them, so
  `addEventListener('timeline-task-delete-request', e => …)` gave `e` the plain `Event` type and `e.detail` did not compile. They now
  carry `TimelineTaskDeleteRequestDetail` (`{ taskId }`) and `TimelineBoundaryReachedDetail`. Types only; nothing changes at runtime.
- **The row groups are ordered by the element's locale, with numbers inside a name read as numbers.** The dimension values that name the rows were ordered with the browser's default string comparison: `Team 10` stood before `Team 2`, and whether Hangul names came before or after Latin ones followed each user's browser language, so the same timeline showed its rows in a different order to two users. The rows now follow the `locale` attribute (or the nearest `lang`), then English, never the browser language: `Team 2` before `Team 10`, case and accents compare as the same letter. Rows that start with an unassigned value still come last.
- **The time axis computes its labels before it draws, and the elements no longer log Lit's «scheduled an update after an update completed».**
  `d-time-axis` derived its labels in `updated()`, so every change of the visible range, scroll offset or scale drew stale labels once and
  then drew again — twice per scroll frame, with the labels one frame late. They are now computed in `willUpdate()`: one draw, current
  labels. Turning `highlight-today` on after it started off, and changing `axisLabel`, also refresh the labels now (neither did). In a development
  build of Lit, mounting a timeline logged the warning for `d-time-axis` and `d-dimension-timeline` in the console of every app;
  the timeline's second draw is inherent (it measures its canvas after the first draw), so that element turns the warning off.



## [0.3.2] - 2026-11-11

### Fixed

- **In a right-to-left page the chrome follows the reading direction and the time axis stays left to right.** The dimension
  selector column and the corner header stand at the start side (the right), the corner header's border faces the time axis,
  the selector's dropdown, its chevron and the selected-value mark sit on the logical start/end sides. Time runs from left to
  right in any page direction — the axis, the canvas, the ticks, the now marker, the scrollbar and the zoom buttons are one
  plot region that keeps physical coordinates, so the arrow keys still pan toward earlier (left) or later (right) time.
  Left-to-right rendering is unchanged.
- **Dimension value names and context labels wrap instead of ending in «…».** In the 200px dimension selector a long
  value name lost its tail with no way to read it.

## [0.3.1] - 2026-10-27

The first release of these changes — the `v0.3.0` tag was made, but its publish job stopped before publishing
(the release workflow ran the browser tests without installing a browser), so 0.3.0 was never on the registry.

### Added

- `locale` — the language of the built-in text. `registerTimelineLabels(locale, labels)` adds a language;
  `resolveLabels(labels, locale)` takes the locale as its second argument.
- Typed `addEventListener` / `removeEventListener` overloads for the `timeline-*` events (`TimelineEventMap`).

### Changed

- README: a section on the CSS custom properties — the size handles with their defaults, the colour handles by area.

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

### Removed

- `TimelineOptions` and `DEFAULT_OPTIONS` — exported but read by nothing; setting them changed nothing. The element's
  properties and the CSS custom properties are the configuration.
- `d-time-axis`'s `height` property — give the element a height in CSS instead (it fills the box it is placed in).

### Fixed

- **The timeline and its context slices keep their borders and backgrounds under a document-wide CSS reset**
  (Tailwind's preflight and the like). `d-dimension-timeline` draws its box on its own container and `d-context-slice`
  on a new `base` part, inside the shadow root where a document rule cannot reach them.
- **The viewport and pointer positions follow the drawn area.** The timeline took its viewport as the host box less a
  fixed 200px selector and 48px time axis, so with `--dimension-selector-width` or `--time-axis-height` changed — or
  just the container's border — the visible range, Ctrl+wheel zoom centre and drag positions were off by the
  difference. Both now come from the task area itself, which is also watched for size changes.
- **The time axis fills its row.** It was drawn 48px tall whatever `--time-axis-height` said; it now takes the row's
  height. `d-context-slice`'s `getTotalHeight()` counts its drawn header (`--context-header-height` and its border)
  instead of a fixed 32px.

- `IntervalTree.delete()` could miss an interval whose start equals another's once the tree had rebalanced, and
  with identical intervals it could remove a different one than the predicate named.
- `CollisionLayoutEngine.layout()` with no tasks reports a `totalHeight` of 0 instead of minus one gap.
- The published package now declares `sideEffects`, so bundlers keep the modules that register the custom elements
  and can tree-shake the rest. The package entry is among them: it imports the registrations for their effect only, and
  a bundler drops such an import inside a module it treats as free of side effects — without the entry declared, an
  app that imported only types and `ArrayDataSource` from the package shipped no `<d-dimension-timeline>` at all. It also declares `engines.node` and ships this changelog.
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
