export default class LogWindow {
    constructor(scene) {
        this.scene = scene;
        this.isMinimized = false;
        this.currentHeight = 180;
        this.minHeight = 100;
        this.maxHeight = 350;
        this.headerHeight = 32;
        this.windowWidth = 700;
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartTop = 0;

        // 상단 바의 Y 위치 (화면 좌표 기준)
        this.headerY = 720 - this.currentHeight;

        // 로그 배치 관리
        this.currentBatch = null;
        this.batchIndex = 0;

        this.createDOM();
        this.setupDragHandle();
        this.setupToggleButton();
    }

    createDOM() {
        const html = `
            <div id="log-window" style="
                position: relative;
                width: ${this.windowWidth}px;
                height: ${this.currentHeight}px;
                display: flex;
                flex-direction: column;
                font-family: 'Courier New', monospace;
                box-sizing: border-box;
            ">
                <div id="log-header" style="
                    height: ${this.headerHeight}px;
                    min-height: ${this.headerHeight}px;
                    background: linear-gradient(to bottom, #5a5a5a, #3a3a3a);
                    border: 2px solid #666;
                    border-bottom: 1px solid #444;
                    border-radius: 8px 8px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 12px;
                    cursor: ns-resize;
                    user-select: none;
                    flex-shrink: 0;
                ">
                    <span style="color: #ddd; font-size: 13px; font-weight: bold;">Battle Log</span>
                    <button id="log-toggle" style="
                        width: 28px;
                        height: 22px;
                        background: linear-gradient(to bottom, #777, #555);
                        border: 1px solid #888;
                        border-radius: 4px;
                        color: #fff;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        line-height: 1;
                    ">▼</button>
                </div>
                <div id="log-body" style="
                    flex: 1;
                    background: rgba(0, 0, 0, 0.9);
                    border: 2px solid #666;
                    border-top: none;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                ">
                    <div id="log-content" style="
                        flex: 1;
                        overflow-y: auto;
                        padding: 4px 0 16px 0;
                        color: #ddd;
                        font-size: 13px;
                        line-height: 1.5;
                    "></div>
                </div>
            </div>
        `;

        // DOM Element 생성 - 상단 바 위치 기준
        this.domElement = this.scene.add.dom(640, this.headerY).createFromHTML(html);
        this.domElement.setOrigin(0.5, 0);
        this.domElement.setDepth(2000);

        // DOM 요소 참조
        this.window = this.domElement.getChildByID('log-window');
        this.header = this.domElement.getChildByID('log-header');
        this.body = this.domElement.getChildByID('log-body');
        this.content = this.domElement.getChildByID('log-content');
        this.toggleBtn = this.domElement.getChildByID('log-toggle');

        // 키보드 이벤트 전파 방지
        this.window.addEventListener('keydown', (e) => e.stopPropagation());
        this.window.addEventListener('keyup', (e) => e.stopPropagation());
    }

    setupDragHandle() {
        this.header.addEventListener('mousedown', (e) => {
            if (e.target === this.toggleBtn) return;
            if (this.isMinimized) return;

            this.isDragging = true;
            this.dragStartY = e.clientY;
            this.dragStartTop = this.headerY;
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            // 스케일 보정을 위한 계산
            const gameContainer = document.getElementById('game-container');
            const canvas = gameContainer.querySelector('canvas');
            const scaleY = 720 / canvas.clientHeight;

            const deltaY = (e.clientY - this.dragStartY) * scaleY;
            let newTop = this.dragStartTop + deltaY;

            // 상단 바 위치 제한 (화면 내에서만)
            const minTop = 720 - this.maxHeight;
            const maxTop = 720 - this.minHeight;
            newTop = Math.max(minTop, Math.min(maxTop, newTop));

            // 새 높이 계산
            const newHeight = 720 - newTop;

            this.headerY = newTop;
            this.currentHeight = newHeight;

            // DOM 업데이트
            this.domElement.setY(this.headerY);
            this.window.style.height = `${newHeight}px`;
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
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

        // 포커스 방지
        this.toggleBtn.setAttribute('tabindex', '-1');
    }

    toggle() {
        this.isMinimized = !this.isMinimized;

        if (this.isMinimized) {
            // 최소화: 상단 바가 화면 하단으로 내려감 (서랍 닫힘)
            this.body.style.display = 'none';
            this.window.style.height = `${this.headerHeight}px`;
            this.headerY = 720 - this.headerHeight;
            this.domElement.setY(this.headerY);
            this.toggleBtn.textContent = '▲';
            this.header.style.cursor = 'pointer';
            this.header.style.borderRadius = '8px';
        } else {
            // 복구: 상단 바가 위로 올라감 (서랍 열림)
            this.body.style.display = 'flex';
            this.window.style.height = `${this.currentHeight}px`;
            this.headerY = 720 - this.currentHeight;
            this.domElement.setY(this.headerY);
            this.toggleBtn.textContent = '▼';
            this.header.style.cursor = 'ns-resize';
            this.header.style.borderRadius = '8px 8px 0 0';

            this.scrollToBottom();
        }
    }

    // 로그 배치 시작 (같은 타이밍의 로그들을 묶음)
    startBatch() {
        this.currentBatch = document.createElement('div');
        this.currentBatch.style.padding = '4px 12px';
        this.currentBatch.style.marginBottom = '2px';

        // 번갈아가며 배경색 적용
        if (this.batchIndex % 2 === 1) {
            this.currentBatch.style.background = 'rgba(255, 255, 255, 0.05)';
        }

        this.content.appendChild(this.currentBatch);
        this.batchIndex++;
    }

    // 로그 배치 종료
    endBatch() {
        this.currentBatch = null;
        this.scrollToBottom();
    }

    // 캐릭터 이름에 색상 적용
    formatCharacterName(name) {
        if (name.includes('아군')) {
            return `<span style="color: #5dadec; font-weight: bold;">${name}</span>`;
        } else if (name.includes('적군')) {
            return `<span style="color: #ec5d5d; font-weight: bold;">${name}</span>`;
        }
        return name;
    }

    // 메시지 내 캐릭터 이름 자동 포맷팅
    formatMessage(message) {
        // 아군1, 아군2, 아군3 등의 패턴 찾기
        message = message.replace(/(아군\d+)/g, '<span style="color: #5dadec; font-weight: bold;">$1</span>');
        // 적군1, 적군2, 적군3 등의 패턴 찾기
        message = message.replace(/(적군\d+)/g, '<span style="color: #ec5d5d; font-weight: bold;">$1</span>');
        return message;
    }

    addLog(message, type = 'info') {
        const colors = {
            info: '#aaa',
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
        logEntry.innerHTML = `<span style="color: #555;">[${timestamp}]</span> ${formattedMessage}`;

        // 현재 배치가 있으면 배치에 추가, 없으면 단독 로그
        if (this.currentBatch) {
            this.currentBatch.appendChild(logEntry);
        } else {
            // 단독 로그도 배치처럼 처리
            const singleBatch = document.createElement('div');
            singleBatch.style.padding = '4px 12px';
            singleBatch.style.marginBottom = '2px';

            if (this.batchIndex % 2 === 1) {
                singleBatch.style.background = 'rgba(255, 255, 255, 0.05)';
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
