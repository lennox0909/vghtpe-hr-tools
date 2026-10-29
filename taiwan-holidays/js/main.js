import { fetchHolidayData, formatDateStr } from './api.js';
import { initDropdowns, renderCalendar, changeMonth, goToCurrentMonth, setYearMonth, currentYear, currentMonth } from './calendar.js';
import { renderYearlySummary, performCalculation } from './calculator.js';

document.addEventListener('DOMContentLoaded', () => {
    // 預設填入本月頭尾
    const d = new Date();
    document.getElementById('calc-start-date').value = formatDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
    document.getElementById('calc-end-date').value = formatDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));

    // 啟動 API
    fetchHolidayData((success, isCache) => {
        const statusEl = document.getElementById('data-status');
        if (success) {
            statusEl.innerHTML = `<i class="fa-solid fa-check-circle text-emerald-500 mr-1"></i> 資料載入完成 ${isCache ? '<span class="text-xs text-slate-400">(快取)</span>' : ''}`;
        } else {
            statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-500 mr-1"></i> 無法取得資料，採基礎週末計算';
        }
        initDropdowns();
        renderCalendar();
        renderYearlySummary();
    });

    // 綁定日曆切換
    document.getElementById('btn-prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('btn-next-month').addEventListener('click', () => changeMonth(1));
    document.getElementById('btn-current-month').addEventListener('click', goToCurrentMonth);
    document.getElementById('btn-current-month-mobile').addEventListener('click', goToCurrentMonth);

    // 綁定計算機
    const showAlert = (msg) => { 
        document.getElementById('alert-message').textContent = msg; 
        const alertModal = document.getElementById('alert-modal');
        alertModal.classList.remove('hidden');
        alertModal.classList.add('flex');
    };
    
    document.getElementById('btn-close-alert').addEventListener('click', () => {
        const alertModal = document.getElementById('alert-modal');
        alertModal.classList.remove('flex');
        alertModal.classList.add('hidden');
    });

    document.getElementById('btn-calc-year').addEventListener('click', () => {
        const sy = parseInt(document.getElementById('calc-year-start').value), ey = parseInt(document.getElementById('calc-year-end').value);
        const res = performCalculation(new Date(`${sy}-01-01`), new Date(`${ey}-12-31`), sy === ey ? `${sy} 全年度` : `${sy} ~ ${ey} 全年度`);
        if (res?.error) showAlert(res.error);
    });

    document.getElementById('btn-calc-range').addEventListener('click', () => {
        const s = document.getElementById('calc-start-date').value, e = document.getElementById('calc-end-date').value;
        if (!s || !e) return showAlert('請選擇完整的開始與結束日期。');
        const res = performCalculation(new Date(s), new Date(e), `${s} ~ ${e}`);
        if (res?.error) showAlert(res.error);
    });

    // 綁定 Modal (快速選擇)
    const picker = document.getElementById('datepicker-modal');
    const openBtn = document.getElementById('btn-open-picker');
    const closeBtn = document.getElementById('btn-close-picker');
    const pickerGrid = document.getElementById('picker-month-grid');

    if (picker && openBtn && closeBtn) {
        // 開啟 Modal
        openBtn.addEventListener('click', () => {
            document.getElementById('picker-year-select').value = currentYear;
            pickerGrid.innerHTML = Array.from({length: 12}, (_, i) => 
                `<button class="py-2 rounded-lg font-medium transition-colors ${i === currentMonth ? 'bg-blue-600 text-white' : 'border border-slate-200 hover:bg-blue-50 text-slate-700 bg-white'}" data-m="${i}">${i + 1} 月</button>`
            ).join('');
            picker.classList.remove('hidden');
            picker.classList.add('flex');
        });

        // 點擊 X 關閉 Modal
        closeBtn.addEventListener('click', () => {
            picker.classList.remove('flex');
            picker.classList.add('hidden');
        });

        // 點擊半透明背景也能關閉
        picker.addEventListener('click', (e) => {
            if (e.target === picker) {
                picker.classList.remove('flex');
                picker.classList.add('hidden');
            }
        });

        // 點擊月份按鈕時更新日曆並關閉 Modal
        pickerGrid.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                setYearMonth(parseInt(document.getElementById('picker-year-select').value), parseInt(e.target.dataset.m));
                picker.classList.remove('flex');
                picker.classList.add('hidden');
            }
        });
    }
});