/**
 * FormationMapping.ts - 전장 ↔ 파티 현황판 좌표 매핑
 *
 * ## 좌표 체계 (2행 3열 그리드)
 *
 *         후열(좌)   중열(중)   전열(우)
 * 상단      후열1      중열1      전열1
 * 하단      후열2      중열2      전열2
 *
 * ## 전장 FORMATION 인덱스 (BattleScene.js)
 *
 * FORMATION.ALLY[0] = 후열1 (x:120, y:200)
 * FORMATION.ALLY[1] = 후열2 (x:150, y:380)
 * FORMATION.ALLY[2] = 중열1 (x:260, y:220)
 * FORMATION.ALLY[3] = 중열2 (x:290, y:400)
 * FORMATION.ALLY[4] = 전열1 (x:400, y:240)
 * FORMATION.ALLY[5] = 전열2 (x:430, y:420)
 *
 * ## 파티 현황판 슬롯 (PartyStatusUI.js CSS)
 *
 * 뒷줄(후열 대응):
 *   pos=0: 뒷줄 하단 (left:57px)
 *   pos=1: 뒷줄 중앙 (left:98px)
 *   pos=2: 뒷줄 상단 (left:141px)
 *
 * 앞줄(전열 대응):
 *   pos=3: 앞줄 하단 (left:72px)
 *   pos=4: 앞줄 중앙 (left:116px)
 *   pos=5: 앞줄 상단 (left:159px)
 *
 * ## 현재 3vs3 배치 (ACTIVE_SLOTS = [1, 2, 4])
 *
 * | 인덱스 | FORMATION | 전장 위치 | 파티 현황판 pos | 파티 위치 |
 * |--------|-----------|----------|-----------------|-----------|
 * | [0]    | 1 (후열2) | 좌하단   | 1               | 뒷줄 중앙 |
 * | [1]    | 2 (중열1) | 중상단   | 2               | 뒷줄 상단 |
 * | [2]    | 4 (전열1) | 우상단   | 4               | 앞줄 중앙 |
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

export const FORMATION_ALLY: readonly FormationSlot[] = [
    { id: 0, row: 'back',   x: 120, y: 200, label: '후열1' },
    { id: 1, row: 'back',   x: 150, y: 380, label: '후열2' },
    { id: 2, row: 'middle', x: 260, y: 220, label: '중열1' },
    { id: 3, row: 'middle', x: 290, y: 400, label: '중열2' },
    { id: 4, row: 'front',  x: 400, y: 240, label: '전열1' },
    { id: 5, row: 'front',  x: 430, y: 420, label: '전열2' },
] as const;

export const FORMATION_ENEMY: readonly FormationSlot[] = [
    { id: 0, row: 'back',   x: 1160, y: 200, label: '후열1' },
    { id: 1, row: 'back',   x: 1130, y: 380, label: '후열2' },
    { id: 2, row: 'middle', x: 1020, y: 220, label: '중열1' },
    { id: 3, row: 'middle', x: 990,  y: 400, label: '중열2' },
    { id: 4, row: 'front',  x: 880,  y: 240, label: '전열1' },
    { id: 5, row: 'front',  x: 850,  y: 420, label: '전열2' },
] as const;

// ============================================
// 3vs3 활성 슬롯 (변경 금지!)
// ============================================

/**
 * 3vs3 전투에서 사용하는 FORMATION 인덱스
 * 순서: 후열2, 중열1, 전열1
 */
export const ACTIVE_FORMATION_SLOTS: readonly FormationIndex[] = [1, 2, 4] as const;

// ============================================
// 파티 현황판 슬롯 매핑
// ============================================

/**
 * FORMATION 인덱스 → 파티 현황판 슬롯 pos 매핑
 *
 * 규칙:
 * - 후열(back) → 뒷줄 (pos 0, 1, 2)
 * - 전열(front) → 앞줄 (pos 3, 4, 5)
 * - 중열(middle) → 뒷줄에 배치 (시각적 일관성)
 */
export const FORMATION_TO_PARTY_SLOT: Record<FormationIndex, PartySlotPosition> = {
    0: 2,  // 후열1 → 뒷줄 상단
    1: 1,  // 후열2 → 뒷줄 중앙
    2: 2,  // 중열1 → 뒷줄 상단 (중열은 뒷줄에 배치)
    3: 0,  // 중열2 → 뒷줄 하단
    4: 4,  // 전열1 → 앞줄 중앙
    5: 3,  // 전열2 → 앞줄 하단
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
 */
export function validateMapping(): boolean {
    const errors: string[] = [];

    ACTIVE_FORMATION_SLOTS.forEach((formIdx, unitIdx) => {
        const formSlot = FORMATION_ALLY[formIdx];
        const partyPos = UNIT_TO_PARTY_SLOT[unitIdx];

        // 후열 → 뒷줄(0-2), 전열 → 앞줄(3-5) 검증
        const isBackRow = formSlot.row === 'back' || formSlot.row === 'middle';
        const isPartyBack = partyPos <= 2;

        if (formSlot.row === 'front' && isPartyBack) {
            errors.push(`[${unitIdx}] 전열(${formSlot.label})이 뒷줄(pos=${partyPos})에 매핑됨`);
        }
        if (formSlot.row === 'back' && !isPartyBack) {
            errors.push(`[${unitIdx}] 후열(${formSlot.label})이 앞줄(pos=${partyPos})에 매핑됨`);
        }
    });

    if (errors.length > 0) {
        console.error('[FormationMapping] 매핑 검증 실패:', errors);
        return false;
    }

    console.log('[FormationMapping] 매핑 검증 성공');
    return true;
}

// 개발 모드에서 자동 검증
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    validateMapping();
}
