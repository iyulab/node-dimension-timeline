---
name: iyulab-dimension-timeline
description: Row-less timeline web component (<d-dimension-timeline>) that groups tasks by a chosen dimension (project, worker, equipment, tag) and lays overlapping tasks out automatically. Use when working with @iyulab/dimension-timeline to show tasks over time, switch the grouping dimension, drag or resize tasks, or react to timeline events.
license: MIT
compatibility: Browser environments only
metadata:
  author: iyulab
---

# @iyulab/dimension-timeline

A timeline whose lanes come from data, not from a fixed row model. Each task carries values for one or more
**dimensions**; the viewer picks the active dimension and the element draws one context per value, stacking tasks
into extra lines only where they overlap.

## Install

```bash
npm install @iyulab/dimension-timeline
```

Importing the package registers `<d-dimension-timeline>` (and its inner `d-*` parts). `lit` is a dependency.

## Minimal use

```html
<d-dimension-timeline id="timeline" style="height: 480px"></d-dimension-timeline>

<script type="module">
  import { ArrayDataSource } from '@iyulab/dimension-timeline';

  const timeline = document.getElementById('timeline');
  timeline.dataSource = new ArrayDataSource([
    { id: 't1', start: new Date('2026-10-01T09:00'), end: new Date('2026-10-01T12:00'),
      dimensions: { project: 'A', worker: 'Kim' }, label: 'Assembly' },
  ]);
  timeline.dimensions = [
    { key: 'project', label: 'Project' },
    { key: 'worker', label: 'Worker' },
  ];
  timeline.activeDimension = 'project';
  timeline.scale = 'hour';
</script>
```

Give the element a height through its container or style. Set `dataSource` and `dimensions` before expecting content.

## Data model

```ts
type Task<T = unknown> = {
  id: string;
  start: Date;
  end: Date;
  dimensions: Record<string, string | string[]>; // dimension key -> value(s)
  label?: string;
  color?: string;
  status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  progress?: number;                              // 0-100
  metadata?: T;
};

type Dimension = { key: string; label: string; icon?: string; values?: { key: string; label: string }[] };
```

A dimension is an attribute of the data, not a structure: do not give the lanes meaning of their own.

## Data sources

`dataSource` takes any object implementing `DataSource<T>` (`query`, `getById`, `getByIds`, `getInRange`, `add`,
`addBulk`, `update`, `delete`, `deleteBulk`, `subscribe`, `getDimensionValues`, `count`, `getTimeRange`, `dispose`).
`ArrayDataSource` is the in-memory implementation. Change tasks through the data source rather than by editing task
objects, so subscribers are notified.

## Properties

| Property (attribute) | Type | Default | Purpose |
|---|---|---|---|
| `dataSource` | `DataSource<T> \| null` | `null` | Where tasks come from |
| `dimensions` | `Dimension[]` | `[]` | Dimensions the viewer can group by |
| `activeDimension` (`active-dimension`) | `string` | `''` | Dimension key currently grouping the view |
| `scale` | `TimeScaleUnit` | `'day'` | `'10min' \| '30min' \| 'hour' \| '6hour' \| '12hour' \| 'day' \| 'week' \| 'month'` |
| `zoomable` / `pannable` | `boolean` | `true` | Zoom and drag panning |
| `tasksDraggable` (`tasks-draggable`) / `tasksResizable` (`tasks-resizable`) | `boolean` | `true` | Move / resize tasks by pointer |
| `taskHeight` (`task-height`) / `taskGap` (`task-gap`) | `number` | `32` / `4` | Line height and gap in px |
| `template` | `string` | `'default'` | Task template name (register custom ones with `TemplateRegistry`) |
| `timeRegions` | `TimeRegion[]` | `[]` | Shaded spans: `'holiday' \| 'work-shift' \| 'break' \| 'custom'`, optionally recurring |
| `loading` | `boolean` | `false` | Shows the loading state |
| `locale` / `labels` | `string` / `Partial<TimelineLabels>` | `''` / `{}` | Built-in wording; see below |
| `hideDimensionDropdown` (`hide-dimension-dropdown`) | `boolean` | `false` | Hide the built-in dimension picker when the app has its own |
| `realtimeInterval` (`realtime-interval`) | `number` | `60000` | Now-marker refresh in ms |

Methods: `selectTask(id)`, `scrollToDate(date, position?)`, `scrollToTask(id)`, `scrollToDimensionValue(value)`,
`setScale(scale)`, `setActiveDimension(key)`, `refresh()`.

## Events

`CustomEvent`s raised on the element. Type them with the exported `Timeline*Detail` interfaces.

| Event | `detail` |
|---|---|
| `timeline-task-select` | `{ task, previousTask, dimensionValue }` |
| `timeline-task-dblclick` | `TimelineTaskDoubleClickDetail` |
| `timeline-task-move` (cancelable) | `{ task, originalStart, originalEnd, newStart, newEnd, originalDimensionValue, newDimensionValue }` |
| `timeline-task-resize` (cancelable) | `{ task, originalStart, originalEnd, newStart, newEnd, edge: 'start' \| 'end' }` |
| `timeline-task-delete-request` | `{ taskId }` - the Delete key on a selected task; the element deletes nothing itself |
| `timeline-drag-start` / `timeline-drag` / `timeline-drag-end` | `TimelineDragStartDetail` / `TimelineDragDetail` / `{ task, mode, cancelled }` |
| `timeline-dimension-change` | `{ previousDimension, newDimension }` |
| `timeline-dimension-value-click` | `{ dimension, value, label }` |
| `timeline-canvas-dblclick` | `TimelineCanvasDoubleClickDetail` |
| `timeline-boundary-reached` | `{ direction, currentStart, currentEnd }` - the viewport hit the edge of the loaded range |

After a move or resize the element writes the new `start` and `end` to the data source with `update()`. To veto or
replace that (validation, a server round trip), call `event.preventDefault()` on `timeline-task-move` or
`timeline-task-resize` and persist the change yourself.

## Wording and locale

Built-in wording defaults to English. Set `locale="ko"` for the bundled Korean, or leave `locale` empty to follow the
nearest ancestor's `lang`. Add a locale with `registerTimelineLabels('ja', { select: '...' })`; override single keys
for one instance with `timeline.labels = { dimension: 'Group by' }`.

## Styling

Style it through CSS custom properties set on `d-dimension-timeline`: sizes such as `--time-axis-height`, and colours
grouped by area prefixes such as `--timeline-*`, `--time-axis-*` and `--context-*`. Every property has a fallback, so
nothing needs to be set. The full list is in the package `README.md`.

## Machine-readable reference

The element surface is also published as a Custom Elements Manifest: the file named by the `customElements` field of this package's `package.json` (`dist/custom-elements.json`). It lists every element's attributes, properties, events (with the type of their `detail`), slots, CSS parts and CSS custom properties, generated from the source at build time. Read it instead of parsing the source when you need the exact surface of an element.
