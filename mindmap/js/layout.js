import { DOM } from './config.js';
// 引入全域共用的拖曳邏輯
import { initResizer } from '../../assets/js/shared/resizer.js';

export function initLayout(cmEditor, fitMindmapCallback) {
    let isEditorVisible = true;
    let editorFontSize = window.innerWidth >= 768 ? 16 : 14;

    // 1. 呼叫共用拖曳邏輯，並傳入 resize 結束後需重新適應心智圖視角的 callback
    initResizer(DOM.resizer, DOM.editorPane, DOM.mainContainer, fitMindmapCallback);

    // 2. 保留專屬的編輯器字體縮放邏輯
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

    // 3. 保留專屬的編輯區收合邏輯，整合 Tailwind 樣式切換
    DOM.btnToggleEditor.addEventListener('click', () => {
        isEditorVisible = !isEditorVisible;
        DOM.editorPane.style.display = isEditorVisible ? '' : 'none';
        DOM.resizer.style.display = isEditorVisible ? '' : 'none';
        
        DOM.btnToggleEditor.className = isEditorVisible 
            ? 'bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-lg transition-all duration-300 flex items-center justify-center border border-white/20'
            : 'bg-white/30 hover:bg-white/40 text-white p-1.5 rounded-lg transition-all duration-300 flex items-center justify-center border border-white/40';
            
        if (isEditorVisible) setTimeout(fitMindmapCallback, 50);
    });

    // 4. 視窗大小改變時，重新適應心智圖視角
    window.addEventListener('resize', () => setTimeout(fitMindmapCallback, 200));
}