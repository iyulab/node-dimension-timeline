import { css } from 'lit';

export const styles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 200px;
    font-family: var(--timeline-font-family, system-ui, -apple-system, sans-serif);
    background: var(--timeline-bg, #ffffff);
    border: 1px solid var(--timeline-border, #e2e8f0);
    border-radius: var(--timeline-border-radius, 8px);
    overflow: hidden;
    box-sizing: border-box;
  }

  .timeline-container {
    display: grid;
    grid-template-columns: var(--dimension-selector-width, 200px) 1fr;
    grid-template-rows: var(--time-axis-height, 48px) 1fr;
    height: 100%;
  }

  /* 좌상단 코너 (Dimension 헤더) */
  .corner-header {
    grid-column: 1;
    grid-row: 1;
    background: var(--corner-header-bg, #f1f5f9);
    border-right: 1px solid var(--timeline-border, #e2e8f0);
    border-bottom: 1px solid var(--timeline-border, #e2e8f0);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
  }

  /* Dimension 드롭다운 */
  .dimension-dropdown {
    position: relative;
    width: 100%;
  }

  .dropdown-trigger {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    padding: 6px 10px;
    border: 1px solid var(--timeline-border, #e2e8f0);
    border-radius: 6px;
    background: var(--dropdown-bg, #ffffff);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .dropdown-trigger:hover {
    border-color: var(--dropdown-hover-border, #94a3b8);
    background: var(--dropdown-hover-bg, #f8fafc);
  }

  .dropdown-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--dropdown-label-color, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .dropdown-value {
    font-size: 13px;
    font-weight: 500;
    color: var(--dropdown-value-color, #1e293b);
  }

  .dropdown-icon {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    color: var(--dropdown-icon-color, #64748b);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    padding: 4px 0;
    background: var(--dropdown-menu-bg, #ffffff);
    border: 1px solid var(--timeline-border, #e2e8f0);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    font-size: 13px;
    color: var(--dropdown-item-color, #334155);
    cursor: pointer;
    transition: background-color 0.1s ease;
  }

  .dropdown-item:hover {
    background: var(--dropdown-item-hover-bg, #f1f5f9);
  }

  .dropdown-item.selected {
    background: var(--dropdown-item-selected-bg, #eff6ff);
    color: var(--dropdown-item-selected-color, #1d4ed8);
  }

  .dropdown-item .item-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .dropdown-item .item-label {
    flex: 1;
  }

  .dropdown-item .check-icon {
    width: 14px;
    height: 14px;
    color: var(--dropdown-check-color, #3b82f6);
  }

  /* 시간축 영역 */
  .time-axis-area {
    grid-column: 2;
    grid-row: 1;
    overflow: hidden;
  }

  /* Dimension 선택기 영역 */
  .dimension-area {
    grid-column: 1;
    grid-row: 2;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* 메인 타임라인 영역 */
  .main-area {
    grid-column: 2;
    grid-row: 2;
    position: relative;
    overflow: hidden;
  }

  /* Context 영역 (좌측) */
  .context-labels {
    position: absolute;
    left: 0;
    top: 0;
    width: var(--context-labels-width, 0);
    height: 100%;
    overflow: hidden;
    background: var(--context-labels-bg, #f8fafc);
    border-right: 1px solid var(--timeline-border, #e2e8f0);
    z-index: 5;
  }

  /* Canvas 영역 */
  .canvas-area {
    position: absolute;
    left: var(--context-labels-width, 0);
    top: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
  }

  /* 스크롤바 */
  .scrollbar-vertical {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 8px;
    background: var(--scrollbar-track, #f1f5f9);
  }

  .scrollbar-thumb {
    position: absolute;
    left: 1px;
    right: 1px;
    background: var(--scrollbar-thumb, #cbd5e1);
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover, #94a3b8);
  }

  /* 줌 컨트롤 */
  .zoom-controls {
    position: absolute;
    bottom: 16px;
    right: 16px;
    display: flex;
    gap: 4px;
    z-index: 10;
  }

  .zoom-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--timeline-border, #e2e8f0);
    border-radius: 6px;
    background: var(--zoom-button-bg, #ffffff);
    color: var(--zoom-button-color, #475569);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .zoom-button:hover {
    background: var(--zoom-button-hover-bg, #f1f5f9);
    border-color: var(--zoom-button-hover-border, #94a3b8);
  }

  .zoom-button:active {
    background: var(--zoom-button-active-bg, #e2e8f0);
  }

  /* 로딩 상태 */
  :host([loading]) .main-area::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.7);
    z-index: 100;
  }

  /* 스케일 인디케이터 */
  .scale-indicator {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 12px;
    background: var(--scale-indicator-bg, rgba(0, 0, 0, 0.7));
    color: var(--scale-indicator-color, #ffffff);
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 50;
  }

  :host([show-scale-indicator]) .scale-indicator {
    opacity: 1;
  }
`;
