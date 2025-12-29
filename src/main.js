import Phaser from 'phaser';
import BootScene from './autobattle/scenes/BootScene.js';
import BattleScene from './autobattle/scenes/BattleScene.js';
import PlatformerBootScene from './platformer/scenes/PlatformerBootScene';
import PlatformerScene from './platformer/scenes/PlatformerScene';

// 플랫포머 맵 데이터 (UI용)
const PLATFORMER_MAPS = [
    { id: 'basic', name: '기본 테스트', desc: '기본 조작 연습', icon: '🎮' },
    { id: 'wallClimb', name: '벽타기 테스트', desc: '벽 지탱 & 벽 점프', icon: '🧗' },
    { id: 'dashTest', name: '대시 테스트', desc: '8방향 대시 연습', icon: '💨' },
    { id: 'vertical', name: '수직 탑', desc: '위로 올라가기', icon: '🗼' },
    { id: 'obstacle', name: '장애물 코스', desc: '종합 테스트', icon: '🏃' },
    { id: 'fireflyManagement', name: '반딧불 관리', desc: '자원 관리 연습', icon: '🔥' },
];

// 게임 모드 감지 (URL 파라미터로 전환)
function getGameMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') || null;
}

function getMapId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('map') || 'basic';
}

// 모바일 감지
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && 'ontouchstart' in window);
}

// 모바일 바운싱 방지 (터치 이벤트)
function preventOverscroll() {
    document.addEventListener('touchstart', () => {}, { passive: false });

    document.addEventListener('touchmove', (e) => {
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer.contains(e.target)) {
            e.preventDefault();
        }
    }, { passive: false });
}

// 컨테이너 기반 Fullscreen - PC 전용
export function requestContainerFullscreen() {
    if (isMobileDevice()) {
        return;
    }

    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;

    if (gameContainer.requestFullscreen) {
        gameContainer.requestFullscreen().catch(() => {});
    } else if (gameContainer.webkitRequestFullscreen) {
        gameContainer.webkitRequestFullscreen();
    } else if (gameContainer.mozRequestFullScreen) {
        gameContainer.mozRequestFullScreen();
    } else if (gameContainer.msRequestFullscreen) {
        gameContainer.msRequestFullscreen();
    }
}

// 게임 모드에 따른 씬 선택
function getScenes(mode) {
    if (mode === 'platformer') {
        return [PlatformerBootScene, PlatformerScene];
    }
    return [BootScene, BattleScene];
}

// 스타일 주입
function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        #mode-select-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            pointer-events: auto;
        }

        .mode-select-container {
            text-align: center;
            font-family: 'Alexandria', sans-serif;
        }

        .game-title {
            font-family: 'Almendra', serif;
            font-size: clamp(32px, 8vw, 56px);
            color: #fff;
            margin: 0;
            text-shadow: 0 0 20px rgba(100, 150, 255, 0.5);
            letter-spacing: 4px;
        }

        .game-subtitle {
            font-size: clamp(12px, 3vw, 16px);
            color: #88aacc;
            margin: 8px 0 40px 0;
            letter-spacing: 2px;
        }

        .mode-buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
            padding: 0 20px;
        }

        .mode-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: clamp(140px, 30vw, 180px);
            height: clamp(140px, 30vw, 180px);
            padding: 20px;
            border: 2px solid #445;
            border-radius: 16px;
            background: linear-gradient(180deg, rgba(40, 50, 80, 0.9) 0%, rgba(30, 40, 60, 0.9) 100%);
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Alexandria', sans-serif;
        }

        .mode-btn:hover {
            transform: translateY(-4px);
            border-color: #6a8cff;
            box-shadow: 0 8px 24px rgba(100, 140, 255, 0.3);
        }

        .mode-btn:active {
            transform: translateY(0);
        }

        .mode-icon {
            font-size: clamp(36px, 8vw, 48px);
            margin-bottom: 12px;
        }

        .mode-name {
            font-size: clamp(16px, 4vw, 20px);
            font-weight: bold;
            color: #fff;
            margin-bottom: 6px;
        }

        .mode-desc {
            font-size: clamp(10px, 2.5vw, 12px);
            color: #8899aa;
        }

        .mode-hint {
            margin-top: 40px;
            font-size: 11px;
            color: #556;
        }

        /* 맵 선택 그리드 */
        .map-select-container {
            text-align: center;
            font-family: 'Alexandria', sans-serif;
            max-width: 900px;
        }

        .map-select-title {
            font-size: clamp(20px, 5vw, 28px);
            color: #fff;
            margin: 0 0 8px 0;
            text-shadow: 0 0 10px rgba(100, 150, 255, 0.3);
        }

        .map-select-subtitle {
            font-size: 13px;
            color: #666;
            margin-bottom: 24px;
        }

        .map-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            padding: 0 20px;
            max-height: 400px;
            overflow-y: auto;
        }

        .map-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 16px 12px;
            border: 2px solid #3a3a5a;
            border-radius: 12px;
            background: linear-gradient(180deg, rgba(35, 40, 60, 0.95) 0%, rgba(25, 30, 45, 0.95) 100%);
            cursor: pointer;
            transition: all 0.25s ease;
            font-family: 'Alexandria', sans-serif;
        }

        .map-btn:hover {
            transform: translateY(-3px);
            border-color: #ff9944;
            box-shadow: 0 6px 20px rgba(255, 150, 70, 0.25);
        }

        .map-btn:active {
            transform: translateY(0);
        }

        .map-icon {
            font-size: 28px;
            margin-bottom: 8px;
        }

        .map-name {
            font-size: 14px;
            font-weight: bold;
            color: #fff;
            margin-bottom: 4px;
        }

        .map-desc {
            font-size: 11px;
            color: #777;
        }

        .back-btn {
            margin-top: 24px;
            padding: 10px 28px;
            border: 1px solid #444;
            border-radius: 8px;
            background: rgba(50, 50, 70, 0.8);
            color: #aaa;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Alexandria', sans-serif;
        }

        .back-btn:hover {
            background: rgba(70, 70, 90, 0.9);
            color: #fff;
        }

        /* 페이드 애니메이션 */
        #mode-select-screen.fade-out {
            animation: fadeOut 0.4s ease forwards;
        }

        .slide-out-left {
            animation: slideOutLeft 0.3s ease forwards;
        }

        .slide-in-right {
            animation: slideInRight 0.3s ease forwards;
        }

        @keyframes fadeOut {
            to {
                opacity: 0;
                pointer-events: none;
            }
        }

        @keyframes slideOutLeft {
            to {
                transform: translateX(-30px);
                opacity: 0;
            }
        }

        @keyframes slideInRight {
            from {
                transform: translateX(30px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}

// 모드 선택 화면 생성
function createModeSelectScreen() {
    const uiOverlay = document.getElementById('ui-overlay');

    const selectScreen = document.createElement('div');
    selectScreen.id = 'mode-select-screen';
    selectScreen.innerHTML = `
        <div class="mode-select-container" id="main-menu">
            <h1 class="game-title">SkillForge</h1>
            <p class="game-subtitle">키워드 조합형 RPG</p>

            <div class="mode-buttons">
                <button class="mode-btn" data-mode="battle">
                    <span class="mode-icon">⚔️</span>
                    <span class="mode-name">자동전투</span>
                    <span class="mode-desc">3vs3 키워드 배틀</span>
                </button>

                <button class="mode-btn" data-mode="platformer">
                    <span class="mode-icon">🦋</span>
                    <span class="mode-name">플랫포머</span>
                    <span class="mode-desc">비산 대시 액션</span>
                </button>
            </div>

            <p class="mode-hint">테스트 빌드</p>
        </div>
    `;

    uiOverlay.appendChild(selectScreen);
    return selectScreen;
}

// 맵 선택 화면 생성
function createMapSelectUI() {
    let mapGridHTML = '';
    for (const map of PLATFORMER_MAPS) {
        mapGridHTML += `
            <button class="map-btn" data-map="${map.id}">
                <span class="map-icon">${map.icon}</span>
                <span class="map-name">${map.name}</span>
                <span class="map-desc">${map.desc}</span>
            </button>
        `;
    }

    return `
        <div class="map-select-container" id="map-menu">
            <h2 class="map-select-title">🦋 플랫포머 - 맵 선택</h2>
            <p class="map-select-subtitle">테스트할 맵을 선택하세요</p>

            <div class="map-grid">
                ${mapGridHTML}
            </div>

            <button class="back-btn" id="back-to-main">← 뒤로</button>
        </div>
    `;
}

// 게임 시작
function startGame(mode, mapId = 'basic') {
    const config = {
        type: Phaser.AUTO,
        width: 1280,
        height: 720,
        parent: 'game-container',
        backgroundColor: 0x000000,
        pixelArt: true,
        dom: {
            createContainer: true
        },
        physics: {
            default: 'arcade',
            arcade: {
                debug: false,
                gravity: mode === 'platformer' ? { x: 0, y: 1200 } : { x: 0, y: 0 }
            }
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: getScenes(mode),
        callbacks: {
            preBoot: (game) => {
                // 플랫포머 모드일 때 mapId 전달
                if (mode === 'platformer') {
                    game.registry.set('mapId', mapId);
                }
            }
        }
    };

    const game = new Phaser.Game(config);

    // 플랫포머 씬 시작 시 맵 ID 전달
    if (mode === 'platformer') {
        game.events.on('ready', () => {
            const platformerScene = game.scene.getScene('PlatformerScene');
            if (platformerScene) {
                // init 데이터로 전달
                game.scene.start('PlatformerScene', { mapId });
            }
        });
    }
}

// 초기화
preventOverscroll();
injectStyles();

const initialMode = getGameMode();

if (initialMode) {
    // URL에 모드가 지정되어 있으면 바로 시작
    const mapId = getMapId();
    startGame(initialMode, mapId);
} else {
    // 모드 선택 화면 표시
    const selectScreen = createModeSelectScreen();
    const mainMenu = selectScreen.querySelector('#main-menu');

    // 모드 버튼 클릭 이벤트
    selectScreen.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;

            if (mode === 'battle') {
                // 전투 모드 - 바로 시작
                selectScreen.classList.add('fade-out');
                setTimeout(() => {
                    selectScreen.remove();
                    startGame('battle');
                }, 400);
            } else if (mode === 'platformer') {
                // 플랫포머 모드 - 맵 선택 화면으로 전환
                mainMenu.classList.add('slide-out-left');

                setTimeout(() => {
                    mainMenu.style.display = 'none';
                    mainMenu.classList.remove('slide-out-left');

                    // 맵 선택 UI 추가
                    const mapUI = document.createElement('div');
                    mapUI.innerHTML = createMapSelectUI();
                    const mapMenu = mapUI.firstElementChild;
                    mapMenu.classList.add('slide-in-right');
                    selectScreen.appendChild(mapMenu);

                    // 맵 버튼 이벤트
                    mapMenu.querySelectorAll('.map-btn').forEach(mapBtn => {
                        mapBtn.addEventListener('click', () => {
                            const mapId = mapBtn.dataset.map;

                            selectScreen.classList.add('fade-out');
                            setTimeout(() => {
                                selectScreen.remove();
                                startGame('platformer', mapId);
                            }, 400);
                        });
                    });

                    // 뒤로 버튼
                    mapMenu.querySelector('#back-to-main').addEventListener('click', () => {
                        mapMenu.classList.add('slide-out-left');

                        setTimeout(() => {
                            mapMenu.remove();
                            mainMenu.style.display = '';
                            mainMenu.classList.add('slide-in-right');

                            setTimeout(() => {
                                mainMenu.classList.remove('slide-in-right');
                            }, 300);
                        }, 300);
                    });
                }, 300);
            }
        });
    });
}
