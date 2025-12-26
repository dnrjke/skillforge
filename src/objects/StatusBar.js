export default class StatusBar {
    constructor(scene, character, config = {}) {
        this.scene = scene;
        this.character = character;

        // 기본 설정
        this.maxHp = config.maxHp || 100;
        this.currentHp = config.currentHp || this.maxHp;
        this.maxAp = config.maxAp || 10;
        this.currentAp = config.currentAp || 0;

        // 바 크기 설정
        this.barWidth = config.barWidth || 70;
        this.barHeight = config.barHeight || 8;
        this.offsetY = config.offsetY || -70;

        // 그래픽 요소
        this.container = null;
        this.hpBarBg = null;
        this.hpBarFill = null;
        this.apBarBg = null;
        this.apBarFill = null;
        this.apText = null;

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
            this.barWidth + 2, this.barHeight + 2,
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
            this.barWidth + 2, this.barHeight,
            0x000000
        ).setOrigin(0.5);

        // AP 바 내부 배경
        this.apBarInnerBg = this.scene.add.rectangle(
            0, apBarY,
            this.barWidth, this.barHeight - 2,
            0x222222
        ).setOrigin(0.5);

        // AP 바 채움 (황색)
        this.apBarFill = this.scene.add.rectangle(
            -this.barWidth / 2, apBarY,
            0, this.barHeight - 4,
            0xffcc00
        ).setOrigin(0, 0.5);

        // AP 수치 텍스트
        this.apText = this.scene.add.text(
            this.barWidth / 2 + 5, apBarY,
            `${this.currentAp}/${this.maxAp}`,
            {
                fontSize: '11px',
                fill: '#ffcc00',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0, 0.5);

        // 컨테이너에 추가
        this.container.add([
            this.hpBarBg,
            this.hpBarInnerBg,
            this.hpBarFill,
            this.apBarBg,
            this.apBarInnerBg,
            this.apBarFill,
            this.apText
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
        this.currentAp = Math.max(0, Math.min(this.maxAp, value));
        const targetWidth = (this.currentAp / this.maxAp) * this.barWidth;

        if (animate) {
            this.scene.tweens.add({
                targets: this.apBarFill,
                width: targetWidth,
                duration: 200,
                ease: 'Power2'
            });
        } else {
            this.apBarFill.width = targetWidth;
        }

        this.apText.setText(`${this.currentAp}/${this.maxAp}`);
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
