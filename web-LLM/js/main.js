import { DOM, SYSTEM_PROMPT } from './config.js';
import { updateUIState, showError, clearMessagesDOM, appendMessageToDOM, scrollToBottom } from './ui.js';
import { initEngine } from './engine.js';
import { initKnowledgeBase, searchRelevantQA } from './search.js'; // 引入檢索模組

let engine = null;
let status = 'idle';
let messageHistory = [];

// 在畫面載入時，非同步初始化知識庫
document.addEventListener('DOMContentLoaded', () => {
    initKnowledgeBase(window.FAQ_DATA_URL); // window.FAQ_DATA_URL 在 index.html 宣告
});

async function loadModel() {
    const selectedModel = DOM.modelSelect.value;
    status = 'loading';
    updateUIState(status);
    clearMessagesDOM();
    
    // 初始化對話歷史，僅放入基礎系統提示詞 (不再全量注入 QA)
    messageHistory = [ { role: 'system', content: SYSTEM_PROMPT } ];
    
    try {
        engine = await initEngine(selectedModel, (report) => {
            DOM.progressText.textContent = report.text;
        });
        status = 'ready';
        appendMessageToDOM('assistant', `✅ 已載入模型 **${selectedModel}**，並連結人事知識庫。`);
    } catch (err) {
        status = 'error';
        showError(`載入失敗：\n${err.message}`);
    } finally {
        updateUIState(status);
    }
}

async function sendMessage(isContinue = false) {
    let text = isContinue ? "請繼續未完成的回覆" : DOM.chatInput.value.trim();
    if (!isContinue && !text) return;
    
    if (!isContinue) {
        DOM.chatInput.value = '';
        DOM.chatInput.style.height = '48px';
    }

    // 1. 將使用者輸入顯示在畫面上
    appendMessageToDOM('user', text);
    
    // 2. 動態檢索知識庫 (動態 RAG)
    const context = searchRelevantQA(text);
    
    // 3. 將檢索結果與使用者提問合併，存入歷史紀錄 (模型會看到，但畫面不會顯示 context)
    const promptForModel = text + context;
    messageHistory.push({ role: 'user', content: promptForModel });
    
    status = 'generating';
    updateUIState(status);
    const aiTextBlock = appendMessageToDOM('assistant', "");

    try {
        const chunks = await engine.chat.completions.create({
            messages: messageHistory,
            stream: true,
            temperature: 0.1, // 降低隨機性，讓模型更精確引用資料
        });

        let fullReply = "";
        for await (const chunk of chunks) {
            fullReply += chunk.choices[0]?.delta?.content || "";
            aiTextBlock.textContent = fullReply;
            scrollToBottom();
        }
        
        // 將模型實際的回答存回歷史紀錄
        messageHistory.push({ role: 'assistant', content: fullReply });
    } catch (err) {
        aiTextBlock.textContent = "❌ 發生錯誤，無法生成回覆。";
    } finally {
        status = 'ready';
        updateUIState(status);
    }
}