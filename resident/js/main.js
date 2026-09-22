import { DOM } from './config.js';
import { calculateVacationData } from './calculator.js';
import { toggleLoading, showError, renderResults } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // 預設代入今日
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    DOM.transferDate.value = `${year}-${month}-${day}`;
    DOM.startCalcYear.value = year;

    // 綁定計算按鈕
    DOM.calculateBtn.addEventListener('click', () => {
        const pgyYears = parseInt(DOM.pgyYears.value, 10);
        const militaryMonths = parseInt(DOM.militaryMonths.value, 10);
        const transferDateStr = DOM.transferDate.value;
        const startCalcYear = parseInt(DOM.startCalcYear.value, 10);

        toggleLoading(true);

        // 簡單驗證
        if (isNaN(pgyYears) || pgyYears < 0 || isNaN(militaryMonths) || militaryMonths < 0 || !transferDateStr || isNaN(startCalcYear)) {
            showError('請檢查所有輸入欄位，確保為有效數字或日期。');
            toggleLoading(false);
            return;
        }

        // 模擬短暫非同步計算以展示 Loading 動畫
        setTimeout(() => {
            try {
                const data = calculateVacationData(pgyYears, militaryMonths, transferDateStr, startCalcYear);
                renderResults(data);
            } catch (err) {
                console.error(err);
                showError('計算過程中發生錯誤，請稍後再試。');
            }
            toggleLoading(false);
        }, 300);
    });
});