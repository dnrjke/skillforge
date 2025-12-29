import Phaser from 'phaser';
import LogWindow from '../ui/LogWindow.js';
import FieldStatusUI from '../ui/FieldStatusUI';
import BattleControlUI from '../ui/BattleControlUI.js';
import PartyStatusUI from '../ui/PartyStatusUI.js';
import BattleManager from '../systems/BattleManager.js';

// 캐릭터 배치 좌표 상수 (전열2/중열2/후열2 - 가로 화면 최적화)
// Y 좌표를 위로 이동 (-60)
const FORMATION = {
    ALLY: [
        // 후열 (Back) - 가장 왼쪽
        { id: 0, row: 'back',   x: 120, y: 200 },  // 후열 상
        { id: 1, row: 'back',   x: 150, y: 380 },  // 후열 하
        // 중열 (Middle)
        { id: 2, row: 'middle', x: 260, y: 220 },  // 중열 상
        { id: 3, row: 'middle', x: 290, y: 400 },  // 중열 하
        // 전열 (Front) - 가장 오른쪽
        { id: 4, row: 'front',  x: 400, y: 240 },  // 전열 상
        { id: 5, row: 'front',  x: 430, y: 420 }   // 전열 하
    ],
    ENEMY: [
        // 후열 (Back) - 가장 오른쪽
        { id: 0, row: 'back',   x: 1160, y: 200 }, // 후열 상
        { id: 1, row: 'back',   x: 1130, y: 380 }, // 후열 하
        // 중열 (Middle)
        { id: 2, row: 'middle', x: 1020, y: 220 }, // 중열 상
        { id: 3, row: 'middle', x: 990, y: 400 },  // 중열 하
        // 전열 (Front) - 가장 왼쪽
        { id: 4, row: 'front',  x: 880, y: 240 },  // 전열 상
        { id: 5, row: 'front',  x: 850, y: 420 }   // 전열 하
    ]
};

// 3vs3 전투에서 사용할 슬롯 인덱스 (편성에 따라 변경 가능)
// FORMATION 인덱스: 0-1=후열, 2-3=중열, 4-5=전열
const ACTIVE_SLOTS = [1, 2, 4]; // 뒷줄 하단, 중열 상단, 전열 상단

// PartyStatusUI용 슬롯 매핑 (FORMATION과 다른 레이아웃)
// PartyStatusUI: 0-2=뒷줄(대각선 상향), 3-5=앞줄(대각선 상향)
// 필드 배치와 시각적으로 일치하도록 매핑:
// - ally_0 (후열, x:150, 화면 왼쪽) → slot 0 (뒷줄 좌측)
// - ally_1 (중열, x:260, 화면 중앙) → slot 3 (앞줄 좌측)
// - ally_2 (전열, x:400, 화면 오른쪽) → slot 4 (앞줄 중앙)
const PARTY_STATUS_SLOTS = [0, 3, 4];

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

        console.log('[Container Debug] worldContainer created');
    }

    setupCameras() {
        // Main Camera: 모든 게임 오브젝트를 렌더링 (줌 가능)
        // DOM 요소들(LogWindow, BattleControlUI)은 이미 setScrollFactor(0)로 카메라 독립
        this.mainCamera = this.cameras.main;
        this.mainCamera.setZoom(1.0);

        console.log('[Camera Debug] Main Camera zoom:', this.mainCamera.zoom);
        console.log('[Camera Debug] Main Camera bounds:', this.mainCamera.getBounds());
    }

    setupBackground() {
        // 배경 이미지를 화면 중앙에 꽉 차게 배치
        const bg = this.add.image(640, 360, 'bg_battle');
        bg.setDisplaySize(1280, 720);

        // 배경을 월드 컨테이너에 추가
        this.worldContainer.add(bg);

        // 디버그 로그: worldContainer 가시성 확인
        console.log('[Visibility Debug] worldContainer alpha:', this.worldContainer.alpha);
        console.log('[Visibility Debug] worldContainer visible:', this.worldContainer.visible);
        console.log('[Visibility Debug] worldContainer length:', this.worldContainer.length);
        console.log('[Visibility Debug] background added to worldContainer:', bg);
    }

    setupCharacters() {
        // 아군 배치 (3명)
        ACTIVE_SLOTS.forEach((slotIndex, index) => {
            const slot = FORMATION.ALLY[slotIndex];
            const ally = this.createCharacter(slot.x, slot.y, false, `아군${index + 1}`, slot.row);
            this.allies.push(ally);
        });

        // 적군 배치 (3명)
        ACTIVE_SLOTS.forEach((slotIndex, index) => {
            const slot = FORMATION.ENEMY[slotIndex];
            const enemy = this.createCharacter(slot.x, slot.y, true, `적군${index + 1}`, slot.row);
            this.enemies.push(enemy);
        });

        // Y좌표 기준으로 depth 정렬 (아래에 있을수록 앞에 보이게)
        this.sortCharactersByDepth();
    }

    createCharacter(x, y, isEnemy, name, row) {
        const character = this.add.sprite(x, y, 'knight');

        // 스케일 조정 (2배 확대: 3 -> 6)
        character.setScale(6);

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
        // PARTY_STATUS_SLOTS를 사용하여 필드 배치와 시각적으로 일치시킴
        this.allyStatusUI = new PartyStatusUI(this, this.battleManager, {
            isEnemy: false,
            activeSlots: PARTY_STATUS_SLOTS
        });

        // 적군 현황판 (우하단)
        this.enemyStatusUI = new PartyStatusUI(this, this.battleManager, {
            isEnemy: true,
            activeSlots: PARTY_STATUS_SLOTS
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
