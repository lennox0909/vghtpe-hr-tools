import * as markmapLib from 'https://cdn.jsdelivr.net/npm/markmap-lib@0.18.9/+esm';
import * as markmapView from 'https://cdn.jsdelivr.net/npm/markmap-view@0.18.9/+esm';
import * as markmapCommon from 'https://cdn.jsdelivr.net/npm/markmap-common@0.18.9/+esm';
import { DOM, VIEWSTATE_KEY } from './config.js';

window.markmap = { ...markmapCommon, ...markmapView, ...markmapLib };
const { Transformer, Markmap, loadCSS, loadJS, deriveOptions } = window.markmap;
const transformer = new Transformer();

let mm;
let currentRoot = null;
let currentOptionsStr = '';
let isFitted = false;
let prevTransform = null;
let viewStateTimeout;

/**
 * 針對心智圖 SVG 內的 foreignObject 節點執行 KaTeX 公式渲染補全
 */
const renderLatexInMindmap = () => {
    if (!DOM.svgEl || typeof window.renderMathInElement !== 'function') return;
    const nodes = DOM.svgEl.querySelectorAll('foreignObject div');
    nodes.forEach((node) => {
        // 若節點內仍含有未轉換的 $ 或 \( 語法，觸發 auto-render
        if (node.textContent && (node.textContent.includes('$') || node.textContent.includes('\\(') || node.textContent.includes('\\['))) {
            window.renderMathInElement(node, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false,
                strict: false
            });
        }
    });
};

export const getExportState = () => {
    const getFoldedPaths = (node, path = "0", folded = []) => {
        if (node?.payload?.fold === 1) folded.push(path);
        if (node?.children) node.children.forEach((c, i) => getFoldedPaths(c, `${path}-${i}`, folded));
        return folded;
    };
    return {
        foldedPaths: currentRoot ? getFoldedPaths(currentRoot) : [],
        transform: window.d3.zoomTransform(DOM.svgEl),
        uiColor: parseInt(DOM.selColor.value, 10)
    };
};

export const saveViewState = () => {
    if (!mm || !currentRoot) return;
    const state = { ...getExportState(), isFitted };
    localStorage.setItem(VIEWSTATE_KEY, JSON.stringify(state));
};

export const debounceSaveViewState = () => {
    clearTimeout(viewStateTimeout);
    viewStateTimeout = setTimeout(saveViewState, 500);
};

export const updateMindmap = async (markdown, isInitialLoad = false) => {
    try {
        const safeMarkdown = markdown.replace(/\xA0/g, ' ');
        const { root, features, frontmatter } = transformer.transform(safeMarkdown);
        currentRoot = root;

        const { styles, scripts } = transformer.getUsedAssets(features);
        if (styles) loadCSS(styles);
        if (scripts) {
            await loadJS(scripts, {
                getMarkmap: () => window.markmap,
                get extra() { return { katex: window.katex }; }
            });
        }

        const optionsRaw = frontmatter?.markmap || {};
        const uiExpand = parseInt(DOM.selExpand.value, 10);
        const uiColor = parseInt(DOM.selColor.value, 10);

        if (uiExpand !== -1) optionsRaw.initialExpandLevel = uiExpand;
        if (uiColor !== -1) optionsRaw.colorFreezeLevel = uiColor;

        const optionsStr = JSON.stringify(optionsRaw);
        const optionsChanged = currentOptionsStr !== optionsStr;
        let finalOptions = typeof deriveOptions === 'function' ? deriveOptions(optionsRaw) : {};

        let savedViewState = null;
        if (isInitialLoad) {
            try { savedViewState = JSON.parse(localStorage.getItem(VIEWSTATE_KEY)); } catch (e) {}
        }

        if (isInitialLoad && savedViewState?.foldedPaths) {
            const applyFoldedPaths = (node, paths, path = "0") => {
                if (!node.payload) node.payload = {};
                node.payload.fold = paths.includes(path) ? 1 : 0;
                if (node.children) node.children.forEach((c, i) => applyFoldedPaths(c, paths, `${path}-${i}`));
            };
            applyFoldedPaths(root, savedViewState.foldedPaths);
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
            mm = Markmap.create(DOM.svgEl, finalOptions, root);
            renderLatexInMindmap();
            if (isInitialLoad && savedViewState?.transform) {
                const t = savedViewState.transform;
                const d3Transform = window.d3.zoomIdentity.translate(t.x, t.y).scale(t.k);
                setTimeout(() => window.d3.select(DOM.svgEl).call(mm.zoom.transform, d3Transform), 50);
                isFitted = savedViewState.isFitted || false;
                DOM.fitText.innerText = isFitted ? '恢復視角' : '適應螢幕';
                if (!isFitted) prevTransform = t;
            } else {
                mm.fit();
                isFitted = true;
                DOM.fitText.innerText = '恢復視角';
            }
        } else if (optionsChanged) {
            currentOptionsStr = optionsStr;
            mm.destroy();
            DOM.svgEl.innerHTML = '';
            mm = Markmap.create(DOM.svgEl, finalOptions, root);
            renderLatexInMindmap();
            mm.fit();
            isFitted = true;
            DOM.fitText.innerText = '恢復視角';
            prevTransform = null;
        } else {
            await mm.setData(root);
            renderLatexInMindmap();
        }
    } catch (error) { console.error("渲染錯誤:", error); }
};

export const fitMindmap = () => {
    if (!mm) return;
    if (isFitted && prevTransform) {
        window.d3.select(DOM.svgEl).transition().duration(300).call(mm.zoom.transform, prevTransform);
        isFitted = false;
        DOM.fitText.innerText = '適應螢幕';
    } else {
        prevTransform = window.d3.zoomTransform(DOM.svgEl);
        mm.fit();
        isFitted = true;
        DOM.fitText.innerText = '恢復視角';
    }
    debounceSaveViewState();
};

export const zoomMindmap = (scale) => {
    if (!mm) return;
    window.d3.select(DOM.svgEl).transition().duration(300).call(mm.zoom.scaleBy, scale);
    isFitted = false;
    DOM.fitText.innerText = '適應螢幕';
    debounceSaveViewState();
};

DOM.svgEl.addEventListener('click', () => {
    setTimeout(renderLatexInMindmap, 50);
    debounceSaveViewState();
});
const resetFit = () => { if (isFitted) { isFitted = false; DOM.fitText.innerText = '適應螢幕'; } debounceSaveViewState(); };
DOM.svgEl.addEventListener('mousedown', resetFit);
DOM.svgEl.addEventListener('wheel', resetFit);
DOM.svgEl.addEventListener('touchstart', resetFit);