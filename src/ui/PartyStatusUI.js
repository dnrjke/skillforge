// 파티 현황판 UI (유니콘 오버로드 스타일)
// 입체 발판 + 캐릭터 스프라이트 + 체력바
// HTML/CSS 기반, z-index: 20

export default class PartyStatusUI {
    constructor(scene, battleManager, options = {}) {
        this.scene = scene;
        this.battleManager = battleManager;

        this.isEnemy = options.isEnemy || false;
        this.maxSlots = options.maxSlots || 6;
        this.activeSlots = options.activeSlots || [1, 2, 4];

        this.containerElement = null;
        this.unitElements = new Map();
        this.previousHp = new Map();

        this.isMobile = this.detectMobile();

        this.create();
        this.setupEventListeners();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    create() {
        this.injectStyles();

        // 메인 컨테이너 (perspective 적용)
        this.containerElement = document.createElement('div');
        this.containerElement.className = `battlefield-panel ${this.isEnemy ? 'enemy' : 'ally'}`;

        // 통합 보드 (하나의 큰 체스판 박스)
        const board = document.createElement('div');
        board.className = 'unified-board';

        // 보드 윗면 (하나의 연결된 면)
        const boardTop = document.createElement('div');
        boardTop.className = 'board-top';

        // 내부 분할선 (SVG로 사다리꼴 그리기)
        boardTop.innerHTML = `
            <svg class="board-lines" viewBox="0 0 180 80" preserveAspectRatio="none">
                <!-- 중앙 세로선 (역사다리꼴) -->
                <line x1="55" y1="0" x2="48" y2="80" stroke="#1a1510" stroke-width="2"/>
                <line x1="125" y1="0" x2="132" y2="80" stroke="#1a1510" stroke-width="2"/>
                <!-- 가로 중앙선 -->
                <line x1="0" y1="40" x2="180" y2="40" stroke="#1a1510" stroke-width="2"/>
            </svg>
            <!-- 6개 타일 배경색 -->
            <div class="tile-colors">
                <div class="tile-bg tile-0 tile-light"></div>
                <div class="tile-bg tile-1 tile-dark"></div>
                <div class="tile-bg tile-2 tile-light"></div>
                <div class="tile-bg tile-3 tile-dark"></div>
                <div class="tile-bg tile-4 tile-light"></div>
                <div class="tile-bg tile-5 tile-dark"></div>
            </div>
        `;

        // 보드 측면 (12px 두께, 하나의 연결된 면)
        const boardSide = document.createElement('div');
        boardSide.className = 'board-side';

        board.appendChild(boardTop);
        board.appendChild(boardSide);

        // 캐릭터 컨테이너 (임시 비활성화)
        // const unitsContainer = document.createElement('div');
        // unitsContainer.className = 'units-container';
        // this.containerElement.appendChild(unitsContainer);
        // this.unitsContainer = unitsContainer;

        this.containerElement.appendChild(board);

        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(this.containerElement);

        // 캐릭터 렌더링 임시 비활성화
        // this.renderUnits();
    }

    injectStyles() {
        if (document.getElementById('battlefield-panel-style')) return;

        const style = document.createElement('style');
        style.id = 'battlefield-panel-style';
        style.textContent = `
            /* ===== Google Fonts ===== */
            @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@400;700&family=Almendra:wght@400;700&display=swap');

            /* ===== 글로벌 데미지 숫자 폰트 ===== */
            .damage-number, .damage-text, [class*="damage-num"] {
                font-family: 'Almendra', serif !important;
                font-weight: 700;
            }

            /* ===== 메인 패널 (perspective 컨테이너) ===== */
            .battlefield-panel {
                position: absolute;
                z-index: 20;
                pointer-events: none;
                perspective: 800px;
            }

            .battlefield-panel.ally {
                left: 1%;
                bottom: 2%;
            }

            .battlefield-panel.enemy {
                right: 1%;
                bottom: 2%;
            }

            /* ===== 통합 보드 ===== */
            .unified-board {
                position: relative;
                width: 180px;
                height: 92px;
                transform: rotateX(20deg);
                transform-origin: center bottom;
                transform-style: preserve-3d;
            }

            .enemy .unified-board {
                transform: rotateX(20deg) scaleX(-1);
            }

            /* ===== 보드 윗면 (하나의 연결된 면) ===== */
            .board-top {
                position: absolute;
                top: 0;
                left: 0;
                width: 180px;
                height: 80px;
                background: #1a1510;
                border: 3px solid #0a0808;
                box-sizing: border-box;
                overflow: hidden;
            }

            /* 타일 배경 컨테이너 */
            .tile-colors {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }

            /* 개별 타일 배경 (clip-path로 사다리꼴) */
            .tile-bg {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            /* 좌측 상단 (0) - 사다리꼴 */
            .tile-0 {
                clip-path: polygon(0% 0%, 31% 0%, 27% 50%, 0% 50%);
            }

            /* 중앙 상단 (1) - 역사다리꼴 */
            .tile-1 {
                clip-path: polygon(31% 0%, 69% 0%, 73% 50%, 27% 50%);
            }

            /* 우측 상단 (2) - 사다리꼴 */
            .tile-2 {
                clip-path: polygon(69% 0%, 100% 0%, 100% 50%, 73% 50%);
            }

            /* 좌측 하단 (3) - 사다리꼴 */
            .tile-3 {
                clip-path: polygon(0% 50%, 27% 50%, 23% 100%, 0% 100%);
            }

            /* 중앙 하단 (4) - 역사다리꼴 */
            .tile-4 {
                clip-path: polygon(27% 50%, 73% 50%, 77% 100%, 23% 100%);
            }

            /* 우측 하단 (5) - 사다리꼴 */
            .tile-5 {
                clip-path: polygon(73% 50%, 100% 50%, 100% 100%, 77% 100%);
            }

            /* 타일 색상 */
            .tile-light {
                background: linear-gradient(180deg, #c8b898 0%, #a89878 100%);
            }

            .tile-dark {
                background: linear-gradient(180deg, #4a4858 0%, #2a2838 100%);
            }

            /* SVG 분할선 */
            .board-lines {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 5;
            }

            /* ===== 보드 측면 (12px 두께) ===== */
            .board-side {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 180px;
                height: 12px;
                background: linear-gradient(180deg, #5a4a38 0%, #3a2a18 100%);
                border: 3px solid #0a0808;
                border-top: none;
                box-sizing: border-box;
            }

            /* ===== 캐릭터 컨테이너 (임시 비활성화) ===== */
            .units-container {
                display: none;
            }

            /* ===== 개별 유닛 슬롯 ===== */
            .unit-slot {
                position: absolute;
                width: 58px;
                height: 65px;
            }

            /* 슬롯 위치 (3x2 그리드, 타일에 맞춤) */
            .unit-slot[data-pos="0"] { left: 0; top: -8px; }
            .unit-slot[data-pos="1"] { left: 61px; top: -12px; }
            .unit-slot[data-pos="2"] { left: 122px; top: -8px; }
            .unit-slot[data-pos="3"] { left: 0; top: 26px; }
            .unit-slot[data-pos="4"] { left: 61px; top: 22px; }
            .unit-slot[data-pos="5"] { left: 122px; top: 26px; }

            /* 중앙 열 슬롯 강조 */
            .unit-slot[data-pos="1"],
            .unit-slot[data-pos="4"] {
                z-index: 5;
            }

            /* ===== 캐릭터 그림자 (발판 위, 앞쪽) ===== */
            .unit-shadow {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: 30px;
                height: 8px;
                background: radial-gradient(
                    ellipse at center,
                    rgba(0, 0, 0, 0.6) 0%,
                    rgba(0, 0, 0, 0.2) 60%,
                    transparent 80%
                );
                border-radius: 50%;
                z-index: 2;
            }

            /* 중앙 슬롯 그림자 확대 */
            .unit-slot[data-pos="1"] .unit-shadow,
            .unit-slot[data-pos="4"] .unit-shadow {
                width: 34px;
                height: 9px;
            }

            /* ===== 유닛 스프라이트 (발판 위에 크게) ===== */
            .unit-sprite-wrapper {
                position: absolute;
                bottom: 22px;
                left: 50%;
                transform: translateX(-50%) scale(1.3);
                transform-origin: center bottom;
                width: 32px;
                height: 32px;
                overflow: visible;
                animation: spriteFloat 2s ease-in-out infinite;
                z-index: 3;
            }

            /* 중앙 슬롯 캐릭터 1.1배 더 크게 (총 1.43배) */
            .unit-slot[data-pos="1"] .unit-sprite-wrapper,
            .unit-slot[data-pos="4"] .unit-sprite-wrapper {
                transform: translateX(-50%) scale(1.43);
            }

            .unit-sprite {
                width: 32px;
                height: 32px;
                background-image: url('/assets/char/knight_a.png');
                background-repeat: no-repeat;
                image-rendering: pixelated;
                image-rendering: crisp-edges;
                background-position: 0 -96px;
                animation: spriteIdle 0.5s steps(1) infinite;
                filter: drop-shadow(1px 2px 1px rgba(0, 0, 0, 0.9));
            }

            .unit-sprite.enemy-sprite {
                transform: scaleX(-1);
                filter: drop-shadow(-1px 2px 1px rgba(0, 0, 0, 0.9))
                        sepia(0.3) hue-rotate(-30deg) saturate(1.3);
            }

            @keyframes spriteIdle {
                0%   { background-position: 0px -96px; }
                25%  { background-position: -32px -96px; }
                50%  { background-position: -64px -96px; }
                75%  { background-position: -96px -96px; }
                100% { background-position: 0px -96px; }
            }

            @keyframes spriteFloat {
                0%, 100% { transform: translateX(-50%) scale(1.3) translateY(0); }
                50% { transform: translateX(-50%) scale(1.3) translateY(-2px); }
            }

            /* 중앙 슬롯 플로팅 애니메이션 */
            .unit-slot[data-pos="1"] .unit-sprite-wrapper,
            .unit-slot[data-pos="4"] .unit-sprite-wrapper {
                animation: spriteFloatCenter 2s ease-in-out infinite;
            }

            @keyframes spriteFloatCenter {
                0%, 100% { transform: translateX(-50%) scale(1.43) translateY(0); }
                50% { transform: translateX(-50%) scale(1.43) translateY(-2px); }
            }

            /* ===== HP: 큰 숫자 + 작은 바 (발판 앞면에 붙임) ===== */
            .unit-hp-container {
                position: absolute;
                bottom: 3px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1px;
                z-index: 10;
            }

            /* 작은 HP바 (숫자 위에) */
            .mini-hp-bar {
                width: 46px;
                height: 4px;
                background: #080404;
                border: 1px solid #222;
                border-radius: 2px;
                overflow: hidden;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
            }

            .mini-hp-fill {
                height: 100%;
                background: linear-gradient(180deg, #6d6 0%, #4a4 100%);
                transition: width 0.3s ease;
            }

            .mini-hp-fill.enemy-hp {
                background: linear-gradient(180deg, #d66 0%, #944 100%);
            }

            .mini-hp-fill.low {
                background: linear-gradient(180deg, #da6 0%, #a74 100%);
            }

            .mini-hp-fill.critical {
                background: linear-gradient(180deg, #d44 0%, #922 100%);
                animation: hpPulse 0.4s ease-in-out infinite;
            }

            /* 큰 HP 숫자 */
            .mini-hp-text {
                font-family: 'Alexandria', sans-serif;
                font-size: 13px;
                font-weight: 700;
                color: #4e4;
                text-shadow:
                    -1px -1px 0 #000,
                    1px -1px 0 #000,
                    -1px 1px 0 #000,
                    1px 1px 0 #000,
                    0 0 4px rgba(0, 0, 0, 0.9);
                transition: all 0.15s ease;
                white-space: nowrap;
                line-height: 1.1;
                letter-spacing: -0.5px;
            }

            .mini-hp-text.enemy-text { color: #f66; }
            .mini-hp-text.low { color: #fa5; }
            .mini-hp-text.critical {
                color: #f55;
                animation: hpPulse 0.4s ease-in-out infinite;
            }

            .mini-hp-text.hp-changed {
                transform: scale(1.15);
                color: #fff !important;
            }

            .mini-hp-text.damage {
                color: #f33 !important;
                text-shadow: 0 0 6px #f00, -1px -1px 0 #000, 1px 1px 0 #000;
            }

            .mini-hp-text.heal {
                color: #3f7 !important;
                text-shadow: 0 0 6px #0f0, -1px -1px 0 #000, 1px 1px 0 #000;
            }

            /* ===== 피드백 효과 ===== */
            .unit-slot.damage-flash .unit-sprite-wrapper {
                animation: damageShake 0.25s ease;
            }

            @keyframes damageShake {
                0%, 100% { transform: translateX(-50%) translateY(0); }
                25% { transform: translateX(calc(-50% + 3px)) translateY(-1px); }
                75% { transform: translateX(calc(-50% - 3px)) translateY(1px); }
            }

            @keyframes hpPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }

            /* 사망 */
            .unit-slot.dead {
                opacity: 0.4;
                filter: grayscale(0.8) brightness(0.6);
            }

            .unit-slot.dead .unit-sprite-wrapper {
                animation: none;
            }

            .unit-slot.dead .unit-sprite {
                animation: none;
                background-position: -288px 0px;
                transform: none;
            }

            .unit-slot.dead .unit-sprite.enemy-sprite {
                transform: scaleX(-1);
            }

            .unit-slot.dead .unit-shadow {
                opacity: 0.3;
            }

            /* ===== 모바일 ===== */
            @media (max-width: 768px) {
                .battlefield-panel {
                    perspective: 600px;
                }
                .battlefield-panel.ally { left: 0.5%; bottom: 1%; }
                .battlefield-panel.enemy { right: 0.5%; bottom: 1%; }

                .unified-board {
                    width: 140px;
                    height: 72px;
                    transform: rotateX(18deg);
                }

                .enemy .unified-board {
                    transform: rotateX(18deg) scaleX(-1);
                }

                .board-top {
                    width: 140px;
                    height: 62px;
                }

                .board-side {
                    width: 140px;
                    height: 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    renderUnits() {
        const units = this.isEnemy
            ? this.battleManager.enemies
            : this.battleManager.allies;

        // 슬롯 매핑: activeSlots 값을 보드 위치로 변환
        const slotMapping = {
            1: 1,  // 중앙 뒷줄
            2: 2,  // 오른쪽 뒷줄
            4: 4   // 중앙 앞줄
        };

        units.forEach((unit, unitIndex) => {
            const activeSlotIndex = this.activeSlots[unitIndex];
            const gridIndex = slotMapping[activeSlotIndex];

            // 유닛 슬롯 생성
            const slot = document.createElement('div');
            slot.className = 'unit-slot';
            slot.dataset.pos = gridIndex;
            if (this.isEnemy) {
                slot.classList.add('enemy-slot');
            }

            // 캐릭터 그림자
            const shadow = document.createElement('div');
            shadow.className = 'unit-shadow';

            // HP 컨테이너 (작은 바 + 큰 숫자)
            const hpContainer = document.createElement('div');
            hpContainer.className = 'unit-hp-container';
            hpContainer.innerHTML = `
                <div class="mini-hp-bar">
                    <div class="mini-hp-fill ${this.isEnemy ? 'enemy-hp' : ''}"
                         style="width: ${(unit.currentHp / unit.maxHp) * 100}%"></div>
                </div>
                <span class="mini-hp-text ${this.isEnemy ? 'enemy-text' : ''}">${unit.currentHp}/${unit.maxHp}</span>
            `;

            // 유닛 스프라이트
            const spriteWrapper = document.createElement('div');
            spriteWrapper.className = 'unit-sprite-wrapper';
            spriteWrapper.innerHTML = `
                <div class="unit-sprite ${this.isEnemy ? 'enemy-sprite' : ''}"></div>
            `;

            slot.appendChild(shadow);
            slot.appendChild(hpContainer);
            slot.appendChild(spriteWrapper);

            this.unitsContainer.appendChild(slot);

            this.unitElements.set(unit.id, {
                slot: slot,
                hpBar: hpContainer.querySelector('.mini-hp-fill'),
                hpText: hpContainer.querySelector('.mini-hp-text'),
                sprite: spriteWrapper.querySelector('.unit-sprite'),
                unit: unit
            });

            this.previousHp.set(unit.id, unit.currentHp);
        });
    }

    setupEventListeners() {
        this.updateInterval = setInterval(() => {
            this.update();
        }, 100);
    }

    update() {
        const units = this.isEnemy
            ? this.battleManager.enemies
            : this.battleManager.allies;

        units.forEach(unit => {
            const elements = this.unitElements.get(unit.id);
            if (!elements) return;

            const prevHp = this.previousHp.get(unit.id);
            const currentHp = unit.currentHp;
            const maxHp = unit.maxHp;
            const hpRatio = currentHp / maxHp;

            if (prevHp !== currentHp) {
                const isDamage = currentHp < prevHp;
                const isHeal = currentHp > prevHp;

                elements.hpText.textContent = `${currentHp}/${maxHp}`;
                elements.hpBar.style.width = `${hpRatio * 100}%`;

                elements.hpText.classList.add('hp-changed');

                if (isDamage) {
                    elements.hpText.classList.add('damage');
                    elements.slot.classList.add('damage-flash');
                    setTimeout(() => elements.slot.classList.remove('damage-flash'), 250);
                } else if (isHeal) {
                    elements.hpText.classList.add('heal');
                }

                setTimeout(() => {
                    elements.hpText.classList.remove('hp-changed', 'damage', 'heal');
                }, 300);

                this.previousHp.set(unit.id, currentHp);
            }

            elements.hpText.classList.remove('low', 'critical');
            elements.hpBar.classList.remove('low', 'critical');

            if (hpRatio <= 0.25) {
                elements.hpText.classList.add('critical');
                elements.hpBar.classList.add('critical');
            } else if (hpRatio <= 0.5) {
                elements.hpText.classList.add('low');
                elements.hpBar.classList.add('low');
            }

            if (!unit.isAlive) {
                elements.slot.classList.add('dead');
            }
        });
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        if (this.containerElement && this.containerElement.parentNode) {
            this.containerElement.remove();
        }

        this.unitElements.clear();
        this.previousHp.clear();
    }
}
