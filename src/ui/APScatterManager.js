import Phaser from 'phaser';

/**
 * APScatterManager - 소모된 AP 반딧불의 비산 연출 관리
 *
 * 역할:
 * - 소모된 AP 반딧불을 월드 좌표계로 이전
 * - damping -0.01로 비산 물리 적용
 * - 3초 후 자동 소멸 (메모리에서 완전 제거)
 * - 캐릭터 이동과 독립적으로 작동
 */
export default class APScatterManager {
    constructor(scene, parentContainer = null) {
        this.scene = scene;
        this.parentContainer = parentContainer;

        // 비산 중인 반딧불 목록
        this.scatteringFireflies = [];

        // 비산 물리 설정
        this.scatterDamping = -0.01;  // 음수 damping = 흩어짐
        this.scatterDuration = 3000;   // 3초 후 소멸
        this.fadeStartTime = 2000;     // 2초 후부터 페이드 시작

        // 화면 경계 마진 (잔상 효과가 자연스럽게 사라지도록)
        this.boundaryMargin = 100;     // 화면 바깥 100px 여유 공간
    }

    /**
     * 현재 화면 경계 계산 (반응형)
     * @returns {Object} { left, right, top, bottom }
     */
    getScreenBounds() {
        const camera = this.scene.cameras.main;
        const margin = this.boundaryMargin;

        return {
            left: camera.scrollX - margin,
            right: camera.scrollX + camera.width + margin,
            top: camera.scrollY - margin,
            bottom: camera.scrollY + camera.height + margin
        };
    }

    /**
     * 반딧불이 화면 경계를 벗어났는지 확인
     * @param {Object} firefly - 반딧불 객체
     * @returns {boolean} 경계 벗어남 여부
     */
    isOutOfBounds(firefly) {
        const bounds = this.getScreenBounds();
        const x = firefly.worldPos.x;
        const y = firefly.worldPos.y;

        return x < bounds.left || x > bounds.right ||
               y < bounds.top || y > bounds.bottom;
    }

    /**
     * 반딧불을 비산 관리자로 이전
     * @param {Object} firefly - 반딧불 객체
     * @param {number} worldX - 월드 X 좌표
     * @param {number} worldY - 월드 Y 좌표
     */
    addFirefly(firefly, worldX, worldY) {
        // 스프라이트들을 부모 컨테이너로 이동 (월드 좌표계)
        if (this.parentContainer) {
            // 기존 컨테이너에서 제거
            if (firefly.sprite.parentContainer) {
                firefly.sprite.parentContainer.remove(firefly.sprite);
            }
            if (firefly.glow.parentContainer) {
                firefly.glow.parentContainer.remove(firefly.glow);
            }
            if (firefly.trail.parentContainer) {
                firefly.trail.parentContainer.remove(firefly.trail);
            }

            // 월드 컨테이너에 추가
            this.parentContainer.add(firefly.trail);
            this.parentContainer.add(firefly.glow);
            this.parentContainer.add(firefly.sprite);
        }

        // 월드 좌표로 위치 설정
        firefly.worldPos = { x: worldX, y: worldY };
        firefly.sprite.setPosition(worldX, worldY);
        firefly.glow.setPosition(worldX, worldY);

        // 비산 상태 설정
        firefly.isScattering = true;
        firefly.scatterStartTime = this.scene.time.now;
        firefly.originalDamping = firefly.orbitParams.damping;
        firefly.orbitParams.damping = this.scatterDamping;

        // 초기 비산 속도 부여 (현재 속도 + 랜덤 방향)
        const randomAngle = Math.random() * Math.PI * 2;
        const randomSpeed = 0.5 + Math.random() * 1.0;
        firefly.velocity.x += Math.cos(randomAngle) * randomSpeed;
        firefly.velocity.y += Math.sin(randomAngle) * randomSpeed;

        this.scatteringFireflies.push(firefly);
    }

    /**
     * 매 프레임 업데이트
     * @param {number} delta - 프레임 델타 시간 (ms)
     */
    update(delta) {
        const deltaSeconds = delta / 1000;
        const currentTime = this.scene.time.now;

        // 소멸 대상 인덱스 수집
        const toRemove = [];

        this.scatteringFireflies.forEach((firefly, index) => {
            const elapsed = currentTime - firefly.scatterStartTime;

            // 3초 경과 또는 화면 경계 이탈 시 소멸
            if (elapsed >= this.scatterDuration || this.isOutOfBounds(firefly)) {
                toRemove.push(index);
                return;
            }

            // 비산 물리 적용 (음수 damping으로 흩어짐)
            const dx = -firefly.velocity.x * 0.1;
            const dy = -firefly.velocity.y * 0.1;

            firefly.acceleration.x = dx * firefly.orbitParams.damping;
            firefly.acceleration.y = dy * firefly.orbitParams.damping;

            // 속도 업데이트 (관성 유지하며 서서히 퍼짐)
            firefly.velocity.x = firefly.velocity.x * 0.995 + firefly.acceleration.x;
            firefly.velocity.y = firefly.velocity.y * 0.995 + firefly.acceleration.y;

            // 위치 업데이트 (월드 좌표)
            firefly.worldPos.x += firefly.velocity.x;
            firefly.worldPos.y += firefly.velocity.y;

            // 페이드 아웃 계산
            let alpha = 1.0;
            if (elapsed >= this.fadeStartTime) {
                const fadeProgress = (elapsed - this.fadeStartTime) / (this.scatterDuration - this.fadeStartTime);
                alpha = 1.0 - fadeProgress;
            }

            // 맥동 효과 유지
            firefly.pulsePhase += deltaSeconds * 2;
            const pulse = 1 + Math.sin(firefly.pulsePhase) * 0.1;

            // 스프라이트 업데이트
            firefly.sprite.setPosition(firefly.worldPos.x, firefly.worldPos.y);
            firefly.sprite.setAlpha(alpha);
            firefly.sprite.setScale(pulse);

            // Glow 업데이트
            firefly.glow.setPosition(firefly.worldPos.x, firefly.worldPos.y);
            firefly.glow.setAlpha(alpha * 0.4);
            firefly.glow.setScale(pulse * 1.5);

            // Trail 업데이트
            this.updateTrail(firefly, alpha);
        });

        // 소멸 처리 (역순으로 제거하여 인덱스 문제 방지)
        toRemove.reverse().forEach(index => {
            this.destroyFirefly(index);
        });
    }

    /**
     * 트레일 업데이트
     */
    updateTrail(firefly, alpha) {
        firefly.trailPositions.unshift({
            x: firefly.worldPos.x,
            y: firefly.worldPos.y
        });

        if (firefly.trailPositions.length > 6) {
            firefly.trailPositions.pop();
        }

        firefly.trail.clear();
        if (firefly.trailPositions.length > 1) {
            for (let i = 1; i < firefly.trailPositions.length; i++) {
                const fadeRatio = 1 - i / firefly.trailPositions.length;
                const lineAlpha = 0.2 * fadeRatio * alpha;
                const width = firefly.size * 0.4 * fadeRatio;

                firefly.trail.lineStyle(width, firefly.color, lineAlpha);
                firefly.trail.beginPath();
                firefly.trail.moveTo(
                    firefly.trailPositions[i - 1].x,
                    firefly.trailPositions[i - 1].y
                );
                firefly.trail.lineTo(
                    firefly.trailPositions[i].x,
                    firefly.trailPositions[i].y
                );
                firefly.trail.strokePath();
            }
        }
    }

    /**
     * 반딧불 소멸 - 메모리에서 완전 제거
     */
    destroyFirefly(index) {
        const firefly = this.scatteringFireflies[index];
        if (firefly) {
            // Phaser 오브젝트 완전 파괴
            if (firefly.sprite) {
                firefly.sprite.destroy();
                firefly.sprite = null;
            }
            if (firefly.glow) {
                firefly.glow.destroy();
                firefly.glow = null;
            }
            if (firefly.trail) {
                firefly.trail.destroy();
                firefly.trail = null;
            }
            // 배열에서 제거
            this.scatteringFireflies.splice(index, 1);
        }
    }

    /**
     * 모든 비산 반딧불 제거
     */
    clear() {
        this.scatteringFireflies.forEach(firefly => {
            if (firefly.sprite) {
                firefly.sprite.destroy();
                firefly.sprite = null;
            }
            if (firefly.glow) {
                firefly.glow.destroy();
                firefly.glow = null;
            }
            if (firefly.trail) {
                firefly.trail.destroy();
                firefly.trail = null;
            }
        });
        this.scatteringFireflies = [];
    }

    /**
     * 정리
     */
    destroy() {
        this.clear();
    }
}
