// 전투 컨트롤 UI
// 우상단: 배속 뱃지 (여러 번 눌러서 변경)
// 우하단: 자동전투/일시정지 버튼

import { requestContainerFullscreen } from '../main.js';

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
        this.settingsModal = null;

        // 설정 상태 (localStorage에서 로드)
        this.settings = this.loadSettings();

        // 모바일 감지
        this.isMobile = this.detectMobile();
        this.scale = this.isMobile ? 1.0 : 1.0;

        this.createSpeedBadge();
        this.createSettingsButton();
        this.createControlPanel();
        this.createSettingsModal();
        this.applySettings();
    }

    loadSettings() {
        const defaults = {
            partyStatusMode: 'normal',  // normal, compact, hidden
            showBattleLog: true,
            showFireflies: true
        };
        try {
            const saved = localStorage.getItem('battleSettings');
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch (e) {
            return defaults;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('battleSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
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

        // CSS로 게임 컨테이너 기준 절대 위치 (설정 버튼 왼쪽에 배치)
        badge.style.cssText = `
            position: absolute;
            top: ${this.isMobile ? '5%' : '5.5%'};
            right: ${this.isMobile ? 'calc(4% + 58px)' : 'calc(3% + 60px)'};
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
            font-family: 'Alexandria', sans-serif;
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

    // 배속 버튼 옆 설정 버튼
    createSettingsButton() {
        const size = Math.round(50 * this.scale);
        const fontSize = Math.round(18 * this.scale);
        const borderWidth = Math.round(3 * this.scale);

        const btn = document.createElement('div');
        btn.id = 'settings-btn';
        btn.textContent = '⚙';

        btn.style.cssText = `
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
            font-size: ${fontSize}px;
            color: #fff;
            transition: all 0.15s;
            touch-action: manipulation;
            pointer-events: auto;
            z-index: 100;
        `;

        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(btn);
        this.settingsButtonElement = btn;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openSettingsModal();
        });

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.1)';
            btn.style.borderColor = '#88aaff';
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.borderColor = '#666';
        });

        btn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        }, { passive: true });

        btn.addEventListener('keydown', (e) => e.stopPropagation());
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
            font-family: 'Alexandria', sans-serif;
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
            // 전투 시작 + 전체 화면 트리거 (PC: Fullscreen API, 모바일: 주소표시줄 숨기기)
            requestContainerFullscreen();

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

    // ==========================================
    // 설정 모달
    // ==========================================

    createSettingsModal() {
        // 스타일 주입
        if (!document.getElementById('settings-modal-style')) {
            const style = document.createElement('style');
            style.id = 'settings-modal-style';
            style.textContent = `
                #settings-modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    display: none;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    pointer-events: auto;
                }

                #settings-modal-overlay.active {
                    display: flex;
                }

                #settings-modal {
                    background: linear-gradient(180deg, #2a2a3a 0%, #1a1a2a 100%);
                    border: 2px solid #555;
                    border-radius: 12px;
                    padding: 20px 24px;
                    min-width: 280px;
                    max-width: 90%;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                    font-family: 'Alexandria', sans-serif;
                    color: #fff;
                }

                #settings-modal h2 {
                    margin: 0 0 16px 0;
                    font-size: 18px;
                    text-align: center;
                    color: #ddd;
                    border-bottom: 1px solid #444;
                    padding-bottom: 12px;
                }

                .settings-section {
                    margin-bottom: 16px;
                }

                .settings-section label {
                    display: block;
                    font-size: 13px;
                    color: #aaa;
                    margin-bottom: 8px;
                }

                /* Segmented Control */
                .segmented-control {
                    display: flex;
                    background: #1a1a2a;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid #444;
                }

                .segmented-control button {
                    flex: 1;
                    padding: 10px 8px;
                    border: none;
                    background: transparent;
                    color: #888;
                    font-size: 12px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: 'Alexandria', sans-serif;
                }

                .segmented-control button:not(:last-child) {
                    border-right: 1px solid #444;
                }

                .segmented-control button:hover {
                    background: rgba(100, 150, 255, 0.1);
                    color: #aaa;
                }

                .segmented-control button.active {
                    background: linear-gradient(180deg, #4a6090 0%, #3a4a70 100%);
                    color: #fff;
                }

                /* Toggle Switch */
                .toggle-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                }

                .toggle-row span {
                    font-size: 14px;
                    color: #ccc;
                }

                .toggle-switch {
                    position: relative;
                    width: 48px;
                    height: 26px;
                    background: #333;
                    border-radius: 13px;
                    cursor: pointer;
                    transition: background 0.3s;
                    border: 1px solid #555;
                }

                .toggle-switch.active {
                    background: #4a8050;
                    border-color: #5a9060;
                }

                .toggle-switch::after {
                    content: '';
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 20px;
                    height: 20px;
                    background: #ddd;
                    border-radius: 50%;
                    transition: transform 0.3s;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }

                .toggle-switch.active::after {
                    transform: translateX(22px);
                }

                /* Close Button */
                #settings-close-btn {
                    display: block;
                    width: 100%;
                    margin-top: 16px;
                    padding: 12px;
                    border: none;
                    border-radius: 8px;
                    background: linear-gradient(180deg, #555 0%, #444 100%);
                    color: #fff;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: 'Alexandria', sans-serif;
                }

                #settings-close-btn:hover {
                    background: linear-gradient(180deg, #666 0%, #555 100%);
                }

                #settings-close-btn:active {
                    transform: scale(0.98);
                }
            `;
            document.head.appendChild(style);
        }

        // 모달 생성
        const overlay = document.createElement('div');
        overlay.id = 'settings-modal-overlay';
        overlay.innerHTML = `
            <div id="settings-modal">
                <h2>⚙ 설정</h2>

                <div class="settings-section">
                    <label>파티 현황판 모드</label>
                    <div class="segmented-control" id="party-status-mode">
                        <button data-mode="normal" class="${this.settings.partyStatusMode === 'normal' ? 'active' : ''}">Normal</button>
                        <button data-mode="compact" class="${this.settings.partyStatusMode === 'compact' ? 'active' : ''}">Compact</button>
                        <button data-mode="hidden" class="${this.settings.partyStatusMode === 'hidden' ? 'active' : ''}">Hidden</button>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="toggle-row">
                        <span>전투 로그 표시</span>
                        <div class="toggle-switch ${this.settings.showBattleLog ? 'active' : ''}" id="toggle-battle-log"></div>
                    </div>
                    <div class="toggle-row">
                        <span>AP 반딧불 표시</span>
                        <div class="toggle-switch ${this.settings.showFireflies ? 'active' : ''}" id="toggle-fireflies"></div>
                    </div>
                </div>

                <button id="settings-close-btn">닫기</button>
            </div>
        `;

        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(overlay);
        this.settingsModalElement = overlay;

        // 이벤트 리스너
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeSettingsModal();
            }
        });

        // PartyStatusUI 모드 선택
        const modeButtons = overlay.querySelectorAll('#party-status-mode button');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.partyStatusMode = btn.dataset.mode;
                this.saveSettings();
                this.applySettings();
            });
        });

        // 전투 로그 토글
        const logToggle = overlay.querySelector('#toggle-battle-log');
        logToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            logToggle.classList.toggle('active');
            this.settings.showBattleLog = logToggle.classList.contains('active');
            this.saveSettings();
            this.applySettings();
        });

        // 반딧불 토글
        const fireflyToggle = overlay.querySelector('#toggle-fireflies');
        fireflyToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            fireflyToggle.classList.toggle('active');
            this.settings.showFireflies = fireflyToggle.classList.contains('active');
            this.saveSettings();
            this.applySettings();
        });

        // 닫기 버튼
        overlay.querySelector('#settings-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeSettingsModal();
        });

        // ESC 키로 닫기
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSettingsModal();
            }
            e.stopPropagation();
        });
    }

    openSettingsModal() {
        if (this.settingsModalElement) {
            this.settingsModalElement.classList.add('active');
        }
    }

    closeSettingsModal() {
        if (this.settingsModalElement) {
            this.settingsModalElement.classList.remove('active');
        }
    }

    applySettings() {
        // 1. PartyStatusUI 모드 적용
        const battlefieldPanels = document.querySelectorAll('.battlefield-panel');
        battlefieldPanels.forEach(panel => {
            panel.classList.remove('mode-normal', 'mode-compact', 'mode-hidden');
            panel.classList.add(`mode-${this.settings.partyStatusMode}`);

            // hidden 모드는 display: none
            if (this.settings.partyStatusMode === 'hidden') {
                panel.style.display = 'none';
            } else {
                panel.style.display = '';
            }

            // compact 모드는 스케일 축소
            if (this.settings.partyStatusMode === 'compact') {
                panel.style.transform = 'scale(0.75)';
                panel.style.transformOrigin = panel.classList.contains('ally')
                    ? 'bottom left'
                    : 'bottom right';
            } else {
                panel.style.transform = '';
            }
        });

        // 2. 전투 로그 표시/숨김
        const logWindow = document.querySelector('#log-window-container');
        if (logWindow) {
            logWindow.style.display = this.settings.showBattleLog ? '' : 'none';
        }

        // 3. 게임 엔진에 이벤트 전달 (반딧불 등)
        if (this.scene && this.scene.events) {
            this.scene.events.emit('settingsChanged', this.settings);
        }

        // 4. 반딧불 표시/숨김 (Phaser 스프라이트)
        if (this.scene && this.scene.statusBars) {
            this.scene.statusBars.forEach(bar => {
                if (bar.fireflySystem && bar.fireflySystem.fireflies) {
                    bar.fireflySystem.fireflies.forEach(f => {
                        if (f.sprite) f.sprite.setVisible(this.settings.showFireflies);
                        if (f.glow) f.glow.setVisible(this.settings.showFireflies);
                        if (f.trail) f.trail.setVisible(this.settings.showFireflies);
                    });
                }
            });
        }
    }
}
