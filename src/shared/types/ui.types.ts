import Phaser from 'phaser';

// ===== 공통 타입 =====

/** 2D 좌표 */
export interface Vector2 {
    x: number;
    y: number;
}

/** 가시성 모드 */
export type VisibilityMode = 'hidden' | 'scatter' | 'all';

// ===== FireflySystem 타입 =====

/** 반딧불 궤도 파라미터 */
export interface OrbitParams {
    a: number;           // X축 진폭
    b: number;           // Y축 진폭
    freqX: number;       // X 주파수
    freqY: number;       // Y 주파수
    phase: number;       // 위상
    speed: number;       // 속도
    noiseOffset: number; // 노이즈 오프셋
    damping: number;     // 감쇠
    inertia: number;     // 관성
}

/** 반딧불 트레일 위치 */
export interface TrailPosition {
    x: number;
    y: number;
}

/** 개별 반딧불 객체 */
export interface Firefly {
    sprite: Phaser.GameObjects.Arc | null;
    glow: Phaser.GameObjects.Arc | null;
    trail: Phaser.GameObjects.Graphics | null;
    isBig: boolean;
    size: number;
    color: number;
    orbitParams: OrbitParams;
    angle: number;
    worldAnchor: Vector2;
    worldPos: Vector2;
    relativePos: Vector2;
    targetPos: Vector2;
    velocity: Vector2;
    acceleration: Vector2;
    trailPositions: TrailPosition[];
    pulsePhase: number;
    isScattering: boolean;
    scatterStartTime: number;
}

/** FireflySystem 생성자 설정 */
export interface FireflySystemConfig {
    parentContainer?: Phaser.GameObjects.Container | null;
    maxAp?: number;
    currentAp?: number;
    fireflyOffsetY?: number;
    scatterDuration?: number;
    fadeStartTime?: number;
    boundaryMargin?: number;
    onApChanged?: ((newAp: number) => void) | null;
}

/** 반딧불 생성 옵션 */
export interface FireflyCreateOptions {
    worldAnchor?: Vector2;
    relativePos?: Vector2;
}

// ===== FieldStatusUI 타입 =====

/** FieldStatusUI 생성자 설정 */
export interface FieldStatusUIConfig {
    maxHp?: number;
    currentHp?: number;
    maxAp?: number;
    currentAp?: number;
    maxPp?: number;
    currentPp?: number;
    speed?: number;
    parentContainer?: Phaser.GameObjects.Container | null;
    isEnemy?: boolean;
    barWidth?: number;
    barHeight?: number;
    offsetY?: number;
}

/** 캐릭터 스프라이트 (Phaser 스프라이트 확장) */
export interface CharacterSprite extends Phaser.GameObjects.Sprite {
    statusBar?: FieldStatusUI;
}

// Forward declaration for circular reference
export interface FieldStatusUI {
    unit?: any;
    maxAp: number;
    currentAp: number;
    maxPp: number;
    currentPp: number;
    currentAction: number;
    container: Phaser.GameObjects.Container | null;
    fireflySystem: FireflySystem | null;

    update(delta: number): void;
    setHp(value: number, animate?: boolean): void;
    setAp(value: number, animate?: boolean): void;
    addAp(amount: number): void;
    setPp(value: number, animate?: boolean): void;
    setAction(value: number, animate?: boolean): void;
    addAction(amount: number): boolean;
    resetAction(): void;
    damage(amount: number): number;
    heal(amount: number): number;
    hide(): void;
    destroy(): void;
}

export interface FireflySystem {
    setVisibilityMode(mode: VisibilityMode): void;
    setAp(value: number, animate?: boolean): number;
    addAp(amount: number): number;
    getAp(): number;
    getMaxAp(): number;
    setLingeringMode(): void;
    update(delta: number): void;
    destroy(): void;
}
