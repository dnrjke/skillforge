/**
 * LayerManager - DOM & Canvas 레이어 컨트롤러
 *
 * 3단 레이어 구조:
 * - Layer 2 (System): z-index 1000 - 설정, 모달, 시스템 UI
 * - Layer 1 (Display): z-index 500 - 천사상, 스킬 팝업
 * - Layer 0 (World): z-index 1 - Canvas 전투 전장
 */

import { LayerType, LAYER_CONFIG, ScreenDimensions } from '../types';

export class LayerManager {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private displayLayer: HTMLDivElement | null = null;
    private systemLayer: HTMLDivElement | null = null;
    private container: HTMLDivElement | null = null;

    private _dimensions: ScreenDimensions = {
        width: 0,
        height: 0,
        aspectRatio: 9 / 16,
        safeAreaTop: 0,
        safeAreaBottom: 0,
        safeAreaLeft: 0,
        safeAreaRight: 0,
    };

    constructor() {
        this.handleResize = this.handleResize.bind(this);
    }

    /**
     * DOM 요소 초기화 및 레이어 설정
     */
    public initialize(): void {
        this.container = document.getElementById('app-container') as HTMLDivElement;
        this.canvas = document.getElementById('world-layer') as HTMLCanvasElement;
        this.displayLayer = document.getElementById('display-layer') as HTMLDivElement;
        this.systemLayer = document.getElementById('system-layer') as HTMLDivElement;

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
            // orientation 변경 후 약간의 딜레이 필요 (Safari)
            setTimeout(this.handleResize, 100);
        });

        console.log('[LayerManager] Initialized', this._dimensions);
    }

    /**
     * Safe Area Insets 읽기 (CSS env() 변수)
     */
    private readSafeAreaInsets(): void {
        const computedStyle = getComputedStyle(document.documentElement);

        // CSS custom properties에서 safe area 값 읽기
        const parseEnvValue = (value: string): number => {
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? 0 : parsed;
        };

        // 임시 요소로 env() 값 측정
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
        this._dimensions.safeAreaTop = rect.top;
        this._dimensions.safeAreaBottom = window.innerHeight - rect.bottom;
        this._dimensions.safeAreaLeft = rect.left;
        this._dimensions.safeAreaRight = window.innerWidth - rect.right;

        document.body.removeChild(testEl);
    }

    /**
     * 화면 크기 변경 핸들러
     */
    private handleResize(): void {
        if (!this.canvas || !this.ctx) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        // Canvas 크기 설정 (픽셀 밀도 고려)
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        // Context 스케일 조정
        this.ctx.scale(dpr, dpr);

        // Safe Area 재측정
        this.readSafeAreaInsets();

        // 화면 정보 업데이트
        this._dimensions.width = width;
        this._dimensions.height = height;
        this._dimensions.aspectRatio = width / height;

        console.log('[LayerManager] Resized:', {
            width,
            height,
            dpr,
            safeArea: {
                top: this._dimensions.safeAreaTop,
                bottom: this._dimensions.safeAreaBottom,
            }
        });
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
     * 화면 크기 정보 반환
     */
    public get dimensions(): ScreenDimensions {
        return { ...this._dimensions };
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
     * Canvas 클리어
     */
    public clearCanvas(): void {
        if (!this.ctx || !this.canvas) return;

        // DPR 고려하여 원본 크기로 클리어
        const dpr = window.devicePixelRatio || 1;
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    /**
     * 정리 (이벤트 리스너 제거)
     */
    public destroy(): void {
        window.removeEventListener('resize', this.handleResize);
    }
}
