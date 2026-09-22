import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
import { DOM } from './config.js';
import { handleSvgDownload, handlePngDownload } from './image-export.js';

export async function renderContent() {
    const rawText = DOM.editor.value || '';
    
    // 預先過濾導致崩潰的不見字元
    // 將不中斷空白轉換為普通空白，將特殊的行/段落分隔符強制轉為 Mermaid 換行標籤
    const sanitizedText = rawText
        .replace(/\u00A0/g, ' ')
        .replace(/[\u2028\u2029]/g, '<br/>');
    
    if (window.marked) {
       DOM.preview.innerHTML = marked.parse(sanitizedText);
    } else {
        DOM.preview.innerHTML = "<p class='text-red-500'>Marked.js 尚未載入完成。</p>";
        return;
    }

    const codeBlocks = DOM.preview.querySelectorAll('code.language-mermaid');
    const renderPromises = Array.from(codeBlocks).map(async (block, index) => {
        const pre = block.parentElement;
        const container = document.createElement('div');
        container.className = 'mermaid-wrapper group relative my-8 p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all hover:shadow-md flex flex-col items-center';
        
        const mDiv = document.createElement('div');
        mDiv.className = 'mermaid w-full overflow-auto text-center';
        const id = `mermaid-chart-${Date.now()}-${index}`;
        mDiv.id = id;
        
        let sourceText = block.textContent;
        // 強制將 不中斷空白(\u00A0)、全形空白(\u3000)、零寬字元(\u200B) 全部替換成標準半形空白
        sourceText = sourceText.replace(/[\u00A0\u3000\u200B]/g, ' ');
        
        try {
            // 單獨渲染以捕捉錯誤
            const { svg } = await mermaid.render(id, sourceText);
            mDiv.innerHTML = svg;
        } catch (err) {
            mDiv.innerHTML = `<div class="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-mono text-left overflow-auto break-all border border-red-200 dark:border-red-800">
                <strong class="block mb-1 text-sm">圖表語法解析錯誤：</strong>
                ${err.message || '發生未知的渲染錯誤'}
            </div>`;
        }
        
        container.appendChild(mDiv);
        pre.replaceWith(container);

        if (mDiv.querySelector('svg')) {
            attachToolbar(container, mDiv.querySelector('svg'), index);
        }
    });

    await Promise.all(renderPromises);
}

function attachToolbar(container, svg, index) {
    let currentZoom = 100;
    svg.style.width = '100%';
    svg.style.minWidth = '100%';
    svg.style.height = 'auto';
    svg.style.transition = 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.2s';

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar absolute top-3 right-3 flex gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg p-1 z-20';
    
    const btnBase = 'p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-500';
    const flexBtnBase = btnBase + ' flex items-center gap-1';

    const bIn = document.createElement('button');
    bIn.className = btnBase;
    bIn.title = "放大圖表";
    bIn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
    bIn.onclick = () => { currentZoom += 20; svg.style.width = `${currentZoom}%`; svg.style.minWidth = `${currentZoom}%`; };

    const bOut = document.createElement('button');
    bOut.className = btnBase;
    bOut.title = "縮小圖表";
    bOut.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
    bOut.onclick = () => { currentZoom = Math.max(20, currentZoom - 20); svg.style.width = `${currentZoom}%`; svg.style.minWidth = `${currentZoom}%`; };

    const bDlSvg = document.createElement('button');
    bDlSvg.className = flexBtnBase;
    bDlSvg.title = "下載 SVG 向量圖";
    bDlSvg.innerHTML = '<span class="text-[10px] font-bold">SVG</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    bDlSvg.onclick = () => handleSvgDownload(svg, index);

    const bDlPng = document.createElement('button');
    bDlPng.className = flexBtnBase;
    bDlPng.title = "下載 PNG 圖片";
    bDlPng.innerHTML = '<span class="text-[10px] font-bold">PNG</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    bDlPng.onclick = () => handlePngDownload(svg, index);

    toolbar.append(bIn, bOut, bDlSvg, bDlPng);
    container.appendChild(toolbar);
}