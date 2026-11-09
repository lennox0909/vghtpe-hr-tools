import { DOM, STORAGE_KEY } from './config.js';
import { initLayout } from './layout.js';
import { updateMindmap, fitMindmap, zoomMindmap } from './renderer.js';
import { initFileIO } from './file-io.js';
import { showModal } from './modal.js';

const cmEditor = CodeMirror.fromTextArea(DOM.editor, {
    lineNumbers: true, mode: 'markdown', lineWrapping: true, tabSize: 2,
    extraKeys: { 
        "Tab": (cm) => cm.somethingSelected() ? cm.indentSelection("add") : cm.replaceSelection("  ", "end", "+input"),
        //  攔截 Ctrl+F / Cmd+F 快捷鍵
        "Ctrl-F": openSearchPanel,
        "Cmd-F": openSearchPanel
    }
});

let timeout;
let saveTimeout;
const debounceUpdate = (markdown, isInitialLoad = false) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        updateMindmap(markdown, isInitialLoad);
        if (!isInitialLoad) {
            localStorage.setItem(STORAGE_KEY, markdown);
            DOM.saveStatus?.classList.remove('opacity-0');
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => DOM.saveStatus.classList.add('opacity-0'), 2000);
        }
    }, isInitialLoad ? 0 : 300);
};

cmEditor.on('change', () => debounceUpdate(cmEditor.getValue()));

DOM.btnClearEditor.addEventListener('click', async () => {
    if (await showModal('清除內容', '確定要清除編輯區內容嗎？', { confirmText: '確定', confirmColor: 'bg-red-500' })) {
        cmEditor.setValue(''); debounceUpdate(''); cmEditor.focus();
    }
});

// 👇 新增的「插入摺疊註記」按鈕 (獨立寫在下方)
if (DOM.btnInsertFold) {
    DOM.btnInsertFold.addEventListener('click', () => {
        cmEditor.replaceSelection('<!-- markmap: fold -->\n');
        cmEditor.focus();
    });
}

// 減少層級 (Outdent)
if (DOM.btnIndentLess) {
    DOM.btnIndentLess.addEventListener('click', () => {
        cmEditor.execCommand('indentLess'); // 呼叫 CodeMirror 內建減少縮排指令
        cmEditor.focus();
    });
}

// 增加層級 (Indent)
if (DOM.btnIndentMore) {
    DOM.btnIndentMore.addEventListener('click', () => {
        cmEditor.execCommand('indentMore'); // 呼叫 CodeMirror 內建增加縮排指令
        cmEditor.focus();
    });
}


DOM.selExpand.addEventListener('change', () => debounceUpdate(cmEditor.getValue()));
DOM.selColor.addEventListener('change', () => debounceUpdate(cmEditor.getValue()));
DOM.btnFit.addEventListener('click', fitMindmap);
DOM.btnZoomIn.addEventListener('click', () => zoomMindmap(1.2));
DOM.btnZoomOut.addEventListener('click', () => zoomMindmap(0.8));

// 【核心修復】：透過 ResizeObserver 監聽編輯器外層容器的大小變化
// 確保拖曳分隔線或縮放視窗時，CodeMirror 游標與渲染座標即時重置
const editorObserver = new ResizeObserver(() => {
    if (cmEditor && typeof cmEditor.refresh === 'function') {
        cmEditor.refresh();
    }
});

if (DOM.editorPane) {
    editorObserver.observe(DOM.editorPane);
}

// 啟動佈局與檔案 IO 事件
initLayout(cmEditor, fitMindmap);
initFileIO(cmEditor, debounceUpdate);

// 非同步載入初始內容：優先讀取 URL 參數，其次 LocalStorage，最後抓取 sample.txt
async function initEditor() {
    // 1. 檢查網址是否有帶入外部檔案參數 (例如: ?url=https://...)
    // const urlParams = new URLSearchParams(window.location.search);
    // const externalUrl = urlParams.get('url') || urlParams.get('source');

    // if (externalUrl) {
    //     try {
    //         // 嘗試載入外部指定的 Markdown 檔案
    //         const response = await fetch(externalUrl);
    //         if (!response.ok) throw new Error(`HTTP 狀態碼: ${response.status}`);
            
    //         const externalContent = await response.text();
    //         cmEditor.setValue(externalContent);
    //         debounceUpdate(externalContent, true);
            
    //         // 成功載入外部檔案後直接結束，不讀取 Local Storage
    //         // (視您的需求，也可以在這裡加上 localStorage.setItem 把這份外部檔案存起來)
    //         return; 
    //     } catch (error) {
    //         console.warn('載入外部 URL 失敗，退回本地預設流程 (可能是 CORS 跨域限制或網址無效):', error);
    //         // 若失敗，不中斷程式，繼續往下執行 Local Storage 讀取流程
    //     }
    // }

    // 2. 原本的邏輯：讀取 Local Storage
    const savedContent = localStorage.getItem(STORAGE_KEY);
    if (savedContent) {
        cmEditor.setValue(savedContent);
        debounceUpdate(savedContent, true);
    } else {
        // 3. 原本的邏輯：讀取預設 sample.txt
        try {
            const targetUrl = window.MARKMAP_SAMPLE_URL || './sample.txt';
            const response = await fetch(targetUrl);
            if (!response.ok) throw new Error(`無法載入 ${targetUrl}`);
            const defaultContent = await response.text();
            cmEditor.setValue(defaultContent);
            debounceUpdate(defaultContent, true);
        } catch (error) {
            console.warn(error);
            const fallbackContent = `# 歡迎使用心智圖編輯器\n- **即時預覽**：左側編輯，右側立即顯示結果`;
            cmEditor.setValue(fallbackContent);
            debounceUpdate(fallbackContent, true);
        }
    }
}

initEditor();

// --- 尋找與取代 (記事本風格) 模組 ---
let searchCursor = null;
let lastQuery = '';

function openSearchPanel() {
    DOM.searchPanel.classList.remove('hidden');
    // 如果編輯區目前有反白文字，自動填入尋找框
    if (cmEditor.somethingSelected()) {
        const selection = cmEditor.getSelection();
        if (selection.indexOf('\n') === -1) DOM.inputFind.value = selection;
    }
    DOM.inputFind.focus();
    DOM.inputFind.select();
}

function closeSearchPanel() {
    DOM.searchPanel.classList.add('hidden');
    cmEditor.focus();
}

function findNext(reverse = false) {
    const query = DOM.inputFind.value;
    if (!query) return;
    
    // 當搜尋詞改變或游標消失時，重新建立搜尋游標 (預設不區分大小寫)
    if (query !== lastQuery || !searchCursor) {
        searchCursor = cmEditor.getSearchCursor(query);
        lastQuery = query;
    }

    let found = reverse ? searchCursor.findPrevious() : searchCursor.findNext();
    
    // 如果找不到，從頭(或尾)再找一次達成循環 (Wrap around)
    if (!found) {
        searchCursor = cmEditor.getSearchCursor(query);
        found = reverse ? searchCursor.findPrevious() : searchCursor.findNext();
    }

    // 找到目標，選取該文字並捲動到可視範圍
    if (found) {
        cmEditor.setSelection(searchCursor.from(), searchCursor.to());
        cmEditor.scrollIntoView({from: searchCursor.from(), to: searchCursor.to()}, 50);
    }
}

function replaceCurrent() {
    const query = DOM.inputFind.value;
    const replaceText = DOM.inputReplace.value;
    if (!query) return;
    
    // 檢查目前反白的文字是否符合搜尋目標，如果符合就替換，並直接跳下一個
    if (cmEditor.somethingSelected() && cmEditor.getSelection().toLowerCase() === query.toLowerCase()) {
        cmEditor.replaceSelection(replaceText);
    }
    findNext();
}

function replaceAll() {
    const query = DOM.inputFind.value;
    const replaceText = DOM.inputReplace.value;
    if (!query) return;
    
    // operation 確保多次替換只算作「單一歷史紀錄」，支援一鍵 Undo(Ctrl+Z) 復原
    cmEditor.operation(() => {
        let cursor = cmEditor.getSearchCursor(query);
        while (cursor.findNext()) {
            cursor.replace(replaceText);
        }
    });
}

// 綁定 UI 點擊與按鍵事件
if (DOM.btnSearchToggle) DOM.btnSearchToggle.addEventListener('click', openSearchPanel);
if (DOM.btnCloseSearch) DOM.btnCloseSearch.addEventListener('click', closeSearchPanel);
if (DOM.btnFindNext) DOM.btnFindNext.addEventListener('click', () => findNext(false));
if (DOM.btnFindPrev) DOM.btnFindPrev.addEventListener('click', () => findNext(true));
if (DOM.btnReplace) DOM.btnReplace.addEventListener('click', replaceCurrent);
if (DOM.btnReplaceAll) DOM.btnReplaceAll.addEventListener('click', replaceAll);

// 展開/收合取代列 (與旋轉右箭頭動畫)
if (DOM.btnToggleReplace) {
    DOM.btnToggleReplace.addEventListener('click', () => {
        DOM.replaceRow.classList.toggle('hidden');
        DOM.iconReplaceChevron.classList.toggle('rotate-90');
    });
}

// 在尋找框按下 Enter 尋找下一個，Shift+Enter 尋找上一個
if (DOM.inputFind) {
    DOM.inputFind.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            findNext(e.shiftKey);
        } else if (e.key === 'Escape') {
            closeSearchPanel();
        }
    });
}

// --- 搜尋面板拖曳功能 ---
if (DOM.searchPanel && DOM.searchPanelHeader) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    DOM.searchPanelHeader.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        // 紀錄點擊初始位置，減去已經偏移的量
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        if (e.target === DOM.searchPanelHeader || e.target.closest('#search-panel-header')) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            // 計算新位置
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            // 套用位移 (不修改 absolute 的 top/left，而是用 CSS Transform 效能更好)
            DOM.searchPanel.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }
}