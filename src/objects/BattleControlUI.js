// 전투 컨트롤 UI
// 우상단: 배속 뱃지 (여러 번 눌러서 변경)
// 우하단: 자동전투/일시정지 버튼

export default class BattleControlUI {
    constructor(scene, battleManager) {
        this.scene = scene;
        this.battleManager = battleManager;
        this.currentSpeedIndex = 0;
        // 내부 배율: 0.5를 1x로 표시, 16x 추가
        // 표시: 1x, 2x, 4x, 8x, 16x
        // 실제: 0.5, 1, 2, 4, 8
        this.speedOptions = [0.5, 1, 2, 4, 8];
        this.speedLabels = ['1x', '2x', '4x', '8x', '16x'];

        this.speedBadge = null;
        this.controlPanel = null;

        // 모바일 감지
        this.isMobile = this.detectMobile();
        this.scale = this.isMobile ? 1.5 : 1;

        this.createSpeedBadge();
        this.createControlPanel();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    // 우상단 배속 뱃지
    createSpeedBadge() {
        const size = Math.round(50 * this.scale);
        const fontSize = Math.round(16 * this.scale);
        const borderWidth = Math.round(3 * this.scale);

        const html = `
            <style>
                #speed-badge {
                    width: ${size}px;
                    height: ${size}px;
                    border-radius: 50%;
                    background: rgba(50, 50, 50, 0.9);
                    border: ${borderWidth}px solid #666;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer;
                    user-select: none;
                    font-family: Arial, sans-serif;
                    font-size: ${fontSize}px;
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
                #speed-badge.superfast {
                    border-color: #ff3300;
                    background: rgba(255, 80, 30, 0.95);
                }
            </style>
            <div id="speed-badge">1x</div>
        `;

        const posX = this.isMobile ? 1220 : 1240;
        const posY = this.isMobile ? 50 : 40;
        this.speedBadge = this.scene.add.dom(posX, posY).createFromHTML(html);
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
        const gap = Math.round(8 * this.scale);
        const btnPaddingV = Math.round(10 * this.scale);
        const btnPaddingH = Math.round(16 * this.scale);
        const btnFontSize = Math.round(14 * this.scale);
        const btnRadius = Math.round(6 * this.scale);
        const minWidth = Math.round(90 * this.scale);
        const statusFontSize = Math.round(11 * this.scale);
        const statusPadding = Math.round(4 * this.scale);

        const html = `
            <style>
                #control-panel {
                    display: flex;
                    flex-direction: column;
                    gap: ${gap}px;
                    font-family: Arial, sans-serif;
                }
                #control-panel button {
                    padding: ${btnPaddingV}px ${btnPaddingH}px;
                    border: none;
                    border-radius: ${btnRadius}px;
                    cursor: pointer;
                    font-size: ${btnFontSize}px;
                    font-weight: bold;
                    transition: all 0.2s;
                    min-width: ${minWidth}px;
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
                    font-size: ${statusFontSize}px;
                    color: #aaa;
                    text-align: center;
                    padding: ${statusPadding}px;
                    background: rgba(0,0,0,0.5);
                    border-radius: ${btnRadius}px;
                }
            </style>
            <div id="control-panel">
                <button id="auto-btn" class="control-btn">▶ AUTO</button>
                <button id="pause-btn" class="control-btn">⏸ PAUSE</button>
                <div id="battle-status">대기 중</div>
            </div>
        `;

        // 우하단 배치 (모바일에서 약간 위로)
        const posX = this.isMobile ? 1210 : 1230;
        const posY = this.isMobile ? 540 : 580;
        this.controlPanel = this.scene.add.dom(posX, posY).createFromHTML(html);
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

    // 배속 순환 (1x -> 2x -> 4x -> 8x -> 16x -> 1x)
    cycleSpeed() {
        this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speedOptions.length;
        this.applySpeed();
    }

    // 배속 직접 설정 (표시 배속 기준)
    setSpeed(displaySpeed) {
        const index = this.speedLabels.indexOf(`${displaySpeed}x`);
        if (index !== -1) {
            this.currentSpeedIndex = index;
            this.applySpeed();
        }
    }

    applySpeed() {
        const badge = this.speedBadge.node.querySelector('#speed-badge');
        const label = this.speedLabels[this.currentSpeedIndex];
        const actualSpeed = this.speedOptions[this.currentSpeedIndex];

        badge.textContent = label;

        // 스타일 업데이트
        badge.classList.remove('fast', 'superfast');
        if (actualSpeed >= 4) {
            badge.classList.add('superfast');
        } else if (actualSpeed > 0.5) {
            badge.classList.add('fast');
        }

        // BattleManager 딜레이 조정
        if (this.battleManager) {
            this.battleManager.turnDelay = 1500 / actualSpeed;
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

    // 현재 배속 배율 반환 (실제 내부 값)
    getSpeedMultiplier() {
        return this.speedOptions[this.currentSpeedIndex];
    }

    updateStatus() {
        const statusEl = this.controlPanel.node.querySelector('#battle-status');
        if (!this.battleManager) {
            statusEl.textContent = '대기 중';
            return;
        }

        const label = this.speedLabels[this.currentSpeedIndex];
        let status = '';
        if (!this.battleManager.isRunning) {
            status = '대기 중';
        } else if (this.battleManager.isPaused) {
            status = '⏸ 일시정지';
        } else if (this.battleManager.autoMode) {
            status = `▶ 자동 (${label})`;
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
