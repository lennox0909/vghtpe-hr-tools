import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
import katex from 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.mjs';
import renderMathInElement from 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.mjs';
import { DOM } from './config.js';
import { handleSvgDownload, handlePngDownload, buildSvgFromMathElement } from './image-export.js';

/**
 * 產生獨立區塊公式與矩陣專用的卡片容器 HTML
 */
function buildMathCardHtml(renderedKatexHtml) {
    return `<div class="math-block-wrapper group relative my-8 p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all hover:shadow-md flex flex-col items-center">
        <div class="math-content w-full overflow-x-auto py-2 text-center transition-all">${renderedKatexHtml}</div>
    </div>`;
}

/**
 * 保護並預先渲染 Markdown 內的 LaTeX 公式、行內程式碼與中文全形標點粗體
 */
function preprocessLatexInMarkdown(markdown) {
    const mathStore = [];
    const codeBlockStore = [];
    const inlineCodeStore = [];

    // 1. 先將 ``` 多行程式碼區塊暫存保護起來（支援 \r\n 與 \n）
    let text = markdown.replace(/```([^\r\n]*)\r?\n([\s\S]*?)```/g, (match, lang, content) => {
        const normalizedLang = (lang || '').trim().toLowerCase();
        if (normalizedLang === 'math' || normalizedLang === 'latex') {
            const id = `MATHTOKEN${mathStore.length}END`;
            try {
                const rendered = katex.renderToString(content.trim(), {
                    displayMode: true,
                    throwOnError: false,
                    strict: false
                });
                mathStore.push(buildMathCardHtml(rendered));
            } catch (e) {
                mathStore.push(match);
            }
            return id;
        }
        const codeId = `CODEBLOCK${codeBlockStore.length}END`;
        codeBlockStore.push(match);
        return codeId;
    });

    // 2. 擷取行內程式碼 `...` 並剝除前後反引號 `，轉為獨立 Token
    text = text.replace(/`([^`\r\n]+)`/g, (_, codeContent) => {
        const inlineId = `INLINECODE${inlineCodeStore.length}END`;
        const escaped = codeContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        inlineCodeStore.push(
            `<code class="px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono text-[0.875em] font-semibold before:content-none after:content-none">${escaped}</code>`
        );
        return inlineId;
    });

    // 3. 處理獨立區塊公式 $$...$$ 與 \[...\]
    text = text.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (match, g1, g2) => {
        const expr = (g1 || g2 || '').trim();
        const id = `MATHTOKEN${mathStore.length}END`;
        try {
            const rendered = katex.renderToString(expr, {
                displayMode: true,
                throwOnError: false,
                strict: false
            });
            mathStore.push(buildMathCardHtml(rendered));
        } catch (e) {
            mathStore.push(match);
        }
        return id;
    });

    // 4. 處理行內公式 $...$ 與 \(...\)
    text = text.replace(/(?<!\\)\$([^\$\r\n]+?)(?<!\\)\$|\\\(([\s\S]+?)\\\)/g, (match, g1, g2) => {
        const expr = (g1 || g2 || '').trim();
        if (!expr) return match;
        const id = `MATHTOKEN${mathStore.length}END`;
        try {
            mathStore.push(
                katex.renderToString(expr, {
                    displayMode: false,
                    throwOnError: false,
                    strict: false
                })
            );
        } catch (e) {
            mathStore.push(match);
        }
        return id;
    });

    // 5. 修復 CommonMark 在中文全形括號/引號（如 ）**、」**）與公式混合時無法解析 **粗體** 的問題
    text = text.replace(/\*\*(?!\s)([^\*\r\n]+?)(?<!\s)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');

    // 6. 還原多行 ``` 程式碼區塊給 Marked 處理
    text = text.replace(/CODEBLOCK(\d+)END/g, (_, idx) => codeBlockStore[Number(idx)]);

    return { processedText: text, mathStore, inlineCodeStore };
}

/**
 * 修正 Mermaid subgraph (.cluster) 標題截斷問題與自訂淺色背景下的文字對比度
 */
function fixMermaidSubgraphs(svgEl) {
    if (!svgEl) return;
    const clusters = svgEl.querySelectorAll('g.cluster');
    clusters.forEach((cluster) => {
        // 1. 確保 subgraph 背景框顯示
        const bgShape = cluster.querySelector('rect, path');
        let hasCustomLightBg = false;
        if (bgShape) {
            bgShape.style.setProperty('display', 'block', 'important');
            const styleAttr = (bgShape.getAttribute('style') || '').toLowerCase();
            const fillAttr = (bgShape.getAttribute('fill') || '').toLowerCase();
            if (styleAttr.includes('fill:') || (fillAttr && fillAttr !== 'none')) {
                hasCustomLightBg = true;
            }
        }

        // 2. 解決 subgraph 標題 foreignObject 寬度不足導致結尾被切掉 (如 Cont...) 的問題
        const fo = cluster.querySelector('.cluster-label foreignObject');
        if (fo) {
            fo.style.overflow = 'visible';
            const origWidth = parseFloat(fo.getAttribute('width') || '0');
            const origX = parseFloat(fo.getAttribute('x') || '0');
            if (origWidth > 0) {
                const extraWidth = 80;
                fo.setAttribute('width', String(origWidth + extraWidth));
                fo.setAttribute('x', String(origX - extraWidth / 2));
            }
            const innerDiv = fo.querySelector('div');
            if (innerDiv) {
                innerDiv.style.whiteSpace = 'nowrap';
                innerDiv.style.maxWidth = 'none';
                innerDiv.style.overflow = 'visible';
            }
        }

        // 3. 若 subgraph 有指定淺色背景，強制將標題文字設為深色，避免深色模式下「白底白字」看不見
        if (hasCustomLightBg) {
            const labelEls = cluster.querySelectorAll('.cluster-label span, .cluster-label div, .cluster-label p, .nodeLabel, text');
            labelEls.forEach((el) => {
                el.style.setProperty('color', '#0f172a', 'important');
                el.style.setProperty('fill', '#0f172a', 'important');
                el.style.setProperty('font-weight', '700', 'important');
            });
        }
    });
}

export async function renderContent() {
    const rawText = DOM.editor.value || '';
    
    // 預先過濾導致崩潰的不可見字元
    const sanitizedText = rawText
        .replace(/\u00A0/g, ' ')
        .replace(/[\u2028\u2029]/g, '<br/>');
    
    if (window.marked) {
        const { processedText, mathStore, inlineCodeStore } = preprocessLatexInMarkdown(sanitizedText);
        let html = marked.parse(processedText);
        // 關鍵：同時將 INLINECODE 與 MATHTOKEN 還原回對應的 HTML！
        html = html.replace(/INLINECODE(\d+)END/g, (_, idx) => inlineCodeStore[Number(idx)]);
        html = html.replace(/MATHTOKEN(\d+)END/g, (_, idx) => mathStore[Number(idx)]);
        DOM.preview.innerHTML = html;

        // 保險機制：若還有 code.language-latex 或 code.language-math 區塊則直接轉換為公式卡片
        const mathCodeBlocks = DOM.preview.querySelectorAll('code.language-latex, code.language-math');
        mathCodeBlocks.forEach((block) => {
            const pre = block.parentElement;
            const temp = document.createElement('div');
            temp.innerHTML = buildMathCardHtml(
                katex.renderToString(block.textContent.trim(), {
                    displayMode: true,
                    throwOnError: false,
                    strict: false
                })
            );
            pre.replaceWith(temp.firstElementChild);
        });

        // 為所有獨立區塊公式與矩陣掛載右上角「放大、縮小、SVG、PNG」工具列
        const mathWrappers = DOM.preview.querySelectorAll('.math-block-wrapper');
        mathWrappers.forEach((wrapper, idx) => {
            const mathContent = wrapper.querySelector('.math-content');
            if (mathContent) {
                attachMathToolbar(wrapper, mathContent, idx);
            }
        });
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
        sourceText = sourceText.replace(/[\u00A0\u3000\u200B]/g, ' ');
        
        try {
            const { svg } = await mermaid.render(id, sourceText);
            mDiv.innerHTML = svg;

            // 修正 subgraph 標題寬度截斷與深色模式對比度
            fixMermaidSubgraphs(mDiv.querySelector('svg'));

            // 針對 Mermaid 圖表節點內的 LaTeX 公式補渲染
            renderMathInElement(mDiv, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false,
                strict: false
            });
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

/**
 * 為 Mermaid 圖表掛載工具列
 */
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

/**
 * 為獨立區塊公式與矩陣掛載相同的「放大、縮小、SVG、PNG」工具列
 */
function attachMathToolbar(container, mathContent, index) {
    let currentZoom = 100;
    mathContent.style.fontSize = '100%';
    mathContent.style.transition = 'font-size 0.2s cubic-bezier(0.4, 0, 0.2, 1)';

    const toolbar = createToolbarButtons(
        () => { currentZoom = Math.min(300, currentZoom + 20); mathContent.style.fontSize = `${currentZoom}%`; },
        () => { currentZoom = Math.max(40, currentZoom - 20); mathContent.style.fontSize = `${currentZoom}%`; },
        () => {
            const mathSvg = buildSvgFromMathElement(mathContent);
            handleSvgDownload(mathSvg, index, 'vghtpe-formula');
        },
        () => {
            const mathSvg = buildSvgFromMathElement(mathContent);
            handlePngDownload(mathSvg, index, 'vghtpe-formula');
        }
    );
    container.appendChild(toolbar);
}

/**
 * 建立共用的「放大、縮小、SVG、PNG」浮動按鈕組 DOM
 */
function createToolbarButtons(onZoomIn, onZoomOut, onDownloadSvg, onDownloadPng) {
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar absolute top-3 right-3 flex gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg p-1 z-20';
    
    const btnBase = 'p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-500';
    const flexBtnBase = btnBase + ' flex items-center gap-1';

    const bIn = document.createElement('button');
    bIn.className = btnBase;
    bIn.title = "放大";
    bIn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
    bIn.onclick = onZoomIn;

    const bOut = document.createElement('button');
    bOut.className = btnBase;
    bOut.title = "縮小";
    bOut.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
    bOut.onclick = onZoomOut;

    const bDlSvg = document.createElement('button');
    bDlSvg.className = flexBtnBase;
    bDlSvg.title = "下載 SVG 向量圖";
    bDlSvg.innerHTML = '<span class="text-[10px] font-bold">SVG</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    bDlSvg.onclick = onDownloadSvg;

    const bDlPng = document.createElement('button');
    bDlPng.className = flexBtnBase;
    bDlPng.title = "下載 PNG 圖片";
    bDlPng.innerHTML = '<span class="text-[10px] font-bold">PNG</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    bDlPng.onclick = onDownloadPng;

    toolbar.append(bIn, bOut, bDlSvg, bDlPng);
    return toolbar;
}