import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // 로딩 진행률 표시
        this.createLoadingBar();

        // 배경 로드
        this.load.image('bg_battle', 'assets/bg/scene1a.png');

        // 캐릭터 스프라이트 시트 로드 (32x32, 10열 x 7행)
        this.load.spritesheet('knight', 'assets/char/knight_a.png', {
            frameWidth: 32,
            frameHeight: 32
        });
    }

    createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 로딩 텍스트
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // 프로그레스 바 배경
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 10, 320, 30);

        // 프로그레스 바
        const progressBar = this.add.graphics();

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ff00, 1);
            progressBar.fillRect(width / 2 - 155, height / 2 - 5, 310 * value, 20);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });
    }

    create() {
        // 애니메이션 등록
        this.createAnimations();

        // BattleScene으로 전환
        this.scene.start('BattleScene');
    }

    createAnimations() {
        // knight_idle: 행 3 (프레임 30~33) - 서있는 포즈
        this.anims.create({
            key: 'knight_idle',
            frames: this.anims.generateFrameNumbers('knight', { start: 30, end: 33 }),
            frameRate: 8,
            repeat: -1
        });

        // knight_attack: 행 1~2 (프레임 10~23) - 공격 동작
        this.anims.create({
            key: 'knight_attack',
            frames: this.anims.generateFrameNumbers('knight', { start: 10, end: 23 }),
            frameRate: 12,
            repeat: 0
        });

        // knight_hit: 행 5 (프레임 50~53) - 피격 동작
        this.anims.create({
            key: 'knight_hit',
            frames: this.anims.generateFrameNumbers('knight', { start: 50, end: 53 }),
            frameRate: 10,
            repeat: 0
        });

        // knight_death: 행 0 (프레임 0~9) - 죽음 동작
        this.anims.create({
            key: 'knight_death',
            frames: this.anims.generateFrameNumbers('knight', { start: 0, end: 9 }),
            frameRate: 10,
            repeat: 0
        });
    }
}
