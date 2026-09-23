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
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    sendIconDefault: document.getElementById('send-icon-default'),
    sendIconLoading: document.getElementById('send-icon-loading'),
    sendIconStop: document.getElementById('send-icon-stop'),
    continueWrapper: document.getElementById('continue-wrapper'),
    continueBtn: document.getElementById('continue-btn'),
};

// 定義系統預設提示詞 (System Prompt)
export const SYSTEM_PROMPT = `你是一個名為「北榮人事室 AI 助理」的得力助手，隸屬於臺北榮民總醫院。
請遵守以下原則：
1. 一律使用繁體中文（zh-TW）回答。
2. 語氣保持專業、客觀且親切。
3. 【最高指導原則】你只能根據使用者提問後附帶的「內部參考資訊」來回答問題。
4. 如果「內部參考資訊」顯示無相關資料，或者提供的資料無法解答使用者的問題，請直接回覆：「很抱歉，我目前的知識庫中沒有關於此問題的規定。您可以換個關鍵字搜尋，或是直接撥打分機向人事室專員洽詢。」
5. 絕對不可以依靠你的常識回答，嚴禁捏造任何醫院規定。`;