import { isDarkMode } from './theme.js';
import { showToast, triggerDownload, requestModalInput } from './utils.js';

/**
 * 擷取頁面上已載入的 KaTeX CSS 規則，供 SVG/PNG 匯出時內嵌使用
 */
function getKatexCssText() {
    let cssText = '';
    for (const sheet of document.styleSheets) {
        try {
            if (sheet.href && sheet.href.includes('katex')) {
                for (const rule of sheet.cssRules) {
                    // 略過外部相對路徑字型宣告，避免 Canvas 跨域污染 (Tainted Canvas)
                    if (rule.type !== CSSRule.FONT_FACE_RULE) {
                        cssText += rule.cssText + '\n';
                    }
                }
            }
        } catch (e) {
            // 忽略跨域樣式表讀取限制
        }
    }
    return cssText;
}

/**
 * 將獨立 LaTeX / KaTeX 區塊公式 DOM 元素封裝為標準 SVG 元素，以便直接匯出 SVG 或繪製高解析 PNG
 */
export function buildSvgFromMathElement(mathEl) {
    const katexEl = mathEl.querySelector('.katex-display') || mathEl.querySelector('.katex') || mathEl;
    const rect = katexEl.getBoundingClientRect();
    const paddingX = 28;
    const paddingY = 20;
    const width = Math.ceil((rect.width || 320) + paddingX * 2);
    const height = Math.ceil((rect.height || 80) + paddingY * 2);

    const svgNS = '[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('xmlns', svgNS);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const fo = document.createElementNS(svgNS, 'foreignObject');
    fo.setAttribute('x', '0');
    fo.setAttribute('y', '0');
    fo.setAttribute('width', String(width));
    fo.setAttribute('height', String(height));

    const wrapper = document.createElement('div');
    wrapper.setAttribute('xmlns', '[http://www.w3.org/1999/xhtml](http://www.w3.org/1999/xhtml)');
    const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
    const computedFontSize = window.getComputedStyle(katexEl).fontSize || '16px';
    wrapper.style.cssText = `width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;color:${textColor};font-size:${computedFontSize};box-sizing:border-box;padding:${paddingY}px ${paddingX}px;`;

    const clonedMath = katexEl.cloneNode(true);
    clonedMath.style.margin = '0';
    wrapper.appendChild(clonedMath);
    fo.appendChild(wrapper);
    svg.appendChild(fo);

    return svg;
}

/**
 * 為匯出的 SVG 注入字型與 KaTeX 排版樣式，並修正 XHTML 相容性
 */
function prepareSvgForExport(clonedSvg) {
    clonedSvg.setAttribute('xmlns', '[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)');

    const hasMath = clonedSvg.querySelector('.katex, math');
    const styleElement = document.createElement('style');

    // 避免 !important 覆蓋掉 KaTeX 數學符號專用字型
    let baseCss = `
        svg *:not(.katex):not(.katex *):not(math):not(math *) {
            font-family: "PingFang TC", "Microsoft JhengHei", sans-serif !important;
        }
        .katex { font-family: KaTeX_Main, "Times New Roman", serif !important; }
        .katex-display { margin: 0 !important; text-align: center !important; }
        .katex-mathml { display: none !important; }
    `;

    if (hasMath) {
        baseCss += '\n' + getKatexCssText();
    }

    styleElement.textContent = baseCss;
    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);

    // 序列化並修正 HTML 標籤為合法 XML 自閉合格式，防止繪製 PNG 時失敗
    let svgData = new XMLSerializer().serializeToString(clonedSvg);
    svgData = svgData
        .replace(/<br\s*>/gi, '<br/>')
        .replace(/<hr\s*>/gi, '<hr/>')
        .replace(/&nbsp;/g, '&#160;');

    return svgData;
}

export async function handleSvgDownload(svg, index, prefix = 'vghtpe-chart') {
    const clonedSvg = svg.cloneNode(true);
    const svgData = prepareSvgForExport(clonedSvg);
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

    // 若為實體掛載在畫面上的 Mermaid SVG 則外加 padding；若為已封裝好內距的離屏公式 SVG 則直接使用其尺寸
    const isOffscreenMathSvg = !svg.isConnected;
    const padding = isOffscreenMathSvg ? 0 : 20;
    const width = baseWidth + padding * 2;
    const height = baseHeight + padding * 2;

    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);

    if (!isOffscreenMathSvg && clonedSvg.viewBox && clonedSvg.viewBox.baseVal && clonedSvg.viewBox.baseVal.width > 0) {
        clonedSvg.setAttribute('viewBox', `${clonedSvg.viewBox.baseVal.x - padding} ${clonedSvg.viewBox.baseVal.y - padding} ${clonedSvg.viewBox.baseVal.width + padding * 2} ${clonedSvg.viewBox.baseVal.height + padding * 2}`);
    }

    const svgData = prepareSvgForExport(clonedSvg);
    const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
    const defaultBaseName = `${prefix}-${index + 1}`;

    const img = new Image();
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
    img.src = svgUrl;
}