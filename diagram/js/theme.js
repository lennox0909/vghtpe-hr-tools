import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
import { DOM } from './config.js';

export let isDarkMode = localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

export function initTheme(renderCallback) {
    updateTheme(true);
    DOM.themeToggleBtn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        updateTheme();
        if (renderCallback) renderCallback();
    });
}

function updateTheme(initial = false) {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        DOM.sunIcon.classList.remove('hidden');
        DOM.moonIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        DOM.sunIcon.classList.add('hidden');
        DOM.moonIcon.classList.remove('hidden');
    }
    
    mermaid.initialize({
        startOnLoad: false,
        theme: isDarkMode ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'sans-serif'
    });
}