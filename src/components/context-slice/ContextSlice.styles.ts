import { css } from 'lit';

export const styles = css`
  :host {
    display: block;
    position: relative;
    border-bottom: 1px solid var(--context-border, #e2e8f0);
    background: var(--context-bg, #ffffff);
    transition: background-color 0.15s ease;
  }

  :host([collapsed]) {
    background: var(--context-collapsed-bg, #f8fafc);
  }

  .context-header {
    display: flex;
    align-items: center;
    height: var(--context-header-height, 32px);
    padding: 0 8px;
    background: var(--context-header-bg, #f1f5f9);
    border-bottom: 1px solid var(--context-border, #e2e8f0);
    cursor: pointer;
    user-select: none;
    gap: 8px;
  }

  .context-header:hover {
    background: var(--context-header-hover-bg, #e2e8f0);
  }

  .collapse-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    color: var(--context-icon-color, #64748b);
    transition: transform 0.2s ease;
  }

  :host([collapsed]) .collapse-icon {
    transform: rotate(-90deg);
  }

  .context-label {
    flex: 1;
    font-size: var(--context-label-size, 13px);
    font-weight: 500;
    color: var(--context-label-color, #334155);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .context-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 18px;
    padding: 0 6px;
    border-radius: 9px;
    background: var(--context-badge-bg, #e2e8f0);
    font-size: 11px;
    font-weight: 600;
    color: var(--context-badge-color, #64748b);
  }

  .context-content {
    position: relative;
    overflow: hidden;
    transition: height 0.2s ease;
  }

  :host([collapsed]) .context-content {
    height: 0 !important;
  }

  /* 색상 인디케이터 */
  .color-indicator {
    width: 4px;
    height: 16px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  /* 드래그 오버 상태 */
  :host([drag-over]) {
    background: var(--context-dragover-bg, rgba(59, 130, 246, 0.1));
  }

  :host([drag-over]) .context-header {
    background: var(--context-header-dragover-bg, rgba(59, 130, 246, 0.15));
  }
`;
