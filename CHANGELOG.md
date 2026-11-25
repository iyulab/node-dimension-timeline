# Changelog

## [0.5.0] - 2026-11-25

### Fixed

- **The zoom buttons show their icons.** The `+` and `−` were filled paths that are just lines, so they enclosed no area and
  drew nothing: the buttons looked empty. They are stroked now.
- **The top row of the time axis keeps its text on screen when a cell is wider than the viewport.** With `scale="hour"` a day cell is
  2,880px wide; only its left edge was clipped to the viewport, so the centred text sat far off screen. The cell is clipped to the
  visible range on both sides.
- **The left list has exactly the lanes the canvas draws.** A value defined in `dimensions[].values` that no task uses used to add a row
  on the left only, which stacked its label on top of another row. `dimensions[].values` now only names (and colours) the lanes that
  have tasks; with no tasks at all the defined values still show as the list to pick from.
- **Mounting the element where `canvas.getContext('2d')` returns `null`** (DOM-emulating test environments) no longer throws
  `Cannot read properties of null (reading 'clearRect')`. Nothing is drawn there.

### Added

- **`@iyulab/dimension-timeline/react` — a React entry.** `DimensionTimelineReact` is the element wrapped with `@lit/react`: object and
  boolean props are passed to the element as properties, and every name in `TimelineEventMap` is an `onXxx` prop whose `detail` is typed
  (`onTaskSelect`, `onTaskMove`, `onTaskResize`, `onTaskHover`, `onTaskDblclick`, `onTaskDeleteRequest`, `onDimensionChange`,
  `onDimensionValueClick`, `onBoundaryReached`, `onDragStart`, `onDrag`, `onDragEnd`, `onCanvasDblclick`). A compile-time check fails the
  build when the event map gains a name this list lacks. `react` and `@lit/react` are optional peer dependencies, needed only for this
  subpath.
- **`labels.unassigned` names the lane of tasks that have no value for the active dimension** (English `Unassigned`, Korean `미지정`).
  That lane used to be a row named `(none)` on the canvas with no row on the left; it now has both, and the name follows `locale` and
  `labels` like the other wording. `NO_DIMENSION_VALUE` is the key that lane groups under.

- **`Task.baseline` — a reference interval drawn with the bar.** A task can carry `baseline: { start, end }` (planned vs actual, promised vs
  taken, booked vs used). The default template draws it as an outline under the bar (`--timeline-task-baseline`, or
  `TaskStyleConfig.baseline`), the layout counts the union of the bar and its baseline when it assigns rows — so a baseline never overlaps
  a task on the next row — and `LayoutedTask.baseline` gives its pixel range (`{ x, width }`) to custom templates. The baseline is not
  hit-tested and is not dragged with the bar.
- **The canvas follows the app theme.** Every colour painted on the canvas is now a CSS colour expression read as `--timeline-*` knob
  → `@iyulab/components` token → the previous built-in colour: the background (`--timeline-canvas-bg`), grid lines, the now line, row
  stripes, context dividers, the selection line, and the task bars per status (`--timeline-task-{bg,border,text}`,
  `--timeline-task-{pending,in-progress,completed,cancelled}-{bg,border,text}`, `--timeline-task-selected-border`). The expressions are
  resolved inside the element (`var()` chains, `light-dark()` and modern colour functions work) and re-resolved when the document root's
  `class`, `style` or `data-*` change or `prefers-color-scheme` flips; for a variable changed on another ancestor call
  `refreshTheme()` (also done by `refresh()`). `Task.color` and `TaskStyleConfig` colours may be such expressions, and
  `RenderContext.resolveColor` lets a custom template resolve them. With no knob and no token the colours are the same as before; where
  the tokens exist the bars, grid and now line follow them.

### Changed

- **The optional peer `@iyulab/components` now starts at `>=2.0.0`** (was `>=1.49.0`): the canvas background reads `--u-canvas-bg-color`, which that package defines from 2.0.0. Without it the canvas still falls back to its built-in white, so nothing breaks on an older install; the floor only states where the tokens are all defined.
- **Selecting from code no longer raises `timeline-task-select`.** `selectTask(id)` sets the selection quietly and `scrollToTask(id)`
  only scrolls — it no longer selects. The event is raised when the user selects (pointer press on a task). An app that updates its own
  state from the event and then calls `selectTask` no longer gets the event back. Code that relied on `scrollToTask` to select calls
  `selectTask(id)` as well; code that relied on `selectTask` to raise the event handles the state change where it makes it.

## [0.4.0] - 2026-11-18

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
