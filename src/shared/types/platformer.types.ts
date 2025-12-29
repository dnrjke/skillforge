/**
 * SkillForge Platformer - 타입 정의
 * "비산 대시(Shatter Dash)" 기반 에너지 플랫포머
 */

// ===== 물리 설정 =====

export interface PhysicsConfig {
    gravity: number;           // 중력 (1200)
    fallGravityMultiplier: number;  // 낙하 시 중력 배율 (1.5)
    friction: number;          // 마찰/관성 (0.1 = 부드러운 정령 느낌)
    jumpVelocity: number;      // 기본 점프 속도 (-900, 기존 2배)
    jumpCutMultiplier: number; // 점프 버튼 떼면 속도 감쇠 비율 (0.4)
    maxFallSpeed: number;      // 최대 낙하 속도
    groundAccel: number;       // 지상 가속도
    airAccel: number;          // 공중 가속도
    airControl: number;        // 공중 조작 계수 (0.8)
}

export interface DashConfig {
    dashForce: number;         // 대시 추진력 (초기 폭발 속도 800)
    dashDuration: number;      // 대시 지속 시간 (ms)
    dashCooldown: number;      // 대시 쿨다운 (ms)
    fireflyCost: number;       // 반딧불 소모량 (1)
    easeOutFactor: number;     // Ease-out 감쇠 (0.92)
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

// ===== 반딧불 유영 시스템 (Orbit) =====

export interface OrbitParticle {
    sprite: Phaser.GameObjects.Sprite | null;
    baseAngle: number;         // 기본 각도 offset (파티클마다 다름)
    currentAngle: number;      // 현재 각도
    orbitRadius: number;       // 공전 반경
    orbitSpeed: number;        // 공전 속도
    bobAmplitude: number;      // 상하 진폭
    bobPhase: number;          // 상하 위상
    active: boolean;           // 활성 상태 (소모되면 false)
    returning: boolean;        // 대시 후 복귀 중
    lagPosition: { x: number; y: number };  // 대시 중 뒤처짐 위치
}

export interface OrbitConfig {
    particleCount: number;     // 파티클 개수 (5)
    baseRadius: number;        // 기본 공전 반경 (35)
    orbitSpeed: number;        // 공전 속도 (0.003 rad/ms)
    bobAmplitude: number;      // 상하 진폭 (4)
    bobFrequency: number;      // 상하 주파수 (0.005)
    dashLagFactor: number;     // 대시 중 뒤처짐 계수 (0.15)
    returnSpeed: number;       // 복귀 속도 (0.2)
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
    fallGravityMultiplier: 1.5,
    friction: 0.1,
    jumpVelocity: -900,        // 기존 -450의 2배
    jumpCutMultiplier: 0.4,    // 버튼 떼면 40%로 감쇠
    maxFallSpeed: 900,
    groundAccel: 1500,
    airAccel: 1200,
    airControl: 0.8
};

export const DEFAULT_DASH: DashConfig = {
    dashForce: 800,            // 폭발적인 초기 속도
    dashDuration: 180,
    dashCooldown: 50,
    fireflyCost: 1,
    easeOutFactor: 0.92        // 매 프레임 속도 * 0.92
};

export const DEFAULT_ORBIT: OrbitConfig = {
    particleCount: 5,
    baseRadius: 35,
    orbitSpeed: 0.003,
    bobAmplitude: 4,
    bobFrequency: 0.005,
    dashLagFactor: 0.15,
    returnSpeed: 0.2
};

export const DEFAULT_WALL_CLING: WallClingConfig = {
    clingDuration: 1500,
    slideSpeed: 50,
    wallJumpForceX: 350,
    wallJumpForceY: -400
};

export const DEFAULT_PLAYER_STATS: PlayerStats = {
    maxFireflies: 5,           // 5개 반딧불 유영
    currentFireflies: 5,
    moveSpeed: 200,
    canDoubleJump: false,
    canWallCling: true,
    canGlide: false
};
