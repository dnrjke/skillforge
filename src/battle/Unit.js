// 키워드 기반 전투 시스템 - 유닛 클래스
// Unit: HP, AP, Speed, Position, Skills[] 보유

import { SkillSets, SkillPresets } from '../data/Skills.js';

export default class Unit {
    constructor(config) {
        // 기본 정보
        this.id = config.id;
        this.name = config.name;
        this.isEnemy = config.isEnemy || false;

        // 스탯
        this.maxHp = config.maxHp || 100;
        this.currentHp = config.currentHp ?? this.maxHp;
        this.maxAp = config.maxAp || 10;
        this.currentAp = config.currentAp ?? 0;
        this.speed = config.speed || 10;  // 행동 순서 결정
        this.defense = config.defense || 0;

        // 위치 정보
        this.position = config.position || 0;  // 0~5 인덱스
        this.row = config.row || 'front';      // 'front' or 'back'

        // 스킬 (우선순위 순으로 정렬됨)
        this.skills = this.initializeSkills(config.skills || config.skillSet);

        // AP 회복량 (대기 시)
        this.apRecovery = config.apRecovery || 3;

        // 상태
        this.isAlive = true;
        this.isDefending = false;

        // 시각적 연결 (Phaser 스프라이트)
        this.sprite = null;
        this.statusBar = null;

        // 원래 위치 저장 (돌진 후 복귀용)
        this.originalX = 0;
        this.originalY = 0;
        this.originalDepth = 0;
    }

    initializeSkills(skillsOrSet) {
        if (Array.isArray(skillsOrSet)) {
            // 이미 스킬 배열인 경우
            return [...skillsOrSet].sort((a, b) => a.priority - b.priority);
        } else if (typeof skillsOrSet === 'string' && SkillSets[skillsOrSet]) {
            // 스킬셋 이름인 경우
            return [...SkillSets[skillsOrSet]].sort((a, b) => a.priority - b.priority);
        }
        // 기본 스킬셋
        return [...SkillSets.WARRIOR].sort((a, b) => a.priority - b.priority);
    }

    // Phaser 스프라이트 연결
    linkSprite(sprite) {
        this.sprite = sprite;
        this.statusBar = sprite.statusBar;

        // 원래 위치 저장
        this.originalX = sprite.x;
        this.originalY = sprite.y;
        this.originalDepth = sprite.depth;

        // StatusBar에 Unit 연결
        if (this.statusBar) {
            this.statusBar.unit = this;
            this.statusBar.maxAp = this.maxAp;
            this.statusBar.currentAp = this.currentAp;
            this.statusBar.setAp(this.currentAp, false);
        }
    }

    // 현재 AP로 사용 가능한 최우선순위 스킬 선택
    selectSkill() {
        // 우선순위 순으로 정렬된 스킬 중 사용 가능한 첫 번째 스킬
        for (const skill of this.skills) {
            if (skill.canUse(this.currentAp)) {
                return skill;
            }
        }
        // 모든 스킬 사용 불가 시 대기
        return SkillPresets.WAIT;
    }

    // AP 소모
    consumeAp(amount) {
        this.currentAp = Math.max(0, this.currentAp - amount);
        if (this.statusBar) {
            this.statusBar.setAp(this.currentAp);
        }
    }

    // AP 회복
    recoverAp(amount = null) {
        const recovery = amount ?? this.apRecovery;
        this.currentAp = Math.min(this.maxAp, this.currentAp + recovery);
        if (this.statusBar) {
            this.statusBar.setAp(this.currentAp);
        }
        return recovery;
    }

    // 데미지 받기
    takeDamage(damage) {
        // 방어 중이면 데미지 감소
        let finalDamage = damage;
        if (this.isDefending) {
            finalDamage = Math.max(1, Math.floor(damage * 0.5));
            this.isDefending = false;  // 방어 해제
        }

        // 방어력 적용
        finalDamage = Math.max(1, finalDamage - this.defense);

        this.currentHp = Math.max(0, this.currentHp - finalDamage);

        if (this.statusBar) {
            this.statusBar.damage(finalDamage);
        }

        if (this.currentHp <= 0) {
            this.isAlive = false;
        }

        return {
            damage: finalDamage,
            remainingHp: this.currentHp,
            isDead: !this.isAlive
        };
    }

    // 회복
    heal(amount) {
        const actualHeal = Math.min(amount, this.maxHp - this.currentHp);
        this.currentHp += actualHeal;

        if (this.statusBar) {
            this.statusBar.heal(actualHeal);
        }

        return actualHeal;
    }

    // 방어 태세
    defend() {
        this.isDefending = true;
    }

    // 상태 문자열
    getStatus() {
        return `${this.name} [HP: ${this.currentHp}/${this.maxHp}, AP: ${this.currentAp}/${this.maxAp}]`;
    }

    // 사망 여부
    get isDead() {
        return !this.isAlive;
    }

    // ==========================================
    // Phase 4: 시각적 연출 (Juice)
    // ==========================================

    // 턴 획득 시 Ready Motion (살짝 점프)
    playReadyMotion(scene) {
        return new Promise((resolve) => {
            if (!this.sprite) {
                resolve();
                return;
            }

            // 살짝 위로 점프
            scene.tweens.add({
                targets: this.sprite,
                y: this.sprite.y - 20,
                duration: 100,
                ease: 'Power2.easeOut',
                yoyo: true,
                onComplete: () => {
                    resolve();
                }
            });
        });
    }

    // 공격 시퀀스: Dash -> Attack -> 피격 판정 -> 복귀
    async performAttack(target, skill, scene, damageCallback) {
        if (!this.sprite || !target.sprite) {
            damageCallback();
            return;
        }

        // 1. 원래 위치 저장
        const startX = this.sprite.x;
        const startY = this.sprite.y;
        const startDepth = this.sprite.depth;

        // 2. Depth 높이기 (다른 유닛 위로)
        this.sprite.setDepth(1000);
        if (this.sprite.statusBar) {
            this.sprite.statusBar.container.setDepth(1001);
        }

        // 3. 타겟 앞까지 Dash
        const dashOffset = this.isEnemy ? 100 : -100;  // 적이면 왼쪽, 아군이면 오른쪽으로
        const targetX = target.sprite.x + dashOffset;
        const targetY = target.sprite.y;

        await this.dashTo(scene, targetX, targetY);

        // 4. Attack 애니메이션 재생 + 타격 프레임에서 데미지
        await this.playAttackAnimation(scene, target, damageCallback);

        // 5. 원래 자리로 복귀
        await this.dashTo(scene, startX, startY, true);

        // 6. Depth 복원
        this.sprite.setDepth(startDepth);
        if (this.sprite.statusBar) {
            this.sprite.statusBar.container.setDepth(1000);
        }
    }

    // Dash 이동 (Tween)
    dashTo(scene, targetX, targetY, isReturn = false) {
        return new Promise((resolve) => {
            const duration = isReturn ? 200 : 150;
            const ease = isReturn ? 'Power2.easeOut' : 'Power2.easeIn';

            scene.tweens.add({
                targets: this.sprite,
                x: targetX,
                y: targetY,
                duration: duration,
                ease: ease,
                onComplete: () => {
                    resolve();
                }
            });
        });
    }

    // Attack 애니메이션 + 타격 프레임에서 데미지 판정
    playAttackAnimation(scene, target, damageCallback) {
        return new Promise((resolve) => {
            // attack 애니메이션 재생 (없으면 idle 사용)
            const hasAttackAnim = scene.anims.exists('knight_attack');

            if (hasAttackAnim) {
                this.sprite.play('knight_attack');
            }

            // 타격 타이밍 (애니메이션 중간 지점)
            const hitDelay = hasAttackAnim ? 150 : 100;

            scene.time.delayedCall(hitDelay, () => {
                // 데미지 판정 콜백
                damageCallback();

                // 피격 효과
                this.applyHitFeedback(scene, target);
            });

            // 애니메이션 완료 대기
            const animDuration = hasAttackAnim ? 400 : 200;
            scene.time.delayedCall(animDuration, () => {
                if (this.isAlive) {
                    this.sprite.play('knight_idle');
                }
                resolve();
            });
        });
    }

    // 피격 피드백 (타격감 극대화)
    applyHitFeedback(scene, target) {
        if (!target.sprite) return;

        // 1. 붉은색 깜빡임 (0.1초)
        const originalTint = target.isEnemy ? 0xff8888 : 0xffffff;
        target.sprite.setTint(0xff0000);
        scene.time.delayedCall(100, () => {
            if (target.sprite && target.sprite.active) {
                target.sprite.setTint(originalTint);
            }
        });

        // 2. 화면 흔들림 (짧게)
        scene.cameras.main.shake(80, 0.005);

        // 3. 피격 애니메이션
        if (target.isAlive) {
            target.sprite.play('knight_hit');
            target.sprite.once('animationcomplete', () => {
                if (target.isAlive) {
                    target.sprite.play('knight_idle');
                }
            });
        }
    }

    // 플로팅 데미지 텍스트
    showFloatingDamage(scene, damage, isHeal = false) {
        if (!this.sprite) return;

        const color = isHeal ? '#44ff44' : '#ff4444';
        const prefix = isHeal ? '+' : '-';
        const yOffset = -80;

        const text = scene.add.text(
            this.sprite.x,
            this.sprite.y + yOffset,
            `${prefix}${damage}`,
            {
                fontSize: '28px',
                fill: color,
                fontFamily: 'Arial',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(2000);

        // 위로 솟구치며 사라지는 연출
        scene.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            duration: 800,
            ease: 'Power2.easeOut',
            onComplete: () => {
                text.destroy();
            }
        });
    }

    // AP 변화 플로팅 텍스트
    showFloatingAp(scene, amount, isRecovery = false) {
        if (!this.sprite) return;

        const color = isRecovery ? '#44ccff' : '#ffcc00';
        const prefix = isRecovery ? '+' : '-';
        const yOffset = -60;

        const text = scene.add.text(
            this.sprite.x + 40,
            this.sprite.y + yOffset,
            `AP ${prefix}${Math.abs(amount)}`,
            {
                fontSize: '18px',
                fill: color,
                fontFamily: 'Arial',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(2000);

        // 위로 솟구치며 사라지는 연출
        scene.tweens.add({
            targets: text,
            y: text.y - 30,
            alpha: 0,
            duration: 600,
            ease: 'Power2.easeOut',
            onComplete: () => {
                text.destroy();
            }
        });
    }

    // AP 부족 시 휴식 연출
    async performRest(scene, recoveredAp) {
        if (!this.sprite) return;

        // 1. "기력 부족" 또는 "..." 텍스트
        const exhaustedText = scene.add.text(
            this.sprite.x,
            this.sprite.y - 100,
            '기력 부족...',
            {
                fontSize: '16px',
                fill: '#aaaaaa',
                fontFamily: 'Arial',
                fontStyle: 'italic',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(2000);

        // 잠시 후 사라짐
        scene.tweens.add({
            targets: exhaustedText,
            alpha: 0,
            duration: 800,
            delay: 500,
            onComplete: () => {
                exhaustedText.destroy();
            }
        });

        // 2. 반짝이는 회복 이펙트
        await this.playRecoveryEffect(scene);

        // 3. 파란색 AP 회복 숫자
        this.showFloatingAp(scene, recoveredAp, true);
    }

    // 회복 이펙트 (반짝임)
    playRecoveryEffect(scene) {
        return new Promise((resolve) => {
            if (!this.sprite) {
                resolve();
                return;
            }

            // 파란색 빛 효과
            const glow = scene.add.ellipse(
                this.sprite.x,
                this.sprite.y,
                80, 80,
                0x44ccff,
                0.5
            ).setDepth(this.sprite.depth - 0.5);

            // 확장되며 사라지는 연출
            scene.tweens.add({
                targets: glow,
                scaleX: 2,
                scaleY: 2,
                alpha: 0,
                duration: 500,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    glow.destroy();
                    resolve();
                }
            });

            // 캐릭터 살짝 빛남
            const originalTint = this.isEnemy ? 0xff8888 : 0xffffff;
            this.sprite.setTint(0x88ccff);
            scene.time.delayedCall(300, () => {
                if (this.sprite && this.sprite.active) {
                    this.sprite.setTint(originalTint);
                }
            });
        });
    }

    // 치유 스킬 연출
    async performHeal(target, healAmount, scene) {
        if (!this.sprite || !target.sprite) return;

        // 치유 이펙트
        const healGlow = scene.add.ellipse(
            target.sprite.x,
            target.sprite.y,
            60, 60,
            0x44ff44,
            0.6
        ).setDepth(target.sprite.depth - 0.5);

        // 확장되며 사라지는 연출
        scene.tweens.add({
            targets: healGlow,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 400,
            ease: 'Power2.easeOut',
            onComplete: () => {
                healGlow.destroy();
            }
        });

        // 회복 숫자 표시
        target.showFloatingDamage(scene, healAmount, true);
    }

    // 방어 스킬 연출
    async performDefend(scene) {
        if (!this.sprite) return;

        // 방어 이펙트 (파란 방패 느낌)
        const shield = scene.add.ellipse(
            this.sprite.x,
            this.sprite.y,
            100, 120,
            0x4488ff,
            0.4
        ).setDepth(this.sprite.depth + 0.5);

        // 펄스 후 사라짐
        scene.tweens.add({
            targets: shield,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0,
            duration: 500,
            ease: 'Power2.easeOut',
            onComplete: () => {
                shield.destroy();
            }
        });
    }
}
