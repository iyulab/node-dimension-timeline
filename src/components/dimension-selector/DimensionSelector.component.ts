/**
 * DimensionSelector 컴포넌트
 * Dimension 선택 및 값 목록 표시
 */

import { html, PropertyValues, nothing, LitElement, CSSResultGroup } from 'lit';
import { property, state } from 'lit/decorators.js';

import { styles } from './DimensionSelector.styles.js';
import type { Dimension, DimensionValue } from '../../types/index.js';

/**
 * Dimension 값과 카운트
 */
export interface DimensionValueWithCount extends DimensionValue {
  count: number;
}

/**
 * DimensionSelector 컴포넌트
 */
export class DimensionSelector extends LitElement {
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

  /** 사용 가능한 Dimension 목록 */
  @property({ attribute: false })
  dimensions: Dimension[] = [];

  /** 현재 선택된 Dimension 키 */
  @property({ type: String, attribute: 'active-dimension' })
  activeDimension: string = '';

  /** 현재 Dimension의 값 목록 (카운트 포함) */
  @property({ attribute: false })
  dimensionValues: DimensionValueWithCount[] = [];

  /** 검색 표시 */
  @property({ type: Boolean, attribute: 'show-search' })
  showSearch: boolean = true;

  /** Dimension 선택 드롭다운 표시 */
  @property({ type: Boolean, attribute: 'show-dimension-dropdown' })
  showDimensionDropdown: boolean = true;

  /** 값 클릭 시 필터링 */
  @property({ type: Boolean, attribute: 'filterable' })
  filterable: boolean = false;

  /** Context 위치 정보 (차트 영역과 동기화) */
  @property({ attribute: false })
  contextPositions: Map<string, { y: number; height: number }> = new Map();

  /** Y 스크롤 오프셋 (차트 영역과 동기화) */
  @property({ type: Number, attribute: 'scroll-y' })
  scrollY: number = 0;

  /** 동기화 모드 (헤더/검색 숨김) */
  @property({ type: Boolean, attribute: 'sync-mode' })
  syncMode: boolean = false;

  /** Context 색상 정보 (row 배경색) */
  @property({ attribute: false })
  contextColors: Map<string, string> = new Map();

  /** Y축 줌 레벨 (row 높이 조정) */
  @property({ type: Number, attribute: 'zoom-y' })
  zoomY: number = 1.0;

  // =========================================================================
  // State
  // =========================================================================

  @state() private dropdownOpen: boolean = false;
  @state() private searchQuery: string = '';
  @state() private selectedValues: Set<string> = new Set();

  // =========================================================================
  // Lifecycle
  // =========================================================================

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has('dropdownOpen')) {
      this.toggleAttribute('open', this.dropdownOpen);
    }

    // 외부 클릭으로 드롭다운 닫기
    if (changedProperties.has('dropdownOpen') && this.dropdownOpen) {
      const handler = (e: MouseEvent) => {
        if (!this.contains(e.target as Node)) {
          this.dropdownOpen = false;
          document.removeEventListener('click', handler);
        }
      };
      setTimeout(() => document.addEventListener('click', handler), 0);
    }
  }

  // =========================================================================
  // Render
  // =========================================================================

  render() {
    const activeDim = this.dimensions.find(d => d.key === this.activeDimension);
    const filteredValues = this.getFilteredValues();
    const hasContextPositions = this.contextPositions.size > 0;

    // 총 컨텐츠 높이 계산 (contextPositions가 있을 때)
    let totalHeight = 0;
    if (hasContextPositions) {
      for (const [, pos] of this.contextPositions) {
        const bottom = pos.y + pos.height;
        if (bottom > totalHeight) totalHeight = bottom;
      }
    }

    // 컨테이너 스타일
    const containerStyle = hasContextPositions
      ? `position: relative; height: ${totalHeight}px; overflow: hidden;`
      : '';

    return html`
      ${!this.syncMode ? html`
        <div class="selector-header">
          <span class="selector-title">Dimension</span>
          ${this.showDimensionDropdown ? this.renderDropdown(activeDim) : nothing}
        </div>

        ${this.showSearch ? html`
          <div class="search-box">
            <input
              type="text"
              class="search-input"
              placeholder="검색..."
              .value=${this.searchQuery}
              @input=${this.handleSearchInput}
            />
          </div>
        ` : nothing}
      ` : nothing}

      <div class="dimension-values" style=${containerStyle}>
        ${filteredValues.length > 0 ? filteredValues.map((value, index) => {
          const position = this.contextPositions.get(value.key);
          // 스크롤에 따라 뷰포트 내에 있는지 확인
          const itemY = position ? position.y - this.scrollY : 0;

          // 배경색 결정: dimension 색상 또는 짝수행 색상
          const bgColor = this.contextColors.get(value.key);
          const rowBg = bgColor
            ? this.applyAlpha(bgColor, 0.15)
            : (index % 2 === 1 ? 'rgba(0, 0, 0, 0.03)' : 'transparent');

          // 기본 높이에 zoomY 적용
          const baseHeight = 32 * this.zoomY;
          const itemStyle = hasContextPositions && position
            ? `position: absolute; top: ${itemY}px; left: 0; right: 0; height: ${position.height}px; background-color: ${rowBg};`
            : `min-height: ${baseHeight}px; background-color: ${rowBg};`;

          return html`
            <div
              class="dimension-value-item ${hasContextPositions ? 'synced' : ''}"
              style=${itemStyle}
              @click=${() => this.handleValueClick(value)}
            >
              ${value.color ? html`
                <div class="color-dot" style="background-color: ${value.color}"></div>
              ` : nothing}
              <span class="value-label">${value.label}</span>
              <span class="value-count">${value.count}</span>
            </div>
          `;
        }) : html`
          <div class="empty-state">
            ${this.searchQuery ? '검색 결과가 없습니다' : '값이 없습니다'}
          </div>
        `}
      </div>
    `;
  }

  private renderDropdown(activeDim: Dimension | undefined) {
    return html`
      <div class="selector-dropdown">
        <button class="dropdown-trigger" @click=${this.toggleDropdown}>
          <span>${activeDim?.label ?? '선택'}</span>
          <svg class="icon" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4l4 4 4-4H2z"/>
          </svg>
        </button>

        <div class="dropdown-menu">
          ${this.dimensions.map(dim => html`
            <div
              class="dropdown-item"
              ?data-selected=${dim.key === this.activeDimension}
              @click=${() => this.handleDimensionSelect(dim.key)}
            >
              ${dim.icon ? html`
                <span class="item-icon">${dim.icon}</span>
              ` : nothing}
              <span class="item-label">${dim.label}</span>
              <svg class="check-icon" viewBox="0 0 14 14" fill="currentColor">
                <path d="M11.5 4L5.5 10 2.5 7"/>
              </svg>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Event Handlers
  // =========================================================================

  private toggleDropdown(e: Event): void {
    e.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  private handleDimensionSelect(key: string): void {
    this.dropdownOpen = false;

    if (key !== this.activeDimension) {
      this.activeDimension = key;
      this.searchQuery = '';
      this.selectedValues.clear();

      this.emit('dimension-change', {
        dimension: key,
      });
    }
  }

  private handleSearchInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.searchQuery = input.value;
  }

  private handleValueClick(value: DimensionValueWithCount): void {
    if (this.filterable) {
      if (this.selectedValues.has(value.key)) {
        this.selectedValues.delete(value.key);
      } else {
        this.selectedValues.add(value.key);
      }
      this.requestUpdate();

      this.emit('dimension-filter', {
        dimension: this.activeDimension,
        selectedValues: Array.from(this.selectedValues),
      });
    }

    this.emit('dimension-value-click', {
      dimension: this.activeDimension,
      value: value.key,
      label: value.label,
    });
  }

  // =========================================================================
  // Private
  // =========================================================================

  private getFilteredValues(): DimensionValueWithCount[] {
    if (!this.searchQuery) {
      return this.dimensionValues;
    }

    const query = this.searchQuery.toLowerCase();
    return this.dimensionValues.filter(v =>
      v.label.toLowerCase().includes(query) ||
      v.key.toLowerCase().includes(query)
    );
  }

  /**
   * 색상에 alpha 적용
   */
  private applyAlpha(color: string, alpha: number): string {
    if (color.startsWith('rgba')) {
      return color;
    }
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    if (color.startsWith('hsl(')) {
      return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
    }
    if (color.startsWith('hsla')) {
      return color;
    }
    // hex 형식
    let hex = color.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // =========================================================================
  // Public API
  // =========================================================================

  /** 검색어 설정 */
  setSearch(query: string): void {
    this.searchQuery = query;
  }

  /** 검색어 초기화 */
  clearSearch(): void {
    this.searchQuery = '';
  }

  /** 선택된 값 설정 */
  setSelectedValues(values: string[]): void {
    this.selectedValues = new Set(values);
    this.requestUpdate();
  }

  /** 선택 초기화 */
  clearSelection(): void {
    this.selectedValues.clear();
    this.requestUpdate();
  }

  /** 선택된 값 가져오기 */
  getSelectedValues(): string[] {
    return Array.from(this.selectedValues);
  }
}
