import { css } from 'lit';

export const styles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--timeline-canvas-bg, #ffffff);
  }

  canvas {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
  }

  .canvas-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  /* 드래그 커서 */
  :host([dragging]) {
    cursor: grabbing !important;
  }

  :host([resize-mode="start"]),
  :host([resize-mode="end"]) {
    cursor: ew-resize !important;
  }

  /* 로딩 오버레이 */
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  :host([loading]) .loading-overlay {
    opacity: 1;
    pointer-events: auto;
  }
`;
