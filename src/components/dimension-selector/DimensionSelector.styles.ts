import { css } from 'lit';

export const styles = css`
  :host {
    display: block;
    background: transparent;
    min-width: var(--dimension-selector-min-width, 150px);
    overflow: hidden;
  }

  .selector-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--dimension-selector-border, #e2e8f0);
    background: var(--dimension-selector-header-bg, #f1f5f9);
  }

  .selector-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--dimension-selector-title-color, #475569);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .selector-dropdown {
    position: relative;
  }

  .dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: 1px solid var(--dimension-selector-border, #e2e8f0);
    border-radius: 4px;
    background: var(--dimension-selector-dropdown-bg, #ffffff);
    font-size: 12px;
    color: var(--dimension-selector-text, #334155);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .dropdown-trigger:hover {
    border-color: var(--dimension-selector-hover-border, #94a3b8);
    background: var(--dimension-selector-dropdown-hover-bg, #f8fafc);
  }

  .dropdown-trigger .icon {
    width: 12px;
    height: 12px;
    color: var(--dimension-selector-icon, #64748b);
    transition: transform 0.2s ease;
  }

  :host([open]) .dropdown-trigger .icon {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    padding: 4px 0;
    background: var(--dimension-selector-menu-bg, #ffffff);
    border: 1px solid var(--dimension-selector-border, #e2e8f0);
    border-radius: 6px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    z-index: 100;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px);
    transition: all 0.15s ease;
  }

  :host([open]) .dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    font-size: 13px;
    color: var(--dimension-selector-item-text, #334155);
    cursor: pointer;
    transition: background-color 0.1s ease;
  }

  .dropdown-item:hover {
    background: var(--dimension-selector-item-hover-bg, #f1f5f9);
  }

  .dropdown-item[data-selected] {
    background: var(--dimension-selector-item-selected-bg, #eff6ff);
    color: var(--dimension-selector-item-selected-text, #1d4ed8);
    font-weight: 500;
  }

  .dropdown-item .item-icon {
    width: 16px;
    height: 16px;
    color: var(--dimension-selector-item-icon, #64748b);
  }

  .dropdown-item[data-selected] .item-icon {
    color: var(--dimension-selector-item-selected-icon, #3b82f6);
  }

  .dropdown-item .item-label {
    flex: 1;
  }

  .dropdown-item .check-icon {
    width: 14px;
    height: 14px;
    color: var(--dimension-selector-check-color, #3b82f6);
    opacity: 0;
  }

  .dropdown-item[data-selected] .check-icon {
    opacity: 1;
  }

  /* Dimension 값 목록 */
  .dimension-values {
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
    flex: 1;
  }

  .dimension-value-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--dimension-value-text, #334155);
    cursor: pointer;
    transition: background-color 0.1s ease;
    user-select: none;
    box-sizing: border-box;
  }

  /* 동기화된 아이템 스타일 */
  .dimension-value-item.synced {
    align-items: flex-start;
    padding-top: 8px;
    /* border-bottom 제거 - 배경색이 chart 영역으로 이어짐 */
  }

  .dimension-value-item:hover {
    background: var(--dimension-value-hover-bg, #f1f5f9);
  }

  .dimension-value-item .color-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dimension-value-item .value-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dimension-value-item .value-count {
    font-size: 11px;
    color: var(--dimension-value-count-color, #94a3b8);
    font-weight: 500;
  }

  /* 검색 */
  .search-box {
    padding: 8px 12px;
    border-bottom: 1px solid var(--dimension-selector-border, #e2e8f0);
  }

  .search-input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--dimension-selector-border, #e2e8f0);
    border-radius: 4px;
    font-size: 12px;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .search-input:focus {
    border-color: var(--dimension-selector-focus-border, #3b82f6);
  }

  .search-input::placeholder {
    color: var(--dimension-selector-placeholder, #94a3b8);
  }

  /* 빈 상태 */
  .empty-state {
    padding: 24px 12px;
    text-align: center;
    color: var(--dimension-selector-empty-text, #94a3b8);
    font-size: 13px;
  }

  /* 선택된 row */
  .dimension-value-item.selected {
    background: var(--dimension-value-selected-bg, rgba(239, 68, 68, 0.08));
    position: relative;
  }

  .dimension-value-item.selected .value-label {
    font-weight: 600;
    color: var(--dimension-value-selected-text, #dc2626);
  }

  /* 선택 인디케이터 - 우측 세로선 */
  .selection-indicator {
    position: absolute;
    top: 0;
    right: 0;
    width: 3px;
    height: 100%;
    background: var(--selection-indicator-color, #ef4444);
  }
`;
