// 키워드 기반 전투 시스템 - 스킬 정의
// 스킬은 키워드의 조합으로 구성됨
// 최종 AP 소모량 = 구성 키워드들의 apCost 합산

import { calculateTotalApCost, calculateTotalPower, getKeyword } from './Keywords.js';

export class Skill {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.keywords = config.keywords || [];  // 키워드 ID 배열
        this.priority = config.priority || 1;   // 우선순위 (1이 가장 높음)
        this.type = config.type || 'attack';    // attack, heal, defend
        this.targetType = config.targetType || 'enemy'; // enemy, ally, self

        // 키워드 기반 자동 계산
        this.apCost = calculateTotalApCost(this.keywords);
        this.power = calculateTotalPower(this.keywords);
    }

    // 스킬에 사용된 키워드 이름 문자열
    getKeywordNames() {
        return this.keywords
            .map(id => getKeyword(id)?.name || id)
            .join('+');
    }

    // 스킬 사용 가능 여부 확인
    canUse(currentAp) {
        return currentAp >= this.apCost;
    }

    // 스킬 정보 문자열
    toString() {
        return `[${this.getKeywordNames()}]`;
    }
}

// 사전 정의된 스킬들
export const SkillPresets = {
    // 기본 공격 스킬 (AP 2)
    BASIC_STRIKE: new Skill({
        id: 'BASIC_STRIKE',
        name: '기본 타격',
        keywords: ['STRIKE'],
        priority: 6,
        type: 'attack'
    }),

    // 강한 베기 (AP 5)
    POWER_SLASH: new Skill({
        id: 'POWER_SLASH',
        name: '강력한 베기',
        keywords: ['SLASH', 'POWER'],
        priority: 3,
        type: 'attack'
    }),

    // 화염 타격 (AP 5)
    FLAME_STRIKE: new Skill({
        id: 'FLAME_STRIKE',
        name: '화염 타격',
        keywords: ['STRIKE', 'FLAME'],
        priority: 4,
        type: 'attack'
    }),

    // 화염 강타 (AP 7)
    FLAME_POWER_STRIKE: new Skill({
        id: 'FLAME_POWER_STRIKE',
        name: '화염 강타',
        keywords: ['STRIKE', 'FLAME', 'POWER'],
        priority: 2,
        type: 'attack'
    }),

    // 번개 베기 (AP 7)
    LIGHTNING_SLASH: new Skill({
        id: 'LIGHTNING_SLASH',
        name: '번개 베기',
        keywords: ['SLASH', 'LIGHTNING'],
        priority: 2,
        type: 'attack'
    }),

    // 신속 연타 (AP 5)
    SWIFT_MULTI: new Skill({
        id: 'SWIFT_MULTI',
        name: '신속 연타',
        keywords: ['STRIKE', 'SWIFT', 'MULTI'],
        priority: 4,
        type: 'attack'
    }),

    // 중타격 (AP 5)
    HEAVY_STRIKE: new Skill({
        id: 'HEAVY_STRIKE',
        name: '중타격',
        keywords: ['STRIKE', 'HEAVY'],
        priority: 4,
        type: 'attack'
    }),

    // 관통 찌르기 (AP 4)
    PIERCE_THRUST: new Skill({
        id: 'PIERCE_THRUST',
        name: '관통 찌르기',
        keywords: ['THRUST', 'PIERCE'],
        priority: 5,
        type: 'attack'
    }),

    // 냉기 중타 (AP 8)
    FROST_HEAVY_STRIKE: new Skill({
        id: 'FROST_HEAVY_STRIKE',
        name: '냉기 중타',
        keywords: ['STRIKE', 'FROST', 'HEAVY'],
        priority: 1,
        type: 'attack'
    }),

    // 치유 (AP 4)
    HEAL: new Skill({
        id: 'HEAL',
        name: '치유',
        keywords: ['HEAL'],
        priority: 3,
        type: 'heal',
        targetType: 'ally'
    }),

    // 방어 (AP 2)
    GUARD: new Skill({
        id: 'GUARD',
        name: '방어',
        keywords: ['GUARD'],
        priority: 5,
        type: 'defend',
        targetType: 'self'
    }),

    // 대기 (AP 0) - 특수 스킬
    WAIT: new Skill({
        id: 'WAIT',
        name: '대기',
        keywords: [],
        priority: 99,
        type: 'wait',
        targetType: 'self'
    })
};

// 스킬셋 프리셋 (캐릭터 타입별)
export const SkillSets = {
    // 전사형 - 물리 공격 중심
    WARRIOR: [
        SkillPresets.FROST_HEAVY_STRIKE,  // AP 8, 우선순위 1
        SkillPresets.POWER_SLASH,          // AP 5, 우선순위 3
        SkillPresets.HEAVY_STRIKE,         // AP 5, 우선순위 4
        SkillPresets.PIERCE_THRUST,        // AP 4, 우선순위 5
        SkillPresets.BASIC_STRIKE,         // AP 2, 우선순위 6
        SkillPresets.WAIT                  // AP 0, 우선순위 99
    ],

    // 마법사형 - 속성 공격 중심
    MAGE: [
        SkillPresets.LIGHTNING_SLASH,      // AP 7, 우선순위 2
        SkillPresets.FLAME_POWER_STRIKE,   // AP 7, 우선순위 2
        SkillPresets.FLAME_STRIKE,         // AP 5, 우선순위 4
        SkillPresets.HEAL,                 // AP 4, 우선순위 3
        SkillPresets.BASIC_STRIKE,         // AP 2, 우선순위 6
        SkillPresets.WAIT                  // AP 0, 우선순위 99
    ],

    // 속도형 - 신속 공격 중심
    ROGUE: [
        SkillPresets.LIGHTNING_SLASH,      // AP 7, 우선순위 2
        SkillPresets.SWIFT_MULTI,          // AP 5, 우선순위 4
        SkillPresets.PIERCE_THRUST,        // AP 4, 우선순위 5
        SkillPresets.BASIC_STRIKE,         // AP 2, 우선순위 6
        SkillPresets.GUARD,                // AP 2, 우선순위 5
        SkillPresets.WAIT                  // AP 0, 우선순위 99
    ]
};

// 스킬 ID로 스킬 객체 가져오기
export function getSkill(id) {
    return SkillPresets[id] || null;
}

export default SkillPresets;
