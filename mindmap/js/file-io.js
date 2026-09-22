import { DOM } from './config.js';
import { showModal } from './modal.js';
import { getExportState } from './renderer.js';

const saveFile = async (blob, suggestedName, description, acceptTypes) => {
    const fallbackDownload = () => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    try {
        if ('showSaveFilePicker' in window) {
            const handle = await window.showSaveFilePicker({ suggestedName, types: [{ description, accept: acceptTypes }] });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } else { fallbackDownload(); }
    } catch (err) {
        if (err.name !== 'AbortError') fallbackDownload();
    }
};

export const initFileIO = (cmEditor, debounceUpdateCallback) => {
    DOM.btnDownloadMd.addEventListener('click', () => {
        const blob = new Blob([cmEditor.getValue()], { type: 'text/markdown;charset=utf-8' });
        saveFile(blob, 'markmap-mindmap.md', 'Markdown 檔案', { 'text/markdown': ['.md'] });
    });

    DOM.btnDownloadSvg.addEventListener('click', () => {
        const clone = DOM.svgEl.cloneNode(true);
        const style = document.createElement('style');
        style.textContent = `.markmap-link{fill:none}.markmap-node circle{cursor:pointer}foreignObject{overflow:visible}svg{background-color:#fff;font-family:sans-serif}`;
        clone.insertBefore(style, clone.firstChild);
        if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
        saveFile(blob, 'markmap-mindmap.svg', 'SVG 圖片', { 'image/svg+xml': ['.svg'] });
    });

    DOM.btnDownload.addEventListener('click', () => {
        const state = getExportState();
        const endTag = '<' + '/script>';
        const mdContent = cmEditor.getValue().replace(new RegExp(endTag, 'gi'), '&lt;/script&gt;').replace(/\xA0/g, ' ');
        const html = `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><title>Markmap 匯出</title><script src="https://cdn.tailwindcss.com">${endTag}<script src="https://cdn.jsdelivr.net/npm/d3@7">${endTag}<style>body{margin:0;overflow:hidden;background:#f8fafc}svg{width:100vw;height:100vh}.markmap-link{fill:none}</style></head><body><svg id="mindmap"></svg><script type="text/template" id="md-content">${mdContent}${endTag}<script type="module">
        import * as markmapLib from "https://cdn.jsdelivr.net/npm/markmap-lib@0.18.9/+esm";
        import * as markmapView from "https://cdn.jsdelivr.net/npm/markmap-view@0.18.9/+esm";
        const { Transformer, Markmap } = { ...markmapLib, ...markmapView };
        const { root } = new Transformer().transform(document.getElementById("md-content").textContent);
        const options = { color: () => "#00508C" }; // 簡化展示
        const mm = Markmap.create(document.getElementById("mindmap"), options, root);
        d3.select(document.getElementById("mindmap")).call(mm.zoom.transform, d3.zoomIdentity.translate(${state.transform.x}, ${state.transform.y}).scale(${state.transform.k}));
        ${endTag}</body></html>`;
        saveFile(new Blob([html], { type: 'text/html;charset=utf-8' }), 'markmap.html', 'HTML', { 'text/html': ['.html'] });
    });

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