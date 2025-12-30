/**
 * Game - 메인 게임 루프 & 상태 머신
 *
 * Skillforge의 핵심 게임 컨트롤러
 * - 레이어 관리
 * - 시간 시스템
 * - 렌더링 시스템
 * - 오디오 시스템
 * - 디버그 시스템
 */

import { LayerManager } from './LayerManager';
import { TimeSystem } from './TimeSystem';
import { RenderSystem } from '../display/RenderSystem';
import { Layout } from '../display/Layout';
import { AudioManager } from '../audio/AudioManager';
import { DebugOverlay } from '../debug/DebugOverlay';
import { createDummyUnits } from '../data/UnitData';
import {
    BattleState,
    UnitData,
    DEFAULT_DEBUG_CONFIG,
    DebugConfig,
} from '../types';

export class Game {
    // Core Systems
    private layerManager: LayerManager;
    private timeSystem: TimeSystem;
    private renderSystem: RenderSystem;
    private layout: Layout;
    private audioManager: AudioManager;
    private debugOverlay: DebugOverlay;

    // Game State
    private _battleState: BattleState = 'idle';
    private allyUnits: UnitData[] = [];
    private enemyUnits: UnitData[] = [];

    // Debug
    private debugConfig: DebugConfig = { ...DEFAULT_DEBUG_CONFIG };

    // Singleton
    private static instance: Game | null = null;

    private constructor() {
        this.layerManager = new LayerManager();
        this.timeSystem = new TimeSystem();
        this.layout = new Layout();
        this.audioManager = new AudioManager();
        this.renderSystem = new RenderSystem(this.layerManager, this.layout);
        this.debugOverlay = new DebugOverlay(this.layerManager);
    }

    /**
     * Singleton 인스턴스 반환
     */
    public static getInstance(): Game {
        if (!Game.instance) {
            Game.instance = new Game();
        }
        return Game.instance;
    }

    /**
     * 게임 초기화
     */
    public async initialize(): Promise<void> {
        console.log('[Game] Initializing Skillforge Alpha...');

        try {
            // 1. 레이어 매니저 초기화
            this.layerManager.initialize();

            // 2. 레이아웃 시스템 초기화
            const dimensions = this.layerManager.dimensions;
            this.layout.initialize(dimensions.width, dimensions.height);

            // 3. 렌더 시스템 초기화
            this.renderSystem.initialize();

            // 4. 오디오 시스템 초기화
            await this.audioManager.initialize();

            // 5. 디버그 오버레이 초기화
            this.debugOverlay.initialize(this.debugConfig);

            // 6. 더미 데이터 로드
            this.loadDummyData();

            // 7. 시간 시스템 콜백 등록
            this.setupTimeCallbacks();

            // 8. 이벤트 리스너 설정
            this.setupEventListeners();

            // 9. UI 초기화
            this.initializeUI();

            console.log('[Game] Initialization complete!');

            // 초기 렌더링
            this.render();

        } catch (error) {
            console.error('[Game] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * 더미 데이터 로드
     */
    private loadDummyData(): void {
        const { allies, enemies } = createDummyUnits();
        this.allyUnits = allies;
        this.enemyUnits = enemies;

        // CT 초기화
        [...allies, ...enemies].forEach(unit => {
            this.timeSystem.initializeUnitCT(unit.id, Math.random() * 30);
        });

        console.log('[Game] Loaded dummy units:', {
            allies: allies.length,
            enemies: enemies.length
        });
    }

    /**
     * 시간 시스템 콜백 설정
     */
    private setupTimeCallbacks(): void {
        // 틱 콜백 (게임 로직)
        this.timeSystem.onTick((deltaTime, elapsed) => {
            this.update(deltaTime);
        });

        // 프레임 콜백 (렌더링)
        this.timeSystem.onFrame((deltaTime, elapsed) => {
            this.render();
            this.debugOverlay.updateFPS(deltaTime);
        });
    }

    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners(): void {
        // 화면 크기 변경 시 레이아웃 재계산
        window.addEventListener('resize', () => {
            const dimensions = this.layerManager.dimensions;
            this.layout.initialize(dimensions.width, dimensions.height);
        });

        // 터치/마우스 이벤트 (Canvas)
        const canvas = this.layerManager.getCanvas();
        canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        canvas.addEventListener('touchstart', this.handleCanvasTouch.bind(this), { passive: false });
    }

    /**
     * UI 초기화
     */
    private initializeUI(): void {
        // 테스트 인터페이스 버튼 생성
        const testUI = this.createTestInterface();
        const systemLayer = this.layerManager.getSystemLayer();
        if (systemLayer) {
            systemLayer.appendChild(testUI);
        }

        // 천사상 플레이스홀더 설정
        const angelBust = document.getElementById('angel-bust-placeholder');
        if (angelBust) {
            angelBust.innerHTML = `
                <div style="
                    width: 120px;
                    height: 160px;
                    background: linear-gradient(135deg, rgba(100,100,150,0.3), rgba(50,50,80,0.5));
                    border: 2px solid rgba(200,200,255,0.3);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(200,200,255,0.6);
                    font-size: 12px;
                    text-align: center;
                ">Angel Bust<br>(Layer 1)</div>
            `;
        }
    }

    /**
     * 테스트 인터페이스 생성
     */
    private createTestInterface(): HTMLDivElement {
        const container = document.createElement('div');
        container.id = 'test-interface';
        container.className = 'interactive';
        container.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            padding: 12px;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 1001;
        `;

        // 전투 시작/정지 버튼
        const battleBtn = this.createButton('Start Battle', () => {
            if (this._battleState === 'running') {
                this.pauseBattle();
                battleBtn.textContent = 'Resume Battle';
            } else {
                this.startBattle();
                battleBtn.textContent = 'Pause Battle';
            }
        });

        // 속도 조절 버튼
        const speedBtn = this.createButton('Speed: 1x', () => {
            const speeds = [1, 1.5, 2, 3];
            const currentIdx = speeds.indexOf(this.timeSystem.gameSpeed);
            const nextIdx = (currentIdx + 1) % speeds.length;
            this.timeSystem.gameSpeed = speeds[nextIdx];
            speedBtn.textContent = `Speed: ${speeds[nextIdx]}x`;
        });

        // 디버그 토글 버튼
        const debugBtn = this.createButton('Debug: ON', () => {
            this.debugConfig.showSlotLabels = !this.debugConfig.showSlotLabels;
            this.debugConfig.showUnitLabels = !this.debugConfig.showUnitLabels;
            this.debugOverlay.updateConfig(this.debugConfig);
            debugBtn.textContent = this.debugConfig.showSlotLabels ? 'Debug: ON' : 'Debug: OFF';
        });

        // 오디오 테스트 버튼
        const audioBtn = this.createButton('Test Audio', async () => {
            // 오디오 컨텍스트 활성화 (사용자 상호작용 필요)
            await this.audioManager.resume();
            this.audioManager.playTestTone('sfx', 440, 0.1);
        });

        container.appendChild(battleBtn);
        container.appendChild(speedBtn);
        container.appendChild(debugBtn);
        container.appendChild(audioBtn);

        return container;
    }

    /**
     * 버튼 생성 헬퍼
     */
    private createButton(text: string, onClick: () => void): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            padding: 8px 16px;
            background: rgba(80, 80, 120, 0.8);
            border: 1px solid rgba(150, 150, 200, 0.5);
            border-radius: 4px;
            color: white;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s;
        `;
        btn.addEventListener('mouseenter', () => {
            btn.style.background = 'rgba(100, 100, 150, 0.9)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'rgba(80, 80, 120, 0.8)';
        });
        btn.addEventListener('click', onClick);
        return btn;
    }

    /**
     * Canvas 클릭 핸들러
     */
    private handleCanvasClick(event: MouseEvent): void {
        const rect = this.layerManager.getCanvas().getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        console.log('[Game] Canvas click:', { x, y });

        // 슬롯 클릭 감지
        const clickedSlot = this.layout.getSlotAtPosition(x, y, 'ally');
        if (clickedSlot !== null) {
            console.log('[Game] Ally slot clicked:', clickedSlot);
        }

        const clickedEnemySlot = this.layout.getSlotAtPosition(x, y, 'enemy');
        if (clickedEnemySlot !== null) {
            console.log('[Game] Enemy slot clicked:', clickedEnemySlot);
        }
    }

    /**
     * Canvas 터치 핸들러
     */
    private handleCanvasTouch(event: TouchEvent): void {
        event.preventDefault();
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            const rect = this.layerManager.getCanvas().getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            console.log('[Game] Canvas touch:', { x, y });
        }
    }

    /**
     * 게임 업데이트 (틱마다 호출)
     */
    private update(deltaTime: number): void {
        if (this._battleState !== 'running') return;

        // CT 충전
        [...this.allyUnits, ...this.enemyUnits].forEach(unit => {
            if (unit.stats.hp > 0) {
                const newCT = this.timeSystem.chargeUnitCT(
                    unit.id,
                    unit.stats.speed,
                    deltaTime
                );

                // CT 100% 도달 시 행동 (간단한 데모)
                if (this.timeSystem.isUnitReady(unit.id)) {
                    this.executeUnitAction(unit);
                    this.timeSystem.resetUnitCT(unit.id);
                }
            }
        });
    }

    /**
     * 유닛 행동 실행 (데모)
     */
    private executeUnitAction(unit: UnitData): void {
        console.log(`[Game] ${unit.name} (${unit.team}) acts!`);

        // 간단한 공격 시뮬레이션
        const targets = unit.team === 'ally' ? this.enemyUnits : this.allyUnits;
        const aliveTargets = targets.filter(t => t.stats.hp > 0);

        if (aliveTargets.length > 0) {
            const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
            const damage = Math.floor(unit.stats.attack * (0.8 + Math.random() * 0.4));
            target.stats.hp = Math.max(0, target.stats.hp - damage);

            console.log(`[Game] ${unit.name} deals ${damage} damage to ${target.name} (HP: ${target.stats.hp}/${target.stats.maxHp})`);

            // 사망 처리
            if (target.stats.hp <= 0) {
                console.log(`[Game] ${target.name} has fallen!`);
                this.timeSystem.removeUnitCT(target.id);
            }
        }

        // 승리 조건 체크
        this.checkBattleEnd();
    }

    /**
     * 전투 종료 체크
     */
    private checkBattleEnd(): void {
        const allyAlive = this.allyUnits.some(u => u.stats.hp > 0);
        const enemyAlive = this.enemyUnits.some(u => u.stats.hp > 0);

        if (!allyAlive || !enemyAlive) {
            this._battleState = 'ended';
            this.timeSystem.pause();
            console.log(`[Game] Battle ended! Winner: ${allyAlive ? 'Allies' : 'Enemies'}`);
        }
    }

    /**
     * 렌더링
     */
    private render(): void {
        // Canvas 클리어
        this.layerManager.clearCanvas();

        // 배경 렌더링
        this.renderSystem.renderBackground();

        // 슬롯 렌더링
        this.renderSystem.renderSlots(this.layout.getAllSlots('ally'), 'ally');
        this.renderSystem.renderSlots(this.layout.getAllSlots('enemy'), 'enemy');

        // 유닛 렌더링
        this.renderSystem.renderUnits(this.allyUnits, 'ally', this.layout, this.timeSystem);
        this.renderSystem.renderUnits(this.enemyUnits, 'enemy', this.layout, this.timeSystem);

        // 디버그 오버레이
        if (this.debugConfig.showSlotLabels || this.debugConfig.showUnitLabels) {
            this.debugOverlay.render(
                this.layout,
                this.allyUnits,
                this.enemyUnits,
                this.timeSystem
            );
        }
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * 전투 시작
     */
    public startBattle(): void {
        if (this._battleState === 'running') return;

        // 유닛 HP 리셋 (테스트용)
        [...this.allyUnits, ...this.enemyUnits].forEach(unit => {
            unit.stats.hp = unit.stats.maxHp;
            this.timeSystem.initializeUnitCT(unit.id, Math.random() * 30);
        });

        this._battleState = 'running';
        this.timeSystem.resume();
        console.log('[Game] Battle started!');
    }

    /**
     * 전투 일시정지
     */
    public pauseBattle(): void {
        if (this._battleState !== 'running') return;

        this._battleState = 'paused';
        this.timeSystem.pause();
        console.log('[Game] Battle paused');
    }

    /**
     * 전투 재개
     */
    public resumeBattle(): void {
        if (this._battleState !== 'paused') return;

        this._battleState = 'running';
        this.timeSystem.resume();
        console.log('[Game] Battle resumed');
    }

    /**
     * 게임 루프 시작 (초기화 후 호출)
     */
    public run(): void {
        this.timeSystem.start();
        console.log('[Game] Game loop started');
    }

    /**
     * 현재 전투 상태
     */
    public get battleState(): BattleState {
        return this._battleState;
    }

    /**
     * 정리
     */
    public destroy(): void {
        this.timeSystem.stop();
        this.layerManager.destroy();
        this.audioManager.destroy();
        Game.instance = null;
    }
}
