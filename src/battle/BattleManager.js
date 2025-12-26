// 키워드 기반 전투 시스템 - 전투 매니저
// 턴 시스템, 행동 결정, 타겟팅, 전투 진행 관리
// Phase 4: 비동기 공격 시퀀스 및 시각적 연출

import Unit from './Unit.js';
import { SkillSets } from '../data/Skills.js';
import { getKeyword } from '../data/Keywords.js';

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
        // 스포트라이트 해제
        this.hideSpotlight(unit);

        // 행동 게이지 리셋
        if (unit.sprite && unit.sprite.statusBar) {
            unit.sprite.statusBar.resetAction();
        }

        // 행동 처리 완료 - 틱 재개
        this.isProcessingAction = false;
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

        // 휴식 연출 (기력 부족 텍스트 + 회복 이펙트)
        await unit.performRest(this.scene, recovered);
    }

    // 공격 실행 (비동기 시퀀스)
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

        // 키워드 특수 효과 확인
        skill.keywords.forEach(keywordId => {
            const keyword = getKeyword(keywordId);
            if (keyword) {
                if (keyword.hits) hits = keyword.hits;
                if (keyword.ignoreDefense) ignoreDefense = true;
            }
        });

        // 로그 출력 (공격 시작)
        this.log(
            `${attacker.name}이(가) ${skill.toString()} 사용! (AP ${apCost} 소모)`,
            'skill'
        );

        // 비동기 공격 시퀀스 실행
        let totalDamage = 0;

        await attacker.performAttack(target, skill, this.scene, () => {
            // 타격 프레임에서 실행되는 데미지 콜백
            for (let i = 0; i < hits; i++) {
                const result = target.takeDamage(Math.floor(damage / hits));
                totalDamage += result.damage;
            }

            // 플로팅 데미지 표시
            target.showFloatingDamage(this.scene, totalDamage);
        });

        // 데미지 로그
        this.log(
            `→ ${target.name}에게 ${totalDamage} 데미지!`,
            'damage'
        );

        // 사망 체크
        if (target.isDead) {
            this.log(`${target.name}이(가) 쓰러졌다!`, 'system');
            this.playDeathAnimation(target);
        }
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

        // 회복량 계산 (power가 음수이므로 절댓값)
        const healAmount = Math.abs(skill.power);
        const actualHeal = target.heal(healAmount);

        this.log(
            `${healer.name}이(가) ${skill.toString()} 스킬 사용 (AP ${skill.apCost} 소모)`,
            'heal'
        );

        // 치유 연출
        await healer.performHeal(target, actualHeal, this.scene);

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

        // 방어 태세
        unit.defend();

        this.log(
            `${unit.name}이(가) ${skill.toString()} (AP ${skill.apCost} 소모) - 방어 태세`,
            'info'
        );

        // 방어 연출
        await unit.performDefend(this.scene);
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
        this.log(`테스트: ${target.name}이(가) ${damage} 피해! (HP: ${result.remainingHp})`, 'damage');

        // 화면 흔들림
        this.scene.cameras.main.shake(80, 0.005);

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
        }

        this.scene.logWindow.endBatch();
    }
}
