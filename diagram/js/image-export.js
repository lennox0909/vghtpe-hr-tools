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
 * 下載 katex.min.css 並將裡面的所有 woff2 字型轉成 Base64 內嵌
 */
async function getKatexCssWithEmbeddedFonts() {
    if (cachedKatexCssPromise) return cachedKatexCssPromise;

    cachedKatexCssPromise = (async () => {
        try {
            const res = await fetch(KATEX_CSS_URL);
            if (!res.ok) throw new Error('無法載入 KaTeX CSS');
            let cssText = await res.text();

            // 收集所有 fonts/*.woff2 路徑
            const fontPaths = new Set();
            const woff2Regex = /fonts\/[A-Za-z0-9_-]+\.woff2/g;
            let match;
            while ((match = woff2Regex.exec(cssText)) !== null) {
                fontPaths.add(match[0]);
            }

            // 平行下載所有 woff2 並轉成 Base64 Data URI
            const fontDataMap = {};
            await Promise.all(
                Array.from(fontPaths).map(async (relPath) => {
                    try {
                        const fontRes = await fetch(KATEX_FONT_BASE + relPath);
                        if (fontRes.ok) {
                            const buf = await fontRes.arrayBuffer();
                            fontDataMap[relPath] = `data:font/woff2;base64,${arrayBufferToBase64(buf)}`;
                        }
                    } catch (e) {}
                })
            );

            // 移除備用的 woff 與 ttf 相對路徑宣告
            cssText = cssText.replace(/,\s*url\([^)]+\.woff\)[^,;}]*/g, '');
            cssText = cssText.replace(/,\s*url\([^)]+\.ttf\)[^,;}]*/g, '');

            // 將每個 fonts/xxx.woff2 替換為對應的 Base64 Data URI
            for (const [relPath, dataUri] of Object.entries(fontDataMap)) {
                cssText = cssText.split(relPath).join(dataUri);
            }

            return cssText;
        } catch (err) {
            console.warn('載入 KaTeX CSS 失敗:', err);
            return '';
        }
    })();

    return cachedKatexCssPromise;
}

/**
 * 將獨立 LaTeX / KaTeX 區塊公式封裝為標準 SVG 元素
 */
export function buildSvgFromMathElement(mathEl) {
    const katexNode = mathEl.querySelector('.katex-html') || mathEl.querySelector('.katex') || mathEl;
    const displayNode = mathEl.querySelector('.katex-display') || mathEl.querySelector('.katex') || mathEl;

    const rect = katexNode.getBoundingClientRect();
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

    const wrapper = document.createElementNS(XHTML_NS, 'div');
    wrapper.setAttribute('xmlns', XHTML_NS);
    wrapper.setAttribute('class', 'katex-export-container');
    const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
    const computedFontSize = window.getComputedStyle(displayNode).fontSize || '18px';
    wrapper.setAttribute(
        'style',
        `width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;color:${textColor};font-size:${computedFontSize};box-sizing:border-box;padding:${paddingY}px ${paddingX}px;margin:0;border:0;`
    );

    const clonedMath = displayNode.cloneNode(true);
    clonedMath.style.margin = '0';
    clonedMath.querySelectorAll('.katex-mathml').forEach((el) => el.remove());

    wrapper.appendChild(clonedMath);
    fo.appendChild(wrapper);
    svg.appendChild(fo);

    return svg;
}

/**
 * 為匯出的 SVG 注入 Tailwind 邊框重置、字型與完整 KaTeX 樣式
 */
async function prepareSvgForExport(sourceSvg) {
    const clonedSvg = sourceSvg.cloneNode(true);
    clonedSvg.setAttribute('xmlns', SVG_NS);

    clonedSvg.querySelectorAll('.katex-mathml').forEach((el) => el.remove());

    clonedSvg.querySelectorAll('foreignObject > div').forEach((div) => {
        if (!div.getAttribute('xmlns')) {
            div.setAttribute('xmlns', XHTML_NS);
        }
    });

    const hasMath = Boolean(clonedSvg.querySelector('.katex, .katex-display, .katex-html, math'));

    // 關鍵修復：加上與 Tailwind Preflight 相同的 border-width: 0 重置！
    // 防止 KaTeX 內部的 .pstrut / .vlist / .mtable 定位元素因為瀏覽器預設 border-width: medium (3px) 而長出粗黑框！
    const resetCss = `
        foreignObject *, foreignObject *::before, foreignObject *::after {
            box-sizing: border-box;
            border-width: 0;
            border-style: solid;
            border-color: currentColor;
        }
        svg text, .nodeLabel, .edgeLabel, .cluster-label {
            font-family: "PingFang TC", "Microsoft JhengHei", sans-serif;
        }
        .katex-display { margin: 0 !important; }
        .katex-mathml { display: none !important; }
    `;

    let cssContent = resetCss;
    if (hasMath) {
        const katexCss = await getKatexCssWithEmbeddedFonts();
        // resetCss 必須放在 katexCss 之前，讓 katexCss 後面的 .frac-line (border-bottom-width: 0.04em) 能正常顯示分數線
        cssContent = resetCss + '\n' + katexCss;
    }

    const svgStyle = document.createElementNS(SVG_NS, 'style');
    svgStyle.textContent = cssContent;
    clonedSvg.insertBefore(svgStyle, clonedSvg.firstChild);

    const exportContainer = clonedSvg.querySelector('.katex-export-container');
    if (exportContainer && hasMath) {
        const xhtmlStyle = document.createElementNS(XHTML_NS, 'style');
        xhtmlStyle.textContent = cssContent;
        exportContainer.insertBefore(xhtmlStyle, exportContainer.firstChild);
    }

    let svgData = new XMLSerializer().serializeToString(clonedSvg);

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
    workSvg.setAttribute('width', String(width));
    workSvg.setAttribute('height', String(height));

    if (!isOffscreenMathSvg && workSvg.viewBox && workSvg.viewBox.baseVal && workSvg.viewBox.baseVal.width > 0) {
        workSvg.setAttribute('viewBox', `${workSvg.viewBox.baseVal.x - padding} ${workSvg.viewBox.baseVal.y - padding} ${workSvg.viewBox.baseVal.width + padding * 2} ${workSvg.viewBox.baseVal.height + padding * 2}`);
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
