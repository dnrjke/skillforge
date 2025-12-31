/**
 * Skillforge: Air-Sport - Entry Point
 *
 * "설계하고 감상하는 활공 스포츠"
 *
 * 헌법 준수:
 * - Canvas resize 책임은 여기서 (§5)
 * - AudioContext resume은 터치 이벤트에서 (§8)
 * - 프로토타입 우선 원칙 (§0)
 */

import { detectDevice, GameState, GamePhase } from './types';
import { AudioManager } from './AudioManager';
import { ScenarioManager, OPENING_SEQUENCE } from './ScenarioManager';
import { getAllSlotPositions, getSlotSize, screenToCanvas } from './Layout';

// ============================================
// 게임 상태
// ============================================

const gameState: GameState = {
    phase: 'splash',
    deviceClass: detectDevice(),
    audioResumed: false,
    debugMode: true,
};

// ============================================
// 시스템 인스턴스
// ============================================

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let audioManager: AudioManager;
let scenarioManager: ScenarioManager;

// DOM 요소
let touchStartScreen: HTMLElement | null;
let debugInfo: HTMLElement | null;

// ============================================
// Canvas Resize (헌법 §5)
// ============================================

/**
 * 캔버스 크기 조정
 *
 * 논리 해상도는 고정하고 CSS로 리사이징하여 기기 성능 저하 방지
 */
function resizeCanvas(): void {
    const container = document.getElementById('app-container');
    if (!container || !canvas) return;

    // 논리 해상도 (고정)
    const LOGICAL_WIDTH = 360;
    const LOGICAL_HEIGHT = 640;

    canvas.width = LOGICAL_WIDTH;
    canvas.height = LOGICAL_HEIGHT;

    // CSS 스케일링은 style.css에서 처리
    console.log(`[Canvas] Resized: ${LOGICAL_WIDTH}x${LOGICAL_HEIGHT}, Device: ${gameState.deviceClass}`);
}

// ============================================
// 초기화
// ============================================

async function initialize(): Promise<void> {
    console.log('='.repeat(50));
    console.log('  Skillforge: Air-Sport');
    console.log('  "설계하고 감상하는 활공 스포츠"');
    console.log('='.repeat(50));

    // DOM 요소 가져오기
    canvas = document.getElementById('world-layer') as HTMLCanvasElement;
    ctx = canvas.getContext('2d')!;
    touchStartScreen = document.getElementById('touch-start-screen');
    debugInfo = document.getElementById('debug-info');

    // 디바이스 감지
    gameState.deviceClass = detectDevice();
    console.log(`[Init] Device: ${gameState.deviceClass}`);

    // 캔버스 초기화
    resizeCanvas();
    window.addEventListener('resize', () => {
        gameState.deviceClass = detectDevice();
        resizeCanvas();
    });

    // 오디오 매니저 초기화
    audioManager = new AudioManager();
    await audioManager.initialize();

    // 시나리오 매니저 초기화
    scenarioManager = new ScenarioManager(audioManager);
    scenarioManager.setCallbacks({
        onEvent: handleScenarioEvent,
        onSequenceEnd: handleSequenceEnd,
    });

    // 이벤트 리스너 설정
    setupEventListeners();

    // 디버그 모드
    if (gameState.debugMode && debugInfo) {
        debugInfo.classList.remove('hidden');
    }

    // 게임 루프 시작
    requestAnimationFrame(gameLoop);

    console.log('[Init] Complete!');
}

// ============================================
// 이벤트 리스너
// ============================================

function setupEventListeners(): void {
    // 터치 시작 화면 클릭
    if (touchStartScreen) {
        touchStartScreen.addEventListener('click', handleTouchStart);
        touchStartScreen.addEventListener('touchend', handleTouchStart);
    }

    // 캔버스 클릭 (시나리오 진행 / 게임 조작)
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchend', handleCanvasTouch);

    // 키보드 (디버그)
    window.addEventListener('keydown', handleKeyDown);
}

/**
 * 터치 시작 처리 (첫 터치)
 */
async function handleTouchStart(event: Event): Promise<void> {
    event.preventDefault();

    // AudioContext resume (헌법 §8)
    await audioManager.resume();
    gameState.audioResumed = true;

    // 테스트 톤 재생 (동작 확인)
    audioManager.playTestTone(440, 0.1);

    // 터치 화면 숨기기
    if (touchStartScreen) {
        touchStartScreen.classList.add('hidden');
    }

    // 게임 시작
    startGame();
}

/**
 * 게임 시작
 */
function startGame(): void {
    gameState.phase = 'scenario';

    // 오프닝 시나리오 시작
    scenarioManager.startSequence(OPENING_SEQUENCE);

    console.log('[Game] Started');
}

/**
 * 캔버스 클릭 처리
 */
function handleCanvasClick(event: MouseEvent): void {
    const pos = screenToCanvas(event.clientX, event.clientY, canvas);

    if (gameState.phase === 'scenario') {
        scenarioManager.advanceStep();
    } else if (gameState.phase === 'flight') {
        handleFlightClick(pos.x, pos.y);
    }
}

/**
 * 캔버스 터치 처리
 */
function handleCanvasTouch(event: TouchEvent): void {
    event.preventDefault();
    if (event.changedTouches.length > 0) {
        const touch = event.changedTouches[0];
        const pos = screenToCanvas(touch.clientX, touch.clientY, canvas);

        if (gameState.phase === 'scenario') {
            scenarioManager.advanceStep();
        } else if (gameState.phase === 'flight') {
            handleFlightClick(pos.x, pos.y);
        }
    }
}

/**
 * 비행 모드 클릭 처리
 */
function handleFlightClick(x: number, y: number): void {
    console.log(`[Flight] Click at: ${x.toFixed(0)}, ${y.toFixed(0)}`);
    // TODO: 슬롯 선택, 유닛 배치 등
}

/**
 * 키보드 처리 (디버그)
 */
function handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
        case 'd':
            // 디버그 토글
            gameState.debugMode = !gameState.debugMode;
            if (debugInfo) {
                debugInfo.classList.toggle('hidden', !gameState.debugMode);
            }
            break;
        case 's':
            // 시나리오 스킵
            if (gameState.phase === 'scenario') {
                scenarioManager.skipSequence();
            }
            break;
        case 'f':
            // 비행 모드로 전환 (디버그)
            gameState.phase = 'flight';
            break;
    }
}

// ============================================
// 시나리오 이벤트 처리
// ============================================

function handleScenarioEvent(eventName: string): void {
    console.log(`[Scenario Event] ${eventName}`);

    switch (eventName) {
        case 'FADE_TO_CLUBROOM':
            // 화면 전환 효과
            break;
        case 'START_TUTORIAL':
            gameState.phase = 'flight';
            break;
    }
}

function handleSequenceEnd(): void {
    console.log('[Scenario] Sequence ended');
    // 시나리오 끝나면 비행 모드로
    gameState.phase = 'flight';
}

// ============================================
// 게임 루프
// ============================================

let lastTime = 0;

function gameLoop(currentTime: number): void {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // 화면 클리어
    ctx.fillStyle = '#0a0a15';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 상태별 렌더링
    switch (gameState.phase) {
        case 'splash':
            renderSplash();
            break;
        case 'scenario':
            renderScenario();
            break;
        case 'flight':
            renderFlight();
            break;
    }

    // 디버그 정보
    if (gameState.debugMode) {
        updateDebugInfo(deltaTime);
    }

    requestAnimationFrame(gameLoop);
}

// ============================================
// 렌더링
// ============================================

function renderSplash(): void {
    // 배경만 표시 (터치 대기)
    ctx.fillStyle = '#0a0a15';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function renderScenario(): void {
    // 시나리오는 HTML 레이어에서 처리됨
    // 캔버스는 배경 역할만
}

function renderFlight(): void {
    const { width, height } = canvas;

    // 배경 그라데이션
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0a0a15');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 발판 렌더링
    renderSlots(width, height);
}

function renderSlots(width: number, height: number): void {
    const allySlots = getAllSlotPositions(width, height, 'ally');
    const opponentSlots = getAllSlotPositions(width, height, 'opponent');
    const slotSize = getSlotSize(width, height);

    // 아군 슬롯 (파란색)
    ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
    ctx.lineWidth = 2;

    for (const slot of allySlots) {
        drawSlot(slot.x, slot.y, slotSize.w, slotSize.h, slot.slotIndex);
    }

    // 적군 슬롯 (붉은색)
    ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';

    for (const slot of opponentSlots) {
        drawSlot(slot.x, slot.y, slotSize.w, slotSize.h, slot.slotIndex);
    }
}

function drawSlot(x: number, y: number, w: number, h: number, index: number): void {
    const halfW = w / 2;
    const halfH = h / 2;
    const skew = w * 0.15;

    // 평행사변형
    ctx.beginPath();
    ctx.moveTo(x - halfW + skew, y - halfH);
    ctx.lineTo(x + halfW + skew, y - halfH);
    ctx.lineTo(x + halfW - skew, y + halfH);
    ctx.lineTo(x - halfW - skew, y + halfH);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // 슬롯 번호 (디버그)
    if (gameState.debugMode) {
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${index}`, x, y);
    }
}

// ============================================
// 디버그
// ============================================

function updateDebugInfo(deltaTime: number): void {
    if (!debugInfo) return;

    const fps = Math.round(1000 / deltaTime);
    debugInfo.innerHTML = `
        FPS: ${fps}<br>
        Device: ${gameState.deviceClass}<br>
        Phase: ${gameState.phase}<br>
        Audio: ${gameState.audioResumed ? 'OK' : 'Pending'}
    `;
}

// ============================================
// 시작
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
