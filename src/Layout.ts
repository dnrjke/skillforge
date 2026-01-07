/**
 * Skyline Blue: Arcana Vector - Layout System
 *
 * NOTE:
 * 이 좌표계는 프로토타입 전용.
 * 향후 비행 궤적 / 장애물 / 고저차 시스템 도입 시 폐기 가능.
 *
 * 헌법 준수:
 * - 모든 좌표는 비율 기반 (§6)
 * - 레이아웃 로직은 교체 가능해야 함
 */

import { FlightPosition } from './types';

/**
 * 아군 3x2 세로형 선봉 대형 좌표 계산
 *
 * 배치 순서:
 * 0:우상(선봉) -> 1:좌상 -> 2:중우 -> 3:중좌 -> 4:우하 -> 5:좌하
 *
 * @param index 슬롯 인덱스 (0-5)
 * @param width 캔버스 너비
 * @param height 캔버스 높이
 */
export function getFlightPathPosition(
    index: number,
    width: number,
    height: number
): FlightPosition {
    // 비율 기반 좌표 계산
    const baseX = width * 0.35;
    const baseY = height * 0.6;

    const colGap = width * 0.25;
    const rowGap = height * 0.12;
    const skew = width * 0.05;

    const row = Math.floor(index / 2);
    const isRight = index % 2 === 0;

    return {
        x: baseX + (isRight ? colGap : 0) - (row * skew),
        y: baseY + (row * rowGap),
        slotIndex: index,
    };
}

/**
 * 적군 3x2 미러 대형 좌표 계산
 */
export function getOpponentFlightPosition(
    index: number,
    width: number,
    height: number
): FlightPosition {
    const baseX = width * 0.65;
    const baseY = height * 0.35;

    const colGap = width * 0.25;
    const rowGap = height * 0.12;
    const skew = width * 0.05;

    const row = Math.floor(index / 2);
    const isLeft = index % 2 === 0;

    return {
        x: baseX - (isLeft ? colGap : 0) + (row * skew),
        y: baseY + (row * rowGap),
        slotIndex: index,
    };
}

/**
 * 모든 슬롯 좌표 반환
 */
export function getAllSlotPositions(
    width: number,
    height: number,
    team: 'ally' | 'opponent'
): FlightPosition[] {
    const positions: FlightPosition[] = [];
    const getPosition = team === 'ally' ? getFlightPathPosition : getOpponentFlightPosition;

    for (let i = 0; i < 6; i++) {
        positions.push(getPosition(i, width, height));
    }

    return positions;
}

/**
 * 터치 좌표를 캔버스 좌표로 변환
 *
 * 헌법 §5: getBoundingClientRect()를 활용해
 * 캔버스 스케일링에 따른 터치 좌표 오차 자동 보정
 */
export function screenToCanvas(
    screenX: number,
    screenY: number,
    canvas: HTMLCanvasElement
): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();

    // 스케일 보정
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        x: (screenX - rect.left) * scaleX,
        y: (screenY - rect.top) * scaleY,
    };
}

/**
 * 슬롯 크기 계산
 */
export function getSlotSize(width: number, height: number): { w: number; h: number } {
    return {
        w: width * 0.12,
        h: height * 0.08,
    };
}
