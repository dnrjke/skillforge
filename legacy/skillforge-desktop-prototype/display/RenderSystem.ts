/**
 * RenderSystem - Canvas 드로잉 시스템
 *
 * Layer 0 (World) 렌더링 담당:
 * - 배경
 * - 발판 (반딧불 에너지체)
 * - 유닛 스프라이트
 * - 이펙트
 */

import { LayerManager } from '../core/LayerManager';
import { TimeSystem } from '../core/TimeSystem';
import { Layout } from './Layout';
import { SlotPosition, TeamType, UnitData } from '../types';

export class RenderSystem {
    private layerManager: LayerManager;
    private layout: Layout;
    private ctx: CanvasRenderingContext2D | null = null;

    // 애니메이션 시간
    private animationTime: number = 0;

    constructor(layerManager: LayerManager, layout: Layout) {
        this.layerManager = layerManager;
        this.layout = layout;
    }

    /**
     * 렌더 시스템 초기화
     */
    public initialize(): void {
        this.ctx = this.layerManager.getContext();
        console.log('[RenderSystem] Initialized');
    }

    /**
     * 배경 렌더링
     */
    public renderBackground(): void {
        if (!this.ctx) return;

        const { width, height } = this.layerManager.dimensions;

        // 그라데이션 배경 (어두운 심연)
        const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#0a0a15');
        gradient.addColorStop(0.5, '#151525');
        gradient.addColorStop(1, '#0d0d1a');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);

        // 반딧불 파티클 (배경 장식)
        this.renderBackgroundParticles(width, height);
    }

    /**
     * 배경 파티클 렌더링
     */
    private renderBackgroundParticles(width: number, height: number): void {
        if (!this.ctx) return;

        this.animationTime += 0.02;

        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            const seed = i * 1234.5678;
            const x = (Math.sin(seed + this.animationTime * 0.3) * 0.5 + 0.5) * width;
            const y = (Math.cos(seed * 0.7 + this.animationTime * 0.2) * 0.5 + 0.5) * height;
            const size = 1 + Math.sin(seed * 0.3 + this.animationTime) * 0.5;
            const alpha = 0.1 + Math.sin(seed * 0.5 + this.animationTime * 2) * 0.1;

            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(150, 200, 255, ${alpha})`;
            this.ctx.fill();
        }
    }

    /**
     * 슬롯(발판) 렌더링
     */
    public renderSlots(slots: SlotPosition[], team: TeamType): void {
        if (!this.ctx) return;

        const { width: slotWidth, height: slotHeight } = this.layout.getSlotSize();

        for (const slot of slots) {
            this.renderSlot(slot, slotWidth, slotHeight, team);
        }
    }

    /**
     * 개별 슬롯 렌더링 (반딧불 에너지체)
     */
    private renderSlot(
        slot: SlotPosition,
        width: number,
        height: number,
        team: TeamType
    ): void {
        if (!this.ctx) return;

        const x = slot.x - width / 2;
        const y = slot.y - height / 2;

        // 팀별 색상
        const baseColor = team === 'ally'
            ? { r: 100, g: 150, b: 255 }  // 파란색 계열
            : { r: 255, g: 100, b: 100 }; // 빨간색 계열

        // 반딧불 효과 (글로우)
        const glowIntensity = 0.3 + Math.sin(this.animationTime * 2 + slot.slotIndex) * 0.1;

        // 외곽 글로우
        const glowGradient = this.ctx.createRadialGradient(
            slot.x, slot.y, 0,
            slot.x, slot.y, width * 0.8
        );
        glowGradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${glowIntensity})`);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = glowGradient;
        this.ctx.fillRect(slot.x - width, slot.y - height, width * 2, height * 2);

        // 발판 본체 (평행사변형)
        const skew = width * 0.15;
        this.ctx.beginPath();
        this.ctx.moveTo(x + skew, y);
        this.ctx.lineTo(x + width + skew, y);
        this.ctx.lineTo(x + width - skew, y + height);
        this.ctx.lineTo(x - skew, y + height);
        this.ctx.closePath();

        // 반투명 채우기
        this.ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.2)`;
        this.ctx.fill();

        // 테두리
        this.ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.5)`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // 미세한 반딧불 파티클
        this.renderSlotParticles(slot, baseColor);
    }

    /**
     * 슬롯 내 반딧불 파티클
     */
    private renderSlotParticles(
        slot: SlotPosition,
        color: { r: number; g: number; b: number }
    ): void {
        if (!this.ctx) return;

        const particleCount = 5;
        for (let i = 0; i < particleCount; i++) {
            const seed = slot.slotIndex * 100 + i * 17.3;
            const offsetX = Math.sin(seed + this.animationTime * 3) * 15;
            const offsetY = Math.cos(seed * 1.3 + this.animationTime * 2) * 10;
            const size = 1 + Math.sin(seed * 0.7 + this.animationTime * 4) * 0.5;
            const alpha = 0.3 + Math.sin(seed + this.animationTime * 5) * 0.2;

            this.ctx.beginPath();
            this.ctx.arc(slot.x + offsetX, slot.y + offsetY, size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${color.r + 50}, ${color.g + 50}, ${color.b + 50}, ${alpha})`;
            this.ctx.fill();
        }
    }

    /**
     * 유닛 렌더링
     */
    public renderUnits(
        units: UnitData[],
        team: TeamType,
        layout: Layout,
        timeSystem: TimeSystem
    ): void {
        if (!this.ctx) return;

        for (const unit of units) {
            if (unit.stats.hp <= 0) continue; // 사망한 유닛 스킵

            const pos = layout.getUnitPosition(unit.slotIndex, team);
            const size = layout.getUnitSize();

            this.renderUnit(unit, pos.x, pos.y, size.width, size.height, team, timeSystem);
        }
    }

    /**
     * 개별 유닛 렌더링
     */
    private renderUnit(
        unit: UnitData,
        x: number,
        y: number,
        width: number,
        height: number,
        team: TeamType,
        timeSystem: TimeSystem
    ): void {
        if (!this.ctx) return;

        // 유닛 색상
        const color = unit.color || (team === 'ally' ? '#4488ff' : '#ff4444');

        // 유닛 본체 (간단한 사각형, 추후 스프라이트로 교체)
        const unitX = x - width / 2;
        const unitY = y - height / 2;

        // 그림자
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + height / 2, width / 2, height / 8, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 본체
        this.ctx.fillStyle = color;
        this.ctx.fillRect(unitX, unitY, width, height);

        // 테두리
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(unitX, unitY, width, height);

        // HP 바
        this.renderHPBar(x, y - height / 2 - 12, width, unit.stats.hp, unit.stats.maxHp);

        // CT 바
        const ct = timeSystem.getUnitCT(unit.id);
        this.renderCTBar(x, y - height / 2 - 6, width, ct, 100);
    }

    /**
     * HP 바 렌더링
     */
    private renderHPBar(
        x: number,
        y: number,
        width: number,
        current: number,
        max: number
    ): void {
        if (!this.ctx) return;

        const barWidth = width;
        const barHeight = 4;
        const barX = x - barWidth / 2;

        // 배경
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(barX, y, barWidth, barHeight);

        // HP
        const hpRatio = Math.max(0, Math.min(1, current / max));
        const hpColor = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
        this.ctx.fillStyle = hpColor;
        this.ctx.fillRect(barX, y, barWidth * hpRatio, barHeight);

        // 테두리
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, y, barWidth, barHeight);
    }

    /**
     * CT 바 렌더링
     */
    private renderCTBar(
        x: number,
        y: number,
        width: number,
        current: number,
        max: number
    ): void {
        if (!this.ctx) return;

        const barWidth = width;
        const barHeight = 3;
        const barX = x - barWidth / 2;

        // 배경
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(barX, y, barWidth, barHeight);

        // CT
        const ctRatio = Math.max(0, Math.min(1, current / max));
        this.ctx.fillStyle = ctRatio >= 1 ? '#ffff00' : '#8888ff';
        this.ctx.fillRect(barX, y, barWidth * ctRatio, barHeight);
    }

    /**
     * 텍스트 렌더링 헬퍼
     */
    public renderText(
        text: string,
        x: number,
        y: number,
        options: {
            font?: string;
            color?: string;
            align?: CanvasTextAlign;
            baseline?: CanvasTextBaseline;
            shadow?: boolean;
        } = {}
    ): void {
        if (!this.ctx) return;

        const {
            font = '12px sans-serif',
            color = '#ffffff',
            align = 'center',
            baseline = 'middle',
            shadow = false,
        } = options;

        this.ctx.font = font;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;

        if (shadow) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillText(text, x + 1, y + 1);
        }

        this.ctx.fillStyle = color;
        this.ctx.fillText(text, x, y);
    }

    /**
     * 컨텍스트 조회
     */
    public getContext(): CanvasRenderingContext2D | null {
        return this.ctx;
    }
}
