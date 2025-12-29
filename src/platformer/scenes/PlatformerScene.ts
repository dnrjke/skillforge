/**
 * PlatformerScene - 메인 플랫포머 게임 씬
 *
 * 다양한 테스트 맵 지원:
 * - 맵 데이터를 init()에서 받아서 동적 생성
 * - 비산 대시 테스트 환경
 */

import Phaser from 'phaser';
import Player from '../entities/Player';
import { MAPS, getMapById } from '../data/maps';
import type { MapData, PlatformData, WallData } from '../data/maps';
import type { DashDirection } from '../../shared/types/platformer.types';

export default class PlatformerScene extends Phaser.Scene {
    private player!: Player;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private walls!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private jumpKey!: Phaser.Input.Keyboard.Key;
    private dashKey!: Phaser.Input.Keyboard.Key;

    // 현재 맵 데이터
    private mapData!: MapData;

    // UI
    private fireflyText!: Phaser.GameObjects.Text;
    private stateText!: Phaser.GameObjects.Text;
    private mapNameText!: Phaser.GameObjects.Text;

    // VFX 컨테이너
    private vfxContainer!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'PlatformerScene' });
    }

    init(data: { mapId?: string }): void {
        // 맵 ID로 맵 데이터 로드 (기본: basic)
        const mapId = data.mapId || 'basic';
        this.mapData = getMapById(mapId) || MAPS.basic;
    }

    create(): void {
        // 배경색
        const bgColor = this.mapData.backgroundColor || 0x1a1a2e;
        this.cameras.main.setBackgroundColor(bgColor);

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

        for (const platform of this.mapData.platforms) {
            this.createPlatform(
                platform.x,
                platform.y,
                platform.width,
                platform.height,
                platform.color || 0x4a4a6a
            );
        }
    }

    private createPlatform(x: number, y: number, width: number, height: number, color: number): void {
        const platform = this.add.rectangle(x, y, width, height, color);
        this.physics.add.existing(platform, true);
        this.platforms.add(platform);

        // 플랫폼 가장자리 하이라이트
        const highlightColor = Phaser.Display.Color.ValueToColor(color);
        const lighterColor = highlightColor.clone().lighten(30).color;
        const highlight = this.add.rectangle(x, y - height / 2, width, 2, lighterColor);
        highlight.setDepth(1);
    }

    private createWalls(): void {
        this.walls = this.physics.add.staticGroup();

        for (const wall of this.mapData.walls) {
            this.createWall(
                wall.x,
                wall.y,
                wall.width,
                wall.height,
                wall.color || 0x2d2d4c
            );
        }
    }

    private createWall(x: number, y: number, width: number, height: number, color: number): void {
        const wall = this.add.rectangle(x, y, width, height, color);
        this.physics.add.existing(wall, true);
        this.walls.add(wall);
    }

    private createPlayer(): void {
        const { x, y } = this.mapData.playerStart;
        this.player = new Player(this, x, y, 'player_placeholder');

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

        // R키로 리스타트
        const restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        restartKey.on('down', () => {
            this.scene.restart({ mapId: this.mapData.id });
        });

        // ESC로 맵 선택 화면으로
        const escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        escKey.on('down', () => {
            // 메인 페이지로 리다이렉트
            window.location.href = window.location.pathname;
        });
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
        // 맵 이름 표시
        this.mapNameText = this.add.text(640, 15, this.mapData.name, {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: 'Alexandria, sans-serif',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

        // 맵 설명
        this.add.text(640, 42, this.mapData.description, {
            fontSize: '12px',
            color: '#888888',
            fontFamily: 'Alexandria, sans-serif'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

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
    }

    private addDebugInstructions(): void {
        const instructions = [
            '← → / A D : 이동',
            'X : 점프',
            'Z : 비산 대시',
            'R : 재시작',
            'ESC : 맵 선택'
        ];

        this.add.text(1260, 20, instructions.join('\n'), {
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

        // 추락 체크
        this.checkFallOff();
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

        // 반딧불 표시
        let fireflyDisplay = '🔥 ';
        for (let i = 0; i < fireflies.max; i++) {
            fireflyDisplay += i < fireflies.current ? '●' : '○';
        }
        this.fireflyText.setText(fireflyDisplay);

        // 상태 표시
        this.stateText.setText(`State: ${state}`);
    }

    private checkFallOff(): void {
        // 화면 아래로 떨어지면 리스폰
        if (this.player.y > 800) {
            this.player.setPosition(this.mapData.playerStart.x, this.mapData.playerStart.y);
            this.player.setVelocity(0, 0);
            this.player.resetFireflies();

            // 리스폰 이펙트
            this.emitRespawnEffect(this.mapData.playerStart.x, this.mapData.playerStart.y);
        }
    }

    // ===== VFX 이펙트들 =====

    private emitShatterEffect(x: number, y: number, direction: DashDirection): void {
        const colors = [0xffcc44, 0xff9944, 0xffff88];
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

    private emitRespawnEffect(x: number, y: number): void {
        // 리스폰 이펙트 - 반딧불이 모여드는 연출
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 80;
            const startX = x + Math.cos(angle) * distance;
            const startY = y + Math.sin(angle) * distance;

            const firefly = this.add.circle(startX, startY, 6, 0xffcc44, 0);
            firefly.setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
                targets: firefly,
                x: x,
                y: y,
                alpha: { from: 0.8, to: 0 },
                scale: { from: 1, to: 0.3 },
                duration: 400,
                delay: i * 50,
                ease: 'Power2.easeIn',
                onComplete: () => firefly.destroy()
            });
        }

        // 중앙 플래시
        this.time.delayedCall(400, () => {
            const flash = this.add.circle(x, y, 40, 0xffffff, 0.5);
            flash.setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({
                targets: flash,
                scale: 0.5,
                alpha: 0,
                duration: 200,
                onComplete: () => flash.destroy()
            });
        });
    }
}
