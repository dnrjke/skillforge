// 키워드 기반 전투 시스템 - 전투 매니저
// 턴 시스템, 행동 결정, 타겟팅, 전투 진행 관리

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
    }

    // 유닛 초기화 (스프라이트와 연결)
    initializeUnits(allySprites, enemySprites) {
        // 아군 유닛 생성
        const allyConfigs = [
            { name: '아군1', skillSet: 'WARRIOR', speed: 12, maxAp: 10 },
            { name: '아군2', skillSet: 'MAGE', speed: 10, maxAp: 12 },
            { name: '아군3', skillSet: 'ROGUE', speed: 15, maxAp: 8 }
        ];

        allySprites.forEach((sprite, index) => {
            const config = allyConfigs[index] || allyConfigs[0];
            const unit = new Unit({
                id: `ally_${index}`,
                name: config.name,
                isEnemy: false,
                speed: config.speed,
                maxAp: config.maxAp,
                currentAp: 0,
                skillSet: config.skillSet
            });
            unit.linkSprite(sprite);
            this.allies.push(unit);
        });

        // 적군 유닛 생성
        const enemyConfigs = [
            { name: '적군1', skillSet: 'WARRIOR', speed: 11, maxAp: 10 },
            { name: '적군2', skillSet: 'MAGE', speed: 9, maxAp: 12 },
            { name: '적군3', skillSet: 'ROGUE', speed: 14, maxAp: 8 }
        ];

        enemySprites.forEach((sprite, index) => {
            const config = enemyConfigs[index] || enemyConfigs[0];
            const unit = new Unit({
                id: `enemy_${index}`,
                name: config.name,
                isEnemy: true,
                speed: config.speed,
                maxAp: config.maxAp,
                currentAp: 0,
                skillSet: config.skillSet
            });
            unit.linkSprite(sprite);
            this.enemies.push(unit);
        });

        // 초기 턴 대기열 생성
        this.buildTurnQueue();

        // 초기 행동 게이지 설정 (속도 기반)
        this.initializeActionBars();
    }

    // 초기 행동 게이지 설정
    initializeActionBars() {
        const allUnits = this.getAllAliveUnits();
        // 속도 기준 최대/최소 찾기
        const maxSpeed = Math.max(...allUnits.map(u => u.speed));
        const minSpeed = Math.min(...allUnits.map(u => u.speed));

        allUnits.forEach(unit => {
            if (unit.sprite && unit.sprite.statusBar) {
                // 속도가 빠를수록 행동 게이지가 더 차 있음 (30~80% 범위)
                const speedRatio = maxSpeed === minSpeed ? 0.5 :
                    (unit.speed - minSpeed) / (maxSpeed - minSpeed);
                const initialAction = 30 + Math.floor(speedRatio * 50);
                unit.sprite.statusBar.setAction(initialAction, false);
            }
        });
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

        this.log('═══════════════════════════════════', 'system');
        this.log('전투 시작!', 'system');
        this.log('═══════════════════════════════════', 'system');

        // 모든 유닛 초기 AP 회복
        this.getAllAliveUnits().forEach(unit => {
            unit.recoverAp(3);
        });

        if (this.autoMode) {
            this.runNextTurn();
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

    // 행동 실행
    executeAction(unit) {
        const skill = unit.selectSkill();

        // 현재 행동 유닛 표시 (행동 게이지 100%)
        if (unit.sprite && unit.sprite.statusBar) {
            unit.sprite.statusBar.setAction(100);
            unit.sprite.statusBar.setCurrentTurn(true);
        }

        this.scene.logWindow.startBatch();

        if (skill.type === 'wait' || skill.id === 'WAIT') {
            // 대기: AP 회복
            const recovered = unit.recoverAp();
            this.log(`${unit.name}이(가) 대기 (AP +${recovered} 회복)`, 'info');
        } else if (skill.type === 'heal') {
            // 치유
            this.executeHeal(unit, skill);
        } else if (skill.type === 'defend') {
            // 방어
            this.executeDefend(unit, skill);
        } else {
            // 공격
            this.executeAttack(unit, skill);
        }

        this.scene.logWindow.endBatch();

        // 행동 후 게이지 리셋 및 턴 표시 해제
        this.scene.time.delayedCall(300, () => {
            if (unit.sprite && unit.sprite.statusBar) {
                unit.sprite.statusBar.resetAction();
                unit.sprite.statusBar.setCurrentTurn(false);
            }
            // 다른 유닛들 행동 게이지 증가
            this.updateActionBars(unit);
        });

        // 다음 턴 예약
        if (this.autoMode && this.isRunning) {
            this.scene.time.delayedCall(this.turnDelay, () => this.runNextTurn());
        }
    }

    // 다른 유닛들의 행동 게이지 업데이트
    updateActionBars(actedUnit) {
        this.getAllAliveUnits().forEach(unit => {
            if (unit !== actedUnit && unit.sprite && unit.sprite.statusBar) {
                // 속도에 비례하여 행동 게이지 증가
                const increase = Math.floor(unit.speed * 3);
                unit.sprite.statusBar.addAction(increase);
            }
        });
    }

    // 공격 실행
    executeAttack(attacker, skill) {
        const target = this.selectTarget(attacker);
        if (!target) {
            this.log(`${attacker.name}: 대상 없음`, 'info');
            return;
        }

        // AP 소모
        attacker.consumeAp(skill.apCost);

        // 데미지 계산 (키워드 기반)
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

        // 다중 타격 처리
        let totalDamage = 0;
        for (let i = 0; i < hits; i++) {
            const result = target.takeDamage(Math.floor(damage / hits));
            totalDamage += result.damage;
        }

        // 로그 출력
        this.log(
            `${attacker.name}이(가) ${skill.toString()} 스킬 사용 (AP ${skill.apCost} 소모), ` +
            `${target.name}에게 ${totalDamage} 데미지`,
            'skill'
        );

        // 피격 애니메이션
        this.playHitAnimation(target);

        // 사망 체크
        if (target.isDead) {
            this.log(`${target.name}이(가) 쓰러졌다!`, 'system');
            this.playDeathAnimation(target);
        }

        // 피격 시 AP 회복
        target.recoverAp(1);
    }

    // 치유 실행
    executeHeal(healer, skill) {
        const target = this.selectHealTarget(healer);
        if (!target) {
            this.log(`${healer.name}: 치유 대상 없음`, 'info');
            return;
        }

        // AP 소모
        healer.consumeAp(skill.apCost);

        // 회복량 계산 (power가 음수이므로 절댓값)
        const healAmount = Math.abs(skill.power);
        const actualHeal = target.heal(healAmount);

        this.log(
            `${healer.name}이(가) ${skill.toString()} 스킬 사용 (AP ${skill.apCost} 소모), ` +
            `${target.name} HP ${actualHeal} 회복`,
            'heal'
        );
    }

    // 방어 실행
    executeDefend(unit, skill) {
        // AP 소모
        unit.consumeAp(skill.apCost);

        // 방어 태세
        unit.defend();

        this.log(
            `${unit.name}이(가) ${skill.toString()} (AP ${skill.apCost} 소모) - 방어 태세`,
            'info'
        );
    }

    // 피격 애니메이션
    playHitAnimation(unit) {
        if (!unit.sprite) return;

        unit.sprite.play('knight_hit');
        unit.sprite.once('animationcomplete', () => {
            if (unit.isAlive) {
                unit.sprite.play('knight_idle');
            }
        });
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
        this.log('═══════════════════════════════════', 'system');
        this.log(`전투 종료: ${result}!`, 'system');
        this.log('═══════════════════════════════════', 'system');
    }

    // 일시 정지/재개
    togglePause() {
        this.isPaused = !this.isPaused;
        if (!this.isPaused && this.autoMode) {
            this.runNextTurn();
        }
        return this.isPaused;
    }

    // 수동 다음 턴 (스페이스바용)
    manualNextTurn() {
        if (!this.isRunning) {
            this.startBattle();
            if (!this.autoMode) {
                this.runNextTurn();
            }
        } else if (!this.autoMode && !this.isPaused) {
            this.runNextTurn();
        }
    }

    // 자동 전투 토글
    toggleAutoMode() {
        this.autoMode = !this.autoMode;
        this.log(`자동 전투 ${this.autoMode ? '활성화' : '비활성화'}`, 'system');
        if (this.autoMode && this.isRunning && !this.isPaused) {
            this.runNextTurn();
        }
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
        this.log(`테스트: ${target.name}이(가) ${damage} 피해! (HP: ${result.remainingHp})`, 'damage');

        // AP 감소
        target.consumeAp(apCost);
        this.log(`테스트: ${target.name} AP ${apCost} 감소 (AP: ${target.currentAp})`, 'info');

        // 피격 애니메이션
        this.playHitAnimation(target);

        if (result.isDead) {
            this.log(`${target.name}이(가) 쓰러졌다!`, 'system');
            this.playDeathAnimation(target);
        }

        this.scene.logWindow.endBatch();
    }
}
