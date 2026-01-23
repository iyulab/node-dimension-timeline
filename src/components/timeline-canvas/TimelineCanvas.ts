import { TimelineCanvas } from './TimelineCanvas.component.js';

TimelineCanvas.define('d-timeline-canvas');

declare global {
  interface HTMLElementTagNameMap {
    'd-timeline-canvas': TimelineCanvas;
  }
}

export { TimelineCanvas };
