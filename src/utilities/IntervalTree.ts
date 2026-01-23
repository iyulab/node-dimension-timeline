/**
 * IntervalTree
 * 구간 검색을 위한 증강 BST 구현
 * O(log n) 삽입/삭제, O(log n + k) 구간 쿼리 (k = 결과 수)
 */

/**
 * 구간 인터페이스
 */
export interface Interval {
  /** 시작 값 */
  start: number;
  /** 종료 값 */
  end: number;
}

/**
 * 구간 + 데이터
 */
export interface IntervalWithData<T> extends Interval {
  data: T;
}

/**
 * 트리 노드
 */
interface TreeNode<T> {
  interval: IntervalWithData<T>;
  max: number; // 서브트리 내 최대 end 값
  left: TreeNode<T> | null;
  right: TreeNode<T> | null;
  height: number; // AVL 균형을 위한 높이
}

/**
 * IntervalTree 클래스
 * AVL 트리 기반 구간 트리 구현
 */
export class IntervalTree<T> {
  private root: TreeNode<T> | null = null;
  private _size: number = 0;

  /**
   * 트리 크기
   */
  get size(): number {
    return this._size;
  }

  /**
   * 트리가 비었는지 확인
   */
  isEmpty(): boolean {
    return this.root === null;
  }

  /**
   * 구간 삽입
   */
  insert(interval: IntervalWithData<T>): void {
    this.root = this.insertNode(this.root, interval);
    this._size++;
  }

  /**
   * 구간 삭제
   */
  delete(interval: Interval, predicate?: (data: T) => boolean): boolean {
    const result = this.deleteNode(this.root, interval, predicate);
    if (result.deleted) {
      this.root = result.node;
      this._size--;
      return true;
    }
    return false;
  }

  /**
   * 특정 구간과 겹치는 모든 구간 검색
   */
  query(interval: Interval): IntervalWithData<T>[] {
    const result: IntervalWithData<T>[] = [];
    this.queryNode(this.root, interval, result);
    return result;
  }

  /**
   * 특정 점을 포함하는 모든 구간 검색
   */
  queryPoint(point: number): IntervalWithData<T>[] {
    return this.query({ start: point, end: point });
  }

  /**
   * 모든 구간 반환
   */
  getAll(): IntervalWithData<T>[] {
    const result: IntervalWithData<T>[] = [];
    this.inorderTraverse(this.root, result);
    return result;
  }

  /**
   * 트리 초기화
   */
  clear(): void {
    this.root = null;
    this._size = 0;
  }

  // =========================================================================
  // Private: 노드 연산
  // =========================================================================

  private insertNode(
    node: TreeNode<T> | null,
    interval: IntervalWithData<T>,
  ): TreeNode<T> {
    // 빈 위치에 삽입
    if (node === null) {
      return {
        interval,
        max: interval.end,
        left: null,
        right: null,
        height: 1,
      };
    }

    // BST 삽입 (start 기준)
    if (interval.start < node.interval.start) {
      node.left = this.insertNode(node.left, interval);
    } else {
      node.right = this.insertNode(node.right, interval);
    }

    // max 업데이트
    this.updateMax(node);

    // 높이 업데이트
    node.height = 1 + Math.max(this.height(node.left), this.height(node.right));

    // AVL 균형 조정
    return this.balance(node);
  }

  private deleteNode(
    node: TreeNode<T> | null,
    interval: Interval,
    predicate?: (data: T) => boolean,
  ): { node: TreeNode<T> | null; deleted: boolean } {
    if (node === null) {
      return { node: null, deleted: false };
    }

    let deleted = false;

    if (interval.start < node.interval.start) {
      const result = this.deleteNode(node.left, interval, predicate);
      node.left = result.node;
      deleted = result.deleted;
    } else if (interval.start > node.interval.start) {
      const result = this.deleteNode(node.right, interval, predicate);
      node.right = result.node;
      deleted = result.deleted;
    } else {
      // start가 같은 경우, end와 predicate 확인
      const matches = interval.end === node.interval.end &&
        (!predicate || predicate(node.interval.data));

      if (matches) {
        // 삭제 대상 노드 발견
        if (node.left === null) {
          return { node: node.right, deleted: true };
        }
        if (node.right === null) {
          return { node: node.left, deleted: true };
        }

        // 두 자식이 있는 경우: 오른쪽 서브트리의 최소값으로 대체
        const minNode = this.findMin(node.right);
        node.interval = minNode.interval;
        const result = this.deleteNode(node.right, minNode.interval);
        node.right = result.node;
        deleted = true;
      } else {
        // 같은 start를 가진 다른 노드일 수 있음
        const result = this.deleteNode(node.right, interval, predicate);
        node.right = result.node;
        deleted = result.deleted;
      }
    }

    if (!deleted) {
      return { node, deleted: false };
    }

    // max 및 높이 업데이트
    this.updateMax(node);
    node.height = 1 + Math.max(this.height(node.left), this.height(node.right));

    return { node: this.balance(node), deleted: true };
  }

  private queryNode(
    node: TreeNode<T> | null,
    interval: Interval,
    result: IntervalWithData<T>[],
  ): void {
    if (node === null) return;

    // 서브트리의 max가 쿼리 시작보다 작으면 겹치는 구간 없음
    if (node.max < interval.start) return;

    // 왼쪽 서브트리 검색
    this.queryNode(node.left, interval, result);

    // 현재 노드 확인
    if (this.overlaps(node.interval, interval)) {
      result.push(node.interval);
    }

    // 현재 노드의 시작이 쿼리 끝보다 크면 오른쪽은 볼 필요 없음
    if (node.interval.start > interval.end) return;

    // 오른쪽 서브트리 검색
    this.queryNode(node.right, interval, result);
  }

  // =========================================================================
  // Private: AVL 균형
  // =========================================================================

  private height(node: TreeNode<T> | null): number {
    return node ? node.height : 0;
  }

  private getBalance(node: TreeNode<T>): number {
    return this.height(node.left) - this.height(node.right);
  }

  private balance(node: TreeNode<T>): TreeNode<T> {
    const balance = this.getBalance(node);

    // Left heavy
    if (balance > 1) {
      if (this.getBalance(node.left!) < 0) {
        // Left-Right case
        node.left = this.rotateLeft(node.left!);
      }
      // Left-Left case
      return this.rotateRight(node);
    }

    // Right heavy
    if (balance < -1) {
      if (this.getBalance(node.right!) > 0) {
        // Right-Left case
        node.right = this.rotateRight(node.right!);
      }
      // Right-Right case
      return this.rotateLeft(node);
    }

    return node;
  }

  private rotateRight(y: TreeNode<T>): TreeNode<T> {
    const x = y.left!;
    const T2 = x.right;

    x.right = y;
    y.left = T2;

    y.height = 1 + Math.max(this.height(y.left), this.height(y.right));
    x.height = 1 + Math.max(this.height(x.left), this.height(x.right));

    this.updateMax(y);
    this.updateMax(x);

    return x;
  }

  private rotateLeft(x: TreeNode<T>): TreeNode<T> {
    const y = x.right!;
    const T2 = y.left;

    y.left = x;
    x.right = T2;

    x.height = 1 + Math.max(this.height(x.left), this.height(x.right));
    y.height = 1 + Math.max(this.height(y.left), this.height(y.right));

    this.updateMax(x);
    this.updateMax(y);

    return y;
  }

  // =========================================================================
  // Private: 유틸리티
  // =========================================================================

  private updateMax(node: TreeNode<T>): void {
    node.max = node.interval.end;
    if (node.left && node.left.max > node.max) {
      node.max = node.left.max;
    }
    if (node.right && node.right.max > node.max) {
      node.max = node.right.max;
    }
  }

  private overlaps(a: Interval, b: Interval): boolean {
    return a.start < b.end && a.end > b.start;
  }

  private findMin(node: TreeNode<T>): TreeNode<T> {
    let current = node;
    while (current.left !== null) {
      current = current.left;
    }
    return current;
  }

  private inorderTraverse(
    node: TreeNode<T> | null,
    result: IntervalWithData<T>[],
  ): void {
    if (node === null) return;
    this.inorderTraverse(node.left, result);
    result.push(node.interval);
    this.inorderTraverse(node.right, result);
  }
}
