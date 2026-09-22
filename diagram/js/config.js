export const DOM = {
    editor: document.getElementById('editor'),
    preview: document.getElementById('preview'),
    clearBtn: document.getElementById('clearBtn'),
    resizer: document.getElementById('resizer'),
    editorPane: document.getElementById('editor-pane'),
    mainContainer: document.getElementById('main-container'),
    saveStatus: document.getElementById('save-status'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    sunIcon: document.getElementById('sunIcon'),
    moonIcon: document.getElementById('moonIcon'),
    editorToggleBtn: document.getElementById('editorToggleBtn'),
    sidebarOpenIcon: document.getElementById('sidebarOpenIcon'),
    sidebarClosedIcon: document.getElementById('sidebarClosedIcon'),
    importBtn: document.getElementById('import-btn'),
    importInput: document.getElementById('import-input'),
    exportMdBtn: document.getElementById('export-md-btn'),
    exportTxtBtn: document.getElementById('export-txt-btn'),
    toastContainer: document.getElementById('toast-container'),
    modal: {
        container: document.getElementById('filename-modal'),
        title: document.getElementById('modal-title'),
        desc: document.getElementById('modal-desc'),
        input: document.getElementById('filename-input'),
        extLabel: document.getElementById('filename-ext'),
        confirmBtn: document.getElementById('modal-confirm'),
        cancelBtn: document.getElementById('modal-cancel')
    }
};

export const STORAGE_KEY = 'vghtpe_mermaid_editor_content';