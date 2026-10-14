import { DOM, STORAGE_KEY } from './config.js';
import { initTheme } from './theme.js';
import { initLayout } from './layout.js';
import { initFileIO } from './file-io.js';
import { renderContent, initWasm } from './renderer.js';

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
    initFileIO(renderContent);

    // 關鍵：等待 Wasm 載入完成，再進行後續的初始化與渲染
    await initWasm();

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim() !== '') {
        DOM.editor.value = saved;
    } else {
        DOM.editor.value = await loadDefaultContent();
    }
    
    renderContent();

    let timer;
    DOM.editor.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            renderContent();
            localStorage.setItem(STORAGE_KEY, DOM.editor.value);
            DOM.saveStatus.style.opacity = '1';
            setTimeout(() => DOM.saveStatus.style.opacity = '0', 1500);
        }, 400);
    });

    DOM.clearBtn.addEventListener('click', () => {
        if(DOM.editor.value === '') return;
        if(confirm('確定要清空編輯器嗎？')){
            DOM.editor.value = '';
            localStorage.removeItem(STORAGE_KEY);
            renderContent();
            DOM.editor.focus();
        }
    });
}

if(window.marked) {
    init();
} else {
    window.addEventListener('load', init);
}