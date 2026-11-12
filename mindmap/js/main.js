import { DOM, STORAGE_KEY } from './config.js';
import { initLayout } from './layout.js';
import { updateMindmap, fitMindmap, zoomMindmap } from './renderer.js';
import { initFileIO } from './file-io.js';
import { showModal } from './modal.js';

// ==========================================
// CodeMirror 6 模組引入 (透過 Import Map)
// ==========================================
import { basicSetup, EditorView } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { openSearchPanel } from "@codemirror/search";

// ==========================================
// 1. 自動儲存與算繪 (Debounce) 邏輯
// ==========================================
let timeout;
let saveTimeout;
const debounceUpdate = (text, isInitialLoad = false) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        updateMindmap(text, isInitialLoad);
        if (!isInitialLoad) {
            localStorage.setItem(STORAGE_KEY, text);
            DOM.saveStatus?.classList.remove('opacity-0');
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => DOM.saveStatus?.classList.add('opacity-0'), 2000);
        }
    }, isInitialLoad ? 0 : 300);
};

// 監聽 CM6 的文件內容變更
const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
        debounceUpdate(update.state.doc.toString());
    }
});

// ==========================================
// 2. 初始化 CodeMirror 6 編輯器
// ==========================================
const cmEditor = new EditorView({
    extensions: [
        basicSetup, // 內建：行號、程式碼摺疊、游標行高亮、括號匹配、Ctrl+F搜尋面板
        markdown({ codeLanguages: languages }), // 內建：Markdown 解析與子語言(JS/CSS)高亮
        updateListener, // 綁定自動儲存
        EditorView.lineWrapping // 自動換行
    ],
    parent: DOM.editorContainer
});

// 為了不破壞舊有架構，將 CM6 的 API 封裝成跟 CM5 一樣的名稱
cmEditor.getValue = () => cmEditor.state.doc.toString();
cmEditor.setValue = (text) => {
    cmEditor.dispatch({ changes: { from: 0, to: cmEditor.state.doc.length, insert: text } });
};
cmEditor.replaceSelection = (text) => {
    const range = cmEditor.state.selection.main;
    cmEditor.dispatch({
        changes: { from: range.from, to: range.to, insert: text },
        selection: { anchor: range.from + text.length }
    });
    cmEditor.focus();
};

// 監聽編輯器外層容器的大小變化 (修復拖曳分割線時排版跑位)
const editorObserver = new ResizeObserver(() => {
    cmEditor.requestMeasure();
});
if (DOM.editorPane) {
    editorObserver.observe(DOM.editorPane);
}


// ==========================================
// 3. UI 按鈕與快捷鍵綁定
// ==========================================

// 清除編輯器內容
DOM.btnClearEditor?.addEventListener('click', async () => {
    if (await showModal('清除內容', '確定要清除編輯區內容嗎？', { confirmText: '確定', confirmColor: 'bg-red-500' })) {
        cmEditor.setValue(''); 
        debounceUpdate(''); 
        cmEditor.focus();
    }
});

// 插入摺疊註記
DOM.btnInsertFold?.addEventListener('click', () => {
    cmEditor.replaceSelection('<!-- markmap: fold -->\n');
});

// 開啟 CM6 內建的尋找/取代面板
DOM.btnSearchToggle?.addEventListener('click', () => {
    openSearchPanel(cmEditor);
});

// 簡單的縮排按鈕邏輯 (在游標處插入或刪除雙空格)
DOM.btnIndentMore?.addEventListener('click', () => {
    cmEditor.replaceSelection('  ');
});
DOM.btnIndentLess?.addEventListener('click', () => {
    // 若要完美支援 Outdent，建議未來可在 import map 加入 @codemirror/commands 並使用 indentLess
    const range = cmEditor.state.selection.main;
    const line = cmEditor.state.doc.lineAt(range.from);
    if (line.text.startsWith('  ')) {
        cmEditor.dispatch({ changes: { from: line.from, to: line.from + 2, insert: '' } });
    }
    cmEditor.focus();
});


// ==========================================
// 4. 綁定心智圖介面更新與外部模組
// ==========================================
DOM.selExpand?.addEventListener('change', () => debounceUpdate(cmEditor.getValue()));
DOM.selColor?.addEventListener('change', () => debounceUpdate(cmEditor.getValue()));
DOM.btnFit?.addEventListener('click', fitMindmap);
DOM.btnZoomIn?.addEventListener('click', () => zoomMindmap(1.2));
DOM.btnZoomOut?.addEventListener('click', () => zoomMindmap(0.8));

// 啟動佈局 (拖曳分割線) 與檔案 IO (匯入/匯出)
initLayout(cmEditor, fitMindmap);
initFileIO(cmEditor, debounceUpdate);


// ==========================================
// 5. 初始內容載入 (URL參數 -> LocalStorage -> sample.txt)
// ==========================================
async function initEditor() {
    const urlParams = new URLSearchParams(window.location.search);
    const externalUrl = urlParams.get('url') || urlParams.get('source');

    // 優先 1：載入網址帶入的外部檔案 (例如 GitHub Raw 連結)
    if (externalUrl) {
        try {
            const response = await fetch(externalUrl);
            if (response.ok) {
                const text = await response.text();
                cmEditor.setValue(text); 
                debounceUpdate(text, true);
                return;
            }
        } catch (e) { 
            console.warn('載入外部 URL 失敗，退回本地預設流程:', e); 
        }
    }

    // 優先 2：載入本機 LocalStorage 暫存
    const savedContent = localStorage.getItem(STORAGE_KEY);
    if (savedContent) {
        cmEditor.setValue(savedContent); 
        debounceUpdate(savedContent, true);
    } else {
        // 優先 3：載入預設的 sample.txt
        try {
            const response = await fetch(window.MARKMAP_SAMPLE_URL || './sample.txt');
            const text = response.ok ? await response.text() : `# 歡迎使用心智圖編輯器`;
            cmEditor.setValue(text); 
            debounceUpdate(text, true);
        } catch (e) {
            const fallback = `# 歡迎使用心智圖編輯器\n- **即時預覽**：左側編輯，右側立即顯示結果`;
            cmEditor.setValue(fallback); 
            debounceUpdate(fallback, true);
        }
    }
}

// 啟動編輯器
initEditor();