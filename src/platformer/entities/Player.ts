/**
 * Player - 비산 대시(Shatter Dash) 기반 플레이어
 *
 * 핵심 메커니즘:
 * - 부드러운 관성 기반 이동 (정령의 느낌)
 * - 반딧불(AP) 소모로 공중 대시 → 폭발적 가속
 * - 지상에 닿으면 반딧불 즉시 회복
 * - 벽에 반딧불이 붙어 캐릭터 지탱
 */

import Phaser from 'phaser';
import type {
    PlayerState,
    FacingDirection,
    PlayerStats,
    PlayerInput,
    FireflyState,
    DashState,
    DashDirection,
    WallClingState,
    PhysicsConfig,
    DashConfig,
    WallClingConfig
} from '../../shared/types/platformer.types';
import {
    DEFAULT_PHYSICS,
    DEFAULT_DASH,
    DEFAULT_WALL_CLING,
    DEFAULT_PLAYER_STATS
} from '../../shared/types/platformer.types';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    // 설정
    private physicsConfig: PhysicsConfig;
    private dashConfig: DashConfig;
    private wallClingConfig: WallClingConfig;

    // 상태
    private playerState: PlayerState = 'idle';
    private facing: FacingDirection = 'right';
    private stats: PlayerStats;

    // 반딧불 시스템
    private firefly: FireflyState;

    // 대시 상태
    private dash: DashState;

    // 벽 지탱 상태
    private wallCling: WallClingState;

    // 입력 상태
    private input: PlayerInput;

    // 물리 상태
    private isGrounded: boolean = false;
    private wasGrounded: boolean = false;
    private isTouchingWall: boolean = false;
    private wallDirection: 'left' | 'right' | null = null;

    // 점프 상태
    private jumpCount: number = 0;
    private maxJumps: number = 1;
    private coyoteTime: number = 0;
    private coyoteTimeDuration: number = 80; // ms
    private jumpBufferTime: number = 0;
    private jumpBufferDuration: number = 100; // ms

    // 애니메이션/VFX 콜백
    public onShatterDash: ((x: number, y: number, direction: DashDirection) => void) | null = null;
    public onLand: ((x: number, y: number) => void) | null = null;
    public onWallCling: ((x: number, y: number, side: 'left' | 'right') => void) | null = null;
    public onFireflyRecover: ((count: number) => void) | null = null;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string = 'player',
        frame?: string | number
    ) {
        super(scene, x, y, texture, frame);

        // 씬에 추가
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // 설정 초기화
        this.physicsConfig = { ...DEFAULT_PHYSICS };
        this.dashConfig = { ...DEFAULT_DASH };
        this.wallClingConfig = { ...DEFAULT_WALL_CLING };
        this.stats = { ...DEFAULT_PLAYER_STATS };

        // 반딧불 초기화
        this.firefly = {
            current: this.stats.maxFireflies,
            max: this.stats.maxFireflies,
            rechargeRate: 1,
            rechargeDelay: 500,
            lastUsedTime: 0
        };

        // 대시 상태 초기화
        this.dash = {
            isDashing: false,
            dashDirection: null,
            dashTimeRemaining: 0,
            canDash: true,
            cooldownRemaining: 0
        };

        // 벽 지탱 상태 초기화
        this.wallCling = {
            isClinging: false,
            clingTimeRemaining: 0,
            wallSide: null,
            fireflyAnchored: false
        };

        // 입력 초기화
        this.input = {
            left: false,
            right: false,
            jump: false,
            jumpJustPressed: false,
            dash: false,
            dashJustPressed: false,
            down: false,
            interact: false
        };

        // 물리 바디 설정
        this.setupPhysicsBody();
    }

    private setupPhysicsBody(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;

        body.setSize(20, 32);
        body.setOffset(6, 0);
        body.setCollideWorldBounds(true);
        body.setGravityY(this.physicsConfig.gravity);
        body.setMaxVelocityY(this.physicsConfig.maxFallSpeed);
        body.setDragX(this.physicsConfig.friction * 1000);
    }

    // ===== 입력 업데이트 =====

    public updateInput(input: Partial<PlayerInput>): void {
        // 이전 상태 저장 (JustPressed 감지용)
        const prevJump = this.input.jump;
        const prevDash = this.input.dash;

        // 입력 업데이트
        Object.assign(this.input, input);

        // JustPressed 감지
        this.input.jumpJustPressed = !prevJump && this.input.jump;
        this.input.dashJustPressed = !prevDash && this.input.dash;
    }

    // ===== 메인 업데이트 =====

    public update(time: number, delta: number): void {
        this.updateGroundedState();
        this.updateWallState();
        this.updateTimers(delta);

        // 대시 중이면 대시 로직만
        if (this.dash.isDashing) {
            this.updateDash(delta);
            return;
        }

        // 벽 지탱 중
        if (this.wallCling.isClinging) {
            this.updateWallCling(delta);
            return;
        }

        // 일반 이동
        this.updateMovement(delta);
        this.updateJump();
        this.updateDashInput();
        this.updateState();
    }

    // ===== 지면 상태 =====

    private updateGroundedState(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        this.wasGrounded = this.isGrounded;
        this.isGrounded = body.blocked.down || body.touching.down;

        // 착지 순간
        if (this.isGrounded && !this.wasGrounded) {
            this.onLanding();
        }

        // 지면 떠남 (코요테 타임 시작)
        if (!this.isGrounded && this.wasGrounded && !this.dash.isDashing) {
            this.coyoteTime = this.coyoteTimeDuration;
        }
    }

    private onLanding(): void {
        this.jumpCount = 0;

        // 반딧불 즉시 회복
        const recovered = this.firefly.max - this.firefly.current;
        this.firefly.current = this.firefly.max;

        if (recovered > 0 && this.onFireflyRecover) {
            this.onFireflyRecover(recovered);
        }

        // 대시 가능 상태 복구
        this.dash.canDash = true;
        this.dash.cooldownRemaining = 0;

        // 착지 VFX 콜백
        if (this.onLand) {
            this.onLand(this.x, this.y);
        }

        this.playerState = 'landing';
    }

    // ===== 벽 상태 =====

    private updateWallState(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;

        this.isTouchingWall = body.blocked.left || body.blocked.right;

        if (body.blocked.left) {
            this.wallDirection = 'left';
        } else if (body.blocked.right) {
            this.wallDirection = 'right';
        } else {
            this.wallDirection = null;
        }
    }

    // ===== 타이머 업데이트 =====

    private updateTimers(delta: number): void {
        // 코요테 타임 감소
        if (this.coyoteTime > 0) {
            this.coyoteTime -= delta;
        }

        // 점프 버퍼 감소
        if (this.jumpBufferTime > 0) {
            this.jumpBufferTime -= delta;
        }

        // 대시 쿨다운 감소
        if (this.dash.cooldownRemaining > 0) {
            this.dash.cooldownRemaining -= delta;
            if (this.dash.cooldownRemaining <= 0) {
                this.dash.canDash = true;
            }
        }
    }

    // ===== 이동 =====

    private updateMovement(delta: number): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        const accel = this.isGrounded
            ? this.physicsConfig.groundAccel
            : this.physicsConfig.airAccel * this.physicsConfig.airControl;

        // 좌우 이동
        if (this.input.left) {
            body.setAccelerationX(-accel);
            this.facing = 'left';
            this.setFlipX(true);
        } else if (this.input.right) {
            body.setAccelerationX(accel);
            this.facing = 'right';
            this.setFlipX(false);
        } else {
            body.setAccelerationX(0);

            // 부드러운 감속 (관성)
            if (this.isGrounded) {
                body.setVelocityX(body.velocity.x * (1 - this.physicsConfig.friction));
            } else {
                body.setVelocityX(body.velocity.x * 0.98);
            }
        }

        // 최대 속도 제한
        const maxSpeed = this.stats.moveSpeed;
        if (Math.abs(body.velocity.x) > maxSpeed && !this.dash.isDashing) {
            body.setVelocityX(Math.sign(body.velocity.x) * maxSpeed);
        }
    }

    // ===== 점프 =====

    private updateJump(): void {
        // 점프 버퍼 등록
        if (this.input.jumpJustPressed) {
            this.jumpBufferTime = this.jumpBufferDuration;
        }

        // 점프 실행 조건
        const canJump = this.jumpBufferTime > 0 && (
            this.isGrounded ||
            this.coyoteTime > 0 ||
            (this.stats.canDoubleJump && this.jumpCount < this.maxJumps)
        );

        if (canJump) {
            this.performJump();
        }

        // 벽 점프 체크
        if (this.input.jumpJustPressed && this.isTouchingWall && !this.isGrounded) {
            this.performWallJump();
        }

        // 점프 버튼 뗐을 때 상승 속도 감소 (가변 점프)
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (!this.input.jump && body.velocity.y < 0) {
            body.setVelocityY(body.velocity.y * 0.5);
        }
    }

    private performJump(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityY(this.physicsConfig.jumpVelocity);

        this.jumpCount++;
        this.coyoteTime = 0;
        this.jumpBufferTime = 0;
        this.playerState = 'jump';
    }

    private performWallJump(): void {
        if (!this.wallDirection) return;

        const body = this.body as Phaser.Physics.Arcade.Body;

        // 벽 반대 방향으로 점프
        const forceX = this.wallDirection === 'left'
            ? this.wallClingConfig.wallJumpForceX
            : -this.wallClingConfig.wallJumpForceX;

        body.setVelocity(forceX, this.wallClingConfig.wallJumpForceY);

        // 방향 전환
        this.facing = this.wallDirection === 'left' ? 'right' : 'left';
        this.setFlipX(this.facing === 'left');

        this.jumpCount = 1;
        this.wallCling.isClinging = false;
        this.playerState = 'wall_jump';
    }

    // ===== 비산 대시 (Shatter Dash) =====

    private updateDashInput(): void {
        if (!this.input.dashJustPressed) return;
        if (this.dash.isDashing) return;
        if (this.firefly.current < this.dashConfig.fireflyCost) return;

        // 대시 방향 결정
        const direction = this.calculateDashDirection();
        this.startDash(direction);
    }

    private calculateDashDirection(): DashDirection {
        const { left, right, up, down } = {
            left: this.input.left,
            right: this.input.right,
            up: this.input.jump,
            down: this.input.down
        };

        // 8방향 대시
        if (up && left) return 'up_left';
        if (up && right) return 'up_right';
        if (down && left) return 'down_left';
        if (down && right) return 'down_right';
        if (up) return 'up';
        if (down) return 'down';
        if (left) return 'left';
        if (right) return 'right';

        // 방향키 입력 없으면 바라보는 방향
        return this.facing === 'left' ? 'left' : 'right';
    }

    private startDash(direction: DashDirection): void {
        // 반딧불 소모
        this.firefly.current -= this.dashConfig.fireflyCost;
        this.firefly.lastUsedTime = Date.now();

        // 대시 상태 설정
        this.dash.isDashing = true;
        this.dash.dashDirection = direction;
        this.dash.dashTimeRemaining = this.dashConfig.dashDuration;
        this.dash.canDash = false;

        // 대시 속도 적용
        const body = this.body as Phaser.Physics.Arcade.Body;
        const force = this.dashConfig.dashForce;
        const velocity = this.getDirectionVelocity(direction, force);

        body.setVelocity(velocity.x, velocity.y);
        body.setGravityY(0); // 대시 중 중력 무시

        this.playerState = 'dash';

        // VFX 콜백 호출 - 비산 이펙트!
        this.emitShatterEffect(this.x, this.y, direction);
    }

    private getDirectionVelocity(direction: DashDirection, force: number): { x: number; y: number } {
        const diagonal = force * 0.707; // 대각선 보정

        switch (direction) {
            case 'up': return { x: 0, y: -force };
            case 'down': return { x: 0, y: force };
            case 'left': return { x: -force, y: 0 };
            case 'right': return { x: force, y: 0 };
            case 'up_left': return { x: -diagonal, y: -diagonal };
            case 'up_right': return { x: diagonal, y: -diagonal };
            case 'down_left': return { x: -diagonal, y: diagonal };
            case 'down_right': return { x: diagonal, y: diagonal };
        }
    }

    private updateDash(delta: number): void {
        this.dash.dashTimeRemaining -= delta;

        if (this.dash.dashTimeRemaining <= 0) {
            this.endDash();
        }
    }

    private endDash(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;

        this.dash.isDashing = false;
        this.dash.dashDirection = null;
        this.dash.cooldownRemaining = this.dashConfig.dashCooldown;

        // 중력 복구
        body.setGravityY(this.physicsConfig.gravity);

        // 약간의 잔여 속도 유지 (모멘텀 느낌)
        body.setVelocity(body.velocity.x * 0.6, body.velocity.y * 0.6);

        this.playerState = this.isGrounded ? 'idle' : 'fall';
    }

    // ===== 벽 지탱 (Wall Cling) =====

    private updateWallCling(delta: number): void {
        const body = this.body as Phaser.Physics.Arcade.Body;

        // 벽에서 떨어짐
        if (!this.isTouchingWall) {
            this.endWallCling();
            return;
        }

        // 점프 입력 → 벽 점프
        if (this.input.jumpJustPressed) {
            this.performWallJump();
            return;
        }

        // 대시 입력
        if (this.input.dashJustPressed && this.firefly.current >= this.dashConfig.fireflyCost) {
            this.endWallCling();
            this.startDash(this.calculateDashDirection());
            return;
        }

        // 벽 반대 방향 입력 → 벽에서 떨어짐
        const oppositeInput = (this.wallCling.wallSide === 'left' && this.input.right) ||
                             (this.wallCling.wallSide === 'right' && this.input.left);
        if (oppositeInput) {
            this.endWallCling();
            return;
        }

        // 느린 미끄러짐
        body.setVelocityY(this.wallClingConfig.slideSpeed);

        // 지탱 시간 감소
        this.wallCling.clingTimeRemaining -= delta;
        if (this.wallCling.clingTimeRemaining <= 0) {
            this.endWallCling();
        }
    }

    public startWallCling(side: 'left' | 'right'): void {
        if (!this.stats.canWallCling) return;
        if (this.isGrounded) return;

        this.wallCling.isClinging = true;
        this.wallCling.wallSide = side;
        this.wallCling.clingTimeRemaining = this.wallClingConfig.clingDuration;
        this.wallCling.fireflyAnchored = true;

        // 낙하 속도 초기화
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityY(0);
        body.setGravityY(0);

        this.playerState = 'wall_cling';

        // VFX 콜백
        if (this.onWallCling) {
            this.onWallCling(this.x, this.y, side);
        }
    }

    private endWallCling(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;

        this.wallCling.isClinging = false;
        this.wallCling.wallSide = null;
        this.wallCling.fireflyAnchored = false;

        // 중력 복구
        body.setGravityY(this.physicsConfig.gravity);

        this.playerState = 'fall';
    }

    // ===== VFX 훅 =====

    /**
     * 비산 대시 이펙트 발생
     * 나중에 ShatterVFX 시스템에서 이 메서드를 오버라이드하거나
     * onShatterDash 콜백을 등록해서 사용
     */
    private emitShatterEffect(x: number, y: number, direction: DashDirection): void {
        // 외부 콜백이 있으면 호출
        if (this.onShatterDash) {
            this.onShatterDash(x, y, direction);
        }

        // 기본 구현 (콘솔 로그) - 나중에 VFX로 대체
        console.log(`[Shatter Dash] x:${x}, y:${y}, dir:${direction}, fireflies:${this.firefly.current}/${this.firefly.max}`);
    }

    // ===== 상태 업데이트 =====

    private updateState(): void {
        if (this.dash.isDashing) {
            this.playerState = 'dash';
            return;
        }

        if (this.wallCling.isClinging) {
            this.playerState = 'wall_cling';
            return;
        }

        const body = this.body as Phaser.Physics.Arcade.Body;

        if (this.isGrounded) {
            if (Math.abs(body.velocity.x) > 10) {
                this.playerState = 'run';
            } else {
                this.playerState = 'idle';
            }
        } else {
            if (body.velocity.y < 0) {
                this.playerState = 'jump';
            } else {
                this.playerState = 'fall';
            }
        }
    }

    // ===== Getters =====

    public getState(): PlayerState {
        return this.playerState;
    }

    public getFireflies(): { current: number; max: number } {
        return { current: this.firefly.current, max: this.firefly.max };
    }

    public resetFireflies(): void {
        this.firefly.current = this.firefly.max;
    }

    public getStats(): PlayerStats {
        return { ...this.stats };
    }

    public isOnGround(): boolean {
        return this.isGrounded;
    }

    public isDashing(): boolean {
        return this.dash.isDashing;
    }

    public isWallClinging(): boolean {
        return this.wallCling.isClinging;
    }

    // ===== Setters (능력 해금용) =====

    public unlockDoubleJump(): void {
        this.stats.canDoubleJump = true;
        this.maxJumps = 2;
    }

    public unlockWallCling(): void {
        this.stats.canWallCling = true;
    }

    public unlockGlide(): void {
        this.stats.canGlide = true;
    }

    public addMaxFirefly(amount: number = 1): void {
        this.stats.maxFireflies += amount;
        this.firefly.max = this.stats.maxFireflies;
        this.firefly.current = this.firefly.max;
    }

    public setPhysicsConfig(config: Partial<PhysicsConfig>): void {
        Object.assign(this.physicsConfig, config);
        this.setupPhysicsBody();
    }

    public setDashConfig(config: Partial<DashConfig>): void {
        Object.assign(this.dashConfig, config);
    }
}
