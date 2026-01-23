/**
 * ContextSlice 컴포넌트
 * Dimension 값별 그룹 영역
 */

import { html, PropertyValues, LitElement, CSSResultGroup } from 'lit';
import { property, state } from 'lit/decorators.js';

import { styles } from './ContextSlice.styles.js';

/**
 * ContextSlice 컴포넌트
 */
export class ContextSlice extends LitElement {
  static styles: CSSResultGroup = styles;

  static define(name: string) {
    if (!customElements.get(name)) {
      customElements.define(name, this);
    }
  }

  protected emit(name: string, value?: unknown, options?: CustomEventInit): boolean {
    const event = new CustomEvent(name, {
      bubbles: true,
      composed: true,
      cancelable: options?.cancelable ?? false,
      detail: value,
      ...options,
    });
    return this.dispatchEvent(event);
  }

  // =========================================================================
  // Properties
  // =========================================================================

  /** Dimension 값 */
  @property({ type: String, attribute: 'dimension-value' })
  dimensionValue: string = '';

  /** 표시 라벨 */
  @property({ type: String })
  label: string = '';

  /** 색상 */
  @property({ type: String })
  color: string = '';

  /** Task 수 */
  @property({ type: Number, attribute: 'task-count' })
  taskCount: number = 0;

  /** 행 수 */
  @property({ type: Number, attribute: 'row-count' })
  rowCount: number = 1;

  /** 행 높이 */
  @property({ type: Number, attribute: 'row-height' })
  rowHeight: number = 36;

  /** 접힘 상태 */
  @property({ type: Boolean, reflect: true })
  collapsed: boolean = false;

  /** 헤더 표시 여부 */
  @property({ type: Boolean, attribute: 'show-header' })
  showHeader: boolean = true;

  // =========================================================================
  // State
  // =========================================================================

  @state() private dragOver: boolean = false;

  // =========================================================================
  // Lifecycle
  // =========================================================================

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has('dragOver')) {
      this.toggleAttribute('drag-over', this.dragOver);
    }
  }

  // =========================================================================
  // Render
  // =========================================================================

  render() {
    const contentHeight = this.collapsed ? 0 : this.rowCount * this.rowHeight;

    return html`
      ${this.showHeader ? this.renderHeader() : ''}
      <div
        class="context-content"
        style="height: ${contentHeight}px"
        @dragover=${this.handleDragOver}
        @dragleave=${this.handleDragLeave}
        @drop=${this.handleDrop}
      >
        <slot></slot>
      </div>
    `;
  }

  private renderHeader() {
    return html`
      <div class="context-header" @click=${this.handleHeaderClick}>
        <div class="collapse-icon">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M4 2l4 4-4 4V2z"/>
          </svg>
        </div>
        ${this.color ? html`
          <div class="color-indicator" style="background-color: ${this.color}"></div>
        ` : ''}
        <div class="context-label">${this.label || this.dimensionValue}</div>
        <div class="context-badge">${this.taskCount}</div>
      </div>
    `;
  }

  // =========================================================================
  // Event Handlers
  // =========================================================================

  private handleHeaderClick(): void {
    this.collapsed = !this.collapsed;

    this.emit('context-toggle', {
      dimensionValue: this.dimensionValue,
      collapsed: this.collapsed,
    });
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = true;
  }

  private handleDragLeave(_e: DragEvent): void {
    this.dragOver = false;
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver = false;

    this.emit('context-drop', {
      dimensionValue: this.dimensionValue,
      dataTransfer: e.dataTransfer,
    });
  }

  // =========================================================================
  // Public API
  // =========================================================================

  /** 접기 */
  collapse(): void {
    this.collapsed = true;
  }

  /** 펼치기 */
  expand(): void {
    this.collapsed = false;
  }

  /** 토글 */
  toggle(): void {
    this.collapsed = !this.collapsed;
  }

  /** 컨텐츠 높이 가져오기 */
  getContentHeight(): number {
    return this.collapsed ? 0 : this.rowCount * this.rowHeight;
  }

  /** 전체 높이 가져오기 (헤더 포함) */
  getTotalHeight(): number {
    const headerHeight = this.showHeader ? 32 : 0; // CSS variable default
    return headerHeight + this.getContentHeight();
  }
}
