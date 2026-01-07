# CLAUDE.md – Skillforge Alpha 아키텍처 가이드라인

> **버전**: 2.0 (New Architecture)
> **프로젝트**: Skillforge - 키워드 조합 기반 자동전투 RPG
> **영감**: 브레이브 프론티어(시각적 쾌감) + 유니콘 오버로드(전략적 논리)

---

## 1. 개발 원칙

### 1.1 기본 원칙
- **이전 코드 우선 원칙**: 매핑 충돌 시 기존 코드의 매핑 테이블 유지
- **사용자 알림 의무**: 충돌 발생 시 즉시 알림 및 선택 요청
- **오름차순 강박 금지**: 직관과 어긋나면 이전 코드 유지

### 1.2 코드 품질
- **TypeScript 100% Strict 모드**: 모든 코드는 타입 안전
- **단일 진실 공급원(SSOT)**: 매핑과 설정은 한 곳에서만 정의
- **관심사 분리**: 로직, 렌더링, UI를 명확히 분리

---

## 2. 프로젝트 구조

```
/src/skillforge/          <-- 새 프로젝트 루트 (기존 코드와 완전 분리)
├── core/
│   ├── Game.ts           // 메인 루프 & 상태 머신
│   ├── LayerManager.ts   // DOM & Canvas 레이어 컨트롤러
│   └── TimeSystem.ts     // CT(행동바) & Tick 로직
├── display/
│   ├── RenderSystem.ts   // Canvas 드로잉
│   ├── Layout.ts         // 좌표 & 보드 로직
│   └── ui/               // HTML UI 컴포넌트
├── data/
│   └── UnitData.ts       // 더미 데이터
├── audio/
│   └── AudioManager.ts   // Web Audio API & 동시발음 제한
├── debug/
│   └── DebugOverlay.ts   // 디버그 오버레이
├── assets/               // 리소스 (추후 추가)
├── types/
│   └── index.ts          // 타입 정의
└── index.ts              // 엔트리 포인트
```

---

## 3. 레이어 아키텍처 (3단 레이어)

### 3.1 레이어 구조
```
┌─────────────────────────────────────────┐
│  Layer 2 (z-index: 1000) - SYSTEM       │  ← 설정, 모달, 시스템 UI
├─────────────────────────────────────────┤
│  Layer 1 (z-index: 500) - DISPLAY       │  ← 천사상, 스킬 팝업, 오버로드 게이지
├─────────────────────────────────────────┤
│  Layer 0 (z-index: 1) - WORLD           │  ← Canvas 전투 전장
└─────────────────────────────────────────┘
```

### 3.2 레이어 역할
| 레이어 | Z-Index | 역할 | 인터랙션 |
|--------|---------|------|----------|
| Layer 2 (System) | 1000 | 설정, 일시정지, 상점, 모달 | pointer-events: auto |
| Layer 1 (Display) | 500 | 천사상, 스킬 이름, 대미지 텍스트 | pointer-events: none (기본) |
| Layer 0 (World) | 1 | Canvas 전투 전장, 유닛, 이펙트 | Canvas 이벤트 |

### 3.3 레이어 구현 패턴
```html
<div id="app-container">
    <canvas id="world-layer"></canvas>           <!-- Layer 0 -->
    <div id="display-layer">...</div>            <!-- Layer 1 -->
    <div id="system-layer">...</div>             <!-- Layer 2 -->
</div>
```

---

## 4. 화면 설계 (Portrait 9:16)

### 4.1 뷰포트 설정
- **비율**: 9:16 세로형 고정
- **높이**: `100dvh` (Dynamic Viewport Height - Safari 주소창 대응)
- **Safe Area**: `env(safe-area-inset-*)` (노치/Dynamic Island 대응)

### 4.2 Canvas 영역 배치 (Layer 0)
```
┌────────────────────────┐
│  천사상 공간 (Layer 1)  │  ← 좌상단, Canvas와 겹치지 않는 영역 확보
├────────────────────────┤
│                        │
│   적군 보드 (우상단)    │  ← 3행 2열 평행사변형
│   ↘                    │
│                        │
├────────────────────────┤
│                        │
│   전투 영역 (중앙)      │  ← 투사체, 빔, 이펙트
│                        │
├────────────────────────┤
│                        │
│   ↙ 아군 보드 (좌하단)  │  ← 3행 2열 평행사변형
│                        │
├────────────────────────┤
│  테스트 인터페이스      │  ← 우하단, 전투 시작 등 기능 테스트
└────────────────────────┘
```

### 4.3 아군 발판 레이아웃 (6슬롯)
```
세로로 긴 3행 2열 (3 Rows x 2 Columns)
배치 순서: 0→1→2→3→4→5

      우측(전진열)    좌측(후방열)
      ─────────────   ─────────────
Row0   [0] 선봉       [1]
       (적진과 가장 가까움)

Row1   [2]            [3]

Row2   [4]            [5]
       (화면 좌하단 구석)
```

| 슬롯 | 위치 | 설명 |
|------|------|------|
| 0 | 우상단 | 선봉, 적진과 가장 가까움 |
| 1 | 좌상단 | 선봉 좌측 |
| 2 | 중간우측 | 중렬 우측 |
| 3 | 중간좌측 | 중렬 좌측 |
| 4 | 우하단 | 후열 우측 |
| 5 | 좌하단 | 후열, 화면 구석 |

---

## 5. 모바일 & PWA 대응

### 5.1 필수 CSS 설정
```css
:root {
    --sat: env(safe-area-inset-top);
    --sab: env(safe-area-inset-bottom);
}

html, body {
    margin: 0; padding: 0;
    width: 100%; height: 100%;
    overflow: hidden;
    touch-action: none;           /* 브라우저 제스처 차단 */
    overscroll-behavior: none;    /* 풀다운 새로고침 차단 */
    user-select: none;
    -webkit-user-select: none;
}

#app-container {
    height: 100dvh;               /* Dynamic Viewport Height */
}
```

### 5.2 PWA 설정
```json
// manifest.json
{
    "display": "standalone",      /* 주소창 제거 */
    "orientation": "portrait"
}
```

### 5.3 메타 태그
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

---

## 6. 오디오 아키텍처

### 6.1 채널 분리
| 채널 | 용도 | 특수 처리 |
|------|------|----------|
| BGM | 배경 음악 | 오버로드 시 피치/필터 변조 |
| SFX | 타격음, 스킬 발동음 | 동시 발음 제한 |
| System | UI 클릭, 메뉴 오픈 | 항상 최우선 |
| Voice/Special | 천사상 울림, 기합 소리 | 우선순위 높음 |

### 6.2 동시 발음 제어 (Voice Limiting)
- **문제**: 0.2초 동시 발동 시 다수 유닛이 동시에 소리 내면 스피커 과부하
- **해결**: 동일 사운드가 0.05초 이내 중복 시 볼륨 조절 또는 개수 제한
- **구현**: AudioSnapshot 로직으로 최근 재생 사운드 추적

### 6.3 Web Audio API 구조
```typescript
AudioContext
├── BGMGainNode ──→ MasterGain ──→ destination
├── SFXGainNode ──→ MasterGain
├── SystemGainNode ──→ MasterGain
└── VoiceGainNode ──→ MasterGain
```

---

## 7. 전투 시스템

### 7.1 행동바(CT) 기반 순차 실행
- 각 유닛은 Speed에 따라 CT(Charge Time) 충전
- CT 100% 도달 시 행동 실행
- 0.2초 내 동시 발동 유닛은 그룹화하여 연출

### 7.2 스킬 타입 구분
| 타입 | 설명 | 판정 |
|------|------|------|
| Stationary | 제자리 발사 | 스냅샷 좌표 판정 |
| Tracking | 추적 스킬 | 실시간 좌표 판정 |

### 7.3 발판 시스템
- **발판**: 반딧불이 응집된 에너지체
- **추락**: HP 0 시 발판 소멸 → 유닛 Canvas 아래로 추락 (물리 연출)
- **컷인**: Layer 1에서 코믹/메모리얼 일러스트 노출

---

## 8. 디버그 시스템

### 8.1 디버그 오버레이 기능
- 슬롯 번호 표시 (유닛 인덱스 + 발판 번호)
- FPS 카운터
- 레이어 경계선 표시
- 좌표 정보 표시

### 8.2 디버그 라벨 형식
```
[인덱스] Slot N
예: [0] Slot 0
```

---

## 9. 관련 파일 참조

### 9.1 새 프로젝트 파일
- `src/skillforge/core/Game.ts` - 메인 게임 루프
- `src/skillforge/core/LayerManager.ts` - 레이어 관리
- `src/skillforge/display/Layout.ts` - 좌표 계산
- `src/skillforge/audio/AudioManager.ts` - 오디오 시스템

### 9.2 레거시 참조 (읽기 전용)
- `legacy/CLAUDE_LEGACY.md` - 이전 매핑 가이드라인
- `src/autobattle/constants/FormationMapping.ts` - 매핑 참조
- `src/autobattle/entities/Unit.ts` - 유닛 로직 참조

---

## 10. 요약 체크리스트

- [ ] 오름차순 강박 금지
- [ ] 직관과 어긋나면 이전 코드 유지
- [ ] 충돌 시 반드시 사용자에게 알림
- [ ] 3단 레이어 구조 준수 (System > Display > World)
- [ ] 9:16 Portrait, 100dvh, Safe Area 적용
- [ ] Web Audio API 채널 분리 및 동시발음 제한
- [ ] 디버그 오버레이로 슬롯/유닛 번호 확인
- [ ] FormationMapping을 단일 진실 공급원으로 사용
