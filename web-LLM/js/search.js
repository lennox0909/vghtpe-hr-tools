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
        return "";
    }

    // 移除常見標點符號，並轉小寫，確保比對不受干擾
    const query = userMessage.replace(/[?？!！,，.。~～\s]/g, '').toLowerCase();
    
    if (!query) return "";

    // 計算每筆 QA 的關聯分數
    const scoredQA = faqDatabase.map(item => {
        let score = 0;
        const qStr = item.q.toLowerCase();
        const aStr = item.a.toLowerCase();
        
        // ==========================================
        // 1. 雙向關鍵字比對 (高權重)
        // ==========================================
        item.keywords.forEach(keyword => {
            const kw = keyword.toLowerCase();
            if (query.includes(kw)) {
                score += 15; // 使用者提問包含了完整關鍵字
            } else if (kw.includes(query)) {
                score += 10; // 使用者只輸入部分關鍵字 (如輸入"休假", 關鍵字為"休假補助")
            }
        });

        // ==========================================
        // 2. 問題標題雙向比對
        // ==========================================
        if (qStr.includes(query)) score += 10;
        if (query.includes(qStr)) score += 10;

        // ==========================================
        // 3. N-gram (Bigram) 模糊比對 
        // 將使用者輸入切成兩兩一組的字詞 (如 "育嬰假" -> "育嬰", "嬰假")
        // 這樣可以大幅提高錯字或冗長對話的容錯率
        // ==========================================
        if (query.length >= 2) {
            for (let i = 0; i < query.length - 1; i++) {
                const bigram = query.substring(i, i + 2);
                if (qStr.includes(bigram)) score += 3; // 問題中有提到，加分
                if (aStr.includes(bigram)) score += 1; // 答案中有提到，加少許分
            }
        } else if (query.length === 1) {
            // 單字檢索 (如果使用者只輸入一個字)
            if (qStr.includes(query)) score += 2;
        }

        return { ...item, score };
    });

    // 過濾出分數大於 0 的結果，並依分數降冪排序，取前 TopK 筆
    const relevantResults = scoredQA
        .filter(item => item.score > 2) // 設定一個極低的門檻值，濾掉幾乎不相關的雜訊
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    // 在 Console 印出命中結果，方便您除錯與觀察分數
    console.log(`🔍 搜尋：「${userMessage}」`);
    if (relevantResults.length === 0) {
        console.log("   -> ❌ 無命中資料");
        return "\n\n【內部參考資訊】\n無相關資料。請遵守系統設定，告知使用者你不知道答案。";
    }

    console.log("   -> ✅ 命中資料：");
    relevantResults.forEach((r, i) => console.log(`      [${i+1}] (分數:${r.score}) ${r.q}`));

    // 組合成 Prompt 擴充內容餵給 LLM
    let context = "\n\n【內部參考資訊】請依據以下資訊回答使用者的問題：\n";
    relevantResults.forEach((res, idx) => {
        context += `參考資料 ${idx + 1}:\n問題: ${res.q}\n解答: ${res.a}\n\n`;
    });

    return context;
}