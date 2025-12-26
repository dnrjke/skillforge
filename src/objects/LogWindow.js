export default class LogWindow {
    constructor(scene) {
        this.scene = scene;
        this.isMinimized = false;
        this.currentHeight = 180;
        this.minHeight = 80;
        this.maxHeight = 350;
        this.dragHandleHeight = 20;
        this.windowWidth = 700;
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartTop = 0;

        // 상단 가장자리의 Y 위치
        this.topY = 720 - this.currentHeight;

        // 로그 배치 관리
        this.currentBatch = null;
        this.batchIndex = 0;

        this.createDOM();
        this.setupDragHandle();
        this.setupToggleButton();
    }

    createDOM() {
        const html = `
            <style>
                #log-window *::-webkit-scrollbar {
                    width: 6px;
                }
                #log-window *::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 3px;
                }
                #log-window *::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 3px;
                }
                #log-window *::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.25);
                }
                #log-content {
                    overscroll-behavior: contain;
                    -webkit-overflow-scrolling: auto;
                }
            </style>
            <div id="log-window" style="
                position: relative;
                width: ${this.windowWidth}px;
                height: ${this.currentHeight}px;
                display: flex;
                flex-direction: column;
                font-family: 'Courier New', monospace;
                box-sizing: border-box;
                background: linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.9));
                border-radius: 8px 8px 0 0;
                touch-action: pan-y;
            ">
                <!-- 드래그 핸들 영역 (투명, 상단) -->
                <div id="log-drag-handle" style="
                    height: ${this.dragHandleHeight}px;
                    cursor: ns-resize;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-shrink: 0;
                    touch-action: none;
                ">
                    <div style="
                        width: 40px;
                        height: 4px;
                        background: rgba(255,255,255,0.2);
                        border-radius: 2px;
                    "></div>
                </div>

                <!-- 로그 콘텐츠 영역 -->
                <div id="log-body" style="
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                ">
                    <!-- 토글 버튼 (우상단 내부) -->
                    <button id="log-toggle" style="
                        position: absolute;
                        top: 4px;
                        right: 8px;
                        width: 24px;
                        height: 20px;
                        background: rgba(255,255,255,0.1);
                        border: none;
                        border-radius: 3px;
                        color: rgba(255,255,255,0.5);
                        font-size: 12px;
                        cursor: pointer;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 10;
                        transition: background 0.2s;
                    ">▼</button>

                    <div id="log-content" style="
                        height: 100%;
                        overflow-y: auto;
                        padding: 4px 8px 16px 12px;
                        color: #ddd;
                        font-size: 13px;
                        line-height: 1.5;
                        overscroll-behavior: contain;
                    "></div>
                </div>
            </div>
        `;

        this.domElement = this.scene.add.dom(640, this.topY).createFromHTML(html);
        this.domElement.setOrigin(0.5, 0);
        this.domElement.setDepth(2000);

        this.window = this.domElement.getChildByID('log-window');
        this.dragHandle = this.domElement.getChildByID('log-drag-handle');
        this.body = this.domElement.getChildByID('log-body');
        this.content = this.domElement.getChildByID('log-content');
        this.toggleBtn = this.domElement.getChildByID('log-toggle');

        // 키보드 이벤트 전파 방지
        this.window.addEventListener('keydown', (e) => e.stopPropagation());
        this.window.addEventListener('keyup', (e) => e.stopPropagation());

        // 토글 버튼 호버 효과
        this.toggleBtn.addEventListener('mouseenter', () => {
            this.toggleBtn.style.background = 'rgba(255,255,255,0.2)';
            this.toggleBtn.style.color = 'rgba(255,255,255,0.8)';
        });
        this.toggleBtn.addEventListener('mouseleave', () => {
            this.toggleBtn.style.background = 'rgba(255,255,255,0.1)';
            this.toggleBtn.style.color = 'rgba(255,255,255,0.5)';
        });
    }

    setupDragHandle() {
        // 클릭으로 최소화 상태 해제
        this.dragHandle.addEventListener('click', (e) => {
            if (this.isMinimized) {
                this.toggle();
            }
        });

        this.dragHandle.addEventListener('mousedown', (e) => {
            // 최소화 상태에서는 클릭만 처리 (드래그 X)
            if (this.isMinimized) return;

            this.isDragging = true;
            this.dragStartY = e.clientY;
            this.dragStartTop = this.topY;
            e.preventDefault();
            e.stopPropagation();
        });

        // 터치 지원
        this.dragHandle.addEventListener('touchstart', (e) => {
            if (this.isMinimized) {
                this.toggle();
                return;
            }

            this.isDragging = true;
            this.dragStartY = e.touches[0].clientY;
            this.dragStartTop = this.topY;
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.handleDrag(e.clientY);
        });

        document.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            this.handleDrag(e.touches[0].clientY);
        }, { passive: false });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        document.addEventListener('touchend', () => {
            this.isDragging = false;
        });
    }

    handleDrag(clientY) {
        const gameContainer = document.getElementById('game-container');
        const canvas = gameContainer.querySelector('canvas');
        const scaleY = 720 / canvas.clientHeight;

        const deltaY = (clientY - this.dragStartY) * scaleY;
        let newTop = this.dragStartTop + deltaY;

        const minTop = 720 - this.maxHeight;
        const maxTop = 720 - this.minHeight;
        newTop = Math.max(minTop, Math.min(maxTop, newTop));

        const newHeight = 720 - newTop;

        this.topY = newTop;
        this.currentHeight = newHeight;

        this.domElement.setY(this.topY);
        this.window.style.height = `${newHeight}px`;
    }

    setupToggleButton() {
        this.toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });

        this.toggleBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        this.toggleBtn.setAttribute('tabindex', '-1');
    }

    toggle() {
        this.isMinimized = !this.isMinimized;

        if (this.isMinimized) {
            // 최소화: 드래그 핸들만 보임
            this.body.style.display = 'none';
            const minHeight = this.dragHandleHeight;
            this.window.style.height = `${minHeight}px`;
            this.topY = 720 - minHeight;
            this.domElement.setY(this.topY);
            this.toggleBtn.textContent = '▲';
            this.dragHandle.style.cursor = 'pointer';
            this.window.style.borderRadius = '8px';
        } else {
            // 복구
            this.body.style.display = 'block';
            this.window.style.height = `${this.currentHeight}px`;
            this.topY = 720 - this.currentHeight;
            this.domElement.setY(this.topY);
            this.toggleBtn.textContent = '▼';
            this.dragHandle.style.cursor = 'ns-resize';
            this.window.style.borderRadius = '8px 8px 0 0';

            this.scrollToBottom();
        }
    }

    startBatch() {
        this.currentBatch = document.createElement('div');
        this.currentBatch.style.padding = '3px 10px';
        this.currentBatch.style.marginBottom = '1px';
        this.currentBatch.style.borderRadius = '3px';

        if (this.batchIndex % 2 === 1) {
            this.currentBatch.style.background = 'rgba(255, 255, 255, 0.04)';
        }

        this.content.appendChild(this.currentBatch);
        this.batchIndex++;
    }

    endBatch() {
        this.currentBatch = null;
        this.scrollToBottom();
    }

    formatMessage(message) {
        message = message.replace(/(아군\d+)/g, '<span style="color: #5dadec; font-weight: bold;">$1</span>');
        message = message.replace(/(적군\d+)/g, '<span style="color: #ec5d5d; font-weight: bold;">$1</span>');
        return message;
    }

    addLog(message, type = 'info') {
        const colors = {
            info: '#999',
            damage: '#ff8080',
            heal: '#80ff80',
            system: '#80b0ff',
            skill: '#ffb080'
        };

        const timestamp = this.getTimestamp();
        const formattedMessage = this.formatMessage(message);

        const logEntry = document.createElement('div');
        logEntry.style.color = colors[type] || colors.info;
        logEntry.style.marginBottom = '2px';
        logEntry.style.lineHeight = '1.4';
        logEntry.innerHTML = `<span style="color: #888;">[${timestamp}]</span> ${formattedMessage}`;

        if (this.currentBatch) {
            this.currentBatch.appendChild(logEntry);
        } else {
            const singleBatch = document.createElement('div');
            singleBatch.style.padding = '3px 10px';
            singleBatch.style.marginBottom = '1px';
            singleBatch.style.borderRadius = '3px';

            if (this.batchIndex % 2 === 1) {
                singleBatch.style.background = 'rgba(255, 255, 255, 0.04)';
            }

            singleBatch.appendChild(logEntry);
            this.content.appendChild(singleBatch);
            this.batchIndex++;
            this.scrollToBottom();
        }
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.content.scrollTop = this.content.scrollHeight;
        });
    }

    getTimestamp() {
        const now = new Date();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

    clear() {
        this.content.innerHTML = '';
        this.batchIndex = 0;
    }
}
