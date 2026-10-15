document.addEventListener('DOMContentLoaded', () => {
    const iframe = document.getElementById('gas-iframe');
    const spinner = document.getElementById('loading-spinner');

    // 監聽 iframe 載入完成事件
    iframe.addEventListener('load', () => {
        // 載入完成後，隱藏載入中動畫圖示
        if (spinner) {
            spinner.style.display = 'none';
        }
        
        // 透過 Tailwind 的 opacity 類別，為 iframe 加上平滑的漸顯效果
        iframe.classList.remove('opacity-0');
        iframe.classList.add('opacity-100');
    });

    // 為了避免 GAS 伺服器無回應導致畫面卡住，設定 8 秒的超時保險機制
    setTimeout(() => {
        if (iframe.classList.contains('opacity-0')) {
            iframe.classList.remove('opacity-0');
            iframe.classList.add('opacity-100');
            if (spinner) spinner.style.display = 'none';
        }
    }, 8000);
});