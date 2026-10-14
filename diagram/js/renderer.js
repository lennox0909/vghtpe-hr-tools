import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
import katex from 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.mjs';
import renderMathInElement from 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.mjs';
import { DOM } from './config.js';
import { handleSvgDownload, handlePngDownload, buildSvgFromMathElement } from './image-export.js';

let isWasmReady = false;

// 初始化 Wasm (具備降級保護機制)
export const initWasm = async () => {
    try {
        if (!window.Go) {
            const script = document.createElement('script');
            script.src = './js/wasm_exec.js';
            document.head.appendChild(script);
            await new Promise((resolve) => script.onload = resolve);
        }
        
        const go = new window.Go();
        const response = await fetch('./js/diagram_opts.wasm');
        if (!response.ok) throw new Error(`HTTP 錯誤: ${response.status}`);

        let result;
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/wasm')) {
            result = await WebAssembly.instantiateStreaming(response, go.importObject);
        } else {
            console.warn("啟用 ArrayBuffer 降級載入 Wasm 模式");
            const buffer = await response.arrayBuffer();
            result = await WebAssembly.instantiate(buffer, go.importObject);
        }
        
        go.run(result.instance);
        isWasmReady = true;
        console.log("✅ Diagram Wasm 加速引擎載入完成");
    } catch (error) {
        console.error("❌ Wasm 載入失敗:", error);
    }
};

function buildMathCardHtml(renderedKatexHtml) {
    return `<div class="math-block-wrapper group relative my-8 p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all hover:shadow-md flex flex-col items-center">
        <div class="math-content w-full overflow-x-auto py-2 text-center transition-all">${renderedKatexHtml}</div>
    </div>`;
}

// 呼叫 Wasm 解析文本，並將結果交由 KaTeX 渲染
function preprocessLatexWithWasm(markdown) {
    if (!isWasmReady || typeof window.goPreprocessLatex !== 'function') {
        console.warn("Wasm 尚未準備好，請稍候");
        return { processedText: markdown, mathStoreHtml: [], inlineCodeStore: [] };
    }

    const resultStr = window.goPreprocessLatex(markdown);
    const parsed = JSON.parse(resultStr);

    // Wasm 提取出公式後，交由 JS 的 KaTeX 進行高精度排版渲染
    const mathStoreHtml = parsed.mathStore.map(item => {
        try {
            if (item.type === 'block') {
                const rendered = katex.renderToString(item.expr, { displayMode: true, throwOnError: false, strict: false });
                return buildMathCardHtml(rendered);
            } else {
                return katex.renderToString(item.expr, { displayMode: false, throwOnError: false, strict: false });
            }
        } catch (e) {
            return item.raw;
        }
    });

    return {
        processedText: parsed.processedText,
        mathStoreHtml: mathStoreHtml,
        inlineCodeStore: parsed.inlineCodeStore
    };
}

export async function renderContent() {
    const rawText = DOM.editor.value || '';
    
    if (window.marked && isWasmReady) {
        const { processedText, mathStoreHtml, inlineCodeStore } = preprocessLatexWithWasm(rawText);
        
        let html = marked.parse(processedText);
        
        // 將 Wasm 標記的 Token 還原為渲染後的 HTML
        html = html.replace(/INLINECODE(\d+)END/g, (_, idx) => inlineCodeStore[Number(idx)]);
        html = html.replace(/MATHTOKEN(\d+)END/g, (_, idx) => mathStoreHtml[Number(idx)]);
        DOM.preview.innerHTML = html;

        const mathWrappers = DOM.preview.querySelectorAll('.math-block-wrapper');
        mathWrappers.forEach((wrapper, idx) => {
            const mathContent = wrapper.querySelector('.math-content');
            if (mathContent) attachMathToolbar(wrapper, mathContent, idx);
        });
    } else {
        DOM.preview.innerHTML = "<p class='text-slate-500'>載入中，請稍候...</p>";
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
        
        let sourceText = block.textContent.replace(/[\u00A0\u3000\u200B]/g, ' ');
        
        try {
            // 取得 Mermaid 原始 SVG
            const { svg } = await mermaid.render(id, sourceText);
            
            // 透過 Wasm 進行高效能 SVG 字串改造 (取代原先的 DOM 操作)
            let optimizedSvg = svg;
            if (isWasmReady && typeof window.goFixMermaidSubgraphs === 'function') {
                optimizedSvg = window.goFixMermaidSubgraphs(svg);
            }
            mDiv.innerHTML = optimizedSvg;

            renderMathInElement(mDiv, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '[', right: ']', display: true }
                ],
                throwOnError: false,
                strict: false
            });
        } catch (err) {
            mDiv.innerHTML = `<div class="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-lg text-xs font-mono text-left">${err.message}</div>`;
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

    const toolbar = createToolbarButtons(
        () => { currentZoom += 20; svg.style.width = `${currentZoom}%`; svg.style.minWidth = `${currentZoom}%`; },
        () => { currentZoom = Math.max(20, currentZoom - 20); svg.style.width = `${currentZoom}%`; svg.style.minWidth = `${currentZoom}%`; },
        () => handleSvgDownload(svg, index, 'vghtpe-chart'),
        () => handlePngDownload(svg, index, 'vghtpe-chart')
    );
    container.appendChild(toolbar);
}

function attachMathToolbar(container, mathContent, index) {
    let currentZoom = 100;
    mathContent.style.fontSize = '100%';
    mathContent.style.transition = 'font-size 0.2s cubic-bezier(0.4, 0, 0.2, 1)';

    const toolbar = createToolbarButtons(
        () => { currentZoom = Math.min(300, currentZoom + 20); mathContent.style.fontSize = `${currentZoom}%`; },
        () => { currentZoom = Math.max(40, currentZoom - 20); mathContent.style.fontSize = `${currentZoom}%`; },
        () => { const mathSvg = buildSvgFromMathElement(mathContent); handleSvgDownload(mathSvg, index, 'vghtpe-formula'); },
        () => { const mathSvg = buildSvgFromMathElement(mathContent); handlePngDownload(mathSvg, index, 'vghtpe-formula'); }
    );
    container.appendChild(toolbar);
}

function createToolbarButtons(onZoomIn, onZoomOut, onDownloadSvg, onDownloadPng) {
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar absolute top-3 right-3 flex gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg p-1 z-20';
    
    const btnBase = 'p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-500 flex items-center gap-1';

    const bIn = document.createElement('button'); bIn.className = btnBase; bIn.onclick = onZoomIn;
    bIn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';

    const bOut = document.createElement('button'); bOut.className = btnBase; bOut.onclick = onZoomOut;
    bOut.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';

    const bDlSvg = document.createElement('button'); bDlSvg.className = btnBase; bDlSvg.onclick = onDownloadSvg;
    bDlSvg.innerHTML = '<span class="text-[10px] font-bold">SVG</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

    const bDlPng = document.createElement('button'); bDlPng.className = btnBase; bDlPng.onclick = onDownloadPng;
    bDlPng.innerHTML = '<span class="text-[10px] font-bold">PNG</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

    toolbar.append(bIn, bOut, bDlSvg, bDlPng);
    return toolbar;
}