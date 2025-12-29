/**
 * PlatformerBootScene - 플랫포머 에셋 로딩
 */

import Phaser from 'phaser';

export default class PlatformerBootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlatformerBootScene' });
    }

    preload(): void {
        // 로딩 UI
        this.createLoadingUI();

        // 플레이어 임시 텍스처 생성 (스프라이트시트 없을 때)
        this.createPlaceholderTextures();

        // 실제 에셋 로딩 (나중에 추가)
        // this.load.spritesheet('player', '/assets/platformer/player.png', { frameWidth: 32, frameHeight: 32 });
        // this.load.image('tileset', '/assets/platformer/tileset.png');
        // this.load.tilemapTiledJSON('level1', '/assets/platformer/level1.json');
    }

    private createLoadingUI(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 배경
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // 로딩 텍스트
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Almendra, serif'
        }).setOrigin(0.5);

        // 진행률 바 배경
        const progressBg = this.add.rectangle(width / 2, height / 2, 300, 20, 0x333333);
        progressBg.setStrokeStyle(2, 0x666666);

        // 진행률 바
        const progressBar = this.add.rectangle(width / 2 - 145, height / 2, 0, 14, 0xffcc44);
        progressBar.setOrigin(0, 0.5);

        // 로딩 이벤트
        this.load.on('progress', (value: number) => {
            progressBar.width = 290 * value;
        });

        this.load.on('complete', () => {
            loadingText.setText('Press any key to start');

            // 아무 키나 누르면 시작
            this.input.keyboard!.once('keydown', () => {
                this.scene.start('PlatformerScene');
            });

            // 또는 클릭으로 시작
            this.input.once('pointerdown', () => {
                this.scene.start('PlatformerScene');
            });
        });
    }

    private createPlaceholderTextures(): void {
        // 플레이어 임시 텍스처 (32x32 사각형)
        const playerGraphics = this.add.graphics();

        // 몸체
        playerGraphics.fillStyle(0x44aaff, 1);
        playerGraphics.fillRoundedRect(4, 0, 24, 28, 4);

        // 눈
        playerGraphics.fillStyle(0xffffff, 1);
        playerGraphics.fillCircle(12, 10, 4);
        playerGraphics.fillCircle(20, 10, 4);

        playerGraphics.fillStyle(0x000000, 1);
        playerGraphics.fillCircle(13, 10, 2);
        playerGraphics.fillCircle(21, 10, 2);

        // 반딧불 효과 (주변 빛)
        playerGraphics.fillStyle(0xffcc44, 0.3);
        playerGraphics.fillCircle(16, 14, 20);

        // 텍스처 생성
        playerGraphics.generateTexture('player_placeholder', 32, 32);
        playerGraphics.destroy();

        // 반딧불 파티클 텍스처
        const fireflyGraphics = this.add.graphics();
        fireflyGraphics.fillStyle(0xffcc44, 1);
        fireflyGraphics.fillCircle(8, 8, 6);
        fireflyGraphics.fillStyle(0xffffff, 0.5);
        fireflyGraphics.fillCircle(6, 6, 2);
        fireflyGraphics.generateTexture('firefly_particle', 16, 16);
        fireflyGraphics.destroy();
    }

    create(): void {
        // 플레이어 애니메이션 생성 (나중에 스프라이트시트로 대체)
        // 현재는 단일 프레임 placeholder 사용

        // 로딩 완료 후 자동으로 PlatformerScene으로 전환하지 않음
        // 사용자 입력을 기다림 (preload의 complete 이벤트에서 처리)
    }
}
