import { DOM, STORAGE_KEY } from './config.js';
import { initLayout } from './layout.js';
import { updateMindmap, fitMindmap, zoomMindmap } from './renderer.js';
import { initFileIO } from './file-io.js';
import { showModal } from './modal.js';

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
            DOM.saveStatus?.classList.remove('opacity-0');
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

// 👇 新增的「插入摺疊註記」按鈕 (獨立寫在下方)
if (DOM.btnInsertFold) {
    DOM.btnInsertFold.addEventListener('click', () => {
        cmEditor.replaceSelection('<!-- markmap: fold -->\n');
        cmEditor.focus();
    });
}

// 減少層級 (Outdent)
if (DOM.btnIndentLess) {
    DOM.btnIndentLess.addEventListener('click', () => {
        cmEditor.execCommand('indentLess'); // 呼叫 CodeMirror 內建減少縮排指令
        cmEditor.focus();
    });
}

// 增加層級 (Indent)
if (DOM.btnIndentMore) {
    DOM.btnIndentMore.addEventListener('click', () => {
        cmEditor.execCommand('indentMore'); // 呼叫 CodeMirror 內建增加縮排指令
        cmEditor.focus();
    });
}


DOM.selExpand.addEventListener('change', () => debounceUpdate(cmEditor.getValue()));
DOM.selColor.addEventListener('change', () => debounceUpdate(cmEditor.getValue()));
DOM.btnFit.addEventListener('click', fitMindmap);
DOM.btnZoomIn.addEventListener('click', () => zoomMindmap(1.2));
DOM.btnZoomOut.addEventListener('click', () => zoomMindmap(0.8));

// 【核心修復】：透過 ResizeObserver 監聽編輯器外層容器的大小變化
// 確保拖曳分隔線或縮放視窗時，CodeMirror 游標與渲染座標即時重置
const editorObserver = new ResizeObserver(() => {
    if (cmEditor && typeof cmEditor.refresh === 'function') {
        cmEditor.refresh();
    }
});

if (DOM.editorPane) {
    editorObserver.observe(DOM.editorPane);
}

// 啟動佈局與檔案 IO 事件
initLayout(cmEditor, fitMindmap);
initFileIO(cmEditor, debounceUpdate);

// 非同步載入初始內容：優先讀取 LocalStorage，否則抓取 sample.txt
async function initEditor() {
    const savedContent = localStorage.getItem(STORAGE_KEY);
    if (savedContent) {
        cmEditor.setValue(savedContent);
        debounceUpdate(savedContent, true);
    } else {
        try {
            // 優先使用由 Jekyll 解析的絕對路徑，若無則降級使用相對路徑
            const targetUrl = window.MARKMAP_SAMPLE_URL || 'sample.txt';
            const response = await fetch(targetUrl);
            
            if (!response.ok) throw new Error(`無法載入 ${targetUrl}`);
            
            const defaultContent = await response.text();
            cmEditor.setValue(defaultContent);
            debounceUpdate(defaultContent, true);
        } catch (error) {
            console.warn(error);
            const fallbackContent = `# 歡迎使用心智圖編輯器\n- **即時預覽**：左側編輯，右側立即顯示結果`;
            cmEditor.setValue(fallbackContent);
            debounceUpdate(fallbackContent, true);
        }
    }
}

initEditor();