# PartyStatusUI 좌표 시스템 가이드

## 개요
PartyStatusUI는 아이소메트릭 체스판 스타일의 3x2 타일 보드 위에 캐릭터와 HP UI를 배치합니다.

## 보드 스프라이트
- **파일**: `/assets/ui/UI_Tactical_Block_Stage.webp`
- **데스크탑 크기**: 280 x 110 px
- **모바일 크기**: 200 x 78 px (0.714배)

## 타일 레이아웃

```
아이소메트릭 45도 회전 뷰:

         [0]        [1]        [2]     ← 뒷줄 (Back Row)
      [3]        [4]        [5]        ← 앞줄 (Front Row)

실제 화면 배치:
- 뒷줄: 오른쪽 위 대각선 방향
- 앞줄: 왼쪽 아래 대각선 방향
```

## 원본 이미지 좌표

원본 이미지 크기: **1280 x 832 px**

| 타일 | 원본 좌표 (X, Y) |
|------|------------------|
| 0 | (262, 440) |
| 1 | (572, 328) |
| 2 | (900, 208) |
| 3 | (376, 608) |
| 4 | (712, 474) |
| 5 | (1034, 352) |

## 좌표 변환 공식

```
scale = 110 / 832 = 0.1322
offsetX = (280 - 1280 * scale) / 2 = 55px (중앙 정렬 보정)

CSS_X = 원본_X * scale + offsetX - 30 (스프라이트 오프셋)
CSS_Y = 원본_Y * scale - 48 (스프라이트 오프셋)
```

### 슬롯 구조
- **슬롯 크기**: 60 x 70 px (데스크탑), 48 x 56 px (모바일)
- **스프라이트 위치**: 슬롯 내 `bottom: 22px`, `left: 50%`, `transform: translateX(-50%)`

## 보정 사항

### X축 -20px 보정
테스트 결과 캐릭터가 전체적으로 우측으로 밀려 있어 **원본 해상도 기준 X축 -20px** 보정 적용.

| 타일 | 원본 좌표 | 보정 후 좌표 |
|------|----------|-------------|
| 0 | (262, 440) | (242, 440) |
| 1 | (572, 328) | (552, 328) |
| 2 | (900, 208) | (880, 208) |
| 3 | (376, 608) | (356, 608) |
| 4 | (712, 474) | (692, 474) |
| 5 | (1034, 352) | (1014, 352) |

### 적군 보드 미러링 수정
아이소메트릭 보드를 `scaleX(-1)`로 반전할 때, 유닛 컨테이너도 함께 반전해야 좌표가 맞음.
```css
.enemy .units-container { transform: scaleX(-1); }
```

## 슬롯 CSS 값 (데스크탑)

```css
/* 뒷줄 (0, 1, 2) - X축 -20px 보정 적용 */
.unit-slot[data-pos="0"] { left: 57px; top: 10px; }
.unit-slot[data-pos="1"] { left: 98px; top: -5px; }
.unit-slot[data-pos="2"] { left: 141px; top: -20px; }

/* 앞줄 (3, 4, 5) - X축 -20px 보정 적용 */
.unit-slot[data-pos="3"] { left: 72px; top: 32px; }
.unit-slot[data-pos="4"] { left: 116px; top: 15px; }
.unit-slot[data-pos="5"] { left: 159px; top: -1px; }
```

## 슬롯 CSS 값 (모바일)

```css
/* 모바일 (데스크탑의 0.714배, X축 -20px 보정 적용) */
.unit-slot[data-pos="0"] { left: 41px; top: 7px; }
.unit-slot[data-pos="1"] { left: 70px; top: -4px; }
.unit-slot[data-pos="2"] { left: 101px; top: -14px; }
.unit-slot[data-pos="3"] { left: 51px; top: 23px; }
.unit-slot[data-pos="4"] { left: 83px; top: 11px; }
.unit-slot[data-pos="5"] { left: 114px; top: -1px; }
```

## Z-Index 레이어링

```
z-index 순서 (낮음 → 높음):
1. 뒷줄 좌/우 (pos 0, 2): z-index: 1
2. 뒷줄 중앙 (pos 1): z-index: 2
3. 앞줄 좌/우 (pos 3, 5): z-index: 3
4. 앞줄 중앙 (pos 4): z-index: 4
```

## HP UI 위치

### 뒷줄 (0, 1, 2): 머리 위
```css
top: -5px;
left: 50%;
transform: translateX(-50%);
```

### 앞줄 (3, 4, 5): 발 아래 + 오른쪽
```css
bottom: -8px;
left: 30px;
transform: none;
```

## 캐릭터 스케일

| 위치 | 스케일 | 설명 |
|------|--------|------|
| 일반 (0, 2, 3, 5) | 1.3x | 기본 크기 |
| 중앙 (1, 4) | 1.43x | 포커스 강조 (1.3 × 1.1) |

## 적군 보드

적군 보드는 보드 스프라이트와 유닛 컨테이너 모두 `scaleX(-1)`로 좌우 반전됩니다.
```css
.enemy .board-sprite { transform: scaleX(-1); }
.enemy .units-container { transform: scaleX(-1); }
```
이렇게 하면 아이소메트릭 보드에서도 아군과 동일한 좌표를 사용할 수 있습니다.

## 보드 이미지 수정 시 체크리스트

1. 새 이미지의 실제 픽셀 크기 확인
2. 각 타일의 중심점 좌표 측정
3. 슬롯 위치 공식에 대입하여 CSS 값 계산
4. 모바일용 비율 적용 (일반적으로 0.7~0.75배)
5. z-index 레이어링 확인
6. HP UI 위치 조정 필요 여부 확인
