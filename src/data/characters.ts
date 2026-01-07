/**
 * Skyline Blue: Arcana Vector - Character Definitions
 *
 * 캐릭터 데이터 정의
 * - 도입부 등장인물들
 * - 프로토타입이므로 최소한의 정보만
 */

export interface CharacterData {
    id: string;
    name: string;
    nameKo: string;
    role: 'coach' | 'flyer' | 'npc';
    personality: string;
    color: string;           // 대사창 색상
    bustImage?: string;      // 천사상 이미지
    flightStyle?: string;    // 비행 스타일 (에이스 연출용)
}

/**
 * 코치 (플레이어)
 * - 과거 에이스 플라이어였던 코치
 * - 지금은 폐부 위기의 부를 이끄는 중
 */
export const COACH: CharacterData = {
    id: 'coach',
    name: 'Coach',
    nameKo: '코치',
    role: 'coach',
    personality: '과묵하고 신중함. 과거의 영광을 짊어진 자.',
    color: '#6688aa',
};

/**
 * 부장 (간판 무스메)
 * - 부를 지키려는 책임감 강한 소녀
 * - 코치에게 직설적
 */
export const BUCHOU: CharacterData = {
    id: 'buchou',
    name: 'Buchou',
    nameKo: '부장',
    role: 'flyer',
    personality: '책임감 강하고 직설적. 부의 마지막 희망을 놓지 않으려 함.',
    color: '#ff7799',
    bustImage: 'assets/char/buchou_bust.gif',
    flightStyle: 'balanced',
};

/**
 * 날아든 소녀 (신입 희망자)
 * - 중등부에서 유명했던 플라이어
 * - 자신감 넘치고 당당함
 * - 하늘에서 곤두박질쳐서 등장
 */
export const NEWCOMER: CharacterData = {
    id: 'newcomer',
    name: 'Newcomer',
    nameKo: '날아든 소녀',
    role: 'flyer',
    personality: '자신감 넘치고 당당함. 중등부의 전설.',
    color: '#ffaa44',
    bustImage: 'assets/char/newcomer_bust.gif',
    flightStyle: 'aggressive',
};

/**
 * 에이스 (숨겨진 괴물)
 * - 흡혈귀 소녀 (설정 변경 가능)
 * - 낮에는 엉성하지만, 밤이 되면 압도적
 * - "하늘의 어떤 새도 빛을 바라게 하는, 악몽의 재림"
 */
export const ACE: CharacterData = {
    id: 'ace',
    name: 'Ace',
    nameKo: '에이스',
    role: 'flyer',
    personality: '평소엔 무기력하고 엉성함. 밤이 되면 각성.',
    color: '#aa44ff',
    bustImage: 'assets/char/ace_bust.gif',
    flightStyle: 'vampire', // 낮/밤 변환
};

/**
 * 능글맞은 부원
 * - 분위기 메이커
 * - 상황을 재미있게 이끄는 역할
 */
export const PLAYFUL: CharacterData = {
    id: 'playful',
    name: 'Playful',
    nameKo: '능글 부원',
    role: 'flyer',
    personality: '능글맞고 장난기 많음. 분위기 메이커.',
    color: '#44ddaa',
    bustImage: 'assets/char/playful_bust.gif',
    flightStyle: 'tricky',
};

/**
 * 전체 캐릭터 맵
 */
export const CHARACTERS: Record<string, CharacterData> = {
    coach: COACH,
    buchou: BUCHOU,
    newcomer: NEWCOMER,
    ace: ACE,
    playful: PLAYFUL,
};

/**
 * 캐릭터 조회
 */
export function getCharacter(id: string): CharacterData | undefined {
    return CHARACTERS[id];
}

/**
 * 대사창 색상 조회
 */
export function getSpeakerColor(speakerId: string): string {
    return CHARACTERS[speakerId]?.color ?? '#ffffff';
}
