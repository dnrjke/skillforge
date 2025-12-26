import Phaser from 'phaser';

// 캐릭터 배치 좌표 상수
const FORMATION = {
    ALLY: [
        { id: 0, row: 'back',  x: 150, y: 220 },  // 후열 상
        { id: 1, row: 'back',  x: 180, y: 360 },  // 후열 중
        { id: 2, row: 'back',  x: 210, y: 500 },  // 후열 하
        { id: 3, row: 'front', x: 350, y: 240 },  // 전열 상
        { id: 4, row: 'front', x: 380, y: 380 },  // 전열 중
        { id: 5, row: 'front', x: 410, y: 520 }   // 전열 하
    ],
    ENEMY: [
        { id: 0, row: 'back',  x: 1130, y: 220 }, // 후열 상 (1280 - 150)
        { id: 1, row: 'back',  x: 1100, y: 360 }, // 후열 중 (1280 - 180)
        { id: 2, row: 'back',  x: 1070, y: 500 }, // 후열 하 (1280 - 210)
        { id: 3, row: 'front', x: 930, y: 240 },  // 전열 상 (1280 - 350)
        { id: 4, row: 'front', x: 900, y: 380 },  // 전열 중 (1280 - 380)
        { id: 5, row: 'front', x: 870, y: 520 }   // 전열 하 (1280 - 410)
    ]
};

// 3vs3 전투에서 사용할 슬롯 인덱스
const ACTIVE_SLOTS = [1, 3, 4]; // 후열 중, 전열 상, 전열 중

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
        this.allies = [];
        this.enemies = [];
    }

    create() {
        // 배경 설정
        this.setupBackground();

        // 캐릭터 배치
        this.setupCharacters();
    }

    setupBackground() {
        // 배경 이미지를 화면 중앙에 꽉 차게 배치
        const bg = this.add.image(640, 360, 'bg_battle');
        bg.setDisplaySize(1280, 720);
    }

    setupCharacters() {
        // 아군 배치 (3명)
        ACTIVE_SLOTS.forEach((slotIndex) => {
            const slot = FORMATION.ALLY[slotIndex];
            const ally = this.createCharacter(slot.x, slot.y, false);
            this.allies.push(ally);
        });

        // 적군 배치 (3명)
        ACTIVE_SLOTS.forEach((slotIndex) => {
            const slot = FORMATION.ENEMY[slotIndex];
            const enemy = this.createCharacter(slot.x, slot.y, true);
            this.enemies.push(enemy);
        });

        // Y좌표 기준으로 depth 정렬 (아래에 있을수록 앞에 보이게)
        this.sortCharactersByDepth();
    }

    createCharacter(x, y, isEnemy) {
        const character = this.add.sprite(x, y, 'knight');

        // 스케일 조정 (32x32가 작으므로 확대)
        character.setScale(3);

        // 적군 설정
        if (isEnemy) {
            character.setFlipX(true);      // 좌우 반전
            character.setTint(0xff8888);   // 붉은 틴트
        }

        // idle 애니메이션 재생
        character.play('knight_idle');

        return character;
    }

    sortCharactersByDepth() {
        // 모든 캐릭터를 Y좌표 기준으로 정렬
        const allCharacters = [...this.allies, ...this.enemies];
        allCharacters.sort((a, b) => a.y - b.y);
        allCharacters.forEach((char, index) => {
            char.setDepth(index + 1);
        });
    }
}
