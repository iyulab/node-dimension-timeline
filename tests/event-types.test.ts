import { expect, test } from 'vitest';
import type { DimensionTimeline } from '../src/components/DimensionTimeline.component.js';
import type { TimelineZoomDetail } from '../src/events/TimelineEvents.js';

// 타입 시험 — `npm run typecheck` 가 이 파일을 컴파일한다. 리스너가 `Event` 가 아니라
// `CustomEvent<TimelineZoomDetail>` 를 받아야 `e.detail.newScale` 이 컴파일된다.
function listen(el: DimensionTimeline) {
  el.addEventListener('timeline-zoom', (e) => {
    const detail: TimelineZoomDetail = e.detail;
    return detail.newScale;
  });
  el.removeEventListener('timeline-task-select', (e) => e.detail.task);
  // 네이티브 이벤트도 그대로 타입이 붙는다
  el.addEventListener('click', (e) => e.clientX);
}

test('timeline events are typed on the element (compile-time)', () => {
  expect(typeof listen).toBe('function');
});
