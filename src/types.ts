/**
 * Skillforge: Air-Sport - Type Definitions
 *
 * 헌법 준수:
 * - DeviceClass: mobile | tablet (§4)
 * - 프로토타입 전용 타입들
 */

// ============================================
// Device & Layout Types
// ============================================

export type DeviceClass = 'mobile' | 'tablet';

export function detectDevice(): DeviceClass {
    return window.innerWidth >= 768 ? 'tablet' : 'mobile';
}

// ============================================
// Scenario Types
// ============================================

export type ScenarioStepType = 'text' | 'event' | 'choice' | 'cutscene';

export interface ScenarioStep {
    type: ScenarioStepType;
    text?: string;
    speaker?: string;
    bg?: string;
    bgm?: string;
    sfx?: string;
    gif?: string;
    event?: string;
    duration?: number;
}

export interface ScenarioSequence {
    id: string;
    name: string;
    steps: ScenarioStep[];
}

// ============================================
// Character Types
// ============================================

export interface Character {
    id: string;
    name: string;
    role: 'player' | 'flyer' | 'npc';
    bustImage?: string;
    color?: string;
}

// ============================================
// Flight/Game Types (프로토타입 전용)
// ============================================

export interface FlightPosition {
    x: number;
    y: number;
    slotIndex: number;
}

export interface FlightUnit {
    id: string;
    characterId: string;
    slotIndex: number;
    team: 'ally' | 'opponent';
}

// ============================================
// Audio Types
// ============================================

export type AudioChannel = 'bgm' | 'sfx' | 'ambient' | 'ui';

export interface AudioConfig {
    masterVolume: number;
    channelVolumes: Record<AudioChannel, number>;
    maxConcurrentSfx: number;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
    masterVolume: 1.0,
    channelVolumes: {
        bgm: 0.7,
        sfx: 0.8,
        ambient: 0.5,
        ui: 0.6,
    },
    maxConcurrentSfx: 8,
};

// ============================================
// Game State
// ============================================

export type GamePhase = 'splash' | 'title' | 'scenario' | 'flight' | 'result';

export interface GameState {
    phase: GamePhase;
    deviceClass: DeviceClass;
    audioResumed: boolean;
    debugMode: boolean;
}
