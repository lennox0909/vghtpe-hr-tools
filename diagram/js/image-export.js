import { isDarkMode } from './theme.js';
import { showToast, triggerDownload, requestModalInput } from './utils.js';

const SVG_NS = 'http' + '://www.w3.org/2000/svg';
const XHTML_NS = 'http' + '://www.w3.org/1999/xhtml';
const KATEX_CSS_URL = 'https' + '://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
const KATEX_FONT_BASE = 'https' + '://cdn.jsdelivr.net/npm/katex@0.16.11/dist/';

let cachedKatexCssPromise = null;

/**
 * 將 ArrayBuffer 轉為 Base64 字串
 */
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

/**
 * 抓取 KaTeX CSS 並將所有 woff2 字型轉為 Base64 內嵌
 */
async function getKatexCssWithEmbeddedFonts() {
    if (cachedKatexCssPromise) return cachedKatexCssPromise;

    cachedKatexCssPromise = (async () => {
        try {
            const res = await fetch(KATEX_CSS_URL);
            if (!res.ok) throw new Error('無法載入 KaTeX CSS');
            let cssText = await res.text();

            // 找出所有 woff2 字型檔案路徑並轉為 Base64
            const fontRegex = /url\(["']?(fonts\/[^)"']+\.woff2)["']?\)/g;
            const matches = [...cssText.matchAll(fontRegex)];
            const uniqueFonts = [...new Set(matches.map((m) => m[1]))];

            const fontMap = {};
            await Promise.all(
                uniqueFonts.map(async (relPath) => {
                    try {
                        const fontRes = await fetch(KATEX_FONT_BASE + relPath);
                        if (fontRes.ok) {
                            const buf = await fontRes.arrayBuffer();
                            fontMap[relPath] = `data:font/woff2;base64,${arrayBufferToBase64(buf)}`;
                        }
                    } catch (e) {}
                })
            );

            // 將整段 @font-face 的 src 替換為純 Base64 woff2，移除會造成跨域污染的 woff/ttf 相對路徑
            cssText = cssText.replace(
                /src:\s*url\(["']?(fonts\/[^)"']+\.woff2)["']?\)\s*format\(["']woff2["']\)[^;]*;/g,
                (fullMatch, relPath) => {
                    if (fontMap[relPath]) {
                        return `src: url("${fontMap[relPath]}") format("woff2");`;
                    }
                    return '';
                }
            );

            return cssText;
        } catch (err) {
            console.warn('讀取 KaTeX 字型樣式失敗:', err);
            return '';
        }
    })();

    return cachedKatexCssPromise;
}

/**
 * 核心關鍵：將畫面上已渲染完成的 KaTeX 真實計算樣式 (Computed Styles) 直接內聯寫入複製節點
 * 徹底解決 SVG foreignObject 與 Canvas 繪製時矩陣、分式、上下標跑版的問題
 */
const INLINE_STYLE_PROPS = [
    'display',
    'position',
    'top',
    'left',
    'right',
    'bottom',
    'width',
    'height',
    'min-width',
    'min-height',
    'vertical-align',
    'text-align',
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'line-height',
    'color',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'border-top-width',
    'border-top-style',
    'border-top-color',
    'border-bottom-width',
    'border-bottom-style',
    'border-bottom-color',
    'border-left-width',
    'border-left-style',
    'border-left-color',
    'border-right-width',
    'border-right-style',
    'border-right-color',
    'box-sizing',
    'white-space',
    'transform'
];

function inlineComputedStylesDeep(sourceEl, targetEl) {
    if (!sourceEl || !targetEl || sourceEl.nodeType !== 1 || targetEl.nodeType !== 1) return;

    // 若為隱藏的無障礙 MathML 標籤，直接隱藏
    if (sourceEl.classList && sourceEl.classList.contains('katex-mathml')) {
        targetEl.style.display = 'none';
        return;
    }

    const computed = window.getComputedStyle(sourceEl);
    let styleStr = '';
    for (const prop of INLINE_STYLE_PROPS) {
        const val = computed.getPropertyValue(prop);
        if (val && val !== 'none' && val !== 'normal' && val !== 'auto' && val !== '0px') {
            styleStr += `${prop}:${val};`;
        } else if (prop === 'display' || prop === 'position' || prop === 'vertical-align') {
            styleStr += `${prop}:${val};`;
        }
    }

    // 保留原本 inline style 裡由 KaTeX 精算的相對單位 (如 top: -2.4em; height: 3.6em;)
    const origInline = sourceEl.getAttribute('style') || '';
    targetEl.setAttribute('style', `${styleStr}${origInline}`);

    const srcChildren = sourceEl.children;
    const tgtChildren = targetEl.children;
    for (let i = 0; i < srcChildren.length; i++) {
        if (tgtChildren[i]) {
            inlineComputedStylesDeep(srcChildren[i], tgtChildren[i]);
        }
    }
}

/**
 * 將獨立 LaTeX / KaTeX 區塊公式 DOM 元素封裝為標準 SVG 元素
 */
export function buildSvgFromMathElement(mathEl) {
    // 抓取實際排版的 .katex-html 節點以獲得最精準的公式幾何尺寸
    const katexHtmlNode = mathEl.querySelector('.katex-html') || mathEl.querySelector('.katex') || mathEl;
    const rect = katexHtmlNode.getBoundingClientRect();

    const paddingX = 40;
    const paddingY = 28;
    const width = Math.ceil((rect.width || 360) + paddingX * 2);
    const height = Math.ceil((rect.height || 100) + paddingY * 2);

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // 背景矩形
    const bgRect = document.createElementNS(SVG_NS, 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('rx', '12');
    bgRect.setAttribute('fill', isDarkMode ? '#0f172a' : '#ffffff');
    svg.appendChild(bgRect);

    const fo = document.createElementNS(SVG_NS, 'foreignObject');
    fo.setAttribute('x', '0');
    fo.setAttribute('y', '0');
    fo.setAttribute('width', String(width));
    fo.setAttribute('height', String(height));

    // 使用 createElementNS 建立標準 XHTML 命名空間的容器
    const wrapper = document.createElementNS(XHTML_NS, 'div');
    wrapper.setAttribute('xmlns', XHTML_NS);
    const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
    wrapper.setAttribute(
        'style',
        `width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;color:${textColor};box-sizing:border-box;padding:${paddingY}px ${paddingX}px;`
    );

    const clonedKatexHtml = katexHtmlNode.cloneNode(true);
    // 將畫面上已經完美排版的每個子節點計算樣式直接內聯寫死到複製節點上
    inlineComputedStylesDeep(katexHtmlNode, clonedKatexHtml);

    // 移除可能殘留的 MathML 節點
    clonedKatexHtml.querySelectorAll('.katex-mathml').forEach((el) => el.remove());

    wrapper.appendChild(clonedKatexHtml);
    fo.appendChild(wrapper);
    svg.appendChild(fo);

    // 標記此 SVG 已經過內聯樣式處理
    svg.dataset.mathInlined = 'true';

    return svg;
}

/**
 * 為匯出的 SVG 注入字型與 KaTeX 排版樣式，並修正 XHTML 相容性
 */
async function prepareSvgForExport(sourceSvg) {
    const clonedSvg = sourceSvg.cloneNode(true);
    clonedSvg.setAttribute('xmlns', SVG_NS);

    // 若是 Mermaid 圖表內含 KaTeX 節點，也同步將畫面上原始 SVG 內的 .katex 計算樣式內聯過去
    if (sourceSvg.isConnected && !sourceSvg.dataset.mathInlined) {
        const srcKatexList = sourceSvg.querySelectorAll('.katex-html, .katex');
        const tgtKatexList = clonedSvg.querySelectorAll('.katex-html, .katex');
        srcKatexList.forEach((srcNode, idx) => {
            if (tgtKatexList[idx]) {
                inlineComputedStylesDeep(srcNode, tgtKatexList[idx]);
            }
        });
    }

    clonedSvg.querySelectorAll('.katex-mathml').forEach((el) => el.remove());

    const hasMath = Boolean(
        clonedSvg.dataset.mathInlined === 'true' ||
        clonedSvg.querySelector('.katex, .katex-html, .vlist, math')
    );

    const styleElement = document.createElementNS(SVG_NS, 'style');
    let baseCss = `
        .katex-mathml { display: none !important; }
    `;

    if (hasMath) {
        const katexCss = await getKatexCssWithEmbeddedFonts();
        baseCss = katexCss + '\n' + baseCss;
    }

    styleElement.textContent = baseCss;
    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);

    let svgData = new XMLSerializer().serializeToString(clonedSvg);

    // 還原 <style> 區塊內被 XMLSerializer 轉義的 > 選擇器與引號
    svgData = svgData.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match) => {
        return match.replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    });

    svgData = svgData
        .replace(/\[(https?:\/\/[^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '$1')
        .replace(/<br\s*>/gi, '<br/>')
        .replace(/<hr\s*>/gi, '<hr/>')
        .replace(/&nbsp;/g, '&#160;');

    return svgData;
}

export async function handleSvgDownload(svg, index, prefix = 'vghtpe-chart') {
    const svgData = await prepareSvgForExport(svg);
    const content = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\r\n' + svgData;
    const defaultBaseName = `${prefix}-${index + 1}`;
    const suggestedName = `${defaultBaseName}.svg`;
    const mimeType = 'image/svg+xml;charset=utf-8';

    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{ description: 'SVG 圖片', accept: { 'image/svg+xml': ['.svg'] } }]
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

    const filename = await requestModalInput(defaultBaseName, 'svg', '儲存為 SVG', '請輸入檔名進行快速下載：');
    if (filename) {
        triggerDownload(content, `${filename}.svg`, mimeType);
        showToast(`已成功下載：${filename}.svg`);
    }
}

export async function handlePngDownload(svg, index, prefix = 'vghtpe-chart') {
    const rect = svg.getBoundingClientRect();
    const vbWidth = (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width) ? svg.viewBox.baseVal.width : parseFloat(svg.getAttribute('width') || '0');
    const vbHeight = (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.height) ? svg.viewBox.baseVal.height : parseFloat(svg.getAttribute('height') || '0');

    const baseWidth = rect.width > 0 ? rect.width : (vbWidth || 400);
    const baseHeight = rect.height > 0 ? rect.height : (vbHeight || 120);

    const isOffscreenMathSvg = !svg.isConnected;
    const padding = isOffscreenMathSvg ? 0 : 20;
    const width = Math.ceil(baseWidth + padding * 2);
    const height = Math.ceil(baseHeight + padding * 2);

    const workSvg = svg.cloneNode(true);
    if (svg.dataset.mathInlined) {
        workSvg.dataset.mathInlined = 'true';
    }
    workSvg.setAttribute('width', String(width));
    workSvg.setAttribute('height', String(height));

    if (!isOffscreenMathSvg && workSvg.viewBox && workSvg.viewBox.baseVal && workSvg.viewBox.baseVal.width > 0) {
        workSvg.setAttribute('viewBox', `${workSvg.viewBox.baseVal.x - padding} ${workSvg.viewBox.baseVal.y - padding} ${workSvg.viewBox.baseVal.width + padding * 2} ${workSvg.viewBox.baseVal.height + padding * 2}`);
    }

    // 若為畫面上的 Mermaid SVG 且內含公式，先把畫面上的真實計算樣式同步到 workSvg
    if (svg.isConnected && !svg.dataset.mathInlined) {
        const srcKatexList = svg.querySelectorAll('.katex-html, .katex');
        const tgtKatexList = workSvg.querySelectorAll('.katex-html, .katex');
        srcKatexList.forEach((srcNode, idx) => {
            if (tgtKatexList[idx]) {
                inlineComputedStylesDeep(srcNode, tgtKatexList[idx]);
            }
        });
        workSvg.dataset.mathInlined = 'true';
    }

    const svgData = await prepareSvgForExport(workSvg);
    const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
    const defaultBaseName = `${prefix}-${index + 1}`;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = isDarkMode ? '#0f172a' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(async (blob) => {
            if (!blob) {
                showToast('PNG 轉換失敗，請改用 SVG 格式下載', 'error');
                return;
            }
            const suggestedName = `${defaultBaseName}.png`;

            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: suggestedName,
                        types: [{ description: 'PNG 圖片', accept: { 'image/png': ['.png'] } }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    showToast(`已成功儲存為 ${handle.name}`);
                    return;
                } catch (err) {
                    if (err.name === 'AbortError') return;
                }
            }

            const filename = await requestModalInput(defaultBaseName, 'png', '儲存為 PNG', '請輸入檔名進行快速下載：');
            if (filename) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(`已成功下載：${filename}.png`);
            }
        }, 'image/png');
    };
    img.onerror = () => {
        showToast('無法將公式繪製為 PNG，請檢查 SVG 語法', 'error');
    };
    img.src = svgUrl;
}