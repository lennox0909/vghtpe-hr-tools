const CACHE_KEY_DATA = 'tw_holiday_data';
const CACHE_KEY_TIME = 'tw_holiday_last_fetch';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

export let holidayData = {};

export async function fetchHolidayData(updateStatusCallback) {
    const now = Date.now();
    const cachedTime = localStorage.getItem(CACHE_KEY_TIME);
    const cachedData = localStorage.getItem(CACHE_KEY_DATA);

    if (cachedTime && cachedData && (now - parseInt(cachedTime) < CACHE_DURATION_MS)) {
        try {
            holidayData = JSON.parse(cachedData);
            updateStatusCallback(true, true);
            return;
        } catch (e) { console.warn('快取解析失敗。'); }
    }

    try {
        const response = await fetch(window.TAIWAN_HOLIDAY_DATA_URL);
        if (!response.ok) throw new Error('Network error');
        parseCSV(await response.text());
        localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(holidayData));
        localStorage.setItem(CACHE_KEY_TIME, now.toString());
        updateStatusCallback(true, false);
    } catch (error) {
        console.error("API 載入失敗:", error);
        updateStatusCallback(false, false);
    }
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return;
    const headers = parseCsvLine(lines[0]);
    const dateIdx = headers.findIndex(h => h.includes('日期') || h.includes('date'));
    const holidayIdx = headers.findIndex(h => h.includes('放假') || h.includes('holiday'));
    const descIdx = headers.findIndex(h => h.includes('備註') || h.includes('description'));

    for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        if (!row[dateIdx] || !row[holidayIdx]) continue;
        const formattedDate = standardizeDateString(row[dateIdx]);
        if (formattedDate) {
            holidayData[formattedDate] = {
                isHoliday: row[holidayIdx] === '2',
                isWorkday: row[holidayIdx] === '0',
                desc: descIdx !== -1 && row[descIdx] ? row[descIdx] : ''
            };
        }
    }
}

function parseCsvLine(text) {
    let p = '', row = [''], i = 0, s = !0;
    for (let l of text) {
        if ('"' === l) { if (s && l === p) row[i] += l; s = !s; }
        else if (',' === l && s) l = row[++i] = '';
        else row[i] += l; p = l;
    }
    return row.map(v => v.trim());
}

function standardizeDateString(raw) {
    raw = raw.replace(/['"]/g, '').trim();
    if (raw.length === 8 && /^\d+$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    const parts = raw.split(/[\/\-]/);
    if (parts.length === 3) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    return null;
}

export function formatDateStr(dateObj) {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

export function checkDateStatus(dateObj) {
    const dateStr = formatDateStr(dateObj);
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    if (holidayData[dateStr]) return { ...holidayData[dateStr], isMakeupWork: holidayData[dateStr].isWorkday && isWeekend, dateStr };
    return { isHoliday: isWeekend, desc: isWeekend ? '週末' : '', isMakeupWork: false, dateStr };
}