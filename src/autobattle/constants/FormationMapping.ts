/**
 * FormationMapping.ts - 전장 ↔ 파티 현황판 좌표 매핑
 *
 * ## 시각적 순서 012345 배치
 * 전→중→후 순서로 읽을 때 인덱스 0,1,2,3,4,5가 되도록 좌표 재배치
 *
 * ## 좌표 체계 (2행 3열 그리드)
 *
 *         시각 front   시각 mid   시각 back
 * 상단      [0]후열1    [2]중열1    [4]전열1
 * 하단      [1]후열2    [3]중열2    [5]전열2
 *
 * ## 전장 FORMATION 인덱스 (BattleScene.js) - 좌표 스왑 적용
 *
 * FORMATION.ALLY[0] = 후열1 (x:400, y:240) ← 시각 front-top
 * FORMATION.ALLY[1] = 후열2 (x:430, y:420) ← 시각 front-bottom
 * FORMATION.ALLY[2] = 중열1 (x:260, y:220) ← 시각 mid-top
 * FORMATION.ALLY[3] = 중열2 (x:290, y:400) ← 시각 mid-bottom
 * FORMATION.ALLY[4] = 전열1 (x:120, y:200) ← 시각 back-top
 * FORMATION.ALLY[5] = 전열2 (x:150, y:380) ← 시각 back-bottom
 *
 * ## 파티 현황판 슬롯 (PartyStatusUI.js CSS) - 251403→012345 변환
 *
 * pos=0: 시각 front-top (left:98px)
 * pos=1: 시각 front-bottom (left:159px)
 * pos=2: 시각 mid-top (left:72px)
 * pos=3: 시각 mid-bottom (left:141px)
 * pos=4: 시각 back-top (left:57px)
 * pos=5: 시각 back-bottom (left:116px)
 */

// ============================================
// 타입 정의
// ============================================

/** 전장 열 (Row) */
export type BattleRow = 'back' | 'middle' | 'front';

/** 전장 위치 (6슬롯 인덱스) */
export type FormationIndex = 0 | 1 | 2 | 3 | 4 | 5;

/** 파티 현황판 슬롯 위치 (6슬롯) */
export type PartySlotPosition = 0 | 1 | 2 | 3 | 4 | 5;

/** 유닛 배열 인덱스 (3vs3) */
export type UnitIndex = 0 | 1 | 2;

// ============================================
// 전장 FORMATION 정의
// ============================================

export interface FormationSlot {
    id: FormationIndex;
    row: BattleRow;
    x: number;
    y: number;
    label: string;  // 후열1, 후열2, 중열1, ...
}

// 시각적 순서 012345 배치 (좌표 스왑: 0↔4, 1↔5)
export const FORMATION_ALLY: readonly FormationSlot[] = [
    { id: 0, row: 'back',   x: 400, y: 240, label: '후열1' },  // 시각 front-top
    { id: 1, row: 'back',   x: 430, y: 420, label: '후열2' },  // 시각 front-bottom
    { id: 2, row: 'middle', x: 260, y: 220, label: '중열1' },  // 시각 mid-top
    { id: 3, row: 'middle', x: 290, y: 400, label: '중열2' },  // 시각 mid-bottom
    { id: 4, row: 'front',  x: 120, y: 200, label: '전열1' },  // 시각 back-top
    { id: 5, row: 'front',  x: 150, y: 380, label: '전열2' },  // 시각 back-bottom
] as const;

export const FORMATION_ENEMY: readonly FormationSlot[] = [
    { id: 0, row: 'back',   x: 880,  y: 240, label: '후열1' }, // 시각 front-top
    { id: 1, row: 'back',   x: 850,  y: 420, label: '후열2' }, // 시각 front-bottom
    { id: 2, row: 'middle', x: 1020, y: 220, label: '중열1' }, // 시각 mid-top
    { id: 3, row: 'middle', x: 990,  y: 400, label: '중열2' }, // 시각 mid-bottom
    { id: 4, row: 'front',  x: 1160, y: 200, label: '전열1' }, // 시각 back-top
    { id: 5, row: 'front',  x: 1130, y: 380, label: '전열2' }, // 시각 back-bottom
] as const;

// ============================================
// 3vs3 활성 슬롯 (변경 금지!)
// ============================================

/**
 * 디버깅용: 6개 슬롯 모두 사용
 * 순서: 후열1, 후열2, 중열1, 중열2, 전열1, 전열2
 */
export const ACTIVE_FORMATION_SLOTS: readonly FormationIndex[] = [0, 1, 2, 3, 4, 5] as const;

// ============================================
// 파티 현황판 슬롯 매핑
// ============================================

/**
 * FORMATION 인덱스 → 파티 현황판 슬롯 pos 매핑
 *
 * 디버깅용: 1:1 매핑으로 설정하여 위치 확인
 * FORMATION 인덱스 = 파티 현황판 pos
 */
export const FORMATION_TO_PARTY_SLOT: Record<FormationIndex, PartySlotPosition> = {
    0: 0,  // FORMATION[0] → pos=0
    1: 1,  // FORMATION[1] → pos=1
    2: 2,  // FORMATION[2] → pos=2
    3: 3,  // FORMATION[3] → pos=3
    4: 4,  // FORMATION[4] → pos=4
    5: 5,  // FORMATION[5] → pos=5
};

/**
 * 3vs3 전용: 유닛 인덱스 → 파티 현황판 슬롯 pos
 * ACTIVE_FORMATION_SLOTS 기반으로 자동 생성
 */
export const UNIT_TO_PARTY_SLOT: readonly PartySlotPosition[] =
    ACTIVE_FORMATION_SLOTS.map(formIdx => FORMATION_TO_PARTY_SLOT[formIdx]);

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 유닛 인덱스로 파티 현황판 슬롯 위치 조회
 */
export function getPartySlotForUnit(unitIndex: UnitIndex): PartySlotPosition {
    return UNIT_TO_PARTY_SLOT[unitIndex];
}

/**
 * FORMATION 인덱스로 전장 위치 정보 조회
 */
export function getFormationSlot(index: FormationIndex, isEnemy: boolean = false): FormationSlot {
    return isEnemy ? FORMATION_ENEMY[index] : FORMATION_ALLY[index];
}

/**
 * 매핑 일관성 검증 (개발/디버그용)
 *
 * 시각적 순서 012345 배치에서:
 * - 후열(back) → 시각 front (pos=0,1)
 * - 중열(middle) → 시각 mid (pos=2,3)
 * - 전열(front) → 시각 back (pos=4,5)
 */
export function validateMapping(): boolean {
    const errors: string[] = [];

    ACTIVE_FORMATION_SLOTS.forEach((formIdx, unitIdx) => {
        const formSlot = FORMATION_ALLY[formIdx];
        const partyPos = UNIT_TO_PARTY_SLOT[unitIdx];

        // 시각적 순서 012345 검증 (의도적인 반전)
        // 후열(back) → 시각 front (pos 0,1)
        // 중열(middle) → 시각 mid (pos 2,3)
        // 전열(front) → 시각 back (pos 4,5)
        const expectedVisualRange = {
            'back': [0, 1],
            'middle': [2, 3],
            'front': [4, 5]
        };

        const range = expectedVisualRange[formSlot.row];
        if (partyPos < range[0] || partyPos > range[1]) {
            errors.push(`[${unitIdx}] ${formSlot.label}(${formSlot.row})이 예상 범위(${range})가 아닌 pos=${partyPos}에 매핑됨`);
        }
    });

    if (errors.length > 0) {
        console.error('[FormationMapping] 매핑 검증 실패:', errors);
        return false;
    }

    console.log('[FormationMapping] 매핑 검증 성공 (시각적 순서 012345)');
    return true;
}

// 개발 모드에서 자동 검증
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    validateMapping();
}
