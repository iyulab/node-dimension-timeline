import { ContextSlice } from './ContextSlice.component.js';

ContextSlice.define('d-context-slice');

declare global {
  interface HTMLElementTagNameMap {
    'd-context-slice': ContextSlice;
  }
}

export { ContextSlice };
