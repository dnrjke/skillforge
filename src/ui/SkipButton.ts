/**
 * Skyline Blue Skip Button Component
 *
 * 모바일 게임 스타일 스킵 버튼
 * 참고: Honkai Star Rail, Blue Archive
 *
 * 특징:
 * - 화면 우상단 배치 (Safe Area 대응)
 * - 홀드 투 스킵 (실수 방지)
 * - 프로그레스 표시
 * - 터치 최적화
 */

import { UIComponent } from './UIComponent';

export interface SkipButtonConfig {
    parent?: HTMLElement;
    holdDuration?: number;  // 홀드 시간 (ms)
    onSkip?: () => void;
    onSkipStart?: () => void;
    onSkipCancel?: () => void;
}

export class SkipButton extends UIComponent {
    private progressRing: HTMLDivElement;
    private holdDuration: number;
    private holdStartTime: number = 0;
    private animationFrame: number | null = null;
    private isHolding: boolean = false;

    private onSkip?: () => void;
    private onSkipStart?: () => void;
    private onSkipCancel?: () => void;

    constructor(config: SkipButtonConfig = {}) {
        super('div', {
            id: 'skip-button-container',
            className: 'skip-button-container hidden',
            parent: config.parent,
        });

        this.holdDuration = config.holdDuration ?? 800;
        this.onSkip = config.onSkip;
        this.onSkipStart = config.onSkipStart;
        this.onSkipCancel = config.onSkipCancel;

        // 스킵 버튼 구조
        this.element.innerHTML = `
            <div class="skip-button">
                <svg class="skip-progress-ring" viewBox="0 0 36 36">
                    <circle class="ring-bg" cx="18" cy="18" r="16" />
                    <circle class="ring-progress" cx="18" cy="18" r="16" />
                </svg>
                <span class="skip-icon">▶▶</span>
                <span class="skip-text">SKIP</span>
            </div>
        `;

        this.progressRing = this.element.querySelector('.ring-progress') as HTMLDivElement;

        this.setupEvents();
    }

    private setupEvents(): void {
        const button = this.element.querySelector('.skip-button') as HTMLElement;

        // 터치 시작
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startHold();
        }, { passive: false });

        button.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startHold();
        });

        // 터치 종료
        button.addEventListener('touchend', () => this.endHold());
        button.addEventListener('touchcancel', () => this.endHold());
        button.addEventListener('mouseleave', () => this.endHold());
        button.addEventListener('mouseup', () => this.endHold());

        // 전역 터치 종료 (터치가 버튼 밖으로 나갔을 때)
        document.addEventListener('touchend', () => {
            if (this.isHolding) this.endHold();
        });
    }

    private startHold(): void {
        if (this.isHolding) return;

        this.isHolding = true;
        this.holdStartTime = performance.now();
        this.element.classList.add('holding');
        this.onSkipStart?.();

        // 프로그레스 애니메이션
        const animate = () => {
            if (!this.isHolding) return;

            const elapsed = performance.now() - this.holdStartTime;
            const progress = Math.min(elapsed / this.holdDuration, 1);

            this.updateProgress(progress);

            if (progress >= 1) {
                this.triggerSkip();
            } else {
                this.animationFrame = requestAnimationFrame(animate);
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    private endHold(): void {
        if (!this.isHolding) return;

        this.isHolding = false;
        this.element.classList.remove('holding');
        this.updateProgress(0);

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        this.onSkipCancel?.();
    }

    private updateProgress(progress: number): void {
        // SVG 원형 프로그레스 (stroke-dasharray 기반)
        const circumference = 2 * Math.PI * 16;
        const offset = circumference * (1 - progress);
        this.progressRing.style.strokeDashoffset = `${offset}`;
    }

    private triggerSkip(): void {
        this.isHolding = false;
        this.element.classList.remove('holding');
        this.element.classList.add('skipping');
        this.updateProgress(0);

        // 스킵 완료 피드백
        setTimeout(() => {
            this.element.classList.remove('skipping');
            this.onSkip?.();
        }, 200);
    }

    show(): void {
        this.element.classList.remove('hidden');
        this.element.classList.add('fade-in');
    }

    hide(): void {
        this.element.classList.add('hidden');
        this.element.classList.remove('fade-in');
    }
}

/**
 * 메뉴 스타일 스킵 버튼 (Blue Archive 스타일)
 * 탭으로 메뉴 열고 스킵 선택
 */
export class MenuSkipButton extends UIComponent {
    private menuOpen: boolean = false;
    private menuPanel: HTMLDivElement;
    private onSkip?: () => void;
    private onAuto?: (enabled: boolean) => void;
    private autoEnabled: boolean = false;

    constructor(config: {
        parent?: HTMLElement;
        onSkip?: () => void;
        onAuto?: (enabled: boolean) => void;
    } = {}) {
        super('div', {
            id: 'menu-skip-container',
            className: 'menu-skip-container hidden',
            parent: config.parent,
        });

        this.onSkip = config.onSkip;
        this.onAuto = config.onAuto;

        this.element.innerHTML = `
            <button class="menu-toggle-btn">
                <span class="menu-icon">☰</span>
            </button>
            <div class="menu-panel hidden">
                <button class="menu-item auto-btn">
                    <span class="menu-item-icon">▶</span>
                    <span class="menu-item-text">AUTO</span>
                </button>
                <button class="menu-item skip-btn">
                    <span class="menu-item-icon">▶▶</span>
                    <span class="menu-item-text">SKIP</span>
                </button>
            </div>
        `;

        this.menuPanel = this.element.querySelector('.menu-panel') as HTMLDivElement;
        this.setupEvents();
    }

    private setupEvents(): void {
        const toggleBtn = this.element.querySelector('.menu-toggle-btn') as HTMLButtonElement;
        const autoBtn = this.element.querySelector('.auto-btn') as HTMLButtonElement;
        const skipBtn = this.element.querySelector('.skip-btn') as HTMLButtonElement;

        toggleBtn.addEventListener('click', () => this.toggleMenu());

        autoBtn.addEventListener('click', () => {
            this.autoEnabled = !this.autoEnabled;
            autoBtn.classList.toggle('active', this.autoEnabled);
            this.onAuto?.(this.autoEnabled);
        });

        skipBtn.addEventListener('click', () => {
            this.closeMenu();
            this.onSkip?.();
        });

        // 외부 클릭시 메뉴 닫기
        document.addEventListener('click', (e) => {
            if (this.menuOpen && !this.element.contains(e.target as Node)) {
                this.closeMenu();
            }
        });
    }

    private toggleMenu(): void {
        this.menuOpen = !this.menuOpen;
        this.menuPanel.classList.toggle('hidden', !this.menuOpen);
    }

    private closeMenu(): void {
        this.menuOpen = false;
        this.menuPanel.classList.add('hidden');
    }
}
