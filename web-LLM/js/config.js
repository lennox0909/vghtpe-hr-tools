export const DOM = {
    modelSelect: document.getElementById('model-select'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsPanel: document.getElementById('settings-panel'),
    tempSlider: document.getElementById('temp-slider'),
    tempVal: document.getElementById('temp-val'),
    topPSlider: document.getElementById('top-p-slider'),
    topPVal: document.getElementById('top-p-val'),
    loadBtn: document.getElementById('load-btn'),
    loadBtnText: document.getElementById('load-btn-text'),
    loadBtnIcon: document.getElementById('load-btn-icon'),
    errorBanner: document.getElementById('error-banner'),
    errorText: document.getElementById('error-text'),
    chatContainer: document.getElementById('chat-container'),
    messagesArea: document.getElementById('messages-area'),
    emptyState: document.getElementById('empty-state'),
    loadingIndicator: document.getElementById('loading-indicator'),
    progressText: document.getElementById('progress-text'),
    micBtn: document.getElementById('mic-btn'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    sendIconDefault: document.getElementById('send-icon-default'),
    sendIconLoading: document.getElementById('send-icon-loading'),
    sendIconStop: document.getElementById('send-icon-stop'),
    continueWrapper: document.getElementById('continue-wrapper'),
    continueBtn: document.getElementById('continue-btn'),
};

// 新增：定義系統預設提示詞 (System Prompt)
export const SYSTEM_PROMPT = `你是一個名為「北榮 AI 助理」的得力助手，隸屬於臺北榮民總醫院人事室。
請遵守以下原則：
1. 一律使用繁體中文（zh-TW）回答。
2. 語氣保持專業、客觀且親切。
3. 若使用者詢問與醫療診斷相關的問題，請提醒使用者「本助理僅提供一般性建議與行政庶務解答，無法取代專業醫師診斷，請尋求正規醫療協助」。`;