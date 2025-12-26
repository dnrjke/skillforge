export default class LogWindow {
    constructor(scene) {
        this.scene = scene;
        this.isMinimized = false;
        this.currentHeight = 200;
        this.minHeight = 100;
        this.maxHeight = 400;
        this.headerHeight = 30;
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartHeight = 0;

        this.createDOM();
        this.setupDragHandle();
        this.setupToggleButton();
    }

    createDOM() {
        // 컨테이너 HTML 생성
        const html = `
            <div id="log-container" style="
                width: 100%;
                height: ${this.currentHeight}px;
                background: rgba(0, 0, 0, 0.85);
                border-top: 2px solid #444;
                display: flex;
                flex-direction: column;
                font-family: 'Courier New', monospace;
                box-sizing: border-box;
            ">
                <div id="log-header" style="
                    height: ${this.headerHeight}px;
                    min-height: ${this.headerHeight}px;
                    background: linear-gradient(to bottom, #3a3a3a, #2a2a2a);
                    border-bottom: 1px solid #555;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 10px;
                    cursor: ns-resize;
                    user-select: none;
                ">
                    <span style="color: #aaa; font-size: 12px;">Battle Log</span>
                    <button id="log-toggle" style="
                        width: 24px;
                        height: 24px;
                        background: #555;
                        border: 1px solid #777;
                        border-radius: 4px;
                        color: #fff;
                        font-size: 16px;
                        cursor: pointer;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    ">−</button>
                </div>
                <div id="log-content" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                    color: #ddd;
                    font-size: 13px;
                    line-height: 1.6;
                "></div>
            </div>
        `;

        // Phaser DOM Element 생성
        this.domElement = this.scene.add.dom(640, 720).createFromHTML(html);
        this.domElement.setOrigin(0.5, 1);

        // DOM 요소 참조 저장
        this.container = this.domElement.getChildByID('log-container');
        this.header = this.domElement.getChildByID('log-header');
        this.content = this.domElement.getChildByID('log-content');
        this.toggleBtn = this.domElement.getChildByID('log-toggle');
    }

    setupDragHandle() {
        this.header.addEventListener('mousedown', (e) => {
            if (e.target === this.toggleBtn) return;
            if (this.isMinimized) return;

            this.isDragging = true;
            this.dragStartY = e.clientY;
            this.dragStartHeight = this.currentHeight;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

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
        this.toggleBtn.addEventListener('click', () => {
            this.toggle();
        });
    }

    toggle() {
        this.isMinimized = !this.isMinimized;

        if (this.isMinimized) {
            this.content.style.display = 'none';
            this.container.style.height = `${this.headerHeight}px`;
            this.toggleBtn.textContent = '+';
            this.header.style.cursor = 'pointer';
        } else {
            this.content.style.display = 'block';
            this.container.style.height = `${this.currentHeight}px`;
            this.toggleBtn.textContent = '−';
            this.header.style.cursor = 'ns-resize';
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
        logEntry.style.marginBottom = '4px';
        logEntry.innerHTML = `<span style="color: #666;">[${timestamp}]</span> ${message}`;

        this.content.appendChild(logEntry);

        // 자동 스크롤
        this.content.scrollTop = this.content.scrollHeight;
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
