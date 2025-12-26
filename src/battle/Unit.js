// 키워드 기반 전투 시스템 - 유닛 클래스
// Unit: HP, AP, Speed, Position, Skills[] 보유

import { SkillSets, SkillPresets } from '../data/Skills.js';

export default class Unit {
    constructor(config) {
        // 기본 정보
        this.id = config.id;
        this.name = config.name;
        this.isEnemy = config.isEnemy || false;

        // 스탯
        this.maxHp = config.maxHp || 100;
        this.currentHp = config.currentHp ?? this.maxHp;
        this.maxAp = config.maxAp || 10;
        this.currentAp = config.currentAp ?? 0;
        this.speed = config.speed || 10;  // 행동 순서 결정
        this.defense = config.defense || 0;

        // 위치 정보
        this.position = config.position || 0;  // 0~5 인덱스
        this.row = config.row || 'front';      // 'front' or 'back'

        // 스킬 (우선순위 순으로 정렬됨)
        this.skills = this.initializeSkills(config.skills || config.skillSet);

        // AP 회복량 (대기 시)
        this.apRecovery = config.apRecovery || 3;

        // 상태
        this.isAlive = true;
        this.isDefending = false;

        // 시각적 연결 (Phaser 스프라이트)
        this.sprite = null;
        this.statusBar = null;
    }

    initializeSkills(skillsOrSet) {
        if (Array.isArray(skillsOrSet)) {
            // 이미 스킬 배열인 경우
            return [...skillsOrSet].sort((a, b) => a.priority - b.priority);
        } else if (typeof skillsOrSet === 'string' && SkillSets[skillsOrSet]) {
            // 스킬셋 이름인 경우
            return [...SkillSets[skillsOrSet]].sort((a, b) => a.priority - b.priority);
        }
        // 기본 스킬셋
        return [...SkillSets.WARRIOR].sort((a, b) => a.priority - b.priority);
    }

    // Phaser 스프라이트 연결
    linkSprite(sprite) {
        this.sprite = sprite;
        this.statusBar = sprite.statusBar;

        // StatusBar에 Unit 연결
        if (this.statusBar) {
            this.statusBar.unit = this;
            this.statusBar.maxAp = this.maxAp;
            this.statusBar.currentAp = this.currentAp;
            this.statusBar.setAp(this.currentAp, false);
        }
    }

    // 현재 AP로 사용 가능한 최우선순위 스킬 선택
    selectSkill() {
        // 우선순위 순으로 정렬된 스킬 중 사용 가능한 첫 번째 스킬
        for (const skill of this.skills) {
            if (skill.canUse(this.currentAp)) {
                return skill;
            }
        }
        // 모든 스킬 사용 불가 시 대기
        return SkillPresets.WAIT;
    }

    // AP 소모
    consumeAp(amount) {
        this.currentAp = Math.max(0, this.currentAp - amount);
        if (this.statusBar) {
            this.statusBar.setAp(this.currentAp);
        }
    }

    // AP 회복
    recoverAp(amount = null) {
        const recovery = amount ?? this.apRecovery;
        this.currentAp = Math.min(this.maxAp, this.currentAp + recovery);
        if (this.statusBar) {
            this.statusBar.setAp(this.currentAp);
        }
        return recovery;
    }

    // 데미지 받기
    takeDamage(damage) {
        // 방어 중이면 데미지 감소
        let finalDamage = damage;
        if (this.isDefending) {
            finalDamage = Math.max(1, Math.floor(damage * 0.5));
            this.isDefending = false;  // 방어 해제
        }

        // 방어력 적용
        finalDamage = Math.max(1, finalDamage - this.defense);

        this.currentHp = Math.max(0, this.currentHp - finalDamage);

        if (this.statusBar) {
            this.statusBar.damage(finalDamage);
        }

        if (this.currentHp <= 0) {
            this.isAlive = false;
        }

        return {
            damage: finalDamage,
            remainingHp: this.currentHp,
            isDead: !this.isAlive
        };
    }

    // 회복
    heal(amount) {
        const actualHeal = Math.min(amount, this.maxHp - this.currentHp);
        this.currentHp += actualHeal;

        if (this.statusBar) {
            this.statusBar.heal(actualHeal);
        }

        return actualHeal;
    }

    // 방어 태세
    defend() {
        this.isDefending = true;
    }

    // 상태 문자열
    getStatus() {
        return `${this.name} [HP: ${this.currentHp}/${this.maxHp}, AP: ${this.currentAp}/${this.maxAp}]`;
    }

    // 사망 여부
    get isDead() {
        return !this.isAlive;
    }
}
