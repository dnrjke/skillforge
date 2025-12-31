/**
 * ExitPresentationSystem - 퇴장 연출 시스템
 *
 * "Exit Presentation은 사망 애니메이션이 아니라, 캐릭터 퇴장의 무대다.
 *  전투는 물리로 끝나고, 감정은 연출로 마무리된다."
 *
 * 설계 원칙:
 * 1. 퇴장 ≠ 사망: "전투에서 이탈했다"는 개념 유지
 * 2. 공통 트리거 + 캐릭터별 오버라이드
 * 3. 레이어 책임 분리:
 *    - Layer 0 (Canvas): 발판 소멸, 추락/이동 물리 연출
 *    - Layer 1 (HTML): 메모리얼 GIF, 컷인, 정적/반복 연출
 *    - Layer 2 (System): UI 흐름은 차단하지 않음
 *
 * 연출 단계:
 * 1. Trigger: HP 0 감지 → requestExit() 호출
 * 2. Platform Dissolve: 발판 소멸 연출
 * 3. World Exit: Canvas 기반 물리 연출 (추락/비행 등)
 * 4. Memorial: Layer 1에 메모리얼 표시
 * 5. Cleanup: 유닛 완전 제거, 전투 흐름 복귀
 */

import { LayerManager } from './LayerManager';
import { Layout } from '../display/Layout';
import {
    ExitContext,
    ExitPhase,
    ExitPresentationConfig,
    ExitPresentationState,
    ExitPresentationType,
    ExitReason,
    Position,
    TeamType,
    UnitData,
    DEFAULT_EXIT_CONFIG,
} from '../types';

/**
 * 퇴장 연출 핸들러 인터페이스
 * 각 ExitPresentationType에 대응하는 핸들러
 */
export interface ExitPresentationHandler {
    /** 핸들러가 처리하는 연출 타입 */
    readonly type: ExitPresentationType;

    /**
     * World Exit 연출 실행 (Layer 0)
     * @returns 연출 완료 시 resolve되는 Promise
     */
    playWorldExit(
        ctx: CanvasRenderingContext2D,
        context: ExitContext,
        progress: number
    ): void;

    /**
     * 연출 총 소요 시간 (ms)
     */
    getDuration(context: ExitContext): number;
}

/**
 * 퇴장 완료 콜백
 */
export type ExitCompleteCallback = (unitId: string) => void;

/**
 * ExitPresentationSystem
 * 캐릭터 퇴장 연출의 중앙 관리 시스템
 */
export class ExitPresentationSystem {
    private layerManager: LayerManager;
    private layout: Layout;

    // 활성 퇴장 연출 상태
    private activeExits: Map<string, ExitPresentationState> = new Map();

    // 핸들러 레지스트리
    private handlers: Map<ExitPresentationType, ExitPresentationHandler> = new Map();

    // 완료 콜백
    private onCompleteCallbacks: Set<ExitCompleteCallback> = new Set();

    // 메모리얼 컨테이너 (Layer 1)
    private memorialContainer: HTMLDivElement | null = null;

    // 타이밍 설정
    private readonly PHASE_DURATIONS = {
        PLATFORM_DISSOLVE: 500,  // 발판 소멸
        WORLD_EXIT_BASE: 1000,   // 기본 물리 연출
        MEMORIAL_DEFAULT: 2000,  // 기본 메모리얼 표시
        CLEANUP: 200,            // 정리
    };

    constructor(layerManager: LayerManager, layout: Layout) {
        this.layerManager = layerManager;
        this.layout = layout;

        // 기본 핸들러 등록
        this.registerDefaultHandlers();
    }

    /**
     * 시스템 초기화
     */
    public initialize(): void {
        // 메모리얼 컨테이너 생성 (Layer 1)
        this.createMemorialContainer();

        console.log('[ExitPresentationSystem] Initialized');
    }

    /**
     * 메모리얼 컨테이너 생성
     */
    private createMemorialContainer(): void {
        const displayLayer = this.layerManager.getDisplayLayer();
        if (!displayLayer) return;

        this.memorialContainer = document.createElement('div');
        this.memorialContainer.id = 'memorial-container';
        this.memorialContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        displayLayer.appendChild(this.memorialContainer);
    }

    /**
     * 기본 핸들러 등록
     */
    private registerDefaultHandlers(): void {
        // FALL 핸들러 (기본 추락)
        this.registerHandler({
            type: 'FALL',
            playWorldExit: (ctx, context, progress) => {
                this.renderFallExit(ctx, context, progress);
            },
            getDuration: () => this.PHASE_DURATIONS.WORLD_EXIT_BASE,
        });

        // FLOAT 핸들러 (부유하며 사라짐)
        this.registerHandler({
            type: 'FLOAT',
            playWorldExit: (ctx, context, progress) => {
                this.renderFloatExit(ctx, context, progress);
            },
            getDuration: () => this.PHASE_DURATIONS.WORLD_EXIT_BASE * 1.5,
        });

        // FLY_AWAY 핸들러 (날아서 퇴장)
        this.registerHandler({
            type: 'FLY_AWAY',
            playWorldExit: (ctx, context, progress) => {
                this.renderFlyAwayExit(ctx, context, progress);
            },
            getDuration: () => this.PHASE_DURATIONS.WORLD_EXIT_BASE * 0.8,
        });

        // SLOW_DESCENT 핸들러 (느린 하강)
        this.registerHandler({
            type: 'SLOW_DESCENT',
            playWorldExit: (ctx, context, progress) => {
                this.renderSlowDescentExit(ctx, context, progress);
            },
            getDuration: () => this.PHASE_DURATIONS.WORLD_EXIT_BASE * 2,
        });

        // COMEDIC_EXIT 핸들러 (개그 퇴장)
        this.registerHandler({
            type: 'COMEDIC_EXIT',
            playWorldExit: (ctx, context, progress) => {
                this.renderComedicExit(ctx, context, progress);
            },
            getDuration: () => this.PHASE_DURATIONS.WORLD_EXIT_BASE * 1.2,
        });

        // FADE_OUT 핸들러 (서서히 사라짐)
        this.registerHandler({
            type: 'FADE_OUT',
            playWorldExit: (ctx, context, progress) => {
                this.renderFadeOutExit(ctx, context, progress);
            },
            getDuration: () => this.PHASE_DURATIONS.WORLD_EXIT_BASE,
        });

        // SHATTER 핸들러 (파편화)
        this.registerHandler({
            type: 'SHATTER',
            playWorldExit: (ctx, context, progress) => {
                this.renderShatterExit(ctx, context, progress);
            },
            getDuration: () => this.PHASE_DURATIONS.WORLD_EXIT_BASE * 0.6,
        });
    }

    /**
     * 핸들러 등록
     */
    public registerHandler(handler: ExitPresentationHandler): void {
        this.handlers.set(handler.type, handler);
        console.log(`[ExitPresentationSystem] Registered handler: ${handler.type}`);
    }

    /**
     * 퇴장 요청
     * BattleSystem에서 HP 0 감지 시 호출
     */
    public requestExit(unit: UnitData, reason: ExitReason): void {
        if (this.activeExits.has(unit.id)) {
            console.warn(`[ExitPresentationSystem] Exit already in progress: ${unit.id}`);
            return;
        }

        const config = unit.exitPresentation ?? DEFAULT_EXIT_CONFIG;
        const startPosition = this.layout.getUnitPosition(unit.slotIndex, unit.team);

        const context: ExitContext = {
            unitId: unit.id,
            unitName: unit.name,
            slotIndex: unit.slotIndex,
            team: unit.team,
            reason,
            config,
            startPosition,
        };

        const state: ExitPresentationState = {
            context,
            phase: 'PLATFORM_DISSOLVE',
            progress: 0,
            startTime: performance.now(),
        };

        this.activeExits.set(unit.id, state);

        console.log(`[ExitPresentationSystem] Exit requested: ${unit.name} (${config.type})`);
    }

    /**
     * 완료 콜백 등록
     */
    public onComplete(callback: ExitCompleteCallback): () => void {
        this.onCompleteCallbacks.add(callback);
        return () => this.onCompleteCallbacks.delete(callback);
    }

    /**
     * 매 프레임 업데이트
     */
    public update(deltaTime: number): void {
        const now = performance.now();

        for (const [unitId, state] of this.activeExits) {
            this.updateExitState(state, now);

            if (state.phase === 'COMPLETE') {
                this.activeExits.delete(unitId);
                this.notifyComplete(unitId);
            }
        }
    }

    /**
     * 개별 퇴장 상태 업데이트
     */
    private updateExitState(state: ExitPresentationState, now: number): void {
        const elapsed = now - state.startTime;
        const { context } = state;
        const speedMultiplier = context.config.speedMultiplier ?? 1.0;

        switch (state.phase) {
            case 'PLATFORM_DISSOLVE': {
                const duration = this.PHASE_DURATIONS.PLATFORM_DISSOLVE / speedMultiplier;
                state.progress = Math.min(1, elapsed / duration);
                if (state.progress >= 1) {
                    this.transitionToPhase(state, 'WORLD_EXIT', now);
                }
                break;
            }

            case 'WORLD_EXIT': {
                const handler = this.handlers.get(context.config.type);
                const duration = (handler?.getDuration(context) ?? this.PHASE_DURATIONS.WORLD_EXIT_BASE) / speedMultiplier;
                state.progress = Math.min(1, (now - state.startTime) / duration);
                if (state.progress >= 1) {
                    if (context.config.memorialAsset) {
                        this.transitionToPhase(state, 'MEMORIAL', now);
                        this.showMemorial(context);
                    } else {
                        this.transitionToPhase(state, 'CLEANUP', now);
                    }
                }
                break;
            }

            case 'MEMORIAL': {
                const duration = (context.config.memorialDuration ?? this.PHASE_DURATIONS.MEMORIAL_DEFAULT) / speedMultiplier;
                state.progress = Math.min(1, (now - state.startTime) / duration);
                if (state.progress >= 1) {
                    this.hideMemorial(context.unitId);
                    this.transitionToPhase(state, 'CLEANUP', now);
                }
                break;
            }

            case 'CLEANUP': {
                const duration = this.PHASE_DURATIONS.CLEANUP / speedMultiplier;
                state.progress = Math.min(1, (now - state.startTime) / duration);
                if (state.progress >= 1) {
                    state.phase = 'COMPLETE';
                }
                break;
            }
        }
    }

    /**
     * 단계 전환
     */
    private transitionToPhase(state: ExitPresentationState, phase: ExitPhase, now: number): void {
        state.phase = phase;
        state.progress = 0;
        state.startTime = now;
        console.log(`[ExitPresentationSystem] ${state.context.unitName} → ${phase}`);
    }

    /**
     * 완료 알림
     */
    private notifyComplete(unitId: string): void {
        console.log(`[ExitPresentationSystem] Exit complete: ${unitId}`);
        this.onCompleteCallbacks.forEach(cb => cb(unitId));
    }

    /**
     * 렌더링 (Layer 0)
     */
    public render(ctx: CanvasRenderingContext2D): void {
        for (const state of this.activeExits.values()) {
            this.renderExitState(ctx, state);
        }
    }

    /**
     * 개별 퇴장 상태 렌더링
     */
    private renderExitState(ctx: CanvasRenderingContext2D, state: ExitPresentationState): void {
        const { context, phase, progress } = state;

        switch (phase) {
            case 'PLATFORM_DISSOLVE':
                this.renderPlatformDissolve(ctx, context, progress);
                break;

            case 'WORLD_EXIT': {
                const handler = this.handlers.get(context.config.type);
                if (handler) {
                    handler.playWorldExit(ctx, context, progress);
                }
                break;
            }
        }
    }

    // =========================================================================
    // 발판 소멸 렌더링
    // =========================================================================

    private renderPlatformDissolve(
        ctx: CanvasRenderingContext2D,
        context: ExitContext,
        progress: number
    ): void {
        const slot = this.layout.getSlotPosition(context.slotIndex, context.team);
        if (!slot) return;

        const { width: slotWidth, height: slotHeight } = this.layout.getSlotSize();
        const baseColor = context.team === 'ally'
            ? { r: 100, g: 150, b: 255 }
            : { r: 255, g: 100, b: 100 };

        // 소멸 효과: 알파 감소 + 파티클 분산
        const alpha = 1 - progress;
        const particleSpread = progress * 50;

        ctx.save();

        // 발판 페이드아웃
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
        ctx.fillRect(
            slot.x - slotWidth / 2,
            slot.y - slotHeight / 2,
            slotWidth,
            slotHeight
        );

        // 소멸 파티클
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const distance = particleSpread * (0.5 + Math.random() * 0.5);
            const px = slot.x + Math.cos(angle) * distance;
            const py = slot.y + Math.sin(angle) * distance;
            const size = 2 * (1 - progress);

            ctx.globalAlpha = alpha * 0.5;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${baseColor.r + 100}, ${baseColor.g + 100}, ${baseColor.b + 100})`;
            ctx.fill();
        }

        ctx.restore();
    }

    // =========================================================================
    // 퇴장 연출 렌더링 (각 타입별)
    // =========================================================================

    /**
     * FALL: 중력 추락
     */
    private renderFallExit(
        ctx: CanvasRenderingContext2D,
        context: ExitContext,
        progress: number
    ): void {
        const { startPosition } = context;
        const { height } = this.layout.getScreenSize();
        const unitSize = this.layout.getUnitSize();

        // 가속도 기반 추락
        const gravity = 2;
        const fallDistance = progress * progress * gravity * height;
        const currentY = startPosition.y + fallDistance;

        // 회전 효과
        const rotation = progress * Math.PI * 2;

        ctx.save();
        ctx.translate(startPosition.x, currentY);
        ctx.rotate(rotation);
        ctx.globalAlpha = 1 - progress * 0.5;

        // 유닛 실루엣
        ctx.fillStyle = context.team === 'ally' ? '#4488ff' : '#ff4444';
        ctx.fillRect(-unitSize.width / 2, -unitSize.height / 2, unitSize.width, unitSize.height);

        ctx.restore();
    }

    /**
     * FLOAT: 부유하며 사라짐
     */
    private renderFloatExit(
        ctx: CanvasRenderingContext2D,
        context: ExitContext,
        progress: number
    ): void {
        const { startPosition } = context;
        const unitSize = this.layout.getUnitSize();

        // 위로 부유
        const floatHeight = progress * 100;
        const currentY = startPosition.y - floatHeight;

        // 좌우 흔들림
        const sway = Math.sin(progress * Math.PI * 4) * 20;
        const currentX = startPosition.x + sway;

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.globalAlpha = 1 - progress;
        ctx.scale(1 - progress * 0.3, 1 - progress * 0.3);

        ctx.fillStyle = context.team === 'ally' ? '#8888ff' : '#ff8888';
        ctx.fillRect(-unitSize.width / 2, -unitSize.height / 2, unitSize.width, unitSize.height);

        // 빛나는 파티클
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(
                (Math.random() - 0.5) * unitSize.width,
                (Math.random() - 0.5) * unitSize.height,
                3,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * (1 - progress)})`;
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * FLY_AWAY: 날아서 퇴장
     */
    private renderFlyAwayExit(
        ctx: CanvasRenderingContext2D,
        context: ExitContext,
        progress: number
    ): void {
        const { startPosition, team } = context;
        const { width } = this.layout.getScreenSize();
        const unitSize = this.layout.getUnitSize();

        // 팀에 따라 반대 방향으로 날아감
        const flyDirection = team === 'ally' ? -1 : 1;
        const flyDistance = progress * width * 0.8;
        const currentX = startPosition.x + flyDistance * flyDirection;

        // 약간 위로 상승
        const riseHeight = Math.sin(progress * Math.PI) * 50;
        const currentY = startPosition.y - riseHeight;

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.globalAlpha = 1 - progress * 0.8;
        ctx.scale(flyDirection, 1);

        ctx.fillStyle = context.team === 'ally' ? '#4488ff' : '#ff4444';
        ctx.fillRect(-unitSize.width / 2, -unitSize.height / 2, unitSize.width, unitSize.height);

        // 속도선
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * (1 - progress)})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-unitSize.width / 2 - 10 - i * 15, (i - 1) * 10);
            ctx.lineTo(-unitSize.width / 2 - 30 - i * 15, (i - 1) * 10);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * SLOW_DESCENT: 느린 하강
     */
    private renderSlowDescentExit(
        ctx: CanvasRenderingContext2D,
        context: ExitContext,
        progress: number
    ): void {
        const { startPosition } = context;
        const { height } = this.layout.getScreenSize();
        const unitSize = this.layout.getUnitSize();

        // 느린 선형 하강
        const fallDistance = progress * height * 0.5;
        const currentY = startPosition.y + fallDistance;

        // 페더 효과 (좌우 흔들림)
        const sway = Math.sin(progress * Math.PI * 6) * 30 * (1 - progress);
        const currentX = startPosition.x + sway;

        ctx.save();
        ctx.translate(currentX, currentY);
        ctx.globalAlpha = 1 - progress;

        ctx.fillStyle = context.team === 'ally' ? '#4488ff' : '#ff4444';
        ctx.fillRect(-unitSize.width / 2, -unitSize.height / 2, unitSize.width, unitSize.height);

        // 깃털 파티클
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * (1 - progress)})`;
        for (let i = 0; i < 3; i++) {
            const featherX = (Math.random() - 0.5) * unitSize.width * 2;
            const featherY = -progress * 50 + i * 20;
            ctx.beginPath();
            ctx.ellipse(featherX, featherY, 3, 8, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * COMEDIC_EXIT: 개그 퇴장
     */
    private renderComedicExit(
        ctx: CanvasRenderingContext2D,
        context: ExitContext,
        progress: number
    ): void {
        const { startPosition } = context;
        const { height } = this.layout.getScreenSize();
        const unitSize = this.layout.getUnitSize();

        // 튕기면서 퇴장
        const bounceCount = 3;
        const bouncePhase = progress * bounceCount * Math.PI;
        const bounceHeight = Math.abs(Math.sin(bouncePhase)) * 100 * (1 - progress);
        const fallDistance = progress * height * 0.6;

        const currentY = startPosition.y + fallDistance - bounceHeight;

        // 스핀
        const spin = progress * Math.PI * 4;

        // 스케일 변화 (찌그러짐)
        const squash = 1 + Math.sin(bouncePhase * 2) * 0.3;

        ctx.save();
        ctx.translate(startPosition.x, currentY);
        ctx.rotate(spin);
        ctx.scale(1 / squash, squash);
        ctx.globalAlpha = 1 - progress * 0.5;

        ctx.fillStyle = context.team === 'ally' ? '#4488ff' : '#ff4444';
        ctx.fillRect(-unitSize.width / 2, -unitSize.height / 2, unitSize.width, unitSize.height);

        // 만화적 효과선
        if (progress < 0.5) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = 3;
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * 30, Math.sin(angle) * 30);
                ctx.lineTo(Math.cos(angle) * 50, Math.sin(angle) * 50);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * FADE_OUT: 서서히 사라짐
     */
    private renderFadeOutExit(
        ctx: CanvasRenderingContext2D,
        context: ExitContext,
        progress: number
    ): void {
        const { startPosition } = context;
        const unitSize = this.layout.getUnitSize();

        ctx.save();
        ctx.translate(startPosition.x, startPosition.y);
        ctx.globalAlpha = 1 - progress;

        // 확대되면서 사라짐
        const scale = 1 + progress * 0.5;
        ctx.scale(scale, scale);

        ctx.fillStyle = context.team === 'ally' ? '#4488ff' : '#ff4444';
        ctx.fillRect(-unitSize.width / 2, -unitSize.height / 2, unitSize.width, unitSize.height);

        ctx.restore();
    }

    /**
     * SHATTER: 파편화
     */
    private renderShatterExit(
        ctx: CanvasRenderingContext2D,
        context: ExitContext,
        progress: number
    ): void {
        const { startPosition } = context;
        const unitSize = this.layout.getUnitSize();
        const color = context.team === 'ally' ? '#4488ff' : '#ff4444';

        // 파편 생성 (고정 시드 기반)
        const shardCount = 12;
        const shards: Array<{ x: number; y: number; size: number; angle: number; speed: number }> = [];

        for (let i = 0; i < shardCount; i++) {
            const seed = i * 12345.6789;
            shards.push({
                x: (Math.sin(seed) * 0.5) * unitSize.width,
                y: (Math.cos(seed * 1.3) * 0.5) * unitSize.height,
                size: 5 + (Math.sin(seed * 2.7) * 0.5 + 0.5) * 10,
                angle: (i / shardCount) * Math.PI * 2 + Math.sin(seed * 0.7) * 0.5,
                speed: 100 + (Math.sin(seed * 3.1) * 0.5 + 0.5) * 150,
            });
        }

        ctx.save();
        ctx.globalAlpha = 1 - progress;

        for (const shard of shards) {
            const px = startPosition.x + shard.x + Math.cos(shard.angle) * shard.speed * progress;
            const py = startPosition.y + shard.y + Math.sin(shard.angle) * shard.speed * progress + progress * progress * 200;
            const rotation = progress * Math.PI * 3;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(rotation + shard.angle);

            ctx.fillStyle = color;
            ctx.fillRect(-shard.size / 2, -shard.size / 2, shard.size, shard.size);

            ctx.restore();
        }

        ctx.restore();
    }

    // =========================================================================
    // 메모리얼 표시 (Layer 1)
    // =========================================================================

    /**
     * 메모리얼 표시
     */
    private showMemorial(context: ExitContext): void {
        if (!this.memorialContainer || !context.config.memorialAsset) return;

        const memorial = document.createElement('div');
        memorial.id = `memorial-${context.unitId}`;
        memorial.className = 'unit-memorial';
        memorial.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid ${context.team === 'ally' ? '#4488ff' : '#ff4444'};
            border-radius: 12px;
            padding: 20px;
            animation: memorial-appear 0.3s ease-out forwards;
            text-align: center;
        `;

        // 메모리얼 내용
        memorial.innerHTML = `
            <img src="${context.config.memorialAsset}" alt="${context.unitName}" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
            <div style="color: white; font-size: 16px; margin-top: 10px;">${context.unitName}</div>
            <div style="color: #888; font-size: 12px;">전장에서 이탈...</div>
        `;

        // CSS 애니메이션
        const style = document.createElement('style');
        style.textContent = `
            @keyframes memorial-appear {
                from { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            @keyframes memorial-disappear {
                from { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                to { transform: translate(-50%, -50%) scale(0); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        this.memorialContainer.appendChild(memorial);
    }

    /**
     * 메모리얼 숨김
     */
    private hideMemorial(unitId: string): void {
        const memorial = document.getElementById(`memorial-${unitId}`);
        if (memorial) {
            memorial.style.animation = 'memorial-disappear 0.3s ease-in forwards';
            setTimeout(() => memorial.remove(), 300);
        }
    }

    // =========================================================================
    // 유틸리티
    // =========================================================================

    /**
     * 퇴장 진행 중인 유닛 확인
     */
    public isExiting(unitId: string): boolean {
        return this.activeExits.has(unitId);
    }

    /**
     * 퇴장 진행 중인 유닛 목록
     */
    public getExitingUnits(): string[] {
        return Array.from(this.activeExits.keys());
    }

    /**
     * 모든 퇴장 연출 강제 종료
     */
    public forceCompleteAll(): void {
        for (const unitId of this.activeExits.keys()) {
            this.hideMemorial(unitId);
            this.notifyComplete(unitId);
        }
        this.activeExits.clear();
    }

    /**
     * 정리
     */
    public destroy(): void {
        this.forceCompleteAll();
        if (this.memorialContainer) {
            this.memorialContainer.remove();
            this.memorialContainer = null;
        }
    }
}
