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

// 模糊檢索演算法 (涵蓋 q, a, keywords)
export function searchRelevantQA(userMessage, topK = 3) {
    if (faqDatabase.length === 0) {
        console.warn("⚠️ 知識庫為空，無法進行檢索");
        return { context: "", questions: [], isExactMatch: false };
    }

    const rawQuery = userMessage.trim();
    const query = rawQuery.replace(/[?？!！,，.。~～\s]/g, '').toLowerCase();
    
    if (!query) return { context: "", questions: [], isExactMatch: false };

    let isExactMatch = false;

    const scoredQA = faqDatabase.map(item => {
        let score = 0;
        const qStr = item.q.toLowerCase();
        const aStr = item.a.toLowerCase();
        const cleanQ = item.q.replace(/[?？!！,，.。~～\s]/g, '').toLowerCase();
        
        // 1. 精準命中判斷 (代表使用者點擊了按鈕)
        if (cleanQ === query || item.q.trim() === rawQuery) {
            score += 1000;
            isExactMatch = true;
        }

        // 2. 關鍵字 (keywords) 比對
        item.keywords.forEach(keyword => {
            const kw = keyword.toLowerCase();
            if (query.includes(kw)) score += 15;
            else if (kw.includes(query)) score += 10;
        });

        // 3. 問題 (q) 與 答案 (a) 全文包含比對
        if (qStr.includes(query)) score += 10;
        if (query.includes(qStr)) score += 10;
        if (aStr.includes(query)) score += 8; // 【新增】答案內含使用者輸入字眼，給予高分

        // 4. Bigram 模糊比對容錯機制 (涵蓋 q 與 a)
        if (query.length >= 2) {
            for (let i = 0; i < query.length - 1; i++) {
                const bigram = query.substring(i, i + 2);
                if (qStr.includes(bigram)) score += 3;
                if (aStr.includes(bigram)) score += 2; // 【提升權重】提高答案模糊比對的分數
            }
        } else if (query.length === 1) {
            if (qStr.includes(query)) score += 2;
            if (aStr.includes(query)) score += 1; // 【新增】涵蓋單一字元在答案中的搜尋
        }

        return { ...item, score };
    });

    const relevantResults = scoredQA
        .filter(item => item.score > 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    console.log(`🔍 搜尋：「${userMessage}」`);
    if (relevantResults.length === 0) {
        console.log("   -> ❌ 無命中新資料");
        return { context: "", questions: [], isExactMatch: false }; 
    }

    console.log("   -> ✅ 命中資料：");
    relevantResults.forEach((r, i) => console.log(`      [${i+1}] (分數:${r.score}) ${r.q}`));

    let context = "";
    let questions = []; 
    
    relevantResults.forEach((res, idx) => {
        if (isExactMatch) {
            if (idx === 0) {
                context += `--- [精準命中資料] ---\n問：${res.q}\n答：${res.a}\n\n`;
            } else {
                questions.push(res.q); 
            }
        } else {
            context += `--- [資料 ${idx + 1}] ---\n問：${res.q}\n答：${res.a}\n\n`;
            questions.push(res.q);
        }
    });

    return { context, questions, isExactMatch }; 
}
