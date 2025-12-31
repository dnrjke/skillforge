/**
 * DebugOverlay - 디버그 오버레이 시스템
 *
 * 디버그 정보 표시:
 * - 슬롯 번호 (유닛 인덱스 + 발판 번호)
 * - FPS 카운터
 * - 레이어 경계선
 * - 좌표 정보
 */

import { LayerManager } from '../core/LayerManager';
import { TimeSystem } from '../core/TimeSystem';
import { Layout } from '../display/Layout';
import { DebugConfig, UnitData, TeamType } from '../types';

export class DebugOverlay {
    private layerManager: LayerManager;
    private config: DebugConfig | null = null;

    // FPS 계산
    private frameCount: number = 0;
    private lastFPSUpdate: number = 0;
    private currentFPS: number = 0;

    // DOM 요소
    private fpsElement: HTMLDivElement | null = null;
    private infoElement: HTMLDivElement | null = null;

    constructor(layerManager: LayerManager) {
        this.layerManager = layerManager;
    }

    /**
     * 디버그 오버레이 초기화
     */
    public initialize(config: DebugConfig): void {
        this.config = config;

        // FPS 표시 요소 생성
        this.createFPSElement();

        // 정보 패널 생성
        this.createInfoPanel();

        console.log('[DebugOverlay] Initialized');
    }

    /**
     * FPS 표시 요소 생성
     */
    private createFPSElement(): void {
        this.fpsElement = document.createElement('div');
        this.fpsElement.id = 'debug-fps';
        this.fpsElement.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            padding: 4px 8px;
            background: rgba(0, 0, 0, 0.7);
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            border-radius: 4px;
            z-index: 1001;
            pointer-events: none;
        `;

        const systemLayer = this.layerManager.getSystemLayer();
        if (systemLayer) {
            systemLayer.appendChild(this.fpsElement);
        }
    }

    /**
     * 정보 패널 생성
     */
    private createInfoPanel(): void {
        this.infoElement = document.createElement('div');
        this.infoElement.id = 'debug-info';
        this.infoElement.style.cssText = `
            position: absolute;
            top: 40px;
            left: 10px;
            padding: 8px;
            background: rgba(0, 0, 0, 0.7);
            color: #ffffff;
            font-family: monospace;
            font-size: 10px;
            border-radius: 4px;
            z-index: 1001;
            pointer-events: none;
            max-width: 200px;
        `;

        const systemLayer = this.layerManager.getSystemLayer();
        if (systemLayer) {
            systemLayer.appendChild(this.infoElement);
        }
    }

    /**
     * FPS 업데이트
     */
    public updateFPS(deltaTime: number): void {
        this.frameCount++;

        const now = performance.now();
        if (now - this.lastFPSUpdate >= 1000) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.lastFPSUpdate = now;

            if (this.fpsElement && this.config?.showFPS) {
                this.fpsElement.textContent = `FPS: ${this.currentFPS}`;
                this.fpsElement.style.display = 'block';
            }
        }

        if (this.fpsElement && !this.config?.showFPS) {
            this.fpsElement.style.display = 'none';
        }
    }

    /**
     * 디버그 정보 렌더링
     */
    public render(
        layout: Layout,
        allyUnits: UnitData[],
        enemyUnits: UnitData[],
        timeSystem: TimeSystem
    ): void {
        if (!this.config) return;

        const ctx = this.layerManager.getContext();
        if (!ctx) return;

        // 슬롯 라벨 렌더링
        if (this.config.showSlotLabels) {
            this.renderSlotLabels(ctx, layout, 'ally');
            this.renderSlotLabels(ctx, layout, 'enemy');
        }

        // 유닛 라벨 렌더링
        if (this.config.showUnitLabels) {
            this.renderUnitLabels(ctx, layout, allyUnits, 'ally', timeSystem);
            this.renderUnitLabels(ctx, layout, enemyUnits, 'enemy', timeSystem);
        }

        // 레이어 경계선 렌더링
        if (this.config.showLayerBorders) {
            this.renderLayerBorders(ctx, layout);
        }

        // 정보 패널 업데이트
        this.updateInfoPanel(allyUnits, enemyUnits, timeSystem);
    }

    /**
     * 슬롯 라벨 렌더링
     */
    private renderSlotLabels(
        ctx: CanvasRenderingContext2D,
        layout: Layout,
        team: TeamType
    ): void {
        const slots = layout.getAllSlots(team);
        const { width: slotWidth, height: slotHeight } = layout.getSlotSize();

        for (const slot of slots) {
            // 슬롯 번호 표시
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 배경
            const labelX = slot.x;
            const labelY = slot.y + slotHeight / 2 + 10;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(labelX - 25, labelY - 8, 50, 16);

            // 텍스트
            ctx.fillStyle = team === 'ally' ? '#4488ff' : '#ff4444';
            ctx.fillText(`S${slot.slotIndex}`, labelX, labelY);
        }
    }

    /**
     * 유닛 라벨 렌더링
     */
    private renderUnitLabels(
        ctx: CanvasRenderingContext2D,
        layout: Layout,
        units: UnitData[],
        team: TeamType,
        timeSystem: TimeSystem
    ): void {
        const unitSize = layout.getUnitSize();

        for (const unit of units) {
            if (unit.stats.hp <= 0) continue;

            const pos = layout.getUnitPosition(unit.slotIndex, team);

            // 유닛 인덱스 표시
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const labelX = pos.x;
            const labelY = pos.y - unitSize.height / 2 - 20;

            // 배경
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(labelX - 35, labelY - 8, 70, 16);

            // 텍스트: [인덱스] 이름
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`[${unit.slotIndex}] ${unit.name}`, labelX, labelY);

            // CT 값 표시
            const ct = timeSystem.getUnitCT(unit.id);
            ctx.font = '10px monospace';
            ctx.fillStyle = ct >= 100 ? '#ffff00' : '#aaaaaa';
            ctx.fillText(`CT: ${Math.floor(ct)}%`, labelX, labelY + 12);
        }
    }

    /**
     * 레이어 경계선 렌더링
     */
    private renderLayerBorders(ctx: CanvasRenderingContext2D, layout: Layout): void {
        const { width, height } = layout.getScreenSize();
        const combatZone = layout.getCombatZone();

        // 전투 영역 표시
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(combatZone.x, combatZone.y, combatZone.width, combatZone.height);
        ctx.setLineDash([]);

        // 라벨
        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.textAlign = 'left';
        ctx.fillText('Combat Zone', combatZone.x + 5, combatZone.y + 15);

        // 화면 경계
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.2)';
        ctx.strokeRect(2, 2, width - 4, height - 4);
    }

    /**
     * 정보 패널 업데이트
     */
    private updateInfoPanel(
        allyUnits: UnitData[],
        enemyUnits: UnitData[],
        timeSystem: TimeSystem
    ): void {
        if (!this.infoElement || !this.config?.showUnitLabels) {
            if (this.infoElement) {
                this.infoElement.style.display = 'none';
            }
            return;
        }

        this.infoElement.style.display = 'block';

        const allyAlive = allyUnits.filter(u => u.stats.hp > 0).length;
        const enemyAlive = enemyUnits.filter(u => u.stats.hp > 0).length;

        const { width, height } = this.layerManager.dimensions;

        this.infoElement.innerHTML = `
            <div style="margin-bottom: 4px; color: #88ff88;">Screen: ${width}x${height}</div>
            <div style="margin-bottom: 4px; color: #4488ff;">Allies: ${allyAlive}/6</div>
            <div style="margin-bottom: 4px; color: #ff4444;">Enemies: ${enemyAlive}/6</div>
            <div style="color: #aaaaaa;">Speed: ${timeSystem.gameSpeed}x</div>
            <div style="color: #aaaaaa;">Tick: ${timeSystem.tickRate}ms</div>
        `;
    }

    /**
     * 설정 업데이트
     */
    public updateConfig(config: Partial<DebugConfig>): void {
        if (this.config) {
            this.config = { ...this.config, ...config };
        }
    }

    /**
     * 정리
     */
    public destroy(): void {
        if (this.fpsElement) {
            this.fpsElement.remove();
            this.fpsElement = null;
        }
        if (this.infoElement) {
            this.infoElement.remove();
            this.infoElement = null;
        }
    }
}
