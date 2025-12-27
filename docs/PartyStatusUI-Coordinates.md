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

## 슬롯 CSS 값 (데스크탑)

```css
/* 뒷줄 (0, 1, 2) */
.unit-slot[data-pos="0"] { left: 60px; top: 10px; }
.unit-slot[data-pos="1"] { left: 101px; top: -5px; }
.unit-slot[data-pos="2"] { left: 144px; top: -20px; }

/* 앞줄 (3, 4, 5) */
.unit-slot[data-pos="3"] { left: 75px; top: 32px; }
.unit-slot[data-pos="4"] { left: 119px; top: 15px; }
.unit-slot[data-pos="5"] { left: 162px; top: -1px; }
```

## 슬롯 CSS 값 (모바일)

```css
/* 모바일 (데스크탑의 0.714배) */
.unit-slot[data-pos="0"] { left: 43px; top: 7px; }
.unit-slot[data-pos="1"] { left: 72px; top: -4px; }
.unit-slot[data-pos="2"] { left: 103px; top: -14px; }
.unit-slot[data-pos="3"] { left: 54px; top: 23px; }
.unit-slot[data-pos="4"] { left: 85px; top: 11px; }
.unit-slot[data-pos="5"] { left: 116px; top: -1px; }
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

적군 보드는 `scaleX(-1)`로 좌우 반전됩니다.
- CSS: `.enemy .board-sprite { transform: scaleX(-1); }`

## 보드 이미지 수정 시 체크리스트

1. 새 이미지의 실제 픽셀 크기 확인
2. 각 타일의 중심점 좌표 측정
3. 슬롯 위치 공식에 대입하여 CSS 값 계산
4. 모바일용 비율 적용 (일반적으로 0.7~0.75배)
5. z-index 레이어링 확인
6. HP UI 위치 조정 필요 여부 확인
