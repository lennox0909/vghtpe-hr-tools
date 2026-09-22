import { DOM, SYSTEM_PROMPT } from './config.js';
import { updateUIState, showError, clearMessagesDOM, appendMessageToDOM, scrollToBottom } from './ui.js';
import { initSpeechRecognition } from './speech.js';
import { initEngine } from './engine.js';
import { initKnowledgeBase, searchRelevantQA } from './search.js';

let engine = null;
let status = 'idle'; 
let messageHistory = [];
let wasInterrupted = false;

const CACHE_KEY = 'vghtpe_hr_chat_history';
const ASKED_CACHE_KEY = 'vghtpe_hr_asked_questions'; // 新增：用於記錄問過的問題
let askedQuestions = new Set(); // 新增：使用 Set 來確保問題不重複

const speech = initSpeechRecognition((isRec) => updateUIState(status, isRec, wasInterrupted));

document.addEventListener('DOMContentLoaded', () => {
    const dataUrl = window.FAQ_DATA_URL || './data/faq.json';
    initKnowledgeBase(dataUrl);
});

async function loadModel() {
    const selectedModel = DOM.modelSelect.value;
    status = 'loading';
    wasInterrupted = false;
    updateUIState(status, speech?.getIsRecording(), wasInterrupted);
    
    DOM.errorBanner.classList.add('hidden');
    DOM.emptyState.classList.add('hidden');
    DOM.settingsPanel.classList.add('hidden');
    clearMessagesDOM();
    
    // ==========================================
    // 從瀏覽器快取還原對話與「已問過的問題」清單
    // ==========================================
    const savedHistory = localStorage.getItem(CACHE_KEY);
    const savedAsked = localStorage.getItem(ASKED_CACHE_KEY);

    if (savedHistory) {
        try {
            messageHistory = JSON.parse(savedHistory);
            messageHistory.forEach(msg => {
                if (msg.role === 'user') {
                    appendMessageToDOM('user', msg.content);
                } else if (msg.role === 'assistant') {
                    appendMessageToDOM('assistant', msg.content);
                }
            });
            
            // 還原已問過的問題紀錄
            if (savedAsked) {
                askedQuestions = new Set(JSON.parse(savedAsked));
            }
        } catch (e) {
            console.error("❌ 無法讀取快取，已重置記憶", e);
            messageHistory = [ { role: 'system', content: SYSTEM_PROMPT } ];
            askedQuestions.clear();
        }
    } else {
        messageHistory = [ { role: 'system', content: SYSTEM_PROMPT } ];
        askedQuestions.clear();
        localStorage.removeItem(ASKED_CACHE_KEY);
    }
    
    DOM.loadingIndicator.classList.replace('hidden', 'flex');
    DOM.progressText.textContent = "正在獲取知識庫與初始化引擎...";

    try {
        engine = await initEngine(selectedModel, (report) => {
            DOM.progressText.textContent = report.text;
            scrollToBottom();
        });
        status = 'ready';
        DOM.loadingIndicator.classList.replace('flex', 'hidden');
        
        let welcomeText = "";
        if (messageHistory.length > 1) {
            welcomeText = `⚡ 模型（**${selectedModel}**）已重新連線，您可以接續先前的對話。`;
        } else {
            welcomeText = `您好！我是**「北榮人事室 AI 助理」**。 👋\n\n模型（**${selectedModel}**）與人事知識庫已連線完畢。\n\n我的回答範圍嚴格限制於人事室發布的 FAQ 規章中。請問今天有什麼我可以協助您的嗎？\n*(💡 點擊左下角麥克風可使用語音輸入)*`;
        }
        
        appendMessageToDOM('assistant', welcomeText);
        scrollToBottom();
    } catch (err) {
        status = 'error';
        DOM.loadingIndicator.classList.replace('flex', 'hidden');
        showError(`載入失敗：\n${err.message}`);
    } finally {
        updateUIState(status, speech?.getIsRecording(), wasInterrupted);
    }
}

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
    
    // 記憶瘦身
    if (messageHistory.length > 7) {
        messageHistory = [messageHistory[0], ...messageHistory.slice(-6)];
    }

    // 將提問存入歷史陣列與「已問清單」中，並同步快取
    messageHistory.push({ role: 'user', content: text });
    askedQuestions.add(text); // 【新增】紀錄使用者問過的問題
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(messageHistory));
    localStorage.setItem(ASKED_CACHE_KEY, JSON.stringify([...askedQuestions])); // 將 Set 轉 Array 存入
    
    const searchResult = searchRelevantQA(text);
    const context = searchResult.context;
    const suggestedQuestions = searchResult.questions;
    const isExactMatch = searchResult.isExactMatch;
    
    let promptForModel = text;
    if (context !== "") {
        if (isExactMatch) {
            promptForModel = `【內部參考資訊】\n${context}\n\n【使用者提問】\n${text}\n\n請依據【內部參考資訊】給出精準解答，直接回覆答案，絕對不要詢問使用者想了解哪一項。`;
        } else {
            promptForModel = `【內部參考資訊】\n${context}\n\n【使用者提問】\n${text}\n\n【系統回答限制與策略】\n請絕對遵守以下規則回答：\n1. 檢視上述【使用者提問】，若只有簡短的關鍵字且對應多筆資料，請「只能」回覆這句話：「為您找到以下相關規定，請點擊下方按鈕選擇您具體想了解的項目：」，絕對不可以加上任何其他文字、網址連結或 HTML 符號。\n2. 若使用者的提問非常明確指出特定情境，請依據參考資訊給出精準解答。`;
        }
    } else {
        promptForModel = `【使用者提問】\n${text}\n\n(系統強制提示：若此提問是在選擇上一輪對話的選項，請依據上文的【內部參考資訊】回答；若此提問是全新的無關問題，請直接回覆「很抱歉，人事知識庫中無此規定，請向專員洽詢。」)`;
    }

    const currentMessages = [...messageHistory];
    currentMessages[currentMessages.length - 1] = { role: 'user', content: promptForModel };
    
    status = 'generating';
    updateUIState(status, speech?.getIsRecording(), wasInterrupted);
    const aiTextBlock = appendMessageToDOM('assistant', "");

    try {
        const chunks = await engine.chat.completions.create({
            messages: currentMessages,
            stream: true,
            temperature: parseFloat(DOM.tempSlider.value),
            top_p: parseFloat(DOM.topPSlider.value),
        });

        let fullReply = "";
        for await (const chunk of chunks) {
            fullReply += chunk.choices[0]?.delta?.content || "";
            aiTextBlock.textContent = fullReply;
            scrollToBottom();
        }
        
        // ==========================================
        // 氣泡按鈕動態渲染 (加入過濾機制)
        // ==========================================
        if (suggestedQuestions && suggestedQuestions.length > 0) {
            const isAskingToChoose = fullReply.includes("點擊下方按鈕") || fullReply.includes("為您找到以下相關規定");
            
            // 【核心邏輯】：決定要顯示哪些按鈕
            let displayQuestions = suggestedQuestions;
            if (!isAskingToChoose) {
                // 如果是「💡 您可能也想了解」的延伸閱讀，過濾掉已經問過的問題
                displayQuestions = suggestedQuestions.filter(opt => !askedQuestions.has(opt));
            }

            // 只有在過濾後「還有」按鈕可以顯示時，才建立按鈕區塊
            if (displayQuestions.length > 0) {
                const btnContainer = document.createElement('div');
                btnContainer.className = "flex flex-col gap-2 mt-3 w-full border-t border-slate-600/50 pt-3";

                if (isAskingToChoose) {
                    aiTextBlock.textContent = "為您找到以下相關規定，請點擊下方按鈕選擇您具體想了解的項目：";
                } else {
                    const hint = document.createElement('div');
                    hint.className = "text-xs text-slate-400 font-medium mb-1";
                    hint.textContent = "💡 您可能也想了解：";
                    btnContainer.appendChild(hint);
                }

                displayQuestions.forEach(opt => {
                    const btn = document.createElement('button');
                    btn.className = isAskingToChoose 
                        ? "text-left text-sm bg-blue-700/50 hover:bg-blue-600 border border-blue-500 text-blue-50 px-4 py-2.5 rounded-xl shadow-sm transition-colors active:scale-95 break-words whitespace-normal"
                        : "text-left text-sm bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 px-4 py-2.5 rounded-xl shadow-sm transition-colors active:scale-95 break-words whitespace-normal";
                    
                    btn.textContent = opt;
                    btn.onclick = () => {
                        DOM.chatInput.value = opt;
                        DOM.chatInput.dispatchEvent(new Event('input'));
                        DOM.sendBtn.click();
                    };
                    btnContainer.appendChild(btn);
                });

                aiTextBlock.parentElement.appendChild(btnContainer);
                scrollToBottom();
            }
        }
        
        messageHistory.push({ role: 'assistant', content: fullReply });
        localStorage.setItem(CACHE_KEY, JSON.stringify(messageHistory));
        
    } catch (err) {
        if (err.message?.toLowerCase().includes('abort')) {
            aiTextBlock.textContent += " ⏹️ [已停止]";
            wasInterrupted = true;
        } else {
            console.error(err);
            aiTextBlock.textContent = `❌ 發生錯誤，無法生成回覆。\n(錯誤代碼: ${err.message})`;
        }
    } finally {
        status = 'ready';
        updateUIState(status, speech?.getIsRecording(), wasInterrupted);
    }
}

// 事件綁定 (維持不變)
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
