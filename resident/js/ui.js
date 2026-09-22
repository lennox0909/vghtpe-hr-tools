import { DOM } from './config.js';

export function toggleLoading(isLoading) {
    DOM.calculateBtn.disabled = isLoading;
    if (isLoading) {
        DOM.loadingSpinner.classList.remove('hidden');
    } else {
        DOM.loadingSpinner.classList.add('hidden');
    }
}

export function showError(message) {
    DOM.errorMessage.textContent = message;
    DOM.errorMessage.classList.remove('hidden');
    DOM.resultsSection.classList.add('hidden');
}

export function renderResults(data) {
    DOM.errorMessage.classList.add('hidden');
    
    let html = `
        <div class="mb-6 bg-white p-4 rounded-lg border border-blue-100">
            <p class="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-2">試算基準：</p>
            <ul class="list-disc ml-5 text-sm text-slate-600 space-y-1">
                <li><strong>PGY年資：</strong> ${data.baseInfo.pgyYears} 年</li>
                <li><strong>兵役年資：</strong> ${data.baseInfo.militaryMonths} 月</li>
                <li><strong>轉任日期：</strong> ${data.baseInfo.transferYear}年${data.baseInfo.transferMonth}月${data.baseInfo.transferDay}日</li>
            </ul>
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-3 border-l-4 border-blue-500 pl-2">各年度休假天數詳情</h3>
    `;

    // 轉任次年結果
    html += `
        <div class="result-item">
            <p class="result-item-title">${data.nextYear.year}年 (轉任次年)：</p>
            <p class="result-item-value">休假天數：${data.nextYear.days} 日</p>
            <p class="result-item-desc">計算說明：轉任當年 (${data.baseInfo.transferYear}年) 在職 ${data.nextYear.monthsInTransferYear} 個月，依「7 × ${data.nextYear.monthsInTransferYear} / 12」公式計算，無條件進位。</p>
        </div>
    `;

    // 後續年度結果
    data.futureYears.forEach(y => {
        html += `
            <div class="result-item">
                <p class="result-item-title">${y.year}年：</p>
                <p class="result-item-value">休假天數：${y.days} 日</p>
                <p class="result-item-desc">計算說明：截至前一年度底（${y.year - 1}年底），總服務年資累計約 ${y.totalYearsSeniority} 年 ${y.remainingMonthsSeniority} 個月，符合服務滿 ${y.threshold} 年給假 ${y.days} 日的規定。</p>
            </div>
        `;
        if (y.days === 30) {
            html += `<div class="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-center font-bold text-sm">已達最高休假天數上限 (30日)。</div>`;
        }
    });

    DOM.resultDetails.innerHTML = html;
    DOM.resultsSection.classList.remove('hidden');
}