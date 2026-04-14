import { css } from 'lit';

export const styles = css`
  :host {
    display: block;
    position: relative;
    background: var(--time-axis-bg, #f8fafc);
    border-bottom: 1px solid var(--time-axis-border, #e2e8f0);
    user-select: none;
    overflow: hidden;
  }

  .time-axis-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* 상단 라벨 (월/주) */
  .primary-labels {
    display: flex;
    position: relative;
    height: 50%;
    border-bottom: 1px solid var(--time-axis-divider, #e2e8f0);
    overflow: hidden;
  }

  /* 하단 라벨 (일/시간) */
  .secondary-labels {
    display: flex;
    height: 50%;
    position: relative;
  }

  .time-label {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--time-axis-font-size, 11px);
    color: var(--time-axis-text, #64748b);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-right: 1px solid var(--time-axis-divider, #e2e8f0);
    padding: 0 4px;
    box-sizing: border-box;
  }

  .time-label.primary {
    font-weight: 600;
    color: var(--time-axis-text-primary, #334155);
  }

  .time-label.major {
    font-weight: 500;
  }

  .time-label.minor {
    font-size: 10px;
    color: var(--time-axis-text-minor, #94a3b8);
    border-right-color: var(--time-axis-divider-minor, #f1f5f9);
  }

  /* 현재 시간 표시 */
  .now-indicator {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--time-axis-now, #ef4444);
    pointer-events: none;
    z-index: 10;
  }

  .now-indicator::before {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid var(--time-axis-now, #ef4444);
  }

  /* 오늘 하이라이트 */
  .today-highlight {
    position: absolute;
    top: 0;
    bottom: 0;
    background: var(--time-axis-today-bg, rgba(59, 130, 246, 0.08));
    pointer-events: none;
  }
`;
