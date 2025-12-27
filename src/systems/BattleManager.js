// 키워드 기반 전투 시스템 - 전투 매니저
// 턴 시스템, 행동 결정, 타겟팅, 전투 진행 관리
// Phase 4: 비동기 공격 시퀀스 및 시각적 연출
// Phase 4.5: 파티클 효과 연동

import Unit from '../entities/Unit.js';
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

        // 카메라/연출 설정
        this.originalZoom = 1;
        this.skillBanner = null;
        this.passiveBanners = [];  // 패시브 사이드 배너 배열
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

        // 행동 배너 표시 (대기 - AP 0)
        this.showActionBanner('휴식', 0);

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

        // 행동 배너 표시 (AP 소모량 알갱이)
        this.showActionBanner(skill.name, apCost);

        // 카메라 줌인 (모든 공격에 적용, AP에 따라 강도 조절)
        await this.cameraFocusOnCombat(attacker, target, apCost);

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
                    // 패시브 사이드 배너 표시 (적군이면 오른쪽, 아군이면 왼쪽)
                    this.showPassiveBanner(passiveResult.passive.displayName, !target.isEnemy);
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
                        // 패시브 사이드 배너 표시
                        this.showPassiveBanner(afterHitResult.passive.displayName, !target.isEnemy);
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

        // 카메라 복귀 (모든 공격 후)
        await this.cameraReset();

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

    // 행동 배너 표시 (HTML - 중앙 하단, 카메라 영향 없음)
    showActionBanner(actionName, apCost = 0) {
        // 기존 배너 제거
        if (this.skillBannerElement) {
            this.skillBannerElement.remove();
            this.skillBannerElement = null;
        }

        // 모바일 감지
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         window.innerWidth <= 768;

        // HTML 배너 생성
        const banner = document.createElement('div');
        banner.className = 'action-banner';

        // AP 알갱이 HTML 생성 (스킬명 위에)
        let apDotsHTML = '';
        if (apCost > 0) {
            const leftGroupCount = Math.min(5, apCost);
            const rightGroupCount = Math.max(0, Math.min(5, apCost - 5));

            let leftDots = '';
            for (let i = 0; i < leftGroupCount; i++) {
                leftDots += '<span class="ap-dot"></span>';
            }

            let rightDots = '';
            for (let i = 0; i < rightGroupCount; i++) {
                rightDots += '<span class="ap-dot"></span>';
            }

            apDotsHTML = `
                <div class="ap-dots">
                    <div class="ap-group">${leftDots}</div>
                    ${rightGroupCount > 0 ? `<div class="ap-group">${rightDots}</div>` : ''}
                </div>
            `;
        }

        banner.innerHTML = `
            ${apDotsHTML}
            <div class="banner-content">
                <span class="banner-deco left">【</span>
                <span class="banner-text">${actionName}</span>
                <span class="banner-deco right">】</span>
            </div>
        `;

        // 스타일 추가 (한 번만)
        if (!document.getElementById('action-banner-style')) {
            const style = document.createElement('style');
            style.id = 'action-banner-style';
            style.textContent = `
                .action-banner {
                    position: absolute;
                    bottom: 20%;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 200;
                    pointer-events: none;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                    animation: bannerFadeIn 0.15s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }

                .ap-dots {
                    display: flex;
                    gap: 24px;
                    align-items: center;
                }

                .ap-group {
                    display: flex;
                    gap: 12px;
                }

                .ap-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #ffcc66;
                    border: 1px solid #ffaa44;
                    box-shadow: 0 0 4px rgba(255, 204, 102, 0.5);
                }

                .banner-content {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px 40px;
                    background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(0,0,0,0.85));
                    border: 2px solid #ffaa44;
                    border-radius: 8px;
                    box-shadow: 0 0 20px rgba(255, 170, 68, 0.25), inset 0 0 20px rgba(255, 170, 68, 0.15);
                    min-width: 280px;
                }

                .banner-text {
                    font-family: Arial, sans-serif;
                    font-size: 22px;
                    font-weight: bold;
                    color: #ffffff;
                    text-shadow:
                        -1px -1px 0 #000,
                        1px -1px 0 #000,
                        -1px 1px 0 #000,
                        1px 1px 0 #000,
                        0 0 8px rgba(255, 255, 255, 0.3);
                    letter-spacing: 1px;
                }

                .banner-deco {
                    font-size: 26px;
                    color: #ffaa44;
                    font-family: Arial, sans-serif;
                    margin: 0 12px;
                    text-shadow: 0 0 8px rgba(255, 170, 68, 0.6);
                }

                @keyframes bannerFadeIn {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) scale(0.5);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) scale(1);
                    }
                }

                @keyframes bannerFadeOut {
                    to {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px);
                    }
                }

                @media (max-width: 768px) {
                    .banner-content {
                        padding: 10px 30px;
                        min-width: 220px;
                    }
                    .banner-text {
                        font-size: 18px;
                    }
                    .banner-deco {
                        font-size: 22px;
                        margin: 0 8px;
                    }
                    .ap-dot {
                        width: 7px;
                        height: 7px;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(banner);
        this.skillBannerElement = banner;

        // 0.8초 후 사라짐
        setTimeout(() => {
            if (banner && banner.parentNode) {
                banner.style.animation = 'bannerFadeOut 0.2s forwards';
                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.remove();
                    }
                    if (this.skillBannerElement === banner) {
                        this.skillBannerElement = null;
                    }
                }, 200);
            }
        }, 800);
    }

    // 패시브 스킬 사이드 배너 표시 (HTML - 하늘색 기조, 양측 표시, 카메라 영향 없음)
    showPassiveBanner(passiveName, isLeftSide = true) {
        // 패시브 배너 배열 초기화
        if (!this.passiveBannersHTML) {
            this.passiveBannersHTML = [];
        }

        // 현재 같은 쪽에 있는 배너 수 계산 (스택용)
        const sameSideBanners = this.passiveBannersHTML.filter(b => b.isLeft === isLeftSide);
        const stackOffset = sameSideBanners.length * 50;

        // HTML 배너 생성
        const banner = document.createElement('div');
        banner.className = `passive-banner ${isLeftSide ? 'left' : 'right'}`;
        banner.style.top = `${70 - (stackOffset / 720 * 100)}%`; // 70%에서 위로 스택

        banner.innerHTML = `
            <div class="passive-icon">${isLeftSide ? '⚡' : '⚡'}</div>
            <div class="passive-text">${passiveName}</div>
        `;

        // 스타일 추가 (한 번만)
        if (!document.getElementById('passive-banner-style')) {
            const style = document.createElement('style');
            style.id = 'passive-banner-style';
            style.textContent = `
                .passive-banner {
                    position: absolute;
                    z-index: 200;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(0,0,0,0.85));
                    border: 2px solid #66aaff;
                    border-radius: 6px;
                    box-shadow: 0 0 15px rgba(68, 136, 255, 0.3), inset 0 0 15px rgba(102, 170, 255, 0.15);
                    min-width: 200px;
                }

                .passive-banner.left {
                    left: 14%;
                    animation: passiveSlideInLeft 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .passive-banner.right {
                    right: 14%;
                    animation: passiveSlideInRight 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .passive-banner.fade-out-left {
                    animation: passiveSlideOutLeft 0.25s forwards;
                }

                .passive-banner.fade-out-right {
                    animation: passiveSlideOutRight 0.25s forwards;
                }

                .passive-icon {
                    font-size: 18px;
                    color: #88ccff;
                    text-shadow: 0 0 8px rgba(136, 204, 255, 0.6);
                }

                .passive-text {
                    font-family: Arial, sans-serif;
                    font-size: 16px;
                    font-weight: bold;
                    color: #aaccff;
                    text-shadow:
                        -1px -1px 0 #000,
                        1px -1px 0 #000,
                        -1px 1px 0 #000,
                        1px 1px 0 #000;
                    letter-spacing: 0.5px;
                }

                @keyframes passiveSlideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-150px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes passiveSlideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(150px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes passiveSlideOutLeft {
                    to {
                        opacity: 0;
                        transform: translateX(-100px);
                    }
                }

                @keyframes passiveSlideOutRight {
                    to {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                }

                @media (max-width: 768px) {
                    .passive-banner {
                        padding: 8px 16px;
                        min-width: 160px;
                    }
                    .passive-banner.left {
                        left: 5%;
                    }
                    .passive-banner.right {
                        right: 5%;
                    }
                    .passive-icon {
                        font-size: 16px;
                    }
                    .passive-text {
                        font-size: 14px;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(banner);

        const bannerData = { element: banner, isLeft: isLeftSide };
        this.passiveBannersHTML.push(bannerData);

        // 1초 후 사라짐
        setTimeout(() => {
            if (banner && banner.parentNode) {
                banner.classList.add(isLeftSide ? 'fade-out-left' : 'fade-out-right');
                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.remove();
                    }
                    // 배열에서 제거
                    const idx = this.passiveBannersHTML.indexOf(bannerData);
                    if (idx > -1) {
                        this.passiveBannersHTML.splice(idx, 1);
                    }
                }, 250);
            }
        }, 1000);

        return banner;
    }

    // 카메라 포커스 (공격자와 피격자 중앙) - AP에 따른 강도 조절
    async cameraFocusOnCombat(attacker, target, apCost = 3) {
        return new Promise((resolve) => {
            if (!attacker.sprite || !target.sprite) {
                resolve();
                return;
            }

            const centerX = (attacker.sprite.x + target.sprite.x) / 2;
            const centerY = (attacker.sprite.y + target.sprite.y) / 2;

            // 현재 줌 저장 (안전하게)
            this.originalZoom = this.scene.cameras.main.zoom || 1;

            // AP에 따른 줌 강도 (1-3 AP: 1.1x, 4-5 AP: 1.2x, 6+ AP: 1.3x)
            const zoomLevel = apCost >= 6 ? 1.3 : (apCost >= 4 ? 1.2 : 1.1);
            const duration = apCost >= 5 ? 200 : 150;

            // 동시에 pan과 zoom
            this.scene.cameras.main.pan(centerX, centerY, duration, 'Power2');
            this.scene.cameras.main.zoomTo(zoomLevel, duration, 'Power2', false, (camera, progress) => {
                if (progress === 1) resolve();
            });
        });
    }

    // 카메라 복귀
    async cameraReset() {
        return new Promise((resolve) => {
            const targetZoom = this.originalZoom || 1;
            this.scene.cameras.main.pan(640, 360, 250, 'Power2');
            this.scene.cameras.main.zoomTo(targetZoom, 250, 'Power2', false, (camera, progress) => {
                if (progress === 1) {
                    // 상태 정리
                    this.originalZoom = 1;
                    resolve();
                }
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

        // 행동 배너 표시 (AP 소모량 알갱이)
        this.showActionBanner(skill.name, skill.apCost);

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

        // 행동 배너 표시 (AP 소모량 알갱이)
        this.showActionBanner(skill.name, skill.apCost);

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
