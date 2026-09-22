import { checkDateStatus, formatDateStr } from './api.js';

let calcCache = JSON.parse(localStorage.getItem('tw_holiday_calc_results') || '{}');

export function renderYearlySummary() {
    const grid = document.getElementById('yearly-summary-grid');
    grid.innerHTML = '';
    for (let year = 2017; year <= 2026; year++) {
        let workDays = calcCache[`${year}-01-01_${year}-12-31`]?.workDays || 0;
        if (!workDays) {
            let d = new Date(year, 0, 1), end = new Date(year, 11, 31);
            while (d <= end) { if (!checkDateStatus(d).isHoliday) workDays++; d.setDate(d.getDate() + 1); }
        }
        grid.innerHTML += `<div class="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 text-center"><div class="text-xs text-slate-500 mb-1">${year} 年</div><div class="text-2xl font-black text-blue-600">${workDays}</div><div class="text-[10px] text-blue-400">工作日</div></div>`;
    }
}

export function performCalculation(startDate, endDate, label) {
    if (startDate > endDate) return { error: '開始日期不能大於結束日期。' };
    const key = `${formatDateStr(startDate)}_${formatDateStr(endDate)}`;
    if (!calcCache[key]) {
        let res = { totalDays: 0, workDays: 0, holidays: 0, details: [] }, d = new Date(startDate);
        while (d <= endDate) {
            res.totalDays++;
            const s = checkDateStatus(d);
            if (s.isHoliday) { res.holidays++; if (s.desc && s.desc !== '週末') res.details.push({ date: s.dateStr, type: 'holiday', text: s.desc }); }
            else { res.workDays++; if (s.isMakeupWork || s.desc) res.details.push({ date: s.dateStr, type: 'work', text: s.desc || '補班日' }); }
            d.setDate(d.getDate() + 1);
        }
        calcCache[key] = res;
        localStorage.setItem('tw_holiday_calc_results', JSON.stringify(calcCache));
    }
    document.getElementById('res-period-label').textContent = label;
    const data = calcCache[key];
    document.getElementById('res-total').textContent = data.totalDays;
    document.getElementById('res-work').textContent = data.workDays;
    document.getElementById('res-holiday').textContent = data.holidays;
    
    document.getElementById('res-details-list').innerHTML = data.details.length ? data.details.map(i => `<li class="flex justify-between items-center bg-white p-2 border-b"><span class="font-mono text-xs">${i.date}</span><span class="px-2 rounded text-[10px] font-semibold ${i.type==='holiday'?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}">${i.text}</span></li>`).join('') : '<li class="text-slate-400 text-center py-4 italic text-sm">無特殊國定假日</li>';
    document.getElementById('calc-results').classList.remove('hidden');
    if (window.innerWidth < 1024) document.getElementById('calc-results').scrollIntoView({ behavior: 'smooth' });
    return { success: true };
}