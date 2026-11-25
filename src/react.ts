/**
 * React 입구 (`@iyulab/dimension-timeline/react`)
 *
 * `@lit/react` 의 `createComponent` 로 감싼다 — `dataSource` · `dimensions` 같은 객체 속성은 JSX 속성으로 그대로
 * 넘기고, 불리언은 속성(property)으로 들어가며, 커스텀 이벤트는 `TimelineEventMap` 의 이름마다 `onXxx` 속성으로 받는다
 * (detail 의 형이 묶인다).
 *
 * `react` · `@lit/react` 는 선택 peer 다 — 이 서브패스를 가져오는 React 소비자에게만 필요하다.
 */
import React from 'react';
import { createComponent, type EventName } from '@lit/react';

import { DimensionTimeline } from './components/DimensionTimeline.js';
import type { TimelineEventMap } from './events/TimelineEvents.js';

/**
 * `TimelineEventMap` → React `onXxx` 속성.
 *
 * `createComponent` 는 런타임 객체를 요구하는데 이벤트 맵은 형이라 런타임에 남지 않는다 — 목록을 도출할 수 없다. 그래서
 * 맵에 이벤트가 더해지고 여기가 빠지는 것을 아래 단언이 컴파일 시간에 막는다(이름이 없는 이벤트는 React 소비자에게만
 * 조용히 없는 이벤트가 된다).
 */
const TIMELINE_EVENTS = {
  onTaskSelect: 'timeline-task-select',
  onTaskMove: 'timeline-task-move',
  onTaskResize: 'timeline-task-resize',
  onTaskHover: 'timeline-task-hover',
  onTaskDblclick: 'timeline-task-dblclick',
  onTaskDeleteRequest: 'timeline-task-delete-request',
  onDimensionChange: 'timeline-dimension-change',
  onDimensionValueClick: 'timeline-dimension-value-click',
  onBoundaryReached: 'timeline-boundary-reached',
  onDragStart: 'timeline-drag-start',
  onDrag: 'timeline-drag',
  onDragEnd: 'timeline-drag-end',
  onCanvasDblclick: 'timeline-canvas-dblclick',
} as const satisfies Record<string, keyof TimelineEventMap>;

type UncoveredEvents = Exclude<keyof TimelineEventMap, (typeof TIMELINE_EVENTS)[keyof typeof TIMELINE_EVENTS]>;
const _eventsAreExhaustive: UncoveredEvents extends never ? true : UncoveredEvents = true;
void _eventsAreExhaustive;

/** `<d-dimension-timeline>` 의 React 컴포넌트 — 이벤트는 `TimelineEventMap` 전부를 `onXxx` 로 받는다. */
export const DimensionTimelineReact = createComponent({
  tagName: 'd-dimension-timeline',
  elementClass: DimensionTimeline,
  react: React,
  events: TIMELINE_EVENTS as {
    [K in keyof typeof TIMELINE_EVENTS]: EventName<TimelineEventMap[(typeof TIMELINE_EVENTS)[K]]>;
  },
});
