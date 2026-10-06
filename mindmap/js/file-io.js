import { DOM } from './config.js';
import { showModal } from './modal.js';
import { getExportState } from './renderer.js';
// 引入全域共用的存檔邏輯
import { saveFile } from '../../assets/js/shared/file.js';

export const initFileIO = (cmEditor, debounceUpdateCallback) => {
    // 1. 下載 TXT 純文字檔
    DOM.btnDownloadMd.addEventListener('click', () => {
        const blob = new Blob([cmEditor.getValue()], { type: 'text/plain;charset=utf-8' });
        saveFile(blob, 'markmap-mindmap.txt', 'TXT 純文字檔', { 'text/plain': ['.txt'] });
    });

    // 2. 下載 SVG 圖片
    DOM.btnDownloadSvg.addEventListener('click', () => {
        const clone = DOM.svgEl.cloneNode(true);
        const style = document.createElement('style');
        style.textContent = `.markmap-link{fill:none}.markmap-node circle{cursor:pointer}foreignObject{overflow:visible}svg{background-color:#fff;font-family:sans-serif}`;
        clone.insertBefore(style, clone.firstChild);
        if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
        saveFile(blob, 'markmap-mindmap.svg', 'SVG 圖片', { 'image/svg+xml': ['.svg'] });
    });

    // 3. 下載互動式 HTML（title 與存檔檔名一致，且同步配色、展開/收合與五項控制功能）
    DOM.btnDownload.addEventListener('click', () => {
        const state = getExportState();
        const currentExpand = DOM.selExpand ? DOM.selExpand.value : '-1';
        const currentColor = DOM.selColor ? DOM.selColor.value : '-1';
        const foldedPathsJson = JSON.stringify(state.foldedPaths || []);
        const initTransform = state.transform || { x: 0, y: 0, k: 1 };

        const endTag = '<' + '/script>';
        const mdContent = cmEditor.getValue()
            .replace(new RegExp(endTag, 'gi'), '&lt;/script&gt;')
            .replace(/\xA0/g, ' ');

        const defaultFilename = 'markmap.html';

        // 透過 Builder 函式接收使用者在另存新檔視窗最終確認的檔名 (baseTitle 為去除 .html 的名稱)
        const buildHtml = (finalFilename, baseTitle) => {
            const safeTitle = (baseTitle || finalFilename || 'markmap')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <script>
        // 若使用者下載後在作業系統重新命名了檔案，開啟時自動將網頁 title 同步為最新檔名
        (function() {
            try {
                var path = decodeURIComponent(window.location.pathname || '');
                var file = path.split('/').pop().split('\\\\').pop();
                if (file && /\\.html?$/i.test(file)) {
                    document.title = file.replace(/\\.html?$/i, '');
                }
            } catch (e) {}
        })();
    ${endTag}
    <script src="https://cdn.tailwindcss.com">${endTag}
    <script src="https://cdn.jsdelivr.net/npm/d3@7">${endTag}
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js">${endTag}
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js">${endTag}
    <style>
        body { margin: 0; overflow: hidden; background: #ffffff; font-family: system-ui, -apple-system, 'Noto Sans TC', sans-serif; }
        svg#mindmap { width: 100vw; height: 100vh; display: block; }
        .markmap-link { fill: none; }
        .markmap-node circle { cursor: pointer; }
        foreignObject { overflow: visible; }
    </style>
</head>
<body class="relative w-screen h-screen overflow-hidden select-none">

    <!-- 左上角：展開層級與色彩設定控制面板 -->
    <div class="fixed top-4 left-4 z-20 flex items-center gap-2 md:gap-3 bg-blue-800 text-white p-1.5 md:p-2 rounded-xl shadow-md backdrop-blur-sm border border-white/20">
        <div class="flex items-center gap-1 md:gap-2">
            <label for="sel-expand" class="text-xs md:text-sm font-medium px-1 whitespace-nowrap">展開</label>
            <select id="sel-expand" class="bg-white text-gray-800 text-xs md:text-sm rounded-lg px-2 py-1.5 md:px-3 md:py-2 outline-none cursor-pointer focus:ring-2 focus:ring-blue-400 font-medium shadow-sm transition-all">
                <option value="-1">依文本設定</option>
                <option value="1">第 1 層</option>
                <option value="2">第 2 層</option>
                <option value="3">第 3 層</option>
                <option value="4">第 4 層</option>
                <option value="5">第 5 層</option>
                <option value="999">全部展開</option>
            </select>
        </div>

        <div class="w-px h-6 bg-white/30"></div>

        <div class="flex items-center gap-1 md:gap-2">
            <label for="sel-color" class="text-xs md:text-sm font-medium px-1 whitespace-nowrap">色彩</label>
            <select id="sel-color" class="bg-white text-gray-800 text-xs md:text-sm rounded-lg px-2 py-1.5 md:px-3 md:py-2 outline-none cursor-pointer focus:ring-2 focus:ring-blue-400 font-medium shadow-sm transition-all">
                <option value="-1">依文本設定</option>
                <option value="0">不凍結</option>
                <option value="1">第 1 層</option>
                <option value="2">第 2 層</option>
                <option value="3">第 3 層</option>
                <option value="4">第 4 層</option>
                <option value="5">第 5 層</option>
            </select>
        </div>
    </div>

    <!-- 全螢幕心智圖畫布 -->
    <svg id="mindmap" class="w-full h-full cursor-grab active:cursor-grabbing"></svg>

    <!-- 右下角：浮動縮放控制列 (適應螢幕/恢復視角、放大、縮小) -->
    <div class="fixed bottom-6 right-6 flex items-center gap-2 bg-white/80 p-1.5 rounded-2xl shadow-sm border border-slate-200 backdrop-blur-md z-20">
        <button id="btn-fit" class="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-full text-sm font-medium transition-all shadow-sm" title="將心智圖縮放至畫面中間，或恢復原視角">
            ⛶ <span id="fit-text">適應螢幕</span>
        </button>
        <div class="w-px h-5 bg-slate-300 ml-1 mr-0.5"></div>
        <button id="btn-zoom-in" class="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-full text-sm font-medium transition-all shadow-sm" title="放大">🔍 放大</button>
        <button id="btn-zoom-out" class="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-full text-sm font-medium transition-all shadow-sm" title="縮小">🔍 縮小</button>
    </div>

    <script type="text/template" id="md-content">${mdContent}${endTag}

    <script type="module">
        import * as markmapLib from "https://cdn.jsdelivr.net/npm/markmap-lib@0.18.9/+esm";
        import * as markmapView from "https://cdn.jsdelivr.net/npm/markmap-view@0.18.9/+esm";
        import * as markmapCommon from "https://cdn.jsdelivr.net/npm/markmap-common@0.18.9/+esm";

        window.markmap = { ...markmapCommon, ...markmapView, ...markmapLib };
        const { Transformer, Markmap, loadCSS, loadJS, deriveOptions } = window.markmap;
        const transformer = new Transformer();

        const svgEl = document.getElementById("mindmap");
        const selExpand = document.getElementById("sel-expand");
        const selColor = document.getElementById("sel-color");
        const btnFit = document.getElementById("btn-fit");
        const fitText = document.getElementById("fit-text");
        const btnZoomIn = document.getElementById("btn-zoom-in");
        const btnZoomOut = document.getElementById("btn-zoom-out");
        const rawMarkdown = document.getElementById("md-content").textContent;

        // 還原匯出當下的選單設定與視角狀態
        selExpand.value = "${currentExpand}";
        selColor.value = "${currentColor}";
        const initialFoldedPaths = ${foldedPathsJson};
        const initialTransform = { x: ${initTransform.x || 0}, y: ${initTransform.y || 0}, k: ${initTransform.k || 1} };

        let mm = null;
        let currentOptionsStr = "";
        let isFitted = false;
        let prevTransform = d3.zoomIdentity.translate(initialTransform.x, initialTransform.y).scale(initialTransform.k);

        const renderLatexInMindmap = () => {
            if (!svgEl || typeof window.renderMathInElement !== "function") return;
            const nodes = svgEl.querySelectorAll("foreignObject div");
            nodes.forEach((node) => {
                if (node.textContent && (node.textContent.includes("$") || node.textContent.includes("\\\\(") || node.textContent.includes("\\\\["))) {
                    window.renderMathInElement(node, {
                        delimiters: [
                            { left: "$$", right: "$$", display: true },
                            { left: "$", right: "$", display: false },
                            { left: "\\\\(", right: "\\\\)", display: false },
                            { left: "\\\\[", right: "\\\\]", display: true }
                        ],
                        throwOnError: false,
                        strict: false
                    });
                }
            });
        };

        const updateMindmap = async (isInitialLoad = false) => {
            const { root, features, frontmatter } = transformer.transform(rawMarkdown);

            const { styles, scripts } = transformer.getUsedAssets(features);
            if (styles) loadCSS(styles);
            if (scripts) {
                await loadJS(scripts, {
                    getMarkmap: () => window.markmap,
                    get extra() { return { katex: window.katex }; }
                });
            }

            const optionsRaw = frontmatter?.markmap || {};
            const uiExpand = parseInt(selExpand.value, 10);
            const uiColor = parseInt(selColor.value, 10);

            if (uiExpand !== -1) optionsRaw.initialExpandLevel = uiExpand;
            if (uiColor !== -1) optionsRaw.colorFreezeLevel = uiColor;

            const optionsStr = JSON.stringify(optionsRaw);
            const optionsChanged = currentOptionsStr !== optionsStr;
            let finalOptions = typeof deriveOptions === "function" ? deriveOptions(optionsRaw) : {};

            // 1. 初次載入時，100% 還原使用者在即時預覽視窗的展開/收合節點狀態 (foldedPaths)
            if (isInitialLoad && Array.isArray(initialFoldedPaths)) {
                const applyFoldedPaths = (node, paths, path = "0") => {
                    if (!node.payload) node.payload = {};
                    node.payload.fold = paths.includes(path) ? 1 : 0;
                    if (node.children) node.children.forEach((c, i) => applyFoldedPaths(c, paths, \`\${path}-\${i}\`));
                };
                applyFoldedPaths(root, initialFoldedPaths);
            } else if (optionsRaw.initialExpandLevel !== undefined && (optionsChanged || !mm)) {
                const level = optionsRaw.initialExpandLevel;
                const applyExpand = (node, currentDepth) => {
                    if (!node.payload) node.payload = {};
                    node.payload.fold = currentDepth >= level ? 1 : 0;
                    if (node.children) node.children.forEach((c, i) => applyExpand(c, currentDepth + 1));
                };
                applyExpand(root, 0);
            }

            // 2. 與 renderer.js 完全一致的色彩凍結邏輯
            if (!finalOptions.color && optionsRaw.colorFreezeLevel !== undefined) {
                const freezeLevel = optionsRaw.colorFreezeLevel;
                const colors = ['#00508C', '#00A0E9', '#00B2A9', '#F39200', '#E60012', '#71C5E8', '#C4D600', '#8A8D8F'];
                finalOptions.color = (node) => colors[Math.min(node.depth, freezeLevel) % colors.length];
            }

            if (!mm) {
                currentOptionsStr = optionsStr;
                mm = Markmap.create(svgEl, finalOptions, root);
                renderLatexInMindmap();
                const d3Transform = d3.zoomIdentity.translate(initialTransform.x, initialTransform.y).scale(initialTransform.k);
                setTimeout(() => d3.select(svgEl).call(mm.zoom.transform, d3Transform), 50);
            } else {
                currentOptionsStr = optionsStr;
                mm.destroy();
                svgEl.innerHTML = "";
                mm = Markmap.create(svgEl, finalOptions, root);
                renderLatexInMindmap();
                mm.fit();
                isFitted = true;
                fitText.innerText = "恢復視角";
            }
        };

        // 綁定五種預覽控制功能
        selExpand.addEventListener("change", () => updateMindmap(false));
        selColor.addEventListener("change", () => updateMindmap(false));

        btnFit.addEventListener("click", () => {
            if (!mm) return;
            if (isFitted && prevTransform) {
                d3.select(svgEl).transition().duration(300).call(mm.zoom.transform, prevTransform);
                isFitted = false;
                fitText.innerText = "適應螢幕";
            } else {
                prevTransform = d3.zoomTransform(svgEl);
                mm.fit();
                isFitted = true;
                fitText.innerText = "恢復視角";
            }
        });

        btnZoomIn.addEventListener("click", () => {
            if (!mm) return;
            d3.select(svgEl).transition().duration(300).call(mm.zoom.scaleBy, 1.2);
            isFitted = false;
            fitText.innerText = "適應螢幕";
        });

        btnZoomOut.addEventListener("click", () => {
            if (!mm) return;
            d3.select(svgEl).transition().duration(300).call(mm.zoom.scaleBy, 0.8);
            isFitted = false;
            fitText.innerText = "適應螢幕";
        });

        svgEl.addEventListener("click", () => setTimeout(renderLatexInMindmap, 50));
        const resetFit = () => {
            if (isFitted) {
                isFitted = false;
                fitText.innerText = "適應螢幕";
            }
        };
        svgEl.addEventListener("mousedown", resetFit);
        svgEl.addEventListener("wheel", resetFit);
        svgEl.addEventListener("touchstart", resetFit);

        updateMindmap(true);
    ${endTag}
</body>
</html>`;
        };

        saveFile(buildHtml, defaultFilename, 'HTML', { 'text/html': ['.html'] });
    });

    // 4. 匯入檔案 (僅供線上編輯器使用)
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