/**
 * UnitData - 더미 데이터
 *
 * 테스트용 유닛 데이터 생성
 * Exit Presentation 설정 포함
 */

import {
    UnitData,
    TeamType,
    ExitPresentationConfig,
    ExitPresentationType,
} from '../types';

// ============================================================================
// 퇴장 연출 프리셋 (Exit Presentation Presets)
// ============================================================================

/**
 * 클래스별 기본 퇴장 연출 설정
 * - 전사 계열: 추락 (FALL)
 * - 마법사 계열: 부유 사라짐 (FLOAT)
 * - 궁수 계열: 날아서 퇴장 (FLY_AWAY)
 * - 힐러 계열: 느린 하강 (SLOW_DESCENT)
 * - 도적 계열: 페이드아웃 (FADE_OUT)
 * - 특수 캐릭터: 개그 퇴장, 파편화 등
 */
const EXIT_PRESETS: Record<string, ExitPresentationConfig> = {
    Knight: {
        type: 'FALL',
        memorialDuration: 2000,
        speedMultiplier: 1.0,
        exitSoundKey: 'fall_heavy',
    },
    Mage: {
        type: 'FLOAT',
        memorialDuration: 2500,
        speedMultiplier: 0.8,
        exitSoundKey: 'magic_fade',
    },
    Archer: {
        type: 'FLY_AWAY',
        memorialDuration: 1800,
        speedMultiplier: 1.2,
        exitSoundKey: 'swift_retreat',
    },
    Warrior: {
        type: 'SHATTER',
        memorialDuration: 2000,
        speedMultiplier: 1.0,
        exitSoundKey: 'armor_break',
    },
    Cleric: {
        type: 'SLOW_DESCENT',
        memorialDuration: 3000,
        speedMultiplier: 0.7,
        exitSoundKey: 'holy_fade',
    },
    Rogue: {
        type: 'FADE_OUT',
        memorialDuration: 1500,
        speedMultiplier: 1.5,
        exitSoundKey: 'shadow_vanish',
    },
};

/**
 * 적군용 퇴장 연출 (기본 FALL)
 */
const ENEMY_EXIT_PRESETS: Record<string, ExitPresentationConfig> = {
    Goblin: {
        type: 'COMEDIC_EXIT',
        memorialDuration: 1000,
        speedMultiplier: 1.5,
    },
    Orc: {
        type: 'FALL',
        memorialDuration: 1500,
        speedMultiplier: 0.9,
    },
    Skeleton: {
        type: 'SHATTER',
        memorialDuration: 1200,
        speedMultiplier: 1.2,
    },
    Imp: {
        type: 'FLY_AWAY',
        memorialDuration: 1000,
        speedMultiplier: 1.5,
    },
    Wraith: {
        type: 'FLOAT',
        memorialDuration: 2000,
        speedMultiplier: 0.6,
    },
    Ghoul: {
        type: 'SLOW_DESCENT',
        memorialDuration: 1800,
        speedMultiplier: 0.8,
    },
};

// ============================================================================
// 유닛 클래스 정의
// ============================================================================

interface UnitClassDefinition {
    name: string;
    color: string;
    baseStats: {
        hp: number;
        attack: number;
        defense: number;
        speed: number;
    };
    exitPreset: ExitPresentationConfig;
}

const UNIT_CLASSES: UnitClassDefinition[] = [
    {
        name: 'Knight',
        color: '#4488ff',
        baseStats: { hp: 120, attack: 15, defense: 12, speed: 80 },
        exitPreset: EXIT_PRESETS.Knight,
    },
    {
        name: 'Mage',
        color: '#aa44ff',
        baseStats: { hp: 80, attack: 25, defense: 6, speed: 90 },
        exitPreset: EXIT_PRESETS.Mage,
    },
    {
        name: 'Archer',
        color: '#44ff88',
        baseStats: { hp: 90, attack: 20, defense: 8, speed: 100 },
        exitPreset: EXIT_PRESETS.Archer,
    },
    {
        name: 'Warrior',
        color: '#ff8844',
        baseStats: { hp: 100, attack: 18, defense: 10, speed: 85 },
        exitPreset: EXIT_PRESETS.Warrior,
    },
    {
        name: 'Cleric',
        color: '#ffff44',
        baseStats: { hp: 85, attack: 10, defense: 8, speed: 75 },
        exitPreset: EXIT_PRESETS.Cleric,
    },
    {
        name: 'Rogue',
        color: '#ff44aa',
        baseStats: { hp: 75, attack: 22, defense: 5, speed: 110 },
        exitPreset: EXIT_PRESETS.Rogue,
    },
];

// 유닛 이름 풀
const ALLY_NAMES = ['Aldric', 'Brynn', 'Cedric', 'Diana', 'Eldric', 'Fiona'];
const ENEMY_NAMES = ['Goblin', 'Orc', 'Skeleton', 'Imp', 'Wraith', 'Ghoul'];

// ============================================================================
// 유닛 생성 함수
// ============================================================================

/**
 * 더미 유닛 생성
 */
export function createDummyUnit(
    id: string,
    name: string,
    className: string,
    team: TeamType,
    slotIndex: number,
    color: string,
    baseStats: { hp: number; attack: number; defense: number; speed: number },
    exitPresentation?: ExitPresentationConfig
): UnitData {
    // 약간의 랜덤 변동 추가
    const variance = 0.1; // 10% 변동
    const randomize = (value: number) => Math.floor(value * (1 + (Math.random() - 0.5) * 2 * variance));

    return {
        id,
        name,
        className,
        team,
        slotIndex,
        color,
        stats: {
            hp: randomize(baseStats.hp),
            maxHp: randomize(baseStats.hp),
            ap: 100,
            maxAp: 100,
            speed: randomize(baseStats.speed),
            defense: randomize(baseStats.defense),
            attack: randomize(baseStats.attack),
        },
        exitPresentation,
    };
}

/**
 * 더미 아군/적군 유닛 세트 생성
 */
export function createDummyUnits(): { allies: UnitData[]; enemies: UnitData[] } {
    const allies: UnitData[] = [];
    const enemies: UnitData[] = [];

    // 6명의 아군 생성 (클래스별 퇴장 연출 포함)
    for (let i = 0; i < 6; i++) {
        const unitClass = UNIT_CLASSES[i % UNIT_CLASSES.length];
        allies.push(
            createDummyUnit(
                `ally-${i}`,
                ALLY_NAMES[i],
                unitClass.name,
                'ally',
                i,
                unitClass.color,
                unitClass.baseStats,
                unitClass.exitPreset
            )
        );
    }

    // 6명의 적군 생성 (적군별 퇴장 연출 포함)
    for (let i = 0; i < 6; i++) {
        const unitClass = UNIT_CLASSES[(i + 3) % UNIT_CLASSES.length];
        const enemyName = ENEMY_NAMES[i];
        enemies.push(
            createDummyUnit(
                `enemy-${i}`,
                enemyName,
                unitClass.name,
                'enemy',
                i,
                adjustColorToRed(unitClass.color),
                unitClass.baseStats,
                ENEMY_EXIT_PRESETS[enemyName] ?? { type: 'FALL' as ExitPresentationType }
            )
        );
    }

    return { allies, enemies };
}

/**
 * 색상을 붉은 계열로 조정
 */
function adjustColorToRed(hexColor: string): string {
    const colors: Record<string, string> = {
        '#4488ff': '#ff4444', // Blue → Red
        '#aa44ff': '#ff44aa', // Purple → Pink
        '#44ff88': '#ff8844', // Green → Orange
        '#ff8844': '#ff4444', // Orange → Red
        '#ffff44': '#ff6644', // Yellow → Orange-Red
        '#ff44aa': '#aa4444', // Pink → Dark Red
    };
    return colors[hexColor] || '#ff4444';
}

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 슬롯 배치 설명 (디버그용)
 */
export const SLOT_DESCRIPTIONS: Record<number, string> = {
    0: 'Front-Right (Vanguard)',
    1: 'Front-Left',
    2: 'Mid-Right',
    3: 'Mid-Left',
    4: 'Back-Right',
    5: 'Back-Left (Rearguard)',
};

/**
 * 슬롯 인덱스로 역할 반환
 */
export function getSlotRole(slotIndex: number): 'front' | 'mid' | 'back' {
    if (slotIndex <= 1) return 'front';
    if (slotIndex <= 3) return 'mid';
    return 'back';
}

/**
 * 퇴장 연출 타입 설명
 */
export const EXIT_TYPE_DESCRIPTIONS: Record<ExitPresentationType, string> = {
    FALL: '발판 소멸 후 추락',
    FLOAT: '부유하며 사라짐',
    FLY_AWAY: '날아서 퇴장',
    SLOW_DESCENT: '느린 하강 (우아한 퇴장)',
    COMEDIC_EXIT: '개그 퇴장 (튕기며)',
    FADE_OUT: '서서히 사라짐',
    SHATTER: '파편화되며 소멸',
};
