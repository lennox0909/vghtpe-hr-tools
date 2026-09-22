import { isDarkMode } from './theme.js';
import { showToast, triggerDownload, requestModalInput } from './utils.js';

export async function handleSvgDownload(svg, index) {
    const clonedSvg = svg.cloneNode(true);
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    // 強制寫入系統無襯線字體，解決中文亂碼
    const styleElement = document.createElement('style');
    styleElement.textContent = '* { font-family: sans-serif !important; }';
    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
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

    if (!clonedSvg.getAttribute('xmlns')) {
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    const styleElement = document.createElement('style');
    styleElement.textContent = '* { font-family: sans-serif !important; }';
    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
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