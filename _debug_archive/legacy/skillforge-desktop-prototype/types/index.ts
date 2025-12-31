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
    exitPresentation?: ExitPresentationConfig;
}

// ============================================================================
// Exit Presentation Types
// "Exit Presentation은 사망 애니메이션이 아니라, 캐릭터 퇴장의 무대다.
//  전투는 물리로 끝나고, 감정은 연출로 마무리된다."
// ============================================================================

/**
 * 퇴장 사유 (Exit Reason)
 * - HP_ZERO: 체력 0으로 인한 전투 이탈
 * - FORCED_RETREAT: 강제 후퇴 (스킬 효과 등)
 * - SCRIPTED: 스크립트 연출에 의한 퇴장
 */
export type ExitReason = 'HP_ZERO' | 'FORCED_RETREAT' | 'SCRIPTED';

/**
 * 퇴장 연출 타입 (Exit Presentation Type)
 * - FALL: 발판 소멸 후 추락 (기본)
 * - FLOAT: 부유하며 사라짐 (마법사 등)
 * - FLY_AWAY: 날아서 퇴장 (비행 유닛)
 * - SLOW_DESCENT: 느린 하강 (우아한 퇴장)
 * - COMEDIC_EXIT: 개그 퇴장 (특수 캐릭터)
 * - FADE_OUT: 서서히 사라짐
 * - SHATTER: 파편화되며 소멸
 */
export type ExitPresentationType =
    | 'FALL'
    | 'FLOAT'
    | 'FLY_AWAY'
    | 'SLOW_DESCENT'
    | 'COMEDIC_EXIT'
    | 'FADE_OUT'
    | 'SHATTER';

/**
 * 퇴장 연출 설정 (캐릭터별)
 */
export interface ExitPresentationConfig {
    type: ExitPresentationType;
    /** 메모리얼 GIF/이미지 경로 (Layer 1에 표시) */
    memorialAsset?: string;
    /** 메모리얼 표시 시간 (ms) */
    memorialDuration?: number;
    /** 퇴장 연출 속도 배율 (1.0 = 기본) */
    speedMultiplier?: number;
    /** 퇴장 시 재생할 사운드 키 */
    exitSoundKey?: string;
    /** 퇴장 시 재생할 대사 키 */
    exitVoiceKey?: string;
}

/**
 * 퇴장 요청 컨텍스트 (시스템 내부용)
 */
export interface ExitContext {
    unitId: string;
    unitName: string;
    slotIndex: number;
    team: TeamType;
    reason: ExitReason;
    config: ExitPresentationConfig;
    /** 퇴장 시작 시 유닛 위치 */
    startPosition: Position;
}

/**
 * 퇴장 연출 단계
 */
export type ExitPhase =
    | 'IDLE'           // 대기
    | 'PLATFORM_DISSOLVE' // 발판 소멸 중
    | 'WORLD_EXIT'     // Layer 0 물리 연출 중
    | 'MEMORIAL'       // Layer 1 메모리얼 표시 중
    | 'CLEANUP'        // 정리 중
    | 'COMPLETE';      // 완료

/**
 * 퇴장 연출 상태
 */
export interface ExitPresentationState {
    context: ExitContext;
    phase: ExitPhase;
    progress: number;  // 0.0 ~ 1.0
    startTime: number;
}

/**
 * 기본 퇴장 연출 설정
 */
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
