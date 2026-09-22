export const initTheme = (toggleBtnId, sunIconId, moonIconId, onThemeChange = () => {}) => {
    const btn = document.getElementById(toggleBtnId);
    const sun = document.getElementById(sunIconId);
    const moon = document.getElementById(moonIconId);
    if (!btn || !sun || !moon) return;

    let isDarkMode = localStorage.getItem('theme') === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const applyTheme = () => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            sun.classList.remove('hidden');
            moon.classList.add('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            sun.classList.add('hidden');
            moon.classList.remove('hidden');
        }
        onThemeChange(isDarkMode);
    };

    applyTheme();

    btn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        applyTheme();
    });
};