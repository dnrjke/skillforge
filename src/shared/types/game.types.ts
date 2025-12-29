/**
 * SkillForge - 공유 게임 타입 정의
 * autobattle과 platformer 양쪽에서 사용
 */

// ===== 키워드 시스템 =====

export type KeywordId =
    // 공격 타입
    | 'STRIKE' | 'SLASH' | 'THRUST'
    // 속성
    | 'FLAME' | 'FROST' | 'LIGHTNING'
    // 강화
    | 'POWER' | 'SWIFT' | 'HEAVY'
    // 방어/회복
    | 'GUARD' | 'HEAL'
    // 특수
    | 'MULTI' | 'PIERCE';

export interface Keyword {
    id: KeywordId;
    name: string;
    apCost: number;
    power: number;
    description: string;
    // 선택적 효과
    defense?: number;
    hits?: number;
    ignoreDefense?: boolean;
    penetration?: boolean;
    lifesteal?: number;
    splash?: boolean;
}

export type KeywordMap = Record<KeywordId, Keyword>;

// ===== 스킬 시스템 =====

export type SkillType = 'attack' | 'heal' | 'defend' | 'wait';

export interface Skill {
    id: string;
    name: string;
    keywords: KeywordId[];
    priority: number;
    type: SkillType;
    apCost: number;
    power: number;
    description: string;
    canUse: (currentAp: number) => boolean;
    toString: () => string;
}

export interface SkillConfig {
    id: string;
    name: string;
    keywords: KeywordId[];
    priority: number;
    type?: SkillType;
    description?: string;
}

// ===== 패시브 스킬 시스템 =====

export type PassiveTrigger =
    | 'onBeingHit'      // 피격 시
    | 'onAfterHit'      // 피격 후 (반격 등)
    | 'onAttack'        // 공격 시
    | 'onTurnStart'     // 턴 시작 시
    | 'onLowHp';        // 체력 낮을 때

export interface PassiveSkill {
    id: string;
    displayName: string;
    description: string;
    trigger: PassiveTrigger;
    ppCost: number;
    cooldown: number;
    color: string;
    canActivate: (unit: any) => boolean;
    activate: (unit: any, context: PassiveContext) => PassiveResult;
}

export interface PassiveContext {
    attacker?: any;
    target?: any;
    skill?: Skill;
    damage?: number;
    damageMultiplier?: number;
    dodged?: boolean;
}

export interface PassiveResult {
    type: string;
    damage?: number;
    [key: string]: any;
}

// ===== 유닛 시스템 =====

export interface UnitStats {
    maxHp: number;
    currentHp: number;
    maxAp: number;
    currentAp: number;
    maxPp: number;
    currentPp: number;
    speed: number;
    defense: number;
    apRecovery: number;
}

export interface UnitConfig extends Partial<UnitStats> {
    id: string;
    name: string;
    isEnemy?: boolean;
    position?: number;
    row?: 'front' | 'middle' | 'back';
    skills?: Skill[];
    skillSet?: string;
    passives?: PassiveSkill[];
}

export interface DamageResult {
    damage: number;
    remainingHp: number;
    isDead: boolean;
    wasDefending: boolean;
}

// ===== 키워드 드랍 (플랫포머 → 자동전투 연동) =====

export type KeywordTier = 1 | 2 | 3;

export interface KeywordDrop {
    keywordId: KeywordId;
    tier: KeywordTier;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface KeywordInventoryItem {
    keywordId: KeywordId;
    tier: KeywordTier;
    count: number;
}
