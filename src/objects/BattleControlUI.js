// 전투 컨트롤 UI
// 우상단: 배속 뱃지 (여러 번 눌러서 변경)
// 우하단: 자동전투/일시정지 버튼

import { hideAddressBar } from '../main.js';

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
        this.scale = this.isMobile ? 1.0 : 1.0;

        this.createSpeedBadge();
        this.createControlPanel();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    // 우상단 배속 뱃지 (순수 HTML - 게임 컨테이너 기준)
    createSpeedBadge() {
        const size = Math.round(50 * this.scale);
        const fontSize = Math.round(16 * this.scale);
        const borderWidth = Math.round(3 * this.scale);

        // 순수 HTML 엘리먼트 생성 (Phaser DOM 사용 안함)
        const badge = document.createElement('div');
        badge.id = 'speed-badge';
        badge.textContent = '1x';

        // CSS로 게임 컨테이너 기준 절대 위치
        badge.style.cssText = `
            position: absolute;
            top: ${this.isMobile ? '5%' : '5.5%'};
            right: ${this.isMobile ? '4%' : '3%'};
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
            pointer-events: auto;
            z-index: 100;
        `;

        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(badge);
        this.speedBadgeElement = badge;

        // 클릭으로 배속 순환
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cycleSpeed();
        });

        // 호버 효과
        badge.addEventListener('mouseenter', () => {
            badge.style.transform = 'scale(1.1)';
            badge.style.borderColor = '#ff9900';
        });

        badge.addEventListener('mouseleave', () => {
            badge.style.transform = 'scale(1)';
            const actualSpeed = this.speedOptions[this.currentSpeedIndex];
            if (actualSpeed >= 4) {
                badge.style.borderColor = '#ff3300';
            } else if (actualSpeed > 0.5) {
                badge.style.borderColor = '#ff9900';
            } else {
                badge.style.borderColor = '#666';
            }
        });

        badge.addEventListener('mousedown', () => {
            badge.style.transform = 'scale(0.95)';
        });

        badge.addEventListener('mouseup', () => {
            badge.style.transform = 'scale(1)';
        });

        badge.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        }, { passive: true });

        badge.addEventListener('keydown', (e) => e.stopPropagation());
    }

    // 우하단 컨트롤 패널 (순수 HTML - 게임 컨테이너 기준)
    createControlPanel() {
        const gap = Math.round(8 * this.scale);
        const btnPaddingV = Math.round(10 * this.scale);
        const btnPaddingH = Math.round(16 * this.scale);
        const btnFontSize = Math.round(14 * this.scale);
        const btnRadius = Math.round(6 * this.scale);
        const minWidth = Math.round(90 * this.scale);
        const statusFontSize = Math.round(11 * this.scale);
        const statusPadding = Math.round(4 * this.scale);

        // 순수 HTML 엘리먼트 생성
        const panel = document.createElement('div');
        panel.id = 'control-panel';
        panel.innerHTML = `
            <button id="auto-btn" class="control-btn">▶ AUTO</button>
            <button id="pause-btn" class="control-btn">⏸ PAUSE</button>
            <div id="battle-status">대기 중</div>
        `;

        // CSS로 게임 컨테이너 기준 절대 위치
        panel.style.cssText = `
            position: absolute;
            bottom: ${this.isMobile ? '24%' : '19%'};
            right: ${this.isMobile ? '5%' : '4%'};
            display: flex;
            flex-direction: column;
            gap: ${gap}px;
            font-family: Arial, sans-serif;
            pointer-events: auto;
            z-index: 100;
        `;

        // 버튼 스타일 추가
        const style = document.createElement('style');
        style.textContent = `
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
                pointer-events: auto;
            }
            #control-panel button:active {
                transform: scale(0.95);
            }
            #control-panel .control-btn {
                background: rgba(50, 100, 150, 0.9);
                color: #fff;
            }
            #control-panel .control-btn.active {
                background: rgba(50, 150, 50, 0.9);
            }
            #control-panel .control-btn.paused {
                background: rgba(150, 50, 50, 0.9);
            }
            #control-panel #battle-status {
                font-size: ${statusFontSize}px;
                color: #aaa;
                text-align: center;
                padding: ${statusPadding}px;
                background: rgba(0,0,0,0.5);
                border-radius: ${btnRadius}px;
            }
        `;

        document.head.appendChild(style);
        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(panel);
        this.controlPanelElement = panel;

        this.setupControlEvents();
    }

    // 화면 크기 변경 시 UI 재배치 (position: fixed이므로 불필요하지만 유지)
    reposition(width, height) {
        // position: fixed 사용으로 자동 재배치됨
        // 필요시 여기서 스타일 업데이트 가능
    }

    setupControlEvents() {
        const container = this.controlPanelElement;

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
        const badge = this.speedBadgeElement;
        const label = this.speedLabels[this.currentSpeedIndex];
        const actualSpeed = this.speedOptions[this.currentSpeedIndex];

        badge.textContent = label;

        // 스타일 업데이트
        if (actualSpeed >= 4) {
            badge.style.borderColor = '#ff3300';
            badge.style.background = 'rgba(255, 80, 30, 0.95)';
        } else if (actualSpeed > 0.5) {
            badge.style.borderColor = '#ff9900';
            badge.style.background = 'rgba(255, 150, 50, 0.9)';
        } else {
            badge.style.borderColor = '#666';
            badge.style.background = 'rgba(50, 50, 50, 0.9)';
        }

        // BattleManager 딜레이 조정
        if (this.battleManager) {
            this.battleManager.turnDelay = 1500 / actualSpeed;
        }

        this.updateStatus();
    }

    toggleAuto() {
        if (!this.battleManager) return;

        const autoBtn = this.controlPanelElement.querySelector('#auto-btn');

        if (!this.battleManager.isRunning) {
            // 전투 시작 + iOS Safari 주소표시줄 숨기기 트리거
            hideAddressBar();

            // PWA 안내 문구 숨기기 (게임 시작 후)
            const pwaHint = document.getElementById('pwa-hint');
            if (pwaHint) {
                pwaHint.style.transition = 'opacity 0.5s';
                pwaHint.style.opacity = '0';
                setTimeout(() => {
                    pwaHint.style.display = 'none';
                }, 500);
            }

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

        const pauseBtn = this.controlPanelElement.querySelector('#pause-btn');
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
        const statusEl = this.controlPanelElement.querySelector('#battle-status');
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
        const autoBtn = this.controlPanelElement.querySelector('#auto-btn');
        const pauseBtn = this.controlPanelElement.querySelector('#pause-btn');

        autoBtn.classList.remove('active');
        autoBtn.textContent = '▶ AUTO';
        pauseBtn.classList.remove('paused');
        pauseBtn.textContent = '⏸ PAUSE';

        const statusEl = this.controlPanelElement.querySelector('#battle-status');
        statusEl.textContent = `종료: ${result}`;
    }
}
