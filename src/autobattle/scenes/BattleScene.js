import Phaser from 'phaser';
import LogWindow from '../ui/LogWindow.js';
import FieldStatusUI from '../ui/FieldStatusUI';
import BattleControlUI from '../ui/BattleControlUI.js';
import PartyStatusUI from '../ui/PartyStatusUI.js';
import BattleManager from '../systems/BattleManager.js';

/*
 * 캐릭터 배치 좌표 - 새 발판 이미지 기준 (2024-12-30)
 *
 * 레이아웃:
 *         좌(후열)    중(중열)    우(전열)
 * 상단     [5]후열2    [3]중열2    [1]전열2
 * 하단     [4]후열1    [2]중열1    [0]전열1
 *
 * 읽기 순서: 우→좌, 하→상 번갈아 → 0,1,2,3,4,5
 */
const FORMATION = {
    ALLY: [
        // 전열 (Front) - 우측
        { id: 0, row: 'front',  x: 400, y: 400 },  // 전열1 (우하단)
        { id: 1, row: 'front',  x: 380, y: 220 },  // 전열2 (우상단)
        // 중열 (Middle) - 중앙
        { id: 2, row: 'middle', x: 260, y: 380 },  // 중열1 (중하단)
        { id: 3, row: 'middle', x: 240, y: 200 },  // 중열2 (중상단)
        // 후열 (Back) - 좌측
        { id: 4, row: 'back',   x: 120, y: 360 },  // 후열1 (좌하단)
        { id: 5, row: 'back',   x: 100, y: 180 }   // 후열2 (좌상단)
    ],
    ENEMY: [
        // 전열 (Front) - 좌측 (적군 시점에선 우측)
        { id: 0, row: 'front',  x: 880, y: 400 },  // 전열1 (좌하단)
        { id: 1, row: 'front',  x: 900, y: 220 },  // 전열2 (좌상단)
        // 중열 (Middle) - 중앙
        { id: 2, row: 'middle', x: 1020, y: 380 }, // 중열1 (중하단)
        { id: 3, row: 'middle', x: 1040, y: 200 }, // 중열2 (중상단)
        // 후열 (Back) - 우측 (적군 시점에선 좌측)
        { id: 4, row: 'back',   x: 1160, y: 360 }, // 후열1 (우하단)
        { id: 5, row: 'back',   x: 1180, y: 180 }  // 후열2 (우상단)
    ]
};

// FORMATION 인덱스: 0-1=후열, 2-3=중열, 4-5=전열
const ACTIVE_SLOTS = [0, 1, 2, 3, 4, 5];

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
        this.allies = [];
        this.enemies = [];
        this.statusBars = [];
        this.logWindow = null;
        this.battleManager = null;
        this.battleControlUI = null;

        // 파티 현황판 UI
        this.allyStatusUI = null;
        this.enemyStatusUI = null;

        // 카메라 레이어 컨테이너
        this.worldContainer = null;
        this.mainCamera = null;
    }

    create() {
        // 컨테이너 생성
        this.setupContainers();

        // 카메라 설정
        this.setupCameras();

        // 배경 설정
        this.setupBackground();

        // 캐릭터 배치
        this.setupCharacters();

        // UI 설정
        this.setupUI();

        // 전투 매니저 초기화
        this.setupBattleManager();

        // 전투 컨트롤 UI 설정
        this.battleControlUI = new BattleControlUI(this, this.battleManager);

        // 파티 현황판 UI 설정
        this.setupPartyStatusUI();

        // PartyStatusUI 생성 후 저장된 설정 재적용 (초기 로드 시 DOM이 없어서 미적용되는 문제 해결)
        if (this.battleControlUI) {
            this.battleControlUI.applySettings();
        }

        // 입력 설정
        this.setupInput();

        // 리사이즈 이벤트 리스너
        this.scale.on('resize', this.repositionUI, this);

        // 시작 로그
        this.addLog('SkillForge - 키워드 기반 3vs3 RPG', 'system');
        this.addLog('스페이스바: 테스트 | Enter: 자동전투 | +/-: 줌', 'info');
    }

    update(time, delta) {
        // 필드 상태 UI 업데이트 (반딧불 애니메이션 포함)
        this.statusBars.forEach(bar => bar.update(delta));
    }

    setupContainers() {
        // World Container: 게임 월드 객체들 (캐릭터, 배경, StatusBar)
        // 카메라 줌/이동 영향을 받는 모든 객체를 포함
        this.worldContainer = this.add.container(0, 0);
        this.worldContainer.setDepth(0);
    }

    setupCameras() {
        // Main Camera: 모든 게임 오브젝트를 렌더링 (줌 가능)
        // DOM 요소들(LogWindow, BattleControlUI)은 이미 setScrollFactor(0)로 카메라 독립
        this.mainCamera = this.cameras.main;
        this.mainCamera.setZoom(1.0);
    }

    setupBackground() {
        // 배경 이미지를 화면 중앙에 꽉 차게 배치
        const bg = this.add.image(640, 360, 'bg_battle');
        bg.setDisplaySize(1280, 720);

        // 배경을 월드 컨테이너에 추가
        this.worldContainer.add(bg);
    }

    setupCharacters() {
        // 아군 배치 (6명)
        ACTIVE_SLOTS.forEach((slotIndex, index) => {
            const slot = FORMATION.ALLY[slotIndex];
            const ally = this.createCharacter(slot.x, slot.y, false, `아군${index + 1}`, slot.row, index);
            this.allies.push(ally);
        });

        // 적군 배치 (6명)
        ACTIVE_SLOTS.forEach((slotIndex, index) => {
            const slot = FORMATION.ENEMY[slotIndex];
            const enemy = this.createCharacter(slot.x, slot.y, true, `적군${index + 1}`, slot.row, index);
            this.enemies.push(enemy);
        });

        // Y좌표 기준으로 depth 정렬 (아래에 있을수록 앞에 보이게)
        this.sortCharactersByDepth();
    }

    createCharacter(x, y, isEnemy, name, row, debugIndex) {
        const character = this.add.sprite(x, y, 'knight');

        // 스케일 조정 (2배 확대: 3 -> 6)
        character.setScale(6);

        // 디버깅용 인덱스 표시
        const debugLabel = this.add.text(x, y - 100, `[${debugIndex}]`, {
            fontSize: '24px',
            color: isEnemy ? '#ff6666' : '#66ff66',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(3000);
        this.worldContainer.add(debugLabel);
        character.debugLabel = debugLabel;

        // 캐릭터 메타 정보
        character.data = {
            name: name,
            isEnemy: isEnemy,
            row: row
        };

        // 적군 설정
        if (isEnemy) {
            character.setFlipX(true);      // 좌우 반전
            character.setTint(0xff8888);   // 붉은 틴트
        }

        // idle 애니메이션 재생
        character.play('knight_idle');

        // 캐릭터를 월드 컨테이너에 추가
        this.worldContainer.add(character);

        // 필드 상태 UI 생성 (HP바 + AP/PP 반딧불)
        const fieldStatusUI = new FieldStatusUI(this, character, {
            maxHp: 100,
            currentHp: 100,
            maxAp: 18,
            currentAp: 18,  // 대형 3개 (15) + 소형 3개 (3) = 18
            maxPp: 3,
            currentPp: 3,
            offsetY: 20,  // 캐릭터 중심 아래
            speed: 10,
            isEnemy: isEnemy,
            parentContainer: this.worldContainer
        });
        character.statusBar = fieldStatusUI;
        this.statusBars.push(fieldStatusUI);

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

    setupPartyStatusUI() {
        // 아군 현황판 (좌하단)
        // ACTIVE_SLOTS를 사용 (파티 현황판 슬롯 = 전장 FORMATION 슬롯)
        this.allyStatusUI = new PartyStatusUI(this, this.battleManager, {
            isEnemy: false,
            activeSlots: ACTIVE_SLOTS
        });

        // 적군 현황판 (우하단)
        this.enemyStatusUI = new PartyStatusUI(this, this.battleManager, {
            isEnemy: true,
            activeSlots: ACTIVE_SLOTS
        });
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
                this.battleControlUI.updateStatus();
            } else {
                this.battleManager.toggleAutoMode();
                this.battleControlUI.updateStatus();
            }
        });

        // P: 일시정지/재개
        this.input.keyboard.on('keydown-P', () => {
            if (this.battleManager.isRunning) {
                this.battleManager.togglePause();
                this.battleControlUI.updateStatus();
            }
        });

        // M: 수동 턴 진행 (자동 모드 OFF 시)
        this.input.keyboard.on('keydown-M', () => {
            if (!this.battleManager.autoMode) {
                this.battleManager.manualNextTurn();
            }
        });

        // 1-4: 배속 단축키
        ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((key, index) => {
            this.input.keyboard.on(`keydown-${key}`, () => {
                const speeds = [1, 2, 4, 8];
                this.battleControlUI.setSpeed(speeds[index]);
            });
        });

        // +/-: 카메라 줌 조정
        this.input.keyboard.on('keydown-PLUS', () => {
            const newZoom = Math.min(this.mainCamera.zoom + 0.1, 2.0);
            this.mainCamera.setZoom(newZoom);
        });

        this.input.keyboard.on('keydown-MINUS', () => {
            const newZoom = Math.max(this.mainCamera.zoom - 0.1, 0.5);
            this.mainCamera.setZoom(newZoom);
        });

        // 0: 줌 리셋
        this.input.keyboard.on('keydown-ZERO', () => {
            this.mainCamera.setZoom(1.0);
        });
    }

    repositionUI(gameSize) {
        // 화면 크기 변경 시 UI 재배치
        const { width, height } = gameSize || this.scale;

        // 1. 카메라의 뷰포트를 새로운 크기에 맞춤
        this.cameras.main.setSize(width, height);

        // 2. UI 레이아웃 재배치
        // BattleControlUI 재배치
        if (this.battleControlUI) {
            this.battleControlUI.reposition(width, height);
        }

        // LogWindow 재배치
        if (this.logWindow) {
            this.logWindow.reposition(width, height);
        }
    }

    // 로그 추가 헬퍼 함수
    addLog(message, type = 'info') {
        if (this.logWindow) {
            this.logWindow.addLog(message, type);
        }
    }
}
