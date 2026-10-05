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
 * 為匯出的 SVG 注入字型與 KaTeX 排版樣式，並修正 XHTML 相容性
 */
function prepareSvgForExport(clonedSvg) {
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const hasMath = clonedSvg.querySelector('.katex, math');
    const styleElement = document.createElement('style');

    // 避免 !important 覆蓋掉 KaTeX 數學符號專用字型
    let baseCss = `
        svg *:not(.katex):not(.katex *):not(math):not(math *) {
            font-family: "PingFang TC", "Microsoft JhengHei", sans-serif !important;
        }
        .katex { font-family: KaTeX_Main, "Times New Roman", serif !important; }
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

export async function handleSvgDownload(svg, index) {
    const clonedSvg = svg.cloneNode(true);
    const svgData = prepareSvgForExport(clonedSvg);
    const content = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\r\n' + svgData;
    const suggestedName = `vghtpe-chart-${index + 1}.svg`;
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
            showToast(`圖表已成功儲存為 ${handle.name}`);
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }

    const filename = await requestModalInput(`vghtpe-chart-${index + 1}`, 'svg', '儲存圖表 (SVG)', '請輸入檔名進行快速下載：');
    if (filename) {
        triggerDownload(content, `${filename}.svg`, mimeType);
        showToast(`已成功下載：${filename}.svg`);
    }
}

export async function handlePngDownload(svg, index) {
    const clonedSvg = svg.cloneNode(true);
    const bbox = svg.getBoundingClientRect();
    
    // 加上 padding 避免繪製時裁切到文字
    const padding = 20;
    const width = bbox.width + padding * 2;
    const height = bbox.height + padding * 2;
    
    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);
    
    if (clonedSvg.viewBox && clonedSvg.viewBox.baseVal) {
        clonedSvg.setAttribute('viewBox', `${clonedSvg.viewBox.baseVal.x - padding} ${clonedSvg.viewBox.baseVal.y - padding} ${clonedSvg.viewBox.baseVal.width + padding * 2} ${clonedSvg.viewBox.baseVal.height + padding * 2}`);
    }

    const svgData = prepareSvgForExport(clonedSvg);
    const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);

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
            const suggestedName = `vghtpe-chart-${index + 1}.png`;

            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: suggestedName,
                        types: [{ description: 'PNG 圖片', accept: { 'image/png': ['.png'] } }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    showToast(`圖表已成功儲存為 ${handle.name}`);
                    return;
                } catch (err) {
                    if (err.name === 'AbortError') return;
                }
            }

            const filename = await requestModalInput(`vghtpe-chart-${index + 1}`, 'png', '儲存圖表 (PNG)', '請輸入檔名進行快速下載：');
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