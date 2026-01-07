/**
 * LEGACY: 기존 비행 렌더링 코드
 *
 * 이 파일은 Babylon.js 도입 이전의 Canvas 기반 구현을 보존합니다.
 * 참고용으로만 사용하며, 새로운 구현에서는 사용하지 않습니다.
 *
 * @deprecated Babylon.js NavigationScene으로 대체됨
 */

// import { FlightPosition } from '../types';
// import { getAllSlotPositions, getSlotSize } from '../Layout';

/**
 * [LEGACY] 비행 모드 렌더링
 * Canvas 2D Context 기반 구현
 */
/*
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

function handleFlightClick(x: number, y: number): void {
    console.log(`[Flight] Click at: ${x.toFixed(0)}, ${y.toFixed(0)}`);
    // TODO: 슬롯 선택, 유닛 배치 등
}
*/

export {};
