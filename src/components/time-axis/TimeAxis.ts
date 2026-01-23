import { TimeAxis } from './TimeAxis.component.js';

TimeAxis.define('d-time-axis');

declare global {
  interface HTMLElementTagNameMap {
    'd-time-axis': TimeAxis;
  }
}

export { TimeAxis };
