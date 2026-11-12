// assets/js/shared/editor-extensions.js

export function initEditorExtensions(cmEditor, DOM) {
    // --- 尋找與取代 (記事本風格) 模組 ---
    let searchCursor = null;
    let lastQuery = '';

    function openSearchPanel() {
        if (!DOM.searchPanel) return;
        DOM.searchPanel.classList.remove('hidden');
        if (cmEditor.somethingSelected()) {
            const selection = cmEditor.getSelection();
            if (selection.indexOf('\n') === -1) DOM.inputFind.value = selection;
        }
        DOM.inputFind.focus();
        DOM.inputFind.select();
    }

    function closeSearchPanel() {
        if (!DOM.searchPanel) return;
        DOM.searchPanel.classList.add('hidden');
        cmEditor.focus();
    }

    function findNext(reverse = false) {
        const query = DOM.inputFind.value;
        if (!query) return;
        
        if (query !== lastQuery || !searchCursor) {
            searchCursor = cmEditor.getSearchCursor(query);
            lastQuery = query;
        }

        let found = reverse ? searchCursor.findPrevious() : searchCursor.findNext();
        
        if (!found) {
            searchCursor = cmEditor.getSearchCursor(query);
            found = reverse ? searchCursor.findPrevious() : searchCursor.findNext();
        }

        if (found) {
            cmEditor.setSelection(searchCursor.from(), searchCursor.to());
            cmEditor.scrollIntoView({from: searchCursor.from(), to: searchCursor.to()}, 50);
        }
    }

    function replaceCurrent() {
        const query = DOM.inputFind.value;
        const replaceText = DOM.inputReplace.value;
        if (!query) return;
        
        if (cmEditor.somethingSelected() && cmEditor.getSelection().toLowerCase() === query.toLowerCase()) {
            cmEditor.replaceSelection(replaceText);
        }
        findNext();
    }

    function replaceAll() {
        const query = DOM.inputFind.value;
        const replaceText = DOM.inputReplace.value;
        if (!query) return;
        
        cmEditor.operation(() => {
            let cursor = cmEditor.getSearchCursor(query);
            while (cursor.findNext()) {
                cursor.replace(replaceText);
            }
        });
    }

    // 綁定 UI 點擊事件
    if (DOM.btnSearchToggle) DOM.btnSearchToggle.addEventListener('click', openSearchPanel);
    if (DOM.btnCloseSearch) DOM.btnCloseSearch.addEventListener('click', closeSearchPanel);
    if (DOM.btnFindNext) DOM.btnFindNext.addEventListener('click', () => findNext(false));
    if (DOM.btnFindPrev) DOM.btnFindPrev.addEventListener('click', () => findNext(true));
    if (DOM.btnReplace) DOM.btnReplace.addEventListener('click', replaceCurrent);
    if (DOM.btnReplaceAll) DOM.btnReplaceAll.addEventListener('click', replaceAll);

    if (DOM.btnToggleReplace) {
        DOM.btnToggleReplace.addEventListener('click', () => {
            DOM.replaceRow.classList.toggle('hidden');
            DOM.iconReplaceChevron.classList.toggle('rotate-90');
        });
    }

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

    // 暴露 openSearchPanel 給外部作為快捷鍵呼叫
    cmEditor.openSearchPanel = openSearchPanel;

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
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            if (e.target === DOM.searchPanelHeader || e.target.closest('#search-panel-header')) {
                isDragging = true;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                DOM.searchPanel.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        }

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }
    }
}