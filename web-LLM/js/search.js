// 負責載入與暫存 FAQ 資料
let faqDatabase = [];

export async function initKnowledgeBase(dataUrl) {
    try {
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error('FAQ 資料載入失敗');
        faqDatabase = await response.json();
        console.log(`✅ 成功載入 ${faqDatabase.length} 筆人事知識庫`);
    } catch (error) {
        console.error("知識庫載入錯誤:", error);
    }
}

// 關鍵字檢索演算法 (計算命中分數)
export function searchRelevantQA(userMessage, topK = 3) {
    if (faqDatabase.length === 0) return "";

    const query = userMessage.toLowerCase();
    
    // 計算每筆 QA 的關聯分數
    const scoredQA = faqDatabase.map(item => {
        let score = 0;
        
        // 1. 檢查關鍵字命中
        item.keywords.forEach(keyword => {
            if (query.includes(keyword.toLowerCase())) {
                score += 2; // 關鍵字權重較高
            }
        });

        // 2. 檢查問題本身是否包含查詢字眼
        if (item.q.toLowerCase().includes(query) || query.includes(item.q.toLowerCase())) {
            score += 1;
        }

        return { ...item, score };
    });

    // 過濾出有分數的結果，並依分數降冪排序
    const relevantResults = scoredQA
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    if (relevantResults.length === 0) return "";

    // 組合成 Prompt 擴充內容
    let context = "\n\n【內部參考資訊】請依據以下資訊回答使用者的問題：\n";
    relevantResults.forEach((res, idx) => {
        context += `參考資料 ${idx + 1}:\n問題: ${res.q}\n解答: ${res.a}\n\n`;
    });

    return context;
}