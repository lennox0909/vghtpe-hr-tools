export function getSeniorityThreshold(totalYears, totalMonths) {
    const totalSeniorityInMonths = totalYears * 12 + totalMonths;
    if (totalSeniorityInMonths >= 14 * 12) return 14;
    if (totalSeniorityInMonths >= 9 * 12) return 9;
    if (totalSeniorityInMonths >= 6 * 12) return 6;
    if (totalSeniorityInMonths >= 3 * 12) return 3;
    if (totalSeniorityInMonths >= 1 * 12) return 1;
    return 0;
}

export function getVacationDaysBySeniority(totalYears, totalMonths) {
    const threshold = getSeniorityThreshold(totalYears, totalMonths);
    switch (threshold) {
        case 14: return 30;
        case 9: return 28;
        case 6: return 21;
        case 3: return 14;
        case 1: return 7;
        default: return 0;
    }
}

export function calculateVacationData(pgyYears, militaryMonths, transferDateStr, startCalcYear) {
    const transferDate = new Date(transferDateStr);
    const transferYear = transferDate.getFullYear();
    const transferMonth = transferDate.getMonth() + 1;
    const monthsInTransferYear = 12 - transferMonth + 1;
    
    let nextYearVacationDays = Math.ceil(7 * monthsInTransferYear / 12);
    if (nextYearVacationDays < 1 && monthsInTransferYear > 0) nextYearVacationDays = 1;

    let results = {
        baseInfo: { pgyYears, militaryMonths, transferYear, transferMonth, transferDay: transferDate.getDate() },
        nextYear: { year: transferYear + 1, days: nextYearVacationDays, monthsInTransferYear },
        futureYears: []
    };

    let currentSeniorityMonths = militaryMonths + monthsInTransferYear;
    
    for (let year = transferYear + 2; year <= startCalcYear + 20; year++) {
        const totalSeniorityAtEndOfPreviousYearMonths = pgyYears * 12 + currentSeniorityMonths + ((year - 1) - (transferYear + 1) + 1) * 12;
        const totalYearsSeniority = Math.floor(totalSeniorityAtEndOfPreviousYearMonths / 12);
        const remainingMonthsSeniority = totalSeniorityAtEndOfPreviousYearMonths % 12;

        const vacationDays = getVacationDaysBySeniority(totalYearsSeniority, remainingMonthsSeniority);
        const threshold = getSeniorityThreshold(totalYearsSeniority, remainingMonthsSeniority);
        
        results.futureYears.push({ year, days: vacationDays, totalYearsSeniority, remainingMonthsSeniority, threshold });
        if (vacationDays === 30) break; 
    }
    return results;
}