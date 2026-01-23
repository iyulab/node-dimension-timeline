import { DimensionSelector } from './DimensionSelector.component.js';

DimensionSelector.define('d-dimension-selector');

declare global {
  interface HTMLElementTagNameMap {
    'd-dimension-selector': DimensionSelector;
  }
}

export { DimensionSelector };
