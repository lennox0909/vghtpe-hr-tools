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

// 模糊檢索演算法 (N-gram 與雙向比對 + 精準命中判斷)
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
        
        // 1. 完全命中判斷 (給予絕對高分 1000，代表使用者點擊了按鈕)
        if (cleanQ === query || item.q.trim() === rawQuery) {
            score += 1000;
            isExactMatch = true;
        }

        // 2. 雙向關鍵字比對
        item.keywords.forEach(keyword => {
            const kw = keyword.toLowerCase();
            if (query.includes(kw)) score += 15;
            else if (kw.includes(query)) score += 10;
        });

        // 3. 問題標題雙向比對
        if (qStr.includes(query)) score += 10;
        if (query.includes(qStr)) score += 10;

        // 4. Bigram 模糊比對
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
        console.log("   -> ❌ 無命中新資料");
        return { context: "", questions: [], isExactMatch: false }; 
    }

    console.log("   -> ✅ 命中資料：");
    relevantResults.forEach((r, i) => console.log(`      [${i+1}] (分數:${r.score}) ${r.q}`));

    let context = "";
    let questions = []; 
    
    relevantResults.forEach((res, idx) => {
        if (isExactMatch) {
            // 精準命中時，LLM 只需要看第一筆，其餘作為延伸閱讀
            if (idx === 0) {
                context += `--- [精準命中資料] ---\n問：${res.q}\n答：${res.a}\n\n`;
            } else {
                questions.push(res.q); 
            }
        } else {
            // 模糊比對，餵給 LLM 並產生選項按鈕
            context += `--- [資料 ${idx + 1}] ---\n問：${res.q}\n答：${res.a}\n\n`;
            questions.push(res.q);
        }
    });

    return { context, questions, isExactMatch }; 
}
