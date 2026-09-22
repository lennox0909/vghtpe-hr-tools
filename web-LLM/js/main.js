import { DOM, SYSTEM_PROMPT } from './config.js';
import { updateUIState, showError, clearMessagesDOM, appendMessageToDOM, scrollToBottom } from './ui.js';
import { initSpeechRecognition } from './speech.js';
import { initEngine } from './engine.js';
import { initKnowledgeBase, searchRelevantQA } from './search.js';

let engine = null;
let status = 'idle'; // idle, loading, ready, generating
let messageHistory = [];
let wasInterrupted = false;

// 1. 初始化語音模組
const speech = initSpeechRecognition((isRec) => updateUIState(status, isRec, wasInterrupted));

// 2. 畫面載入時，初始化人事知識庫
document.addEventListener('DOMContentLoaded', () => {
    const dataUrl = window.FAQ_DATA_URL || './data/faq.json';
    initKnowledgeBase(dataUrl);
});

// 3. 載入模型邏輯
async function loadModel() {
    const selectedModel = DOM.modelSelect.value;
    status = 'loading';
    wasInterrupted = false;
    updateUIState(status, speech?.getIsRecording(), wasInterrupted);
    
    DOM.errorBanner.classList.add('hidden');
    DOM.emptyState.classList.add('hidden');
    DOM.settingsPanel.classList.add('hidden');
    clearMessagesDOM();
    
    // 初始化對話歷史，僅放入基礎系統提示詞
    messageHistory = [ { role: 'system', content: SYSTEM_PROMPT } ];
    
    DOM.loadingIndicator.classList.replace('hidden', 'flex');
    DOM.progressText.textContent = "正在獲取知識庫與初始化引擎...";

    try {
        engine = await initEngine(selectedModel, (report) => {
            DOM.progressText.textContent = report.text;
            scrollToBottom();
        });
        status = 'ready';
        DOM.loadingIndicator.classList.replace('flex', 'hidden');
        
        // 專屬自我介紹歡迎詞
        const welcomeText = `您好！我是**「北榮人事室 AI 助理」**。 👋\n\n模型（**${selectedModel}**）與人事知識庫已連線完畢。\n\n我的回答範圍嚴格限制於人事室發布的 FAQ 規章中。請問今天有什麼我可以協助您的嗎？\n*(💡 點擊左下角麥克風可使用語音輸入)*`;
        appendMessageToDOM('assistant', welcomeText);
    } catch (err) {
        status = 'error';
        DOM.loadingIndicator.classList.replace('flex', 'hidden');
        showError(`載入失敗：\n${err.message}`);
    } finally {
        updateUIState(status, speech?.getIsRecording(), wasInterrupted);
    }
}

// 4. 傳送訊息與動態 RAG 邏輯
async function sendMessage(isContinue = false) {
    if (speech?.getIsRecording()) speech.recognition.stop();

    let text = isContinue ? "請繼續未完成的回覆" : DOM.chatInput.value.trim();
    if (!isContinue) {
        if (!text || status !== 'ready' || !engine) return;
        DOM.chatInput.value = '';
        DOM.chatInput.style.height = '48px';
    }

    wasInterrupted = false;
    
    if (!isContinue) {
        appendMessageToDOM('user', text);
    }
    
    // 動態檢索知識庫
    const context = searchRelevantQA(text);
    
    // 【動態互動與防幻覺策略】
    let promptForModel = text;
    
    if (context !== "") {
        // 情況 A：有找到新法規資料
        promptForModel = `【內部參考資訊】\n${context}\n\n【使用者提問】\n${text}\n\n【系統回答限制與策略】\n請絕對遵守以下規則回答：\n1. 檢視上述【使用者提問】，若只有簡短的關鍵字（如「休假」、「國旅卡」）且對應多筆資料，請「不要」直接給出長篇答案。\n2. 請改為列出上述參考資訊裡的「問：」，並詢問使用者：「為您找到以下相關規定，請問您具體想了解哪一項？」\n3. 若使用者的提問非常明確指出特定情境，請依據參考資訊給出精準解答。`;
    } else {
        // 情況 B：沒找到新資料 (接續對話或無關問題)
        promptForModel = `【使用者提問】\n${text}\n\n(系統強制提示：若此提問是在選擇上一輪對話的選項，請依據上文的【內部參考資訊】回答；若此提問是全新的無關問題，請直接回覆「很抱歉，人事知識庫中無此規定，請向專員洽詢。」)`;
    }

    messageHistory.push({ role: 'user', content: promptForModel });
    
    status = 'generating';
    updateUIState(status, speech?.getIsRecording(), wasInterrupted);
    const aiTextBlock = appendMessageToDOM('assistant', "");

    try {
        const chunks = await engine.chat.completions.create({
            messages: messageHistory,
            stream: true,
            temperature: parseFloat(DOM.tempSlider.value), // 建議面板預設 0.1
            top_p: parseFloat(DOM.topPSlider.value),
        });

        let fullReply = "";
        for await (const chunk of chunks) {
            fullReply += chunk.choices[0]?.delta?.content || "";
            aiTextBlock.textContent = fullReply;
            scrollToBottom();
        }
        
        messageHistory.push({ role: 'assistant', content: fullReply });
    } catch (err) {
        if (err.message?.toLowerCase().includes('abort')) {
            aiTextBlock.textContent += " ⏹️ [已停止]";
            wasInterrupted = true;
        } else {
            console.error(err);
            aiTextBlock.textContent = "❌ 發生錯誤，無法生成回覆。";
        }
    } finally {
        status = 'ready';
        updateUIState(status, speech?.getIsRecording(), wasInterrupted);
    }
}

// ==========================================
// 5. 事件綁定
// ==========================================

DOM.loadBtn.addEventListener('click', loadModel);
DOM.sendBtn.addEventListener('click', () => status === 'generating' ? engine?.interruptGenerate() : sendMessage());
DOM.continueBtn.addEventListener('click', () => sendMessage(true));
DOM.settingsBtn.addEventListener('click', () => DOM.settingsPanel.classList.toggle('hidden'));
DOM.tempSlider.addEventListener('input', (e) => DOM.tempVal.textContent = e.target.value);
DOM.topPSlider.addEventListener('input', (e) => DOM.topPVal.textContent = e.target.value);

DOM.micBtn.addEventListener('click', () => {
    if (status === 'loading' || status === 'generating') return;
    speech?.getIsRecording() ? speech.recognition.stop() : speech.recognition.start();
});

DOM.chatInput.addEventListener('input', function() {
    updateUIState(status, speech?.getIsRecording(), wasInterrupted);
    this.style.height = '48px';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
});

let enterCount = 0;
DOM.chatInput.addEventListener('keydown', (e) => {
    if (status !== 'ready') return;
    if (e.key === 'Enter') {
        if (++enterCount === 4) { e.preventDefault(); enterCount = 0; sendMessage(); }
    } else enterCount = 0;
});

window.addEventListener('resize', () => status !== 'idle' && scrollToBottom());