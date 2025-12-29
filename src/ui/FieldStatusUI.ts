import Phaser from 'phaser';
import FireflySystem from './FireflySystem';
import type {
    FieldStatusUIConfig,
    CharacterSprite
} from '../types/ui.types';

/**
 * FieldStatusUI - 필드 캐릭터용 상태 UI
 *
 * 특징:
 * - HP바: 캐릭터 중심 아래, 평소 숨김, 변동시만 표시
 * - 행동 게이지: 기존과 유사
 * - AP: 알갱이 방식 (5개 = 1 대형) + 반딧불 시스템
 * - PP: 알갱이 방식 (압축 없음)
 */
export default class FieldStatusUI {
    private scene: Phaser.Scene;
    private character: CharacterSprite;

    // 기본 설정
    private maxHp: number;
    private currentHp: number;
    public maxAp: number;
    public currentAp: number;
    public maxPp: number;
    public currentPp: number;
    private speed: number;
    private parentContainer: Phaser.GameObjects.Container | null;
    private isEnemy: boolean;

    // 행동 게이지
    private maxAction: number;
    public currentAction: number;
    private wasReady: boolean;

    // UI 크기 설정
    private barWidth: number;
    private barHeight: number;
    private offsetY: number;

    // 그래픽 요소
    public container: Phaser.GameObjects.Container | null;
    private hpContainer: Phaser.GameObjects.Container | null;
    private hpBarBg: Phaser.GameObjects.Rectangle | null;
    private hpBarFill: Phaser.GameObjects.Rectangle | null;
    private hpVisible: boolean;
    private hpHideTimer: Phaser.Time.TimerEvent | null;

    // 행동 게이지
    private actionBarBg: Phaser.GameObjects.Rectangle | null;
    private actionBarFill: Phaser.GameObjects.Rectangle | null;
    private glowEffect: Phaser.GameObjects.Rectangle | null;
    private shineEffect: Phaser.GameObjects.Rectangle | null;
    private glowTween: Phaser.Tweens.Tween | null;

    // AP/PP 알갱이
    private apPellets: Phaser.GameObjects.GameObject[];
    private ppPellets: Phaser.GameObjects.Polygon[];

    // 반딧불 시스템
    public fireflySystem: FireflySystem | null;

    // 외부 참조용 (Unit 연결)
    public unit?: any;

    constructor(scene: Phaser.Scene, character: CharacterSprite, config: FieldStatusUIConfig = {}) {
        this.scene = scene;
        this.character = character;

        // 기본 설정
        this.maxHp = config.maxHp || 100;
        this.currentHp = config.currentHp || this.maxHp;
        this.maxAp = config.maxAp || 15;
        this.currentAp = config.currentAp ?? this.maxAp;
        this.maxPp = config.maxPp || 3;
        this.currentPp = config.currentPp ?? this.maxPp;
        this.speed = config.speed || 10;
        this.parentContainer = config.parentContainer || null;
        this.isEnemy = config.isEnemy || false;

        // 행동 게이지
        this.maxAction = 100;
        this.currentAction = 0;
        this.wasReady = false;

        // UI 크기 설정
        this.barWidth = config.barWidth || 80;
        this.barHeight = config.barHeight || 6;
        this.offsetY = config.offsetY || 20;

        // 그래픽 요소
        this.container = null;
        this.hpContainer = null;
        this.hpBarBg = null;
        this.hpBarFill = null;
        this.hpVisible = false;
        this.hpHideTimer = null;

        // 행동 게이지
        this.actionBarBg = null;
        this.actionBarFill = null;
        this.glowEffect = null;
        this.shineEffect = null;
        this.glowTween = null;

        // AP/PP 알갱이
        this.apPellets = [];
        this.ppPellets = [];

        // 반딧불 시스템
        this.fireflySystem = null;

        this.create();
        this.createFireflySystem();
    }

    private create(): void {
        this.container = this.scene.add.container(
            this.character.x,
            this.character.y + this.offsetY
        );

        if (this.parentContainer) {
            this.parentContainer.add(this.container);
        }

        this.createHpBar();
        this.createActionBar();
        this.createApPellets();
        this.createPpPellets();

        this.container.setDepth(1000);
        this.hideHpBar(false);
    }

    private createFireflySystem(): void {
        this.fireflySystem = new FireflySystem(this.scene, this.character, {
            parentContainer: this.parentContainer,
            maxAp: this.maxAp,
            currentAp: this.currentAp,
            fireflyOffsetY: 30,
            onApChanged: (newAp: number) => {
                this.currentAp = newAp;
                this.updateApPellets();
            }
        });
    }

    // ===== HP 바 =====

    private createHpBar(): void {
        this.hpContainer = this.scene.add.container(0, 0);

        this.hpBarBg = this.scene.add.rectangle(
            0, 0,
            this.barWidth + 2, this.barHeight + 2,
            0x000000, 0.8
        ).setOrigin(0.5);

        this.hpBarFill = this.scene.add.rectangle(
            -this.barWidth / 2, 0,
            this.barWidth, this.barHeight,
            this.isEnemy ? 0xff4444 : 0x44ff44
        ).setOrigin(0, 0.5);

        this.hpContainer.add([this.hpBarBg, this.hpBarFill]);
        this.container!.add(this.hpContainer);
    }

    private showHpBar(duration: number = 2000): void {
        if (this.hpHideTimer) this.hpHideTimer.remove();

        this.hpVisible = true;
        this.scene.tweens.add({
            targets: this.hpContainer,
            alpha: 1,
            duration: 150,
            ease: 'Power2'
        });

        this.hpHideTimer = this.scene.time.delayedCall(duration, () => {
            this.hideHpBar(true);
        });
    }

    private hideHpBar(animate: boolean = true): void {
        this.hpVisible = false;
        if (animate) {
            this.scene.tweens.add({
                targets: this.hpContainer,
                alpha: 0,
                duration: 300,
                ease: 'Power2'
            });
        } else {
            if (this.hpContainer) {
                this.hpContainer.alpha = 0;
            }
        }
    }

    // ===== 행동 게이지 =====

    private createActionBar(): void {
        const actionBarY = this.barHeight + 8;

        this.actionBarBg = this.scene.add.rectangle(
            0, actionBarY,
            this.barWidth + 2, 4,
            0x000000, 0.8
        ).setOrigin(0.5);

        this.actionBarFill = this.scene.add.rectangle(
            -this.barWidth / 2, actionBarY,
            0, 3,
            0x44ccff
        ).setOrigin(0, 0.5);

        this.glowEffect = this.scene.add.rectangle(
            0, actionBarY,
            this.barWidth + 6, 6,
            0xffff88, 0
        ).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD);

        this.shineEffect = this.scene.add.rectangle(
            -this.barWidth / 2, actionBarY,
            20, 4,
            0xffffff, 1
        ).setOrigin(0, 0.5).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);

        this.container!.add([
            this.actionBarBg,
            this.actionBarFill,
            this.glowEffect,
            this.shineEffect
        ]);
    }

    // ===== AP 알갱이 =====

    private createApPellets(): void {
        this.updateApPellets();
    }

    private updateApPellets(): void {
        this.apPellets.forEach(p => p.destroy());
        this.apPellets = [];

        const pelletY = this.barHeight + 18;
        const bigCount = Math.floor(this.currentAp / 5);
        const smallCount = this.currentAp % 5;

        let xOffset = -this.barWidth / 2;
        const bigSize = 6;
        const smallSize = 4;
        const gap = 2;

        for (let i = 0; i < bigCount; i++) {
            const pellet = this.scene.add.circle(
                xOffset + bigSize / 2, pelletY,
                bigSize / 2,
                0xffcc00
            );
            pellet.setStrokeStyle(1.5, 0xffee88);

            const glow = this.scene.add.circle(
                xOffset + bigSize / 2, pelletY,
                bigSize / 2 + 2,
                0xffcc00, 0.3
            ).setBlendMode(Phaser.BlendModes.ADD);

            this.container!.add([glow, pellet]);
            this.apPellets.push(pellet, glow);
            xOffset += bigSize + gap + 2;
        }

        for (let i = 0; i < smallCount; i++) {
            const pellet = this.scene.add.circle(
                xOffset + smallSize / 2, pelletY,
                smallSize / 2,
                0xffaa00
            );
            pellet.setStrokeStyle(1, 0xffcc00);

            this.container!.add(pellet);
            this.apPellets.push(pellet);
            xOffset += smallSize + gap;
        }
    }

    // ===== PP 알갱이 =====

    private createPpPellets(): void {
        this.updatePpPellets();
    }

    private updatePpPellets(): void {
        this.ppPellets.forEach(p => p.destroy());
        this.ppPellets = [];

        const pelletY = this.barHeight + 28;
        const size = 5;
        const gap = 3;

        for (let i = 0; i < this.maxPp; i++) {
            const isFilled = i < this.currentPp;
            const pellet = this.scene.add.polygon(
                -this.barWidth / 2 + (size + gap) * i + size / 2, pelletY,
                [0, -size / 2, size / 2, 0, 0, size / 2, -size / 2, 0],
                isFilled ? 0xaa66ff : 0x333333
            );
            pellet.setStrokeStyle(1, isFilled ? 0xcc88ff : 0x222222);

            this.container!.add(pellet);
            this.ppPellets.push(pellet);
        }
    }

    // ===== 공개 메서드 =====

    public update(delta: number): void {
        if (this.container) {
            this.container.setPosition(
                this.character.x,
                this.character.y + this.offsetY
            );
        }

        if (this.fireflySystem) {
            this.fireflySystem.update(delta || 16);
        }
    }

    public setHp(value: number, animate: boolean = true): void {
        const oldHp = this.currentHp;
        this.currentHp = Math.max(0, Math.min(this.maxHp, value));
        const targetWidth = (this.currentHp / this.maxHp) * this.barWidth;

        if (oldHp !== this.currentHp) {
            this.showHpBar();
        }

        const ratio = this.currentHp / this.maxHp;
        let color: number;
        if (this.isEnemy) {
            color = ratio > 0.3 ? 0xff4444 : 0xff2222;
        } else {
            color = ratio > 0.6 ? 0x44ff44 : (ratio > 0.3 ? 0xffaa00 : 0xff4444);
        }

        if (animate && this.hpBarFill) {
            const flashColor = value < oldHp ? 0xff0000 : 0x00ff00;
            this.hpBarFill.setFillStyle(flashColor);

            this.scene.tweens.add({
                targets: this.hpBarFill,
                width: targetWidth,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    this.hpBarFill?.setFillStyle(color);
                }
            });
        } else if (this.hpBarFill) {
            this.hpBarFill.width = targetWidth;
            this.hpBarFill.setFillStyle(color);
        }
    }

    public setAp(value: number, animate: boolean = true): void {
        const newAp = Math.max(0, Math.min(this.maxAp, value));

        if (this.fireflySystem) {
            this.fireflySystem.setAp(newAp, animate);
            this.currentAp = this.fireflySystem.getAp();
        } else {
            this.currentAp = newAp;
        }

        this.updateApPellets();
    }

    public addAp(amount: number): void {
        this.setAp(this.currentAp + amount);
    }

    public setPp(value: number, animate: boolean = true): void {
        const oldPp = this.currentPp;
        this.currentPp = Math.max(0, Math.min(this.maxPp, value));

        this.ppPellets.forEach((pellet, i) => {
            const isFilled = i < this.currentPp;
            pellet.setFillStyle(isFilled ? 0xaa66ff : 0x333333);
            pellet.setStrokeStyle(1, isFilled ? 0xcc88ff : 0x222222);

            if (animate && isFilled && i >= oldPp) {
                this.scene.tweens.add({
                    targets: pellet,
                    scaleX: 1.4,
                    scaleY: 1.4,
                    duration: 150,
                    yoyo: true,
                    ease: 'Power2'
                });
            }
        });
    }

    public setAction(value: number, animate: boolean = true): void {
        const wasFullBefore = this.currentAction >= this.maxAction;
        this.currentAction = Math.max(0, Math.min(this.maxAction, value));
        const targetWidth = (this.currentAction / this.maxAction) * this.barWidth;
        const isFullNow = this.currentAction >= this.maxAction;

        if (animate && this.actionBarFill) {
            this.scene.tweens.add({
                targets: this.actionBarFill,
                width: targetWidth,
                duration: 150,
                ease: 'Power2'
            });
        } else if (this.actionBarFill) {
            this.actionBarFill.width = targetWidth;
        }

        if (isFullNow) {
            this.actionBarFill?.setFillStyle(0xffff44);
            if (!wasFullBefore) {
                this.playShineEffect();
                this.startGlowPulse();
            }
        } else {
            this.actionBarFill?.setFillStyle(0x44ccff);
            this.wasReady = false;
            this.stopGlowPulse();
        }
    }

    public addAction(amount: number): boolean {
        this.setAction(this.currentAction + amount);
        return this.currentAction >= this.maxAction;
    }

    public resetAction(): void {
        this.wasReady = false;
        this.stopGlowPulse();
        this.setAction(0, false);
    }

    private playShineEffect(): void {
        if (!this.shineEffect) return;

        this.shineEffect.setVisible(true);
        this.shineEffect.x = -this.barWidth / 2 - 20;
        this.shineEffect.alpha = 1;

        this.scene.tweens.add({
            targets: this.shineEffect,
            x: this.barWidth / 2 + 10,
            duration: 350,
            ease: 'Power1.easeOut',
            onComplete: () => {
                this.shineEffect?.setVisible(false);
            }
        });
    }

    private startGlowPulse(): void {
        if (this.glowTween) this.glowTween.stop();

        if (this.glowEffect) {
            this.glowEffect.alpha = 0.3;
            this.glowTween = this.scene.tweens.add({
                targets: this.glowEffect,
                alpha: 0.6,
                scaleX: 1.1,
                scaleY: 1.2,
                duration: 400,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    private stopGlowPulse(): void {
        if (this.glowTween) {
            this.glowTween.stop();
            this.glowTween = null;
        }
        if (this.glowEffect) {
            this.glowEffect.alpha = 0;
            this.glowEffect.setScale(1);
        }
    }

    public damage(amount: number): number {
        this.setHp(this.currentHp - amount);
        return this.currentHp;
    }

    public heal(amount: number): number {
        this.setHp(this.currentHp + amount);
        return this.currentHp;
    }

    /**
     * 전장 UI 숨기기 (사망 시 호출)
     */
    public hide(): void {
        try {
            if (this.container && this.scene && this.scene.tweens) {
                this.scene.tweens.add({
                    targets: this.container,
                    alpha: 0,
                    duration: 300,
                    ease: 'Power2'
                });
            } else if (this.container) {
                // scene이 유효하지 않으면 즉시 숨김
                this.container.setAlpha(0);
            }
        } catch (error) {
            console.error('[FieldStatusUI] Error hiding container:', error);
            // 에러 발생 시에도 숨김 시도
            if (this.container) {
                this.container.setAlpha(0);
            }
        }

        // 반딧불 잔류 모드 설정 (에러 발생해도 시도)
        try {
            if (this.fireflySystem) {
                this.fireflySystem.setLingeringMode();
            }
        } catch (error) {
            console.error('[FieldStatusUI] Error setting firefly lingering mode:', error);
        }
    }

    public destroy(): void {
        this.stopGlowPulse();
        if (this.hpHideTimer) this.hpHideTimer.remove();

        if (this.fireflySystem) {
            this.fireflySystem.destroy();
            this.fireflySystem = null;
        }

        if (this.container) this.container.destroy();
    }
}
