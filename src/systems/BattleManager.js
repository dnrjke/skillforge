// 키워드 기반 전투 시스템 - 전투 매니저
// 전투 흐름 제어, 유닛 관리, 턴 시스템
// 연출은 BattlePresentation, UI는 ActionBannerUI, 스킬 실행은 SkillExecutor로 위임

import Unit from '../entities/Unit.js';
import ParticleEffects from '../effects/ParticleEffects.js';
import BattlePresentation from './BattlePresentation.js';
import SkillExecutor from './SkillExecutor.js';
import ActionBannerUI from '../ui/ActionBannerUI.js';

export default class BattleManager {
    constructor(scene) {
        this.scene = scene;
        this.allies = [];
        this.enemies = [];
        this.turnQueue = [];
        this.currentTurn = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.battleLog = [];

        // 전투 설정
        this.turnDelay = 1500;
        this.autoMode = false;

        // 행동 게이지 시스템
        this.actionTickRate = 100;
        this.actionTickTimer = null;
        this.isProcessingAction = false;

        // 하위 시스템 초기화
        this.particleEffects = new ParticleEffects(scene);
        this.presentation = new BattlePresentation(scene);
        this.bannerUI = new ActionBannerUI();
        this.skillExecutor = new SkillExecutor(this, this.presentation, this.bannerUI);
    }

    // ==========================================
    // 유닛 관리
    // ==========================================

    initializeUnits(allySprites, enemySprites) {
        const MAX_AP = 18;

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
                currentAp: config.maxAp,
                skillSet: config.skillSet
            });
            unit.linkSprite(sprite);
            this.allies.push(unit);
        });

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
                currentAp: config.maxAp,
                skillSet: config.skillSet
            });
            unit.linkSprite(sprite);
            this.enemies.push(unit);
        });

        this.buildTurnQueue();
    }

    buildTurnQueue() {
        const allUnits = [...this.allies, ...this.enemies].filter(u => u.isAlive);
        this.turnQueue = allUnits.sort((a, b) => b.speed - a.speed);
    }

    // ==========================================
    // 유닛 조회
    // ==========================================

    getAliveAllies() {
        return this.allies.filter(u => u.isAlive);
    }

    getAliveEnemies() {
        return this.enemies.filter(u => u.isAlive);
    }

    getAllAliveUnits() {
        return [...this.getAliveAllies(), ...this.getAliveEnemies()];
    }

    // ==========================================
    // 타겟팅
    // ==========================================

    selectTarget(attacker) {
        const targets = attacker.isEnemy ? this.getAliveAllies() : this.getAliveEnemies();
        if (targets.length === 0) return null;
        return targets[Math.floor(Math.random() * targets.length)];
    }

    selectHealTarget(healer) {
        const allies = healer.isEnemy ? this.getAliveEnemies() : this.getAliveAllies();
        if (allies.length === 0) return null;

        return allies.reduce((lowest, unit) => {
            const lowestRatio = lowest.currentHp / lowest.maxHp;
            const unitRatio = unit.currentHp / unit.maxHp;
            return unitRatio < lowestRatio ? unit : lowest;
        });
    }

    // ==========================================
    // 전투 흐름 제어
    // ==========================================

    startBattle() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.currentTurn = 0;
        this.isProcessingAction = false;

        this.log('═══════════════════════════════════', 'system');
        this.log('전투 시작!', 'system');
        this.log('═══════════════════════════════════', 'system');

        this.startActionTick();
    }

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

    stopActionTick() {
        if (this.actionTickTimer) {
            this.actionTickTimer.remove();
            this.actionTickTimer = null;
        }
    }

    onActionTick() {
        if (!this.isRunning || this.isPaused || this.isProcessingAction) return;

        if (this.checkBattleEnd()) {
            this.stopActionTick();
            return;
        }

        const allUnits = this.getAllAliveUnits();
        if (allUnits.length === 0) return;

        const speedMultiplier = this.scene.battleControlUI ?
            this.scene.battleControlUI.getSpeedMultiplier() : 1;

        let readyUnit = null;

        for (const unit of allUnits) {
            if (!unit.sprite || !unit.sprite.statusBar) continue;

            const statusBar = unit.sprite.statusBar;
            const increase = unit.speed * 0.5 * speedMultiplier;
            statusBar.currentAction = Math.min(100, statusBar.currentAction + increase);
            statusBar.setAction(statusBar.currentAction, false);

            if (!readyUnit && statusBar.currentAction >= 100) {
                readyUnit = unit;
            }
        }

        if (readyUnit) {
            this.isProcessingAction = true;
            this.executeAction(readyUnit);
        }
    }

    // ==========================================
    // 행동 실행
    // ==========================================

    async executeAction(unit) {
        const skill = unit.selectSkill();
        this.currentTurn++;

        // 스포트라이트 표시 (연출 모듈 사용)
        this.presentation.showSpotlight(unit);

        this.scene.logWindow.startBatch();

        // 스킬 실행 (SkillExecutor로 위임)
        await this.skillExecutor.execute(unit, skill);

        this.scene.logWindow.endBatch();

        this.finishAction(unit);
    }

    finishAction(unit) {
        try {
            // 스포트라이트 해제
            this.presentation.hideSpotlight(unit);

            // 행동 게이지 리셋
            if (unit.sprite && unit.sprite.statusBar) {
                unit.sprite.statusBar.resetAction();
            }

            // PP 회복
            if (unit.currentPp < unit.maxPp) {
                const recovered = unit.recoverPp(1);
                if (recovered > 0) {
                    unit.showFloatingPp(this.scene, recovered);
                }
            }
        } catch (error) {
            console.error('[Battle] Error in finishAction:', error);
        } finally {
            if (this.scene && this.scene.time && this.scene.time.timeScale !== 1) {
                this.scene.time.timeScale = 1;
            }
            this.isProcessingAction = false;
        }
    }

    // ==========================================
    // 전투 종료
    // ==========================================

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

    endBattle(result) {
        this.isRunning = false;
        this.stopActionTick();
        this.log('═══════════════════════════════════', 'system');
        this.log(`전투 종료: ${result}!`, 'system');
        this.log('═══════════════════════════════════', 'system');

        if (this.scene.battleControlUI) {
            this.scene.battleControlUI.onBattleEnd(result);
        }
    }

    // ==========================================
    // 전투 제어
    // ==========================================

    togglePause() {
        this.isPaused = !this.isPaused;
        return this.isPaused;
    }

    manualNextTurn() {
        if (!this.isRunning) {
            this.startBattle();
        }
    }

    toggleAutoMode() {
        this.autoMode = !this.autoMode;
        this.log(`자동 전투 ${this.autoMode ? '활성화' : '비활성화'}`, 'system');
        return this.autoMode;
    }

    // ==========================================
    // 로깅
    // ==========================================

    log(message, type = 'info') {
        console.log(`[Battle] ${message}`);
        this.battleLog.push({ message, type, time: Date.now() });

        if (this.scene && this.scene.addLog) {
            this.scene.addLog(message, type);
        }
    }

    // ==========================================
    // 테스트용
    // ==========================================

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

        const result = target.takeDamage(damage);
        target.showFloatingDamage(this.scene, damage);

        this.particleEffects.playAttackHitEffect(target.sprite.x, target.sprite.y, 3);

        this.log(`테스트: ${target.name}이(가) ${damage} 피해! (HP: ${result.remainingHp})`, 'damage');

        target.consumeAp(apCost);
        target.showFloatingAp(this.scene, apCost, false);
        this.log(`테스트: ${target.name} AP ${apCost} 감소 (AP: ${target.currentAp})`, 'info');

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
            this.presentation.playDeathAnimation(target);
            this.particleEffects.playDeathEffect(target.sprite.x, target.sprite.y, target.isEnemy);
        }

        this.scene.logWindow.endBatch();
    }
}
