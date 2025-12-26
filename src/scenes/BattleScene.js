import Phaser from 'phaser';
import LogWindow from '../objects/LogWindow.js';
import StatusBar from '../objects/StatusBar.js';
import BattleManager from '../battle/BattleManager.js';

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
        this.statusBars = [];
        this.logWindow = null;
        this.battleManager = null;
    }

    create() {
        // 배경 설정
        this.setupBackground();

        // 캐릭터 배치
        this.setupCharacters();

        // UI 설정
        this.setupUI();

        // 전투 매니저 초기화
        this.setupBattleManager();

        // 입력 설정
        this.setupInput();

        // 시작 로그
        this.addLog('═══════════════════════════════════', 'system');
        this.addLog('SkillForge - 키워드 기반 3vs3 RPG', 'system');
        this.addLog('═══════════════════════════════════', 'system');
        this.addLog('스페이스바: 테스트 (HP-10, AP-5)', 'info');
        this.addLog('Enter: 자동 전투 시작/토글', 'info');
        this.addLog('P: 일시정지/재개', 'info');
    }

    update() {
        // 상태바 위치 업데이트
        this.statusBars.forEach(bar => bar.update());
    }

    setupBackground() {
        // 배경 이미지를 화면 중앙에 꽉 차게 배치
        const bg = this.add.image(640, 360, 'bg_battle');
        bg.setDisplaySize(1280, 720);
    }

    setupCharacters() {
        // 아군 배치 (3명)
        ACTIVE_SLOTS.forEach((slotIndex, index) => {
            const slot = FORMATION.ALLY[slotIndex];
            const ally = this.createCharacter(slot.x, slot.y, false, `아군${index + 1}`);
            this.allies.push(ally);
        });

        // 적군 배치 (3명)
        ACTIVE_SLOTS.forEach((slotIndex, index) => {
            const slot = FORMATION.ENEMY[slotIndex];
            const enemy = this.createCharacter(slot.x, slot.y, true, `적군${index + 1}`);
            this.enemies.push(enemy);
        });

        // Y좌표 기준으로 depth 정렬 (아래에 있을수록 앞에 보이게)
        this.sortCharactersByDepth();
    }

    createCharacter(x, y, isEnemy, name) {
        const character = this.add.sprite(x, y, 'knight');

        // 스케일 조정 (32x32가 작으므로 확대)
        character.setScale(3);

        // 캐릭터 메타 정보
        character.data = {
            name: name,
            isEnemy: isEnemy
        };

        // 적군 설정
        if (isEnemy) {
            character.setFlipX(true);      // 좌우 반전
            character.setTint(0xff8888);   // 붉은 틴트
        }

        // idle 애니메이션 재생
        character.play('knight_idle');

        // 상태바 생성 (캐릭터 머리 위로 충분히 올림)
        const statusBar = new StatusBar(this, character, {
            maxHp: 100,
            currentHp: 100,
            maxAp: 10,
            currentAp: 0,
            offsetY: -70
        });
        character.statusBar = statusBar;
        this.statusBars.push(statusBar);

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

    setupUI() {
        // 로그 윈도우 생성
        this.logWindow = new LogWindow(this);
    }

    setupBattleManager() {
        // 전투 매니저 생성 및 유닛 초기화
        this.battleManager = new BattleManager(this);
        this.battleManager.initializeUnits(this.allies, this.enemies);
    }

    setupInput() {
        // 스페이스바: Phase 2 테스트 (HP 10 감소, AP 5 감소)
        this.input.keyboard.on('keydown-SPACE', () => {
            this.battleManager.testRandomDamage();
        });

        // Enter: 자동 전투 시작/토글
        this.input.keyboard.on('keydown-ENTER', () => {
            if (!this.battleManager.isRunning) {
                this.battleManager.autoMode = true;
                this.battleManager.startBattle();
            } else {
                const isAuto = this.battleManager.toggleAutoMode();
                this.addLog(`자동 전투 ${isAuto ? 'ON' : 'OFF'}`, 'system');
            }
        });

        // P: 일시정지/재개
        this.input.keyboard.on('keydown-P', () => {
            if (this.battleManager.isRunning) {
                const isPaused = this.battleManager.togglePause();
                this.addLog(`전투 ${isPaused ? '일시정지' : '재개'}`, 'system');
            }
        });

        // M: 수동 턴 진행 (자동 모드 OFF 시)
        this.input.keyboard.on('keydown-M', () => {
            if (!this.battleManager.autoMode) {
                this.battleManager.manualNextTurn();
            }
        });
    }

    // 로그 추가 헬퍼 함수
    addLog(message, type = 'info') {
        if (this.logWindow) {
            this.logWindow.addLog(message, type);
        }
    }
}
