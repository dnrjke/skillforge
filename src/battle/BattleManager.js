// 키워드 기반 전투 시스템 - 전투 매니저
// 턴 시스템, 행동 결정, 타겟팅, 전투 진행 관리
// Phase 4: 비동기 공격 시퀀스 및 시각적 연출
// Phase 4.5: 파티클 효과 연동

import Unit from './Unit.js';
import { SkillSets } from '../data/Skills.js';
import { getKeyword } from '../data/Keywords.js';
import ParticleEffects from '../effects/ParticleEffects.js';

export default class BattleManager {
    constructor(scene) {
        this.scene = scene;
        this.allies = [];       // Unit 배열
        this.enemies = [];      // Unit 배열
        this.turnQueue = [];    // 행동 순서 대기열
        this.currentTurn = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.battleLog = [];

        // 전투 설정
        this.turnDelay = 1500;  // 턴 간 딜레이 (ms)
        this.autoMode = false;  // 자동 전투 모드

        // 행동 게이지 시스템
        this.actionTickRate = 100;  // 틱 간격 (ms)
        this.actionTickTimer = null;
        this.isProcessingAction = false;  // 행동 처리 중 여부

        // Phase 4.5: 파티클 효과 시스템
        this.particleEffects = new ParticleEffects(scene);

        // Phase 4.75: 카메라/연출 설정
        this.originalZoom = 1;
        this.skillBanner = null;
    }

    // 유닛 초기화 (스프라이트와 연결)
    initializeUnits(allySprites, enemySprites) {
        // 아군 유닛 생성 (Max AP = 8, 가장 무거운 스킬 기준)
        const MAX_AP = 8;
        const allyConfigs = [
            { name: '아군1', skillSet: 'WARRIOR', speed: 12, maxAp: MAX_AP },
            { name: '아군2', skillSet: 'MAGE', speed: 10, maxAp: MAX_AP },
            { name: '아군3', skillSet: 'ROGUE', speed: 15, maxAp: MAX_AP }
        ];

        allySprites.forEach((sprite, index) => {
            const config = allyConfigs[index] || allyConfigs[0];
            const unit = new Unit({
                id: `ally_${index}`,
                name: config.name,
                isEnemy: false,
                speed: config.speed,
                maxAp: config.maxAp,
                currentAp: config.maxAp,  // 최대 AP로 시작
                skillSet: config.skillSet
            });
            unit.linkSprite(sprite);
            this.allies.push(unit);
        });

        // 적군 유닛 생성 (Max AP = 8, 가장 무거운 스킬 기준)
        const enemyConfigs = [
            { name: '적군1', skillSet: 'WARRIOR', speed: 11, maxAp: MAX_AP },
            { name: '적군2', skillSet: 'MAGE', speed: 9, maxAp: MAX_AP },
            { name: '적군3', skillSet: 'ROGUE', speed: 14, maxAp: MAX_AP }
        ];

        enemySprites.forEach((sprite, index) => {
            const config = enemyConfigs[index] || enemyConfigs[0];
            const unit = new Unit({
                id: `enemy_${index}`,
                name: config.name,
                isEnemy: true,
                speed: config.speed,
                maxAp: config.maxAp,
                currentAp: config.maxAp,  // 최대 AP로 시작
                skillSet: config.skillSet
            });
            unit.linkSprite(sprite);
            this.enemies.push(unit);
        });

        // 초기 턴 대기열 생성
        this.buildTurnQueue();

        // 행동 게이지는 0부터 시작 (따로 초기화 불필요)
    }

    // Speed 기준으로 턴 대기열 생성
    buildTurnQueue() {
        const allUnits = [...this.allies, ...this.enemies].filter(u => u.isAlive);
        // Speed가 높은 순서대로 정렬
        this.turnQueue = allUnits.sort((a, b) => b.speed - a.speed);
    }

    // 살아있는 유닛 목록
    getAliveAllies() {
        return this.allies.filter(u => u.isAlive);
    }

    getAliveEnemies() {
        return this.enemies.filter(u => u.isAlive);
    }

    getAllAliveUnits() {
        return [...this.getAliveAllies(), ...this.getAliveEnemies()];
    }

    // 타겟 선택 (랜덤)
    selectTarget(attacker) {
        const targets = attacker.isEnemy ? this.getAliveAllies() : this.getAliveEnemies();
        if (targets.length === 0) return null;
        return targets[Math.floor(Math.random() * targets.length)];
    }

    // 치유 대상 선택 (가장 HP가 낮은 아군)
    selectHealTarget(healer) {
        const allies = healer.isEnemy ? this.getAliveEnemies() : this.getAliveAllies();
        if (allies.length === 0) return null;

        // HP 비율이 가장 낮은 대상
        return allies.reduce((lowest, unit) => {
            const lowestRatio = lowest.currentHp / lowest.maxHp;
            const unitRatio = unit.currentHp / unit.maxHp;
            return unitRatio < lowestRatio ? unit : lowest;
        });
    }

    // 전투 시작
    startBattle() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.currentTurn = 0;
        this.isProcessingAction = false;

        this.log('═══════════════════════════════════', 'system');
        this.log('전투 시작!', 'system');
        this.log('═══════════════════════════════════', 'system');

        // 유닛들은 이미 최대 AP로 시작 (초기화 시 설정됨)
        // 행동 게이지 틱 시작
        this.startActionTick();
    }

    // 행동 게이지 틱 시작
    startActionTick() {
        if (this.actionTickTimer) {
            this.actionTickTimer.remove();
        }

        this.actionTickTimer = this.scene.time.addEvent({
            delay: this.actionTickRate,
            callback: this.onActionTick,
            callbackScope: this,
            loop: true
        });
    }

    // 행동 게이지 틱 정지
    stopActionTick() {
        if (this.actionTickTimer) {
            this.actionTickTimer.remove();
            this.actionTickTimer = null;
        }
    }

    // 매 틱마다 호출 - 행동 게이지 증가 및 100% 도달 체크
    onActionTick() {
        if (!this.isRunning || this.isPaused || this.isProcessingAction) return;

        // 전투 종료 체크
        if (this.checkBattleEnd()) {
            this.stopActionTick();
            return;
        }

        const allUnits = this.getAllAliveUnits();
        if (allUnits.length === 0) return;

        // 배속에 따라 증가량 조절
        const speedMultiplier = this.scene.battleControlUI ?
            this.scene.battleControlUI.getSpeedMultiplier() : 1;

        // 각 유닛의 행동 게이지 증가 (속도에 비례)
        let readyUnit = null;

        for (const unit of allUnits) {
            if (!unit.sprite || !unit.sprite.statusBar) continue;

            const statusBar = unit.sprite.statusBar;
            // 속도에 비례하여 증가 (speed * 0.5 * speedMultiplier per tick)
            const increase = unit.speed * 0.5 * speedMultiplier;
            statusBar.currentAction = Math.min(100, statusBar.currentAction + increase);
            statusBar.setAction(statusBar.currentAction, false);

            // 100% 도달한 첫 번째 유닛 찾기
            if (!readyUnit && statusBar.currentAction >= 100) {
                readyUnit = unit;
            }
        }

        // 행동 준비된 유닛이 있으면 즉시 행동 실행
        if (readyUnit) {
            this.isProcessingAction = true;
            this.executeAction(readyUnit);
        }
    }

    // 다음 턴 실행
    runNextTurn() {
        if (!this.isRunning || this.isPaused) return;

        // 전투 종료 체크
        if (this.checkBattleEnd()) return;

        // 턴 대기열 재구성
        this.buildTurnQueue();

        if (this.turnQueue.length === 0) {
            this.endBattle('무승부');
            return;
        }

        // 현재 행동 유닛
        const currentUnit = this.turnQueue[this.currentTurn % this.turnQueue.length];
        this.currentTurn++;

        if (!currentUnit || !currentUnit.isAlive) {
            // 다음 턴으로
            this.scene.time.delayedCall(100, () => this.runNextTurn());
            return;
        }

        // 행동 실행
        this.executeAction(currentUnit);
    }

    // 행동 실행 (비동기)
    async executeAction(unit) {
        const skill = unit.selectSkill();
        this.currentTurn++;

        // 현재 행동 유닛 표시 - 스포트라이트 효과
        this.showSpotlight(unit);

        this.scene.logWindow.startBatch();

        if (skill.type === 'wait' || skill.id === 'WAIT') {
            // 대기: AP 부족으로 휴식하여 AP 회복
            await this.executeRest(unit);
        } else if (skill.type === 'heal') {
            // 치유
            await this.executeHeal(unit, skill);
        } else if (skill.type === 'defend') {
            // 방어
            await this.executeDefend(unit, skill);
        } else {
            // 공격
            await this.executeAttack(unit, skill);
        }

        this.scene.logWindow.endBatch();

        // 행동 후 처리 - 연출이 끝난 후 즉시 게이지 리셋
        this.finishAction(unit);
    }

    // 행동 완료 처리
    finishAction(unit) {
        try {
            // 스포트라이트 해제
            this.hideSpotlight(unit);

            // 행동 게이지 리셋
            if (unit.sprite && unit.sprite.statusBar) {
                unit.sprite.statusBar.resetAction();
            }

            // PP 회복 (매 턴 종료 시 1 PP 회복, 최대치 이하일 때만)
            if (unit.currentPp < unit.maxPp) {
                const recovered = unit.recoverPp(1);
                if (recovered > 0) {
                    unit.showFloatingPp(this.scene, recovered);  // PP 회복 표시
                }
            }
        } catch (error) {
            console.error('[Battle] Error in finishAction:', error);
        } finally {
            // 안전장치: timeScale 복구
            if (this.scene && this.scene.time && this.scene.time.timeScale !== 1) {
                this.scene.time.timeScale = 1;
            }
            // 행동 처리 완료 - 틱 재개 (항상 실행)
            this.isProcessingAction = false;
        }
    }

    // 스포트라이트 효과 표시
    showSpotlight(unit) {
        if (!unit.sprite) return;

        // 기존 스포트라이트 제거
        if (unit.sprite.spotlight) {
            unit.sprite.spotlight.destroy();
        }

        // 연한 원형 스포트라이트 생성 (캐릭터 발 밑)
        const spotlight = this.scene.add.ellipse(
            unit.sprite.x,
            unit.sprite.y + 80,  // 발 밑으로 더 아래
            140, 50,             // 좀 더 넓고 납작하게
            0xffff88,            // 연한 노란색
            0.35                 // 투명도
        );
        spotlight.setDepth(unit.sprite.depth - 0.5);

        // 펄스 애니메이션
        this.scene.tweens.add({
            targets: spotlight,
            scaleX: 1.1,
            scaleY: 1.1,
            alpha: 0.6,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        unit.sprite.spotlight = spotlight;
    }

    // 스포트라이트 효과 해제
    hideSpotlight(unit) {
        if (unit.sprite && unit.sprite.spotlight) {
            this.scene.tweens.add({
                targets: unit.sprite.spotlight,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    if (unit.sprite.spotlight) {
                        unit.sprite.spotlight.destroy();
                        unit.sprite.spotlight = null;
                    }
                }
            });
        }
    }

    // 휴식 실행 (AP 부족 시)
    async executeRest(unit) {
        const beforeAp = unit.currentAp;
        const recovered = unit.recoverAp();

        this.log(`${unit.name}이(가) 휴식 (AP ${beforeAp} → ${unit.currentAp})`, 'info');

        // 휴식 연출 (기력 부족 텍스트 + 회복 이펙트 + 파티클)
        await unit.performRest(this.scene, recovered, this.particleEffects);
    }

    // 공격 실행 (비동기 시퀀스) - Phase 4.75: 카메라/히트스탑 연출
    async executeAttack(attacker, skill) {
        const target = this.selectTarget(attacker);
        if (!target) {
            this.log(`${attacker.name}: 대상 없음`, 'info');
            return;
        }

        // AP 소모 연출
        const apCost = skill.apCost;
        attacker.consumeAp(apCost);
        attacker.showFloatingAp(this.scene, apCost, false);

        // 데미지 계산 준비
        let damage = skill.power;
        let hits = 1;
        let ignoreDefense = false;
        let isCritical = Math.random() < 0.15; // 15% 크리티컬 확률

        // 키워드 특수 효과 확인
        skill.keywords.forEach(keywordId => {
            const keyword = getKeyword(keywordId);
            if (keyword) {
                if (keyword.hits) hits = keyword.hits;
                if (keyword.ignoreDefense) ignoreDefense = true;
            }
        });

        // 크리티컬 시 데미지 1.5배
        if (isCritical) {
            damage = Math.floor(damage * 1.5);
        }

        // 로그 출력 (공격 시작)
        this.log(
            `${attacker.name}이(가) ${skill.toString()} 사용! (AP ${apCost} 소모)`,
            'skill'
        );

        // Phase 4.75: 스킬 배너 표시 (공격 타입)
        this.showSkillBanner(skill.name, 'attack');

        // Phase 4.75: 강력한 공격 시 카메라 줌인 (AP 5 이상)
        if (apCost >= 5) {
            await this.cameraFocusOnCombat(attacker, target);
        }

        // 비동기 공격 시퀀스 실행 (파티클 효과 포함)
        let totalDamage = 0;
        let targetDied = false;
        let wasDefending = false;

        await attacker.performAttack(target, skill, this.scene, () => {
            try {
                // 패시브 발동 컨텍스트
                const passiveContext = {
                    attacker: attacker,
                    target: target,
                    skill: skill,
                    damage: damage,
                    damageMultiplier: 1,
                    dodged: false
                };

                // 피격자의 onBeingHit 패시브 체크
                const passiveResult = target.tryActivatePassive('onBeingHit', passiveContext);
                if (passiveResult) {
                    target.showPassiveActivation(this.scene, passiveResult.passive);
                    this.log(`${target.name}: ${passiveResult.passive.displayName} 발동!`, 'skill');

                    if (passiveContext.dodged) {
                        // 완전 회피
                        this.showDamageNumber(target, 0, false, 'MISS');
                        return; // 데미지 없음
                    }
                }

                // 최종 데미지 계산
                const finalDamage = Math.floor(damage * passiveContext.damageMultiplier);

                // 타격 프레임에서 실행되는 데미지 콜백
                for (let i = 0; i < hits; i++) {
                    const result = target.takeDamage(Math.floor(finalDamage / hits), this.scene);
                    totalDamage += result.damage;
                    if (result.isDead) targetDied = true;
                    if (result.wasDefending) wasDefending = true;
                }

                // Phase 4.75: 히트 스탑 (50ms 멈춤)
                this.playHitStop(apCost, isCritical);

                // 플로팅 데미지 표시 (크리티컬 시 더 크게)
                this.showDamageNumber(target, totalDamage, isCritical);

                // 크리티컬 시 불꽃 파티클
                if (isCritical) {
                    this.particleEffects.playCriticalHitEffect(target.sprite.x, target.sprite.y);
                }

                // 피격 후 패시브 (반격 등)
                if (target.isAlive && !passiveContext.dodged) {
                    const afterHitResult = target.tryActivatePassive('onAfterHit', passiveContext);
                    if (afterHitResult && afterHitResult.result.type === 'counterAttack') {
                        target.showPassiveActivation(this.scene, afterHitResult.passive);
                        this.log(`${target.name}: ${afterHitResult.passive.displayName}!`, 'skill');
                        // 반격 데미지
                        const counterDamage = afterHitResult.result.damage;
                        attacker.takeDamage(counterDamage, this.scene);
                        attacker.showFloatingDamage(this.scene, counterDamage);
                        this.log(`→ ${attacker.name}에게 ${counterDamage} 반격 데미지!`, 'damage');
                    }
                }
            } catch (error) {
                console.error('[Battle] Error in damage callback:', error);
                // 에러 발생 시에도 timeScale 복구
                if (this.scene && this.scene.time) {
                    this.scene.time.timeScale = 1;
                }
            }
        }, this.particleEffects);

        // Phase 4.75: 카메라 복귀
        if (apCost >= 5) {
            await this.cameraReset();
        }

        // 데미지 로그
        const critText = isCritical ? ' [크리티컬!]' : '';
        const defText = wasDefending ? ' (방어 관통)' : '';
        this.log(
            `→ ${target.name}에게 ${totalDamage} 데미지!${critText}${defText}`,
            'damage'
        );

        // 사망 체크
        if (targetDied) {
            this.log(`${target.name}이(가) 쓰러졌다!`, 'system');
            this.playDeathAnimation(target);

            // 마지막 일격 효과 (적군이 전멸했을 때)
            const remainingEnemies = attacker.isEnemy ? this.getAliveAllies() : this.getAliveEnemies();
            if (remainingEnemies.length === 0) {
                this.particleEffects.playKOEffect(target.sprite.x, target.sprite.y);
            } else {
                this.particleEffects.playDeathEffect(target.sprite.x, target.sprite.y, target.isEnemy);
            }
        }
    }

    // Phase 4.75: 스킬 배너 표시 (스킬 타입별 색상/아이콘)
    showSkillBanner(skillName, skillType = 'attack', isPassive = false) {
        // 기존 배너 제거
        if (this.skillBanner) {
            this.skillBanner.destroy();
        }

        // 스킬 타입별 색상 설정
        const typeConfig = this.getSkillTypeConfig(skillType, isPassive);

        // 하단 중앙에 스킬 이름 배너
        const banner = this.scene.add.container(640, 580);
        banner.setDepth(3000);
        banner.setScrollFactor(0);  // 카메라 워킹 영향 안받음

        // 배경 바 (글로우 효과)
        const bgGlow = this.scene.add.rectangle(0, 0, 320, 60, typeConfig.glowColor, 0.3);
        bgGlow.setScrollFactor(0);

        const bg = this.scene.add.rectangle(0, 0, 300, 50, 0x000000, 0.85);
        bg.setStrokeStyle(2, typeConfig.borderColor);
        bg.setScrollFactor(0);

        // 아이콘 (스킬 타입 표시)
        const icon = this.scene.add.text(-130, 0, typeConfig.icon, {
            fontSize: '24px',
            fill: typeConfig.iconColor
        }).setOrigin(0.5).setScrollFactor(0);

        // 스킬 이름
        const text = this.scene.add.text(0, 0, skillName, {
            fontSize: '22px',
            fill: typeConfig.textColor,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0);

        // 좌우 장식
        const leftDeco = this.scene.add.text(-105, 0, '【', {
            fontSize: '26px',
            fill: typeConfig.borderColor,
            fontFamily: 'Arial'
        }).setOrigin(0.5).setScrollFactor(0);

        const rightDeco = this.scene.add.text(105, 0, '】', {
            fontSize: '26px',
            fill: typeConfig.borderColor,
            fontFamily: 'Arial'
        }).setOrigin(0.5).setScrollFactor(0);

        banner.add([bgGlow, bg, icon, leftDeco, text, rightDeco]);

        // 등장 애니메이션
        banner.setScale(0.5);
        banner.setAlpha(0);

        this.scene.tweens.add({
            targets: banner,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 150,
            ease: 'Back.easeOut'
        });

        // 0.8초 후 사라짐 - setTimeout 사용 (히트스탑 영향 안받음)
        setTimeout(() => {
            if (banner && banner.active) {
                this.scene.tweens.add({
                    targets: banner,
                    alpha: 0,
                    y: banner.y - 20,
                    duration: 200,
                    onComplete: () => {
                        if (banner && banner.active) {
                            banner.destroy();
                        }
                        if (this.skillBanner === banner) {
                            this.skillBanner = null;
                        }
                    }
                });
            }
        }, 800);

        this.skillBanner = banner;
    }

    // 스킬 타입별 색상/아이콘 설정
    getSkillTypeConfig(skillType, isPassive = false) {
        if (isPassive) {
            return {
                icon: '⚡',
                iconColor: '#66aaff',
                borderColor: '#4488ff',
                glowColor: 0x4488ff,
                textColor: '#aaccff'
            };
        }

        switch (skillType) {
            case 'attack':
                return {
                    icon: '⚔️',
                    iconColor: '#ffaa66',
                    borderColor: '#ff8844',
                    glowColor: 0xff6600,
                    textColor: '#ffffff'
                };
            case 'heal':
                return {
                    icon: '💚',
                    iconColor: '#66ff88',
                    borderColor: '#44cc66',
                    glowColor: 0x44ff66,
                    textColor: '#aaffaa'
                };
            case 'defend':
                return {
                    icon: '🛡️',
                    iconColor: '#66aaff',
                    borderColor: '#4488ff',
                    glowColor: 0x4488ff,
                    textColor: '#aaccff'
                };
            case 'wait':
                return {
                    icon: '💤',
                    iconColor: '#888888',
                    borderColor: '#666666',
                    glowColor: 0x444444,
                    textColor: '#aaaaaa'
                };
            default:
                return {
                    icon: '✦',
                    iconColor: '#cccccc',
                    borderColor: '#888888',
                    glowColor: 0x666666,
                    textColor: '#ffffff'
                };
        }
    }

    // 패시브 스킬 배너 표시
    showPassiveBanner(passiveName) {
        this.showSkillBanner(passiveName, 'passive', true);
    }

    // Phase 4.75: 카메라 포커스 (공격자와 피격자 중앙)
    async cameraFocusOnCombat(attacker, target) {
        return new Promise((resolve) => {
            const centerX = (attacker.sprite.x + target.sprite.x) / 2;
            const centerY = (attacker.sprite.y + target.sprite.y) / 2;

            this.originalZoom = this.scene.cameras.main.zoom;

            // 동시에 pan과 zoom
            this.scene.cameras.main.pan(centerX, centerY, 200, 'Power2');
            this.scene.cameras.main.zoomTo(1.3, 200, 'Power2', false, (camera, progress) => {
                if (progress === 1) resolve();
            });
        });
    }

    // Phase 4.75: 카메라 복귀
    async cameraReset() {
        return new Promise((resolve) => {
            this.scene.cameras.main.pan(640, 360, 300, 'Power2');
            this.scene.cameras.main.zoomTo(this.originalZoom, 300, 'Power2', false, (camera, progress) => {
                if (progress === 1) resolve();
            });
        });
    }

    // Phase 4.75: 히트 스탑 (타격 시 잠시 멈춤)
    playHitStop(apCost, isCritical = false) {
        // AP 소모량에 따른 히트스탑 강도
        const baseStopTime = 30;
        const stopTime = baseStopTime + (apCost * 5) + (isCritical ? 30 : 0);

        // 시간 스케일 멈춤
        const originalTimeScale = this.scene.time.timeScale;
        this.scene.time.timeScale = 0;

        // 화면 흔들림 (AP에 비례)
        const shakeIntensity = 0.005 + (apCost * 0.002) + (isCritical ? 0.01 : 0);
        this.scene.cameras.main.shake(100, shakeIntensity);

        // 히트스탑 후 복귀 (safety timeout 추가)
        setTimeout(() => {
            if (this.scene && this.scene.time) {
                this.scene.time.timeScale = originalTimeScale;
            }
        }, stopTime);

        // 안전장치: 최대 200ms 후 강제 복구
        setTimeout(() => {
            if (this.scene && this.scene.time && this.scene.time.timeScale === 0) {
                console.warn('[Battle] HitStop safety restore triggered');
                this.scene.time.timeScale = 1;
            }
        }, 200);
    }

    // Phase 4.75: 데미지 숫자 표시 (크리티컬 구분)
    showDamageNumber(target, damage, isCritical = false, customText = null) {
        if (!target.sprite) return;

        // MISS나 커스텀 텍스트 처리
        if (customText === 'MISS') {
            const missText = this.scene.add.text(
                target.sprite.x,
                target.sprite.y - 80,
                'MISS!',
                {
                    fontSize: '28px',
                    fill: '#aaaaaa',
                    fontFamily: 'Arial',
                    fontStyle: 'italic',
                    stroke: '#000000',
                    strokeThickness: 3
                }
            ).setOrigin(0.5).setDepth(2000);

            this.scene.tweens.add({
                targets: missText,
                y: missText.y - 40,
                alpha: 0,
                duration: 600,
                ease: 'Power2.easeOut',
                onComplete: () => missText.destroy()
            });
            return;
        }

        const fontSize = isCritical ? '42px' : '28px';
        const color = isCritical ? '#ffff00' : '#ff4444';
        const yOffset = -80;

        const text = this.scene.add.text(
            target.sprite.x,
            target.sprite.y + yOffset,
            `-${damage}`,
            {
                fontSize: fontSize,
                fill: color,
                fontFamily: 'Arial',
                fontStyle: 'bold',
                stroke: isCritical ? '#ff6600' : '#000000',
                strokeThickness: isCritical ? 6 : 4
            }
        ).setOrigin(0.5).setDepth(2000);

        // 크리티컬 시 추가 텍스트
        if (isCritical) {
            const critLabel = this.scene.add.text(
                target.sprite.x,
                target.sprite.y + yOffset - 35,
                'CRITICAL!',
                {
                    fontSize: '18px',
                    fill: '#ffcc00',
                    fontFamily: 'Arial',
                    fontStyle: 'bold',
                    stroke: '#ff6600',
                    strokeThickness: 3
                }
            ).setOrigin(0.5).setDepth(2000);

            this.scene.tweens.add({
                targets: critLabel,
                y: critLabel.y - 30,
                alpha: 0,
                scaleX: 1.3,
                scaleY: 1.3,
                duration: 800,
                ease: 'Power2.easeOut',
                onComplete: () => critLabel.destroy()
            });
        }

        // 위로 솟구치며 사라지는 연출
        this.scene.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            scaleX: isCritical ? 1.3 : 1.2,
            scaleY: isCritical ? 1.3 : 1.2,
            duration: 800,
            ease: 'Power2.easeOut',
            onComplete: () => text.destroy()
        });
    }

    // 치유 실행 (비동기)
    async executeHeal(healer, skill) {
        const target = this.selectHealTarget(healer);
        if (!target) {
            this.log(`${healer.name}: 치유 대상 없음`, 'info');
            return;
        }

        // AP 소모
        healer.consumeAp(skill.apCost);
        healer.showFloatingAp(this.scene, skill.apCost, false);

        // 스킬 배너 표시 (힐 타입)
        this.showSkillBanner(skill.name, 'heal');

        // 회복량 계산 (power가 음수이므로 절댓값)
        const healAmount = Math.abs(skill.power);
        const actualHeal = target.heal(healAmount);

        this.log(
            `${healer.name}이(가) ${skill.toString()} 스킬 사용 (AP ${skill.apCost} 소모)`,
            'heal'
        );

        // 치유 연출 (파티클 효과 포함)
        await healer.performHeal(target, actualHeal, this.scene, this.particleEffects);

        this.log(
            `→ ${target.name} HP ${actualHeal} 회복!`,
            'heal'
        );
    }

    // 방어 실행 (비동기)
    async executeDefend(unit, skill) {
        // AP 소모
        unit.consumeAp(skill.apCost);
        unit.showFloatingAp(this.scene, skill.apCost, false);

        // 스킬 배너 표시 (방어 타입)
        this.showSkillBanner(skill.name, 'defend');

        // 방어 태세
        unit.defend();

        this.log(
            `${unit.name}이(가) ${skill.toString()} (AP ${skill.apCost} 소모) - 방어 태세`,
            'info'
        );

        // 방어 연출 (파티클 효과 포함)
        await unit.performDefend(this.scene, this.particleEffects);
    }

    // 사망 애니메이션
    playDeathAnimation(unit) {
        if (!unit.sprite) return;
        unit.sprite.play('knight_death');
    }

    // 전투 종료 체크
    checkBattleEnd() {
        const aliveAllies = this.getAliveAllies();
        const aliveEnemies = this.getAliveEnemies();

        if (aliveEnemies.length === 0) {
            this.endBattle('승리');
            return true;
        }

        if (aliveAllies.length === 0) {
            this.endBattle('패배');
            return true;
        }

        return false;
    }

    // 전투 종료
    endBattle(result) {
        this.isRunning = false;
        this.stopActionTick();
        this.log('═══════════════════════════════════', 'system');
        this.log(`전투 종료: ${result}!`, 'system');
        this.log('═══════════════════════════════════', 'system');

        // UI 업데이트
        if (this.scene.battleControlUI) {
            this.scene.battleControlUI.onBattleEnd(result);
        }
    }

    // 일시 정지/재개
    togglePause() {
        this.isPaused = !this.isPaused;
        return this.isPaused;
    }

    // 수동 다음 턴 (M키용) - 틱 기반 시스템에서는 전투 시작만 처리
    manualNextTurn() {
        if (!this.isRunning) {
            this.startBattle();
        }
    }

    // 자동 전투 토글
    toggleAutoMode() {
        this.autoMode = !this.autoMode;
        this.log(`자동 전투 ${this.autoMode ? '활성화' : '비활성화'}`, 'system');
        return this.autoMode;
    }

    // 로그 출력
    log(message, type = 'info') {
        console.log(`[Battle] ${message}`);
        this.battleLog.push({ message, type, time: Date.now() });

        if (this.scene && this.scene.addLog) {
            this.scene.addLog(message, type);
        }
    }

    // Phase 2 테스트용: 랜덤 데미지 (HP 10, AP 5 감소)
    testRandomDamage() {
        const allUnits = this.getAllAliveUnits();
        if (allUnits.length === 0) {
            this.log('모든 캐릭터가 쓰러졌습니다!', 'system');
            return;
        }

        const target = allUnits[Math.floor(Math.random() * allUnits.length)];
        const damage = 10;
        const apCost = 5;

        this.scene.logWindow.startBatch();

        // HP 감소
        const result = target.takeDamage(damage);
        target.showFloatingDamage(this.scene, damage);

        // 파티클 효과
        this.particleEffects.playAttackHitEffect(target.sprite.x, target.sprite.y, 3);

        this.log(`테스트: ${target.name}이(가) ${damage} 피해! (HP: ${result.remainingHp})`, 'damage');

        // AP 감소
        target.consumeAp(apCost);
        target.showFloatingAp(this.scene, apCost, false);
        this.log(`테스트: ${target.name} AP ${apCost} 감소 (AP: ${target.currentAp})`, 'info');

        // 피격 애니메이션
        if (target.isAlive) {
            const originalTint = target.isEnemy ? 0xff8888 : 0xffffff;
            target.sprite.setTint(0xff0000);
            this.scene.time.delayedCall(100, () => {
                if (target.sprite && target.sprite.active) {
                    target.sprite.setTint(originalTint);
                }
            });

            target.sprite.play('knight_hit');
            target.sprite.once('animationcomplete', () => {
                if (target.isAlive) {
                    target.sprite.play('knight_idle');
                }
            });
        }

        if (result.isDead) {
            this.log(`${target.name}이(가) 쓰러졌다!`, 'system');
            this.playDeathAnimation(target);
            this.particleEffects.playDeathEffect(target.sprite.x, target.sprite.y, target.isEnemy);
        }

        this.scene.logWindow.endBatch();
    }
}
