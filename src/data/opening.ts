/**
 * Skyline Blue: Arcana Vector - Opening Scenario
 *
 * 도입부 시나리오 데이터
 * 사키(Saki) 애니메이션 스타일의 연출 참고
 *
 * 구조:
 * 1. 해변 오프닝 (과거 회상)
 * 2. 부실로 복귀 (부장에게 꾸중)
 * 3. 폐부 위기 설명
 * 4. 과거 회상 (떠난 부원들)
 * 5. 대립 (부장의 직구)
 * 6. 극적 등장 (날아든 소녀)
 * 7. 부실 이동 & BGM 전환
 * 8. 비행 시연 (컷신)
 * 9. 에이스 등장
 * 10. 튜토리얼 비행
 * 11. 저녁 - 에이스 각성 (컷신)
 * 12. 도입부 종료
 */

import { ScenarioSequence } from '../types';

// ============================================
// 시퀀스 1: 해변 오프닝 (과거 회상)
// ============================================

export const SEQUENCE_BEACH_OPENING: ScenarioSequence = {
    id: 'beach_opening',
    name: '해변 오프닝',
    steps: [
        // 스플래시 → 해변 전환
        {
            type: 'cutscene',
            gif: 'assets/cutscene/beach_sunset.gif',
            sfx: 'seagull_waves',
            duration: 3000,
        },
        // 독백 시작
        {
            type: 'text',
            text: '(끼룩끼룩... 파도 소리가 멀리서 들려온다.)',
            bg: 'assets/bg/beach_sunset.jpg',
        },
        {
            type: 'cutscene',
            gif: 'assets/cutscene/beach_girls_01.gif',
            duration: 2500,
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '과거엔 이 하늘이 나의 전부였지.',
        },
        {
            type: 'cutscene',
            gif: 'assets/cutscene/beach_girls_02.gif',
            duration: 2000,
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '높이 날고, 더 높이... 그게 전부인 줄 알았다.',
        },
        {
            type: 'cutscene',
            gif: 'assets/cutscene/beach_girls_03.gif',
            duration: 2000,
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '그때의 하늘은... 참 눈이 부셨어.',
        },
        // 과거 회상 종료, 현재로
        {
            type: 'event',
            event: 'FADE_TO_BLACK',
        },
        {
            type: 'event',
            event: 'END_BEACH_SEQUENCE',
        },
    ],
};

// ============================================
// 시퀀스 2: 부실 - 현재로 복귀
// ============================================

export const SEQUENCE_CLUBROOM_INTRO: ScenarioSequence = {
    id: 'clubroom_intro',
    name: '부실 - 현재',
    steps: [
        {
            type: 'text',
            bg: 'assets/bg/clubroom.jpg',
            bgm: 'bgm_clubroom',
            text: '......',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '야!',
            sfx: 'slap_desk',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '정신 안 차려? 코치가 졸면 어떡해!',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '...어, 미안.',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '후... 요즘 계속 그러시네.',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '또 그때 생각하신 거죠?',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '......',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '...알았어요. 더 안 물을게요.',
        },
        // 폐부 위기 설명
        {
            type: 'text',
            text: '(부장이 한숨을 쉬며 창밖을 바라본다.)',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '어차피 이 부도... 곧 없어질지 모르는데.',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '......학교 측에서 또 뭐라고 했어?',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '다음 대회에서 성과가 없으면 폐부 검토한대요.',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '정령전투학과 동아리는 예산 두 배 늘려주면서!',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '에어스포츠... 요즘 인기가 없으니까.',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '그래서 다들 떠난 거잖아요.',
        },
        {
            type: 'event',
            event: 'START_FLASHBACK_MEMBERS',
        },
    ],
};

// ============================================
// 시퀀스 3: 과거 회상 - 떠난 부원들
// ============================================

export const SEQUENCE_FLASHBACK_MEMBERS: ScenarioSequence = {
    id: 'flashback_members',
    name: '과거 회상 - 떠난 부원들',
    steps: [
        {
            type: 'cutscene',
            gif: 'assets/cutscene/former_member_01.gif',
            bgm: 'bgm_melancholy',
            duration: 2000,
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '(정령을 잘 다루던 아이들이었지...)',
            bg: 'assets/bg/clubroom_empty.jpg',
        },
        {
            type: 'cutscene',
            gif: 'assets/cutscene/former_member_02.gif',
            duration: 2000,
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '(정령전투학과 추천을 받으면... 거절할 이유가 없으니까.)',
        },
        {
            type: 'cutscene',
            gif: 'assets/cutscene/former_member_03.gif',
            duration: 2000,
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '(하나 둘... 떠나갔다.)',
        },
        {
            type: 'event',
            event: 'END_FLASHBACK',
        },
    ],
};

// ============================================
// 시퀀스 4: 대립 - 부장의 직구
// ============================================

export const SEQUENCE_CONFRONTATION: ScenarioSequence = {
    id: 'confrontation',
    name: '대립',
    steps: [
        {
            type: 'text',
            bg: 'assets/bg/clubroom.jpg',
            bgm: 'bgm_tension',
            speaker: 'buchou',
            text: '......코치님.',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '솔직히 물을게요.',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '코치님도... 떠나실 건가요?',
        },
        {
            type: 'text',
            text: '(부장이 똑바로 쳐다본다. 눈에 불안과 결의가 섞여 있다.)',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '......',
        },
        {
            type: 'text',
            text: '(대답할 수 없었다. 아니, 대답을 피하고 싶었다.)',
        },
        {
            type: 'text',
            text: '(어색한 침묵이 부실을 가득 채우는 그 순간—)',
        },
        // 극적 등장!
        {
            type: 'event',
            event: 'DRAMATIC_ENTRANCE',
        },
    ],
};

// ============================================
// 시퀀스 5: 극적 등장 - 날아든 소녀
// ============================================

export const SEQUENCE_DRAMATIC_ENTRANCE: ScenarioSequence = {
    id: 'dramatic_entrance',
    name: '극적 등장',
    steps: [
        {
            type: 'cutscene',
            gif: 'assets/cutscene/crash_landing.gif',
            sfx: 'crash_impact',
            duration: 1500,
        },
        {
            type: 'text',
            bg: 'assets/bg/clubroom_mess.jpg',
            sfx: 'glass_break',
            text: '쾅!!!',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '...으윽!?',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '뭐, 뭐야!?',
        },
        {
            type: 'text',
            text: '(하늘에서 무언가가 곤두박질쳐 코치에게 부딪혔다.)',
        },
        {
            type: 'text',
            text: '(그것은... 비행 중이던 모르는 소녀였다.)',
        },
        {
            type: 'cutscene',
            gif: 'assets/cutscene/newcomer_reveal.gif',
            bgm: 'bgm_newcomer_theme',
            duration: 2500,
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '앗... 아야야.',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '착지 미스... 죄송해요!',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '아, 그건 그렇고—',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '여기가 ○○학원 에어스포츠부 맞죠?',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '입부 신청합니다!',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '......',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '잠깐, 저 얼굴... 설마!?',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '중등부 전국대회 MVP... "천공의 유성"!?',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '에헤~ 아시는구나. 반가워요!',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '왜... 왜 우리 학교에!?',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '이유요? 간단해요.',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '재밌을 것 같아서!',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '(폐부 직전인 부가... 재미있다고?)',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '......일단, 안에서 이야기하죠.',
        },
        {
            type: 'event',
            event: 'MOVE_TO_CLUBROOM_PROPER',
        },
    ],
};

// ============================================
// 시퀀스 6: 부실 내부 - 능글 부원 등장
// ============================================

export const SEQUENCE_CLUBROOM_MEETING: ScenarioSequence = {
    id: 'clubroom_meeting',
    name: '부실 미팅',
    steps: [
        {
            type: 'text',
            bg: 'assets/bg/clubroom_inside.jpg',
            bgm: 'bgm_casual',
            text: '(부실 안으로 자리를 옮겼다.)',
        },
        {
            type: 'text',
            speaker: 'playful',
            text: '어어~ 뭐야, 갑자기 시끄러워서 왔더니.',
        },
        {
            type: 'text',
            speaker: 'playful',
            text: '오오? 신입? 신입이야?',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '그렇게 된 것 같아...',
        },
        {
            type: 'text',
            speaker: 'playful',
            text: '우와, 드디어! 이제 폐부 안 되겠네~',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '아직 몰라. 대회 성적이...',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '성적이요? 뭐가 문제예요?',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '...길어. 나중에 설명해줄게.',
        },
        {
            type: 'text',
            speaker: 'playful',
            text: '그런 건 나중에 하고~',
        },
        {
            type: 'text',
            speaker: 'playful',
            text: '신입 언니, 나는 거 한 번 볼까?',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '좋아요! 보여드릴게요!',
        },
        {
            type: 'event',
            event: 'START_NEWCOMER_FLIGHT_CUTSCENE',
        },
    ],
};

// ============================================
// 시퀀스 7: 신입의 비행 (컷신)
// ============================================

export const SEQUENCE_NEWCOMER_FLIGHT: ScenarioSequence = {
    id: 'newcomer_flight',
    name: '신입의 비행',
    steps: [
        {
            type: 'cutscene',
            gif: 'assets/cutscene/newcomer_flight_01.gif',
            bgm: 'bgm_flight_hype',
            duration: 3000,
        },
        {
            type: 'cutscene',
            gif: 'assets/cutscene/newcomer_flight_02.gif',
            duration: 2500,
        },
        {
            type: 'cutscene',
            gif: 'assets/cutscene/newcomer_flight_03.gif',
            duration: 2500,
        },
        {
            type: 'text',
            bg: 'assets/bg/sky.jpg',
            speaker: 'playful',
            text: '우와아...',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '역시 중등부 MVP... 수준이 다르네.',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '후~ 어땠어요?',
        },
        {
            type: 'text',
            speaker: 'playful',
            text: '완전 대박! 너무 멋있어!',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '......나쁘지 않군.',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '나쁘지 않다니! 좀 더 칭찬해주세요~',
        },
        {
            type: 'event',
            event: 'BUCHOU_MENTIONS_ACE',
        },
    ],
};

// ============================================
// 시퀀스 8: 에이스 등장
// ============================================

export const SEQUENCE_ACE_INTRODUCTION: ScenarioSequence = {
    id: 'ace_introduction',
    name: '에이스 등장',
    steps: [
        {
            type: 'text',
            bg: 'assets/bg/clubroom_inside.jpg',
            bgm: 'bgm_mysterious',
            speaker: 'buchou',
            text: '......그런데 말이야.',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '우리 부엔 진짜 괴물이 있어.',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '괴물...?',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '하늘의 어떤 새도 빛을 바라게 하는...',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '"악몽의 재림"이라고 불리는 애.',
        },
        {
            type: 'text',
            speaker: 'playful',
            text: '아~ 그 언니?',
        },
        {
            type: 'cutscene',
            gif: 'assets/cutscene/ace_entrance.gif',
            sfx: 'door_creak',
            duration: 2000,
        },
        {
            type: 'text',
            speaker: 'ace',
            text: '.......',
        },
        {
            type: 'text',
            text: '(문이 열리고, 뭔가 엉성해 보이는 소녀가 들어온다.)',
        },
        {
            type: 'text',
            text: '(창백한 피부... 빛을 피하듯 고개를 숙인 모습.)',
        },
        {
            type: 'text',
            speaker: 'ace',
            text: '...시끄러워서 왔어.',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '......저 사람이?',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '응. 우리 부의 에이스야.',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '에이스!? 저렇게 힘없어 보이는데?',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '저도 나는 거 보고 싶어요!',
        },
        {
            type: 'text',
            speaker: 'ace',
            text: '...싫어.',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '에? 왜요?',
        },
        {
            type: 'text',
            speaker: 'ace',
            text: '...낮이라서.',
        },
        {
            type: 'text',
            speaker: 'playful',
            text: '에이스 언니, 그냥 한 번만~',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '그래, 신입한테 보여줘.',
        },
        {
            type: 'text',
            speaker: 'ace',
            text: '......귀찮은데.',
        },
        {
            type: 'text',
            speaker: 'ace',
            text: '...알았어. 한 번만.',
        },
        {
            type: 'event',
            event: 'START_TUTORIAL_FLIGHT',
        },
    ],
};

// ============================================
// 시퀀스 9: 튜토리얼 비행 (플레이어블)
// ============================================

export const SEQUENCE_TUTORIAL_INTRO: ScenarioSequence = {
    id: 'tutorial_intro',
    name: '튜토리얼 도입',
    steps: [
        {
            type: 'text',
            bg: 'assets/bg/training_field.jpg',
            bgm: 'bgm_tutorial',
            text: '(연습장으로 이동했다.)',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '(에이스의 비행... 낮에는 정말 엉성하지.)',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '(하지만 그게 이 아이의 전부가 아니라는 걸 나는 안다.)',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '코치님, 이번엔 직접 지도해 주세요.',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '......알았어.',
        },
        {
            type: 'text',
            text: '[ 튜토리얼 시작 ]',
        },
        {
            type: 'text',
            text: '에이스의 비행 궤적을 코칭하세요.',
        },
        {
            type: 'text',
            text: '발판을 터치해서 비행 경로를 설정합니다.',
        },
        {
            type: 'event',
            event: 'START_FLIGHT_GAMEPLAY',
        },
    ],
};

// ============================================
// 시퀀스 10: 튜토리얼 후 - 저녁
// ============================================

export const SEQUENCE_EVENING_REVEAL: ScenarioSequence = {
    id: 'evening_reveal',
    name: '저녁 - 에이스 각성',
    steps: [
        {
            type: 'text',
            bg: 'assets/bg/training_field_sunset.jpg',
            bgm: 'bgm_sunset',
            text: '(어느덧... 해가 지고 있었다.)',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '뭐야, 저 에이스라는 사람...',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '계속 실수만 하네. 과대평가 아냐?',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '......조금만 기다려봐.',
        },
        {
            type: 'text',
            speaker: 'playful',
            text: '해가 지면 달라질 거야~',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '해가 지면...?',
        },
        {
            type: 'text',
            text: '(그때, 마지막 햇살이 사라지고—)',
        },
        {
            type: 'cutscene',
            gif: 'assets/cutscene/ace_awakening.gif',
            bgm: 'bgm_ace_theme',
            duration: 3000,
        },
        {
            type: 'text',
            text: '(에이스의 눈이... 붉게 빛났다.)',
        },
        {
            type: 'cutscene',
            gif: 'assets/cutscene/ace_true_flight_01.gif',
            duration: 2500,
        },
        {
            type: 'cutscene',
            gif: 'assets/cutscene/ace_true_flight_02.gif',
            duration: 2500,
        },
        {
            type: 'cutscene',
            gif: 'assets/cutscene/ace_true_flight_03.gif',
            duration: 3000,
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '.......',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '뭐... 뭐야, 저건...!?',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '이게 우리 에이스의 진짜 모습이야.',
        },
        {
            type: 'text',
            speaker: 'playful',
            text: '압도적이지~?',
        },
        {
            type: 'text',
            text: '(에이스가 도도하게 착지한다.)',
        },
        {
            type: 'text',
            speaker: 'ace',
            text: '...이 정도면 됐어?',
        },
        {
            type: 'text',
            speaker: 'ace',
            text: '난 갈게. ...졸려.',
        },
        {
            type: 'text',
            text: '(에이스가 유유히 사라진다.)',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '.......',
        },
        {
            type: 'text',
            text: '(날아든 소녀의 눈이 에이스의 뒷모습을 쫓는다.)',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '(저런 비행... 본 적 없어.)',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '(이 부... 재밌을지도.)',
        },
        {
            type: 'event',
            event: 'END_OPENING',
        },
    ],
};

// ============================================
// 시퀀스 11: 도입부 종료
// ============================================

export const SEQUENCE_OPENING_END: ScenarioSequence = {
    id: 'opening_end',
    name: '도입부 종료',
    steps: [
        {
            type: 'text',
            bg: 'assets/bg/clubroom_night.jpg',
            bgm: 'bgm_hopeful',
            speaker: 'buchou',
            text: '자, 그럼 정식으로.',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '○○학원 에어스포츠부에 온 걸 환영해!',
        },
        {
            type: 'text',
            speaker: 'newcomer',
            text: '네! 잘 부탁드려요!',
        },
        {
            type: 'text',
            speaker: 'playful',
            text: '와~ 이제 최소 인원 맞았다!',
        },
        {
            type: 'text',
            speaker: 'buchou',
            text: '......응. 이제 시작이야.',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '(폐부는... 조금 멀어졌나.)',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '(하지만 대회까지 시간이 얼마 없다.)',
        },
        {
            type: 'text',
            speaker: 'coach',
            text: '(여기서부터... 진짜 시작이다.)',
        },
        {
            type: 'text',
            text: '[ 프롤로그 종료 ]',
        },
        {
            type: 'event',
            event: 'PROLOGUE_COMPLETE',
        },
    ],
};

// ============================================
// 전체 시퀀스 맵
// ============================================

export const OPENING_SEQUENCES: Record<string, ScenarioSequence> = {
    beach_opening: SEQUENCE_BEACH_OPENING,
    clubroom_intro: SEQUENCE_CLUBROOM_INTRO,
    flashback_members: SEQUENCE_FLASHBACK_MEMBERS,
    confrontation: SEQUENCE_CONFRONTATION,
    dramatic_entrance: SEQUENCE_DRAMATIC_ENTRANCE,
    clubroom_meeting: SEQUENCE_CLUBROOM_MEETING,
    newcomer_flight: SEQUENCE_NEWCOMER_FLIGHT,
    ace_introduction: SEQUENCE_ACE_INTRODUCTION,
    tutorial_intro: SEQUENCE_TUTORIAL_INTRO,
    evening_reveal: SEQUENCE_EVENING_REVEAL,
    opening_end: SEQUENCE_OPENING_END,
};

/**
 * 오프닝 시퀀스 순서
 */
export const OPENING_ORDER: string[] = [
    'beach_opening',
    'clubroom_intro',
    'flashback_members',
    'confrontation',
    'dramatic_entrance',
    'clubroom_meeting',
    'newcomer_flight',
    'ace_introduction',
    'tutorial_intro',
    // tutorial_intro 이후 실제 튜토리얼 플레이
    'evening_reveal',
    'opening_end',
];
