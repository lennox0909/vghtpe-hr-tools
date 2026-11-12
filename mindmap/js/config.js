export const DOM = {
    selExpand: document.getElementById('sel-expand'),
    selColor: document.getElementById('sel-color'),
    btnToggleEditor: document.getElementById('btn-toggle-editor'),
    editorPane: document.getElementById('editor-pane'),
    resizer: document.getElementById('resizer'),
    
    // 👇 更新為 CodeMirror 6 掛載用的容器
    editorContainer: document.getElementById('editor-container'),
    
    svgEl: document.getElementById('mindmap'),
    btnFit: document.getElementById('btn-fit'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    fitText: document.getElementById('fit-text'),
    btnInsertFold: document.getElementById('btn-insert-fold'),
    btnIndentLess: document.getElementById('btn-indent-less'),
    btnIndentMore: document.getElementById('btn-indent-more'),

    // 保留觸發 CM6 內建搜尋面板的放大鏡按鈕
    btnSearchToggle: document.getElementById('btn-search-toggle'),

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