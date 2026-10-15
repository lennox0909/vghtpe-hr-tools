package main

import (
	"regexp"
	"strings"
	"syscall/js"
)

// 預先編譯好正則表達式，提升效能 (忽略大小寫比對 </script>)
var scriptTagRegex = regexp.MustCompile(`(?i)</script>`)

func buildHtml(this js.Value, args []js.Value) any {
	if len(args) < 9 {
		return ""
	}

	rawMarkdown := args[0].String()
	finalFilename := args[1].String()
	baseTitle := args[2].String()
	currentExpand := args[3].String()
	currentColor := args[4].String()
	foldedPathsJson := args[5].String()
	transformX := args[6].String()
	transformY := args[7].String()
	transformK := args[8].String()

	// 1. 處理 Markdown 文本：替換 </script> 避免 XSS 中斷，並將 \xA0 (Non-breaking space) 轉為一般空白
	mdContent := scriptTagRegex.ReplaceAllString(rawMarkdown, "&lt;/script&gt;")
	mdContent = strings.ReplaceAll(mdContent, "\u00A0", " ")

	// 2. 處理 Title：進行安全的 HTML 脫逸
	title := baseTitle
	if title == "" {
		title = finalFilename
	}
	if title == "" {
		title = "markmap"
	}
	safeTitle := strings.ReplaceAll(title, "&", "&amp;")
	safeTitle = strings.ReplaceAll(safeTitle, "<", "&lt;")
	safeTitle = strings.ReplaceAll(safeTitle, ">", "&gt;")

	endTag := "</script>"

	// 3. 準備 HTML 模板
	htmlTemplate := `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <script>
        (function() {
            try {
                var path = decodeURIComponent(window.location.pathname || '');
                var file = path.split('/').pop().split('\\\\').pop();
                if (file && /\\.html?$/i.test(file)) {
                    document.title = file.replace(/\\.html?$/i, '');
                }
            } catch (e) {}
        })();
    {{END_TAG}}
    <script src="https://cdn.tailwindcss.com">{{END_TAG}}
    <script src="https://cdn.jsdelivr.net/npm/d3@7">{{END_TAG}}
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js">{{END_TAG}}
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js">{{END_TAG}}
    <style>
        body { margin: 0; overflow: hidden; background: #ffffff; font-family: system-ui, -apple-system, 'Noto Sans TC', sans-serif; }
        svg#mindmap { width: 100vw; height: 100vh; display: block; }
        .markmap-link { fill: none; pointer-events: none !important; }
        foreignObject { overflow: visible; pointer-events: none !important; }
        /* 修復 Safari WebKit foreignObject 座標脫離問題 */
        foreignObject > div { pointer-events: none !important; position: relative; transform: translateZ(0); -webkit-transform: translateZ(0); }
        foreignObject a, foreignObject input, foreignObject button, foreignObject .katex, foreignObject .katex * { pointer-events: auto !important; cursor: pointer; }
        .markmap-node circle { cursor: pointer !important; pointer-events: all !important; }
    </style>
</head>
<body class="relative w-screen h-screen overflow-hidden select-none">

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

    <svg id="mindmap" class="w-full h-full cursor-grab active:cursor-grabbing"></svg>

    <div class="fixed bottom-6 right-6 flex items-center gap-2 bg-white/80 p-1.5 rounded-2xl shadow-sm border border-slate-200 backdrop-blur-md z-20">
        <button id="btn-fit" class="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-full text-sm font-medium transition-all shadow-sm" title="將心智圖縮放至畫面中間，或恢復原視角">
            ⛶ <span id="fit-text">適應螢幕</span>
        </button>
        <div class="w-px h-5 bg-slate-300 ml-1 mr-0.5"></div>
        <button id="btn-zoom-in" class="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-full text-sm font-medium transition-all shadow-sm" title="放大">🔍 放大</button>
        <button id="btn-zoom-out" class="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-full text-sm font-medium transition-all shadow-sm" title="縮小">🔍 縮小</button>
    </div>

    <script type="text/template" id="md-content">{{MD_CONTENT}}{{END_TAG}}

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

        selExpand.value = "{{EXPAND}}";
        selColor.value = "{{COLOR}}";
        const initialFoldedPaths = {{FOLDED_PATHS}};
        const initialTransform = { x: {{TX}}, y: {{TY}}, k: {{TK}} };

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

            if (isInitialLoad && Array.isArray(initialFoldedPaths)) {
                const applyFoldedPaths = (node, paths, path) => {
                    if (!node.payload) node.payload = {};
                    node.payload.fold = paths.includes(path) ? 1 : 0;
                    if (node.children) node.children.forEach((c, i) => applyFoldedPaths(c, paths, path + "-" + i));
                };
                applyFoldedPaths(root, initialFoldedPaths, "0");
            } else if (optionsRaw.initialExpandLevel !== undefined && (optionsChanged || !mm)) {
                const level = optionsRaw.initialExpandLevel;
                const applyExpand = (node, currentDepth) => {
                    if (!node.payload) node.payload = {};
                    node.payload.fold = currentDepth >= level ? 1 : 0;
                    if (node.children) node.children.forEach((c, i) => applyExpand(c, currentDepth + 1));
                };
                applyExpand(root, 0);
            }

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
    {{END_TAG}}
</body>
</html>`

	// 4. 將預置好的標籤安全替換為實際內容
	htmlTemplate = strings.ReplaceAll(htmlTemplate, "{{TITLE}}", safeTitle)
	htmlTemplate = strings.ReplaceAll(htmlTemplate, "{{MD_CONTENT}}", mdContent)
	htmlTemplate = strings.ReplaceAll(htmlTemplate, "{{END_TAG}}", endTag)
	htmlTemplate = strings.ReplaceAll(htmlTemplate, "{{EXPAND}}", currentExpand)
	htmlTemplate = strings.ReplaceAll(htmlTemplate, "{{COLOR}}", currentColor)
	htmlTemplate = strings.ReplaceAll(htmlTemplate, "{{FOLDED_PATHS}}", foldedPathsJson)
	htmlTemplate = strings.ReplaceAll(htmlTemplate, "{{TX}}", transformX)
	htmlTemplate = strings.ReplaceAll(htmlTemplate, "{{TY}}", transformY)
	htmlTemplate = strings.ReplaceAll(htmlTemplate, "{{TK}}", transformK)

	return htmlTemplate
}

func main() {
	c := make(chan struct{})
	js.Global().Set("goBuildHtml", js.FuncOf(buildHtml))
	<-c
}