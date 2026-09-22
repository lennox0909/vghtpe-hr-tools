// 負責載入與暫存 FAQ 資料
let faqDatabase = [];

export async function initKnowledgeBase(dataUrl) {
    try {
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error('FAQ 資料載入失敗');
        faqDatabase = await response.json();
        console.log(`✅ 成功載入 ${faqDatabase.length} 筆人事知識庫`);
    } catch (error) {
        console.error("❌ 知識庫載入錯誤:", error);
    }
}

// 模糊檢索演算法 (N-gram 與雙向比對)
export function searchRelevantQA(userMessage, topK = 3) {
    if (faqDatabase.length === 0) {
        console.warn("⚠️ 知識庫為空，無法進行檢索");
        return "無相關資料";
    }

    // 移除常見標點符號，並轉小寫，確保比對不受干擾
    const query = userMessage.replace(/[?？!！,，.。~～\s]/g, '').toLowerCase();
    
    if (!query) return "無相關資料";

    // 計算每筆 QA 的關聯分數
    const scoredQA = faqDatabase.map(item => {
        let score = 0;
        const qStr = item.q.toLowerCase();
        const aStr = item.a.toLowerCase();
        
        // 1. 雙向關鍵字比對 (高權重)
        item.keywords.forEach(keyword => {
            const kw = keyword.toLowerCase();
            if (query.includes(kw)) {
                score += 15;
            } else if (kw.includes(query)) {
                score += 10;
            }
        });

        // 2. 問題標題雙向比對
        if (qStr.includes(query)) score += 10;
        if (query.includes(qStr)) score += 10;

        // 3. N-gram (Bigram) 模糊比對 
        if (query.length >= 2) {
            for (let i = 0; i < query.length - 1; i++) {
                const bigram = query.substring(i, i + 2);
                if (qStr.includes(bigram)) score += 3;
                if (aStr.includes(bigram)) score += 1;
            }
        } else if (query.length === 1) {
            if (qStr.includes(query)) score += 2;
        }

        return { ...item, score };
    });

    // 過濾出分數大於 2 的結果，依分數降冪排序，取前 TopK 筆
    const relevantResults = scoredQA
        .filter(item => item.score > 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    // 在 Console 印出命中結果，方便除錯與觀察分數
    console.log(`🔍 搜尋：「${userMessage}」`);
    if (relevantResults.length === 0) {
        console.log("   -> ❌ 無命中資料");
        return "無相關資料";
    }

    console.log("   -> ✅ 命中資料：");
    relevantResults.forEach((r, i) => console.log(`      [${i+1}] (分數:${r.score}) ${r.q}`));

    // 組合成最精簡的 Q&A 結構，降低小模型的閱讀負擔
    let context = "";
    relevantResults.forEach((res, idx) => {
        context += `--- [資料 ${idx + 1}] ---\n問：${res.q}\n答：${res.a}\n\n`;
    });

    return context;
}