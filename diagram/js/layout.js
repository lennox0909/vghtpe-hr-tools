import { DOM } from './config.js';
// 引入全域共用的拖曳邏輯
import { initResizer } from '../../assets/js/shared/resizer.js';

let isEditorVisible = true;

export function initLayout() {
    // 1. 呼叫共用拖曳邏輯，替換原本冗長的 mousedown/mousemove 事件
    initResizer(DOM.resizer, DOM.editorPane, DOM.mainContainer);

    // 2. 保留專屬的編輯器顯示開關邏輯[cite: 7]
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