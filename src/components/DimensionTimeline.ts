import { DimensionTimeline } from './DimensionTimeline.component.js';

DimensionTimeline.define('d-dimension-timeline');

declare global {
  interface HTMLElementTagNameMap {
    'd-dimension-timeline': DimensionTimeline;
  }
}

export { DimensionTimeline };
