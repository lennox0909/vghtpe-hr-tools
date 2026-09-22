import { DOM, SYSTEM_PROMPT } from './config.js';
import { updateUIState, showError, clearMessagesDOM, appendMessageToDOM, scrollToBottom } from './ui.js';
import { initSpeechRecognition } from './speech.js';
import { initEngine } from './engine.js';

let engine = null;
let status = 'idle'; // idle, loading, ready, generating
let messageHistory = [];
let wasInterrupted = false;

// 初始化語音
const speech = initSpeechRecognition((isRec) => updateUIState(status, isRec, wasInterrupted));

async function loadModel() {
    const selectedModel = DOM.modelSelect.value;
    status = 'loading';
    wasInterrupted = false;
    updateUIState(status, speech?.getIsRecording(), wasInterrupted);
    
    DOM.errorBanner.classList.add('hidden');
    DOM.emptyState.classList.add('hidden');
    DOM.settingsPanel.classList.add('hidden');
    clearMessagesDOM();
// 將系統提示詞作為隱藏的對話起點注入歷史紀錄中 (UI 模組不會將其渲染至畫面上)
    messageHistory = [
        { role: 'system', content: SYSTEM_PROMPT }
    ];
    // ==============
    
    DOM.loadingIndicator.classList.replace('hidden', 'flex');
    DOM.progressText.textContent = "正在初始化引擎與下載模型...";

    try {
        engine = await initEngine(selectedModel, (report) => {
            DOM.progressText.textContent = report.text;
            scrollToBottom();
        });
        status = 'ready';
        DOM.loadingIndicator.classList.replace('flex', 'hidden');
        const welcomeText = `✅ 已載入模型 **${selectedModel}**。\n💡 點擊左下角麥克風可語音輸入！`;
        messageHistory.push({ role: 'assistant', content: welcomeText });
        appendMessageToDOM('assistant', welcomeText);
    } catch (err) {
        status = 'error';
        DOM.loadingIndicator.classList.replace('flex', 'hidden');
        showError(`載入失敗：\n${err.stack || err.message}`);
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
    messageHistory.push({ role: 'user', content: text });
    appendMessageToDOM('user', text);
    
    status = 'generating';
    updateUIState(status, speech?.getIsRecording(), wasInterrupted);
    const aiTextBlock = appendMessageToDOM('assistant', "");

    try {
        const chunks = await engine.chat.completions.create({
            messages: messageHistory,
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

// 綁定事件
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