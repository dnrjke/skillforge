export default class LogWindow {
    constructor(scene) {
        this.scene = scene;
        this.isMinimized = false;
        this.currentHeight = 200;
        this.minHeight = 100;
        this.maxHeight = 400;
        this.headerHeight = 30;
        this.windowWidth = 800; // 고정 폭
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartHeight = 0;

        this.createDOM();
        this.setupDragHandle();
        this.setupToggleButton();
    }

    createDOM() {
        // 컨테이너 HTML 생성 - 고정 폭, 하단 고정
        const html = `
            <div id="log-container" style="
                width: ${this.windowWidth}px;
                height: ${this.currentHeight}px;
                background: rgba(0, 0, 0, 0.85);
                border: 2px solid #444;
                border-radius: 8px 8px 0 0;
                display: flex;
                flex-direction: column;
                font-family: 'Courier New', monospace;
                box-sizing: border-box;
                overflow: hidden;
            ">
                <div id="log-header" style="
                    height: ${this.headerHeight}px;
                    min-height: ${this.headerHeight}px;
                    background: linear-gradient(to bottom, #4a4a4a, #3a3a3a);
                    border-bottom: 1px solid #555;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 12px;
                    cursor: ns-resize;
                    user-select: none;
                    flex-shrink: 0;
                ">
                    <span style="color: #ccc; font-size: 13px; font-weight: bold;">📜 Battle Log</span>
                    <button id="log-toggle" style="
                        width: 26px;
                        height: 26px;
                        background: #666;
                        border: 1px solid #888;
                        border-radius: 4px;
                        color: #fff;
                        font-size: 18px;
                        font-weight: bold;
                        cursor: pointer;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        line-height: 1;
                    ">−</button>
                </div>
                <div id="log-content" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px 12px 15px 12px;
                    color: #ddd;
                    font-size: 13px;
                    line-height: 1.6;
                "></div>
            </div>
        `;

        // Phaser DOM Element 생성 - 화면 하단 중앙
        this.domElement = this.scene.add.dom(640, 720).createFromHTML(html);
        this.domElement.setOrigin(0.5, 1);
        this.domElement.setDepth(2000);

        // DOM 요소 참조 저장
        this.container = this.domElement.getChildByID('log-container');
        this.header = this.domElement.getChildByID('log-header');
        this.content = this.domElement.getChildByID('log-content');
        this.toggleBtn = this.domElement.getChildByID('log-toggle');

        // 키보드 이벤트 전파 방지
        this.container.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
    }

    setupDragHandle() {
        this.header.addEventListener('mousedown', (e) => {
            if (e.target === this.toggleBtn) return;
            if (this.isMinimized) return;

            this.isDragging = true;
            this.dragStartY = e.clientY;
            this.dragStartHeight = this.currentHeight;
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            // 마우스를 위로 올리면(clientY 감소) 창이 커짐
            const deltaY = this.dragStartY - e.clientY;
            let newHeight = this.dragStartHeight + deltaY;

            // 높이 제한 적용
            newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, newHeight));

            this.currentHeight = newHeight;
            this.container.style.height = `${newHeight}px`;
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

        // 버튼에 포커스 방지 (스페이스바 문제 해결)
        this.toggleBtn.addEventListener('focus', () => {
            this.toggleBtn.blur();
        });

        this.toggleBtn.addEventListener('keydown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    }

    toggle() {
        this.isMinimized = !this.isMinimized;

        if (this.isMinimized) {
            // 최소화: 헤더만 보이게
            this.content.style.display = 'none';
            this.container.style.height = `${this.headerHeight}px`;
            this.toggleBtn.textContent = '+';
            this.header.style.cursor = 'pointer';
        } else {
            // 복구: 전체 창 보이게
            this.content.style.display = 'block';
            this.container.style.height = `${this.currentHeight}px`;
            this.toggleBtn.textContent = '−';
            this.header.style.cursor = 'ns-resize';

            // 스크롤을 최신 로그로
            this.scrollToBottom();
        }
    }

    addLog(message, type = 'info') {
        const colors = {
            info: '#ddd',
            damage: '#ff6b6b',
            heal: '#6bff6b',
            system: '#6bb5ff',
            skill: '#ffb86b'
        };

        const timestamp = this.getTimestamp();
        const logEntry = document.createElement('div');
        logEntry.style.color = colors[type] || colors.info;
        logEntry.style.marginBottom = '6px';
        logEntry.style.paddingBottom = '2px';
        logEntry.innerHTML = `<span style="color: #666;">[${timestamp}]</span> ${message}`;

        this.content.appendChild(logEntry);

        // 자동 스크롤
        this.scrollToBottom();
    }

    scrollToBottom() {
        // 약간의 지연 후 스크롤 (DOM 업데이트 대기)
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
    }
}
