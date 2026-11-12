import { DOM, STORAGE_KEY } from './config.js';
import { showToast, triggerDownload, requestModalInput } from './utils.js';

export function initFileIO(renderCallback) {
    // 檔案匯入邏輯
    DOM.importBtn.addEventListener('click', () => DOM.importInput.click());
    DOM.importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            DOM.editor.value = event.target.result;
            renderCallback();
            localStorage.setItem(STORAGE_KEY, DOM.editor.value);
            showToast(`已匯入檔案：${file.name}`);
            DOM.importInput.value = '';
        };
        reader.readAsText(file);
    });

    // 文字檔案匯出邏輯
    DOM.exportMdBtn.addEventListener('click', () => handleFileExport('md'));
    DOM.exportTxtBtn.addEventListener('click', () => handleFileExport('txt'));
}

async function handleFileExport(extension) {
    const content = DOM.editor.value;
    
    // File System Access API 嚴格規定：MIME Type 不可包含 ;charset=utf-8 等參數
    const pickerMimeType = extension === 'md' ? 'text/markdown' : 'text/plain';
    
    // 傳統 Blob 備用下載機制才需要帶上 charset
    const fallbackMimeType = extension === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
    
    const suggestedName = `vghtpe-document.${extension}`;
    
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{ 
                    description: extension === 'md' ? 'Markdown 檔案' : '文字檔案', 
                    accept: { [pickerMimeType]: [`.${extension}`] } 
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(content); // 字串預設即會以 UTF-8 寫入
            await writable.close();
            showToast(`已成功儲存為 ${handle.name}`);
            return;
        } catch (err) {
            // 如果使用者只是按了「取消」，不需顯示錯誤
            if (err.name === 'AbortError') return;
            console.warn('選擇路徑視窗發生錯誤，降級為預設下載:', err);
        }
    }
    
    // 降級備用模式 (當環境不支援，或出現異常時)
    const filename = await requestModalInput('vghtpe-document', extension, '匯出文件', '目前環境限制直接選擇資料夾，請輸入檔名進行快速下載：');
    if (filename) {
        triggerDownload(content, `${filename}.${extension}`, fallbackMimeType);
        showToast(`已匯出為 ${filename}.${extension}`);
    }
}