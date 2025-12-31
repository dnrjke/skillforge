/**
 * Layout - 모바일 우선 좌표 & 보드 로직
 *
 * MOBILE-FIRST ADAPTIVE LAYOUT
 * "태블릿은 다른 UI가 아니라, 더 여유 있는 모바일이다."
 *
 * 모든 좌표는 CANVAS_LOGICAL (360x640) 기준의 논리 좌표
 * 실제 화면 크기는 LayerManager가 스케일 변환 처리
 *
 * 발판 배치 로직:
 * - 아군: 좌하단 영역 점유, 3행 2열 세로형 평행사변형
 * - 적군: 우상단 영역 점유, 3행 2열 세로형 평행사변형 (미러)
 *
 * 배치 순서: 0:우상(선봉) -> 1:좌상 -> 2:중우 -> 3:중좌 -> 4:우하 -> 5:좌하
 */

import {
    Position,
    SlotPosition,
    TeamType,
    BoardConfig,
    SlotVisual,
    CANVAS_LOGICAL,
} from '../types';

/**
 * 레이아웃 상수 (논리 좌표 기준)
 * CANVAS_LOGICAL: 360x640
 */
const LAYOUT_CONFIG = {
    // 슬롯 크기 (논리 픽셀)
    SLOT_WIDTH: 43,    // 360 * 0.12 ≈ 43
    SLOT_HEIGHT: 51,   // 640 * 0.08 ≈ 51

    // 아군 보드 설정 (좌하단)
    ALLY_BOARD: {
        centerX: 126,      // 360 * 0.35 = 126
        centerY: 435,      // 640 * 0.68 = 435
        columnGap: 65,     // 360 * 0.18 ≈ 65
        rowGap: 64,        // 640 * 0.10 = 64
        skewOffset: 14,    // 360 * 0.04 ≈ 14
    },

    // 적군 보드 설정 (우상단)
    ENEMY_BOARD: {
        centerX: 234,      // 360 * 0.65 = 234
        centerY: 205,      // 640 * 0.32 ≈ 205
        columnGap: 65,     // 360 * 0.18 ≈ 65
        rowGap: 64,        // 640 * 0.10 = 64
        skewOffset: 14,    // 360 * 0.04 ≈ 14
    },

    // 전투 영역 (중앙)
    COMBAT_ZONE: {
        x: 36,             // 360 * 0.1 = 36
        y: 224,            // 640 * 0.35 = 224
        width: 288,        // 360 * 0.8 = 288
        height: 192,       // 640 * 0.3 = 192
    },

    // 유닛 오프셋 (슬롯 위에 배치)
    UNIT_OFFSET_Y: -15,    // 슬롯 높이 * 0.3 ≈ 15
} as const;

export class Layout {
    // 보드 설정 (논리 좌표)
    private allyBoard: BoardConfig;
    private enemyBoard: BoardConfig;

    // 슬롯 크기 (논리 좌표)
    private slotWidth: number;
    private slotHeight: number;

    // 캐시된 슬롯 위치
    private allySlots: SlotPosition[] = [];
    private enemySlots: SlotPosition[] = [];

    constructor() {
        // 고정 논리 좌표 기반 초기화
        this.slotWidth = LAYOUT_CONFIG.SLOT_WIDTH;
        this.slotHeight = LAYOUT_CONFIG.SLOT_HEIGHT;

        this.allyBoard = { ...LAYOUT_CONFIG.ALLY_BOARD };
        this.enemyBoard = { ...LAYOUT_CONFIG.ENEMY_BOARD };

        // 슬롯 위치 계산
        this.calculateSlotPositions();

        console.log('[Layout] Initialized (Mobile-First, Logical Coordinates)', {
            canvas: `${CANVAS_LOGICAL.WIDTH}x${CANVAS_LOGICAL.HEIGHT}`,
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
     * 입력 좌표는 논리 좌표여야 함 (LayerManager.screenToLogical 사용)
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
            y: slot.y + LAYOUT_CONFIG.UNIT_OFFSET_Y,
        };
    }

    /**
     * 전투 중앙 영역 (Combat Zone) 좌표 (논리 좌표)
     */
    public getCombatZone(): { x: number; y: number; width: number; height: number } {
        return { ...LAYOUT_CONFIG.COMBAT_ZONE };
    }

    /**
     * 슬롯 크기 조회 (논리 좌표)
     */
    public getSlotSize(): { width: number; height: number } {
        return { width: this.slotWidth, height: this.slotHeight };
    }

    /**
     * 논리 캔버스 크기 조회 (고정값)
     */
    public getLogicalSize(): { width: number; height: number } {
        return {
            width: CANVAS_LOGICAL.WIDTH,
            height: CANVAS_LOGICAL.HEIGHT,
        };
    }

    /**
     * 유닛 크기 계산 (논리 좌표)
     */
    public getUnitSize(): { width: number; height: number } {
        return {
            width: this.slotWidth * 0.8,
            height: this.slotHeight * 1.5,
        };
    }

    /**
     * 화면 하단 좌표 (추락 퇴장용)
     */
    public getBottomY(): number {
        return CANVAS_LOGICAL.HEIGHT + 100;
    }

    /**
     * 화면 상단 좌표 (비행 퇴장용)
     */
    public getTopY(): number {
        return -100;
    }
}
