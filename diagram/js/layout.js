import { DOM } from './config.js';

let isResizing = false;
let isEditorVisible = true;

export function initLayout() {
    // 綁定調整版面大小邏輯
    const startResize = () => {
        isResizing = true;
        document.body.classList.add('cursor-col-resize');
    };

    const doResize = (e) => {
        if (!isResizing) return;
        const containerRect = DOM.mainContainer.getBoundingClientRect();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        let newWidthPercent = ((clientX - containerRect.left) / containerRect.width) * 100;
        if (newWidthPercent > 15 && newWidthPercent < 85) {
            DOM.editorPane.style.width = `${newWidthPercent}%`;
        }
    };

    const stopResize = () => {
        isResizing = false;
        document.body.classList.remove('cursor-col-resize');
    };

    DOM.resizer.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
    DOM.resizer.addEventListener('touchstart', startResize, { passive: true });
    document.addEventListener('touchmove', doResize, { passive: true });
    document.addEventListener('touchend', stopResize);

    // 綁定編輯器顯示開關
    DOM.editorToggleBtn.addEventListener('click', () => {
        isEditorVisible = !isEditorVisible;
        if (isEditorVisible) {
            DOM.editorPane.style.display = ''; 
            DOM.resizer.style.display = ''; 
            DOM.sidebarOpenIcon.classList.remove('hidden');
            DOM.sidebarClosedIcon.classList.add('hidden');
        } else {
            DOM.editorPane.style.display = 'none'; 
            DOM.resizer.style.display = 'none'; 
            DOM.sidebarOpenIcon.classList.add('hidden');
            DOM.sidebarClosedIcon.classList.remove('hidden');
        }
    });
}