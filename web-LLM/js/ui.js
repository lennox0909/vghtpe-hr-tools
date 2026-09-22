import { DOM } from './config.js';

export function scrollToBottom() {
    DOM.chatContainer.scrollTo({ top: DOM.chatContainer.scrollHeight, behavior: 'smooth' });
}

export function showError(msg) {
    DOM.errorText.textContent = msg;
    DOM.errorBanner.classList.remove('hidden');
    DOM.errorBanner.classList.add('flex');
    console.error(msg);
}

export function updateUIState(status, isRecording, wasInterrupted) {
    const isBusy = status === 'loading' || status === 'generating';
    
    DOM.modelSelect.disabled = isBusy;
    DOM.loadBtn.disabled = isBusy;
    DOM.tempSlider.disabled = isBusy;
    DOM.topPSlider.disabled = isBusy;
    DOM.micBtn.disabled = isBusy;
    
    if (status === 'loading') {
        DOM.loadBtnText.textContent = "載入中";
        DOM.loadBtnIcon.innerHTML = `<svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
    } else if (status === 'ready') {
        DOM.loadBtnText.textContent = "重新載入";
        DOM.loadBtnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
    }

    DOM.continueWrapper.classList.toggle('hidden', !(wasInterrupted && status === 'ready'));

    DOM.chatInput.disabled = !(status === 'ready' || status === 'idle') && !isRecording;
    
    if (status === 'generating') {
        DOM.sendBtn.disabled = false;
        DOM.sendBtn.classList.replace('bg-blue-600', 'bg-red-600');
        DOM.sendBtn.classList.replace('hover:bg-blue-500', 'hover:bg-red-500');
        DOM.sendIconDefault.classList.add('hidden');
        DOM.sendIconStop.classList.remove('hidden');
        DOM.chatInput.placeholder = "AI 正在思考... (可點擊停止)";
    } else {
        DOM.sendBtn.disabled = status !== 'ready' || DOM.chatInput.value.trim() === '';
        DOM.sendBtn.classList.replace('bg-red-600', 'bg-blue-600');
        DOM.sendBtn.classList.replace('hover:bg-red-500', 'hover:bg-blue-500');
        DOM.sendIconStop.classList.add('hidden');
        DOM.sendIconDefault.classList.remove('hidden');
        
        if (!isRecording) {
            if (status === 'idle') DOM.chatInput.placeholder = "請先載入模型...";
            else if (status === 'loading') DOM.chatInput.placeholder = "模型載入中...";
            else DOM.chatInput.placeholder = "輸入訊息... (連按四下 Enter 送出)";
        }
    }
}

export function clearMessagesDOM() {
    Array.from(DOM.messagesArea.childNodes).forEach(node => {
        if (!['empty-state', 'loading-indicator'].includes(node.id) && node.nodeType === Node.ELEMENT_NODE) node.remove();
    });
}

export function appendMessageToDOM(role, content) {
    const msgContainer = document.createElement('div');
    msgContainer.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} w-full`;
    const bubble = document.createElement('div');
    bubble.className = `max-w-[92%] sm:max-w-[85%] md:max-w-[75%] rounded-2xl p-3 sm:p-4 shadow-sm ${
        role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'
    }`;
    if (role === 'assistant') {
        const header = document.createElement('div');
        header.className = "flex items-center gap-1.5 mb-1.5 text-xs text-slate-400 font-medium uppercase tracking-wider";
        header.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect></svg> AI 助理`;
        bubble.appendChild(header);
    }
    const textBlock = document.createElement('div');
    textBlock.className = "whitespace-pre-wrap text-sm leading-relaxed word-break";
    textBlock.textContent = content;
    bubble.appendChild(textBlock);
    msgContainer.appendChild(bubble);
    DOM.messagesArea.appendChild(msgContainer);
    scrollToBottom();
    return textBlock;
}