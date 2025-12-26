// 전투 컨트롤 UI
// 우상단: 배속 뱃지 (여러 번 눌러서 변경)
// 우하단: 자동전투/일시정지 버튼

export default class BattleControlUI {
    constructor(scene, battleManager) {
        this.scene = scene;
        this.battleManager = battleManager;
        this.currentSpeedIndex = 0;
        this.speedOptions = [1, 2, 4, 8];

        this.speedBadge = null;
        this.controlPanel = null;

        this.createSpeedBadge();
        this.createControlPanel();
    }

    // 우상단 배속 뱃지
    createSpeedBadge() {
        const html = `
            <style>
                #speed-badge {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: rgba(50, 50, 50, 0.9);
                    border: 3px solid #666;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer;
                    user-select: none;
                    font-family: Arial, sans-serif;
                    font-size: 16px;
                    font-weight: bold;
                    color: #fff;
                    transition: all 0.15s;
                    touch-action: manipulation;
                }
                #speed-badge:hover {
                    transform: scale(1.1);
                    border-color: #ff9900;
                }
                #speed-badge:active {
                    transform: scale(0.95);
                }
                #speed-badge.fast {
                    border-color: #ff9900;
                    background: rgba(255, 150, 50, 0.9);
                }
            </style>
            <div id="speed-badge">1x</div>
        `;

        this.speedBadge = this.scene.add.dom(1240, 40).createFromHTML(html);
        this.speedBadge.setOrigin(0.5, 0.5);
        this.speedBadge.setDepth(2000);

        const badge = this.speedBadge.node.querySelector('#speed-badge');

        // 클릭으로 배속 순환
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cycleSpeed();
        });

        badge.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        }, { passive: true });

        // 키보드 이벤트 방지
        badge.addEventListener('keydown', (e) => e.stopPropagation());
    }

    // 우하단 컨트롤 패널
    createControlPanel() {
        const html = `
            <style>
                #control-panel {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    font-family: Arial, sans-serif;
                }
                #control-panel button {
                    padding: 10px 16px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    transition: all 0.2s;
                    min-width: 90px;
                    touch-action: manipulation;
                }
                #control-panel button:active {
                    transform: scale(0.95);
                }
                .control-btn {
                    background: rgba(50, 100, 150, 0.9);
                    color: #fff;
                }
                .control-btn.active {
                    background: rgba(50, 150, 50, 0.9);
                }
                .control-btn.paused {
                    background: rgba(150, 50, 50, 0.9);
                }
                #battle-status {
                    font-size: 11px;
                    color: #aaa;
                    text-align: center;
                    padding: 4px;
                    background: rgba(0,0,0,0.5);
                    border-radius: 4px;
                }
            </style>
            <div id="control-panel">
                <button id="auto-btn" class="control-btn">▶ AUTO</button>
                <button id="pause-btn" class="control-btn">⏸ PAUSE</button>
                <div id="battle-status">대기 중</div>
            </div>
        `;

        // 우하단 배치
        this.controlPanel = this.scene.add.dom(1230, 580).createFromHTML(html);
        this.controlPanel.setOrigin(1, 0);
        this.controlPanel.setDepth(2000);

        this.setupControlEvents();
    }

    setupControlEvents() {
        const container = this.controlPanel.node;

        // 자동 전투 버튼
        const autoBtn = container.querySelector('#auto-btn');
        autoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleAuto();
        });

        // 일시정지 버튼
        const pauseBtn = container.querySelector('#pause-btn');
        pauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePause();
        });

        // 키보드 이벤트 전파 방지
        container.addEventListener('keydown', (e) => e.stopPropagation());
        container.addEventListener('keyup', (e) => e.stopPropagation());
    }

    // 배속 순환 (1x -> 2x -> 4x -> 8x -> 1x)
    cycleSpeed() {
        this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speedOptions.length;
        const speed = this.speedOptions[this.currentSpeedIndex];
        this.applySpeed(speed);
    }

    // 배속 직접 설정
    setSpeed(speed) {
        const index = this.speedOptions.indexOf(speed);
        if (index !== -1) {
            this.currentSpeedIndex = index;
            this.applySpeed(speed);
        }
    }

    applySpeed(speed) {
        const badge = this.speedBadge.node.querySelector('#speed-badge');
        badge.textContent = `${speed}x`;

        // 2배 이상이면 강조
        if (speed > 1) {
            badge.classList.add('fast');
        } else {
            badge.classList.remove('fast');
        }

        // BattleManager 딜레이 조정
        if (this.battleManager) {
            this.battleManager.turnDelay = 1500 / speed;
        }

        this.updateStatus();
    }

    toggleAuto() {
        if (!this.battleManager) return;

        const autoBtn = this.controlPanel.node.querySelector('#auto-btn');

        if (!this.battleManager.isRunning) {
            // 전투 시작
            this.battleManager.autoMode = true;
            this.battleManager.startBattle();
            autoBtn.classList.add('active');
            autoBtn.textContent = '■ STOP';
        } else {
            // 자동 모드 토글
            const isAuto = this.battleManager.toggleAutoMode();
            autoBtn.classList.toggle('active', isAuto);
            autoBtn.textContent = isAuto ? '■ STOP' : '▶ AUTO';
        }

        this.updateStatus();
    }

    togglePause() {
        if (!this.battleManager || !this.battleManager.isRunning) return;

        const pauseBtn = this.controlPanel.node.querySelector('#pause-btn');
        const isPaused = this.battleManager.togglePause();

        pauseBtn.classList.toggle('paused', isPaused);
        pauseBtn.textContent = isPaused ? '▶ RESUME' : '⏸ PAUSE';

        this.updateStatus();
    }

    updateStatus() {
        const statusEl = this.controlPanel.node.querySelector('#battle-status');
        if (!this.battleManager) {
            statusEl.textContent = '대기 중';
            return;
        }

        const speed = this.speedOptions[this.currentSpeedIndex];
        let status = '';
        if (!this.battleManager.isRunning) {
            status = '대기 중';
        } else if (this.battleManager.isPaused) {
            status = '⏸ 일시정지';
        } else if (this.battleManager.autoMode) {
            status = `▶ 자동 (${speed}x)`;
        } else {
            status = '수동 모드';
        }

        statusEl.textContent = status;
    }

    // 전투 종료 시 호출
    onBattleEnd(result) {
        const autoBtn = this.controlPanel.node.querySelector('#auto-btn');
        const pauseBtn = this.controlPanel.node.querySelector('#pause-btn');

        autoBtn.classList.remove('active');
        autoBtn.textContent = '▶ AUTO';
        pauseBtn.classList.remove('paused');
        pauseBtn.textContent = '⏸ PAUSE';

        const statusEl = this.controlPanel.node.querySelector('#battle-status');
        statusEl.textContent = `종료: ${result}`;
    }
}
