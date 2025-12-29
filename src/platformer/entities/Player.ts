/**
 * Player - 비산 대시(Shatter Dash) 기반 플레이어
 *
 * 핵심 메커니즘:
 * - 점프 키 통합: 지상=점프, 공중=비산 대시
 * - 강화된 점프 물리: 2배 높이, 가변 점프, 낙하 가속
 * - 폭발적 대시 + Ease-out 감속
 * - 반딧불 유영 시스템: 5개 파티클이 플레이어 주변 공전
 * - 반딧불 회복: 착지, 벽 지탱, 적 밟기
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
    WallClingConfig,
    OrbitParticle,
    OrbitConfig
} from '../../shared/types/platformer.types';
import {
    DEFAULT_PHYSICS,
    DEFAULT_DASH,
    DEFAULT_WALL_CLING,
    DEFAULT_PLAYER_STATS,
    DEFAULT_ORBIT
} from '../../shared/types/platformer.types';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    // 설정
    private physicsConfig: PhysicsConfig;
    private dashConfig: DashConfig;
    private wallClingConfig: WallClingConfig;
    private orbitConfig: OrbitConfig;

    // 상태
    private playerState: PlayerState = 'idle';
    private facing: FacingDirection = 'right';
    private stats: PlayerStats;

    // 반딧불 시스템
    private firefly: FireflyState;

    // 유영 파티클 시스템
    private orbitParticles: OrbitParticle[] = [];
    private orbitTime: number = 0;

    // 대시 상태
    private dash: DashState;
    private dashVelocity: { x: number; y: number } = { x: 0, y: 0 };

    // 벽 지탱 상태
    private wallCling: WallClingState;

    // 입력 상태
    private input: PlayerInput;

    // 물리 상태
    private isGrounded: boolean = false;
    private wasGrounded: boolean = false;
    private isTouchingWall: boolean = false;
    private wallDirection: 'left' | 'right' | null = null;
    private jumpReleased: boolean = true;  // 점프 버튼 떼기 감지

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
    public onFireflyConsume: ((particleIndex: number) => void) | null = null;

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
        this.orbitConfig = { ...DEFAULT_ORBIT };
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

        // 유영 파티클 초기화
        this.initOrbitParticles();
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

    // ===== 유영 파티클 시스템 =====

    private initOrbitParticles(): void {
        this.orbitParticles = [];
        const angleStep = (Math.PI * 2) / this.orbitConfig.particleCount;

        for (let i = 0; i < this.orbitConfig.particleCount; i++) {
            // 파티클 스프라이트 생성
            const sprite = this.scene.add.sprite(this.x, this.y, 'firefly_particle');
            sprite.setScale(0.8);
            sprite.setAlpha(0.9);
            sprite.setDepth(this.depth + 1);

            this.orbitParticles.push({
                sprite,
                baseAngle: angleStep * i,
                currentAngle: angleStep * i,
                orbitRadius: this.orbitConfig.baseRadius,
                orbitSpeed: this.orbitConfig.orbitSpeed,
                bobAmplitude: this.orbitConfig.bobAmplitude,
                bobPhase: Math.random() * Math.PI * 2,
                active: true,
                returning: false,
                lagPosition: { x: this.x, y: this.y }
            });
        }
    }

    private updateOrbitParticles(delta: number): void {
        this.orbitTime += delta;

        const activeCount = this.firefly.current;
        const isDashing = this.dash.isDashing;

        for (let i = 0; i < this.orbitParticles.length; i++) {
            const particle = this.orbitParticles[i];
            const shouldBeActive = i < activeCount;

            // 활성 상태 업데이트
            particle.active = shouldBeActive;

            if (!particle.sprite) continue;

            if (!particle.active) {
                // 비활성 파티클은 숨김
                particle.sprite.setVisible(false);
                continue;
            }

            particle.sprite.setVisible(true);

            // 공전 각도 업데이트
            particle.currentAngle += particle.orbitSpeed * delta;

            // 목표 위치 계산 (플레이어 기준)
            const targetAngle = particle.baseAngle + particle.currentAngle;
            const bobOffset = Math.sin(this.orbitTime * this.orbitConfig.bobFrequency + particle.bobPhase)
                            * particle.bobAmplitude;

            const targetX = this.x + Math.cos(targetAngle) * particle.orbitRadius;
            const targetY = this.y + Math.sin(targetAngle) * particle.orbitRadius + bobOffset;

            if (isDashing) {
                // 대시 중: 뒤처짐 효과
                particle.lagPosition.x += (this.x - particle.lagPosition.x) * this.orbitConfig.dashLagFactor;
                particle.lagPosition.y += (this.y - particle.lagPosition.y) * this.orbitConfig.dashLagFactor;

                particle.sprite.setPosition(particle.lagPosition.x, particle.lagPosition.y);
                particle.sprite.setAlpha(0.6);
            } else if (particle.returning) {
                // 대시 후 복귀 중
                particle.lagPosition.x += (targetX - particle.lagPosition.x) * this.orbitConfig.returnSpeed;
                particle.lagPosition.y += (targetY - particle.lagPosition.y) * this.orbitConfig.returnSpeed;

                particle.sprite.setPosition(particle.lagPosition.x, particle.lagPosition.y);

                // 복귀 완료 체크
                const dist = Math.hypot(particle.lagPosition.x - targetX, particle.lagPosition.y - targetY);
                if (dist < 2) {
                    particle.returning = false;
                }
                particle.sprite.setAlpha(0.7 + 0.3 * (1 - dist / 50));
            } else {
                // 일반 공전
                particle.sprite.setPosition(targetX, targetY);
                particle.lagPosition.x = targetX;
                particle.lagPosition.y = targetY;
                particle.sprite.setAlpha(0.9);
            }
        }
    }

    private consumeOrbitParticle(): void {
        // 활성 파티클 중 하나를 소모
        for (let i = this.orbitParticles.length - 1; i >= 0; i--) {
            if (this.orbitParticles[i].active) {
                // 소모 연출
                if (this.onFireflyConsume) {
                    this.onFireflyConsume(i);
                }
                break;
            }
        }
    }

    private startParticleReturn(): void {
        // 모든 파티클을 복귀 상태로
        for (const particle of this.orbitParticles) {
            if (particle.active) {
                particle.returning = true;
            }
        }
    }

    // ===== 입력 업데이트 =====

    public updateInput(input: Partial<PlayerInput>): void {
        // 이전 상태 저장 (JustPressed 감지용)
        const prevJump = this.input.jump;

        // 입력 업데이트
        Object.assign(this.input, input);

        // JustPressed 감지
        this.input.jumpJustPressed = !prevJump && this.input.jump;

        // 점프 버튼 떼기 감지 (가변 점프용)
        if (!this.input.jump && prevJump) {
            this.jumpReleased = true;
        }
    }

    // ===== 메인 업데이트 =====

    public update(time: number, delta: number): void {
        this.updateGroundedState();
        this.updateWallState();
        this.updateTimers(delta);
        this.updateFallGravity();

        // 대시 중이면 대시 로직만
        if (this.dash.isDashing) {
            this.updateDash(delta);
            this.updateOrbitParticles(delta);
            return;
        }

        // 벽 지탱 중
        if (this.wallCling.isClinging) {
            this.updateWallCling(delta);
            this.updateOrbitParticles(delta);
            return;
        }

        // 일반 이동
        this.updateMovement(delta);
        this.updateJumpAndDash();
        this.updateState();
        this.updateOrbitParticles(delta);
    }

    // ===== 낙하 중력 =====

    private updateFallGravity(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;

        // 대시 중이거나 벽 지탱 중이면 기본 중력
        if (this.dash.isDashing || this.wallCling.isClinging) {
            return;
        }

        // 낙하 중이면 중력 증가
        if (body.velocity.y > 0) {
            body.setGravityY(this.physicsConfig.gravity * this.physicsConfig.fallGravityMultiplier);
        } else {
            body.setGravityY(this.physicsConfig.gravity);
        }
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
        this.jumpReleased = true;

        // 반딧불 즉시 회복
        this.recoverAllFireflies();

        // 대시 가능 상태 복구
        this.dash.canDash = true;
        this.dash.cooldownRemaining = 0;

        // 착지 VFX 콜백
        if (this.onLand) {
            this.onLand(this.x, this.y);
        }

        this.playerState = 'landing';
    }

    private recoverAllFireflies(): void {
        const recovered = this.firefly.max - this.firefly.current;
        this.firefly.current = this.firefly.max;

        if (recovered > 0 && this.onFireflyRecover) {
            this.onFireflyRecover(recovered);
        }
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

    // ===== 점프 & 대시 통합 =====

    private updateJumpAndDash(): void {
        // 점프 버퍼 등록
        if (this.input.jumpJustPressed) {
            this.jumpBufferTime = this.jumpBufferDuration;
        }

        // 지상/공중 판정
        const canGroundJump = this.jumpBufferTime > 0 && (this.isGrounded || this.coyoteTime > 0);
        const isInAir = !this.isGrounded && this.coyoteTime <= 0;

        // 벽 점프 체크 (최우선)
        if (this.input.jumpJustPressed && this.isTouchingWall && !this.isGrounded) {
            this.performWallJump();
            return;
        }

        // 지상 점프
        if (canGroundJump) {
            this.performJump();
            return;
        }

        // 공중에서 점프 키 = 비산 대시
        if (isInAir && this.input.jumpJustPressed) {
            if (this.firefly.current >= this.dashConfig.fireflyCost) {
                const direction = this.calculateDashDirection();
                this.startDash(direction);
            }
            return;
        }

        // 가변 점프: 점프 버튼 떼면 상승 속도 감소
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (this.jumpReleased && body.velocity.y < 0) {
            body.setVelocityY(body.velocity.y * this.physicsConfig.jumpCutMultiplier);
            this.jumpReleased = false;  // 한 번만 적용
        }
    }

    private performJump(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityY(this.physicsConfig.jumpVelocity);

        this.jumpCount++;
        this.coyoteTime = 0;
        this.jumpBufferTime = 0;
        this.jumpReleased = false;
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
        this.jumpReleased = false;
        this.playerState = 'wall_jump';
    }

    // ===== 비산 대시 (Shatter Dash) =====

    private calculateDashDirection(): DashDirection {
        const { left, right, down } = {
            left: this.input.left,
            right: this.input.right,
            down: this.input.down
        };

        // up은 기본이므로 점프 키 입력은 체크하지 않음
        // 8방향 대시 (위쪽 기본)
        if (down && left) return 'down_left';
        if (down && right) return 'down_right';
        if (down) return 'down';
        if (left) return 'up_left';
        if (right) return 'up_right';
        if (left) return 'left';
        if (right) return 'right';

        // 방향키 입력 없으면 위쪽 (기본)
        return 'up';
    }

    private startDash(direction: DashDirection): void {
        // 반딧불 소모
        this.firefly.current -= this.dashConfig.fireflyCost;
        this.firefly.lastUsedTime = Date.now();

        // 유영 파티클 소모 연출
        this.consumeOrbitParticle();

        // 대시 상태 설정
        this.dash.isDashing = true;
        this.dash.dashDirection = direction;
        this.dash.dashTimeRemaining = this.dashConfig.dashDuration;
        this.dash.canDash = false;

        // 대시 속도 적용 (폭발적 초기 속도)
        const body = this.body as Phaser.Physics.Arcade.Body;
        const force = this.dashConfig.dashForce;
        const velocity = this.getDirectionVelocity(direction, force);

        this.dashVelocity = { x: velocity.x, y: velocity.y };
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
        const body = this.body as Phaser.Physics.Arcade.Body;

        // Ease-out 감속
        this.dashVelocity.x *= this.dashConfig.easeOutFactor;
        this.dashVelocity.y *= this.dashConfig.easeOutFactor;
        body.setVelocity(this.dashVelocity.x, this.dashVelocity.y);

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

        // 잔여 속도 유지 (모멘텀 느낌)
        body.setVelocity(this.dashVelocity.x * 0.5, this.dashVelocity.y * 0.5);

        // 유영 파티클 복귀 시작
        this.startParticleReturn();

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

        // 반딧불 회복 (벽 지탱 시)
        this.recoverAllFireflies();

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

    // ===== 적 밟기 회복 =====

    /**
     * 적을 밟았을 때 호출 (외부에서 충돌 감지 후 호출)
     */
    public onStompEnemy(): void {
        // 반딧불 1개 회복
        if (this.firefly.current < this.firefly.max) {
            this.firefly.current++;
            if (this.onFireflyRecover) {
                this.onFireflyRecover(1);
            }
        }

        // 살짝 위로 튕김
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityY(this.physicsConfig.jumpVelocity * 0.5);
    }

    // ===== VFX 훅 =====

    private emitShatterEffect(x: number, y: number, direction: DashDirection): void {
        // 외부 콜백이 있으면 호출
        if (this.onShatterDash) {
            this.onShatterDash(x, y, direction);
        }
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

    public getOrbitParticles(): OrbitParticle[] {
        return this.orbitParticles;
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

        // 새 유영 파티클 추가
        const angleStep = (Math.PI * 2) / this.stats.maxFireflies;
        for (let i = this.orbitParticles.length; i < this.stats.maxFireflies; i++) {
            const sprite = this.scene.add.sprite(this.x, this.y, 'firefly_particle');
            sprite.setScale(0.8);
            sprite.setAlpha(0.9);
            sprite.setDepth(this.depth + 1);

            this.orbitParticles.push({
                sprite,
                baseAngle: angleStep * i,
                currentAngle: angleStep * i,
                orbitRadius: this.orbitConfig.baseRadius,
                orbitSpeed: this.orbitConfig.orbitSpeed,
                bobAmplitude: this.orbitConfig.bobAmplitude,
                bobPhase: Math.random() * Math.PI * 2,
                active: true,
                returning: false,
                lagPosition: { x: this.x, y: this.y }
            });
        }
    }

    public setPhysicsConfig(config: Partial<PhysicsConfig>): void {
        Object.assign(this.physicsConfig, config);
        this.setupPhysicsBody();
    }

    public setDashConfig(config: Partial<DashConfig>): void {
        Object.assign(this.dashConfig, config);
    }

    // ===== 정리 =====

    public destroy(fromScene?: boolean): void {
        // 유영 파티클 정리
        for (const particle of this.orbitParticles) {
            if (particle.sprite) {
                particle.sprite.destroy();
            }
        }
        this.orbitParticles = [];

        super.destroy(fromScene);
    }
}
