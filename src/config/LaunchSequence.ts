/**
 * Skyline Blue Launch Sequence Configuration
 *
 * 서사 단계별 시작 버튼 문구 및 비행 파트 연출 파라미터
 *
 * @module config/LaunchSequence
 */

// ============================================
// 서사 단계 (Narrative Steps)
// ============================================

/**
 * 서사 단계 타입
 */
export type NarrativeStep = 'step1' | 'step2' | 'step3' | 'special';

/**
 * 서사 단계 정의 인터페이스
 */
export interface StepDefinition {
    id: NarrativeStep;
    narrativeState: string;
    narrativeStateKo: string;
    buttonTextEng: string;
    buttonTextKor: string;
    subtitle: string;
    visualStyle: VisualStyleParams;
    unlockCondition: string;
    isSpecial: boolean;
}

/**
 * 시각적 스타일 파라미터
 */
export interface VisualStyleParams {
    primaryColor: string;
    secondaryColor: string;
    particleColor: string;
    glowIntensity: number;
    motionBlur: boolean;
    backgroundDistortion: boolean;
    description: string;
}

/**
 * 서사 단계별 정의 테이블
 */
export const STEP_DEFINITIONS: Record<NarrativeStep, StepDefinition> = {
    step1: {
        id: 'step1',
        narrativeState: 'Air Sports Club Daily',
        narrativeStateKo: '에어스포츠부 일상',
        buttonTextEng: 'Take Wing',
        buttonTextKor: '활공 개시',
        subtitle: '하늘로 날아오르다',
        visualStyle: {
            primaryColor: '#87CEEB',      // 하늘색
            secondaryColor: '#98FB98',     // 연두색
            particleColor: '#FFFFFF',
            glowIntensity: 0.4,
            motionBlur: false,
            backgroundDistortion: false,
            description: '우후 아일랜드풍의 청량하고 산뜻한 가속',
        },
        unlockCondition: 'default',
        isSpecial: false,
    },
    step2: {
        id: 'step2',
        narrativeState: 'Spirit Resonance',
        narrativeStateKo: '정령과의 공명',
        buttonTextEng: 'Sync Start',
        buttonTextKor: '동조 개시',
        subtitle: '정령의 숨결과 하나가 되다',
        visualStyle: {
            primaryColor: '#98FF98',      // 민트색
            secondaryColor: '#7FFFD4',     // 아쿠아마린
            particleColor: '#98FF98',
            glowIntensity: 0.6,
            motionBlur: false,
            backgroundDistortion: false,
            description: '캐릭터와 정령의 입자가 섞이는 민트색 이펙트',
        },
        unlockCondition: 'chapter2_complete',
        isSpecial: false,
    },
    step3: {
        id: 'step3',
        narrativeState: 'Arcana Cannon',
        narrativeStateKo: '아르카나 캐논',
        buttonTextEng: 'Vector Thrust',
        buttonTextKor: '벡터 사출',
        subtitle: '궤적이 곧 의지가 되다',
        visualStyle: {
            primaryColor: '#FF6B6B',      // 코랄 레드
            secondaryColor: '#4ECDC4',     // 틸
            particleColor: '#FFFFFF',
            glowIntensity: 0.9,
            motionBlur: true,
            backgroundDistortion: true,
            description: '레일건 사출 연출, 강렬한 모션 블러 및 배경 왜곡',
        },
        unlockCondition: 'chapter3_complete',
        isSpecial: false,
    },
    special: {
        id: 'special',
        narrativeState: 'Optimal Route (Dijkstra)',
        narrativeStateKo: '최적 경로 (Dijkstra)',
        buttonTextEng: 'Manifest',
        buttonTextKor: '현현',
        subtitle: '아르카나의 진정한 힘이 깨어나다',
        visualStyle: {
            primaryColor: '#FFD700',      // 금색
            secondaryColor: '#FFA500',     // 오렌지
            particleColor: '#FFD700',
            glowIntensity: 1.0,
            motionBlur: true,
            backgroundDistortion: true,
            description: '금빛 오라와 함께 아르카나 카드가 부서지는 연출',
        },
        unlockCondition: 'top_grade_achieved',
        isSpecial: true,
    },
};

// ============================================
// 버튼 상태 관리
// ============================================

/**
 * 버튼 활성화 상태
 */
export interface ButtonState {
    isEnabled: boolean;
    isSpecialAvailable: boolean;
    currentStep: NarrativeStep;
    displayText: string;
    displayTextKo: string;
}

/**
 * 현재 게임 상태에 따른 버튼 상태 계산
 *
 * @param isRouteComplete 항로 완성 여부
 * @param currentNarrativeStep 현재 서사 단계
 * @param isTopGrade Top 등급 달성 여부
 * @param specialUnlockConditionMet Special 버튼 별도 조건 충족 여부
 */
export function getButtonState(
    isRouteComplete: boolean,
    currentNarrativeStep: NarrativeStep,
    isTopGrade: boolean,
    specialUnlockConditionMet: boolean = false
): ButtonState {
    // 항로 미완성 시 비활성화
    if (!isRouteComplete) {
        return {
            isEnabled: false,
            isSpecialAvailable: false,
            currentStep: currentNarrativeStep,
            displayText: STEP_DEFINITIONS[currentNarrativeStep].buttonTextEng,
            displayTextKo: STEP_DEFINITIONS[currentNarrativeStep].buttonTextKor,
        };
    }

    // Special 조건: Top 등급 + 별도 조건 동시 충족
    const isSpecialAvailable = isTopGrade && specialUnlockConditionMet;

    // Special이 사용 가능하면 Special 버튼 표시
    if (isSpecialAvailable) {
        return {
            isEnabled: true,
            isSpecialAvailable: true,
            currentStep: 'special',
            displayText: STEP_DEFINITIONS.special.buttonTextEng,
            displayTextKo: STEP_DEFINITIONS.special.buttonTextKor,
        };
    }

    // 일반 버튼 상태
    return {
        isEnabled: true,
        isSpecialAvailable: false,
        currentStep: currentNarrativeStep,
        displayText: STEP_DEFINITIONS[currentNarrativeStep].buttonTextEng,
        displayTextKo: STEP_DEFINITIONS[currentNarrativeStep].buttonTextKor,
    };
}

// ============================================
// 연출 헬퍼 함수
// ============================================

/**
 * 단계별 파티클 색상 배열 반환
 */
export function getStepParticleColors(step: NarrativeStep): string[] {
    const def = STEP_DEFINITIONS[step];
    return [
        def.visualStyle.primaryColor,
        def.visualStyle.secondaryColor,
        def.visualStyle.particleColor,
    ];
}

/**
 * 버튼 그라데이션 CSS 생성
 */
export function getButtonGradient(step: NarrativeStep): string {
    const def = STEP_DEFINITIONS[step];
    return `linear-gradient(135deg, ${def.visualStyle.primaryColor}, ${def.visualStyle.secondaryColor})`;
}
