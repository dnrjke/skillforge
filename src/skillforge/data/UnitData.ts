/**
 * UnitData - 더미 데이터
 *
 * 테스트용 유닛 데이터 생성
 */

import { UnitData, TeamType } from '../types';

// 유닛 클래스 정의
const UNIT_CLASSES = [
    { name: 'Knight', color: '#4488ff', baseStats: { hp: 120, attack: 15, defense: 12, speed: 80 } },
    { name: 'Mage', color: '#aa44ff', baseStats: { hp: 80, attack: 25, defense: 6, speed: 90 } },
    { name: 'Archer', color: '#44ff88', baseStats: { hp: 90, attack: 20, defense: 8, speed: 100 } },
    { name: 'Warrior', color: '#ff8844', baseStats: { hp: 100, attack: 18, defense: 10, speed: 85 } },
    { name: 'Cleric', color: '#ffff44', baseStats: { hp: 85, attack: 10, defense: 8, speed: 75 } },
    { name: 'Rogue', color: '#ff44aa', baseStats: { hp: 75, attack: 22, defense: 5, speed: 110 } },
];

// 유닛 이름 풀
const ALLY_NAMES = ['Aldric', 'Brynn', 'Cedric', 'Diana', 'Eldric', 'Fiona'];
const ENEMY_NAMES = ['Goblin', 'Orc', 'Skeleton', 'Imp', 'Wraith', 'Ghoul'];

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
    baseStats: { hp: number; attack: number; defense: number; speed: number }
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
    };
}

/**
 * 더미 아군/적군 유닛 세트 생성
 */
export function createDummyUnits(): { allies: UnitData[]; enemies: UnitData[] } {
    const allies: UnitData[] = [];
    const enemies: UnitData[] = [];

    // 6명의 아군 생성
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
                unitClass.baseStats
            )
        );
    }

    // 6명의 적군 생성
    for (let i = 0; i < 6; i++) {
        const unitClass = UNIT_CLASSES[(i + 3) % UNIT_CLASSES.length]; // 다른 클래스 조합
        enemies.push(
            createDummyUnit(
                `enemy-${i}`,
                ENEMY_NAMES[i],
                unitClass.name,
                'enemy',
                i,
                // 적군은 붉은 계열로 색상 변경
                adjustColorToRed(unitClass.color),
                unitClass.baseStats
            )
        );
    }

    return { allies, enemies };
}

/**
 * 색상을 붉은 계열로 조정
 */
function adjustColorToRed(hexColor: string): string {
    // 간단한 색상 변환 (빨간색 강조)
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
