// 파티 현황판 UI (유니콘 오버로드 스타일 + Classic RPG 감성)
// 미니어처 전장 그리드 + 유닛 스프라이트 + 체력바
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

        // 메인 컨테이너 (그리드만)
        this.containerElement = document.createElement('div');
        this.containerElement.className = `battlefield-panel ${this.isEnemy ? 'enemy' : 'ally'}`;

        // 전장 그리드 (헤더/푸터 없이 그리드만)
        const gridWrapper = document.createElement('div');
        gridWrapper.className = 'grid-wrapper';

        for (let col = 0; col < 3; col++) {
            const column = document.createElement('div');
            column.className = `grid-column col-${col}`;

            for (let row = 0; row < 2; row++) {
                const slotIndex = row * 3 + col;
                const tile = document.createElement('div');
                // 체스판 패턴: (col + row) % 2 === 0 이면 밝은 타일
                const isLightTile = (col + row) % 2 === 0;
                tile.className = `grid-tile ${isLightTile ? 'tile-light' : 'tile-dark'}`;
                tile.dataset.slotIndex = slotIndex;
                column.appendChild(tile);
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
            @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Almendra:wght@700&display=swap');

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
                left: 1.5%;
                bottom: 2%;
            }

            .battlefield-panel.enemy {
                right: 1.5%;
                bottom: 2%;
            }

            /* ===== 그리드 래퍼 (입체화) ===== */
            .grid-wrapper {
                display: flex;
                gap: 4px;
                padding: 6px;
                background: transparent;
                transform: perspective(500px) rotateX(20deg);
                transform-origin: center bottom;
            }

            .enemy .grid-wrapper {
                flex-direction: row-reverse;
            }

            /* ===== 그리드 열 ===== */
            .grid-column {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .grid-column.col-0 { transform: translateY(4px); }
            .grid-column.col-1 { transform: translateY(0px); }
            .grid-column.col-2 { transform: translateY(-4px); }

            /* ===== 그리드 타일 (베벨 효과) ===== */
            .grid-tile {
                width: 56px;
                height: 52px;
                position: relative;
                border-radius: 3px;
                border: 2px outset #6a5a4a;
                box-shadow:
                    inset 0 0 10px #000,
                    2px 2px 5px rgba(0, 0, 0, 0.5),
                    inset 1px 1px 0 rgba(255, 220, 180, 0.1);
            }

            /* 체스판 패턴 - 밝은 타일 (마법석 느낌) */
            .grid-tile.tile-light {
                background: radial-gradient(
                    ellipse at center,
                    rgba(90, 80, 70, 0.9) 0%,
                    rgba(60, 52, 45, 0.95) 60%,
                    rgba(45, 38, 32, 0.98) 100%
                );
            }

            /* 체스판 패턴 - 어두운 타일 */
            .grid-tile.tile-dark {
                background: radial-gradient(
                    ellipse at center,
                    rgba(55, 48, 42, 0.9) 0%,
                    rgba(40, 35, 30, 0.95) 60%,
                    rgba(30, 25, 22, 0.98) 100%
                );
            }

            /* 유닛이 있는 타일 */
            .grid-tile.occupied {
                border-color: #8a7a5a;
                box-shadow:
                    inset 0 0 12px rgba(0, 0, 0, 0.8),
                    2px 2px 6px rgba(0, 0, 0, 0.6),
                    inset 2px 2px 4px rgba(255, 220, 180, 0.1),
                    0 0 8px rgba(100, 180, 100, 0.15);
            }

            .grid-tile.occupied.tile-light {
                background: radial-gradient(
                    ellipse at center,
                    rgba(100, 95, 80, 0.92) 0%,
                    rgba(70, 62, 52, 0.96) 60%,
                    rgba(50, 44, 38, 0.98) 100%
                );
            }

            .grid-tile.occupied.tile-dark {
                background: radial-gradient(
                    ellipse at center,
                    rgba(70, 65, 55, 0.92) 0%,
                    rgba(50, 45, 38, 0.96) 60%,
                    rgba(35, 30, 26, 0.98) 100%
                );
            }

            .grid-tile.occupied.enemy-tile {
                border-color: #8a5a5a;
                box-shadow:
                    inset 0 0 12px rgba(0, 0, 0, 0.8),
                    2px 2px 6px rgba(0, 0, 0, 0.6),
                    inset 2px 2px 4px rgba(255, 180, 180, 0.1),
                    0 0 8px rgba(180, 100, 100, 0.15);
            }

            .grid-tile.occupied.enemy-tile.tile-light {
                background: radial-gradient(
                    ellipse at center,
                    rgba(100, 80, 80, 0.92) 0%,
                    rgba(70, 52, 52, 0.96) 60%,
                    rgba(50, 38, 38, 0.98) 100%
                );
            }

            .grid-tile.occupied.enemy-tile.tile-dark {
                background: radial-gradient(
                    ellipse at center,
                    rgba(70, 55, 55, 0.92) 0%,
                    rgba(50, 38, 38, 0.96) 60%,
                    rgba(35, 26, 26, 0.98) 100%
                );
            }

            /* ===== 유닛 스프라이트 ===== */
            .unit-sprite-wrapper {
                position: absolute;
                bottom: 2px;
                left: 50%;
                transform: translateX(-50%);
                width: 32px;
                height: 32px;
                overflow: hidden;
                animation: spriteFloat 2s ease-in-out infinite;
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
                filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.8));
            }

            .unit-sprite.enemy-sprite {
                transform: scaleX(-1);
                filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.8))
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

            /* ===== HP 바 ===== */
            .unit-hp-container {
                position: absolute;
                top: 2px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1px;
            }

            .mini-hp-bar {
                width: 44px;
                height: 6px;
                background: linear-gradient(180deg, #1a1510 0%, #2a2018 100%);
                border: 1px solid #5a4a3a;
                border-radius: 2px;
                overflow: hidden;
                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.6);
            }

            .mini-hp-fill {
                height: 100%;
                background: linear-gradient(180deg, #6a6 0%, #4a4 50%, #5a5 100%);
                transition: width 0.3s ease;
                box-shadow:
                    inset 0 1px 0 rgba(255, 255, 255, 0.3),
                    0 0 4px rgba(100, 200, 100, 0.3);
            }

            .mini-hp-fill.enemy-hp {
                background: linear-gradient(180deg, #a66 0%, #844 50%, #955 100%);
                box-shadow:
                    inset 0 1px 0 rgba(255, 255, 255, 0.3),
                    0 0 4px rgba(200, 100, 100, 0.3);
            }

            .mini-hp-fill.low {
                background: linear-gradient(180deg, #a84 0%, #863 50%, #974 100%);
            }

            .mini-hp-fill.critical {
                background: linear-gradient(180deg, #a44 0%, #822 50%, #933 100%);
                animation: hpPulse 0.4s ease-in-out infinite;
            }

            .mini-hp-text {
                font-family: 'Press Start 2P', monospace;
                font-size: 7px;
                color: #b8d8b8;
                text-shadow: 1px 1px 0 #000, -1px -1px 0 #000;
                transition: all 0.2s ease;
            }

            .mini-hp-text.enemy-text { color: #d8b8b8; }
            .mini-hp-text.low { color: #d8c088; }
            .mini-hp-text.critical { color: #d88888; }

            .mini-hp-text.hp-changed {
                transform: scale(1.5);
                color: #fff !important;
            }

            .mini-hp-text.damage {
                color: #f44 !important;
                text-shadow: 0 0 6px #f00, 1px 1px 0 #000;
            }

            .mini-hp-text.heal {
                color: #4f8 !important;
                text-shadow: 0 0 6px #0f0, 1px 1px 0 #000;
            }

            /* ===== 피드백 효과 ===== */
            .grid-tile.damage-flash {
                animation: damageFlash 0.25s ease;
            }

            .grid-tile.damage-flash .unit-sprite-wrapper {
                animation: damageShake 0.25s ease;
            }

            @keyframes damageFlash {
                0%, 100% { filter: brightness(1); }
                50% {
                    filter: brightness(1.5);
                    box-shadow:
                        inset 0 0 15px rgba(255, 80, 60, 0.7),
                        2px 2px 5px rgba(0, 0, 0, 0.5);
                }
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
            .grid-tile.dead {
                opacity: 0.35;
                filter: grayscale(0.9) brightness(0.7);
            }

            .grid-tile.dead .unit-sprite-wrapper {
                animation: none;
            }

            .grid-tile.dead .unit-sprite {
                animation: none;
                background-position: -288px 0px;
                transform: none;
                opacity: 0.7;
            }

            .grid-tile.dead .unit-sprite.enemy-sprite {
                transform: scaleX(-1);
            }

            /* ===== 모바일 ===== */
            @media (max-width: 768px) {
                .battlefield-panel.ally { left: 1%; bottom: 1%; }
                .battlefield-panel.enemy { right: 1%; bottom: 1%; }

                .grid-wrapper {
                    gap: 3px;
                    padding: 4px;
                    transform: perspective(400px) rotateX(18deg);
                }

                .grid-column { gap: 3px; }
                .grid-column.col-0 { transform: translateY(3px); }
                .grid-column.col-2 { transform: translateY(-3px); }

                .grid-tile {
                    width: 42px;
                    height: 40px;
                }

                .unit-sprite-wrapper {
                    width: 24px;
                    height: 24px;
                    bottom: 1px;
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

                .unit-hp-container { top: 1px; }
                .mini-hp-bar { width: 34px; height: 5px; }
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

        const tiles = this.containerElement.querySelectorAll('.grid-tile');

        units.forEach((unit, unitIndex) => {
            const activeSlotIndex = this.activeSlots[unitIndex];
            const gridIndex = slotMapping[activeSlotIndex];
            const tile = tiles[gridIndex];

            if (!tile) return;

            tile.classList.add('occupied');
            if (this.isEnemy) {
                tile.classList.add('enemy-tile');
            }

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

            tile.appendChild(hpContainer);
            tile.appendChild(spriteWrapper);

            this.unitElements.set(unit.id, {
                tile: tile,
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
                    elements.tile.classList.add('damage-flash');
                    setTimeout(() => elements.tile.classList.remove('damage-flash'), 250);
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
                elements.tile.classList.add('dead');
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
