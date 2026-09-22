import { holidayData, checkDateStatus, formatDateStr } from './api.js';

export let currentYear = new Date().getFullYear();
export let currentMonth = new Date().getMonth();

export function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    else if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

export function setYearMonth(y, m) { currentYear = y; currentMonth = m; renderCalendar(); }
export function goToCurrentMonth() { const d = new Date(); setYearMonth(d.getFullYear(), d.getMonth()); }

export function initDropdowns() {
    let years = new Set(Object.keys(holidayData).map(d => d.substring(0, 4)));
    let yearArr = Array.from(years).map(Number).sort((a,b)=>a-b);
    if (!yearArr.length) { const cy = new Date().getFullYear(); yearArr = [cy-2, cy-1, cy, cy+1, cy+2]; }

    ['calc-year-start', 'calc-year-end', 'picker-year-select'].forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        el.innerHTML = yearArr.map(y => `<option value="${y}" ${y===currentYear?'selected':''}>${y} 年 / 民國 ${y-1911} 年</option>`).join('');
    });
}

export function renderCalendar() {
    document.getElementById('calendar-title-gregorian').textContent = `${currentYear} 年 ${currentMonth + 1} 月`;
    document.getElementById('calendar-title-roc').textContent = `中華民國 ${currentYear - 1911} 年`;
    
    const daysContainer = document.getElementById('calendar-days');
    daysContainer.innerHTML = '';
    const todayStr = formatDateStr(new Date());
    const firstDay = new Date(currentYear, currentMonth, 1);
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDay.getDay(); i++) daysContainer.appendChild(createCell(new Date(currentYear, currentMonth, 0 - (firstDay.getDay() - 1 - i)), true));
    for (let i = 1; i <= totalDays; i++) daysContainer.appendChild(createCell(new Date(currentYear, currentMonth, i), false, todayStr));
    const rem = (firstDay.getDay() + totalDays) % 7;
    if(rem > 0) for (let i = 1; i <= 7 - rem; i++) daysContainer.appendChild(createCell(new Date(currentYear, currentMonth + 1, i), true));
}

function createCell(dateObj, isOther, todayStr = '') {
    const status = checkDateStatus(dateObj);
    const isToday = formatDateStr(dateObj) === todayStr;
    const cell = document.createElement('div');
    cell.className = `calendar-cell flex flex-col min-h-[56px] sm:min-h-[80px] p-1 sm:p-2 border-b border-r border-slate-200 ${isOther?'other-month':status.isHoliday?'holiday':status.isMakeupWork?'makeup-work':'hover:bg-slate-50'}`;
    
    const numSpan = document.createElement('span');
    numSpan.className = `text-sm sm:text-lg font-medium ${status.isHoliday ? 'holiday-text' : 'text-slate-700'}`;
    if (isToday && !isOther) {
        numSpan.className += ' bg-blue-600 text-white w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full -mt-0.5 -ml-0.5 shadow-sm text-xs sm:text-base';
        numSpan.innerHTML = `<div>${dateObj.getDate()}</div>`;
    } else numSpan.textContent = dateObj.getDate();
    cell.appendChild(numSpan);

    if (!isOther && (status.desc || status.isMakeupWork)) {
        const descDiv = document.createElement('div');
        const isHol = status.isHoliday;
        descDiv.className = `mt-1 sm:mt-auto text-[9px] sm:text-xs font-semibold truncate px-0.5 sm:px-1 py-0.5 rounded ${isHol ? 'text-red-700 bg-red-100/70 sm:bg-red-100/50' : 'text-blue-700 bg-blue-100/70 sm:bg-blue-100/50'}`;
        descDiv.textContent = status.desc || '補班日';
        cell.appendChild(descDiv);
    }
    return cell;
}