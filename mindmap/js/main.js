import { DOM, STORAGE_KEY } from './config.js';
import { initLayout } from './layout.js';
import { updateMindmap, fitMindmap, zoomMindmap } from './renderer.js';
import { initFileIO } from './file-io.js';
import { showModal } from './modal.js';

const defaultContent = `# 歡迎使用心智圖編輯器\n- **即時預覽**：左側編輯，右側立即顯示結果\n- **快速縮放**：按下 \`ctrl\` + 滑鼠滾輪`;

const cmEditor = CodeMirror.fromTextArea(DOM.editor, {
    lineNumbers: true, mode: 'markdown', lineWrapping: true, tabSize: 2,
    extraKeys: { "Tab": (cm) => cm.somethingSelected() ? cm.indentSelection("add") : cm.replaceSelection("  ", "end", "+input") }
});

let timeout;
let saveTimeout;
const debounceUpdate = (markdown, isInitialLoad = false) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        updateMindmap(markdown, isInitialLoad);
        if (!isInitialLoad) {
            localStorage.setItem(STORAGE_KEY, markdown);
            DOM.saveStatus.classList.remove('opacity-0');
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => DOM.saveStatus.classList.add('opacity-0'), 2000);
        }
    }, isInitialLoad ? 0 : 300);
};

cmEditor.on('change', () => debounceUpdate(cmEditor.getValue()));

DOM.btnClearEditor.addEventListener('click', async () => {
    if (await showModal('清除內容', '確定要清除編輯區內容嗎？', { confirmText: '確定', confirmColor: 'bg-red-500' })) {
        cmEditor.setValue(''); debounceUpdate(''); cmEditor.focus();
    }
});

DOM.selExpand.addEventListener('change', () => debounceUpdate(cmEditor.getValue()));
DOM.selColor.addEventListener('change', () => debounceUpdate(cmEditor.getValue()));
DOM.btnFit.addEventListener('click', fitMindmap);
DOM.btnZoomIn.addEventListener('click', () => zoomMindmap(1.2));
DOM.btnZoomOut.addEventListener('click', () => zoomMindmap(0.8));

// 啟動
initLayout(cmEditor, fitMindmap);
initFileIO(cmEditor, debounceUpdate);

const savedContent = localStorage.getItem(STORAGE_KEY);
cmEditor.setValue(savedContent || defaultContent);
debounceUpdate(savedContent || defaultContent, true);