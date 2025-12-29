/**
 * PlatformerScene - 메인 플랫포머 게임 씬
 *
 * 테스트용 레벨 포함:
 * - 기본 플랫폼 배치
 * - 플레이어 생성 및 입력 처리
 * - 비산 대시 테스트 환경
 */

import Phaser from 'phaser';
import Player from '../entities/Player';
import type { DashDirection } from '../../shared/types/platformer.types';

export default class PlatformerScene extends Phaser.Scene {
    private player!: Player;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private walls!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private jumpKey!: Phaser.Input.Keyboard.Key;
    private dashKey!: Phaser.Input.Keyboard.Key;

    // UI
    private fireflyText!: Phaser.GameObjects.Text;
    private stateText!: Phaser.GameObjects.Text;

    // VFX 컨테이너
    private vfxContainer!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'PlatformerScene' });
    }

    create(): void {
        // 배경색
        this.cameras.main.setBackgroundColor(0x1a1a2e);

        // VFX 컨테이너
        this.vfxContainer = this.add.container(0, 0);
        this.vfxContainer.setDepth(100);

        // 플랫폼 생성
        this.createPlatforms();

        // 벽 생성
        this.createWalls();

        // 플레이어 생성
        this.createPlayer();

        // 입력 설정
        this.setupInput();

        // 충돌 설정
        this.setupCollisions();

        // UI 생성
        this.createUI();

        // 카메라 설정
        this.setupCamera();

        // 디버그 안내
        this.addDebugInstructions();
    }

    private createPlatforms(): void {
        this.platforms = this.physics.add.staticGroup();

        // 바닥
        this.createPlatform(640, 680, 1280, 40, 0x3d3d5c);

        // 중간 플랫폼들 (테스트용 레벨)
        this.createPlatform(200, 550, 200, 20, 0x4a4a6a);
        this.createPlatform(500, 450, 250, 20, 0x4a4a6a);
        this.createPlatform(850, 400, 200, 20, 0x4a4a6a);
        this.createPlatform(1100, 300, 180, 20, 0x4a4a6a);

        // 높은 플랫폼 (대시 테스트용)
        this.createPlatform(300, 280, 150, 20, 0x5a5a7a);
        this.createPlatform(600, 200, 200, 20, 0x5a5a7a);

        // 떨어진 플랫폼 (멀리 점프 테스트)
        this.createPlatform(1000, 550, 150, 20, 0x4a4a6a);
    }

    private createPlatform(x: number, y: number, width: number, height: number, color: number): void {
        const platform = this.add.rectangle(x, y, width, height, color);
        this.physics.add.existing(platform, true);
        this.platforms.add(platform);

        // 플랫폼 가장자리 하이라이트
        const highlight = this.add.rectangle(x, y - height / 2, width, 2, 0x8888aa);
        highlight.setDepth(1);
    }

    private createWalls(): void {
        this.walls = this.physics.add.staticGroup();

        // 왼쪽 벽
        this.createWall(10, 400, 20, 400, 0x2d2d4c);

        // 오른쪽 벽
        this.createWall(1270, 400, 20, 400, 0x2d2d4c);

        // 중간 벽 (벽 점프 테스트용)
        this.createWall(700, 500, 20, 200, 0x3d3d5c);
    }

    private createWall(x: number, y: number, width: number, height: number, color: number): void {
        const wall = this.add.rectangle(x, y, width, height, color);
        this.physics.add.existing(wall, true);
        this.walls.add(wall);
    }

    private createPlayer(): void {
        // 플레이어 생성 (임시 텍스처 사용)
        this.player = new Player(this, 200, 600, 'player_placeholder');

        // VFX 콜백 등록
        this.player.onShatterDash = this.emitShatterEffect.bind(this);
        this.player.onLand = this.emitLandEffect.bind(this);
        this.player.onWallCling = this.emitWallClingEffect.bind(this);
        this.player.onFireflyRecover = this.emitFireflyRecoverEffect.bind(this);
    }

    private setupInput(): void {
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.jumpKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        this.dashKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

        // WASD 추가
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }

    private setupCollisions(): void {
        // 플레이어 - 플랫폼 충돌
        this.physics.add.collider(this.player, this.platforms);

        // 플레이어 - 벽 충돌 (벽 지탱 트리거)
        this.physics.add.collider(this.player, this.walls, this.onWallCollision, undefined, this);
    }

    private onWallCollision(
        player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
        wall: Phaser.Types.Physics.Arcade.GameObjectWithBody
    ): void {
        const p = player as Player;
        const body = p.body as Phaser.Physics.Arcade.Body;

        // 공중에서 벽에 닿았을 때만 벽 지탱 시작
        if (!p.isOnGround() && !p.isDashing()) {
            if (body.blocked.left) {
                p.startWallCling('left');
            } else if (body.blocked.right) {
                p.startWallCling('right');
            }
        }
    }

    private createUI(): void {
        // 반딧불 카운터
        this.fireflyText = this.add.text(20, 20, '', {
            fontSize: '24px',
            color: '#ffcc44',
            fontFamily: 'Almendra, serif',
            stroke: '#000',
            strokeThickness: 3
        }).setScrollFactor(0).setDepth(1000);

        // 상태 표시
        this.stateText = this.add.text(20, 50, '', {
            fontSize: '16px',
            color: '#aaaaaa',
            fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(1000);
    }

    private setupCamera(): void {
        this.cameras.main.setBounds(0, 0, 1280, 720);
        // 플레이어 따라가기 (필요시 활성화)
        // this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }

    private addDebugInstructions(): void {
        const instructions = [
            '← → / A D : 이동',
            'X : 점프',
            'Z : 비산 대시 (반딧불 소모)',
            '방향키 + Z : 8방향 대시',
            '벽에 붙으면 벽 지탱'
        ];

        const text = this.add.text(1260, 20, instructions.join('\n'), {
            fontSize: '14px',
            color: '#666666',
            fontFamily: 'monospace',
            align: 'right'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
    }

    update(time: number, delta: number): void {
        // 입력 수집
        const input = this.collectInput();

        // 플레이어 입력 업데이트
        this.player.updateInput(input);

        // 플레이어 업데이트
        this.player.update(time, delta);

        // UI 업데이트
        this.updateUI();
    }

    private collectInput(): {
        left: boolean;
        right: boolean;
        jump: boolean;
        dash: boolean;
        down: boolean;
        interact: boolean;
    } {
        const keyboard = this.input.keyboard!;
        const keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        const keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        const keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);

        return {
            left: this.cursors.left.isDown || keyA.isDown,
            right: this.cursors.right.isDown || keyD.isDown,
            jump: this.jumpKey.isDown || this.cursors.up.isDown,
            dash: this.dashKey.isDown,
            down: this.cursors.down.isDown || keyS.isDown,
            interact: false
        };
    }

    private updateUI(): void {
        const fireflies = this.player.getFireflies();
        const state = this.player.getState();

        // 반딧불 표시 (채워진 것과 빈 것)
        let fireflyDisplay = '🔥 ';
        for (let i = 0; i < fireflies.max; i++) {
            fireflyDisplay += i < fireflies.current ? '●' : '○';
        }
        this.fireflyText.setText(fireflyDisplay);

        // 상태 표시
        this.stateText.setText(`State: ${state}`);
    }

    // ===== VFX 이펙트들 =====

    private emitShatterEffect(x: number, y: number, direction: DashDirection): void {
        // 비산 대시 이펙트 - 반딧불이 팡! 터지는 연출
        const colors = [0xffcc44, 0xff9944, 0xffff88];

        // 방향 벡터 계산
        const angle = this.getDirectionAngle(direction);

        // 파티클 버스트
        for (let i = 0; i < 12; i++) {
            const particleAngle = angle + (Math.random() - 0.5) * Math.PI;
            const speed = 100 + Math.random() * 200;
            const color = colors[Math.floor(Math.random() * colors.length)];

            const particle = this.add.circle(x, y, 4 + Math.random() * 4, color);
            particle.setAlpha(0.8);
            particle.setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: particle,
                x: x + Math.cos(particleAngle) * speed,
                y: y + Math.sin(particleAngle) * speed,
                alpha: 0,
                scale: 0.2,
                duration: 300 + Math.random() * 200,
                ease: 'Power2.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // 중심 플래시
        const flash = this.add.circle(x, y, 30, 0xffff88, 0.6);
        flash.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
            targets: flash,
            scale: 2,
            alpha: 0,
            duration: 200,
            ease: 'Power2.easeOut',
            onComplete: () => flash.destroy()
        });

        // 카메라 흔들림
        this.cameras.main.shake(80, 0.005);
    }

    private getDirectionAngle(direction: DashDirection): number {
        const angles: Record<DashDirection, number> = {
            'right': 0,
            'up_right': -Math.PI / 4,
            'up': -Math.PI / 2,
            'up_left': -3 * Math.PI / 4,
            'left': Math.PI,
            'down_left': 3 * Math.PI / 4,
            'down': Math.PI / 2,
            'down_right': Math.PI / 4
        };
        return angles[direction];
    }

    private emitLandEffect(x: number, y: number): void {
        // 착지 먼지 이펙트
        for (let i = 0; i < 6; i++) {
            const side = i < 3 ? -1 : 1;
            const dust = this.add.circle(x + side * (10 + Math.random() * 20), y, 3, 0x888888, 0.5);

            this.tweens.add({
                targets: dust,
                y: y - 20,
                x: dust.x + side * 30,
                alpha: 0,
                scale: 0.5,
                duration: 300,
                ease: 'Power2.easeOut',
                onComplete: () => dust.destroy()
            });
        }
    }

    private emitWallClingEffect(x: number, y: number, side: 'left' | 'right'): void {
        // 벽에 반딧불이 붙는 이펙트
        const offsetX = side === 'left' ? -15 : 15;

        for (let i = 0; i < 3; i++) {
            const firefly = this.add.circle(
                x + offsetX,
                y - 20 + i * 20,
                5,
                0xffcc44,
                0.7
            );
            firefly.setBlendMode(Phaser.BlendModes.ADD);

            // 펄스 효과
            this.tweens.add({
                targets: firefly,
                scale: { from: 0.5, to: 1.2 },
                alpha: { from: 0.3, to: 0.8 },
                duration: 400,
                yoyo: true,
                repeat: 2,
                onComplete: () => firefly.destroy()
            });
        }
    }

    private emitFireflyRecoverEffect(count: number): void {
        // 반딧불 회복 이펙트
        const x = this.player.x;
        const y = this.player.y;

        for (let i = 0; i < count; i++) {
            this.time.delayedCall(i * 100, () => {
                const firefly = this.add.circle(
                    x + (Math.random() - 0.5) * 40,
                    y + 30,
                    6,
                    0xffcc44,
                    0
                );
                firefly.setBlendMode(Phaser.BlendModes.ADD);

                this.tweens.add({
                    targets: firefly,
                    y: y - 20,
                    alpha: { from: 0, to: 0.8 },
                    scale: { from: 0.5, to: 1 },
                    duration: 300,
                    ease: 'Power2.easeOut',
                    yoyo: true,
                    onComplete: () => firefly.destroy()
                });
            });
        }
    }
}
