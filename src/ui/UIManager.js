// UI 매니저 - 모든 UI 컴포넌트 중앙 관리
// 씬에서 데이터를 받아 각 UI 컴포넌트에 전달하는 허브 역할

import LogWindow from './LogWindow.js';
import BattleControlUI from './BattleControlUI.js';
import PartyStatusUI from './PartyStatusUI.js';

export default class UIManager {
    constructor(scene) {
        this.scene = scene;

        // UI 컴포넌트 인스턴스
        this.logWindow = null;
        this.battleControlUI = null;
        this.allyStatusUI = null;
        this.enemyStatusUI = null;

        // 설정
        this.config = {
            activeSlots: [1, 2, 4] // 기본 활성 슬롯
        };
    }

    /**
     * 모든 UI 컴포넌트 초기화
     * @param {BattleManager} battleManager - 전투 매니저 참조
     * @param {Object} options - 추가 설정
     */
    initialize(battleManager, options = {}) {
        this.battleManager = battleManager;

        // 설정 병합
        this.config = { ...this.config, ...options };

        // 1. 로그 윈도우 초기화
        this.logWindow = new LogWindow(this.scene);

        // 2. 전투 컨트롤 UI 초기화
        this.battleControlUI = new BattleControlUI(this.scene, battleManager);

        // 3. 파티 현황판 초기화
        this.initializePartyStatusUI(battleManager);

        console.log('[UIManager] All UI components initialized');
    }

    /**
     * 파티 현황판 초기화
     */
    initializePartyStatusUI(battleManager) {
        // 아군 현황판 (좌하단)
        this.allyStatusUI = new PartyStatusUI(this.scene, battleManager, {
            isEnemy: false,
            activeSlots: this.config.activeSlots
        });

        // 적군 현황판 (우하단)
        this.enemyStatusUI = new PartyStatusUI(this.scene, battleManager, {
            isEnemy: true,
            activeSlots: this.config.activeSlots
        });
    }

    /**
     * 로그 메시지 추가
     * @param {string} message - 로그 메시지
     * @param {string} type - 로그 타입 (info, damage, heal, skill, system)
     */
    addLog(message, type = 'info') {
        if (this.logWindow) {
            this.logWindow.addLog(message, type);
        }
    }

    /**
     * 전투 상태 UI 업데이트
     */
    updateBattleStatus() {
        if (this.battleControlUI) {
            this.battleControlUI.updateStatus();
        }
    }

    /**
     * 전투 종료 시 UI 업데이트
     * @param {string} result - 전투 결과 ('승리', '패배', '무승부')
     */
    onBattleEnd(result) {
        if (this.battleControlUI) {
            this.battleControlUI.onBattleEnd(result);
        }
    }

    /**
     * 배속 설정
     * @param {number} speed - 배속 (1, 2, 4, 8)
     */
    setSpeed(speed) {
        if (this.battleControlUI) {
            this.battleControlUI.setSpeed(speed);
        }
    }

    /**
     * 현재 배속 배율 반환
     * @returns {number} 배속 배율
     */
    getSpeedMultiplier() {
        return this.battleControlUI ? this.battleControlUI.getSpeedMultiplier() : 1;
    }

    /**
     * 화면 크기 변경 시 UI 재배치
     * @param {number} width - 새 너비
     * @param {number} height - 새 높이
     */
    reposition(width, height) {
        if (this.battleControlUI) {
            this.battleControlUI.reposition(width, height);
        }
        if (this.logWindow) {
            this.logWindow.reposition(width, height);
        }
        // PartyStatusUI는 CSS로 자동 반응형 처리됨
    }

    /**
     * 모든 UI 컴포넌트 정리
     */
    destroy() {
        if (this.logWindow) {
            // LogWindow는 DOM 기반이므로 별도 정리 필요 없음
            this.logWindow = null;
        }

        if (this.battleControlUI) {
            // BattleControlUI DOM 정리
            this.battleControlUI = null;
        }

        if (this.allyStatusUI) {
            this.allyStatusUI.destroy();
            this.allyStatusUI = null;
        }

        if (this.enemyStatusUI) {
            this.enemyStatusUI.destroy();
            this.enemyStatusUI = null;
        }

        console.log('[UIManager] All UI components destroyed');
    }

    /**
     * 로그 배치 시작 (여러 로그를 한번에 표시)
     */
    startLogBatch() {
        if (this.logWindow) {
            this.logWindow.startBatch();
        }
    }

    /**
     * 로그 배치 종료
     */
    endLogBatch() {
        if (this.logWindow) {
            this.logWindow.endBatch();
        }
    }
}
