// 전투 컨트롤 UI (우상단)
// 배속 버튼 (1x, 2x, 4x, 8x), 자동전투 토글, 일시정지 버튼

export default class BattleControlUI {
    constructor(scene, battleManager) {
        this.scene = scene;
        this.battleManager = battleManager;
        this.currentSpeed = 1;
        this.speedOptions = [1, 2, 4, 8];
        this.domElement = null;

        this.create();
    }

    create() {
        const html = `
            <style>
                #battle-control {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    font-family: Arial, sans-serif;
                }
                #battle-control button {
                    padding: 8px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    transition: all 0.2s;
                    min-width: 80px;
                }
                #battle-control button:hover {
                    transform: scale(1.05);
                }
                #battle-control button:active {
                    transform: scale(0.95);
                }
                .speed-buttons {
                    display: flex;
                    gap: 4px;
                }
                .speed-btn {
                    background: rgba(50, 50, 50, 0.9);
                    color: #aaa;
                    border: 2px solid #444 !important;
                    padding: 6px 10px !important;
                    min-width: 45px !important;
                }
                .speed-btn.active {
                    background: rgba(255, 150, 50, 0.9);
                    color: #fff;
                    border-color: #ff9900 !important;
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
                    font-size: 12px;
                    color: #aaa;
                    text-align: center;
                    padding: 4px;
                    background: rgba(0,0,0,0.5);
                    border-radius: 4px;
                }
            </style>
            <div id="battle-control">
                <div class="speed-buttons">
                    <button class="speed-btn active" data-speed="1">1x</button>
                    <button class="speed-btn" data-speed="2">2x</button>
                    <button class="speed-btn" data-speed="4">4x</button>
                    <button class="speed-btn" data-speed="8">8x</button>
                </div>
                <button id="auto-btn" class="control-btn">▶ AUTO</button>
                <button id="pause-btn" class="control-btn">⏸ PAUSE</button>
                <div id="battle-status">대기 중</div>
            </div>
        `;

        // 우상단 배치
        this.domElement = this.scene.add.dom(1200, 20).createFromHTML(html);
        this.domElement.setOrigin(0.5, 0);
        this.domElement.setDepth(2000);

        this.setupEventListeners();
    }

    setupEventListeners() {
        const container = this.domElement.node;

        // 배속 버튼들
        const speedBtns = container.querySelectorAll('.speed-btn');
        speedBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const speed = parseInt(btn.dataset.speed);
                this.setSpeed(speed);
            });
        });

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

    setSpeed(speed) {
        this.currentSpeed = speed;

        // 버튼 UI 업데이트
        const speedBtns = this.domElement.node.querySelectorAll('.speed-btn');
        speedBtns.forEach(btn => {
            const btnSpeed = parseInt(btn.dataset.speed);
            btn.classList.toggle('active', btnSpeed === speed);
        });

        // BattleManager 딜레이 조정
        if (this.battleManager) {
            this.battleManager.turnDelay = 1500 / speed;
        }

        this.updateStatus();
    }

    toggleAuto() {
        if (!this.battleManager) return;

        const autoBtn = this.domElement.node.querySelector('#auto-btn');

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

        const pauseBtn = this.domElement.node.querySelector('#pause-btn');
        const isPaused = this.battleManager.togglePause();

        pauseBtn.classList.toggle('paused', isPaused);
        pauseBtn.textContent = isPaused ? '▶ RESUME' : '⏸ PAUSE';

        this.updateStatus();
    }

    updateStatus() {
        const statusEl = this.domElement.node.querySelector('#battle-status');
        if (!this.battleManager) {
            statusEl.textContent = '대기 중';
            return;
        }

        let status = '';
        if (!this.battleManager.isRunning) {
            status = '대기 중';
        } else if (this.battleManager.isPaused) {
            status = '⏸ 일시정지';
        } else if (this.battleManager.autoMode) {
            status = `▶ 자동 전투 (${this.currentSpeed}x)`;
        } else {
            status = '수동 모드';
        }

        statusEl.textContent = status;
    }

    // 전투 종료 시 호출
    onBattleEnd(result) {
        const autoBtn = this.domElement.node.querySelector('#auto-btn');
        const pauseBtn = this.domElement.node.querySelector('#pause-btn');

        autoBtn.classList.remove('active');
        autoBtn.textContent = '▶ AUTO';
        pauseBtn.classList.remove('paused');
        pauseBtn.textContent = '⏸ PAUSE';

        const statusEl = this.domElement.node.querySelector('#battle-status');
        statusEl.textContent = `전투 종료: ${result}`;
    }
}
