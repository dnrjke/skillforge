/**
 * FormationMapping.ts - 전장 ↔ 파티 현황판 좌표 매핑
 *
 * ## 시각적 순서 012345 배치
 * 전→중→후 순서로 읽을 때 인덱스 0,1,2,3,4,5가 되도록 배치
 *
 * ## 전장 FORMATION (BattleScene.js)
 * 좌표 스왑 적용 (0↔4, 1↔5):
 *
 *         시각 front   시각 mid   시각 back
 * 상단      [0]후열1    [2]중열1    [4]전열1
 *          (x:400)     (x:260)     (x:120)
 * 하단      [1]후열2    [3]중열2    [5]전열2
 *          (x:430)     (x:290)     (x:150)
 *
 * ## 파티 현황판 (PartyStatusUI.js)
 * 원본 CSS 유지 + UNIT_TO_PARTY_SLOT 매핑으로 순서 조정
 *
 * 원본 CSS 시각 순서: pos3 → pos1 → pos0 → pos5 → pos4 → pos2
 * 매핑: 유닛0→pos3, 유닛1→pos1, 유닛2→pos0, 유닛3→pos5, 유닛4→pos4, 유닛5→pos2
 * 결과: 시각적으로 0,1,2,3,4,5 순서
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
 * 시각적 순서 012345 달성을 위한 매핑
 * 원본 CSS 위치에서 310542 → 012345 변환
 *
 * 원본 파티 현황판 시각 순서 (CSS 기준):
 *   시각1=pos3, 시각2=pos1, 시각3=pos0,
 *   시각4=pos5, 시각5=pos4, 시각6=pos2
 *
 * 목표: 유닛 0→시각1, 1→시각2, 2→시각3, 3→시각4, 4→시각5, 5→시각6
 */
export const FORMATION_TO_PARTY_SLOT: Record<FormationIndex, PartySlotPosition> = {
    0: 3,  // 유닛0 → pos3 (시각1: front-top)
    1: 1,  // 유닛1 → pos1 (시각2: front-bottom)
    2: 0,  // 유닛2 → pos0 (시각3: mid-top)
    3: 5,  // 유닛3 → pos5 (시각4: mid-bottom)
    4: 4,  // 유닛4 → pos4 (시각5: back-top)
    5: 2,  // 유닛5 → pos2 (시각6: back-bottom)
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
 * 시각적 순서 012345 검증:
 * 원본 CSS 시각 순서: pos3→pos1→pos0→pos5→pos4→pos2
 * 유닛 0-5가 위 순서대로 매핑되어야 함
 */
export function validateMapping(): boolean {
    // 원본 CSS의 시각적 순서 (pos값)
    const visualOrder: PartySlotPosition[] = [3, 1, 0, 5, 4, 2];

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
