import { isDarkMode } from './theme.js';
import { showToast, triggerDownload, requestModalInput } from './utils.js';

// 拆開協定字串，防止剪貼簿自動轉成 Markdown 連結
const SVG_NS = 'http' + '://www.w3.org/2000/svg';
const XHTML_NS = 'http' + '://www.w3.org/1999/xhtml';
const KATEX_CSS_URL = 'https' + '://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
const KATEX_FONT_BASE = 'https' + '://cdn.jsdelivr.net/npm/katex@0.16.11/dist/';

let cachedKatexCssPromise = null;

/**
 * 將 ArrayBuffer 轉為 Base64 字串，供字型內嵌至 SVG/Canvas 使用
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
 * 透過 fetch 取得完整的 KaTeX CSS 並將 woff2 數學字型轉為 Base64 Data URI 內嵌
 * 徹底解決跨域 styleSheets 無法讀取導致矩陣與上下標跑版的問題
 */
async function getKatexCssText() {
    if (cachedKatexCssPromise) return cachedKatexCssPromise;

    cachedKatexCssPromise = (async () => {
        try {
            const res = await fetch(KATEX_CSS_URL);
            if (!res.ok) throw new Error('無法載入 KaTeX CSS');
            let cssText = await res.text();

            // 只保留 woff2 字型來源並轉為 Base64 內嵌，確保 Canvas 繪製 PNG 時字型與括號不變形且不觸發跨域污染
            const fontRegex = /url\(["']?(fonts\/[^)"']+\.woff2)["']?\)\s*format\(["']woff2["']\)/g;
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
                    } catch (e) {
                        // 單一字型失敗時略過
                    }
                })
            );

            // 將 @font-face 中的相對路徑替換為 Base64 Data URI，並移除備用的 woff/ttf 宣告
            cssText = cssText.replace(
                /src:\s*url\(["']?(fonts\/[^)"']+\.woff2)["']?\)\s*format\(["']woff2["']\)[^;]*;/g,
                (fullMatch, relPath) => {
                    if (fontMap[relPath]) {
                        return `src: url("${fontMap[relPath]}") format("woff2");`;
                    }
                    return fullMatch;
                }
            );

            return cssText;
        } catch (err) {
            console.warn('讀取 KaTeX CSS 失敗:', err);
            return '';
        }
    })();

    return cachedKatexCssPromise;
}

/**
 * 將獨立 LaTeX / KaTeX 區塊公式 DOM 元素封裝為標準 SVG 元素
 */
export function buildSvgFromMathElement(mathEl) {
    const measureTarget = mathEl.querySelector('.katex-html') || mathEl.querySelector('.katex') || mathEl;
    const displayTarget = mathEl.querySelector('.katex-display') || mathEl.querySelector('.katex') || mathEl;

    const rect = measureTarget.getBoundingClientRect();
    const paddingX = 36;
    const paddingY = 28;
    const width = Math.ceil((rect.width || 360) + paddingX * 2);
    const height = Math.ceil((rect.height || 100) + paddingY * 2);

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // 加入底色矩形，確保獨立開啟 SVG 與轉換 PNG 時背景一致
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

    const wrapper = document.createElement('div');
    wrapper.setAttribute('xmlns', XHTML_NS);
    const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
    const computedFontSize = window.getComputedStyle(displayTarget).fontSize || '18px';
    wrapper.style.cssText = `width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;color:${textColor};font-size:${computedFontSize};line-height:1.2;box-sizing:border-box;padding:${paddingY}px ${paddingX}px;`;

    const clonedMath = displayTarget.cloneNode(true);
    clonedMath.style.margin = '0';
    // 移除隱藏的 MathML 節點，僅保留經過排版的 .katex-html
    clonedMath.querySelectorAll('.katex-mathml').forEach((el) => el.remove());

    wrapper.appendChild(clonedMath);
    fo.appendChild(wrapper);
    svg.appendChild(fo);

    return svg;
}

/**
 * 為匯出的 SVG 注入字型與完整 KaTeX 排版樣式，並修正 XHTML 相容性
 */
async function prepareSvgForExport(clonedSvg) {
    clonedSvg.setAttribute('xmlns', SVG_NS);

    clonedSvg.querySelectorAll('.katex-mathml').forEach((el) => el.remove());

    const hasMath = Boolean(clonedSvg.querySelector('.katex, .katex-display, math'));
    const styleElement = document.createElementNS(SVG_NS, 'style');

    let baseCss = `
        svg *:not(.katex):not(.katex *):not(math):not(math *) {
            font-family: "PingFang TC", "Microsoft JhengHei", sans-serif;
        }
        .katex-display { margin: 0 !important; text-align: center !important; display: block !important; }
        .katex-mathml { display: none !important; }
    `;

    if (hasMath) {
        const katexCss = await getKatexCssText();
        baseCss = katexCss + '\n' + baseCss;
    }

    styleElement.textContent = baseCss;
    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);

    let svgData = new XMLSerializer().serializeToString(clonedSvg);

    // 還原 <style> 區塊內被 XMLSerializer 轉義的 > 選擇器與引號，確保 .vlist-t2 > .vlist-r 矩陣排版生效
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
    const clonedSvg = svg.cloneNode(true);
    const svgData = await prepareSvgForExport(clonedSvg);
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
    const clonedSvg = svg.cloneNode(true);
    const rect = svg.getBoundingClientRect();
    const vbWidth = (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width) ? svg.viewBox.baseVal.width : parseFloat(svg.getAttribute('width') || '0');
    const vbHeight = (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.height) ? svg.viewBox.baseVal.height : parseFloat(svg.getAttribute('height') || '0');

    const baseWidth = rect.width > 0 ? rect.width : (vbWidth || 400);
    const baseHeight = rect.height > 0 ? rect.height : (vbHeight || 120);

    const isOffscreenMathSvg = !svg.isConnected;
    const padding = isOffscreenMathSvg ? 0 : 20;
    const width = Math.ceil(baseWidth + padding * 2);
    const height = Math.ceil(baseHeight + padding * 2);

    clonedSvg.setAttribute('width', String(width));
    clonedSvg.setAttribute('height', String(height));

    if (!isOffscreenMathSvg && clonedSvg.viewBox && clonedSvg.viewBox.baseVal && clonedSvg.viewBox.baseVal.width > 0) {
        clonedSvg.setAttribute('viewBox', `${clonedSvg.viewBox.baseVal.x - padding} ${clonedSvg.viewBox.baseVal.y - padding} ${clonedSvg.viewBox.baseVal.width + padding * 2} ${clonedSvg.viewBox.baseVal.height + padding * 2}`);
    }

    const svgData = await prepareSvgForExport(clonedSvg);
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