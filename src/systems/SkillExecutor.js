// 스킬 실행 시스템 - 키워드 조합 기반 스킬 실행
// 키워드 → 스킬 효과 → 연출 파이프라인 관리
//
// 향후 확장 계획:
// - 키워드 조합으로 스킬 생성 (예: [화염] + [연속] = 화염연격)
// - 키워드별 연출 모듈 (예: [관통] → 관통 이펙트)
// - 데미지 공식 모듈화

import { getKeyword } from '../data/Keywords.js';

export default class SkillExecutor {
    constructor(battleManager, presentation, bannerUI) {
        this.battleManager = battleManager;
        this.presentation = presentation;  // BattlePresentation
        this.bannerUI = bannerUI;          // ActionBannerUI
        this.scene = battleManager.scene;
    }

    // ==========================================
    // 스킬 실행 메인 파이프라인
    // ==========================================

    /**
     * 스킬 실행 (타입에 따라 분기)
     * @param {Unit} unit - 시전 유닛
     * @param {Skill} skill - 사용할 스킬
     */
    async execute(unit, skill) {
        switch (skill.type) {
            case 'wait':
                return this.executeWait(unit);
            case 'heal':
                return this.executeHeal(unit, skill);
            case 'defend':
                return this.executeDefend(unit, skill);
            default:
                return this.executeAttack(unit, skill);
        }
    }

    // ==========================================
    // 공격 스킬 실행
    // ==========================================

    /**
     * 공격 스킬 실행
     * @param {Unit} attacker - 공격자
     * @param {Skill} skill - 공격 스킬
     */
    async executeAttack(attacker, skill) {
        const target = this.battleManager.selectTarget(attacker);
        if (!target) {
            this.log(`${attacker.name}: 대상 없음`, 'info');
            return { success: false, reason: 'no_target' };
        }

        // 1. AP 소모
        attacker.consumeAp(skill.apCost);
        attacker.showFloatingAp(this.scene, skill.apCost, false);

        // 2. 키워드 효과 수집
        const keywordEffects = this.collectKeywordEffects(skill);

        // 3. 데미지 계산
        const damageResult = this.calculateDamage(attacker, target, skill, keywordEffects);

        // 4. 로그 출력
        this.log(`${attacker.name}이(가) ${skill.toString()} 사용! (AP ${skill.apCost} 소모)`, 'skill');

        // 5. 배너 표시
        this.bannerUI.showActionBanner(skill.name, skill.apCost);

        // 6. 카메라 연출
        await this.presentation.cameraFocusOnCombat(attacker, target, skill.apCost);

        // 7. 공격 시퀀스 실행
        const combatResult = await this.performAttackSequence(
            attacker, target, skill, damageResult, keywordEffects
        );

        // 8. 카메라 복귀
        await this.presentation.cameraReset();

        // 9. 결과 로그
        this.logAttackResult(target, combatResult);

        return combatResult;
    }

    /**
     * 키워드 효과 수집
     * @param {Skill} skill - 스킬
     * @returns {Object} 키워드 효과 모음
     */
    collectKeywordEffects(skill) {
        const effects = {
            hits: 1,
            ignoreDefense: false,
            penetration: false,
            lifesteal: 0,
            splash: false,
            // 향후 추가될 키워드 효과들...
        };

        skill.keywords.forEach(keywordId => {
            const keyword = getKeyword(keywordId);
            if (keyword) {
                if (keyword.hits) effects.hits = keyword.hits;
                if (keyword.ignoreDefense) effects.ignoreDefense = true;
                if (keyword.penetration) effects.penetration = true;
                if (keyword.lifesteal) effects.lifesteal = keyword.lifesteal;
                if (keyword.splash) effects.splash = true;
            }
        });

        return effects;
    }

    /**
     * 데미지 계산
     * @param {Unit} attacker - 공격자
     * @param {Unit} target - 피격자
     * @param {Skill} skill - 스킬
     * @param {Object} keywordEffects - 키워드 효과
     * @returns {Object} 데미지 계산 결과
     */
    calculateDamage(attacker, target, skill, keywordEffects) {
        let damage = skill.power;
        const isCritical = Math.random() < 0.15; // 15% 크리티컬

        // 크리티컬 보정
        if (isCritical) {
            damage = Math.floor(damage * 1.5);
        }

        // 향후 확장: 스탯 기반 데미지 계산
        // damage = Math.floor(damage * (attacker.attack / target.defense));

        return {
            baseDamage: skill.power,
            finalDamage: damage,
            hits: keywordEffects.hits,
            isCritical,
            ignoreDefense: keywordEffects.ignoreDefense
        };
    }

    /**
     * 공격 시퀀스 실행 (애니메이션 + 데미지 적용)
     */
    async performAttackSequence(attacker, target, skill, damageResult, keywordEffects) {
        let totalDamage = 0;
        let targetDied = false;
        let wasDefending = false;

        const particleEffects = this.battleManager.particleEffects;

        await attacker.performAttack(target, skill, this.scene, () => {
            try {
                // 패시브 발동 체크
                const passiveContext = {
                    attacker, target, skill,
                    damage: damageResult.finalDamage,
                    damageMultiplier: 1,
                    dodged: false
                };

                // 피격자 패시브 체크
                const passiveResult = target.tryActivatePassive('onBeingHit', passiveContext);
                if (passiveResult) {
                    target.showPassiveActivation(this.scene, passiveResult.passive);
                    this.bannerUI.showPassiveBanner(passiveResult.passive.displayName, !target.isEnemy);
                    this.log(`${target.name}: ${passiveResult.passive.displayName} 발동!`, 'skill');

                    if (passiveContext.dodged) {
                        this.presentation.showDamageNumber(target, 0, false, 'MISS');
                        return;
                    }
                }

                // 데미지 적용
                const finalDamage = Math.floor(damageResult.finalDamage * passiveContext.damageMultiplier);

                for (let i = 0; i < damageResult.hits; i++) {
                    const result = target.takeDamage(Math.floor(finalDamage / damageResult.hits), this.scene);
                    totalDamage += result.damage;
                    if (result.isDead) targetDied = true;
                    if (result.wasDefending) wasDefending = true;
                }

                // 히트스탑 + 데미지 표시
                this.presentation.playHitStop(skill.apCost, damageResult.isCritical);
                this.presentation.showDamageNumber(target, totalDamage, damageResult.isCritical);

                // 크리티컬 파티클
                if (damageResult.isCritical && particleEffects) {
                    particleEffects.playCriticalHitEffect(target.sprite.x, target.sprite.y);
                }

                // 피격 후 패시브 (반격 등)
                if (target.isAlive && !passiveContext.dodged) {
                    const afterHitResult = target.tryActivatePassive('onAfterHit', passiveContext);
                    if (afterHitResult && afterHitResult.result.type === 'counterAttack') {
                        target.showPassiveActivation(this.scene, afterHitResult.passive);
                        this.bannerUI.showPassiveBanner(afterHitResult.passive.displayName, !target.isEnemy);
                        this.log(`${target.name}: ${afterHitResult.passive.displayName}!`, 'skill');

                        const counterDamage = afterHitResult.result.damage;
                        attacker.takeDamage(counterDamage, this.scene);
                        attacker.showFloatingDamage(this.scene, counterDamage);
                        this.log(`→ ${attacker.name}에게 ${counterDamage} 반격 데미지!`, 'damage');
                    }
                }
            } catch (error) {
                console.error('[SkillExecutor] Error in attack sequence:', error);
                if (this.scene && this.scene.time) {
                    this.scene.time.timeScale = 1;
                }
            } finally {
                // 예외 발생 시에도 사망 상태 확인 (isAlive 직접 체크)
                if (!target.isAlive) {
                    targetDied = true;
                }
            }
        }, particleEffects);

        return { totalDamage, targetDied, wasDefending, isCritical: damageResult.isCritical };
    }

    /**
     * 공격 결과 로그
     */
    logAttackResult(target, result) {
        const critText = result.isCritical ? ' [크리티컬!]' : '';
        const defText = result.wasDefending ? ' (방어 관통)' : '';
        this.log(`→ ${target.name}에게 ${result.totalDamage} 데미지!${critText}${defText}`, 'damage');

        // targetDied 플래그와 isAlive 직접 확인 모두 체크 (예외 발생 시에도 사망 처리 보장)
        const isDead = result.targetDied || !target.isAlive;

        if (isDead) {
            this.log(`${target.name}이(가) 쓰러졌다!`, 'system');
            this.presentation.playDeathAnimation(target);

            // 전장 UI 숨기기 (반딧불은 잔류 모드로)
            if (target.sprite && target.sprite.statusBar) {
                target.sprite.statusBar.hide();
            }

            const particleEffects = this.battleManager.particleEffects;
            if (particleEffects && target.sprite) {
                const remainingEnemies = target.isEnemy
                    ? this.battleManager.getAliveEnemies()
                    : this.battleManager.getAliveAllies();

                if (remainingEnemies.length === 0) {
                    particleEffects.playKOEffect(target.sprite.x, target.sprite.y);
                } else {
                    particleEffects.playDeathEffect(target.sprite.x, target.sprite.y, target.isEnemy);
                }
            }
        }
    }

    // ==========================================
    // 치유 스킬 실행
    // ==========================================

    async executeHeal(healer, skill) {
        const target = this.battleManager.selectHealTarget(healer);
        if (!target) {
            this.log(`${healer.name}: 치유 대상 없음`, 'info');
            return { success: false, reason: 'no_target' };
        }

        healer.consumeAp(skill.apCost);
        healer.showFloatingAp(this.scene, skill.apCost, false);

        this.bannerUI.showActionBanner(skill.name, skill.apCost);

        const healAmount = Math.abs(skill.power);
        const actualHeal = target.heal(healAmount);

        this.log(`${healer.name}이(가) ${skill.toString()} 스킬 사용 (AP ${skill.apCost} 소모)`, 'heal');

        await healer.performHeal(target, actualHeal, this.scene, this.battleManager.particleEffects);

        this.log(`→ ${target.name} HP ${actualHeal} 회복!`, 'heal');

        return { success: true, healAmount: actualHeal };
    }

    // ==========================================
    // 방어 스킬 실행
    // ==========================================

    async executeDefend(unit, skill) {
        unit.consumeAp(skill.apCost);
        unit.showFloatingAp(this.scene, skill.apCost, false);

        this.bannerUI.showActionBanner(skill.name, skill.apCost);

        unit.defend();

        this.log(`${unit.name}이(가) ${skill.toString()} (AP ${skill.apCost} 소모) - 방어 태세`, 'info');

        await unit.performDefend(this.scene, this.battleManager.particleEffects);

        return { success: true };
    }

    // ==========================================
    // 휴식 (AP 회복)
    // ==========================================

    async executeWait(unit) {
        const beforeAp = unit.currentAp;
        const recovered = unit.recoverAp();

        this.bannerUI.showActionBanner('휴식', 0);

        this.log(`${unit.name}이(가) 휴식 (AP ${beforeAp} → ${unit.currentAp})`, 'info');

        await unit.performRest(this.scene, recovered, this.battleManager.particleEffects);

        return { success: true, recovered };
    }

    // ==========================================
    // 유틸리티
    // ==========================================

    log(message, type = 'info') {
        this.battleManager.log(message, type);
    }
}
