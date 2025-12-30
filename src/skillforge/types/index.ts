/**
 * Skillforge Type Definitions
 * 모든 타입 정의의 단일 진실 공급원
 */

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
}

// ============================================================================
// Battle System Types
// ============================================================================

export type BattleState = 'idle' | 'preparing' | 'running' | 'paused' | 'ended';

export interface BattleConfig {
    tickRate: number;           // ms per tick
    simultaneousWindow: number; // 동시 발동 윈도우 (ms)
    ctMaxValue: number;         // CT 최대값 (100%)
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
    voiceLimitWindow: number;   // 동시 발음 제한 윈도우 (ms)
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
// Screen & Layout Types
// ============================================================================

export interface ScreenDimensions {
    width: number;
    height: number;
    aspectRatio: number;
    safeAreaTop: number;
    safeAreaBottom: number;
    safeAreaLeft: number;
    safeAreaRight: number;
}

export interface BoardConfig {
    centerX: number;
    centerY: number;
    columnGap: number;
    rowGap: number;
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
}

export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
    showSlotLabels: true,
    showUnitLabels: true,
    showFPS: true,
    showLayerBorders: false,
    showCoordinates: false,
    showHitboxes: false,
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
    | 'slot:empty';

export interface GameEvent {
    type: GameEventType;
    timestamp: number;
    data?: unknown;
}
