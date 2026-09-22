import { DOM } from './config.js';

export function initSpeechRecognition(onUpdateUI) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        DOM.micBtn.title = "您的瀏覽器不支援語音輸入";
        DOM.micBtn.disabled = true;
        DOM.micBtn.classList.add('opacity-50', 'cursor-not-allowed');
        return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-TW';

    let isRecording = false;
    let recordingBaseText = "";
    let finalTranscript = "";

    recognition.onstart = () => {
        isRecording = true;
        recordingBaseText = DOM.chatInput.value;
        if (recordingBaseText && !recordingBaseText.endsWith(' ') && !recordingBaseText.endsWith('\n')) recordingBaseText += ' ';
        DOM.micBtn.classList.replace('bg-slate-700', 'bg-red-500');
        DOM.micBtn.classList.add('animate-pulse', 'text-white');
        DOM.chatInput.placeholder = "🔴 正在聆聽您的聲音... (再次點擊結束)";
        onUpdateUI(isRecording);
    };

    recognition.onresult = (event) => {
        let interimTranscript = '', currentFinal = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) currentFinal += event.results[i][0].transcript;
            else interimTranscript += event.results[i][0].transcript;
        }
        finalTranscript += currentFinal;
        DOM.chatInput.value = recordingBaseText + finalTranscript + interimTranscript;
        DOM.chatInput.dispatchEvent(new Event('input'));
    };

    recognition.onend = () => {
        isRecording = false;
        finalTranscript = "";
        DOM.micBtn.classList.replace('bg-red-500', 'bg-slate-700');
        DOM.micBtn.classList.remove('animate-pulse', 'text-white');
        onUpdateUI(isRecording);
    };

    return { recognition, getIsRecording: () => isRecording };
}