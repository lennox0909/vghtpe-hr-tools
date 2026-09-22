import { DOM } from './config.js';

export function initLayout(cmEditor, fitMindmapCallback) {
    let isEditorVisible = true;
    let isResizing = false;
    let editorFontSize = window.innerWidth >= 768 ? 16 : 14;

    // 編輯器字體縮放
    const updateEditorFontSize = () => {
        const wrapper = cmEditor.getWrapperElement();
        wrapper.style.fontSize = `${editorFontSize}px`;
        cmEditor.refresh();
    };

    DOM.btnTextZoomIn.addEventListener('click', () => {
        editorFontSize = Math.min(36, editorFontSize + 2);
        updateEditorFontSize();
    });

    DOM.btnTextZoomOut.addEventListener('click', () => {
        editorFontSize = Math.max(10, editorFontSize - 2);
        updateEditorFontSize();
    });

    // 編輯區收合
    DOM.btnToggleEditor.addEventListener('click', () => {
        isEditorVisible = !isEditorVisible;
        DOM.editorPane.style.display = isEditorVisible ? '' : 'none';
        DOM.resizer.style.display = isEditorVisible ? '' : 'none';
        DOM.btnToggleEditor.className = isEditorVisible 
            ? 'bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-lg transition-all duration-300 flex items-center justify-center border border-white/20'
            : 'bg-white/30 hover:bg-white/40 text-white p-1.5 rounded-lg transition-all duration-300 flex items-center justify-center border border-white/40';
        if (isEditorVisible) setTimeout(fitMindmapCallback, 50);
    });

    // 面板拖曳大小
    const resizePanel = (e) => {
        if (!isResizing) return;
        if (e.type === 'touchmove') e.preventDefault();
        const isDesktop = window.innerWidth >= 768;
        const containerRect = DOM.mainContainer.getBoundingClientRect();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        if (isDesktop) {
            let newWidth = ((clientX - containerRect.left) / containerRect.width) * 100;
            DOM.editorPane.style.width = `${Math.max(10, Math.min(newWidth, 90))}%`;
            DOM.editorPane.style.height = '100%';
        } else {
            let newHeight = ((clientY - containerRect.top) / containerRect.height) * 100;
            DOM.editorPane.style.height = `${Math.max(10, Math.min(newHeight, 90))}%`;
            DOM.editorPane.style.width = '100%';
        }
    };

    const stopResize = () => {
        isResizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', resizePanel);
        document.removeEventListener('touchmove', resizePanel);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchend', stopResize);
        setTimeout(fitMindmapCallback, 50);
    };

    const startResize = () => {
        isResizing = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = window.innerWidth >= 768 ? 'col-resize' : 'row-resize';
        document.addEventListener('mousemove', resizePanel);
        document.addEventListener('touchmove', resizePanel, { passive: false });
        document.addEventListener('mouseup', stopResize);
        document.addEventListener('touchend', stopResize);
    };

    DOM.resizer.addEventListener('mousedown', startResize);
    DOM.resizer.addEventListener('touchstart', startResize, { passive: false });

    window.addEventListener('resize', () => setTimeout(fitMindmapCallback, 200));
}