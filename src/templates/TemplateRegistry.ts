/**
 * TemplateRegistry
 * Task 템플릿 레지스트리
 */

import type { TaskTemplate, TaskStyleConfig } from './TaskTemplate.js';
import { DefaultTemplate, MinimalTemplate } from './DefaultTemplate.js';

/**
 * TemplateRegistry 클래스
 * Task 렌더링 템플릿을 관리합니다.
 */
export class TemplateRegistry {
  private static instance: TemplateRegistry;
  private templates: Map<string, TaskTemplate> = new Map();

  private constructor() {
    // 기본 템플릿 등록
    this.register(new DefaultTemplate());
    this.register(new MinimalTemplate());
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  static getInstance(): TemplateRegistry {
    if (!TemplateRegistry.instance) {
      TemplateRegistry.instance = new TemplateRegistry();
    }
    return TemplateRegistry.instance;
  }

  /**
   * 템플릿 등록
   */
  register<T = unknown>(template: TaskTemplate<T>): void {
    this.templates.set(template.name, template as TaskTemplate);
  }

  /**
   * 템플릿 가져오기
   */
  get<T = unknown>(name: string): TaskTemplate<T> | undefined {
    return this.templates.get(name) as TaskTemplate<T> | undefined;
  }

  /**
   * 기본 템플릿 가져오기
   */
  getDefault<T = unknown>(): TaskTemplate<T> {
    return this.templates.get('default') as TaskTemplate<T>;
  }

  /**
   * 템플릿 존재 여부 확인
   */
  has(name: string): boolean {
    return this.templates.has(name);
  }

  /**
   * 등록된 모든 템플릿 이름
   */
  getNames(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * 템플릿 제거
   */
  unregister(name: string): boolean {
    // 기본 템플릿은 제거 불가
    if (name === 'default' || name === 'minimal') {
      return false;
    }
    return this.templates.delete(name);
  }

  /**
   * 커스텀 템플릿 생성 헬퍼
   * 기존 템플릿을 기반으로 스타일만 변경
   */
  createVariant<T = unknown>(
    baseName: string,
    newName: string,
    styleOverrides: Partial<TaskStyleConfig>,
  ): TaskTemplate<T> | null {
    const base = this.get<T>(baseName);
    if (!base) return null;

    // 새 템플릿 생성
    const variant: TaskTemplate<T> = {
      name: newName,
      render: base.render.bind(base),
      getColor: base.getColor?.bind(base),
      getLabel: base.getLabel?.bind(base),
      getStyleConfig: () => ({ ...base.getStyleConfig(), ...styleOverrides }),
      setStyleConfig: (config) => base.setStyleConfig({ ...styleOverrides, ...config }),
    };

    this.register(variant);
    return variant;
  }
}

/**
 * 전역 템플릿 레지스트리 접근
 */
export function getTemplateRegistry(): TemplateRegistry {
  return TemplateRegistry.getInstance();
}

/**
 * 템플릿 등록 단축 함수
 */
export function registerTemplate<T = unknown>(template: TaskTemplate<T>): void {
  TemplateRegistry.getInstance().register(template);
}

/**
 * 템플릿 가져오기 단축 함수
 */
export function getTemplate<T = unknown>(name: string): TaskTemplate<T> {
  return TemplateRegistry.getInstance().get<T>(name) ?? TemplateRegistry.getInstance().getDefault<T>();
}
