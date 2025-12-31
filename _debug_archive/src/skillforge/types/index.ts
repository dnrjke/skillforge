/**
 * Skillforge Type Definitions
 * 모든 타입 정의의 단일 진실 공급원 (SSOT)
 *
 * MOBILE-FIRST ADAPTIVE LAYOUT
 * "태블릿은 다른 UI가 아니라, 더 여유 있는 모바일이다."
 */

// ============================================================================
// Device & Layout Types (Mobile-First Adaptive)
// ============================================================================

/**
 * 디바이스 클래스 (명시적 브레이크포인트)
 * - mobile: <= 480px width (기준 디바이스)
 * - tablet: 481px ~ 1024px width (확장된 모바일)
 * - NO DESKTOP CONCEPT
 */
export type DeviceClass = 'mobile' | 'tablet';

/**
 * 디바이스 브레이크포인트 (고정값, Claude 임의 변경 금지)
 */
export const DEVICE_BREAKPOINTS = {
    MOBILE_MAX: 480,
    TABLET_MIN: 481,
    TABLET_MAX: 1024,
} as const;

/**
 * 캔버스 논리 해상도 (9:16 Portrait, 고정)
 * Canvas는 항상 동일한 논리 해상도를 유지
 */
export const CANVAS_LOGICAL = {
    WIDTH: 360,
    HEIGHT: 640,
    ASPECT_RATIO: 9 / 16,
} as const;

// ============================================================================
// Layer System Types
// ============================================================================

export type LayerType = 'world' | 'display' | 'system';

export interface LayerConfig {
    id: string;
    zIndex: number;
    pointerEvents: boolean;
}

export const LAYER_CONFIG: Record<LayerType, LayerConfig> = {
    world: { id: 'world-layer', zIndex: 1, pointerEvents: true },
    display: { id: 'display-layer', zIndex: 500, pointerEvents: false },
    system: { id: 'system-layer', zIndex: 1000, pointerEvents: false },
};

// ============================================================================
// Unit & Formation Types
// ============================================================================

export interface Position {
    x: number;
    y: number;
}

export interface SlotPosition extends Position {
    slotIndex: number;
    label: string;
}

export type TeamType = 'ally' | 'enemy';

export interface UnitStats {
    hp: number;
    maxHp: number;
    ap: number;
    maxAp: number;
    speed: number;
    defense: number;
    attack: number;
}

export interface UnitData {
    id: string;
    name: string;
    className: string;
    stats: UnitStats;
    slotIndex: number;
    team: TeamType;
    spriteKey?: string;
    color?: string;
    exitPresentation?: ExitPresentationConfig;
}

// ============================================================================
// Exit Presentation Types
// "Exit Presentation은 사망 애니메이션이 아니라, 캐릭터 퇴장의 무대다.
//  전투는 물리로 끝나고, 감정은 연출로 마무리된다."
// ============================================================================

export type ExitReason = 'HP_ZERO' | 'FORCED_RETREAT' | 'SCRIPTED';

export type ExitPresentationType =
    | 'FALL'
    | 'FLOAT'
    | 'FLY_AWAY'
    | 'SLOW_DESCENT'
    | 'COMEDIC_EXIT'
    | 'FADE_OUT'
    | 'SHATTER';

export interface ExitPresentationConfig {
    type: ExitPresentationType;
    memorialAsset?: string;
    memorialDuration?: number;
    speedMultiplier?: number;
    exitSoundKey?: string;
    exitVoiceKey?: string;
}

export interface ExitContext {
    unitId: string;
    unitName: string;
    slotIndex: number;
    team: TeamType;
    reason: ExitReason;
    config: ExitPresentationConfig;
    startPosition: Position;
}

export type ExitPhase =
    | 'IDLE'
    | 'PLATFORM_DISSOLVE'
    | 'WORLD_EXIT'
    | 'MEMORIAL'
    | 'CLEANUP'
    | 'COMPLETE';

export interface ExitPresentationState {
    context: ExitContext;
    phase: ExitPhase;
    progress: number;
    startTime: number;
}

export const DEFAULT_EXIT_CONFIG: ExitPresentationConfig = {
    type: 'FALL',
    memorialDuration: 2000,
    speedMultiplier: 1.0,
};

// ============================================================================
// Battle System Types
// ============================================================================

export type BattleState = 'idle' | 'preparing' | 'running' | 'paused' | 'ended';

export interface BattleConfig {
    tickRate: number;
    simultaneousWindow: number;
    ctMaxValue: number;
}

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
    tickRate: 100,
    simultaneousWindow: 200,
    ctMaxValue: 100,
};

// ============================================================================
// Audio System Types
// ============================================================================

export type AudioChannel = 'bgm' | 'sfx' | 'system' | 'voice';

export interface AudioConfig {
    masterVolume: number;
    channelVolumes: Record<AudioChannel, number>;
    voiceLimitWindow: number;
    maxConcurrentSounds: number;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
    masterVolume: 0.8,
    channelVolumes: {
        bgm: 0.6,
        sfx: 0.8,
        system: 1.0,
        voice: 0.9,
    },
    voiceLimitWindow: 50,
    maxConcurrentSounds: 8,
};

// ============================================================================
// Screen & Layout Types (Mobile-First)
// ============================================================================

export interface ScreenDimensions {
    /** 실제 뷰포트 너비 */
    viewportWidth: number;
    /** 실제 뷰포트 높이 */
    viewportHeight: number;
    /** 캔버스 컨테이너 너비 */
    canvasWidth: number;
    /** 캔버스 컨테이너 높이 */
    canvasHeight: number;
    /** 현재 디바이스 클래스 */
    deviceClass: DeviceClass;
    /** Device Pixel Ratio */
    dpr: number;
    /** Safe Area Insets */
    safeArea: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
}

/**
 * 보드 설정 (논리 좌표 기반)
 * 모든 좌표는 CANVAS_LOGICAL 기준
 */
export interface BoardConfig {
    /** 보드 중심 X (논리 좌표) */
    centerX: number;
    /** 보드 중심 Y (논리 좌표) */
    centerY: number;
    /** 열 간격 (논리 픽셀) */
    columnGap: number;
    /** 행 간격 (논리 픽셀) */
    rowGap: number;
    /** 사선 오프셋 (논리 픽셀) */
    skewOffset: number;
}

// ============================================================================
// Render Types
// ============================================================================

export interface RenderableUnit {
    id: string;
    position: Position;
    size: { width: number; height: number };
    color: string;
    label: string;
    hp: number;
    maxHp: number;
    isAlive: boolean;
}

export interface SlotVisual {
    slotIndex: number;
    position: Position;
    size: { width: number; height: number };
    team: TeamType;
    occupied: boolean;
}

// ============================================================================
// Debug Types
// ============================================================================

export interface DebugConfig {
    showSlotLabels: boolean;
    showUnitLabels: boolean;
    showFPS: boolean;
    showLayerBorders: boolean;
    showCoordinates: boolean;
    showHitboxes: boolean;
    showDeviceInfo: boolean;
}

export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
    showSlotLabels: true,
    showUnitLabels: true,
    showFPS: true,
    showLayerBorders: false,
    showCoordinates: false,
    showHitboxes: false,
    showDeviceInfo: true,
};

// ============================================================================
// Event Types
// ============================================================================

export type GameEventType =
    | 'battle:start'
    | 'battle:end'
    | 'battle:pause'
    | 'battle:resume'
    | 'unit:action'
    | 'unit:damage'
    | 'unit:heal'
    | 'unit:death'
    | 'slot:empty'
    | 'device:resize';

export interface GameEvent {
    type: GameEventType;
    timestamp: number;
    data?: unknown;
}
