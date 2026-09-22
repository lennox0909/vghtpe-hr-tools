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
        return { context: "", questions: [] }; // 變更回傳結構
    }

    const query = userMessage.replace(/[?？!！,，.。~～\s]/g, '').toLowerCase();
    
    if (!query) return { context: "", questions: [] };

    const scoredQA = faqDatabase.map(item => {
        let score = 0;
        const qStr = item.q.toLowerCase();
        const aStr = item.a.toLowerCase();
        
        item.keywords.forEach(keyword => {
            const kw = keyword.toLowerCase();
            if (query.includes(kw)) score += 15;
            else if (kw.includes(query)) score += 10;
        });

        if (qStr.includes(query)) score += 10;
        if (query.includes(qStr)) score += 10;

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

    const relevantResults = scoredQA
        .filter(item => item.score > 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    console.log(`🔍 搜尋：「${userMessage}」`);
    if (relevantResults.length === 0) {
        console.log("   -> ❌ 無命中新資料 (可能為接續對話或無關問題)");
        return { context: "", questions: [] }; 
    }

    console.log("   -> ✅ 命中資料：");
    relevantResults.forEach((r, i) => console.log(`      [${i+1}] (分數:${r.score}) ${r.q}`));

    let context = "";
    let questions = []; // 用來收集原始問題標題
    
    relevantResults.forEach((res, idx) => {
        context += `--- [資料 ${idx + 1}] ---\n問：${res.q}\n答：${res.a}\n\n`;
        questions.push(res.q); // 收集標題
    });

    // 回傳包含 context (給 LLM 看) 與 questions (給前端做按鈕) 的物件
    return { context, questions }; 
}