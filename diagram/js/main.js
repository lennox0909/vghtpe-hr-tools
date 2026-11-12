import { DOM, STORAGE_KEY } from './config.js';
import { initTheme } from './theme.js';
import { initLayout } from './layout.js';
import { initFileIO } from './file-io.js';
import { renderContent, initWasm } from './renderer.js';

// 👇 引入 CodeMirror 6 模組
import { basicSetup, EditorView } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

let cmEditor;

async function loadDefaultContent() {
    try {
        const response = await fetch('sample.md');
        if (!response.ok) throw new Error('無法讀取 sample.md');
        return await response.text();
    } catch (err) {
        return `# 歡迎使用台北榮總人事室圖表編輯器\n\n這是一個支援 Markdown 與 Mermaid 圖表的即時編輯器，您可以直接在左側修改程式碼，右側會即時顯示結果。\n`;
    }
}

async function init() {
    initTheme(renderContent);
    initLayout();

    // 關鍵：等待 Wasm 載入完成，再進行後續的初始化與渲染
    await initWasm();

    // 1. 取得初始內容 (LocalStorage 優先，沒有則載入 sample.md)
    const saved = localStorage.getItem(STORAGE_KEY);
    const initialContent = (saved && saved.trim() !== '') ? saved : await loadDefaultContent();

    // 2. 防抖 (Debounce) 的儲存與算繪邏輯
    let timer;
    const debounceUpdate = (text) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            renderContent();
            localStorage.setItem(STORAGE_KEY, text);
            DOM.saveStatus.style.opacity = '1';
            setTimeout(() => DOM.saveStatus.style.opacity = '0', 1500);
        }, 400);
    };

    // 3. 監聽 CM6 內容變更事件
    const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            debounceUpdate(update.state.doc.toString());
        }
    });

    // 4. 初始化 CodeMirror 6 編輯器
    cmEditor = new EditorView({
        doc: initialContent,
        extensions: [
            basicSetup,
            markdown({ codeLanguages: languages }), // 支援 Mermaid/LaTeX 高亮
            updateListener,
            EditorView.lineWrapping
        ],
        parent: DOM.editorContainer
    });

    // 💡 關鍵代理技巧：
    // 讓其他模組 (如 file-io.js / renderer.js) 以為舊的 textarea 還在，
    // 對 DOM.editor.value 的讀寫會自動轉發給 CodeMirror 6。
    DOM.editor = {
        get value() { 
            return cmEditor.state.doc.toString(); 
        },
        set value(text) { 
            cmEditor.dispatch({ changes: { from: 0, to: cmEditor.state.doc.length, insert: text } }); 
        },
        focus: () => cmEditor.focus()
    };

    // 5. 將依賴 DOM.editor 的模組在此刻初始化
    initFileIO(renderContent);
    renderContent();

    // 6. 綁定清空按鈕 (相容於更新前與更新後的 ID)
    const clearBtn = DOM.btnClearEditor || DOM.clearBtn;
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (DOM.editor.value === '') return;
            if (confirm('確定要清空編輯器嗎？')) {
                DOM.editor.value = '';
                localStorage.removeItem(STORAGE_KEY);
                renderContent();
                DOM.editor.focus();
            }
        });
    }

    // 確保視窗縮放或拖曳側邊欄時，編輯器高度與捲軸能正常適應
    const editorObserver = new ResizeObserver(() => cmEditor.requestMeasure());
    if (DOM.editorPane) editorObserver.observe(DOM.editorPane);
}

if(window.marked) {
    init();
} else {
    window.addEventListener('load', init);
}