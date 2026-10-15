import { DOM, SYSTEM_PROMPT } from './config.js';
import { updateUIState, showError, clearMessagesDOM, appendMessageToDOM, scrollToBottom } from './ui.js';
import { initEngine } from './engine.js';
import { initKnowledgeBase, searchRelevantQA, getExactFAQ } from './search.js';

let engine = null;
let status = 'idle'; 
let messageHistory = [];
let wasInterrupted = false;

const CACHE_KEY = 'vghtpe_hr_chat_history';
const ASKED_CACHE_KEY = 'vghtpe_hr_asked_questions'; 
let askedQuestions = new Set(); 

document.addEventListener('DOMContentLoaded', () => {
    // FAQ JSON 讀取與版本控制已移至 Wasm，此處僅初始化 Worker
    initKnowledgeBase();
});

function translateProgress(text) {
    if (!text) return "";
    let t = text;
    t = t.replace(/Fetching param cache/g, "正在下載模型參數");
    t = t.replace(/fetched/g, "已下載");
    t = t.replace(/completed/g, "進度");
    t = t.replace(/secs elapsed/g, "秒");
    t = t.replace(/It can take a while when we first visit this page to populate the cache\. Later refreshes will become faster\./g, "初次載入模型時需要時間建立快取，未來重新整理頁面時載入速度將會大幅提升。");
    t = t.replace(/Loading model from cache/g, "正在從快取載入模型");
    t = t.replace(/Finish loading/g, "載入完成");
    return t;
}

async function loadModel() {
    const selectedModel = DOM.modelSelect.value;
    status = 'loading';
    wasInterrupted = false;
    updateUIState(status, false, wasInterrupted);
    
    DOM.errorBanner.classList.add('hidden');
    DOM.emptyState.classList.add('hidden');
    DOM.settingsPanel.classList.add('hidden');
    clearMessagesDOM();
    
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
            DOM.progressText.textContent = translateProgress(report.text);
            scrollToBottom();
        });
        status = 'ready';
        DOM.loadingIndicator.classList.replace('flex', 'hidden');
        
        let welcomeText = "";
        if (messageHistory.length > 1) {
            welcomeText = `⚡ 模型（**${selectedModel}**）已重新連線，您可以接續先前的對話。`;
        } else {
            welcomeText = `您好！我是**「北榮人事室 AI 助理」**。 👋\n\n模型（**${selectedModel}**）與人事知識庫已連線完畢。\n\n我的回答範圍嚴格限制於人事室發布的 FAQ 規章中。請問今天有什麼我可以協助您的嗎？`;
        }
        
        appendMessageToDOM('assistant', welcomeText);
        scrollToBottom();
    } catch (err) {
        status = 'error';
        DOM.loadingIndicator.classList.replace('flex', 'hidden');
        showError(`載入失敗：\n${err.message}`);
    } finally {
        updateUIState(status, false, wasInterrupted);
    }
}

// 統一管理氣泡建議按鈕的動態渲染與點擊事件
function renderSuggestedButtons(aiTextBlock, suggestedQuestions, isAskingToChoose) {
    if (!suggestedQuestions || suggestedQuestions.length === 0) return;

    let displayQuestions = suggestedQuestions;
    if (!isAskingToChoose) {
        displayQuestions = suggestedQuestions.filter(opt => !askedQuestions.has(opt));
    }

    if (displayQuestions.length === 0) return;

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
        
        // 點擊建議按鈕時，直接向 Wasm Worker 抓取標準答案瞬間輸出，繞過 LLM 推論
        btn.onclick = async () => {
            const exactMatch = await getExactFAQ(opt);
            
            if (exactMatch) {
                appendMessageToDOM('user', opt);
                
                let replyText = exactMatch.a;
                if (exactMatch.type) replyText += `\n\n📍 案件類別：${exactMatch.type}`;
                if (exactMatch.regulation) replyText += `\n📜 法規依據：${exactMatch.regulation}`;
                
                appendMessageToDOM('assistant', replyText);
                
                messageHistory.push({ role: 'user', content: opt });
                messageHistory.push({ role: 'assistant', content: replyText });
                askedQuestions.add(opt);
                
                localStorage.setItem(CACHE_KEY, JSON.stringify(messageHistory));
                localStorage.setItem(ASKED_CACHE_KEY, JSON.stringify([...askedQuestions]));
            } else {
                DOM.chatInput.value = opt;
                DOM.chatInput.dispatchEvent(new Event('input'));
                DOM.sendBtn.click();
            }
        };
        btnContainer.appendChild(btn);
    });

    aiTextBlock.parentElement.appendChild(btnContainer);
    scrollToBottom();
}

async function sendMessage(isContinue = false) {
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
    
    if (messageHistory.length > 7) {
        messageHistory = [messageHistory[0], ...messageHistory.slice(-6)];
    }

    messageHistory.push({ role: 'user', content: text });
    askedQuestions.add(text); 
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(messageHistory));
    localStorage.setItem(ASKED_CACHE_KEY, JSON.stringify([...askedQuestions]));
    
    // 等待 Wasm Worker 非同步檢索結果
    const searchResult = await searchRelevantQA(text);
    const context = searchResult.context || "";
    const suggestedQuestions = searchResult.questions || [];
    const isExactMatch = searchResult.isExactMatch;

    // =========================================================================
    // 【攔截機制】：簡短關鍵字且命中多筆 FAQ 時，直接由前端 0 秒渲染選項按鈕！
    // 避免小模型在串流時把內部 Prompt 背出來，並省下等待模型生成的時間。
    // =========================================================================
    const cleanQueryLen = text.replace(/[?？!！,，.。~～\s]/g, '').length;
    const isShortKeywordQuery = !isExactMatch && suggestedQuestions.length > 1 && cleanQueryLen <= 10;

    if (!isContinue && isShortKeywordQuery) {
        const directReply = "為您找到以下相關規定，請點擊下方按鈕選擇您具體想了解的項目：";
        const aiTextBlock = appendMessageToDOM('assistant', directReply);
        renderSuggestedButtons(aiTextBlock, suggestedQuestions, true);
        
        messageHistory.push({ role: 'assistant', content: directReply });
        localStorage.setItem(CACHE_KEY, JSON.stringify(messageHistory));
        return;
    }

    // 組合精簡版 Prompt，避免複雜規則誘發 1B/2B 小模型複誦
    let promptForModel = text;
    if (context !== "") {
        promptForModel = `請根據以下參考資料，直接用繁體中文回答「使用者問題」。切勿複誦參考資料的標題或格式。\n\n${context}使用者問題：${text}`;
    } else {
        promptForModel = `使用者問題：${text}\n\n(系統提示：目前知識庫無匹配資料。若此問題並非延續上一輪對話，請直接回覆：「很抱歉，我目前的知識庫中沒有關於此問題的規定。您可以換個關鍵字搜尋，或是直接撥打 02-2875-7019 向人事室洽詢。」)`;
    }

    const currentMessages = [...messageHistory];
    currentMessages[currentMessages.length - 1] = { role: 'user', content: promptForModel };
    
    status = 'generating';
    updateUIState(status, false, wasInterrupted);
    const aiTextBlock = appendMessageToDOM('assistant', "");

    try {
        const chunks = await engine.chat.completions.create({
            messages: currentMessages,
            stream: true,
            temperature: parseFloat(DOM.tempSlider.value),
            top_p: parseFloat(DOM.topPSlider.value),
        });

        let fullReply = "";
        let leakedPrompt = false;

        for await (const chunk of chunks) {
            fullReply += chunk.choices[0]?.delta?.content || "";
            
            // 串流防洩漏守門員：若小模型開始背誦內部標籤，立即中斷並切換為按鈕選單
            if (
                fullReply.includes("【系統") || 
                fullReply.includes("【內部參考資訊】") || 
                fullReply.includes("--- [資料") ||
                fullReply.includes("--- [精準命中") ||
                fullReply.includes("請點擊下方按鈕選擇")
            ) {
                leakedPrompt = true;
                engine?.interruptGenerate();
                break;
            }

            aiTextBlock.textContent = fullReply;
            scrollToBottom();
        }
        
        if (leakedPrompt && suggestedQuestions.length > 0) {
            fullReply = "為您找到以下相關規定，請點擊下方按鈕選擇您具體想了解的項目：";
            aiTextBlock.textContent = fullReply;
            renderSuggestedButtons(aiTextBlock, suggestedQuestions, true);
        } else if (suggestedQuestions.length > 0) {
            const isAskingToChoose = fullReply.includes("點擊下方按鈕") || fullReply.includes("為您找到以下相關規定");
            renderSuggestedButtons(aiTextBlock, suggestedQuestions, isAskingToChoose);
        }
        
        messageHistory.push({ role: 'assistant', content: fullReply });
        localStorage.setItem(CACHE_KEY, JSON.stringify(messageHistory));
        
    } catch (err) {
        if (err.message?.toLowerCase().includes('abort')) {
            if (!aiTextBlock.textContent.includes("為您找到以下相關規定")) {
                aiTextBlock.textContent += " ⏹️ [已停止]";
                wasInterrupted = true;
            }
        } else {
            console.error(err);
            aiTextBlock.textContent = `❌ 發生錯誤，無法生成回覆。\n(錯誤代碼: ${err.message})`;
        }
    } finally {
        status = 'ready';
        updateUIState(status, false, wasInterrupted);
    }
}

function clearChatHistory() {
    if (!confirm('確定要清除所有對話紀錄與記憶嗎？')) return;

    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(ASKED_CACHE_KEY);

    messageHistory = [ { role: 'system', content: SYSTEM_PROMPT } ];
    askedQuestions.clear();
    clearMessagesDOM();

    if (status === 'ready') {
        const selectedModel = DOM.modelSelect.value;
        const welcomeText = `對話記憶已清除 🗑️\n\n您好！我是**「北榮人事室 AI 助理」**。 👋\n\n模型（**${selectedModel}**）已準備就緒。請問今天有什麼我可以協助您的嗎？`;
        appendMessageToDOM('assistant', welcomeText);
        scrollToBottom();
    } else {
        DOM.emptyState.classList.remove('hidden');
    }
}

DOM.loadBtn.addEventListener('click', loadModel);
DOM.clearBtn.addEventListener('click', clearChatHistory);
DOM.sendBtn.addEventListener('click', () => status === 'generating' ? engine?.interruptGenerate() : sendMessage());
DOM.continueBtn.addEventListener('click', () => sendMessage(true));
DOM.settingsBtn.addEventListener('click', () => DOM.settingsPanel.classList.toggle('hidden'));
DOM.tempSlider.addEventListener('input', (e) => DOM.tempVal.textContent = e.target.value);
DOM.topPSlider.addEventListener('input', (e) => DOM.topPVal.textContent = e.target.value);

DOM.chatInput.addEventListener('input', function() {
    updateUIState(status, false, wasInterrupted);
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