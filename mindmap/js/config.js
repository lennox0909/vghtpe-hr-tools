export const DOM = {
    selExpand: document.getElementById('sel-expand'),
    selColor: document.getElementById('sel-color'),
    btnToggleEditor: document.getElementById('btn-toggle-editor'),
    editorPane: document.getElementById('editor-pane'),
    resizer: document.getElementById('resizer'),
    editor: document.getElementById('editor'),
    svgEl: document.getElementById('mindmap'),
    btnFit: document.getElementById('btn-fit'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    fitText: document.getElementById('fit-text'),
    btnInsertFold: document.getElementById('btn-insert-fold'),
    btnIndentLess: document.getElementById('btn-indent-less'),
    btnIndentMore: document.getElementById('btn-indent-more'),

    // 搜尋面板相關 DOM
    btnSearchToggle: document.getElementById('btn-search-toggle'),
    searchPanel: document.getElementById('search-panel'),
    searchPanelHeader: document.getElementById('search-panel-header'),
    btnToggleReplace: document.getElementById('btn-toggle-replace'),
    iconReplaceChevron: document.getElementById('icon-replace-chevron'),
    inputFind: document.getElementById('input-find'),
    inputReplace: document.getElementById('input-replace'),
    btnFindPrev: document.getElementById('btn-find-prev'),
    btnFindNext: document.getElementById('btn-find-next'),
    btnCloseSearch: document.getElementById('btn-close-search'),
    replaceRow: document.getElementById('replace-row'),
    btnReplace: document.getElementById('btn-replace'),
    btnReplaceAll: document.getElementById('btn-replace-all'),

    btnDownload: document.getElementById('btn-download'),
    btnDownloadMd: document.getElementById('btn-download-md'),
    saveStatus: document.getElementById('save-status'),
    btnClearEditor: document.getElementById('btn-clear-editor'),
    btnImportFile: document.getElementById('btn-import-file'),
    fileImport: document.getElementById('file-import'),
    mainContainer: document.getElementById('main-container')
};

export const STORAGE_KEY = 'vghtpe_markmap_content';
export const VIEWSTATE_KEY = 'vghtpe_markmap_viewstate';