export default class StatusBar {
    constructor(scene, character, config = {}) {
        this.scene = scene;
        this.character = character;

        // 기본 설정
        this.maxHp = config.maxHp || 100;
        this.currentHp = config.currentHp || this.maxHp;
        this.maxAp = config.maxAp || 10;
        this.currentAp = config.currentAp || 0;
        this.speed = config.speed || 10;

        // 행동 게이지 (가득 차면 행동)
        this.maxAction = 100;
        this.currentAction = 0;
        this.wasReady = false;  // 이전 프레임에서 100%였는지

        // 바 크기 설정 (좌우 길이 줄임)
        this.barWidth = config.barWidth || 100;
        this.barHeight = config.barHeight || 10;
        this.offsetY = config.offsetY || -130;

        // 그래픽 요소
        this.container = null;
        this.hpBarBg = null;
        this.hpBarFill = null;
        this.apBarBg = null;
        this.apBarFill = null;
        this.apText = null;
        this.actionBarBg = null;
        this.actionBarFill = null;
        this.shineEffect = null;

        this.create();
    }

    create() {
        // 컨테이너 생성
        this.container = this.scene.add.container(
            this.character.x,
            this.character.y + this.offsetY
        );

        // HP 바 배경 (테두리)
        this.hpBarBg = this.scene.add.rectangle(
            0, 0,
            this.barWidth + 4, this.barHeight + 4,
            0x000000
        ).setOrigin(0.5);

        // HP 바 내부 배경
        this.hpBarInnerBg = this.scene.add.rectangle(
            0, 0,
            this.barWidth, this.barHeight,
            0x222222
        ).setOrigin(0.5);

        // HP 바 채움 (녹색)
        this.hpBarFill = this.scene.add.rectangle(
            -this.barWidth / 2, 0,
            this.barWidth, this.barHeight - 2,
            0x44ff44
        ).setOrigin(0, 0.5);

        // AP 바 배경 (테두리)
        const apBarY = this.barHeight + 4;
        this.apBarBg = this.scene.add.rectangle(
            0, apBarY,
            this.barWidth + 4, this.barHeight - 2,
            0x000000
        ).setOrigin(0.5);

        // AP 바 내부 배경
        this.apBarInnerBg = this.scene.add.rectangle(
            0, apBarY,
            this.barWidth, this.barHeight - 4,
            0x222222
        ).setOrigin(0.5);

        // AP 바 채움 (황색)
        this.apBarFill = this.scene.add.rectangle(
            -this.barWidth / 2, apBarY,
            0, this.barHeight - 6,
            0xffcc00
        ).setOrigin(0, 0.5);

        // AP 수치 텍스트
        this.apText = this.scene.add.text(
            this.barWidth / 2 + 6, apBarY,
            `${this.currentAp}`,
            {
                fontSize: '12px',
                fill: '#ffcc00',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0, 0.5);

        // 행동 바 (Action Bar) - AP 바 아래
        const actionBarY = apBarY + this.barHeight + 2;
        this.actionBarY = actionBarY;  // 저장해두기

        this.actionBarBg = this.scene.add.rectangle(
            0, actionBarY,
            this.barWidth + 4, 6,
            0x000000
        ).setOrigin(0.5);

        this.actionBarInnerBg = this.scene.add.rectangle(
            0, actionBarY,
            this.barWidth, 4,
            0x222222
        ).setOrigin(0.5);

        // 행동 바 채움 (하늘색)
        this.actionBarFill = this.scene.add.rectangle(
            -this.barWidth / 2, actionBarY,
            0, 3,
            0x44ccff
        ).setOrigin(0, 0.5);

        // Shine 효과용 그래픽 (초기에는 숨김)
        this.shineEffect = this.scene.add.rectangle(
            -this.barWidth / 2, actionBarY,
            20, 3,
            0xffffff,
            0.8
        ).setOrigin(0, 0.5).setVisible(false);

        // 컨테이너에 추가
        this.container.add([
            this.hpBarBg,
            this.hpBarInnerBg,
            this.hpBarFill,
            this.apBarBg,
            this.apBarInnerBg,
            this.apBarFill,
            this.apText,
            this.actionBarBg,
            this.actionBarInnerBg,
            this.actionBarFill,
            this.shineEffect
        ]);

        // depth 설정 (캐릭터보다 위에)
        this.container.setDepth(1000);
    }

    update() {
        // 캐릭터 위치 따라가기
        this.container.setPosition(
            this.character.x,
            this.character.y + this.offsetY
        );
    }

    // 행동 게이지 설정
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

        // 가득 차면 색상 변경 + Shine 효과
        if (isFullNow) {
            this.actionBarFill.setFillStyle(0xffff44); // 노란색으로 반짝

            // 처음 100%가 되었을 때만 Shine 효과 재생
            if (!wasFullBefore) {
                this.playShineEffect();
                this.triggerReadyMotion();
            }
        } else {
            this.actionBarFill.setFillStyle(0x44ccff);
            this.wasReady = false;
        }
    }

    // Shine 효과 (게이지 위를 빛이 흐르는 효과)
    playShineEffect() {
        if (!this.shineEffect) return;

        this.shineEffect.setVisible(true);
        this.shineEffect.x = -this.barWidth / 2;
        this.shineEffect.alpha = 0.8;

        // 좌에서 우로 흐르는 빛
        this.scene.tweens.add({
            targets: this.shineEffect,
            x: this.barWidth / 2,
            duration: 300,
            ease: 'Power1.easeInOut',
            onComplete: () => {
                this.shineEffect.setVisible(false);
            }
        });

        // 테두리 빛 효과 (행동 바 배경 펄스)
        this.scene.tweens.add({
            targets: this.actionBarBg,
            scaleX: 1.1,
            scaleY: 1.5,
            duration: 150,
            yoyo: true,
            ease: 'Power2.easeOut'
        });
    }

    // Ready Motion 트리거 (Unit에 알림)
    triggerReadyMotion() {
        if (this.unit && this.unit.sprite && !this.wasReady) {
            this.wasReady = true;
            // Unit의 playReadyMotion 호출
            this.unit.playReadyMotion(this.scene);
        }
    }

    // 행동 게이지 증가
    addAction(amount) {
        this.setAction(this.currentAction + amount);
        return this.currentAction >= this.maxAction;
    }

    // 행동 게이지 리셋
    resetAction() {
        this.wasReady = false;
        this.setAction(0, false);
    }

    // 현재 턴 하이라이트 (스포트라이트로 대체되어 미사용)
    setCurrentTurn(isCurrent) {
        // 스포트라이트 효과가 BattleManager에서 처리됨
    }

    setHp(value, animate = true) {
        const oldHp = this.currentHp;
        this.currentHp = Math.max(0, Math.min(this.maxHp, value));
        const targetWidth = (this.currentHp / this.maxHp) * this.barWidth;

        if (animate) {
            if (value < oldHp) {
                this.scene.tweens.add({
                    targets: this.hpBarFill,
                    fillColor: { from: 0xff4444, to: 0x44ff44 },
                    duration: 300
                });
            }

            this.scene.tweens.add({
                targets: this.hpBarFill,
                width: targetWidth,
                duration: 300,
                ease: 'Power2'
            });
        } else {
            this.hpBarFill.width = targetWidth;
        }

        this.updateHpColor();
    }

    updateHpColor() {
        const ratio = this.currentHp / this.maxHp;
        let color;

        if (ratio > 0.6) {
            color = 0x44ff44;
        } else if (ratio > 0.3) {
            color = 0xffaa00;
        } else {
            color = 0xff4444;
        }

        this.scene.time.delayedCall(300, () => {
            if (this.hpBarFill && this.hpBarFill.active) {
                this.hpBarFill.setFillStyle(color);
            }
        });
    }

    setAp(value, animate = true) {
        const oldAp = this.currentAp;
        this.currentAp = Math.max(0, Math.min(this.maxAp, value));
        const targetWidth = (this.currentAp / this.maxAp) * this.barWidth;

        if (animate) {
            this.scene.tweens.add({
                targets: this.apBarFill,
                width: targetWidth,
                duration: 200,
                ease: 'Power2'
            });

            // AP 변화 시 바 색상 펄스
            if (value < oldAp) {
                // AP 소모 시 빨간색 펄스
                this.scene.tweens.add({
                    targets: this.apBarFill,
                    fillColor: { from: 0xff6600, to: 0xffcc00 },
                    duration: 200
                });
            } else if (value > oldAp) {
                // AP 회복 시 밝은 노란색 펄스
                this.scene.tweens.add({
                    targets: this.apBarFill,
                    fillColor: { from: 0xffff88, to: 0xffcc00 },
                    duration: 200
                });
            }
        } else {
            this.apBarFill.width = targetWidth;
        }

        this.apText.setText(`${this.currentAp}`);
    }

    addAp(amount) {
        this.setAp(this.currentAp + amount);
    }

    consumeAp(amount) {
        this.setAp(this.currentAp - amount);
        return this.currentAp;
    }

    damage(amount) {
        this.setHp(this.currentHp - amount);
        return this.currentHp;
    }

    heal(amount) {
        this.setHp(this.currentHp + amount);
        return this.currentHp;
    }

    destroy() {
        this.container.destroy();
    }
}
