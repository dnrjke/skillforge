/**
 * TimeSystem - CT(Charge Time) 및 게임 틱 관리
 *
 * MOBILE-FIRST ADAPTIVE LAYOUT
 * (시간 시스템은 레이아웃과 무관하게 동일하게 동작)
 *
 * 행동바(CT) 기반 순차 실행:
 * - 각 유닛은 Speed에 따라 CT 충전
 * - CT 100% 도달 시 행동 실행
 * - 0.2초 내 동시 발동 유닛은 그룹화
 */

import { BattleConfig, DEFAULT_BATTLE_CONFIG } from '../types';

export type TickCallback = (deltaTime: number, elapsedTime: number) => void;

export class TimeSystem {
    private config: BattleConfig;
    private isRunning: boolean = false;
    private isPaused: boolean = false;
    private lastTimestamp: number = 0;
    private elapsedTime: number = 0;
    private tickAccumulator: number = 0;
    private animationFrameId: number | null = null;

    private tickCallbacks: Set<TickCallback> = new Set();
    private frameCallbacks: Set<TickCallback> = new Set();

    // CT 시스템
    private unitCTs: Map<string, number> = new Map();

    // 게임 속도 (1.0 = 기본, 2.0 = 2배속)
    private _gameSpeed: number = 1.0;

    constructor(config: Partial<BattleConfig> = {}) {
        this.config = { ...DEFAULT_BATTLE_CONFIG, ...config };
        this.gameLoop = this.gameLoop.bind(this);
    }

    /**
     * 게임 루프 시작
     */
    public start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.lastTimestamp = performance.now();
        this.animationFrameId = requestAnimationFrame(this.gameLoop);

        console.log('[TimeSystem] Started');
    }

    /**
     * 게임 루프 정지
     */
    public stop(): void {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        console.log('[TimeSystem] Stopped');
    }

    /**
     * 일시 정지
     */
    public pause(): void {
        this.isPaused = true;
        console.log('[TimeSystem] Paused');
    }

    /**
     * 재개
     */
    public resume(): void {
        if (!this.isRunning) {
            this.start();
            return;
        }
        this.isPaused = false;
        this.lastTimestamp = performance.now();
        console.log('[TimeSystem] Resumed');
    }

    /**
     * 메인 게임 루프
     */
    private gameLoop(timestamp: number): void {
        if (!this.isRunning) return;

        const rawDeltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;

        // 게임 속도 적용
        const deltaTime = this.isPaused ? 0 : rawDeltaTime * this._gameSpeed;

        if (!this.isPaused) {
            this.elapsedTime += deltaTime;
            this.tickAccumulator += deltaTime;

            // 고정 틱 레이트 처리
            while (this.tickAccumulator >= this.config.tickRate) {
                this.tickAccumulator -= this.config.tickRate;
                this.processTick(this.config.tickRate);
            }
        }

        // 프레임 콜백 (렌더링용, 항상 호출)
        this.frameCallbacks.forEach(callback => {
            callback(rawDeltaTime, this.elapsedTime);
        });

        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }

    /**
     * 틱 처리 (고정 간격)
     */
    private processTick(deltaTime: number): void {
        this.tickCallbacks.forEach(callback => {
            callback(deltaTime, this.elapsedTime);
        });
    }

    /**
     * 틱 콜백 등록 (고정 간격, 게임 로직용)
     */
    public onTick(callback: TickCallback): () => void {
        this.tickCallbacks.add(callback);
        return () => this.tickCallbacks.delete(callback);
    }

    /**
     * 프레임 콜백 등록 (매 프레임, 렌더링용)
     */
    public onFrame(callback: TickCallback): () => void {
        this.frameCallbacks.add(callback);
        return () => this.frameCallbacks.delete(callback);
    }

    // =========================================================================
    // CT (Charge Time) 시스템
    // =========================================================================

    /**
     * 유닛 CT 초기화
     */
    public initializeUnitCT(unitId: string, initialCT: number = 0): void {
        this.unitCTs.set(unitId, Math.max(0, Math.min(initialCT, this.config.ctMaxValue)));
    }

    /**
     * 유닛 CT 충전 (Speed 기반)
     * @param unitId 유닛 ID
     * @param speed 유닛 속도
     * @param deltaTime 경과 시간 (ms)
     * @returns 현재 CT 값
     */
    public chargeUnitCT(unitId: string, speed: number, deltaTime: number): number {
        const currentCT = this.unitCTs.get(unitId) ?? 0;

        // CT 충전량 = (Speed / 100) * (deltaTime / tickRate) * ctPerTick
        const ctPerTick = 5; // 기본 틱당 CT 충전량
        const chargeAmount = (speed / 100) * (deltaTime / this.config.tickRate) * ctPerTick;

        const newCT = Math.min(currentCT + chargeAmount, this.config.ctMaxValue);
        this.unitCTs.set(unitId, newCT);

        return newCT;
    }

    /**
     * 유닛 CT 조회
     */
    public getUnitCT(unitId: string): number {
        return this.unitCTs.get(unitId) ?? 0;
    }

    /**
     * 유닛 CT가 100%인지 확인
     */
    public isUnitReady(unitId: string): boolean {
        return this.getUnitCT(unitId) >= this.config.ctMaxValue;
    }

    /**
     * 유닛 CT 리셋 (행동 후)
     */
    public resetUnitCT(unitId: string): void {
        this.unitCTs.set(unitId, 0);
    }

    /**
     * 동시 발동 윈도우 내 준비된 유닛 그룹 반환
     */
    public getReadyUnitsInWindow(unitIds: string[]): string[] {
        const readyUnits: string[] = [];

        for (const unitId of unitIds) {
            if (this.isUnitReady(unitId)) {
                readyUnits.push(unitId);
            }
        }

        return readyUnits;
    }

    /**
     * 유닛 CT 제거
     */
    public removeUnitCT(unitId: string): void {
        this.unitCTs.delete(unitId);
    }

    // =========================================================================
    // Getters & Setters
    // =========================================================================

    public get gameSpeed(): number {
        return this._gameSpeed;
    }

    public set gameSpeed(value: number) {
        this._gameSpeed = Math.max(0.1, Math.min(value, 5.0));
        console.log('[TimeSystem] Game speed:', this._gameSpeed);
    }

    public get running(): boolean {
        return this.isRunning;
    }

    public get paused(): boolean {
        return this.isPaused;
    }

    public get elapsed(): number {
        return this.elapsedTime;
    }

    public get tickRate(): number {
        return this.config.tickRate;
    }

    /**
     * 리셋
     */
    public reset(): void {
        this.stop();
        this.elapsedTime = 0;
        this.tickAccumulator = 0;
        this.unitCTs.clear();
    }
}
