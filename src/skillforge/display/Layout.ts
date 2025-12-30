/**
 * Layout - 좌표 & 보드 로직
 *
 * 발판 배치 로직:
 * - 아군: 좌하단 영역 점유, 3행 2열 세로형 평행사변형
 * - 적군: 우상단 영역 점유, 3행 2열 세로형 평행사변형 (미러)
 *
 * 배치 순서: 0:우상(선봉) -> 1:좌상 -> 2:중우 -> 3:중좌 -> 4:우하 -> 5:좌하
 */

import { Position, SlotPosition, TeamType, BoardConfig, SlotVisual } from '../types';

export class Layout {
    private screenWidth: number = 0;
    private screenHeight: number = 0;

    // 보드 설정
    private allyBoard: BoardConfig = {
        centerX: 0,
        centerY: 0,
        columnGap: 0,
        rowGap: 0,
        skewOffset: 0,
    };

    private enemyBoard: BoardConfig = {
        centerX: 0,
        centerY: 0,
        columnGap: 0,
        rowGap: 0,
        skewOffset: 0,
    };

    // 슬롯 크기
    private slotWidth: number = 0;
    private slotHeight: number = 0;

    // 캐시된 슬롯 위치
    private allySlots: SlotPosition[] = [];
    private enemySlots: SlotPosition[] = [];

    /**
     * 레이아웃 초기화
     */
    public initialize(screenWidth: number, screenHeight: number): void {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;

        // 슬롯 크기 계산 (화면 비율 기반)
        this.slotWidth = screenWidth * 0.12;
        this.slotHeight = screenHeight * 0.08;

        // 아군 보드 설정 (좌하단)
        this.allyBoard = {
            centerX: screenWidth * 0.35,
            centerY: screenHeight * 0.68,
            columnGap: screenWidth * 0.18,
            rowGap: screenHeight * 0.10,
            skewOffset: screenWidth * 0.04,
        };

        // 적군 보드 설정 (우상단)
        this.enemyBoard = {
            centerX: screenWidth * 0.65,
            centerY: screenHeight * 0.32,
            columnGap: screenWidth * 0.18,
            rowGap: screenHeight * 0.10,
            skewOffset: screenWidth * 0.04,
        };

        // 슬롯 위치 계산
        this.calculateSlotPositions();

        console.log('[Layout] Initialized:', {
            screen: { width: screenWidth, height: screenHeight },
            slotSize: { width: this.slotWidth, height: this.slotHeight },
        });
    }

    /**
     * 모든 슬롯 위치 계산
     */
    private calculateSlotPositions(): void {
        this.allySlots = [];
        this.enemySlots = [];

        for (let i = 0; i < 6; i++) {
            this.allySlots.push(this.calculateSlotPosition(i, 'ally'));
            this.enemySlots.push(this.calculateSlotPosition(i, 'enemy'));
        }
    }

    /**
     * 개별 슬롯 위치 계산
     *
     * 배치 순서 (3행 2열):
     * Row 0: [0] 우측(전진열)  [1] 좌측(후방열)
     * Row 1: [2] 우측         [3] 좌측
     * Row 2: [4] 우측         [5] 좌측
     */
    private calculateSlotPosition(index: number, team: TeamType): SlotPosition {
        const board = team === 'ally' ? this.allyBoard : this.enemyBoard;
        const isAlly = team === 'ally';

        // 행과 열 계산
        const row = Math.floor(index / 2);      // 0, 1, 2행
        const isRightCol = (index % 2 === 0);   // 짝수(0,2,4)는 우측(전진열)

        let x: number;
        let y: number;

        if (isAlly) {
            // 아군: 좌하단, 우상향 사선
            // 우측열이 적에게 더 가까움 (x가 더 큼)
            x = board.centerX + (isRightCol ? board.columnGap / 2 : -board.columnGap / 2);
            // 행이 내려갈수록 y가 커짐 (아래로)
            y = board.centerY + (row - 1) * board.rowGap;
            // 사선 효과: 행이 내려갈수록 왼쪽으로 밀림
            x -= row * board.skewOffset;
        } else {
            // 적군: 우상단, 좌하향 사선 (아군의 미러)
            // 좌측열이 아군에게 더 가까움
            x = board.centerX + (isRightCol ? -board.columnGap / 2 : board.columnGap / 2);
            // 행이 내려갈수록 y가 커짐 (아래로)
            y = board.centerY + (row - 1) * board.rowGap;
            // 사선 효과: 행이 내려갈수록 오른쪽으로 밀림
            x += row * board.skewOffset;
        }

        return {
            x,
            y,
            slotIndex: index,
            label: `Slot ${index}`,
        };
    }

    /**
     * 슬롯 위치 조회
     */
    public getSlotPosition(slotIndex: number, team: TeamType): SlotPosition | null {
        const slots = team === 'ally' ? this.allySlots : this.enemySlots;
        return slots[slotIndex] ?? null;
    }

    /**
     * 모든 슬롯 조회
     */
    public getAllSlots(team: TeamType): SlotPosition[] {
        return team === 'ally' ? [...this.allySlots] : [...this.enemySlots];
    }

    /**
     * 좌표에서 슬롯 인덱스 찾기 (클릭 감지용)
     */
    public getSlotAtPosition(x: number, y: number, team: TeamType): number | null {
        const slots = team === 'ally' ? this.allySlots : this.enemySlots;

        for (const slot of slots) {
            const halfW = this.slotWidth / 2;
            const halfH = this.slotHeight / 2;

            if (
                x >= slot.x - halfW &&
                x <= slot.x + halfW &&
                y >= slot.y - halfH &&
                y <= slot.y + halfH
            ) {
                return slot.slotIndex;
            }
        }

        return null;
    }

    /**
     * 슬롯 시각 정보 조회 (렌더링용)
     */
    public getSlotVisual(slotIndex: number, team: TeamType, occupied: boolean = false): SlotVisual {
        const pos = this.getSlotPosition(slotIndex, team);
        if (!pos) {
            throw new Error(`Invalid slot index: ${slotIndex}`);
        }

        return {
            slotIndex,
            position: { x: pos.x, y: pos.y },
            size: { width: this.slotWidth, height: this.slotHeight },
            team,
            occupied,
        };
    }

    /**
     * 유닛 위치 계산 (슬롯 중앙에서 약간 위로 오프셋)
     */
    public getUnitPosition(slotIndex: number, team: TeamType): Position {
        const slot = this.getSlotPosition(slotIndex, team);
        if (!slot) {
            return { x: 0, y: 0 };
        }

        return {
            x: slot.x,
            y: slot.y - this.slotHeight * 0.3, // 슬롯 위에 유닛 배치
        };
    }

    /**
     * 전투 중앙 영역 (Combat Zone) 좌표
     */
    public getCombatZone(): { x: number; y: number; width: number; height: number } {
        return {
            x: this.screenWidth * 0.1,
            y: this.screenHeight * 0.35,
            width: this.screenWidth * 0.8,
            height: this.screenHeight * 0.3,
        };
    }

    /**
     * 슬롯 크기 조회
     */
    public getSlotSize(): { width: number; height: number } {
        return { width: this.slotWidth, height: this.slotHeight };
    }

    /**
     * 화면 크기 조회
     */
    public getScreenSize(): { width: number; height: number } {
        return { width: this.screenWidth, height: this.screenHeight };
    }

    /**
     * 유닛 크기 계산
     */
    public getUnitSize(): { width: number; height: number } {
        return {
            width: this.slotWidth * 0.8,
            height: this.slotHeight * 1.5,
        };
    }
}
