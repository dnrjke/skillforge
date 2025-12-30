/**
 * FormationMapping.ts - 전장 ↔ 파티 현황판 좌표 매핑 (Single Source of Truth)
 *
 * ## 새 발판 이미지 기준 배치 (2024-12-30)
 * 원본 이미지 좌표 (그림자 중심 기준):
 *
 * [0] 전열1 (우하단) = 998, 484
 * [1] 전열2 (우상단) = 942, 308
 * [2] 중열1 (중하단) = 676, 456
 * [3] 중열2 (중상단) = 634, 282
 * [4] 후열1 (좌하단) = 344, 480
 * [5] 후열2 (좌상단) = 300, 258
 *
 * ## 레이아웃
 *         좌(후열)    중(중열)    우(전열)
 * 상단     [5]후열2    [3]중열2    [1]전열2
 * 하단     [4]후열1    [2]중열1    [0]전열1
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
// 활성 슬롯
// ============================================

/** 6개 슬롯: 후열1, 후열2, 중열1, 중열2, 전열1, 전열2 */
export const ACTIVE_FORMATION_SLOTS: readonly FormationIndex[] = [0, 1, 2, 3, 4, 5] as const;

// ============================================
// 파티 현황판 슬롯 매핑
// ============================================

/**
 * FORMATION 인덱스 → 파티 현황판 슬롯 pos 매핑
 * 새 발판 이미지 기준 1:1 매핑
 */
export const FORMATION_TO_PARTY_SLOT: Record<FormationIndex, PartySlotPosition> = {
    0: 0,  // 전열1 (우하단)
    1: 1,  // 전열2 (우상단)
    2: 2,  // 중열1 (중하단)
    3: 3,  // 중열2 (중상단)
    4: 4,  // 후열1 (좌하단)
    5: 5,  // 후열2 (좌상단)
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

/** 매핑 일관성 검증 (개발용) */
export function validateMapping(): boolean {
    // 새 발판 이미지 기준 1:1 매핑
    const visualOrder: PartySlotPosition[] = [0, 1, 2, 3, 4, 5];

    const errors: string[] = [];

    ACTIVE_FORMATION_SLOTS.forEach((formIdx, unitIdx) => {
        const partyPos = UNIT_TO_PARTY_SLOT[unitIdx];
        const expectedPos = visualOrder[unitIdx];

        if (partyPos !== expectedPos) {
            errors.push(`유닛[${unitIdx}]이 pos=${partyPos}에 매핑됨 (예상: pos=${expectedPos})`);
        }
    });

    if (errors.length > 0) {
        console.error('[FormationMapping] 매핑 검증 실패:', errors);
        return false;
    }

    console.log('[FormationMapping] 매핑 검증 성공 (시각적 순서 012345)');
    console.log('[FormationMapping] UNIT_TO_PARTY_SLOT:', UNIT_TO_PARTY_SLOT);
    return true;
}

// 개발 모드에서 자동 검증
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    validateMapping();
}
