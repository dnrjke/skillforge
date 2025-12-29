import Phaser from 'phaser';
import BootScene from './autobattle/scenes/BootScene.js';
import BattleScene from './autobattle/scenes/BattleScene.js';
import PlatformerBootScene from './platformer/scenes/PlatformerBootScene';
import PlatformerScene from './platformer/scenes/PlatformerScene';

// 게임 모드 감지 (URL 파라미터로 전환)
// ?mode=platformer → 플랫포머 모드
// ?mode=battle → 자동전투 모드
// 파라미터 없음 → 모드 선택 화면
function getGameMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') || null;
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
        // 게임 컨테이너 밖의 스크롤 차단
        if (!gameContainer.contains(e.target)) {
            e.preventDefault();
        }
    }, { passive: false });
}

// 컨테이너 기반 Fullscreen (Canvas + HTML UI 모두 포함) - PC 전용
export function requestContainerFullscreen() {
    // 모바일에서는 Fullscreen API를 호출하지 않음
    // (Fullscreen API 호출이 오히려 주소표시줄을 나타나게 함)
    // 초기 로드 시 이미 주소표시줄이 숨겨진 상태를 유지
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

// 모드 선택 화면 생성
function createModeSelectScreen() {
    const uiOverlay = document.getElementById('ui-overlay');

    const selectScreen = document.createElement('div');
    selectScreen.id = 'mode-select-screen';
    selectScreen.innerHTML = `
        <div class="mode-select-container">
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

    // 스타일 추가
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

        /* 페이드 아웃 애니메이션 */
        #mode-select-screen.fade-out {
            animation: fadeOut 0.4s ease forwards;
        }

        @keyframes fadeOut {
            to {
                opacity: 0;
                pointer-events: none;
            }
        }
    `;

    document.head.appendChild(style);
    uiOverlay.appendChild(selectScreen);

    return selectScreen;
}

// 게임 시작
function startGame(mode) {
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
        scene: getScenes(mode)
    };

    new Phaser.Game(config);
}

// 초기화
preventOverscroll();

const initialMode = getGameMode();

if (initialMode) {
    // URL에 모드가 지정되어 있으면 바로 시작
    startGame(initialMode);
} else {
    // 모드 선택 화면 표시
    const selectScreen = createModeSelectScreen();

    // 버튼 클릭 이벤트
    selectScreen.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;

            // 페이드 아웃
            selectScreen.classList.add('fade-out');

            // 애니메이션 후 게임 시작
            setTimeout(() => {
                selectScreen.remove();
                startGame(mode);
            }, 400);
        });
    });
}
