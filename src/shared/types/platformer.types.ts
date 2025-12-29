/**
 * SkillForge Platformer - 타입 정의
 * "비산 대시(Shatter Dash)" 기반 에너지 플랫포머
 */

// ===== 물리 설정 =====

export interface PhysicsConfig {
    gravity: number;           // 중력 (1200)
    friction: number;          // 마찰/관성 (0.1 = 부드러운 정령 느낌)
    jumpVelocity: number;      // 기본 점프 속도 (-450)
    maxFallSpeed: number;      // 최대 낙하 속도
    groundAccel: number;       // 지상 가속도
    airAccel: number;          // 공중 가속도
    airControl: number;        // 공중 조작 계수 (0.8)
}

export interface DashConfig {
    dashForce: number;         // 대시 추진력 (600)
    dashDuration: number;      // 대시 지속 시간 (ms)
    dashCooldown: number;      // 대시 쿨다운 (ms)
    fireflyCost: number;       // 반딧불 소모량 (1)
}

export interface WallClingConfig {
    clingDuration: number;     // 벽 지탱 최대 시간 (ms)
    slideSpeed: number;        // 벽 미끄러짐 속도
    wallJumpForceX: number;    // 벽점프 X 추진력
    wallJumpForceY: number;    // 벽점프 Y 추진력
}

// ===== 플레이어 상태 =====

export type PlayerState =
    | 'idle'
    | 'run'
    | 'jump'
    | 'fall'
    | 'dash'
    | 'wall_cling'
    | 'wall_jump'
    | 'landing'
    | 'hurt';

export type FacingDirection = 'left' | 'right';

export interface PlayerStats {
    maxFireflies: number;      // 최대 반딧불 수 (초기 2~3)
    currentFireflies: number;  // 현재 반딧불 수
    moveSpeed: number;         // 이동 속도
    canDoubleJump: boolean;    // 더블점프 해금 여부
    canWallCling: boolean;     // 벽 지탱 해금 여부
    canGlide: boolean;         // 활공 해금 여부
}

export interface PlayerInput {
    left: boolean;
    right: boolean;
    jump: boolean;
    jumpJustPressed: boolean;
    dash: boolean;
    dashJustPressed: boolean;
    down: boolean;
    interact: boolean;
}

// ===== 반딧불 시스템 =====

export interface FireflyState {
    current: number;
    max: number;
    rechargeRate: number;      // 초당 회복량 (지상에서만)
    rechargeDelay: number;     // 사용 후 회복 시작 딜레이 (ms)
    lastUsedTime: number;      // 마지막 사용 시간
}

// ===== 비산 대시 (Shatter Dash) =====

export type DashDirection =
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'up_left'
    | 'up_right'
    | 'down_left'
    | 'down_right';

export interface DashState {
    isDashing: boolean;
    dashDirection: DashDirection | null;
    dashTimeRemaining: number;
    canDash: boolean;
    cooldownRemaining: number;
}

// ===== 벽 지탱 (Wall Cling) =====

export interface WallClingState {
    isClinging: boolean;
    clingTimeRemaining: number;
    wallSide: 'left' | 'right' | null;
    fireflyAnchored: boolean;  // 반딧불이 벽에 붙어있는지
}

// ===== 적 마킹 시스템 =====

export interface MarkableEntity {
    id: string;
    x: number;
    y: number;
    isMarked: boolean;
    markCount: number;         // 마킹 횟수 (다중 마킹 가능)
}

export type MarkingMethod =
    | 'firefly_throw'          // 반딧불 투척
    | 'stomp'                  // 밟기
    | 'graze';                 // 스치기

export interface MarkingResult {
    target: MarkableEntity;
    method: MarkingMethod;
    bonusAp: number;           // 전투 시작 시 추가 AP
}

// ===== 레벨/맵 =====

export interface PlatformData {
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'solid' | 'one_way' | 'moving' | 'crumbling';
    properties?: Record<string, any>;
}

export interface LevelData {
    id: string;
    name: string;
    width: number;
    height: number;
    spawnPoint: { x: number; y: number };
    platforms: PlatformData[];
    enemies: Array<{ type: string; x: number; y: number }>;
    collectibles: Array<{ type: string; x: number; y: number }>;
    transitions: Array<{ to: string; x: number; y: number; width: number; height: number }>;
}

// ===== VFX =====

export interface ShatterEffect {
    x: number;
    y: number;
    direction: DashDirection;
    intensity: number;         // 1-3 (반딧불 개수에 따라)
    color: number;             // 0xFFCC44 등
}

export interface TrailParticle {
    x: number;
    y: number;
    alpha: number;
    scale: number;
    lifetime: number;
}

// ===== 게임 진행 =====

export interface PlatformerProgress {
    unlockedAbilities: string[];
    collectedKeywords: string[];
    visitedAreas: string[];
    totalFireflies: number;    // 영구적으로 확장된 반딧불 용량
}

// ===== 기본 설정값 =====

export const DEFAULT_PHYSICS: PhysicsConfig = {
    gravity: 1200,
    friction: 0.1,
    jumpVelocity: -450,
    maxFallSpeed: 800,
    groundAccel: 1500,
    airAccel: 1200,
    airControl: 0.8
};

export const DEFAULT_DASH: DashConfig = {
    dashForce: 600,
    dashDuration: 150,
    dashCooldown: 100,
    fireflyCost: 1
};

export const DEFAULT_WALL_CLING: WallClingConfig = {
    clingDuration: 1500,
    slideSpeed: 50,
    wallJumpForceX: 350,
    wallJumpForceY: -400
};

export const DEFAULT_PLAYER_STATS: PlayerStats = {
    maxFireflies: 3,
    currentFireflies: 3,
    moveSpeed: 200,
    canDoubleJump: false,
    canWallCling: true,
    canGlide: false
};
