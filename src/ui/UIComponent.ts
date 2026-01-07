/**
 * Skillforge UI Component System
 *
 * Unity의 Layout Group 스타일 컴포넌트 시스템
 * - 자동 레이아웃 (HorizontalLayoutGroup, VerticalLayoutGroup)
 * - 재사용 가능한 UI 컴포넌트
 * - 모바일 터치 최적화
 */

export interface UIComponentConfig {
    id?: string;
    className?: string;
    parent?: HTMLElement;
    style?: Partial<CSSStyleDeclaration>;
    onClick?: (e: Event) => void;
    onTouchEnd?: (e: Event) => void;
}

/**
 * 기본 UI 컴포넌트
 */
export class UIComponent {
    protected element: HTMLElement;
    protected children: UIComponent[] = [];

    constructor(tag: string = 'div', config: UIComponentConfig = {}) {
        this.element = document.createElement(tag);

        if (config.id) this.element.id = config.id;
        if (config.className) this.element.className = config.className;
        if (config.style) Object.assign(this.element.style, config.style);
        if (config.onClick) this.element.addEventListener('click', config.onClick);
        if (config.onTouchEnd) this.element.addEventListener('touchend', config.onTouchEnd);
        if (config.parent) config.parent.appendChild(this.element);
    }

    getElement(): HTMLElement {
        return this.element;
    }

    show(): void {
        this.element.classList.remove('hidden');
    }

    hide(): void {
        this.element.classList.add('hidden');
    }

    toggle(): void {
        this.element.classList.toggle('hidden');
    }

    isVisible(): boolean {
        return !this.element.classList.contains('hidden');
    }

    addClass(className: string): void {
        this.element.classList.add(className);
    }

    removeClass(className: string): void {
        this.element.classList.remove(className);
    }

    setStyle(style: Partial<CSSStyleDeclaration>): void {
        Object.assign(this.element.style, style);
    }

    setText(text: string): void {
        this.element.textContent = text;
    }

    setHTML(html: string): void {
        this.element.innerHTML = html;
    }

    appendChild(child: UIComponent): void {
        this.children.push(child);
        this.element.appendChild(child.getElement());
    }

    removeChild(child: UIComponent): void {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            this.element.removeChild(child.getElement());
        }
    }

    clearChildren(): void {
        this.children = [];
        this.element.innerHTML = '';
    }

    destroy(): void {
        this.element.remove();
        this.children = [];
    }
}

/**
 * 레이아웃 방향
 */
export type LayoutDirection = 'horizontal' | 'vertical';

/**
 * 정렬 옵션
 */
export type LayoutAlign = 'start' | 'center' | 'end' | 'space-between' | 'space-around';

export interface LayoutGroupConfig extends UIComponentConfig {
    direction?: LayoutDirection;
    gap?: number;
    padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
    align?: LayoutAlign;
    crossAlign?: 'start' | 'center' | 'end' | 'stretch';
}

/**
 * Layout Group - Unity의 HorizontalLayoutGroup/VerticalLayoutGroup 스타일
 */
export class LayoutGroup extends UIComponent {
    constructor(config: LayoutGroupConfig = {}) {
        super('div', config);

        const direction = config.direction ?? 'horizontal';
        const gap = config.gap ?? 0;
        const align = config.align ?? 'start';
        const crossAlign = config.crossAlign ?? 'center';

        // Flexbox 기반 레이아웃
        this.element.style.display = 'flex';
        this.element.style.flexDirection = direction === 'horizontal' ? 'row' : 'column';
        this.element.style.gap = `${gap}px`;

        // 주축 정렬
        switch (align) {
            case 'start': this.element.style.justifyContent = 'flex-start'; break;
            case 'center': this.element.style.justifyContent = 'center'; break;
            case 'end': this.element.style.justifyContent = 'flex-end'; break;
            case 'space-between': this.element.style.justifyContent = 'space-between'; break;
            case 'space-around': this.element.style.justifyContent = 'space-around'; break;
        }

        // 교차축 정렬
        switch (crossAlign) {
            case 'start': this.element.style.alignItems = 'flex-start'; break;
            case 'center': this.element.style.alignItems = 'center'; break;
            case 'end': this.element.style.alignItems = 'flex-end'; break;
            case 'stretch': this.element.style.alignItems = 'stretch'; break;
        }

        // 패딩
        if (config.padding !== undefined) {
            if (typeof config.padding === 'number') {
                this.element.style.padding = `${config.padding}px`;
            } else {
                const p = config.padding;
                this.element.style.paddingTop = `${p.top ?? 0}px`;
                this.element.style.paddingRight = `${p.right ?? 0}px`;
                this.element.style.paddingBottom = `${p.bottom ?? 0}px`;
                this.element.style.paddingLeft = `${p.left ?? 0}px`;
            }
        }
    }
}

/**
 * Horizontal Layout Group
 */
export class HorizontalLayoutGroup extends LayoutGroup {
    constructor(config: Omit<LayoutGroupConfig, 'direction'> = {}) {
        super({ ...config, direction: 'horizontal' });
    }
}

/**
 * Vertical Layout Group
 */
export class VerticalLayoutGroup extends LayoutGroup {
    constructor(config: Omit<LayoutGroupConfig, 'direction'> = {}) {
        super({ ...config, direction: 'vertical' });
    }
}

export interface ButtonConfig extends UIComponentConfig {
    text?: string;
    icon?: string;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'small' | 'medium' | 'large';
}

/**
 * 버튼 컴포넌트
 */
export class Button extends UIComponent {
    private textSpan: HTMLSpanElement | null = null;
    private iconSpan: HTMLSpanElement | null = null;

    constructor(config: ButtonConfig = {}) {
        super('button', {
            ...config,
            className: `ui-button ${config.variant ?? 'secondary'} ${config.size ?? 'medium'} ${config.className ?? ''}`.trim(),
        });

        if (config.icon) {
            this.iconSpan = document.createElement('span');
            this.iconSpan.className = 'button-icon';
            this.iconSpan.textContent = config.icon;
            this.element.appendChild(this.iconSpan);
        }

        if (config.text) {
            this.textSpan = document.createElement('span');
            this.textSpan.className = 'button-text';
            this.textSpan.textContent = config.text;
            this.element.appendChild(this.textSpan);
        }

        if (config.disabled) {
            (this.element as HTMLButtonElement).disabled = true;
        }
    }

    setDisabled(disabled: boolean): void {
        (this.element as HTMLButtonElement).disabled = disabled;
    }

    setText(text: string): void {
        if (this.textSpan) {
            this.textSpan.textContent = text;
        }
    }

    setIcon(icon: string): void {
        if (this.iconSpan) {
            this.iconSpan.textContent = icon;
        }
    }
}

export interface ProgressBarConfig extends UIComponentConfig {
    value?: number;
    max?: number;
    showLabel?: boolean;
}

/**
 * 프로그레스 바 컴포넌트
 */
export class ProgressBar extends UIComponent {
    private fill: HTMLDivElement;
    private label: HTMLSpanElement | null = null;
    private value: number;
    private max: number;

    constructor(config: ProgressBarConfig = {}) {
        super('div', {
            ...config,
            className: `ui-progress-bar ${config.className ?? ''}`.trim(),
        });

        this.value = config.value ?? 0;
        this.max = config.max ?? 100;

        this.fill = document.createElement('div');
        this.fill.className = 'progress-fill';
        this.element.appendChild(this.fill);

        if (config.showLabel) {
            this.label = document.createElement('span');
            this.label.className = 'progress-label';
            this.element.appendChild(this.label);
        }

        this.updateProgress();
    }

    setValue(value: number): void {
        this.value = Math.max(0, Math.min(value, this.max));
        this.updateProgress();
    }

    getValue(): number {
        return this.value;
    }

    setMax(max: number): void {
        this.max = max;
        this.updateProgress();
    }

    private updateProgress(): void {
        const percent = (this.value / this.max) * 100;
        this.fill.style.width = `${percent}%`;
        if (this.label) {
            this.label.textContent = `${Math.round(percent)}%`;
        }
    }
}
