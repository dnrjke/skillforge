export default class LogWindow {
    constructor(scene, startMinimized = true) {
        this.scene = scene;
        this.isMinimized = startMinimized; // Phase 4.75: 기본 숨김
        this.initialHeight = 180; // 초기 높이
        this.currentHeight = startMinimized ? 0 : 180;
        this.minHeight = 80;
        this.maxHeight = 350;
        this.dragHandleHeight = 28;
        this.minimizedHandleHeight = 50;
        this.windowWidth = 700;
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartTop = 0;
        this.hasDragged = false;

        // 로그 배치 관리
        this.currentBatch = null;
        this.batchIndex = 0;

        // 로그 번호 카운터
        this.logCount = 0;

        // 모바일 감지
        this.isMobile = this.detectMobile();

        this.createDOM();
        this.setupDragHandle();
        this.setupToggleButton();

        // Phase 4.75: 초기 숨김 상태 적용
        if (this.isMinimized) {
            this.applyMinimizedState();
        }
    }

    // 최소화 상태 적용 (초기화용)
    applyMinimizedState() {
        this.body.style.display = 'none';
        const handleHeight = this.isMobile ? this.minimizedHandleHeight : this.dragHandleHeight;
        this.dragHandle.style.height = `${handleHeight}px`;
        this.window.style.height = `${handleHeight}px`;
        this.toggleBtn.textContent = '▲';
        this.dragHandle.style.cursor = 'pointer';
        this.window.style.borderRadius = '8px';
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    createDOM() {
        const baseFontSize = this.isMobile ? 22 : 13;
        const toggleSize = this.isMobile ? 40 : 28;

        const html = `
            <style>
                #log-window {
                    pointer-events: auto;
                }
                #log-window *::-webkit-scrollbar {
                    width: ${this.isMobile ? 10 : 6}px;
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
                @media (max-width: 768px) {
                    #log-content {
                        font-size: ${baseFontSize}px !important;
                    }
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
                <!-- 드래그 핸들 영역 -->
                <div id="log-drag-handle" style="
                    height: ${this.dragHandleHeight}px;
                    cursor: ns-resize;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-shrink: 0;
                    touch-action: none;
                    user-select: none;
                    position: relative;
                ">
                    <div id="drag-indicator" style="
                        width: 50px;
                        height: 5px;
                        background: rgba(255,255,255,0.3);
                        border-radius: 3px;
                    "></div>

                    <!-- 토글 버튼 (상단 바 우측) -->
                    <button id="log-toggle" style="
                        position: absolute;
                        right: 8px;
                        top: 50%;
                        transform: translateY(-50%);
                        width: ${toggleSize}px;
                        height: ${toggleSize - 4}px;
                        background: rgba(255,255,255,0.15);
                        border: none;
                        border-radius: 4px;
                        color: rgba(255,255,255,0.7);
                        font-size: ${this.isMobile ? 18 : 14}px;
                        cursor: pointer;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 10;
                        transition: background 0.2s;
                        touch-action: manipulation;
                    ">▼</button>
                </div>

                <!-- 로그 콘텐츠 영역 -->
                <div id="log-body" style="
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                ">
                    <div id="log-content" style="
                        height: 100%;
                        overflow-y: auto;
                        padding: ${this.isMobile ? '8px 12px 20px 16px' : '4px 8px 16px 12px'};
                        color: #ddd;
                        font-size: ${baseFontSize}px;
                        line-height: ${this.isMobile ? 1.6 : 1.5};
                        overscroll-behavior: contain;
                        touch-action: none;
                    "></div>
                </div>
            </div>
        `;

        // 순수 HTML 엘리먼트 생성 (게임 컨테이너 기준 절대 위치)
        const container = document.createElement('div');
        container.id = 'log-window-container';
        container.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            z-index: 100;
            pointer-events: auto;
        `;
        container.innerHTML = html;

        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.appendChild(container);
        this.containerElement = container;

        this.window = container.querySelector('#log-window');
        this.dragHandle = container.querySelector('#log-drag-handle');
        this.dragIndicator = container.querySelector('#drag-indicator');
        this.body = container.querySelector('#log-body');
        this.content = container.querySelector('#log-content');
        this.toggleBtn = container.querySelector('#log-toggle');

        // 키보드 이벤트 전파 방지
        this.window.addEventListener('keydown', (e) => e.stopPropagation());
        this.window.addEventListener('keyup', (e) => e.stopPropagation());

        // 토글 버튼 호버 효과
        this.toggleBtn.addEventListener('mouseenter', () => {
            this.toggleBtn.style.background = 'rgba(255,255,255,0.25)';
        });
        this.toggleBtn.addEventListener('mouseleave', () => {
            this.toggleBtn.style.background = 'rgba(255,255,255,0.15)';
        });

        // 로그 콘텐츠 터치 스크롤 직접 처리
        this.setupContentTouchScroll();
    }

    setupContentTouchScroll() {
        let touchStartY = 0;
        let scrollStartY = 0;

        this.content.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            scrollStartY = this.content.scrollTop;
        }, { passive: true });

        this.content.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].clientY;
            const deltaY = touchStartY - touchY;
            this.content.scrollTop = scrollStartY + deltaY;
        }, { passive: true });
    }

    setupDragHandle() {
        // 마우스 다운 - 드래그 시작
        this.dragHandle.addEventListener('mousedown', (e) => {
            // 토글 버튼 클릭은 제외
            if (e.target === this.toggleBtn || this.toggleBtn.contains(e.target)) {
                return;
            }
            this.startDrag(e.clientY);
            e.preventDefault();
            e.stopPropagation();
        });

        // 터치 시작 - 드래그로만 확장
        this.dragHandle.addEventListener('touchstart', (e) => {
            // 토글 버튼 터치는 제외
            if (e.target === this.toggleBtn || this.toggleBtn.contains(e.target)) {
                return;
            }
            this.startDrag(e.touches[0].clientY);
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
            this.endDrag();
        });

        document.addEventListener('touchend', () => {
            this.endDrag();
        });

        // 드래그 핸들 호버 효과
        this.dragHandle.addEventListener('mouseenter', () => {
            this.dragIndicator.style.background = 'rgba(255,255,255,0.5)';
        });
        this.dragHandle.addEventListener('mouseleave', () => {
            this.dragIndicator.style.background = 'rgba(255,255,255,0.3)';
        });
    }

    startDrag(clientY) {
        this.isDragging = true;
        this.hasDragged = false;
        this.dragStartY = clientY;

        // 현재 윈도우 높이 저장
        this.dragStartHeight = parseInt(this.window.style.height) || this.currentHeight;
    }

    endDrag() {
        this.isDragging = false;
        this.hasDragged = false;
    }

    handleDrag(clientY) {
        const deltaY = this.dragStartY - clientY; // 위로 드래그하면 양수

        // 드래그 감지 (5px 이상 이동)
        if (Math.abs(deltaY) > 5) {
            this.hasDragged = true;
        }

        // 접힌 상태에서 위로 드래그하면 점진적으로 확장
        if (this.isMinimized && deltaY > 10) {
            this.isMinimized = false;
            this.body.style.display = 'block';
            this.toggleBtn.textContent = '▼';
            this.dragHandle.style.cursor = 'ns-resize';
            this.dragHandle.style.height = `${this.dragHandleHeight}px`;
            this.window.style.borderRadius = '8px 8px 0 0';
            this.dragStartHeight = this.initialHeight;
        }

        if (!this.isMinimized) {
            let newHeight = this.dragStartHeight + deltaY;
            newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, newHeight));

            this.currentHeight = newHeight;
            this.window.style.height = `${newHeight}px`;
        }
    }

    setupToggleButton() {
        // 클릭 이벤트
        this.toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });

        // 마우스 다운 시 드래그 방지
        this.toggleBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        // 터치 시작 시 드래그 방지
        this.toggleBtn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        }, { passive: true });

        // 터치 이동 시 전체 창 드래그 방지
        this.toggleBtn.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });

        this.toggleBtn.setAttribute('tabindex', '-1');
    }

    toggle() {
        this.isMinimized = !this.isMinimized;

        if (this.isMinimized) {
            // 최소화
            this.body.style.display = 'none';
            const handleHeight = this.isMobile ? this.minimizedHandleHeight : this.dragHandleHeight;
            this.dragHandle.style.height = `${handleHeight}px`;
            this.window.style.height = `${handleHeight}px`;
            this.toggleBtn.textContent = '▲';
            this.dragHandle.style.cursor = 'pointer';
            this.window.style.borderRadius = '8px';
        } else {
            // 복구 - 초기값만큼만 펼치기
            this.body.style.display = 'block';
            this.dragHandle.style.height = `${this.dragHandleHeight}px`;
            this.currentHeight = this.initialHeight;
            this.window.style.height = `${this.currentHeight}px`;
            this.toggleBtn.textContent = '▼';
            this.dragHandle.style.cursor = 'ns-resize';
            this.window.style.borderRadius = '8px 8px 0 0';

            this.scrollToBottom();
        }
    }

    startBatch() {
        this.currentBatch = document.createElement('div');
        this.currentBatch.style.padding = this.isMobile ? '6px 14px' : '3px 10px';
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
        this.logCount++;

        const colors = {
            info: '#999',
            damage: '#ff8080',
            heal: '#80ff80',
            system: '#80b0ff',
            skill: '#ffb080'
        };

        const formattedMessage = this.formatMessage(message);

        const logEntry = document.createElement('div');
        logEntry.style.color = colors[type] || colors.info;
        logEntry.style.marginBottom = this.isMobile ? '4px' : '2px';
        logEntry.style.lineHeight = this.isMobile ? '1.6' : '1.4';
        logEntry.innerHTML = `<span style="color: #666; font-size: 0.85em;">#${this.logCount}</span> ${formattedMessage}`;

        if (this.currentBatch) {
            this.currentBatch.appendChild(logEntry);
        } else {
            const singleBatch = document.createElement('div');
            singleBatch.style.padding = this.isMobile ? '6px 14px' : '3px 10px';
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

    clear() {
        this.content.innerHTML = '';
        this.batchIndex = 0;
        this.logCount = 0;
    }

    // 화면 크기 변경 시 UI 재배치
    reposition(width, height) {
        // position: fixed 사용으로 자동 재배치됨
        // 필요시 여기서 스타일 업데이트 가능
    }
}
