# Dimension Timeline

**Dimension Timeline**은 작업을 고정된 행이 아닌 **관심 차원(Dimension)** 기준으로 시간축에 배치하는 타임라인 컴포넌트입니다.
작업이 겹칠 경우에만 시각적으로 개행되며, 행 자체는 의미를 가지지 않습니다.

---

## 핵심 개념

* 행(row)은 데이터 의미가 아님
* **Dimension(차원)** 이 유일한 그룹 기준
* 충돌 시에만 자동 개행되는 **row-less timeline**
* 간트차트와 다름 (작업 중심 ❌, 시간·관심 중심 ⭕

---

## 언제 사용하는가

* 프로젝트 / 인원 / 설비 / 태그 등
  **관심 기준을 바꿔가며 작업 흐름을 보고 싶을 때**
* 작업 밀집도, 중첩, 공백을 직관적으로 보고 싶을 때
* 고정된 스윔레인 구조가 오히려 방해가 될 때

---

## 구성 요소

### 1. Dimension Selector

타임라인을 바라보는 기준을 선택합니다.

예:

* Project
* Assignee
* Equipment
* Custom Dimension

Dimension 변경 시 전체 레이아웃이 재계산됩니다.

---

### 2. Context Slice

선택된 Dimension의 **각 값**이 하나의 Context입니다.

예:

* Dimension = Project
  → Project A / Project B / Project C
* Dimension = Person
  → Alice / Bob / Carol

각 Context는 **독립적인 타임라인 공간**을 가집니다.

---

### 3. Time Axis

모든 Context가 공유하는 시간 축입니다.

* day / week / month / custom scale
* zoom / pan / now marker 지원

---

### 4. Context Timeline Area

Context 내부에서 Task들이 렌더링되는 영역입니다.

* 행은 고정되지 않음
* 충돌이 없으면 한 줄
* 충돌 시 자동 개행

---

### 5. Task / Event

시간 구간을 갖는 최소 단위입니다.

필수 속성:

* `start`
* `end`
* `dimensionValue`

선택 속성:

* label
* color / status
* metadata

---

### 6. Collision Layout Engine

Context 내부에서 Task를 배치하는 핵심 엔진입니다.

규칙:

1. 동일 Context 내에서만 충돌 검사
2. 겹치지 않으면 같은 줄
3. 겹치면 다음 줄 생성
4. 최소 줄 수 유지

기반 알고리즘:

* Interval partitioning (greedy)

---

## 데이터 모델 예시

```ts
type Task = {
  id: string
  start: Date
  end: Date
  dimensionValue: string
  label?: string
  metadata?: Record<string, any>
}
```

---

## 간트차트와의 차이

| 항목    | Gantt Chart | Dimension Timeline |
| ----- | ----------- | ------------------ |
| 행 의미  | 작업          | 없음 (레이아웃 결과)       |
| 기준    | 작업 구조       | 관심 차원              |
| 중첩 처리 | 고정 행        | 자동 개행              |
| 목적    | 계획 관리       | 흐름·밀집도 인식          |

---

## 한 줄 정의

> **Dimension Timeline**은
> 관심 차원으로 이벤트를 그룹화하고,
> 행 없는 타임라인 위에 충돌 인지 레이아웃으로 표현하는 컴포넌트입니다.

---

## 사용 시 주의점

* 행에 의미를 부여하지 말 것
* Dimension은 데이터의 “속성”이지 “구조”가 아님
* 작업 수가 많을 경우 가상 스크롤 또는 캔버스 렌더링 권장

---

## 확장 아이디어

* 다중 Dimension (Primary / Secondary)
* Context별 밀집도 인디케이터
* Drag & Drop으로 Dimension 변경
* Aggregate / Summary Layer