import Phaser from 'phaser';
import FireflySystem from './FireflySystem.js';

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
    constructor(scene, character, config = {}) {
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

        // AP/PP 알갱이
        this.apPellets = [];
        this.ppPellets = [];

        // 반딧불 시스템 (별도 모듈)
        this.fireflySystem = null;

        this.create();
        this.createFireflySystem();
    }

    create() {
        // 메인 컨테이너 (HP바, 행동게이지 등 UI용)
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

    createFireflySystem() {
        this.fireflySystem = new FireflySystem(this.scene, this.character, {
            parentContainer: this.parentContainer,
            maxAp: this.maxAp,
            currentAp: this.currentAp,
            fireflyOffsetY: 30,
            onApChanged: (newAp) => {
                this.currentAp = newAp;
                this.updateApPellets();
            }
        });
    }

    // ===== HP 바 =====
    createHpBar() {
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
        this.container.add(this.hpContainer);
    }

    showHpBar(duration = 2000) {
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

    hideHpBar(animate = true) {
        this.hpVisible = false;
        if (animate) {
            this.scene.tweens.add({
                targets: this.hpContainer,
                alpha: 0,
                duration: 300,
                ease: 'Power2'
            });
        } else {
            this.hpContainer.alpha = 0;
        }
    }

    // ===== 행동 게이지 =====
    createActionBar() {
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

        this.container.add([
            this.actionBarBg,
            this.actionBarFill,
            this.glowEffect,
            this.shineEffect
        ]);
    }

    // ===== AP 알갱이 =====
    createApPellets() {
        this.updateApPellets();
    }

    updateApPellets() {
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

            this.container.add([glow, pellet]);
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

            this.container.add(pellet);
            this.apPellets.push(pellet);
            xOffset += smallSize + gap;
        }
    }

    // ===== PP 알갱이 =====
    createPpPellets() {
        this.updatePpPellets();
    }

    updatePpPellets() {
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

            this.container.add(pellet);
            this.ppPellets.push(pellet);
        }
    }

    // ===== 공개 메서드 =====

    update(delta) {
        // UI 컨테이너는 캐릭터 따라감
        this.container.setPosition(
            this.character.x,
            this.character.y + this.offsetY
        );

        // 반딧불 업데이트 (월드 좌표 기준, 캐릭터 독립)
        if (this.fireflySystem) {
            this.fireflySystem.update(delta || 16);
        }
    }

    setHp(value, animate = true) {
        const oldHp = this.currentHp;
        this.currentHp = Math.max(0, Math.min(this.maxHp, value));
        const targetWidth = (this.currentHp / this.maxHp) * this.barWidth;

        if (oldHp !== this.currentHp) {
            this.showHpBar();
        }

        const ratio = this.currentHp / this.maxHp;
        let color;
        if (this.isEnemy) {
            color = ratio > 0.3 ? 0xff4444 : 0xff2222;
        } else {
            color = ratio > 0.6 ? 0x44ff44 : (ratio > 0.3 ? 0xffaa00 : 0xff4444);
        }

        if (animate) {
            const flashColor = value < oldHp ? 0xff0000 : 0x00ff00;
            this.hpBarFill.setFillStyle(flashColor);

            this.scene.tweens.add({
                targets: this.hpBarFill,
                width: targetWidth,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    this.hpBarFill.setFillStyle(color);
                }
            });
        } else {
            this.hpBarFill.width = targetWidth;
            this.hpBarFill.setFillStyle(color);
        }
    }

    setAp(value, animate = true) {
        const oldAp = this.currentAp;
        const newAp = Math.max(0, Math.min(this.maxAp, value));

        if (this.fireflySystem) {
            this.fireflySystem.setAp(newAp, animate);
            this.currentAp = this.fireflySystem.getAp();
        } else {
            this.currentAp = newAp;
        }

        this.updateApPellets();
    }

    addAp(amount) {
        this.setAp(this.currentAp + amount);
    }

    setPp(value, animate = true) {
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

    setAction(value, animate = true) {
        const wasFullBefore = this.currentAction >= this.maxAction;
        this.currentAction = Math.max(0, Math.min(this.maxAction, value));
        const targetWidth = (this.currentAction / this.maxAction) * this.barWidth;
        const isFullNow = this.currentAction >= this.maxAction;

        if (animate) {
            this.scene.tweens.add({
                targets: this.actionBarFill,
                width: targetWidth,
                duration: 150,
                ease: 'Power2'
            });
        } else {
            this.actionBarFill.width = targetWidth;
        }

        if (isFullNow) {
            this.actionBarFill.setFillStyle(0xffff44);
            if (!wasFullBefore) {
                this.playShineEffect();
                this.startGlowPulse();
            }
        } else {
            this.actionBarFill.setFillStyle(0x44ccff);
            this.wasReady = false;
            this.stopGlowPulse();
        }
    }

    addAction(amount) {
        this.setAction(this.currentAction + amount);
        return this.currentAction >= this.maxAction;
    }

    resetAction() {
        this.wasReady = false;
        this.stopGlowPulse();
        this.setAction(0, false);
    }

    playShineEffect() {
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
                this.shineEffect.setVisible(false);
            }
        });
    }

    startGlowPulse() {
        if (this.glowTween) this.glowTween.stop();

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

    stopGlowPulse() {
        if (this.glowTween) {
            this.glowTween.stop();
            this.glowTween = null;
        }
        this.glowEffect.alpha = 0;
        this.glowEffect.setScale(1);
    }

    damage(amount) {
        this.setHp(this.currentHp - amount);
        return this.currentHp;
    }

    heal(amount) {
        this.setHp(this.currentHp + amount);
        return this.currentHp;
    }

    /**
     * 전장 UI 숨기기 (사망 시 호출)
     */
    hide() {
        // 컨테이너 숨기기
        if (this.container) {
            this.scene.tweens.add({
                targets: this.container,
                alpha: 0,
                duration: 300,
                ease: 'Power2'
            });
        }

        // 반딧불 시스템 정리
        if (this.fireflySystem) {
            this.fireflySystem.destroy();
            this.fireflySystem = null;
        }
    }

    destroy() {
        this.stopGlowPulse();
        if (this.hpHideTimer) this.hpHideTimer.remove();

        if (this.fireflySystem) {
            this.fireflySystem.destroy();
            this.fireflySystem = null;
        }

        if (this.container) this.container.destroy();
    }
}
