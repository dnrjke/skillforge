// 패시브 스킬 시스템 - 유니콘 오버로드 스타일
// PP(Passive Point)를 소모하여 특정 조건에서 자동 발동

export class PassiveSkill {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description || '';
        this.ppCost = config.ppCost || 1;           // PP 소모량
        this.trigger = config.trigger;               // 발동 조건: 'onBeingHit', 'onAllyHit', 'onEnemyAttack', 'onTurnStart'
        this.chance = config.chance || 1.0;          // 발동 확률 (0~1)
        this.effect = config.effect;                 // 효과 함수
        this.displayName = config.displayName || this.name; // 화면에 표시될 이름
        this.color = config.color || '#ffcc00';      // 텍스트 색상
    }

    // 발동 가능 여부 확인
    canActivate(unit) {
        if (unit.currentPp < this.ppCost) return false;
        if (Math.random() > this.chance) return false;
        return true;
    }

    // 패시브 발동
    activate(unit, context) {
        unit.consumePp(this.ppCost);
        return this.effect(unit, context);
    }
}

// 사전 정의된 패시브 스킬들
export const PassivePresets = {
    // 방어 반응 - 피격 시 30% 확률로 데미지 50% 감소
    GUARD_REACTION: new PassiveSkill({
        id: 'GUARD_REACTION',
        name: '방어 반응',
        displayName: '방어!',
        description: '피격 시 30% 확률로 데미지 50% 감소',
        ppCost: 1,
        trigger: 'onBeingHit',
        chance: 0.3,
        color: '#4488ff',
        effect: (unit, context) => {
            context.damageMultiplier = 0.5;
            return { type: 'damageReduce', value: 0.5 };
        }
    }),

    // 반격 - 피격 후 40% 확률로 즉시 반격
    COUNTER_ATTACK: new PassiveSkill({
        id: 'COUNTER_ATTACK',
        name: '반격',
        displayName: '반격!',
        description: '피격 후 40% 확률로 즉시 반격',
        ppCost: 1,
        trigger: 'onAfterHit',
        chance: 0.4,
        color: '#ff6600',
        effect: (unit, context) => {
            return { type: 'counterAttack', damage: 10 };
        }
    }),

    // 아군 보호 - 아군 피격 시 25% 확률로 대신 맞기
    COVER_ALLY: new PassiveSkill({
        id: 'COVER_ALLY',
        name: '아군 보호',
        displayName: '엄호!',
        description: '아군 피격 시 25% 확률로 대신 맞음',
        ppCost: 1,
        trigger: 'onAllyHit',
        chance: 0.25,
        color: '#88ff88',
        effect: (unit, context) => {
            context.newTarget = unit;
            return { type: 'coverAlly' };
        }
    }),

    // 긴급 회피 - 피격 시 20% 확률로 완전 회피
    EMERGENCY_DODGE: new PassiveSkill({
        id: 'EMERGENCY_DODGE',
        name: '긴급 회피',
        displayName: '회피!',
        description: '피격 시 20% 확률로 완전 회피',
        ppCost: 2,
        trigger: 'onBeingHit',
        chance: 0.2,
        color: '#ffff44',
        effect: (unit, context) => {
            context.damageMultiplier = 0;
            context.dodged = true;
            return { type: 'dodge' };
        }
    }),

    // 응급 치유 - HP가 30% 이하가 되면 자동 회복
    EMERGENCY_HEAL: new PassiveSkill({
        id: 'EMERGENCY_HEAL',
        name: '응급 치유',
        displayName: '치유!',
        description: 'HP 30% 이하 시 자동으로 HP 15% 회복',
        ppCost: 2,
        trigger: 'onLowHp',
        chance: 1.0,
        color: '#44ff88',
        effect: (unit, context) => {
            const healAmount = Math.floor(unit.maxHp * 0.15);
            unit.heal(healAmount);
            return { type: 'heal', value: healAmount };
        }
    }),

    // 전투 의지 - 턴 시작 시 50% 확률로 AP 1 추가 회복
    BATTLE_SPIRIT: new PassiveSkill({
        id: 'BATTLE_SPIRIT',
        name: '전투 의지',
        displayName: 'AP 회복!',
        description: '턴 시작 시 50% 확률로 AP 1 추가 회복',
        ppCost: 1,
        trigger: 'onTurnStart',
        chance: 0.5,
        color: '#ffaa00',
        effect: (unit, context) => {
            unit.recoverAp(1);
            return { type: 'apRecover', value: 1 };
        }
    })
};

// 캐릭터 타입별 기본 패시브 세트
export const PassiveSets = {
    WARRIOR: [
        PassivePresets.GUARD_REACTION,
        PassivePresets.COUNTER_ATTACK
    ],
    MAGE: [
        PassivePresets.EMERGENCY_DODGE,
        PassivePresets.EMERGENCY_HEAL
    ],
    ROGUE: [
        PassivePresets.EMERGENCY_DODGE,
        PassivePresets.COUNTER_ATTACK
    ],
    TANK: [
        PassivePresets.GUARD_REACTION,
        PassivePresets.COVER_ALLY
    ]
};

export function getPassive(id) {
    return PassivePresets[id] || null;
}

export default PassivePresets;
