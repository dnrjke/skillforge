/**
 * 플랫포머 테스트 맵 데이터
 */

export interface PlatformData {
    x: number;
    y: number;
    width: number;
    height: number;
    color?: number;
}

export interface WallData {
    x: number;
    y: number;
    width: number;
    height: number;
    color?: number;
}

export interface MapData {
    id: string;
    name: string;
    description: string;
    playerStart: { x: number; y: number };
    platforms: PlatformData[];
    walls: WallData[];
    backgroundColor?: number;
}

// 기본 색상
const GROUND_COLOR = 0x3d3d5c;
const PLATFORM_COLOR = 0x4a4a6a;
const HIGH_PLATFORM_COLOR = 0x5a5a7a;
const WALL_COLOR = 0x2d2d4c;
const ACCENT_COLOR = 0x6a6a8a;

/**
 * 테스트 맵 목록
 */
export const MAPS: Record<string, MapData> = {
    // 1. 기본 테스트 맵
    basic: {
        id: 'basic',
        name: '기본 테스트',
        description: '기본 조작 연습',
        playerStart: { x: 200, y: 600 },
        platforms: [
            // 바닥
            { x: 640, y: 680, width: 1280, height: 40, color: GROUND_COLOR },
            // 중간 플랫폼들
            { x: 200, y: 550, width: 200, height: 20, color: PLATFORM_COLOR },
            { x: 500, y: 450, width: 250, height: 20, color: PLATFORM_COLOR },
            { x: 850, y: 400, width: 200, height: 20, color: PLATFORM_COLOR },
            { x: 1100, y: 300, width: 180, height: 20, color: PLATFORM_COLOR },
            // 높은 플랫폼
            { x: 300, y: 280, width: 150, height: 20, color: HIGH_PLATFORM_COLOR },
            { x: 600, y: 200, width: 200, height: 20, color: HIGH_PLATFORM_COLOR },
            // 떨어진 플랫폼
            { x: 1000, y: 550, width: 150, height: 20, color: PLATFORM_COLOR },
        ],
        walls: [
            { x: 10, y: 400, width: 20, height: 400, color: WALL_COLOR },
            { x: 1270, y: 400, width: 20, height: 400, color: WALL_COLOR },
            { x: 700, y: 500, width: 20, height: 200, color: WALL_COLOR },
        ]
    },

    // 2. 벽타기 테스트 맵
    wallClimb: {
        id: 'wallClimb',
        name: '벽타기 테스트',
        description: '벽 지탱 & 벽 점프',
        playerStart: { x: 100, y: 600 },
        backgroundColor: 0x1a2030,
        platforms: [
            // 바닥 (좁음)
            { x: 150, y: 680, width: 200, height: 40, color: GROUND_COLOR },
            // 도착 플랫폼 (우상단)
            { x: 1150, y: 150, width: 200, height: 20, color: 0x44aa66 },
            // 중간 쉼터
            { x: 640, y: 400, width: 100, height: 20, color: HIGH_PLATFORM_COLOR },
        ],
        walls: [
            // 좌측 벽 (높음)
            { x: 250, y: 400, width: 30, height: 500, color: WALL_COLOR },
            // 우측으로 진행하는 벽들 (지그재그)
            { x: 450, y: 500, width: 30, height: 300, color: WALL_COLOR },
            { x: 650, y: 350, width: 30, height: 300, color: WALL_COLOR },
            { x: 850, y: 250, width: 30, height: 400, color: WALL_COLOR },
            { x: 1050, y: 300, width: 30, height: 300, color: WALL_COLOR },
        ]
    },

    // 3. 대시 테스트 맵
    dashTest: {
        id: 'dashTest',
        name: '대시 테스트',
        description: '8방향 대시 연습',
        playerStart: { x: 640, y: 350 },
        backgroundColor: 0x201a2e,
        platforms: [
            // 중앙 메인 플랫폼
            { x: 640, y: 400, width: 200, height: 30, color: 0x5555aa },
            // 8방향 타겟 플랫폼들
            { x: 1000, y: 400, width: 80, height: 20, color: ACCENT_COLOR }, // 오른쪽
            { x: 280, y: 400, width: 80, height: 20, color: ACCENT_COLOR },  // 왼쪽
            { x: 640, y: 150, width: 80, height: 20, color: ACCENT_COLOR },  // 위
            { x: 640, y: 620, width: 80, height: 20, color: ACCENT_COLOR },  // 아래
            { x: 900, y: 200, width: 80, height: 20, color: ACCENT_COLOR },  // 우상
            { x: 380, y: 200, width: 80, height: 20, color: ACCENT_COLOR },  // 좌상
            { x: 900, y: 580, width: 80, height: 20, color: ACCENT_COLOR },  // 우하
            { x: 380, y: 580, width: 80, height: 20, color: ACCENT_COLOR },  // 좌하
            // 바닥 (추락 방지)
            { x: 640, y: 700, width: 1280, height: 20, color: 0x333344 },
        ],
        walls: [
            { x: 10, y: 360, width: 20, height: 720, color: WALL_COLOR },
            { x: 1270, y: 360, width: 20, height: 720, color: WALL_COLOR },
        ]
    },

    // 4. 수직 상승 맵
    vertical: {
        id: 'vertical',
        name: '수직 탑',
        description: '위로 올라가기',
        playerStart: { x: 640, y: 650 },
        backgroundColor: 0x1a1a28,
        platforms: [
            // 바닥
            { x: 640, y: 700, width: 400, height: 40, color: GROUND_COLOR },
            // 계단식 플랫폼
            { x: 500, y: 580, width: 120, height: 20, color: PLATFORM_COLOR },
            { x: 780, y: 480, width: 120, height: 20, color: PLATFORM_COLOR },
            { x: 500, y: 380, width: 120, height: 20, color: PLATFORM_COLOR },
            { x: 780, y: 280, width: 120, height: 20, color: PLATFORM_COLOR },
            { x: 500, y: 180, width: 120, height: 20, color: PLATFORM_COLOR },
            // 정상
            { x: 640, y: 80, width: 200, height: 20, color: 0x44aa66 },
        ],
        walls: [
            // 양쪽 벽
            { x: 350, y: 360, width: 20, height: 720, color: WALL_COLOR },
            { x: 930, y: 360, width: 20, height: 720, color: WALL_COLOR },
        ]
    },

    // 5. 장애물 코스
    obstacle: {
        id: 'obstacle',
        name: '장애물 코스',
        description: '종합 테스트',
        playerStart: { x: 80, y: 600 },
        backgroundColor: 0x1e1a2a,
        platforms: [
            // 시작 지점
            { x: 80, y: 680, width: 120, height: 40, color: GROUND_COLOR },
            // 점프 구간
            { x: 250, y: 620, width: 60, height: 20, color: PLATFORM_COLOR },
            { x: 380, y: 560, width: 60, height: 20, color: PLATFORM_COLOR },
            { x: 510, y: 500, width: 60, height: 20, color: PLATFORM_COLOR },
            // 벽타기 필요 구간 진입
            { x: 640, y: 450, width: 80, height: 20, color: HIGH_PLATFORM_COLOR },
            // 벽타기 후 착지
            { x: 850, y: 300, width: 80, height: 20, color: HIGH_PLATFORM_COLOR },
            // 대시 필요 구간 (멀리 떨어진 플랫폼)
            { x: 1100, y: 300, width: 100, height: 20, color: ACCENT_COLOR },
            // 골인 지점
            { x: 1200, y: 680, width: 120, height: 40, color: 0x44aa66 },
        ],
        walls: [
            // 경계
            { x: 10, y: 400, width: 20, height: 600, color: WALL_COLOR },
            { x: 1270, y: 400, width: 20, height: 600, color: WALL_COLOR },
            // 벽타기 구간
            { x: 720, y: 350, width: 20, height: 250, color: WALL_COLOR },
            { x: 780, y: 400, width: 20, height: 200, color: WALL_COLOR },
        ]
    },

    // 6. 반딧불 관리 테스트
    fireflyManagement: {
        id: 'fireflyManagement',
        name: '반딧불 관리',
        description: '자원 관리 연습',
        playerStart: { x: 100, y: 600 },
        backgroundColor: 0x151520,
        platforms: [
            // 시작
            { x: 100, y: 680, width: 150, height: 40, color: GROUND_COLOR },
            // 대시 필수 구간들 (바닥 없음, 반딧불 소모 필요)
            { x: 350, y: 500, width: 80, height: 20, color: PLATFORM_COLOR },
            { x: 550, y: 400, width: 80, height: 20, color: PLATFORM_COLOR },
            { x: 750, y: 300, width: 80, height: 20, color: PLATFORM_COLOR },
            // 중간 회복 지점 (바닥)
            { x: 950, y: 680, width: 150, height: 40, color: 0x3d5c3d },
            // 후반 구간
            { x: 1100, y: 500, width: 80, height: 20, color: HIGH_PLATFORM_COLOR },
            { x: 1200, y: 300, width: 100, height: 20, color: 0x44aa66 },
        ],
        walls: [
            { x: 10, y: 360, width: 20, height: 720, color: WALL_COLOR },
            { x: 1270, y: 360, width: 20, height: 720, color: WALL_COLOR },
        ]
    }
};

/**
 * 맵 목록 (UI 표시용)
 */
export const MAP_LIST = Object.values(MAPS);

/**
 * 맵 ID로 맵 데이터 가져오기
 */
export function getMapById(id: string): MapData | null {
    return MAPS[id] || null;
}
