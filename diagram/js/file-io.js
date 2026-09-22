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
    const mimeType = extension === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
    const suggestedName = `vghtpe-document.${extension}`;
    
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{ description: extension === 'md' ? 'Markdown 檔案' : '文字檔案', accept: { [mimeType]: [`.${extension}`] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            showToast(`已成功儲存為 ${handle.name}`);
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }
    
    const filename = await requestModalInput('vghtpe-document', extension, '匯出文件', '目前環境限制直接選擇資料夾，請輸入檔名進行快速下載：');
    if (filename) {
        triggerDownload(content, `${filename}.${extension}`, mimeType);
        showToast(`已匯出為 ${filename}.${extension}`);
    }
}