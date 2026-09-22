import { DOM } from './config.js';

export function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-up flex items-center gap-2 pointer-events-auto bg-white dark:bg-slate-800 border-l-4 ${
        type === 'success' ? 'border-emerald-500 text-slate-700 dark:text-slate-100' : 'border-amber-500 text-slate-700 dark:text-slate-100'
    }`;
    
    const icon = type === 'success'
        ? '<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
        : '<svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function triggerDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function requestModalInput(defaultName, extension, titleText, descText) {
    return new Promise((resolve) => {
        DOM.modal.title.innerText = titleText;
        DOM.modal.desc.innerText = descText;
        DOM.modal.extLabel.innerText = `.${extension}`;
        DOM.modal.input.value = defaultName;
        DOM.modal.container.classList.remove('hidden');
        DOM.modal.input.focus();
        
        const cleanup = () => {
            DOM.modal.container.classList.add('hidden');
            DOM.modal.confirmBtn.onclick = null;
            DOM.modal.cancelBtn.onclick = null;
        };

        DOM.modal.confirmBtn.onclick = () => {
            const filename = DOM.modal.input.value || 'document';
            cleanup();
            resolve(filename);
        };

        DOM.modal.cancelBtn.onclick = () => {
            cleanup();
            resolve(null);
        };
    });
}