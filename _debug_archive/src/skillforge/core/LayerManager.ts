/**
 * LayerManager - 모바일 우선 레이어 컨트롤러
 *
 * MOBILE-FIRST ADAPTIVE LAYOUT
 * "태블릿은 다른 UI가 아니라, 더 여유 있는 모바일이다."
 *
 * 3단 레이어 구조:
 * - Layer 2 (System): z-index 1000 - 설정, 모달, 시스템 UI
 * - Layer 1 (Display): z-index 500 - 천사상, 스킬 팝업
 * - Layer 0 (World): z-index 1 - Canvas 전투 전장
 *
 * Canvas는 항상 9:16 비율의 고정 논리 해상도를 유지하며,
 * 화면 크기에 따라 확대/축소만 됨 (시야 확장 없음)
 */

import {
    DeviceClass,
    ScreenDimensions,
    CANVAS_LOGICAL,
    DEVICE_BREAKPOINTS,
} from '../types';

export class LayerManager {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private canvasContainer: HTMLDivElement | null = null;
    private displayLayer: HTMLDivElement | null = null;
    private systemLayer: HTMLDivElement | null = null;
    private deviceInfoElement: HTMLDivElement | null = null;

    private _dimensions: ScreenDimensions = {
        viewportWidth: 0,
        viewportHeight: 0,
        canvasWidth: CANVAS_LOGICAL.WIDTH,
        canvasHeight: CANVAS_LOGICAL.HEIGHT,
        deviceClass: 'mobile',
        dpr: 1,
        safeArea: { top: 0, bottom: 0, left: 0, right: 0 },
    };

    // 스케일 팩터 (논리 좌표 → 실제 픽셀)
    private _scale: number = 1;

    constructor() {
        this.handleResize = this.handleResize.bind(this);
    }

    /**
     * DOM 요소 초기화 및 레이어 설정
     */
    public initialize(): void {
        this.canvasContainer = document.querySelector('.canvas-container') as HTMLDivElement;
        this.canvas = document.getElementById('world-layer') as HTMLCanvasElement;
        this.displayLayer = document.getElementById('display-layer') as HTMLDivElement;
        this.systemLayer = document.getElementById('system-layer') as HTMLDivElement;
        this.deviceInfoElement = document.getElementById('debug-device-info') as HTMLDivElement;

        if (!this.canvas) {
            throw new Error('Canvas element #world-layer not found');
        }

        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Failed to get 2D context');
        }

        // Safe Area 값 읽기
        this.readSafeAreaInsets();

        // 초기 크기 설정
        this.handleResize();

        // 리사이즈 이벤트 리스너
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(this.handleResize, 100);
        });

        console.log('[LayerManager] Initialized (Mobile-First)', {
            device: this._dimensions.deviceClass,
            logical: `${CANVAS_LOGICAL.WIDTH}x${CANVAS_LOGICAL.HEIGHT}`,
            scale: this._scale.toFixed(2),
        });
    }

    /**
     * Safe Area Insets 읽기
     */
    private readSafeAreaInsets(): void {
        const testEl = document.createElement('div');
        testEl.style.cssText = `
            position: fixed;
            top: env(safe-area-inset-top, 0px);
            bottom: env(safe-area-inset-bottom, 0px);
            left: env(safe-area-inset-left, 0px);
            right: env(safe-area-inset-right, 0px);
            pointer-events: none;
            visibility: hidden;
        `;
        document.body.appendChild(testEl);

        const rect = testEl.getBoundingClientRect();
        this._dimensions.safeArea = {
            top: rect.top,
            bottom: window.innerHeight - rect.bottom,
            left: rect.left,
            right: window.innerWidth - rect.right,
        };

        document.body.removeChild(testEl);
    }

    /**
     * 디바이스 클래스 감지
     */
    private detectDeviceClass(width: number): DeviceClass {
        if (width <= DEVICE_BREAKPOINTS.MOBILE_MAX) {
            return 'mobile';
        }
        // 481 ~ 1024 is tablet, anything above is still treated as tablet (no desktop)
        return 'tablet';
    }

    /**
     * 화면 크기 변경 핸들러
     */
    private handleResize(): void {
        if (!this.canvas || !this.ctx || !this.canvasContainer) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;

        // 디바이스 클래스 감지
        const deviceClass = this.detectDeviceClass(viewportWidth);

        // 캔버스 컨테이너 실제 크기 계산 (9:16 비율 유지)
        const containerRect = this.canvasContainer.getBoundingClientRect();
        const canvasWidth = containerRect.width;
        const canvasHeight = containerRect.height;

        // 스케일 팩터 계산 (논리 좌표 → 실제 픽셀)
        this._scale = Math.min(
            canvasWidth / CANVAS_LOGICAL.WIDTH,
            canvasHeight / CANVAS_LOGICAL.HEIGHT
        );

        // 실제 캔버스 픽셀 크기 설정 (DPR 고려)
        this.canvas.width = CANVAS_LOGICAL.WIDTH * dpr;
        this.canvas.height = CANVAS_LOGICAL.HEIGHT * dpr;

        // CSS 크기는 컨테이너에 맞춤
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

        // Context 스케일 조정 (DPR 보정)
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Safe Area 재측정
        this.readSafeAreaInsets();

        // 화면 정보 업데이트
        this._dimensions = {
            viewportWidth,
            viewportHeight,
            canvasWidth,
            canvasHeight,
            deviceClass,
            dpr,
            safeArea: this._dimensions.safeArea,
        };

        // 디버그 정보 표시
        this.updateDeviceInfo();

        console.log('[LayerManager] Resized:', {
            device: deviceClass,
            viewport: `${viewportWidth}x${viewportHeight}`,
            canvas: `${canvasWidth.toFixed(0)}x${canvasHeight.toFixed(0)}`,
            scale: this._scale.toFixed(2),
        });
    }

    /**
     * 디바이스 정보 표시 업데이트
     */
    private updateDeviceInfo(): void {
        if (!this.deviceInfoElement) return;

        const { deviceClass, viewportWidth, viewportHeight, dpr } = this._dimensions;
        this.deviceInfoElement.textContent =
            `${deviceClass.toUpperCase()} | ${viewportWidth}x${viewportHeight} | DPR:${dpr.toFixed(1)} | Scale:${this._scale.toFixed(2)}`;
    }

    /**
     * 논리 좌표를 실제 Canvas 좌표로 변환
     */
    public logicalToCanvas(x: number, y: number): { x: number; y: number } {
        return {
            x: x * this._scale,
            y: y * this._scale,
        };
    }

    /**
     * 실제 Canvas 좌표를 논리 좌표로 변환
     */
    public canvasToLogical(x: number, y: number): { x: number; y: number } {
        return {
            x: x / this._scale,
            y: y / this._scale,
        };
    }

    /**
     * 스크린 좌표(이벤트)를 논리 좌표로 변환
     */
    public screenToLogical(screenX: number, screenY: number): { x: number; y: number } {
        if (!this.canvas) return { x: 0, y: 0 };

        const rect = this.canvas.getBoundingClientRect();
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;

        // Canvas 내 비율로 논리 좌표 계산
        return {
            x: (canvasX / rect.width) * CANVAS_LOGICAL.WIDTH,
            y: (canvasY / rect.height) * CANVAS_LOGICAL.HEIGHT,
        };
    }

    /**
     * Canvas 2D Context 반환
     */
    public getContext(): CanvasRenderingContext2D {
        if (!this.ctx) {
            throw new Error('Canvas context not initialized');
        }
        return this.ctx;
    }

    /**
     * Canvas 요소 반환
     */
    public getCanvas(): HTMLCanvasElement {
        if (!this.canvas) {
            throw new Error('Canvas not initialized');
        }
        return this.canvas;
    }

    /**
     * 화면 정보 반환
     */
    public get dimensions(): ScreenDimensions {
        return { ...this._dimensions };
    }

    /**
     * 현재 스케일 팩터
     */
    public get scale(): number {
        return this._scale;
    }

    /**
     * 논리 캔버스 크기 (고정값)
     */
    public get logicalSize(): { width: number; height: number } {
        return {
            width: CANVAS_LOGICAL.WIDTH,
            height: CANVAS_LOGICAL.HEIGHT,
        };
    }

    /**
     * Display Layer에 요소 추가
     */
    public addToDisplayLayer(element: HTMLElement): void {
        if (!this.displayLayer) return;
        this.displayLayer.appendChild(element);
    }

    /**
     * System Layer에 요소 추가
     */
    public addToSystemLayer(element: HTMLElement): void {
        if (!this.systemLayer) return;
        this.systemLayer.appendChild(element);
    }

    /**
     * Display Layer 참조 반환
     */
    public getDisplayLayer(): HTMLDivElement | null {
        return this.displayLayer;
    }

    /**
     * System Layer 참조 반환
     */
    public getSystemLayer(): HTMLDivElement | null {
        return this.systemLayer;
    }

    /**
     * Canvas 클리어 (논리 해상도 기준)
     */
    public clearCanvas(): void {
        if (!this.ctx) return;

        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
        this.ctx.restore();

        // DPR 스케일 복원
        const dpr = this._dimensions.dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /**
     * 정리 (이벤트 리스너 제거)
     */
    public destroy(): void {
        window.removeEventListener('resize', this.handleResize);
    }
}
