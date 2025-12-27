// 액션 배너 UI - 스킬/패시브 발동 시 표시되는 배너
// HTML/CSS 기반, z-index: 200 (최상위 팝업 영역)

export default class ActionBannerUI {
    constructor() {
        // 현재 표시 중인 배너들
        this.skillBannerElement = null;
        this.passiveBannersHTML = [];

        // 스타일 초기화
        this.injectStyles();
    }

    /**
     * 스킬 액션 배너 표시 (중앙 하단)
     * @param {string} actionName - 스킬 이름
     * @param {number} apCost - AP 소모량 (알갱이 표시용)
     */
    showActionBanner(actionName, apCost = 0) {
        // 기존 배너 제거
        if (this.skillBannerElement) {
            this.skillBannerElement.remove();
            this.skillBannerElement = null;
        }

        // HTML 배너 생성
        const banner = document.createElement('div');
        banner.className = 'action-banner';

        // AP 알갱이 HTML 생성 (스킬명 위에)
        let apDotsHTML = '';
        if (apCost > 0) {
            const leftGroupCount = Math.min(5, apCost);
            const rightGroupCount = Math.max(0, Math.min(5, apCost - 5));

            let leftDots = '';
            for (let i = 0; i < leftGroupCount; i++) {
                leftDots += '<span class="ap-dot"></span>';
            }

            let rightDots = '';
            for (let i = 0; i < rightGroupCount; i++) {
                rightDots += '<span class="ap-dot"></span>';
            }

            apDotsHTML = `
                <div class="ap-dots">
                    <div class="ap-group">${leftDots}</div>
                    ${rightGroupCount > 0 ? `<div class="ap-group">${rightDots}</div>` : ''}
                </div>
            `;
        }

        banner.innerHTML = `
            ${apDotsHTML}
            <div class="banner-content">
                <span class="banner-deco left">【</span>
                <span class="banner-text">${actionName}</span>
                <span class="banner-deco right">】</span>
            </div>
        `;

        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(banner);
        this.skillBannerElement = banner;

        // 0.8초 후 사라짐
        setTimeout(() => {
            if (banner && banner.parentNode) {
                banner.style.animation = 'bannerFadeOut 0.2s forwards';
                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.remove();
                    }
                    if (this.skillBannerElement === banner) {
                        this.skillBannerElement = null;
                    }
                }, 200);
            }
        }, 800);
    }

    /**
     * 패시브 스킬 사이드 배너 표시
     * @param {string} passiveName - 패시브 이름
     * @param {boolean} isLeftSide - true: 아군(좌측), false: 적군(우측)
     */
    showPassiveBanner(passiveName, isLeftSide = true) {
        // 현재 같은 쪽에 있는 배너 수 계산 (스택용)
        const sameSideBanners = this.passiveBannersHTML.filter(b => b.isLeft === isLeftSide);
        const stackOffset = sameSideBanners.length * 50;

        // HTML 배너 생성
        const banner = document.createElement('div');
        banner.className = `passive-banner ${isLeftSide ? 'left' : 'right'}`;
        banner.style.top = `${70 - (stackOffset / 720 * 100)}%`; // 70%에서 위로 스택

        banner.innerHTML = `
            <div class="passive-icon">⚡</div>
            <div class="passive-text">${passiveName}</div>
        `;

        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(banner);

        const bannerData = { element: banner, isLeft: isLeftSide };
        this.passiveBannersHTML.push(bannerData);

        // 1초 후 사라짐
        setTimeout(() => {
            if (banner && banner.parentNode) {
                banner.classList.add(isLeftSide ? 'fade-out-left' : 'fade-out-right');
                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.remove();
                    }
                    // 배열에서 제거
                    const idx = this.passiveBannersHTML.indexOf(bannerData);
                    if (idx > -1) {
                        this.passiveBannersHTML.splice(idx, 1);
                    }
                }, 250);
            }
        }, 1000);

        return banner;
    }

    /**
     * 스타일 주입 (한 번만)
     */
    injectStyles() {
        if (document.getElementById('action-banner-style')) return;

        const style = document.createElement('style');
        style.id = 'action-banner-style';
        style.textContent = `
            /* ===== 액션 배너 (스킬 사용 시 중앙 하단) ===== */
            .action-banner {
                position: absolute;
                bottom: 20%;
                left: 50%;
                transform: translateX(-50%);
                z-index: 200;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                animation: bannerFadeIn 0.15s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }

            .ap-dots {
                display: flex;
                gap: 24px;
                align-items: center;
            }

            .ap-group {
                display: flex;
                gap: 12px;
            }

            .ap-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #ffcc66;
                border: 1px solid #ffaa44;
                box-shadow: 0 0 4px rgba(255, 204, 102, 0.5);
            }

            .banner-content {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 12px 40px;
                background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(0,0,0,0.85));
                border: 2px solid #ffaa44;
                border-radius: 8px;
                box-shadow: 0 0 20px rgba(255, 170, 68, 0.25), inset 0 0 20px rgba(255, 170, 68, 0.15);
                min-width: 280px;
            }

            .banner-text {
                font-family: Arial, sans-serif;
                font-size: 22px;
                font-weight: bold;
                color: #ffffff;
                text-shadow:
                    -1px -1px 0 #000,
                    1px -1px 0 #000,
                    -1px 1px 0 #000,
                    1px 1px 0 #000,
                    0 0 8px rgba(255, 255, 255, 0.3);
                letter-spacing: 1px;
            }

            .banner-deco {
                font-size: 26px;
                color: #ffaa44;
                font-family: Arial, sans-serif;
                margin: 0 12px;
                text-shadow: 0 0 8px rgba(255, 170, 68, 0.6);
            }

            @keyframes bannerFadeIn {
                from {
                    opacity: 0;
                    transform: translateX(-50%) scale(0.5);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) scale(1);
                }
            }

            @keyframes bannerFadeOut {
                to {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
            }

            /* ===== 패시브 배너 (좌/우 사이드) ===== */
            .passive-banner {
                position: absolute;
                z-index: 200;
                pointer-events: none;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 20px;
                background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(0,0,0,0.85));
                border: 2px solid #66aaff;
                border-radius: 6px;
                box-shadow: 0 0 15px rgba(68, 136, 255, 0.3), inset 0 0 15px rgba(102, 170, 255, 0.15);
                min-width: 200px;
            }

            .passive-banner.left {
                left: 14%;
                animation: passiveSlideInLeft 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .passive-banner.right {
                right: 14%;
                animation: passiveSlideInRight 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .passive-banner.fade-out-left {
                animation: passiveSlideOutLeft 0.25s forwards;
            }

            .passive-banner.fade-out-right {
                animation: passiveSlideOutRight 0.25s forwards;
            }

            .passive-icon {
                font-size: 18px;
                color: #88ccff;
                text-shadow: 0 0 8px rgba(136, 204, 255, 0.6);
            }

            .passive-text {
                font-family: Arial, sans-serif;
                font-size: 16px;
                font-weight: bold;
                color: #aaccff;
                text-shadow:
                    -1px -1px 0 #000,
                    1px -1px 0 #000,
                    -1px 1px 0 #000,
                    1px 1px 0 #000;
                letter-spacing: 0.5px;
            }

            @keyframes passiveSlideInLeft {
                from { opacity: 0; transform: translateX(-150px); }
                to { opacity: 1; transform: translateX(0); }
            }

            @keyframes passiveSlideInRight {
                from { opacity: 0; transform: translateX(150px); }
                to { opacity: 1; transform: translateX(0); }
            }

            @keyframes passiveSlideOutLeft {
                to { opacity: 0; transform: translateX(-100px); }
            }

            @keyframes passiveSlideOutRight {
                to { opacity: 0; transform: translateX(100px); }
            }

            /* ===== 모바일 대응 ===== */
            @media (max-width: 768px) {
                .banner-content {
                    padding: 10px 30px;
                    min-width: 220px;
                }
                .banner-text { font-size: 18px; }
                .banner-deco { font-size: 22px; margin: 0 8px; }
                .ap-dot { width: 7px; height: 7px; }

                .passive-banner {
                    padding: 8px 16px;
                    min-width: 160px;
                }
                .passive-banner.left { left: 5%; }
                .passive-banner.right { right: 5%; }
                .passive-icon { font-size: 16px; }
                .passive-text { font-size: 14px; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 모든 배너 제거
     */
    clearAll() {
        if (this.skillBannerElement) {
            this.skillBannerElement.remove();
            this.skillBannerElement = null;
        }

        this.passiveBannersHTML.forEach(({ element }) => {
            if (element && element.parentNode) {
                element.remove();
            }
        });
        this.passiveBannersHTML = [];
    }
}
