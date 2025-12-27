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

        // 메인 컨테이너
        this.containerElement = document.createElement('div');
        this.containerElement.className = `battlefield-panel ${this.isEnemy ? 'enemy' : 'ally'}`;

        // 전장 그리드
        const gridWrapper = document.createElement('div');
        gridWrapper.className = 'grid-wrapper';

        for (let col = 0; col < 3; col++) {
            const column = document.createElement('div');
            column.className = `grid-column col-${col}`;

            for (let row = 0; row < 2; row++) {
                const slotIndex = row * 3 + col;
                // 체스판 패턴
                const isLightTile = (col + row) % 2 === 0;

                // 슬롯 (투명 컨테이너)
                const slot = document.createElement('div');
                slot.className = 'grid-slot';
                slot.dataset.slotIndex = slotIndex;

                // 입체 발판 (슬롯 하단에 위치)
                const platform = document.createElement('div');
                platform.className = `platform ${isLightTile ? 'platform-light' : 'platform-dark'}`;

                // 발판 윗면
                const platformTop = document.createElement('div');
                platformTop.className = 'platform-top';

                // 발판 옆면 (두께감)
                const platformSide = document.createElement('div');
                platformSide.className = 'platform-side';

                platform.appendChild(platformTop);
                platform.appendChild(platformSide);
                slot.appendChild(platform);
                column.appendChild(slot);
            }

            gridWrapper.appendChild(column);
        }

        this.containerElement.appendChild(gridWrapper);

        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(this.containerElement);

        this.renderUnits();
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

            /* ===== 메인 패널 ===== */
            .battlefield-panel {
                position: absolute;
                z-index: 20;
                pointer-events: none;
            }

            .battlefield-panel.ally {
                left: 1%;
                bottom: 2%;
            }

            .battlefield-panel.enemy {
                right: 1%;
                bottom: 2%;
            }

            /* ===== 그리드 래퍼 (전체 원근감) ===== */
            .grid-wrapper {
                display: flex;
                gap: 2px;
                transform: perspective(600px) rotateX(25deg);
                transform-origin: center bottom;
            }

            .enemy .grid-wrapper {
                flex-direction: row-reverse;
            }

            /* ===== 그리드 열 ===== */
            .grid-column {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            /* 열별 깊이감 */
            .grid-column.col-0 { transform: translateY(6px); }
            .grid-column.col-1 { transform: translateY(0px); }
            .grid-column.col-2 { transform: translateY(-6px); }

            /* ===== 슬롯 (투명 컨테이너) ===== */
            .grid-slot {
                width: 60px;
                height: 58px;
                position: relative;
                background: transparent;
            }

            /* ===== 입체 발판 ===== */
            .platform {
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 54px;
                height: 24px;
            }

            /* 발판 윗면 (사다리꼴) */
            .platform-top {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 18px;
                clip-path: polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%);
                border-radius: 2px;
            }

            /* 발판 옆면 (두께) */
            .platform-side {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 8px;
                clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
                border-radius: 0 0 2px 2px;
            }

            /* ===== 밝은 발판 (사암/금색 톤) ===== */
            .platform-light .platform-top {
                background: linear-gradient(
                    180deg,
                    #a89880 0%,
                    #8a7a65 40%,
                    #7a6a55 100%
                );
                box-shadow:
                    inset 0 1px 0 rgba(255, 240, 200, 0.4),
                    inset 0 -1px 2px rgba(0, 0, 0, 0.3);
            }

            .platform-light .platform-side {
                background: linear-gradient(
                    180deg,
                    #5a4a35 0%,
                    #3a2a1a 100%
                );
            }

            /* ===== 어두운 발판 (짙은 남색/검정) ===== */
            .platform-dark .platform-top {
                background: linear-gradient(
                    180deg,
                    #4a4855 0%,
                    #2a2835 40%,
                    #1a1825 100%
                );
                box-shadow:
                    inset 0 1px 0 rgba(150, 150, 180, 0.2),
                    inset 0 -1px 2px rgba(0, 0, 0, 0.4);
            }

            .platform-dark .platform-side {
                background: linear-gradient(
                    180deg,
                    #151320 0%,
                    #0a0810 100%
                );
            }

            /* ===== 유닛이 있는 슬롯 ===== */
            .grid-slot.occupied .platform-light .platform-top {
                background: linear-gradient(
                    180deg,
                    #c8b898 0%,
                    #a89878 40%,
                    #988868 100%
                );
                box-shadow:
                    inset 0 2px 0 rgba(255, 240, 200, 0.5),
                    inset 0 -2px 3px rgba(0, 0, 0, 0.3),
                    0 0 8px rgba(180, 160, 120, 0.3);
            }

            .grid-slot.occupied .platform-dark .platform-top {
                background: linear-gradient(
                    180deg,
                    #5a5868 0%,
                    #3a3848 40%,
                    #2a2838 100%
                );
                box-shadow:
                    inset 0 2px 0 rgba(150, 150, 200, 0.3),
                    inset 0 -2px 3px rgba(0, 0, 0, 0.4),
                    0 0 8px rgba(100, 100, 150, 0.3);
            }

            /* 적군 발판 */
            .grid-slot.occupied.enemy-slot .platform-light .platform-top {
                background: linear-gradient(
                    180deg,
                    #b89888 0%,
                    #987868 40%,
                    #886858 100%
                );
                box-shadow:
                    inset 0 2px 0 rgba(255, 200, 180, 0.4),
                    inset 0 -2px 3px rgba(0, 0, 0, 0.3),
                    0 0 8px rgba(180, 100, 100, 0.3);
            }

            .grid-slot.occupied.enemy-slot .platform-dark .platform-top {
                background: linear-gradient(
                    180deg,
                    #5a4858 0%,
                    #3a2838 40%,
                    #2a1828 100%
                );
                box-shadow:
                    inset 0 2px 0 rgba(200, 150, 150, 0.3),
                    inset 0 -2px 3px rgba(0, 0, 0, 0.4),
                    0 0 8px rgba(150, 80, 80, 0.3);
            }

            /* ===== 캐릭터 그림자 (발밑 타원) ===== */
            .unit-shadow {
                position: absolute;
                bottom: 18px;
                left: 50%;
                transform: translateX(-50%);
                width: 28px;
                height: 8px;
                background: radial-gradient(
                    ellipse at center,
                    rgba(0, 0, 0, 0.5) 0%,
                    rgba(0, 0, 0, 0.2) 50%,
                    transparent 70%
                );
                border-radius: 50%;
                z-index: 1;
            }

            /* ===== 유닛 스프라이트 ===== */
            .unit-sprite-wrapper {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: 32px;
                height: 32px;
                overflow: hidden;
                animation: spriteFloat 2s ease-in-out infinite;
                z-index: 2;
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
                filter: drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.8));
            }

            .unit-sprite.enemy-sprite {
                transform: scaleX(-1);
                filter: drop-shadow(-1px 1px 1px rgba(0, 0, 0, 0.8))
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
                0%, 100% { transform: translateX(-50%) translateY(0); }
                50% { transform: translateX(-50%) translateY(-2px); }
            }

            /* ===== HP 바 (캐릭터 위) ===== */
            .unit-hp-container {
                position: absolute;
                bottom: 50px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1px;
                z-index: 3;
            }

            .mini-hp-bar {
                width: 42px;
                height: 5px;
                background: #0a0808;
                border: 1px solid #3a3030;
                border-radius: 2px;
                overflow: hidden;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }

            .mini-hp-fill {
                height: 100%;
                background: linear-gradient(180deg, #5a5 0%, #3a3 50%, #4a4 100%);
                transition: width 0.3s ease;
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
            }

            .mini-hp-fill.enemy-hp {
                background: linear-gradient(180deg, #a55 0%, #833 50%, #944 100%);
            }

            .mini-hp-fill.low {
                background: linear-gradient(180deg, #a84 0%, #863 50%, #974 100%);
            }

            .mini-hp-fill.critical {
                background: linear-gradient(180deg, #a33 0%, #811 50%, #922 100%);
                animation: hpPulse 0.4s ease-in-out infinite;
            }

            .mini-hp-text {
                font-family: 'Alexandria', sans-serif;
                font-size: 9px;
                font-weight: 700;
                color: #dfd;
                text-shadow:
                    1px 0 0 #000, -1px 0 0 #000,
                    0 1px 0 #000, 0 -1px 0 #000,
                    1px 1px 0 #000;
                transition: all 0.2s ease;
            }

            .mini-hp-text.enemy-text { color: #fdd; }
            .mini-hp-text.low { color: #fda; }
            .mini-hp-text.critical { color: #faa; }

            .mini-hp-text.hp-changed {
                transform: scale(1.4);
                color: #fff !important;
            }

            .mini-hp-text.damage {
                color: #f44 !important;
                text-shadow: 0 0 4px #f00, 1px 1px 0 #000;
            }

            .mini-hp-text.heal {
                color: #4f8 !important;
                text-shadow: 0 0 4px #0f0, 1px 1px 0 #000;
            }

            /* ===== 피드백 효과 ===== */
            .grid-slot.damage-flash .platform-top {
                animation: platformFlash 0.25s ease;
            }

            .grid-slot.damage-flash .unit-sprite-wrapper {
                animation: damageShake 0.25s ease;
            }

            @keyframes platformFlash {
                0%, 100% { filter: brightness(1); }
                50% { filter: brightness(1.8); }
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
            .grid-slot.dead {
                opacity: 0.4;
                filter: grayscale(0.8) brightness(0.6);
            }

            .grid-slot.dead .unit-sprite-wrapper {
                animation: none;
            }

            .grid-slot.dead .unit-sprite {
                animation: none;
                background-position: -288px 0px;
                transform: none;
            }

            .grid-slot.dead .unit-sprite.enemy-sprite {
                transform: scaleX(-1);
            }

            .grid-slot.dead .unit-shadow {
                opacity: 0.3;
            }

            /* ===== 모바일 ===== */
            @media (max-width: 768px) {
                .battlefield-panel.ally { left: 0.5%; bottom: 1%; }
                .battlefield-panel.enemy { right: 0.5%; bottom: 1%; }

                .grid-wrapper {
                    gap: 1px;
                    transform: perspective(500px) rotateX(22deg);
                }

                .grid-column { gap: 1px; }
                .grid-column.col-0 { transform: translateY(4px); }
                .grid-column.col-2 { transform: translateY(-4px); }

                .grid-slot {
                    width: 46px;
                    height: 46px;
                }

                .platform {
                    width: 42px;
                    height: 18px;
                }

                .platform-top { height: 14px; }
                .platform-side { height: 6px; }

                .unit-shadow {
                    bottom: 14px;
                    width: 22px;
                    height: 6px;
                }

                .unit-sprite-wrapper {
                    bottom: 15px;
                    width: 24px;
                    height: 24px;
                }

                .unit-sprite {
                    width: 32px;
                    height: 32px;
                    transform: scale(0.75);
                    transform-origin: top left;
                }

                .unit-sprite.enemy-sprite {
                    transform: scale(0.75) scaleX(-1);
                    transform-origin: top right;
                }

                .unit-hp-container { bottom: 38px; }
                .mini-hp-bar { width: 34px; height: 4px; }
                .mini-hp-text { font-size: 6px; }
            }
        `;
        document.head.appendChild(style);
    }

    renderUnits() {
        const units = this.isEnemy
            ? this.battleManager.enemies
            : this.battleManager.allies;

        const slotMapping = {
            1: 1,
            2: 2,
            4: 4
        };

        const slots = this.containerElement.querySelectorAll('.grid-slot');

        units.forEach((unit, unitIndex) => {
            const activeSlotIndex = this.activeSlots[unitIndex];
            const gridIndex = slotMapping[activeSlotIndex];
            const slot = slots[gridIndex];

            if (!slot) return;

            slot.classList.add('occupied');
            if (this.isEnemy) {
                slot.classList.add('enemy-slot');
            }

            // 캐릭터 그림자
            const shadow = document.createElement('div');
            shadow.className = 'unit-shadow';

            // HP 컨테이너
            const hpContainer = document.createElement('div');
            hpContainer.className = 'unit-hp-container';
            hpContainer.innerHTML = `
                <div class="mini-hp-bar">
                    <div class="mini-hp-fill ${this.isEnemy ? 'enemy-hp' : ''}"
                         style="width: ${(unit.currentHp / unit.maxHp) * 100}%"></div>
                </div>
                <span class="mini-hp-text ${this.isEnemy ? 'enemy-text' : ''}">${unit.currentHp}</span>
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

                elements.hpText.textContent = currentHp;
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
