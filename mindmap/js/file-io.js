import { DOM } from './config.js';
import { showModal } from './modal.js';
import { getExportState } from './renderer.js';
import { saveFile } from '../../assets/js/shared/file.js';

// 用於記錄 Wasm 引擎是否準備就緒
let isWasmReady = false;

// 提前在背景載入 Go 橋接器與編譯好的 buildhtml.wasm
const initWasm = async () => {
    try {
        // 1. 確保正確載入當前目錄下的 wasm_exec.js
        if (!window.Go) {
            const script = document.createElement('script');
            script.src = './js/wasm_exec.js'; 
            document.head.appendChild(script);
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => reject(new Error("找不到 wasm_exec.js 橋接檔"));
            });
        }
        
        const go = new window.Go();
        const response = await fetch('./js/buildhtml.wasm');
        
        if (!response.ok) throw new Error(`HTTP 錯誤: ${response.status}`);

        let result;
        // 2. 繞過 Jekyll 本地端 MIME 類型不正確的問題
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/wasm')) {
            result = await WebAssembly.instantiateStreaming(response, go.importObject);
        } else {
            console.warn("⚠️ 伺服器未回傳標準 Wasm MIME 類型，啟用 ArrayBuffer 降級載入模式");
            const buffer = await response.arrayBuffer();
            result = await WebAssembly.instantiate(buffer, go.importObject);
        }
        
        go.run(result.instance);
        isWasmReady = true;
        console.log("✅ 匯出 HTML 加速引擎 (Wasm) 載入完成");
    } catch (error) {
        console.error("❌ Wasm 載入失敗:", error);
    }
};

// 立即觸發載入
initWasm();

export const initFileIO = (cmEditor, debounceUpdateCallback) => {
    // 1. 下載 TXT 純文字檔
    DOM.btnDownloadMd.addEventListener('click', () => {
        const blob = new Blob([cmEditor.getValue()], { type: 'text/plain;charset=utf-8' });
        saveFile(blob, 'markmap-mindmap.txt', 'TXT 純文字檔', { 'text/plain': ['.txt'] });
    });

    // 2. 下載互動式 HTML (已改用 Go Wasm 加速字串處理)
    DOM.btnDownload.addEventListener('click', () => {
        if (!isWasmReady || typeof window.goBuildHtml !== 'function') {
            showModal('系統提示', 'HTML 匯出引擎尚未載入完成，請稍候再試。', { isAlert: true });
            return;
        }

        const state = getExportState();
        const currentExpand = DOM.selExpand ? DOM.selExpand.value : '-1';
        const currentColor = DOM.selColor ? DOM.selColor.value : '-1';
        const foldedPathsJson = JSON.stringify(state.foldedPaths || []);
        const initTransform = state.transform || { x: 0, y: 0, k: 1 };
        
        const rawMarkdown = cmEditor.getValue();
        const defaultFilename = 'markmap.html';

        // 透過 Builder 函式接收使用者確認的檔名，並呼叫 Wasm 高速組裝字串
        const buildHtml = (finalFilename, baseTitle) => {
            return window.goBuildHtml(
                rawMarkdown,
                finalFilename || '',
                baseTitle || '',
                currentExpand,
                currentColor,
                foldedPathsJson,
                String(initTransform.x || 0),
                String(initTransform.y || 0),
                String(initTransform.k || 1)
            );
        };

        saveFile(buildHtml, defaultFilename, 'HTML', { 'text/html': ['.html'] });
    });

    // 3. 匯入檔案 (僅供線上編輯器使用)
    DOM.btnImportFile.addEventListener('click', () => DOM.fileImport.click());
    DOM.fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (cmEditor.getValue().trim() !== '') {
                const confirmed = await showModal('匯入檔案', '將覆蓋當前編輯區內容，是否繼續？', { confirmText: '確定覆蓋' });
                if (!confirmed) { DOM.fileImport.value = ''; return; }
            }
            cmEditor.setValue(event.target.result);
            debounceUpdateCallback(event.target.result);
            DOM.fileImport.value = '';
        };
        reader.readAsText(file);
    });
};